
import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import { sendPasswordResetEmail } from "../config/mailer.js";

const router = Router();

const SUPER_ADMIN_EMAIL = "aldair347joao@gmail.com";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiados pedidos. Tenta novamente mais tarde."
  }
});

function generateToken(user) {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// REGISTO NORMAL
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Preenche todos os campos."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      cleanName.length < 2 ||
      cleanName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Os dados fornecidos são inválidos."
      });
    }

    // O email principal nunca pode ser registado publicamente.
    if (cleanEmail === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: "Este email está reservado."
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Este email já está registado."
      });
    }

    // Todas as novas contas públicas entram como Aluno.
    // Nunca aceitar permissões enviadas pelo cliente.
    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role: "student"
    });

    return res.status(201).json({
      success: true,
      message: "Conta criada com sucesso.",
      token: generateToken(user),
      user
    });

  } catch (error) {
    console.error("Erro no registo:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Este email já está registado."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Não foi possível criar a conta."
    });
  }
});

// LOGIN
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Email e palavra-passe são obrigatórios."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail
    }).select("+password");

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas."
      });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Credenciais inválidas."
      });
    }

    // Uma conta super_admin só pode pertencer ao email reservado.
    if (
      user.role === "super_admin" &&
      user.email.toLowerCase() !== SUPER_ADMIN_EMAIL
    ) {
      return res.status(403).json({
        success: false,
        message: "Esta conta não está autorizada."
      });
    }

    return res.json({
      success: true,
      message: "Sessão iniciada com sucesso.",
      token: generateToken(user),
      user
    });

  } catch (error) {
    console.error("Erro no login:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível iniciar sessão."
    });
  }
});

// PEDIR RECUPERAÇÃO DA PALAVRA-PASSE
router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Introduz um endereço de email válido."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail,
      isActive: true
    });

    // Não revelar se o email está registado.
    const genericMessage =
      "Se existir uma conta associada a este email, receberás instruções para recuperar a palavra-passe.";

    if (!user) {
      return res.json({
        success: true,
        message: genericMessage
      });
    }

    // Criar token aleatório.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Guardar apenas o hash do token.
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.passwordResetTokenHash = tokenHash;

    user.passwordResetExpiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    );

    await user.save();

    const appUrl = (
      process.env.APP_URL || "https://aldairone.com"
    ).replace(/\/+$/, "");

    const resetUrl =
      `${appUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl);

    } catch (emailError) {
      // Se o email falhar, invalidar o token criado.
      user.passwordResetTokenHash = undefined;
      user.passwordResetExpiresAt = undefined;

      await user.save();

      throw emailError;
    }

    return res.json({
      success: true,
      message: genericMessage
    });

  } catch (error) {
    console.error(
      "Erro ao pedir recuperação de palavra-passe:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Não foi possível enviar o email de recuperação. Tenta novamente."
    });
  }
});

// DEFINIR NOVA PALAVRA-PASSE
router.post("/reset-password", passwordResetLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (
      typeof token !== "string" ||
      token.length !== 64 ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "O link ou a nova palavra-passe são inválidos."
      });
    }

    // Calcular o hash do token recebido.
    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Procurar uma conta com token válido e não expirado.
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      isActive: true
    }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Este link é inválido ou já expirou. Solicita uma nova recuperação."
      });
    }

    // Alterar a palavra-passe.
    user.password = password;

    // Invalidar o token após a utilização.
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;

    // O middleware do modelo aplica bcrypt à nova palavra-passe.
    await user.save();

    return res.json({
      success: true,
      message: "Palavra-passe alterada com sucesso. Já podes iniciar sessão."
    });

  } catch (error) {
    console.error(
      "Erro ao redefinir palavra-passe:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Não foi possível alterar a palavra-passe."
    });
  }
});

// UTILIZADOR AUTENTICADO
router.get("/me", authenticate, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

export default router;

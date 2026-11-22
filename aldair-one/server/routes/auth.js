
import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import {
  createHash,
  randomInt,
  timingSafeEqual
} from "node:crypto";

import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";
import { sendAdminVerificationEmail } from "../config/mailer.js";

const router = Router();

const SUPER_ADMIN_EMAIL = "aldair347joao@gmail.com";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const adminRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const adminVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

function generateToken(user) {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function hashCode(code) {
  return createHash("sha256").update(code).digest("hex");
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

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role: "user"
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

// CRIAÇÃO INICIAL DA CONTA PRINCIPAL
router.post(
  "/setup/super-admin/register",
  adminRequestLimiter,
  async (req, res) => {
    try {
      const { name, password, setupKey } = req.body;
      const configuredKey = process.env.SUPER_ADMIN_SETUP_KEY;

      if (!configuredKey || typeof setupKey !== "string") {
        return res.status(403).json({
          success: false,
          message: "Configuração inicial não autorizada."
        });
      }

      const provided = Buffer.from(setupKey);
      const expected = Buffer.from(configuredKey);

      if (
        provided.length !== expected.length ||
        !timingSafeEqual(provided, expected)
      ) {
        return res.status(403).json({
          success: false,
          message: "Chave de configuração inválida."
        });
      }

      if (
        typeof name !== "string" ||
        typeof password !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message: "Nome e palavra-passe são obrigatórios."
        });
      }

      const cleanName = name.trim();

      if (
        cleanName.length < 2 ||
        cleanName.length > 100 ||
        password.length < 12 ||
        password.length > 128
      ) {
        return res.status(400).json({
          success: false,
          message: "Nome ou palavra-passe inválidos."
        });
      }

      const existingSuperAdmin = await User.findOne({
        role: "super_admin"
      });

      if (existingSuperAdmin) {
        return res.status(409).json({
          success: false,
          message: "A conta principal já foi configurada."
        });
      }

      const existingAccount = await User.findOne({
        email: SUPER_ADMIN_EMAIL
      });

      if (existingAccount) {
        return res.status(409).json({
          success: false,
          message: "Já existe uma conta com o email reservado."
        });
      }

      const user = await User.create({
        name: cleanName,
        email: SUPER_ADMIN_EMAIL,
        password,
        role: "user"
      });

      return res.status(201).json({
        success: true,
        message: "Conta criada. Inicia sessão para a ativar.",
        token: generateToken(user),
        user
      });
    } catch (error) {
      console.error("Erro na criação inicial:", error.message);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A conta principal já existe."
        });
      }

      return res.status(500).json({
        success: false,
        message: "Não foi possível criar a conta principal."
      });
    }
  }
);

// ACTIVAR A CONTA PRINCIPAL ATRAVÉS DA CHAVE PRIVADA
router.post(
  "/setup/super-admin/activate",
  authenticate,
  adminVerifyLimiter,
  async (req, res) => {
    try {
      const configuredKey = process.env.SUPER_ADMIN_SETUP_KEY;
      const { setupKey } = req.body;

      if (
        req.user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL
      ) {
        return res.status(403).json({
          success: false,
          message: "Esta conta não está autorizada."
        });
      }

      if (
        !configuredKey ||
        typeof setupKey !== "string"
      ) {
        return res.status(403).json({
          success: false,
          message: "Chave de segurança não configurada."
        });
      }

      const provided = Buffer.from(setupKey);
      const expected = Buffer.from(configuredKey);

      if (
        provided.length !== expected.length ||
        !timingSafeEqual(provided, expected)
      ) {
        return res.status(403).json({
          success: false,
          message: "Chave de segurança inválida."
        });
      }

      const user = await User.findById(req.user._id);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Conta inexistente ou inactiva."
        });
      }

      if (user.role === "super_admin") {
        return res.json({
          success: true,
          message: "Esta conta já é Super Administrador.",
          user
        });
      }

      const existingSuperAdmin = await User.findOne({
        role: "super_admin"
      });

      if (existingSuperAdmin) {
        return res.status(409).json({
          success: false,
          message: "Já existe uma conta principal configurada."
        });
      }

      user.role = "super_admin";
      user.adminVerifiedAt = new Date();
      user.adminVerificationCodeHash = undefined;
      user.adminVerificationExpiresAt = undefined;

      await user.save();

      return res.json({
        success: true,
        message: "Conta principal activada com sucesso.",
        token: generateToken(user),
        user
      });
    } catch (error) {
      console.error("Erro na activação:", error.message);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Já existe um Super Administrador."
        });
      }

      return res.status(500).json({
        success: false,
        message: "Não foi possível activar a conta principal."
      });
    }
  }
);

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

    const user = await User.findOne({
      email: email.trim().toLowerCase()
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

// PEDIR CÓDIGO DE EMAIL (MANTIDO PARA EVENTUAL USO FUTURO)
router.post(
  "/setup/super-admin/request-code",
  authenticate,
  adminRequestLimiter,
  async (req, res) => {
    try {
      if (
        req.user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL
      ) {
        return res.status(403).json({
          success: false,
          message: "Esta conta não está autorizada."
        });
      }

      const user = await User.findById(req.user._id);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Conta inexistente ou inactiva."
        });
      }

      if (user.role === "super_admin") {
        return res.json({
          success: true,
          message: "A conta já está verificada."
        });
      }

      const existingSuperAdmin = await User.findOne({
        role: "super_admin"
      });

      if (existingSuperAdmin) {
        return res.status(409).json({
          success: false,
          message: "Já existe uma conta principal."
        });
      }

      const code = String(randomInt(100000, 1000000));

      user.adminVerificationCodeHash = hashCode(code);
      user.adminVerificationExpiresAt =
        new Date(Date.now() + 10 * 60 * 1000);

      await user.save();

      try {
        await sendAdminVerificationEmail(user.email, code);
      } catch (mailError) {
        user.adminVerificationCodeHash = undefined;
        user.adminVerificationExpiresAt = undefined;
        await user.save();

        console.error(
          "Falha no envio do código:",
          mailError.message
        );

        return res.status(503).json({
          success: false,
          message: "Não foi possível enviar o código. Verifica a configuração de email do servidor."
        });
      }

      return res.json({
        success: true,
        message: "Código enviado por email."
      });
    } catch (error) {
      console.error("Erro ao solicitar código:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível solicitar o código."
      });
    }
  }
);

// CONFIRMAR CÓDIGO DE EMAIL (MANTIDO PARA EVENTUAL USO FUTURO)
router.post(
  "/setup/super-admin/verify-code",
  authenticate,
  adminVerifyLimiter,
  async (req, res) => {
    try {
      const { code } = req.body;

      if (
        req.user.email?.toLowerCase() !== SUPER_ADMIN_EMAIL
      ) {
        return res.status(403).json({
          success: false,
          message: "Esta conta não está autorizada."
        });
      }

      if (!/^\d{6}$/.test(code || "")) {
        return res.status(400).json({
          success: false,
          message: "Código inválido."
        });
      }

      const user = await User.findById(req.user._id);

      if (
        !user ||
        !user.adminVerificationCodeHash ||
        !user.adminVerificationExpiresAt ||
        user.adminVerificationExpiresAt < new Date()
      ) {
        return res.status(400).json({
          success: false,
          message: "Código expirado ou inexistente."
        });
      }

      const suppliedHash = Buffer.from(hashCode(code));
      const storedHash = Buffer.from(user.adminVerificationCodeHash);

      if (
        suppliedHash.length !== storedHash.length ||
        !timingSafeEqual(suppliedHash, storedHash)
      ) {
        return res.status(400).json({
          success: false,
          message: "Código incorrecto."
        });
      }

      const existingSuperAdmin = await User.findOne({
        role: "super_admin"
      });

      if (existingSuperAdmin) {
        return res.status(409).json({
          success: false,
          message: "Já existe uma conta principal."
        });
      }

      user.role = "super_admin";
      user.adminVerifiedAt = new Date();
      user.adminVerificationCodeHash = undefined;
      user.adminVerificationExpiresAt = undefined;

      await user.save();

      return res.json({
        success: true,
        message: "Conta principal confirmada.",
        token: generateToken(user),
        user
      });
    } catch (error) {
      console.error("Erro na confirmação:", error.message);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Já existe um Super Administrador."
        });
      }

      return res.status(500).json({
        success: false,
        message: "Não foi possível confirmar a conta principal."
      });
    }
  }
);

// UTILIZADOR AUTENTICADO
router.get("/me", authenticate, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

export default router;

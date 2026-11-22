
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
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiadas tentativas. Tenta novamente mais tarde."
  }
});

const adminRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Limite de pedidos de códigos atingido. Tenta mais tarde."
  }
});

const adminVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Demasiadas tentativas de confirmação."
  }
});

function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não está configurada.");
  }

  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function hashCode(code) {
  return createHash("sha256").update(code).digest("hex");
}

// Registo público: nunca permite criar administradores.
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
        message: "Preenche correctamente todos os campos."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        success: false,
        message: "Este endereço está reservado para a conta principal. Inicia sessão na conta existente."
      });
    }

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({
        success: false,
        message: "O nome deve ter entre 2 e 100 caracteres."
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Endereço de email inválido."
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        success: false,
        message: "A palavra-passe deve ter entre 8 e 128 caracteres."
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });

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

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: "Conta criada com sucesso.",
      token,
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

// CRIAÇÃO INICIAL E PROTEGIDA DA CONTA PRINCIPAL
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

      const providedBuffer = Buffer.from(setupKey);
      const configuredBuffer = Buffer.from(configuredKey);

      if (
        providedBuffer.length !== configuredBuffer.length ||
        !timingSafeEqual(providedBuffer, configuredBuffer)
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

      if (cleanName.length < 2 || cleanName.length > 100) {
        return res.status(400).json({
          success: false,
          message: "O nome deve ter entre 2 e 100 caracteres."
        });
      }

      if (password.length < 12 || password.length > 128) {
        return res.status(400).json({
          success: false,
          message: "A palavra-passe deve ter entre 12 e 128 caracteres."
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

      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        message: "Conta principal criada. Inicia agora a confirmação por email.",
        token,
        user
      });
    } catch (error) {
      console.error("Erro na criação inicial:", error.message);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "A conta principal já existe ou foi criada entretanto."
        });
      }

      return res.status(500).json({
        success: false,
        message: "Não foi possível criar a conta principal."
      });
    }
  }
);


// Login
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

    const token = generateToken(user);

    return res.json({
      success: true,
      message: "Sessão iniciada com sucesso.",
      token,
      user
    });
  } catch (error) {
    console.error("Erro no login:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível iniciar a sessão."
    });
  }
});

// Pedir código de verificação para a conta principal
router.post(
  "/setup/super-admin/request-code",
  authenticate,
  adminRequestLimiter,
  async (req, res) => {
    try {
      if (req.user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({
          success: false,
          message: "Esta conta não está autorizada a solicitar a configuração principal."
        });
      }

      if (req.user.role === "super_admin") {
        return res.json({
          success: true,
          message: "Esta conta já é Super Administrador."
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

      const code = String(randomInt(100000, 1000000));

      const user = await User.findById(req.user._id).select(
        "+adminVerificationCodeHash +adminVerificationExpiresAt"
      );

      user.adminVerificationCodeHash = hashCode(code);
      user.adminVerificationExpiresAt = new Date(
        Date.now() + 10 * 60 * 1000
      );

      await user.save();

      try {
        await sendAdminVerificationEmail(SUPER_ADMIN_EMAIL, code);
      } catch (mailError) {
        user.adminVerificationCodeHash = undefined;
        user.adminVerificationExpiresAt = undefined;
        await user.save();

        console.error("Falha no envio do código:", mailError.message);

        return res.status(503).json({
          success: false,
          message: "Não foi possível enviar o código. Verifica a configuração de e-mail do servidor."
        });
      }

      return res.json({
        success: true,
        message: "Código de segurança enviado para o teu endereço de e-mail."
      });
    } catch (error) {
      console.error("Erro ao pedir código:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível iniciar a verificação."
      });
    }
  }
);

// Confirmar código e activar a conta principal
router.post(
  "/setup/super-admin/verify-code",
  authenticate,
  adminVerifyLimiter,
  async (req, res) => {
    try {
      if (req.user.email !== SUPER_ADMIN_EMAIL) {
        return res.status(403).json({
          success: false,
          message: "Conta não autorizada."
        });
      }

      const { code } = req.body;

      if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
        return res.status(400).json({
          success: false,
          message: "Introduz o código de seis dígitos."
        });
      }

      const user = await User.findById(req.user._id).select(
        "+adminVerificationCodeHash +adminVerificationExpiresAt"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Conta não encontrada."
        });
      }

      if (user.role === "super_admin") {
        return res.json({
          success: true,
          message: "Esta conta já é Super Administrador."
        });
      }

      if (
        !user.adminVerificationCodeHash ||
        !user.adminVerificationExpiresAt ||
        user.adminVerificationExpiresAt.getTime() < Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message: "Código inexistente ou expirado. Solicita um novo código."
        });
      }

      const submittedHash = Buffer.from(hashCode(code), "hex");
      const storedHash = Buffer.from(
        user.adminVerificationCodeHash,
        "hex"
      );

      if (
        submittedHash.length !== storedHash.length ||
        !timingSafeEqual(submittedHash, storedHash)
      ) {
        return res.status(400).json({
          success: false,
          message: "Código de segurança incorrecto."
        });
      }

      const existingSuperAdmin = await User.findOne({
        role: "super_admin",
        _id: { $ne: user._id }
      });

      if (existingSuperAdmin) {
        return res.status(409).json({
          success: false,
          message: "Já existe outra conta principal configurada."
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
        user
      });
    } catch (error) {
      console.error("Erro na confirmação:", error.message);

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "Já existe uma conta principal configurada."
        });
      }

      return res.status(500).json({
        success: false,
        message: "Não foi possível confirmar a conta principal."
      });
    }
  }
);

// Obter utilizador autenticado
router.get("/me", authenticate, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

export default router;

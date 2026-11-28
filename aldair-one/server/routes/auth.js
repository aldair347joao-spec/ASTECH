
import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import User from "../models/User.js";
import PendingRegistration from "../models/PendingRegistration.js";
import LoginChallenge from "../models/LoginChallenge.js";
import { authenticate } from "../middleware/auth.js";

import {
  sendPasswordResetEmail,
  sendRegistrationOtpEmail
} from "../config/mailer.js";

const router = Router();

const SUPER_ADMIN_EMAIL = "aldair347joao@gmail.com";
const OTP_LIFETIME = 10 * 60 * 1000;
const RESEND_INTERVAL = 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_RESENDS = 5;

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

const otpLimiter = rateLimit({
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

function getOtpSecret() {
  const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Configuração de segurança OTP em falta.");
  }

  return secret;
}

function generateOtp() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(code) {
  return crypto
    .createHmac("sha256", getOtpSecret())
    .update(code)
    .digest("hex");
}

function compareOtp(code, storedHash) {
  const receivedHash = Buffer.from(hashOtp(code), "hex");
  const expectedHash = Buffer.from(storedHash, "hex");

  return (
    receivedHash.length === expectedHash.length &&
    crypto.timingSafeEqual(receivedHash, expectedHash)
  );
}

function generateToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET não está configurada.");
  }

  return jwt.sign(
    {
      userId: user._id,
      sv: user.sessionVersion || 0
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function validateEmail(email) {
  return (
    typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  );
}

function validateOtp(code) {
  return typeof code === "string" && /^\d{6}$/.test(code);
}

async function sendOtp(email, code) {
  await sendRegistrationOtpEmail(email, code);
}

// =====================================================
// REGISTO — PEDIR CÓDIGO
// =====================================================

router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== "string" ||
      !validateEmail(email) ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Preenche corretamente todos os campos."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      cleanName.length < 2 ||
      cleanName.length > 100 ||
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

    const existingPending = await PendingRegistration.findOne({
      email: cleanEmail
    });

    if (existingPending) {
      const elapsed = Date.now() - existingPending.lastSentAt.getTime();

      if (elapsed < RESEND_INTERVAL) {
        return res.status(429).json({
          success: false,
          message: "Aguarda 60 segundos antes de pedir outro código."
        });
      }

      if (existingPending.resendCount >= MAX_RESENDS) {
        return res.status(429).json({
          success: false,
          message: "Atingiste o limite de reenvios. Tenta novamente mais tarde."
        });
      }
    }

    const code = generateOtp();
    const passwordHash = await bcrypt.hash(password, 12);

    const pendingData = {
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      otpHash: hashOtp(code),
      expiresAt: new Date(Date.now() + OTP_LIFETIME),
      lastSentAt: new Date(),
      attempts: 0,
      resendCount: existingPending
        ? existingPending.resendCount + 1
        : 0
    };

    await PendingRegistration.findOneAndUpdate(
      { email: cleanEmail },
      { $set: pendingData },
      { upsert: true, new: true, runValidators: true }
    );

    try {
      await sendOtp(cleanEmail, code);
    } catch (emailError) {
      await PendingRegistration.deleteOne({
        email: cleanEmail
      });

      throw emailError;
    }

    return res.status(200).json({
      success: true,
      requiresOtp: true,
      email: cleanEmail,
      message: "Enviámos um código de verificação para o teu email."
    });

  } catch (error) {
    console.error("Erro no pedido de registo:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível iniciar o registo."
    });
  }
});

// =====================================================
// REGISTO — REENVIAR CÓDIGO
// =====================================================

router.post("/register/resend-code", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email inválido."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const pending = await PendingRegistration.findOne({
      email: cleanEmail
    });

    if (!pending || pending.expiresAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Registo não encontrado ou expirado. Começa novamente."
      });
    }

    if (Date.now() - pending.lastSentAt.getTime() < RESEND_INTERVAL) {
      return res.status(429).json({
        success: false,
        message: "Aguarda 60 segundos antes de pedir outro código."
      });
    }

    if (pending.resendCount >= MAX_RESENDS) {
      return res.status(429).json({
        success: false,
        message: "Atingiste o limite de reenvios."
      });
    }

    const code = generateOtp();

    pending.otpHash = hashOtp(code);
    pending.expiresAt = new Date(Date.now() + OTP_LIFETIME);
    pending.lastSentAt = new Date();
    pending.attempts = 0;
    pending.resendCount += 1;

    await pending.save();

    await sendOtp(cleanEmail, code);

    return res.json({
      success: true,
      message: "Enviámos um novo código para o teu email."
    });

  } catch (error) {
    console.error("Erro ao reenviar OTP de registo:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível reenviar o código."
    });
  }
});

// =====================================================
// REGISTO — CONFIRMAR CÓDIGO
// =====================================================

router.post("/register/verify", otpLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!validateEmail(email) || !validateOtp(code)) {
      return res.status(400).json({
        success: false,
        message: "Email ou código inválido."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const pending = await PendingRegistration.findOne({
      email: cleanEmail
    }).select("+passwordHash +otpHash");

    if (!pending || pending.expiresAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Código inválido ou expirado. Solicita um novo código."
      });
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Excedeste o número de tentativas. Solicita um novo código."
      });
    }

    if (!compareOtp(code, pending.otpHash)) {
      pending.attempts += 1;
      await pending.save();

      return res.status(400).json({
        success: false,
        message: "Código incorreto."
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      await PendingRegistration.deleteOne({ email: cleanEmail });

      return res.status(409).json({
        success: false,
        message: "Este email já está registado."
      });
    }

    const user = new User({
      name: pending.name,
      email: pending.email,
      password: pending.passwordHash,
      role: "student"
    });

    // A palavra-passe já está protegida com bcrypt.
    user.passwordAlreadyHashed = true;

    await user.save();

    await PendingRegistration.deleteOne({
      email: cleanEmail
    });

    return res.status(201).json({
      success: true,
      message: "Email confirmado e conta criada com sucesso.",
      token: generateToken(user),
      user
    });

  } catch (error) {
    console.error("Erro ao confirmar registo:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Este email já está registado."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Não foi possível confirmar o registo."
    });
  }
});

// =====================================================
// LOGIN — VALIDAR CREDENCIAIS E ENVIAR OTP
// =====================================================

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (
      !validateEmail(email) ||
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

    if (
      user.role === "super_admin" &&
      user.email.toLowerCase() !== SUPER_ADMIN_EMAIL
    ) {
      return res.status(403).json({
        success: false,
        message: "Esta conta não está autorizada."
      });
    }

    let existingChallenge = await LoginChallenge.findOne({
  userId: user._id
});

// Um desafio expirado não deve bloquear um novo início de sessão.
if (existingChallenge && existingChallenge.expiresAt <= new Date()) {
  await LoginChallenge.deleteOne({ _id: existingChallenge._id });
  existingChallenge = null;
}

    if (existingChallenge) {
      const elapsed = Date.now() - existingChallenge.lastSentAt.getTime();

      if (elapsed < RESEND_INTERVAL) {
        return res.status(429).json({
          success: false,
          requiresOtp: true,
          email: cleanEmail,
          message: "Já enviámos um código. Aguarda 60 segundos antes de pedir outro."
        });
      }

      if (existingChallenge.resendCount >= MAX_RESENDS) {
        return res.status(429).json({
          success: false,
          message: "Atingiste o limite de reenvios. Tenta novamente mais tarde."
        });
      }
    }

    const code = generateOtp();

    await LoginChallenge.findOneAndUpdate(
      { userId: user._id },
      {
        $set: {
          otpHash: hashOtp(code),
          expiresAt: new Date(Date.now() + OTP_LIFETIME),
          lastSentAt: new Date(),
          attempts: 0
        },
        $inc: {
          resendCount: 1
        }
      },
      { upsert: true, new: true }
    );

    try {
      await sendOtp(cleanEmail, code);
    } catch (emailError) {
      await LoginChallenge.deleteOne({ userId: user._id });
      throw emailError;
    }

    return res.json({
      success: true,
      requiresOtp: true,
      email: cleanEmail,
      message: "Enviámos um código de segurança para o teu email."
    });

  } catch (error) {
    console.error("Erro no início de sessão:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível iniciar o processo de autenticação."
    });
  }
});

// =====================================================
// LOGIN — REENVIAR OTP
// =====================================================

router.post("/login/resend-code", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Email inválido."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail,
      isActive: true
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Não foi possível reenviar o código."
      });
    }

    const challenge = await LoginChallenge.findOne({
      userId: user._id
    });

    if (!challenge || challenge.expiresAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "O pedido expirou. Inicia sessão novamente."
      });
    }

    if (Date.now() - challenge.lastSentAt.getTime() < RESEND_INTERVAL) {
      return res.status(429).json({
        success: false,
        message: "Aguarda 60 segundos antes de pedir outro código."
      });
    }

    if (challenge.resendCount >= MAX_RESENDS) {
      return res.status(429).json({
        success: false,
        message: "Atingiste o limite de reenvios."
      });
    }

    const code = generateOtp();

    challenge.otpHash = hashOtp(code);
    challenge.expiresAt = new Date(Date.now() + OTP_LIFETIME);
    challenge.lastSentAt = new Date();
    challenge.attempts = 0;
    challenge.resendCount += 1;

    await challenge.save();
    await sendOtp(cleanEmail, code);

    return res.json({
      success: true,
      message: "Enviámos um novo código para o teu email."
    });

  } catch (error) {
    console.error("Erro ao reenviar OTP de login:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível reenviar o código."
    });
  }
});

// =====================================================
// LOGIN — CONFIRMAR OTP E CRIAR SESSÃO
// =====================================================

router.post("/login/verify", otpLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!validateEmail(email) || !validateOtp(code)) {
      return res.status(400).json({
        success: false,
        message: "Email ou código inválido."
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail,
      isActive: true
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Não foi possível validar o código."
      });
    }

    const challenge = await LoginChallenge.findOne({
      userId: user._id
    }).select("+otpHash");

    if (!challenge || challenge.expiresAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Código inválido ou expirado. Inicia sessão novamente."
      });
    }

    if (challenge.attempts >= MAX_ATTEMPTS) {
      return res.status(429).json({
        success: false,
        message: "Excedeste o número de tentativas. Solicita um novo código."
      });
    }

    if (!compareOtp(code, challenge.otpHash)) {
      challenge.attempts += 1;
      await challenge.save();

      return res.status(400).json({
        success: false,
        message: "Código incorreto."
      });
    }

    if (
      user.role === "super_admin" &&
      user.email.toLowerCase() !== SUPER_ADMIN_EMAIL
    ) {
      return res.status(403).json({
        success: false,
        message: "Esta conta não está autorizada."
      });
    }

    await LoginChallenge.deleteOne({
      _id: challenge._id
    });

    return res.json({
      success: true,
      message: "Autenticação confirmada. Sessão iniciada.",
      token: generateToken(user),
      user
    });

  } catch (error) {
    console.error("Erro ao confirmar OTP de login:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível confirmar o código."
    });
  }
});

// =====================================================
// TERMINAR SESSÃO
// =====================================================

router.post("/logout", authenticate, async (req, res) => {
  try {
    await User.updateOne(
      { _id: req.user._id },
      { $inc: { sessionVersion: 1 } }
    );

    await LoginChallenge.deleteOne({
      userId: req.user._id
    });

    return res.json({
      success: true,
      message: "Sessão terminada com sucesso."
    });

  } catch (error) {
    console.error("Erro ao terminar sessão:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível terminar a sessão."
    });
  }
});

// =====================================================
// PEDIR RECUPERAÇÃO DA PALAVRA-PASSE
// =====================================================

router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!validateEmail(email)) {
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

    const genericMessage =
      "Se existir uma conta associada a este email, receberás instruções para recuperar a palavra-passe.";

    if (!user) {
      return res.json({
        success: true,
        message: genericMessage
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

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
    console.error("Erro ao pedir recuperação:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível enviar o email de recuperação. Tenta novamente."
    });
  }
});

// =====================================================
// DEFINIR NOVA PALAVRA-PASSE
// =====================================================

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

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
      isActive: true
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Este link é inválido ou já expirou. Solicita uma nova recuperação."
      });
    }

    user.password = password;
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;

    // Invalidar todas as sessões anteriores após mudar a palavra-passe.
    user.sessionVersion = (user.sessionVersion || 0) + 1;

    await user.save();

    return res.json({
      success: true,
      message: "Palavra-passe alterada com sucesso. Já podes iniciar sessão."
    });

  } catch (error) {
    console.error("Erro ao redefinir palavra-passe:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível alterar a palavra-passe."
    });
  }
});

// =====================================================
// UTILIZADOR AUTENTICADO
// =====================================================

router.get("/me", authenticate, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

export default router;

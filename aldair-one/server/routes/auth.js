
import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";

import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

const SUPER_ADMIN_EMAIL = "aldair347joao@gmail.com";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
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

    // Nunca aceitar role, admin ou permissões enviados pelo cliente.
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

    // Uma conta com papel super_admin só pode pertencer ao email reservado.
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

// UTILIZADOR AUTENTICADO
router.get("/me", authenticate, async (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

export default router;


import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

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

// Registo público
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

// Obter utilizador autenticado
router.get("/me", authenticate, (req, res) => {
  return res.json({
    success: true,
    user: req.user
  });
});

export default router;

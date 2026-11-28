
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const SUPER_ADMIN_EMAIL = "aldair347joao@gmail.com";

export async function authenticate(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Autenticação necessária."
      });
    }

    const token = authorization.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET não está configurada.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Sessão inválida ou utilizador inactivo."
      });
    }

    // Rejeitar tokens antigos ou de outra versão de sessão.
    if (
      typeof decoded.sv !== "number" ||
      decoded.sv !== (user.sessionVersion || 0)
    ) {
      return res.status(401).json({
        success: false,
        message: "A sessão terminou. Inicia sessão novamente."
      });
    }

    if (
      user.role === "super_admin" &&
      user.email.toLowerCase() !== SUPER_ADMIN_EMAIL
    ) {
      return res.status(403).json({
        success: false,
        message: "Conta sem autorização de Super Administrador."
      });
    }

    req.user = user;
    next();

  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Token inválido ou expirado."
      });
    }

    console.error("Erro de autenticação:", error.message);

    return res.status(500).json({
      success: false,
      message: "Erro interno de autenticação."
    });
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Não tens permissão para executar esta operação."
      });
    }

    if (
      allowedRoles.includes("super_admin") &&
      req.user.email.toLowerCase() !== SUPER_ADMIN_EMAIL
    ) {
      return res.status(403).json({
        success: false,
        message: "Apenas a conta principal pode executar esta operação."
      });
    }

    next();
  };
}

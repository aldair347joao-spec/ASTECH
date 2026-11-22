
import { Router } from "express";
import mongoose from "mongoose";

import User from "../models/User.js";
import {
  authenticate,
  authorize
} from "../middleware/auth.js";

const router = Router();

const SUPER_ADMIN_EMAIL = "aldair347joao@gmail.com";

const ALLOWED_ROLES = [
  "admin",
  "instructor",
  "student",
  "client",
  "user"
];

router.use(authenticate, authorize("super_admin"));

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// PAINEL: INDICADORES GERAIS
router.get("/overview", async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      roleStats,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),

      User.aggregate([
        {
          $group: {
            _id: "$role",
            total: { $sum: 1 }
          }
        },
        {
          $sort: { total: -1 }
        }
      ]),

      User.find()
        .select("name email role isActive createdAt")
        .sort({ createdAt: -1 })
        .limit(8)
        .lean()
    ]);

    return res.json({
      success: true,
      overview: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        roleStats,
        recentUsers
      }
    });
  } catch (error) {
    console.error("Erro nas estatísticas administrativas:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar as estatísticas."
    });
  }
});

// LISTAR E PESQUISAR UTILIZADORES
router.get("/users", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
    );

    const search =
      typeof req.query.search === "string"
        ? req.query.search.trim().slice(0, 100)
        : "";

    const role =
      typeof req.query.role === "string"
        ? req.query.role.trim()
        : "";

    const status =
      typeof req.query.status === "string"
        ? req.query.status.trim()
        : "";

    const filter = {};

    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");

      filter.$or = [
        { name: expression },
        { email: expression }
      ];
    }

    if (role && [
      "super_admin",
      ...ALLOWED_ROLES
    ].includes(role)) {
      filter.role = role;
    }

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("name email role isActive createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      User.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Erro ao listar utilizadores:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os utilizadores."
    });
  }
});

// ALTERAR ESTADO DE UMA CONTA
router.patch("/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Identificador de utilizador inválido."
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "O estado da conta é inválido."
      });
    }

    const target = await User.findById(id);

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Utilizador não encontrado."
      });
    }

    if (
      target.role === "super_admin" ||
      target.email.toLowerCase() === SUPER_ADMIN_EMAIL
    ) {
      return res.status(403).json({
        success: false,
        message: "A conta principal não pode ser alterada por esta operação."
      });
    }

    target.isActive = isActive;
    await target.save();

    return res.json({
      success: true,
      message: isActive
        ? "Conta ativada com sucesso."
        : "Conta suspensa com sucesso.",
      user: {
        id: target._id,
        name: target.name,
        email: target.email,
        role: target.role,
        isActive: target.isActive
      }
    });
  } catch (error) {
    console.error("Erro ao alterar estado:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível alterar o estado da conta."
    });
  }
});

// ALTERAR FUNÇÃO DE UM UTILIZADOR
router.patch("/users/:id/role", async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Identificador de utilizador inválido."
      });
    }

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "A função selecionada não é permitida."
      });
    }

    const target = await User.findById(id);

    if (!target) {
      return res.status(404).json({
        success: false,
        message: "Utilizador não encontrado."
      });
    }

    if (
      target.role === "super_admin" ||
      target.email.toLowerCase() === SUPER_ADMIN_EMAIL
    ) {
      return res.status(403).json({
        success: false,
        message: "A função da conta principal não pode ser alterada."
      });
    }

    target.role = role;
    await target.save();

    return res.json({
      success: true,
      message: "Permissões atualizadas com sucesso.",
      user: {
        id: target._id,
        name: target.name,
        email: target.email,
        role: target.role,
        isActive: target.isActive
      }
    });
  } catch (error) {
    console.error("Erro ao alterar permissões:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível atualizar as permissões."
    });
  }
});

export default router;

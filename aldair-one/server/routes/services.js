
import { Router } from "express";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import ServiceRequest from "../models/ServiceRequest.js";
import {
  authenticate,
  authorize
} from "../middleware/auth.js";

const router = Router();

const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Atingiste o limite de pedidos. Tenta novamente mais tarde."
  }
});

const allowedServices = [
  "Desenvolvimento de Sistemas",
  "Automação Inteligente",
  "Gestão Empresarial",
  "Inteligência Artificial"
];

const allowedStatuses = [
  "pending",
  "contacted",
  "in_progress",
  "completed",
  "cancelled"
];

// CLIENTE: ENVIAR PEDIDO
router.post("/requests", requestLimiter, async (req, res) => {
  try {
    const { name, email, phone, service, description } = req.body;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof phone !== "string" ||
      typeof service !== "string" ||
      typeof description !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Preenche todos os campos."
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanDescription = description.trim();

    if (
      cleanName.length < 2 ||
      cleanName.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
      cleanPhone.length < 6 ||
      cleanPhone.length > 30 ||
      !allowedServices.includes(service) ||
      cleanDescription.length < 10 ||
      cleanDescription.length > 3000
    ) {
      return res.status(400).json({
        success: false,
        message: "Verifica os dados preenchidos."
      });
    }

    const request = await ServiceRequest.create({
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      service,
      description: cleanDescription
    });

    return res.status(201).json({
      success: true,
      message: "O teu pedido foi enviado com sucesso. Entraremos em contacto.",
      request: {
        id: request._id,
        service: request.service,
        status: request.status,
        createdAt: request.createdAt
      }
    });
  } catch (error) {
    console.error("Erro ao receber pedido de serviço:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível enviar o pedido. Tenta novamente."
    });
  }
});

// ADMINISTRAÇÃO: PROTEGER TODAS AS ROTAS SEGUINTES
router.use(authenticate, authorize("super_admin"));

// ADMIN: LISTAR PEDIDOS
router.get("/requests", async (req, res) => {
  try {
    const requests = await ServiceRequest.find()
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();

    return res.json({
      success: true,
      requests
    });
  } catch (error) {
    console.error("Erro ao listar pedidos:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar os pedidos."
    });
  }
});

// ADMIN: ATUALIZAR ESTADO
router.patch("/requests/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Identificador inválido."
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Estado do pedido inválido."
      });
    }

    const request = await ServiceRequest.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Pedido não encontrado."
      });
    }

    return res.json({
      success: true,
      message: "Estado do pedido atualizado.",
      request
    });
  } catch (error) {
    console.error("Erro ao atualizar pedido:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível atualizar o pedido."
    });
  }
});

export default router;

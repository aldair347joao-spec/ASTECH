
import { Router } from "express";
import mongoose from "mongoose";

import LiveSession from "../models/LiveSession.js";
import LiveChatMessage from "../models/LiveChatMessage.js";
import Enrollment from "../models/Enrollment.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

const ADMIN_ROLES = ["super_admin", "admin"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv"
];

function isAdmin(user) {
  return ADMIN_ROLES.includes(user.role);
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function safeMessage(message) {
  return {
    id: message._id,
    sender: message.sender,
    senderName: message.senderName,
    message: message.message,
    attachment: message.attachment?.originalName
      ? {
          originalName: message.attachment.originalName,
          mimeType: message.attachment.mimeType,
          size: message.attachment.size
        }
      : null,
    createdAt: message.createdAt
  };
}

async function getAuthorizedSession(req, res) {
  const sessionId = req.params.id;

  if (!validId(sessionId)) {
    res.status(400).json({
      success: false,
      message: "Identificador da aula inválido."
    });

    return null;
  }

  const session = await LiveSession.findById(sessionId);

  if (!session) {
    res.status(404).json({
      success: false,
      message: "Aula online não encontrada."
    });

    return null;
  }

  if (session.status !== "live") {
    res.status(400).json({
      success: false,
      message: "O chat só está disponível durante uma aula em direto."
    });

    return null;
  }

  let authorized = false;

  if (isAdmin(req.user)) {
    authorized = true;
  } else if (
    req.user.role === "instructor" &&
    session.instructor.toString() === req.user._id.toString()
  ) {
    authorized = true;
  } else if (req.user.role === "student") {
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      class: session.class,
      status: "active"
    });

    authorized = Boolean(enrollment);
  }

  if (!authorized) {
    res.status(403).json({
      success: false,
      message: "Não tens autorização para utilizar o chat desta aula."
    });

    return null;
  }

  return session;
}

// ==========================================
// CONSULTAR HISTÓRICO DO CHAT
// ==========================================

router.get("/sessions/:id/messages", async (req, res) => {
  try {
    const session = await getAuthorizedSession(req, res);

    if (!session) return;

    const messages = await LiveChatMessage.find({
      session: session._id
    })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    return res.json({
      success: true,
      messages: messages.map(safeMessage)
    });
  } catch (error) {
    console.error("Erro ao consultar chat:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível carregar as mensagens."
    });
  }
});

// ==========================================
// ENVIAR MENSAGEM OU DOCUMENTO
// ==========================================

router.post("/sessions/:id/messages", async (req, res) => {
  try {
    const session = await getAuthorizedSession(req, res);

    if (!session) return;

    const messageText = String(
      req.body.message || ""
    ).trim();

    const file = req.body.file || null;

    if (messageText.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "A mensagem não pode ultrapassar 1000 caracteres."
      });
    }

    if (!messageText && !file) {
      return res.status(400).json({
        success: false,
        message: "Escreve uma mensagem ou seleciona um documento."
      });
    }

    const attachment = {
      originalName: null,
      mimeType: null,
      size: null,
      data: null
    };

    if (file) {
      const originalName = String(file.originalName || "").trim();
      const extension = originalName
        .toLowerCase()
        .match(/\.[a-z0-9]+$/)?.[0];

      const base64 = String(file.data || "").replace(
        /^data:[^;]+;base64,/,
        ""
      );

      if (
        !originalName ||
        originalName.length > 255 ||
        !extension ||
        !ALLOWED_EXTENSIONS.includes(extension)
      ) {
        return res.status(400).json({
          success: false,
          message: "Este tipo de documento não é permitido."
        });
      }

      if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) {
        return res.status(400).json({
          success: false,
          message: "O documento enviado é inválido."
        });
      }

      const buffer = Buffer.from(base64, "base64");

      if (
        buffer.length === 0 ||
        buffer.length > MAX_FILE_SIZE
      ) {
        return res.status(400).json({
          success: false,
          message: "O documento deve ter no máximo 5 MB."
        });
      }

      const expectedBase64 = buffer.toString("base64");

      if (expectedBase64 !== base64) {
        return res.status(400).json({
          success: false,
          message: "O conteúdo do documento é inválido."
        });
      }

      attachment.originalName = originalName;
      attachment.mimeType = String(
        file.mimeType || "application/octet-stream"
      ).slice(0, 120);
      attachment.size = buffer.length;
      attachment.data = base64;
    }

    const chatMessage = await LiveChatMessage.create({
      session: session._id,
      sender: req.user._id,
      senderName:
        req.user.name ||
        req.user.email ||
        "Participante",
      message: messageText,
      attachment
    });

    return res.status(201).json({
      success: true,
      message: "Mensagem enviada com sucesso.",
      chatMessage: safeMessage(chatMessage)
    });
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível enviar a mensagem."
    });
  }
});

// ==========================================
// DESCARREGAR DOCUMENTO
// ==========================================

router.get(
  "/sessions/:id/messages/:messageId/attachment",
  async (req, res) => {
    try {
      const session = await getAuthorizedSession(req, res);

      if (!session) return;

      if (!validId(req.params.messageId)) {
        return res.status(400).json({
          success: false,
          message: "Identificador da mensagem inválido."
        });
      }

      const chatMessage = await LiveChatMessage.findOne({
        _id: req.params.messageId,
        session: session._id
      });

      if (!chatMessage?.attachment?.data) {
        return res.status(404).json({
          success: false,
          message: "Documento não encontrado."
        });
      }

      const file = chatMessage.attachment;

      const safeName = file.originalName.replace(
        /[\r\n"\\]/g,
        "_"
      );

      const buffer = Buffer.from(file.data, "base64");

      res.setHeader(
        "Content-Type",
        "application/octet-stream"
      );

      res.setHeader(
        "Content-Length",
        buffer.length
      );

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`
      );

      res.setHeader("X-Content-Type-Options", "nosniff");

      return res.send(buffer);
    } catch (error) {
      console.error("Erro ao descarregar documento:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível descarregar o documento."
      });
    }
  }
);

export default router;

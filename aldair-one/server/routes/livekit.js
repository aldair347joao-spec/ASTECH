
import { Router } from "express";
import mongoose from "mongoose";
import {
  AccessToken,
  RoomServiceClient
} from "livekit-server-sdk";

import LiveSession from "../models/LiveSession.js";
import ClassModel from "../models/Class.js";
import Enrollment from "../models/Enrollment.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

const ADMIN_ROLES = ["super_admin", "admin"];

router.use(authenticate);

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function isAdmin(user) {
  return ADMIN_ROLES.includes(user.role);
}

function isSessionInstructor(user, session) {
  return (
    user.role === "instructor" &&
    session.instructor.toString() === user._id.toString()
  );
}

function canManageSession(user, session) {
  return isAdmin(user) || isSessionInstructor(user, session);
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

function credentialsConfigured() {
  return Boolean(
    process.env.LIVEKIT_URL &&
    process.env.LIVEKIT_API_KEY &&
    process.env.LIVEKIT_API_SECRET
  );
}

function getRoomService() {
  if (!credentialsConfigured()) {
    throw new Error("Credenciais LiveKit não configuradas.");
  }

  return new RoomServiceClient(
    process.env.LIVEKIT_URL,
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET
  );
}

// Verificar sessão e permissões de gestão.
async function getManagedLiveSession(req, res) {
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

  if (!canManageSession(req.user, session)) {
    res.status(403).json({
      success: false,
      message: "Não tens autorização para gerir participantes."
    });
    return null;
  }

  if (session.status !== "live") {
    res.status(400).json({
      success: false,
      message: "A aula não está em direto."
    });
    return null;
  }

  return session;
}

// ==========================================
// INICIAR VIDEOCONFERÊNCIA
// ==========================================

router.post("/sessions/:id/start", async (req, res) => {
  try {
    const sessionId = req.params.id;

    if (!validId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Identificador da aula inválido."
      });
    }

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Aula online não encontrada."
      });
    }

    if (!canManageSession(req.user, session)) {
      return res.status(403).json({
        success: false,
        message: "Não tens autorização para iniciar esta aula."
      });
    }

    if (!credentialsConfigured()) {
      return res.status(503).json({
        success: false,
        message: "O serviço de videoconferência não está configurado."
      });
    }

    if (session.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Esta aula foi cancelada."
      });
    }

    if (session.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Esta aula já foi concluída."
      });
    }

    if (session.status === "scheduled") {
      session.status = "live";
      session.actualStart = new Date();

      await session.save();
    }

    return res.json({
      success: true,
      message: "A aula online está activa.",
      session: {
        id: session._id,
        title: session.title,
        roomName: session.roomName,
        status: session.status,
        actualStart: session.actualStart
      }
    });
  } catch (error) {
    console.error("Erro ao iniciar aula LiveKit:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível iniciar a aula online."
    });
  }
});

// ==========================================
// GERAR TOKEN PRIVADO DE ACESSO
// ==========================================

router.post("/sessions/:id/token", async (req, res) => {
  try {
    const sessionId = req.params.id;

    if (!validId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Identificador da aula inválido."
      });
    }

    if (!credentialsConfigured()) {
      return res.status(503).json({
        success: false,
        message: "O serviço de videoconferência não está configurado."
      });
    }

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Aula online não encontrada."
      });
    }

    if (session.status !== "live") {
      return res.status(400).json({
        success: false,
        message: "Esta sala ainda não está disponível."
      });
    }

    const classItem = await ClassModel.findById(session.class);

    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "A turma associada não foi encontrada."
      });
    }

    let authorized = false;

    if (isAdmin(req.user)) {
      authorized = true;
    } else if (isSessionInstructor(req.user, session)) {
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
      return res.status(403).json({
        success: false,
        message: "Não tens autorização para entrar nesta sala."
      });
    }

    const identity = req.user._id.toString();

    const participantName =
      req.user.name ||
      req.user.email ||
      "Participante";

    const accessToken = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity,
        name: participantName,
        ttl: "1h"
      }
    );

    accessToken.addGrant({
      roomJoin: true,
      room: session.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const token = await accessToken.toJwt();

    return res.json({
      success: true,
      message: "Acesso à sala autorizado.",
      connection: {
        serverUrl: process.env.LIVEKIT_URL,
        roomName: session.roomName,
        token
      },
      participant: {
        identity,
        name: participantName,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error("Erro ao gerar token LiveKit:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível gerar o acesso à videoconferência."
    });
  }
});

// ==========================================
// TERMINAR VIDEOCONFERÊNCIA
// ==========================================

router.post("/sessions/:id/end", async (req, res) => {
  try {
    const sessionId = req.params.id;

    if (!validId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: "Identificador da aula inválido."
      });
    }

    const session = await LiveSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Aula online não encontrada."
      });
    }

    if (!canManageSession(req.user, session)) {
      return res.status(403).json({
        success: false,
        message: "Não tens autorização para terminar esta aula."
      });
    }

    if (session.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Esta aula foi cancelada."
      });
    }

    if (session.status === "completed") {
      return res.json({
        success: true,
        message: "Esta aula já estava concluída.",
        session
      });
    }

    session.status = "completed";
    session.actualEnd = new Date();

    await session.save();

    return res.json({
      success: true,
      message: "A aula online foi terminada.",
      session: {
        id: session._id,
        title: session.title,
        status: session.status,
        actualStart: session.actualStart,
        actualEnd: session.actualEnd
      }
    });
  } catch (error) {
    console.error("Erro ao terminar aula LiveKit:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível terminar a aula online."
    });
  }
});

// ==========================================
// CONSULTAR PARTICIPANTES
// ==========================================

router.get("/sessions/:id/participants", async (req, res) => {
  try {
    const session = await getManagedLiveSession(req, res);

    if (!session) return;

    const roomService = getRoomService();

    const participants = await roomService.listParticipants(
      session.roomName
    );

    return res.json({
      success: true,
      count: participants.length,
      participants: participants.map((participant) => ({
        identity: participant.identity,
        name: participant.name,
        state: participant.state,
        tracks: (participant.tracks || []).map((track) => ({
          sid: track.sid,
          type: track.type,
          source: track.source,
          muted: track.muted,
          mimeType: track.mimeType
        }))
      }))
    });
  } catch (error) {
    console.error("Erro ao consultar participantes:", error.message);

    return res.status(500).json({
      success: false,
      message: "Não foi possível consultar os participantes."
    });
  }
});

// ==========================================
// SILENCIAR OU REATIVAR MICROFONE
// ==========================================

router.post(
  "/sessions/:id/participants/:identity/mute",
  async (req, res) => {
    try {
      const session = await getManagedLiveSession(req, res);

      if (!session) return;

      const { identity } = req.params;
      const { trackSid, muted } = req.body || {};

      if (
        !identity ||
        identity.length > 128 ||
        !trackSid ||
        typeof trackSid !== "string" ||
        trackSid.length > 128 ||
        typeof muted !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message: "Dados de moderação inválidos."
        });
      }

      if (identity === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Não podes moderar o teu próprio microfone por esta operação."
        });
      }

      const roomService = getRoomService();

      const participant = await roomService.getParticipant(
        session.roomName,
        identity
      );

      const trackExists = (participant.tracks || []).some(
        (track) => track.sid === trackSid
      );

      if (!trackExists) {
        return res.status(404).json({
          success: false,
          message: "A faixa de áudio indicada não foi encontrada."
        });
      }

      const updatedTrack = await roomService.mutePublishedTrack(
        session.roomName,
        identity,
        trackSid,
        muted
      );

      return res.json({
        success: true,
        message: muted
          ? "Microfone silenciado."
          : "Pedido de reativação do microfone enviado.",
        track: {
          sid: updatedTrack.sid,
          muted: updatedTrack.muted
        }
      });
    } catch (error) {
      console.error("Erro ao moderar microfone:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível alterar o estado do microfone."
      });
    }
  }
);

// ==========================================
// REMOVER PARTICIPANTE
// ==========================================

router.delete(
  "/sessions/:id/participants/:identity",
  async (req, res) => {
    try {
      const session = await getManagedLiveSession(req, res);

      if (!session) return;

      const { identity } = req.params;

      if (!identity || identity.length > 128) {
        return res.status(400).json({
          success: false,
          message: "Identidade do participante inválida."
        });
      }

      if (identity === req.user._id.toString()) {
        return res.status(400).json({
          success: false,
          message: "Não podes remover a tua própria ligação por esta operação."
        });
      }

      const roomService = getRoomService();

      await roomService.removeParticipant(
        session.roomName,
        identity
      );

      return res.json({
        success: true,
        message: "Participante removido da aula."
      });
    } catch (error) {
      console.error("Erro ao remover participante:", error.message);

      return res.status(500).json({
        success: false,
        message: "Não foi possível remover o participante."
      });
    }
  }
);

export default router;

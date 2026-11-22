
import { Router } from "express";
import express from "express";
import {
  WebhookReceiver,
  RoomServiceClient
} from "livekit-server-sdk";

import LiveSession from "../models/LiveSession.js";

const router = Router();

function getWebhookReceiver() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Credenciais LiveKit não configuradas.");
  }

  return new WebhookReceiver(apiKey, apiSecret);
}

function getRoomService() {
  const {
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET
  } = process.env;

  if (!LIVEKIT_URL || !LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error("Credenciais LiveKit não configuradas.");
  }

  return new RoomServiceClient(
    LIVEKIT_URL,
    LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET
  );
}

async function closeSessionRoom(session) {
  const roomService = getRoomService();

  const rooms = await roomService.listRooms([
    session.roomName
  ]);

  const roomExists = rooms.some(
    room => room.name === session.roomName
  );

  if (roomExists) {
    await roomService.deleteRoom(session.roomName);
  }

  session.status = "completed";
  session.actualEnd = session.actualEnd || new Date();

  await session.save();
}

// ==========================================
// RECEBER EVENTOS DO LIVEKIT
// ==========================================

router.post(
  "/webhook",
  express.raw({
    type: "application/webhook+json",
    limit: "2mb"
  }),
  async (req, res) => {
    let event;

    try {
      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({
          success: false,
          message: "Payload do webhook inválido."
        });
      }

      const authorization = req.get("Authorization");

      if (!authorization) {
        return res.status(401).json({
          success: false,
          message: "Assinatura do webhook não fornecida."
        });
      }

      const receiver = getWebhookReceiver();

      event = await receiver.receive(
        req.body,
        authorization
      );
    } catch (error) {
      console.error(
        "Falha na validação do webhook LiveKit:",
        error.message
      );

      return res.status(401).json({
        success: false,
        message: "Não foi possível validar o webhook."
      });
    }

    try {
      if (event.event !== "egress_ended") {
        return res.status(200).json({
          success: true,
          message: "Evento recebido."
        });
      }

      const egressInfo = event.egressInfo;

      if (!egressInfo?.egressId) {
        return res.status(400).json({
          success: false,
          message: "Identificador Egress não encontrado."
        });
      }

      const session = await LiveSession.findOne({
        "recording.egressId": egressInfo.egressId
      });

      if (!session) {
        return res.status(200).json({
          success: true,
          message: "Gravação não associada a uma sessão."
        });
      }

      const status = Number(egressInfo.status);

      // EGRESS_COMPLETE = 3
      if (status === 3) {
        session.recording.status = "completed";
        session.recording.completedAt =
          session.recording.completedAt || new Date();

        await session.save();

        console.log(
          "Gravação concluída:",
          egressInfo.egressId
        );
      }

      // EGRESS_FAILED = 4
      // EGRESS_ABORTED = 5
      // EGRESS_LIMIT_REACHED = 6
      else if ([4, 5, 6].includes(status)) {
        session.recording.status = "failed";

        await session.save();

        console.error(
          "Falha na gravação:",
          egressInfo.egressId,
          egressInfo.error || "Erro não especificado."
        );
      } else {
        return res.status(200).json({
          success: true,
          message: "Estado Egress recebido."
        });
      }

      // Se o formador pediu para terminar a aula,
      // encerramos a sala depois do estado final do Egress.
      if (
        session.recording.endSessionRequested === true &&
        session.status === "live"
      ) {
        await closeSessionRoom(session);

        console.log(
          "Sala encerrada após finalização do Egress:",
          session.roomName
        );
      }

      return res.status(200).json({
        success: true,
        message: session.recording.status === "completed"
          ? "Gravação concluída e processada."
          : "Falha da gravação registada."
      });
    } catch (error) {
      console.error(
        "Erro ao processar evento Egress:",
        error.message
      );

      // Erro interno: permite ao LiveKit tentar entregar
      // novamente o webhook.
      return res.status(500).json({
        success: false,
        message: "Não foi possível processar o evento Egress."
      });
    }
  }
);

export default router;

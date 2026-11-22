
import { Router } from "express";
import express from "express";
import { WebhookReceiver } from "livekit-server-sdk";

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

      const event = await receiver.receive(
        req.body,
        authorization
      );

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
        session.recording.completedAt = new Date();

        await session.save();

        console.log(
          "Gravação concluída:",
          egressInfo.egressId
        );

        return res.status(200).json({
          success: true,
          message: "Gravação concluída com sucesso."
        });
      }

      // EGRESS_FAILED = 4
      // EGRESS_ABORTED = 5
      // EGRESS_LIMIT_REACHED = 6
      if ([4, 5, 6].includes(status)) {
        session.recording.status = "failed";

        await session.save();

        console.error(
          "Falha na gravação:",
          egressInfo.egressId,
          egressInfo.error || "Erro não especificado."
        );

        return res.status(200).json({
          success: true,
          message: "Falha da gravação registada."
        });
      }

      return res.status(200).json({
        success: true,
        message: "Estado Egress recebido."
      });
    } catch (error) {
      console.error(
        "Erro no webhook LiveKit:",
        error.message
      );

      return res.status(401).json({
        success: false,
        message: "Não foi possível validar o webhook."
      });
    }
  }
);

export default router;

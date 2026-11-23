
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import servicesRoutes from "./routes/services.js";
import { connectDatabase } from "./config/database.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import academyRoutes from "./routes/academy.js";
import livekitRoutes from "./routes/livekit.js";
import livekitWebhookRoutes from "./routes/livekitWebhook.js";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.replace(/\/$/, "");

      if (
        allowedOrigins.includes(normalizedOrigin) ||
        (process.env.NODE_ENV !== "production" &&
          normalizedOrigin === "http://localhost:5173")
      ) {
        return callback(null, true);
      }

      return callback(
        new Error("Origem não autorizada pelo CORS.")
      );
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Webhook LiveKit: deve vir antes do parser JSON.
app.use("/api/livekit", livekitWebhookRoutes);

// Limite aumentado para permitir comprovativos de pagamento.
app.use(express.json({ limit: "8mb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "ALDAIR ONE API",
    version: "1.0.0",
    message: "One Platform. Multiple Solutions."
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "aldair-one-server",
    database: "connected"
  });
});

// Autenticação
app.use("/api/auth", authRoutes);

// Administração
app.use("/api/admin", adminRoutes);

// Academia: cursos, turmas, inscrições e aulas online
app.use("/api/academy", academyRoutes);
// Pedidos de serviços tecnológicos
app.use("/api/services", servicesRoutes);
// Videoconferência LiveKit
app.use("/api/livekit", livekitRoutes);

// Rota não encontrada
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Rota não encontrada."
  });
});

// Tratamento de erros
app.use((error, req, res, next) => {
  console.error("Erro no servidor:", error.message);

  if (error.message === "Origem não autorizada pelo CORS.") {
    return res.status(403).json({
      success: false,
      message: "Origem não autorizada."
    });
  }

  return res.status(500).json({
    success: false,
    message: "Erro interno do servidor."
  });
});

const PORT = process.env.PORT || 10000;

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `ALDAIR ONE API activa na porta ${PORT}.`
      );
    });
  } catch (error) {
    console.error(
      "Falha ao iniciar ALDAIR ONE:",
      error.message
    );

    process.exit(1);
  }
}

startServer();

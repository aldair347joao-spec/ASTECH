
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

import { connectDatabase } from "./config/database.js";
import authRoutes from "./routes/auth.js";

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
      // Permite pedidos sem Origin, como verificações de saúde.
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

      return callback(new Error("Origem não autorizada pelo CORS."));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "1mb" }));

// Identificação da API
app.get("/", (req, res) => {
  res.json({
    success: true,
    name: "ALDAIR ONE API",
    version: "1.0.0",
    message: "One Platform. Multiple Solutions."
  });
});

// Verificação de saúde
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "aldair-one-server",
    database: "connected"
  });
});

// Rotas de autenticação
app.use("/api/auth", authRoutes);

// Rota inexistente
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

// Iniciar servidor depois de conectar à base de dados
const PORT = process.env.PORT || 10000;

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`ALDAIR ONE API activa na porta ${PORT}.`);
    });
  } catch (error) {
    console.error("Falha ao iniciar ALDAIR ONE:", error.message);
    process.exit(1);
  }
}

startServer();

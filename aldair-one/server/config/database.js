
import mongoose from "mongoose";

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI não está configurada no Web Service."
    );
  }

  await mongoose.connect(mongoUri, {
    dbName: process.env.DB_NAME || "aldair_one"
  });

  console.log("MongoDB conectado à base aldair_one.");
}

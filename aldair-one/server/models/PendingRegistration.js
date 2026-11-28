
import mongoose from "mongoose";

const pendingRegistrationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 150
    },

    // Palavra-passe já protegida com bcrypt
    passwordHash: {
      type: String,
      required: true,
      select: false
    },

    // Hash do código OTP, nunca o código original
    otpHash: {
      type: String,
      required: true,
      select: false
    },

    expiresAt: {
      type: Date,
      required: true
    },

    lastSentAt: {
      type: Date,
      required: true
    },

    attempts: {
      type: Number,
      default: 0
    },

    resendCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Eliminar automaticamente registos expirados
pendingRegistrationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Garantir apenas um registo pendente por email
pendingRegistrationSchema.index(
  { email: 1 },
  { unique: true }
);

const PendingRegistration = mongoose.model(
  "PendingRegistration",
  pendingRegistrationSchema
);

export default PendingRegistration;

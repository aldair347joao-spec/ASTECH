
import mongoose from "mongoose";

const serviceRequestSchema = new mongoose.Schema(
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
      trim: true,
      lowercase: true,
      maxlength: 150
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 30
    },
    service: {
      type: String,
      required: true,
      enum: [
        "Desenvolvimento de Sistemas",
        "Automação Inteligente",
        "Gestão Empresarial",
        "Inteligência Artificial"
      ]
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 3000
    },
    status: {
      type: String,
      enum: [
        "pending",
        "contacted",
        "in_progress",
        "completed",
        "cancelled"
      ],
      default: "pending"
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

const ServiceRequest = mongoose.model(
  "ServiceRequest",
  serviceRequestSchema
);

export default ServiceRequest;

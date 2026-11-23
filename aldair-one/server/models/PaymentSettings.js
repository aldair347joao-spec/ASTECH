
import mongoose from "mongoose";

const paymentSettingsSchema = new mongoose.Schema(
  {
    multicaixaExpress: {
      number: {
        type: String,
        trim: true,
        default: ""
      },
      holder: {
        type: String,
        trim: true,
        default: ""
      }
    },

    bfa: {
      holder: {
        type: String,
        trim: true,
        default: ""
      },
      account: {
        type: String,
        trim: true,
        default: ""
      },
      iban: {
        type: String,
        trim: true,
        default: ""
      }
    },

    instructions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "Indica o teu nome e o curso na descrição do pagamento."
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

const PaymentSettings =
  mongoose.models.PaymentSettings ||
  mongoose.model("PaymentSettings", paymentSettingsSchema);

export default PaymentSettings;

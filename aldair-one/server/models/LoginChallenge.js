
import mongoose from "mongoose";

const loginChallengeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true
    },

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

loginChallengeSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

loginChallengeSchema.index(
  { userId: 1 },
  { unique: true }
);

const LoginChallenge = mongoose.model(
  "LoginChallenge",
  loginChallengeSchema
);

export default LoginChallenge;

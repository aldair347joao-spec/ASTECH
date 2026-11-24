
import mongoose from "mongoose";

const liveChatMessageSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LiveSession",
      required: true,
      index: true
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    senderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },

    message: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    attachment: {
      originalName: {
        type: String,
        default: null
      },

      mimeType: {
        type: String,
        default: null
      },

      size: {
        type: Number,
        default: null
      },

      data: {
        type: String,
        default: null
      }
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

liveChatMessageSchema.index({
  session: 1,
  createdAt: 1
});

const LiveChatMessage =
  mongoose.models.LiveChatMessage ||
  mongoose.model("LiveChatMessage", liveChatMessageSchema);

export default LiveChatMessage;

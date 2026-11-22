
const mongoose = require("mongoose");

const LiveSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: ""
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    provider: {
      type: String,
      enum: ["livekit"],
      default: "livekit"
    },

    roomName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      immutable: true
    },

    scheduledStart: {
      type: Date,
      required: true,
      index: true
    },

    scheduledEnd: {
      type: Date,
      required: true
    },

    actualStart: {
      type: Date,
      default: null
    },

    actualEnd: {
      type: Date,
      default: null
    },

    timezone: {
      type: String,
      default: "Africa/Luanda",
      trim: true
    },

    status: {
      type: String,
      enum: [
        "scheduled",
        "live",
        "completed",
        "cancelled"
      ],
      default: "scheduled",
      index: true
    },

    recording: {
      enabled: {
        type: Boolean,
        default: false
      },

      status: {
        type: String,
        enum: [
          "disabled",
          "not_started",
          "recording",
          "processing",
          "completed",
          "failed"
        ],
        default: "disabled"
      },

      startedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      egressId: {
        type: String,
        default: null
      },

      recordingUrl: {
        type: String,
        default: null
      },

      startedAt: {
        type: Date,
        default: null
      },

      completedAt: {
        type: Date,
        default: null
      }
    },

    participantCount: {
      type: Number,
      default: 0,
      min: 0
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

LiveSessionSchema.index({
  class: 1,
  scheduledStart: 1
});

LiveSessionSchema.index({
  instructor: 1,
  status: 1
});

LiveSessionSchema.index({
  status: 1,
  scheduledStart: 1
});

LiveSessionSchema.pre("validate", function (next) {
  if (
    this.scheduledStart &&
    this.scheduledEnd &&
    this.scheduledEnd <= this.scheduledStart
  ) {
    this.invalidate(
      "scheduledEnd",
      "A hora de término deve ser posterior à hora de início."
    );
  }

  next();
});

module.exports =
  mongoose.models.LiveSession ||
  mongoose.model("LiveSession", LiveSessionSchema);

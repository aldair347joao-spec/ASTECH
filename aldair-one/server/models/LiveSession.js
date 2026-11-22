
import mongoose from "mongoose";

const blockedParticipantSchema = new mongoose.Schema(
  {
    identity: {
      type: String,
      required: true,
      trim: true
    },
    removedAt: {
      type: Date,
      default: Date.now
    },
    removedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { _id: false }
);

const liveSessionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },

    description: {
      type: String,
      trim: true,
      default: ""
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null
    },

    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      default: null
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
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
      immutable: true,
      trim: true
    },

    scheduledStart: {
      type: Date,
      required: true
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
      default: "Africa/Luanda"
    },

    status: {
      type: String,
      enum: [
        "scheduled",
        "live",
        "completed",
        "cancelled"
      ],
      default: "scheduled"
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
          "pending",
          "recording",
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

      recordingKey: {
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
      },

      endSessionRequested: {
        type: Boolean,
        default: false
      }
    },

    participantCount: {
      type: Number,
      default: 0,
      min: 0
    },

    blockedParticipants: {
      type: [blockedParticipantSchema],
      default: []
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
      default: ""
    }
  },
  {
    timestamps: true
  }
);

liveSessionSchema.pre("validate", function () {
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
});

liveSessionSchema.index({
  class: 1,
  scheduledStart: 1
});

liveSessionSchema.index({
  instructor: 1,
  scheduledStart: 1
});

liveSessionSchema.index({
  status: 1,
  scheduledStart: 1
});

const LiveSession =
  mongoose.models.LiveSession ||
  mongoose.model("LiveSession", liveSessionSchema);

export default LiveSession;

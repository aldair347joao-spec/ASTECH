
import mongoose from "mongoose";

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true
    },

    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    capacity: {
      type: Number,
      min: 1,
      default: 30
    },

    modality: {
      type: String,
      enum: ["online", "in_person", "hybrid"],
      default: "online"
    },

    location: {
      type: String,
      trim: true,
      default: ""
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    timezone: {
      type: String,
      default: "Africa/Luanda"
    },

    schedule: [
      {
        dayOfWeek: {
          type: Number,
          min: 0,
          max: 6,
          required: true
        },
        startTime: {
          type: String,
          required: true
        },
        endTime: {
          type: String,
          required: true
        }
      }
    ],

    status: {
      type: String,
      enum: [
        "draft",
        "open",
        "in_progress",
        "completed",
        "cancelled"
      ],
      default: "draft"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

classSchema.index({ course: 1, status: 1 });
classSchema.index({ instructor: 1, startDate: 1 });
classSchema.index({ students: 1 });

const Class = mongoose.model("Class", classSchema);

export default Class;

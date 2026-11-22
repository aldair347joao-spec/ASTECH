
import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    contentType: {
      type: String,
      enum: ["video", "text", "document", "link"],
      default: "text"
    },
    contentUrl: {
      type: String,
      trim: true,
      default: ""
    },
    durationMinutes: {
      type: Number,
      min: 0,
      default: 0
    },
    order: {
      type: Number,
      default: 1
    },
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  { _id: true }
);

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: ""
    },
    order: {
      type: Number,
      default: 1
    },
    lessons: {
      type: [lessonSchema],
      default: []
    }
  },
  { _id: true }
);

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    description: {
      type: String,
      trim: true,
      default: ""
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner"
    },
    coverImage: {
      type: String,
      trim: true,
      default: ""
    },
    price: {
      amount: {
        type: Number,
        min: 0,
        default: 0
      },
      currency: {
        type: String,
        default: "AOA"
      }
    },
    durationHours: {
      type: Number,
      min: 0,
      default: 0
    },
    modules: {
      type: [moduleSchema],
      default: []
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
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

courseSchema.index({ status: 1, createdAt: -1 });
courseSchema.index({ category: 1 });

const Course = mongoose.model("Course", courseSchema);

export default Course;

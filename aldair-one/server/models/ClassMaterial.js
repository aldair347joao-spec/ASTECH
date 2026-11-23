
import mongoose from "mongoose";

const classMaterialSchema = new mongoose.Schema(
  {
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
      index: true
    },

    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ["course", "lesson", "certificate"],
      required: true,
      index: true
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255
    },

    mimeType: {
      type: String,
      required: true
    },

    size: {
      type: Number,
      required: true,
      min: 1
    },

    data: {
      type: String,
      required: true
    },

    uploadedBy: {
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

classMaterialSchema.index({
  class: 1,
  type: 1,
  createdAt: -1
});

classMaterialSchema.index({
  student: 1,
  type: 1
});

const ClassMaterial =
  mongoose.models.ClassMaterial ||
  mongoose.model("ClassMaterial", classMaterialSchema);

export default ClassMaterial;

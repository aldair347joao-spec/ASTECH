
import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
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

    status: {
      type: String,
      enum: [
        "pending",
        "active",
        "completed",
        "cancelled"
      ],
      default: "pending",
      index: true
    },

    payment: {
      status: {
        type: String,
        enum: [
          "pending",
          "paid",
          "failed",
          "refunded",
          "not_required"
        ],
        default: "pending"
      },

      amount: {
        type: Number,
        default: 0,
        min: 0
      },

      currency: {
        type: String,
        default: "AOA",
        uppercase: true,
        trim: true
      },

      method: {
        type: String,
        enum: [
          "multicaixa_express",
          "bfa_transfer",
          null
        ],
        default: null
      },

      paidAt: {
        type: Date,
        default: null
      },

      reference: {
        type: String,
        trim: true,
        default: null
      },

      proof: {
        originalName: {
          type: String,
          default: null,
          trim: true
        },

        mimeType: {
          type: String,
          enum: [
            "application/pdf",
            "image/jpeg",
            "image/png"
          ],
          default: null
        },

        size: {
          type: Number,
          default: 0
        },

        data: {
          type: String,
          default: null
        },

        submittedAt: {
          type: Date,
          default: null
        },

        reviewStatus: {
          type: String,
          enum: [
            "not_submitted",
            "pending",
            "approved",
            "rejected"
          ],
          default: "not_submitted"
        },

        reviewedAt: {
          type: Date,
          default: null
        },

        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null
        },

        rejectionReason: {
          type: String,
          trim: true,
          maxlength: 500,
          default: ""
        }
      }
    },

    progress: {
      percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },

      completedLessons: [
        {
          type: mongoose.Schema.Types.ObjectId
        }
      ],

      lastAccessedAt: {
        type: Date,
        default: null
      }
    },

    enrolledAt: {
      type: Date,
      default: Date.now
    },

    startedAt: {
      type: Date,
      default: null
    },

    completedAt: {
      type: Date,
      default: null
    },

    cancelledAt: {
      type: Date,
      default: null
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

enrollmentSchema.index(
  {
    student: 1,
    class: 1
  },
  {
    unique: true,
    name: "unique_student_class_enrollment"
  }
);

enrollmentSchema.index({
  course: 1,
  status: 1
});

enrollmentSchema.index({
  student: 1,
  status: 1
});

const Enrollment =
  mongoose.models.Enrollment ||
  mongoose.model("Enrollment", enrollmentSchema);

export default Enrollment;

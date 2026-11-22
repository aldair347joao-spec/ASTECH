
const mongoose = require("mongoose");

const EnrollmentSchema = new mongoose.Schema(
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

      paidAt: {
        type: Date,
        default: null
      },

      reference: {
        type: String,
        trim: true,
        default: null
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

// Impede inscrições duplicadas do mesmo aluno
// na mesma turma.
EnrollmentSchema.index(
  {
    student: 1,
    class: 1
  },
  {
    unique: true,
    name: "unique_student_class_enrollment"
  }
);

// Facilita consultas por curso e estado.
EnrollmentSchema.index({
  course: 1,
  status: 1
});

// Facilita consultas por aluno e estado.
EnrollmentSchema.index({
  student: 1,
  status: 1
});

module.exports =
  mongoose.models.Enrollment ||
  mongoose.model("Enrollment", EnrollmentSchema);

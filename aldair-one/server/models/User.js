
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 150
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },

    role: {
      type: String,
      enum: [
        "super_admin",
        "admin",
        "instructor",
        "student",
        "client",
        "user"
      ],
      default: "student"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    adminVerificationCodeHash: {
      type: String,
      select: false
    },

    adminVerificationExpiresAt: {
      type: Date,
      select: false
    },

    adminVerifiedAt: {
      type: Date,
      default: null
    },

    passwordResetTokenHash: {
      type: String,
      select: false
    },

    passwordResetExpiresAt: {
      type: Date,
      select: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Evitar encriptação duplicada da palavra-passe
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  if (this.passwordAlreadyHashed === true) {
    this.passwordAlreadyHashed = false;
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

// Verificar palavra-passe no login
userSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remover dados sensíveis das respostas JSON
userSchema.set("toJSON", {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.adminVerificationCodeHash;
    delete ret.adminVerificationExpiresAt;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpiresAt;
    return ret;
  }
});

// Garantir que só existe um Super Administrador
userSchema.index(
  { role: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: "super_admin"
    },
    name: "unique_super_admin"
  }
);

const User = mongoose.model("User", userSchema);

export default User;

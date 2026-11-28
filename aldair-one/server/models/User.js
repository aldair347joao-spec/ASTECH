
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

    // Versão da sessão: permite invalidar tokens anteriores
    sessionVersion: {
      type: Number,
      default: 0
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

// Encriptar a palavra-passe antes de guardar
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  // A palavra-passe já foi protegida durante o registo pendente
  if (this.passwordAlreadyHashed === true) {
    this.passwordAlreadyHashed = false;
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

// Verificar palavra-passe
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

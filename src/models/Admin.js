import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "admin",
    },
    isBlocked: { type: Boolean, default: false },
    resetPasswordToken: String,
    resetPasswordExpire: Date,

  },
  { timestamps: true }
);

export default mongoose.model("Admin", adminSchema);

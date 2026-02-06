import mongoose from "mongoose";

const loginLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  email: String,
  ipAddress: String,
  location: String,
  loginTime: { type: Date, default: Date.now },
});

export default mongoose.model("LoginLog", loginLogSchema);

import Admin from "../models/Admin.js";
import LoginLog from "../models/LoginLog.js";

// 📋 Get all admins
export const getAllAdmins = async (req, res) => {
  const admins = await Admin.find().select("-password");
  res.json(admins);
};

// 🚫 Block admin
export const blockAdmin = async (req, res) => {
  await Admin.findByIdAndUpdate(req.params.id, { isBlocked: true });
  res.json({ message: "Admin blocked successfully" });
};

// 📜 Login history
export const getLoginLogs = async (req, res) => {
  const logs = await LoginLog.find()
    .populate("adminId", "name email")
    .sort({ loginTime: -1 });

  res.json(logs);
};

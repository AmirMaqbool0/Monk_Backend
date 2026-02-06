import bcrypt from "bcryptjs";
import crypto from "crypto";
import Admin from "../models/Admin.js";
import generateToken from "../utils/generateToken.js";
import LoginLog from "../models/LoginLog.js";
import fetch from "node-fetch";

/* =================================
   🆕 ADMIN REGISTRATION
================================= */
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Admin already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =================================
   🔑 ADMIN LOGIN
================================= */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (admin.isBlocked)
      return res.status(403).json({ message: "Your account is blocked" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(admin._id);

    // 🌍 IP address
    const ip =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";

    // 🌍 Location lookup
    let location = "Unknown";
    try {
      const geo = await fetch(`http://ip-api.com/json/${ip}`).then((r) =>
        r.json()
      );
      location = `${geo.city || "Unknown"}, ${geo.country || ""}`;
    } catch {
      location = "Unknown";
    }

    // 📝 Login log
    await LoginLog.create({
      adminId: admin._id,
      email: admin.email,
      ipAddress: ip,
      location,
    });

    res.status(200).json({
      message: "Login successful",
      token,
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

/* =================================
   📩 FORGOT PASSWORD
================================= */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");

    admin.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    admin.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

    await admin.save();

    const resetUrl = `http://localhost:3000/auth/reset-password/${resetToken}`;

    res.json({ message: "Reset link generated", resetUrl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* =================================
   🔄 RESET PASSWORD
================================= */
export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const admin = await Admin.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!admin)
      return res.status(400).json({ message: "Token invalid or expired" });

    admin.password = await bcrypt.hash(password, 10);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;

    await admin.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

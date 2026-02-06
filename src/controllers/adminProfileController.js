import bcrypt from "bcryptjs";

/* ===============================
   👤 UPDATE PROFILE
================================ */
export const updateProfile = async (req, res) => {
  try {
    const admin = req.admin;

    if (!admin)
      return res.status(401).json({ message: "Admin not authorized" });

    admin.name = req.body.name?.trim() || admin.name;
    admin.email = req.body.email?.trim() || admin.email;

    await admin.save();

    res.json({
      message: "Profile updated successfully",
      admin: { id: admin._id, name: admin.name, email: admin.email },
    });
  } catch (err) {
    console.error("Profile update error:", err.message);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/* ===============================
   🔑 CHANGE PASSWORD
================================ */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = req.admin;

    if (!admin)
      return res.status(401).json({ message: "Admin not authorized" });

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "All fields are required" });

    if (!admin.password)
      return res.status(500).json({ message: "Password data missing" });

    // Compare current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch)
      return res.status(401).json({ message: "Current password incorrect" });

    // Prevent using same password again
    const isSame = await bcrypt.compare(newPassword, admin.password);
    if (isSame)
      return res.status(400).json({ message: "New password must be different" });

    // Hash new password
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Password change error:", err.message);
    res.status(500).json({ message: "Failed to change password" });
  }
};

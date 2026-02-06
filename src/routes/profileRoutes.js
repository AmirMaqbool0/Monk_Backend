import express from "express";
import { updateProfile, changePassword } from "../controllers/adminProfileController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.put("/update-profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

export default router;

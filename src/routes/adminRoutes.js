import express from "express";
import {
  getAllAdmins,
  blockAdmin,
  getLoginLogs,
} from "../controllers/adminController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/admins", protect, getAllAdmins);
router.put("/block/:id", protect, blockAdmin);
router.get("/login-logs", protect, getLoginLogs);

export default router;

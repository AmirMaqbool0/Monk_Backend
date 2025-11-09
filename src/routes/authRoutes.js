import express from "express";
import { loginAdmin, registerAdmin } from "../controllers/authController.js";

const router = express.Router();

// Optional route to create admin (use once)
router.post("/register", registerAdmin);

// Login route
router.post("/login", loginAdmin);

export default router;

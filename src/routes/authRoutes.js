import express from "express";
import { loginAdmin, registerAdmin ,forgotPassword,resetPassword} from "../controllers/authController.js";

const router = express.Router();

// Optional route to create admin (use once)
router.post("/register", registerAdmin);

// Login route
router.post("/login", loginAdmin);

// RESTE AND FORGET PASSWORD 
router.post("/forgot-password", forgotPassword);
router.put("/reset-password/:token", resetPassword);

export default router;

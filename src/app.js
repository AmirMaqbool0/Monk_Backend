// src/app.js - ES Module version
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import formRoutes from "./routes/formRoutes.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Server is running successfully!",
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    server: "running",
    timestamp: new Date().toISOString()
  });
});

// Your API routes
app.use("/api/auth", authRoutes);
app.use("/api/form", formRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ 
    error: "Internal server error",
    message: "Something went wrong"
  });
});

export default app;
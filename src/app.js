// src/app.js - ES Module version
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import formRoutes from "./routes/formRoutes.js";

dotenv.config();
const app = express();

// CORS configuration
app.use(cors({
  origin: '*', // Change to your frontend URL in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Server is running successfully!",
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check with DB status
app.get("/health", async (req, res) => {
  try {
    // You might want to add DB health check here
    res.json({ 
      status: "healthy", 
      server: "running",
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({ 
      status: "unhealthy",
      error: error.message 
    });
  }
});

// Your API routes
app.use("/api/auth", authRoutes);
app.use("/api/form", formRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Route not found",
    path: req.path,
    method: req.method 
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(err.status || 500).json({ 
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;
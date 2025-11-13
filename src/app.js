// src/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import connectDB from "./config/db.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Fast health route - NO DB dependency
app.get("/", (req, res) => {
  return res.json({ 
    message: "🚀 Server is running successfully!",
    timestamp: new Date().toISOString(),
    status: "healthy"
  });
});

// Health check that doesn't depend on DB
app.get("/health", (req, res) => {
  return res.json({ 
    status: "healthy",
    server: "running",
    timestamp: new Date().toISOString()
  });
});

// DB middleware with timeout
let dbConnected = false;
let dbConnectionPromise = null;

async function ensureDb(req, res, next) {
  if (dbConnected) return next();
  
  // If we're already trying to connect, wait for that promise
  if (dbConnectionPromise) {
    try {
      await dbConnectionPromise;
      return next();
    } catch (err) {
      // Continue without DB for read operations if possible
      console.error("DB connection in progress failed:", err.message);
      return res.status(503).json({ 
        error: "Service temporarily unavailable", 
        detail: "Database connection failed" 
      });
    }
  }

  // Start new connection attempt
  try {
    dbConnectionPromise = connectDB();
    await dbConnectionPromise;
    dbConnected = true;
    dbConnectionPromise = null;
    console.log("MongoDB connected (lazy init).");
    return next();
  } catch (err) {
    dbConnectionPromise = null;
    console.error("DB connection failed:", err.message);
    return res.status(503).json({ 
      error: "Service temporarily unavailable", 
      detail: "Database connection failed" 
    });
  }
}

// Apply ensureDb only for API routes
app.use("/api", ensureDb);

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/form", formRoutes);

// Fallback 404
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ 
    error: "Internal Server Error",
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
  });
});

export default app;
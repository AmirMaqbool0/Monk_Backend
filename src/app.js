// src/app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import formRoutes from "./routes/formRoutes.js";
import connectDB from "./config/db.js";

dotenv.config();
const app = express();

// Lazy DB connect: first request will try to connect, subsequent requests reuse connection.
let dbConnected = false;

app.use(async (req, res, next) => {
  if (dbConnected) return next();
  try {
    await connectDB();
    dbConnected = true;
    console.log("MongoDB connected (lazy init).");
    return next();
  } catch (err) {
    console.error("DB connection failed:", err && err.message ? err.message : err);
    // return a quick JSON error instead of letting request hang
    return res.status(500).json({ error: "Database connection failed", detail: err?.message });
  }
});

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/form", formRoutes);

// Health route
app.get("/", (req, res) => {
  res.send("🚀 Server is running successfully!");
});

export default app;

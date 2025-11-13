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

// Fast health route: always respond quickly and NOT dependent on DB
app.get("/", (req, res) => {
  return res.send("🚀 Server is running successfully!");
});

// Lazy DB middleware that only applies to /api routes (so root is not blocked)
let dbConnected = false;
async function ensureDb(req, res, next) {
  if (dbConnected) return next();
  try {
    await connectDB(); // connectDB should reject quickly on failure (see db.js below)
    dbConnected = true;
    console.log("MongoDB connected (lazy init).");
    return next();
  } catch (err) {
    console.error("DB connection failed (ensureDb):", err && err.message ? err.message : err);
    // return an error for API routes quickly instead of hanging
    return res.status(500).json({ error: "Database connection failed", detail: err?.message });
  }
}

// Apply ensureDb only for API routes (do not block health checks)
app.use("/api", ensureDb);

// Mount API routes (they are now under /api and have DB available)
app.use("/api/auth", authRoutes);
app.use("/api/form", formRoutes);

// Fallback 404 for anything else
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

export default app;

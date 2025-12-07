// api/index.js (ESM) - Vercel compatible
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import dotenv from "dotenv";

dotenv.config();

// Ensure MongoDB connects only once per cold start
if (!global.__mongoConnection) {
  global.__mongoConnection = connectDB(); // Must return a promise
}

// Serverless entry point for Vercel
export default async function handler(req, res) {
  // Wait for DB to connect
  try {
    await global.__mongoConnection;
  } catch (err) {
    console.error("❌ DB connection failed:", err);
    return res.status(500).json({ error: "Database connection error" });
  }

  // Properly pass the request to the Express app
  // Using .handle avoids Express trying to load './router'
  app.handle(req, res);
}

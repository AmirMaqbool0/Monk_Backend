// api/index.js — FINAL VERCEL SERVERLESS HANDLER
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;

export default async function handler(req, res) {
  // Connect DB one time per cold start
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.error("❌ MongoDB connection failed:", err.message);
      return res.status(500).json({ error: "Database connection failed" });
    }
  }

  // IMPORTANT: Express apps ARE functions in serverless
  // DO NOT use app.handle(), DO NOT use app.listen()
  return app(req, res);
}

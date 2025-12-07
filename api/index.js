// api/index.js — Express + Vercel (Serverless Function)
import serverless from "serverless-http";
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;

// Vercel Serverless handler
export default async function handler(req, res) {
  try {
    if (!isConnected) {
      await connectDB();
      isConnected = true;
    }
  } catch (err) {
    console.error("DB Connection Error:", err);
    return res.status(500).json({ error: "Database connection error" });
  }

  // Convert Express to a serverless handler
  const expressHandler = serverless(app);

  // Execute it
  return expressHandler(req, res);
}

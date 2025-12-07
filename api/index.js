// api/index.js (Vercel Serverless)
import app from "../src/app.js";
import connectDB from "../src/config/db.js";

let dbConnected = false;

// Vercel serverless entry point
export default async function handler(req, res) {
  try {
    if (!dbConnected) {
      await connectDB();
      dbConnected = true;
    }
  } catch (err) {
    console.error("DB error:", err);
    return res.status(500).json({ error: "Database connection failed" });
  }

  // Handle the request with Express
  return app(req, res);
}

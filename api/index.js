// api/index.js (ESM) - use this on Vercel
import app from "../src/app.js";
import connectDB from "../src/config/db.js"; // adapt path if different
import dotenv from "dotenv";

dotenv.config();

// Connect DB once per cold start (cache the promise)
if (!global.__mongoConnection) {
  global.__mongoConnection = connectDB(); // should return a promise
}

// Export default handler expected by Vercel for ESM
export default async function handler(req, res) {
  // ensure DB connected before handling request
  try {
    await global.__mongoConnection;
  } catch (err) {
    console.error("DB connection failed:", err);
    res.status(500).json({ error: "DB connection error" });
    return;
  }

  // forward to express app (express app is a function)
  return app(req, res);
}

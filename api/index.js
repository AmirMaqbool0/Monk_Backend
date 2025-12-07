import app from "../src/app.js";
import connectDB from "../src/config/db.js";

let connected = false;

export default async function handler(req, res) {
  if (!connected) {
    try {
      await connectDB();
      connected = true;
    } catch (err) {
      console.error("DB ERROR:", err);
      return res.status(500).json({ error: "Database connection error" });
    }
  }

  return app(req, res);
}

export const config = {
  runtime: "nodejs20.x"
};

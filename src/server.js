import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";

dotenv.config();

// Connect to DB
connectDB();

export default async function handler(req, res) {
  return app(req, res);
}

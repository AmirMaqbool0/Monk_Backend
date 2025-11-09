import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import formRoutes from "./routes/formRoutes.js";
dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/form", formRoutes);
// Test Route
app.get("/", (req, res) => {
  res.send("🚀 Server is running successfully!");
});

export default app;

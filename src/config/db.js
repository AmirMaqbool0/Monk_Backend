// src/config/db.js
import mongoose from "mongoose";

const options = {
  // Modern driver (>=4) doesn't need useNewUrlParser / useUnifiedTopology.
  // You can provide other options if needed.
  serverSelectionTimeoutMS: 5000, // fail fast (5s) if Atlas is unreachable
  socketTimeoutMS: 45000
};

export default async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  // If already connected, just return
  if (mongoose.connection.readyState === 1) {
    console.log("MongoDB already connected (readyState=1).");
    return mongoose.connection;
  }

  // Prevent mongoose from buffering commands if disconnected
  mongoose.set("bufferCommands", false);

  try {
    await mongoose.connect(uri, options);
    console.log("✅ MongoDB connected successfully");
    // Optional: attach listeners
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error (event):", err);
    });
    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
    });
    return mongoose.connection;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err && err.message ? err.message : err);
    throw err; // rethrow so callers know it failed
  }
}

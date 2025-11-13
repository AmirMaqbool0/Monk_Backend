// src/config/db.js
import mongoose from "mongoose";

const options = {
  serverSelectionTimeoutMS: 3000, // Reduce to 3 seconds for faster failure
  socketTimeoutMS: 30000,
  maxPoolSize: 1, // Important for serverless - reduce connections
  bufferCommands: false // Disable buffering (this replaces bufferMaxEntries)
};

// Cache the connection to reuse in serverless environment
let cachedConnection = null;

export default async function connectDB() {
  // If we have a cached connection and it's connected, use it
  if (cachedConnection && mongoose.connection.readyState === 1) {
    console.log("Using cached MongoDB connection");
    return cachedConnection;
  }

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set in environment variables");
  }

  // Close any existing connection that might be in a bad state
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  try {
    console.log("Attempting MongoDB connection...");
    
    // Set global mongoose options
    mongoose.set("bufferCommands", false); // This replaces bufferMaxEntries
    
    await mongoose.connect(uri, options);
    console.log("✅ MongoDB connected successfully");
    
    cachedConnection = mongoose.connection;
    
    // Connection event handlers
    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err.message);
      cachedConnection = null;
    });
    
    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
      cachedConnection = null;
    });

    return mongoose.connection;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    cachedConnection = null;
    throw err;
  }
}
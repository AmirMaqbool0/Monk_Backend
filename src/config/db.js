// src/config/db.js
import mongoose from "mongoose";

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  // timeout so it errors quickly instead of hanging
  serverSelectionTimeoutMS: 5000
};

export default async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set");
  }

  if (mongoose.connection.readyState === 1) {
    // already connected
    return mongoose.connection;
  }

  // mongoose.connect returns a Promise
  return mongoose.connect(uri, options);
}

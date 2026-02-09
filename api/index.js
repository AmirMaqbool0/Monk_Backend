// api/index.js
import serverless from "serverless-http";
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Important:
 * We cache BOTH the DB connection promise and the serverless handler
 * so Vercel doesn't recreate them on every invocation (cold start optimization)
 */

// Cache DB connection across invocations
if (!global.__mongoConnection) {
  global.__mongoConnection = connectDB(); // should return a promise
}

// Create serverless express wrapper ONCE
if (!global.__serverlessHandler) {
  global.__serverlessHandler = serverless(app);
}

export default async function handler(req, res) {
  try {
    // Ensure database is connected before handling request
    await global.__mongoConnection;

    // Forward request to Express app
    return await global.__serverlessHandler(req, res);

  } catch (error) {
    console.error("Server error:", error);

    // Fallback error response
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        message: error.message || "Unexpected server failure",
      });
    }
  }
}

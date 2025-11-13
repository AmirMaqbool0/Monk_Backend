// api/index.js
import serverless from "serverless-http";
import app from "../src/app.js";
import connectDB from "../src/config/db.js";

// Connect to MongoDB (optional here — see robust option below)
connectDB().catch(err => {
  console.error("DB connection failed at startup:", err);
  // don't crash deploy here; still export the handler so Vercel can handle requests
});

export default serverless(app);

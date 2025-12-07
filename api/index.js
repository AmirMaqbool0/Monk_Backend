// api/index.js — debug-friendly Vercel handler
import app from "../src/app.js";
import connectDB from "../src/config/db.js";
import dotenv from "dotenv";

dotenv.config();

let isConnected = false;

function now() {
  return new Date().toISOString();
}

export default async function handler(req, res) {
  console.log(`[${now()}] [VERCEL_HANDLER] incoming: ${req.method} ${req.url}`);

  // Connect DB one time per cold start
  if (!isConnected) {
    try {
      console.log(`[${now()}] [VERCEL_HANDLER] connecting to DB...`);
      await connectDB();
      isConnected = true;
      console.log(`[${now()}] [VERCEL_HANDLER] DB connected`);
    } catch (err) {
      console.error(`[${now()}] [VERCEL_HANDLER] DB connect error:`, err);
      // Return JSON so Vercel logs show structured error
      return res.status(500).json({ error: "Database connection failed", detail: err?.message || String(err) });
    }
  }

  // Catch global rejections during the request lifecycle (helps catch async throws)
  function onUnhandledRejection(err) {
    console.error(`[${now()}] [VERCEL_HANDLER] unhandledRejection:`, err);
  }
  process.on("unhandledRejection", onUnhandledRejection);

  // Run the express app and wait for the response to finish/close so we can capture errors
  try {
    await new Promise((resolve, reject) => {
      // listen for when response ends or client disconnects
      res.on("finish", () => {
        console.log(`[${now()}] [VERCEL_HANDLER] response finished: ${req.method} ${req.url} -> ${res.statusCode}`);
        resolve();
      });
      res.on("close", () => {
        console.log(`[${now()}] [VERCEL_HANDLER] response closed`);
        resolve();
      });

      try {
        // call the express app; it will handle the req/res
        app(req, res);
      } catch (syncErr) {
        // synchronous error thrown while invoking app
        console.error(`[${now()}] [VERCEL_HANDLER] sync error when calling app:`, syncErr);
        reject(syncErr);
      }
    });
  } catch (err) {
    console.error(`[${now()}] [VERCEL_HANDLER] error while handling request:`, err);
    // Guard: if headers already sent, nothing we can do
    if (!res.headersSent) {
      res.status(500).json({ error: "Express handler error", detail: err?.message || String(err) });
    }
  } finally {
    process.removeListener("unhandledRejection", onUnhandledRejection);
  }
}

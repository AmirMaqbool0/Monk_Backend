// api/index.js
import serverless from "serverless-http";
import app from "../src/app.js";

// Increase timeout for serverless (Vercel has 10s timeout for free tier)
export const handler = serverless(app, {
  binary: false,
  request: function(request, event, context) {
    // You can add request transformations here if needed
  },
  response: function(response, event, context) {
    // You can add response transformations here if needed
  }
});

export default handler;
// api/index.js
import serverless from "serverless-http";
import app from "../src/app.js";

// Do NOT connect DB here at module import time.
// Just export the serverless-wrapped Express app as the default export.
export default serverless(app);

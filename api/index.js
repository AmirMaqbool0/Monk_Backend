// api/index.js - Minimal working ES module
import express from 'express';
import serverless from 'serverless-http';

const app = express();

app.get('/', (req, res) => {
  res.json({ 
    message: "✅ API is working with ES modules!",
    timestamp: new Date().toISOString(),
    status: "success"
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', server: 'running' });
});

export const handler = serverless(app);
export default handler;
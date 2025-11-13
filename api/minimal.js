// api/minimal.js - No database dependencies
import express from 'express';
import serverless from 'serverless-http';

const app = express();

app.use(express.json());

// Simple routes that respond immediately
app.get('/', (req, res) => {
  res.json({ 
    message: "✅ API is working without database!",
    timestamp: new Date().toISOString(),
    status: "success"
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', server: 'running' });
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working' });
});

export const handler = serverless(app);
export default handler;
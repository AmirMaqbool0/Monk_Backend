// api/index.js - Debug version
import serverless from "serverless-http";

// Create a simple app without any dependencies
const app = require('express')();

app.use(require('cors')());
app.use(require('express').json());

app.get('/', (req, res) => {
  console.log('Root route called');
  res.json({ 
    message: "✅ Debug: Server is working!",
    timestamp: new Date().toISOString(),
    status: "success"
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', server: 'running' });
});

// Test without database first
app.get('/api/test', (req, res) => {
  res.json({ message: 'API test without DB' });
});

export const handler = serverless(app);
export default handler;
// api/test.js - Minimal test
export default function handler(request, response) {
  response.status(200).json({
    message: "✅ API is working!",
    timestamp: new Date().toISOString(),
    status: "success"
  });
}
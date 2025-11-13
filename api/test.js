// api/test.js - Minimal working version
export default function handler(request, response) {
  console.log('Function invoked');
  
  try {
    response.status(200).json({
      message: "✅ API is working!",
      timestamp: new Date().toISOString(),
      status: "success"
    });
  } catch (error) {
    console.error('Error in handler:', error);
    response.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
}
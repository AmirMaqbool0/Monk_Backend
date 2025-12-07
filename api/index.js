// api/index.js
import serverless from 'serverless-http';
import app from '../src/app.js';
import connectDB from '../src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
let isConnected = false;

const connectToDB = async () => {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }
};

// Create serverless handler
const handler = serverless(app);

// Export the handler with DB connection
export default async function(req, res) {
  try {
    // Connect to DB on cold start
    await connectToDB();
    // Process the request
    return await handler(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};
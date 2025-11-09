// src/utils/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configure Cloudinary with better error handling
const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  console.log('🔧 Cloudinary Configuration Check:');
  console.log('CLOUDINARY_CLOUD_NAME:', cloudName || '✗ MISSING');
  console.log('CLOUDINARY_API_KEY:', apiKey ? '✓ Loaded' : '✗ MISSING');
  console.log('CLOUDINARY_API_SECRET:', apiSecret ? '***' + apiSecret.slice(-3) : '✗ MISSING');

  // Check if all required environment variables are present
  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Cloudinary configuration incomplete!');
    console.error('Please check your .env file and ensure all Cloudinary variables are set.');
    return false;
  }

  try {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });
    console.log('✅ Cloudinary configured successfully');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary configuration failed:', error);
    return false;
  }
};

// Initialize Cloudinary configuration
const isCloudinaryConfigured = configureCloudinary();

// Direct upload function with better error handling
export const uploadToCloudinary = async (fileBuffer, originalName) => {
  return new Promise((resolve, reject) => {
    // Check if Cloudinary is configured
    if (!isCloudinaryConfigured) {
      return reject(new Error('Cloudinary is not configured. Please check your environment variables.'));
    }

    // Validate Cloudinary configuration
    if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
      return reject(new Error('Cloudinary configuration is invalid.'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'auto',
        folder: 'form-uploads',
        public_id: `file-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'ppt', 'pptx', 'zip'],
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else {
          console.log('✅ Cloudinary upload successful:', result.secure_url);
          resolve(result);
        }
      }
    );
    
    uploadStream.on('error', (error) => {
      console.error('❌ Upload stream error:', error);
      reject(new Error(`Upload stream failed: ${error.message}`));
    });
    
    uploadStream.end(fileBuffer);
  });
};

// Test Cloudinary connection
export const testCloudinaryConnection = async () => {
  if (!isCloudinaryConfigured) {
    console.log('❌ Cloudinary not configured, skipping connection test');
    return false;
  }

  try {
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection test successful');
    return true;
  } catch (error) {
    console.error('❌ Cloudinary connection test failed:', error);
    return false;
  }
};

export default cloudinary;
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary with credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS URLs
});

// Validate configuration on startup
const validateConfig = () => {
  const { cloud_name, api_key, api_secret } = cloudinary.config();

  if (!cloud_name || !api_key || !api_secret) {
    console.warn('Cloudinary configuration is incomplete. Please check your environment variables:');
    console.warn('- CLOUDINARY_CLOUD_NAME');
    console.warn('- CLOUDINARY_API_KEY');
    console.warn('- CLOUDINARY_API_SECRET');
    return false;
  }

  console.log(`Cloudinary configured for cloud: ${cloud_name}`);
  return true;
};

// Run validation
validateConfig();

export default cloudinary;

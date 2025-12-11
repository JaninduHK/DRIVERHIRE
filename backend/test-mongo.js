import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('Testing MongoDB connection...');
console.log('URI:', process.env.MONGO_URI.substring(0, 50) + '...');

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log('✓ MongoDB connected successfully');
  process.exit(0);
})
.catch((error) => {
  console.error('✗ Connection failed:', error.message);
  process.exit(1);
});

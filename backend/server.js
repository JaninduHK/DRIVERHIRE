import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDatabase from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import briefRoutes from './routes/briefRoutes.js';
import publicDriverRoutes from './routes/publicDriverRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

const allowedOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.set('trust proxy', 1);

app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsPath = path.join(__dirname, '../uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  fs.mkdirSync(path.join(uploadsPath, 'vehicles'), { recursive: true });
  fs.mkdirSync(path.join(uploadsPath, 'profiles'), { recursive: true });
  fs.mkdirSync(path.join(uploadsPath, 'commissions'), { recursive: true });
}

app.use(['/uploads', '/api/uploads'], express.static(uploadsPath, {
  maxAge: '1d',
  etag: false,
}));

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/briefs', briefRoutes);
app.use('/api/drivers', publicDriverRoutes);
app.use('/api/support', supportRoutes);

// Error handler for multer and other errors
app.use((error, req, res, next) => {
  console.error('Request error:', error.message);
  
  // Multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File size too large. Maximum 10MB allowed.' });
  }
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ message: 'Too many files. Maximum 5 files allowed.' });
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Unexpected file field.' });
  }
  
  // Generic multer or validation errors
  if (error.message && error.message.includes('Only image uploads are allowed')) {
    return res.status(400).json({ message: 'Only image files are allowed.' });
  }
  
  // Default error response
  res.status(error.status || 500).json({ 
    message: error.message || 'An error occurred processing your request.' 
  });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    console.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
  }

  try {
    await connectDatabase(process.env.MONGO_URI);

    app.listen(PORT, () => {
      console.log(`Server started on PORT: ${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  }
};

startServer();

export default app;

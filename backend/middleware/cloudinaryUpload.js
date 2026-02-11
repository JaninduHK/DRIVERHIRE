import multer from 'multer';

// Use memory storage instead of disk storage
// Files will be available in req.file.buffer or req.files[].buffer
const memoryStorage = multer.memoryStorage();

/**
 * Vehicle Image Upload Middleware
 * - Accepts up to 5 image files
 * - Maximum file size: 10MB per file
 * - Only image files allowed
 * - Stores files in memory (req.files[].buffer)
 */
export const vehicleImageUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5, // Maximum 5 files
  },
  fileFilter: (_req, file, cb) => {
    // Only accept image files
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    return cb(null, true);
  },
});

/**
 * Profile Photo Upload Middleware
 * - Accepts single image file
 * - Maximum file size: 10MB
 * - Only image files allowed
 * - Stores file in memory (req.file.buffer)
 */
export const profilePhotoUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (_req, file, cb) => {
    // Only accept image files
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    return cb(new Error('Only image uploads are allowed'));
  },
});

/**
 * Commission Payment Slip Upload Middleware
 * - Accepts single file (image or PDF)
 * - Maximum file size: 10MB
 * - Accepts images and PDFs
 * - Stores file in memory (req.file.buffer)
 */
export const commissionSlipUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1, // Single file
  },
  fileFilter: (_req, file, cb) => {
    // Accept images or PDFs
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    if (file.mimetype === 'application/pdf') {
      return cb(null, true);
    }
    return cb(new Error('Only image or PDF uploads are allowed'));
  },
});

/**
 * Conditional Profile Upload Middleware
 * - Checks content-type header before applying multer
 * - Only applies multer if multipart/form-data is present
 * - Allows JSON requests to pass through without multer
 */
export const conditionalProfileUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';

  // Only apply multer if multipart/form-data is present
  if (contentType.includes('multipart/form-data')) {
    return profilePhotoUpload.single('profilePhoto')(req, res, next);
  }

  // For JSON requests, skip multer
  return next();
};

export default {
  vehicleImageUpload,
  profilePhotoUpload,
  commissionSlipUpload,
  conditionalProfileUpload,
};

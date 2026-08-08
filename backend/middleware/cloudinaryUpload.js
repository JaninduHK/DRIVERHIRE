import multer from 'multer';

// Use memory storage instead of disk storage
// Files will be available in req.file.buffer or req.files[].buffer
const memoryStorage = multer.memoryStorage();

// React Native / mobile clients frequently send an empty or generic ("application/
// octet-stream") mimetype even for valid JPEG/PNG/WebP/HEIC photos, which made the old
// `mimetype.startsWith('image/')` check reject genuine images. Fall back to the file
// extension in that case. Cloudinary re-encodes everything to JPEG on upload
// (resource_type: 'image', format: 'jpg'), so HEIC/HEIF are safe to accept here too.
const IMAGE_EXTENSION = /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif)$/i;

const isImageUpload = (file) => {
  const mimetype = (file && file.mimetype) || '';
  if (mimetype.startsWith('image/')) {
    return true;
  }
  if (
    (mimetype === '' || mimetype === 'application/octet-stream') &&
    IMAGE_EXTENSION.test((file && file.originalname) || '')
  ) {
    return true;
  }
  return false;
};

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
    if (!isImageUpload(file)) {
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
    if (isImageUpload(file)) {
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
    if (isImageUpload(file)) {
      return cb(null, true);
    }
    if (file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '')) {
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

/**
 * Review Image Upload Middleware
 * - Accepts up to 4 image files (field name "images")
 * - Maximum file size: 10MB per file
 * - Only image files allowed
 */
export const reviewImageUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 4,
  },
  fileFilter: (_req, file, cb) => {
    if (isImageUpload(file)) {
      return cb(null, true);
    }
    return cb(new Error('Only image uploads are allowed'));
  },
});

/**
 * Conditional Review Image Upload Middleware
 * - Applies multer only for multipart/form-data (photos attached);
 *   plain JSON reviews pass straight through.
 */
export const conditionalReviewImageUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return reviewImageUpload.array('images', 4)(req, res, next);
  }
  return next();
};

export default {
  vehicleImageUpload,
  profilePhotoUpload,
  commissionSlipUpload,
  conditionalProfileUpload,
  reviewImageUpload,
  conditionalReviewImageUpload,
};

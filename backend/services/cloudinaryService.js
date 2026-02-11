import cloudinary from '../config/cloudinary.js';
import dotenv from 'dotenv';

dotenv.config();

const FOLDER_PREFIX = process.env.CLOUDINARY_FOLDER_PREFIX || 'driverhire';

/**
 * Check if a URL is from Cloudinary
 * @param {string} url - URL to check
 * @returns {boolean} - True if URL is from Cloudinary
 */
export const isCloudinaryUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
};

/**
 * Extract public_id from a Cloudinary URL
 * @param {string} cloudinaryUrl - Full Cloudinary URL
 * @returns {string|null} - Public ID or null if extraction fails
 */
export const extractPublicId = (cloudinaryUrl) => {
  if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string') return null;

  try {
    // Cloudinary URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{transformations}/{version}/{public_id}.{format}
    // We need to extract the public_id which includes the folder path

    // Remove the base URL and get the path after 'upload/'
    const uploadIndex = cloudinaryUrl.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let pathAfterUpload = cloudinaryUrl.substring(uploadIndex + 8); // '/upload/' is 8 characters

    // Remove version number if present (starts with 'v' followed by digits)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

    // Remove file extension
    const lastDotIndex = pathAfterUpload.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      pathAfterUpload = pathAfterUpload.substring(0, lastDotIndex);
    }

    return pathAfterUpload;
  } catch (error) {
    console.error('Error extracting public_id from Cloudinary URL:', error);
    return null;
  }
};

/**
 * Upload an image to Cloudinary
 * @param {Buffer} buffer - Image buffer from multer memory storage
 * @param {string} folder - Folder name (e.g., 'vehicles', 'profiles', 'commissions')
 * @param {string} filename - Custom filename (without extension)
 * @param {object} options - Additional upload options
 * @returns {Promise<string>} - Cloudinary secure URL
 */
export const uploadImage = (buffer, folder, filename, options = {}) => {
  return new Promise((resolve, reject) => {
    const folderPath = `${FOLDER_PREFIX}/${folder}`;

    const uploadOptions = {
      folder: folderPath,
      public_id: filename,
      resource_type: 'image',
      format: 'jpg', // Auto-convert to JPEG for consistency
      transformation: [
        { quality: 'auto:good', fetch_format: 'auto' },
        ...(options.transformation || []),
      ],
      ...options,
    };

    // Apply specific transformations based on folder
    if (folder === 'profiles') {
      uploadOptions.transformation = [
        { width: 800, height: 800, crop: 'limit', quality: 'auto:best', fetch_format: 'auto' },
      ];
    } else if (folder === 'vehicles') {
      uploadOptions.transformation = [
        { width: 1920, height: 1080, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' },
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error('Cloudinary upload error:', error);
        return reject(new Error(`Failed to upload image: ${error.message}`));
      }

      if (!result || !result.secure_url) {
        return reject(new Error('Cloudinary upload failed: No URL returned'));
      }

      resolve(result.secure_url);
    });

    // Write buffer to upload stream
    uploadStream.end(buffer);
  });
};

/**
 * Upload a file to Cloudinary (supports PDFs and images)
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {string} folder - Folder name
 * @param {string} filename - Custom filename (without extension)
 * @param {string} resourceType - 'image' or 'raw' (use 'raw' for PDFs)
 * @param {object} options - Additional upload options
 * @returns {Promise<string>} - Cloudinary secure URL
 */
export const uploadFile = (buffer, folder, filename, resourceType = 'image', options = {}) => {
  return new Promise((resolve, reject) => {
    const folderPath = `${FOLDER_PREFIX}/${folder}`;

    const uploadOptions = {
      folder: folderPath,
      public_id: filename,
      resource_type: resourceType,
      ...options,
    };

    // Don't apply transformations for raw files (PDFs)
    if (resourceType === 'image') {
      uploadOptions.transformation = [
        { quality: 'auto:good', fetch_format: 'auto' },
        ...(options.transformation || []),
      ];
    }

    const uploadStream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error('Cloudinary file upload error:', error);
        return reject(new Error(`Failed to upload file: ${error.message}`));
      }

      if (!result || !result.secure_url) {
        return reject(new Error('Cloudinary upload failed: No URL returned'));
      }

      resolve(result.secure_url);
    });

    // Write buffer to upload stream
    uploadStream.end(buffer);
  });
};

/**
 * Delete an asset from Cloudinary
 * @param {string} cloudinaryUrl - Full Cloudinary URL or public_id
 * @param {string} resourceType - 'image' or 'raw' (default: 'image')
 * @returns {Promise<object>} - Deletion result
 */
export const deleteAsset = async (cloudinaryUrl, resourceType = 'image') => {
  try {
    if (!cloudinaryUrl) {
      throw new Error('Cloudinary URL or public_id is required');
    }

    // Extract public_id if a full URL was provided
    let publicId = cloudinaryUrl;
    if (cloudinaryUrl.includes('cloudinary.com')) {
      publicId = extractPublicId(cloudinaryUrl);
      if (!publicId) {
        throw new Error('Failed to extract public_id from URL');
      }
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true, // Invalidate CDN cache
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      console.warn(`Cloudinary deletion warning for ${publicId}:`, result);
    }

    return result;
  } catch (error) {
    console.error('Error deleting asset from Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete multiple assets from Cloudinary
 * @param {string[]} cloudinaryUrls - Array of Cloudinary URLs or public_ids
 * @param {string} resourceType - 'image' or 'raw' (default: 'image')
 * @returns {Promise<object[]>} - Array of deletion results
 */
export const deleteMultipleAssets = async (cloudinaryUrls, resourceType = 'image') => {
  try {
    if (!Array.isArray(cloudinaryUrls) || cloudinaryUrls.length === 0) {
      return [];
    }

    const deletionPromises = cloudinaryUrls.map((url) => deleteAsset(url, resourceType));

    const results = await Promise.allSettled(deletionPromises);

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`Failed to delete asset ${cloudinaryUrls[index]}:`, result.reason);
      }
    });

    return results;
  } catch (error) {
    console.error('Error deleting multiple assets from Cloudinary:', error);
    throw error;
  }
};

/**
 * Generate a unique filename with timestamp and random suffix
 * @param {string} prefix - Optional prefix (e.g., vehicleId, userId)
 * @returns {string} - Unique filename
 */
export const generateUniqueFilename = (prefix = '') => {
  const timestamp = Date.now();
  const randomSuffix = Math.round(Math.random() * 1e9);
  return prefix ? `${prefix}-${timestamp}-${randomSuffix}` : `${timestamp}-${randomSuffix}`;
};

export default {
  uploadImage,
  uploadFile,
  deleteAsset,
  deleteMultipleAssets,
  extractPublicId,
  isCloudinaryUrl,
  generateUniqueFilename,
};

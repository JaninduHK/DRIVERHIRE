# Image Upload Fix Documentation

## Issues Fixed

### 1. **Boolean Validation Issue**
**Problem**: FormData sends boolean fields as strings (e.g., `'true'`, `'false'`), but express-validator's `.isBoolean()` method expects actual boolean types. This caused validation to fail, preventing requests from reaching the upload handlers.

**Solution**: Replaced `.isBoolean().toBoolean()` with custom validators that accept both string and boolean representations.

**Files Updated**:
- `backend/routes/driverRoutes.js` - Vehicle creation/update endpoints
- `backend/routes/authRoutes.js` - Profile update endpoint  
- `backend/routes/adminRoutes.js` - Admin vehicle update and discount endpoints

### 2. **Upload Directory Path Issue**
**Problem**: The upload directory paths used `path.join(__dirname, '../..', 'uploads/...')` which didn't resolve correctly in production, potentially causing files to be saved in wrong locations.

**Solution**: Changed to `path.join(__dirname, '../../uploads/...')` for proper path resolution.

**Files Updated**:
- `backend/routes/authRoutes.js` - Profile uploads
- `backend/routes/driverRoutes.js` - Vehicle images and commission slips

### 3. **Missing Error Handling**
**Problem**: Multer errors weren't being caught and returned with proper error messages.

**Solution**: Added global error handler middleware in `server.js` to catch and respond to multer errors.

### 4. **Missing Directory Creation**
**Problem**: Upload directories might not exist on VPS, causing file write failures.

**Solution**: Added automatic directory creation in `server.js` on server startup.

## Files Modified

### backend/server.js
- Added `fs` import for file system operations
- Ensured all upload directories exist on startup
- Added static file serving configuration with caching
- Added global error handler for multer and validation errors

### backend/routes/driverRoutes.js
- Fixed upload directory paths for vehicles and commissions
- Updated boolean field validators (6 fields)

### backend/routes/authRoutes.js
- Fixed upload directory path for profiles
- Updated boolean field validators (2 fields)

### backend/routes/adminRoutes.js
- Updated boolean field validators (6 fields in vehicle updates)
- Updated boolean field validators (2 fields in discount endpoints)

## How Uploads Work Now

### Vehicle Upload Flow
1. Frontend sends FormData with:
   - `model` (string)
   - `year` (string number)
   - `pricePerDay` (string number)
   - `images` (file array, up to 5 files)
   - Boolean features as strings: `'true'`

2. Backend receives and processes:
   - Validates fields (including string booleans)
   - Multer saves files to `uploads/vehicles/`
   - Returns vehicle object with image URLs
   - Frontend displays images using `PUBLIC_ASSET_BASE_URL`

### Profile Photo Upload Flow
1. Frontend sends FormData with:
   - `name`, `address`, `description` (strings)
   - `profilePhoto` (file, optional)
   - `removeProfilePhoto` (string `'true'` if removing, optional)

2. Backend receives and processes:
   - Validates fields (including string booleans)
   - Multer saves file to `uploads/profiles/`
   - Returns updated user with profile photo URL

## Testing Image Uploads

### Local Development
```bash
# 1. Ensure MongoDB is running on localhost:27017
# 2. Set PUBLIC_ASSET_BASE_URL in .env
PUBLIC_ASSET_BASE_URL=http://localhost:3000/uploads

# 3. Start backend
npm start

# 4. Upload directories will auto-create at:
# - ./uploads/vehicles/
# - ./uploads/profiles/
# - ./uploads/commissions/
```

### VPS Deployment
```bash
# 1. Set correct environment variables in .env
MONGO_URI=mongodb://127.0.0.1:27017
PUBLIC_ASSET_BASE_URL=https://yourdomain.com/uploads
CLIENT_ORIGIN=https://yourdomain.com

# 2. Ensure uploads directory is writable
chmod 755 uploads/

# 3. Start backend
npm start

# 4. Files will be saved to:
# - /var/www/app/uploads/vehicles/
# - /var/www/app/uploads/profiles/
# - /var/www/app/uploads/commissions/
```

## Validation Flow

### FormData to Backend
```
Frontend FormData:
  model: "Toyota Prius"
  year: "2023"
  pricePerDay: "95"
  englishSpeakingDriver: "true"  ← String!
  images: [File, File, ...]

↓ express-validator

Backend Validation:
  body('englishSpeakingDriver').optional().trim().custom((value) => {
    const normalized = String(value).toLowerCase().trim();
    return ['true', '1', 'yes', 'on'].includes(normalized) || 
           value === false || value === 0 || value === '';
  })
  ✓ Accepts "true" string
  ✓ Accepts false boolean
  ✓ Accepts empty string

↓ Passes validation

Controller:
  req.body.englishSpeakingDriver = "true"
  req.files = [File, File, ...]
  ✓ Saves vehicle with images
```

## Troubleshooting

### Files Not Uploading
1. Check upload directory permissions: `ls -la uploads/`
2. Verify `PUBLIC_ASSET_BASE_URL` matches domain
3. Check server logs for multer errors
4. Ensure file size < 5MB
5. Ensure only image files (mimetype starts with `image/`)

### Images Not Displaying
1. Check `PUBLIC_ASSET_BASE_URL` in .env
2. Verify files exist in upload directories
3. Check browser console for 404 errors
4. Ensure CORS is properly configured

### Validation Errors
1. Check if boolean fields are sent as strings in FormData
2. Verify all required fields are provided
3. Check server logs for detailed error messages

## Performance Optimization

- Added `maxAge: '1d'` to static file serving
- Files are cached for 1 day to reduce server load
- Limit file size to 5MB to prevent large uploads
- Limit to 5 files per upload to prevent abuse

## Security Considerations

- Only image files are accepted (MIME type check)
- File size limit: 5MB per file
- File count limit: 5 files per request
- Filenames are randomized with timestamps
- Proper error handling prevents information leakage

#!/usr/bin/env node

/**
 * Migration Script: Local Files to Cloudinary
 *
 * This script migrates existing local uploaded files to Cloudinary.
 * Supports incremental migration with dry-run mode and error recovery.
 *
 * Usage:
 *   node scripts/migrateToCloudinary.js [options]
 *
 * Options:
 *   --dry-run              Preview changes without modifying database
 *   --batch-size=N         Process N records at a time (default: 10)
 *   --collection=name      Migrate specific collection only (vehicles, users, commissions)
 *   --verbose              Show detailed logging
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import DriverCommission from '../models/DriverCommission.js';
import * as cloudinaryService from '../services/cloudinaryService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const ERROR_LOG_FILE = path.join(__dirname, 'migration-errors.log');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');
const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='));
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1], 10) : 10;
const collectionArg = args.find((arg) => arg.startsWith('--collection='));
const targetCollection = collectionArg ? collectionArg.split('=')[1] : null;

// Statistics
const stats = {
  totalProcessed: 0,
  successfulMigrations: 0,
  failedMigrations: 0,
  skippedAlready: 0,
  errors: [],
};

/**
 * Log error to file
 */
async function logError(message, error) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n${error?.stack || error}\n\n`;
  try {
    await fs.appendFile(ERROR_LOG_FILE, logMessage);
  } catch (err) {
    console.error('Failed to write to error log:', err);
  }
}

/**
 * Check if a path is already a Cloudinary URL
 */
function isCloudinaryUrl(url) {
  return cloudinaryService.isCloudinaryUrl(url);
}

/**
 * Check if local file exists
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Upload local file to Cloudinary
 */
async function uploadToCloudinary(localPath, folder) {
  try {
    const fullPath = path.join(UPLOADS_DIR, localPath);

    if (!(await fileExists(fullPath))) {
      throw new Error(`Local file not found: ${fullPath}`);
    }

    // Read file buffer
    const buffer = await fs.readFile(fullPath);

    // Generate unique filename
    const filename = cloudinaryService.generateUniqueFilename(path.basename(localPath, path.extname(localPath)));

    // Determine resource type (PDF vs image)
    const ext = path.extname(localPath).toLowerCase();
    const isPdf = ext === '.pdf';
    const resourceType = isPdf ? 'raw' : 'image';

    // Upload to Cloudinary
    let cloudinaryUrl;
    if (isPdf) {
      cloudinaryUrl = await cloudinaryService.uploadFile(buffer, folder, filename, resourceType);
    } else {
      cloudinaryUrl = await cloudinaryService.uploadImage(buffer, folder, filename);
    }

    return cloudinaryUrl;
  } catch (error) {
    console.error(`Failed to upload ${localPath}:`, error.message);
    throw error;
  }
}

/**
 * Migrate vehicle images
 */
async function migrateVehicles() {
  if (targetCollection && targetCollection !== 'vehicles') {
    return;
  }

  console.log('\n📦 Migrating vehicle images...');

  const vehicles = await Vehicle.find({}).limit(1000);

  for (const vehicle of vehicles) {
    if (!vehicle.images || vehicle.images.length === 0) {
      continue;
    }

    const migratedImages = [];
    let needsUpdate = false;

    for (const imagePath of vehicle.images) {
      stats.totalProcessed++;

      // Skip if already a Cloudinary URL
      if (isCloudinaryUrl(imagePath)) {
        migratedImages.push(imagePath);
        stats.skippedAlready++;
        if (isVerbose) {
          console.log(`  ✓ Already migrated: ${imagePath}`);
        }
        continue;
      }

      try {
        if (isDryRun) {
          console.log(`  [DRY RUN] Would migrate: ${imagePath}`);
          migratedImages.push(imagePath); // Keep original in dry run
        } else {
          const cloudinaryUrl = await uploadToCloudinary(imagePath, 'vehicles');
          migratedImages.push(cloudinaryUrl);
          needsUpdate = true;
          stats.successfulMigrations++;
          console.log(`  ✓ Migrated: ${imagePath} → ${cloudinaryUrl}`);
        }
      } catch (error) {
        const errorMsg = `Failed to migrate vehicle image: ${imagePath} (Vehicle ID: ${vehicle._id})`;
        console.error(`  ✗ ${errorMsg}`);
        await logError(errorMsg, error);
        migratedImages.push(imagePath); // Keep original on error
        stats.failedMigrations++;
        stats.errors.push({ type: 'vehicle', id: vehicle._id, path: imagePath, error: error.message });
      }
    }

    // Update database if changes were made
    if (needsUpdate && !isDryRun) {
      vehicle.images = migratedImages;
      await vehicle.save();
    }
  }
}

/**
 * Migrate user profile photos
 */
async function migrateUserProfiles() {
  if (targetCollection && targetCollection !== 'users') {
    return;
  }

  console.log('\n👤 Migrating user profile photos...');

  const users = await User.find({ profilePhoto: { $exists: true, $ne: null } }).limit(1000);

  for (const user of users) {
    if (!user.profilePhoto) {
      continue;
    }

    stats.totalProcessed++;

    // Skip if already a Cloudinary URL
    if (isCloudinaryUrl(user.profilePhoto)) {
      stats.skippedAlready++;
      if (isVerbose) {
        console.log(`  ✓ Already migrated: ${user.profilePhoto}`);
      }
      continue;
    }

    try {
      if (isDryRun) {
        console.log(`  [DRY RUN] Would migrate: ${user.profilePhoto} (User: ${user.name})`);
      } else {
        const cloudinaryUrl = await uploadToCloudinary(user.profilePhoto, 'profiles');
        user.profilePhoto = cloudinaryUrl;
        await user.save();
        stats.successfulMigrations++;
        console.log(`  ✓ Migrated: ${user.name} → ${cloudinaryUrl}`);
      }
    } catch (error) {
      const errorMsg = `Failed to migrate user profile photo: ${user.profilePhoto} (User ID: ${user._id})`;
      console.error(`  ✗ ${errorMsg}`);
      await logError(errorMsg, error);
      stats.failedMigrations++;
      stats.errors.push({ type: 'user', id: user._id, path: user.profilePhoto, error: error.message });
    }
  }
}

/**
 * Migrate commission payment slips
 */
async function migrateCommissionSlips() {
  if (targetCollection && targetCollection !== 'commissions') {
    return;
  }

  console.log('\n💰 Migrating commission payment slips...');

  const commissions = await DriverCommission.find({
    paymentSlipUrl: { $exists: true, $ne: null },
  }).limit(1000);

  for (const commission of commissions) {
    if (!commission.paymentSlipUrl) {
      continue;
    }

    stats.totalProcessed++;

    // Skip if already a Cloudinary URL
    if (isCloudinaryUrl(commission.paymentSlipUrl)) {
      stats.skippedAlready++;
      if (isVerbose) {
        console.log(`  ✓ Already migrated: ${commission.paymentSlipUrl}`);
      }
      continue;
    }

    try {
      if (isDryRun) {
        console.log(`  [DRY RUN] Would migrate: ${commission.paymentSlipUrl}`);
      } else {
        const cloudinaryUrl = await uploadToCloudinary(commission.paymentSlipUrl, 'commissions');
        commission.paymentSlipUrl = cloudinaryUrl;
        await commission.save();
        stats.successfulMigrations++;
        console.log(`  ✓ Migrated: ${cloudinaryUrl}`);
      }
    } catch (error) {
      const errorMsg = `Failed to migrate commission slip: ${commission.paymentSlipUrl} (Commission ID: ${commission._id})`;
      console.error(`  ✗ ${errorMsg}`);
      await logError(errorMsg, error);
      stats.failedMigrations++;
      stats.errors.push({ type: 'commission', id: commission._id, path: commission.paymentSlipUrl, error: error.message });
    }
  }
}

/**
 * Print final statistics
 */
function printStats(startTime) {
  const endTime = Date.now();
  const durationSeconds = ((endTime - startTime) / 1000).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`Mode:                 ${isDryRun ? 'DRY RUN (no changes made)' : 'LIVE MIGRATION'}`);
  console.log(`Total processed:      ${stats.totalProcessed}`);
  console.log(`Already migrated:     ${stats.skippedAlready}`);
  console.log(`Successful:           ${stats.successfulMigrations}`);
  console.log(`Failed:               ${stats.failedMigrations}`);
  console.log(`Duration:             ${durationSeconds}s`);
  console.log('='.repeat(60));

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ${stats.errors.length} errors occurred. See ${ERROR_LOG_FILE} for details.`);
  }

  if (isDryRun) {
    console.log('\n💡 This was a dry run. Run without --dry-run to perform actual migration.');
  } else if (stats.successfulMigrations > 0) {
    console.log('\n✅ Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Verify images display correctly in the application');
    console.log('   2. Check Cloudinary dashboard for uploaded files');
    console.log('   3. Run migration again to ensure all files are migrated');
    console.log('   4. After verification, you can safely delete local /uploads/ directory');
  }
}

/**
 * Main migration function
 */
async function main() {
  const startTime = Date.now();

  console.log('🚀 Cloudinary Migration Script');
  console.log('='.repeat(60));
  console.log(`Mode:          ${isDryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Batch size:    ${batchSize}`);
  console.log(`Collection:    ${targetCollection || 'all'}`);
  console.log(`Verbose:       ${isVerbose ? 'yes' : 'no'}`);
  console.log('='.repeat(60));

  // Connect to MongoDB
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB');
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message);
    process.exit(1);
  }

  // Verify Cloudinary configuration
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('✗ Cloudinary credentials not found in environment variables');
    console.error('  Please ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET are set');
    process.exit(1);
  }
  console.log('✓ Cloudinary configured');

  // Run migrations
  try {
    await migrateVehicles();
    await migrateUserProfiles();
    await migrateCommissionSlips();
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    await logError('Fatal migration error', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 MongoDB connection closed');
  }

  // Print final statistics
  printStats(startTime);
}

// Run the migration
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

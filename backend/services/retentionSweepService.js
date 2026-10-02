import DeletedDriverRecord from '../models/DeletedDriverRecord.js';
import * as cloudinaryService from './cloudinaryService.js';

// Retention is measured in years, so a daily tick is frequent enough.
const INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Destroys archived driver records whose retention window has closed.
 *
 * This is the half that makes the archive defensible: personal data kept for a
 * legal reason still needs an end date, and the licence image — an identity
 * document — has to leave Cloudinary at the same time as the row, or the archive
 * would only appear to have been purged.
 */
export const runRetentionSweep = async (now = new Date()) => {
  try {
    const due = await DeletedDriverRecord.find({ purgeAfter: { $lte: now } })
      .select('licenseImage driver')
      .limit(500)
      .lean();

    if (due.length === 0) return { purged: 0, imagesRemoved: 0 };

    let imagesRemoved = 0;
    for (const record of due) {
      if (record.licenseImage && cloudinaryService.isCloudinaryUrl(record.licenseImage)) {
        try {
          await cloudinaryService.deleteAsset(record.licenseImage, 'image');
          imagesRemoved += 1;
        } catch (error) {
          // A stuck CDN must not stop the row being destroyed; log and move on.
          console.warn('Retention sweep: could not remove licence image', error.message);
        }
      }
    }

    const result = await DeletedDriverRecord.deleteMany({
      _id: { $in: due.map((record) => record._id) },
    });

    const purged = result.deletedCount ?? 0;
    console.info(
      `Retention sweep: destroyed ${purged} archived driver record(s), ${imagesRemoved} licence image(s).`
    );
    return { purged, imagesRemoved };
  } catch (error) {
    console.error('Retention sweep error:', error);
    return { purged: 0, imagesRemoved: 0 };
  }
};

export const startRetentionScheduler = () => {
  if (process.env.DISABLE_RETENTION_SWEEP === 'true') {
    console.info('Retention sweep disabled via DISABLE_RETENTION_SWEEP.');
    return null;
  }
  const timer = setInterval(() => {
    runRetentionSweep();
  }, INTERVAL_MS);
  timer.unref?.();
  runRetentionSweep();
  console.info('Retention sweep scheduler started (daily).');
  return timer;
};

export default { runRetentionSweep, startRetentionScheduler };

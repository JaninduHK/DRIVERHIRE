// Driver profile cover photos: drivers upload, an admin approves or rejects, and the
// public profile shows the approved one (or a vehicle photo when there is none).
import User, { USER_ROLES } from '../models/User.js';
import * as cloudinaryService from '../services/cloudinaryService.js';
import { buildAssetUrl } from '../utils/assetUtils.js';
import { sendCoverPhotoReviewEmail } from '../services/emailService.js';
import buildAppUrl from '../utils/url.js';

const COVER_FIELDS = 'name email coverPhoto coverPhotoPending coverPhotoStatus coverPhotoNote coverPhotoSubmittedAt coverPhotoReviewedAt';

/** The cover photo state the dashboards use. */
export const coverState = (user, req) => ({
  coverPhoto: buildAssetUrl(user.coverPhoto, req) || '',
  coverPhotoPending: buildAssetUrl(user.coverPhotoPending, req) || '',
  coverPhotoStatus: user.coverPhotoStatus || 'none',
  coverPhotoNote: user.coverPhotoNote || '',
  coverPhotoSubmittedAt: user.coverPhotoSubmittedAt || null,
  coverPhotoReviewedAt: user.coverPhotoReviewedAt || null,
});

const deleteQuietly = async (url) => {
  if (url && cloudinaryService.isCloudinaryUrl(url)) {
    await cloudinaryService.deleteAsset(url, 'image').catch((error) => console.warn('Cover photo delete failed:', error.message));
  }
};

/** POST /driver/cover-photo (multipart `coverPhoto`): submit a new cover for review. */
export const uploadCoverPhoto = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Choose an image to upload.' });
  }
  try {
    const user = await User.findById(req.user.id).select(COVER_FIELDS);
    if (!user) return res.status(404).json({ message: 'Driver not found.' });
    const url = await cloudinaryService.uploadImage(
      req.file.buffer,
      'covers',
      cloudinaryService.generateUniqueFilename(`cover-${user._id}`)
    );
    // A previous upload still waiting for review is replaced.
    await deleteQuietly(user.coverPhotoPending);
    user.coverPhotoPending = url;
    user.coverPhotoStatus = 'pending';
    user.coverPhotoNote = '';
    user.coverPhotoSubmittedAt = new Date();
    await user.save({ validateBeforeSave: false });
    return res.json({ message: 'Cover photo sent for review.', cover: coverState(user, req) });
  } catch (error) {
    console.error('Cover photo upload error:', error);
    return res.status(500).json({ message: 'Unable to upload the cover photo right now.' });
  }
};

/** DELETE /driver/cover-photo: remove the cover (live and pending); the profile uses a vehicle photo again. */
export const removeCoverPhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(COVER_FIELDS);
    if (!user) return res.status(404).json({ message: 'Driver not found.' });
    await deleteQuietly(user.coverPhoto);
    await deleteQuietly(user.coverPhotoPending);
    user.coverPhoto = '';
    user.coverPhotoPending = '';
    user.coverPhotoStatus = 'none';
    user.coverPhotoNote = '';
    await user.save({ validateBeforeSave: false });
    return res.json({ message: 'Cover photo removed.', cover: coverState(user, req) });
  } catch (error) {
    console.error('Cover photo remove error:', error);
    return res.status(500).json({ message: 'Unable to remove the cover photo right now.' });
  }
};

/** GET /admin/cover-photos?status=pending: drivers with a cover to review (or in another status). */
export const listCoverPhotos = async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  try {
    const drivers = await User.find({ role: USER_ROLES.DRIVER, deletedAt: null, coverPhotoStatus: status })
      .select(`${COVER_FIELDS} profilePhoto`)
      .sort({ coverPhotoSubmittedAt: -1 })
      .limit(200)
      .lean();
    return res.json({
      drivers: drivers.map((driver) => ({
        id: driver._id.toString(),
        name: driver.name,
        email: driver.email,
        profilePhoto: buildAssetUrl(driver.profilePhoto, req) || '',
        ...coverState(driver, req),
      })),
    });
  } catch (error) {
    console.error('List cover photos error:', error);
    return res.status(500).json({ message: 'Unable to load cover photos.' });
  }
};

/** PATCH /admin/drivers/:id/cover-photo { action: 'approve' | 'reject', note }. */
export const reviewCoverPhoto = async (req, res) => {
  const action = String(req.body?.action || '');
  const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 300) : '';
  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'Choose approve or reject.' });
  }
  try {
    const user = await User.findOne({ _id: req.params.id, role: USER_ROLES.DRIVER }).select(COVER_FIELDS);
    if (!user) return res.status(404).json({ message: 'Driver not found.' });
    if (!user.coverPhotoPending) {
      return res.status(400).json({ message: 'This driver has no cover photo waiting for review.' });
    }
    if (action === 'approve') {
      await deleteQuietly(user.coverPhoto);
      user.coverPhoto = user.coverPhotoPending;
      user.coverPhotoStatus = 'approved';
      user.coverPhotoNote = '';
    } else {
      await deleteQuietly(user.coverPhotoPending);
      // A previously approved cover stays live; the rejected one is dropped.
      user.coverPhotoStatus = 'rejected';
      user.coverPhotoNote = note;
    }
    user.coverPhotoPending = '';
    user.coverPhotoReviewedAt = new Date();
    await user.save({ validateBeforeSave: false });
    if (user.email) {
      sendCoverPhotoReviewEmail({
        to: user.email,
        driverName: user.name,
        approved: action === 'approve',
        note,
        profileUrl: buildAppUrl('/portal/driver#profile'),
      }).catch((error) => console.warn('Cover photo review email failed:', error.message));
    }
    return res.json({ message: action === 'approve' ? 'Cover photo approved.' : 'Cover photo rejected.', cover: coverState(user, req) });
  } catch (error) {
    console.error('Review cover photo error:', error);
    return res.status(500).json({ message: 'Unable to update the cover photo.' });
  }
};

import mongoose from 'mongoose';
import User from '../models/User.js';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import Review from '../models/Review.js';
import Vehicle from '../models/Vehicle.js';
import DriverCommission from '../models/DriverCommission.js';
import RefreshToken from '../models/RefreshToken.js';
import * as cloudinaryService from './cloudinaryService.js';

// Placeholder shown wherever a deleted person used to be named. Bookings and
// reviews keep existing (they are financial / public records), they just stop
// pointing at an identifiable human.
export const ANONYMOUS_NAME = 'Deleted user';
export const ANONYMOUS_TRAVELLER_NAME = 'Former traveller';

// A booking still ahead of us needs a reachable counterparty — the driver has to
// be able to contact the traveller and vice versa — so erasure is refused until
// these are done or cancelled.
const BLOCKING_STATUSES = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED];

export const findBlockingBookings = async (userId) => {
  const now = new Date();
  return Booking.find({
    $or: [{ travelerUser: userId }, { driver: userId }],
    status: { $in: BLOCKING_STATUSES },
    endDate: { $gte: now },
  })
    .select('startDate endDate status')
    .sort({ startDate: 1 })
    .lean();
};

// Cloudinary assets live outside Mongo, so they have to be removed explicitly.
// Failures here are logged, never thrown: a stuck CDN must not block an erasure
// request, and the DB scrub below is what actually makes the person unidentifiable.
const purgeCloudinaryAssets = async (user) => {
  const removed = { profilePhoto: 0, vehicleImages: 0, commissionSlips: 0 };

  const safeDelete = async (url, resourceType = 'image') => {
    if (!url || !cloudinaryService.isCloudinaryUrl(url)) return false;
    try {
      await cloudinaryService.deleteAsset(url, resourceType);
      return true;
    } catch (error) {
      console.warn('Account deletion: could not remove asset', url, error.message);
      return false;
    }
  };

  if (await safeDelete(user.profilePhoto)) removed.profilePhoto = 1;

  const vehicles = await Vehicle.find({ driver: user._id }).select('images');
  for (const vehicle of vehicles) {
    for (const image of vehicle.images || []) {
      if (await safeDelete(image)) removed.vehicleImages += 1;
    }
  }

  const commissions = await DriverCommission.find({
    driver: user._id,
    paymentSlipUrl: { $exists: true, $ne: '' },
  }).select('paymentSlipUrl');
  for (const commission of commissions) {
    const isPdf = (commission.paymentSlipUrl || '').includes('.pdf');
    if (await safeDelete(commission.paymentSlipUrl, isPdf ? 'raw' : 'image')) {
      removed.commissionSlips += 1;
    }
  }

  return removed;
};

/**
 * Erase a person's identity while leaving every record that references them intact.
 *
 * The User row is deliberately kept: Booking, Review, Vehicle, ChatConversation,
 * ChatMessage, TourBrief and DriverCommission all declare `required: true` refs to
 * it, and code such as adminController's commission report skips bookings whose
 * driver will not populate — a hard delete would quietly drop financial records.
 *
 * Personal data is denormalised into two other places, so scrubbing the User row
 * alone is not enough: Booking.traveler holds a {fullName,email,phoneNumber}
 * snapshot, and Review.travelerName is shown publicly on driver profiles.
 */
export const anonymizeUser = async (userId, { actorId = null } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error('Invalid user identifier.');
    error.code = 'INVALID_ID';
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found.');
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (user.deletedAt) {
    const error = new Error('This account has already been deleted.');
    error.code = 'ALREADY_DELETED';
    throw error;
  }

  const blocking = await findBlockingBookings(user._id);
  if (blocking.length > 0) {
    const error = new Error(
      'This account still has upcoming or in-progress bookings. Complete or cancel them before deleting.'
    );
    error.code = 'ACTIVE_BOOKINGS';
    error.bookings = blocking;
    throw error;
  }

  const assetsRemoved = await purgeCloudinaryAssets(user);

  // Booking.traveler is a snapshot taken at booking time, so it survives any
  // change to the User row and has to be scrubbed on its own.
  const bookingScrub = await Booking.updateMany(
    { travelerUser: user._id },
    {
      $set: {
        'traveler.fullName': ANONYMOUS_NAME,
        'traveler.email': `deleted-${user._id}@deleted.invalid`,
        'traveler.phoneNumber': 'removed',
      },
      $unset: { flightNumber: '', arrivalTime: '', departureTime: '', specialRequests: '' },
    }
  );

  // travelerName renders on public driver profiles.
  const reviewScrub = await Review.updateMany(
    { travelerUser: user._id },
    { $set: { travelerName: ANONYMOUS_TRAVELLER_NAME } }
  );

  const vehicleScrub = await Vehicle.updateMany({ driver: user._id }, { $set: { images: [] } });

  // Sessions have no retention value and must not outlive the account.
  const tokenScrub = await RefreshToken.deleteMany({ user: user._id });

  // email carries a unique index, so it cannot be scrubbed to a shared constant —
  // the second deletion would collide. The provider ids are unique+sparse, so they
  // are unset rather than nulled (sparse skips missing fields, not null ones).
  user.name = ANONYMOUS_NAME;
  user.email = `deleted-${user._id}@deleted.invalid`;
  user.deletedAt = new Date();
  user.isVerified = false;
  user.contactNumber = undefined;
  user.address = undefined;
  user.description = undefined;
  user.tripAdvisor = undefined;
  user.profilePhoto = undefined;
  user.experienceYears = undefined;
  user.driverLocation = undefined;
  user.expoPushTokens = [];
  user.set('passwordHash', undefined);
  user.set('googleId', undefined);
  user.set('facebookId', undefined);
  user.set('asgardeoSub', undefined);
  user.set('verificationToken', undefined);
  user.set('verificationTokenExpires', undefined);
  user.set('passwordResetToken', undefined);
  user.set('passwordResetExpires', undefined);
  await user.save({ validateBeforeSave: false });

  const summary = {
    userId: user._id.toString(),
    deletedAt: user.deletedAt,
    actorId: actorId ? actorId.toString() : null,
    bookingsAnonymised: bookingScrub.modifiedCount,
    reviewsAnonymised: reviewScrub.modifiedCount,
    vehiclesCleared: vehicleScrub.modifiedCount,
    refreshTokensRevoked: tokenScrub.deletedCount,
    assetsRemoved,
  };
  console.info('Account erased:', JSON.stringify(summary));
  return summary;
};

export default { anonymizeUser, findBlockingBookings, ANONYMOUS_NAME, ANONYMOUS_TRAVELLER_NAME };

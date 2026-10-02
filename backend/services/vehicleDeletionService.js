import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import ChatMessage from '../models/ChatMessage.js';

// A trip that is done cannot be disrupted by removing the vehicle, so only
// live bookings block. Mirrors findBlockingBookings in accountDeletionService.js.
const BLOCKING_STATUSES = [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED];

/**
 * Bookings that stand in the way of deleting this vehicle: still pending or
 * confirmed, and the trip has not finished yet.
 */
export const findBlockingVehicleBookings = async (vehicleId, now = new Date()) =>
  Booking.find({
    vehicle: vehicleId,
    status: { $in: BLOCKING_STATUSES },
    endDate: { $gte: now },
  })
    .select('startDate endDate status')
    .sort({ startDate: 1 })
    .lean();

export const blockingBookingsMessage = (bookings) => {
  const count = bookings.length;
  return `This vehicle has ${count} upcoming booking${count === 1 ? '' : 's'}. Cancel ${
    count === 1 ? 'it' : 'them'
  } before deleting the vehicle.`;
};

/**
 * Marks the vehicle deleted and withdraws any offers still riding on it, so a
 * traveller cannot accept an offer for a vehicle that no longer exists.
 *
 * Images are deliberately left on Cloudinary: past bookings and chat history
 * still render this vehicle, and deleting the files would leave broken images
 * in records that must stay readable.
 */
export const softDeleteVehicle = async (vehicle) => {
  vehicle.deletedAt = new Date();
  await vehicle.save();

  const withdrawn = await ChatMessage.updateMany(
    { type: 'offer', 'offer.vehicle': vehicle._id, 'offer.status': 'pending' },
    { $set: { 'offer.status': 'expired' } }
  );

  return { withdrawnOffers: withdrawn.modifiedCount ?? 0 };
};

export default { findBlockingVehicleBookings, blockingBookingsMessage, softDeleteVehicle };

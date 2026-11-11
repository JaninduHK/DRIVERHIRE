import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';

/**
 * Once a traveller has a confirmed booking, any other driver's still-pending offer
 * for overlapping dates can no longer be taken: it is marked declined, so the
 * traveller's chats stop showing it as live and the driver sees it closed.
 * Offers for other dates are left alone (the traveller may be planning another trip).
 */
export const declineOverlappingOffers = async ({ travelerId, startDate, endDate, keepMessageId = null }) => {
  if (!travelerId || !startDate || !endDate) return 0;
  const conversationIds = await ChatConversation.find({ traveler: travelerId }).distinct('_id');
  if (!conversationIds.length) return 0;
  const filter = {
    conversation: { $in: conversationIds },
    type: 'offer',
    'offer.status': 'pending',
    'offer.startDate': { $lte: new Date(endDate) },
    'offer.endDate': { $gte: new Date(startDate) },
  };
  if (keepMessageId) filter._id = { $ne: keepMessageId };
  const result = await ChatMessage.updateMany(filter, { $set: { 'offer.status': 'declined' } });
  return result.modifiedCount ?? 0;
};

export const declineOffersOverlappingBooking = (booking) => {
  if (!booking || booking.status !== BOOKING_STATUS.CONFIRMED) return Promise.resolve(0);
  return declineOverlappingOffers({
    travelerId: booking.travelerUser,
    startDate: booking.startDate,
    endDate: booking.endDate,
    keepMessageId: booking.offerMessage || null,
  });
};

/** Catch-up for bookings confirmed before this existed (run by the hourly offer sweep). */
export const declineOffersOverlappingUpcomingBookings = async (now = new Date()) => {
  const bookings = await Booking.find({
    status: BOOKING_STATUS.CONFIRMED,
    endDate: { $gte: now },
    travelerUser: { $ne: null },
  }).select('status travelerUser startDate endDate offerMessage');
  let declined = 0;
  for (const booking of bookings) {
    declined += await declineOffersOverlappingBooking(booking);
  }
  return declined;
};

export default { declineOverlappingOffers, declineOffersOverlappingBooking, declineOffersOverlappingUpcomingBookings };

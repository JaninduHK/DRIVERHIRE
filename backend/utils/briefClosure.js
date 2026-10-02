import TourBrief from '../models/TourBrief.js';
import { BOOKING_STATUS } from '../models/Booking.js';
import { expiredBefore } from '../services/briefExpiryService.js';

/**
 * Confirming a booking fills that stretch of the traveller's calendar, so their
 * open quote requests covering it stop being live — otherwise drivers keep
 * quoting a trip that is already taken.
 *
 * Requests for other dates are deliberately left open: a traveller may genuinely
 * be shopping for a second trip, and that is what lets them reopen a chat with a
 * driver who is otherwise locked out (see utils/travellerBookingLock.js).
 *
 * Each closed request records the booking that closed it, so cancelling that
 * booking can hand it back — see reopenBriefsForBooking.
 */
export const closeBriefsForBooking = async (booking) => {
  if (!booking || booking.status !== BOOKING_STATUS.CONFIRMED) {
    return 0;
  }

  const result = await TourBrief.updateMany(
    {
      traveler: booking.travelerUser,
      status: 'open',
      startDate: { $lte: booking.endDate },
      endDate: { $gte: booking.startDate },
    },
    { $set: { status: 'booked', closedByBooking: booking._id } }
  );
  return result?.modifiedCount || 0;
};

/**
 * Cancelling (or rejecting) a booking releases those dates again, so the requests
 * that booking closed go back on the board. Without this the traveller's request
 * is stranded as 'booked' forever and they have to post it again from scratch.
 *
 * Requests whose travel dates have since passed stay closed — they are expired,
 * not available, and the hourly sweep would close them again anyway.
 */
export const reopenBriefsForBooking = async (bookingId) => {
  if (!bookingId) {
    return 0;
  }

  const result = await TourBrief.updateMany(
    {
      closedByBooking: bookingId,
      status: 'booked',
      endDate: { $gte: expiredBefore() },
    },
    { $set: { status: 'open', closedByBooking: null } }
  );
  return result?.modifiedCount || 0;
};

export default { closeBriefsForBooking, reopenBriefsForBooking };

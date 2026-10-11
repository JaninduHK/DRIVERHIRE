import Booking, { BOOKING_STATUS } from '../models/Booking.js';

/**
 * Whether a traveller currently has a trip booked or awaiting the driver's
 * answer: any pending or confirmed booking whose end date has not passed, with
 * any driver, for any dates.
 *
 * This is the "leave them alone" rule for reminder emails. A traveller who has
 * booked gets no offer reminders and no quote follow-ups at all, even for a
 * different request — once they have a driver, chasing them to book reads as
 * spam. A cancelled or rejected booking stops counting, so reminders resume.
 */
export const travellerHasActiveBooking = async (travelerId, now = new Date()) => {
  if (!travelerId) return false;
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const booking = await Booking.exists({
    travelerUser: travelerId,
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    endDate: { $gte: today },
  });
  return Boolean(booking);
};

export default { travellerHasActiveBooking };

import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import '../models/Vehicle.js';
import User from '../models/User.js';
import { sendPreTripReminderEmail } from './emailService.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const INTERVAL_MS = HOUR;

// "Your trip starts in 3 days." Sent once per confirmed booking. The lower bound
// keeps a booking made the day before the trip from getting a "3 days" email.
const SEND_WITHIN_MS = 3 * DAY;
const TOO_LATE_MS = 1 * DAY;

/**
 * Tells the traveller who is coming, where, and what to have ready. A service
 * email about a trip they booked, so it ignores the reminder preference and the
 * one-reminder-a-day limit.
 */
export const runPreTripReminderSweep = async ({ now = new Date() } = {}) => {
  const results = { considered: 0, sent: 0, failed: 0 };
  try {
    const bookings = await Booking.find({
      status: BOOKING_STATUS.CONFIRMED,
      preTripReminderSentAt: null,
      startDate: { $gt: new Date(now.getTime() + TOO_LATE_MS), $lte: new Date(now.getTime() + SEND_WITHIN_MS) },
    })
      .populate('vehicle', 'model')
      .populate('driver', 'name contactNumber')
      .limit(200);
    results.considered = bookings.length;

    for (const booking of bookings) {
      try {
        const account = booking.travelerUser ? await User.findById(booking.travelerUser).select('email deletedAt').lean() : null;
        const email = booking.traveler?.email;
        if (!email || email.endsWith('@deleted.invalid') || account?.deletedAt) continue;

        // Claim BEFORE sending, as the other sweeps do.
        const claimed = await Booking.updateOne(
          { _id: booking._id, preTripReminderSentAt: null },
          { $set: { preTripReminderSentAt: now } }
        );
        if (!claimed.modifiedCount) continue;

        await sendPreTripReminderEmail({
          traveler: { name: booking.traveler?.fullName, email },
          booking,
          driver: booking.driver,
          vehicle: booking.vehicle,
        });
        results.sent += 1;
      } catch (error) {
        results.failed += 1;
        console.error('Pre-trip reminder failed for booking', booking._id.toString(), error.message);
      }
    }
    if (results.sent || results.failed) {
      console.info('Pre-trip reminder sweep:', JSON.stringify(results));
    }
  } catch (error) {
    console.error('Pre-trip reminder sweep error:', error);
  }
  return results;
};

export const startTripReminderScheduler = () => {
  if (process.env.DISABLE_TRIP_REMINDERS === 'true') {
    console.info('Pre-trip reminder scheduler disabled via DISABLE_TRIP_REMINDERS.');
    return null;
  }
  const timer = setInterval(() => { runPreTripReminderSweep(); }, INTERVAL_MS);
  timer.unref?.();
  console.info('Pre-trip reminder scheduler started (hourly).');
  return timer;
};

export default { runPreTripReminderSweep, startTripReminderScheduler };

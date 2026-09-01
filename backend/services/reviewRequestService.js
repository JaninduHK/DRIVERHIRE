import crypto from 'crypto';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import Review from '../models/Review.js';
import User from '../models/User.js';
import { getSetting, setSetting, SETTING_KEYS } from '../models/Setting.js';
import { sendReviewRequestEmail } from './emailService.js';
import buildAppUrl from '../utils/url.js';

const HOUR = 60 * 60 * 1000;

// Ask once the trip has been over for a day, and stop asking after a week so we
// never surprise someone with a request about a long-forgotten trip. The window
// (rather than an exact 24h match) means a missed or delayed run simply catches
// up on the next tick instead of skipping people permanently.
export const MIN_AGE_MS = 24 * HOUR;
export const MAX_AGE_MS = 7 * 24 * HOUR;

export const REVIEW_TOKEN_TTL_MS = 30 * 24 * HOUR;
const INTERVAL_MS = HOUR;

export const hashReviewToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const createReviewToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashReviewToken(token), expires: new Date(Date.now() + REVIEW_TOKEN_TTL_MS) };
};

const formatTripDates = (start, end) => {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  try {
    const from = new Date(start).toLocaleDateString('en-GB', opts);
    const to = new Date(end).toLocaleDateString('en-GB', opts);
    return from === to ? from : `${from} – ${to}`;
  } catch {
    return '';
  }
};

/**
 * The cutoff exists so shipping this feature does not blast every past traveller
 * with "how was your trip?" about trips that ended weeks ago. It is stored once,
 * on first run, so it survives restarts — a process-start timestamp would creep
 * forward on every deploy and silently skip people.
 */
export const getStartCutoff = async () => {
  const stored = await getSetting(SETTING_KEYS.REVIEW_REQUESTS_START_AT, null);
  if (stored) return new Date(stored);
  const now = new Date();
  await setSetting(SETTING_KEYS.REVIEW_REQUESTS_START_AT, now.toISOString());
  console.info(`Review requests armed. Only trips ending after ${now.toISOString()} will be emailed.`);
  return now;
};

export const findBookingsAwaitingReviewRequest = async (now = new Date()) => {
  const cutoff = await getStartCutoff();
  const windowEnd = new Date(now.getTime() - MIN_AGE_MS);
  const windowStart = new Date(now.getTime() - MAX_AGE_MS);
  // Never reach back before the cutoff, no matter how wide the window is.
  const effectiveStart = windowStart > cutoff ? windowStart : cutoff;

  if (effectiveStart >= windowEnd) return [];

  return Booking.find({
    status: BOOKING_STATUS.CONFIRMED,
    endDate: { $gt: effectiveStart, $lte: windowEnd },
    reviewRequestSentAt: { $exists: false },
  })
    .populate('driver', 'name deletedAt')
    .populate('vehicle', 'model')
    .limit(200);
};

export const sendReviewRequestForBooking = async (booking) => {
  const email = booking.traveler?.email;
  // Anonymised travellers keep a placeholder address (see accountDeletionService)
  // and must never be contacted again.
  if (!email || email.endsWith('@deleted.invalid')) return { skipped: 'anonymised' };

  if (booking.travelerUser) {
    const traveller = await User.findById(booking.travelerUser).select('deletedAt');
    if (traveller?.deletedAt) return { skipped: 'anonymised' };
  }

  if (await Review.exists({ booking: booking._id })) return { skipped: 'already-reviewed' };

  const { token, hash, expires } = createReviewToken();

  // Claim the booking BEFORE sending. If the send then fails we would rather miss
  // one request than risk emailing the same traveller repeatedly on every tick.
  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, reviewRequestSentAt: { $exists: false } },
    { $set: { reviewRequestSentAt: new Date(), reviewTokenHash: hash, reviewTokenExpires: expires } },
    { new: true }
  );
  if (!claimed) return { skipped: 'already-claimed' };

  await sendReviewRequestEmail({
    to: email,
    travelerName: booking.traveler?.fullName,
    driverName: booking.driver?.name,
    vehicleModel: booking.vehicle?.model,
    tripDates: formatTripDates(booking.startDate, booking.endDate),
    reviewUrl: buildAppUrl(`/review/${token}`),
  });

  return { sent: true, bookingId: booking._id.toString() };
};

export const runReviewRequestSweep = async () => {
  const results = { considered: 0, sent: 0, skipped: 0, failed: 0 };
  try {
    const bookings = await findBookingsAwaitingReviewRequest();
    results.considered = bookings.length;
    for (const booking of bookings) {
      try {
        const outcome = await sendReviewRequestForBooking(booking);
        if (outcome.sent) results.sent += 1;
        else results.skipped += 1;
      } catch (error) {
        results.failed += 1;
        console.error('Review request failed for booking', booking._id.toString(), error.message);
      }
    }
    if (results.sent || results.failed) {
      console.info('Review request sweep:', JSON.stringify(results));
    }
  } catch (error) {
    console.error('Review request sweep error:', error);
  }
  return results;
};

// Plain interval rather than a cron dependency: the query is window-based, so a
// restart cannot cause a missed hour to be skipped permanently.
export const startReviewRequestScheduler = () => {
  if (process.env.DISABLE_REVIEW_REQUESTS === 'true') {
    console.info('Review request scheduler disabled via DISABLE_REVIEW_REQUESTS.');
    return null;
  }
  const timer = setInterval(() => { runReviewRequestSweep(); }, INTERVAL_MS);
  timer.unref?.();
  // Arm the cutoff immediately so a deploy defines "from now on" even before the
  // first sweep runs an hour later.
  getStartCutoff().catch((error) => console.error('Review cutoff init failed:', error.message));
  console.info('Review request scheduler started (hourly).');
  return timer;
};

export default { runReviewRequestSweep, startReviewRequestScheduler, hashReviewToken };

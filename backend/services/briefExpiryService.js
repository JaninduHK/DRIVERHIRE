import TourBrief from '../models/TourBrief.js';

const HOUR = 60 * 60 * 1000;
const INTERVAL_MS = HOUR;

// Midnight today, so a brief is only closed once its end date has fully passed —
// a trip ending today stays open for the whole of today.
export const expiredBefore = () => {
  const cutoff = new Date();
  cutoff.setUTCHours(0, 0, 0, 0);
  return cutoff;
};

/**
 * A brief whose trip has already ended can never be booked, so it should stop
 * sitting on the driver board (and in the traveller's list) as if it were live.
 * 'booked' briefs are left alone — they already reached their outcome.
 */
export const runBriefExpirySweep = async () => {
  try {
    const result = await TourBrief.updateMany(
      { status: 'open', endDate: { $lt: expiredBefore() } },
      { $set: { status: 'closed' } }
    );
    const closed = result.modifiedCount ?? 0;
    if (closed > 0) {
      console.info(`Brief expiry sweep: closed ${closed} expired brief(s).`);
    }
    return { closed };
  } catch (error) {
    console.error('Brief expiry sweep error:', error);
    return { closed: 0 };
  }
};

// Plain interval rather than a cron dependency, matching the other sweeps: the
// query is date-based, so a missed run simply catches up on the next tick.
export const startBriefExpiryScheduler = () => {
  if (process.env.DISABLE_BRIEF_EXPIRY === 'true') {
    console.info('Brief expiry scheduler disabled via DISABLE_BRIEF_EXPIRY.');
    return null;
  }
  const timer = setInterval(() => { runBriefExpirySweep(); }, INTERVAL_MS);
  timer.unref?.();
  // Catch anything that expired while the server was down.
  runBriefExpirySweep();
  console.info('Brief expiry scheduler started (hourly).');
  return timer;
};

export default { runBriefExpirySweep, startBriefExpiryScheduler, expiredBefore };

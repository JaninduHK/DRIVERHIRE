import ChatMessage from '../models/ChatMessage.js';
import { offerExpiresAt } from '../utils/offerExpiry.js';

const INTERVAL_MS = 60 * 60 * 1000;

/**
 * Offers created before this feature existed have no expiry date. Rather than
 * expiring the whole backlog the moment this deploys — which would kill
 * negotiations a traveller is still in the middle of — each one is given a fresh
 * full window from now, still capped by its trip start date.
 *
 * Safe to run every sweep: new offers always get a date on creation, so this only
 * ever matches legacy rows, and matches each of them exactly once.
 */
export const backfillMissingExpiry = async (now = new Date()) => {
  const legacy = await ChatMessage.find({
    type: 'offer',
    'offer.status': 'pending',
    $or: [{ 'offer.expiresAt': { $exists: false } }, { 'offer.expiresAt': null }],
  })
    .select('offer.startDate')
    .limit(1000)
    .lean();

  if (legacy.length === 0) return { backfilled: 0 };

  await Promise.all(
    legacy.map((message) =>
      ChatMessage.updateOne(
        { _id: message._id },
        { $set: { 'offer.expiresAt': offerExpiresAt({ from: now, startDate: message.offer?.startDate }) } }
      )
    )
  );

  console.info(`Offer expiry sweep: gave ${legacy.length} pre-existing offer(s) a fresh window.`);
  return { backfilled: legacy.length };
};

export const runOfferExpirySweep = async (now = new Date()) => {
  try {
    const { backfilled } = await backfillMissingExpiry(now);

    const result = await ChatMessage.updateMany(
      {
        type: 'offer',
        'offer.status': 'pending',
        'offer.expiresAt': { $ne: null, $lte: now },
      },
      { $set: { 'offer.status': 'expired' } }
    );

    const expired = result.modifiedCount ?? 0;
    if (expired > 0) {
      console.info(`Offer expiry sweep: expired ${expired} unbooked offer(s).`);
    }
    return { expired, backfilled };
  } catch (error) {
    console.error('Offer expiry sweep error:', error);
    return { expired: 0, backfilled: 0 };
  }
};

// Plain interval rather than a cron dependency, matching the other sweeps: the
// query is date-based, so a missed run simply catches up on the next tick.
export const startOfferExpiryScheduler = () => {
  if (process.env.DISABLE_OFFER_EXPIRY === 'true') {
    console.info('Offer expiry scheduler disabled via DISABLE_OFFER_EXPIRY.');
    return null;
  }
  const timer = setInterval(() => {
    runOfferExpirySweep();
  }, INTERVAL_MS);
  timer.unref?.();
  // Catch anything that lapsed while the server was down.
  runOfferExpirySweep();
  console.info('Offer expiry scheduler started (hourly).');
  return timer;
};

export default { runOfferExpirySweep, backfillMissingExpiry, startOfferExpiryScheduler };

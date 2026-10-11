import ChatMessage from '../models/ChatMessage.js';
import User, { EMAIL_PREFERENCES } from '../models/User.js';
import { sendOfferReminderEmail } from './emailService.js';
import { buildEmailPreferencesUrl, MIN_GAP_MS } from './quoteFollowUpService.js';
import { travellerHasActiveBooking } from '../utils/travellerBookings.js';
import { isOfferBookable } from '../utils/offerExpiry.js';
import { LINK_PURPOSES, signLinkToken } from '../utils/signedLinks.js';
import buildAppUrl from '../utils/url.js';

const HOUR = 60 * 60 * 1000;

// Remind once, a day after the offer arrived. Widened to a week on the lower
// bound so a missed/delayed sweep catches up instead of permanently skipping
// an offer, mirroring services/reviewRequestService.js.
const MIN_AGE_MS = 24 * HOUR;
const MAX_AGE_MS = 7 * 24 * HOUR;
const INTERVAL_MS = HOUR;

export const findOffersAwaitingReminder = async (now = new Date()) => {
  const windowEnd = new Date(now.getTime() - MIN_AGE_MS);
  const windowStart = new Date(now.getTime() - MAX_AGE_MS);

  // offer.status: 'pending' is the traveller-already-acted-on guard — it flips
  // to 'accepted' the moment a booking is created from this offer, and to
  // 'declined' when the traveller books a sibling offer or cancels/rejects an
  // existing booking (see vehicleController.js / bookingController.js), so a
  // resolved offer never reaches this query at all.
  return ChatMessage.find({
    type: 'offer',
    'offer.status': 'pending',
    // Offers on a quote request are chased together, per request, by
    // services/quoteFollowUpService.js. This reminder is for offers sent
    // directly in a chat.
    'offer.brief': null,
    offerReminderSentAt: { $exists: false },
    createdAt: { $gt: windowStart, $lte: windowEnd },
  })
    .populate({
      path: 'conversation',
      populate: [
        { path: 'driver', select: 'name' },
        { path: 'vehicle', select: 'model' },
      ],
    })
    .limit(200);
};

/**
 * One reminder email per traveller, listing every offer they have not opened —
 * never one email per offer, which is what drove travellers to unsubscribe.
 * Returns { sent: n } or { skipped: reason }.
 */
export const sendOfferRemindersForTraveller = async (travelerId, messages, now = new Date()) => {
  const traveler = await User.findById(travelerId).select('name email deletedAt emailPreference lastReminderEmailAt');
  // Anonymised travellers keep a placeholder address and must never be contacted again.
  if (!traveler?.email || traveler.email.endsWith('@deleted.invalid') || traveler.deletedAt) {
    return { skipped: 'anonymised' };
  }
  if (traveler.emailPreference === EMAIL_PREFERENCES.ESSENTIAL) {
    return { skipped: 'messages-only' };
  }
  // A traveller who has booked anything gets no reminders at all. Left unclaimed
  // on purpose: if that booking is cancelled the reminder becomes relevant again.
  if (await travellerHasActiveBooking(traveler._id, now)) {
    return { skipped: 'traveller-booked' };
  }
  // One reminder-type email a day per traveller, shared with the quote request
  // summaries. Unclaimed, so these offers are picked up on a later run.
  if (traveler.lastReminderEmailAt && now.getTime() - traveler.lastReminderEmailAt.getTime() < MIN_GAP_MS) {
    return { skipped: 'daily-limit' };
  }

  // A magic-link view (offerInviteController.js) or an in-app read both add
  // the traveller to readBy, so either path correctly suppresses the reminder.
  const unread = messages.filter(
    (message) => !message.readBy.some((id) => id.equals(traveler._id)) && isOfferBookable(message.offer, now)
  );
  if (unread.length === 0) return { skipped: 'nothing-unread' };

  // Claim BEFORE sending — if the send then fails we would rather miss one
  // reminder than risk emailing the same traveller repeatedly on every tick.
  const claimed = [];
  for (const message of unread) {
    const result = await ChatMessage.updateOne(
      { _id: message._id, offerReminderSentAt: { $exists: false } },
      { $set: { offerReminderSentAt: now } }
    );
    if (result.modifiedCount) claimed.push(message);
  }
  if (claimed.length === 0) return { skipped: 'already-claimed' };
  await User.updateOne({ _id: traveler._id }, { $set: { lastReminderEmailAt: now } });

  await sendOfferReminderEmail({
    recipient: { name: traveler.name, email: traveler.email },
    offers: claimed.map((message) => {
      // Signed links are not stored, so this cannot break the link in the
      // original offer email the way minting a fresh stored token used to.
      const token = signLinkToken(LINK_PURPOSES.OFFER_VIEW, message._id);
      return {
        driverName: message.conversation?.driver?.name,
        vehicleModel: message.conversation?.vehicle?.model,
        totalPrice: message.offer?.totalPrice,
        totalKms: message.offer?.totalKms,
        startDate: message.offer?.startDate,
        viewUrl: token ? buildAppUrl(`/offer/${token}`) : null,
      };
    }),
    preferencesUrl: buildEmailPreferencesUrl(traveler._id),
  });

  return { sent: claimed.length };
};

export const runOfferReminderSweep = async () => {
  const results = { considered: 0, travellers: 0, sent: 0, skipped: 0, failed: 0 };
  try {
    const messages = await findOffersAwaitingReminder();
    results.considered = messages.length;

    const byTraveller = new Map();
    for (const message of messages) {
      const travelerId = message.conversation?.traveler?.toString();
      if (!travelerId) continue;
      if (!byTraveller.has(travelerId)) byTraveller.set(travelerId, []);
      byTraveller.get(travelerId).push(message);
    }
    results.travellers = byTraveller.size;

    for (const [travelerId, travellerMessages] of byTraveller) {
      try {
        const outcome = await sendOfferRemindersForTraveller(travelerId, travellerMessages);
        if (outcome.sent) results.sent += 1;
        else results.skipped += 1;
      } catch (error) {
        results.failed += 1;
        console.error('Offer reminder failed for traveller', travelerId, error.message);
      }
    }
    if (results.sent || results.failed) {
      console.info('Offer reminder sweep:', JSON.stringify(results));
    }
  } catch (error) {
    console.error('Offer reminder sweep error:', error);
  }
  return results;
};

// Plain interval rather than a cron dependency: the query is window-based, so
// a restart cannot cause a missed hour to be skipped permanently.
export const startOfferReminderScheduler = () => {
  if (process.env.DISABLE_OFFER_REMINDERS === 'true') {
    console.info('Offer reminder scheduler disabled via DISABLE_OFFER_REMINDERS.');
    return null;
  }
  const timer = setInterval(() => { runOfferReminderSweep(); }, INTERVAL_MS);
  timer.unref?.();
  console.info('Offer reminder scheduler started (hourly).');
  return timer;
};

export default { runOfferReminderSweep, startOfferReminderScheduler };

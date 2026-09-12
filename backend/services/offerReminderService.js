import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { createOfferToken } from './chatService.js';
import { sendOfferReminderEmail } from './emailService.js';
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

export const sendOfferReminderForMessage = async (message) => {
  const conversation = message.conversation;
  if (!conversation?.traveler) return { skipped: 'no-conversation' };

  const traveler = await User.findById(conversation.traveler).select('name email deletedAt');
  // Anonymised travellers keep a placeholder address and must never be contacted again.
  if (!traveler?.email || traveler.email.endsWith('@deleted.invalid') || traveler.deletedAt) {
    return { skipped: 'anonymised' };
  }

  // A magic-link view (offerInviteController.js) or an in-app read both add
  // the traveller to readBy, so either path correctly suppresses the reminder.
  if (message.readBy.some((id) => id.equals(traveler._id))) {
    return { skipped: 'already-read' };
  }

  // Claim BEFORE sending — if the send then fails we would rather miss one
  // reminder than risk emailing the same traveller repeatedly on every tick.
  const claimed = await ChatMessage.findOneAndUpdate(
    { _id: message._id, offerReminderSentAt: { $exists: false } },
    { $set: { offerReminderSentAt: new Date() } },
    { new: true }
  );
  if (!claimed) return { skipped: 'already-claimed' };

  // Mint a fresh view token — the one emailed originally may be old, and this
  // token is cheap to regenerate since it isn't single-use.
  const { token, hash, expires } = createOfferToken();
  await ChatMessage.updateOne(
    { _id: message._id },
    { $set: { offerViewTokenHash: hash, offerViewTokenExpires: expires } }
  );

  await sendOfferReminderEmail({
    recipient: { name: traveler.name, email: traveler.email },
    driverName: conversation.driver?.name,
    vehicleModel: conversation.vehicle?.model,
    offerUrl: buildAppUrl(`/offer/${token}`),
  });

  return { sent: true, messageId: message._id.toString() };
};

export const runOfferReminderSweep = async () => {
  const results = { considered: 0, sent: 0, skipped: 0, failed: 0 };
  try {
    const messages = await findOffersAwaitingReminder();
    results.considered = messages.length;
    for (const message of messages) {
      try {
        const outcome = await sendOfferReminderForMessage(message);
        if (outcome.sent) results.sent += 1;
        else results.skipped += 1;
      } catch (error) {
        results.failed += 1;
        console.error('Offer reminder failed for message', message._id.toString(), error.message);
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

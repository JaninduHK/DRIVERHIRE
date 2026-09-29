import ChatMessage from '../models/ChatMessage.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/**
 * OBSERVATION MARKERS, NOT LIMITS.
 *
 * Nothing in this file rejects a message. These numbers exist so the admin view
 * can show "this driver would have tripped a limit of N" and real thresholds can
 * be chosen from real behaviour instead of a guess. Switching to enforcement
 * later means acting on `exceeded` at the call site — one line per send path.
 */
export const OBSERVE_THRESHOLDS = {
  offersPerHour: 15,
  messagesPerHour: 60,
  duplicateRecipients: 5, // same text to this many distinct travellers in 24h
};

export const RATE_WINDOW_MS = HOUR;
export const DUPLICATE_WINDOW_MS = 24 * HOUR;

/**
 * Counts a driver's recent sending activity. Uses indexed countDocuments on
 * ChatMessage.sender rather than an in-memory tally, so the numbers survive a
 * restart and stay correct if a second container is ever added.
 */
export const measureDriverActivity = async (driverId, { now = Date.now(), bodyHash = null } = {}) => {
  if (!driverId) {
    return { offersLastHour: 0, messagesLastHour: 0, duplicateRecipients: 0, exceeded: [] };
  }

  const since = new Date(now - RATE_WINDOW_MS);

  const [offersLastHour, messagesLastHour, duplicateRecipients] = await Promise.all([
    ChatMessage.countDocuments({ sender: driverId, type: 'offer', createdAt: { $gte: since } }),
    ChatMessage.countDocuments({ sender: driverId, createdAt: { $gte: since } }),
    bodyHash
      ? ChatMessage.distinct('conversation', {
          sender: driverId,
          bodyHash,
          createdAt: { $gte: new Date(now - DUPLICATE_WINDOW_MS) },
        }).then((list) => list.length)
      : Promise.resolve(0),
  ]);

  const exceeded = [];
  if (offersLastHour > OBSERVE_THRESHOLDS.offersPerHour) exceeded.push('offers_per_hour');
  if (messagesLastHour > OBSERVE_THRESHOLDS.messagesPerHour) exceeded.push('messages_per_hour');
  if (duplicateRecipients > OBSERVE_THRESHOLDS.duplicateRecipients) exceeded.push('duplicate_blast');

  return { offersLastHour, messagesLastHour, duplicateRecipients, exceeded };
};

/**
 * Fire-and-forget: records what WOULD have been limited, never blocks the send.
 * Failures here must never break messaging, hence the swallowed catch.
 */
export const observeDriverSend = (driverId, { bodyHash = null } = {}) => {
  measureDriverActivity(driverId, { bodyHash })
    .then((signals) => {
      if (signals.exceeded.length > 0) {
        console.info(
          `Abuse observation: driver ${driverId} would have tripped [${signals.exceeded.join(', ')}] ` +
            `(offers/h=${signals.offersLastHour}, msgs/h=${signals.messagesLastHour}, dupes=${signals.duplicateRecipients})`
        );
      }
    })
    .catch((error) => console.warn('Abuse observation failed:', error.message));
};

export default { measureDriverActivity, observeDriverSend, OBSERVE_THRESHOLDS };

import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import ChatMessage from '../models/ChatMessage.js';
import TourBrief from '../models/TourBrief.js';
import { USER_ROLES } from '../models/User.js';

/**
 * Once a traveller confirms a booking, every OTHER driver stops being able to
 * message them or send them offers — they have already filled the trip, and the
 * quotes that keep arriving are spam.
 *
 * Three ways a driver is still allowed through:
 *   1. They are the driver who was booked — they need the thread to run the trip.
 *   2. They have an offer on a quote request of that traveller's that is still
 *      open. A traveller who posts a new request is shopping again, so quoting it
 *      reopens the thread until that request is booked too.
 *   3. The traveller messaged them after the booking. Travellers are never
 *      restricted, so without this they would be writing into silence.
 *
 * Only `confirmed` counts. A `pending` booking is an unaccepted direct request the
 * driver may still reject, and locking everyone out at that point would strand the
 * traveller with nobody able to reply.
 */
export const TRAVELLER_BOOKED_CODE = 'traveller_booked_elsewhere';

export const TRAVELLER_BOOKED_MESSAGE =
  'This traveller has already booked another driver for their trip. You can message them again if they reply to you, or if they post a new quote request and you send an offer on it.';

const toId = (value) => (value == null ? '' : value.toString());

/**
 * The whole rule, as a pure function. Both the single-conversation check and the
 * batched inbox map call this, so a lock badge can never disagree with what the
 * send path actually does.
 *
 * `booking` is null when the traveller has no confirmed booking, else
 * { driverIds: Set<string>, latestAt: Date }.
 */
export const decideLock = ({ driverId, booking, hasOpenQuotedBrief, travellerRepliedSince }) => {
  if (!booking) return false;
  if (booking.driverIds.has(toId(driverId))) return false;
  if (hasOpenQuotedBrief) return false;
  if (travellerRepliedSince) return false;
  return true;
};

/** Confirmed bookings for these travellers, as travellerId -> { driverIds, latestAt }. */
const bookingsByTraveller = async (travelerIds) => {
  const bookings = await Booking.find({
    travelerUser: { $in: travelerIds },
    status: BOOKING_STATUS.CONFIRMED,
  })
    .select('travelerUser driver createdAt')
    .lean();

  const map = new Map();
  bookings.forEach((booking) => {
    const key = toId(booking.travelerUser);
    const entry = map.get(key) || { driverIds: new Set(), latestAt: null };
    entry.driverIds.add(toId(booking.driver));
    // The lock starts at the most recent booking, so "has the traveller replied
    // since being locked" is measured from the booking that actually locked it.
    if (!entry.latestAt || booking.createdAt > entry.latestAt) {
      entry.latestAt = booking.createdAt;
    }
    map.set(key, entry);
  });
  return map;
};

/** Travellers (of those given) with an open quote request this driver has quoted. */
const travellersWithOpenQuotedBrief = async (driverId, travelerIds) => {
  const briefs = await TourBrief.find({
    traveler: { $in: travelerIds },
    status: 'open',
    'responses.driver': driverId,
  })
    .select('traveler')
    .lean();
  return new Set(briefs.map((brief) => toId(brief.traveler)));
};

/**
 * Whether `driverId` is locked out of `conversationId` with `travelerId`.
 * Shaped like checkMessagingSuspension: null when they may send, otherwise a
 * { status, code, message } to return as-is.
 */
export const checkTravellerBookingLock = async ({ driverId, travelerId, conversationId }) => {
  if (!driverId || !travelerId) {
    return null;
  }

  const booking = (await bookingsByTraveller([travelerId])).get(toId(travelerId)) || null;

  // Short-circuit before spending the two follow-up queries.
  if (!booking || booking.driverIds.has(toId(driverId))) {
    return null;
  }

  const hasOpenQuotedBrief = (await travellersWithOpenQuotedBrief(driverId, [travelerId])).has(
    toId(travelerId)
  );

  let travellerRepliedSince = false;
  if (!hasOpenQuotedBrief && conversationId && booking.latestAt) {
    travellerRepliedSince = Boolean(
      await ChatMessage.exists({
        conversation: conversationId,
        senderRole: USER_ROLES.GUEST,
        createdAt: { $gt: booking.latestAt },
      })
    );
  }

  if (!decideLock({ driverId, booking, hasOpenQuotedBrief, travellerRepliedSince })) {
    return null;
  }

  return {
    status: 403,
    code: TRAVELLER_BOOKED_CODE,
    message: TRAVELLER_BOOKED_MESSAGE,
  };
};

/**
 * Batched form for the driver's conversation list, so a 100-row inbox costs three
 * queries rather than three hundred.
 *
 * `conversations` is an array of { id, traveler }. Returns Map<id, boolean>.
 */
export const travellerBookingLockMap = async ({ driverId, conversations }) => {
  const locks = new Map();
  if (!driverId || !Array.isArray(conversations) || conversations.length === 0) {
    return locks;
  }

  const travelerIds = [...new Set(conversations.map((c) => toId(c.traveler)).filter(Boolean))];
  if (travelerIds.length === 0) {
    return locks;
  }

  const bookings = await bookingsByTraveller(travelerIds);
  const quotedOpen = bookings.size
    ? await travellersWithOpenQuotedBrief(driverId, travelerIds)
    : new Set();

  // Only threads that are still locked after the first two checks need the
  // "did the traveller reply" lookup.
  const candidates = conversations.filter((c) =>
    decideLock({
      driverId,
      booking: bookings.get(toId(c.traveler)) || null,
      hasOpenQuotedBrief: quotedOpen.has(toId(c.traveler)),
      travellerRepliedSince: false,
    })
  );

  const repliedIn = new Set();
  if (candidates.length > 0) {
    // One query across every candidate thread, then filter per-thread: each
    // traveller's cutoff is their own booking time, not a shared one.
    const earliestCutoff = candidates.reduce((earliest, c) => {
      const at = bookings.get(toId(c.traveler))?.latestAt;
      if (!at) return earliest;
      return !earliest || at < earliest ? at : earliest;
    }, null);

    const messages = await ChatMessage.find({
      conversation: { $in: candidates.map((c) => c.id) },
      senderRole: USER_ROLES.GUEST,
      ...(earliestCutoff ? { createdAt: { $gt: earliestCutoff } } : {}),
    })
      .select('conversation createdAt')
      .lean();

    const cutoffByConversation = new Map(
      candidates.map((c) => [toId(c.id), bookings.get(toId(c.traveler))?.latestAt || null])
    );
    messages.forEach((message) => {
      const conversationId = toId(message.conversation);
      const cutoff = cutoffByConversation.get(conversationId);
      if (cutoff && message.createdAt > cutoff) {
        repliedIn.add(conversationId);
      }
    });
  }

  const candidateIds = new Set(candidates.map((c) => toId(c.id)));
  conversations.forEach((c) => {
    const id = toId(c.id);
    locks.set(id, candidateIds.has(id) && !repliedIn.has(id));
  });

  return locks;
};

export default {
  decideLock,
  checkTravellerBookingLock,
  travellerBookingLockMap,
  TRAVELLER_BOOKED_CODE,
};

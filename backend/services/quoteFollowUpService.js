import TourBrief from '../models/TourBrief.js';
import ChatMessage from '../models/ChatMessage.js';
// Populated below; imported so their schemas are registered wherever this runs.
import '../models/ChatConversation.js';
import '../models/Vehicle.js';
import User, { EMAIL_PREFERENCES } from '../models/User.js';
import Review, { REVIEW_STATUS } from '../models/Review.js';
import { getSetting, SETTING_KEYS } from '../models/Setting.js';
import {
  getRemainingEmailCredits,
  getSupportReplyAddress,
  sendConversationNotificationEmail,
  sendFirstOfferEmail,
  sendNoOffersYetEmail,
  sendQuoteOffersDigestEmail,
  sendQuoteOffersExpiredEmail,
} from './emailService.js';
import { expiredBefore } from './briefExpiryService.js';
import { isOfferBookable } from '../utils/offerExpiry.js';
import { travellerHasActiveBooking } from '../utils/travellerBookings.js';
import { LINK_PURPOSES, signLinkToken } from '../utils/signedLinks.js';
import { buildReplyAddress } from '../utils/emailReply.js';
import buildAppUrl from '../utils/url.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const INTERVAL_MS = HOUR;

// The emails a traveller can get about one quote request after posting it. The
// schedule and wording are documented in TRAVELLER_EMAILS.md at the repo root;
// nextFollowUpStep has the exact rules.
export const FOLLOW_UP_STEPS = {
  NO_OFFERS: 'noOffers', // 12h on and no driver has answered
  DIGEST_1: 'digest1', // 3h after the first offer, or at 5 offers: our top picks
  UPDATE: 'update', // at most daily: offers that arrived since we last wrote
  DIGEST_2: 'digest2', // 3 days after digest1: "what's holding you back?"
  APPROACHING_30: 'approaching30', // 30 days before the trip, still unbooked
  APPROACHING_14: 'approaching14', // 14 days before the trip, still unbooked
  EXPIRING: 'expiring', // a day before the first bookable offer lapses
  EXPIRED: 'expired', // once nothing is bookable any more
};

const NO_OFFERS_AFTER_MS = 12 * HOUR;
const FIRST_DIGEST_AFTER_MS = 3 * HOUR;
const FIRST_DIGEST_AT_OFFERS = 5;
const SECOND_DIGEST_AFTER_MS = 72 * HOUR;
const EXPIRING_WITHIN_MS = 24 * HOUR;
// An offer for a trip starting tomorrow expires within a day of being sent;
// do not announce that as "expires tomorrow" minutes after it arrived.
const EXPIRING_MIN_OFFER_AGE_MS = 12 * HOUR;
// "Your trip is in N days" is for plans that have been sitting, not new requests.
const APPROACHING_MIN_REQUEST_AGE_MS = 3 * DAY;
// At most one reminder-type email a day, per request and per traveller.
export const MIN_GAP_MS = 20 * HOUR;

const DEFAULT_MAX_PER_RUN = 20;
const DEFAULT_CREDIT_RESERVE = 60;
const PICKS_SHOWN = 3;

const toTime = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : null;
};

/**
 * Which follow-up (if any) this quote request is due right now.
 *
 * Pure: everything it needs is passed in, so the timing rules can be checked
 * without a database. `offers` are the request's offers as
 * { createdAt, status, expiresAt, readByTraveller }; `sentSteps` is
 * brief.followUp.steps; `brief` needs createdAt, startDate and pausedUntil.
 */
export const nextFollowUpStep = ({ offers = [], sentSteps = [], brief = {}, now = new Date() }) => {
  const nowMs = new Date(now).getTime();

  const pausedUntil = toTime(brief.pausedUntil);
  if (pausedUntil !== null && pausedUntil > nowMs) return null;

  const sent = new Map(sentSteps.map((entry) => [entry.step, entry]));
  const lastSentAt = Math.max(0, ...sentSteps.map((entry) => toTime(entry.sentAt) || 0));
  if (lastSentAt && nowMs - lastSentAt < MIN_GAP_MS) return null;

  if (offers.length === 0) {
    const postedAt = toTime(brief.createdAt);
    const waitedLongEnough = postedAt !== null && nowMs - postedAt >= NO_OFFERS_AFTER_MS;
    return waitedLongEnough && !sent.has(FOLLOW_UP_STEPS.NO_OFFERS) ? FOLLOW_UP_STEPS.NO_OFFERS : null;
  }

  const bookable = offers.filter((offer) => isOfferBookable(offer, new Date(nowMs)));

  if (bookable.length === 0) {
    // Only when offers actually lapsed. A request whose offers were all declined
    // or accepted reached an outcome and has nothing to chase.
    const lapsed = offers.some(
      (offer) =>
        offer.status === 'expired' ||
        (offer.status === 'pending' && toTime(offer.expiresAt) !== null && toTime(offer.expiresAt) <= nowMs)
    );
    return lapsed && !sent.has(FOLLOW_UP_STEPS.EXPIRED) ? FOLLOW_UP_STEPS.EXPIRED : null;
  }

  if (!sent.has(FOLLOW_UP_STEPS.EXPIRING)) {
    const aboutToLapse = bookable.some((offer) => {
      const expiry = toTime(offer.expiresAt);
      const age = nowMs - (toTime(offer.createdAt) ?? nowMs);
      return expiry !== null && expiry - nowMs <= EXPIRING_WITHIN_MS && age >= EXPIRING_MIN_OFFER_AGE_MS;
    });
    if (aboutToLapse) return FOLLOW_UP_STEPS.EXPIRING;
  }

  const first = sent.get(FOLLOW_UP_STEPS.DIGEST_1);
  if (!first) {
    const firstOfferAt = Math.min(...offers.map((offer) => toTime(offer.createdAt) ?? nowMs));
    const due = nowMs - firstOfferAt >= FIRST_DIGEST_AFTER_MS || bookable.length >= FIRST_DIGEST_AT_OFFERS;
    return due ? FOLLOW_UP_STEPS.DIGEST_1 : null;
  }

  // Urgency from the traveller's own plans rather than from an offer's deadline.
  const startAt = toTime(brief.startDate);
  const postedAt = toTime(brief.createdAt);
  if (startAt !== null && (postedAt === null || nowMs - postedAt >= APPROACHING_MIN_REQUEST_AGE_MS)) {
    const daysToTrip = Math.ceil((startAt - nowMs) / DAY);
    if (daysToTrip <= 14 && daysToTrip >= 2 && !sent.has(FOLLOW_UP_STEPS.APPROACHING_14)) {
      return FOLLOW_UP_STEPS.APPROACHING_14;
    }
    if (
      daysToTrip <= 30 &&
      daysToTrip > 14 &&
      !sent.has(FOLLOW_UP_STEPS.APPROACHING_30) &&
      !sent.has(FOLLOW_UP_STEPS.APPROACHING_14)
    ) {
      return FOLLOW_UP_STEPS.APPROACHING_30;
    }
  }

  if (!sent.has(FOLLOW_UP_STEPS.DIGEST_2) && nowMs - (toTime(first.sentAt) || 0) >= SECOND_DIGEST_AFTER_MS) {
    const somethingUnread = bookable.some((offer) => !offer.readByTraveller);
    const somethingNew = bookable.length > (first.offerCount || 0);
    if (somethingUnread || somethingNew) return FOLLOW_UP_STEPS.DIGEST_2;
  }

  // Offers that arrived since we last wrote about this request.
  if (bookable.some((offer) => (toTime(offer.createdAt) || 0) > lastSentAt)) {
    return FOLLOW_UP_STEPS.UPDATE;
  }

  return null;
};

/**
 * Up to three offers to put in front of a traveller, labelled, so they do not
 * have to compare a dozen cards. Cheapest-first on its own pushes brand-new
 * drivers with no reviews to the top, and for a multi-day trip trust matters
 * more than a few dollars a day.
 *
 * - Best value: the lowest price among drivers rated 4.5 or better.
 * - Top rated: the highest rating among drivers with at least 10 reviews.
 * - Best match: the vehicle whose seats fit the group most closely.
 * Remaining slots go to the cheapest offers left, unlabelled.
 */
export const pickTopOffers = (offers = [], { groupSize = 0, limit = PICKS_SHOWN } = {}) => {
  const remaining = [...offers];
  const picks = [];
  const take = (offer, label) => {
    if (!offer || picks.length >= limit) return;
    remaining.splice(remaining.indexOf(offer), 1);
    picks.push({ ...offer, label });
  };
  const byPrice = (a, b) => (a.totalPrice || 0) - (b.totalPrice || 0);

  take(remaining.filter((offer) => offer.reviewCount > 0 && offer.rating >= 4.5).sort(byPrice)[0], 'Best value');
  take(
    remaining
      .filter((offer) => offer.reviewCount >= 10)
      .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)[0],
    'Top rated'
  );
  if (groupSize > 0) {
    const fits = remaining.filter((offer) => offer.vehicleSeats >= groupSize);
    // Only a real distinction earns the label: when every vehicle left fits the
    // group equally well, calling one of them the "best match" would be noise.
    const distinguishes = fits.length < remaining.length || new Set(fits.map((offer) => offer.vehicleSeats)).size > 1;
    if (distinguishes) {
      take(fits.sort((a, b) => a.vehicleSeats - b.vehicleSeats || b.rating - a.rating || byPrice(a, b))[0], 'Best match');
    }
  }
  for (const offer of [...remaining].sort(byPrice)) take(offer);
  return picks;
};

const loadDriverRatings = async (driverIds) => {
  if (driverIds.length === 0) return new Map();
  const rows = await Review.aggregate([
    { $match: { driver: { $in: driverIds }, status: REVIEW_STATUS.APPROVED } },
    { $group: { _id: '$driver', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);
  return new Map(
    rows.map((row) => [
      row._id.toString(),
      { reviewCount: row.reviewCount, rating: Math.round(Math.min(5, Math.max(1, row.averageRating)) * 10) / 10 },
    ])
  );
};

const inclusiveDays = (start, end) => {
  const from = toTime(start);
  const to = toTime(end);
  return from === null || to === null || to < from ? 0 : Math.round((to - from) / DAY) + 1;
};

// Shape an offer message (conversation.driver and offer.vehicle populated) for an email card.
const toEmailOffer = (message, ratings, { note = '' } = {}) => {
  const driver = message.conversation?.driver;
  const rating = driver?._id ? ratings.get(driver._id.toString()) : null;
  const token = signLinkToken(LINK_PURPOSES.OFFER_VIEW, message._id);
  // Mail clients need an absolute image URL; legacy relative upload paths are skipped.
  const photo = typeof driver?.profilePhoto === 'string' && /^https?:\/\//i.test(driver.profilePhoto) ? driver.profilePhoto : '';
  return {
    messageId: message._id.toString(),
    createdAt: message.createdAt,
    expiresAt: message.offer?.expiresAt,
    driverName: driver?.name || 'Driver',
    driverPhoto: photo,
    experienceYears: Number(driver?.experienceYears) || 0,
    rating: rating?.rating || 0,
    reviewCount: rating?.reviewCount || 0,
    vehicleModel: message.offer?.vehicle?.model || '',
    vehicleSeats: Number(message.offer?.vehicle?.seats) || 0,
    totalKms: message.offer?.totalKms,
    pricePerExtraKm: message.offer?.pricePerExtraKm,
    totalPrice: message.offer?.totalPrice,
    days: inclusiveDays(message.offer?.startDate, message.offer?.endDate),
    inclusions: message.offer?.inclusions,
    note,
    viewUrl: token ? buildAppUrl(`/offer/${token}`) : null,
  };
};

const signedUrl = (purpose, id, path, query = '') => {
  const token = signLinkToken(purpose, id);
  return token ? buildAppUrl(`${path}/${token}${query}`) : '';
};

/** The traveller's "Email me less often" page. */
export const buildEmailPreferencesUrl = (userId) =>
  signedUrl(LINK_PURPOSES.EMAIL_PREFERENCES, userId, '/api/email-preferences');

const buildAnswerUrls = (briefId) =>
  Object.fromEntries(
    ['price', 'dates', 'choice', 'booked'].map((reason) => [
      reason,
      signedUrl(LINK_PURPOSES.QUOTE_ANSWER, briefId, '/api/quote-follow-up/answer', `?reason=${reason}`),
    ])
  );

const buildRepostUrl = (briefId) => signedUrl(LINK_PURPOSES.QUOTE_REPOST, briefId, '/api/quote-follow-up/repost');

const offerPopulation = [
  { path: 'conversation', select: 'driver', populate: { path: 'driver', select: 'name experienceYears profilePhoto' } },
  { path: 'offer.vehicle', select: 'model seats' },
];

const loadBriefOffers = (briefId) =>
  ChatMessage.find({ type: 'offer', 'offer.brief': briefId }).populate(offerPopulation).lean();

const isReachable = (traveler) =>
  Boolean(traveler?.email) && !traveler.deletedAt && !traveler.email.endsWith('@deleted.invalid');

/**
 * The email (if any) a traveller gets when a driver answers their quote request.
 *
 * One email per offer is what buried travellers: seventeen on average, up to
 * twenty-eight in a day, with clicks falling by two-thirds as they piled up.
 * So only the first offer on a request is emailed straight away; the rest reach
 * the traveller through the summaries (runQuoteFollowUpSweep). A traveller who
 * asked for every offer still gets each one; one who asked for messages and
 * bookings only gets none.
 *
 * Fire-and-forget from the request handler: never throws.
 */
export const sendOfferArrivalEmail = async ({ brief, messageId, conversationId, note = '' }) => {
  try {
    const traveler = await User.findById(brief.traveler).select('name email deletedAt emailPreference').lean();
    if (!isReachable(traveler) || traveler.emailPreference === EMAIL_PREFERENCES.ESSENTIAL) return;

    const isFirstOffer = (brief.responses || []).length <= 1;
    const wantsEveryOffer = traveler.emailPreference === EMAIL_PREFERENCES.ALL;
    if (!isFirstOffer && !wantsEveryOffer) return;

    const message = await ChatMessage.findById(messageId).populate(offerPopulation).lean();
    if (!message?.offer) return;

    const driverId = message.conversation?.driver?._id;
    const ratings = await loadDriverRatings(driverId ? [driverId] : []);
    const offer = toEmailOffer(message, ratings, { note });
    const recipient = { name: traveler.name, email: traveler.email, role: 'guest' };
    const replyTo = buildReplyAddress(conversationId);

    if (isFirstOffer) {
      await sendFirstOfferEmail({
        traveler: recipient,
        brief,
        offer,
        replyTo,
        preferencesUrl: buildEmailPreferencesUrl(traveler._id),
      });
      return;
    }

    await sendConversationNotificationEmail({
      recipient,
      sender: { name: offer.driverName },
      messagePreview: message.body,
      isOffer: true,
      offerPrice: offer.totalPrice,
      conversationUrl: offer.viewUrl,
      vehicleModel: offer.vehicleModel,
      replyTo,
    });
  } catch (error) {
    console.warn('Offer arrival email error:', error);
  }
};

/**
 * One pass over open quote requests that have not been booked.
 *
 * `dryRun` reports what would be sent without claiming or emailing anything.
 * Returns { considered, sent, failed, skipped: { reason: count }, planned: [...] }.
 */
export const runQuoteFollowUpSweep = async ({ now = new Date(), dryRun = false } = {}) => {
  const results = { considered: 0, sent: 0, failed: 0, skipped: {}, planned: [] };
  const skip = (reason) => {
    results.skipped[reason] = (results.skipped[reason] || 0) + 1;
  };

  try {
    if ((await getSetting(SETTING_KEYS.QUOTE_FOLLOW_UPS, true)) === false) {
      return { ...results, disabled: true };
    }

    // On a plan with a daily limit everything past it is silently dropped, so
    // leave the last sends of the day for verification, message and booking emails.
    const reserve = Number(process.env.EMAIL_FOLLOW_UP_RESERVE) || DEFAULT_CREDIT_RESERVE;
    const maxPerRun = Number(process.env.EMAIL_FOLLOW_UP_MAX_PER_RUN) || DEFAULT_MAX_PER_RUN;
    const credits = dryRun ? null : await getRemainingEmailCredits();
    let budget = credits === null ? maxPerRun : Math.min(maxPerRun, credits - reserve);
    if (budget <= 0) {
      return { ...results, outOfCredits: true };
    }

    const briefs = await TourBrief.find({
      status: 'open',
      endDate: { $gte: expiredBefore() },
      'followUp.optedOutAt': null,
    })
      .sort({ lastResponseAt: -1, createdAt: -1 })
      .limit(500);
    results.considered = briefs.length;

    const travellers = new Map();
    const loadTraveller = async (travelerId) => {
      const key = travelerId.toString();
      if (!travellers.has(key)) {
        const traveler = await User.findById(travelerId)
          .select('name email deletedAt emailPreference lastReminderEmailAt')
          .lean();
        travellers.set(key, {
          traveler,
          booked: isReachable(traveler) ? await travellerHasActiveBooking(travelerId, now) : false,
          emailedThisRun: false,
        });
      }
      return travellers.get(key);
    };

    for (const brief of briefs) {
      if (budget <= 0) {
        skip('run-limit');
        continue;
      }
      try {
        const messages = await loadBriefOffers(brief._id);
        const travelerId = brief.traveler;
        const offers = messages.map((message) => ({
          createdAt: message.createdAt,
          status: message.offer?.status,
          expiresAt: message.offer?.expiresAt,
          readByTraveller: (message.readBy || []).some((reader) => reader.toString() === travelerId.toString()),
        }));
        const sentSteps = brief.followUp?.steps || [];

        const step = nextFollowUpStep({
          offers,
          sentSteps,
          brief: { createdAt: brief.createdAt, startDate: brief.startDate, pausedUntil: brief.followUp?.pausedUntil },
          now,
        });
        if (!step) {
          skip('not-due');
          continue;
        }

        const entry = await loadTraveller(travelerId);
        const { traveler } = entry;
        if (!isReachable(traveler)) {
          skip('anonymised');
          continue;
        }
        // A traveller who has booked anything gets no reminders at all.
        if (entry.booked) {
          skip('traveller-booked');
          continue;
        }
        if (traveler.emailPreference === EMAIL_PREFERENCES.ESSENTIAL) {
          skip('messages-only');
          continue;
        }
        // Travellers who chose every offer as it arrives already got each of these.
        if (step === FOLLOW_UP_STEPS.UPDATE && traveler.emailPreference === EMAIL_PREFERENCES.ALL) {
          skip('already-emailed-each-offer');
          continue;
        }
        // One reminder a day per traveller, across all of their requests.
        const lastReminderAt = toTime(traveler.lastReminderEmailAt);
        if (entry.emailedThisRun || (lastReminderAt !== null && now.getTime() - lastReminderAt < MIN_GAP_MS)) {
          skip('daily-limit');
          continue;
        }

        const lastSentAt = Math.max(0, ...sentSteps.map((sentStep) => toTime(sentStep.sentAt) || 0));
        const bookable = messages.filter((message) => isOfferBookable(message.offer, now));
        const lapsed = messages.filter(
          (message) => message.offer?.status === 'expired' || message.offer?.status === 'pending'
        );
        const fresh = bookable.filter((message) => (toTime(message.createdAt) || 0) > lastSentAt);
        const relevant =
          step === FOLLOW_UP_STEPS.EXPIRED ? lapsed : step === FOLLOW_UP_STEPS.UPDATE ? fresh : bookable;

        results.planned.push({ briefId: brief._id.toString(), step, offers: relevant.length });
        if (dryRun) continue;

        // Claim BEFORE sending — if the send then fails we would rather miss one
        // follow-up than email the same traveller again on every tick. 'update'
        // repeats, so it is guarded by time instead of by having been sent once.
        const guard =
          step === FOLLOW_UP_STEPS.UPDATE
            ? { 'followUp.steps': { $not: { $elemMatch: { sentAt: { $gt: new Date(now.getTime() - MIN_GAP_MS) } } } } }
            : { 'followUp.steps.step': { $ne: step } };
        const claimed = await TourBrief.updateOne(
          { _id: brief._id, ...guard },
          { $push: { 'followUp.steps': { step, sentAt: now, offerCount: bookable.length } } }
        );
        if (!claimed.modifiedCount) {
          skip('already-claimed');
          continue;
        }
        entry.emailedThisRun = true;
        await User.updateOne({ _id: traveler._id }, { $set: { lastReminderEmailAt: now } });

        const recipient = { name: traveler.name, email: traveler.email };
        const preferencesUrl = buildEmailPreferencesUrl(traveler._id);

        if (step === FOLLOW_UP_STEPS.NO_OFFERS) {
          await sendNoOffersYetEmail({ traveler: recipient, brief, preferencesUrl });
        } else {
          const driverIds = relevant.map((message) => message.conversation?.driver?._id).filter(Boolean);
          const ratings = await loadDriverRatings(driverIds);
          const emailOffers = relevant.map((message) => toEmailOffer(message, ratings));
          const groupSize = (Number(brief.adults) || 0) + (Number(brief.children) || 0);

          if (step === FOLLOW_UP_STEPS.EXPIRED) {
            await sendQuoteOffersExpiredEmail({
              traveler: recipient,
              brief,
              offers: [...emailOffers].sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0)).slice(0, PICKS_SHOWN),
              // Nothing to re-post once the trip's own dates have started.
              repostUrl: toTime(brief.startDate) > now.getTime() ? buildRepostUrl(brief._id) : '',
              preferencesUrl,
            });
          } else {
            const soonest = [...emailOffers].sort((a, b) => (toTime(a.expiresAt) || Infinity) - (toTime(b.expiresAt) || Infinity))[0];
            const shown =
              step === FOLLOW_UP_STEPS.EXPIRING
                ? [soonest, ...pickTopOffers(emailOffers.filter((offer) => offer !== soonest), { groupSize, limit: PICKS_SHOWN - 1 })]
                : pickTopOffers(emailOffers, { groupSize });
            const variant =
              step === FOLLOW_UP_STEPS.APPROACHING_30 || step === FOLLOW_UP_STEPS.APPROACHING_14 ? 'approaching' : step;
            await sendQuoteOffersDigestEmail({
              traveler: recipient,
              brief,
              offers: shown,
              totalCount: bookable.length,
              freshCount: fresh.length,
              leadOffer: soonest,
              daysToTrip: Math.ceil((toTime(brief.startDate) - now.getTime()) / DAY),
              variant,
              answerUrls: step === FOLLOW_UP_STEPS.DIGEST_2 ? buildAnswerUrls(brief._id) : undefined,
              // Replies ask for help choosing, so they go to our inbox, not to one driver's chat.
              replyTo: getSupportReplyAddress() || undefined,
              preferencesUrl,
            });
          }
        }

        budget -= 1;
        results.sent += 1;
      } catch (error) {
        results.failed += 1;
        console.error('Quote follow-up failed for brief', brief._id.toString(), error.message);
      }
    }

    if (!dryRun && (results.sent || results.failed)) {
      const { planned, ...summary } = results;
      console.info('Quote follow-up sweep:', JSON.stringify(summary));
    }
  } catch (error) {
    console.error('Quote follow-up sweep error:', error);
  }
  return results;
};

// Plain interval rather than a cron dependency, like the other sweeps: every
// step is derived from stored dates, so a missed run just catches up next tick.
export const startQuoteFollowUpScheduler = () => {
  if (process.env.DISABLE_QUOTE_FOLLOW_UPS === 'true') {
    console.info('Quote follow-up scheduler disabled via DISABLE_QUOTE_FOLLOW_UPS.');
    return null;
  }
  const timer = setInterval(() => { runQuoteFollowUpSweep(); }, INTERVAL_MS);
  timer.unref?.();
  console.info('Quote follow-up scheduler started (hourly).');
  return timer;
};

export default {
  runQuoteFollowUpSweep,
  startQuoteFollowUpScheduler,
  nextFollowUpStep,
  pickTopOffers,
  sendOfferArrivalEmail,
  buildEmailPreferencesUrl,
  FOLLOW_UP_STEPS,
};

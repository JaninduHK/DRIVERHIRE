import TourBrief from '../models/TourBrief.js';
import ChatMessage from '../models/ChatMessage.js';
import { expiredBefore } from '../services/briefExpiryService.js';
import { isOfferBookable } from '../utils/offerExpiry.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const ALLOWED_WINDOWS = [7, 30, 90];
const STALLED_LIMIT = 200;

const median = (values) => {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * What happened to each quote request, from its offers and chat messages:
 * whether it got an offer, whether the traveller opened one, whether they wrote
 * back, and how many of its offers can still be booked.
 */
const analyseBriefs = async (briefs, now) => {
  const briefIds = briefs.map((brief) => brief._id);
  const offers = briefIds.length
    ? await ChatMessage.find({ type: 'offer', 'offer.brief': { $in: briefIds } })
        .select('offer.brief offer.status offer.expiresAt readBy conversation createdAt')
        .lean()
    : [];

  // Latest thing the traveller actually typed in each quote conversation. The
  // injected copy of their request (type 'brief') is not a reply, so it is excluded.
  const conversationIds = [...new Set(offers.map((offer) => offer.conversation.toString()))];
  const replies = conversationIds.length
    ? await ChatMessage.aggregate([
        { $match: { conversation: { $in: offers.map((offer) => offer.conversation) }, senderRole: 'guest', type: 'text' } },
        { $group: { _id: '$conversation', lastReplyAt: { $max: '$createdAt' } } },
      ])
    : [];
  const lastReplyByConversation = new Map(replies.map((row) => [row._id.toString(), row.lastReplyAt]));

  const offersByBrief = new Map();
  for (const offer of offers) {
    const key = offer.offer.brief.toString();
    if (!offersByBrief.has(key)) offersByBrief.set(key, []);
    offersByBrief.get(key).push(offer);
  }

  return briefs.map((brief) => {
    const own = offersByBrief.get(brief._id.toString()) || [];
    const travelerId = (brief.traveler?._id || brief.traveler)?.toString();
    const firstOfferAt = own.length ? new Date(Math.min(...own.map((offer) => new Date(offer.createdAt).getTime()))) : null;
    const opened = own.some((offer) => (offer.readBy || []).some((reader) => reader.toString() === travelerId));
    // A reply counts only if it came after that conversation's offer, since the
    // same traveller and driver may already have been chatting about another trip.
    const replied = own.some((offer) => {
      const lastReply = lastReplyByConversation.get(offer.conversation.toString());
      return lastReply && new Date(lastReply) > new Date(offer.createdAt);
    });
    return {
      brief,
      offerCount: own.length,
      bookableCount: own.filter((offer) => isOfferBookable(offer.offer, now)).length,
      firstOfferAt,
      opened,
      replied,
      booked: brief.status === 'booked',
    };
  });
};

/**
 * GET /api/admin/reports/quote-funnel?days=30
 *
 * Where quote requests drop off on the way to a booking, for requests posted in
 * the window, plus every request that is stuck right now (open, has offers, not
 * booked) whenever it was posted.
 */
export const getQuoteFunnel = async (req, res) => {
  try {
    const requested = Number(req.query.days);
    const days = ALLOWED_WINDOWS.includes(requested) ? requested : 30;
    const now = new Date();
    const since = new Date(now.getTime() - days * DAY_MS);

    const [windowBriefs, stalledBriefs] = await Promise.all([
      TourBrief.find({ createdAt: { $gte: since } }).select('traveler status createdAt').lean(),
      TourBrief.find({ status: 'open', endDate: { $gte: expiredBefore() }, 'responses.0': { $exists: true } })
        .select('traveler status createdAt startLocation endLocation startDate endDate followUp')
        .populate('traveler', 'name')
        .sort({ createdAt: -1 })
        .limit(STALLED_LIMIT)
        .lean(),
    ]);

    const [analysed, stalledAnalysed] = await Promise.all([
      analyseBriefs(windowBriefs, now),
      analyseBriefs(stalledBriefs, now),
    ]);

    const withOffers = analysed.filter((entry) => entry.offerCount > 0);
    const stages = [
      { key: 'posted', label: 'Requests posted', count: analysed.length },
      { key: 'offered', label: 'Received an offer', count: withOffers.length },
      { key: 'opened', label: 'Traveller opened an offer', count: withOffers.filter((entry) => entry.opened).length },
      { key: 'replied', label: 'Traveller replied to a driver', count: withOffers.filter((entry) => entry.replied).length },
      { key: 'booked', label: 'Booked', count: analysed.filter((entry) => entry.booked).length },
    ];

    return res.json({
      days,
      since,
      stages,
      medianOffersPerRequest: median(withOffers.map((entry) => entry.offerCount)),
      medianHoursToFirstOffer: median(
        withOffers.map((entry) => (entry.firstOfferAt - new Date(entry.brief.createdAt)) / (60 * 60 * 1000))
      ),
      stalled: stalledAnalysed.map((entry) => ({
        id: entry.brief._id.toString(),
        travelerName: entry.brief.traveler?.name || 'Traveller',
        startLocation: entry.brief.startLocation,
        endLocation: entry.brief.endLocation,
        startDate: entry.brief.startDate,
        endDate: entry.brief.endDate,
        createdAt: entry.brief.createdAt,
        offerCount: entry.offerCount,
        bookableCount: entry.bookableCount,
        opened: entry.opened,
        replied: entry.replied,
        followUpSteps: (entry.brief.followUp?.steps || []).map((step) => ({ step: step.step, sentAt: step.sentAt })),
        followUpStopped: Boolean(entry.brief.followUp?.optedOutAt),
        followUpPausedUntil: entry.brief.followUp?.pausedUntil || null,
        // The traveller's answer to "What's holding you back?", if they gave one.
        feedbackReason: entry.brief.followUp?.feedback?.reason || null,
      })),
    });
  } catch (error) {
    console.error('Quote funnel report error:', error);
    return res.status(500).json({ message: 'Unable to load the quote funnel report.' });
  }
};

export default { getQuoteFunnel };

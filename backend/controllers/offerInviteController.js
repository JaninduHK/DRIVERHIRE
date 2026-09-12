import ChatMessage from '../models/ChatMessage.js';
import { hashOfferToken } from '../services/chatService.js';

const loadOfferByToken = async (token) => {
  if (typeof token !== 'string' || token.length < 32) return { error: 'INVALID' };

  const message = await ChatMessage.findOne({ offerViewTokenHash: hashOfferToken(token) }).populate({
    path: 'conversation',
    populate: [
      { path: 'driver', select: 'name' },
      { path: 'vehicle', select: 'model' },
    ],
  });

  if (!message || message.type !== 'offer' || !message.conversation) return { error: 'INVALID' };
  if (message.offerViewTokenExpires && message.offerViewTokenExpires < new Date()) {
    return { error: 'EXPIRED', message };
  }
  return { message };
};

const TOKEN_ERRORS = {
  INVALID: { status: 404, message: 'This offer link is not valid. It may have been mistyped.' },
  EXPIRED: { status: 410, message: 'This offer link has expired. Please log in to view your messages.' },
};

// ---------------------------------------------------------------------------
// Deliberately UNAUTHENTICATED, same rationale as the tokenised review-invite
// flow in reviewController.js: forcing an Asgardeo sign-in round-trip before
// showing the offer would cost most of the click-throughs from the email. The
// token is the proof of identity — random, expiring, scoped to exactly one
// offer message — and grants nothing beyond read access to that offer's
// summary. Unlike the review token this one is not single-use: re-opening the
// same emailed link should keep working.
// ---------------------------------------------------------------------------
export const getOfferInvite = async (req, res) => {
  try {
    const { message, error } = await loadOfferByToken(req.params.token);
    if (error) {
      const mapped = TOKEN_ERRORS[error];
      return res.status(mapped.status).json({ message: mapped.message, reason: error });
    }

    const { conversation, offer } = message;

    // A magic-link view still counts as "read" for unread badges and the
    // reminder sweep (services/offerReminderService.js) — the traveller
    // genuinely saw the offer, even though they never logged in.
    if (conversation.traveler && !message.readBy.some((id) => id.equals(conversation.traveler))) {
      await ChatMessage.updateOne(
        { _id: message._id },
        { $addToSet: { readBy: conversation.traveler } }
      );
    }

    return res.json({
      invite: {
        conversationId: conversation._id.toString(),
        driverName: conversation.driver?.name || 'your driver',
        vehicleModel: conversation.vehicle?.model || null,
        startDate: offer.startDate,
        endDate: offer.endDate,
        totalPrice: offer.totalPrice,
        totalKms: offer.totalKms,
        pricePerExtraKm: offer.pricePerExtraKm,
        currency: offer.currency,
        status: offer.status,
        note: message.body,
      },
    });
  } catch (error) {
    console.error('Get offer invite error:', error);
    return res.status(500).json({ message: 'Unable to open this offer link right now.' });
  }
};

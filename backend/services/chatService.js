import crypto from 'crypto';
import ChatMessage from '../models/ChatMessage.js';
import { USER_ROLES } from '../models/User.js';
import { sanitizeMessageContent } from '../utils/chatSanitizer.js';
import { sendConversationNotificationEmail } from './emailService.js';
import buildAppUrl from '../utils/url.js';

const HOUR = 60 * 60 * 1000;

// Lets a traveller who opens the offer notification email view the offer
// without an Asgardeo round-trip first (see controllers/offerInviteController.js
// and services/offerReminderService.js, which both reuse this pair). Not
// single-use like the review-invite token — re-opening the same email link
// should keep working, so nothing "burns" it.
export const OFFER_TOKEN_TTL_MS = 30 * 24 * HOUR;

export const hashOfferToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const createOfferToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashOfferToken(token), expires: new Date(Date.now() + OFFER_TOKEN_TTL_MS) };
};

const participantFields = [
  { path: 'traveler', select: 'id name email role' },
  { path: 'driver', select: 'id name email role' },
  { path: 'vehicle', select: 'model' },
];

const toParticipant = (doc) => {
  if (!doc) {
    return null;
  }
  const id = doc.id?.toString?.() || doc._id?.toString?.() || null;
  return {
    id,
    name: doc.name,
    email: doc.email,
    role: doc.role,
  };
};

// Deep-links straight to the conversation instead of a bare dashboard/portal
// landing page, so a traveller/driver who clicks through from the email does
// not also have to hunt for the right thread once logged in.
const buildConversationUrl = (role, conversationId) => {
  if (role === USER_ROLES.DRIVER) {
    return buildAppUrl('/portal/driver/messages');
  }
  const params = new URLSearchParams({ tab: 'messages', conversationId: String(conversationId || '') });
  return buildAppUrl(`/dashboard?${params.toString()}`);
};

const queueConversationNotification = (conversation, senderRole, message, offerToken) => {
  if (!conversation || typeof conversation.populate !== 'function' || !message) {
    return;
  }

  conversation
    .populate(participantFields)
    .then(() => {
      const traveler = toParticipant(conversation.traveler);
      const driver = toParticipant(conversation.driver);

      if (!traveler || !driver) {
        return;
      }

      const recipient = senderRole === USER_ROLES.GUEST ? driver : traveler;
      const sender = senderRole === USER_ROLES.GUEST ? traveler : driver;
      const isOffer = message.type === 'offer';

      // Offers get the no-login magic link; everything else still requires
      // sign-in but at least lands directly on the right conversation.
      const conversationUrl =
        isOffer && recipient.id === traveler.id && offerToken
          ? buildAppUrl(`/offer/${offerToken}`)
          : buildConversationUrl(recipient.role, conversation._id);

      return sendConversationNotificationEmail({
        recipient,
        sender,
        messagePreview: message.body,
        isOffer,
        conversationUrl,
        vehicleModel: conversation.vehicle?.model,
      });
    })
    .catch((error) => {
      console.warn('Conversation notification error:', error);
    });
};

/**
 * Creates a chat message, updates unread counts, and keeps the conversation metadata in sync.
 * This helper mirrors the behaviour used throughout the chat controller so other modules
 * (e.g. briefs) can reuse the same logic.
 *
 * @param {Object} params
 * @param {import('../models/ChatConversation.js').default} params.conversation
 * @param {string} params.senderId
 * @param {'guest'|'driver'|'admin'} params.senderRole
 * @param {string} params.content
 * @param {'text'|'offer'} [params.type='text']
 * @param {Object|null} [params.offer=null]
 * @returns {Promise<import('../models/ChatMessage.js').default>}
 */
export const createChatMessage = async ({
  conversation,
  senderId,
  senderRole,
  content,
  type = 'text',
  offer = null,
}) => {
  const { sanitized, violations, warning } = sanitizeMessageContent(content);

  let offerToken;
  let offerViewTokenHash;
  let offerViewTokenExpires;
  if (type === 'offer') {
    const minted = createOfferToken();
    offerToken = minted.token;
    offerViewTokenHash = minted.hash;
    offerViewTokenExpires = minted.expires;
  }

  const message = new ChatMessage({
    conversation: conversation._id,
    sender: senderId,
    senderRole,
    type,
    body: sanitized || (type === 'offer' ? content : ''),
    warning: warning || undefined,
    violations,
    offer,
    readBy: [senderId],
    offerViewTokenHash,
    offerViewTokenExpires,
  });

  await message.save();

  conversation.lastMessage = message._id;
  conversation.lastMessageAt = message.createdAt;

  if (senderRole === USER_ROLES.GUEST) {
    conversation.travelerUnreadCount = 0;
    conversation.driverUnreadCount += 1;
  } else if (senderRole === USER_ROLES.DRIVER) {
    conversation.driverUnreadCount = 0;
    conversation.travelerUnreadCount += 1;
  }

  await conversation.save();

  queueConversationNotification(conversation, senderRole, message, offerToken);

  return message;
};

export default {
  createChatMessage,
};

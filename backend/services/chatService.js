import crypto from 'crypto';
import ChatMessage from '../models/ChatMessage.js';
import ChatConversation from '../models/ChatConversation.js';
import { EMAIL_PREFERENCES, USER_ROLES } from '../models/User.js';
import { sanitizeMessageContent } from '../utils/chatSanitizer.js';
import { fingerprintMessage } from '../utils/messageFingerprint.js';
import { sendConversationNotificationEmail } from './emailService.js';
import buildAppUrl from '../utils/url.js';
import { buildReplyAddress } from '../utils/emailReply.js';

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
  { path: 'traveler', select: 'id name email role emailPreference' },
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
    emailPreference: doc.emailPreference,
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

// A driver's messages to a traveller are emailed a little after they are sent,
// not instantly, for two reasons the delay makes possible:
// - if the traveller is in the chat (it polls every few seconds and marks what
//   it shows as read) the email is skipped, since they have already seen it;
// - several messages sent close together arrive as one email, not one each.
// After an email goes out, the next one for that conversation waits out the
// window. State is in memory: a restart drops a pending email for messages that
// are still waiting, which the traveller then sees in their dashboard instead.
const MESSAGE_EMAIL_DELAY_MS = 90 * 1000;
const MESSAGE_EMAIL_WINDOW_MS = 10 * 60 * 1000;
const MESSAGE_EMAIL_MAX_BODIES = 8;
const pendingMessageEmails = new Map(); // conversationId -> { timer, pendingSince, lastSentAt }

const flushTravellerMessageEmail = async (conversationId) => {
  const entry = pendingMessageEmails.get(conversationId);
  if (!entry) return;
  const { pendingSince } = entry;
  entry.timer = null;
  entry.pendingSince = null;

  try {
    const conversation = await ChatConversation.findById(conversationId).populate(participantFields);
    const traveler = toParticipant(conversation?.traveler);
    const driver = toParticipant(conversation?.driver);
    if (!traveler?.email || !driver) return;

    const unread = await ChatMessage.find({
      conversation: conversationId,
      senderRole: USER_ROLES.DRIVER,
      type: 'text',
      createdAt: { $gte: pendingSince },
      readBy: { $ne: conversation.traveler._id },
    })
      .sort({ createdAt: 1 })
      .limit(MESSAGE_EMAIL_MAX_BODIES)
      .lean();
    if (unread.length === 0) return; // read in the chat already

    entry.lastSentAt = Date.now();
    await sendConversationNotificationEmail({
      recipient: traveler,
      sender: driver,
      messages: unread.map((item) => item.body),
      conversationUrl: buildConversationUrl(traveler.role, conversationId),
      vehicleModel: conversation.vehicle?.model,
      replyTo: buildReplyAddress(conversationId),
    });
  } catch (error) {
    console.warn('Conversation notification error:', error);
  } finally {
    // Keep the entry only while it still carries the "sent recently" window.
    const current = pendingMessageEmails.get(conversationId);
    if (current && !current.timer && Date.now() - (current.lastSentAt || 0) > MESSAGE_EMAIL_WINDOW_MS) {
      pendingMessageEmails.delete(conversationId);
    }
  }
};

const scheduleTravellerMessageEmail = (conversationId, message) => {
  const key = conversationId.toString();
  const entry = pendingMessageEmails.get(key) || { timer: null, pendingSince: null, lastSentAt: 0 };
  pendingMessageEmails.set(key, entry);
  if (entry.timer) return; // already scheduled; that email will include this message too

  entry.pendingSince = message.createdAt || new Date();
  const dueAt = Math.max(Date.now() + MESSAGE_EMAIL_DELAY_MS, entry.lastSentAt + MESSAGE_EMAIL_WINDOW_MS);
  entry.timer = setTimeout(() => { flushTravellerMessageEmail(key); }, dueAt - Date.now());
  entry.timer.unref?.();
};

const queueConversationNotification = (conversation, senderRole, message, offerToken) => {
  if (!conversation || typeof conversation.populate !== 'function' || !message) {
    return;
  }

  const isOffer = message.type === 'offer';
  if (senderRole !== USER_ROLES.GUEST && !isOffer) {
    scheduleTravellerMessageEmail(conversation._id, message);
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

      // An offer sent directly in a chat. A traveller who asked for messages and
      // bookings only is not emailed about offers; they see it in the chat.
      if (isOffer && recipient.id === traveler.id && traveler.emailPreference === EMAIL_PREFERENCES.ESSENTIAL) {
        return;
      }

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
        offerPrice: isOffer ? message.offer?.totalPrice : undefined,
        conversationUrl,
        vehicleModel: conversation.vehicle?.model,
        // Travellers can answer straight from their inbox; drivers reply in the portal/app.
        replyTo: recipient.id === traveler.id ? buildReplyAddress(conversation._id) : null,
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
 * @param {string} [params.emailMessageId] Message-ID of the email this was posted from, if any
 * @param {boolean} [params.skipNotification=false] The caller sends its own email for this message
 * @returns {Promise<import('../models/ChatMessage.js').default>}
 */
export const createChatMessage = async ({
  conversation,
  senderId,
  senderRole,
  content,
  type = 'text',
  offer = null,
  emailMessageId,
  skipNotification = false,
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
    bodyHash: fingerprintMessage(sanitized || content),
    offer,
    readBy: [senderId],
    offerViewTokenHash,
    offerViewTokenExpires,
    emailMessageId,
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

  if (!skipNotification) {
    queueConversationNotification(conversation, senderRole, message, offerToken);
  }

  return message;
};

export default {
  createChatMessage,
};

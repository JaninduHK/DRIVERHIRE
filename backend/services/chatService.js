import ChatMessage from '../models/ChatMessage.js';
import { USER_ROLES } from '../models/User.js';
import { sanitizeMessageContent } from '../utils/chatSanitizer.js';
import { sendConversationNotificationEmail } from './emailService.js';
import buildAppUrl from '../utils/url.js';

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

const buildConversationUrl = (role) =>
  role === USER_ROLES.DRIVER ? buildAppUrl('/portal/driver/messages') : buildAppUrl('/dashboard');

const queueConversationNotification = (conversation, senderRole, message) => {
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

      return sendConversationNotificationEmail({
        recipient,
        sender,
        messagePreview: message.body,
        isOffer: message.type === 'offer',
        conversationUrl: buildConversationUrl(recipient.role),
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

  queueConversationNotification(conversation, senderRole, message);

  return message;
};

export default {
  createChatMessage,
};

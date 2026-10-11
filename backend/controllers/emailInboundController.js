import crypto from 'crypto';
import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import User, { USER_ROLES } from '../models/User.js';
import { createChatMessage } from '../services/chatService.js';
import { notifyUser } from '../services/expoPushService.js';
import { extractReplyFromInboundItem, parseReplyAddress } from '../utils/emailReply.js';

const getWebhookSecret = () => process.env.EMAIL_INBOUND_WEBHOOK_SECRET || '';

const isAuthorized = (req) => {
  const secret = getWebhookSecret();
  const bearer = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const provided = req.query?.token || req.get('x-webhook-secret') || bearer;
  if (!secret || typeof provided !== 'string') {
    return false;
  }
  const expected = Buffer.from(secret);
  const received = Buffer.from(provided);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

const headerValue = (headers, name) => {
  if (!headers || typeof headers !== 'object') {
    return '';
  }
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name);
  const value = key ? headers[key] : '';
  return (Array.isArray(value) ? value.join(' ') : String(value || '')).toLowerCase();
};

// Out-of-office replies, bounces and list mail must never become chat
// messages — an auto-responder would otherwise answer every notification.
const isAutomatedEmail = (item) => {
  const headers = item?.Headers;
  const autoSubmitted = headerValue(headers, 'auto-submitted');
  if (autoSubmitted && autoSubmitted !== 'no') return true;
  if (/bulk|junk|list|auto_reply/.test(headerValue(headers, 'precedence'))) return true;
  if (headerValue(headers, 'x-autoreply') || headerValue(headers, 'x-autorespond')) return true;
  if (/auto-replied|auto-generated|oof/.test(headerValue(headers, 'x-auto-response-suppress'))) return true;
  if (headerValue(headers, 'return-path').trim() === '<>') return true;
  return /^(mailer-daemon|postmaster|no-?reply)@/i.test(item?.From?.Address || '');
};

const findConversationId = (item) => {
  const recipients = [...(item?.To || []), ...(item?.Cc || [])];
  for (const recipient of recipients) {
    const conversationId = parseReplyAddress(recipient?.Address);
    if (conversationId) {
      return conversationId;
    }
  }
  return null;
};

const processInboundEmail = async (item) => {
  const conversationId = findConversationId(item);
  if (!conversationId) return 'unknown-address';
  if (isAutomatedEmail(item)) return 'automated';

  const emailMessageId = typeof item.MessageId === 'string' ? item.MessageId.trim().slice(0, 500) : '';
  if (emailMessageId && (await ChatMessage.exists({ emailMessageId }))) return 'duplicate';

  const content = extractReplyFromInboundItem(item);
  if (!content) return 'empty';

  const conversation = await ChatConversation.findById(conversationId);
  if (!conversation) return 'conversation-missing';

  const traveler = await User.findById(conversation.traveler).select('name deletedAt').lean();
  if (!traveler || traveler.deletedAt) return 'traveller-missing';

  try {
    await createChatMessage({
      conversation,
      senderId: conversation.traveler,
      senderRole: USER_ROLES.GUEST,
      content,
      emailMessageId: emailMessageId || undefined,
    });
  } catch (error) {
    // Two deliveries of the same email raced past the exists() check above.
    if (error?.code === 11000) return 'duplicate';
    throw error;
  }

  notifyUser(conversation.driver.toString(), {
    title: traveler.name || 'New message',
    body: content.slice(0, 140),
    data: { type: 'message', conversationId },
  });

  // Sizes only, never the text: enough to see afterwards whether a reply was
  // posted whole or cut short, and which part of the email it came from.
  const size = (value) => (typeof value === 'string' ? value.length : 0);
  return `posted ${content.length} chars (text part ${size(item.RawTextBody)}, html part ${size(
    item.RawHtmlBody
  )}, provider extract ${size(item.ExtractedMarkdownMessage)})`;
};

/**
 * Brevo inbound-parse webhook: a traveller replied to a conversation email
 * instead of opening the dashboard, so post the reply into the chat for them.
 *
 * Authenticated by a shared secret (not `authenticate`) because the caller is
 * Brevo, not a user; who the message is from comes from the signed Reply-To
 * address. Anything we choose not to post still gets a 200 — a non-2xx makes
 * Brevo retry, which is only useful for genuine failures.
 */
export const handleBrevoInbound = async (req, res) => {
  if (!getWebhookSecret()) {
    return res.status(503).json({ message: 'Inbound email is not configured.' });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  let failed = false;

  for (const item of items) {
    try {
      const outcome = await processInboundEmail(item);
      console.info(`[email-inbound] ${outcome} (from ${item?.From?.Address || 'unknown'})`);
    } catch (error) {
      failed = true;
      console.error('[email-inbound] Unable to process inbound email:', error);
    }
  }

  return res.status(failed ? 500 : 200).json({ received: items.length });
};

export default { handleBrevoInbound };

import crypto from 'crypto';

// Reply-by-email for travellers. Conversation emails sent to a traveller carry
// a Reply-To of chat-<conversationId>-<signature>@<EMAIL_REPLY_DOMAIN>; the mail
// provider's inbound webhook (controllers/emailInboundController.js) turns
// whatever lands there into a chat message from that conversation's traveller.
//
// The address is stateless: the signature proves we minted it, so nothing has
// to be stored per email. Hex only, because mail systems are free to lowercase
// the local part. Disabled entirely unless EMAIL_REPLY_DOMAIN is set.
const LOCAL_PART_PATTERN = /^chat-([0-9a-f]{24})-([0-9a-f]{32})$/;
const MAX_REPLY_LENGTH = 4000;

const getReplyDomain = () => (process.env.EMAIL_REPLY_DOMAIN || '').trim().toLowerCase();
const getSigningSecret = () => process.env.EMAIL_REPLY_SECRET || process.env.JWT_SECRET || '';

const sign = (conversationId) =>
  crypto
    .createHmac('sha256', getSigningSecret())
    .update(`email-reply:${conversationId}`)
    .digest('hex')
    .slice(0, 32);

export const isEmailReplyEnabled = () => Boolean(getReplyDomain() && getSigningSecret());

export const buildReplyAddress = (conversationId) => {
  const id = conversationId?.toString?.().toLowerCase() || '';
  if (!isEmailReplyEnabled() || !/^[0-9a-f]{24}$/.test(id)) {
    return null;
  }
  return `chat-${id}-${sign(id)}@${getReplyDomain()}`;
};

/** Returns the conversation id a reply address was minted for, or null if it is not one of ours. */
export const parseReplyAddress = (address) => {
  if (!isEmailReplyEnabled() || typeof address !== 'string') {
    return null;
  }
  const [localPart, domain, ...rest] = address.trim().toLowerCase().split('@');
  if (rest.length || domain !== getReplyDomain()) {
    return null;
  }
  const match = localPart.match(LOCAL_PART_PATTERN);
  if (!match) {
    return null;
  }
  const [, conversationId, signature] = match;
  const expected = Buffer.from(sign(conversationId));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }
  return conversationId;
};

// Where the traveller's own words stop and the quoted original (or their mail
// client's boilerplate) begins.
const QUOTE_MARKERS = [
  /^>/,
  /^On .+wrote:\s*$/i,
  /^-{2,}\s*Original Message\s*-{2,}/i,
  /^-{2,}\s*Forwarded message\s*-{2,}/i,
  /^_{5,}\s*$/,
  /^From:\s.*@/i,
  /^Sent from my /i,
  /^Get Outlook for /i,
  /^--\s?$/,
];

const isQuoteStart = (line, nextLine) =>
  QUOTE_MARKERS.some((marker) => marker.test(line)) ||
  // Gmail wraps a long attribution: "On Mon, 4 Oct 2026 at 10:12, Name" / "<a@b.c> wrote:"
  (/^On .+/i.test(line) && /wrote:\s*$/i.test(nextLine));

/**
 * Reduces an inbound email body to just the new text the sender typed.
 * Returns '' when nothing is left (e.g. a reply that only quotes the original).
 */
export const extractReplyText = (body = '') => {
  if (typeof body !== 'string') {
    return '';
  }
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const kept = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (isQuoteStart(lines[index].trim(), (lines[index + 1] || '').trim())) {
      break;
    }
    kept.push(lines[index]);
  }
  return kept
    .join('\n')
    .replace(/\\([\\`*_{}[\]()#+\-.!>])/g, '$1') // markdown escapes left by the provider's extractor
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_REPLY_LENGTH);
};

export default { isEmailReplyEnabled, buildReplyAddress, parseReplyAddress, extractReplyText };

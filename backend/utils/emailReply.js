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

// Our own sending address appears in every client's "On <date>, <sender> wrote:"
// line whatever language the client writes it in ("Le … a écrit :", "Am …
// schrieb …:"), so it marks the start of the quoted original even where the
// English patterns above do not. Apple's Hide My Email relay rewrites it to
// hello_at_example_com_…@icloud.com, hence the second form.
const getOwnAddressMarkers = () => {
  const match = (process.env.EMAIL_FROM || 'hello@carwithdriver.lk').match(/([^\s<>"]+)@([^\s<>"]+)/);
  if (!match) return [];
  const [address, local, domain] = match;
  return [address.toLowerCase(), `${local}_at_${domain.replace(/\./g, '_')}`.toLowerCase()];
};

const isQuoteStart = (line, nextLine, ownAddresses) =>
  QUOTE_MARKERS.some((marker) => marker.test(line)) ||
  // Gmail wraps a long attribution: "On Mon, 4 Oct 2026 at 10:12, Name" / "<a@b.c> wrote:"
  (/^On .+/i.test(line) && /wrote:\s*$/i.test(nextLine)) ||
  ownAddresses.some((address) => line.toLowerCase().includes(address));

/**
 * Reduces an inbound email body to just the new text the sender typed: every
 * line, up to where the quoted original or the mail client's boilerplate begins.
 * Returns '' when nothing is left (e.g. a reply that only quotes the original).
 *
 * `markdown` is for the provider's pre-extracted body, which escapes punctuation.
 */
export const extractReplyText = (body = '', { markdown = false } = {}) => {
  if (typeof body !== 'string') {
    return '';
  }
  const ownAddresses = getOwnAddressMarkers();
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const kept = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (isQuoteStart(lines[index].trim(), (lines[index + 1] || '').trim(), ownAddresses)) {
      break;
    }
    kept.push(lines[index]);
  }
  // A wrapped attribution leaves its first half behind: "On Mon, 4 Oct 2026, Car With Driver <"
  while (kept.length > 0 && /<\s*$/.test(kept[kept.length - 1])) {
    kept.pop();
  }
  const text = kept.join('\n');
  return (markdown ? text.replace(/\\([\\`*_{}[\]()#+\-.!>])/g, '$1') : text)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_REPLY_LENGTH);
};

/** Plain text of an HTML-only email body, keeping its line breaks. */
export const htmlBodyToText = (html = '') =>
  typeof html !== 'string'
    ? ''
    : html
        .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
        .replace(/<blockquote[\s\S]*$/i, '') // the quoted original, in every mainstream client
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'");

/**
 * The traveller's reply out of an inbound-parse item, in order of trust:
 *
 * 1. The plain-text part, with our own quote stripping. It is the whole message.
 * 2. The HTML part, for the rare client that sends no plain-text alternative.
 * 3. The provider's pre-extracted body, last. Its signature detection is
 *    aggressive: on a multi-paragraph reply it files everything after the first
 *    line as "signature", which silently dropped most of what travellers wrote.
 */
export const extractReplyFromInboundItem = (item = {}) =>
  extractReplyText(item.RawTextBody) ||
  extractReplyText(htmlBodyToText(item.RawHtmlBody)) ||
  extractReplyText(item.ExtractedMarkdownMessage, { markdown: true });

export default {
  isEmailReplyEnabled,
  buildReplyAddress,
  parseReplyAddress,
  extractReplyText,
  extractReplyFromInboundItem,
};

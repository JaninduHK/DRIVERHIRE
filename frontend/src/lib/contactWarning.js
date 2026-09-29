/**
 * Client-side mirror of backend/utils/chatSanitizer.js.
 *
 * The server is the source of truth — it redacts regardless of what happens here.
 * This exists only so a driver is warned BEFORE sending, rather than discovering
 * afterwards that their message was gutted. Keep the patterns in step with the
 * backend; a mismatch just means the warning is early or late, never a leak.
 */
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,})/gi;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s]+)/gi;
const MIN_PHONE_DIGITS = 7;

const countDigits = (value) => (value.match(/\d/g) || []).length;

/** Returns the kinds of contact detail found: 'phone' | 'email' | 'link'. */
export const detectContactDetails = (input = '') => {
  if (typeof input !== 'string' || !input.trim()) return [];
  const found = new Set();

  const phoneMatches = input.match(PHONE_PATTERN) || [];
  // Mirrors the backend's digit-density guard so date ranges don't false-positive.
  if (phoneMatches.some((match) => countDigits(match) >= MIN_PHONE_DIGITS)) found.add('phone');
  if (EMAIL_PATTERN.test(input)) found.add('email');
  if (URL_PATTERN.test(input)) found.add('link');

  // Global regexes carry lastIndex between calls; reset so repeat calls are stable.
  EMAIL_PATTERN.lastIndex = 0;
  URL_PATTERN.lastIndex = 0;

  return Array.from(found);
};

const LABELS = { phone: 'a phone number', email: 'an email address', link: 'a link' };

/**
 * Warning copy for a driver. Wording follows driver terms clause 8, which lists
 * sharing contact details to avoid commission as a serious breach that can mean
 * removal without a prior warning.
 */
export const contactWarningMessage = (input = '') => {
  const found = detectContactDetails(input);
  if (found.length === 0) return '';
  const what = found.map((k) => LABELS[k]).join(' and ');
  return `This looks like ${what}. It will be hidden from the traveller automatically, and sharing contact details to avoid commission is a serious breach of the driver terms — your account can be suspended or removed.`;
};

export default { detectContactDetails, contactWarningMessage };

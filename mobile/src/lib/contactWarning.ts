/**
 * Client-side mirror of backend/utils/chatSanitizer.js (and of
 * frontend/src/lib/contactWarning.js on web).
 *
 * The server is the source of truth — it redacts regardless. This only warns the
 * driver BEFORE sending, so they aren't surprised by a gutted message.
 */
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,})/gi;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s]+)/gi;
const MIN_PHONE_DIGITS = 7;

const countDigits = (value: string) => (value.match(/\d/g) || []).length;

export type ContactKind = 'phone' | 'email' | 'link';

export const detectContactDetails = (input = ''): ContactKind[] => {
  if (typeof input !== 'string' || !input.trim()) return [];
  const found = new Set<ContactKind>();

  const phoneMatches = input.match(PHONE_PATTERN) || [];
  // Mirrors the backend digit-density guard so date ranges don't false-positive.
  if (phoneMatches.some((match) => countDigits(match) >= MIN_PHONE_DIGITS)) found.add('phone');
  if (EMAIL_PATTERN.test(input)) found.add('email');
  if (URL_PATTERN.test(input)) found.add('link');

  // Global regexes keep lastIndex between calls; reset so repeat calls are stable.
  EMAIL_PATTERN.lastIndex = 0;
  URL_PATTERN.lastIndex = 0;

  return Array.from(found);
};

const LABELS: Record<ContactKind, string> = {
  phone: 'a phone number',
  email: 'an email address',
  link: 'a link',
};

/** Wording follows driver terms clause 8. */
export const contactWarningMessage = (input = ''): string => {
  const found = detectContactDetails(input);
  if (found.length === 0) return '';
  const what = found.map((k) => LABELS[k]).join(' and ');
  return `This looks like ${what}. It will be hidden from the traveller automatically, and sharing contact details to avoid commission is a serious breach of the driver terms — your account can be suspended or removed.`;
};

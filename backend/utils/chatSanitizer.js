const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,})/gi;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s]+)/gi;

// A real phone number is digit-dense. The pattern above also matches loose
// digit-and-separator runs like a date span ("25 2026 - " has only 6 digits),
// so require a minimum digit count before treating a match as a phone number.
const MIN_PHONE_DIGITS = 7;
const countDigits = (value) => (value.match(/\d/g) || []).length;

const VIOLATION_TYPES = {
  PHONE: 'phone',
  EMAIL: 'email',
  URL: 'link',
};

export const sanitizeMessageContent = (input = '') => {
  if (typeof input !== 'string') {
    return {
      sanitized: '',
      violations: [],
      warning: '',
    };
  }

  let sanitized = input;
  const violations = new Set();

  sanitized = sanitized.replace(PHONE_PATTERN, (match) => {
    if (countDigits(match) < MIN_PHONE_DIGITS) {
      return match;
    }
    violations.add(VIOLATION_TYPES.PHONE);
    return '[hidden]';
  });

  sanitized = sanitized.replace(EMAIL_PATTERN, () => {
    violations.add(VIOLATION_TYPES.EMAIL);
    return '[hidden]';
  });

  sanitized = sanitized.replace(URL_PATTERN, () => {
    violations.add(VIOLATION_TYPES.URL);
    return '[hidden]';
  });

  const violationList = Array.from(violations);

  const warning =
    violationList.length > 0
      ? 'Contact details and direct links are hidden for safety. Share plans without posting phone numbers, emails, or URLs.'
      : '';

  return {
    sanitized: sanitized.trim(),
    violations: violationList,
    warning,
  };
};

export default sanitizeMessageContent;

import crypto from 'crypto';

// Stateless tokens for links in emails: <24-hex id><32-hex signature>. The
// signature proves we minted the link for that record and that purpose, so
// nothing has to be stored per email and re-sending an email never invalidates
// the link in an earlier one. Hex only, with no separator, so the token is safe
// in a URL path (no dots a proxy could mistake for a file extension).
const ID_PATTERN = /^[0-9a-f]{24}$/;
const TOKEN_PATTERN = /^([0-9a-f]{24})([0-9a-f]{32})$/;

export const LINK_PURPOSES = {
  // Read-only view of one offer (the /offer/:token page).
  OFFER_VIEW: 'offer-view',
  // "What's holding you back?" answers for one quote request.
  QUOTE_ANSWER: 'quote-answer',
  // "Post this request again" for one quote request.
  QUOTE_REPOST: 'quote-repost',
  // A traveller's email preferences page (the id is the user's).
  EMAIL_PREFERENCES: 'email-preferences',
};

const getSecret = () => process.env.LINK_SIGNING_SECRET || process.env.JWT_SECRET || '';

const sign = (purpose, id) =>
  crypto.createHmac('sha256', getSecret()).update(`${purpose}:${id}`).digest('hex').slice(0, 32);

/** A signed token for `id`, or null when no signing secret is configured. */
export const signLinkToken = (purpose, id) => {
  const normalized = id?.toString?.().toLowerCase() || '';
  if (!getSecret() || !ID_PATTERN.test(normalized)) return null;
  return `${normalized}${sign(purpose, normalized)}`;
};

/** The id a token was signed for, or null if it is not a valid token for `purpose`. */
export const verifyLinkToken = (purpose, token) => {
  if (!getSecret() || typeof token !== 'string') return null;
  const match = token.toLowerCase().match(TOKEN_PATTERN);
  if (!match) return null;
  const [, id, signature] = match;
  const expected = Buffer.from(sign(purpose, id));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
  return id;
};

export default { LINK_PURPOSES, signLinkToken, verifyLinkToken };

import crypto from 'crypto';

/**
 * A stable fingerprint of a message body, used to spot the same text being sent
 * to many different travellers.
 *
 * Normalised so trivial edits don't defeat it: case, surrounding/among-word
 * whitespace and punctuation are all ignored. "Hi! I'm free." and
 * "hi  im free" produce the same fingerprint.
 *
 * Deliberately NOT a similarity score — near-duplicates are a rabbit hole, and
 * exact-after-normalisation is enough to catch copy-paste blasting while leaving
 * a genuinely personalised message alone.
 */
export const MIN_FINGERPRINT_LENGTH = 12;

export const normalizeForFingerprint = (input = '') =>
  String(input)
    .toLowerCase()
    .replace(/\[hidden\]/g, ' ') // redactions shouldn't make two blasts look different
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Returns null for anything too short to be meaningful — "ok", "yes", "thanks"
 * are repeated constantly by legitimate drivers and must never cluster.
 */
export const fingerprintMessage = (input = '') => {
  const normalized = normalizeForFingerprint(input);
  if (normalized.length < MIN_FINGERPRINT_LENGTH) return null;
  return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 32);
};

export default { fingerprintMessage, normalizeForFingerprint, MIN_FINGERPRINT_LENGTH };

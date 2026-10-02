const HOUR_MS = 60 * 60 * 1000;

/**
 * The countdown shown on an offer card, to both the traveller and the driver.
 * Mirrors mobile/src/lib/offerExpiry.ts — keep the two in step.
 *
 * Returns null when there is nothing to say: an offer that was accepted or
 * declined has reached its outcome, and a countdown would only confuse.
 */
export const offerExpiryNotice = (offer, now = Date.now()) => {
  if (!offer) return null;

  if (offer.status === 'expired') {
    return { tone: 'expired', text: 'This offer has expired' };
  }
  if (offer.status !== 'pending' || !offer.expiresAt) return null;

  const remaining = new Date(offer.expiresAt).getTime() - now;
  if (!Number.isFinite(remaining)) return null;

  // The sweep only runs hourly, so an offer can still read "pending" after its
  // date has passed. Trust the date, not the status.
  if (remaining <= 0) return { tone: 'expired', text: 'This offer has expired' };

  const hours = remaining / HOUR_MS;

  if (hours >= 48) {
    return { tone: 'normal', text: `Expires in ${Math.floor(hours / 24)} days` };
  }
  if (hours >= 24) {
    return { tone: 'normal', text: 'Expires tomorrow' };
  }
  if (hours >= 1) {
    const whole = Math.floor(hours);
    return { tone: 'soon', text: `Expires in ${whole} hour${whole === 1 ? '' : 's'}` };
  }
  const minutes = Math.max(1, Math.round(remaining / 60000));
  return { tone: 'soon', text: `Expires in ${minutes} minute${minutes === 1 ? '' : 's'}` };
};

/** Tailwind classes for the notice pill, by tone. */
export const offerExpiryClass = (tone) => {
  if (tone === 'expired') return 'bg-[#fde7e9] text-[#a3252f]';
  if (tone === 'soon') return 'bg-[#fdf0d8] text-[#a86a15]';
  return 'bg-canvas text-muted-soft';
};

export default { offerExpiryNotice, offerExpiryClass };

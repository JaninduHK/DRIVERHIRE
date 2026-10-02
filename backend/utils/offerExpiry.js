const DAY_MS = 24 * 60 * 60 * 1000;

/** How long a traveller has to book an offer before it lapses. */
export const OFFER_EXPIRY_DAYS = 3;

export const OFFER_EXPIRED_MESSAGE =
  'This offer has expired. Ask the driver to send an updated one.';

/**
 * Start of the day AFTER the trip begins.
 *
 * Trip dates are stored at midnight, so capping an offer at `startDate` itself
 * would kill a same-day offer the instant it was sent. A trip starting today
 * stays bookable for the whole of today — the same rule briefExpiryService
 * applies to a brief whose trip ends today.
 */
const endOfStartDay = (startDate) => {
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  return new Date(date.getTime() + DAY_MS);
};

/**
 * When an offer stops being bookable: three days on, or the end of the trip's
 * first day, whichever comes first. Without the cap an offer for a trip starting
 * tomorrow would still be bookable two days after the trip had begun.
 *
 * `from` is the offer's creation time for new offers, and "now" when backfilling
 * offers that predate this feature (they each get a fresh window rather than all
 * expiring at once on deploy).
 */
export const offerExpiresAt = ({ from = new Date(), startDate } = {}) => {
  const base = new Date(from);
  if (Number.isNaN(base.getTime())) return null;

  const threeDays = new Date(base.getTime() + OFFER_EXPIRY_DAYS * DAY_MS);
  const tripCap = startDate ? endOfStartDay(startDate) : null;

  return tripCap && tripCap < threeDays ? tripCap : threeDays;
};

/**
 * Whether an offer may still be booked right now. The hourly sweep flips the
 * stored status, so between sweeps an offer can be past its date while still
 * marked pending — callers that take money must check the date, not just status.
 */
export const isOfferBookable = (offer, now = new Date()) => {
  if (!offer || offer.status !== 'pending') return false;
  if (!offer.expiresAt) return true;
  const expires = new Date(offer.expiresAt);
  return Number.isNaN(expires.getTime()) || expires > now;
};

export default { OFFER_EXPIRY_DAYS, OFFER_EXPIRED_MESSAGE, offerExpiresAt, isOfferBookable };

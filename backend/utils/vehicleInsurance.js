// Rules for vehicle insurance and vehicle photos, shared by the driver and admin
// endpoints and the hourly checks in services/vehicleInsuranceService.js.

// A vehicle is listed with exactly five photos: the minimum and the maximum are
// the same number. Both names are kept because they guard different things
// (too few to submit, too many to store).
export const MIN_VEHICLE_IMAGES = 5;
export const MAX_VEHICLE_IMAGES = 5;
export const MAX_INSURANCE_IMAGES = 2; // the passenger cover can run over two pages
export const INSURANCE_REMINDER_DAYS = 7;

export const INSURANCE_STATUS = {
  PENDING: 'pending', // submitted by the driver, not yet checked by an admin
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

// What the insurance on a vehicle amounts to right now. Derived, never stored:
// "expired" and "expiring" depend on today's date.
export const INSURANCE_STATE = {
  MISSING: 'missing',
  PENDING: 'pending',
  VERIFIED: 'verified',
  EXPIRING: 'expiring', // in date, but ends within INSURANCE_REMINDER_DAYS
  EXPIRED: 'expired',
  REJECTED: 'rejected',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfUtcDay = (value) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

/** Cover runs through the whole of its end date, so it lapses at the start of the next day. */
export const isInsuranceExpired = (insurance, now = new Date()) =>
  Boolean(insurance?.endDate) && startOfUtcDay(insurance.endDate) < startOfUtcDay(now);

export const hasInsuranceOnFile = (insurance) =>
  Boolean(insurance?.endDate && Array.isArray(insurance.cardImages) && insurance.cardImages.length > 0);

export const insuranceState = (insurance, now = new Date()) => {
  if (!hasInsuranceOnFile(insurance)) return INSURANCE_STATE.MISSING;
  if (isInsuranceExpired(insurance, now)) return INSURANCE_STATE.EXPIRED;
  if (insurance.status === INSURANCE_STATUS.REJECTED) return INSURANCE_STATE.REJECTED;
  const daysLeft = Math.round((startOfUtcDay(insurance.endDate) - startOfUtcDay(now)) / DAY_MS);
  if (insurance.status === INSURANCE_STATUS.VERIFIED && daysLeft <= INSURANCE_REMINDER_DAYS) {
    return INSURANCE_STATE.EXPIRING;
  }
  return insurance.status === INSURANCE_STATUS.VERIFIED ? INSURANCE_STATE.VERIFIED : INSURANCE_STATE.PENDING;
};

/** Insurance a vehicle can be listed on: on file, in date and not rejected. */
export const isInsuranceUsable = (insurance, now = new Date()) =>
  [INSURANCE_STATE.PENDING, INSURANCE_STATE.VERIFIED, INSURANCE_STATE.EXPIRING].includes(insuranceState(insurance, now));

const parseDay = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : startOfUtcDay(date);
};

/**
 * Validates the cover period a driver entered. Returns { startDate, endDate }
 * or { error } with a message to show them.
 */
export const parseCoverPeriod = ({ startDate, endDate }, now = new Date()) => {
  const start = parseDay(startDate);
  const end = parseDay(endDate);
  if (!start || !end) return { error: 'Enter the start and end date of your insurance cover.' };
  if (end <= start) return { error: 'The insurance end date must be after the start date.' };
  if (end < startOfUtcDay(now)) {
    return { error: 'This insurance cover has already expired. Upload your current passenger insurance document.' };
  }
  return { startDate: start, endDate: end };
};

/** The insurance block as sent to the driver's own apps and to admins. Never to anyone else. */
export const serializeInsurance = (insurance, mapUrl = (url) => url, now = new Date()) => {
  const state = insuranceState(insurance, now);
  if (!insurance) return { state, cardImages: [] };
  return {
    state,
    status: insurance.status || null,
    cardImages: (insurance.cardImages || []).map(mapUrl),
    startDate: insurance.startDate || null,
    endDate: insurance.endDate || null,
    submittedAt: insurance.submittedAt || null,
    reviewedAt: insurance.reviewedAt || null,
    rejectedReason: insurance.rejectedReason || null,
    requestedAt: insurance.requestedAt || null,
    requestNote: insurance.requestNote || null,
    expiredAt: insurance.expiredAt || null,
  };
};

export default {
  MIN_VEHICLE_IMAGES,
  MAX_VEHICLE_IMAGES,
  MAX_INSURANCE_IMAGES,
  INSURANCE_REMINDER_DAYS,
  INSURANCE_STATUS,
  INSURANCE_STATE,
  insuranceState,
  isInsuranceExpired,
  isInsuranceUsable,
  hasInsuranceOnFile,
  parseCoverPeriod,
  serializeInsurance,
};

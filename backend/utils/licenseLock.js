import { LICENSE_STATUS } from '../models/User.js';

/**
 * An approved licence stays locked until it expires: the driver can't resubmit it,
 * so their verified badge isn't reset to "pending" by a new upload. An approved
 * licence with no expiry date on record stays locked too (an admin can add the date,
 * or reject the licence to let the driver submit again).
 */
export const isLicenseLocked = (user, now = new Date()) =>
  user?.licenseStatus === LICENSE_STATUS.APPROVED &&
  (!user.licenseExpiresAt || new Date(user.licenseExpiresAt) > now);

const formatDay = (date) =>
  new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const licenseLockedMessage = (user) =>
  user?.licenseExpiresAt
    ? `Your licence is approved until ${formatDay(user.licenseExpiresAt)}. You can submit a new one after it expires.`
    : 'Your licence is already approved. Contact support if you need to update it.';

/** Reads an expiry date from a form value. Returns { ok, value } (value null when blank). */
export const parseLicenseExpiry = (input, { required = false, now = new Date() } = {}) => {
  if (input === undefined || input === null || input === '') {
    return required ? { ok: false, message: 'Please enter your licence expiry date.' } : { ok: true, value: null };
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return { ok: false, message: 'The licence expiry date is not valid.' };
  if (date <= now) return { ok: false, message: 'This licence has already expired. Please submit a valid licence.' };
  return { ok: true, value: date };
};

export default { isLicenseLocked, licenseLockedMessage, parseLicenseExpiry };

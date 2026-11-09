import User from '../models/User.js';

/**
 * A driver frozen by admin cannot send messages, offers or brief responses.
 * Returns null when they may send, or a { status, message } to return as-is.
 *
 * Kept separate from ensureApprovedDriver because a freeze is temporary and
 * behavioural: the driver stays approved, listed and bookable throughout.
 */
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const periodName = (key) => {
  const [year, month] = String(key).split('-').map(Number);
  return MONTHS[month - 1] ? `${MONTHS[month - 1]} ${year}` : key;
};

/** Message shown when a driver frozen for unpaid commission tries to act. */
export const commissionFrozenMessage = (periods = []) => {
  const months = periods.length ? periods.map(periodName).join(', ') : 'a previous month';
  return `Your account is frozen because your commission for ${months} is unpaid. Pay it and upload the slip in My Earnings; your account unfreezes once our team confirms the payment.`;
};

export const checkMessagingSuspension = async (userId) => {
  const user = await User.findById(userId).select('messagingSuspendedUntil suspensionReason commissionFrozenAt commissionFrozenPeriods').lean();
  // Unpaid-commission freeze (services/commissionFreezeService.js) blocks the same actions.
  if (user?.commissionFrozenAt) {
    return { status: 403, message: commissionFrozenMessage(user.commissionFrozenPeriods), commissionFrozen: true };
  }
  const until = user?.messagingSuspendedUntil ? new Date(user.messagingSuspendedUntil) : null;
  if (!until || Number.isNaN(until.getTime()) || until <= new Date()) {
    return null;
  }
  const reason = user.suspensionReason ? ` Reason: ${user.suspensionReason}` : '';
  return {
    status: 403,
    message: `Your messaging is paused until ${until.toUTCString()}.${reason} Contact support if you believe this is a mistake.`,
    suspendedUntil: until,
  };
};

export default { checkMessagingSuspension };

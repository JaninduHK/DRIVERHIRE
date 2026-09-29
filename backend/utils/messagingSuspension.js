import User from '../models/User.js';

/**
 * A driver frozen by admin cannot send messages, offers or brief responses.
 * Returns null when they may send, or a { status, message } to return as-is.
 *
 * Kept separate from ensureApprovedDriver because a freeze is temporary and
 * behavioural: the driver stays approved, listed and bookable throughout.
 */
export const checkMessagingSuspension = async (userId) => {
  const user = await User.findById(userId).select('messagingSuspendedUntil suspensionReason').lean();
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

import User from '../models/User.js';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

const isExpoToken = (token) =>
  typeof token === 'string' &&
  (token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));

/**
 * Send one or more push notifications through the Expo Push API.
 * Best-effort: failures are logged, never thrown, so callers can fire-and-forget.
 */
export const sendExpoPushNotifications = async (tokens, { title, body, data } = {}) => {
  const valid = [...new Set((Array.isArray(tokens) ? tokens : [tokens]).filter(isExpoToken))];
  if (valid.length === 0) {
    return;
  }

  const messages = valid.map((to) => ({
    to,
    title,
    body,
    data: data || {},
    sound: 'default',
    priority: 'high',
    channelId: 'default',
  }));

  // Expo accepts up to 100 messages per request.
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });
      const json = await response.json().catch(() => null);

      // Expo replies with a "tickets" array (json.data). Surface per-message failures —
      // e.g. missing/invalid FCM V1 credentials (MismatchSenderId / InvalidCredentials) or
      // DeviceNotRegistered — so delivery problems are visible in the logs instead of silent.
      const tickets = Array.isArray(json?.data) ? json.data : [];
      tickets.forEach((ticket, idx) => {
        if (ticket?.status === 'error') {
          console.error(
            'Expo push ticket error:',
            ticket.message,
            ticket.details?.error ? `(${ticket.details.error})` : '',
            '->',
            chunk[idx]?.to
          );
        }
      });
      if (json?.errors) {
        console.error('Expo push request errors:', JSON.stringify(json.errors));
      }
    } catch (error) {
      console.error('Expo push send error:', error.message);
    }
  }
};

/** Notify a single user across all their registered devices. */
export const notifyUser = async (userId, payload) => {
  try {
    const user = await User.findById(userId).select('expoPushTokens');
    if (!user?.expoPushTokens?.length) {
      return;
    }
    await sendExpoPushNotifications(user.expoPushTokens, payload);
  } catch (error) {
    console.error('notifyUser error:', error.message);
  }
};

/** Notify many users (e.g. all approved drivers) with the same payload. */
export const notifyUsers = async (userIds, payload) => {
  try {
    const users = await User.find({ _id: { $in: userIds } }).select('expoPushTokens');
    const tokens = users.flatMap((u) => u.expoPushTokens || []);
    await sendExpoPushNotifications(tokens, payload);
  } catch (error) {
    console.error('notifyUsers error:', error.message);
  }
};

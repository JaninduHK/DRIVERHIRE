import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { registerPushToken, unregisterPushToken } from '../api/driver';

// expo-notifications throws at import time inside Expo Go (SDK 53+ removed remote
// push from Expo Go). So we never statically import it — we lazy-require it only
// in a real dev/standalone build on a physical-capable runtime.
const isExpoGo =
  Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
export const isPushSupported = !isExpoGo;

// The most recently registered token, so logout can unregister it.
let currentPushToken: string | null = null;
export const getCurrentPushToken = () => currentPushToken;

const getProjectId = (): string | undefined =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

let handlerConfigured = false;
const loadNotifications = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require('expo-notifications');
  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigured = true;
  }
  return Notifications;
};

/**
 * Ask for permission, obtain the Expo push token, and register it with the backend.
 * No-op in Expo Go or on simulators. Safe to call on every login.
 */
export const registerForPushNotifications = async (): Promise<string | null> => {
  if (isExpoGo || !Device.isDevice) {
    return null;
  }

  try {
    const Notifications = loadNotifications();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') {
      return null;
    }

    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenResponse.data;
    if (token) {
      currentPushToken = token;
      await registerPushToken(token).catch(() => undefined);
    }
    return token ?? null;
  } catch (error) {
    console.warn('Push registration failed:', error);
    return null;
  }
};

export const removePushRegistration = async (token: string | null) => {
  if (!token) return;
  await unregisterPushToken(token).catch(() => undefined);
  if (token === currentPushToken) currentPushToken = null;
};

/**
 * Subscribe to notification taps and deep-link via `onData`. No-op in Expo Go.
 * Returns an unsubscribe function.
 */
export const addNotificationTapListener = (
  onData: (data: Record<string, unknown> | undefined) => void
): (() => void) => {
  if (isExpoGo) {
    return () => {};
  }
  try {
    const Notifications = loadNotifications();
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response: { notification: { request: { content: { data: Record<string, unknown> } } } }) => {
        onData(response?.notification?.request?.content?.data);
      }
    );
    return () => sub.remove();
  } catch {
    return () => {};
  }
};

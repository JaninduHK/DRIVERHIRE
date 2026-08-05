import { useEffect, useRef } from 'react';
import { useRouter, type Href } from 'expo-router';
import { registerForPushNotifications, addNotificationTapListener } from '../lib/push';
import { useAuth } from '../auth/AuthContext';

const hrefForData = (data: Record<string, unknown> | undefined): Href | null => {
  if (!data) return null;
  switch (data.type) {
    case 'message':
      return data.conversationId ? (`/(app)/chat/${data.conversationId}` as Href) : ('/(app)/(tabs)/messages' as Href);
    case 'brief':
      return data.briefId ? (`/(app)/request/${data.briefId}` as Href) : ('/(app)/briefs' as Href);
    case 'booking':
      return '/(app)/(tabs)/bookings' as Href;
    default:
      return null;
  }
};

/** Registers for push on login and deep-links when a notification is tapped. No-op in Expo Go. */
export function usePush() {
  const router = useRouter();
  const { isApprovedDriver } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (isApprovedDriver && !registered.current) {
      registered.current = true;
      registerForPushNotifications();
    }
  }, [isApprovedDriver]);

  useEffect(() => {
    return addNotificationTapListener((data) => {
      const href = hrefForData(data);
      if (href) router.push(href);
    });
  }, [router]);
}

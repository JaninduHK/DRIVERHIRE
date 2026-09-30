import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { updateProfile } from '../api/auth';
import { useAuth } from '../auth/AuthContext';
import type { User } from '../types';

const normalizeUser = (p: { user: User } | User): User =>
  p && typeof p === 'object' && 'user' in p ? (p as { user: User }).user : (p as User);

/**
 * The "Available today" switch, shared by the home tab and the Availability screen
 * so the two can never disagree.
 *
 * It maps to `shareLiveLocation` on the driver: off means their saved start location
 * stops being published, so they drop off the traveller live map. It deliberately
 * does NOT touch vehicle date-range availability — that stays in the calendar below.
 */
export function useLiveLocationSharing() {
  const { user, setUser } = useAuth();
  // Drivers who predate this flag default to sharing, matching the API.
  const [sharing, setSharing] = useState(user?.shareLiveLocation !== false);
  const [saving, setSaving] = useState(false);

  // Re-seed once /me resolves, so the switch never shows a stale position.
  useEffect(() => {
    if (user) setSharing(user.shareLiveLocation !== false);
  }, [user?.shareLiveLocation]);

  const setSharingRemote = async (next: boolean) => {
    setSharing(next);
    setSaving(true);
    try {
      const form = new FormData();
      form.append('shareLiveLocation', next ? 'true' : 'false');
      setUser(normalizeUser(await updateProfile(form)));
    } catch (err) {
      setSharing(!next);
      Alert.alert('Could not update', err instanceof Error ? err.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return { sharing, saving, setSharing: setSharingRemote };
}

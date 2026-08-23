import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, getMe, logoutSession } from '../api/auth';
import { ApiError } from '../api/client';
import { getCurrentPushToken, removePushRegistration } from '../lib/push';
import { getRefreshToken, setAuthToken, setRefreshToken, setUnauthorizedHandler } from '../lib/session';
import {
  saveToken,
  loadToken,
  deleteToken,
  saveRefreshToken,
  loadRefreshToken,
  deleteRefreshToken,
} from '../lib/tokenStore';
import type { AuthResponse, User } from '../types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  isApprovedDriver: boolean;
  login: (email: string, password: string) => Promise<User>;
  applySession: (res: AuthResponse) => Promise<User>;
  logout: (pushToken?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
  retry: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DRIVER_ONLY_MESSAGE = 'This app is for drivers only. Please use the website to sign in.';

// Brief backoff to absorb a cold-start network blip (Wi-Fi/cellular not yet
// reassociated right after the app relaunches) before giving up.
const BOOTSTRAP_RETRY_DELAYS_MS = [1000, 2000];

const wait = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const normalizeUser = (payload: { user: User } | User): User => {
  if (payload && typeof payload === 'object' && 'user' in payload) {
    return (payload as { user: User }).user;
  }
  return payload as User;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUserState] = useState<User | null>(null);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    setRefreshToken(null);
    await Promise.all([deleteToken(), deleteRefreshToken()]);
    setUserState(null);
    setStatus('unauthenticated');
  }, []);

  // Restore an existing session on boot (also callable as a manual retry from
  // the "couldn't verify session" screen).
  const bootstrap = useCallback(async () => {
    setStatus('loading');

    const stored = await loadToken();
    if (!stored) {
      setStatus('unauthenticated');
      return;
    }
    setAuthToken(stored);
    setRefreshToken(await loadRefreshToken());

    for (let attempt = 0; attempt <= BOOTSTRAP_RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        const me = normalizeUser(await getMe());
        if (me.role !== 'driver') {
          await clearSession();
          return;
        }
        setUserState(me);
        setStatus('authenticated');
        return;
      } catch (error) {
        // A confirmed 401 means the access token was rejected AND a silent
        // refresh attempt inside the API client already failed — the session
        // really is dead, so log out. Anything else (network blip, timeout,
        // 5xx) is transient: don't delete a possibly-still-valid token, just
        // retry, then fall back to an "error" state the driver can retry.
        if (error instanceof ApiError && error.status === 401) {
          await clearSession();
          return;
        }
        if (attempt < BOOTSTRAP_RETRY_DELAYS_MS.length) {
          await wait(BOOTSTRAP_RETRY_DELAYS_MS[attempt]);
        }
      }
    }
    setStatus('error');
  }, [clearSession]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  // Force logout when a request's silent refresh attempt also fails.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const acceptSession = useCallback(async (res: AuthResponse): Promise<User> => {
    const authUser = normalizeUser(res as unknown as { user: User });
    if (authUser.role !== 'driver') {
      throw new Error(DRIVER_ONLY_MESSAGE);
    }
    setAuthToken(res.token);
    setRefreshToken(res.refreshToken);
    await Promise.all([saveToken(res.token), saveRefreshToken(res.refreshToken)]);
    setUserState(authUser);
    setStatus('authenticated');
    return authUser;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => acceptSession(await apiLogin(email, password)),
    [acceptSession]
  );

  const logout = useCallback(
    async (pushToken?: string) => {
      // Unregister this device so it stops receiving pushes for the account.
      await removePushRegistration(pushToken ?? getCurrentPushToken());
      // Revoke the refresh token server-side too (best effort).
      await logoutSession(getRefreshToken()).catch(() => {});
      await clearSession();
    },
    [clearSession]
  );

  const refreshUser = useCallback(async () => {
    try {
      const me = normalizeUser(await getMe());
      if (me.role === 'driver') setUserState(me);
    } catch {
      // ignore transient refresh failures
    }
  }, []);

  const setUser = useCallback((next: User) => setUserState(next), []);

  const retry = useCallback(() => {
    bootstrap();
  }, [bootstrap]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      isApprovedDriver: user?.role === 'driver' && user?.driverStatus === 'approved',
      login,
      applySession: acceptSession,
      logout,
      refreshUser,
      setUser,
      retry,
    }),
    [status, user, login, acceptSession, logout, refreshUser, setUser, retry]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

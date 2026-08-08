import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { login as apiLogin, getMe } from '../api/auth';
import { getCurrentPushToken, removePushRegistration } from '../lib/push';
import { setAuthToken, setUnauthorizedHandler } from '../lib/session';
import { saveToken, loadToken, deleteToken } from '../lib/tokenStore';
import type { AuthResponse, User } from '../types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  isApprovedDriver: boolean;
  login: (email: string, password: string) => Promise<User>;
  applySession: (res: AuthResponse) => Promise<User>;
  logout: (pushToken?: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DRIVER_ONLY_MESSAGE = 'This app is for drivers only. Please use the website to sign in.';

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
    await deleteToken();
    setUserState(null);
    setStatus('unauthenticated');
  }, []);

  // Restore an existing session on boot.
  useEffect(() => {
    (async () => {
      try {
        const stored = await loadToken();
        if (!stored) {
          setStatus('unauthenticated');
          return;
        }
        setAuthToken(stored);
        const me = normalizeUser(await getMe());
        if (me.role !== 'driver') {
          await clearSession();
          return;
        }
        setUserState(me);
        setStatus('authenticated');
      } catch {
        await clearSession();
      }
    })();
  }, [clearSession]);

  // Force logout when any request returns 401.
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
    await saveToken(res.token);
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
    }),
    [status, user, login, acceptSession, logout, refreshUser, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

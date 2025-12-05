const TOKEN_KEY = 'carwithdriver_token';
const LEGACY_TOKEN_KEY = 'driverhire_token';
const USER_KEY = 'carwithdriver_user';
const AUTH_CHANGE_EVENT = 'carwithdriver:auth-change';

const emitAuthChange = () => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
    return;
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
};

const promoteLegacyToken = () => {
  const legacyToken = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (!legacyToken) {
    return null;
  }
  localStorage.setItem(TOKEN_KEY, legacyToken);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  return legacyToken;
};

export const getStoredToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    if (localStorage.getItem(LEGACY_TOKEN_KEY)) {
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    return token;
  }
  return promoteLegacyToken();
};

export const persistToken = (token, { silent = false } = {}) => {
  if (!token) {
    return;
  }
  localStorage.setItem(TOKEN_KEY, token);
  if (localStorage.getItem(LEGACY_TOKEN_KEY)) {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  }
  if (!silent) {
    emitAuthChange();
  }
};

export const getStoredUser = () => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Unable to parse stored user profile', error);
    localStorage.removeItem(USER_KEY);
    return null;
  }
};

export const persistUser = (user, { silent = false } = {}) => {
  if (!user) {
    return;
  }
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (!silent) {
      emitAuthChange();
    }
  } catch (error) {
    console.warn('Unable to persist user profile', error);
  }
};

export const clearStoredToken = ({ silent = false } = {}) => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (!silent) {
    emitAuthChange();
  }
};

export const persistAuthSession = ({ token, user }) => {
  persistToken(token, { silent: true });
  if (user) {
    persistUser(user, { silent: true });
  } else {
    localStorage.removeItem(USER_KEY);
  }
  emitAuthChange();
};

export const subscribeToAuthChanges = (callback) => {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener(AUTH_CHANGE_EVENT, callback);
  return () => window.removeEventListener(AUTH_CHANGE_EVENT, callback);
};

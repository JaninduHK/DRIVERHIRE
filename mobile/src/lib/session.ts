// In-memory auth state so the API client can attach the Bearer token (and read
// the refresh token) synchronously. AuthContext keeps this in sync with SecureStore.
let authToken: string | null = null;
let refreshToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const setRefreshToken = (token: string | null) => {
  refreshToken = token;
};

export const getRefreshToken = () => refreshToken;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

export const triggerUnauthorized = () => {
  unauthorizedHandler?.();
};

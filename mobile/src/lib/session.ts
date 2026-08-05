// In-memory auth state so the API client can attach the Bearer token synchronously.
// AuthContext keeps this in sync with SecureStore.
let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  unauthorizedHandler = handler;
};

export const triggerUnauthorized = () => {
  unauthorizedHandler?.();
};

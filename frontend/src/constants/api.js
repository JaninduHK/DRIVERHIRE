const DEFAULT_API_BASE_URL = '/api';

const sanitizeBaseUrl = (value) => {
  if (typeof value !== 'string') {
    return DEFAULT_API_BASE_URL;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_API_BASE_URL;
  }

  return trimmed.replace(/\/+$/, '') || DEFAULT_API_BASE_URL;
};

// During SSR the same services run in Node, where a relative "/api" cannot be fetched.
// Resolve an absolute origin from the server runtime env (set in Docker/compose) so route
// loaders can reach the backend; the browser keeps using the relative/proxied base.
const resolveServerBaseUrl = () => {
  const origin =
    (typeof process !== 'undefined' && process.env && process.env.SSR_API_ORIGIN) ||
    'http://localhost:3000';
  return `${origin.replace(/\/+$/, '')}/api`;
};

export const API_BASE_URL =
  typeof window === 'undefined'
    ? resolveServerBaseUrl()
    : sanitizeBaseUrl(import.meta.env.VITE_API_URL);

export const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

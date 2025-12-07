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

export const API_BASE_URL = sanitizeBaseUrl(import.meta.env.VITE_API_URL);

export const buildApiUrl = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

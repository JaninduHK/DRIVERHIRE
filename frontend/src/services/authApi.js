import { API_BASE_URL } from '../constants/api.js';

const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

const parseError = async (response) => {
  try {
    const data = await response.json();

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors.map((error) => error.msg || error.message).join('\n');
    }

    if (typeof data?.message === 'string') {
      return data.message;
    }

    return 'Unexpected server error';
  } catch (error) {
    return 'Unable to parse server response';
  }
};

const request = async (path, options) => {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }

  return response.json();
};

export const register = async (payload) =>
  request('/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const login = async (payload) =>
  request('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const verifyEmail = async (token) => {
  const search = token ? `?token=${encodeURIComponent(token)}` : '';
  return request(`/verify-email${search}`, {
    method: 'GET',
  });
};

export const requestPasswordReset = async (email) =>
  request('/password/reset/request', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const resetPassword = async (payload) =>
  request('/password/reset/confirm', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const googleAuth = async (credential) =>
  request('/google', {
    method: 'POST',
    body: JSON.stringify({ credential }),
  });

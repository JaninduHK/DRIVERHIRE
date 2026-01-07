import { API_BASE_URL } from '../constants/api.js';
import { getStoredToken, handleSessionExpired } from './authToken.js';

const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

const withAuthHeaders = () => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Please sign in to manage your profile.');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
};

const parseError = async (response) => {
  // When Nginx rejects uploads because of body-size limits, it returns HTML with 413.
  if (response.status === 413) {
    return 'Upload rejected by server. Please use images under 10MB and try again.';
  }

  try {
    const data = await response.json();
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors.map((error) => error.msg || error.message).join('\n');
    }
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message;
    }
    return `Request failed (${response.status})`;
  } catch (_error) {
    return 'Unable to parse server response';
  }
};

const request = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...withAuthHeaders(),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return {};
  }

  if (!response.ok) {
    const message = await parseError(response);
    if (response.status === 401) {
      handleSessionExpired(message);
    }
    throw new Error(message);
  }

  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch (_error) {
    throw new Error('Unable to parse server response');
  }
};

export const fetchCurrentUser = () =>
  request('/me', { method: 'GET' });

export const updateProfile = (payload) => {
  const body = payload instanceof FormData ? payload : JSON.stringify(payload);
  return request('/profile', {
    method: 'PUT',
    body,
  });
};

export const updatePassword = (payload) =>
  request('/password', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

export default {
  fetchCurrentUser,
  updateProfile,
  updatePassword,
};

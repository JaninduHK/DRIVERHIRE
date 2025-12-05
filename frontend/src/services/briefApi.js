import { getStoredToken } from './authToken.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const BRIEFS_BASE_URL = `${API_BASE_URL.replace(/\/+$/, '')}/briefs`;

const withTimeout = (promise, ms = 15000, message = 'Request timed out') => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timeoutId)), timeout]);
};

const safeJson = async (response) => {
  const body = await response.text();
  if (!body) {
    return {};
  }
  try {
    return JSON.parse(body);
  } catch (error) {
    return { message: 'Unable to parse server response' };
  }
};

const parseError = async (response) => {
  const data = await safeJson(response);
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((error) => error.msg || error.message).join('\n');
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  return `Request failed (${response.status})`;
};

const authHeaders = () => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('Please sign in to continue.');
  }
  return {
    Authorization: `Bearer ${token}`,
  };
};

const request = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...authHeaders(),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const fetchPromise = fetch(`${BRIEFS_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  let response;
  try {
    response = await withTimeout(fetchPromise);
  } catch (error) {
    throw new Error(error?.message || 'Network error');
  }

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(message);
  }

  return safeJson(response);
};

export const createBrief = (payload) =>
  request('', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchMyBriefs = () =>
  request('/mine', {
    method: 'GET',
  });

export const fetchOpenBriefs = () =>
  request('', {
    method: 'GET',
  });

export const respondToBrief = (briefId, payload) => {
  if (!briefId) {
    return Promise.reject(new Error('Brief identifier is required.'));
  }
  return request(`/${encodeURIComponent(briefId)}/respond`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export default {
  createBrief,
  fetchMyBriefs,
  fetchOpenBriefs,
  respondToBrief,
};

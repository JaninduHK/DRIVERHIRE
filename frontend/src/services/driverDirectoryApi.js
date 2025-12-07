import { API_BASE_URL } from '../constants/api.js';

const DRIVER_DIRECTORY_BASE_URL = `${API_BASE_URL}/drivers`;

const withTimeout = (promise, ms = 15000, message = 'Request timed out') => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeout,
  ]);
};

const safeJson = async (response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return { message: 'Unable to parse server response' };
  }
};

const parseError = async (response) => {
  const payload = await safeJson(response);
  if (typeof payload?.message === 'string' && payload.message.trim()) {
    return payload.message;
  }
  return `Request failed (${response.status})`;
};

const request = async (path, options = {}) => {
  const fetchPromise = fetch(`${DRIVER_DIRECTORY_BASE_URL}${path}`, {
    ...options,
    method: options.method || 'GET',
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

export const fetchDriverDirectory = () => request('/');

export const fetchDriverProfile = (driverId) => {
  if (!driverId) {
    return Promise.reject(new Error('Driver identifier is required.'));
  }
  return request(`/${encodeURIComponent(driverId)}`);
};

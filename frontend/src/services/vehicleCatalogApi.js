import { API_BASE_URL } from '../constants/api.js';
import { getStoredToken } from './authToken.js';

const VEHICLE_BASE_URL = `${API_BASE_URL}/vehicles`;

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
  const body = await response.text();
  if (!body) {
    return {};
  }
  try {
    return JSON.parse(body);
  } catch {
    return { message: 'Unable to parse server response' };
  }
};

const parseError = async (response) => {
  const data = await safeJson(response);
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  return `Request failed (${response.status})`;
};

const request = async (path, options = {}) => {
  const fetchPromise = fetch(`${VEHICLE_BASE_URL}${path}`, {
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

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.set(key, String(value));
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
};

export const fetchVehicles = (filters = {}) => request(buildQueryString(filters));

export const fetchVehicleDetails = (vehicleId) => {
  if (!vehicleId) {
    return Promise.reject(new Error('Vehicle identifier is required'));
  }
  return request(`/${encodeURIComponent(vehicleId)}`);
};

export const fetchVehicleReviews = (vehicleId, filters = {}) => {
  if (!vehicleId) {
    return Promise.reject(new Error('Vehicle identifier is required'));
  }
  return request(`/${encodeURIComponent(vehicleId)}/reviews${buildQueryString(filters)}`);
};

export const checkVehicleAvailability = (vehicleId, payload) => {
  if (!vehicleId) {
    return Promise.reject(new Error('Vehicle identifier is required'));
  }
  return request(`/${encodeURIComponent(vehicleId)}/check-availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

export const createVehicleBooking = (vehicleId, payload) => {
  if (!vehicleId) {
    return Promise.reject(new Error('Vehicle identifier is required'));
  }
  const token = getStoredToken();
  if (!token) {
    return Promise.reject(new Error('Please sign in to confirm your booking.'));
  }
  return request(`/${encodeURIComponent(vehicleId)}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
};

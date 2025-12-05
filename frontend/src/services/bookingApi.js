import { getStoredToken } from './authToken.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const BOOKINGS_BASE_URL = `${API_BASE_URL.replace(/\/+$/, '')}/bookings`;

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
  } catch (error) {
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
  const headers = {
    'Content-Type': 'application/json',
    ...authHeaders(),
    ...(options.headers || {}),
  };

  const fetchPromise = fetch(`${BOOKINGS_BASE_URL}${path}`, {
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

export const fetchTravelerBookings = () =>
  request('/traveler', {
    method: 'GET',
  });

export const fetchDriverBookings = () =>
  request('/driver', {
    method: 'GET',
  });

export const driverRespondToBooking = (bookingId, action) =>
  request(`/${bookingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });

export const updateTravelerBooking = (bookingId, payload) =>
  request(`/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const cancelTravelerBooking = (bookingId) =>
  request(`/${bookingId}/cancel`, {
    method: 'POST',
    body: JSON.stringify({}),
  });

export const submitBookingReview = (bookingId, payload) => {
  if (!bookingId) {
    return Promise.reject(new Error('Booking identifier is required to submit a review.'));
  }
  return request(`/${bookingId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export default {
  fetchTravelerBookings,
  fetchDriverBookings,
  driverRespondToBooking,
  updateTravelerBooking,
  cancelTravelerBooking,
  submitBookingReview,
};

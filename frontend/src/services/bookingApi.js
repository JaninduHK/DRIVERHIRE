import { API_BASE_URL } from '../constants/api.js';
import { getStoredToken, handleSessionExpired } from './authToken.js';

const BOOKINGS_BASE_URL = `${API_BASE_URL}/bookings`;

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
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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
    if (response.status === 401) {
      handleSessionExpired(message);
    }
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

export const submitBookingReview = (bookingId, { rating, title, comment, images } = {}) => {
  if (!bookingId) {
    return Promise.reject(new Error('Booking identifier is required to submit a review.'));
  }
  // Send multipart only when photos are attached; otherwise keep the lightweight JSON path.
  if (Array.isArray(images) && images.length > 0) {
    const form = new FormData();
    form.append('rating', String(rating));
    if (title) form.append('title', title);
    form.append('comment', comment);
    images.forEach((file) => form.append('images', file));
    return request(`/${bookingId}/reviews`, { method: 'POST', body: form });
  }
  return request(`/${bookingId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({ rating, title, comment }),
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

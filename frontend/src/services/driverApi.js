import { API_BASE_URL } from '../constants/api.js';
import { getStoredToken, handleSessionExpired } from './authToken.js';

// /src/services/driverApi.js
const DRIVER_BASE_URL = `${API_BASE_URL}/driver`;

// ---- tiny utilities -------------------------------------------------
const withTimeout = (promise, ms = 15000, msg = 'Request timed out. Please check your connection and try again.') => {
  let id;
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error(msg)), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(id)),
    timeout,
  ]);
};

const safeJson = async (response) => {
  // Some proxies / errors can return HTML or empty bodies; don't explode.
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch {
    return { message: 'Unable to parse server response' };
  }
};

const parseError = async (response) => {
  // Nginx/client body limits return 413 with HTML; show a clear upload error instead of a parse failure.
  if (response.status === 413) {
    return 'Upload too large. Please ensure images are compressed below 10MB each and try again.';
  }

  // Handle timeout and network errors
  if (response.status === 408 || response.status === 504) {
    return 'Upload timed out. Please check your connection and try again with smaller images.';
  }

  // Handle server errors that might occur during image processing
  if (response.status === 500) {
    return 'Server error while processing upload. Please try again or use smaller images.';
  }

  const data = await safeJson(response);

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors.map((e) => e.msg || e.message).join('\n');
  }
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }
  return `Request failed (${response.status}). Please try again.`;
};

const authHeaders = () => {
  const token = getStoredToken();
  if (!token) {
    // Throwing here is fine; callers catch and set error UI.
    throw new Error('You must be signed in to view the driver dashboard.');
  }
  return { Authorization: `Bearer ${token}` };
};

// ---- core request ---------------------------------------------------
const request = async (path, options = {}) => {
  const isFormData = options.body instanceof FormData;
  // Use longer timeout for file uploads (2 minutes) vs regular requests (15 seconds)
  const timeoutMs = isFormData ? 120000 : 15000;

  const headers = {
    ...authHeaders(),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  const fetchPromise = fetch(`${DRIVER_BASE_URL}${path}`, {
    ...options,
    headers,
    // Never reuse body streams after a fail; keep request simple.
  });

  let response;
  try {
    response = await withTimeout(fetchPromise, timeoutMs);
  } catch (e) {
    // Network or timeout - provide helpful mobile-friendly error messages
    if (e?.message?.includes('timed out')) {
      throw new Error(e.message);
    }
    if (e?.message?.includes('Failed to fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    throw new Error(e?.message || 'Network error. Please check your connection.');
  }

  if (!response.ok) {
    const message = await parseError(response);
    if (response.status === 401) {
      handleSessionExpired(message);
    }
    throw new Error(message);
  }

  // Handle 204/empty gracefully
  const data = await safeJson(response);
  return data;
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

// ---- public API -----------------------------------------------------
export const fetchDriverOverview = () =>
  request('/overview', { method: 'GET' });

export const fetchDriverVehicles = () =>
  request('/vehicles', { method: 'GET' });

export const createVehicle = (payload) =>
  request('/vehicles', {
    method: 'POST',
    // If payload is FormData, we send as-is; else JSON-encode
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });

export const updateVehicle = (vehicleId, payload) =>
  request(`/vehicles/${vehicleId}`, {
    method: 'PATCH',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });

export const createVehicleAvailability = (vehicleId, payload) =>
  request(`/vehicles/${vehicleId}/availability`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateVehicleAvailability = (vehicleId, availabilityId, payload) =>
  request(`/vehicles/${vehicleId}/availability/${availabilityId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteVehicleAvailability = (vehicleId, availabilityId) =>
  request(`/vehicles/${vehicleId}/availability/${availabilityId}`, {
    method: 'DELETE',
  });

export const fetchDriverEarningsSummary = (filters = {}) =>
  request(`/earnings/summary${buildQueryString(filters)}`, {
    method: 'GET',
  });

export const fetchDriverEarningsHistory = () =>
  request('/earnings/history', {
    method: 'GET',
  });

export const uploadCommissionSlip = (commissionId, payload) => {
  if (!commissionId) {
    return Promise.reject(new Error('Commission reference is required.'));
  }
  const body =
    payload instanceof FormData
      ? payload
      : (() => {
          const form = new FormData();
          if (payload) {
            form.append('slip', payload);
          }
          return form;
        })();
  return request(`/earnings/${commissionId}/payment-slip`, {
    method: 'POST',
    body,
  });
};

export const completeDriverProfileTour = () =>
  request('/onboarding/profile-tour/complete', {
    method: 'POST',
  });

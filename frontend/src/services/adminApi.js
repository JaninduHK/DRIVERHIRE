import { API_BASE_URL } from '../constants/api.js';
import { getStoredToken, handleSessionExpired } from './authToken.js';

const ADMIN_BASE_URL = `${API_BASE_URL}/admin`;

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

const authHeaders = () => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('You must be signed in to perform this action.');
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

  const response = await fetch(`${ADMIN_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const message = await parseError(response);
    if (response.status === 401) {
      handleSessionExpired(message);
    }
    throw new Error(message);
  }

  return response.json();
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

export const fetchDriverApplications = () => request('/drivers', { method: 'GET' });

export const updateDriverStatus = (driverId, status) =>
  request(`/drivers/${driverId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const sendDriverEmail = (driverId, payload) =>
  request(`/drivers/${driverId}/email`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchVehicleSubmissions = () => request('/vehicles', { method: 'GET' });

export const updateVehicleStatus = (vehicleId, payload) =>
  request(`/vehicles/${vehicleId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const updateVehicleDetails = (vehicleId, payload) =>
  request(`/vehicles/${vehicleId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const addVehicleImages = (vehicleId, payload) => {
  const body =
    payload instanceof FormData
      ? payload
      : (() => {
          const form = new FormData();
          if (Array.isArray(payload)) {
            payload.forEach((file) => form.append('images', file));
          }
          return form;
        })();
  return request(`/vehicles/${vehicleId}/images`, {
    method: 'POST',
    body,
  });
};

export const removeVehicleImage = (vehicleId, image) =>
  request(`/vehicles/${vehicleId}/images`, {
    method: 'DELETE',
    body: JSON.stringify({ image }),
  });

export const fetchReviews = (filters = {}) =>
  request(`/reviews${buildQueryString(filters)}`, { method: 'GET' });

export const updateReviewStatus = (reviewId, payload) =>
  request(`/reviews/${reviewId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const fetchBookings = () =>
  request('/bookings', {
    method: 'GET',
  });

export const updateBooking = (bookingId, payload) =>
  request(`/bookings/${bookingId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteBooking = (bookingId) =>
  request(`/bookings/${bookingId}`, {
    method: 'DELETE',
  });

export const fetchBriefs = () =>
  request('/briefs', {
    method: 'GET',
  });

export const updateBrief = (briefId, payload) =>
  request(`/briefs/${briefId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteBrief = (briefId) =>
  request(`/briefs/${briefId}`, {
    method: 'DELETE',
  });

export const fetchOffers = () =>
  request('/offers', {
    method: 'GET',
  });

export const updateOfferStatus = (offerId, status) =>
  request(`/offers/${offerId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteOffer = (offerId) =>
  request(`/offers/${offerId}`, {
    method: 'DELETE',
  });

export const fetchConversations = () =>
  request('/conversations', {
    method: 'GET',
  });

export const updateConversationStatus = (conversationId, status) =>
  request(`/conversations/${conversationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

export const deleteConversation = (conversationId) =>
  request(`/conversations/${conversationId}`, {
    method: 'DELETE',
  });

export const fetchCommissionDiscounts = () =>
  request('/discounts', {
    method: 'GET',
  });

export const createCommissionDiscount = (payload) =>
  request('/discounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const updateCommissionDiscount = (discountId, payload) =>
  request(`/discounts/${discountId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

export const deleteCommissionDiscount = (discountId) =>
  request(`/discounts/${discountId}`, {
    method: 'DELETE',
  });

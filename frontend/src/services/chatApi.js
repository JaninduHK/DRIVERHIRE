import { API_BASE_URL } from '../constants/api.js';
import { getStoredToken, handleSessionExpired } from './authToken.js';

const CHAT_BASE_URL = `${API_BASE_URL}/chat`;

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
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...authHeaders(),
    ...(options.headers || {}),
  };

  const fetchPromise = fetch(`${CHAT_BASE_URL}${path}`, {
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

export const startConversation = (payload) =>
  request('/conversations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchConversations = () =>
  request('/conversations', {
    method: 'GET',
  });

export const fetchMessages = (conversationId, params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }
  if (params.before) {
    searchParams.set('before', params.before);
  }
  const query = searchParams.toString();
  return request(`/conversations/${encodeURIComponent(conversationId)}/messages${query ? `?${query}` : ''}`, {
    method: 'GET',
  });
};

export const sendMessage = (conversationId, body) =>
  request(`/conversations/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });

export const markConversationRead = (conversationId) =>
  request(`/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: 'POST',
  });

export const sendOffer = (conversationId, payload) =>
  request(`/conversations/${encodeURIComponent(conversationId)}/offers`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const fetchOffer = (offerId) =>
  request(`/offers/${encodeURIComponent(offerId)}`, {
    method: 'GET',
  });

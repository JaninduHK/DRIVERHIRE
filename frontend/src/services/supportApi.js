import { API_BASE_URL } from '../constants/api.js';

const SUPPORT_BASE_URL = `${API_BASE_URL}/support`;

const safeJson = async (response) => {
  const body = await response.text();
  if (!body) return {};
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

export const submitSupportRequest = async (payload) => {
  const response = await fetch(`${SUPPORT_BASE_URL}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return safeJson(response);
};

export default {
  submitSupportRequest,
};

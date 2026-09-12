import { API_BASE_URL } from '../constants/api.js';

const OFFER_INVITE_BASE_URL = `${API_BASE_URL}/offer-invite`;

const safeJson = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const parseInviteError = async (response) => {
  const data = await safeJson(response);
  const error = new Error(
    typeof data?.message === 'string' ? data.message : 'Unable to reach the server'
  );
  error.reason = data?.reason;
  return error;
};

// Token-authenticated offer view opened straight from the offer notification
// email, so the traveller does not have to sign in just to see it.
export const fetchOfferInvite = async (token) => {
  const response = await fetch(`${OFFER_INVITE_BASE_URL}/invite/${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw await parseInviteError(response);
  }
  const data = await safeJson(response);
  return data.invite;
};

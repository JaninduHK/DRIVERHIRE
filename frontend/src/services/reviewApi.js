import { API_BASE_URL } from '../constants/api.js';

const REVIEWS_BASE_URL = `${API_BASE_URL}/reviews`;

const safeJson = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

// Latest approved reviews across all vehicles (homepage carousel).
// minRating (e.g. 5) restricts to that rating and above.
export const fetchLatestReviews = async (limit = 9, minRating) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (minRating) {
    params.set('minRating', String(minRating));
  }
  const response = await fetch(`${REVIEWS_BASE_URL}/latest?${params.toString()}`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return safeJson(response);
};

const parseInviteError = async (response) => {
  const data = await safeJson(response);
  const error = new Error(
    typeof data?.message === 'string' ? data.message : 'Unable to reach the server'
  );
  error.reason = data?.reason;
  return error;
};

// Token-authenticated review flow opened straight from the post-trip email, so
// the traveller does not have to sign in. The token is single-use and expiring.
export const fetchReviewInvite = async (token) => {
  const response = await fetch(`${REVIEWS_BASE_URL}/invite/${encodeURIComponent(token)}`);
  if (!response.ok) {
    throw await parseInviteError(response);
  }
  const data = await safeJson(response);
  return data.invite;
};

export const submitReviewFromToken = async (token, { rating, title, comment, images } = {}) => {
  // Multipart only when photos are attached (capped at 2 for this no-login flow —
  // see guestReviewImageUpload on the backend); otherwise the lightweight JSON path.
  const init =
    Array.isArray(images) && images.length > 0
      ? (() => {
          const form = new FormData();
          form.append('rating', String(rating));
          if (title) form.append('title', title);
          form.append('comment', comment);
          images.forEach((file) => form.append('images', file));
          return { method: 'POST', body: form };
        })()
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating, title, comment }),
        };

  const response = await fetch(`${REVIEWS_BASE_URL}/invite/${encodeURIComponent(token)}`, init);
  if (!response.ok) {
    throw await parseInviteError(response);
  }
  return safeJson(response);
};

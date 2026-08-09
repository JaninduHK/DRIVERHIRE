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

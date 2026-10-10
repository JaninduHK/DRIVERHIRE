// A quote request a traveller typed before signing in (homepage mini-form or
// /get-quotes). It is parked here across the Asgardeo round-trip and picked up
// by the dashboard's My Requests tab, which shows it back for review — nothing
// is posted until the traveller confirms there.
//
// localStorage rather than sessionStorage: a new traveller often finishes
// registration from the verification email, which opens a NEW tab, and
// sessionStorage is per-tab — the request would silently vanish. The expiry
// keeps an abandoned draft from resurfacing days later.
const KEY = 'carwithdriver:pending-brief';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const storage = () => {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const savePendingBrief = (brief) => {
  try {
    storage()?.setItem(KEY, JSON.stringify({ savedAt: Date.now(), brief }));
  } catch {
    /* storage full or blocked — the traveller just re-enters the request */
  }
};

export const clearPendingBrief = () => {
  try {
    storage()?.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

/** The parked request, or null when there is none or it has gone stale. */
export const readPendingBrief = () => {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const { savedAt, brief } = JSON.parse(raw);
    if (!brief || typeof brief !== 'object' || !Number.isFinite(savedAt) || Date.now() - savedAt > MAX_AGE_MS) {
      clearPendingBrief();
      return null;
    }
    return brief;
  } catch {
    clearPendingBrief();
    return null;
  }
};

export const hasPendingBrief = () => Boolean(readPendingBrief());

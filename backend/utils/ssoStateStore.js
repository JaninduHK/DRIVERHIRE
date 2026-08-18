// Short-lived key/value stores for the SSO handshake. A single Node process
// is sufficient at current scale — if the backend is ever scaled
// horizontally this needs to move to a shared store (e.g. Redis).

const stateStore = new Map();
const exchangeStore = new Map();

// PKCE verifiers keyed by `state` during the Asgardeo redirect round-trip —
// genuinely single-use, consumed exactly once when the callback arrives.
export const putStateEntry = (key, value, ttlMs) => {
  const expiresAt = Date.now() + ttlMs;
  stateStore.set(key, { value, expiresAt });
  setTimeout(() => {
    const entry = stateStore.get(key);
    if (entry && entry.expiresAt <= Date.now()) {
      stateStore.delete(key);
    }
  }, ttlMs).unref();
};

export const takeStateEntry = (key) => {
  const entry = stateStore.get(key);
  if (!entry) {
    return undefined;
  }
  stateStore.delete(key);
  if (entry.expiresAt < Date.now()) {
    return undefined;
  }
  return entry.value;
};

const EXCHANGE_GRACE_MS = 10_000;

// One-time exchange codes handed to the frontend after callback. Consumed
// once, but stays redeemable for a short grace window afterward and returns
// the SAME result — tolerates a near-duplicate second request for the same
// code (e.g. React StrictMode's dev-mode double effect invocation racing
// two fetches) without erroring the caller out of a session the first
// request already established.
export const putExchangeEntry = (key, value, ttlMs) => {
  const expiresAt = Date.now() + ttlMs;
  exchangeStore.set(key, { value, expiresAt, consumedAt: null });
  setTimeout(() => {
    exchangeStore.delete(key);
  }, ttlMs + EXCHANGE_GRACE_MS).unref();
};

export const takeExchangeEntry = (key) => {
  const entry = exchangeStore.get(key);
  if (!entry) {
    return undefined;
  }

  const now = Date.now();

  if (!entry.consumedAt) {
    if (entry.expiresAt < now) {
      exchangeStore.delete(key);
      return undefined;
    }
    entry.consumedAt = now;
    return entry.value;
  }

  if (now - entry.consumedAt > EXCHANGE_GRACE_MS) {
    exchangeStore.delete(key);
    return undefined;
  }

  return entry.value;
};

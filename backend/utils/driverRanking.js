/**
 * Ordering for the public drivers directory.
 *
 * Travellers should meet genuinely proven drivers first, new drivers still need
 * real visibility, and profiles that cannot be booked belong at the bottom. The
 * order also rotates daily so the same handful are not permanently pinned to the
 * top of page one.
 *
 * This module is pure: same input + same `now` always yields the same order, so
 * SSR and client hydration agree and the response stays cacheable.
 */

// Ratings on this marketplace sit between 4.90 and 5.00, so the average rating
// barely discriminates — review VOLUME is the real signal of a proven driver.
// Rating therefore only applies a penalty when someone is genuinely below the pack.
const GLOBAL_MEAN_RATING = 4.979; // weighted mean across all reviewed drivers
const RATING_PRIOR = 5; // reviews' worth of smoothing pulled toward the mean
const RATING_WEIGHT = 2;
// At 4 a 0.08 rating gap outweighed three times the review volume; at 1 a
// 3.5-star driver outranked brand-new drivers. 2 keeps both in the right order.

// Drivers whose scores land within this much of each other are treated as
// equivalent and rotate among themselves rather than holding fixed positions.
const BAND_WIDTH = 0.4;

// Every Nth slot of the complete tier is reserved for a driver with no reviews.
const EXPLORE_EVERY = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

const TIER_COMPLETE = 0; // has an approved vehicle AND a profile photo
const TIER_PARTIAL = 1; // has one of the two
const TIER_EMPTY = 2; // has neither — cannot realistically be booked

const tierOf = (driver) => {
  const hasVehicle = Number(driver?.vehicleCount) > 0;
  const hasPhoto = Boolean(driver?.profilePhoto);
  if (hasVehicle && hasPhoto) return TIER_COMPLETE;
  if (hasVehicle || hasPhoto) return TIER_PARTIAL;
  return TIER_EMPTY;
};

// A driver with no reviews scores exactly 0: the prior collapses to the global
// mean, so they rank below anyone proven but above a genuinely poorly-rated driver.
const scoreOf = (driver) => {
  const count = Number(driver?.reviewCount) > 0 ? Number(driver.reviewCount) : 0;
  const rating = Number(driver?.reviewScore) > 0 ? Number(driver.reviewScore) : GLOBAL_MEAN_RATING;
  const bayes = (count * rating + RATING_PRIOR * GLOBAL_MEAN_RATING) / (count + RATING_PRIOR);
  return Math.log10(1 + count) + RATING_WEIGHT * (bayes - GLOBAL_MEAN_RATING);
};

// FNV-1a: a cheap, stable hash so each driver gets a different position each day
// without needing to store anything.
const hash = (value) => {
  let out = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
};

/**
 * Reorders (never filters) the driver summaries. The live map and sitemap read
 * the same payload, so every driver passed in must come back out.
 */
export const rankDrivers = (drivers = [], { now = Date.now() } = {}) => {
  if (!Array.isArray(drivers) || drivers.length < 2) {
    return Array.isArray(drivers) ? [...drivers] : [];
  }

  const dayBucket = Math.floor(now / DAY_MS);
  const entries = drivers.map((driver, index) => ({
    driver,
    index, // keeps the incoming order as a final, stable tie-break
    tier: tierOf(driver),
    score: scoreOf(driver),
    reviewCount: Number(driver?.reviewCount) || 0,
    rotation: hash(`${driver?.id ?? index}:${dayBucket}`),
  }));

  const byBandThenRotation = (a, b) =>
    Math.floor(b.score / BAND_WIDTH) - Math.floor(a.score / BAND_WIDTH) ||
    a.rotation - b.rotation ||
    a.index - b.index;

  const ordered = [];

  for (const tier of [TIER_COMPLETE, TIER_PARTIAL, TIER_EMPTY]) {
    const inTier = entries.filter((entry) => entry.tier === tier).sort(byBandThenRotation);

    if (tier !== TIER_COMPLETE) {
      ordered.push(...inTier);
      continue;
    }

    // Interleave so a driver with no reviews yet still reaches page one.
    // "Proven" means reviewed AND not rated below the newcomer baseline — having
    // reviews should not buy a good position when those reviews are poor.
    const proven = inTier.filter((entry) => entry.reviewCount > 0 && entry.score >= 0);
    const fresh = inTier.filter((entry) => entry.reviewCount === 0);
    const poorlyRated = inTier.filter((entry) => entry.reviewCount > 0 && entry.score < 0);
    let p = 0;
    let f = 0;
    while (p < proven.length || f < fresh.length) {
      const slot = ordered.length + 1;
      const exploreSlot = slot % EXPLORE_EVERY === 0 && f < fresh.length;
      if (exploreSlot) ordered.push(fresh[f++]);
      else if (p < proven.length) ordered.push(proven[p++]);
      else ordered.push(fresh[f++]);
    }
    // Still ahead of incomplete profiles, but behind everyone in good standing.
    ordered.push(...poorlyRated);
  }

  return ordered.map((entry) => entry.driver);
};

export default { rankDrivers };

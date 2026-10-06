// What a driver can declare as included in an offer's price. Keys match the
// vehicle feature flags (models/Vehicle.js) so the two vocabularies stay one;
// labels live in the clients (frontend/src/constants/offerInclusions.js and
// mobile/src/constants/offerInclusions.ts).
export const OFFER_INCLUSION_KEYS = [
  'englishSpeakingDriver',
  'fuelAndInsurance',
  'parkingFeesAndTolls',
  'meetAndGreetAtAirport',
  'driverMealsAndAccommodation',
  'allTaxes',
];

/**
 * Cleans the `inclusions` field of an offer request.
 *
 * Returns undefined when the client sent none at all (an app version from
 * before inclusions existed) so the offer is stored without the field and is
 * shown with no inclusions block, rather than as "nothing included". An
 * explicit empty array means the driver really ticked nothing.
 */
export const normalizeOfferInclusions = (input) => {
  if (!Array.isArray(input)) {
    return undefined;
  }
  return OFFER_INCLUSION_KEYS.filter((key) => input.includes(key));
};

export default { OFFER_INCLUSION_KEYS, normalizeOfferInclusions };

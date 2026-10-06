// What a driver can declare as included in an offer's price. Mirrors
// frontend/src/constants/offerInclusions.js; keys must match
// backend/utils/offerInclusions.js.
export const OFFER_INCLUSIONS = [
  { key: 'englishSpeakingDriver', label: 'English-speaking driver' },
  { key: 'fuelAndInsurance', label: 'Fuel and insurance' },
  { key: 'parkingFeesAndTolls', label: 'All parking charges and tolls' },
  { key: 'meetAndGreetAtAirport', label: 'Airport meet & greet' },
  { key: 'driverMealsAndAccommodation', label: "Driver's meals & accommodation" },
  { key: 'allTaxes', label: 'All taxes' },
] as const;

export type OfferInclusionKey = (typeof OFFER_INCLUSIONS)[number]['key'];

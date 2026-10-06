// What a driver can declare as included in an offer's price. Keys must match
// backend/utils/offerInclusions.js (and mobile/src/constants/offerInclusions.ts).
export const OFFER_INCLUSIONS = [
  { key: 'englishSpeakingDriver', label: 'English-speaking driver' },
  { key: 'fuelAndInsurance', label: 'Fuel and insurance' },
  { key: 'parkingFeesAndTolls', label: 'All parking charges and tolls' },
  { key: 'meetAndGreetAtAirport', label: 'Airport meet & greet' },
  { key: 'driverMealsAndAccommodation', label: "Driver's meals & accommodation" },
  { key: 'allTaxes', label: 'All taxes' },
];

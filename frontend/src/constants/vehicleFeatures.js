export const VEHICLE_FEATURES = [
  { key: 'englishSpeakingDriver', label: 'English-speaking driver' },
  { key: 'meetAndGreetAtAirport', label: 'Meet & greet at airport' },
  { key: 'fuelAndInsurance', label: 'Fuel and insurance included' },
  { key: 'driverMealsAndAccommodation', label: 'Driver meals & accommodation' },
  { key: 'parkingFeesAndTolls', label: 'Parking fees & tolls' },
  { key: 'allTaxes', label: 'All taxes covered' },
];

export const getVehicleFeatureLabels = (vehicle = {}) =>
  VEHICLE_FEATURES.filter(({ key }) => Boolean(vehicle?.[key])).map(({ label }) => label);

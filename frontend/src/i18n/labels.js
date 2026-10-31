// Fixed English labels that come from the database or shared constants, shown
// in the visitor's language. Unknown values (free text) are shown unchanged.
import { VEHICLE_FEATURES } from '../constants/vehicleFeatures.js';
import { OFFER_INCLUSIONS } from '../constants/offerInclusions.js';
import { LICENSE_TYPE_OPTIONS } from '../constants/driverLicense.js';

const featureKeyByLabel = Object.fromEntries(VEHICLE_FEATURES.map(({ key, label }) => [label, key]));
// The driver directory API labels the same features slightly differently
// (FEATURE_FLAGS in backend/controllers/driverDirectoryController.js).
const BADGE_KEYS = {
  'English speaking': 'englishSpeakingDriver',
  'Airport meet & greet': 'meetAndGreetAtAirport',
  'Fuel & insurance included': 'fuelAndInsurance',
  'Meals & accommodation covered': 'driverMealsAndAccommodation',
  'Parking & tolls covered': 'parkingFeesAndTolls',
  'All taxes included': 'allTaxes',
};
const inclusionKeyByLabel = Object.fromEntries(OFFER_INCLUSIONS.map(({ key, label }) => [label, key]));
const LICENSE_KEYS = {
  'Tourist Driver': 'touristDriver',
  'Chauffeur Guide Lecturer': 'chauffeurGuideLecturer',
  'National Guide Lecturer': 'nationalGuideLecturer',
};

const translated = (t, key, fallback) => {
  const value = t(key);
  return value === key ? fallback : value;
};

export const translateFeature = (label, t) => {
  if (featureKeyByLabel[label]) return translated(t, `common.features.${featureKeyByLabel[label]}`, label);
  if (BADGE_KEYS[label]) return translated(t, `common.badges.${BADGE_KEYS[label]}`, label);
  return label;
};

export const translateFeatureKey = (key, t, fallback) => translated(t, `common.features.${key}`, fallback);

export const translateInclusion = (label, t) =>
  inclusionKeyByLabel[label] ? translated(t, `common.inclusions.${inclusionKeyByLabel[label]}`, label) : label;

export const translateLicenseType = (licenseType, t) =>
  LICENSE_KEYS[licenseType] ? translated(t, `common.licenseTypes.${LICENSE_KEYS[licenseType]}`, licenseType) : licenseType;

export { LICENSE_TYPE_OPTIONS };

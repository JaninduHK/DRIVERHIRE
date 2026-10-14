import Vehicle, { VEHICLE_STATUS } from '../models/Vehicle.js';

// A vehicle can be listed on the site once. Drivers type its registration number
// in different ways ("CAB-1234", "cab 1234", "WP CAB 1234"), so numbers are
// compared on a normalised key, never on what was typed.

export const DUPLICATE_REGISTRATION_MESSAGE =
  'This vehicle is already published on the website. Please contact admin.';

const FORMAT_MESSAGE =
  'Enter the registration number exactly as on the number plate, for example CAB-1234.';

// Province codes some drivers put in front of the number. They are not part of
// the registration itself ("WP CAB-1234" and "CAB-1234" are the same vehicle).
const PROVINCE_CODES = ['WP', 'CP', 'SP', 'NP', 'EP', 'NW', 'NC', 'UP', 'SG'];

/**
 * Cleans a registration number. Returns { number, key } — `number` to display,
 * `key` to compare — or { error } with a message for the driver.
 *
 * Sri Lankan plates are a letter series (2–3 letters) or an older numeric
 * series (1–3 digits), then four digits: CAB-1234, KX-1234, 65-1234, 300-1234.
 */
export const parseRegistrationNumber = (input) => {
  const number = typeof input === 'string' ? input.trim().replace(/\s+/g, ' ').toUpperCase() : '';
  if (!number) return { error: 'Enter the vehicle registration number.' };
  if (number.length > 20) return { error: FORMAT_MESSAGE };

  // Keep only Latin letters and digits: spaces, dashes and the Sinhala "ශ්‍රී"
  // on older plates are all just separators here.
  let key = number.replace(/[^A-Z0-9]/g, '');
  const letters = key.match(/^[A-Z]*/)[0];
  if (letters.length >= 4 && PROVINCE_CODES.includes(letters.slice(0, 2))) {
    key = key.slice(2);
  }
  if (!/^([A-Z]{1,3}|\d{1,3})\d{4}$/.test(key)) return { error: FORMAT_MESSAGE };
  return { number, key };
};

/**
 * Whether another listing already uses this registration: any vehicle that is
 * published or waiting for approval, by any driver (the same driver listing one
 * car twice included). Rejected and deleted vehicles do not count, so a driver
 * can resubmit after a rejection.
 */
export const findRegistrationConflict = (key, { excludeVehicleId } = {}) =>
  Vehicle.exists({
    'registration.key': key,
    deletedAt: null,
    status: { $in: [VEHICLE_STATUS.APPROVED, VEHICLE_STATUS.PENDING] },
    ...(excludeVehicleId ? { _id: { $ne: excludeVehicleId } } : {}),
  });

export default { parseRegistrationNumber, findRegistrationConflict, DUPLICATE_REGISTRATION_MESSAGE };

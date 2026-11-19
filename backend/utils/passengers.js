// Passenger numbers on bookings: adults (required), children and optional child ages.

const MAX_PASSENGERS = 60;
const MAX_CHILD_AGE = 17;

/** "2 adults · 1 child (age 5)", or '' when a booking has no passenger numbers. */
export const passengerSummary = ({ adults, children, childAges } = {}) => {
  if (!Number.isFinite(adults) || adults < 1) return '';
  const parts = [`${adults} adult${adults === 1 ? '' : 's'}`];
  if (Number.isFinite(children) && children > 0) {
    const ages = (childAges || []).filter((age) => Number.isFinite(age));
    const agesText = ages.length ? ` (age${ages.length === 1 ? '' : 's'} ${ages.join(', ')})` : '';
    parts.push(`${children} child${children === 1 ? '' : 'ren'}${agesText}`);
  }
  return parts.join(' · ');
};

/**
 * Reads adults / children / childAges from a booking request. Adults are required;
 * child ages are optional (any blank ones are skipped). Returns { ok, value } or
 * { ok: false, message }.
 */
export const parsePassengers = ({ adults, children, childAges } = {}, { seats } = {}) => {
  const adultCount = Number(adults);
  const childCount = children === undefined || children === null || children === '' ? 0 : Number(children);
  if (!Number.isInteger(adultCount) || adultCount < 1 || adultCount > MAX_PASSENGERS) {
    return { ok: false, message: 'Please enter how many adults are travelling.' };
  }
  if (!Number.isInteger(childCount) || childCount < 0 || childCount > MAX_PASSENGERS) {
    return { ok: false, message: 'Please enter a valid number of children.' };
  }
  const ages = (Array.isArray(childAges) ? childAges : [])
    .slice(0, childCount)
    .filter((age) => age !== '' && age !== null && age !== undefined)
    .map(Number);
  if (ages.some((age) => !Number.isInteger(age) || age < 0 || age > MAX_CHILD_AGE)) {
    return { ok: false, message: 'Child ages must be between 0 and 17.' };
  }
  if (Number.isFinite(seats) && seats > 0 && adultCount + childCount > seats) {
    return { ok: false, message: `This vehicle seats ${seats} passengers. Please choose a larger vehicle or fewer travellers.` };
  }
  return { ok: true, value: { adults: adultCount, children: childCount, childAges: ages } };
};

export default { passengerSummary, parsePassengers };

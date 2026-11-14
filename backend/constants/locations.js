// Towns a driver can choose as their base location. Drivers pick the nearest one
// from a list instead of typing it, so the same place is always spelled the same
// way, and city pages (/drivers/galle) can find the drivers based there.
//
// Keep in sync with frontend/src/constants/locations.js and
// mobile/src/constants/locations.ts (same slugs, names and order).
// `aliases` only help match older, hand-typed locations to a town.
export const LOCATIONS = [
  // Western
  { slug: 'colombo', name: 'Colombo', region: 'Western', aliases: ['colombo', 'kolamba', 'dehiwala', 'mount lavinia', 'nugegoda', 'maharagama', 'kotte', 'battaramulla', 'rajagiriya', 'meegoda', 'homagama', 'kottawa', 'malabe'] },
  { slug: 'negombo', name: 'Negombo', region: 'Western', aliases: ['negombo', 'negambu', 'negambo', 'migamuwa', 'kochchikade'] },
  { slug: 'katunayake', name: 'Katunayake (Airport)', region: 'Western', aliases: ['katunayake', 'katunayaka', 'bandaranaike', 'bandaranayaka', 'airport', 'seeduwa', 'cmb'] },
  { slug: 'gampaha', name: 'Gampaha', region: 'Western', aliases: ['gampaha', 'nittambuwa', 'veyangoda', 'minuwangoda', 'divulapitiya', 'kadawatha', 'ragama', 'kiribathgoda'] },
  { slug: 'ja-ela', name: 'Ja-Ela', region: 'Western', aliases: ['ja-ela', 'ja ela', 'jaela', 'kandana'] },
  { slug: 'wattala', name: 'Wattala', region: 'Western', aliases: ['wattala', 'uswetakeiyawa', 'hendala', 'kelaniya', 'peliyagoda'] },
  { slug: 'piliyandala', name: 'Piliyandala', region: 'Western', aliases: ['piliyandala', 'kesbewa', 'bandaragama'] },
  { slug: 'moratuwa', name: 'Moratuwa', region: 'Western', aliases: ['moratuwa', 'panadura', 'ratmalana'] },
  { slug: 'kalutara', name: 'Kalutara', region: 'Western', aliases: ['kalutara', 'wadduwa', 'horana'] },
  { slug: 'beruwala', name: 'Beruwala', region: 'Western', aliases: ['beruwala', 'aluthgama', 'maggona'] },
  // Southern
  { slug: 'bentota', name: 'Bentota', region: 'Southern', aliases: ['bentota', 'induruwa', 'kosgoda'] },
  { slug: 'ambalangoda', name: 'Ambalangoda', region: 'Southern', aliases: ['ambalangoda', 'balapitiya', 'ahungalla'] },
  { slug: 'hikkaduwa', name: 'Hikkaduwa', region: 'Southern', aliases: ['hikkaduwa', 'dodanduwa', 'telwatta'] },
  { slug: 'galle', name: 'Galle', region: 'Southern', aliases: ['galle', 'karapitiya', 'baddegama'] },
  { slug: 'unawatuna', name: 'Unawatuna', region: 'Southern', aliases: ['unawatuna', 'habaraduwa', 'koggala', 'ahangama'] },
  { slug: 'weligama', name: 'Weligama', region: 'Southern', aliases: ['weligama', 'midigama'] },
  { slug: 'mirissa', name: 'Mirissa', region: 'Southern', aliases: ['mirissa'] },
  { slug: 'matara', name: 'Matara', region: 'Southern', aliases: ['matara', 'dikwella', 'akuressa'] },
  { slug: 'tangalle', name: 'Tangalle', region: 'Southern', aliases: ['tangalle', 'tangalla'] },
  { slug: 'hambantota', name: 'Hambantota', region: 'Southern', aliases: ['hambantota', 'ambalantota'] },
  { slug: 'tissamaharama', name: 'Tissamaharama (Yala)', region: 'Southern', aliases: ['tissamaharama', 'tissa', 'yala', 'kataragama'] },
  // Central and hill country
  { slug: 'kandy', name: 'Kandy', region: 'Central', aliases: ['kandy', 'peradeniya', 'katugastota', 'kundasale', 'digana', 'gampola'] },
  { slug: 'matale', name: 'Matale', region: 'Central', aliases: ['matale'] },
  { slug: 'nuwara-eliya', name: 'Nuwara Eliya', region: 'Central', aliases: ['nuwara eliya', 'nuwaraeliya', 'nuwara-eliya', 'nanu oya'] },
  { slug: 'hatton', name: 'Hatton', region: 'Central', aliases: ['hatton', 'nallathanni', 'adams peak', 'maskeliya'] },
  { slug: 'ella', name: 'Ella', region: 'Uva', aliases: ['ella'] },
  { slug: 'bandarawela', name: 'Bandarawela', region: 'Uva', aliases: ['bandarawela', 'haputale', 'welimada'] },
  { slug: 'badulla', name: 'Badulla', region: 'Uva', aliases: ['badulla', 'passara'] },
  { slug: 'monaragala', name: 'Monaragala', region: 'Uva', aliases: ['monaragala', 'moneragala', 'bibile', 'wellawaya', 'buttala'] },
  // Cultural Triangle
  { slug: 'sigiriya', name: 'Sigiriya', region: 'Cultural Triangle', aliases: ['sigiriya', 'kimbissa', 'inamaluwa'] },
  { slug: 'dambulla', name: 'Dambulla', region: 'Cultural Triangle', aliases: ['dambulla', 'galewela'] },
  { slug: 'habarana', name: 'Habarana', region: 'Cultural Triangle', aliases: ['habarana', 'minneriya'] },
  { slug: 'anuradhapura', name: 'Anuradhapura', region: 'Cultural Triangle', aliases: ['anuradhapura', 'anuradapura', 'anuradhpura', 'mihintale'] },
  { slug: 'polonnaruwa', name: 'Polonnaruwa', region: 'Cultural Triangle', aliases: ['polonnaruwa', 'polonaruwa'] },
  // North Western
  { slug: 'kurunegala', name: 'Kurunegala', region: 'North Western', aliases: ['kurunegala', 'kuliyapitiya', 'dummalasuriya', 'wariyapola'] },
  { slug: 'chilaw', name: 'Chilaw', region: 'North Western', aliases: ['chilaw', 'marawila', 'wennappuwa', 'puttalam'] },
  { slug: 'kalpitiya', name: 'Kalpitiya', region: 'North Western', aliases: ['kalpitiya'] },
  // Sabaragamuwa
  { slug: 'kegalle', name: 'Kegalle', region: 'Sabaragamuwa', aliases: ['kegalle', 'mawanella', 'pinnawala', 'kitulgala'] },
  { slug: 'ratnapura', name: 'Ratnapura', region: 'Sabaragamuwa', aliases: ['ratnapura', 'rathnapura', 'balangoda', 'embilipitiya', 'udawalawe'] },
  // East and North
  { slug: 'trincomalee', name: 'Trincomalee', region: 'Eastern', aliases: ['trincomalee', 'trinco', 'nilaveli', 'uppuveli'] },
  { slug: 'batticaloa', name: 'Batticaloa', region: 'Eastern', aliases: ['batticaloa', 'pasikudah', 'kalkudah'] },
  { slug: 'ampara', name: 'Ampara', region: 'Eastern', aliases: ['ampara', 'amparai'] },
  { slug: 'arugam-bay', name: 'Arugam Bay', region: 'Eastern', aliases: ['arugam bay', 'arugambay', 'pottuvil'] },
  { slug: 'jaffna', name: 'Jaffna', region: 'Northern', aliases: ['jaffna'] },
];

// Areas a driver can add as "Also available in" (up to MAX_SERVICE_AREAS), on top of
// their base town. These are the city-page areas (frontend/src/data/cityPages.js):
// same slugs. `towns` are the base towns each area covers.
export const MAX_SERVICE_AREAS = 3;
export const SERVICE_AREAS = [
  { slug: 'colombo', name: 'Colombo', towns: ['colombo'] },
  { slug: 'negombo', name: 'Negombo & Airport', towns: ['negombo', 'katunayake'] },
  { slug: 'kandy', name: 'Kandy', towns: ['kandy'] },
  { slug: 'galle', name: 'Galle', towns: ['galle'] },
  { slug: 'ella', name: 'Ella', towns: ['ella'] },
  { slug: 'sigiriya', name: 'Sigiriya', towns: ['sigiriya'] },
  { slug: 'nuwara-eliya', name: 'Nuwara Eliya', towns: ['nuwara-eliya'] },
  { slug: 'mirissa', name: 'Mirissa', towns: ['mirissa'] },
  { slug: 'bentota', name: 'Bentota & Hikkaduwa', towns: ['bentota', 'hikkaduwa'] },
  { slug: 'arugam-bay', name: 'Arugam Bay', towns: ['arugam-bay'] },
];

const bySlug = new Map(LOCATIONS.map((location) => [location.slug, location]));
const byName = new Map(LOCATIONS.map((location) => [location.name.toLowerCase(), location]));

export const getLocationBySlug = (slug) => bySlug.get(String(slug || '').toLowerCase()) || null;

/** The list entry for an exact name or slug (case-insensitive), or null. */
export const findLocation = (value) => {
  const key = String(value || '').trim().toLowerCase();
  return byName.get(key) || bySlug.get(key) || null;
};

/**
 * Best guess for older, hand-typed locations ("Near Bandaranayaka airport",
 * "Negambu"). Returns the list entry whose alias appears earliest in the text, or null.
 */
export const matchLocation = (text) => {
  const value = String(text || '').toLowerCase();
  if (!value.trim()) return null;
  const exact = findLocation(value);
  if (exact) return exact;
  let best = null;
  let bestIndex = Infinity;
  for (const location of LOCATIONS) {
    for (const alias of location.aliases) {
      const index = value.search(new RegExp(`(^|[^a-z])${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`));
      if (index !== -1 && index < bestIndex) {
        best = location;
        bestIndex = index;
      }
    }
  }
  return best;
};

/**
 * Checks a driver's base location on save. A name from the list is stored in its
 * standard spelling; the driver's current (older, typed) value is accepted unchanged
 * so editing other profile fields never fails. Anything else is rejected.
 */
export const normalizeDriverBase = (input, currentValue = '') => {
  const value = typeof input === 'string' ? input.trim() : '';
  if (!value) return { ok: false, message: 'Choose your base location from the list.' };
  const location = findLocation(value);
  if (location) return { ok: true, value: location.name };
  if (currentValue && value === String(currentValue).trim()) return { ok: true, value };
  return { ok: false, message: 'Choose your base location from the list.' };
};

/**
 * Checks "Also available in" on save. Accepts an array or a comma-separated string
 * (multipart forms), keeps known area slugs once each, and rejects more than the limit.
 */
export const normalizeServiceAreas = (input) => {
  const raw = Array.isArray(input) ? input : String(input ?? '').split(',');
  const known = new Set(SERVICE_AREAS.map((area) => area.slug));
  const areas = [...new Set(raw.map((value) => String(value).trim().toLowerCase()).filter((value) => known.has(value)))];
  if (areas.length > MAX_SERVICE_AREAS) {
    return { ok: false, message: `Choose up to ${MAX_SERVICE_AREAS} areas where you are also available.` };
  }
  return { ok: true, value: areas };
};

export default LOCATIONS;

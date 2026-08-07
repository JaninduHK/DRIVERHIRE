import { fetchDriverDirectory } from '../../src/services/driverDirectoryApi.js';
import { buildMeta } from '../lib/seo.js';

export async function loader() {
  try {
    const response = await fetchDriverDirectory();
    return { drivers: response?.drivers || [] };
  } catch {
    // Don't fail the whole page if the API hiccups — render empty; the client retries.
    return { drivers: [] };
  }
}

export function meta() {
  return buildMeta({
    title: 'Hire SLTDA-Registered Private Drivers in Sri Lanka | Car with Driver LK',
    description:
      'Browse verified private chauffeur-guides for island-wide travel in Sri Lanka. Compare experience, languages, vehicles and daily rates, then book direct with no middleman.',
    path: '/drivers',
  });
}

export { default } from '../../src/pages/DriversDirectory.jsx';

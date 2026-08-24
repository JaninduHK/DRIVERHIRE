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
    title: 'Live Driver Map | Find Drivers Near You in Sri Lanka | Car with Driver LK',
    description:
      "See private drivers near you on a live map of Sri Lanka. Compare vehicles, ratings and daily rates, then start a chat — no middleman, no booking fees.",
    path: '/live-map',
  });
}

export { default } from '../../src/pages/LiveDriverMap.jsx';

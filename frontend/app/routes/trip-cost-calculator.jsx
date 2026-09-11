import { buildMeta } from '../lib/seo.js';
import { fetchVehicles } from '../../src/services/vehicleCatalogApi.js';

// Fetched server-side so the estimate is real, crawlable HTML on first load — not a
// client-only spinner state (see sitemap.jsx for the same fetchVehicles-in-a-loader pattern).
export async function loader() {
  const data = await fetchVehicles({ sort: 'priceAsc' }).catch(() => ({ vehicles: [] }));
  return { vehicles: data?.vehicles || [] };
}

export function meta() {
  return buildMeta({
    title: 'Sri Lanka Trip Cost Calculator | Plan Your Itinerary | Car with Driver LK',
    description:
      'Build a day-by-day Sri Lanka itinerary and get a real cost estimate from live driver rates — distances, driving time, and per-vehicle-class pricing for your exact route.',
    path: '/trip-cost-calculator',
  });
}

export { default } from '../../src/pages/TripCostCalculator.jsx';

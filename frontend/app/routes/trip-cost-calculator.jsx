import { buildMeta, metaLocale } from '../lib/seo.js';
import { fetchVehicles } from '../../src/services/vehicleCatalogApi.js';

// Fetched server-side so the estimate is real, crawlable HTML on first load — not a
// client-only spinner state (see sitemap.jsx for the same fetchVehicles-in-a-loader pattern).
export async function loader() {
  const data = await fetchVehicles({ sort: 'priceAsc' }).catch(() => ({ vehicles: [] }));
  return { vehicles: data?.vehicles || [] };
}

export function meta({ location }) {
  const { locale, t } = metaLocale(location);
  return buildMeta({
    title: t('meta.tripCost.title'),
    description: t('meta.tripCost.description'),
    path: '/trip-cost-calculator',
    locale,
  });
}

export { default } from '../../src/pages/TripCostCalculator.jsx';

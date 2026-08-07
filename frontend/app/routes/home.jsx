import { fetchVehicles } from '../../src/services/vehicleCatalogApi.js';
import { fetchDriverDirectory } from '../../src/services/driverDirectoryApi.js';
import { buildMeta } from '../lib/seo.js';

export async function loader() {
  const [vehicles, drivers] = await Promise.all([
    fetchVehicles({ sort: 'rating_desc' })
      .then((r) => (Array.isArray(r?.vehicles) ? r.vehicles : []))
      .catch(() => []),
    fetchDriverDirectory()
      .then((r) => (Array.isArray(r?.drivers) ? r.drivers : []))
      .catch(() => []),
  ]);
  return { vehicles, drivers };
}

export function meta() {
  return buildMeta({
    title: 'Hire a Private Driver with Car in Sri Lanka | Car with Driver LK',
    description:
      'Book an SLTDA-registered private driver with a car in Sri Lanka. Compare English-speaking chauffeur-guides, transparent daily rates and island-wide tours, with free quotes in minutes.',
    path: '/',
  });
}

export { default } from '../../src/pages/HomePage.jsx';

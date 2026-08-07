import { fetchVehicles } from '../../src/services/vehicleCatalogApi.js';
import { buildMeta } from '../lib/seo.js';

export async function loader() {
  try {
    const { vehicles } = await fetchVehicles({});
    return { vehicles: Array.isArray(vehicles) ? vehicles : [] };
  } catch {
    return { vehicles: [] };
  }
}

export function meta() {
  return buildMeta({
    title: 'Cars with Driver for Island-Wide Travel in Sri Lanka | Car with Driver LK',
    description:
      'Browse cars with an English-speaking private driver in Sri Lanka — sedans, vans and SUVs with transparent daily rates, fuel and insurance included. Get free quotes.',
    path: '/vehicles',
  });
}

export { default } from '../../src/pages/VehicleCatalog.jsx';

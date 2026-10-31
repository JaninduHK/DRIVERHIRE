import { fetchVehicles } from '../../src/services/vehicleCatalogApi.js';
import { buildMeta, metaLocale } from '../lib/seo.js';

export async function loader() {
  try {
    const { vehicles } = await fetchVehicles({});
    return { vehicles: Array.isArray(vehicles) ? vehicles : [] };
  } catch {
    return { vehicles: [] };
  }
}

export function meta({ location }) {
  const { locale, t } = metaLocale(location);
  return buildMeta({
    title: t('meta.vehicles.title'),
    description: t('meta.vehicles.description'),
    path: '/vehicles',
    locale,
  });
}

export { default } from '../../src/pages/VehicleCatalog.jsx';

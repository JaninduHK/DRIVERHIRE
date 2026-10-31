import { fetchVehicles } from '../../src/services/vehicleCatalogApi.js';
import { fetchDriverDirectory } from '../../src/services/driverDirectoryApi.js';
import { buildMeta, metaLocale } from '../lib/seo.js';

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

export function meta({ location }) {
  const { locale, t } = metaLocale(location);
  return buildMeta({
    title: t('meta.home.title'),
    description: t('meta.home.description'),
    path: '/',
    locale,
  });
}

export { default } from '../../src/pages/HomePage.jsx';

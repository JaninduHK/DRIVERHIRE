import { fetchDriverDirectory } from '../../src/services/driverDirectoryApi.js';
import { buildMeta, metaLocale } from '../lib/seo.js';

export async function loader() {
  try {
    const response = await fetchDriverDirectory();
    return { drivers: response?.drivers || [] };
  } catch {
    // Don't fail the whole page if the API hiccups — render empty; the client retries.
    return { drivers: [] };
  }
}

export function meta({ location }) {
  const { locale, t } = metaLocale(location);
  return buildMeta({
    title: t('meta.drivers.title'),
    description: t('meta.drivers.description'),
    path: '/drivers',
    locale,
  });
}

export { default } from '../../src/pages/DriversDirectory.jsx';

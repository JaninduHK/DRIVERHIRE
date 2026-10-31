import { fetchVehicleDetails } from '../../src/services/vehicleCatalogApi.js';
import { buildMeta, isVehicleIndexable, metaLocale } from '../lib/seo.js';

export async function loader({ params }) {
  const { vehicleId } = params;
  let vehicle;
  try {
    ({ vehicle } = await fetchVehicleDetails(vehicleId));
  } catch {
    // Missing / unapproved / deleted vehicle -> real 404.
    throw new Response('Not Found', { status: 404 });
  }
  if (!vehicle) {
    throw new Response('Not Found', { status: 404 });
  }
  return { vehicle };
}

export function meta({ data, location }) {
  const { locale, t } = metaLocale(location);
  const vehicle = data?.vehicle;
  if (!vehicle) {
    return buildMeta({
      title: t('meta.vehicle.notFoundTitle'),
      description: t('meta.vehicle.notFoundDescription'),
      path: '/vehicles',
      noindex: true,
      locale,
    });
  }
  const description = t('meta.vehicle.description', {
    model: `${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''}`,
    seats: vehicle.seats,
    price: vehicle.pricePerDay,
  });
  return buildMeta({
    title: t('meta.vehicle.title', { model: vehicle.model }),
    description,
    locale,
    path: `/vehicles/${vehicle.id}`,
    image: Array.isArray(vehicle.images) ? vehicle.images[0] : undefined,
    type: 'product',
    noindex: !isVehicleIndexable(vehicle),
  });
}

export { default } from '../../src/pages/VehicleDetails.jsx';

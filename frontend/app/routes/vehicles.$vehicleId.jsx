import { fetchVehicleDetails } from '../../src/services/vehicleCatalogApi.js';
import { buildMeta, isVehicleIndexable } from '../lib/seo.js';

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

export function meta({ data }) {
  const vehicle = data?.vehicle;
  if (!vehicle) {
    return buildMeta({
      title: 'Vehicle not found | Car with Driver LK',
      description: 'This vehicle could not be found.',
      path: '/vehicles',
      noindex: true,
    });
  }
  const description = `Hire a ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ''} with an English-speaking private driver in Sri Lanka. ${vehicle.seats} seats, fuel and insurance included, from $${vehicle.pricePerDay}/day.`;
  return buildMeta({
    title: `${vehicle.model} with Private Driver in Sri Lanka | Car with Driver LK`,
    description,
    path: `/vehicles/${vehicle.id}`,
    image: Array.isArray(vehicle.images) ? vehicle.images[0] : undefined,
    type: 'product',
    noindex: !isVehicleIndexable(vehicle),
  });
}

export { default } from '../../src/pages/VehicleDetails.jsx';

import { fetchDriverProfile } from '../../src/services/driverDirectoryApi.js';
import { fetchVehicleReviews } from '../../src/services/vehicleCatalogApi.js';
import { buildMeta, isDriverIndexable } from '../lib/seo.js';

const emptyMeta = { total: 0, averageRating: null, counts: [0, 0, 0, 0, 0] };

export async function loader({ params }) {
  const { id } = params;

  let profile;
  try {
    profile = await fetchDriverProfile(id);
  } catch {
    // Missing / unapproved / deleted driver -> real 404 (not a soft 200).
    throw new Response('Not Found', { status: 404 });
  }
  if (!profile?.driver) {
    throw new Response('Not Found', { status: 404 });
  }

  // Aggregate the same per-vehicle reviews the page shows, server-side, so the review
  // text and ratings land in the crawlable HTML.
  const vehicles = Array.isArray(profile.vehicles) ? profile.vehicles : [];
  const aggregated = [];
  const counts = [0, 0, 0, 0, 0];
  let sum = 0;
  for (const vehicle of vehicles) {
    if (!vehicle?.id) continue;
    try {
      const response = await fetchVehicleReviews(vehicle.id);
      (Array.isArray(response?.reviews) ? response.reviews : []).forEach((review) => {
        const rating = Number(review.rating) || 0;
        aggregated.push({ ...review, vehicle: { id: vehicle.id, model: vehicle.model } });
        sum += rating;
        const idx = Math.min(Math.max(Math.round(rating), 1), 5) - 1;
        if (idx >= 0) counts[idx] += 1;
      });
    } catch {
      /* reviews are best-effort — skip a vehicle that fails */
    }
  }
  aggregated.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  const total = aggregated.length;

  return {
    driver: profile.driver,
    vehicles,
    reviews: aggregated,
    reviewMeta: total
      ? { total, averageRating: Number((sum / total).toFixed(1)), counts }
      : emptyMeta,
  };
}

export function meta({ data }) {
  const driver = data?.driver;
  if (!driver) {
    return buildMeta({
      title: 'Driver not found | Car with Driver LK',
      description: 'This driver profile could not be found.',
      path: '/drivers',
      noindex: true,
    });
  }
  const bits = [];
  if (driver.experienceYears) bits.push(`${Math.round(driver.experienceYears)}+ years' experience`);
  if (driver.reviewCount) bits.push(`${driver.reviewCount} traveller reviews`);
  if (driver.averagePricePerDay) bits.push(`cars with driver from $${driver.averagePricePerDay}/day`);
  const description = `Hire ${driver.name}, an SLTDA-registered private driver in Sri Lanka${
    driver.location ? ` based in ${driver.location}` : ''
  }.${bits.length ? ` ${bits.join(', ')}.` : ''} Book direct with no middleman.`;
  return buildMeta({
    title: `${driver.name} — Private Chauffeur in Sri Lanka | Car with Driver LK`,
    description,
    path: `/drivers/${driver.id}`,
    image: driver.profilePhoto,
    type: 'profile',
    // Thin profiles stay out of the index until they list a vehicle and have a bio/reviews.
    noindex: !isDriverIndexable(driver, data.vehicles),
  });
}

export { default } from '../../src/pages/DriverDetails.jsx';

import { fetchVehicles } from '../../src/services/vehicleCatalogApi.js';
import { fetchDriverProfile } from '../../src/services/driverDirectoryApi.js';
import { buildMeta } from '../lib/seo.js';

// Hand-picked drivers surfaced on this page. Their details are always fetched
// live, so a rate, rating or vehicle count here can never drift from the profile.
const RECOMMENDED_DRIVER_IDS = [
  '6a735cc0f12bff3e11451e91',
  '6a732a83f12bff3e11450c39',
  '6a7322e0f12bff3e114507e2',
  '6a943ead93a7f549b0137278',
];

// Server-rendered so the rate tables and guidance are real HTML for crawlers; the
// quote form itself hydrates and behaves exactly as before.
export async function loader() {
  const [vehicles, recommendedDrivers] = await Promise.all([
    fetchVehicles()
      .then((r) => (Array.isArray(r?.vehicles) ? r.vehicles : []))
      .catch(() => []),
    Promise.all(
      RECOMMENDED_DRIVER_IDS.map((id) =>
        fetchDriverProfile(id)
          .then((r) => {
            if (!r?.driver) return null;
            const prices = (Array.isArray(r.vehicles) ? r.vehicles : [])
              .map((v) => Number(v?.pricePerDay))
              .filter((n) => Number.isFinite(n) && n > 0);
            return { ...r.driver, fromPrice: prices.length ? Math.min(...prices) : null };
          })
          // A delisted or unapproved driver simply drops out rather than 500ing the page.
          .catch(() => null)
      )
    ).then((list) => list.filter(Boolean)),
  ]);

  return { vehicles, recommendedDrivers };
}

export function meta() {
  return buildMeta({
    title: 'Sri Lanka Car with Driver Quotes — Compare Free Offers | Car with Driver LK',
    description:
      'Share your dates and route and get free quotes from vetted Sri Lankan drivers and SLTDA chauffeur guides. Compare offers, chat direct, pay your driver — no booking fee.',
    path: '/get-quotes',
  });
}

export { default } from '../../src/pages/GetQuotes.jsx';

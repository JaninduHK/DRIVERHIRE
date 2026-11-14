import { redirect, useLoaderData } from 'react-router';
import { fetchDriverDirectory, fetchDriverProfile } from '../../src/services/driverDirectoryApi.js';
import { CITY_PAGE_LIST, getCityPage } from '../../src/data/cityPages.js';
import { driverTownSlug } from '../../src/constants/locations.js';
import { getLocaleFromPath, localizePath } from '../../src/i18n/locales.js';
import DriverDetails from '../../src/pages/DriverDetails.jsx';
import CityDriversPage from '../../src/pages/CityDriversPage.jsx';
import { fetchVehicleReviews } from '../../src/services/vehicleCatalogApi.js';
import { buildMeta, isDriverIndexable, metaLocale } from '../lib/seo.js';

const emptyMeta = { total: 0, averageRating: null, counts: [0, 0, 0, 0, 0] };

// /drivers/galle: a city page, not a driver profile (driver ids are 24-character hex).
async function loadCityPage(city) {
  let drivers = [];
  try {
    drivers = (await fetchDriverDirectory())?.drivers || [];
  } catch {
    // Render the page without drivers rather than failing; the text still stands.
  }
  const byReviews = (a, b) => (b.reviewCount || 0) - (a.reviewCount || 0);
  const inCity = [];
  const nearby = [];
  const available = []; // chose this area under "Also available in"
  const rest = [];
  const towns = city.towns || [city.slug];
  for (const driver of drivers) {
    const town = driverTownSlug(driver);
    if (towns.includes(town)) inCity.push(driver);
    else if (city.nearby.includes(town)) nearby.push(driver);
    else if ((driver.serviceAreas || []).includes(city.slug)) available.push(driver);
    else rest.push(driver);
  }
  const based = [...inCity.sort(byReviews), ...nearby.sort(byReviews)];
  const rates = based.map((d) => Number(d.averagePricePerDay)).filter((n) => Number.isFinite(n) && n > 0);
  return {
    city,
    // Links to the other city pages, for "drivers in other areas".
    otherCities: CITY_PAGE_LIST.filter((page) => page.slug !== city.slug).map((page) => ({ slug: page.slug, name: page.areaName || page.name })),
    based,
    available: available.sort(byReviews),
    others: rest.sort(byReviews).slice(0, 6),
    stats: {
      basedCount: based.length,
      minRate: rates.length ? Math.round(Math.min(...rates)) : null,
      reviewCount: based.reduce((sum, d) => sum + (d.reviewCount || 0), 0),
    },
  };
}

export async function loader({ params, request }) {
  const { id } = params;

  const cityMatch = getCityPage(id);
  if (cityMatch?.redirectTo) {
    // /drivers/airport -> /drivers/negombo (keeping the language prefix).
    const locale = getLocaleFromPath(new URL(request.url).pathname);
    throw redirect(localizePath(`/drivers/${cityMatch.redirectTo}`, locale), 301);
  }
  if (cityMatch) return loadCityPage(cityMatch.page);

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
  // Reviews with photos first, then most recent — so their images are visible up top.
  aggregated.sort((a, b) => {
    const ai = Array.isArray(a.images) && a.images.length ? 1 : 0;
    const bi = Array.isArray(b.images) && b.images.length ? 1 : 0;
    if (ai !== bi) return bi - ai;
    return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
  });
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

export function meta({ data, location }) {
  const { locale, t } = metaLocale(location);
  if (data?.city) {
    // City pages are English only for now: the translated paths stay out of the index.
    return buildMeta({
      title: data.city.seoTitle,
      description: data.city.metaDescription,
      path: `/drivers/${data.city.slug}`,
      locale,
      alternates: false,
      noindex: getLocaleFromPath(location.pathname) !== 'en',
    });
  }
  const driver = data?.driver;
  if (!driver) {
    return buildMeta({
      title: t('meta.driver.notFoundTitle'),
      description: t('meta.driver.notFoundDescription'),
      path: '/drivers',
      noindex: true,
      locale,
    });
  }
  const bits = [];
  if (driver.experienceYears) bits.push(t('meta.driver.experience', { count: Math.round(driver.experienceYears) }));
  if (driver.reviewCount) bits.push(t('meta.driver.reviews', { count: driver.reviewCount }));
  if (driver.averagePricePerDay) bits.push(t('meta.driver.fromPrice', { price: driver.averagePricePerDay }));
  // The profile API sends location as { label, … }; older payloads used a string.
  const place = typeof driver.location === 'string' ? driver.location : driver.location?.label;
  const intro = place
    ? t('meta.driver.introBased', { name: driver.name, location: place })
    : t('meta.driver.intro', { name: driver.name });
  const description = `${intro}${bits.length ? ` ${bits.join(t('meta.driver.separator'))}.` : ''} ${t('meta.driver.bookDirect')}`;
  return buildMeta({
    title: t('meta.driver.title', { name: driver.name }),
    description,
    locale,
    path: `/drivers/${driver.id}`,
    image: driver.profilePhoto,
    type: 'profile',
    // Thin profiles stay out of the index until they list a vehicle and have a bio/reviews.
    noindex: !isDriverIndexable(driver, data.vehicles),
  });
}

export default function DriverOrCityPage() {
  const data = useLoaderData();
  return data?.city ? <CityDriversPage /> : <DriverDetails />;
}

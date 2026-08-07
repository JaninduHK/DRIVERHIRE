// Canonical public origin for canonical/OG URLs.
export const SITE_URL = 'https://carwithdriver.lk';
export const SITE_NAME = 'Car with Driver LK';

// Thin-content guard. Profiles/vehicles below this bar are served noindex,follow (and left
// out of the sitemap) until they are fleshed out, so Google never sees empty pages. Tune
// here in one place.
export const INDEXABLE = {
  driverMinVehicles: 1, // must list at least one vehicle
  driverNeedsDescriptionOrReviews: true, // and have a bio or at least one review
  vehicleNeedsDescription: true,
  vehicleMinImages: 1,
};

export function isDriverIndexable(driver, vehicles = []) {
  if (!driver?.name) return false;
  const vehicleCount = driver.vehicleCount ?? (Array.isArray(vehicles) ? vehicles.length : 0);
  if (vehicleCount < INDEXABLE.driverMinVehicles) return false;
  if (INDEXABLE.driverNeedsDescriptionOrReviews) {
    const hasDescription = Boolean((driver.description || '').trim());
    const hasReviews = (driver.reviewCount || 0) > 0;
    if (!hasDescription && !hasReviews) return false;
  }
  return true;
}

export function isVehicleIndexable(vehicle) {
  if (!vehicle?.model) return false;
  if (INDEXABLE.vehicleNeedsDescription && !(vehicle.description || '').trim()) return false;
  const imageCount = Array.isArray(vehicle.images) ? vehicle.images.length : 0;
  if (imageCount < INDEXABLE.vehicleMinImages) return false;
  return true;
}

const absoluteUrl = (value) => {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith('/') ? '' : '/'}${value}`;
};

const clamp = (text, max = 160) => {
  if (!text) return text;
  const t = String(text).replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};

/**
 * Build a full set of head tags for a route: title, description, canonical, Open Graph
 * and Twitter card. `path` should be the clean path (no query) so filtered variants
 * canonicalise to their base URL. Pass `noindex` for auth/transactional pages.
 */
export function buildMeta({ title, description, path = '/', image, type = 'website', noindex = false }) {
  const url = `${SITE_URL}${path}`;
  const img = absoluteUrl(image);
  const desc = clamp(description);

  const tags = [
    { title },
    { name: 'description', content: desc },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:site_name', content: SITE_NAME },
    { property: 'og:type', content: type },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: desc },
    { name: 'twitter:card', content: img ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: desc },
  ];
  if (img) {
    tags.push({ property: 'og:image', content: img });
    tags.push({ name: 'twitter:image', content: img });
  }
  if (noindex) {
    tags.push({ name: 'robots', content: 'noindex, follow' });
  }
  return tags;
}

/**
 * Head tags for auth / dashboard / transactional pages: a distinct title plus a hard
 * noindex,nofollow so these never enter the index. Content is client-only, but this meta
 * is still emitted in the SSR HTML so crawlers see the directive.
 */
export function noindexMeta({ title, description = '' } = {}) {
  const tags = [
    { title: title || SITE_NAME },
    { name: 'robots', content: 'noindex, nofollow' },
  ];
  if (description) tags.push({ name: 'description', content: description });
  return tags;
}

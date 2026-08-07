import { fetchDriverDirectory } from '../../src/services/driverDirectoryApi.js';
import { fetchVehicles } from '../../src/services/vehicleCatalogApi.js';
import { SITE_URL, isDriverIndexable, isVehicleIndexable } from '../lib/seo.js';

// Stable marketing/marketplace entry points.
const staticEntries = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/drivers', changefreq: 'daily', priority: '0.9' },
  { path: '/vehicles', changefreq: 'daily', priority: '0.9' },
  { path: '/trip-cost-calculator', changefreq: 'monthly', priority: '0.6' },
  { path: '/about', changefreq: 'monthly', priority: '0.5' },
  { path: '/contact', changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy-policy', changefreq: 'yearly', priority: '0.2' },
  { path: '/terms', changefreq: 'yearly', priority: '0.2' },
];

const iso = (value) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : undefined;
};

const urlTag = ({ path, lastmod, changefreq, priority }) => {
  const lines = [`    <loc>${SITE_URL}${path}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${lines.join('\n')}\n  </url>`;
};

// Resource route: no component, returns the XML directly.
export async function loader() {
  const [drivers, vehicles] = await Promise.all([
    fetchDriverDirectory().then((r) => r?.drivers || []).catch(() => []),
    fetchVehicles({}).then((r) => r?.vehicles || []).catch(() => []),
  ]);

  const entries = [...staticEntries];

  for (const driver of drivers) {
    if (!driver?.id || !isDriverIndexable(driver)) continue;
    entries.push({
      path: `/drivers/${driver.id}`,
      lastmod: iso(driver.updatedAt || driver.joinedAt),
      changefreq: 'weekly',
      priority: '0.8',
    });
  }
  for (const vehicle of vehicles) {
    if (!vehicle?.id || !isVehicleIndexable(vehicle)) continue;
    entries.push({
      path: `/vehicles/${vehicle.id}`,
      lastmod: iso(vehicle.updatedAt || vehicle.createdAt),
      changefreq: 'weekly',
      priority: '0.7',
    });
  }

  // One <urlset> holds up to 50,000 URLs — beyond current and foreseeable scale. If the
  // catalogue ever approaches that, split this into a sitemap index of paginated sitemaps.
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.map(urlTag).join('\n') +
    `\n</urlset>\n`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

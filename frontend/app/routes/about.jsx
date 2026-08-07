import { buildMeta } from '../lib/seo.js';

export function meta() {
  return buildMeta({
    title: "About Car with Driver LK | Private Drivers in Sri Lanka",
    description:
      "Car with Driver LK connects travellers with SLTDA-registered private drivers across Sri Lanka — transparent pricing, verified chauffeur-guides and direct booking.",
    path: "/about",
  });
}

export { default } from '../../src/pages/AboutPage.jsx';

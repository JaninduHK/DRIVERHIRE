import { buildMeta } from '../lib/seo.js';

export function meta() {
  return buildMeta({
    title: "Driver Guide | carwithdriver.lk",
    description:
      "How to register, get approved, complete your profile, send winning quotes, and get paid as a driver on carwithdriver.lk.",
    path: "/driver-guide",
  });
}

export { default } from '../../src/pages/DriverGuide.jsx';

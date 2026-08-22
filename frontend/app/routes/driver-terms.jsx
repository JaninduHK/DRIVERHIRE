import { buildMeta } from '../lib/seo.js';

export function meta() {
  return buildMeta({
    title: "Driver Terms & Conditions | carwithdriver.lk",
    description:
      "The terms every driver agrees to on carwithdriver.lk — eligibility, contact details, quotations, commission and the cancellation policy.",
    path: "/driver-terms",
  });
}

export { default } from '../../src/pages/DriverTermsConditions.jsx';

import { buildMeta } from '../lib/seo.js';

export function meta() {
  return buildMeta({
    title: "Terms & Conditions | Car with Driver LK",
    description:
      "The terms and conditions for using Car with Driver LK to book private drivers in Sri Lanka.",
    path: "/terms",
  });
}

export { default } from '../../src/pages/TermsConditions.jsx';

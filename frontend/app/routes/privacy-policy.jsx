import { buildMeta } from '../lib/seo.js';

export function meta() {
  return buildMeta({
    title: "Privacy Policy | Car with Driver LK",
    description:
      "How Car with Driver LK collects, uses and protects your personal information.",
    path: "/privacy-policy",
  });
}

export { default } from '../../src/pages/PrivacyPolicy.jsx';

import { buildMeta } from '../lib/seo.js';

export function meta() {
  return buildMeta({
    title: "Contact Car with Driver LK",
    description:
      "Get in touch with Car with Driver LK for help booking a private driver in Sri Lanka, partnership enquiries, or support with your trip.",
    path: "/contact",
  });
}

export { default } from '../../src/pages/ContactPage.jsx';

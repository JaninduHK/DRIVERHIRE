import { buildMeta } from '../lib/seo.js';

export function meta() {
  return buildMeta({
    title: 'Sri Lanka travel guides, written by local drivers | Car with Driver LK',
    description:
      'Sri Lanka travel guides from the drivers who actually drive the routes — trip costs, itineraries, road conditions and local advice from carwithdriver.lk.',
    path: '/blog',
  });
}

export { default } from '../../src/pages/BlogPage.jsx';

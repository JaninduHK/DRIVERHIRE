import { buildMeta } from '../lib/seo.js';

export function meta() {
  return buildMeta({
    title: "Sri Lanka Trip Cost Calculator | Car with Driver LK",
    description:
      "Estimate the cost of hiring a car with driver in Sri Lanka. Plan your route, days and vehicle type for a transparent daily-rate estimate before you book.",
    path: "/trip-cost-calculator",
  });
}

export { default } from '../../src/pages/TripCostCalculator.jsx';

import { useEffect, useState } from 'react';
import { fetchVehicleReviews } from '../services/vehicleCatalogApi.js';

const EMPTY_META = { total: 0, averageRating: null, counts: [0, 0, 0, 0, 0] };

// Drivers don't have a single "reviews" endpoint — reviews live per vehicle — so this
// fetches every vehicle's reviews and merges them into one driver-level list + rating
// breakdown. `seed` lets a route loader pass SSR-fetched data to skip the initial fetch.
export const useAggregatedDriverReviews = (vehicles, seed) => {
  const hasVehicles = Array.isArray(vehicles) && vehicles.length > 0;
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [state, setState] = useState(
    seed
      ? { loading: false, error: '', reviews: seed.reviews || [], meta: seed.meta || EMPTY_META }
      : { loading: hasVehicles, error: '', reviews: [], meta: EMPTY_META },
  );

  useEffect(() => {
    let active = true;
    if (!hasVehicles) {
      setState({ loading: false, error: '', reviews: [], meta: EMPTY_META });
      return () => { active = false; };
    }
    (async () => {
      setState((prev) => ({ ...prev, loading: prev.reviews.length === 0, error: '' }));
      try {
        const aggregated = [];
        const counts = [0, 0, 0, 0, 0];
        let sum = 0;
        for (const vehicle of vehicles) {
          if (!vehicle?.id) continue;
          const response = await fetchVehicleReviews(vehicle.id);
          (Array.isArray(response?.reviews) ? response.reviews : []).forEach((review) => {
            const r = Number(review.rating) || 0;
            aggregated.push({ ...review, vehicle: { id: vehicle.id, model: vehicle.model } });
            sum += r;
            const idx = Math.min(Math.max(Math.round(r), 1), 5) - 1;
            if (idx >= 0) counts[idx] += 1;
          });
        }
        if (!active) return;
        const total = aggregated.length;
        aggregated.sort((a, b) => {
          const ai = Array.isArray(a.images) && a.images.length ? 1 : 0;
          const bi = Array.isArray(b.images) && b.images.length ? 1 : 0;
          if (ai !== bi) return bi - ai;
          return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
        });
        setState({ loading: false, error: '', reviews: aggregated, meta: { total, averageRating: total ? Number((sum / total).toFixed(1)) : null, counts } });
      } catch (error) {
        if (active) setState((prev) => ({ loading: false, error: prev.reviews.length ? '' : (error?.message || 'Unable to load reviews.'), reviews: prev.reviews, meta: prev.meta }));
      }
    })();
    return () => { active = false; };
  }, [hasVehicles, vehicles, refreshIndex]);

  return { ...state, reload: () => setRefreshIndex((p) => p + 1) };
};

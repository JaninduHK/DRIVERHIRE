import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  Car,
  Loader2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Star,
  Users,
  UserRoundCheck,
} from 'lucide-react';
import { fetchDriverProfile } from '../services/driverDirectoryApi.js';
import { fetchVehicleReviews } from '../services/vehicleCatalogApi.js';

const formatCurrency = (value) => {
  if (!Number.isFinite(value)) {
    return '$0';
  }
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
  })}`;
};

const formatExperienceYears = (years) => {
  const numeric = Number(years);
  if (!Number.isFinite(numeric)) {
    return 'Experience not provided';
  }
  const normalized = Math.max(0, Math.round(numeric));
  if (normalized === 0) {
    return 'New to guiding';
  }
  return `${normalized} year${normalized === 1 ? '' : 's'} guiding`;
};

const DEFAULT_REVIEW_META = {
  total: 0,
  averageRating: null,
  countsByRating: [0, 0, 0, 0, 0],
};

const formatDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const DriverDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const loadProfile = useCallback(async () => {
    if (!id) {
      setState({ loading: false, error: 'Driver identifier missing.', data: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchDriverProfile(id);
      setState({ loading: false, error: '', data: response });
    } catch (error) {
      setState({
        loading: false,
        error: error?.message || 'Unable to load driver profile right now.',
        data: null,
      });
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const driver = state.data?.driver;
  const vehicles = state.data?.vehicles || [];
  const heroImage = driver?.featuredVehicle?.image || vehicles[0]?.image || null;
  const locationLabel = driver?.location?.label || driver?.address || 'Based in Sri Lanka';

  const vehicleHighlights = useMemo(() => {
    if (!vehicles.length) {
      return null;
    }
    const seatRange = vehicles.reduce(
      (acc, vehicle) => {
        const seats = vehicle.seats || 0;
        return {
          min: acc.min === null ? seats : Math.min(acc.min, seats),
          max: acc.max === null ? seats : Math.max(acc.max, seats),
        };
      },
      { min: null, max: null }
    );
    return {
      seatRange:
        seatRange.min === seatRange.max
          ? `${seatRange.min} seats`
          : `${seatRange.min}-${seatRange.max} seats`,
      lowestRate: formatCurrency(vehicles[0].pricePerDay),
    };
  }, [vehicles]);

  return (
    <section className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {state.loading ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-500" />
          Loading driver profile...
        </div>
      ) : state.error ? (
        <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          <p>{state.error}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadProfile}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
            >
              Retry
            </button>
            <Link
              to="/drivers"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
            >
              View all drivers
            </Link>
          </div>
        </div>
      ) : !driver ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Driver unavailable.
        </div>
      ) : (
        <>
          <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {heroImage ? (
              <div className="h-72 w-full overflow-hidden bg-slate-100">
                <img src={heroImage} alt={driver.name} className="h-full w-full object-cover" />
              </div>
            ) : null}
            <div className="space-y-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="space-y-2 lg:max-w-3xl">
              <div className="flex flex-wrap items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                  {driver.profilePhoto ? (
                    <img src={driver.profilePhoto} alt={driver.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-400">
                      <UserRoundCheck className="h-9 w-9" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold text-slate-900">{driver.name}</h1>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <BadgeCheck className="h-4 w-4" />
                      Approved driver
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    <MapPin className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
                    {locationLabel}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Star className="h-4 w-4 text-amber-500" />
                {driver.reviewScore ? `${driver.reviewScore.toFixed(1)} / 5` : 'No reviews yet'}
                <span className="text-xs font-normal text-slate-400">
                  ({driver.reviewCount ?? 0})
                </span>
              </div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {driver.description}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {driver.vehicleCount} vehicle{driver.vehicleCount === 1 ? '' : 's'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {formatExperienceYears(driver.experienceYears)}
                    </span>
                  </div>
                </div>
                <Link
                  to="/portal/driver/messages"
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-slate-700 lg:self-start"
                >
                  <MessageCircle className="h-4 w-4" />
                  Send message
                </Link>
              </div>

              {driver.badges?.length ? (
                <div className="flex flex-wrap gap-2">
                  {driver.badges.map((badge) => (
                    <span
                      key={badge}
                      className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}

              {vehicleHighlights ? (
                <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Seat range</p>
                    <p className="text-lg font-semibold text-slate-900">{vehicleHighlights.seatRange}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Lowest daily rate</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {vehicleHighlights.lowestRate}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Available vehicles</p>
                    <p className="text-lg font-semibold text-slate-900">{driver.vehicleCount}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </article>

          <DriverReviewsSection driver={driver} vehicles={vehicles} />

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Vehicles</h2>
                <p className="text-sm text-slate-500">
                  Fully vetted vehicles operated by {driver.name}. Click a vehicle to view more
                  details or start a booking.
                </p>
              </div>
              <Link
                to="/vehicles"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:text-slate-900"
              >
                Browse all vehicles
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            {vehicles.length === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center text-center text-sm text-slate-500">
                <Car className="mb-3 h-10 w-10 text-slate-300" />
                <p>No approved vehicles yet. Check back soon.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {vehicles.map((vehicle) => (
                  <VehicleCard key={vehicle.id} vehicle={vehicle} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
};

const VehicleCard = ({ vehicle }) => {
  const activeDiscount = vehicle.activeDiscount;
  const price = formatCurrency(
    typeof activeDiscount?.discountedPricePerDay === 'number'
      ? activeDiscount.discountedPricePerDay
      : vehicle.pricePerDay
  );
  const originalPrice =
    activeDiscount && typeof vehicle.pricePerDay === 'number'
      ? formatCurrency(vehicle.pricePerDay)
      : null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {vehicle.image ? (
        <img src={vehicle.image} alt={vehicle.model} className="h-48 w-full object-cover" />
      ) : (
        <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-400">
          <Car className="h-8 w-8" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">{vehicle.model}</h3>
            <div className="text-right text-sm font-semibold text-slate-900">
              {price}/day
              {originalPrice ? (
                <div className="text-xs font-medium text-slate-400 line-through">
                  {originalPrice}
                </div>
              ) : null}
            </div>
          </div>
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {vehicle.year} • {vehicle.seats || 0} seats
          </p>
          {activeDiscount?.discountPercent ? (
            <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              Save {activeDiscount.discountPercent}% this trip
            </div>
          ) : null}
        </div>
        <p className="line-clamp-3 text-sm text-slate-600">{vehicle.description}</p>
        {vehicle.features?.length ? (
          <div className="flex flex-wrap gap-2">
            {vehicle.features.slice(0, 4).map((feature) => (
              <span
                key={feature}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {feature}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs text-slate-500">
            {vehicle.availability?.length
              ? `${vehicle.availability.length} availability block${
                  vehicle.availability.length === 1 ? '' : 's'
                }`
              : 'Availability on request'}
          </span>
          <Link
            to={`/vehicles/${vehicle.id}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            View vehicle
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
};

const DriverReviewsSection = ({ driver, vehicles }) => {
  const [reviewFilters, setReviewFilters] = useState({ rating: 'all', sort: 'recent' });
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [reviewsState, setReviewsState] = useState(() => ({
    loading: Array.isArray(vehicles) && vehicles.length > 0,
    error: '',
    reviews: [],
    meta: DEFAULT_REVIEW_META,
  }));

  const driverName = driver?.name || 'this driver';
  const firstName = driverName.split(' ')[0] || 'this driver';
  const hasVehicles = Array.isArray(vehicles) && vehicles.length > 0;

  useEffect(() => {
    let active = true;

    if (!hasVehicles) {
      setReviewsState({
        loading: false,
        error: '',
        reviews: [],
        meta: DEFAULT_REVIEW_META,
      });
      return () => {
        active = false;
      };
    }

    const loadReviews = async () => {
      setReviewsState((prev) => ({ ...prev, loading: true, error: '' }));

      try {
        const aggregated = [];
        const counts = [0, 0, 0, 0, 0];
        let ratingSum = 0;

        for (const vehicle of vehicles) {
          if (!vehicle?.id) {
            continue;
          }
          const response = await fetchVehicleReviews(vehicle.id);
          const reviewList = Array.isArray(response?.reviews) ? response.reviews : [];

          reviewList.forEach((review) => {
            const ratingValue = Number(review.rating) || 0;
            aggregated.push({
              ...review,
              vehicle: {
                id: vehicle.id,
                model: vehicle.model,
              },
            });
            ratingSum += ratingValue;
            const ratingIndex = Math.min(Math.max(Math.round(ratingValue), 1), 5) - 1;
            if (ratingIndex >= 0 && ratingIndex < counts.length) {
              counts[ratingIndex] += 1;
            }
          });
        }

        const total = aggregated.length;
        const averageRating = total > 0 ? Number((ratingSum / total).toFixed(2)) : null;

        if (!active) {
          return;
        }

        setReviewsState({
          loading: false,
          error: '',
          reviews: aggregated,
          meta: {
            total,
            averageRating,
            countsByRating: counts,
          },
        });
      } catch (error) {
        if (!active) {
          return;
        }
        setReviewsState({
          loading: false,
          error: error?.message || 'Unable to load reviews right now.',
          reviews: [],
          meta: DEFAULT_REVIEW_META,
        });
      }
    };

    loadReviews();

    return () => {
      active = false;
    };
  }, [hasVehicles, vehicles, refreshIndex]);

  const reviewMeta = reviewsState.meta;
  const ratingCounts = Array.isArray(reviewMeta.countsByRating)
    ? reviewMeta.countsByRating
    : [0, 0, 0, 0, 0];

  const ratingOptions = [
    { value: 'all', label: 'All', count: reviewMeta.total ?? 0 },
    { value: '5', label: '5★', count: ratingCounts[4] ?? 0 },
    { value: '4', label: '4★', count: ratingCounts[3] ?? 0 },
    { value: '3', label: '3★', count: ratingCounts[2] ?? 0 },
    { value: '2', label: '2★', count: ratingCounts[1] ?? 0 },
    { value: '1', label: '1★', count: ratingCounts[0] ?? 0 },
  ];

  const filteredReviews = useMemo(() => {
    let items = reviewsState.reviews;

    if (reviewFilters.rating !== 'all') {
      const ratingValue = Number(reviewFilters.rating);
      items = items.filter((review) => Math.round(Number(review.rating) || 0) === ratingValue);
    }

    const sorted = [...items];
    const getTimestamp = (value) => {
      if (!value) return 0;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
    };

    sorted.sort((a, b) => {
      const ratingA = Number(a.rating) || 0;
      const ratingB = Number(b.rating) || 0;
      switch (reviewFilters.sort) {
        case 'ratingDesc':
          return ratingB - ratingA;
        case 'ratingAsc':
          return ratingA - ratingB;
        case 'oldest':
          return getTimestamp(a.publishedAt) - getTimestamp(b.publishedAt);
        case 'recent':
        default:
          return getTimestamp(b.publishedAt) - getTimestamp(a.publishedAt);
      }
    });

    return sorted;
  }, [reviewsState.reviews, reviewFilters]);

  const averageRatingLabel =
    typeof reviewMeta.averageRating === 'number' ? reviewMeta.averageRating.toFixed(1) : '—';

  const reviewsLoading = reviewsState.loading;
  const reviewsError = reviewsState.error;
  const reviews = filteredReviews;

  const handleReviewRatingFilter = (value) => {
    setReviewFilters((prev) => (prev.rating === value ? prev : { ...prev, rating: value }));
  };

  const handleReviewSortChange = (value) => {
    setReviewFilters((prev) => ({ ...prev, sort: value }));
  };

  const handleReviewReload = () => {
    setRefreshIndex((prev) => prev + 1);
  };

  if (!driver) {
    return null;
  }

  if (!hasVehicles) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-600">
          {driverName} hasn’t published any vehicles yet, so traveller reviews will appear once
          their first itinerary is completed.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Traveller reviews</h2>
          <p className="text-sm text-slate-500">
            {reviewMeta.total > 0
              ? `Based on ${reviewMeta.total} trip${reviewMeta.total === 1 ? '' : 's'} with ${firstName}.`
              : `Be the first to share your journey with ${firstName}.`}
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-2">
          <Star className="h-5 w-5 text-amber-500" />
          <div className="text-sm font-semibold text-slate-900">{averageRatingLabel}</div>
          <span className="text-xs font-normal text-slate-500">
            {reviewMeta.total > 0 ? '/ 5' : 'No ratings yet'}
          </span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {ratingOptions.map((option) => {
            const isActive = reviewFilters.rating === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleReviewRatingFilter(option.value)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`min-w-[2rem] rounded-full px-2 py-0.5 text-xs ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <label
            htmlFor="driver-review-sort"
            className="text-xs font-semibold uppercase tracking-wide text-slate-500"
          >
            Sort by
          </label>
          <select
            id="driver-review-sort"
            value={reviewFilters.sort}
            onChange={(event) => handleReviewSortChange(event.target.value)}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="recent">Newest</option>
            <option value="ratingDesc">Highest rated</option>
            <option value="ratingAsc">Lowest rated</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {reviewsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`driver-review-skeleton-${index}`}
                className="animate-pulse space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="h-4 w-1/3 rounded-full bg-slate-200" />
                <div className="h-5 w-2/3 rounded-full bg-slate-200" />
                <div className="h-16 rounded-2xl bg-slate-200" />
              </div>
            ))}
          </div>
        ) : reviewsError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            <p>{reviewsError}</p>
            <button
              type="button"
              onClick={handleReviewReload}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
            >
              Try again
            </button>
          </div>
        ) : reviewMeta.total === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            No reviews yet. Be the first to explore Sri Lanka with {firstName} and share your story.
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            No reviews matched your current filters. Try a different rating or sort order.
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const publishedLabel = formatDate(review.publishedAt);
              const travelStart = formatDate(review.visitedStartDate);
              const travelEnd = formatDate(review.visitedEndDate);
              const travelerName = review.travelerName || 'Traveller';
              const travelerInitial = travelerName ? travelerName.charAt(0).toUpperCase() : 'T';
              const vehicleLabel = review.vehicle?.model;
              return (
                <article
                  key={review.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {travelerInitial}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{travelerName}</p>
                        <p className="text-xs text-slate-500">
                          {travelStart && travelEnd
                            ? `Travelled ${travelStart} – ${travelEnd}`
                            : 'Travel dates not shared'}
                        </p>
                        {vehicleLabel ? (
                          <p className="text-xs text-slate-400">Vehicle: {vehicleLabel}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-amber-500">
                      <Star className="h-4 w-4" fill="currentColor" />
                      <span className="text-sm font-semibold">{review.rating}/5</span>
                      {publishedLabel ? (
                        <span className="text-xs text-slate-400">Published {publishedLabel}</span>
                      ) : null}
                    </div>
                  </div>
                  {review.title ? (
                    <h3 className="mt-3 text-base font-semibold text-slate-900">{review.title}</h3>
                  ) : null}
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {review.comment}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default DriverDetails;

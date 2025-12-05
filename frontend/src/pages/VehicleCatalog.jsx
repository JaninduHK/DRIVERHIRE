import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Filter, RefreshCw, Search, Star } from 'lucide-react';
import { fetchVehicles } from '../services/vehicleCatalogApi.js';

const defaultFilters = {
  search: '',
  minPrice: '',
  maxPrice: '',
  minSeats: '',
  location: '',
  minRating: '',
  startDate: '',
  endDate: '',
  sort: 'recent',
};

const parseFiltersFromSearch = (search) => {
  const params = new URLSearchParams(search);
  const filters = { ...defaultFilters };

  Object.keys(defaultFilters).forEach((key) => {
    const value = params.get(key);
    if (value !== null) {
      filters[key] = value;
    }
  });

  return filters;
};

const cleanFilters = (filters) => {
  const payload = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    const trimmed = typeof value === 'string' ? value.trim() : value;
    if (trimmed === '') {
      return;
    }
    payload[key] = trimmed;
  });
  if ((payload.startDate && !payload.endDate) || (!payload.startDate && payload.endDate)) {
    delete payload.startDate;
    delete payload.endDate;
  }
  return payload;
};

const formatPrice = (value) => {
  if (typeof value !== 'number') {
    return null;
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const VehicleCatalog = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialFilters = useMemo(
    () => parseFiltersFromSearch(location.search),
    [location.search]
  );

  const [formState, setFormState] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [state, setState] = useState({
    items: [],
    loading: true,
    error: '',
  });

  useEffect(() => {
    setFormState(initialFilters);
    setAppliedFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    let cancelled = false;

    setState((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));

    const activeFilters = cleanFilters(appliedFilters);

    fetchVehicles(activeFilters)
      .then(({ vehicles }) => {
        if (cancelled) {
          return;
        }
        setState({
          items: Array.isArray(vehicles) ? vehicles : [],
          loading: false,
          error: '',
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setState({
          items: [],
          loading: false,
          error: error?.message || 'Unable to load vehicles.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [appliedFilters, refreshIndex]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const activeFilters = cleanFilters(formState);
    const params = new URLSearchParams(activeFilters);
    navigate({
      pathname: location.pathname,
      search: params.toString() ? `?${params.toString()}` : '',
    });
    setMobileFiltersOpen(false);
  };

  const handleReset = () => {
    navigate({
      pathname: location.pathname,
      search: '',
    });
  };

  const handleRetry = () => {
    setRefreshIndex((prev) => prev + 1);
  };

  const { items: vehicles, loading, error } = state;
  const activeCount = vehicles.length;

  const resultSummary = loading
    ? 'Loading vehicles…'
    : activeCount === 0
      ? 'No vehicles match your filters yet.'
      : activeCount === 1
        ? 'Showing 1 vehicle'
        : `Showing ${activeCount} vehicles`;

  const ratingOptions = [
    { value: '', label: 'Any rating' },
    { value: '4.5', label: '4.5+' },
    { value: '4', label: '4.0+' },
    { value: '3.5', label: '3.5+' },
    { value: '3', label: '3.0+' },
  ];

  return (
    <section className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Find your ride
        </h1>
        <p className="max-w-3xl text-sm text-slate-500 sm:text-base">
          Filter by budget, seating, location, reviews, and travel dates to discover the vehicle that fits your trip.
        </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 lg:hidden"
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </header>

      <div className="space-y-6 lg:grid lg:grid-cols-[320px_1fr] lg:items-start lg:gap-8">
        <aside
          className={`lg:sticky lg:top-24 ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}
        >
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid gap-4 lg:grid-cols-1">
                <div>
                  <label htmlFor="vehicle-search" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Search
                  </label>
                  <div className="relative mt-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="vehicle-search"
                      name="search"
                      value={formState.search}
                      onChange={handleInputChange}
                      placeholder="Model or driver name"
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      autoComplete="off"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="vehicle-location" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Location
                  </label>
                  <input
                    id="vehicle-location"
                    name="location"
                    value={formState.location}
                    onChange={handleInputChange}
                    placeholder="City or region"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="vehicle-startDate" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Start date
                  </label>
                  <input
                    id="vehicle-startDate"
                    name="startDate"
                    type="date"
                    value={formState.startDate}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label htmlFor="vehicle-endDate" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    End date
                  </label>
                  <input
                    id="vehicle-endDate"
                    name="endDate"
                    type="date"
                    value={formState.endDate}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label htmlFor="vehicle-minPrice" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Min price ($)
                  </label>
                  <input
                    id="vehicle-minPrice"
                  name="minPrice"
                  type="number"
                    min={0}
                    value={formState.minPrice}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label htmlFor="vehicle-maxPrice" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Max price ($)
                  </label>
                  <input
                    id="vehicle-maxPrice"
                  name="maxPrice"
                  type="number"
                    min={0}
                    value={formState.maxPrice}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label htmlFor="vehicle-minSeats" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Min seats
                  </label>
                  <input
                    id="vehicle-minSeats"
                  name="minSeats"
                  type="number"
                    min={1}
                    value={formState.minSeats}
                    onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>

                <div>
                  <label htmlFor="vehicle-minRating" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Rating
                  </label>
                  <select
                    id="vehicle-minRating"
                  name="minRating"
                  value={formState.minRating}
                  onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    {ratingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="vehicle-sort" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sort by
                  </label>
                  <select
                    id="vehicle-sort"
                  name="sort"
                  value={formState.sort}
                  onChange={handleInputChange}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="recent">Newest first</option>
                    <option value="priceAsc">Price: Low to High</option>
                    <option value="priceDesc">Price: High to Low</option>
                    <option value="seatsDesc">Seats: High to Low</option>
                    <option value="yearDesc">Year: Newest</option>
                  </select>
                </div>
              </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                disabled={loading}
              >
                Show results
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>
            </div>
          </form>
          </div>
        </aside>

        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
            <span>{error ? 'Unable to load vehicles.' : resultSummary}</span>
            {!loading && !error && (
              <span>
                {appliedFilters.startDate && appliedFilters.endDate
                  ? `Travel window: ${appliedFilters.startDate} – ${appliedFilters.endDate}`
                  : null}
              </span>
            )}
          </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`vehicle-skeleton-${index}`}
                className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white/80 shadow-sm"
              >
                <div className="aspect-[4/3] bg-slate-100" />
                <div className="space-y-3 p-5">
                  <div className="h-4 w-2/3 rounded-full bg-slate-100" />
                  <div className="h-4 w-1/3 rounded-full bg-slate-100" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Unable to load vehicles</h2>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </div>
        ) : vehicles.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-sm text-slate-600">
            No vehicles match your filters yet. Adjust the search criteria or check back soon as new
            listings are added regularly.
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {vehicles.map((vehicle) => {
              const coverImage =
                (Array.isArray(vehicle.images) && vehicle.images[0]) ||
                'https://opel.autogermany.com.sg/choose-your-vehicle-test-drive.jpg.webp';
              const price = formatPrice(vehicle.pricePerDay);
              const reviewSummary = vehicle.reviewSummary || {};
              const reviewCount = reviewSummary.totalReviews ?? 0;
              const hasReviews = reviewCount > 0 && typeof reviewSummary.averageRating === 'number';
              const averageRating = hasReviews
                ? reviewSummary.averageRating.toFixed(1)
                : null;
              return (
                <Link
                  key={vehicle.id}
                  to={`/vehicles/${vehicle.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white/95 shadow-lg transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={coverImage}
                      alt={`${vehicle.model} cover`}
                      className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-6">
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-slate-900">{vehicle.model}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="font-medium text-emerald-700">
                          {price ? `From ${price}` : 'Rate on request'}
                        </span>
                        <span>•</span>
                        <span>{vehicle.seats ? `${vehicle.seats} Seats` : 'Seats on request'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        {hasReviews ? (
                          <>
                            <Star className="h-4 w-4 text-emerald-500" fill="currentColor" />
                            <span className="font-semibold text-slate-900">
                              {averageRating} / 5
                            </span>
                            <span className="text-xs text-slate-400">
                              from {reviewCount} review{reviewCount === 1 ? '' : 's'}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs uppercase tracking-wide text-slate-400">
                            No reviews yet
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto text-xs  tracking-wide text-slate-400">
                      By <span className="font-semibold text-slate-700 normal-case">{vehicle.driver?.name ?? 'Approved driver'}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </section>
  );
};

export default VehicleCatalog;

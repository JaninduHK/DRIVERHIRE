import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Car,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { fetchDriverDirectory } from '../services/driverDirectoryApi.js';

const formatCurrency = (value) => {
  if (!Number.isFinite(value)) {
    return '$0';
  }
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

const formatYears = (years) => {
  if (!Number.isFinite(years)) {
    return '1 year';
  }
  return `${years} year${years === 1 ? '' : 's'}`;
};

const sortOptions = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'experience_desc', label: 'Experience (high to low)' },
  { value: 'price_asc', label: 'Price (low to high)' },
  { value: 'price_desc', label: 'Price (high to low)' },
  { value: 'reviews_desc', label: 'Reviews (best first)' },
];

const DriversDirectory = () => {
  const [state, setState] = useState({ loading: true, error: '', drivers: [] });
  const [filters, setFilters] = useState({
    search: '',
    sort: 'recommended',
    englishOnly: false,
    minPrice: '',
    maxPrice: '',
    minReview: '',
  });

  const loadDrivers = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchDriverDirectory();
      setState({ loading: false, error: '', drivers: response?.drivers || [] });
    } catch (error) {
      setState({
        loading: false,
        error: error?.message || 'Unable to load drivers right now.',
        drivers: [],
      });
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  const filteredDrivers = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const minPrice = Number(filters.minPrice);
    const maxPrice = Number(filters.maxPrice);
    const minReview = Number(filters.minReview);

    const matchesSearch = (driver) => {
      if (!term) return true;
      const haystack = [driver.name, driver.description, ...(driver.badges || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    };

    const matchesEnglish = (driver) => !filters.englishOnly || driver.hasEnglishDriver;

    const matchesPrice = (driver) => {
      const price = Number(driver.averagePricePerDay) || 0;
      if (filters.minPrice !== '' && Number.isFinite(minPrice) && price < minPrice) return false;
      if (filters.maxPrice !== '' && Number.isFinite(maxPrice) && price > maxPrice) return false;
      return true;
    };

    const matchesReview = (driver) => {
      if (filters.minReview === '') return true;
      const score = Number(driver.reviewScore) || 0;
      return score >= minReview;
    };

    const sortFn = (a, b) => {
      switch (filters.sort) {
        case 'experience_desc':
          return (b.experienceYears || 0) - (a.experienceYears || 0);
        case 'price_asc':
          return (a.averagePricePerDay || Infinity) - (b.averagePricePerDay || Infinity);
        case 'price_desc':
          return (b.averagePricePerDay || 0) - (a.averagePricePerDay || 0);
        case 'reviews_desc':
          return (b.reviewScore || 0) - (a.reviewScore || 0);
        default:
          return (b.badges?.length || 0) - (a.badges?.length || 0);
      }
    };

    return [...state.drivers]
      .filter(
        (driver) =>
          matchesSearch(driver) &&
          matchesEnglish(driver) &&
          matchesPrice(driver) &&
          matchesReview(driver)
      )
      .sort(sortFn);
  }, [filters, state.drivers]);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Driver directory
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">Find your perfect driver</h1>
          <p className="text-sm text-slate-600">
            Fine-tune the filters to search by speciality, language, price, and reviews. Every
            profile is vetted by the Car With Driver team.
          </p>
        </div>

        <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex flex-1 items-center rounded-full border border-slate-300 bg-white px-4 py-2 shadow-sm focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20">
              <Search className="mr-3 h-4 w-4 text-slate-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, search: event.target.value }))
                }
                placeholder="Search by name, perk, or destination"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <select
                value={filters.sort}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, sort: event.target.value }))
                }
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={filters.englishOnly}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, englishOnly: event.target.checked }))
                }
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              English speaking only
            </label>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              <span className="text-xs uppercase tracking-wide text-slate-400">Min price</span>
              <input
                type="number"
                min="0"
                value={filters.minPrice}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, minPrice: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="$"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              <span className="text-xs uppercase tracking-wide text-slate-400">Max price</span>
              <input
                type="number"
                min="0"
                value={filters.maxPrice}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="$"
              />
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
              <span className="text-xs uppercase tracking-wide text-slate-400">Min reviews</span>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={filters.minReview}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, minReview: event.target.value }))
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="4.5+"
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Showing {filteredDrivers.length} of {state.drivers.length} approved drivers
          </p>
        </div>
      </div>

      {state.loading ? (
        <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-emerald-500" />
          Loading drivers...
        </div>
      ) : state.error ? (
        <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          <p>{state.error}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadDrivers}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
            >
              Try again
            </button>
          </div>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
          <Car className="mb-3 h-10 w-10 text-slate-300" />
          <p>No drivers match your search. Try a different keyword.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredDrivers.map((driver) => (
            <DriverCard key={driver.id} driver={driver} />
          ))}
        </div>
      )}
    </section>
  );
};

const DriverCard = ({ driver }) => {
  const { featuredVehicle } = driver;
  return (
    <Link
      to={`/drivers/${driver.id}`}
      role="article"
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
    >
      {featuredVehicle?.image ? (
        <div className="h-56 w-full overflow-hidden bg-slate-100">
          <img
            src={featuredVehicle.image}
            alt={featuredVehicle.model}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        </div>
      ) : (
        <div className="flex h-56 w-full items-center justify-center bg-slate-100 text-slate-400">
          <Car className="h-10 w-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-900">{driver.name}</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
              <BadgeCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
            <Star className="h-4 w-4 text-amber-500" />
            {driver.reviewScore ? `${driver.reviewScore.toFixed(1)} / 5` : 'No reviews yet'}
            <span className="text-xs font-normal text-slate-400">
              ({driver.reviewCount ?? 0})
            </span>
          </div>
          <p className="line-clamp-3 text-sm text-slate-600">{driver.description}</p>
        </div>
        {driver.badges?.length ? (
          <div className="flex flex-wrap gap-2">
            {driver.badges.slice(0, 4).map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                {badge}
              </span>
            ))}
            {driver.badges.length > 4 ? (
              <span className="text-xs text-slate-500">+{driver.badges.length - 4} more</span>
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-3 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Experience</p>
            <p className="font-semibold text-slate-900">{formatYears(driver.experienceYears)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Vehicles</p>
            <p className="font-semibold text-slate-900">{driver.vehicleCount || 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400">Avg. rate</p>
            <p className="font-semibold text-slate-900">
              {driver.averagePricePerDay ? formatCurrency(driver.averagePricePerDay) : '$—'}
            </p>
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="text-xs text-slate-500">
            <MapPin className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
            {driver.address || 'Based in Sri Lanka'}
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition group-hover:border-emerald-300 group-hover:text-emerald-700">
            View profile
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default DriversDirectory;

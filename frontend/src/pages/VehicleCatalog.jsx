import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Car, Check, ChevronDown, RefreshCw, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { fetchVehicles } from '../services/vehicleCatalogApi.js';
import { getVehicleFeatureLabels } from '../constants/vehicleFeatures.js';

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
    if (value !== null) filters[key] = value;
  });
  return filters;
};

const cleanFilters = (filters) => {
  const payload = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const trimmed = typeof value === 'string' ? value.trim() : value;
    if (trimmed === '' || (key === 'sort' && trimmed === 'recent')) return;
    payload[key] = trimmed;
  });
  if ((payload.startDate && !payload.endDate) || (!payload.startDate && payload.endDate)) {
    delete payload.startDate;
    delete payload.endDate;
  }
  return payload;
};

const formatPrice = (value) => (typeof value !== 'number' ? null : `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`);

const shortDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const SEAT_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '2', label: '2+' },
  { value: '3', label: '3+' },
  { value: '4', label: '4+' },
  { value: '6', label: '6+' },
];
const BUDGET_PRESETS = [
  { label: 'Any', min: '', max: '' },
  { label: 'Under $40', min: '', max: '40' },
  { label: '$40 – $60', min: '40', max: '60' },
  { label: '$60+', min: '60', max: '' },
];
const RATING_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '4', label: '4.0★ +' },
  { value: '4.5', label: '4.5★ +' },
];
const SORT_OPTIONS = [
  { value: 'recent', label: 'Recommended' },
  { value: 'priceAsc', label: 'Price: low to high' },
  { value: 'priceDesc', label: 'Price: high to low' },
  { value: 'ratingDesc', label: 'Top rated' },
];

const VehicleCatalog = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const initialFilters = useMemo(() => parseFiltersFromSearch(location.search), [location.search]);

  const [formState, setFormState] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [state, setState] = useState({ items: [], loading: true, error: '' });

  useEffect(() => {
    setFormState(initialFilters);
    setAppliedFilters(initialFilters);
  }, [initialFilters]);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    fetchVehicles(cleanFilters(appliedFilters))
      .then(({ vehicles }) => {
        if (cancelled) return;
        setState({ items: Array.isArray(vehicles) ? vehicles : [], loading: false, error: '' });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ items: [], loading: false, error: error?.message || 'Unable to load vehicles.' });
      });
    return () => {
      cancelled = true;
    };
  }, [appliedFilters, refreshIndex]);

  const applyFilters = (next) => {
    const params = new URLSearchParams(cleanFilters(next));
    navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : '' });
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    applyFilters(formState);
  };

  const openSheet = () => {
    setFormState(appliedFilters);
    setSheetOpen(true);
  };
  const applySheet = () => {
    applyFilters(formState);
    setSheetOpen(false);
  };

  const { items, loading, error } = state;
  const vehicles = useMemo(() => {
    if (appliedFilters.sort !== 'ratingDesc') return items;
    return [...items].sort(
      (a, b) => (b.reviewSummary?.averageRating || 0) - (a.reviewSummary?.averageRating || 0)
    );
  }, [items, appliedFilters.sort]);

  const datesActive = Boolean(appliedFilters.startDate && appliedFilters.endDate);
  const priceActive = Boolean(appliedFilters.minPrice || appliedFilters.maxPrice);
  const activeCount =
    (datesActive ? 1 : 0) +
    (appliedFilters.minSeats ? 1 : 0) +
    (priceActive ? 1 : 0) +
    (appliedFilters.minRating ? 1 : 0) +
    (appliedFilters.search ? 1 : 0);
  const hasAnyFilter = activeCount > 0 || appliedFilters.location || appliedFilters.sort !== 'recent';
  const priceChipLabel = priceActive
    ? `$${appliedFilters.minPrice || '0'}${appliedFilters.maxPrice ? `–$${appliedFilters.maxPrice}` : '+'}`
    : 'Price';

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      {/* Sticky search + chips */}
      <div className="sticky top-0 z-20 border-b border-hairline bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-2.5 pt-3 sm:px-6">
          <h1 className="mb-2.5 text-[21px] font-extrabold tracking-tight text-ink lg:text-[26px]">Find your ride</h1>
          <div className="flex gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
              <input
                value={formState.search}
                onChange={(e) => setFormState((p) => ({ ...p, search: e.target.value }))}
                placeholder="Model, driver or city"
                className="h-[46px] w-full min-w-0 rounded-[14px] border-[1.5px] border-[#e2e8ea] bg-white pl-10 pr-3 text-[13.5px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
              />
            </form>
            <button
              type="button"
              onClick={openSheet}
              aria-label="Filters"
              className="relative grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-[14px] bg-ink text-white"
            >
              <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.8} />
              {activeCount > 0 ? (
                <span className="absolute -right-1.5 -top-1.5 grid min-w-[19px] place-items-center rounded-full border-2 border-white bg-brand px-1 text-[11px] font-extrabold text-white">
                  {activeCount}
                </span>
              ) : null}
            </button>
          </div>
          <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
            {datesActive ? (
              <ActiveChip onClear={() => applyFilters({ ...appliedFilters, startDate: '', endDate: '' })}>
                {shortDate(appliedFilters.startDate)} – {shortDate(appliedFilters.endDate)}
              </ActiveChip>
            ) : (
              <ChevronChip onClick={openSheet}>Dates</ChevronChip>
            )}
            {appliedFilters.minSeats ? (
              <ActiveChip onClear={() => applyFilters({ ...appliedFilters, minSeats: '' })}>
                {appliedFilters.minSeats}+ seats
              </ActiveChip>
            ) : (
              <ChevronChip onClick={openSheet}>Seats</ChevronChip>
            )}
            {priceActive ? (
              <ActiveChip onClear={() => applyFilters({ ...appliedFilters, minPrice: '', maxPrice: '' })}>
                {priceChipLabel}
              </ActiveChip>
            ) : (
              <ChevronChip onClick={openSheet}>Price</ChevronChip>
            )}
            {appliedFilters.minRating ? (
              <ActiveChip onClear={() => applyFilters({ ...appliedFilters, minRating: '' })}>
                {appliedFilters.minRating}★ +
              </ActiveChip>
            ) : (
              <ChevronChip onClick={openSheet}>Rating</ChevronChip>
            )}
            <ChevronChip onClick={openSheet}>Sort</ChevronChip>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-extrabold uppercase tracking-[0.05em] text-muted-soft">
            {loading ? 'Loading…' : `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'}`}
          </span>
          {hasAnyFilter ? (
            <button type="button" onClick={() => applyFilters(defaultFilters)} className="text-[12.5px] font-bold text-brand-dark">
              Clear filters
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse overflow-hidden rounded-[18px] bg-white shadow-card">
                <div className="h-[150px] bg-hairline" />
                <div className="space-y-3 p-[14px]">
                  <div className="h-4 w-2/3 rounded-full bg-hairline" />
                  <div className="h-3 w-1/2 rounded-full bg-hairline" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[18px] bg-white p-8 text-center shadow-card">
            <h2 className="text-[16px] font-extrabold text-ink">Unable to load vehicles</h2>
            <p className="mt-2 text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setRefreshIndex((p) => p + 1)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="rounded-[18px] bg-white p-10 text-center text-sm text-muted shadow-card">
            <b className="mb-1 block text-ink">No vehicles match your filters yet</b>
            Adjust your search or check back soon — new listings are added regularly.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </div>

      {sheetOpen ? (
        <VehicleFilterSheet
          draft={formState}
          setDraft={setFormState}
          count={vehicles.length}
          onApply={applySheet}
          onReset={() => setFormState(defaultFilters)}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}
    </div>
  );
};

const ActiveChip = ({ children, onClear }) => (
  <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-brand px-[13px] py-[9px] text-[13px] font-bold text-white">
    {children}
    <button type="button" onClick={onClear} aria-label="Clear" className="grid place-items-center">
      <X className="h-[11px] w-[11px]" strokeWidth={2.5} />
    </button>
  </span>
);

const ChevronChip = ({ children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex flex-shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-[#e2e8ea] bg-white px-[13px] py-2 text-[13px] font-semibold text-ink-soft transition hover:border-muted-soft"
  >
    {children}
    <ChevronDown className="h-3.5 w-3.5 text-muted-soft" />
  </button>
);

const VehicleCard = ({ vehicle }) => {
  const cover = Array.isArray(vehicle.images) ? vehicle.images[0] : null;
  const discount = vehicle.activeDiscount;
  const price = formatPrice(
    typeof discount?.discountedPricePerDay === 'number' ? discount.discountedPricePerDay : vehicle.pricePerDay
  );
  const reviews = vehicle.reviewSummary || {};
  const hasReviews = (reviews.totalReviews ?? 0) > 0 && typeof reviews.averageRating === 'number';
  const features = getVehicleFeatureLabels(vehicle).slice(0, 2);
  const cityLabel = vehicle.location || vehicle.driver?.location?.label || vehicle.driver?.address || '';
  const meta = [vehicle.seats ? `${vehicle.seats} seats` : null, vehicle.year, cityLabel].filter(Boolean).join(' · ');

  return (
    <Link to={`/vehicles/${vehicle.id}`} className="block overflow-hidden rounded-[18px] bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      {cover ? (
        <img src={cover} alt={vehicle.model} loading="lazy" className="h-[170px] w-full object-cover" />
      ) : (
        <div className="grid h-[170px] w-full place-items-center bg-[#eef1f0] text-muted-soft">
          <Car className="h-9 w-9" />
        </div>
      )}
      <div className="p-[14px]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <b className="block truncate text-[16px] text-ink">{vehicle.model}</b>
            <div className="mt-0.5 truncate text-[12.5px] text-muted-soft">{meta || 'Vehicle'}</div>
          </div>
          <div className="flex-shrink-0 text-right">
            <b className="text-[16px] text-ink">{price || '—'}</b>
            <div className="text-[11.5px] text-muted-soft">per day</div>
          </div>
        </div>
        {features.length > 0 || hasReviews ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {features.map((f) => (
              <span key={f} className="rounded-full bg-[#eef1f0] px-3 py-1.5 text-[11.5px] font-semibold text-ink-soft">
                {f}
              </span>
            ))}
            {hasReviews ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eef1f0] px-3 py-1.5 text-[11.5px] font-semibold text-ink-soft">
                {reviews.averageRating.toFixed(1)}
                <Star className="h-3 w-3" fill="#f5b042" stroke="none" />
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between border-t border-hairline pt-3">
          <span className="truncate text-[12.5px] text-muted-soft">
            By <b className="text-ink">{vehicle.driver?.name ?? 'Approved driver'}</b>
          </span>
          <span className="flex-shrink-0 rounded-full bg-brand px-4 py-2 text-[12.5px] font-bold text-white">View</span>
        </div>
      </div>
    </Link>
  );
};

const SheetSection = ({ label, children, className = '' }) => (
  <div className={className}>
    <div className="text-[12px] font-extrabold uppercase tracking-[0.05em] text-muted-soft">{label}</div>
    {children}
  </div>
);

const VehicleFilterSheet = ({ draft, setDraft, count, onApply, onReset, onClose }) => {
  const set = (patch) => setDraft((p) => ({ ...p, ...patch }));
  const budgetActive = (min, max) => (draft.minPrice || '') === min && (draft.maxPrice || '') === max;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} aria-hidden="true" />
      <div className="relative flex max-h-[88vh] w-full max-w-[480px] flex-col rounded-t-[26px] bg-white shadow-drawer">
        <div className="grid place-items-center pt-2.5">
          <div className="h-1.5 w-11 rounded-full bg-[#e2e8ea]" />
        </div>
        <div className="flex items-center justify-between px-[18px] py-3">
          <b className="text-[18px] text-ink">Filters</b>
          <button type="button" onClick={onReset} className="text-[13px] font-bold text-brand-dark">Clear all</button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-[18px] pb-3.5">
          <SheetSection label="Trip dates">
            <div className="mt-2.5 flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className="text-[10.5px] font-bold text-muted-soft">Start</label>
                <input type="date" value={draft.startDate} onChange={(e) => set({ startDate: e.target.value })} className="mt-1 h-11 w-full min-w-0 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-2.5 text-[13px] font-semibold text-ink focus:border-brand focus:outline-none" />
              </div>
              <div className="min-w-0 flex-1">
                <label className="text-[10.5px] font-bold text-muted-soft">End</label>
                <input type="date" value={draft.endDate} onChange={(e) => set({ endDate: e.target.value })} className="mt-1 h-11 w-full min-w-0 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-2.5 text-[13px] font-semibold text-ink focus:border-brand focus:outline-none" />
              </div>
            </div>
          </SheetSection>

          <SheetSection label="Seats">
            <div className="mt-2.5 flex gap-1.5 rounded-[14px] bg-[#f2f4f3] p-1">
              {SEAT_OPTIONS.map((o) => {
                const on = (draft.minSeats || '') === o.value;
                return (
                  <button key={o.label} type="button" onClick={() => set({ minSeats: o.value })} className={`flex-1 rounded-[10px] py-2.5 text-[13.5px] font-bold transition ${on ? 'bg-brand text-white' : 'text-muted'}`}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </SheetSection>

          <SheetSection label="Budget per day">
            <div className="mt-2.5 flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((b) => {
                const on = budgetActive(b.min, b.max);
                return (
                  <button
                    key={b.label}
                    type="button"
                    onClick={() => set({ minPrice: b.min, maxPrice: b.max })}
                    className={`rounded-full px-[15px] py-2.5 text-[13px] font-bold transition ${on ? 'border-[1.5px] border-brand bg-brand-tint text-brand-dark' : 'bg-[#f2f4f3] text-muted'}`}
                  >
                    {b.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5 flex gap-2.5">
              <div className="flex h-[46px] min-w-0 flex-1 items-center rounded-xl border-[1.5px] border-[#e2e8ea] px-3">
                <span className="mr-1 text-[13.5px] text-muted-soft">$</span>
                <input type="number" min="0" value={draft.minPrice} onChange={(e) => set({ minPrice: e.target.value })} placeholder="Min" className="w-full min-w-0 bg-transparent text-[13.5px] font-semibold text-ink placeholder:font-normal placeholder:text-[#adb8c0] focus:outline-none" />
              </div>
              <div className="flex h-[46px] min-w-0 flex-1 items-center rounded-xl border-[1.5px] border-[#e2e8ea] px-3">
                <span className="mr-1 text-[13.5px] text-muted-soft">$</span>
                <input type="number" min="0" value={draft.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} placeholder="Max" className="w-full min-w-0 bg-transparent text-[13.5px] font-semibold text-ink placeholder:font-normal placeholder:text-[#adb8c0] focus:outline-none" />
              </div>
            </div>
          </SheetSection>

          <SheetSection label="Rating">
            <div className="mt-2.5 flex gap-2">
              {RATING_OPTIONS.map((o) => {
                const on = (draft.minRating || '') === o.value;
                return (
                  <button key={o.label} type="button" onClick={() => set({ minRating: o.value })} className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition ${on ? 'bg-brand text-white' : 'bg-[#f2f4f3] text-muted'}`}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </SheetSection>

          <SheetSection label="Sort by">
            <div className="mt-1 flex flex-col">
              {SORT_OPTIONS.map((o, i) => {
                const on = (draft.sort || 'recent') === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set({ sort: o.value })}
                    className={`flex items-center justify-between py-[13px] text-left ${i < SORT_OPTIONS.length - 1 ? 'border-b border-hairline' : ''}`}
                  >
                    <span className={`text-[14px] ${on ? 'font-bold text-ink' : 'font-semibold text-ink-soft'}`}>{o.label}</span>
                    {on ? (
                      <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-brand">
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </SheetSection>
        </div>
        <div className="flex gap-2.5 border-t border-hairline px-[18px] pb-6 pt-3.5">
          <button type="button" onClick={onReset} className="flex-shrink-0 rounded-[14px] border-[1.5px] border-[#e2e8ea] px-5 py-[14px] text-[14px] font-bold text-ink">
            Reset
          </button>
          <button type="button" onClick={onApply} className="flex-1 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark">
            Show {count} vehicle{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleCatalog;

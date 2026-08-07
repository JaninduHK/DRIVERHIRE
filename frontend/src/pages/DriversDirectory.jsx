import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLoaderData } from 'react-router';
import { Car, Check, ChevronDown, Loader2, Search, SlidersHorizontal, Star, X } from 'lucide-react';
import { fetchDriverDirectory } from '../services/driverDirectoryApi.js';
import { Avatar } from '../components/dashboard/primitives.jsx';

const formatCurrency = (value) => (!Number.isFinite(value) ? '$0' : `$${value.toLocaleString('en-US')}`);
const yearsLabel = (years) => {
  const value = Number(years);
  if (!Number.isFinite(value) || value <= 0) return 'New guide';
  return `${Math.round(value)} yrs`;
};

const PERKS = ['English speaking', 'Airport meet & greet', 'Fuel included', 'Meals covered', 'Large luggage'];
const PRICE_PRESETS = [
  { label: 'Any', min: '', max: '' },
  { label: 'Under $50', min: '', max: '50' },
  { label: '$50 – $80', min: '50', max: '80' },
  { label: '$80+', min: '80', max: '' },
];
const RATING_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '4', label: '4.0★ +' },
  { value: '4.5', label: '4.5★ +' },
];
const EXPERIENCE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: '5', label: '5+ yrs' },
  { value: '10', label: '10+ yrs' },
];
const SORT_OPTIONS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'reviews_desc', label: 'Highest rated' },
  { value: 'experience_desc', label: 'Most experienced' },
];

const defaultFilters = {
  search: '',
  sort: 'recommended',
  perks: [],
  minPrice: '',
  maxPrice: '',
  minReview: '',
  minExperience: '',
};

const perkMatch = (driver, perk) => {
  const badges = (driver.badges || []).join(' ').toLowerCase();
  if (perk === 'English speaking') return Boolean(driver.hasEnglishDriver) || badges.includes('english');
  const kw = perk.toLowerCase().split(' ')[0];
  return badges.includes(kw);
};

const DriversDirectory = () => {
  // Seeded by the server loader so the full list is in the SSR HTML (crawlable).
  const loaderData = useLoaderData();
  const seededDrivers = loaderData?.drivers || [];
  const [state, setState] = useState({ loading: false, error: '', drivers: seededDrivers });
  const [filters, setFilters] = useState(defaultFilters);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadDrivers = useCallback(async () => {
    // Only show the loading state when we have nothing yet — after SSR we refresh silently.
    setState((prev) => ({ ...prev, loading: prev.drivers.length === 0, error: '' }));
    try {
      const response = await fetchDriverDirectory();
      setState({ loading: false, error: '', drivers: response?.drivers || [] });
    } catch (error) {
      setState((prev) => ({
        loading: false,
        error: prev.drivers.length ? '' : error?.message || 'Unable to load drivers right now.',
        drivers: prev.drivers,
      }));
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
    const minExp = Number(filters.minExperience);

    const matches = (driver) => {
      if (term) {
        const haystack = [driver.name, driver.description, driver.location?.label, ...(driver.badges || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      if (filters.perks.length && !filters.perks.every((p) => perkMatch(driver, p))) return false;
      const price = Number(driver.averagePricePerDay) || 0;
      if (filters.minPrice !== '' && Number.isFinite(minPrice) && price < minPrice) return false;
      if (filters.maxPrice !== '' && Number.isFinite(maxPrice) && price > maxPrice) return false;
      if (filters.minReview !== '' && (Number(driver.reviewScore) || 0) < minReview) return false;
      if (filters.minExperience !== '' && (Number(driver.experienceYears) || 0) < minExp) return false;
      return true;
    };

    const sortFn = (a, b) => {
      switch (filters.sort) {
        case 'experience_desc':
          return (b.experienceYears || 0) - (a.experienceYears || 0);
        case 'reviews_desc':
          return (b.reviewScore || 0) - (a.reviewScore || 0);
        default:
          return (b.badges?.length || 0) - (a.badges?.length || 0);
      }
    };

    return [...state.drivers].filter(matches).sort(sortFn);
  }, [filters, state.drivers]);

  const set = (patch) => setFilters((prev) => ({ ...prev, ...patch }));
  const englishOn = filters.perks.includes('English speaking');
  const otherPerks = filters.perks.filter((p) => p !== 'English speaking');
  const priceActive = Boolean(filters.minPrice || filters.maxPrice);
  const activeCount =
    filters.perks.length + (priceActive ? 1 : 0) + (filters.minReview ? 1 : 0) + (filters.minExperience ? 1 : 0);
  const hasAnyFilter = activeCount > 0 || filters.search || filters.sort !== 'recommended';

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink">
      <div className="sticky top-0 z-20 border-b border-hairline bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-2.5 pt-3 sm:px-6">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-brand-dark">Driver directory</p>
          <h1 className="mb-2.5 mt-1 text-[21px] font-extrabold tracking-tight text-ink lg:text-[26px]">Find your perfect driver</h1>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
              <input
                value={filters.search}
                onChange={(e) => set({ search: e.target.value })}
                placeholder="Name, perk or destination"
                className="h-[46px] w-full min-w-0 rounded-[14px] border-[1.5px] border-[#e2e8ea] bg-white pl-10 pr-3 text-[13.5px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
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
            <button
              type="button"
              onClick={() =>
                set({ perks: englishOn ? filters.perks.filter((p) => p !== 'English speaking') : [...filters.perks, 'English speaking'] })
              }
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full px-[13px] text-[13px] font-bold transition ${
                englishOn ? 'bg-brand py-[9px] text-white' : 'border-[1.5px] border-[#e2e8ea] bg-white py-2 font-semibold text-ink-soft'
              }`}
            >
              English speaking
              {englishOn ? <X className="h-[11px] w-[11px]" strokeWidth={2.5} /> : null}
            </button>
            {otherPerks.length ? (
              <ActiveChip onClear={() => set({ perks: englishOn ? ['English speaking'] : [] })}>
                {otherPerks.length === 1 ? otherPerks[0] : `${otherPerks.length} perks`}
              </ActiveChip>
            ) : (
              <ChevronChip onClick={() => setSheetOpen(true)}>Perks</ChevronChip>
            )}
            {priceActive ? (
              <ActiveChip onClear={() => set({ minPrice: '', maxPrice: '' })}>
                ${filters.minPrice || '0'}{filters.maxPrice ? `–$${filters.maxPrice}` : '+'}
              </ActiveChip>
            ) : (
              <ChevronChip onClick={() => setSheetOpen(true)}>Price</ChevronChip>
            )}
            {filters.minReview ? (
              <ActiveChip onClear={() => set({ minReview: '' })}>{filters.minReview}★ +</ActiveChip>
            ) : (
              <ChevronChip onClick={() => setSheetOpen(true)}>Reviews</ChevronChip>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-4 sm:px-6">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-extrabold uppercase tracking-[0.05em] text-muted-soft">
            {state.loading ? 'Loading…' : `${filteredDrivers.length} approved driver${filteredDrivers.length === 1 ? '' : 's'}`}
          </span>
          {hasAnyFilter ? (
            <button type="button" onClick={() => setFilters(defaultFilters)} className="text-[12.5px] font-bold text-brand-dark">
              Clear filters
            </button>
          ) : null}
        </div>

        {state.loading ? (
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading drivers…
          </div>
        ) : state.error ? (
          <div className="rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
            <p className="text-[#e11d48]">{state.error}</p>
            <button type="button" onClick={loadDrivers} className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft">
              Try again
            </button>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="rounded-[18px] bg-white p-10 text-center text-sm text-muted shadow-card">
            <Car className="mx-auto mb-3 h-9 w-9 text-muted-soft" />
            No drivers match your search. Try a different keyword or clear filters.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDrivers.map((driver, index) => (
              <DriverCard key={driver.id} driver={driver} tone={['amber', 'purple', 'blue'][index % 3]} />
            ))}
          </div>
        )}
      </div>

      {sheetOpen ? (
        <DriverFilterSheet
          filters={filters}
          set={set}
          count={filteredDrivers.length}
          onReset={() => setFilters(defaultFilters)}
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

const DriverCard = ({ driver, tone }) => {
  const cityLabel = driver.location?.label || driver.address || 'Sri Lanka';
  const rating = Number(driver.reviewScore) > 0 ? Number(driver.reviewScore).toFixed(1) : '—';
  const reviews = driver.reviewCount ?? 0;
  const averagePrice = Number(driver.averagePricePerDay);
  const rate = Number.isFinite(averagePrice) && averagePrice > 0 ? formatCurrency(averagePrice) : 'Quote';
  const chips = [driver.featuredVehicle?.model || 'Multiday tours', cityLabel].filter(Boolean);

  return (
    <article className="flex flex-col rounded-[20px] border border-[#e9edeb] bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-center gap-3">
        <div className="grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-full bg-[#e9f8ef] text-[21px] font-extrabold text-brand-dark">
          {driver.profilePhoto ? (
            <img src={driver.profilePhoto} alt={driver.name} className="h-full w-full object-cover" />
          ) : (
            <Avatar name={driver.name} tone={tone} className="h-full w-full rounded-full text-[21px]" />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[7px]">
            <h3 className="text-[16.5px] font-extrabold">{driver.name}</h3>
            <span className="rounded-full bg-[#e9f8ef] px-2 py-1 text-[10.5px] font-extrabold text-brand-dark">Verified</span>
          </div>
          <div className="mt-[3px] text-[12.5px] font-semibold text-muted-soft">{cityLabel}</div>
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold">
        <Star className="h-[15px] w-[15px] fill-[#f5b400] text-[#f5b400]" />
        {rating}
        <span className="font-semibold text-muted-soft">· {reviews} reviews · {yearsLabel(driver.experienceYears)}</span>
      </div>
      <p className="mt-[11px] flex-1 text-[14px] leading-[1.6] text-muted line-clamp-3">
        {driver.description || 'Trusted chauffeur for bespoke Sri Lanka tours across the island.'}
      </p>
      <div className="mt-3.5 flex flex-wrap gap-[7px]">
        {chips.map((chip) => (
          <span key={chip} className="rounded-full bg-[#eef1f0] px-3 py-1.5 text-[11.5px] font-semibold text-ink-soft">
            {chip}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-2.5 border-t border-[#f0f3f2] pt-3.5">
        <div>
          <div className="text-[11px] font-bold tracking-[.04em] text-muted-soft">AVG. DAILY RATE</div>
          <div className="text-[17px] font-extrabold">{rate}<span className="text-[12.5px] font-semibold text-muted-soft">/day</span></div>
        </div>
        <Link to={`/drivers/${driver.id}`} className="inline-flex min-h-[44px] items-center rounded-[11px] bg-[#e9f8ef] px-4 text-[13.5px] font-bold text-brand-dark">
          View driver
        </Link>
      </div>
    </article>
  );
};

const Section = ({ label, children }) => (
  <div>
    <div className="text-[12px] font-extrabold uppercase tracking-[0.05em] text-muted-soft">{label}</div>
    {children}
  </div>
);

const DriverFilterSheet = ({ filters, set, count, onReset, onClose }) => {
  const togglePerk = (perk) =>
    set({ perks: filters.perks.includes(perk) ? filters.perks.filter((p) => p !== perk) : [...filters.perks, perk] });
  const priceActive = (min, max) => (filters.minPrice || '') === min && (filters.maxPrice || '') === max;

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
          <Section label="What matters to you">
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PERKS.map((perk) => {
                const on = filters.perks.includes(perk);
                return (
                  <button
                    key={perk}
                    type="button"
                    onClick={() => togglePerk(perk)}
                    className={`rounded-full px-[15px] py-2.5 text-[13px] font-bold transition ${on ? 'border-[1.5px] border-brand bg-brand-tint text-brand-dark' : 'bg-[#f2f4f3] text-muted'}`}
                  >
                    {perk}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Avg. price per day">
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PRICE_PRESETS.map((b) => {
                const on = priceActive(b.min, b.max);
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
          </Section>

          <Section label="Minimum rating">
            <div className="mt-2.5 flex gap-2">
              {RATING_OPTIONS.map((o) => {
                const on = (filters.minReview || '') === o.value;
                return (
                  <button key={o.label} type="button" onClick={() => set({ minReview: o.value })} className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition ${on ? 'bg-brand text-white' : 'bg-[#f2f4f3] text-muted'}`}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Experience">
            <div className="mt-2.5 flex gap-2">
              {EXPERIENCE_OPTIONS.map((o) => {
                const on = (filters.minExperience || '') === o.value;
                return (
                  <button key={o.label} type="button" onClick={() => set({ minExperience: o.value })} className={`flex-1 rounded-xl py-2.5 text-[13px] font-bold transition ${on ? 'bg-brand text-white' : 'bg-[#f2f4f3] text-muted'}`}>
                    {o.label}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section label="Sort by">
            <div className="mt-1 flex flex-col">
              {SORT_OPTIONS.map((o, i) => {
                const on = (filters.sort || 'recommended') === o.value;
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
          </Section>
        </div>
        <div className="flex gap-2.5 border-t border-hairline px-[18px] pb-6 pt-3.5">
          <button type="button" onClick={onReset} className="flex-shrink-0 rounded-[14px] border-[1.5px] border-[#e2e8ea] px-5 py-[14px] text-[14px] font-bold text-ink">
            Reset
          </button>
          <button type="button" onClick={onClose} className="flex-1 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark">
            Show {count} driver{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DriversDirectory;

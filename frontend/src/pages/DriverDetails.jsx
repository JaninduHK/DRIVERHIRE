import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Loader2,
  MessageSquare,
  Share2,
  Shield,
  Star,
} from 'lucide-react';
import { fetchDriverProfile } from '../services/driverDirectoryApi.js';
import { fetchVehicleReviews } from '../services/vehicleCatalogApi.js';
import { Avatar } from '../components/dashboard/primitives.jsx';
import ReviewPhotos from '../components/ReviewPhotos.jsx';

const formatCurrency = (value) => (!Number.isFinite(value) ? '$0' : `$${value.toLocaleString('en-US')}`);
const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const useAggregatedReviews = (vehicles) => {
  const hasVehicles = Array.isArray(vehicles) && vehicles.length > 0;
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [state, setState] = useState({ loading: hasVehicles, error: '', reviews: [], meta: { total: 0, averageRating: null, counts: [0, 0, 0, 0, 0] } });

  useEffect(() => {
    let active = true;
    if (!hasVehicles) {
      setState({ loading: false, error: '', reviews: [], meta: { total: 0, averageRating: null, counts: [0, 0, 0, 0, 0] } });
      return () => { active = false; };
    }
    (async () => {
      setState((prev) => ({ ...prev, loading: true, error: '' }));
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
        aggregated.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
        setState({ loading: false, error: '', reviews: aggregated, meta: { total, averageRating: total ? Number((sum / total).toFixed(1)) : null, counts } });
      } catch (error) {
        if (active) setState({ loading: false, error: error?.message || 'Unable to load reviews.', reviews: [], meta: { total: 0, averageRating: null, counts: [0, 0, 0, 0, 0] } });
      }
    })();
    return () => { active = false; };
  }, [hasVehicles, vehicles, refreshIndex]);

  return { ...state, reload: () => setRefreshIndex((p) => p + 1) };
};

const DriverDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [tab, setTab] = useState('about');

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
      setState({ loading: false, error: error?.message || 'Unable to load driver profile right now.', data: null });
    }
  }, [id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const driver = state.data?.driver;
  const vehicles = useMemo(() => state.data?.vehicles || [], [state.data]);
  const reviews = useAggregatedReviews(vehicles);

  if (state.loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 bg-canvas font-sans text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading driver profile…
      </div>
    );
  }
  if (state.error || !driver) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-canvas px-5 font-sans">
        <div className="w-full max-w-[420px] rounded-[20px] bg-white p-8 text-center shadow-card">
          <p className="text-[16px] font-extrabold text-ink">Driver unavailable</p>
          <p className="mt-2 text-sm text-muted">{state.error || 'This profile could not be found.'}</p>
          <div className="mt-5 flex justify-center gap-2.5">
            <button type="button" onClick={loadProfile} className="rounded-full border border-[#e2e8ea] px-4 py-2 text-sm font-bold text-ink">Retry</button>
            <Link to="/drivers" className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white">All drivers</Link>
          </div>
        </div>
      </div>
    );
  }

  const cover = driver.featuredVehicle?.image || vehicles[0]?.image || null;
  const cityLabel = driver.location?.label || driver.address || 'Sri Lanka';
  const perks = driver.badges?.length ? driver.badges : vehicles[0]?.features || [];
  const primaryVehicle = vehicles[0] || null;
  const lowestRate = vehicles.reduce((min, v) => (typeof v.pricePerDay === 'number' ? Math.min(min, v.pricePerDay) : min), Infinity);
  const rateLabel = Number.isFinite(lowestRate) ? formatCurrency(lowestRate) : null;
  const ratingLabel = driver.reviewScore ? driver.reviewScore.toFixed(1) : null;
  const expYears = Math.max(0, Math.round(Number(driver.experienceYears) || 0));

  const goBook = () => navigate(primaryVehicle ? `/vehicles/${primaryVehicle.id}` : '/vehicles');
  const goMessage = () => navigate(primaryVehicle ? `/vehicles/${primaryVehicle.id}` : '/drivers');

  const shared = { driver, vehicles, reviews, cover, cityLabel, perks, primaryVehicle, rateLabel, ratingLabel, expYears, tab, setTab, goBook, goMessage, navigate };

  return (
    <div className="bg-[#eef1f4] font-sans text-ink">
      <MobileProfile {...shared} />
      <DesktopProfile {...shared} />
    </div>
  );
};

// ---------------- MOBILE ----------------
const MobileProfile = ({ driver, vehicles, reviews, cover, cityLabel, perks, rateLabel, ratingLabel, expYears, tab, setTab, goBook, goMessage, navigate }) => {
  const scrollTo = (t) => {
    setTab(t);
    document.getElementById(`m-${t}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div className="min-h-screen bg-canvas pb-[84px] lg:hidden">
      {/* Cover */}
      <div className="relative h-[230px] w-full">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-ink" />}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent to-ink/35" />
        <div className="absolute inset-x-3.5 top-3.5 flex justify-between">
          <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-ink/55 text-white backdrop-blur">
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <div className="flex gap-2">
            <button type="button" aria-label="Save" className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-ink/55 text-white"><Heart className="h-4 w-4" /></button>
            <button type="button" aria-label="Share" className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-ink/55 text-white"><Share2 className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="relative -mt-[26px] rounded-t-[26px] bg-white px-[18px] pb-[18px]">
        <div className="-mt-[30px] flex items-end gap-3">
          <div className="flex-shrink-0 rounded-full border-4 border-white">
            {driver.profilePhoto ? (
              <img src={driver.profilePhoto} alt={driver.name} className="h-[76px] w-[76px] rounded-full object-cover" />
            ) : (
              <Avatar name={driver.name} className="h-[76px] w-[76px] rounded-full text-2xl" />
            )}
          </div>
          <div className="pb-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-2.5 py-[5px] text-[11px] font-extrabold text-brand-dark">
              <Check className="h-3 w-3" strokeWidth={3} /> Verified driver
            </span>
          </div>
        </div>
        <h1 className="mt-3 text-[25px] font-extrabold tracking-tight text-ink">{driver.name}</h1>
        <div className="mt-1.5 flex items-center gap-2.5 text-[13.5px] font-semibold text-muted">
          {ratingLabel ? (
            <span className="flex items-center gap-1.5">
              <Star className="h-3.5 w-3.5" fill="#f5b400" stroke="none" />
              <b className="text-ink">{ratingLabel}</b>({driver.reviewCount ?? 0})
            </span>
          ) : (
            <span className="text-muted-soft">No reviews yet</span>
          )}
          <span className="h-1 w-1 rounded-full bg-[#cfd8dd]" />
          <span>{cityLabel}</span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <StatTile value={expYears ? `${expYears} yrs` : 'New'} label="Guiding" />
          <StatTile value={ratingLabel || '—'} label="Rating" />
          <StatTile value={driver.vehicleCount ?? vehicles.length} label={`Vehicle${(driver.vehicleCount ?? vehicles.length) === 1 ? '' : 's'}`} />
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-10 flex border-b border-hairline bg-white px-[18px]">
        {['about', 'vehicles', 'reviews'].map((t) => (
          <button key={t} type="button" onClick={() => scrollTo(t)} className={`flex-1 py-[13px] text-center text-[13.5px] capitalize ${tab === t ? 'border-b-[2.5px] border-brand font-extrabold text-ink' : 'font-semibold text-muted-soft'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-[18px] pb-5 pt-4">
        {/* About */}
        <div id="m-about">
          <p className="text-[14px] leading-relaxed text-ink-soft">{driver.description || 'This driver has not added a bio yet.'}</p>
          {perks.length > 0 ? (
            <>
              <SectionLabel className="mt-5">Every trip includes</SectionLabel>
              <div className="mt-3 flex flex-col gap-2.5">
                {perks.map((p) => <PerkRow key={p}>{p}</PerkRow>)}
              </div>
            </>
          ) : null}
        </div>

        {/* Vehicles */}
        <div id="m-vehicles">
          {vehicles.length > 0 ? (
            <>
              <SectionLabel className="mt-6">Vehicle{vehicles.length === 1 ? '' : 's'}</SectionLabel>
              <div className="mt-2.5 flex flex-col gap-2.5">
                {vehicles.map((v) => (
                  <Link key={v.id} to={`/vehicles/${v.id}`} className="flex items-center gap-3 rounded-[18px] bg-white p-2.5 shadow-card">
                    {v.image ? (
                      <img src={v.image} alt={v.model} className="h-[72px] w-[92px] flex-shrink-0 rounded-xl object-cover" />
                    ) : (
                      <div className="grid h-[72px] w-[92px] flex-shrink-0 place-items-center rounded-xl bg-[#eef1f0] text-muted-soft"><Car className="h-6 w-6" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[14.5px] text-ink">{v.model}</b>
                      <div className="text-[12px] text-muted-soft">{[v.year, v.seats ? `${v.seats} seats` : null].filter(Boolean).join(' · ')}</div>
                      <div className="mt-1 text-[13px] font-extrabold text-ink">{formatCurrency(v.pricePerDay)} <span className="text-[11.5px] font-semibold text-muted-soft">/ day</span></div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-soft" />
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Reviews */}
        <div id="m-reviews">
          <SectionLabel className="mt-6">Reviews</SectionLabel>
          <div className="mt-2.5 rounded-[18px] bg-white p-4 shadow-card">
            <ReviewsSummary reviews={reviews} />
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[480px] items-center gap-2.5 border-t border-hairline bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(15,31,45,0.06)]">
        <div className="flex-shrink-0">
          <div className="text-[16px] font-extrabold text-ink">{rateLabel || '—'}<span className="text-[11.5px] font-semibold text-muted-soft">/day</span></div>
          <div className="text-[11px] text-muted-soft">from</div>
        </div>
        <button type="button" onClick={goMessage} aria-label="Message" className="grid h-[46px] w-[46px] flex-shrink-0 place-items-center rounded-[14px] border-[1.5px] border-[#e2e8ea]">
          <MessageSquare className="h-[18px] w-[18px] text-ink" strokeWidth={1.7} />
        </button>
        <button type="button" onClick={goBook} className="flex-1 rounded-[14px] bg-brand py-[14px] text-[14.5px] font-bold text-white transition hover:bg-brand-dark">
          Request booking
        </button>
      </div>
    </div>
  );
};

// ---------------- DESKTOP ----------------
const DesktopProfile = ({ driver, vehicles, reviews, cover, cityLabel, perks, rateLabel, ratingLabel, expYears, goBook, goMessage, navigate }) => (
  <div className="hidden min-h-screen lg:block">
    <div className="relative h-[300px] w-full">
      {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-ink" />}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/35 to-transparent" />
      <button type="button" onClick={() => navigate(-1)} className="absolute left-9 top-5 flex items-center gap-2 rounded-xl bg-ink/55 px-4 py-2.5 text-[13.5px] font-bold text-white backdrop-blur">
        <ChevronLeft className="h-[15px] w-[15px]" strokeWidth={2} /> Back to drivers
      </button>
    </div>

    <div className="mx-auto max-w-[1180px] px-9 pb-12">
      <div className="relative z-10 grid grid-cols-[1fr_350px] items-start gap-8">
        <div className="-mt-[36px]">
          <div className="flex items-end gap-[18px]">
            <div className="flex-shrink-0 rounded-full border-[5px] border-white shadow-[0_10px_26px_rgba(15,31,45,0.14)]">
              {driver.profilePhoto ? (
                <img src={driver.profilePhoto} alt={driver.name} className="h-28 w-28 rounded-full object-cover" />
              ) : (
                <Avatar name={driver.name} className="h-28 w-28 rounded-full text-4xl" />
              )}
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-2.5">
                <h1 className="text-[30px] font-extrabold tracking-tight text-ink">{driver.name}</h1>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-tint px-3 py-1.5 text-[12px] font-extrabold text-brand-dark">
                  <Check className="h-3 w-3" strokeWidth={3} /> Verified driver
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[14px] font-semibold text-muted">
                {ratingLabel ? (
                  <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5" fill="#f5b400" stroke="none" /><b className="text-ink">{ratingLabel}</b> ({driver.reviewCount ?? 0} reviews)</span>
                ) : (
                  <span className="text-muted-soft">No reviews yet</span>
                )}
                <span className="h-1 w-1 rounded-full bg-[#cfd8dd]" />
                <span>{cityLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-[26px] flex gap-[26px] border-b border-hairline">
            <span className="border-b-[2.5px] border-brand pb-3 text-[14.5px] font-extrabold text-ink">About</span>
            <a href="#d-vehicles" className="pb-3 text-[14.5px] font-semibold text-muted-soft">Vehicles</a>
            <a href="#d-reviews" className="pb-3 text-[14.5px] font-semibold text-muted-soft">Reviews</a>
          </div>

          <p className="mt-[22px] max-w-[640px] text-[15px] leading-relaxed text-ink-soft">{driver.description || 'This driver has not added a bio yet.'}</p>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <DeskStatCard value={expYears ? `${expYears} yrs` : 'New'} label="Guiding experience" />
            <DeskStatCard value={ratingLabel ? `${ratingLabel} / 5` : '—'} label="Traveller rating" />
            <DeskStatCard value={driver.vehicleCount ?? vehicles.length} label="Available vehicles" />
          </div>

          {perks.length > 0 ? (
            <>
              <h3 className="mt-8 text-[17px] font-extrabold text-ink">Every trip includes</h3>
              <div className="mt-3.5 grid max-w-[640px] grid-cols-2 gap-x-6 gap-y-3">
                {perks.map((p) => <PerkRow key={p}>{p}</PerkRow>)}
              </div>
            </>
          ) : null}

          <div id="d-vehicles" />
          {vehicles.length > 0 ? (
            <>
              <h3 className="mt-8 text-[17px] font-extrabold text-ink">Vehicle{vehicles.length === 1 ? '' : 's'}</h3>
              <div className="mt-3.5 grid grid-cols-2 gap-4">
                {vehicles.map((v) => (
                  <div key={v.id} className="flex items-center gap-4 rounded-[18px] border border-[#eef1f0] bg-white p-3.5">
                    {v.image ? (
                      <img src={v.image} alt={v.model} className="h-[104px] w-[150px] flex-shrink-0 rounded-[14px] object-cover" />
                    ) : (
                      <div className="grid h-[104px] w-[150px] flex-shrink-0 place-items-center rounded-[14px] bg-[#eef1f0] text-muted-soft"><Car className="h-8 w-8" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <b className="block truncate text-[16px] text-ink">{v.model}</b>
                      <div className="text-[13px] text-muted-soft">{[v.year, v.seats ? `${v.seats} seats` : null].filter(Boolean).join(' · ')}</div>
                      <div className="mt-2 text-[15px] font-extrabold text-ink">{formatCurrency(v.pricePerDay)} <span className="text-[12px] font-semibold text-muted-soft">/ day</span></div>
                    </div>
                    <Link to={`/vehicles/${v.id}`} className="flex-shrink-0 rounded-full border-[1.5px] border-[#e2e8ea] px-4 py-2.5 text-[13px] font-bold text-ink transition hover:border-muted-soft">View</Link>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div id="d-reviews" />
          <h3 className="mt-8 text-[17px] font-extrabold text-ink">Reviews</h3>
          <div className="mt-3.5 rounded-[18px] border border-[#e7ebe9] bg-white p-6">
            <ReviewsSummary reviews={reviews} desktop />
          </div>
        </div>

        {/* Sticky booking card */}
        <div className="sticky top-6 pt-[26px]">
          <div className="rounded-[18px] border border-[#e7ebe9] bg-white p-[22px] shadow-[0_18px_40px_-18px_rgba(15,31,45,0.25)]">
            <div className="flex items-baseline gap-1.5">
              <b className="text-[26px] text-ink">{rateLabel || '—'}</b>
              <span className="text-[13.5px] font-semibold text-muted-soft">/ day, all-in</span>
            </div>
            <p className="mt-1.5 text-[12.5px] text-muted-soft">No booking fee · pay the driver on arrival</p>
            <button type="button" onClick={goBook} className="mt-4 w-full rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark">
              Request booking
            </button>
            <button type="button" onClick={goMessage} className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#e2e8ea] py-[13px] text-[14px] font-bold text-ink transition hover:border-muted-soft">
              <MessageSquare className="h-4 w-4" strokeWidth={1.7} /> Message {driver.name.split(' ')[0]}
            </button>
            <div className="mt-4 flex flex-col gap-2.5 border-t border-hairline pt-3.5 text-[12.5px] font-semibold text-muted">
              <span className="flex items-center gap-2.5"><Shield className="h-[15px] w-[15px] text-brand" /> Identity &amp; licence verified</span>
              <span className="flex items-center gap-2.5"><Clock className="h-[15px] w-[15px] text-brand" /> Usually replies within a day</span>
              <span className="flex items-center gap-2.5"><Check className="h-[15px] w-[15px] text-brand" strokeWidth={2.5} /> Free cancellation until 2 days before your trip</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ---------------- Shared bits ----------------
const StatTile = ({ value, label }) => (
  <div className="rounded-[14px] bg-canvas px-2.5 py-3 text-center">
    <div className="text-[16px] font-extrabold text-ink">{value}</div>
    <div className="mt-0.5 text-[10.5px] font-bold uppercase tracking-wide text-muted-soft">{label}</div>
  </div>
);

const DeskStatCard = ({ value, label }) => (
  <div className="rounded-2xl bg-canvas p-4">
    <div className="text-[22px] font-extrabold text-ink">{value}</div>
    <div className="mt-1 text-[12px] font-bold uppercase tracking-wide text-muted-soft">{label}</div>
  </div>
);

const SectionLabel = ({ children, className = '' }) => (
  <div className={`text-[12px] font-extrabold uppercase tracking-[0.05em] text-muted-soft ${className}`}>{children}</div>
);

const PerkRow = ({ children }) => (
  <div className="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink lg:text-[14px]">
    <span className="grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full border-[2px] border-brand">
      <Check className="h-2.5 w-2.5 text-brand" strokeWidth={3.5} />
    </span>
    {children}
  </div>
);

const ReviewsSummary = ({ reviews, desktop = false }) => {
  const { loading, error, reviews: list, meta, reload } = reviews;
  if (loading) {
    return <div className="flex items-center gap-2 py-4 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin text-brand" /> Loading reviews…</div>;
  }
  if (error) {
    return (
      <div className="text-sm text-muted">
        <p className="text-[#e11d48]">{error}</p>
        <button type="button" onClick={reload} className="mt-2 rounded-full border border-[#e2e8ea] px-3 py-1.5 text-xs font-bold text-ink">Try again</button>
      </div>
    );
  }
  if (meta.total === 0) {
    return (
      <div>
        <div className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#a86a15]"><Star className="h-3.5 w-3.5" stroke="#f5b400" fill="none" /> No ratings yet</div>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-muted-soft">No reviews yet. Be the first to explore Sri Lanka with this driver and share your story.</p>
      </div>
    );
  }
  const maxCount = Math.max(...meta.counts, 1);
  const top = list.slice(0, desktop ? 2 : 1);
  return (
    <div>
      <div className="flex items-center gap-3.5">
        <div className="text-center">
          <div className={`font-extrabold leading-none text-ink ${desktop ? 'text-[40px]' : 'text-[28px]'}`}>{meta.averageRating?.toFixed(1)}</div>
          <div className="mt-1.5 text-[11px] text-muted-soft">{meta.total} review{meta.total === 1 ? '' : 's'}</div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          {[5, 4, 3].map((star) => (
            <div key={star} className="flex items-center gap-2">
              <span className="w-2.5 text-[10.5px] text-muted-soft">{star}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
                <div className="h-full rounded-full bg-brand" style={{ width: `${((meta.counts[star - 1] || 0) / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={`mt-3.5 ${desktop ? 'grid grid-cols-2 gap-4' : ''}`}>
        {top.map((review) => (
          <div key={review.id} className="mt-3.5 border-t border-hairline pt-3.5 first:mt-0 lg:border-t-0 lg:pt-0">
            <div className="flex items-center gap-2.5">
              <Avatar name={review.travelerName || 'Traveller'} tone="purple" className="h-8 w-8 rounded-[10px] text-[12px]" />
              <div>
                <b className="text-[13px] text-ink">{review.travelerName || 'Traveller'}</b>
                <div className="text-[11px] text-muted-soft">{formatDate(review.publishedAt) || 'Recent trip'}{review.vehicle?.model ? ` · ${review.vehicle.model}` : ''}</div>
              </div>
            </div>
            {review.title ? <p className="mt-2 text-[13px] font-bold text-ink">{review.title}</p> : null}
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{review.comment}</p>
            <ReviewPhotos images={review.images} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default DriverDetails;

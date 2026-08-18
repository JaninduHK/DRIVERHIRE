import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchVehicles } from '../services/vehicleCatalogApi.js';
import { fetchDriverDirectory } from '../services/driverDirectoryApi.js';
import { fetchLatestReviews } from '../services/reviewApi.js';
import { useLoaderData } from 'react-router';
import { buildApiUrl } from '../constants/api.js';
import { getStoredToken, saveReturnPath } from '../services/authToken.js';

// Prefill stash read by the traveller "My Requests" tab to open a new quote request.
const PENDING_BRIEF_KEY = 'carwithdriver:pending-brief';
const REQUESTS_PATH = '/dashboard?tab=requests';

// ---------- helpers ----------
const money = (value) =>
  typeof value === 'number' && !Number.isNaN(value)
    ? `$${Math.round(value).toLocaleString('en-US')}`
    : null;

const yearsLabel = (years) => {
  const n = Number(years);
  if (!Number.isFinite(n) || n <= 0) return 'New guide';
  return `${Math.round(n)} yrs`;
};

const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'D';

const getVehicleImage = (vehicle) => {
  if (Array.isArray(vehicle?.images) && vehicle.images.length) return vehicle.images[0];
  return vehicle?.image || vehicle?.featuredImage || null;
};

const formatDateRange = (start, end) => {
  const fmt = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || null;
};

const reviewSubline = (review) => {
  const range = formatDateRange(review?.visitedStartDate, review?.visitedEndDate);
  if (range) return range;
  return formatDateRange(review?.publishedAt || review?.createdAt) || 'Sri Lanka trip';
};

const VEHICLE_TAGS = ['Best value', 'Group friendly', 'Long tours'];
const skeletons = [0, 1, 2];

// ---------- inline icons (match design) ----------
const ArrowIcon = ({ stroke = '#fff' }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
    <path d="M2.5 8h11M9.5 4l4 4-4 4" />
  </svg>
);
const CheckIcon = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#10a35a" strokeWidth="2.2" strokeLinecap="round" className="shrink-0">
    <path d="M4 10.5l4 4 8-9" />
  </svg>
);
const StarIcon = ({ size = 15, fill = '#f5b400' }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill={fill}>
    <path d="M10 1.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L10 14.6l-5.2 2.9 1-5.8L1.5 7.6l5.9-.8z" />
  </svg>
);

const TRUST_BADGES = [
  {
    label: 'SLTDA Licensed drivers',
    svg: (
      <path d="M10 2l6 2.5v5c0 4-2.6 7-6 8.5-3.4-1.5-6-4.5-6-8.5v-5L10 2zM7.5 10l1.8 1.8L13 8" />
    ),
  },
  {
    label: 'Island-wide coverage',
    svg: <path d="M10 18s6-4.8 6-9a6 6 0 1 0-12 0c0 4.2 6 9 6 9zM10 6.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z" />,
  },
  {
    label: 'Booked Price Guarantee',
    svg: <path d="M3 16V8l7-4 7 4v8M8 16v-4h4v4" />,
  },
  {
    label: '24/7 trip support',
    svg: <path d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM10 6v4.3l3 1.8" />,
  },
];

const FAQS = [
  {
    q: 'How much does a car with driver cost in Sri Lanka?',
    a: "Drivers set their own rates, so you'll see a range. Sedans typically start around $43 a day and large touring vans reach about $95. Most daily rates cover the vehicle, fuel, unlimited island-wide kilometres, and the driver's meals and accommodation, and each listing spells out exactly what's included. For a figure based on your own route and dates, use the trip cost calculator.",
  },
  {
    q: 'Is it free to book, and do I pay a deposit?',
    a: "The platform is completely free for tourists: browsing, quotes, chat and booking all cost you nothing. There's no deposit and no advance either. You pay your driver directly on the first day of your trip.",
  },
  {
    q: 'How do I get quotes for my own itinerary?',
    a: 'Post your tour plan with your dates, passenger count and the places you want to see. Available drivers send you quotations free of charge, and you can compare them side by side, message any driver with questions, and negotiate before you commit.',
  },
  {
    q: 'What if I need to cancel?',
    bullets: [
      'More than 2 days before your start date: free to cancel, nothing to pay.',
      'Within 2 days of your start date: 50% of the total goes to the driver.',
      'After the trip has started: 100% for the days already completed, plus 50% of the remaining days.',
    ],
    outro:
      'Your driver turns down other bookings to hold your dates, so message them as soon as your plans change.',
  },
  {
    q: 'Are your drivers licensed and insured?',
    a: 'Every driver on the platform is SLTDA-registered and carries valid insurance, and licence and vehicle documents are checked before a profile goes live. Reviews come from tourists who actually travelled with that driver and stay on the profile permanently, good and bad, so read a few before you decide.',
  },
];

const PARTY_OPTIONS = ['1–3', '4–6', '7+'];
const PARTY_TO_ADULTS = { '1–3': '2', '4–6': '4', '7+': '7' };

const inputCls =
  'w-full rounded-xl border-[1.5px] border-[#e5ebe8] bg-[#fbfcfc] px-3.5 py-3 text-[14.5px] font-semibold text-ink outline-none transition focus:border-brand';
const labelCls = 'mb-1.5 block text-xs font-bold text-muted';

const HomePage = () => {
  const navigate = useNavigate();
  // Seeded by the server loader so the featured vehicles and drivers are in the SSR HTML.
  const loaderData = useLoaderData();
  const [vehicleState, setVehicleState] = useState({ loading: false, error: '', items: loaderData?.vehicles || [] });
  const [driverState, setDriverState] = useState({ loading: false, error: '', items: loaderData?.drivers || [] });
  const [reviewState, setReviewState] = useState({ loading: true, error: '', items: [] });

  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    pickup: '',
    dropoff: '',
    party: '1–3',
    notes: '',
  });
  const setField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  useEffect(() => {
    let cancelled = false;
    fetchVehicles({ sort: 'rating_desc' })
      .then(({ vehicles }) => {
        if (!cancelled) setVehicleState({ loading: false, error: '', items: Array.isArray(vehicles) ? vehicles : [] });
      })
      .catch((error) => {
        if (!cancelled) setVehicleState({ loading: false, error: error?.message || 'Unable to load vehicles.', items: [] });
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchDriverDirectory()
      .then(({ drivers }) => {
        if (!cancelled) setDriverState({ loading: false, error: '', items: Array.isArray(drivers) ? drivers : [] });
      })
      .catch((error) => {
        if (!cancelled) setDriverState({ loading: false, error: error?.message || 'Unable to load drivers.', items: [] });
      });
    return () => { cancelled = true; };
  }, []);

  const featuredVehicles = useMemo(() => vehicleState.items.slice(0, 3), [vehicleState.items]);
  const featuredDrivers = useMemo(() => driverState.items.slice(0, 3), [driverState.items]);

  // Latest approved reviews across ALL vehicles (so admin-added reviews appear too),
  // not just the featured vehicles' reviews.
  useEffect(() => {
    let cancelled = false;
    setReviewState((prev) => ({ ...prev, loading: true, error: '' }));
    fetchLatestReviews(9, 5)
      .then((payload) => {
        if (cancelled) return;
        const items = (Array.isArray(payload?.reviews) ? payload.reviews : [])
          .slice(0, 3)
          .map((review) => ({ review, vehicle: review.vehicle }));
        setReviewState({ loading: false, error: '', items });
      })
      .catch((error) => {
        if (!cancelled) setReviewState({ loading: false, error: error?.message || 'Unable to load reviews.', items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Route to the traveller "My Requests" tab to create a quote request, gating on auth.
  // The prefill is stashed so the requests tab opens with the request form ready — this
  // mini form doesn't collect everything a brief needs (e.g. country), so the traveller
  // still finishes it there rather than being auto-submitted.
  const goToRequests = (prefill = {}) => {
    try {
      sessionStorage.setItem(PENDING_BRIEF_KEY, JSON.stringify(prefill));
    } catch {
      /* ignore storage errors */
    }
    if (!getStoredToken()) {
      // Straight to Asgardeo's hosted sign-in/registration, same as /get-quotes — skips
      // the /traveller/sign-in landing page so this doesn't cost an extra click.
      saveReturnPath(REQUESTS_PATH);
      window.location.href = buildApiUrl('/auth/sso/login');
      return;
    }
    navigate(REQUESTS_PATH);
  };

  const handleQuoteSubmit = (event) => {
    event.preventDefault();
    goToRequests({
      startDate: form.startDate,
      endDate: form.endDate,
      startLocation: form.pickup,
      endLocation: form.dropoff,
      adults: PARTY_TO_ADULTS[form.party] || '2',
      children: '0',
      message: form.notes,
      country: '',
    });
  };

  return (
    <div id="top" className="bg-white font-sans text-ink">
      {/* ===== HERO ===== */}
      <section className="border-b border-[#eef2f0] bg-gradient-to-b from-[#f1f9f4] to-white">
        <div className="mx-auto grid max-w-[1200px] items-center gap-[clamp(28px,4vw,54px)] px-[clamp(18px,4vw,40px)] pb-[clamp(30px,4vw,56px)] pt-[clamp(34px,5vw,72px)] lg:grid-cols-2">
          {/* left */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#d6ece0] bg-white px-3 py-[7px] text-[12.5px] font-bold text-brand-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              Trusted with 1200+ genuine reviews 
            </span>
            <h1 className="mt-[18px] text-[clamp(33px,5vw,54px)] font-extrabold leading-[1.06] tracking-[-.03em]">
              Sri Lanka car rentals <span className="text-brand">with a driver</span> who knows the island.
            </h1>
            <p className="mt-4 max-w-[560px] text-[clamp(15.5px,1.4vw,18px)] leading-[1.6] text-muted">
              Licensed drivers, air-conditioned vehicles and itineraries built around your dates. Beaches, tea country,
              UNESCO cities, all on one fixed daily rate with no hidden extras.
            </p>
            <div className="mt-[26px] grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href="#quote"
                className="inline-flex items-center justify-center gap-2.5 rounded-[13px] bg-brand px-6 py-[15px] text-[15.5px] font-bold text-white shadow-[0_12px_26px_-12px_rgba(16,163,90,.65)] transition hover:bg-brand-dark"
              >
                Plan my trip <ArrowIcon />
              </a>
              <Link
                to="/vehicles"
                className="inline-flex items-center justify-center gap-2.5 rounded-[13px] border-[1.5px] border-[#dde4e1] bg-white px-6 py-[15px] text-[15.5px] font-bold text-ink transition hover:border-brand"
              >
                Browse vehicles &amp; drivers
              </Link>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-[clamp(8px,2.5vw,14px)] border-t border-[#e4ece7] pt-[26px] text-center">
              <HeroStat label="Daily rate from" value="$43" suffix="/day" />
              <HeroStat label="Guest rating" value="4.9" suffix=" / 5" />
              <HeroStat label="Reply time" value="< 1 hr" />
            </dl>
          </div>

          {/* right: quote form */}
          <form
            id="quote"
            onSubmit={handleQuoteSubmit}
            className="scroll-mt-24 rounded-[24px] border border-[#e5ebe8] bg-white p-[clamp(20px,2.4vw,28px)] shadow-[0_28px_60px_-32px_rgba(15,31,45,.28)]"
          >
            <h2 className="text-[19px] font-extrabold tracking-[-.01em]">Get driver quotes in minutes</h2>
            <p className="mt-[7px] text-[13.5px] leading-[1.5] text-muted">
              Tell us the basics and we match you with vetted drivers who send fixed prices.
            </p>
            <div className="mt-5 grid gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>Start date</span>
                  <input type="date" value={form.startDate} onChange={setField('startDate')} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>End date</span>
                  <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={setField('endDate')} className={inputCls} />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>Pick-up</span>
                  <input type="text" value={form.pickup} onChange={setField('pickup')} placeholder="City, hotel or airport" className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Drop-off</span>
                  <input type="text" value={form.dropoff} onChange={setField('dropoff')} placeholder="City, hotel or airport" className={inputCls} />
                </label>
              </div>
              <div>
                <span className={labelCls}>Travellers</span>
                <div className="flex flex-wrap gap-2">
                  {PARTY_OPTIONS.map((p) => {
                    const active = form.party === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, party: p }))}
                        className={`min-h-[44px] rounded-full border-[1.5px] border-transparent px-[18px] py-3 text-[13.5px] font-bold transition ${
                          active ? 'bg-ink text-white' : 'bg-[#f2f5f4] text-ink-soft hover:bg-[#e9efec]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="block">
                <span className="mb-1.5 flex items-center justify-between gap-2 text-xs font-bold text-muted">
                  Itinerary details <span className="font-semibold text-[#a3b0bb]">Optional</span>
                </span>
                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={setField('notes')}
                  placeholder="Places you want to see, flight times, kids or extra luggage. Anything that helps drivers quote accurately."
                  className={`${inputCls} resize-y leading-[1.5]`}
                />
              </label>
              <button
                type="submit"
                className="mt-1 rounded-[13px] bg-brand px-4 py-[15px] text-[15.5px] font-bold text-white transition hover:bg-brand-dark"
              >
                Get Quotes from Drivers
              </button>
              <p className="text-center text-xs leading-[1.5] text-muted-soft">
                Free to request · No booking fee · Pay the driver directly
              </p>
            </div>
          </form>
        </div>

        {/* trust badges */}
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-3 px-[clamp(18px,4vw,40px)] pb-[clamp(28px,3vw,44px)] sm:grid-cols-2 lg:grid-cols-4">
          {TRUST_BADGES.map((badge) => (
            <div key={badge.label} className="flex items-center gap-2.5 rounded-[14px] border border-[#e8edeb] bg-white px-4 py-3.5">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#10a35a" strokeWidth="1.8" strokeLinecap="round" className="shrink-0">
                {badge.svg}
              </svg>
              <span className="text-[13.5px] font-bold">{badge.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] py-[clamp(44px,5vw,78px)]">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-3 max-w-[640px] text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.15] tracking-[-.02em]">
          Three steps from enquiry to airport pick-up
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-[clamp(14px,2vw,22px)] md:grid-cols-3">
          {[
            { n: '1', t: 'Share your itinerary', d: 'Dates, group size and the places on your list. A rough idea is enough, and drivers help refine it.' },
            { n: '2', t: 'Compare real quotes', d: 'See vehicle, daily rate, languages and reviews side by side. Message drivers before you commit.' },
            { n: '3', t: 'Secure your booking', d: 'Agree the final itinerary and rate with your driver, then confirm. You get written trip details and direct contact before you fly.' },
          ].map((step) => (
            <article key={step.n} className="rounded-[20px] border border-[#e9efec] bg-[#f7faf8] p-6">
              <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-ink text-[15px] font-extrabold text-[#7fd9a8]">
                {step.n}
              </span>
              <h3 className="mt-4 text-[17.5px] font-extrabold">{step.t}</h3>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-muted">{step.d}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ===== FLEET ===== */}
      <section id="fleet" className="border-y border-[#eef2f0] bg-[#f6f8f7]">
        <div className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] py-[clamp(44px,5vw,78px)]">
          <SectionHead
            eyebrow="Fleet for every journey"
            title="Vehicles for island-wide car rentals in Sri Lanka"
            copy="Modern SUVs, executive sedans and group vans, all maintained, GPS-enabled and paired with a bilingual driver."
            to="/vehicles"
            cta="View all vehicles"
          />
          <div className="mt-8 grid grid-cols-1 gap-[clamp(14px,2vw,22px)] sm:grid-cols-2 lg:grid-cols-3">
            {vehicleState.loading ? (
              skeletons.map((s) => <CardSkeleton key={s} withImage />)
            ) : vehicleState.error ? (
              <ErrorCard message={vehicleState.error} to="/vehicles" cta="Open catalog" />
            ) : featuredVehicles.length === 0 ? (
              <EmptyCard>
                No vehicles yet. <Link to="/vehicles" className="font-bold text-brand-dark">Browse the catalog</Link>.
              </EmptyCard>
            ) : (
              featuredVehicles.map((vehicle, i) => <VehicleCard key={vehicle.id} vehicle={vehicle} tag={VEHICLE_TAGS[i]} />)
            )}
          </div>
        </div>
      </section>

      {/* ===== DRIVERS ===== */}
      <section id="drivers" className="bg-ink">
        <div className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] py-[clamp(44px,5vw,78px)]">
          <SectionHead
            dark
            eyebrow="Driver partners"
            title="Meet the drivers travellers ask for by name"
            copy="Background-checked, insured and trained in hospitality. They know the viewpoints, the heritage sites and the best roadside cafés."
            to="/drivers"
            cta="Explore driver directory"
          />
          <div className="mt-8 grid grid-cols-1 gap-[clamp(14px,2vw,22px)] sm:grid-cols-2 lg:grid-cols-3">
            {driverState.loading ? (
              skeletons.map((s) => <CardSkeleton key={s} />)
            ) : driverState.error ? (
              <ErrorCard message={driverState.error} to="/drivers" cta="View directory" />
            ) : featuredDrivers.length === 0 ? (
              <EmptyCard>
                No drivers published yet. <Link to="/drivers" className="font-bold text-brand-dark">Browse the directory</Link>.
              </EmptyCard>
            ) : (
              featuredDrivers.map((driver) => <DriverCard key={driver.id} driver={driver} />)
            )}
          </div>
        </div>
      </section>

      {/* ===== PRICING ===== */}
      <section id="pricing" className="mx-auto grid max-w-[1200px] items-start gap-[clamp(24px,3vw,44px)] px-[clamp(18px,4vw,40px)] py-[clamp(44px,5vw,78px)] lg:grid-cols-2">
        <div>
          <Eyebrow>Transparent trip cost</Eyebrow>
          <h2 className="mt-3 text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.15] tracking-[-.02em]">
            One daily rate. Everything that matters included.
          </h2>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-muted">
            No commission on top, no per-kilometre surprises. You see the full figure before you confirm, and you pay your
            driver directly.
          </p>
          <ul className="mt-[22px] grid gap-[11px]">
            {[
              'Driver fee, meals and accommodation',
              'Fuel and unlimited island-wide kilometres',
              'Full vehicle insurance and 24/7 support',
              'Airport meet & greet on arrival day',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[14.5px] font-semibold">
                <CheckIcon />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[22px] border border-[#e5ebe8] bg-[#f7faf8] p-[clamp(20px,2.4vw,28px)]">
          <div className="text-xs font-extrabold tracking-[.06em] text-muted-soft">SAMPLE 6-DAY TRIP · 1–3 TRAVELLERS</div>
          <div className="mt-4 grid gap-3">
            <PriceRow label="Vehicle & driver ($43 × 6 days)" value="$258" />
            <PriceRow label="Fuel & unlimited km" value="Included" green />
            <PriceRow label="Airport pick-up" value="Included" green />
            <PriceRow label="Platform booking fee" value="$0" green />
            <div className="flex items-center justify-between border-t border-[#e2e9e5] pt-3.5">
              <span className="text-[15px] font-extrabold">Estimated total</span>
              <span className="text-[24px] font-extrabold">$258</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => goToRequests()}
            className="mt-[18px] block w-full rounded-[13px] bg-ink py-3.5 text-center text-[15px] font-bold text-white transition hover:bg-ink/90"
          >
            Price my own itinerary
          </button>
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      <section id="reviews" className="border-y border-[#e6f0ea] bg-[#f1f9f4]">
        <div className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] py-[clamp(44px,5vw,78px)]">
          <Eyebrow tone="brand-dark">Guest stories</Eyebrow>
          <h2 className="mt-3 max-w-[720px] text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.15] tracking-[-.02em]">
            4.9 out of 5 across driver-guided trips
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-[clamp(14px,2vw,22px)] sm:grid-cols-2 lg:grid-cols-3">
            {reviewState.loading ? (
              skeletons.map((s) => <CardSkeleton key={s} />)
            ) : reviewState.items.length === 0 ? (
              <EmptyCard>
                Be the first to share your journey.{' '}
                <Link to="/vehicles" className="font-bold text-brand-dark">Plan your trip</Link>.
              </EmptyCard>
            ) : (
              reviewState.items.map(({ review, vehicle }, i) => (
                <ReviewCard key={review.id || `${vehicle?.id}-${i}`} review={review} vehicle={vehicle} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="mx-auto grid max-w-[1200px] items-start gap-[clamp(24px,3vw,48px)] px-[clamp(18px,4vw,40px)] py-[clamp(44px,5vw,78px)] lg:grid-cols-2">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.15] tracking-[-.02em]">
            Hiring a car with driver in Sri Lanka
          </h2>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-muted">
            Still unsure about something? Message us on WhatsApp at{' '}
            <a href="tel:+94763021483" className="font-semibold text-brand-dark">+94 76 3021 483</a> and we usually reply
            within the hour.
          </p>
        </div>
        <div className="grid gap-3">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-[16px] border border-[#e5ebe8] bg-white px-[18px] py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3.5 [&::-webkit-details-marker]:hidden">
                <h3 className="text-[15.5px] font-bold">{faq.q}</h3>
                <span className="shrink-0 transition-transform duration-200 group-open:rotate-45">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#10a35a" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M8 2.5v11M2.5 8h11" />
                  </svg>
                </span>
              </summary>
              {faq.a ? <p className="mt-3 text-[14.5px] leading-[1.65] text-muted">{faq.a}</p> : null}
              {faq.bullets ? (
                <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-[14.5px] leading-[1.65] text-muted">
                  {faq.bullets.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              ) : null}
              {faq.outro ? <p className="mt-3 text-[14.5px] leading-[1.65] text-muted">{faq.outro}</p> : null}
            </details>
          ))}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] pb-[clamp(44px,5vw,72px)]">
        <div className="grid grid-cols-1 items-center gap-[22px] rounded-[26px] bg-brand p-[clamp(26px,3.4vw,48px)] lg:grid-cols-2">
          <div>
            <p className="text-[12.5px] font-extrabold uppercase tracking-[.1em] text-white/80">Car with driver · Sri Lanka tours</p>
            <h2 className="mt-3 text-[clamp(23px,2.6vw,33px)] font-extrabold leading-[1.2] tracking-[-.02em] text-white">
              Ready to secure the right driver for your itinerary?
            </h2>
            <p className="mt-2.5 max-w-[560px] text-[15px] leading-[1.6] text-white/90">
              Share your dates, passenger count and wish list. We match you with the ideal vehicle and driver, and keep
              you updated until arrival.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a href="#quote" className="inline-flex items-center justify-center gap-2.5 rounded-[13px] bg-white px-6 py-[15px] text-[15.5px] font-bold text-ink">
              Get a custom quote <ArrowIcon stroke="#0f1f2d" />
            </a>
            <a href="tel:+94763021483" className="inline-flex items-center justify-center gap-2.5 rounded-[13px] border border-white/40 bg-white/[0.16] px-6 py-[15px] text-[15.5px] font-bold text-white">
              Call +94 76 3021 483
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

// ---------- sub-components ----------
const HeroStat = ({ label, value, suffix }) => (
  <div>
    <dt className="text-[clamp(10px,2.6vw,12px)] font-bold uppercase leading-[1.3] tracking-[.03em] text-muted-soft">{label}</dt>
    <dd className="mt-[5px] whitespace-nowrap text-[clamp(17px,4.4vw,21px)] font-extrabold">
      {value}
      {suffix ? <span className="text-[clamp(11px,2.8vw,13px)] font-semibold text-muted-soft">{suffix}</span> : null}
    </dd>
  </div>
);

const Eyebrow = ({ children, tone = 'brand' }) => (
  <p className={`text-[12.5px] font-extrabold uppercase tracking-[.1em] ${tone === 'brand-dark' ? 'text-brand-dark' : 'text-brand'}`}>
    {children}
  </p>
);

const SectionHead = ({ eyebrow, title, copy, to, cta, dark = false }) => (
  <div className="flex flex-wrap items-end justify-between gap-[18px]">
    <div className="max-w-[660px]">
      <p className={`text-[12.5px] font-extrabold uppercase tracking-[.1em] ${dark ? 'text-[#7fd9a8]' : 'text-brand'}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.15] tracking-[-.02em] ${dark ? 'text-white' : ''}`}>{title}</h2>
      <p className={`mt-3 text-[15.5px] leading-[1.6] ${dark ? 'text-white/[.68]' : 'text-muted'}`}>{copy}</p>
    </div>
    <Link
      to={to}
      className={`inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-[18px] text-[14px] font-bold ${
        dark ? 'border border-white/20 bg-white/10 text-white' : 'border-[1.5px] border-[#dde4e1] bg-white text-ink'
      }`}
    >
      {cta} <ArrowIcon stroke={dark ? '#fff' : '#0f1f2d'} />
    </Link>
  </div>
);

const Chip = ({ children }) => (
  <span className="rounded-full bg-[#f2f5f4] px-[11px] py-1.5 text-xs font-semibold text-ink-soft">{children}</span>
);

const VehicleCard = ({ vehicle, tag }) => {
  const image = getVehicleImage(vehicle);
  const discount = vehicle.activeDiscount;
  const rate =
    money(typeof discount?.discountedPricePerDay === 'number' ? discount.discountedPricePerDay : vehicle.pricePerDay) || 'Quote';
  const chips = [
    vehicle.seats ? `${vehicle.seats} seats` : null,
    vehicle.year ? `Year ${vehicle.year}` : null,
    Array.isArray(vehicle.features) && vehicle.features.length ? vehicle.features[0] : null,
  ].filter(Boolean).slice(0, 3);
  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border border-[#e9edeb] bg-white">
      <div className="h-[186px] w-full bg-[#eef1f0]">
        {image ? (
          <img src={image} alt={vehicle.model || 'Vehicle'} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-soft">
            <svg width="34" height="34" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2.5 12.5h15M4 12.5l1.6-4.6A2 2 0 0 1 7.5 6.5h5a2 2 0 0 1 1.9 1.4l1.6 4.6" /><circle cx="6" cy="15" r="1.4" /><circle cx="14" cy="15" r="1.4" /></svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-[18px]">
        <div className="flex items-center justify-between gap-2.5">
          <h3 className="text-[17.5px] font-extrabold">{vehicle.model || 'Featured vehicle'}</h3>
          {tag ? <span className="rounded-full bg-[#e9f8ef] px-2.5 py-[5px] text-xs font-bold text-brand-dark">{tag}</span> : null}
        </div>
        <p className="mt-2.5 flex-1 text-[14px] leading-[1.55] text-muted line-clamp-3">
          {vehicle.description || 'Comfortable and ready for Sri Lanka road trips, with strong air-conditioning.'}
        </p>
        {chips.length ? <div className="mt-3.5 flex flex-wrap gap-[7px]">{chips.map((c) => <Chip key={c}>{c}</Chip>)}</div> : null}
        <div className="mt-4 flex items-center justify-between gap-2.5 border-t border-[#f0f3f2] pt-3.5">
          <div>
            <div className="text-[11px] font-bold tracking-[.04em] text-muted-soft">FROM</div>
            <div className="text-[17px] font-extrabold">{rate}<span className="text-[12.5px] font-semibold text-muted-soft">/day</span></div>
          </div>
          <Link to={`/vehicles/${vehicle.id}`} className="inline-flex min-h-[44px] items-center rounded-[11px] bg-[#e9f8ef] px-4 text-[13.5px] font-bold text-brand-dark">
            Get a quote
          </Link>
        </div>
      </div>
    </article>
  );
};

const DriverCard = ({ driver }) => {
  const rating = driver.reviewScore ? driver.reviewScore.toFixed(1) : '—';
  const reviews = driver.reviewCount ?? 0;
  const location = driver.location?.label || driver.address || 'Island-wide';
  const rate = money(driver.averagePricePerDay) || 'Quote';
  const chips = [driver.featuredVehicle?.model || 'Multiday tours', location].filter(Boolean);
  return (
    <article className="flex flex-col rounded-[20px] bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e9f8ef] text-[21px] font-extrabold text-brand-dark">
          {driver.profilePhoto ? (
            <img src={driver.profilePhoto} alt={driver.name} className="h-full w-full object-cover" />
          ) : (
            initialsOf(driver.name)
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[7px]">
            <h3 className="text-[16.5px] font-extrabold">{driver.name}</h3>
            <span className="rounded-full bg-[#e9f8ef] px-2 py-1 text-[10.5px] font-extrabold text-brand-dark">Verified</span>
          </div>
          <div className="mt-[3px] text-[12.5px] font-semibold text-muted-soft">{location}</div>
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold">
        <StarIcon />
        {rating}
        <span className="font-semibold text-muted-soft">· {reviews} reviews · {yearsLabel(driver.experienceYears)}</span>
      </div>
      <p className="mt-[11px] flex-1 text-[14px] leading-[1.6] text-muted line-clamp-3">
        {driver.description || 'Trusted chauffeur for bespoke Sri Lanka tours across the island.'}
      </p>
      <div className="mt-3.5 flex flex-wrap gap-[7px]">{chips.map((c) => <Chip key={c}>{c}</Chip>)}</div>
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

const ClampedReviewText = ({ text, to }) => {
  const textRef = useRef(null);
  const measureRef = useRef(null);
  const [display, setDisplay] = useState({ content: text, truncated: false });

  useLayoutEffect(() => {
    const node = textRef.current;
    const measureNode = measureRef.current;
    if (!node || !measureNode) return undefined;

    const source = `${text || ''}`.trim();
    const words = source.split(/\s+/).filter(Boolean);

    const updateDisplay = (next) => {
      setDisplay((prev) => (prev.content === next.content && prev.truncated === next.truncated ? prev : next));
    };

    const renderMeasure = (content, truncated) => {
      measureNode.replaceChildren();
      if (content) {
        measureNode.append(document.createTextNode(content));
      }
      if (truncated) {
        measureNode.append(document.createTextNode('... '));
        if (to) {
          const more = document.createElement('span');
          more.textContent = 'Read More';
          more.style.color = '#0c8a4b';
          more.style.fontWeight = '700';
          measureNode.append(more);
        }
      }
      return measureNode.getBoundingClientRect().height;
    };

    const fitText = () => {
      if (!source) {
        updateDisplay({ content: '', truncated: false });
        return;
      }

      measureNode.style.width = `${node.clientWidth}px`;
      const lineHeight = parseFloat(window.getComputedStyle(node).lineHeight) || 24;
      const maxHeight = lineHeight * 6 + 1;

      if (renderMeasure(source, false) <= maxHeight) {
        updateDisplay({ content: source, truncated: false });
        return;
      }

      let low = 1;
      let high = words.length;
      let best = '';

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const candidate = words.slice(0, mid).join(' ').replace(/[.,;:!?-–—\s]+$/u, '');
        if (renderMeasure(candidate, true) <= maxHeight) {
          best = candidate;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      if (!best) {
        let fallback = source;
        while (fallback.length > 1 && renderMeasure(fallback, true) > maxHeight) {
          fallback = fallback.slice(0, -1).trimEnd();
        }
        best = fallback.replace(/[.,;:!?-–—\s]+$/u, '');
      }

      updateDisplay({ content: best, truncated: true });
    };

    const frame = window.requestAnimationFrame(fitText);
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', fitText);
      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener('resize', fitText);
      };
    }

    const observer = new ResizeObserver(fitText);
    observer.observe(node);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [text, to]);

  return (
    <div className="relative">
      <blockquote ref={textRef} className="text-[15px] leading-[1.65] text-[#26333f]">
        {display.content}
        {display.truncated ? '... ' : null}
        {display.truncated && to ? <Link to={to} className="font-bold text-brand-dark">Read More</Link> : null}
      </blockquote>
      <div ref={measureRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 -z-10 invisible text-[15px] leading-[1.65] text-[#26333f]" />
    </div>
  );
};

const ReviewCard = ({ review, vehicle }) => {
  const rating = Math.max(1, Math.min(5, Math.round(review.rating || 5)));
  const name = review.travelerName || 'Traveller';
  const driverReviewsLink = vehicle?.driver?.id ? `/drivers/${vehicle.driver.id}#reviews` : null;
  const reviewText = review.comment || review.title || 'A five-star car-with-driver journey across Sri Lanka.';
  // First attached photo becomes the card cover (same treatment as the vehicle cards).
  const cover = Array.isArray(review.images) && review.images.length ? review.images[0] : null;
  return (
    <figure className="m-0 flex flex-col overflow-hidden rounded-[20px] border border-[#e5ebe8] bg-white">
      {cover ? (
        <div className="h-[186px] w-full bg-[#eef1f0]">
          <img src={cover} alt={`${name}'s trip photo`} className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-[22px]">
        <div className="flex gap-[3px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon key={i} fill={i < rating ? '#f5b400' : '#e3e8e5'} />
          ))}
        </div>
        <div className="mt-3.5 flex-1">
          <ClampedReviewText text={reviewText} to={driverReviewsLink} />
        </div>
        <figcaption className="mt-[18px] flex items-center gap-[11px] border-t border-[#f0f3f2] pt-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e7ddfb] text-sm font-extrabold text-[#6b3fc0]">
            {name.charAt(0).toUpperCase()}
          </span>
          <span className="flex flex-col gap-0.5">
            <b className="block text-sm leading-[1.1]">{name}</b>
            <span className="text-[12.5px] leading-[1.1] font-semibold text-muted-soft">{reviewSubline(review)}</span>
          </span>
        </figcaption>
      </div>
    </figure>
  );
};

const PriceRow = ({ label, value, green = false }) => (
  <div className="flex flex-wrap justify-between gap-2 text-[14.5px] font-semibold text-ink-soft">
    <span>{label}</span>
    <b className={green ? 'text-brand-dark' : 'text-ink'}>{value}</b>
  </div>
);

const CardSkeleton = ({ withImage = false }) => (
  <div className="animate-pulse rounded-[20px] border border-[#e9edeb] bg-white p-5">
    {withImage ? <div className="mb-4 h-[160px] w-full rounded-xl bg-[#eef1f0]" /> : null}
    <div className="h-4 w-2/3 rounded bg-[#eef1f0]" />
    <div className="mt-3 h-3 w-full rounded bg-[#eef1f0]" />
    <div className="mt-2 h-3 w-1/2 rounded bg-[#eef1f0]" />
    <div className="mt-6 h-9 w-1/3 rounded-full bg-[#eef1f0]" />
  </div>
);

const ErrorCard = ({ message, to, cta }) => (
  <div className="rounded-[20px] border border-[#ffd7dd] bg-[#fff5f6] p-6 text-sm text-[#b23050] sm:col-span-2 lg:col-span-3">
    <p>{message}</p>
    <Link to={to} className="mt-3 inline-flex rounded-full border border-[#ffd7dd] bg-white px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#b23050]">
      {cta}
    </Link>
  </div>
);

const EmptyCard = ({ children }) => (
  <div className="rounded-[20px] border border-[#e5ebe8] bg-white p-6 text-sm text-muted sm:col-span-2 lg:col-span-3">{children}</div>
);

export default HomePage;

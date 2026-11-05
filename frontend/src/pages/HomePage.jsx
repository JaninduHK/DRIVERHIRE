import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import DateField from '../components/DateField.jsx';
import { Link, useNavigate } from '../i18n/router.jsx';
import { Trans, useI18n } from '../i18n/I18nProvider.jsx';
import { translateFeature } from '../i18n/labels.js';
import { fetchVehicles } from '../services/vehicleCatalogApi.js';
import { fetchDriverDirectory } from '../services/driverDirectoryApi.js';
import { fetchLatestReviews } from '../services/reviewApi.js';
import { useLoaderData } from 'react-router';
import { getStoredToken, redirectToSsoLogin } from '../services/authToken.js';
import { LicenseIconBadge, LicenseTypeChip } from '../components/LicenseBadge.jsx';

// Prefill stash read by the traveller "My Requests" tab to open a new quote request.
import { savePendingBrief } from '../lib/pendingBrief.js';
import { afterTracking, trackQuoteFormStart, trackQuoteFormSubmit } from '../lib/analytics.js';
const REQUESTS_PATH = '/dashboard?tab=requests';

// ---------- helpers ----------
const money = (value) =>
  typeof value === 'number' && !Number.isNaN(value)
    ? `$${Math.round(value).toLocaleString('en-US')}`
    : null;

const yearsLabel = (years, t) => {
  const n = Number(years);
  if (!Number.isFinite(n) || n <= 0) return t('home.card.newGuide');
  return t('home.card.years', { count: Math.round(n) });
};

const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'D';

const getVehicleImage = (vehicle) => {
  if (Array.isArray(vehicle?.images) && vehicle.images.length) return vehicle.images[0];
  return vehicle?.image || vehicle?.featuredImage || null;
};

const formatDateRange = (start, end, intl = 'en-US') => {
  const fmt = (v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString(intl, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const s = fmt(start);
  const e = fmt(end);
  if (s && e) return `${s} – ${e}`;
  return s || e || null;
};

const reviewSubline = (review, t, intl) => {
  const range = formatDateRange(review?.visitedStartDate, review?.visitedEndDate, intl);
  if (range) return range;
  return formatDateRange(review?.publishedAt || review?.createdAt, undefined, intl) || t('home.card.sriLankaTrip');
};

const VEHICLE_TAGS = ['bestValue', 'groupFriendly', 'longTours'];
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
    label: 'sltda',
    svg: (
      <path d="M10 2l6 2.5v5c0 4-2.6 7-6 8.5-3.4-1.5-6-4.5-6-8.5v-5L10 2zM7.5 10l1.8 1.8L13 8" />
    ),
  },
  {
    label: 'coverage',
    svg: <path d="M10 18s6-4.8 6-9a6 6 0 1 0-12 0c0 4.2 6 9 6 9zM10 6.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4z" />,
  },
  {
    label: 'priceGuarantee',
    svg: <path d="M3 16V8l7-4 7 4v8M8 16v-4h4v4" />,
  },
  {
    label: 'support',
    svg: <path d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM10 6v4.3l3 1.8" />,
  },
];

// Text in home.faq.<key>; 'cancel' is a bullet list with an outro line.
const FAQS = ['cost', 'free', 'quotes', 'cancel', 'licensed'];

const PARTY_OPTIONS = ['1–3', '4–6', '7+'];
const PARTY_TO_ADULTS = { '1–3': '2', '4–6': '4', '7+': '7' };

const inputCls =
  'w-full rounded-xl border-[1.5px] border-[#e5ebe8] bg-[#fbfcfc] px-3.5 py-3 text-[14.5px] font-semibold text-ink outline-none transition focus:border-brand';
const labelCls = 'mb-1.5 block text-xs font-bold text-muted';

const HomePage = () => {
  const { t, locale } = useI18n();
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
        if (!cancelled) setVehicleState({ loading: false, error: error?.message || t('home.fleet.error'), items: [] });
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
        if (!cancelled) setDriverState({ loading: false, error: error?.message || t('home.drivers.error'), items: [] });
      });
    return () => { cancelled = true; };
  }, []);

  const featuredVehicles = useMemo(() => vehicleState.items.slice(0, 3), [vehicleState.items]);
  // Admin's handpicked drivers lead (in their chosen order); any remaining slots
  // fall back to the ranked directory order, so the strip is never short.
  const featuredDrivers = useMemo(() => {
    const picked = driverState.items
      .filter((d) => d.featured)
      .sort((a, b) => (a.featuredOrder ?? 0) - (b.featuredOrder ?? 0));
    const rest = driverState.items.filter((d) => !d.featured);
    return [...picked, ...rest].slice(0, 3);
  }, [driverState.items]);

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
        if (!cancelled) setReviewState({ loading: false, error: error?.message || t('home.reviews.error'), items: [] });
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
    savePendingBrief({ language: locale, ...prefill });
    if (!getStoredToken()) {
      // Straight to Asgardeo's hosted sign-in/registration, same as /get-quotes.
      afterTracking(() => redirectToSsoLogin(REQUESTS_PATH));
      return;
    }
    navigate(REQUESTS_PATH);
  };

  const handleQuoteSubmit = (event) => {
    event.preventDefault();
    trackQuoteFormSubmit('home_mini_form');
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
              {t('home.hero.badge')}
            </span>
            <h1 className="mt-[18px] text-[clamp(33px,5vw,54px)] font-extrabold leading-[1.06] tracking-[-.03em]">
              <Trans k="home.hero.title" components={{ brand: <span className="text-brand" /> }} />
            </h1>
            <p className="mt-4 max-w-[560px] text-[clamp(15.5px,1.4vw,18px)] leading-[1.6] text-muted">
              {t('home.hero.lead')}
            </p>
            <div className="mt-[26px] grid grid-cols-1 gap-3 sm:grid-cols-2">
              <a
                href="#quote"
                className="inline-flex items-center justify-center gap-2.5 rounded-[13px] bg-brand px-6 py-[15px] text-[15.5px] font-bold text-white shadow-[0_12px_26px_-12px_rgba(16,163,90,.65)] transition hover:bg-brand-dark"
              >
                {t('home.hero.planTrip')} <ArrowIcon />
              </a>
              <Link
                to="/vehicles"
                className="inline-flex items-center justify-center gap-2.5 rounded-[13px] border-[1.5px] border-[#dde4e1] bg-white px-6 py-[15px] text-[15.5px] font-bold text-ink transition hover:border-brand"
              >
                {t('home.hero.browse')}
              </Link>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-[clamp(8px,2.5vw,14px)] border-t border-[#e4ece7] pt-[26px] text-center">
              <HeroStat label={t('home.hero.statRate')} value="$50" suffix={t('home.card.perDay')} />
              <HeroStat label={t('home.hero.statRating')} value="4.9" suffix=" / 5" />
              <HeroStat label={t('home.hero.statReply')} value={t('home.hero.statReplyValue')} />
            </dl>
          </div>

          {/* right: quote form */}
          <form
            id="quote"
            onSubmit={handleQuoteSubmit}
            onFocus={() => trackQuoteFormStart('home_mini_form')}
            className="scroll-mt-24 rounded-[24px] border border-[#e5ebe8] bg-white p-[clamp(20px,2.4vw,28px)] shadow-[0_28px_60px_-32px_rgba(15,31,45,.28)]"
          >
            <h2 className="text-[19px] font-extrabold tracking-[-.01em]">{t('home.form.title')}</h2>
            <p className="mt-[7px] text-[13.5px] leading-[1.5] text-muted">
              {t('home.form.intro')}
            </p>
            <div className="mt-5 grid gap-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>{t('home.form.startDate')}</span>
                  <DateField value={form.startDate} onChange={setField('startDate')} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>{t('home.form.endDate')}</span>
                  <DateField value={form.endDate} min={form.startDate || undefined} onChange={setField('endDate')} className={inputCls} />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>{t('home.form.pickup')}</span>
                  <input type="text" value={form.pickup} onChange={setField('pickup')} placeholder={t('home.form.placePlaceholder')} className={inputCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>{t('home.form.dropoff')}</span>
                  <input type="text" value={form.dropoff} onChange={setField('dropoff')} placeholder={t('home.form.placePlaceholder')} className={inputCls} />
                </label>
              </div>
              <div>
                <span className={labelCls}>{t('home.form.travellers')}</span>
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
                  {t('home.form.notes')} <span className="font-semibold text-[#a3b0bb]">{t('home.form.optional')}</span>
                </span>
                <textarea
                  rows="3"
                  value={form.notes}
                  onChange={setField('notes')}
                  placeholder={t('home.form.notesPlaceholder')}
                  className={`${inputCls} resize-y leading-[1.5]`}
                />
              </label>
              <button
                type="submit"
                className="mt-1 rounded-[13px] bg-brand px-4 py-[15px] text-[15.5px] font-bold text-white transition hover:bg-brand-dark"
              >
                {t('home.form.submit')}
              </button>
              <p className="text-center text-xs leading-[1.5] text-muted-soft">
                {t('home.form.footnote')}
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
              <span className="text-[13.5px] font-bold">{t(`home.badges.${badge.label}`)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] py-[clamp(44px,5vw,78px)]">
        <Eyebrow>{t('home.how.eyebrow')}</Eyebrow>
        <h2 className="mt-3 max-w-[640px] text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.15] tracking-[-.02em]">
          {t('home.how.title')}
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-[clamp(14px,2vw,22px)] md:grid-cols-3">
          {['1', '2', '3'].map((n) => ({ n, t: t(`home.how.step${n}Title`), d: t(`home.how.step${n}Body`) })).map((step) => (
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
            eyebrow={t('home.fleet.eyebrow')}
            title={t('home.fleet.title')}
            copy={t('home.fleet.copy')}
            to="/vehicles"
            cta={t('home.fleet.cta')}
          />
          <div className="mt-8 grid grid-cols-1 gap-[clamp(14px,2vw,22px)] sm:grid-cols-2 lg:grid-cols-3">
            {vehicleState.loading ? (
              skeletons.map((s) => <CardSkeleton key={s} withImage />)
            ) : vehicleState.error ? (
              <ErrorCard message={vehicleState.error} to="/vehicles" cta={t('home.fleet.errorCta')} />
            ) : featuredVehicles.length === 0 ? (
              <EmptyCard>
                <Trans k="home.fleet.empty" components={{ link: <Link to="/vehicles" className="font-bold text-brand-dark" /> }} />
              </EmptyCard>
            ) : (
              featuredVehicles.map((vehicle, i) => <VehicleCard key={vehicle.id} vehicle={vehicle} tag={VEHICLE_TAGS[i] ? t(`home.vehicleTags.${VEHICLE_TAGS[i]}`) : null} />)
            )}
          </div>
        </div>
      </section>

      {/* ===== DRIVERS ===== */}
      <section id="drivers" className="bg-ink">
        <div className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] py-[clamp(44px,5vw,78px)]">
          <SectionHead
            dark
            eyebrow={t('home.drivers.eyebrow')}
            title={t('home.drivers.title')}
            copy={t('home.drivers.copy')}
            to="/drivers"
            cta={t('home.drivers.cta')}
          />
          <div className="mt-8 grid grid-cols-1 gap-[clamp(14px,2vw,22px)] sm:grid-cols-2 lg:grid-cols-3">
            {driverState.loading ? (
              skeletons.map((s) => <CardSkeleton key={s} />)
            ) : driverState.error ? (
              <ErrorCard message={driverState.error} to="/drivers" cta={t('home.drivers.errorCta')} />
            ) : featuredDrivers.length === 0 ? (
              <EmptyCard>
                <Trans k="home.drivers.empty" components={{ link: <Link to="/drivers" className="font-bold text-brand-dark" /> }} />
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
          <Eyebrow>{t('home.pricing.eyebrow')}</Eyebrow>
          <h2 className="mt-3 text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.15] tracking-[-.02em]">
            {t('home.pricing.title')}
          </h2>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-muted">
            {t('home.pricing.body')}
          </p>
          <ul className="mt-[22px] grid gap-[11px]">
            {t('home.pricing.items').map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[14.5px] font-semibold">
                <CheckIcon />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[22px] border border-[#e5ebe8] bg-[#f7faf8] p-[clamp(20px,2.4vw,28px)]">
          <div className="text-xs font-extrabold tracking-[.06em] text-muted-soft">{t('home.pricing.sampleTitle')}</div>
          <div className="mt-4 grid gap-3">
            <PriceRow label={t('home.pricing.rowVehicle')} value="$300" />
            <PriceRow label={t('home.pricing.rowFuel')} value={t('home.pricing.included')} green />
            <PriceRow label={t('home.pricing.rowAirport')} value={t('home.pricing.included')} green />
            <PriceRow label={t('home.pricing.rowFee')} value="$0" green />
            <div className="flex items-center justify-between border-t border-[#e2e9e5] pt-3.5">
              <span className="text-[15px] font-extrabold">{t('home.pricing.total')}</span>
              <span className="text-[24px] font-extrabold">$300</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => goToRequests()}
            className="mt-[18px] block w-full rounded-[13px] bg-ink py-3.5 text-center text-[15px] font-bold text-white transition hover:bg-ink/90"
          >
            {t('home.pricing.cta')}
          </button>
        </div>
      </section>

      {/* ===== REVIEWS ===== */}
      <section id="reviews" className="border-y border-[#e6f0ea] bg-[#f1f9f4]">
        <div className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] py-[clamp(44px,5vw,78px)]">
          <Eyebrow tone="brand-dark">{t('home.reviews.eyebrow')}</Eyebrow>
          <h2 className="mt-3 max-w-[720px] text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.15] tracking-[-.02em]">
            {t('home.reviews.title')}
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-[clamp(14px,2vw,22px)] sm:grid-cols-2 lg:grid-cols-3">
            {reviewState.loading ? (
              skeletons.map((s) => <CardSkeleton key={s} />)
            ) : reviewState.items.length === 0 ? (
              <EmptyCard>
                <Trans k="home.reviews.empty" components={{ link: <Link to="/vehicles" className="font-bold text-brand-dark" /> }} />
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
          <Eyebrow>{t('home.faq.eyebrow')}</Eyebrow>
          <h2 className="mt-3 text-[clamp(25px,3vw,36px)] font-extrabold leading-[1.15] tracking-[-.02em]">
            {t('home.faq.title')}
          </h2>
          <p className="mt-3 text-[15.5px] leading-[1.6] text-muted">
            <Trans k="home.faq.intro" components={{ phone: <a href="tel:+94763021483" className="font-semibold text-brand-dark" /> }} />
          </p>
        </div>
        <div className="grid gap-3">
          {FAQS.map((key) => {
            const faq = {
              q: t(`home.faq.${key}.q`),
              a: key === 'cancel' ? null : t(`home.faq.${key}.a`),
              bullets: key === 'cancel' ? t(`home.faq.${key}.bullets`) : null,
              outro: key === 'cancel' ? t(`home.faq.${key}.outro`) : null,
            };
            return (
            <details key={key} className="group rounded-[16px] border border-[#e5ebe8] bg-white px-[18px] py-4">
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
            );
          })}
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="mx-auto max-w-[1200px] px-[clamp(18px,4vw,40px)] pb-[clamp(44px,5vw,72px)]">
        <div className="grid grid-cols-1 items-center gap-[22px] rounded-[26px] bg-brand p-[clamp(26px,3.4vw,48px)] lg:grid-cols-2">
          <div>
            <p className="text-[12.5px] font-extrabold uppercase tracking-[.1em] text-white/80">{t('home.cta.eyebrow')}</p>
            <h2 className="mt-3 text-[clamp(23px,2.6vw,33px)] font-extrabold leading-[1.2] tracking-[-.02em] text-white">
              {t('home.cta.title')}
            </h2>
            <p className="mt-2.5 max-w-[560px] text-[15px] leading-[1.6] text-white/90">
              {t('home.cta.body')}
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a href="#quote" className="inline-flex items-center justify-center gap-2.5 rounded-[13px] bg-white px-6 py-[15px] text-[15.5px] font-bold text-ink">
              {t('home.cta.quote')} <ArrowIcon stroke="#0f1f2d" />
            </a>
            <a href="tel:+94763021483" className="inline-flex items-center justify-center gap-2.5 rounded-[13px] border border-white/40 bg-white/[0.16] px-6 py-[15px] text-[15.5px] font-bold text-white">
              {t('home.cta.call', { phone: '+94 76 3021 483' })}
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
  const { t } = useI18n();
  const image = getVehicleImage(vehicle);
  const discount = vehicle.activeDiscount;
  const hasDiscount = Boolean(discount?.name && typeof discount?.discountedPricePerDay === 'number');
  const rate = money(hasDiscount ? discount.discountedPricePerDay : vehicle.pricePerDay) || t('home.card.quote');
  const originalRate = hasDiscount ? money(vehicle.pricePerDay) : null;
  const chips = [
    vehicle.seats ? t('home.card.seats', { count: vehicle.seats }) : null,
    vehicle.year ? t('home.card.year', { year: vehicle.year }) : null,
    Array.isArray(vehicle.features) && vehicle.features.length ? translateFeature(vehicle.features[0], t) : null,
  ].filter(Boolean).slice(0, 3);
  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border border-[#e9edeb] bg-white">
      <div className="h-[186px] w-full bg-[#eef1f0]">
        {image ? (
          <img src={image} alt={vehicle.model || t('home.card.vehicleAlt')} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-soft">
            <svg width="34" height="34" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"><path d="M2.5 12.5h15M4 12.5l1.6-4.6A2 2 0 0 1 7.5 6.5h5a2 2 0 0 1 1.9 1.4l1.6 4.6" /><circle cx="6" cy="15" r="1.4" /><circle cx="14" cy="15" r="1.4" /></svg>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-[18px]">
        <div className="flex items-center justify-between gap-2.5">
          <h3 className="text-[17.5px] font-extrabold">{vehicle.model || t('home.card.featuredVehicle')}</h3>
          {hasDiscount ? (
            <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-2.5 py-[5px] text-xs font-bold text-white">
              {discount.name}
            </span>
          ) : tag ? (
            <span className="rounded-full bg-[#e9f8ef] px-2.5 py-[5px] text-xs font-bold text-brand-dark">{tag}</span>
          ) : null}
        </div>
        <p className="mt-2.5 flex-1 text-[14px] leading-[1.55] text-muted line-clamp-3">
          {vehicle.description || t('home.card.vehicleFallback')}
        </p>
        {chips.length ? <div className="mt-3.5 flex flex-wrap gap-[7px]">{chips.map((c) => <Chip key={c}>{c}</Chip>)}</div> : null}
        <div className="mt-4 flex items-center justify-between gap-2.5 border-t border-[#f0f3f2] pt-3.5">
          <div>
            <div className="text-[11px] font-bold tracking-[.04em] text-muted-soft">{t('home.card.from')}</div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-[17px] font-extrabold ${hasDiscount ? 'text-brand-dark' : ''}`}>{rate}</span>
              <span className="text-[12.5px] font-semibold text-muted-soft">{t('home.card.perDay')}</span>
              {originalRate ? <span className="text-[12px] font-semibold text-[#e11d48] line-through">{originalRate}</span> : null}
            </div>
          </div>
          <Link to={`/vehicles/${vehicle.id}`} className="inline-flex min-h-[44px] items-center rounded-[11px] bg-[#e9f8ef] px-4 text-[13.5px] font-bold text-brand-dark">
            {t('home.card.getQuote')}
          </Link>
        </div>
      </div>
    </article>
  );
};

const DriverCard = ({ driver }) => {
  const { t } = useI18n();
  const rating = driver.reviewScore ? driver.reviewScore.toFixed(1) : '—';
  const reviews = driver.reviewCount ?? 0;
  const location = driver.location?.label || driver.address || t('home.card.islandWide');
  const rate = money(driver.averagePricePerDay) || t('home.card.quote');
  const chips = [driver.featuredVehicle?.model || t('home.card.multidayTours'), location].filter(Boolean);
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
            <LicenseIconBadge licenseType={driver.licenseType} />
          </div>
          {driver.licenseType ? (
            <LicenseTypeChip licenseType={driver.licenseType} />
          ) : (
            <div className="mt-[3px] text-[12.5px] font-semibold text-muted-soft">{location}</div>
          )}
        </div>
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold">
        {reviews > 0 ? (
          <>
            <StarIcon />
            {rating}
            <span className="font-semibold text-muted-soft">· {t('home.card.reviews', { count: reviews })} · {yearsLabel(driver.experienceYears, t)}</span>
          </>
        ) : (
          <span className="font-semibold text-muted-soft">{t('home.card.noReviews')} · {yearsLabel(driver.experienceYears, t)}</span>
        )}
      </div>
      <p className="mt-[11px] flex-1 text-[14px] leading-[1.6] text-muted line-clamp-3">
        {driver.description || t('home.card.driverFallback')}
      </p>
      <div className="mt-3.5 flex flex-wrap gap-[7px]">{chips.map((c) => <Chip key={c}>{c}</Chip>)}</div>
      <div className="mt-4 flex items-center justify-between gap-2.5 border-t border-[#f0f3f2] pt-3.5">
        <div>
          <div className="text-[11px] font-bold tracking-[.04em] text-muted-soft">{t('home.card.avgDailyRate')}</div>
          <div className="text-[17px] font-extrabold">{rate}<span className="text-[12.5px] font-semibold text-muted-soft">{t('home.card.perDay')}</span></div>
        </div>
        <Link to={`/drivers/${driver.id}`} className="inline-flex min-h-[44px] items-center rounded-[11px] bg-[#e9f8ef] px-4 text-[13.5px] font-bold text-brand-dark">
          {t('home.card.viewDriver')}
        </Link>
      </div>
    </article>
  );
};

const ClampedReviewText = ({ text, to }) => {
  const { t } = useI18n();
  const readMore = t('home.card.readMore');
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
          more.textContent = readMore;
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
  }, [text, to, readMore]);

  return (
    <div className="relative">
      <blockquote ref={textRef} className="text-[15px] leading-[1.65] text-[#26333f]">
        {display.content}
        {display.truncated ? '... ' : null}
        {display.truncated && to ? <Link to={to} className="font-bold text-brand-dark">{readMore}</Link> : null}
      </blockquote>
      <div ref={measureRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 -z-10 invisible text-[15px] leading-[1.65] text-[#26333f]" />
    </div>
  );
};

const ReviewCard = ({ review, vehicle }) => {
  const { t, intl } = useI18n();
  const rating = Math.max(1, Math.min(5, Math.round(review.rating || 5)));
  const name = review.travelerName || t('home.card.traveller');
  const driverReviewsLink = vehicle?.driver?.id ? `/drivers/${vehicle.driver.id}#reviews` : null;
  const reviewText = review.comment || review.title || t('home.card.reviewFallback');
  // First attached photo becomes the card cover (same treatment as the vehicle cards).
  const cover = Array.isArray(review.images) && review.images.length ? review.images[0] : null;
  return (
    <figure className="m-0 flex flex-col overflow-hidden rounded-[20px] border border-[#e5ebe8] bg-white">
      {cover ? (
        <div className="h-[186px] w-full bg-[#eef1f0]">
          <img src={cover} alt={t('home.card.tripPhoto', { name })} className="h-full w-full object-cover" />
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
            <span className="text-[12.5px] leading-[1.1] font-semibold text-muted-soft">{reviewSubline(review, t, intl)}</span>
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

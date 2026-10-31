import React, { useMemo, useState } from 'react';
import { Link } from '../i18n/router.jsx';
import { Trans, useI18n } from '../i18n/I18nProvider.jsx';
import { useLoaderData } from 'react-router';
import {
  Activity,
  Check,
  ChevronDown,
  Clock,
  Minus,
  Plus,
  Route as RouteIcon,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import {
  DEFAULT_ITINERARY,
  ITINERARY_PRESETS,
  PLACES,
  placeTypeLabel,
  roadDistanceKm,
} from '../lib/tripPlaces.js';
import {
  calculateClassEstimates,
  calculateInclusionRates,
  calculateTripEstimate,
  priceFormatter,
} from '../lib/tripCostEstimator.js';

const money = (value) => priceFormatter(value) || '—';

const isoToday = () => {
  const d = new Date();
  d.setDate(d.getDate() + 21); // default to a few weeks out, a reasonable planning horizon
  return d.toISOString().slice(0, 10);
};

const formatDate = (iso, intl) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(intl, { weekday: 'short', day: 'numeric', month: 'short' });
};

const toIso = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Text in tripCost.faq.<key>.
const FAQS = ['fuel', 'hotel', 'notIncluded', 'accuracy', 'change'];

let uidCounter = 0;
const nextUid = () => {
  uidCounter += 1;
  return `stop-${uidCounter}`;
};
const withUids = (stops) => stops.map((s) => ({ uid: nextUid(), ...s }));

const TripCostCalculator = () => {
  const { t, locale, intl } = useI18n();
  // This page always used British-style dates in English ("Mon 5 Jan").
  const dateLocale = locale === 'en' ? 'en-GB' : intl;
  const placeName = (id) => t(`places.names.${id}`);
  const { vehicles } = useLoaderData();

  const [startDate, setStartDate] = useState(isoToday);
  const [pax, setPax] = useState(2);
  const [stops, setStops] = useState(() => withUids(DEFAULT_ITINERARY));
  const [searchOpenUid, setSearchOpenUid] = useState(null);
  const [query, setQuery] = useState('');

  const dateForIndex = (index) => {
    const d = new Date(`${startDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    let offset = 0;
    for (let j = 0; j < index; j += 1) offset += Math.max(1, stops[j].nights || 1);
    d.setDate(d.getDate() + offset);
    return d;
  };

  const legs = useMemo(() => {
    const out = [];
    for (let i = 1; i < stops.length; i += 1) {
      const km = roadDistanceKm(stops[i - 1].place, stops[i].place);
      const hours = km / 42;
      out.push({
        from: PLACES[stops[i - 1].place] ? placeName(stops[i - 1].place) : '',
        to: PLACES[stops[i].place] ? placeName(stops[i].place) : '',
        km,
        timeLabel:
          hours < 1
            ? t('tripCost.minDrive', { count: Math.round(hours * 60) })
            : t('tripCost.hrsDrive', { count: Math.round(hours * 2) / 2 }),
      });
    }
    return out;
    // placeName depends only on t.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops, t]);

  const totalKm = legs.reduce((sum, l) => sum + l.km, 0);
  const nightsTotal = stops.reduce(
    (sum, s, i) => sum + (i === 0 ? s.nights || 0 : Math.max(1, s.nights || 1)),
    0
  );
  const days = Math.max(1, nightsTotal + 1);
  const paxNumber = Number(pax) || 0;

  const overallEstimate = useMemo(
    () => calculateTripEstimate({ vehicles, seatCount: paxNumber, days }),
    [vehicles, paxNumber, days]
  );
  const classEstimates = useMemo(
    () => calculateClassEstimates({ vehicles, seatCount: paxNumber, days }),
    [vehicles, paxNumber, days]
  );
  const inclusionRates = useMemo(
    () => calculateInclusionRates({ vehicles, seatCount: paxNumber }),
    [vehicles, paxNumber]
  );

  const resultReady = Boolean(overallEstimate?.perDay);
  const totalAverage = resultReady ? money(overallEstimate.totals.average) : '—';
  const totalRange = resultReady ? `${money(overallEstimate.totals.low)} – ${money(overallEstimate.totals.high)}` : '—';
  const perDayAverage = resultReady ? money(overallEstimate.perDay.average) : '—';
  const perDayRange = resultReady ? `${money(overallEstimate.perDay.low)} – ${money(overallEstimate.perDay.high)}` : '—';
  const buffer =
    resultReady && Number.isFinite(overallEstimate.totals.high) && Number.isFinite(overallEstimate.totals.average)
      ? money(overallEstimate.totals.high - overallEstimate.totals.average)
      : null;

  const paceOk = totalKm / days <= 190;
  const kmPerDay = Math.round(totalKm / days);

  const updateStop = (uid, patch) =>
    setStops((prev) => prev.map((s) => (s.uid === uid ? { ...s, ...patch } : s)));

  const addStop = () => setStops((prev) => [...prev, { uid: nextUid(), place: 'galle', nights: 1 }]);
  const removeStop = (uid) => setStops((prev) => (prev.length <= 2 ? prev : prev.filter((s) => s.uid !== uid)));
  const startOver = () => setStops(withUids([{ place: 'cmb', nights: 0 }, { place: 'colombo', nights: 2 }]));
  const applyPreset = (presetStops) => setStops(withUids(presetStops));

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((key) => ({
      '@type': 'Question',
      name: t(`tripCost.faq.${key}.q`),
      acceptedAnswer: { '@type': 'Answer', text: t(`tripCost.faq.${key}.a`) },
    })),
  };

  // Rendered in the sidebar on desktop, and inline right after the itinerary on
  // mobile, where the sidebar would otherwise land at the very bottom of the page.
  const costSummary = (
      <div className="rounded-[22px] bg-ink p-6 text-white">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/65">{t('tripCost.summary.estimated')}</p>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-4xl font-extrabold tracking-tight">{totalAverage}</p>
          <p className="pb-1 text-sm font-bold text-white/55">≈ {money(overallEstimate.totals ? Math.round(overallEstimate.totals.average / days) : null)}{t('tripCost.perDay')}</p>
        </div>
        <p className="mt-1 text-sm font-medium text-white/70">
          {t('tripCost.days', { count: days })} · {t('tripCost.nights', { count: nightsTotal })} · {paxNumber ? t('tripCost.passengers', { count: paxNumber }) : `— ${t('tripCost.passengersWord')}`}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">{t('tripCost.summary.likelyRange')}</p>
            <p className="mt-1 text-lg font-extrabold">{totalRange}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">{t('tripCost.summary.totalDistance')}</p>
            <p className="mt-1 text-lg font-extrabold">{totalKm.toLocaleString(intl)} km</p>
          </div>
        </div>
        {buffer ? (
          <p className="mt-4 text-xs font-medium text-white/55">{t('tripCost.summary.buffer', { amount: buffer })}</p>
        ) : null}
        <Link
          to="/get-quotes"
          className="mt-5 flex items-center justify-center rounded-2xl bg-brand px-4 py-3.5 text-sm font-extrabold text-white hover:bg-brand-dark"
        >
          {t('tripCost.summary.request')}
        </Link>
        <p className="mt-2 text-center text-[11px] font-medium leading-relaxed text-white/45">
          {t('tripCost.summary.noPayment')}
        </p>
      </div>
  );

  return (
    <div className="pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Full-bleed hero; the page owns its own gutters since this route renders wide. */}
      <section className="bg-gradient-to-br from-[#0c7a44] via-brand to-[#18b866] text-white">
        <div className="mx-auto max-w-[1240px] space-y-6 px-4 py-[clamp(30px,4.5vw,58px)] sm:px-6 lg:px-10">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
          <Sparkles className="h-3.5 w-3.5" />
          {t('tripCost.hero.badge')}
        </p>
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {t('tripCost.hero.title')}
          </h1>
          <p className="max-w-3xl text-base text-white/85 sm:text-lg">
            {t('tripCost.hero.lead')}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl bg-white/[0.13] border border-white/[0.15] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{t('tripCost.hero.liveFleet')}</p>
            <p className="mt-1 text-2xl font-extrabold">{vehicles.length}</p>
            <p className="text-sm font-medium text-white/70">{t('tripCost.hero.approvedVehicles')}</p>
          </article>
          <article className="rounded-2xl bg-white/[0.13] border border-white/[0.15] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{t('tripCost.hero.medianRate')}</p>
            <p className="mt-1 text-2xl font-extrabold">{perDayAverage}</p>
            <p className="text-sm font-medium text-white/70">{paxNumber ? t('tripCost.hero.forPassengers', { count: paxNumber }) : t('tripCost.hero.forAny')}</p>
          </article>
          <article className="rounded-2xl bg-white/[0.13] border border-white/[0.15] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{t('tripCost.hero.typicalRange')}</p>
            <p className="mt-1 text-2xl font-extrabold">{perDayRange}</p>
            <p className="text-sm font-medium text-white/70">{t('tripCost.hero.middle50')}</p>
          </article>
          <article className="rounded-2xl bg-white/[0.13] border border-white/[0.15] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">{t('tripCost.hero.thisItinerary')}</p>
            <p className="mt-1 text-2xl font-extrabold">{t('tripCost.days', { count: days })}</p>
            <p className="text-sm font-medium text-white/70">{t('tripCost.hero.stops', { count: stops.length })} · {totalKm.toLocaleString(intl)} km</p>
          </article>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1240px] gap-6 px-4 pt-[clamp(22px,3vw,36px)] sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:px-10">
        <div className="min-w-0 space-y-6">
          {/* Who's travelling */}
          <div className="space-y-4 rounded-[22px] border border-[#e6ece9] bg-white p-6">
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-brand-dark">{t('tripCost.step', { n: 1 })}</p>
                <h2 className="text-xl font-extrabold tracking-tight text-ink">{t('tripCost.who.title')}</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-xl border border-[#d6ece0] bg-[#f2faf6] px-3 py-2 text-[13px] font-bold text-brand-dark">
                <Clock className="h-[15px] w-[15px]" />
                {t('tripCost.days', { count: days })} · {t('tripCost.nights', { count: nightsTotal })}
              </span>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink-soft">
                {t('tripCost.who.startDate')}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border-[1.5px] border-[#dde4e1] bg-white px-4 py-2.5 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink-soft">
                {t('tripCost.who.passengers')}
                <div className="relative">
                  <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
                  <input
                    type="number"
                    min="1"
                    max="15"
                    step="1"
                    value={pax}
                    onChange={(e) => setPax(e.target.value)}
                    className="w-full rounded-xl border-[1.5px] border-[#dde4e1] bg-white px-10 py-2.5 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
              </label>
            </div>
          </div>

          {/* Itinerary */}
          <div id="itinerary" className="scroll-mt-24 space-y-4 rounded-[22px] border border-[#e6ece9] bg-white p-6">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-brand-dark">{t('tripCost.step', { n: 2 })}</p>
                <h2 className="text-xl font-extrabold tracking-tight text-ink">{t('tripCost.itinerary.title')}</h2>
                <p className="text-sm text-muted">{t('tripCost.itinerary.lead')}</p>
              </div>
            </header>

            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {ITINERARY_PRESETS.map((preset, presetIndex) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.stops)}
                  className="flex-shrink-0 whitespace-nowrap rounded-full border-[1.5px] border-[#dde4e1] bg-white px-3.5 py-1.5 text-xs font-bold text-ink transition hover:border-brand hover:text-brand-dark"
                >
                  {t(`places.presets.p${presetIndex}`)}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {stops.map((stop, i) => {
                const place = PLACES[stop.place];
                const leg = i > 0 ? legs[i - 1] : null;
                const open = searchOpenUid === stop.uid;
                const q = query.trim().toLowerCase();
                // Matches the place name and type in the visitor's language and in English.
                const results = Object.entries(PLACES).filter(
                  ([id, p]) =>
                    !q ||
                    [p.name, placeName(id), placeTypeLabel(p.type), t(`places.types.${p.type}`)].some((text) =>
                      text.toLowerCase().includes(q)
                    )
                );
                const isLast = i === stops.length - 1;

                return (
                  <React.Fragment key={stop.uid}>
                    {leg ? (
                      <div className="flex items-center justify-center py-1">
                        <span className="inline-flex items-center gap-2 rounded-full border border-[#d6ece0] bg-[#f2faf6] px-3 py-1 text-xs font-bold text-brand-dark">
                          <RouteIcon className="h-3.5 w-3.5" />
                          {leg.km} km · {leg.timeLabel}
                        </span>
                      </div>
                    ) : null}

                    <article className={`rounded-2xl border-[1.5px] p-4 ${isLast ? 'border-[#d6ece0] bg-[#f7fbf9]' : 'border-[#e6ece9] bg-white'}`}>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-ink text-sm font-extrabold text-[#7fd9a8]">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-extrabold tracking-tight text-ink">{place ? placeName(stop.place) : ''}</p>
                          <p className="text-xs font-semibold text-muted-soft">
                            {i === 0 ? `${t('tripCost.itinerary.arrive')} · ` : ''}
                            {formatDate(toIso(dateForIndex(i) || new Date()), dateLocale)}
                          </p>
                        </div>
                        {stops.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => removeStop(stop.uid)}
                            aria-label={t('tripCost.itinerary.removeStop')}
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#e6ece9] bg-white text-muted-soft hover:border-[#c3ccd3] hover:text-ink"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="relative">
                          <label className="mb-1.5 block text-xs font-bold text-ink-soft">{t('tripCost.itinerary.destination')}</label>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-soft" />
                            <input
                              type="text"
                              value={open ? query : place ? placeName(stop.place) : ''}
                              onFocus={() => {
                                setSearchOpenUid(stop.uid);
                                setQuery('');
                              }}
                              onChange={(e) => setQuery(e.target.value)}
                              onBlur={() => setTimeout(() => setSearchOpenUid(null), 120)}
                              placeholder={t('tripCost.itinerary.searchPlaceholder')}
                              className="w-full rounded-xl border-[1.5px] border-[#dde4e1] bg-white py-2 pl-8 pr-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                          </div>
                          {open ? (
                            <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-[#dde4e1] bg-white p-1 shadow-lg">
                              {results.length === 0 ? (
                                <p className="p-3 text-xs font-semibold text-muted-soft">{t('tripCost.itinerary.noMatch')}</p>
                              ) : (
                                results.map(([id, p]) => (
                                  <button
                                    key={id}
                                    type="button"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updateStop(stop.uid, { place: id });
                                      setSearchOpenUid(null);
                                      setQuery('');
                                    }}
                                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                                      id === stop.place ? 'bg-brand-tint text-brand-dark' : 'hover:bg-hairline'
                                    }`}
                                  >
                                    <span className="font-bold">{placeName(id)}</span>
                                    <span className="text-xs font-semibold text-muted-soft">{t(`places.types.${p.type}`)}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-ink-soft">
                            {i === 0 ? t('tripCost.itinerary.nightsHere') : t('tripCost.itinerary.nightsLabel')}
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateStop(stop.uid, { nights: Math.max(0, (stop.nights || 0) - 1) })}
                              aria-label={t('tripCost.itinerary.fewerNights')}
                              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-[1.5px] border-[#dde4e1] bg-white text-ink hover:border-brand"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="flex-1 text-center text-sm font-extrabold text-ink">
                              {(stop.nights || 0) === 0 ? t('tripCost.itinerary.sameDay') : t('tripCost.nights', { count: stop.nights })}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateStop(stop.uid, { nights: Math.min(14, (stop.nights || 0) + 1) })}
                              aria-label={t('tripCost.itinerary.moreNights')}
                              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-[1.5px] border-[#dde4e1] bg-white text-ink hover:border-brand"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {place?.hl ? (
                        <p className="mt-3 flex items-start gap-2 rounded-xl border border-[#f0dcae] bg-[#fdf7e8] px-3 py-2 text-xs font-semibold leading-relaxed text-[#7a5410]">
                          {t(`places.highlights.${stop.place}`)}
                        </p>
                      ) : null}
                    </article>
                  </React.Fragment>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={addStop}
                className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-dashed border-[#b9d8c7] bg-[#f7fbf9] px-4 py-2.5 text-sm font-bold text-brand-dark hover:bg-brand-tint"
              >
                <Plus className="h-4 w-4" />
                {t('tripCost.itinerary.addStop')}
              </button>
              <button
                type="button"
                onClick={startOver}
                className="inline-flex items-center rounded-xl border-[1.5px] border-[#dde4e1] bg-white px-4 py-2.5 text-sm font-bold text-muted hover:border-[#c3ccd3]"
              >
                {t('tripCost.itinerary.startOver')}
              </button>
            </div>
          </div>

          <div className="lg:hidden">{costSummary}</div>

          {/* Vehicle classes */}
          <div className="space-y-4 rounded-[22px] border border-[#e6ece9] bg-white p-6">
            <header className="space-y-1">
              <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-brand-dark">{t('tripCost.step', { n: 3 })}</p>
              <h2 className="text-xl font-extrabold tracking-tight text-ink">{t('tripCost.classes.title')}</h2>
              <p className="text-sm text-muted">
                {paxNumber ? t('tripCost.classes.leadCount', { count: paxNumber }) : t('tripCost.classes.leadGroup')}
              </p>
            </header>

            {classEstimates.length === 0 ? (
              <p className="rounded-2xl border-[1.5px] border-dashed border-[#dde4e1] p-5 text-sm text-muted">
                <Trans
                  k={paxNumber ? 'tripCost.classes.noneCount' : 'tripCost.classes.noneAny'}
                  vars={{ count: paxNumber }}
                  components={{ link: <Link to="/get-quotes" className="font-bold text-brand-dark underline" /> }}
                />
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {classEstimates.slice(0, 2).map((cls, i) => (
                  <article
                    key={cls.id}
                    className={`flex flex-col gap-3 rounded-2xl border-[1.5px] p-4 ${i === 0 ? 'border-brand bg-[#f7fbf9]' : 'border-[#e6ece9] bg-white'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-extrabold tracking-tight text-ink">{t(`estimator.buckets.${cls.id}.label`)}</p>
                        {cls.example ? (
                          <p className="truncate text-xs font-semibold text-muted-soft">{t('tripCost.classes.example', { model: cls.example })}</p>
                        ) : null}
                      </div>
                      {i === 0 ? (
                        <span className="flex-shrink-0 rounded-lg bg-brand px-2 py-1 text-[11px] font-extrabold text-white">{t('tripCost.classes.bestMatch')}</span>
                      ) : null}
                    </div>
                    {cls.exampleImage ? (
                      <img
                        src={cls.exampleImage}
                        alt={
                          cls.example
                            ? t('tripCost.classes.imageAlt', {
                                model: cls.example,
                                // German nouns stay capitalised; English matched the old lower-case alt text.
                                class: locale === 'en'
                                  ? t(`estimator.buckets.${cls.id}.label`).toLowerCase()
                                  : t(`estimator.buckets.${cls.id}.label`),
                              })
                            : t(`estimator.buckets.${cls.id}.label`)
                        }
                        loading="lazy"
                        className="h-24 w-full rounded-[13px] object-cover"
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        t(`estimator.buckets.${cls.id}.seats`),
                        t('tripCost.classes.listed', { count: cls.sampleSize }),
                        `${money(cls.perDay.low)}–${money(cls.perDay.high)}${t('tripCost.perDay')}`,
                      ].map((spec) => (
                        <span
                          key={spec}
                          className="rounded-lg border border-[#e6ece9] bg-white px-2.5 py-1 text-[12px] font-bold text-ink-soft"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                    <div>
                      <p className="text-2xl font-extrabold tracking-tight text-ink">{money(cls.total.average)}</p>
                      <p className="text-xs font-semibold text-muted-soft">
                        {t('tripCost.classes.perDayOver', { amount: money(Math.round(cls.total.average / days)), days: t('tripCost.days', { count: days }) })}
                      </p>
                    </div>
                    <Link
                      to="/get-quotes"
                      className="mt-auto inline-flex items-center justify-center rounded-xl bg-brand px-3 py-2.5 text-xs font-extrabold text-white hover:bg-brand-dark"
                    >
                      {t('tripCost.classes.getQuotes')}
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="space-y-4 rounded-[22px] border border-[#e6ece9] bg-white p-6">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">{t('tripCost.faq.title')}</h2>
            {resultReady ? (
              <p className="max-w-[680px] text-[15px] leading-[1.7] text-muted">
                <Trans
                  k="tripCost.faq.summary"
                  vars={{ low: money(overallEstimate.perDay.low), high: money(overallEstimate.perDay.high) }}
                  components={{ b: <b className="text-ink" /> }}
                />
              </p>
            ) : null}
            <div className="space-y-2">
              {FAQS.map((key) => (
                <details key={key} className="group rounded-2xl border border-[#e6ece9] bg-[#f9fbfa] p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-ink">
                    {t(`tripCost.faq.${key}.q`)}
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-soft transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{t(`tripCost.faq.${key}.a`)}</p>
                </details>
              ))}
            </div>

            <div className="pt-2">
              <h3 className="text-base font-extrabold tracking-tight text-ink">{t('tripCost.faq.popularRoutes')}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {ITINERARY_PRESETS.map((preset, presetIndex) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      applyPreset(preset.stops);
                      document.getElementById('itinerary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-[#e6ece9] bg-[#f9fbfa] px-3.5 text-[13.5px] font-bold text-ink-soft transition hover:border-brand hover:text-brand-dark"
                  >
                    {t(`places.presets.p${presetIndex}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar — sticks alongside the builder so the cost stays visible while editing. */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">{costSummary}</div>

          <div className="rounded-[20px] border border-[#e6ece9] bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <Activity className="h-4 w-4 text-brand-dark" />
              {t('tripCost.legs.title')}
            </div>
            <div className="mt-3 space-y-2.5">
              {legs.length === 0 ? (
                <p className="text-xs font-medium text-muted-soft">{t('tripCost.legs.empty')}</p>
              ) : (
                legs.map((leg, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 border-b border-[#f1f5f3] pb-2.5 text-sm last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-ink">{leg.from} → {leg.to}</p>
                      <p className="text-xs font-semibold text-muted-soft">{leg.timeLabel}</p>
                    </div>
                    <span className="flex-shrink-0 font-extrabold text-brand-dark">{leg.km} km</span>
                  </div>
                ))
              )}
            </div>
            {legs.length > 0 ? (
              <div
                className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold leading-relaxed ${
                  paceOk ? 'border-[#d6ece0] bg-[#f2faf6] text-brand-dark' : 'border-[#f0dcae] bg-[#fdf7e8] text-[#7a5410]'
                }`}
              >
                {paceOk ? t('tripCost.legs.paceOk', { km: kmPerDay }) : t('tripCost.legs.paceFast', { km: kmPerDay })}
              </div>
            ) : null}
          </div>

          <div className="rounded-[20px] border border-[#d6ece0] bg-[#f2faf6] p-5">
            <p className="text-sm font-extrabold text-ink">{t('tripCost.included.title')}</p>
            {inclusionRates.length === 0 ? (
              <p className="mt-2 text-xs font-medium text-muted">
                {t('tripCost.included.empty')}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {inclusionRates.map((flag) => (
                  <div key={flag.key} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-dark" />
                    <p className="text-sm text-ink-soft">
                      <Trans
                        k="tripCost.included.rate"
                        vars={{ label: t(`estimator.inclusions.${flag.key}`), percent: flag.percent, count: flag.total }}
                        components={{ b: <span className="font-bold" /> }}
                      />
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>

    </div>
  );
};

export default TripCostCalculator;

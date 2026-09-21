import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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

const formatDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

const toIso = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const FAQS = [
  {
    q: 'Is fuel included in the daily rate?',
    a: 'For a normal touring day of roughly 120–150 km, yes on most listings — check the "what\'s included" panel for how many vehicles matching your itinerary include it. Long transfer days sometimes carry a per-kilometre surcharge instead.',
  },
  {
    q: "Do I pay for the driver's hotel and meals?",
    a: "Most drivers arrange their own accommodation and meals on multi-day trips, and it's commonly folded into the daily rate rather than billed separately — again, the inclusion panel reflects real listings for your current search.",
  },
  {
    q: 'What is typically not included?',
    a: 'Entrance tickets to sites like Sigiriya or the Temple of the Tooth, safari jeep hire inside national parks, and highway tolls are usually paid separately from the driver day-rate.',
  },
  {
    q: 'How accurate is this estimate?',
    a: 'It is built from the current rates of approved drivers on carwithdriver.lk and real road distances between your stops — not a flat industry average. Final pricing comes from drivers themselves once you request quotes for your exact itinerary.',
  },
  {
    q: 'Can I change the itinerary after booking?',
    a: 'Small changes are normally fine and agreed with your driver directly. If you add days or change the route significantly, your driver sends an updated offer before the trip starts.',
  },
];

let uidCounter = 0;
const nextUid = () => {
  uidCounter += 1;
  return `stop-${uidCounter}`;
};
const withUids = (stops) => stops.map((s) => ({ uid: nextUid(), ...s }));

const TripCostCalculator = () => {
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
        from: PLACES[stops[i - 1].place]?.name || '',
        to: PLACES[stops[i].place]?.name || '',
        km,
        timeLabel: hours < 1 ? `~${Math.round(hours * 60)} min drive` : `~${Math.round(hours * 2) / 2} hrs drive`,
      });
    }
    return out;
  }, [stops]);

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
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  // Rendered in the sidebar on desktop, and inline right after the itinerary on
  // mobile, where the sidebar would otherwise land at the very bottom of the page.
  const costSummary = (
      <div className="rounded-[22px] bg-ink p-6 text-white">
        <p className="text-[11px] font-bold uppercase tracking-wide text-white/65">Estimated trip cost</p>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-4xl font-extrabold tracking-tight">{totalAverage}</p>
          <p className="pb-1 text-sm font-bold text-white/55">≈ {money(overallEstimate.totals ? Math.round(overallEstimate.totals.average / days) : null)}/day</p>
        </div>
        <p className="mt-1 text-sm font-medium text-white/70">
          {days} days · {nightsTotal} nights · {paxNumber || '—'} {paxNumber === 1 ? 'passenger' : 'passengers'}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">Likely range</p>
            <p className="mt-1 text-lg font-extrabold">{totalRange}</p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/55">Total distance</p>
            <p className="mt-1 text-lg font-extrabold">{totalKm.toLocaleString('en-US')} km</p>
          </div>
        </div>
        {buffer ? (
          <p className="mt-4 text-xs font-medium text-white/55">Keep ~{buffer} aside as a flexibility buffer for extra km or upgrades.</p>
        ) : null}
        <Link
          to="/get-quotes"
          className="mt-5 flex items-center justify-center rounded-2xl bg-brand px-4 py-3.5 text-sm font-extrabold text-white hover:bg-brand-dark"
        >
          Request free driver quotes
        </Link>
        <p className="mt-2 text-center text-[11px] font-medium leading-relaxed text-white/45">
          No payment now. Drivers reply with a fixed price for this exact itinerary.
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
          Trip Cost Calculator
        </p>
        <div className="space-y-4">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Build your Sri Lanka itinerary and see the real cost of a car with driver
          </h1>
          <p className="max-w-3xl text-base text-white/85 sm:text-lg">
            Add your stops day by day. We work out the driving distance between them and price the trip from
            today&apos;s live driver rates — not a flat industry average.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl bg-white/[0.13] border border-white/[0.15] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Live fleet</p>
            <p className="mt-1 text-2xl font-extrabold">{vehicles.length}</p>
            <p className="text-sm font-medium text-white/70">Approved driver vehicles</p>
          </article>
          <article className="rounded-2xl bg-white/[0.13] border border-white/[0.15] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Median daily rate</p>
            <p className="mt-1 text-2xl font-extrabold">{perDayAverage}</p>
            <p className="text-sm font-medium text-white/70">For {paxNumber || 'any'} {paxNumber === 1 ? 'passenger' : 'passengers'}</p>
          </article>
          <article className="rounded-2xl bg-white/[0.13] border border-white/[0.15] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">Typical daily range</p>
            <p className="mt-1 text-2xl font-extrabold">{perDayRange}</p>
            <p className="text-sm font-medium text-white/70">Middle 50% of quotes</p>
          </article>
          <article className="rounded-2xl bg-white/[0.13] border border-white/[0.15] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/70">This itinerary</p>
            <p className="mt-1 text-2xl font-extrabold">{days}{days === 1 ? ' day' : ' days'}</p>
            <p className="text-sm font-medium text-white/70">{stops.length} stops · {totalKm.toLocaleString('en-US')} km</p>
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
                <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-brand-dark">Step 1</p>
                <h2 className="text-xl font-extrabold tracking-tight text-ink">Who is travelling</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-xl border border-[#d6ece0] bg-[#f2faf6] px-3 py-2 text-[13px] font-bold text-brand-dark">
                <Clock className="h-[15px] w-[15px]" />
                {days} {days === 1 ? 'day' : 'days'} · {nightsTotal} {nightsTotal === 1 ? 'night' : 'nights'}
              </span>
            </header>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink-soft">
                Start date
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border-[1.5px] border-[#dde4e1] bg-white px-4 py-2.5 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-[13px] font-bold text-ink-soft">
                Passengers
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
                <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-brand-dark">Step 2</p>
                <h2 className="text-xl font-extrabold tracking-tight text-ink">Your itinerary</h2>
                <p className="text-sm text-muted">Pick a destination and how many nights you stay. Distances update as you go.</p>
              </div>
            </header>

            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {ITINERARY_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset.stops)}
                  className="flex-shrink-0 whitespace-nowrap rounded-full border-[1.5px] border-[#dde4e1] bg-white px-3.5 py-1.5 text-xs font-bold text-ink transition hover:border-brand hover:text-brand-dark"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {stops.map((stop, i) => {
                const place = PLACES[stop.place];
                const leg = i > 0 ? legs[i - 1] : null;
                const open = searchOpenUid === stop.uid;
                const q = query.trim().toLowerCase();
                const results = Object.entries(PLACES).filter(
                  ([, p]) => !q || p.name.toLowerCase().includes(q) || placeTypeLabel(p.type).toLowerCase().includes(q)
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
                          <p className="truncate text-base font-extrabold tracking-tight text-ink">{place?.name}</p>
                          <p className="text-xs font-semibold text-muted-soft">
                            {i === 0 ? 'Arrive · ' : ''}
                            {formatDate(toIso(dateForIndex(i) || new Date()))}
                          </p>
                        </div>
                        {stops.length > 2 ? (
                          <button
                            type="button"
                            onClick={() => removeStop(stop.uid)}
                            aria-label="Remove stop"
                            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#e6ece9] bg-white text-muted-soft hover:border-[#c3ccd3] hover:text-ink"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div className="relative">
                          <label className="mb-1.5 block text-xs font-bold text-ink-soft">Destination</label>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-soft" />
                            <input
                              type="text"
                              value={open ? query : place?.name || ''}
                              onFocus={() => {
                                setSearchOpenUid(stop.uid);
                                setQuery('');
                              }}
                              onChange={(e) => setQuery(e.target.value)}
                              onBlur={() => setTimeout(() => setSearchOpenUid(null), 120)}
                              placeholder="Search destinations…"
                              className="w-full rounded-xl border-[1.5px] border-[#dde4e1] bg-white py-2 pl-8 pr-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                            />
                          </div>
                          {open ? (
                            <div className="absolute z-20 mt-1.5 max-h-56 w-full overflow-y-auto rounded-xl border border-[#dde4e1] bg-white p-1 shadow-lg">
                              {results.length === 0 ? (
                                <p className="p-3 text-xs font-semibold text-muted-soft">No destination matches that search.</p>
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
                                    <span className="font-bold">{p.name}</span>
                                    <span className="text-xs font-semibold text-muted-soft">{placeTypeLabel(p.type)}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <label className="mb-1.5 block text-xs font-bold text-ink-soft">
                            {i === 0 ? 'Nights here' : 'Nights'}
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateStop(stop.uid, { nights: Math.max(0, (stop.nights || 0) - 1) })}
                              aria-label="Fewer nights"
                              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-[1.5px] border-[#dde4e1] bg-white text-ink hover:border-brand"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="flex-1 text-center text-sm font-extrabold text-ink">
                              {(stop.nights || 0) === 0 ? 'Same day' : `${stop.nights} night${stop.nights === 1 ? '' : 's'}`}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateStop(stop.uid, { nights: Math.min(14, (stop.nights || 0) + 1) })}
                              aria-label="More nights"
                              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border-[1.5px] border-[#dde4e1] bg-white text-ink hover:border-brand"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {place?.hl ? (
                        <p className="mt-3 flex items-start gap-2 rounded-xl border border-[#f0dcae] bg-[#fdf7e8] px-3 py-2 text-xs font-semibold leading-relaxed text-[#7a5410]">
                          {place.hl}
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
                Add another stop
              </button>
              <button
                type="button"
                onClick={startOver}
                className="inline-flex items-center rounded-xl border-[1.5px] border-[#dde4e1] bg-white px-4 py-2.5 text-sm font-bold text-muted hover:border-[#c3ccd3]"
              >
                Start over
              </button>
            </div>
          </div>

          <div className="lg:hidden">{costSummary}</div>

          {/* Vehicle classes */}
          <div className="space-y-4 rounded-[22px] border border-[#e6ece9] bg-white p-6">
            <header className="space-y-1">
              <p className="text-[11.5px] font-extrabold uppercase tracking-wide text-brand-dark">Step 3</p>
              <h2 className="text-xl font-extrabold tracking-tight text-ink">Recommended vehicle classes for this itinerary</h2>
              <p className="text-sm text-muted">
                Priced from live listings that currently seat {paxNumber || 'your group'} — not an assumed base rate.
              </p>
            </header>

            {classEstimates.length === 0 ? (
              <p className="rounded-2xl border-[1.5px] border-dashed border-[#dde4e1] p-5 text-sm text-muted">
                No live vehicles currently match {paxNumber || 'that many'} passengers. Try a lower passenger count,
                or <Link to="/get-quotes" className="font-bold text-brand-dark underline">request quotes</Link> directly —
                drivers sometimes have vehicles not yet reflected in the public listings.
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
                        <p className="text-base font-extrabold tracking-tight text-ink">{cls.label}</p>
                        {cls.example ? (
                          <p className="truncate text-xs font-semibold text-muted-soft">e.g. {cls.example}</p>
                        ) : null}
                      </div>
                      {i === 0 ? (
                        <span className="flex-shrink-0 rounded-lg bg-brand px-2 py-1 text-[11px] font-extrabold text-white">Best match</span>
                      ) : null}
                    </div>
                    {cls.exampleImage ? (
                      <img
                        src={cls.exampleImage}
                        alt={cls.example ? `${cls.example} — example ${cls.label.toLowerCase()} listed on carwithdriver.lk` : cls.label}
                        loading="lazy"
                        className="h-24 w-full rounded-[13px] object-cover"
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      {[cls.seatLabel, `${cls.sampleSize} listed`, `${money(cls.perDay.low)}–${money(cls.perDay.high)}/day`].map((spec) => (
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
                        ≈ {money(Math.round(cls.total.average / days))}/day over {days} {days === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                    <Link
                      to="/get-quotes"
                      className="mt-auto inline-flex items-center justify-center rounded-xl bg-brand px-3 py-2.5 text-xs font-extrabold text-white hover:bg-brand-dark"
                    >
                      Get quotes
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="space-y-4 rounded-[22px] border border-[#e6ece9] bg-white p-6">
            <h2 className="text-xl font-extrabold tracking-tight text-ink">Frequently asked questions</h2>
            {resultReady ? (
              <p className="max-w-[680px] text-[15px] leading-[1.7] text-muted">
                Travellers matching this group size mostly pay between{' '}
                <b className="text-ink">{money(overallEstimate.perDay.low)} and {money(overallEstimate.perDay.high)} per day</b> for a
                private driver and vehicle, depending on the size of the car. The daily rate normally covers the
                driver, fuel for a typical 120–150 km day, and the driver&apos;s own accommodation and meals. Entrance
                tickets, safari jeeps and highway tolls are usually paid separately.
              </p>
            ) : null}
            <div className="space-y-2">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-[#e6ece9] bg-[#f9fbfa] p-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-extrabold text-ink">
                    {f.q}
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-soft transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>

            <div className="pt-2">
              <h3 className="text-base font-extrabold tracking-tight text-ink">Popular routes travellers price here</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {ITINERARY_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      applyPreset(preset.stops);
                      document.getElementById('itinerary')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="inline-flex min-h-[44px] items-center rounded-xl border border-[#e6ece9] bg-[#f9fbfa] px-3.5 text-[13.5px] font-bold text-ink-soft transition hover:border-brand hover:text-brand-dark"
                  >
                    {preset.label}
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
              Distance by leg
            </div>
            <div className="mt-3 space-y-2.5">
              {legs.length === 0 ? (
                <p className="text-xs font-medium text-muted-soft">Add a second stop to see leg distances.</p>
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
                {paceOk
                  ? `Comfortable pace — about ${kmPerDay} km a day, leaving time for stops.`
                  : `That's about ${kmPerDay} km a day. Consider adding a night somewhere so the drive days stay enjoyable.`}
              </div>
            ) : null}
          </div>

          <div className="rounded-[20px] border border-[#d6ece0] bg-[#f2faf6] p-5">
            <p className="text-sm font-extrabold text-ink">What&apos;s included on this fleet</p>
            {inclusionRates.length === 0 ? (
              <p className="mt-2 text-xs font-medium text-muted">
                Set a passenger count with at least one matching vehicle to see real inclusion rates.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {inclusionRates.map((flag) => (
                  <div key={flag.key} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-dark" />
                    <p className="text-sm text-ink-soft">
                      <span className="font-bold">{flag.label}</span> — included on {flag.percent}% of the {flag.total}{' '}
                      matching {flag.total === 1 ? 'vehicle' : 'vehicles'}
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

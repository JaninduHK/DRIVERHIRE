import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpDown,
  Compass,
  GaugeCircle,
  Loader2,
  MapPin,
  Route as RouteIcon,
  Sparkles,
  Users,
} from 'lucide-react';
import { fetchVehicles } from '../services/vehicleCatalogApi.js';
import {
  buildSeatDistribution,
  calculateTripEstimate,
  getRouteInsight,
  priceFormatter,
} from '../lib/tripCostEstimator.js';

const popularLocations = [
  'Colombo',
  'Negombo',
  'Katunayake (CMB)',
  'Kandy',
  'Sigiriya',
  'Dambulla',
  'Ella',
  'Nuwara Eliya',
  'Galle',
  'Mirissa',
  'Yala',
  'Trincomalee',
  'Jaffna',
];

const TripCostCalculator = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [formValues, setFormValues] = useState({
    start: 'Colombo',
    end: 'Ella',
    seatCount: '2',
    days: '5',
  });

  useEffect(() => {
    let active = true;
    const loadVehicles = async () => {
      setLoading(true);
      try {
        const response = await fetchVehicles({ sort: 'priceAsc' });
        if (!active) return;
        setVehicles(response?.vehicles ?? []);
        setLastSync(new Date().toISOString());
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Unable to fetch live pricing right now.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadVehicles();
    return () => {
      active = false;
    };
  }, []);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const swapLocations = () =>
    setFormValues((prev) => ({
      ...prev,
      start: prev.end,
      end: prev.start,
    }));

  const seatCountNumber = Number(formValues.seatCount) || 0;
  const dayCount = Number(formValues.days) || 0;

  const estimate = useMemo(
    () =>
      calculateTripEstimate({
        vehicles,
        seatCount: seatCountNumber,
        days: dayCount,
      }),
    [vehicles, seatCountNumber, dayCount]
  );

  const seatDistribution = useMemo(() => buildSeatDistribution(vehicles), [vehicles]);
  const routeInsight = useMemo(
    () => getRouteInsight(formValues.start, formValues.end),
    [formValues.start, formValues.end]
  );

  const coveragePercent = estimate?.coverage ? Math.round(estimate.coverage * 100) : 0;
  const perDayRangeLabel =
    estimate?.perDay && priceFormatter(estimate.perDay.low) && priceFormatter(estimate.perDay.high)
      ? `${priceFormatter(estimate.perDay.low)} – ${priceFormatter(estimate.perDay.high)}`
      : '—';
  const averagePerDayLabel = estimate?.perDay ? priceFormatter(estimate.perDay.average) : '—';
  const totalAverageLabel = estimate?.totals ? priceFormatter(estimate.totals.average) : '—';
  const totalRangeLabel =
    estimate?.totals && priceFormatter(estimate.totals.low) && priceFormatter(estimate.totals.high)
      ? `${priceFormatter(estimate.totals.low)} – ${priceFormatter(estimate.totals.high)}`
      : '—';
  const lastSyncLabel = lastSync
    ? new Date(lastSync).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;

  const seatPhrase = seatCountNumber > 0 ? `${seatCountNumber}+ seat vehicles` : 'any seat size';
  const bufferAmount =
    estimate?.totals && Number.isFinite(estimate.totals.high) && Number.isFinite(estimate.totals.average)
      ? priceFormatter(estimate.totals.high - estimate.totals.average)
      : null;

  const insightsList = [
    estimate?.perDay
      ? `The middle 50% of drivers quote ${perDayRangeLabel} per day for ${seatPhrase}.`
      : 'Pricing insights will display as soon as live rates finish loading.',
    estimate?.seatMatches
      ? `${estimate.seatMatches} of ${estimate.fleetSize} approved vehicles currently meet your seat requirement (${coveragePercent}% coverage).`
      : 'Set a seat count to see how many vehicles are available right now.',
    estimate?.totals && bufferAmount
      ? `Plan an average of ${totalAverageLabel} for this itinerary and keep ~${bufferAmount} as a flexibility buffer.`
      : 'Add trip length so we can highlight the total budget band.',
  ];

  const resultReady = Boolean(estimate?.perDay) && !loading && !error;

  return (
    <div className="space-y-16 py-6">
      <section className="space-y-6 rounded-3xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-emerald-400 p-8 text-white shadow-lg">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
          <Sparkles className="h-3.5 w-3.5" />
          Trip Cost Calculator
        </p>
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
            Plan your Sri Lanka driver budget using live marketplace data.
          </h1>
          <p className="max-w-3xl text-base text-white/80 sm:text-lg">
            Enter your route, seat requirement, and days on the road. We average today&apos;s verified driver
            quotes to show a realistic price before you request offers.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Live fleet</p>
            <p className="text-2xl font-semibold">{estimate?.fleetSize || 0}</p>
            <p className="text-sm text-white/70">Approved driver vehicles</p>
          </article>
          <article className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Median daily rate</p>
            <p className="text-2xl font-semibold">{averagePerDayLabel || '—'}</p>
            <p className="text-sm text-white/70">Across current listings</p>
          </article>
          <article className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Typical daily range</p>
            <p className="text-2xl font-semibold">{perDayRangeLabel}</p>
            <p className="text-sm text-white/70">Middle 50% of quotes</p>
          </article>
          <article className="rounded-2xl bg-white/10 p-4">
            <p className="text-xs uppercase tracking-wide text-white/70">Last refreshed</p>
            <p className="text-2xl font-semibold">{lastSyncLabel || 'Fetching…'}</p>
            <p className="text-sm text-white/70">Based on platform data</p>
          </article>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <form
          className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
          onSubmit={(event) => event.preventDefault()}
        >
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Trip inputs</p>
            <h2 className="text-2xl font-semibold text-slate-900">Tell us the basics</h2>
            <p className="text-sm text-slate-600">
              We use real driver rates with similar seat counts and trip durations to calculate your estimate.
            </p>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Start location
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formValues.start}
                  onChange={handleChange('start')}
                  list="trip-location-options"
                  placeholder="e.g. Colombo"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              End location
              <div className="relative">
                <Compass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={formValues.end}
                  onChange={handleChange('end')}
                  list="trip-location-options"
                  placeholder="e.g. Ella"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </label>
          </div>
          <datalist id="trip-location-options">
            {popularLocations.map((location) => (
              <option value={location} key={location} />
            ))}
          </datalist>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Seats needed
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="12"
                  step="1"
                  value={formValues.seatCount}
                  onChange={handleChange('seatCount')}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <span className="text-xs font-normal text-slate-500">
                Use total passenger seats (excludes driver seat).
              </span>
            </label>

            <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
              Number of days
              <div className="relative">
                <GaugeCircle className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="21"
                  step="1"
                  value={formValues.days}
                  onChange={handleChange('days')}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-10 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <span className="text-xs font-normal text-slate-500">Include travel days with the driver.</span>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={swapLocations}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              <ArrowUpDown className="h-4 w-4" />
              Swap locations
            </button>
            <p className="text-xs text-slate-500">
              Every edit re-runs the calculator using today&apos;s fleet prices.
            </p>
          </div>
        </form>

        <aside className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Estimate</p>
            <h2 className="text-2xl font-semibold text-slate-900">Your projected trip budget</h2>
            <p className="text-sm text-slate-600">
              Based on {estimate?.sampleSize || 0} recent quotes that match your selections.
            </p>
          </header>

          <div className="rounded-3xl bg-slate-900 p-6 text-white shadow-inner">
            <p className="text-xs uppercase tracking-wide text-white/70">Estimated total</p>
            <p className="mt-2 text-4xl font-semibold">{resultReady ? totalAverageLabel : '—'}</p>
            <p className="text-sm text-white/70">
              {formValues.days || '—'} days · {seatPhrase}
            </p>
            <div className="mt-6 grid gap-4 text-sm text-white/90 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Comfortable buffer</p>
                <p className="text-lg font-semibold">{bufferAmount || '—'}</p>
                <p className="text-xs text-white/60">Keep this aside for extra kms or upgrades.</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-white/60">Likely total span</p>
                <p className="text-lg font-semibold">{resultReady ? totalRangeLabel : '—'}</p>
                <p className="text-xs text-white/60">Based on middle 50% of quotes.</p>
              </div>
            </div>
          </div>

          <dl className="grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Per-day baseline</dt>
              <dd className="mt-1 text-2xl font-semibold text-slate-900">{averagePerDayLabel || '—'}</dd>
              <p className="text-xs text-slate-500">Average of matching drivers.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Coverage</dt>
              <dd className="mt-1 text-2xl font-semibold text-slate-900">
                {estimate?.seatMatches ? `${coveragePercent}%` : '—'}
              </dd>
              <p className="text-xs text-slate-500">
                {estimate?.seatMatches ? `${estimate.seatMatches} / ${estimate.fleetSize} vehicles` : 'Matching seats pending'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-4 sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-slate-500">Live insight</dt>
              <dd className="mt-1 text-base text-slate-700">
                {insightsList[0]}
                <br />
                {insightsList[1]}
                <br />
                {insightsList[2]}
              </dd>
            </div>
          </dl>

          <article className="rounded-3xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <RouteIcon className="h-4 w-4 text-emerald-600" />
              Route insight
            </div>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {formValues.start || '—'} → {formValues.end || '—'}
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                <Activity className="h-3.5 w-3.5" />
                {routeInsight.distance}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                <GaugeCircle className="h-3.5 w-3.5" />
                {routeInsight.travelTime}
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-700">{routeInsight.summary}</p>
            <p className="mt-2 text-xs font-medium text-emerald-700">{routeInsight.tip}</p>
          </article>
        </aside>
      </section>

      <section className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            Fleet snapshot
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">What the data says this week</h2>
          <p className="text-sm text-slate-600">
            We look at every approved vehicle to surface price patterns you can use when negotiating.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Crunching the latest pricing signals…
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <article className="rounded-3xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Seat mix</h3>
                <p className="text-sm text-slate-600">How the current fleet breaks down by capacity.</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {seatDistribution.map((bucket) => (
                    <div
                      key={bucket.id}
                      className="flex flex-col rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      <p className="text-sm font-semibold text-slate-900">{bucket.label}</p>
                      <p className="text-xs text-slate-500">
                        {bucket.count} vehicles · {bucket.percentage}%
                      </p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-3xl border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900">Negotiation cues</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-700">
                  {insightsList.map((insight, index) => (
                    <li key={`insight-${index}`} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </div>
            <div className="rounded-3xl border border-slate-200 p-6 text-sm text-slate-600">
              <p>
                This calculator is directional guidance only. Final pricing depends on detailed itineraries,
                highway tolls, accommodation for drivers on multi-day trips, and seasonal demand. Share your
                preferred comfort level when requesting quotes so drivers can fine-tune offers.
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default TripCostCalculator;

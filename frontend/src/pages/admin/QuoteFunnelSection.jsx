import { useEffect, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { fetchQuoteFunnel } from '../../services/adminApi.js';
import { formatDate, formatPercentValue, tagClass } from './adminFormatters.js';

const WINDOWS = [7, 30, 90];

// Shown in the stalled table; mirrors FOLLOW_UP_STEPS in backend/services/quoteFollowUpService.js.
const STEP_LABELS = { noOffers: 'No offers yet', digest1: 'Top picks', update: 'New offers', digest2: 'Still planning?', approaching30: 'Trip in 30 days', approaching14: 'Trip in 14 days', expiring: 'Expiring soon', expired: 'Offers expired' };
// The traveller's answer to "What's holding you back?" in the follow-up email.
const REASON_LABELS = { price: 'Prices too high', dates: 'Dates not fixed', choice: "Can't choose", booked: 'Booked elsewhere' };

const share = (count, total) => (total > 0 ? formatPercentValue((count / total) * 100, 0) : '—');

// Where quote requests drop off on the way to a booking, and which ones are
// stuck right now. Loads its own data so the Reports tab's booking figures are
// not held up by it.
const QuoteFunnelSection = ({ onViewBrief }) => {
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    fetchQuoteFunnel(days)
      .then((data) => { if (!cancelled) setState({ loading: false, error: '', data }); })
      .catch((error) => { if (!cancelled) setState({ loading: false, error: error?.message || 'Unable to load the quote funnel.', data: null }); });
    return () => { cancelled = true; };
  }, [days, attempt]);

  const { loading, error, data } = state;
  const stages = data?.stages || [];
  const posted = stages[0]?.count || 0;
  const stalled = data?.stalled || [];

  return (
    <div className="rounded-[18px] bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <div>
          <b className="text-[15px] text-ink">Quote request funnel</b>
          <p className="mt-1 text-[11.5px] text-muted-soft">How far requests posted in the period got, and which open ones have offers but no booking.</p>
        </div>
        <div className="flex gap-2">
          {WINDOWS.map((option) => (
            <button key={option} type="button" onClick={() => setDays(option)} className={tagClass(days === option ? 'green' : 'grey')}>
              {option} days
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 text-center">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
          <button type="button" onClick={() => setAttempt((current) => current + 1)} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft">
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      ) : loading && !data ? (
        <div className="flex min-h-[160px] items-center justify-center text-sm text-muted">Loading funnel…</div>
      ) : (
        <>
          <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-5">
            {stages.map((stage, index) => {
              const previous = index > 0 ? stages[index - 1].count : null;
              return (
                <div key={stage.key} className="rounded-xl bg-canvas p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{stage.label}</p>
                  <p className="mt-2 text-[24px] font-extrabold tracking-tight text-ink">{stage.count}</p>
                  <p className="mt-1 text-[11.5px] font-semibold text-muted">
                    {index === 0 ? 'Starting point' : `${share(stage.count, posted)} of posted`}
                    {/* "Booked" is not a subset of "replied" (a traveller can book without writing back), so no step rate for it. */}
                    {index > 0 && index < stages.length - 1 && previous ? ` · ${share(stage.count, previous)} of previous` : ''}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="px-5 pb-4 text-[12px] text-muted">
            Typical request: {data?.medianOffersPerRequest ?? '—'} offer{data?.medianOffersPerRequest === 1 ? '' : 's'}
            {Number.isFinite(data?.medianHoursToFirstOffer) ? `, first one after ${data.medianHoursToFirstOffer < 1 ? 'under an hour' : `${Math.round(data.medianHoursToFirstOffer)} hours`}` : ''} (medians, requests that got offers).
          </p>

          <div className="border-t border-hairline px-5 py-4">
            <b className="text-[14px] text-ink">Open with offers, not booked <span className="font-semibold text-muted-soft">({stalled.length})</span></b>
            <p className="mt-1 text-[11.5px] text-muted-soft">All open requests, whenever they were posted. Travellers who booked another trip are still listed here but get no reminder emails.</p>
          </div>
          {stalled.length === 0 ? (
            <p className="px-5 pb-6 text-sm text-muted">No open requests are waiting on a traveller.</p>
          ) : (
            <div className="max-h-[520px] divide-y divide-hairline overflow-auto border-t border-hairline">
              {stalled.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => onViewBrief?.(row.id)}
                  className="grid w-full min-w-[860px] grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)_.9fr_.8fr_minmax(0,1.2fr)_auto] items-center gap-4 px-5 py-3.5 text-left transition hover:bg-canvas focus:bg-canvas focus:outline-none"
                >
                  <div className="min-w-0">
                    <b className="block truncate text-[13.5px] text-ink">{row.travelerName}</b>
                    <p className="mt-0.5 text-[11.5px] text-muted-soft">Posted {formatDate(row.createdAt)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-muted">{row.startLocation} → {row.endLocation}</p>
                    <p className="truncate text-[11px] text-muted-soft">{formatDate(row.startDate)} – {formatDate(row.endDate)}</p>
                  </div>
                  <div>
                    <b className="text-[12.5px] text-ink">{row.offerCount} offer{row.offerCount === 1 ? '' : 's'}</b>
                    <p className="mt-0.5 text-[11px] text-muted-soft">{row.bookableCount > 0 ? `${row.bookableCount} bookable` : 'All expired'}</p>
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className={tagClass(row.opened ? 'green' : 'red')}>{row.opened ? 'Opened' : 'Not opened'}</span>
                    {row.replied ? <span className={tagClass('blue')}>Replied</span> : null}
                  </div>
                  <div className="min-w-0 text-[11.5px] text-muted-soft">
                    {row.feedbackReason ? <span className={`mb-1 ${tagClass('amber')}`}>{REASON_LABELS[row.feedbackReason] || row.feedbackReason}</span> : null}
                    {row.followUpStopped ? <span className={tagClass('grey')}>Reminders stopped</span> : null}
                    {!row.followUpStopped && row.followUpPausedUntil && new Date(row.followUpPausedUntil) > new Date() ? <span className="block">Paused until {formatDate(row.followUpPausedUntil)}</span> : null}
                    {row.followUpSteps.length === 0 ? (
                      row.followUpStopped ? null : 'No reminders sent yet'
                    ) : (
                      row.followUpSteps.map((entry) => (
                        <span key={entry.step} className="block truncate">{STEP_LABELS[entry.step] || entry.step} · {formatDate(entry.sentAt)}</span>
                      ))
                    )}
                  </div>
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted"><ArrowRight className="h-4 w-4" /></span>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QuoteFunnelSection;

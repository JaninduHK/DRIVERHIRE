import { ShieldAlert, RotateCcw, Ban, Undo2 } from 'lucide-react';
import { formatDateTime, tagClass } from './adminFormatters.js';

const SUSPENSION_OPTIONS = [
  { hours: 24, label: '24 hours' },
  { hours: 168, label: '7 days' },
];

const AbusePanel = ({ state, onReload, onSuspend }) => {
  const { items, loading, error, updatingId } = state;

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading abuse signals…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
        <button type="button" onClick={onReload} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  const handleSuspend = (signal, hours) => {
    if (hours) {
      const reason = window.prompt('Reason for pausing this driver’s messaging (shown to them):', 'Repeatedly sharing contact details in chat.');
      if (reason === null) return;
      onSuspend?.(signal.driverId, { hours, reason });
      return;
    }
    onSuspend?.(signal.driverId, { hours: 0, reason: '' });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[18px] bg-surface p-5 shadow-card">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <b className="text-[15px] text-ink">How to read this</b>
        </div>
        <p className="mt-1.5 max-w-3xl text-[12.5px] leading-relaxed text-muted">
          Contact details are already hidden from travellers automatically — these are <b>attempts</b>, not leaks.
          Nothing here is enforced: rate limits are being measured only, so real thresholds can be chosen from real
          behaviour. Pausing a driver is manual and deliberate; it stops them sending, but keeps their profile listed
          and bookable.
        </p>
      </div>

      <div className="rounded-[18px] bg-surface shadow-card">
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-5 py-4">
          <b className="text-[15px] text-ink">
            Flagged drivers <span className="font-semibold text-muted-soft">({items.length})</span>
          </b>
          <button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted transition hover:border-brand hover:text-brand-dark">
            Refresh
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
            <ShieldAlert className="h-9 w-9 text-muted-soft" />
            <p>No drivers have tripped a signal yet.</p>
          </div>
        ) : (
          items.map((signal) => {
            const isUpdating = updatingId === signal.driverId;
            const suspended = signal.suspendedUntil && new Date(signal.suspendedUntil) > new Date();
            return (
              <div key={signal.driverId} className="border-b border-hairline px-5 py-4 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="text-[13.5px] text-ink">{signal.driver?.name || 'Driver'}</b>
                      {suspended ? (
                        <span className={tagClass('red')}>Paused until {formatDateTime(signal.suspendedUntil)}</span>
                      ) : null}
                    </div>
                    <div className="truncate text-[12px] font-semibold text-muted-soft">{signal.driver?.email || ''}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suspended ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleSuspend(signal, 0)}
                        className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-ink transition hover:border-muted-soft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Undo2 className="h-4 w-4" /> {isUpdating ? 'Updating…' : 'Lift pause'}
                      </button>
                    ) : (
                      SUSPENSION_OPTIONS.map((option) => (
                        <button
                          key={option.hours}
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleSuspend(signal, option.hours)}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Ban className="h-4 w-4" /> Pause {option.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
                  <span>
                    Contact attempts <b className="text-ink">{signal.violations.total}</b>
                    {signal.violations.total > 0 ? (
                      <span className="text-muted-soft">
                        {' '}({signal.violations.phone} phone · {signal.violations.email} email · {signal.violations.link} link)
                      </span>
                    ) : null}
                  </span>
                  {signal.lastViolationAt ? <span>Last {formatDateTime(signal.lastViolationAt)}</span> : null}
                  {signal.duplicateClusters.length > 0 ? (
                    <span>
                      Repeated messages <b className="text-ink">{signal.duplicateClusters.length}</b>
                    </span>
                  ) : null}
                </div>

                {signal.duplicateClusters.length > 0 ? (
                  <div className="mt-2.5 rounded-xl border border-hairline bg-canvas/60 p-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Same message, many travellers</p>
                    {signal.duplicateClusters.slice(0, 3).map((cluster) => (
                      <p key={cluster.sample} className="mt-1.5 text-[12.5px] text-ink-soft">
                        <b className="text-ink">{cluster.recipients} travellers</b> ·{' '}
                        <span className="text-muted">“{cluster.sample}”</span>
                      </p>
                    ))}
                  </div>
                ) : null}

                {signal.violationSamples.length > 0 ? (
                  <div className="mt-2.5 rounded-xl border border-hairline bg-canvas/60 p-3">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Recent flagged messages</p>
                    {signal.violationSamples.slice(0, 3).map((sample) => (
                      <p key={sample.createdAt} className="mt-1.5 text-[12.5px] text-muted">
                        <span className="text-muted-soft">{formatDateTime(sample.createdAt)}</span> — “{sample.body}”
                      </p>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AbusePanel;

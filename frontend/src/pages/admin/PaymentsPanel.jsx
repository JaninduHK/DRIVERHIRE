import { useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, FileText, Paperclip, RotateCcw, Wallet, XCircle } from 'lucide-react';
import { formatCurrency, formatDateTime, tagClass } from './adminFormatters.js';

const STATUS_TAGS = { pending: 'grey', submitted: 'amber', approved: 'green' };
const STATUS_LABELS = { pending: 'Awaiting payment', submitted: 'Pending review', approved: 'Approved' };

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending', label: 'Awaiting payment' },
];

const PaymentsPanel = ({ state, month, onReload, onMonthChange, onStatusChange }) => {
  const { items, loading, error, updatingId } = state;
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [expandedId, setExpandedId] = useState(null);
  const [noteDrafts, setNoteDrafts] = useState({});

  const toggleExpanded = (driverId) => setExpandedId((prev) => (prev === driverId ? null : driverId));

  const statusCounts = useMemo(() => {
    const counts = { all: items.length, pending: 0, submitted: 0, approved: 0 };
    items.forEach((item) => {
      if (counts[item.status] !== undefined) counts[item.status] += 1;
    });
    return counts;
  }, [items]);

  const visibleItems = useMemo(
    () => (statusFilter === 'all' ? items : items.filter((item) => item.status === statusFilter)),
    [items, statusFilter]
  );

  const handleNoteChange = (driverId, value) => setNoteDrafts((prev) => ({ ...prev, [driverId]: value }));

  const handleConfirm = (item) => {
    onStatusChange?.(item.driverId, item.year, item.month, { status: 'approved', adminNote: noteDrafts[item.driverId] || '' });
  };

  const handleReject = (item) => {
    if (!window.confirm('Send this payment back to the driver for re-upload?')) return;
    onStatusChange?.(item.driverId, item.year, item.month, {
      status: 'pending',
      adminNote: noteDrafts[item.driverId] || 'Payment slip rejected — please re-upload.',
    });
  };

  const handleReopen = (item) => {
    onStatusChange?.(item.driverId, item.year, item.month, { status: 'submitted', adminNote: noteDrafts[item.driverId] || '' });
  };

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading driver payments…</div>;
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

  return (
    <div className="rounded-[18px] bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <b className="text-[15px] text-ink">Driver payments <span className="font-semibold text-muted-soft">({visibleItems.length})</span></b>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            onChange={(event) => event.target.value && onMonthChange?.(event.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink focus:border-ink focus:outline-none"
          />
          <button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted transition hover:border-brand hover:text-brand-dark">Refresh</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-hairline px-5 py-3">
        {STATUS_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatusFilter(option.value)}
            className={tagClass(statusFilter === option.value ? STATUS_TAGS[option.value] || 'green' : 'grey')}
          >
            {option.label} {statusCounts[option.value] ?? 0}
          </button>
        ))}
      </div>

      {visibleItems.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <Wallet className="h-9 w-9 text-muted-soft" />
          <p>{items.length === 0 ? 'No drivers had a tour end in this month yet.' : 'No payments match this filter.'}</p>
        </div>
      ) : (
        visibleItems.map((item) => {
          const isUpdating = updatingId === item.driverId;
          const isExpanded = expandedId === item.driverId;

          return (
            <div key={item.driverId} className="border-b border-hairline last:border-b-0">
              <button
                type="button"
                onClick={() => toggleExpanded(item.driverId)}
                className="grid w-full grid-cols-[1.2fr_.9fr_.9fr_.9fr_.9fr_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-canvas"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate text-[13.5px] text-ink">{item.driver?.name || 'Driver'}</b>
                    <span className={tagClass(STATUS_TAGS[item.status] || 'grey')}>{STATUS_LABELS[item.status] || item.status}</span>
                  </div>
                  <div className="truncate text-[12px] font-semibold text-muted-soft">{item.driver?.email || ''}</div>
                </div>
                <div className="text-[12.5px] text-muted-soft">{item.periodLabel}</div>
                <div className="text-[12.5px] text-muted-soft">{item.bookingCount} booking{item.bookingCount === 1 ? '' : 's'}</div>
                <div className="text-[13.5px] font-extrabold text-brand-dark">{formatCurrency(item.commissionDue || 0)}</div>
                <div className="text-[12px] text-muted-soft">Gross {formatCurrency(item.totalGross || 0)}</div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-soft transition ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded ? (
                <div className="border-t border-hairline bg-canvas/60 px-5 py-4">
                  <div className="grid grid-cols-2 gap-3 text-[12.5px] text-muted sm:grid-cols-4">
                    <div><span className="block text-[10.5px] font-extrabold uppercase tracking-wide text-muted-soft">Commission rate</span>{Math.round((item.commissionRate || 0) * 10000) / 100}%</div>
                    <div><span className="block text-[10.5px] font-extrabold uppercase tracking-wide text-muted-soft">Driver earnings</span>{formatCurrency(item.driverEarnings || 0)}</div>
                    <div><span className="block text-[10.5px] font-extrabold uppercase tracking-wide text-muted-soft">Contact</span>{item.driver?.contactNumber || 'Not shared'}</div>
                    <div><span className="block text-[10.5px] font-extrabold uppercase tracking-wide text-muted-soft">Last updated</span>{item.updatedAt ? formatDateTime(item.updatedAt) : 'Not reviewed yet'}</div>
                  </div>

                  <div className="mt-3">
                    <span className="block text-[10.5px] font-extrabold uppercase tracking-wide text-muted-soft">Payment slip</span>
                    {item.paymentSlipUrl ? (
                      <a href={item.paymentSlipUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-dark hover:underline">
                        <Paperclip className="h-3.5 w-3.5" /> View uploaded slip {item.paymentSlipUploadedAt ? `(${formatDateTime(item.paymentSlipUploadedAt)})` : ''}
                      </a>
                    ) : (
                      <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted-soft">
                        <FileText className="h-3.5 w-3.5" /> No payment slip uploaded yet.
                      </p>
                    )}
                  </div>

                  {item.adminNote ? (
                    <p className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-400/10 px-3 py-2 text-[12px] font-semibold text-amber-700 dark:text-amber-300">
                      Admin note: {item.adminNote}
                    </p>
                  ) : null}

                  {item.status !== 'approved' ? (
                    <div className="mt-3">
                      <label className="block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Note to driver (optional)</label>
                      <textarea
                        rows={2}
                        value={noteDrafts[item.driverId] ?? ''}
                        onChange={(event) => handleNoteChange(item.driverId, event.target.value)}
                        placeholder="e.g. Slip amount doesn't match commission due — please re-upload."
                        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10"
                      />
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.status === 'submitted' ? (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleConfirm(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" /> {isUpdating ? 'Updating…' : 'Confirm payment'}
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => handleReject(item)}
                          className="inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <XCircle className="h-4 w-4" /> Reject &amp; request re-upload
                        </button>
                      </>
                    ) : item.status === 'approved' ? (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => handleReopen(item)}
                        className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-ink transition hover:border-muted-soft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw className="h-4 w-4" /> Reopen for review
                      </button>
                    ) : (
                      <p className="text-[12px] text-muted-soft">Waiting for the driver to upload a payment slip.</p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
};

export default PaymentsPanel;

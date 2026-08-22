import { useState } from 'react';
import { AlertTriangle, ChevronDown, RotateCcw, Send, XCircle } from 'lucide-react';
import { formatCurrency, formatDate, tagClass } from './adminFormatters.js';

const OFFER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
];

const STATUS_TAGS = { pending: 'amber', accepted: 'green', declined: 'red' };

const OffersPanel = ({ state, onReload, onStatusChange, onDelete }) => {
  const { items: filtered, loading, error, updatingId, deletingId } = state;
  const [expandedId, setExpandedId] = useState(null);
  const toggleExpanded = (offerId) => setExpandedId((prev) => (prev === offerId ? null : offerId));

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading offers…</div>;
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
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-5 py-4">
        <b className="text-[15px] text-ink">Driver offers <span className="font-semibold text-muted-soft">({filtered.length})</span></b>
        <button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted transition hover:border-brand hover:text-brand-dark">Refresh</button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <Send className="h-9 w-9 text-muted-soft" />
          <p>No offers have been sent yet.</p>
        </div>
      ) : (
        filtered.map((offer) => {
          const isUpdating = updatingId === offer.id;
          const isDeleting = deletingId === offer.id;
          const isExpanded = expandedId === offer.id;

          return (
            <div key={offer.id} className="border-b border-hairline last:border-b-0">
              <button
                type="button"
                onClick={() => toggleExpanded(offer.id)}
                className="grid w-full grid-cols-[1.2fr_1.3fr_.9fr_.8fr_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-canvas"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate text-[13.5px] text-ink">{offer.driver?.name || 'Driver'}</b>
                    <span className={tagClass(STATUS_TAGS[offer.status] || 'grey')}>{offer.status}</span>
                  </div>
                  <div className="truncate text-[12px] font-semibold text-muted-soft">Vehicle: {offer.vehicle?.model || 'Pending'}</div>
                </div>
                <div className="truncate text-[12.5px] text-muted-soft">
                  {offer.traveler?.name || 'Unknown'} · {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
                </div>
                <div className="text-[13.5px] font-extrabold text-brand-dark">{formatCurrency(offer.totalPrice || 0)}</div>
                <div className="text-[12px] text-muted-soft">{offer.totalKms || 0} km</div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-soft transition ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded ? (
                <div className="border-t border-hairline bg-canvas/60 px-5 py-4">
                  <p className="text-[12px] text-muted-soft">Created {formatDate(offer.createdAt)}</p>
                  {offer.body ? <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-muted">{offer.body}</p> : null}
                  {offer.warning ? (
                    <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-400/10 px-3 py-2 text-[11.5px] font-semibold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" /> {offer.warning}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <select
                      value={offer.status}
                      onChange={(event) => onStatusChange?.(offer.id, event.target.value)}
                      disabled={isUpdating}
                      className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink focus:border-ink focus:outline-none"
                    >
                      {OFFER_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => { if (window.confirm('Delete this offer?')) onDelete?.(offer.id); }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-400/30 bg-surface px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <XCircle className="h-3.5 w-3.5" /> {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
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

export default OffersPanel;

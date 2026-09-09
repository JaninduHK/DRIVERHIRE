import { useState } from 'react';
import { CheckCircle2, ChevronDown, CircleUserRound, Loader2, RotateCcw, ShieldCheck, XCircle } from 'lucide-react';
import ImageLightbox from '../../components/ImageLightbox.jsx';
import { formatDate, tagClass } from './adminFormatters.js';

const getLicenseStatusLabel = (status) => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'pending':
    default:
      return 'Pending';
  }
};

const STATUS_TAGS = { pending: 'amber', approved: 'green', rejected: 'red' };

const VerificationPanel = ({ state, filter, onFilterChange, onRetry, onStatusChange }) => {
  const { items: filtered, meta, loading, error, updatingId } = state;

  const filters = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'all', label: 'All' },
  ];

  const [expandedId, setExpandedId] = useState(null);
  const toggleExpanded = (driverId) => setExpandedId((prev) => (prev === driverId ? null : driverId));
  const [lightboxImage, setLightboxImage] = useState(null);

  const handleFilterClick = (value) => { if (value !== filter) onFilterChange?.(value); };

  const statusCounts = meta?.counts || { pending: 0, approved: 0, rejected: 0 };

  const emptyCopy =
    filter === 'pending' ? 'No license submissions are awaiting review right now.'
      : filter === 'approved' ? 'No licenses have been approved yet.'
      : filter === 'rejected' ? 'No licenses have been rejected.'
      : 'No license submissions found.';

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] bg-surface p-4 shadow-card">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Pending</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{statusCounts.pending ?? 0}</p>
        </div>
        <div className="rounded-[14px] bg-surface p-4 shadow-card">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Approved</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{statusCounts.approved ?? 0}</p>
        </div>
        <div className="rounded-[14px] bg-surface p-4 shadow-card">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Rejected</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{statusCounts.rejected ?? 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((option) => (
            <button key={option.value} type="button" onClick={() => handleFilterClick(option.value)} className={tagClass(filter === option.value ? 'green' : 'grey')}>
              {option.label}
            </button>
          ))}
        </div>
        <span className="text-[13px] text-muted-soft">{meta?.total ?? 0} result{(meta?.total ?? 0) === 1 ? '' : 's'}</span>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`license-skeleton-${index}`} className="animate-pulse space-y-3 rounded-[18px] bg-surface p-4 shadow-card">
              <div className="h-4 w-1/3 rounded-full bg-canvas" />
              <div className="h-5 w-3/4 rounded-full bg-canvas" />
              <div className="h-16 rounded-2xl bg-canvas" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
          <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft">
            <RotateCcw className="h-4 w-4" /> Try again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <ShieldCheck className="h-9 w-9 text-muted-soft" />
          <p>{emptyCopy}</p>
        </div>
      ) : (
        <div className="rounded-[18px] bg-surface shadow-card">
          {filtered.map((license) => {
            const submittedOn = license.submittedAt ? formatDate(license.submittedAt) : null;
            const reviewedOn = license.reviewedAt ? formatDate(license.reviewedAt) : null;
            const statusLabel = getLicenseStatusLabel(license.status);
            const isUpdating = updatingId === license.driverId;
            const isExpanded = expandedId === license.driverId;

            const handleReject = () => {
              let note = license.adminNote || '';
              if (typeof window !== 'undefined') {
                const input = window.prompt('Add an optional note for this driver:', note);
                note = typeof input === 'string' ? input.trim() : note?.trim();
              }
              onStatusChange?.(license.driverId, 'rejected', note || undefined);
            };

            return (
              <div key={license.driverId} className="border-b border-hairline last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleExpanded(license.driverId)}
                  className="grid w-full grid-cols-[1.4fr_1.1fr_.8fr_.9fr_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-canvas"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-9 w-9 flex-shrink-0 place-items-center overflow-hidden rounded-full bg-canvas">
                      {license.driverPhoto ? (
                        <img src={license.driverPhoto} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <CircleUserRound className="h-5 w-5 text-muted-soft" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold text-ink">{license.driverName || 'Driver'}</div>
                      <div className="truncate text-[11.5px] text-muted-soft">{license.driverEmail}</div>
                    </div>
                  </div>
                  <div className="min-w-0 truncate text-[12.5px] text-muted-soft">{license.licenseType}</div>
                  <div><span className={tagClass(STATUS_TAGS[license.status] || 'grey')}>{statusLabel}</span></div>
                  <div className="text-[12px] text-muted-soft">{submittedOn || '—'}</div>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-soft transition ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded ? (
                  <div className="border-t border-hairline bg-canvas/60 px-5 py-4">
                    <div className="flex flex-wrap items-start gap-4">
                      {license.licenseImage ? (
                        <button
                          type="button"
                          onClick={() => setLightboxImage(license.licenseImage)}
                          className="block h-24 w-32 flex-shrink-0 overflow-hidden rounded-lg border border-hairline bg-canvas"
                          aria-label="View license photo"
                        >
                          <img src={license.licenseImage} alt="License" className="h-full w-full object-cover" />
                        </button>
                      ) : null}
                      <div className="min-w-0 flex-1 text-[12.5px] text-muted-soft">
                        {license.driverContactNumber ? <p>Contact: {license.driverContactNumber}</p> : null}
                        {reviewedOn ? <p className="mt-0.5">Reviewed {reviewedOn}{license.reviewedBy ? ` by ${license.reviewedBy}` : ''}</p> : null}
                      </div>
                    </div>
                    {license.status === 'rejected' && license.adminNote ? (
                      <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10 p-3 text-[12px] text-amber-700 dark:text-amber-300">
                        <p className="font-bold">Admin note</p>
                        <p>{license.adminNote}</p>
                      </div>
                    ) : null}
                    {license.status === 'pending' ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={() => onStatusChange?.(license.driverId, 'approved')} disabled={isUpdating} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60">
                          {isUpdating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>) : (<><CheckCircle2 className="h-4 w-4" /> Approve</>)}
                        </button>
                        <button type="button" onClick={handleReject} disabled={isUpdating} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60">
                          <XCircle className="h-4 w-4" /> {isUpdating ? 'Updating…' : 'Reject'}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4">
                        <button type="button" onClick={() => onStatusChange?.(license.driverId, 'pending')} disabled={isUpdating} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink transition hover:border-muted-soft disabled:cursor-not-allowed disabled:opacity-60">
                          {isUpdating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>) : (<><RotateCcw className="h-4 w-4" /> Reopen</>)}
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <ImageLightbox
        images={lightboxImage ? [lightboxImage] : []}
        index={lightboxImage ? 0 : null}
        onIndexChange={() => {}}
        onClose={() => setLightboxImage(null)}
        alt="License photo"
      />
    </div>
  );
};

export default VerificationPanel;

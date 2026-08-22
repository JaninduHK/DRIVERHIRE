import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown, Loader2, Plus, RotateCcw, Star, Upload, XCircle } from 'lucide-react';
import { csvToObjects } from '../../lib/csv.js';
import ReviewPhotos from '../../components/ReviewPhotos.jsx';
import AdminModal from './AdminModal.jsx';
import { formatDate, tagClass } from './adminFormatters.js';

const getReviewStatusLabel = (status) => {
  switch (status) {
    case 'approved':
      return 'Published';
    case 'rejected':
      return 'Declined';
    case 'pending':
    default:
      return 'Pending';
  }
};

const STATUS_TAGS = { pending: 'amber', approved: 'green', rejected: 'red' };

const REVIEW_CSV_TEMPLATE = `driverEmail,vehicleId,travelerName,rating,title,comment,reviewDate,status,imageUrls
driver@example.com,,Anna & Mark,5,Great trip,"Fantastic driver, punctual and friendly across the whole island.",2026-05-01,approved,https://example.com/photo1.jpg`;

const ReviewBulkImport = ({ onImport }) => {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const validCount = useMemo(
    () =>
      rows.filter(
        (row) => (row.driverEmail || row.driverId) && Number(row.rating) >= 1 && Number(row.rating) <= 5 && (row.comment || '').trim().length >= 10
      ).length,
    [rows]
  );

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setParseError('');
    setResult(null);
    setFileName(file.name);
    try {
      const parsed = csvToObjects(await file.text());
      if (!parsed.length) {
        setRows([]);
        setParseError('No data rows found. Include a header row and at least one review.');
        return;
      }
      setRows(parsed);
    } catch (err) {
      setRows([]);
      setParseError(err?.message || 'Unable to read the CSV file.');
    }
  };

  const handleImport = async () => {
    if (!rows.length || !onImport) return;
    setImporting(true);
    setResult(null);
    try {
      const response = await onImport(rows);
      setResult(response);
      if (response?.created > 0) {
        setRows([]);
        setFileName('');
      }
    } catch (err) {
      setParseError(err?.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const templateHref = `data:text/csv;charset=utf-8,${encodeURIComponent(REVIEW_CSV_TEMPLATE)}`;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-[12.5px] text-muted">
          Required columns: <b>driverEmail</b> (or driverId), <b>rating</b>, <b>comment</b>. Optional: vehicleId, travelerName, title, reviewDate, status, imageUrls (| separated).
        </p>
        <a href={templateHref} download="reviews-template.csv" className="flex-shrink-0 rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink transition hover:border-brand">
          Download template
        </a>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-bold text-ink transition hover:border-brand">
          Choose CSV file
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </label>
        {fileName ? (
          <span className="text-[13px] text-muted-soft">{fileName} · {rows.length} row{rows.length === 1 ? '' : 's'} ({validCount} look valid)</span>
        ) : null}
        <button
          type="button"
          onClick={handleImport}
          disabled={!rows.length || importing}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {importing ? 'Importing…' : `Import ${rows.length || ''} review${rows.length === 1 ? '' : 's'}`}
        </button>
      </div>
      {parseError ? <p className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-400/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{parseError}</p> : null}
      {result ? (
        <div className="mt-3 rounded-lg bg-canvas px-3 py-2 text-sm text-ink">
          <p className="font-bold">{result.created} imported{result.failed ? `, ${result.failed} failed` : ''}.</p>
          {Array.isArray(result.errors) && result.errors.length ? (
            <ul className="mt-1 list-disc pl-5 text-xs text-rose-600 dark:text-rose-300">
              {result.errors.slice(0, 8).map((entry) => (<li key={entry.row}>Row {entry.row}: {entry.message}</li>))}
              {result.errors.length > 8 ? <li>…and {result.errors.length - 8} more</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const inputCls =
  'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';

const ReviewsPanel = ({ state, filter, onFilterChange, onRetry, onStatusChange, onCreate, onBulkImport, drivers = [], vehicles = [] }) => {
  const { items: filtered, meta, loading, error, updatingId, creating = false } = state;
  const items = filtered;

  const filters = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Published' },
    { value: 'rejected', label: 'Declined' },
    { value: 'all', label: 'All' },
  ];

  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const toggleExpanded = (reviewId) => setExpandedId((prev) => (prev === reviewId ? null : reviewId));
  const [formState, setFormState] = useState({ driverId: '', vehicleId: '', travelerName: '', rating: '5', title: '', comment: '', reviewDate: '', status: 'approved' });
  const [imageFiles, setImageFiles] = useState([]);
  const [formError, setFormError] = useState('');

  const handleImagesChange = (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (!picked.length) return;
    setImageFiles((prev) => [...prev, ...picked].slice(0, 4));
  };

  const removeImageAt = (index) => setImageFiles((prev) => prev.filter((_, i) => i !== index));

  const imagePreviews = useMemo(() => imageFiles.map((file) => URL.createObjectURL(file)), [imageFiles]);
  useEffect(() => () => imagePreviews.forEach((url) => URL.revokeObjectURL(url)), [imagePreviews]);

  const approvedDrivers = useMemo(() => drivers.filter((driver) => driver.driverStatus === 'approved'), [drivers]);

  const vehicleOptions = useMemo(() => {
    if (!formState.driverId) return [];
    return vehicles.filter((vehicle) => {
      const driverId = vehicle.driver?.id || vehicle.driver?._id || vehicle.driver;
      const matchesDriver = driverId && String(driverId) === String(formState.driverId);
      const approvedStatus = !vehicle.status || vehicle.status === 'approved';
      return matchesDriver && approvedStatus;
    });
  }, [formState.driverId, vehicles]);

  const statusCounts = useMemo(() => {
    if (meta?.counts) {
      return { approved: meta.counts.approved ?? 0, pending: meta.counts.pending ?? 0, rejected: meta.counts.rejected ?? 0 };
    }
    const counts = { approved: 0, pending: 0, rejected: 0 };
    (Array.isArray(items) ? items : []).forEach((review) => {
      const key = review.status || 'pending';
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return counts;
  }, [items, meta]);

  const averageRating = useMemo(() => {
    if (meta && meta.averageRating !== undefined) return meta.averageRating;
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return null;
    const aggregate = list.reduce(
      (acc, review) => {
        const rating = Number(review.rating);
        if (Number.isFinite(rating)) { acc.sum += rating; acc.count += 1; }
        return acc;
      },
      { sum: 0, count: 0 }
    );
    return aggregate.count === 0 ? null : Number((aggregate.sum / aggregate.count).toFixed(1));
  }, [items, meta]);

  const handleFilterClick = (value) => { if (value !== filter) onFilterChange?.(value); };
  const handleFormFieldChange = (field, value) => setFormState((prev) => ({ ...prev, [field]: value }));

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!onCreate) return;
    if (!formState.driverId) {
      setFormError('Select a driver to attach this review to.');
      return;
    }
    const ratingValue = Number(formState.rating);
    if (!Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      setFormError('Choose a rating between 1 and 5.');
      return;
    }
    const trimmedComment = formState.comment.trim();
    if (trimmedComment.length < 10) {
      setFormError('Add at least 10 characters to the review text.');
      return;
    }
    const fields = { driver: formState.driverId, rating: String(Math.round(ratingValue)), comment: trimmedComment, status: formState.status || 'approved' };
    if (formState.vehicleId) fields.vehicle = formState.vehicleId;
    if (formState.travelerName.trim()) fields.travelerName = formState.travelerName.trim();
    if (formState.title.trim()) fields.title = formState.title.trim();
    if (formState.reviewDate) fields.reviewDate = formState.reviewDate;

    let payload;
    if (imageFiles.length) {
      const form = new FormData();
      Object.entries(fields).forEach(([key, value]) => form.append(key, value));
      imageFiles.forEach((file) => form.append('images', file));
      payload = form;
    } else {
      payload = { ...fields, rating: Math.round(ratingValue) };
    }

    try {
      await onCreate(payload);
      setFormState({ driverId: '', vehicleId: '', travelerName: '', rating: '5', title: '', comment: '', reviewDate: '', status: 'approved' });
      setImageFiles([]);
      setCreateOpen(false);
    } catch (createError) {
      setFormError(createError?.message || 'Unable to publish review.');
    }
  };

  const emptyCopy =
    filter === 'pending' ? 'No reviews are awaiting moderation right now.'
      : filter === 'approved' ? 'No reviews have been published yet.'
      : filter === 'rejected' ? 'No reviews have been declined.'
      : 'No reviews found.';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3.5 py-2 text-xs font-extrabold text-ink transition hover:border-brand">
          <Upload className="h-3.5 w-3.5" /> Import CSV
        </button>
        <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-extrabold text-white transition hover:bg-brand-dark">
          <Plus className="h-3.5 w-3.5" /> Add review
        </button>
      </div>

      <AdminModal open={importOpen} onClose={() => setImportOpen(false)} title="Import reviews from CSV" subtitle="Bulk-publish reviews from a spreadsheet.">
        <ReviewBulkImport onImport={onBulkImport} />
      </AdminModal>

      <AdminModal open={createOpen} onClose={() => setCreateOpen(false)} title="Add a review to any driver" subtitle="Select the driver, capture the guest name, and publish immediately.">
        <form onSubmit={handleCreateSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>Driver</label>
              <select
                value={formState.driverId}
                onChange={(event) => { handleFormFieldChange('driverId', event.target.value); handleFormFieldChange('vehicleId', ''); }}
                className={inputCls}
                required
              >
                <option value="">Select driver</option>
                {approvedDrivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.name} {driver.contactNumber ? `(${driver.contactNumber})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vehicle (optional)</label>
              <select
                value={formState.vehicleId}
                onChange={(event) => handleFormFieldChange('vehicleId', event.target.value)}
                className={inputCls}
                disabled={!formState.driverId || vehicleOptions.length === 0}
              >
                <option value="">{formState.driverId ? (vehicleOptions.length > 0 ? 'Select vehicle' : 'No approved vehicles') : 'Select a driver first'}</option>
                {vehicleOptions.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{vehicle.model} {vehicle.year ? `(${vehicle.year})` : ''}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>Guest name</label>
              <input type="text" value={formState.travelerName} onChange={(event) => handleFormFieldChange('travelerName', event.target.value)} className={inputCls} placeholder="e.g. Alex D." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Rating</label>
                <select value={formState.rating} onChange={(event) => handleFormFieldChange('rating', event.target.value)} className={inputCls}>
                  {[5, 4, 3, 2, 1].map((rating) => (<option key={rating} value={rating}>{rating} star{rating === 1 ? '' : 's'}</option>))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select value={formState.status} onChange={(event) => handleFormFieldChange('status', event.target.value)} className={inputCls}>
                  <option value="approved">Publish now</option>
                  <option value="pending">Save as pending</option>
                  <option value="rejected">Mark as declined</option>
                </select>
              </div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>Title (optional)</label>
              <input type="text" value={formState.title} onChange={(event) => handleFormFieldChange('title', event.target.value)} className={inputCls} placeholder="e.g. Safe and flexible driver" />
            </div>
            <div>
              <label className={labelCls}>Review date (optional)</label>
              <input type="date" value={formState.reviewDate} onChange={(event) => handleFormFieldChange('reviewDate', event.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Review text</label>
            <textarea rows={3} value={formState.comment} onChange={(event) => handleFormFieldChange('comment', event.target.value)} className={inputCls} placeholder="Summarize the traveller's experience in 2-3 sentences." required />
          </div>
          <div>
            <label className={labelCls}>Photos (optional, up to 4)</label>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {imageFiles.map((file, index) => (
                <div key={`${file.name}-${file.lastModified}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-lg border border-line">
                  <img src={imagePreviews[index]} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeImageAt(index)} className="absolute right-0.5 top-0.5 rounded-full bg-[#0f1f2d]/70 text-white" aria-label="Remove photo">
                    <XCircle className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {imageFiles.length < 4 ? (
                <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line text-muted-soft transition hover:border-brand hover:text-brand-dark">
                  <Upload className="h-4 w-4" />
                  <span className="text-[10px] font-bold">Add</span>
                  <input type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
                </label>
              ) : null}
            </div>
          </div>
          {formError ? <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{formError}</p> : null}
          <div className="flex justify-end">
            <button type="submit" disabled={creating} className="inline-flex items-center gap-2 rounded-lg bg-[#0f1f2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0f1f2d]/90 disabled:cursor-not-allowed disabled:opacity-70">
              {creating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Publishing…</>) : 'Publish review'}
            </button>
          </div>
        </form>
      </AdminModal>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[14px] bg-surface p-4 shadow-card">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Published</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{statusCounts.approved ?? 0}</p>
        </div>
        <div className="rounded-[14px] bg-surface p-4 shadow-card">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Pending</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{statusCounts.pending ?? 0}</p>
        </div>
        <div className="rounded-[14px] bg-surface p-4 shadow-card">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Declined</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{statusCounts.rejected ?? 0}</p>
        </div>
        <div className="rounded-[14px] bg-surface p-4 shadow-card">
          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Average rating</p>
          <p className="mt-1 text-xl font-extrabold text-ink">{averageRating !== null ? averageRating : '—'}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
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
            <div key={`review-skeleton-${index}`} className="animate-pulse space-y-3 rounded-[18px] bg-surface p-4 shadow-card">
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
          <Star className="h-9 w-9 text-muted-soft" />
          <p>{emptyCopy}</p>
        </div>
      ) : (
        <div className="rounded-[18px] bg-surface shadow-card">
          {filtered.map((review) => {
            const vehicleModel = review.vehicle?.model || 'Vehicle unavailable';
            const driverName = review.vehicle?.driver?.name;
            const bookingStart = review.booking?.startDate ? formatDate(review.booking.startDate) : null;
            const bookingEnd = review.booking?.endDate ? formatDate(review.booking.endDate) : null;
            const submittedOn = review.createdAt ? formatDate(review.createdAt) : null;
            const statusLabel = getReviewStatusLabel(review.status);
            const isUpdating = updatingId === review.id;
            const isAdminAuthored = Boolean(review.createdByAdmin);
            const isExpanded = expandedId === review.id;

            const handleDecline = () => {
              let note = review.adminNote || '';
              if (typeof window !== 'undefined') {
                const input = window.prompt('Add an optional note for this traveller:', note);
                note = typeof input === 'string' ? input.trim() : note?.trim();
              }
              onStatusChange?.(review.id, 'rejected', note || undefined);
            };

            return (
              <div key={review.id} className="border-b border-hairline last:border-b-0">
                <button
                  type="button"
                  onClick={() => toggleExpanded(review.id)}
                  className="grid w-full grid-cols-[.8fr_1.2fr_1.3fr_.9fr_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-canvas"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[13px] font-extrabold text-star"><Star className="h-3.5 w-3.5" fill="currentColor" /> {review.rating}/5</span>
                    <span className={tagClass(STATUS_TAGS[review.status] || 'grey')}>{statusLabel}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold text-ink">{review.travelerName || 'Anonymous'}</div>
                    {isAdminAuthored ? <div className="text-[11px] font-semibold text-muted-soft">Admin added</div> : null}
                  </div>
                  <div className="min-w-0 truncate text-[12.5px] text-muted-soft">
                    {vehicleModel}{driverName ? ` · ${driverName}` : ''}
                  </div>
                  <div className="text-[12px] text-muted-soft">{submittedOn || '—'}</div>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-soft transition ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded ? (
                  <div className="border-t border-hairline bg-canvas/60 px-5 py-4">
                    {bookingStart && bookingEnd ? <p className="text-[12px] text-muted-soft">Trip: {bookingStart} – {bookingEnd}</p> : null}
                    {review.title ? <h3 className="mt-2 text-[15px] font-bold text-ink">{review.title}</h3> : null}
                    <p className="mt-2 whitespace-pre-line text-[13.5px] leading-relaxed text-muted">{review.comment}</p>
                    <ReviewPhotos images={review.images} />
                    {review.adminNote ? (
                      <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-400/30 bg-amber-50 dark:bg-amber-400/10 p-3 text-[12px] text-amber-700 dark:text-amber-300">
                        <p className="font-bold">Admin note</p>
                        <p>{review.adminNote}</p>
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {review.status === 'pending' ? (
                        <>
                          <button type="button" onClick={() => onStatusChange?.(review.id, 'approved')} disabled={isUpdating} className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60">
                            {isUpdating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>) : (<><CheckCircle2 className="h-4 w-4" /> Approve</>)}
                          </button>
                          <button type="button" onClick={handleDecline} disabled={isUpdating} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-100 dark:hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-60">
                            <XCircle className="h-4 w-4" /> {isUpdating ? 'Updating…' : 'Decline'}
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => onStatusChange?.(review.id, 'pending')} disabled={isUpdating} className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink transition hover:border-muted-soft disabled:cursor-not-allowed disabled:opacity-60">
                          {isUpdating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>) : (<><RotateCcw className="h-4 w-4" /> Reopen</>)}
                        </button>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewsPanel;

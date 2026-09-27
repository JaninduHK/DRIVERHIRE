import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, Loader2, Mail, Phone, RotateCcw, XCircle } from 'lucide-react';
import { formatCurrency, formatDate, formatDateInput, formatDateTime, tagClass } from './adminFormatters.js';
import { calculateCancellationFee } from '../../lib/cancellationPolicy.js';

const BOOKING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_TAGS = {
  pending: 'amber',
  confirmed: 'green',
  cancelled: 'grey',
  rejected: 'red',
};

const buildAdminBookingForm = (booking = {}) => ({
  status: booking.status || 'pending',
  startDate: formatDateInput(booking.startDate),
  endDate: formatDateInput(booking.endDate),
  pricePerDay: booking.pricePerDay ? String(booking.pricePerDay) : '',
  totalPrice: booking.totalPrice ? String(booking.totalPrice) : '',
  paymentNote: booking.paymentNote || '',
  startPoint: booking.startPoint || '',
  endPoint: booking.endPoint || '',
  specialRequests: booking.specialRequests || '',
  flightNumber: booking.flightNumber || '',
  arrivalTime: booking.arrivalTime || '',
  departureTime: booking.departureTime || '',
});

const inputCls =
  'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';

const BookingsPanel = ({ state, onReload, onUpdate, onDelete }) => {
  const { items: filtered, loading, error, updatingId, deletingId } = state;
  // Filters on createdAt — the same basis the Overview GBV card and the Reports
  // settlement table bucket by, so a month's rows reconcile against those totals.
  const [month, setMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const visible = useMemo(() => {
    const byStatus = statusFilter === 'all' ? filtered : filtered.filter((b) => b.status === statusFilter);
    if (!month) return byStatus;
    return byStatus.filter((booking) => {
      if (!booking.createdAt) return false;
      const d = new Date(booking.createdAt);
      if (Number.isNaN(d.getTime())) return false;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month;
    });
  }, [filtered, month, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: filtered.length, pending: 0, confirmed: 0, cancelled: 0, rejected: 0 };
    filtered.forEach((b) => { if (counts[b.status] !== undefined) counts[b.status] += 1; });
    return counts;
  }, [filtered]);

  // What the travellers owe their drivers across the cancellations in view.
  const cancellationTotal = useMemo(
    () =>
      visible
        .filter((b) => b.status === 'cancelled')
        .reduce((sum, b) => sum + (calculateCancellationFee(b).amount || 0), 0),
    [visible]
  );

  // Shown for the current view so a month's value can be checked against the
  // dashboard's GBV, which counts confirmed bookings only.
  const totals = useMemo(() => {
    let confirmed = 0;
    let other = 0;
    visible.forEach((b) => {
      const value = Number(b.totalPrice) || 0;
      if (b.status === 'confirmed') confirmed += value;
      else other += value;
    });
    return { confirmed, other };
  }, [visible]);
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(() => buildAdminBookingForm());
  const [formError, setFormError] = useState('');

  const startEditing = (booking) => {
    if (editingId === booking.id) {
      setEditingId(null);
      setFormState(buildAdminBookingForm());
      setFormError('');
      return;
    }
    setEditingId(booking.id);
    setFormState(buildAdminBookingForm(booking));
    setFormError('');
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingId) return;
    if (!formState.startDate || !formState.endDate) {
      setFormError('Start and end dates are required.');
      return;
    }
    const payload = {
      status: formState.status,
      startDate: formState.startDate,
      endDate: formState.endDate,
      pricePerDay: formState.pricePerDay ? Number(formState.pricePerDay) : undefined,
      totalPrice: formState.totalPrice ? Number(formState.totalPrice) : undefined,
      paymentNote: formState.paymentNote,
      startPoint: formState.startPoint,
      endPoint: formState.endPoint,
      specialRequests: formState.specialRequests,
      flightNumber: formState.flightNumber,
      arrivalTime: formState.arrivalTime,
      departureTime: formState.departureTime,
    };
    try {
      await onUpdate?.(editingId, payload);
      setEditingId(null);
      setFormState(buildAdminBookingForm());
      setFormError('');
    } catch (submitError) {
      setFormError(submitError?.message || 'Unable to update booking.');
    }
  };

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading bookings…</div>;
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
        <b className="text-[15px] text-ink">Bookings <span className="font-semibold text-muted-soft">({visible.length})</span></b>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Booked in</label>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink focus:border-ink focus:outline-none"
          />
          {month ? (
            <button type="button" onClick={() => setMonth('')} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted transition hover:border-brand hover:text-brand-dark">
              Clear
            </button>
          ) : null}
          <button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted transition hover:border-brand hover:text-brand-dark">
            Refresh
          </button>
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

      {statusFilter === 'cancelled' && visible.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-hairline px-5 py-2.5 text-[12px] font-semibold text-muted">
          <span>
            Owed to drivers under the cancellation policy{' '}
            <b className="text-ink">{formatCurrency(cancellationTotal)}</b>
          </span>
          <span className="text-muted-soft">Calculated from each booking's dates — not charged automatically.</span>
        </div>
      ) : null}

      {month && visible.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-hairline px-5 py-2.5 text-[12px] font-semibold text-muted">
          <span>Confirmed <b className="text-ink">{formatCurrency(totals.confirmed)}</b></span>
          {totals.other > 0 ? (
            <span>Not confirmed <b className="text-ink">{formatCurrency(totals.other)}</b> <span className="text-muted-soft">(excluded from GBV)</span></span>
          ) : null}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <CalendarDays className="h-9 w-9 text-muted-soft" />
          <p>No bookings found.</p>
        </div>
      ) : (
        <div>
          {visible.map((booking) => {
            const isEditing = editingId === booking.id;
            const isUpdating = updatingId === booking.id;
            const isDeleting = deletingId === booking.id;
            const travelerName = booking.traveler?.fullName || 'Traveller';
            const driverName = booking.driver?.name || 'Unassigned driver';
            const vehicleLabel = booking.vehicle?.model || 'Vehicle unavailable';

            return (
              <div key={booking.id} className="border-b border-hairline last:border-b-0">
                <button
                  type="button"
                  onClick={() => startEditing(booking)}
                  className="grid w-full grid-cols-[1.4fr_1fr_1.3fr_.9fr_.9fr] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-canvas"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold text-ink">{travelerName}</div>
                    <div className="truncate text-[12px] font-semibold text-muted-soft">→ {driverName} · {vehicleLabel}</div>
                  </div>
                  <div className="truncate text-[12.5px] font-semibold text-muted">
                    {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-semibold text-ink-soft">
                      Booked {booking.createdAt ? formatDateTime(booking.createdAt) : '—'}
                    </div>
                    <div className="truncate text-[11.5px] text-muted-soft">
                      {booking.status === 'cancelled'
                        ? `Cancelled ${booking.cancelledAt ? formatDateTime(booking.cancelledAt) : ''}${
                            calculateCancellationFee(booking).amount !== null
                              ? ` · owed ${formatCurrency(calculateCancellationFee(booking).amount)}`
                              : ''
                          }`
                        : `Conv. ${booking.conversationId ? booking.conversationId.slice(-6) : '—'} · Offer ${booking.offerId ? booking.offerId.slice(-6) : '—'}`}
                    </div>
                  </div>
                  <div className="text-[13.5px] font-extrabold text-brand-dark">{formatCurrency(booking.totalPrice || 0)}</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={tagClass(STATUS_TAGS[booking.status] || 'grey')}>{booking.status}</span>
                    <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-soft transition ${isEditing ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isEditing ? (
                  <form onSubmit={handleSubmit} className="space-y-3 border-t border-hairline bg-canvas/60 px-5 py-4">
                    {booking.status === 'cancelled' || booking.cancellationReason ? (
                      <div className="rounded-xl border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 p-3.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                          Cancellation
                          {booking.cancelledBy ? ` · by ${booking.cancelledBy}` : ''}
                          {booking.cancelledAt ? ` · ${formatDateTime(booking.cancelledAt)}` : ''}
                        </p>
                        <p className="mt-1.5 text-[13px] font-semibold text-ink">
                          {booking.cancellationReason || 'No reason recorded.'}
                        </p>
                        {(() => {
                          const fee = calculateCancellationFee(booking);
                          if (fee.amount === null) {
                            return <p className="mt-2 text-[12px] font-semibold text-muted-soft">{fee.label}</p>;
                          }
                          return (
                            <div className="mt-2.5 border-t border-rose-200 dark:border-rose-400/30 pt-2">
                              <p className="text-[11px] font-extrabold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                                Payable to driver
                              </p>
                              <p className="mt-0.5 text-[15px] font-extrabold text-ink">
                                {formatCurrency(fee.amount)}
                                <span className="ml-2 text-[12px] font-semibold text-muted">
                                  of {formatCurrency(booking.totalPrice || 0)} · {fee.label}
                                </span>
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-hairline bg-surface p-3.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
                          Traveller contact
                          <span className="ml-2 font-bold normal-case tracking-normal text-muted">
                            · booked {booking.createdAt ? formatDateTime(booking.createdAt) : 'date unknown'}
                          </span>
                        </p>
                        <p className="mt-1.5 text-[13.5px] font-bold text-ink">{travelerName}</p>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-[12.5px] text-muted"><Mail className="h-3.5 w-3.5 flex-shrink-0" /> {booking.traveler?.email || 'Not on file'}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted"><Phone className="h-3.5 w-3.5 flex-shrink-0" /> {booking.traveler?.phoneNumber || 'Not on file'}</p>
                      </div>
                      <div className="rounded-xl border border-hairline bg-surface p-3.5">
                        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Driver contact</p>
                        <p className="mt-1.5 text-[13.5px] font-bold text-ink">{driverName}</p>
                        <p className="mt-1 flex items-center gap-1.5 truncate text-[12.5px] text-muted"><Mail className="h-3.5 w-3.5 flex-shrink-0" /> {booking.driver?.email || 'Not on file'}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-muted"><Phone className="h-3.5 w-3.5 flex-shrink-0" /> {booking.driver?.contactNumber || 'Not on file'}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className={labelCls}>Status</label>
                        <select name="status" value={formState.status} onChange={handleFieldChange} className={inputCls}>
                          {BOOKING_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>Start date</label>
                        <input type="date" name="startDate" value={formState.startDate} onChange={handleFieldChange} className={inputCls} required />
                      </div>
                      <div>
                        <label className={labelCls}>End date</label>
                        <input type="date" name="endDate" value={formState.endDate} onChange={handleFieldChange} className={inputCls} required />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className={labelCls}>Price / day (USD)</label>
                        <input type="number" min="0" name="pricePerDay" value={formState.pricePerDay} onChange={handleFieldChange} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Total price (USD)</label>
                        <input type="number" min="0" name="totalPrice" value={formState.totalPrice} onChange={handleFieldChange} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Flight #</label>
                        <input type="text" name="flightNumber" value={formState.flightNumber} onChange={handleFieldChange} className={inputCls} />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className={labelCls}>Start point</label>
                        <input type="text" name="startPoint" value={formState.startPoint} onChange={handleFieldChange} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>End point</label>
                        <input type="text" name="endPoint" value={formState.endPoint} onChange={handleFieldChange} className={inputCls} />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <label className={labelCls}>Arrival time</label>
                        <input type="text" name="arrivalTime" value={formState.arrivalTime} onChange={handleFieldChange} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Departure time</label>
                        <input type="text" name="departureTime" value={formState.departureTime} onChange={handleFieldChange} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Payment note</label>
                        <input type="text" name="paymentNote" value={formState.paymentNote} onChange={handleFieldChange} className={inputCls} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Special requests</label>
                      <textarea name="specialRequests" rows={3} value={formState.specialRequests} onChange={handleFieldChange} className={inputCls} />
                    </div>
                    {formError ? <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{formError}</p> : null}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="submit" disabled={isUpdating} className="inline-flex items-center gap-2 rounded-lg bg-[#0f1f2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0f1f2d]/90 disabled:cursor-not-allowed disabled:opacity-70">
                        {isUpdating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : 'Save changes'}
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => { if (window.confirm('Delete this booking?')) onDelete?.(booking.id); }}
                        className="inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-400/30 px-4 py-2 text-sm font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" /> {isDeleting ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BookingsPanel;

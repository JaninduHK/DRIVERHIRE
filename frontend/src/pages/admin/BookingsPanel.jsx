import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, RotateCcw } from 'lucide-react';
import { formatCurrency, formatDate, formatDateTime, tagClass } from './adminFormatters.js';
import { calculateCancellationFee } from '../../lib/cancellationPolicy.js';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
];
const STATUS_TAGS = { pending: 'amber', confirmed: 'green', cancelled: 'grey', rejected: 'red' };

const BookingsPanel = ({ state, onReload, onView }) => {
  const { items: bookings, loading, error } = state;
  const [month, setMonth] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const visible = useMemo(() => {
    const byStatus = statusFilter === 'all' ? bookings : bookings.filter((booking) => booking.status === statusFilter);
    if (!month) return byStatus;
    return byStatus.filter((booking) => {
      const date = new Date(booking.createdAt);
      return !Number.isNaN(date.getTime()) && `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === month;
    });
  }, [bookings, month, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts = { all: bookings.length, pending: 0, confirmed: 0, cancelled: 0, rejected: 0 };
    bookings.forEach((booking) => { if (counts[booking.status] !== undefined) counts[booking.status] += 1; });
    return counts;
  }, [bookings]);

  const cancellationTotal = useMemo(
    () => visible.filter((booking) => booking.status === 'cancelled').reduce((sum, booking) => sum + (calculateCancellationFee(booking).amount || 0), 0),
    [visible]
  );
  const totals = useMemo(() => visible.reduce((result, booking) => {
    result[booking.status === 'confirmed' ? 'confirmed' : 'other'] += Number(booking.totalPrice) || 0;
    return result;
  }, { confirmed: 0, other: 0 }), [visible]);

  if (loading) return <div className="flex min-h-[240px] items-center justify-center rounded-[18px] bg-surface text-sm text-muted shadow-card">Loading bookings…</div>;
  if (error) return <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[18px] bg-surface text-center shadow-card"><p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p><button type="button" onClick={onReload} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink"><RotateCcw className="h-4 w-4" /> Try again</button></div>;

  return (
    <div className="overflow-hidden rounded-[18px] bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <div><b className="text-[15px] text-ink">Bookings <span className="font-semibold text-muted-soft">({visible.length})</span></b><p className="mt-1 text-[11.5px] text-muted-soft">Select a booking to view the complete trip and financial record.</p></div>
        <div className="flex items-center gap-2"><label className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Booked in</label><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-bold text-ink focus:outline-none" />{month ? <button type="button" onClick={() => setMonth('')} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-muted">Clear</button> : null}<button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-muted">Refresh</button></div>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-hairline px-5 py-3">{STATUS_FILTERS.map((option) => <button key={option.value} type="button" onClick={() => setStatusFilter(option.value)} className={tagClass(statusFilter === option.value ? STATUS_TAGS[option.value] || 'blue' : 'grey')}>{option.label} {statusCounts[option.value] || 0}</button>)}</div>
      {statusFilter === 'cancelled' && visible.length ? <div className="border-b border-hairline px-5 py-2.5 text-[12px] font-semibold text-muted">Owed to drivers under the cancellation policy <b className="text-ink">{formatCurrency(cancellationTotal)}</b></div> : null}
      {month && visible.length ? <div className="flex flex-wrap gap-5 border-b border-hairline px-5 py-2.5 text-[12px] font-semibold text-muted"><span>Confirmed <b className="text-ink">{formatCurrency(totals.confirmed)}</b></span>{totals.other ? <span>Not confirmed <b className="text-ink">{formatCurrency(totals.other)}</b></span> : null}</div> : null}
      {visible.length === 0 ? <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-sm text-muted"><CalendarDays className="h-9 w-9 text-muted-soft" /><p>No bookings found.</p></div> : (
        <div className="divide-y divide-hairline overflow-x-auto">{visible.map((booking) => {
          const fee = booking.status === 'cancelled' ? calculateCancellationFee(booking) : null;
          return <button key={booking.id} type="button" onClick={() => onView?.(booking.id)} className="grid min-w-[980px] w-full grid-cols-[minmax(0,1.35fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_.7fr_.65fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-canvas focus:bg-canvas focus:outline-none">
            <div className="min-w-0"><b className="block truncate text-[13.5px] text-ink">{booking.traveler?.fullName || 'Traveller'}</b><p className="mt-0.5 truncate text-[11.5px] text-muted-soft">{booking.traveler?.email || 'No email'}</p></div>
            <div className="min-w-0"><p className="truncate text-[12.5px] font-semibold text-muted">{booking.driver?.name || 'Unassigned driver'}</p><p className="truncate text-[11.5px] text-muted-soft">{booking.vehicle?.model || 'Vehicle unavailable'}</p></div>
            <div className="text-[12px] font-semibold text-muted">{formatDate(booking.startDate)} – {formatDate(booking.endDate)}<p className="mt-0.5 truncate text-[11px] font-normal text-muted-soft">{booking.startPoint || 'Start'} → {booking.endPoint || 'End'}</p></div>
            <div><b className="text-[13.5px] text-brand-dark">{formatCurrency(booking.totalPrice || 0)}</b>{fee?.amount != null ? <p className="text-[10.5px] text-muted-soft">Owed {formatCurrency(fee.amount)}</p> : null}</div>
            <span className={tagClass(STATUS_TAGS[booking.status] || 'grey')}>{booking.status}</span>
            <div className="flex items-center gap-3"><span className="text-right text-[10.5px] text-muted-soft">Booked<br />{formatDateTime(booking.createdAt)}</span><span className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted"><ArrowRight className="h-4 w-4" /></span></div>
          </button>;
        })}</div>
      )}
    </div>
  );
};

export default BookingsPanel;

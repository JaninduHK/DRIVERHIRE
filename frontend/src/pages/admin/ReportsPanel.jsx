import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { downloadCsv } from '../../lib/csv.js';
import { formatCurrency, formatDate, formatPercentValue, tagClass } from './adminFormatters.js';

const MONTH_FORMAT = { month: 'long', year: 'numeric' };

const STATUS_TAGS = { confirmed: 'green', pending: 'amber', cancelled: 'red', rejected: 'red' };
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
];

const num = (value) => (Number.isFinite(value) ? value : 0);

// A booking's payable is its discounted total; older bookings written before the
// discount feature have no payableTotal, so fall back to the gross price.
const payableOf = (booking) =>
  Number.isFinite(booking.payableTotal) && booking.payableTotal > 0
    ? booking.payableTotal
    : num(booking.totalPrice);

const ReportsPanel = ({ bookings }) => {
  const confirmed = useMemo(() => bookings.filter((b) => b.status === 'confirmed'), [bookings]);
  const [statusFilter, setStatusFilter] = useState('all');

  const settlement = useMemo(() => {
    const buckets = new Map();
    confirmed.forEach((booking) => {
      const date = new Date(booking.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!buckets.has(key)) {
        buckets.set(key, { key, label: date.toLocaleDateString(undefined, MONTH_FORMAT), sortKey: date.getFullYear() * 12 + date.getMonth(), bookings: 0, gbv: 0, commission: 0, payouts: 0 });
      }
      const bucket = buckets.get(key);
      bucket.bookings += 1;
      bucket.gbv += booking.totalPrice || 0;
      bucket.commission += booking.commissionAmount || 0;
      bucket.payouts += booking.driverEarnings || 0;
    });
    return Array.from(buckets.values()).sort((a, b) => b.sortKey - a.sortKey);
  }, [confirmed]);

  const thisMonth = settlement[0];

  const reportCards = [
    { label: `Gross booking value${thisMonth ? ` (${thisMonth.label})` : ''}`, value: formatCurrency(thisMonth?.gbv || 0) },
    { label: 'Platform commission', value: formatCurrency(thisMonth?.commission || 0) },
    { label: 'Driver payouts', value: formatCurrency(thisMonth?.payouts || 0) },
  ];

  const handleExport = () => {
    downloadCsv(
      'monthly-settlement',
      settlement.map((row) => ({ month: row.label, bookings: row.bookings, gbv: row.gbv.toFixed(2), commission: row.commission.toFixed(2), payouts: row.payouts.toFixed(2) }))
    );
  };

  const statusCounts = useMemo(() => {
    const counts = { all: bookings.length, confirmed: 0, pending: 0, cancelled: 0, rejected: 0 };
    bookings.forEach((booking) => {
      if (counts[booking.status] !== undefined) counts[booking.status] += 1;
    });
    return counts;
  }, [bookings]);

  const bookingRows = useMemo(() => {
    const rows = statusFilter === 'all' ? bookings : bookings.filter((b) => b.status === statusFilter);
    return [...rows].sort((a, b) => new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt));
  }, [bookings, statusFilter]);

  // Totals reflect the rows actually on screen, so they stay meaningful as the
  // status filter changes rather than silently reporting the whole table.
  const rowTotals = useMemo(
    () =>
      bookingRows.reduce(
        (acc, booking) => ({
          gross: acc.gross + num(booking.totalPrice),
          discount: acc.discount + num(booking.discountAmount),
          payable: acc.payable + payableOf(booking),
          commission: acc.commission + num(booking.commissionAmount),
        }),
        { gross: 0, discount: 0, payable: 0, commission: 0 }
      ),
    [bookingRows]
  );

  const handleBookingExport = () => {
    downloadCsv(
      'bookings-report',
      bookingRows.map((booking) => ({
        startDate: formatDate(booking.startDate),
        endDate: formatDate(booking.endDate),
        driver: booking.driver?.name || '',
        vehicle: booking.vehicle?.model || '',
        traveller: booking.traveler?.fullName || '',
        status: booking.status,
        originalPrice: num(booking.totalPrice).toFixed(2),
        discount: num(booking.discountAmount).toFixed(2),
        discountLabel: booking.commissionDiscountLabel || '',
        discountedPrice: payableOf(booking).toFixed(2),
        commissionRate: formatPercentValue(num(booking.commissionRate) * 100, 2),
        commission: num(booking.commissionAmount).toFixed(2),
        driverEarnings: num(booking.driverEarnings).toFixed(2),
      }))
    );
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-3">
        {reportCards.map((card) => (
          <div key={card.label} className="rounded-[18px] bg-surface p-5 shadow-card">
            <p className="text-[12.5px] font-bold text-muted">{card.label}</p>
            <p className="mt-2.5 text-[26px] font-extrabold tracking-tight text-ink">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[18px] bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <b className="text-[15px] text-ink">Monthly settlement</b>
          <button type="button" onClick={handleExport} disabled={!settlement.length} className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
        {settlement.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-soft">No confirmed bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-hairline bg-canvas/60 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
                  <th className="px-5 py-3">Month</th>
                  <th className="px-5 py-3">Bookings</th>
                  <th className="px-5 py-3">GBV</th>
                  <th className="px-5 py-3">Commission</th>
                  <th className="px-5 py-3">Payouts</th>
                </tr>
              </thead>
              <tbody>
                {settlement.map((row) => (
                  <tr key={row.key} className="border-b border-hairline text-[13.5px] font-bold text-ink last:border-b-0">
                    <td className="px-5 py-3">{row.label}</td>
                    <td className="px-5 py-3 font-semibold text-muted">{row.bookings}</td>
                    <td className="px-5 py-3">{formatCurrency(row.gbv)}</td>
                    <td className="px-5 py-3 text-brand-dark">{formatCurrency(row.commission)}</td>
                    <td className="px-5 py-3 font-semibold text-muted">{formatCurrency(row.payouts)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-[18px] bg-surface shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <b className="text-[15px] text-ink">
            Bookings <span className="font-semibold text-muted-soft">({bookingRows.length})</span>
          </b>
          <button
            type="button"
            onClick={handleBookingExport}
            disabled={!bookingRows.length}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
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

        {bookingRows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-soft">
            {bookings.length === 0 ? 'No bookings yet.' : 'No bookings match this filter.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <tr className="border-b border-hairline bg-canvas/60 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
                  <th className="px-5 py-3">Trip dates</th>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3 text-right">Original</th>
                  <th className="px-5 py-3 text-right">Discount</th>
                  <th className="px-5 py-3 text-right">Discounted</th>
                  <th className="px-5 py-3 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {bookingRows.map((booking) => {
                  const gross = num(booking.totalPrice);
                  const discount = num(booking.discountAmount);
                  const payable = payableOf(booking);
                  const rateLabel = Number.isFinite(booking.commissionRate)
                    ? formatPercentValue(booking.commissionRate * 100, 2)
                    : null;
                  return (
                    <tr key={booking.id} className="border-b border-hairline text-[13.5px] text-ink last:border-b-0">
                      <td className="px-5 py-3">
                        <div className="font-bold">{formatDate(booking.startDate)} – {formatDate(booking.endDate)}</div>
                        <span className={`mt-1 ${tagClass(STATUS_TAGS[booking.status] || 'grey')}`}>{booking.status}</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-bold">{booking.driver?.name || 'Unassigned'}</div>
                        <div className="text-[12px] font-semibold text-muted-soft">{booking.vehicle?.model || '—'}</div>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-muted">{formatCurrency(gross)}</td>
                      <td className="px-5 py-3 text-right">
                        {discount > 0 ? (
                          <>
                            <div className="font-bold text-[#e11d48]">-{formatCurrency(discount)}</div>
                            {booking.commissionDiscountLabel ? (
                              <div className="text-[11px] font-semibold text-muted-soft">{booking.commissionDiscountLabel}</div>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-muted-soft">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-extrabold">{formatCurrency(payable)}</td>
                      <td className="px-5 py-3 text-right">
                        <div className="font-bold text-brand-dark">{formatCurrency(num(booking.commissionAmount))}</div>
                        {rateLabel ? <div className="text-[11px] font-semibold text-muted-soft">{rateLabel}</div> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-hairline bg-canvas/60 text-[13.5px] font-extrabold text-ink">
                  <td className="px-5 py-3" colSpan={2}>Total ({bookingRows.length})</td>
                  <td className="px-5 py-3 text-right">{formatCurrency(rowTotals.gross)}</td>
                  <td className="px-5 py-3 text-right text-[#e11d48]">
                    {rowTotals.discount > 0 ? `-${formatCurrency(rowTotals.discount)}` : '—'}
                  </td>
                  <td className="px-5 py-3 text-right">{formatCurrency(rowTotals.payable)}</td>
                  <td className="px-5 py-3 text-right text-brand-dark">{formatCurrency(rowTotals.commission)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPanel;

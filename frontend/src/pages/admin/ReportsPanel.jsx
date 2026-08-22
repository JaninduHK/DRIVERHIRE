import { useMemo } from 'react';
import { Download } from 'lucide-react';
import { downloadCsv } from '../../lib/csv.js';
import { formatCurrency } from './adminFormatters.js';

const MONTH_FORMAT = { month: 'long', year: 'numeric' };

const ReportsPanel = ({ bookings }) => {
  const confirmed = useMemo(() => bookings.filter((b) => b.status === 'confirmed'), [bookings]);

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
    </div>
  );
};

export default ReportsPanel;

import { useMemo } from 'react';
import { Star } from 'lucide-react';
import { formatCurrency, formatPercentValue } from './adminFormatters.js';

const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '—';

const PerformancePanel = ({ bookings, briefs, drivers, reviews }) => {
  const funnel = useMemo(() => {
    const now = Date.now();
    const quoteRequests = briefs.length;
    const gotOffer = briefs.filter((b) => (b.offersCount || 0) > 0).length;
    const booked = bookings.length;
    const completed = bookings.filter((b) => b.status === 'confirmed' && new Date(b.endDate).getTime() < now).length;
    const steps = [
      { step: 'Quote requests', value: quoteRequests },
      { step: 'Received ≥1 offer', value: gotOffer },
      { step: 'Booked', value: booked },
      { step: 'Trip completed', value: completed },
    ];
    const max = steps[0]?.value || 1;
    return steps.map((s) => ({ ...s, w: `${max > 0 ? Math.max(4, Math.round((s.value / max) * 100)) : 0}%` }));
  }, [bookings, briefs]);

  const leaders = useMemo(() => {
    const approvedDrivers = drivers.filter((d) => d.driverStatus === 'approved');
    const ratingsByDriver = new Map();
    reviews
      .filter((r) => r.status === 'approved')
      .forEach((review) => {
        const driverId = review.vehicle?.driver?.id || review.driver?.id || review.driver;
        if (!driverId) return;
        const entry = ratingsByDriver.get(driverId) || { sum: 0, count: 0 };
        entry.sum += Number(review.rating) || 0;
        entry.count += 1;
        ratingsByDriver.set(driverId, entry);
      });

    const rows = approvedDrivers.map((driver) => {
      const driverBookings = bookings.filter((b) => b.driver?.id === driver.id && b.status === 'confirmed');
      const revenue = driverBookings.reduce((sum, b) => sum + (b.driverEarnings || 0), 0);
      const ratingEntry = ratingsByDriver.get(driver.id);
      const rating = ratingEntry && ratingEntry.count > 0 ? (ratingEntry.sum / ratingEntry.count).toFixed(1) : null;
      return { id: driver.id, name: driver.name, meta: driver.address || 'Location not shared', trips: driverBookings.length, revenue, rating };
    });

    return rows
      .filter((row) => row.trips > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8)
      .map((row, index) => ({ ...row, rank: String(index + 1).padStart(2, '0') }));
  }, [bookings, drivers, reviews]);

  const conversionRate = funnel[0]?.value ? formatPercentValue((funnel[3].value / funnel[0].value) * 100) : '0%';

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[18px] bg-surface p-5 shadow-card">
          <p className="text-[12.5px] font-bold text-muted">Quote → booking conversion</p>
          <p className="mt-2.5 text-[26px] font-extrabold tracking-tight text-ink">{conversionRate}</p>
          <p className="mt-1 text-[12px] font-semibold text-muted-soft">Quote requests that became a completed trip</p>
        </div>
        <div className="rounded-[18px] bg-surface p-5 shadow-card">
          <p className="text-[12.5px] font-bold text-muted">Active drivers on leaderboard</p>
          <p className="mt-2.5 text-[26px] font-extrabold tracking-tight text-ink">{leaders.length}</p>
          <p className="mt-1 text-[12px] font-semibold text-muted-soft">Approved drivers with at least one confirmed trip</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[18px] bg-surface p-5 shadow-card">
          <b className="text-[15.5px] text-ink">Quote → booking funnel</b>
          <div className="mt-4 flex flex-col gap-3">
            {funnel.map((stage) => (
              <div key={stage.step}>
                <div className="flex justify-between text-[13px] font-bold text-ink"><span>{stage.step}</span><span className="text-muted">{stage.value}</span></div>
                <div className="mt-1.5 h-[24px] overflow-hidden rounded-lg bg-canvas"><div className="h-full rounded-lg bg-gradient-to-r from-brand-dark to-brand-bright" style={{ width: stage.w }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] bg-surface shadow-card">
          <div className="border-b border-hairline px-5 py-4"><b className="text-[15.5px] text-ink">Driver leaderboard</b></div>
          {leaders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-soft">No confirmed trips yet.</p>
          ) : (
            leaders.map((leader) => (
              <div key={leader.id} className="flex items-center gap-3 border-b border-hairline px-5 py-3.5 last:border-b-0">
                <span className="w-6 text-[13px] font-extrabold text-muted-soft">{leader.rank}</span>
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-canvas text-[12px] font-extrabold text-muted">{initialsOf(leader.name)}</div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-ink">{leader.name}</div>
                  <div className="truncate text-[12px] font-semibold text-muted-soft">{leader.meta} · {leader.trips} trip{leader.trips === 1 ? '' : 's'}</div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-[13.5px] font-extrabold text-ink">{formatCurrency(leader.revenue)}</div>
                  {leader.rating ? (
                    <div className="inline-flex items-center gap-1 text-[11.5px] font-bold text-brand-dark"><Star className="h-3 w-3" fill="currentColor" /> {leader.rating}</div>
                  ) : (
                    <div className="text-[11.5px] font-semibold text-muted-soft">No ratings yet</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformancePanel;

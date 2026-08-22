import { useMemo } from 'react';
import { formatCurrency, tagClass } from './adminFormatters.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const routeLabel = (booking) => {
  if (booking.startPoint && booking.endPoint) return `${booking.startPoint} → ${booking.endPoint}`;
  return booking.vehicle?.model || 'Route unavailable';
};

const initialsOf = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '—';

const KpiCard = ({ label, value, unit, delta, up, note }) => (
  <div className="rounded-[18px] bg-surface p-[18px] shadow-card">
    <div className="flex items-start justify-between gap-2">
      <span className="text-[12.5px] font-bold text-muted">{label}</span>
      {delta ? <span className={tagClass(up ? 'green' : 'amber')}>{delta}</span> : null}
    </div>
    <div className="mt-3 flex items-end gap-2">
      <span className="text-[32px] font-extrabold leading-none tracking-tight text-ink">{value}</span>
      {unit ? <span className="pb-0.5 text-[12px] font-bold text-muted-soft">{unit}</span> : null}
    </div>
    <p className="mt-2.5 text-[12px] font-semibold text-muted-soft">{note}</p>
  </div>
);

const QueueCard = ({ title, count, rows, onNavigate, sectionId }) => (
  <div className="overflow-hidden rounded-[18px] bg-surface shadow-card">
    <div className="flex items-center justify-between border-b border-hairline px-5 py-3.5">
      <div className="flex items-center gap-2.5">
        <b className="text-[14.5px] text-ink">{title}</b>
        <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-extrabold text-white">{count}</span>
      </div>
      <button type="button" onClick={() => onNavigate(sectionId)} className="text-[12px] font-extrabold text-brand-dark hover:underline">View all</button>
    </div>
    {rows.length === 0 ? (
      <p className="px-5 py-6 text-center text-[12.5px] text-muted-soft">Nothing here right now.</p>
    ) : (
      rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3 border-b border-hairline px-5 py-3 last:border-b-0">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-canvas text-[12px] font-extrabold text-muted">{row.initials}</div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-bold text-ink">{row.title}</div>
            <div className="truncate text-[12px] font-semibold text-muted-soft">{row.meta}</div>
          </div>
        </div>
      ))
    )}
  </div>
);

const OverviewPanel = ({ bookings, briefs, drivers, vehicles, onNavigate }) => {
  const now = Date.now();

  const kpis = useMemo(() => {
    const newBookings = bookings.filter((b) => now - new Date(b.createdAt).getTime() <= DAY_MS);
    const openBriefs = briefs.filter((b) => b.status === 'open');
    const unanswered = openBriefs.filter((b) => (b.offersCount || 0) === 0);
    const pendingDrivers = drivers.filter((d) => d.driverStatus === 'pending');
    const pendingVehicles = vehicles.filter((v) => v.status === 'pending');
    const newBookingsValue = newBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    return [
      { label: 'New bookings', value: String(newBookings.length), unit: 'last 24h', delta: newBookings.length > 0 ? `+${newBookings.length}` : null, up: true, note: `${formatCurrency(newBookingsValue)} booking value` },
      { label: 'Quote requests', value: String(openBriefs.length), unit: 'open', delta: unanswered.length > 0 ? `${unanswered.length} unanswered` : null, up: false, note: 'Travellers waiting on driver offers' },
      { label: 'Driver signups', value: String(pendingDrivers.length), unit: 'to review', delta: null, up: false, note: 'Awaiting approval decision' },
      { label: 'Vehicles pending', value: String(pendingVehicles.length), unit: 'approvals', delta: null, up: false, note: 'Awaiting document review' },
    ];
  }, [bookings, briefs, drivers, vehicles, now]);

  const chart = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === 'confirmed');
    const weeks = Array.from({ length: 12 }, (_, i) => ({ label: `W${i + 1}`, value: 0, start: now - (12 - i) * 7 * DAY_MS, end: now - (11 - i) * 7 * DAY_MS }));
    confirmed.forEach((booking) => {
      const created = new Date(booking.createdAt).getTime();
      const bucket = weeks.find((w) => created >= w.start && created < w.end);
      if (bucket) bucket.value += booking.totalPrice || 0;
    });
    const max = Math.max(...weeks.map((w) => w.value), 1);
    return weeks.map((w) => ({ ...w, h: `${Math.max(6, Math.round((w.value / max) * 100))}%` }));
  }, [bookings, now]);

  const gbv = useMemo(() => {
    const nowDate = new Date();
    const thisMonth = nowDate.getMonth();
    const thisYear = nowDate.getFullYear();
    const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
    let currentTotal = 0;
    let lastTotal = 0;
    bookings.forEach((booking) => {
      const created = new Date(booking.createdAt);
      if (created.getFullYear() === thisYear && created.getMonth() === thisMonth) currentTotal += booking.totalPrice || 0;
      else if (created.getFullYear() === lastMonthDate.getFullYear() && created.getMonth() === lastMonthDate.getMonth()) lastTotal += booking.totalPrice || 0;
    });
    const delta = lastTotal > 0 ? Math.round(((currentTotal - lastTotal) / lastTotal) * 100) : null;
    const commission = bookings
      .filter((b) => { const c = new Date(b.createdAt); return c.getFullYear() === thisYear && c.getMonth() === thisMonth; })
      .reduce((sum, b) => sum + (b.commissionAmount || 0), 0);
    return { currentTotal, delta, commission, monthLabel: nowDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) };
  }, [bookings]);

  const topRoutes = useMemo(() => {
    const counts = new Map();
    bookings.forEach((booking) => {
      const label = routeLabel(booking);
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, count]) => ({ name, count, w: `${Math.max(8, Math.round((count / max) * 100))}%` }));
  }, [bookings]);

  const queues = useMemo(() => {
    const pendingBookings = bookings.filter((b) => b.status === 'pending').slice(0, 3).map((b) => ({
      key: b.id,
      initials: initialsOf(b.traveler?.fullName),
      title: b.traveler?.fullName || 'Traveller',
      meta: `${routeLabel(b)} · ${formatCurrency(b.totalPrice || 0)}`,
    }));
    const openBriefs = briefs.filter((b) => b.status === 'open').sort((a, b) => (a.offersCount || 0) - (b.offersCount || 0)).slice(0, 3).map((b) => ({
      key: b.id,
      initials: initialsOf(b.traveler?.name),
      title: b.traveler?.name || 'Traveller',
      meta: `${b.startLocation} → ${b.endLocation} · ${b.offersCount || 0} offer${b.offersCount === 1 ? '' : 's'}`,
    }));
    const pendingDrivers = drivers.filter((d) => d.driverStatus === 'pending').slice(0, 3).map((d) => ({
      key: d.id,
      initials: initialsOf(d.name),
      title: d.name,
      meta: d.address || 'Location not shared',
    }));
    const pendingVehicles = vehicles.filter((v) => v.status === 'pending').slice(0, 3).map((v) => ({
      key: v.id,
      initials: initialsOf(v.model),
      title: v.model,
      meta: `${v.driver?.name || 'Unknown driver'} · $${v.pricePerDay || 0}/day`,
    }));

    return [
      { title: 'New bookings', sectionId: 'bookings', count: bookings.filter((b) => b.status === 'pending').length, rows: pendingBookings },
      { title: 'Quote requests', sectionId: 'briefs', count: briefs.filter((b) => b.status === 'open').length, rows: openBriefs },
      { title: 'Driver signups', sectionId: 'drivers', count: drivers.filter((d) => d.driverStatus === 'pending').length, rows: pendingDrivers },
      { title: 'Vehicles pending approval', sectionId: 'vehicles', count: vehicles.filter((v) => v.status === 'pending').length, rows: pendingVehicles },
    ];
  }, [bookings, briefs, drivers, vehicles]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (<KpiCard key={kpi.label} {...kpi} />))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        <div className="rounded-[18px] bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <b className="text-[16px] text-ink">Bookings &amp; revenue</b>
              <p className="mt-0.5 text-[12.5px] font-semibold text-muted-soft">Last 12 weeks · confirmed trips</p>
            </div>
          </div>
          <div className="mt-5 flex h-[190px] items-end gap-2.5">
            {chart.map((week) => (
              <div key={week.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <div className="text-[10.5px] font-extrabold text-ink">{week.value > 0 ? formatCurrency(week.value) : ''}</div>
                <div className="w-full rounded-t-[8px] rounded-b-[3px] bg-gradient-to-t from-brand-dark to-brand-bright" style={{ height: week.h }} />
                <div className="text-[10px] font-bold text-muted-soft">{week.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-[18px] bg-gradient-to-br from-ink to-[#1c3345] p-5 text-white">
            <div className="text-[11.5px] font-extrabold tracking-[.09em] text-white/70">GROSS BOOKING VALUE</div>
            <div className="mt-2 text-[32px] font-extrabold tracking-tight">{formatCurrency(gbv.currentTotal)}</div>
            <div className="text-[12.5px] font-semibold text-white/75">{gbv.monthLabel} · commission {formatCurrency(gbv.commission)}</div>
            {gbv.delta !== null ? (
              <div className="mt-3 text-[12px] font-bold text-white/80">
                {gbv.delta >= 0 ? '▲' : '▼'} {Math.abs(gbv.delta)}% vs last month
              </div>
            ) : null}
          </div>
          <div className="rounded-[18px] bg-surface p-5 shadow-card">
            <b className="text-[15px] text-ink">Top routes</b>
            <div className="mt-3.5 flex flex-col gap-3">
              {topRoutes.length === 0 ? (
                <p className="text-[12.5px] text-muted-soft">No bookings yet.</p>
              ) : (
                topRoutes.map((route) => (
                  <div key={route.name}>
                    <div className="flex justify-between text-[13px] font-bold text-ink"><span className="truncate pr-2">{route.name}</span><span className="flex-shrink-0 text-muted">{route.count}</span></div>
                    <div className="mt-1.5 h-[7px] overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-brand" style={{ width: route.w }} /></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {queues.map((queue) => (<QueueCard key={queue.title} {...queue} onNavigate={onNavigate} />))}
      </div>
    </div>
  );
};

export default OverviewPanel;

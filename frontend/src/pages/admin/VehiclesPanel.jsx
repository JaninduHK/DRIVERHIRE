import { useMemo, useState } from 'react';
import { ArrowRight, Car, RotateCcw, Users } from 'lucide-react';
import { formatDateTime, tagClass } from './adminFormatters.js';

const STATUS_TAGS = { pending: 'amber', approved: 'green', rejected: 'red' };
const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const VehiclesPanel = ({ state, onRetry, onView }) => {
  const { items: vehicles, loading, error } = state;
  const [statusFilter, setStatusFilter] = useState('all');

  const statusCounts = useMemo(() => {
    const counts = { all: vehicles.length, pending: 0, approved: 0, rejected: 0 };
    vehicles.forEach((vehicle) => {
      if (counts[vehicle.status] !== undefined) counts[vehicle.status] += 1;
    });
    return counts;
  }, [vehicles]);

  const visibleVehicles = useMemo(
    () => (statusFilter === 'all' ? vehicles : vehicles.filter((vehicle) => vehicle.status === statusFilter)),
    [statusFilter, vehicles]
  );

  if (loading) {
    return <div className="flex min-h-[240px] items-center justify-center rounded-[18px] bg-surface text-sm text-muted shadow-card">Loading vehicles…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[18px] bg-surface text-center shadow-card">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
        <div>
          <b className="text-[15px] text-ink">All vehicles <span className="font-semibold text-muted-soft">({vehicles.length})</span></b>
          <p className="mt-1 text-[11.5px] text-muted-soft">Select a vehicle to view its complete record and activity.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((option) => (
            <button key={option.value} type="button" onClick={() => setStatusFilter(option.value)} className={tagClass(statusFilter === option.value ? (STATUS_TAGS[option.value] || 'blue') : 'grey')}>
              {option.label} {statusCounts[option.value] || 0}
            </button>
          ))}
        </div>
      </div>

      {visibleVehicles.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <Car className="h-9 w-9 text-muted-soft" />
          <p>No vehicles match this filter.</p>
        </div>
      ) : (
        <div className="divide-y divide-hairline overflow-x-auto">
          {visibleVehicles.map((vehicle) => {
            const thumbnail = vehicle.images?.[0];
            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => onView?.(vehicle.id)}
                className="grid min-w-[880px] w-full grid-cols-[52px_minmax(0,1.25fr)_minmax(0,1.2fr)_.65fr_.5fr_.8fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-canvas focus:bg-canvas focus:outline-none"
              >
                <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-xl bg-canvas">
                  {thumbnail ? <img src={thumbnail} alt="" className="h-full w-full object-cover" /> : <Car className="h-5 w-5 text-muted-soft" />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><b className="truncate text-[13.5px] text-ink">{vehicle.model}</b><span className={tagClass(STATUS_TAGS[vehicle.status] || 'amber')}>{vehicle.status}</span></div>
                  <p className="mt-0.5 text-[11.5px] font-semibold text-muted-soft">{vehicle.year}</p>
                </div>
                <div className="min-w-0"><p className="truncate text-[12.5px] font-semibold text-muted">{vehicle.driver?.name || 'Unknown driver'}</p><p className="truncate text-[11.5px] text-muted-soft">{vehicle.driver?.email || 'No email'}</p></div>
                <div className="text-[13px] font-extrabold text-brand-dark">${Number(vehicle.pricePerDay || 0).toLocaleString()}/day</div>
                <div className="inline-flex items-center gap-1 text-[12px] text-muted"><Users className="h-3.5 w-3.5" /> {vehicle.seats || '—'}</div>
                <div className="text-[11.5px] text-muted-soft"><span className="block font-bold text-muted">Submitted</span>{formatDateTime(vehicle.createdAt)}</div>
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted"><ArrowRight className="h-4 w-4" /></span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VehiclesPanel;

import { useEffect, useState } from 'react';
import { ArrowRight, CircleUserRound, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchSettings as fetchAdminSettings, updateSettings as updateAdminSettings } from '../../services/adminApi.js';
import { formatDateTime, tagClass } from './adminFormatters.js';

const STATUS_TAGS = { pending: 'amber', approved: 'green', rejected: 'red' };

export const DriverApprovalSetting = () => {
  const [autoApproval, setAutoApproval] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAdminSettings()
      .then((data) => { if (!cancelled) setAutoApproval(Boolean(data?.settings?.driverAutoApproval)); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSet = async (value) => {
    if (value === autoApproval || saving) return;
    const previous = autoApproval;
    setSaving(true);
    setAutoApproval(value);
    try {
      const response = await updateAdminSettings({ driverAutoApproval: value });
      setAutoApproval(Boolean(response?.settings?.driverAutoApproval));
      toast.success(response?.message || 'Setting updated.');
    } catch (error) {
      setAutoApproval(previous);
      toast.error(error.message || 'Unable to update setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-surface p-5 shadow-card">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Driver approval</p>
        <b className="text-[15px] text-ink">New driver applications</b>
        <p className="mt-1 max-w-xl text-[12.5px] text-muted">
          {autoApproval
            ? 'New drivers are approved automatically and can start once they verify their email.'
            : 'New drivers stay pending until you approve them here.'}
        </p>
      </div>
      <div className="inline-flex rounded-xl bg-canvas p-1">
        {[{ value: false, label: 'Manual' }, { value: true, label: 'Automatic' }].map((option) => {
          const active = autoApproval === option.value;
          return (
            <button
              key={option.label}
              type="button"
              disabled={loading || saving}
              onClick={() => handleSet(option.value)}
              className={`min-w-[92px] rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'bg-surface text-ink shadow-sm' : 'text-muted-soft hover:text-muted'}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DriversPanel = ({ state, onRetry, onView }) => {
  const { items: drivers, loading, error } = state;

  if (loading) {
    return <div className="flex min-h-[240px] items-center justify-center rounded-[18px] bg-surface text-sm text-muted shadow-card">Loading drivers…</div>;
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
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-5 py-4">
        <b className="text-[15px] text-ink">All drivers <span className="font-semibold text-muted-soft">({drivers.length})</span></b>
        <span className="text-[11.5px] font-semibold text-muted-soft">Select a driver to view the complete record</span>
      </div>

      {drivers.length === 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <CircleUserRound className="h-9 w-9 text-muted-soft" />
          <p>No matching drivers found.</p>
        </div>
      ) : (
        <div className="divide-y divide-hairline">
          {drivers.map((driver) => (
            <button
              key={driver.id}
              type="button"
              onClick={() => onView?.(driver.id)}
              className="grid w-full grid-cols-[minmax(0,1.35fr)_minmax(0,1.35fr)_minmax(0,1fr)_minmax(120px,.7fr)_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-canvas focus:bg-canvas focus:outline-none"
            >
              <div className="flex min-w-0 items-center gap-3">
                {driver.profilePhoto ? (
                  <img src={driver.profilePhoto} alt="" className="h-10 w-10 flex-shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-canvas text-sm font-extrabold text-muted">
                    {(driver.name || 'D').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate text-[13.5px] text-ink">{driver.name}</b>
                    <span className={tagClass(STATUS_TAGS[driver.driverStatus] || 'amber')}>{driver.driverStatus || 'pending'}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11.5px] text-muted-soft">{driver.contactNumber || 'No contact number'}</p>
                </div>
              </div>
              <div className="truncate text-[12.5px] font-semibold text-muted-soft">{driver.email}</div>
              <div className="truncate text-[12.5px] text-muted-soft">{driver.address || 'Location not provided'}</div>
              <div className="text-[11.5px] text-muted-soft">
                <span className="block font-bold text-muted">Joined</span>
                {formatDateTime(driver.memberSince || driver.createdAt)}
              </div>
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted">
                <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DriversPanel;

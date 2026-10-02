import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, FileText, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatDate, formatDateTime, tagClass } from './adminFormatters.js';
import { fetchSettings as fetchAdminSettings, updateSettings as updateAdminSettings } from '../../services/adminApi.js';

const BRIEF_STATUS_TAGS = { open: 'green', booked: 'blue', closed: 'grey' };
const STATUS_FILTERS = ['all', 'open', 'booked', 'closed'];

// Controls whether the public quote form offers the driver-type choice at all.
export const BriefDriverTypeSetting = () => {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAdminSettings()
      .then((data) => { if (!cancelled) setEnabled(data?.settings?.briefDriverTypeSelection !== false); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleSet = async (value) => {
    if (value === enabled || saving) return;
    const previous = enabled;
    setSaving(true);
    setEnabled(value);
    try {
      const response = await updateAdminSettings({ briefDriverTypeSelection: value });
      setEnabled(response?.settings?.briefDriverTypeSelection !== false);
      toast.success(value ? 'Travellers can choose a driver type.' : 'Driver type choice hidden from the form.');
    } catch (error) {
      setEnabled(previous);
      toast.error(error.message || 'Unable to update setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-surface p-5 shadow-card">
      <div>
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Quote form</p>
        <b className="text-[15px] text-ink">Driver type selection</b>
        <p className="mt-1 max-w-xl text-[12.5px] text-muted">
          {enabled
            ? 'Travellers can restrict a request to Tourist Drivers or Chauffeur Guides. Only drivers with that approved licence can then quote.'
            : 'The choice is hidden from the quote form, so every new request goes to all drivers. Existing restrictions remain unchanged.'}
        </p>
      </div>
      <div className="inline-flex rounded-xl bg-canvas p-1">
        {[{ value: true, label: 'Shown' }, { value: false, label: 'Hidden' }].map((option) => (
          <button key={option.label} type="button" disabled={loading || saving} onClick={() => handleSet(option.value)} className={`min-w-[92px] rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${enabled === option.value ? 'bg-surface text-ink shadow-sm' : 'text-muted-soft hover:text-muted'}`}>{option.label}</button>
        ))}
      </div>
    </div>
  );
};

const BriefsPanel = ({ state, onReload, onView }) => {
  const { items: briefs, loading, error } = state;
  const [statusFilter, setStatusFilter] = useState('all');
  const visible = useMemo(() => statusFilter === 'all' ? briefs : briefs.filter((brief) => brief.status === statusFilter), [briefs, statusFilter]);
  const counts = useMemo(() => briefs.reduce((result, brief) => ({ ...result, [brief.status]: (result[brief.status] || 0) + 1 }), { all: briefs.length, open: 0, booked: 0, closed: 0 }), [briefs]);

  if (loading) return <div className="flex min-h-[240px] items-center justify-center rounded-[18px] bg-surface text-sm text-muted shadow-card">Loading briefs…</div>;
  if (error) return <div className="flex min-h-[240px] flex-col items-center justify-center gap-4 rounded-[18px] bg-surface text-center shadow-card"><p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p><button type="button" onClick={onReload} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink"><RotateCcw className="h-4 w-4" /> Try again</button></div>;

  return (
    <div className="overflow-hidden rounded-[18px] bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4"><div><b className="text-[15px] text-ink">Tour briefs <span className="font-semibold text-muted-soft">({visible.length})</span></b><p className="mt-1 text-[11.5px] text-muted-soft">Select a brief to view the traveller request, every quote, linked conversation, and booking.</p></div><button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted hover:border-brand hover:text-brand-dark">Refresh</button></div>
      <div className="flex flex-wrap gap-2 border-b border-hairline px-5 py-3">{STATUS_FILTERS.map((status) => <button key={status} type="button" onClick={() => setStatusFilter(status)} className={tagClass(statusFilter === status ? (BRIEF_STATUS_TAGS[status] || 'blue') : 'grey')}><span className="capitalize">{status}</span> {counts[status]}</button>)}</div>
      {visible.length === 0 ? <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center text-sm text-muted"><FileText className="h-9 w-9 text-muted-soft" /><p>No briefs found.</p></div> : (
        <div className="divide-y divide-hairline overflow-x-auto">{visible.map((brief) => {
          const prices = (brief.responses || []).map((response) => Number(response.totalPrice)).filter((price) => Number.isFinite(price) && price > 0);
          const offerRange = prices.length ? (prices.length === 1 ? formatCurrency(prices[0]) : `${formatCurrency(Math.min(...prices))} – ${formatCurrency(Math.max(...prices))}`) : 'No quotes';
          return <button key={brief.id} type="button" onClick={() => onView?.(brief.id)} className="grid min-w-[980px] w-full grid-cols-[minmax(0,1.2fr)_minmax(0,1.3fr)_minmax(0,1fr)_.75fr_.65fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-canvas focus:bg-canvas focus:outline-none">
            <div className="min-w-0"><b className="block truncate text-[13.5px] text-ink">{brief.traveler?.name || 'Traveller'}</b><p className="mt-0.5 truncate text-[11.5px] text-muted-soft">{brief.traveler?.email || 'No email'} · {brief.country || 'Country not set'}</p></div>
            <div className="min-w-0"><p className="truncate text-[12.5px] font-semibold text-muted">{brief.startLocation || 'Start'} → {brief.endLocation || 'End'}</p><p className="truncate text-[11px] text-muted-soft">{brief.message || 'No message'}</p></div>
            <div className="text-[12px] font-semibold text-muted">{formatDate(brief.startDate)} – {formatDate(brief.endDate)}<p className="mt-0.5 text-[11px] font-normal text-muted-soft">{brief.adults || 0} adults · {brief.children || 0} children</p></div>
            <div><b className="text-[12.5px] text-ink">{brief.offersCount || 0} quote{brief.offersCount === 1 ? '' : 's'}</b><p className="mt-0.5 text-[10.5px] text-muted-soft">{offerRange}</p></div>
            <span className={tagClass(BRIEF_STATUS_TAGS[brief.status] || 'grey')}>{brief.status}</span>
            <div className="flex items-center gap-3"><span className="text-right text-[10.5px] text-muted-soft">Posted<br />{formatDateTime(brief.createdAt)}</span><span className="grid h-9 w-9 place-items-center rounded-xl border border-line text-muted"><ArrowRight className="h-4 w-4" /></span></div>
          </button>;
        })}</div>
      )}
    </div>
  );
};

export default BriefsPanel;

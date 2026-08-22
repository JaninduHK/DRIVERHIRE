import { useState } from 'react';
import { ChevronDown, FileText, Loader2, RotateCcw, XCircle } from 'lucide-react';
import { formatDate, formatDateInput, tagClass } from './adminFormatters.js';

const BRIEF_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

const buildAdminBriefForm = (brief = {}) => ({
  status: brief.status || 'open',
  startDate: formatDateInput(brief.startDate),
  endDate: formatDateInput(brief.endDate),
  startLocation: brief.startLocation || '',
  endLocation: brief.endLocation || '',
  message: brief.message || '',
  country: brief.country || '',
});

const inputCls =
  'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';

const BriefsPanel = ({ state, onReload, onUpdate, onDelete }) => {
  const { items: filtered, loading, error, updatingId, deletingId } = state;
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(() => buildAdminBriefForm());
  const [formError, setFormError] = useState('');

  const startEditing = (brief) => {
    if (editingId === brief.id) {
      setEditingId(null);
      setFormState(buildAdminBriefForm());
      setFormError('');
      return;
    }
    setEditingId(brief.id);
    setFormState(buildAdminBriefForm(brief));
    setFormError('');
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingId) return;
    if (!formState.message.trim()) {
      setFormError('Message is required.');
      return;
    }
    const payload = {
      status: formState.status,
      startDate: formState.startDate,
      endDate: formState.endDate,
      startLocation: formState.startLocation,
      endLocation: formState.endLocation,
      message: formState.message,
      country: formState.country,
    };
    try {
      await onUpdate?.(editingId, payload);
      setEditingId(null);
      setFormState(buildAdminBriefForm());
      setFormError('');
    } catch (submitError) {
      setFormError(submitError?.message || 'Unable to update brief.');
    }
  };

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading briefs…</div>;
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
        <b className="text-[15px] text-ink">Tour briefs <span className="font-semibold text-muted-soft">({filtered.length})</span></b>
        <button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted transition hover:border-brand hover:text-brand-dark">Refresh</button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <FileText className="h-9 w-9 text-muted-soft" />
          <p>No briefs posted yet.</p>
        </div>
      ) : (
        filtered.map((brief) => {
          const isEditing = editingId === brief.id;
          const isUpdating = updatingId === brief.id;
          const isDeleting = deletingId === brief.id;
          const travelerName = brief.traveler?.name || 'Traveller';

          return (
            <div key={brief.id} className="border-b border-hairline last:border-b-0">
              <button type="button" onClick={() => startEditing(brief)} className="grid w-full grid-cols-[1.1fr_1.4fr_.9fr_.7fr_.7fr] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-canvas">
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-bold text-ink">{travelerName}</div>
                  <div className="truncate text-[12px] font-semibold text-muted-soft">{brief.country}</div>
                </div>
                <div className="truncate text-[12.5px] font-semibold text-muted">{brief.startLocation} → {brief.endLocation}</div>
                <div className="text-[12px] text-muted-soft">{formatDate(brief.startDate)} – {formatDate(brief.endDate)}</div>
                <div className="text-[12.5px] font-bold text-ink">{brief.offersCount} offer{brief.offersCount === 1 ? '' : 's'}</div>
                <div className="flex items-center justify-between gap-2">
                  <span className={tagClass(brief.status === 'open' ? 'green' : 'grey')}>{brief.status}</span>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-soft transition ${isEditing ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="space-y-3 border-t border-hairline bg-canvas/60 px-5 py-4">
                  <p className="text-[12px] text-muted-soft">Traveller email: {brief.traveler?.email || '—'} · {brief.responses?.length || 0} response(s)</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelCls}>Status</label>
                      <select name="status" value={formState.status} onChange={handleFieldChange} className={inputCls}>
                        {BRIEF_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Start date</label>
                      <input type="date" name="startDate" value={formState.startDate} onChange={handleFieldChange} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>End date</label>
                      <input type="date" name="endDate" value={formState.endDate} onChange={handleFieldChange} className={inputCls} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelCls}>Start location</label>
                      <input type="text" name="startLocation" value={formState.startLocation} onChange={handleFieldChange} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>End location</label>
                      <input type="text" name="endLocation" value={formState.endLocation} onChange={handleFieldChange} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Traveller message</label>
                    <textarea name="message" rows={3} value={formState.message} onChange={handleFieldChange} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Country</label>
                    <input type="text" name="country" value={formState.country} onChange={handleFieldChange} className={inputCls} />
                  </div>
                  {formError ? <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{formError}</p> : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="submit" disabled={isUpdating} className="inline-flex items-center gap-2 rounded-lg bg-[#0f1f2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0f1f2d]/90 disabled:cursor-not-allowed disabled:opacity-70">
                      {isUpdating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => { if (window.confirm('Delete this brief?')) onDelete?.(brief.id); }}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-400/30 px-4 py-2 text-sm font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" /> {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
};

export default BriefsPanel;

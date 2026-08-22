import { useState } from 'react';
import { Loader2, Percent, Plus, RotateCcw, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminModal from './AdminModal.jsx';
import { formatDate, formatDateInput, formatPercentValue, tagClass } from './adminFormatters.js';

const STATUS_TAGS = { active: 'green', scheduled: 'blue', expired: 'grey', disabled: 'grey' };

const buildAdminDiscountForm = (discount = {}) => ({
  id: discount.id || '',
  name: discount.name || '',
  description: discount.description || '',
  discountPercent: typeof discount.discountPercent === 'number' ? String(discount.discountPercent) : '',
  startDate: formatDateInput(discount.startDate),
  endDate: formatDateInput(discount.endDate),
  active: discount.active ?? true,
});

const inputCls =
  'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';

const DiscountsPanel = ({ state, onReload, onCreate, onUpdate, onDelete }) => {
  const { items: filtered, loading, error, saving, updatingId, deletingId } = state;
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState(() => buildAdminDiscountForm());
  const [editingId, setEditingId] = useState('');
  const [formError, setFormError] = useState('');

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const resetForm = () => {
    setFormState(buildAdminDiscountForm());
    setEditingId('');
    setFormError('');
  };

  const handleAddNew = () => {
    resetForm();
    setFormOpen(true);
  };

  const handleEdit = (discount) => {
    setEditingId(discount.id);
    setFormState(buildAdminDiscountForm(discount));
    setFormError('');
    setFormOpen(true);
  };

  const closeModal = () => {
    setFormOpen(false);
    resetForm();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      setFormError('Provide a discount name.');
      return;
    }
    if (!formState.startDate || !formState.endDate) {
      setFormError('Select a start and end date.');
      return;
    }
    const percentValue = Number(formState.discountPercent);
    if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 8) {
      setFormError('Discount must be between 0% and 8%.');
      return;
    }
    const payload = {
      name: formState.name.trim(),
      description: formState.description?.trim() || undefined,
      discountPercent: percentValue,
      startDate: formState.startDate,
      endDate: formState.endDate,
      active: formState.active,
    };
    try {
      if (editingId) {
        await onUpdate?.(editingId, payload);
      } else {
        await onCreate?.(payload);
      }
      closeModal();
    } catch (submitError) {
      setFormError(submitError?.message || 'Unable to save discount.');
    }
  };

  const handleToggleActive = async (discount) => {
    try {
      await onUpdate?.(discount.id, { active: !discount.active });
    } catch (toggleError) {
      toast.error(toggleError?.message || 'Unable to update discount status.');
    }
  };

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading discounts…</div>;
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
    <div className="flex flex-col gap-5">
      <div className="rounded-[18px] bg-surface shadow-card">
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-5 py-4">
          <b className="text-[15px] text-ink">Commission discounts <span className="font-semibold text-muted-soft">({filtered.length})</span></b>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted transition hover:border-brand hover:text-brand-dark">Refresh</button>
            <button type="button" onClick={handleAddNew} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-xs font-extrabold text-white transition hover:bg-brand-dark">
              <Plus className="h-3.5 w-3.5" /> Add new discount
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
            <Percent className="h-9 w-9 text-muted-soft" />
            <p>No discounts configured yet.</p>
          </div>
        ) : (
          filtered.map((discount) => {
            const percentLabel = formatPercentValue(typeof discount.discountPercent === 'number' ? discount.discountPercent : (discount.discountRate ?? 0) * 100);
            const isUpdating = updatingId === discount.id;
            const isDeleting = deletingId === discount.id;
            return (
              <div key={discount.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5 last:border-b-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="text-[13.5px] text-ink">{discount.name}</b>
                    <span className={tagClass(STATUS_TAGS[discount.status] || 'grey')}>{discount.status || (discount.active ? 'active' : 'disabled')}</span>
                  </div>
                  <p className="text-[12px] text-muted-soft">{formatDate(discount.startDate)} – {formatDate(discount.endDate)} · <span className="font-bold text-brand-dark">{percentLabel} off</span></p>
                  {discount.description ? <p className="mt-1 text-[12.5px] text-muted">{discount.description}</p> : null}
                </div>
                <div className="flex flex-shrink-0 flex-wrap gap-2">
                  <button type="button" onClick={() => handleEdit(discount)} className="rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink transition hover:border-muted-soft">Edit</button>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleToggleActive(discount)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      discount.active ? 'border-amber-200 dark:border-amber-400/30 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-400/10' : 'border-emerald-200 dark:border-emerald-400/30 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-400/10'
                    }`}
                  >
                    {isUpdating ? 'Updating…' : discount.active ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={async () => { if (window.confirm('Delete this discount?')) { try { await onDelete?.(discount.id); } catch { /* toast handled upstream */ } } }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-400/30 px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <XCircle className="h-3.5 w-3.5" /> {isDeleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AdminModal
        open={formOpen}
        onClose={closeModal}
        title={editingId ? 'Edit discount' : 'Create new discount'}
        subtitle="Automatically reduce the platform commission for bookings within a window."
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>Name</label>
              <input type="text" name="name" value={formState.name} onChange={handleFieldChange} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Discount (%)</label>
              <input type="number" name="discountPercent" min="0" max="8" step="0.1" value={formState.discountPercent} onChange={handleFieldChange} className={inputCls} required />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelCls}>Start date</label>
              <input type="date" name="startDate" value={formState.startDate} onChange={handleFieldChange} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>End date</label>
              <input type="date" name="endDate" value={formState.endDate} onChange={handleFieldChange} className={inputCls} required />
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea name="description" rows={2} value={formState.description} onChange={handleFieldChange} className={inputCls} placeholder="Optional note shown to admins" />
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-muted">
            <input type="checkbox" name="active" checked={formState.active} onChange={handleFieldChange} className="h-4 w-4 rounded border-line text-brand focus:ring-brand" />
            Active
          </label>
          {formError ? <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{formError}</p> : null}
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-[#0f1f2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0f1f2d]/90 disabled:cursor-not-allowed disabled:opacity-70">
            {saving ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : editingId ? 'Update discount' : 'Create discount'}
          </button>
        </form>
      </AdminModal>
    </div>
  );
};

export default DiscountsPanel;

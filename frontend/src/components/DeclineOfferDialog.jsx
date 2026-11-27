import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';

// Same keys as DECLINE_REASONS in backend/controllers/chatController.js.
const REASONS = ['price', 'dates', 'vehicle', 'other_driver'];

/**
 * Confirms declining an offer, with an optional reason and message for the
 * driver. `onConfirm({ reason, note })` returns a promise; the dialog stays
 * open (and shows the error toast from the caller) if it fails.
 */
export const DeclineOfferDialog = ({ onConfirm, onClose }) => {
  const { t } = useI18n();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async () => {
    setBusy(true);
    try {
      await onConfirm({ reason, note: note.trim() });
      onClose();
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/45 sm:items-center sm:p-6" onClick={() => !busy && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('dash.offer.declineDialog.title')}
        className="w-full max-w-[440px] rounded-t-[22px] bg-white p-5 shadow-drawer sm:rounded-[22px] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="m-0 text-[17px] font-extrabold text-ink">{t('dash.offer.declineDialog.title')}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label={t('dash.offer.declineDialog.cancel')} className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-canvas text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{t('dash.offer.declineDialog.body')}</p>

        <div className="mt-4 text-[12px] font-extrabold text-ink-soft">{t('dash.offer.declineDialog.reasonLabel')}</div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {REASONS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setReason((current) => (current === key ? '' : key))}
              aria-pressed={reason === key}
              className={`rounded-full border-[1.5px] px-3 py-1.5 text-[12.5px] font-bold transition ${
                reason === key ? 'border-brand bg-brand-tint text-brand-dark' : 'border-[#e2e8ea] bg-white text-ink-soft hover:border-muted-soft'
              }`}
            >
              {t(`dash.offer.declineDialog.reasons.${key}`)}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-[12px] font-extrabold text-ink-soft" htmlFor="decline-note">
          {t('dash.offer.declineDialog.noteLabel')}
        </label>
        <textarea
          id="decline-note"
          rows={3}
          maxLength={500}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('dash.offer.declineDialog.notePlaceholder')}
          className="mt-1.5 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-[13.5px] text-ink placeholder:text-muted-soft focus:border-brand focus:outline-none"
        />

        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="flex-1 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white py-[11px] text-[13.5px] font-bold text-ink disabled:opacity-60">
            {t('dash.offer.declineDialog.cancel')}
          </button>
          <button type="button" onClick={submit} disabled={busy} className="flex-1 rounded-[11px] bg-[#e11d48] py-[11px] text-[13.5px] font-bold text-white transition hover:bg-[#be123c] disabled:opacity-60">
            {busy ? t('dash.offer.declineDialog.declining') : t('dash.offer.declineDialog.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeclineOfferDialog;

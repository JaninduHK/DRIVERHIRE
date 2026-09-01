import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { deleteOwnAccount } from '../services/profileApi.js';
import { clearStoredToken } from '../services/authToken.js';

const CONFIRM_WORD = 'DELETE';

/**
 * Self-serve account erasure. Personal details are removed, but past bookings and
 * their financial records are kept in anonymised form — the copy says so plainly,
 * because "delete my account" and "erase my booking history" are different asks and
 * travellers should not be surprised afterwards.
 *
 * `requiresPassword` is driven by authProvider: SSO travellers have no password to
 * re-enter, so possession of the signed-in session is the confirmation.
 */
const DeleteAccountCard = ({ requiresPassword = false }) => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setOpen(false);
    setPassword('');
    setConfirmText('');
    setError('');
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    setError('');

    if (confirmText.trim().toUpperCase() !== CONFIRM_WORD) {
      setError(`Type ${CONFIRM_WORD} to confirm.`);
      return;
    }
    if (requiresPassword && !password) {
      setError('Enter your password to confirm.');
      return;
    }

    setSubmitting(true);
    try {
      await deleteOwnAccount(requiresPassword ? password : undefined);
      toast.success('Your account has been deleted.');
      clearStoredToken({ silent: true });
      window.location.assign('/');
    } catch (err) {
      setError(err?.message || 'Unable to delete your account right now.');
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4 rounded-[18px] border-[1.5px] border-[#f6d5dc] bg-white p-6 shadow-card">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#e11d48]" />
        <div className="min-w-0">
          <b className="text-[16px] text-ink">Delete account</b>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            This permanently removes your name, email, phone number and other personal details.
            It cannot be undone.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-muted-soft">
            Your past bookings are kept as anonymous records, because we are required to retain
            payment and tax history. They will no longer be linked to you.
          </p>
        </div>
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex items-center gap-2 rounded-[12px] border-[1.5px] border-[#f6d5dc] bg-white px-4 py-2.5 text-[13.5px] font-bold text-[#e11d48] transition hover:bg-[#fff5f7]"
        >
          <Trash2 className="h-4 w-4" /> Delete my account
        </button>
      ) : (
        <form onSubmit={handleDelete} className="mt-4 rounded-[14px] bg-[#fff5f7] p-4">
          {requiresPassword ? (
            <div className="mb-3">
              <label htmlFor="delete-account-password" className="text-[12.5px] font-bold text-ink-soft">
                Your password
              </label>
              <input
                id="delete-account-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                className="mt-1 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm text-ink focus:border-[#e11d48] focus:outline-none"
              />
            </div>
          ) : null}

          <label htmlFor="delete-account-confirm" className="text-[12.5px] font-bold text-ink-soft">
            Type <span className="font-extrabold text-[#e11d48]">{CONFIRM_WORD}</span> to confirm
          </label>
          <input
            id="delete-account-confirm"
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            className="mt-1 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm text-ink focus:border-[#e11d48] focus:outline-none"
          />

          {error ? <p className="mt-2 text-[12.5px] font-semibold text-[#e11d48]">{error}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-[12px] bg-[#e11d48] px-4 py-2.5 text-[13.5px] font-bold text-white transition hover:bg-[#be123c] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>) : 'Permanently delete'}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={submitting}
              className="rounded-[12px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-2.5 text-[13.5px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default DeleteAccountCard;

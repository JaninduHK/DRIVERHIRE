import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { formatDate, tagClass } from './adminFormatters.js';
import AdminModal from './AdminModal.jsx';

const UsersPanel = ({ state, onReload, onPreviewDeletion, onDelete }) => {
  const { items: filtered, loading, error, deletingId } = state;
  const [target, setTarget] = useState(null);
  const [preview, setPreview] = useState({ loading: false, data: null, error: '' });

  const openDeleteModal = async (user) => {
    setTarget(user);
    setPreview({ loading: true, data: null, error: '' });
    try {
      const data = await onPreviewDeletion(user.id);
      setPreview({ loading: false, data, error: '' });
    } catch (err) {
      setPreview({ loading: false, data: null, error: err?.message || 'Unable to check this account.' });
    }
  };

  const closeDeleteModal = () => {
    setTarget(null);
    setPreview({ loading: false, data: null, error: '' });
  };

  const confirmDelete = async () => {
    if (!target) return;
    try {
      await onDelete(target.id);
      closeDeleteModal();
    } catch {
      // toast is raised by the caller; keep the modal open so admin can retry
    }
  };

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading users…</div>;
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
        <b className="text-[15px] text-ink">Travellers <span className="font-semibold text-muted-soft">({filtered.length})</span></b>
        <button type="button" onClick={onReload} className="rounded-lg border border-line px-3 py-1.5 text-xs font-extrabold uppercase tracking-wide text-muted transition hover:border-brand hover:text-brand-dark">Refresh</button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[160px] items-center justify-center text-sm text-muted">No users found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-hairline bg-canvas/60 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Auth</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-center">Bookings</th>
                <th className="px-5 py-3 text-center">Briefs</th>
                <th className="px-5 py-3">Registered</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-hairline text-[13px] last:border-b-0 hover:bg-canvas/60">
                  <td className="px-5 py-3 font-bold text-ink">{user.name}</td>
                  <td className="px-5 py-3">
                    <a href={`mailto:${user.email}`} className="font-semibold text-brand-dark hover:underline">{user.email}</a>
                  </td>
                  <td className="px-5 py-3">
                    <span className={tagClass(user.authProvider === 'local' ? 'grey' : 'blue')}>{user.authProvider}</span>
                  </td>
                  <td className="px-5 py-3">
                    {user.isVerified ? (
                      <span className={`${tagClass('green')} gap-1`}><CheckCircle2 className="h-3 w-3" /> Verified</span>
                    ) : (
                      <span className={tagClass('amber')}>Unverified</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-center font-bold text-ink">{user.bookingsCount}</td>
                  <td className="px-5 py-3 text-center font-bold text-ink">{user.briefsCount}</td>
                  <td className="px-5 py-3 text-muted">{formatDate(user.registeredAt)}</td>
                  <td className="px-5 py-3 text-right">
                    {user.deletedAt ? (
                      <span className={tagClass('grey')}>Deleted</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openDeleteModal(user)}
                        disabled={deletingId === user.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-400/30 px-2.5 py-1.5 text-[11.5px] font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {deletingId === user.id ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AdminModal
        open={Boolean(target)}
        onClose={closeDeleteModal}
        title="Delete this account?"
        subtitle={target ? `${target.email} — this cannot be undone.` : ''}
        widthClass="sm:max-w-lg"
      >
        {preview.loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-brand" /> Checking this account…
          </div>
        ) : preview.error ? (
          <p className="py-2 text-sm font-semibold text-rose-600 dark:text-rose-300">{preview.error}</p>
        ) : (
          <>
            <p className="text-[13.5px] text-muted">
              This removes <b className="text-ink">{target?.name}</b>&apos;s name, email, phone number and other
              personal details. It cannot be undone.
            </p>
            <p className="mt-2 text-[12.5px] text-muted-soft">
              Their bookings, reviews and commission records are kept as anonymous data, so your
              financial history and reports stay complete.
            </p>

            {preview.data && !preview.data.canDelete ? (
              <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-400/10 px-3 py-2.5">
                <p className="flex items-start gap-1.5 text-[12.5px] font-bold text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                  Cannot delete yet — this account has upcoming or in-progress bookings:
                </p>
                <ul className="mt-1.5 space-y-1">
                  {(preview.data.blockingBookings || []).map((booking) => (
                    <li key={booking._id} className="text-[12px] text-amber-700 dark:text-amber-300">
                      {formatDate(booking.startDate)} – {formatDate(booking.endDate)} ({booking.status})
                    </li>
                  ))}
                </ul>
                <p className="mt-1.5 text-[12px] text-amber-700 dark:text-amber-300">
                  Complete or cancel them first.
                </p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={Boolean(deletingId) || (preview.data && !preview.data.canDelete)}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId ? (<><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>) : 'Delete account'}
              </button>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </AdminModal>
    </div>
  );
};

export default UsersPanel;

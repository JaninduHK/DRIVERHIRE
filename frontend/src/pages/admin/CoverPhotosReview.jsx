import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, Loader2, X } from 'lucide-react';
import { fetchCoverPhotos, reviewDriverCoverPhoto } from '../../services/adminApi.js';
import { formatDateTime } from './adminFormatters.js';

/**
 * Admin → Verification: driver cover photos waiting for approval. Approving makes the
 * photo live on the driver's profile; rejecting drops it (with a reason emailed to the
 * driver) and keeps any earlier approved cover.
 */
const CoverPhotosReview = () => {
  const [state, setState] = useState({ loading: true, error: '', items: [] });
  const [busyId, setBusyId] = useState('');
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchCoverPhotos('pending');
      setState({ loading: false, error: '', items: data?.drivers || [] });
    } catch (error) {
      setState({ loading: false, error: error?.message || 'Unable to load cover photos.', items: [] });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (driver, action) => {
    setBusyId(driver.id);
    try {
      await reviewDriverCoverPhoto(driver.id, action, notes[driver.id] || '');
      toast.success(action === 'approve' ? `Cover photo approved for ${driver.name}.` : `Cover photo rejected for ${driver.name}.`);
      setState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== driver.id) }));
    } catch (error) {
      toast.error(error?.message || 'Unable to update the cover photo.');
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="mt-5 rounded-[18px] bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div>
          <b className="text-[15px] text-ink">Cover photos waiting for approval</b>
          <p className="mt-1 text-[12px] text-muted-soft">Approved photos show at the top of the driver&apos;s public profile. Rejected drivers get an email with your reason.</p>
        </div>
        <span className="rounded-full bg-canvas px-3 py-1 text-[12px] font-bold text-muted">{state.items.length}</span>
      </div>

      {state.loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : state.error ? (
        <p className="mt-4 text-sm font-semibold text-rose-600">{state.error}</p>
      ) : state.items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No cover photos waiting for approval.</p>
      ) : (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {state.items.map((driver) => (
            <div key={driver.id} className="overflow-hidden rounded-2xl border border-hairline">
              <a href={driver.coverPhotoPending} target="_blank" rel="noopener noreferrer" className="block aspect-[16/6] bg-canvas">
                <img src={driver.coverPhotoPending} alt={`Cover photo from ${driver.name}`} className="h-full w-full object-cover" />
              </a>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <a href={`/admin/drivers/${driver.id}`} className="truncate text-[13.5px] font-bold text-ink hover:text-brand-dark">{driver.name}</a>
                  <span className="flex-shrink-0 text-[11px] text-muted-soft">{formatDateTime(driver.coverPhotoSubmittedAt)}</span>
                </div>
                {driver.coverPhoto ? <p className="mt-0.5 text-[11.5px] text-muted-soft">Replaces their current approved cover.</p> : null}
                <input
                  value={notes[driver.id] || ''}
                  onChange={(event) => setNotes((prev) => ({ ...prev, [driver.id]: event.target.value }))}
                  maxLength={300}
                  placeholder="Reason if rejecting (sent to the driver)"
                  className="mt-2 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[12.5px] text-ink"
                />
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={busyId === driver.id} onClick={() => review(driver, 'approve')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand py-2 text-[12.5px] font-bold text-white disabled:opacity-60">
                    <Check className="h-4 w-4" /> Approve
                  </button>
                  <button type="button" disabled={busyId === driver.id} onClick={() => review(driver, 'reject')} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 py-2 text-[12.5px] font-bold text-rose-600 disabled:opacity-60">
                    <X className="h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CoverPhotosReview;

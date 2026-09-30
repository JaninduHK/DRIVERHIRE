import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Lock, Plus, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  fetchVehicleAvailability,
  createVehicleAvailability,
  deleteVehicleAvailability,
} from '../../services/adminApi.js';
import { formatDate, tagClass } from './adminFormatters.js';

// Mirrors VEHICLE_AVAILABILITY_STATUS in backend/models/Vehicle.js.
const AVAILABILITY_STATUS = { AVAILABLE: 'available', UNAVAILABLE: 'unavailable' };

const inputCls =
  'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';

const emptyForm = {
  startDate: '',
  endDate: '',
  status: AVAILABILITY_STATUS.UNAVAILABLE,
  note: '',
};

/**
 * Availability for one vehicle, loaded on demand when the admin expands its row.
 *
 * Driver-set entries are editable here; booking-derived blocks are listed read-only,
 * because admin must not be able to silently free dates a traveller has booked.
 */
const VehicleAvailabilitySection = ({ vehicleId }) => {
  const [availability, setAvailability] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchVehicleAvailability(vehicleId);
      setAvailability(Array.isArray(response?.availability) ? response.availability : []);
      setBookings(Array.isArray(response?.bookings) ? response.bookings : []);
    } catch (err) {
      setError(err?.message || 'Unable to load availability.');
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');

    if (!form.startDate || !form.endDate) {
      setFormError('Both dates are required.');
      return;
    }
    if (form.endDate < form.startDate) {
      setFormError('End date cannot be before the start date.');
      return;
    }

    setSaving(true);
    try {
      const response = await createVehicleAvailability(vehicleId, {
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        note: form.note.trim() || undefined,
      });
      setAvailability(Array.isArray(response?.availability) ? response.availability : []);
      setForm(emptyForm);
      toast.success(
        form.status === AVAILABILITY_STATUS.UNAVAILABLE ? 'Dates blocked.' : 'Dates marked available.'
      );
    } catch (err) {
      setFormError(err?.message || 'Unable to add this entry.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (entryId) => {
    setRemovingId(entryId);
    try {
      const response = await deleteVehicleAvailability(vehicleId, entryId);
      setAvailability(Array.isArray(response?.availability) ? response.availability : []);
      toast.success('Entry removed.');
    } catch (err) {
      toast.error(err?.message || 'Unable to remove this entry.');
    } finally {
      setRemovingId('');
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
          <CalendarClock className="h-3.5 w-3.5" /> Availability
        </p>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-60"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-2 text-[12.5px] text-muted-soft">Loading availability…</p>
      ) : error ? (
        <p className="mt-2 text-[12.5px] font-semibold text-rose-600 dark:text-rose-300">{error}</p>
      ) : (
        <>
          {availability.length > 0 ? (
            <ul className="mt-2.5 divide-y divide-hairline">
              {availability.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-bold text-ink">
                        {formatDate(entry.startDate)} — {formatDate(entry.endDate)}
                      </span>
                      <span className={tagClass(entry.status === AVAILABILITY_STATUS.UNAVAILABLE ? 'red' : 'green')}>
                        {entry.status}
                      </span>
                    </div>
                    {entry.note ? <p className="truncate text-[11.5px] text-muted-soft">{entry.note}</p> : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(entry.id)}
                    disabled={removingId === entry.id}
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-rose-200 dark:border-rose-400/30 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-400/10 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {removingId === entry.id ? 'Removing…' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12.5px] text-muted-soft">
              No blocks set by the driver — the vehicle is bookable on any free date.
            </p>
          )}

          {bookings.length > 0 ? (
            <div className="mt-3 rounded-lg bg-canvas px-3 py-2.5">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
                <Lock className="h-3.5 w-3.5" /> Booked dates (not removable)
              </p>
              <ul className="mt-1.5 space-y-1">
                {bookings.map((booking) => (
                  <li key={booking.id} className="flex items-center justify-between gap-2 text-[12px]">
                    <span className="font-semibold text-muted">
                      {formatDate(booking.startDate)} — {formatDate(booking.endDate)}
                    </span>
                    <span className="truncate text-muted-soft">
                      {booking.travelerName} · {booking.status}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-muted-soft">
                Cancel the booking in the Bookings tab to free these dates.
              </p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="mt-3 border-t border-hairline pt-3">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div>
                <label className={labelCls}>From</label>
                <input name="startDate" type="date" value={form.startDate} onChange={handleFieldChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>To</label>
                <input name="endDate" type="date" min={form.startDate || undefined} value={form.endDate} onChange={handleFieldChange} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Status</label>
                <select name="status" value={form.status} onChange={handleFieldChange} className={inputCls}>
                  <option value={AVAILABILITY_STATUS.UNAVAILABLE}>Unavailable</option>
                  <option value={AVAILABILITY_STATUS.AVAILABLE}>Available</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Note</label>
                <input name="note" type="text" value={form.note} onChange={handleFieldChange} className={inputCls} placeholder="Optional" maxLength={500} />
              </div>
            </div>
            {formError ? <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">{formError}</p> : null}
            <button
              type="submit"
              disabled={saving}
              className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-[#0f1f2d] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0f1f2d]/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Plus className="h-4 w-4" /> {saving ? 'Saving…' : 'Add entry'}
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default VehicleAvailabilitySection;

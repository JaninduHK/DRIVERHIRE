import { useState } from 'react';
import { Car, CheckCircle2, ChevronDown, Pencil, RotateCcw, Upload, Users, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { VEHICLE_FEATURES, getVehicleFeatureLabels } from '../../constants/vehicleFeatures.js';
import { tagClass } from './adminFormatters.js';

const VEHICLE_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };
const STATUS_TAGS = { pending: 'amber', approved: 'green', rejected: 'red' };

const buildAdminVehicleForm = (vehicle = {}) => ({
  model: vehicle.model ?? '',
  year: vehicle.year ? String(vehicle.year) : '',
  pricePerDay: vehicle.pricePerDay ? String(vehicle.pricePerDay) : '',
  seats: vehicle.seats ? String(vehicle.seats) : '',
  description: vehicle.description ?? '',
  englishSpeakingDriver: Boolean(vehicle.englishSpeakingDriver),
  meetAndGreetAtAirport: Boolean(vehicle.meetAndGreetAtAirport),
  fuelAndInsurance: Boolean(vehicle.fuelAndInsurance),
  driverMealsAndAccommodation: Boolean(vehicle.driverMealsAndAccommodation),
  parkingFeesAndTolls: Boolean(vehicle.parkingFeesAndTolls),
  allTaxes: Boolean(vehicle.allTaxes),
});

const inputCls =
  'mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';

const VehiclesPanel = ({ state, onRetry, onStatusChange, onUpdate, onAddImages, onRemoveImage }) => {
  const { items: filtered, loading, error, updatingId } = state;
  const [expandedId, setExpandedId] = useState(null);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [formData, setFormData] = useState(() => buildAdminVehicleForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingVehicleId, setUploadingVehicleId] = useState('');
  const [removingImageKey, setRemovingImageKey] = useState('');

  const toggleExpanded = (vehicleId) => {
    setExpandedId((prev) => (prev === vehicleId ? null : vehicleId));
    setEditingVehicleId(null);
    setFormError('');
  };

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const startEditing = (vehicle) => {
    if (editingVehicleId === vehicle.id) {
      setEditingVehicleId(null);
      setFormData(buildAdminVehicleForm());
      setFormError('');
      return;
    }
    setEditingVehicleId(vehicle.id);
    setFormData(buildAdminVehicleForm(vehicle));
    setFormError('');
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingVehicleId) return;
    setFormError('');

    const sanitizedModel = formData.model.trim();
    if (!sanitizedModel) {
      setFormError('Vehicle model is required.');
      return;
    }
    const normalizedYear = Number(formData.year);
    const currentYear = new Date().getFullYear() + 1;
    if (Number.isNaN(normalizedYear) || normalizedYear < 1990 || normalizedYear > currentYear) {
      setFormError('Enter a valid year.');
      return;
    }
    const normalizedPrice = Number(formData.pricePerDay);
    if (Number.isNaN(normalizedPrice) || normalizedPrice < 35 || normalizedPrice > 250) {
      setFormError('Price per day must be between $35 and $250 USD.');
      return;
    }
    const normalizedSeats = formData.seats ? Number(formData.seats) : undefined;
    if (normalizedSeats !== undefined && (Number.isNaN(normalizedSeats) || normalizedSeats < 1)) {
      setFormError('Seats must be at least 1.');
      return;
    }

    const payload = {
      model: sanitizedModel,
      year: normalizedYear,
      pricePerDay: normalizedPrice,
      description: formData.description.trim(),
      englishSpeakingDriver: Boolean(formData.englishSpeakingDriver),
      meetAndGreetAtAirport: Boolean(formData.meetAndGreetAtAirport),
      fuelAndInsurance: Boolean(formData.fuelAndInsurance),
      driverMealsAndAccommodation: Boolean(formData.driverMealsAndAccommodation),
      parkingFeesAndTolls: Boolean(formData.parkingFeesAndTolls),
      allTaxes: Boolean(formData.allTaxes),
    };
    if (normalizedSeats !== undefined) payload.seats = normalizedSeats;

    setSaving(true);
    try {
      await onUpdate(editingVehicleId, payload);
      setEditingVehicleId(null);
      setFormData(buildAdminVehicleForm());
    } catch (error) {
      setFormError(error?.message || 'Unable to update vehicle details.');
    } finally {
      setSaving(false);
    }
  };

  const handleImagesUpload = async (vehicle, fileList) => {
    if (!onAddImages || !vehicle) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    const remainingSlots = Math.max(5 - (Array.isArray(vehicle.images) ? vehicle.images.length : 0), 0);
    if (remainingSlots <= 0) {
      toast.error('This vehicle already has 5 images. Remove one to add another.');
      return;
    }
    const selected = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      toast.error(`You can add ${remainingSlots} more image${remainingSlots === 1 ? '' : 's'}.`);
    }
    const form = new FormData();
    selected.forEach((file) => form.append('images', file));
    setUploadingVehicleId(vehicle.id);
    try {
      await onAddImages(vehicle.id, form);
    } catch (error) {
      console.warn('Vehicle image upload failed', error);
    } finally {
      setUploadingVehicleId('');
    }
  };

  const handleImageRemove = async (vehicleId, image) => {
    if (!onRemoveImage || !vehicleId || !image) return;
    const key = `${vehicleId}:${image}`;
    setRemovingImageKey(key);
    try {
      await onRemoveImage(vehicleId, image);
    } catch (error) {
      console.warn('Vehicle image remove failed', error);
    } finally {
      setRemovingImageKey('');
    }
  };

  if (loading) {
    return <div className="flex min-h-[200px] items-center justify-center text-sm text-muted">Loading vehicle submissions…</div>;
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-300">{error}</p>
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-bold text-ink transition hover:border-muted-soft">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] bg-surface shadow-card">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-5 py-4">
        <b className="text-[15px] text-ink">Vehicle approvals <span className="font-semibold text-muted-soft">({filtered.length})</span></b>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
          <Car className="h-9 w-9 text-muted-soft" />
          <p>No vehicle submissions found.</p>
        </div>
      ) : (
        filtered.map((vehicle) => {
          const isUpdating = updatingId === vehicle.id;
          const isEditing = editingVehicleId === vehicle.id;
          const isExpanded = expandedId === vehicle.id;
          const featureLabels = getVehicleFeatureLabels(vehicle);
          const disableApprove = isUpdating || vehicle.status === VEHICLE_STATUS.APPROVED;
          const disableReject = isUpdating || vehicle.status === VEHICLE_STATUS.REJECTED;
          const thumbnail = Array.isArray(vehicle.images) && vehicle.images[0] ? vehicle.images[0] : null;

          return (
            <div key={vehicle.id} className="border-b border-hairline last:border-b-0">
              <button
                type="button"
                onClick={() => toggleExpanded(vehicle.id)}
                className="grid w-full grid-cols-[44px_1.3fr_1.3fr_.7fr_.6fr_auto] items-center gap-3 px-5 py-3 text-left transition hover:bg-canvas"
              >
                <div className="grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-lg bg-[#e6ebee]">
                  {thumbnail ? (
                    <img src={thumbnail} alt={vehicle.model} className="h-full w-full object-cover" />
                  ) : (
                    <Car className="h-5 w-5 text-[#b3c0c9]" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <b className="truncate text-[13.5px] text-ink">{vehicle.model}</b>
                    <span className={tagClass(STATUS_TAGS[vehicle.status] || 'amber')}>{vehicle.status}</span>
                  </div>
                  <div className="truncate text-[12px] font-semibold text-muted-soft">{vehicle.year}</div>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-semibold text-muted">{vehicle.driver?.name || 'Unknown driver'}</div>
                  <div className="truncate text-[11.5px] text-muted-soft">{vehicle.driver?.email || ''}</div>
                </div>
                <div className="text-[13.5px] font-extrabold text-brand-dark">${(vehicle.pricePerDay ?? 0).toLocaleString()}/day</div>
                <div className="text-[12px] text-muted-soft">
                  {vehicle.seats ? <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {vehicle.seats}</span> : '—'}
                </div>
                <ChevronDown className={`h-4 w-4 flex-shrink-0 text-muted-soft transition ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded ? (
                <div className="border-t border-hairline bg-canvas/60 px-5 py-4">
                  {featureLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {featureLabels.map((label) => (
                        <span key={label} className={tagClass('green')}>{label}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-muted-soft">No included services listed.</p>
                  )}

                  {vehicle.description ? (
                    <p className="mt-3 text-[13px] leading-relaxed text-muted">{vehicle.description}</p>
                  ) : null}

                  {vehicle.status === VEHICLE_STATUS.REJECTED && vehicle.rejectedReason ? (
                    <p className="mt-3 rounded-lg bg-rose-50 dark:bg-rose-400/10 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300">Rejection notes: {vehicle.rejectedReason}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={disableApprove}
                      onClick={() => { if (!disableApprove) onStatusChange(vehicle.id, VEHICLE_STATUS.APPROVED); }}
                      className={`inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-400/30 bg-emerald-50 dark:bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 transition ${disableApprove ? 'cursor-not-allowed opacity-60' : 'hover:bg-emerald-100 dark:hover:bg-emerald-400/20'}`}
                    >
                      <CheckCircle2 className="h-4 w-4" /> {isUpdating ? 'Updating…' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={disableReject}
                      onClick={() => { if (!disableReject) onStatusChange(vehicle.id, VEHICLE_STATUS.REJECTED); }}
                      className={`inline-flex items-center gap-2 rounded-lg border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition ${disableReject ? 'cursor-not-allowed opacity-60' : 'hover:bg-rose-100 dark:hover:bg-rose-400/20'}`}
                    >
                      <XCircle className="h-4 w-4" /> {isUpdating ? 'Updating…' : 'Reject'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(vehicle)}
                      className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-bold text-ink transition hover:border-muted-soft"
                    >
                      <Pencil className="h-4 w-4" /> {isEditing ? 'Close edit form' : 'Edit vehicle'}
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="mt-4 space-y-4 rounded-xl border border-hairline bg-surface p-4">
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Vehicle images (max 5)</p>
                          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-[11px] font-bold text-ink transition hover:border-muted-soft ${uploadingVehicleId === vehicle.id ? 'cursor-not-allowed opacity-60' : ''}`}>
                            <Upload className="h-3.5 w-3.5" /> {uploadingVehicleId === vehicle.id ? 'Uploading…' : 'Add'}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="sr-only"
                              disabled={uploadingVehicleId === vehicle.id || updatingId === vehicle.id}
                              onChange={(event) => { handleImagesUpload(vehicle, event.target.files); event.target.value = ''; }}
                            />
                          </label>
                        </div>
                        {Array.isArray(vehicle.images) && vehicle.images.length > 0 ? (
                          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                            {vehicle.images.map((image) => {
                              const key = `${vehicle.id}:${image}`;
                              const removing = removingImageKey === key || updatingId === vehicle.id;
                              return (
                                <div key={image} className="group relative overflow-hidden rounded-lg border border-line">
                                  <img src={image} alt="" className="h-16 w-full object-cover" />
                                  <button type="button" disabled={removing} onClick={() => handleImageRemove(vehicle.id, image)} className="absolute inset-x-1 top-1 rounded-md bg-surface/90 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:text-rose-300 opacity-0 transition group-hover:opacity-100 disabled:opacity-70">
                                    {removing ? '…' : 'Remove'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-1.5 text-[11.5px] text-muted-soft">No images uploaded yet.</p>
                        )}
                      </div>

                      <form onSubmit={handleEditSubmit} className="space-y-3">
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                          <div>
                            <label className={labelCls}>Model</label>
                            <input name="model" type="text" required value={formData.model} onChange={handleFieldChange} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Year</label>
                            <input name="year" type="number" required min={1990} max={new Date().getFullYear() + 1} value={formData.year} onChange={handleFieldChange} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Price/day</label>
                            <input name="pricePerDay" type="number" required min={35} max={250} value={formData.pricePerDay} onChange={handleFieldChange} className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Seats</label>
                            <input name="seats" type="number" min={1} value={formData.seats} onChange={handleFieldChange} className={inputCls} placeholder="Optional" />
                          </div>
                        </div>
                        <div>
                          <label className={labelCls}>Description</label>
                          <textarea name="description" rows={2} value={formData.description} onChange={handleFieldChange} className={inputCls} />
                        </div>
                        <fieldset className="rounded-lg border border-line p-2.5">
                          <legend className="px-1 text-[10.5px] font-extrabold uppercase tracking-wide text-muted-soft">Included services</legend>
                          <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                            {VEHICLE_FEATURES.map(({ key, label }) => (
                              <label key={key} className="flex items-center gap-2 text-[12.5px] text-ink">
                                <input type="checkbox" name={key} checked={Boolean(formData[key])} onChange={handleFieldChange} className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand" />
                                {label}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                        {formError ? <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{formError}</p> : null}
                        <button type="submit" disabled={saving || isUpdating} className="w-full rounded-lg bg-[#0f1f2d] py-2 text-sm font-bold text-white transition hover:bg-[#0f1f2d]/90 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:px-6">
                          {saving || isUpdating ? 'Saving…' : 'Save changes'}
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
};

export default VehiclesPanel;

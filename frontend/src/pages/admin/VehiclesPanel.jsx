import { useState } from 'react';
import { Car, Mail, Pencil, RotateCcw, Upload, Users, XCircle } from 'lucide-react';
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
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [formData, setFormData] = useState(() => buildAdminVehicleForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingVehicleId, setUploadingVehicleId] = useState('');
  const [removingImageKey, setRemovingImageKey] = useState('');

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

  if (filtered.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-[18px] bg-surface text-center text-sm text-muted shadow-card">
        <Car className="h-9 w-9 text-muted-soft" />
        <p>No vehicle submissions found.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {filtered.map((vehicle) => {
        const isUpdating = updatingId === vehicle.id;
        const isEditing = editingVehicleId === vehicle.id;
        const featureLabels = getVehicleFeatureLabels(vehicle);
        const disableApprove = isUpdating || vehicle.status === VEHICLE_STATUS.APPROVED;
        const disableReject = isUpdating || vehicle.status === VEHICLE_STATUS.REJECTED;

        return (
          <div key={vehicle.id} className="flex flex-col overflow-hidden rounded-[18px] bg-surface shadow-card">
            <div className="grid h-[130px] place-items-center bg-[#e6ebee]">
              {Array.isArray(vehicle.images) && vehicle.images[0] ? (
                <img src={vehicle.images[0]} alt={vehicle.model} className="h-full w-full object-cover" />
              ) : (
                <Car className="h-9 w-9 text-[#b3c0c9]" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <b className="block truncate text-[15px] text-ink">{vehicle.model}</b>
                  <span className="text-[12px] font-semibold text-muted-soft">{vehicle.year}</span>
                </div>
                <span className={tagClass(STATUS_TAGS[vehicle.status] || 'amber')}>{vehicle.status}</span>
              </div>

              {vehicle.driver ? (
                <div className="text-[12px] text-muted-soft">
                  <p className="font-bold text-muted">{vehicle.driver.name}</p>
                  <p className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {vehicle.driver.email}</p>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 text-[13px] font-bold">
                <span className="text-brand-dark">${(vehicle.pricePerDay ?? 0).toLocaleString()}/day</span>
                {vehicle.seats ? <span className="inline-flex items-center gap-1 text-muted"><Users className="h-3.5 w-3.5" /> {vehicle.seats}</span> : null}
              </div>

              {featureLabels.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {featureLabels.slice(0, 3).map((label) => (
                    <span key={label} className={tagClass('green')}>{label}</span>
                  ))}
                  {featureLabels.length > 3 ? <span className="text-[11px] font-semibold text-muted-soft">+{featureLabels.length - 3} more</span> : null}
                </div>
              ) : null}

              {vehicle.status === VEHICLE_STATUS.REJECTED && vehicle.rejectedReason ? (
                <p className="rounded-lg bg-rose-50 dark:bg-rose-400/10 px-3 py-2 text-[12px] text-rose-700 dark:text-rose-300">Rejection notes: {vehicle.rejectedReason}</p>
              ) : null}

              <div className="mt-auto flex gap-2 pt-1">
                <button type="button" onClick={() => startEditing(vehicle)} className="flex-1 rounded-lg border border-line py-2 text-xs font-bold text-ink transition hover:border-muted-soft">
                  <Pencil className="mr-1 inline h-3.5 w-3.5" /> {isEditing ? 'Close' : 'Edit'}
                </button>
                <button type="button" disabled={disableApprove} onClick={() => !disableApprove && onStatusChange(vehicle.id, VEHICLE_STATUS.APPROVED)} className="flex-1 rounded-lg bg-brand py-2 text-xs font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
                  {isUpdating ? 'Updating…' : 'Approve'}
                </button>
                <button type="button" disabled={disableReject} onClick={() => !disableReject && onStatusChange(vehicle.id, VEHICLE_STATUS.REJECTED)} className="flex-shrink-0 rounded-lg border border-rose-200 dark:border-rose-400/30 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 transition hover:bg-rose-50 dark:hover:bg-rose-400/10 disabled:cursor-not-allowed disabled:opacity-60">
                  <XCircle className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {isEditing ? (
              <div className="space-y-4 border-t border-hairline bg-canvas/60 p-4">
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
                    <div className="mt-2 grid grid-cols-3 gap-2">
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
                  <div className="grid grid-cols-2 gap-2.5">
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
                    <div className="mt-1.5 grid grid-cols-1 gap-1.5">
                      {VEHICLE_FEATURES.map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2 text-[12.5px] text-ink">
                          <input type="checkbox" name={key} checked={Boolean(formData[key])} onChange={handleFieldChange} className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand" />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  {formError ? <p className="text-xs font-semibold text-rose-600 dark:text-rose-300">{formError}</p> : null}
                  <button type="submit" disabled={saving || isUpdating} className="w-full rounded-lg bg-[#0f1f2d] py-2 text-sm font-bold text-white transition hover:bg-[#0f1f2d]/90 disabled:cursor-not-allowed disabled:opacity-70">
                    {saving || isUpdating ? 'Saving…' : 'Save changes'}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

export default VehiclesPanel;

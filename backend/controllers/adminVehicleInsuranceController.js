import { validationResult } from 'express-validator';
import Vehicle, { VEHICLE_STATUS } from '../models/Vehicle.js';
import { sendVehicleInsuranceEmail } from '../services/emailService.js';
import { notifyUser } from '../services/expoPushService.js';
import { buildAssetUrl, mapAssetUrls } from '../utils/assetUtils.js';
import { INSURANCE_STATUS, hasInsuranceOnFile, serializeInsurance } from '../utils/vehicleInsurance.js';

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
};

const loadVehicle = (id) =>
  Vehicle.findOne({ _id: id, deletedAt: null }).select('+insurance +registration').populate('driver', 'name email');

const respond = (res, vehicle, req) => {
  const payload = vehicle.toJSON();
  payload.images = mapAssetUrls(payload.images, req);
  payload.insurance = serializeInsurance(vehicle.insurance, (url) => buildAssetUrl(url, req));
  return res.json({ vehicle: payload });
};

// Email and push are best effort: the admin's action has already been saved.
const tellDriver = (vehicle, kind, { note, push }) => {
  const driver = vehicle.driver;
  if (!driver) return;
  sendVehicleInsuranceEmail({
    driver: { name: driver.name, email: driver.email },
    vehicle: { model: vehicle.model },
    kind,
    note,
    endDate: vehicle.insurance?.endDate,
  }).catch((error) => console.warn('Vehicle insurance email failed:', error));
  notifyUser(driver._id.toString(), { ...push, data: { type: 'vehicle', vehicleId: vehicle._id.toString() } });
};

/**
 * POST /api/admin/vehicles/:id/insurance/request
 *
 * An admin asks the driver to verify this vehicle's insurance. Can be used on
 * any vehicle at any time. The vehicle goes to pending (off the marketplace)
 * until the driver resubmits it with a fresh passenger insurance document, cover dates and
 * five photos, and an admin approves it again.
 */
export const requestInsuranceVerification = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return validationError;

  try {
    const vehicle = await loadVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (!vehicle.insurance) vehicle.insurance = {};
    vehicle.insurance.requestedAt = new Date();
    vehicle.insurance.requestNote = note || undefined;
    vehicle.status = VEHICLE_STATUS.PENDING;
    vehicle.reviewedAt = new Date();
    vehicle.reviewedBy = req.user.id;
    vehicle.rejectedReason = undefined;
    await vehicle.save();

    tellDriver(vehicle, 'requested', {
      note,
      push: {
        title: 'Verify your vehicle insurance',
        body: `${vehicle.model} is off the marketplace until you upload your passenger insurance document and 5 photos.`,
      },
    });

    return respond(res, vehicle, req);
  } catch (error) {
    console.error('Request insurance verification error:', error);
    return res.status(500).json({ message: 'Unable to request insurance verification.' });
  }
};

/**
 * PATCH /api/admin/vehicles/:id/insurance  { status: 'verified' | 'rejected', reason? }
 *
 * The admin's verdict on insurance a driver submitted. Verifying changes only
 * the insurance (a pending vehicle is still approved separately). Rejecting
 * also takes an approved vehicle off the marketplace, since it has no accepted
 * insurance any more.
 */
export const reviewVehicleInsurance = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return validationError;

  const { status } = req.body || {};
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

  try {
    const vehicle = await loadVehicle(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    if (!hasInsuranceOnFile(vehicle.insurance)) {
      return res.status(400).json({ message: 'This vehicle has no insurance on file to review.' });
    }

    vehicle.insurance.status = status;
    vehicle.insurance.reviewedAt = new Date();
    vehicle.insurance.reviewedBy = req.user.id;
    vehicle.insurance.rejectedReason = status === INSURANCE_STATUS.REJECTED ? reason || undefined : undefined;

    const takenDown = status === INSURANCE_STATUS.REJECTED && vehicle.status === VEHICLE_STATUS.APPROVED;
    if (takenDown) {
      vehicle.status = VEHICLE_STATUS.PENDING;
      vehicle.reviewedAt = new Date();
      vehicle.reviewedBy = req.user.id;
    }
    await vehicle.save();

    if (status === INSURANCE_STATUS.REJECTED) {
      tellDriver(vehicle, 'rejected', {
        note: reason,
        push: {
          title: 'Insurance could not be verified',
          body: `Upload a clear photo of the current passenger insurance document for ${vehicle.model}.`,
        },
      });
    }

    return respond(res, vehicle, req);
  } catch (error) {
    console.error('Review vehicle insurance error:', error);
    return res.status(500).json({ message: 'Unable to update the insurance status.' });
  }
};

export default { requestInsuranceVerification, reviewVehicleInsurance };

import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import User, { DRIVER_STATUS, LICENSE_STATUS } from '../models/User.js';
import Vehicle, { VEHICLE_STATUS, VEHICLE_AVAILABILITY_STATUS } from '../models/Vehicle.js';
import {
  findBlockingVehicleBookings,
  blockingBookingsMessage,
  softDeleteVehicle,
} from '../services/vehicleDeletionService.js';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import Review, { REVIEW_STATUS } from '../models/Review.js';
import { mapAssetUrls, buildAssetUrl } from '../utils/assetUtils.js';
import * as cloudinaryService from '../services/cloudinaryService.js';
import {
  INSURANCE_STATUS,
  MAX_INSURANCE_IMAGES,
  MAX_VEHICLE_IMAGES,
  MIN_VEHICLE_IMAGES,
  isInsuranceUsable,
  parseCoverPeriod,
  serializeInsurance,
} from '../utils/vehicleInsurance.js';
import {
  DUPLICATE_REGISTRATION_MESSAGE,
  findRegistrationConflict,
  parseRegistrationNumber,
} from '../utils/vehicleRegistration.js';

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
};

const entryTimeValue = (input) => {
  if (!input) return 0;
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const sanitizeAvailability = (entries = []) =>
  entries
    .map((entry) => ({
      id: entry._id ? entry._id.toString() : entry.id,
      startDate: entry.startDate,
      endDate: entry.endDate,
      status: entry.status,
      note: entry.note,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }))
    .sort((a, b) => entryTimeValue(a.startDate) - entryTimeValue(b.startDate));

const normalizeDateInput = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const serializeDriverVehicle = (vehicle, req) => {
  if (!vehicle) {
    return null;
  }
  const payload = typeof vehicle.toJSON === 'function' ? vehicle.toJSON() : vehicle;
  payload.images = mapAssetUrls(payload.images, req);
  // The driver's own copy of their insurance record (toJSON never includes it).
  payload.insurance = serializeInsurance(vehicle.insurance, (url) => buildAssetUrl(url, req));
  payload.registrationNumber = vehicle.registration?.number || null;
  return payload;
};

const PHOTO_RULES_MESSAGE = `Add ${MIN_VEHICLE_IMAGES} photos of the vehicle: clear, good quality, showing the outside and the inside, with the number plate visible and no people in them.`;
// Shown when a save has no usable insurance to go with it. The app release
// that predates insurance cannot send any, hence the second sentence.
const INSURANCE_REQUIRED_MESSAGE =
  'Add a photo of your passenger insurance document and the cover start and end dates. If you do not see a passenger insurance section, update the app or use carwithdriver.lk.';

// The app release that predates registration numbers cannot send one.
const OLD_APP_HINT = 'If you do not see this field, update the app or use carwithdriver.lk.';

// multer's .fields() puts uploads on req.files as { images, insuranceImages }.
const uploadedFiles = (req, field) => (req.files && !Array.isArray(req.files) ? req.files[field] || [] : []);

// Uploads every file or none: on a failure whatever already went up is removed.
const uploadAll = async (files, folder, prefix) => {
  const urls = [];
  try {
    for (const file of files) {
      const filename = cloudinaryService.generateUniqueFilename(prefix);
      urls.push(await cloudinaryService.uploadImage(file.buffer, folder, filename));
    }
    return urls;
  } catch (error) {
    if (urls.length > 0) {
      await cloudinaryService.deleteMultipleAssets(urls, 'image').catch(() => {});
    }
    throw Object.assign(new Error(`Failed to upload image: ${error.message}`), { uploadFailed: true });
  }
};

const removeAssets = (urls) => {
  const removable = (urls || []).filter((url) => cloudinaryService.isCloudinaryUrl(url));
  if (removable.length === 0) return Promise.resolve();
  return cloudinaryService
    .deleteMultipleAssets(removable, 'image')
    .catch((cleanupError) => console.warn('Vehicle image cleanup failed:', cleanupError?.message));
};

const sameDay = (a, b) => Boolean(a && b) && new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);

export const getDriverOverview = async (req, res) => {
  try {
    const driver = await User.findById(req.user.id).select(
      'name email contactNumber address description tripAdvisor driverStatus createdAt profilePhoto driverLocation shareLiveLocation driverApprovedAt driverProfileTourCompletedAt driverReviewedAt experienceYears licenseType licenseImage licenseStatus licenseSubmittedAt licenseReviewedAt licenseAdminNote commissionFrozenAt commissionFrozenPeriods serviceAreas'
    );

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (driver.driverStatus !== DRIVER_STATUS.APPROVED) {
      return res.status(403).json({ message: 'Driver application pending approval' });
    }

    const profile = driver.toJSON();
    if (profile.profilePhoto) {
      profile.profilePhoto = buildAssetUrl(profile.profilePhoto, req);
    }
    if (profile.licenseImage) {
      profile.licenseImage = buildAssetUrl(profile.licenseImage, req);
    }

    const onboarding = {
      profileTourCompletedAt: driver.driverProfileTourCompletedAt || null,
      showProfileTour: !driver.driverProfileTourCompletedAt,
      approvedAt: driver.driverApprovedAt || driver.driverReviewedAt || null,
    };

    // "Completed" isn't a stored booking status (see BOOKING_STATUS) — a trip counts
    // as finished once a confirmed booking's end date has passed, same rule the web
    // and mobile dashboards use client-side for their own upcoming/completed split.
    const now = new Date();
    const [totalTrips, upcomingTrips, reviewAgg] = await Promise.all([
      Booking.countDocuments({
        driver: driver._id,
        status: BOOKING_STATUS.CONFIRMED,
        endDate: { $lt: now },
      }),
      Booking.countDocuments({
        driver: driver._id,
        status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
        endDate: { $gte: now },
      }),
      Review.aggregate([
        { $match: { driver: driver._id, status: REVIEW_STATUS.APPROVED } },
        { $group: { _id: null, averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
      ]),
    ]);

    const ratingEntry = reviewAgg[0];
    const rating = ratingEntry?.reviewCount
      ? Math.round(Math.min(5, Math.max(1, ratingEntry.averageRating)) * 10) / 10
      : 0;

    const activity = {
      totalTrips,
      upcomingTrips,
      rating,
      lastUpdated: new Date(),
    };

    return res.json({ profile, activity, onboarding });
  } catch (error) {
    console.error('Driver overview error:', error);
    return res.status(500).json({ message: 'Unable to load driver dashboard' });
  }
};

// Submit or resubmit a license for review. Every successful call — first
// submission or resubmission after rejection — resets status to pending and
// clears any prior admin note/review timestamps; there's no history table,
// matching how driverStatus itself has no audit trail.
export const updateDriverLicense = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { licenseType } = req.body || {};

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (req.file) {
      if (user.licenseImage && cloudinaryService.isCloudinaryUrl(user.licenseImage)) {
        try {
          await cloudinaryService.deleteAsset(user.licenseImage, 'image');
        } catch (deleteError) {
          console.warn('Failed to delete old license image from Cloudinary:', deleteError.message);
        }
      }
      const filename = cloudinaryService.generateUniqueFilename(`license-${user._id}`);
      user.licenseImage = await cloudinaryService.uploadImage(req.file.buffer, 'licenses', filename);
    }

    // A first-time submission must include an image; a resubmission may omit
    // it to keep the existing photo and just change the license type.
    if (!user.licenseImage) {
      return res.status(400).json({ message: 'Please upload an image of your license.' });
    }

    user.licenseType = licenseType;
    user.licenseStatus = LICENSE_STATUS.PENDING;
    user.licenseSubmittedAt = new Date();
    user.licenseReviewedAt = undefined;
    user.licenseReviewedBy = undefined;
    user.licenseAdminNote = undefined;

    await user.save({ validateBeforeSave: false });

    return res.json({
      message: 'License submitted for review.',
      license: {
        type: user.licenseType,
        image: buildAssetUrl(user.licenseImage, req),
        status: user.licenseStatus,
        submittedAt: user.licenseSubmittedAt,
        reviewedAt: null,
        adminNote: null,
      },
    });
  } catch (error) {
    console.error('Update driver license error:', error);
    return res.status(500).json({ message: 'Unable to update license.' });
  }
};

export const getDriverVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ driver: req.user.id, deletedAt: null })
      .select('+insurance +registration')
      .sort({ createdAt: -1 });

    return res.json({
      vehicles: vehicles.map((vehicle) => serializeDriverVehicle(vehicle, req)),
    });
  } catch (error) {
    console.error('Driver vehicles fetch error:', error);
    return res.status(500).json({ message: 'Unable to fetch vehicles' });
  }
};

export const getVehicleAvailability = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid vehicle identifier provided' });
  }

  try {
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id, deletedAt: null }).select('availability');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    return res.json({ availability: sanitizeAvailability(vehicle.availability) });
  } catch (error) {
    console.error('Vehicle availability fetch error:', error);
    return res.status(500).json({ message: 'Unable to load availability' });
  }
};

export const createVehicleAvailability = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const startDate = normalizeDateInput(req.body.startDate);
  const endDate = normalizeDateInput(req.body.endDate);
  const status =
    req.body.status && Object.values(VEHICLE_AVAILABILITY_STATUS).includes(req.body.status)
      ? req.body.status
      : VEHICLE_AVAILABILITY_STATUS.AVAILABLE;
  const note = typeof req.body.note === 'string' ? req.body.note.trim() : undefined;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start and end dates are required' });
  }

  if (startDate > endDate) {
    return res.status(400).json({ message: 'Start date must be before end date' });
  }

  try {
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id, deletedAt: null });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    vehicle.availability.push({
      startDate,
      endDate,
      status,
      note: note || undefined,
    });

    await vehicle.save();

    return res.status(201).json({ availability: sanitizeAvailability(vehicle.availability) });
  } catch (error) {
    console.error('Create vehicle availability error:', error);
    return res.status(500).json({ message: 'Unable to create availability entry' });
  }
};

export const updateVehicleAvailability = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id, availabilityId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(availabilityId)) {
    return res.status(400).json({ message: 'Invalid identifiers provided' });
  }

  const startDate =
    req.body.startDate !== undefined ? normalizeDateInput(req.body.startDate) : undefined;
  const endDate =
    req.body.endDate !== undefined ? normalizeDateInput(req.body.endDate) : undefined;

  if (req.body.startDate !== undefined && !startDate) {
    return res.status(400).json({ message: 'Start date must be a valid ISO date' });
  }

  if (req.body.endDate !== undefined && !endDate) {
    return res.status(400).json({ message: 'End date must be a valid ISO date' });
  }

  try {
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id, deletedAt: null });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const availabilityEntry = vehicle.availability.id(availabilityId);

    if (!availabilityEntry) {
      return res.status(404).json({ message: 'Availability entry not found' });
    }

    if (startDate) {
      availabilityEntry.startDate = startDate;
    }

    if (endDate) {
      availabilityEntry.endDate = endDate;
    }

    if (req.body.status) {
      if (!Object.values(VEHICLE_AVAILABILITY_STATUS).includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid availability status' });
      }
      availabilityEntry.status = req.body.status;
    }

    if (req.body.note !== undefined) {
      const trimmedNote = typeof req.body.note === 'string' ? req.body.note.trim() : '';
      availabilityEntry.note = trimmedNote ? trimmedNote : undefined;
    }

    if (availabilityEntry.startDate && availabilityEntry.endDate) {
      if (availabilityEntry.startDate > availabilityEntry.endDate) {
        return res.status(400).json({ message: 'Start date must be before end date' });
      }
    }

    await vehicle.save();

    return res.json({ availability: sanitizeAvailability(vehicle.availability) });
  } catch (error) {
    console.error('Update vehicle availability error:', error);
    return res.status(500).json({ message: 'Unable to update availability entry' });
  }
};

export const deleteVehicleAvailability = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id, availabilityId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(availabilityId)) {
    return res.status(400).json({ message: 'Invalid identifiers provided' });
  }

  try {
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id, deletedAt: null });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const availabilityEntry = vehicle.availability.id(availabilityId);

    if (!availabilityEntry) {
      return res.status(404).json({ message: 'Availability entry not found' });
    }

    availabilityEntry.deleteOne();

    await vehicle.save();

    return res.json({ availability: sanitizeAvailability(vehicle.availability) });
  } catch (error) {
    console.error('Delete vehicle availability error:', error);
    return res.status(500).json({ message: 'Unable to remove availability entry' });
  }
};
export const createDriverVehicle = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const uploadedUrls = [];

  try {
    const {
      model,
      year,
      description,
      pricePerDay,
      seats,
      englishSpeakingDriver,
      meetAndGreetAtAirport,
      fuelAndInsurance,
      driverMealsAndAccommodation,
      parkingFeesAndTolls,
      allTaxes,
    } = req.body;

    const normalizedYear = Number(year);
    const normalizedPrice = Number(pricePerDay);
    const normalizedSeats = seats ? Number(seats) : undefined;

    if (
      Number.isNaN(normalizedYear) ||
      normalizedYear < 1990 ||
      normalizedYear > new Date().getFullYear() + 1
    ) {
      return res.status(400).json({ message: 'Invalid vehicle year provided' });
    }

    if (
      Number.isNaN(normalizedPrice) ||
      normalizedPrice < 35 ||
      normalizedPrice > 250
    ) {
      return res
        .status(400)
        .json({ message: 'Price per day must be between $35 and $250 USD' });
    }

    if (normalizedSeats !== undefined && (Number.isNaN(normalizedSeats) || normalizedSeats < 1)) {
      return res.status(400).json({ message: 'Seats must be at least 1' });
    }

    const registration = parseRegistrationNumber(req.body.registrationNumber);
    if (registration.error) {
      return res.status(400).json({ message: `${registration.error} ${OLD_APP_HINT}` });
    }
    if (await findRegistrationConflict(registration.key)) {
      return res.status(409).json({ message: DUPLICATE_REGISTRATION_MESSAGE, code: 'DUPLICATE_REGISTRATION' });
    }

    const imageFiles = uploadedFiles(req, 'images').slice(0, MAX_VEHICLE_IMAGES);
    const insuranceFiles = uploadedFiles(req, 'insuranceImages').slice(0, MAX_INSURANCE_IMAGES);

    // Everything is checked before anything is uploaded.
    if (imageFiles.length < MIN_VEHICLE_IMAGES) {
      return res.status(400).json({ message: PHOTO_RULES_MESSAGE });
    }
    if (insuranceFiles.length === 0) {
      return res.status(400).json({ message: INSURANCE_REQUIRED_MESSAGE });
    }
    const coverPeriod = parseCoverPeriod({
      startDate: req.body.insuranceStartDate,
      endDate: req.body.insuranceEndDate,
    });
    if (coverPeriod.error) {
      return res.status(400).json({ message: coverPeriod.error });
    }

    uploadedUrls.push(...(await uploadAll(imageFiles, 'vehicles', 'vehicle')));
    const insuranceUrls = await uploadAll(insuranceFiles, 'insurance', 'insurance');
    uploadedUrls.push(...insuranceUrls);
    const vehicleImageUrls = uploadedUrls.slice(0, imageFiles.length);

    const vehicle = new Vehicle({
      driver: req.user.id,
      model: model.trim(),
      year: normalizedYear,
      description: description?.trim(),
      pricePerDay: normalizedPrice,
      seats: normalizedSeats,
      status: VEHICLE_STATUS.PENDING,
      images: vehicleImageUrls,
      registration: { number: registration.number, key: registration.key },
      insurance: {
        cardImages: insuranceUrls,
        startDate: coverPeriod.startDate,
        endDate: coverPeriod.endDate,
        status: INSURANCE_STATUS.PENDING,
        submittedAt: new Date(),
      },
      englishSpeakingDriver: parseBoolean(englishSpeakingDriver),
      meetAndGreetAtAirport: parseBoolean(meetAndGreetAtAirport),
      fuelAndInsurance: parseBoolean(fuelAndInsurance),
      driverMealsAndAccommodation: parseBoolean(driverMealsAndAccommodation),
      parkingFeesAndTolls: parseBoolean(parkingFeesAndTolls),
      allTaxes: parseBoolean(allTaxes),
    });

    await vehicle.save();

    return res.status(201).json({ vehicle: serializeDriverVehicle(vehicle, req) });
  } catch (error) {
    console.error('Create driver vehicle error:', error);
    // Clean up uploaded images if vehicle creation failed
    if (uploadedUrls.length > 0) {
      await cloudinaryService.deleteMultipleAssets(uploadedUrls, 'image').catch(() => {});
    }
    return res.status(500).json({ message: error.uploadFailed ? error.message : 'Unable to submit vehicle' });
  }
};

export const updateDriverVehicle = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid vehicle identifier provided' });
  }

  const uploadedUrls = [];

  try {
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id, deletedAt: null }).select('+insurance +registration');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const {
      model,
      year,
      description,
      pricePerDay,
      seats,
      englishSpeakingDriver,
      meetAndGreetAtAirport,
      fuelAndInsurance,
      driverMealsAndAccommodation,
      parkingFeesAndTolls,
      allTaxes,
    } = req.body;

    const normalizedYear = Number(year);
    const normalizedPrice = Number(pricePerDay);
    const normalizedSeats = seats ? Number(seats) : undefined;

    if (
      Number.isNaN(normalizedYear) ||
      normalizedYear < 1990 ||
      normalizedYear > new Date().getFullYear() + 1
    ) {
      return res.status(400).json({ message: 'Invalid vehicle year provided' });
    }

    if (
      Number.isNaN(normalizedPrice) ||
      normalizedPrice < 35 ||
      normalizedPrice > 250
    ) {
      return res
        .status(400)
        .json({ message: 'Price per day must be between $35 and $250 USD' });
    }

    if (normalizedSeats !== undefined && (Number.isNaN(normalizedSeats) || normalizedSeats < 1)) {
      return res.status(400).json({ message: 'Seats must be at least 1' });
    }

    const registration = parseRegistrationNumber(req.body.registrationNumber);
    if (registration.error) {
      return res.status(400).json({ message: `${registration.error} ${OLD_APP_HINT}` });
    }
    if (await findRegistrationConflict(registration.key, { excludeVehicleId: vehicle._id })) {
      return res.status(409).json({ message: DUPLICATE_REGISTRATION_MESSAGE, code: 'DUPLICATE_REGISTRATION' });
    }

    const imageFiles = uploadedFiles(req, 'images');
    const insuranceFiles = uploadedFiles(req, 'insuranceImages').slice(0, MAX_INSURANCE_IMAGES);

    // Which existing photos to keep. When the edit form sends an `existingImages`
    // list (URLs to retain) the rest are removed; when the field is absent, all stay.
    let keptImages = vehicle.images;
    if (req.body.existingImages !== undefined) {
      let keepUrls = [];
      try {
        keepUrls = Array.isArray(req.body.existingImages)
          ? req.body.existingImages
          : JSON.parse(req.body.existingImages || '[]');
      } catch {
        keepUrls = [];
      }
      const keepSet = new Set((keepUrls || []).map(String));
      keptImages = vehicle.images.filter(
        (stored) => keepSet.has(buildAssetUrl(stored, req)) || keepSet.has(stored)
      );
    }
    const removedImages = vehicle.images.filter((stored) => !keptImages.includes(stored));
    const newImageFiles = imageFiles.slice(0, Math.max(MAX_VEHICLE_IMAGES - keptImages.length, 0));

    // Every save is checked against the photo and insurance rules before anything
    // is uploaded or removed, so a refused save changes nothing.
    if (keptImages.length + newImageFiles.length < MIN_VEHICLE_IMAGES) {
      return res.status(400).json({ message: PHOTO_RULES_MESSAGE });
    }

    const current = vehicle.insurance;
    const verificationRequested = Boolean(current?.requestedAt);
    const sentCoverDates = Boolean(req.body.insuranceStartDate || req.body.insuranceEndDate);
    let coverPeriod = null;
    let insuranceChanged = false;

    if (insuranceFiles.length > 0 || sentCoverDates) {
      coverPeriod = parseCoverPeriod({
        startDate: req.body.insuranceStartDate,
        endDate: req.body.insuranceEndDate,
      });
      if (coverPeriod.error) {
        return res.status(400).json({ message: coverPeriod.error });
      }
      if (insuranceFiles.length === 0 && !(current?.cardImages?.length > 0)) {
        return res.status(400).json({ message: INSURANCE_REQUIRED_MESSAGE });
      }
      insuranceChanged =
        insuranceFiles.length > 0 ||
        !sameDay(current?.startDate, coverPeriod.startDate) ||
        !sameDay(current?.endDate, coverPeriod.endDate);
    }
    // Nothing new was sent, so what is on file has to carry the save: missing,
    // expired or rejected insurance cannot.
    if (!insuranceChanged && !isInsuranceUsable(current)) {
      return res.status(400).json({ message: INSURANCE_REQUIRED_MESSAGE });
    }
    // An admin asked for the insurance to be verified again: the answer has to be
    // a fresh photo of the document, not the one already on file.
    if (verificationRequested && insuranceFiles.length === 0) {
      return res.status(400).json({
        message: 'We asked you to verify this vehicle\'s insurance. Upload a new photo of your current passenger insurance document.',
      });
    }

    const nextDetails = {
      model: model.trim(),
      year: normalizedYear,
      description: description?.trim(),
      pricePerDay: normalizedPrice,
      seats: normalizedSeats,
      englishSpeakingDriver: parseBoolean(englishSpeakingDriver),
      meetAndGreetAtAirport: parseBoolean(meetAndGreetAtAirport),
      fuelAndInsurance: parseBoolean(fuelAndInsurance),
      driverMealsAndAccommodation: parseBoolean(driverMealsAndAccommodation),
      parkingFeesAndTolls: parseBoolean(parkingFeesAndTolls),
      allTaxes: parseBoolean(allTaxes),
    };
    const detailsChanged =
      vehicle.registration?.key !== registration.key ||
      removedImages.length > 0 ||
      newImageFiles.length > 0 ||
      Object.entries(nextDetails).some(([key, value]) => (vehicle[key] ?? '') !== (value ?? ''));

    uploadedUrls.push(...(await uploadAll(newImageFiles, 'vehicles', `vehicle-${id}`)));
    const newVehicleImageUrls = [...uploadedUrls];
    const insuranceUrls = await uploadAll(insuranceFiles, 'insurance', `insurance-${id}`);
    uploadedUrls.push(...insuranceUrls);

    Object.assign(vehicle, nextDetails);
    vehicle.registration = { number: registration.number, key: registration.key };
    vehicle.images = [...keptImages, ...newVehicleImageUrls];

    const replacedCardImages = insuranceUrls.length > 0 ? current?.cardImages || [] : [];
    if (insuranceChanged) {
      // A new submission: it waits for an admin to check it, and every flag that
      // belonged to the previous cover period is cleared.
      vehicle.insurance = {
        cardImages: insuranceUrls.length > 0 ? insuranceUrls : current.cardImages,
        startDate: coverPeriod.startDate,
        endDate: coverPeriod.endDate,
        status: INSURANCE_STATUS.PENDING,
        submittedAt: new Date(),
      };
    }

    // Adding or renewing insurance on an approved vehicle must not take it off
    // the marketplace: the vehicle itself has not changed, only its paperwork,
    // which an admin verifies separately. Anything else goes back for review, as
    // does the reply to an admin's verification request.
    const staysApproved =
      vehicle.status === VEHICLE_STATUS.APPROVED && !detailsChanged && !verificationRequested;
    if (!staysApproved) {
      vehicle.status = VEHICLE_STATUS.PENDING;
      vehicle.rejectedReason = undefined;
      vehicle.reviewedAt = undefined;
      vehicle.reviewedBy = undefined;
    }

    await vehicle.save();
    await removeAssets([...removedImages, ...replacedCardImages]);

    return res.json({ vehicle: serializeDriverVehicle(vehicle, req) });
  } catch (error) {
    console.error('Update driver vehicle error:', error);
    if (uploadedUrls.length > 0) {
      await cloudinaryService.deleteMultipleAssets(uploadedUrls, 'image').catch(() => {});
    }
    return res.status(500).json({ message: error.uploadFailed ? error.message : 'Unable to update vehicle' });
  }
};

export const deleteDriverVehicle = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid vehicle identifier provided' });
  }

  try {
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id, deletedAt: null });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const blocking = await findBlockingVehicleBookings(vehicle._id);
    if (blocking.length > 0) {
      return res.status(409).json({
        message: blockingBookingsMessage(blocking),
        bookings: blocking,
      });
    }

    const { withdrawnOffers } = await softDeleteVehicle(vehicle);

    return res.json({
      message: 'Vehicle deleted.',
      vehicleId: vehicle._id.toString(),
      withdrawnOffers,
    });
  } catch (error) {
    console.error('Driver vehicle delete error:', error);
    return res.status(500).json({ message: 'Unable to delete vehicle' });
  }
};

export const completeDriverProfileTour = async (req, res) => {
  try {
    const driver = await User.findById(req.user.id);

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (driver.driverStatus !== DRIVER_STATUS.APPROVED) {
      return res.status(403).json({ message: 'Driver application pending approval' });
    }

    driver.driverProfileTourCompletedAt = new Date();
    await driver.save();

    return res.json({
      completedAt: driver.driverProfileTourCompletedAt,
    });
  } catch (error) {
    console.error('Complete driver profile tour error:', error);
    return res.status(500).json({ message: 'Unable to update onboarding status' });
  }
};

// --- Expo push token registration (driver mobile app) -----------------------

export const registerPushToken = async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Push token is required' });
  }
  try {
    await User.updateOne({ _id: req.user.id }, { $addToSet: { expoPushTokens: token } });
    return res.json({ success: true });
  } catch (error) {
    console.error('registerPushToken error:', error);
    return res.status(500).json({ message: 'Unable to register push token' });
  }
};

export const unregisterPushToken = async (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Push token is required' });
  }
  try {
    await User.updateOne({ _id: req.user.id }, { $pull: { expoPushTokens: token } });
    return res.json({ success: true });
  } catch (error) {
    console.error('unregisterPushToken error:', error);
    return res.status(500).json({ message: 'Unable to unregister push token' });
  }
};

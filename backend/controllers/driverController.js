import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import User, { DRIVER_STATUS } from '../models/User.js';
import Vehicle, { VEHICLE_STATUS, VEHICLE_AVAILABILITY_STATUS } from '../models/Vehicle.js';
import { mapAssetUrls } from '../utils/assetUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../../uploads/vehicles');

const ensureUploadsDir = async () => {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
};

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
  return payload;
};

export const getDriverOverview = async (req, res) => {
  try {
    const driver = await User.findById(req.user.id)
      .select('name email contactNumber address description tripAdvisor driverStatus createdAt');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (driver.driverStatus !== DRIVER_STATUS.APPROVED) {
      return res.status(403).json({ message: 'Driver application pending approval' });
    }

    const profile = driver.toJSON();

    const activity = {
      totalTrips: 0,
      upcomingTrips: 0,
      rating: 0,
      lastUpdated: new Date(),
    };

    return res.json({ profile, activity });
  } catch (error) {
    console.error('Driver overview error:', error);
    return res.status(500).json({ message: 'Unable to load driver dashboard' });
  }
};

export const getDriverVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ driver: req.user.id }).sort({ createdAt: -1 });

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
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id }).select('availability');

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
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id });

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
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id });

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
    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id });

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

  try {
    await ensureUploadsDir();

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

    const imagePaths =
      Array.isArray(req.files) && req.files.length > 0
        ? req.files.map((file) => `/uploads/vehicles/${path.basename(file.path)}`)
        : [];

    const vehicle = new Vehicle({
      driver: req.user.id,
      model: model.trim(),
      year: normalizedYear,
      description: description?.trim(),
      pricePerDay: normalizedPrice,
      seats: normalizedSeats,
      status: VEHICLE_STATUS.PENDING,
      images: imagePaths,
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
    return res.status(500).json({ message: 'Unable to submit vehicle' });
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

  try {
    await ensureUploadsDir();

    const vehicle = await Vehicle.findOne({ _id: id, driver: req.user.id });

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

    const newImagePaths =
      Array.isArray(req.files) && req.files.length > 0
        ? req.files.map((file) => `/uploads/vehicles/${path.basename(file.path)}`)
        : [];

    vehicle.model = model.trim();
    vehicle.year = normalizedYear;
    vehicle.description = description?.trim();
    vehicle.pricePerDay = normalizedPrice;
    vehicle.seats = normalizedSeats;
    vehicle.englishSpeakingDriver = parseBoolean(englishSpeakingDriver);
    vehicle.meetAndGreetAtAirport = parseBoolean(meetAndGreetAtAirport);
    vehicle.fuelAndInsurance = parseBoolean(fuelAndInsurance);
    vehicle.driverMealsAndAccommodation = parseBoolean(driverMealsAndAccommodation);
    vehicle.parkingFeesAndTolls = parseBoolean(parkingFeesAndTolls);
    vehicle.allTaxes = parseBoolean(allTaxes);

    if (newImagePaths.length > 0) {
      const combinedImages = [...vehicle.images, ...newImagePaths].slice(0, 5);
      vehicle.images = combinedImages;
    }

    vehicle.status = VEHICLE_STATUS.PENDING;
    vehicle.rejectedReason = undefined;
    vehicle.reviewedAt = undefined;
    vehicle.reviewedBy = undefined;

    await vehicle.save();

    return res.json({ vehicle: serializeDriverVehicle(vehicle, req) });
  } catch (error) {
    console.error('Update driver vehicle error:', error);
    return res.status(500).json({ message: 'Unable to update vehicle' });
  }
};

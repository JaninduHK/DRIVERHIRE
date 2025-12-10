import mongoose from 'mongoose';
import Vehicle, { VEHICLE_STATUS, VEHICLE_AVAILABILITY_STATUS } from '../models/Vehicle.js';
import { DRIVER_STATUS } from '../models/User.js';
import Booking, { BOOKING_STATUS, DEFAULT_COMMISSION_RATE } from '../models/Booking.js';
import Review, { REVIEW_STATUS } from '../models/Review.js';
import '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import {
  sendBookingRequestAlertEmail,
  sendBookingRequestConfirmationEmail,
} from '../services/emailService.js';
import { mapAssetUrls, buildAssetUrl } from '../utils/assetUtils.js';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const sanitizeDriver = (driverDoc, extras = {}) => {
  if (!driverDoc) {
    return null;
  }

  const source =
    driverDoc instanceof mongoose.Model ? driverDoc.toObject({ getters: true }) : driverDoc;
  const { req } = extras;

  return {
    id: source._id ? source._id.toString() : source.id,
    name: source.name,
    description: source.description,
    contactNumber: source.contactNumber,
    tripAdvisor: source.tripAdvisor,
    address: source.address,
    createdAt: source.createdAt,
    profilePhoto: buildAssetUrl(source.profilePhoto, req),
    location: source.driverLocation
      ? {
          label: source.driverLocation.label || '',
          latitude: source.driverLocation.latitude,
          longitude: source.driverLocation.longitude,
          updatedAt: source.driverLocation.updatedAt,
        }
      : null,
  };
};

const sanitizeVehicle = (vehicleDoc, extras = {}) => {
  if (!vehicleDoc) {
    return null;
  }

  const source =
    vehicleDoc instanceof mongoose.Model ? vehicleDoc.toObject({ getters: true }) : vehicleDoc;

  const availability = Array.isArray(source.availability)
    ? source.availability
        .map((slot) => ({
          id: slot._id ? slot._id.toString() : slot.id,
          startDate: slot.startDate,
          endDate: slot.endDate,
          status: slot.status,
          note: slot.note,
          createdAt: slot.createdAt,
          updatedAt: slot.updatedAt,
        }))
        .sort((a, b) => {
          const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
          return aTime - bTime;
        })
    : [];

  const { req, reviewSummary = {} } = extras;

  return {
    id: source._id ? source._id.toString() : source.id,
    model: source.model,
    year: source.year,
    description: source.description,
    pricePerDay: source.pricePerDay,
    seats: source.seats,
    images: mapAssetUrls(source.images, req),
    englishSpeakingDriver: Boolean(source.englishSpeakingDriver),
    meetAndGreetAtAirport: Boolean(source.meetAndGreetAtAirport),
    fuelAndInsurance: Boolean(source.fuelAndInsurance),
    driverMealsAndAccommodation: Boolean(source.driverMealsAndAccommodation),
    parkingFeesAndTolls: Boolean(source.parkingFeesAndTolls),
    allTaxes: Boolean(source.allTaxes),
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    availability,
    driver: sanitizeDriver(source.driver, { req }),
    reviewSummary: {
      averageRating:
        typeof reviewSummary.averageRating === 'number'
          ? Math.round(reviewSummary.averageRating * 100) / 100
          : reviewSummary.averageRating ?? null,
      totalReviews: reviewSummary.totalReviews ?? 0,
      countsByRating: Array.isArray(reviewSummary.countsByRating)
        ? reviewSummary.countsByRating
        : [0, 0, 0, 0, 0],
      latestReviewAt: reviewSummary.latestReviewAt ?? null,
    },
  };
};

const coerceNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildSortOption = (sortKey) => {
  switch (sortKey) {
    case 'priceAsc':
      return { pricePerDay: 1, createdAt: -1 };
    case 'priceDesc':
      return { pricePerDay: -1, createdAt: -1 };
    case 'seatsDesc':
      return { seats: -1, pricePerDay: 1 };
    case 'yearDesc':
      return { year: -1, createdAt: -1 };
    default:
      return { createdAt: -1 };
  }
};

const normalizeDateInput = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const rangesOverlap = (startA, endA, startB, endB) => {
  return startA <= endB && startB <= endA;
};

const calculateTotalDays = (startDate, endDate) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diff = Math.round((endDate - startDate) / MS_PER_DAY);
  return Math.max(diff + 1, 1);
};

const buildReviewSummaryMap = async (vehicleIds = []) => {
  if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
    return new Map();
  }

  const objectIds = vehicleIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) {
    return new Map();
  }

  const stats = await Review.aggregate([
    {
      $match: {
        vehicle: { $in: objectIds },
        status: REVIEW_STATUS.APPROVED,
      },
    },
    {
      $group: {
        _id: '$vehicle',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        rating1: {
          $sum: {
            $cond: [{ $eq: ['$rating', 1] }, 1, 0],
          },
        },
        rating2: {
          $sum: {
            $cond: [{ $eq: ['$rating', 2] }, 1, 0],
          },
        },
        rating3: {
          $sum: {
            $cond: [{ $eq: ['$rating', 3] }, 1, 0],
          },
        },
        rating4: {
          $sum: {
            $cond: [{ $eq: ['$rating', 4] }, 1, 0],
          },
        },
        rating5: {
          $sum: {
            $cond: [{ $eq: ['$rating', 5] }, 1, 0],
          },
        },
        latestReviewAt: {
          $max: {
            $ifNull: ['$publishedAt', '$updatedAt'],
          },
        },
      },
    },
  ]);

  const summaryMap = new Map();

  stats.forEach((entry) => {
    summaryMap.set(entry._id.toString(), {
      averageRating: entry.averageRating ?? null,
      totalReviews: entry.totalReviews ?? 0,
      countsByRating: [
        entry.rating1 ?? 0,
        entry.rating2 ?? 0,
        entry.rating3 ?? 0,
        entry.rating4 ?? 0,
        entry.rating5 ?? 0,
      ],
      latestReviewAt: entry.latestReviewAt ?? null,
    });
  });

  return summaryMap;
};

const findAvailabilityConflict = (availabilityEntries = [], startDate, endDate) => {
  return availabilityEntries.find((entry) => {
    if (!entry?.startDate || !entry?.endDate) {
      return false;
    }
    if (entry.status !== VEHICLE_AVAILABILITY_STATUS.UNAVAILABLE) {
      return false;
    }
    const entryStart = new Date(entry.startDate);
    const entryEnd = new Date(entry.endDate);
    if (Number.isNaN(entryStart.getTime()) || Number.isNaN(entryEnd.getTime())) {
      return false;
    }
    return rangesOverlap(entryStart, entryEnd, startDate, endDate);
  });
};

const hasExistingBookingConflict = async (vehicleId, startDate, endDate) => {
  const conflict = await Booking.exists({
    vehicle: vehicleId,
    status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  return Boolean(conflict);
};

export const listVehicles = async (req, res) => {
  const {
    search,
    minPrice,
    maxPrice,
    minSeats,
    sort,
    location,
    minRating: minRatingInput,
    startDate: startInput,
    endDate: endInput,
  } = req.query;

  const filters = {
    status: VEHICLE_STATUS.APPROVED,
  };

  const normalizedSearch = typeof search === 'string' ? search.trim() : '';
  const normalizedLocation = typeof location === 'string' ? location.trim() : '';
  const ratingThresholdRaw = coerceNumber(minRatingInput, null);
  const ratingThreshold =
    ratingThresholdRaw !== null && ratingThresholdRaw >= 0
      ? Math.min(Math.max(ratingThresholdRaw, 0), 5)
      : null;

  let startDateFilter = null;
  let endDateFilter = null;

  if (startInput || endInput) {
    startDateFilter = normalizeDateInput(startInput);
    endDateFilter = normalizeDateInput(endInput);

    if (!startDateFilter || !endDateFilter) {
      return res.status(400).json({
        message: 'Start and end dates must be valid ISO dates (YYYY-MM-DD).',
      });
    }

    if (endDateFilter < startDateFilter) {
      return res.status(400).json({
        message: 'End date must be on or after the start date.',
      });
    }
  }

  const lowerBound = coerceNumber(minPrice, null);
  const upperBound = coerceNumber(maxPrice, null);
  if (lowerBound !== null || upperBound !== null) {
    filters.pricePerDay = {};
    if (lowerBound !== null) {
      filters.pricePerDay.$gte = lowerBound;
    }
    if (upperBound !== null) {
      filters.pricePerDay.$lte = upperBound;
    }
  }

  const seatsBound = coerceNumber(minSeats, null);
  if (seatsBound !== null) {
    filters.seats = { $gte: seatsBound };
  }

  try {
    const sortOption = buildSortOption(sort);

    const results = await Vehicle.find(filters)
      .sort(sortOption)
      .populate({
        path: 'driver',
        match: { driverStatus: DRIVER_STATUS.APPROVED },
        select:
          'name description contactNumber tripAdvisor address driverStatus createdAt profilePhoto driverLocation',
        options: { lean: true },
      })
      .lean();

    const searchPattern = normalizedSearch ? new RegExp(escapeRegex(normalizedSearch), 'i') : null;

    const filteredVehicles = results
      .filter((vehicle) => vehicle.driver)
      .filter((vehicle) => {
        if (!searchPattern) {
          return true;
        }
        return (
          searchPattern.test(vehicle.model || '') ||
          searchPattern.test(vehicle.description || '') ||
          searchPattern.test(vehicle.driver?.name || '')
        );
      });

    const locationPattern = normalizedLocation ? new RegExp(escapeRegex(normalizedLocation), 'i') : null;
    const locationFilteredVehicles = locationPattern
      ? filteredVehicles.filter((vehicle) => locationPattern.test(vehicle.driver?.address || ''))
      : filteredVehicles;

    const reviewSummaryMap = await buildReviewSummaryMap(
      locationFilteredVehicles
        .map((vehicle) => (vehicle._id ? vehicle._id.toString() : null))
        .filter(Boolean)
    );

    let ratingFilteredVehicles = locationFilteredVehicles;
    if (ratingThreshold !== null) {
      ratingFilteredVehicles = ratingFilteredVehicles.filter((vehicle) => {
        const summary = reviewSummaryMap.get(vehicle._id.toString());
        if (!summary || typeof summary.averageRating !== 'number') {
          return false;
        }
        return summary.averageRating >= ratingThreshold;
      });
    }

    let availabilityFilteredVehicles = ratingFilteredVehicles;
    if (startDateFilter && endDateFilter) {
      availabilityFilteredVehicles = ratingFilteredVehicles.filter(
        (vehicle) => !findAvailabilityConflict(vehicle.availability, startDateFilter, endDateFilter)
      );

      if (availabilityFilteredVehicles.length > 0) {
        const bookingSafeVehicles = [];
        for (const vehicle of availabilityFilteredVehicles) {
          // eslint-disable-next-line no-await-in-loop
          const conflict = await hasExistingBookingConflict(
            vehicle._id,
            startDateFilter,
            endDateFilter
          );
          if (!conflict) {
            bookingSafeVehicles.push(vehicle);
          }
        }
        availabilityFilteredVehicles = bookingSafeVehicles;
      }
    }

    const vehicles = availabilityFilteredVehicles.map((vehicle) =>
      sanitizeVehicle(vehicle, {
        req,
        reviewSummary: reviewSummaryMap.get(vehicle._id.toString()),
      })
    );

    return res.json({
      vehicles,
      meta: {
        total: vehicles.length,
        sort: sort || 'recent',
      },
    });
  } catch (error) {
    console.error('List vehicles error:', error);
    return res.status(500).json({ message: 'Unable to fetch vehicles' });
  }
};

export const getVehicleDetails = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid vehicle identifier provided' });
  }

  try {
    const vehicle = await Vehicle.findOne({
      _id: id,
      status: VEHICLE_STATUS.APPROVED,
    })
      .populate({
        path: 'driver',
        select:
          'name description contactNumber tripAdvisor address driverStatus createdAt profilePhoto driverLocation',
        match: { driverStatus: DRIVER_STATUS.APPROVED },
        options: { lean: true },
      })
      .lean();

    if (!vehicle || !vehicle.driver) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const reviewSummaryMap = await buildReviewSummaryMap([vehicle._id.toString()]);

    return res.json({
      vehicle: sanitizeVehicle(vehicle, {
        req,
        reviewSummary: reviewSummaryMap.get(vehicle._id.toString()),
      }),
    });
  } catch (error) {
    console.error('Fetch vehicle details error:', error);
    return res.status(500).json({ message: 'Unable to load vehicle details' });
  }
};

export const checkVehicleAvailability = async (req, res) => {
  const { id } = req.params;
  const { startDate: startInput, endDate: endInput } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid vehicle identifier provided' });
  }

  const startDate = normalizeDateInput(startInput);
  const endDate = normalizeDateInput(endInput);

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start and end dates are required' });
  }

  if (endDate < startDate) {
    return res.status(400).json({ message: 'End date must be on or after the start date' });
  }

  try {
    const vehicle = await Vehicle.findOne({
      _id: id,
      status: VEHICLE_STATUS.APPROVED,
    })
      .select('availability pricePerDay driver')
      .populate({
        path: 'driver',
        match: { driverStatus: DRIVER_STATUS.APPROVED },
        select: '_id driverStatus',
        options: { lean: true },
      })
      .lean();

    if (!vehicle || !vehicle.driver) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const availabilityConflict = findAvailabilityConflict(vehicle.availability, startDate, endDate);
    if (availabilityConflict) {
      return res.json({
        available: false,
        reason:
          'This vehicle is marked as unavailable for the selected dates. Please pick a different range.',
      });
    }

    const bookingConflict = await hasExistingBookingConflict(id, startDate, endDate);
    if (bookingConflict) {
      return res.json({
        available: false,
        reason: 'Another traveller has already booked this vehicle for the selected dates.',
      });
    }

    const totalDays = calculateTotalDays(startDate, endDate);
    const pricePerDay = Number.isFinite(vehicle.pricePerDay) ? vehicle.pricePerDay : null;
    const totalPrice =
      pricePerDay !== null ? Math.max(pricePerDay * totalDays, pricePerDay) : null;

    return res.json({
      available: true,
      quote: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalDays,
        pricePerDay,
        totalPrice,
        paymentNote: 'Pay your driver directly on the first day of the trip.',
      },
    });
  } catch (error) {
    console.error('Check vehicle availability error:', error);
    return res.status(500).json({ message: 'Unable to check availability right now' });
  }
};

export const createVehicleBooking = async (req, res) => {
  const { id } = req.params;
  const {
    startDate: startInput,
    endDate: endInput,
    fullName,
    email,
    phoneNumber,
    flightNumber,
    arrivalTime,
    departureTime,
    startPoint,
    endPoint,
    specialRequests,
    offerId,
  } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid vehicle identifier provided' });
  }

  let startDate = normalizeDateInput(startInput);
  let endDate = normalizeDateInput(endInput);

  if (!req.user) {
    return res.status(401).json({ message: 'You must be signed in to confirm a booking' });
  }

  const trimmedName = typeof fullName === 'string' ? fullName.trim() : '';
  const trimmedEmail = typeof email === 'string' ? email.trim() : '';
  const trimmedPhone = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';

  if (!trimmedName || !trimmedEmail || !trimmedPhone) {
    return res
      .status(400)
      .json({ message: 'Full name, email, and phone number are required to confirm a booking' });
  }

  try {
    let offerMessage = null;
    const vehicle = await Vehicle.findOne({
      _id: id,
      status: VEHICLE_STATUS.APPROVED,
    })
      .select('availability pricePerDay model driver')
      .populate({
        path: 'driver',
        match: { driverStatus: DRIVER_STATUS.APPROVED },
        select: '_id name email driverStatus contactNumber profilePhoto driverLocation',
      });

    if (!vehicle || !vehicle.driver) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    if (offerId) {
      if (!mongoose.Types.ObjectId.isValid(offerId)) {
        return res.status(400).json({ message: 'Offer reference is invalid' });
      }

      offerMessage = await ChatMessage.findById(offerId)
        .populate({
          path: 'conversation',
          select: 'traveler driver',
        })
        .exec();

      if (!offerMessage || offerMessage.type !== 'offer' || !offerMessage.offer) {
        return res.status(404).json({ message: 'Offer not found or unavailable' });
      }

      if (!offerMessage.conversation) {
        return res.status(404).json({ message: 'Offer conversation could not be found' });
      }

      const conversationDriver = offerMessage.conversation.driver?.toString();
      const conversationTraveler = offerMessage.conversation.traveler?.toString();
      const vehicleDriverId = vehicle.driver._id?.toString();

      if (conversationTraveler !== req.user.id) {
        return res.status(403).json({ message: 'You are not authorized to use this offer.' });
      }

      if (conversationDriver !== vehicleDriverId) {
        return res
          .status(400)
          .json({ message: 'This offer was not issued by the selected vehicle driver.' });
      }

      const offerVehicleId =
        typeof offerMessage.offer.vehicle === 'string'
          ? offerMessage.offer.vehicle
          : offerMessage.offer.vehicle?.toString();

      if (offerVehicleId && offerVehicleId !== vehicle._id.toString()) {
        return res
          .status(400)
          .json({ message: 'This offer applies to a different vehicle. Please refresh the page.' });
      }

      if (offerMessage.offer.status === 'accepted') {
        return res
          .status(409)
          .json({ message: 'This offer has already been accepted. Please request a new offer.' });
      }

      if (offerMessage.offer.status === 'declined') {
        return res.status(409).json({ message: 'This offer is no longer available.' });
      }

      const offerStart = normalizeDateInput(offerMessage.offer.startDate);
      const offerEnd = normalizeDateInput(offerMessage.offer.endDate);

      if (!offerStart || !offerEnd) {
        return res.status(400).json({ message: 'Offer dates are invalid.' });
      }

      startDate = offerStart;
      endDate = offerEnd;
    }

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start and end dates are required to confirm a booking' });
    }

    if (endDate < startDate) {
      return res.status(400).json({ message: 'End date must be on or after the start date' });
    }

    const availabilityConflict = findAvailabilityConflict(vehicle.availability, startDate, endDate);
    if (availabilityConflict) {
      return res
        .status(409)
        .json({ message: 'This vehicle is marked as unavailable for the selected dates' });
    }

    const bookingConflict = await hasExistingBookingConflict(vehicle._id, startDate, endDate);
    if (bookingConflict) {
      return res.status(409).json({
        message: 'Another traveller has already requested these dates. Please try a different range.',
      });
    }

    const totalDays = calculateTotalDays(startDate, endDate);
    const pricePerDay = Number.isFinite(vehicle.pricePerDay) ? vehicle.pricePerDay : 0;
    let totalPrice = pricePerDay > 0 ? pricePerDay * totalDays : 0;

    if (offerMessage?.offer?.totalPrice) {
      const offerTotal = Number(offerMessage.offer.totalPrice);
      if (Number.isFinite(offerTotal) && offerTotal >= 0) {
        totalPrice = offerTotal;
      }
    }

    const booking = new Booking({
      vehicle: vehicle._id,
      driver: vehicle.driver._id,
      traveler: {
        fullName: trimmedName,
        email: trimmedEmail,
        phoneNumber: trimmedPhone,
      },
      travelerUser: req.user.id,
      startDate,
      endDate,
      flightNumber: typeof flightNumber === 'string' ? flightNumber.trim() : undefined,
      arrivalTime: typeof arrivalTime === 'string' ? arrivalTime.trim() : undefined,
      departureTime: typeof departureTime === 'string' ? departureTime.trim() : undefined,
      startPoint: typeof startPoint === 'string' ? startPoint.trim() : undefined,
      endPoint: typeof endPoint === 'string' ? endPoint.trim() : undefined,
      specialRequests:
        typeof specialRequests === 'string' && specialRequests.trim().length > 0
          ? specialRequests.trim()
          : undefined,
      totalDays,
      pricePerDay,
      totalPrice,
      commissionBaseRate: DEFAULT_COMMISSION_RATE,
      commissionRate: DEFAULT_COMMISSION_RATE,
      status: offerMessage ? BOOKING_STATUS.CONFIRMED : BOOKING_STATUS.PENDING,
      offerMessage: offerMessage ? offerMessage._id : null,
    });

    await booking.save();

    const travelerContact = {
      name: trimmedName,
      email: trimmedEmail,
    };

    sendBookingRequestConfirmationEmail({
      traveler: travelerContact,
      booking,
      vehicle: { model: vehicle.model },
      paymentNote: booking.paymentNote,
    }).catch((error) => console.warn('Booking confirmation email failed:', error));

    if (vehicle.driver?.email) {
      sendBookingRequestAlertEmail({
        driver: {
          name: vehicle.driver.name,
          email: vehicle.driver.email,
          role: vehicle.driver.role || 'driver',
        },
        traveler: travelerContact,
        booking,
        vehicle: { model: vehicle.model },
      }).catch((error) => console.warn('Booking alert email failed:', error));
    }

    if (offerMessage) {
      offerMessage.offer.status = 'accepted';
      await offerMessage.save();
    }

    return res.status(201).json({
      booking: booking.toJSON(),
      message: `Booking request received for ${vehicle.model}.`,
      paymentNote: booking.paymentNote,
    });
  } catch (error) {
    console.error('Create vehicle booking error:', error);
    return res.status(500).json({ message: 'Unable to confirm booking right now' });
  }
};

export default {
  listVehicles,
  getVehicleDetails,
  checkVehicleAvailability,
  createVehicleBooking,
};

import mongoose from 'mongoose';
import Booking, { BOOKING_STATUS, DEFAULT_COMMISSION_RATE } from '../models/Booking.js';
import Review from '../models/Review.js';
import ChatMessage from '../models/ChatMessage.js';
import { USER_ROLES } from '../models/User.js';
import { sendBookingStatusUpdateEmail } from '../services/emailService.js';
import { mapAssetUrls } from '../utils/assetUtils.js';

const toId = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }
  if (typeof value === 'object') {
    if (value._id) {
      return value._id.toString();
    }
    if (value.id) {
      return value.id.toString();
    }
    if (typeof value.toString === 'function') {
      return value.toString();
    }
  }
  return null;
};

const shapeVehicle = (vehicle, req) => {
  if (!vehicle) {
    return null;
  }
  return {
    id: toId(vehicle),
    model: vehicle.model,
    pricePerDay: vehicle.pricePerDay,
    images: mapAssetUrls(vehicle.images, req),
  };
};

const shapeDriver = (driver) => {
  if (!driver) {
    return null;
  }
  return {
    id: toId(driver),
    name: driver.name,
    contactNumber: driver.contactNumber,
    email: driver.email,
  };
};

const shapeReview = (review) => {
  if (!review) {
    return null;
  }
  return {
    id: review._id ? review._id.toString() : review.id,
    rating: review.rating,
    title: review.title || '',
    comment: review.comment,
    status: review.status,
    submittedAt: review.createdAt,
    updatedAt: review.updatedAt,
    adminNote: review.adminNote,
  };
};

const canSubmitReviewForBooking = (booking, review) => {
  if (review) {
    return false;
  }
  if (!booking.endDate) {
    return false;
  }
  const tripEndedAt = new Date(booking.endDate);
  if (Number.isNaN(tripEndedAt.getTime())) {
    return false;
  }
  const now = new Date();
  if (tripEndedAt > now) {
    return false;
  }
  if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(booking.status)) {
    return false;
  }
  return true;
};

const shapeBooking = (booking, review, req) => {
  const shapedReview = shapeReview(review);
  const gross = Number.isFinite(booking.totalPrice) ? booking.totalPrice : 0;
  const baseRate = Number.isFinite(booking.commissionBaseRate)
    ? booking.commissionBaseRate
    : DEFAULT_COMMISSION_RATE;
  const rate = Number.isFinite(booking.commissionRate)
    ? booking.commissionRate
    : DEFAULT_COMMISSION_RATE;
  const discountRate =
    Number.isFinite(booking.commissionDiscountRate) && booking.commissionDiscountRate > 0
      ? booking.commissionDiscountRate
      : 0;
  const commissionAmount =
    Number.isFinite(booking.commissionAmount) && booking.commissionAmount >= 0
      ? booking.commissionAmount
      : Math.round(gross * rate * 100) / 100;
  const discountAmount =
    Number.isFinite(booking.discountAmount) && booking.discountAmount > 0
      ? Math.round(booking.discountAmount * 100) / 100
      : Math.round(gross * discountRate * 100) / 100;
  const payableTotal =
    Number.isFinite(booking.payableTotal) && booking.payableTotal > 0
      ? booking.payableTotal
      : Math.max(gross - discountAmount, 0);
  const driverEarnings =
    Number.isFinite(booking.driverEarnings) && booking.driverEarnings >= 0
      ? booking.driverEarnings
      : Math.round((payableTotal - commissionAmount) * 100) / 100;
  const discountLabel = booking.commissionDiscountLabel || null;
  const discountId = booking.commissionDiscount
    ? toId(booking.commissionDiscount)
    : booking.commissionDiscountId || null;

  return {
    id: booking._id.toString(),
    startDate: booking.startDate,
    endDate: booking.endDate,
    status: booking.status,
    totalPrice: gross,
    payableTotal,
    discountAmount,
    totalDays: booking.totalDays,
    pricePerDay: booking.pricePerDay,
    commissionBaseRate: baseRate,
    commissionRate: rate,
    commissionAmount,
    commissionDiscountRate: discountRate,
    commissionDiscountLabel: discountLabel,
    commissionDiscountId: discountId,
    driverEarnings,
    paymentNote: booking.paymentNote,
    vehicle: shapeVehicle(booking.vehicle, req),
    driver: shapeDriver(booking.driver),
    traveler: booking.traveler,
    specialRequests: booking.specialRequests,
    startPoint: booking.startPoint,
    endPoint: booking.endPoint,
    travelerUser: booking.travelerUser ? booking.travelerUser.toString() : null,
    offerId: booking.offerMessage?._id ? booking.offerMessage._id.toString() : null,
    offerStatus: booking.offerMessage?.offer?.status || null,
    conversationId: booking.offerMessage?.conversation
      ? toId(booking.offerMessage.conversation)
      : null,
    review: shapedReview,
    canReview: canSubmitReviewForBooking(booking, review),
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
};

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

const calculateTotalDays = (startDate, endDate) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diff = Math.round((endDate - startDate) / MS_PER_DAY);
  return Math.max(diff + 1, 1);
};

const fetchBookingWithDetails = async (bookingId) =>
  Booking.findById(bookingId)
    .populate({
      path: 'vehicle',
      select: 'model pricePerDay images',
    })
    .populate({
      path: 'driver',
      select: 'name contactNumber email',
    })
    .populate({
      path: 'offerMessage',
      select: 'offer conversation',
    })
    .lean();

export const listTravelerBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ travelerUser: req.user.id })
      .sort({ startDate: 1, createdAt: -1 })
      .populate({
        path: 'vehicle',
        select: 'model pricePerDay images',
      })
      .populate({
        path: 'driver',
        select: 'name contactNumber email',
      })
      .populate({
        path: 'offerMessage',
        select: 'offer conversation',
      })
      .lean();

    const bookingIds = bookings.map((booking) => booking._id.toString());
    const reviews = await Review.find({
      booking: { $in: bookingIds },
    }).lean();
    const reviewMap = new Map(
      reviews.map((review) => [review.booking?.toString(), review])
    );

    return res.json({
      bookings: bookings.map((booking) =>
        shapeBooking(booking, reviewMap.get(booking._id.toString()), req)
      ),
    });
  } catch (error) {
    console.error('List traveler bookings error:', error);
    return res.status(500).json({ message: 'Unable to load your bookings right now.' });
  }
};

export const listDriverBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ driver: req.user.id })
      .sort({ startDate: 1, createdAt: -1 })
      .populate({
        path: 'vehicle',
        select: 'model pricePerDay images',
      })
      .populate({
        path: 'driver',
        select: 'name contactNumber email',
      })
      .populate({
        path: 'offerMessage',
        select: 'offer conversation',
      })
      .lean();

    const bookingIds = bookings.map((booking) => booking._id.toString());
    const reviews = await Review.find({
      booking: { $in: bookingIds },
    }).lean();
    const reviewMap = new Map(
      reviews.map((review) => [review.booking?.toString(), review])
    );

    return res.json({
      bookings: bookings.map((booking) =>
        shapeBooking(booking, reviewMap.get(booking._id.toString()), req)
      ),
    });
  } catch (error) {
    console.error('List driver bookings error:', error);
    return res.status(500).json({ message: 'Unable to load driver bookings.' });
  }
};

export const driverRespondToBooking = async (req, res) => {
  const { id } = req.params;
  const { action } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid booking identifier.' });
  }

  const normalizedAction = typeof action === 'string' ? action.trim().toLowerCase() : '';
  if (!['accept', 'reject'].includes(normalizedAction)) {
    return res.status(400).json({ message: 'Specify whether you want to accept or reject the booking.' });
  }

  try {
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.driver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to manage this booking.' });
    }

    if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(booking.status)) {
      return res.status(400).json({ message: 'This booking is no longer active.' });
    }

    if (normalizedAction === 'accept') {
      if (booking.status === BOOKING_STATUS.CONFIRMED) {
        const hydrated = await fetchBookingWithDetails(id);
        return res.json({ booking: shapeBooking(hydrated, null, req) });
      }

      if (booking.status !== BOOKING_STATUS.PENDING) {
        return res.status(400).json({ message: 'Only pending bookings can be accepted.' });
      }

      const conflictingBooking = await Booking.exists({
        _id: { $ne: booking._id },
        vehicle: booking.vehicle,
        status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] },
        startDate: { $lte: booking.endDate },
        endDate: { $gte: booking.startDate },
      });

      if (conflictingBooking) {
        return res
          .status(409)
          .json({ message: 'Another confirmed booking overlaps these dates. Please adjust availability.' });
      }

      booking.status = BOOKING_STATUS.CONFIRMED;
    } else {
      if (booking.status !== BOOKING_STATUS.PENDING) {
        return res.status(400).json({ message: 'Only pending bookings can be rejected.' });
      }
      booking.status = BOOKING_STATUS.REJECTED;
    }

    await booking.save();

    if (booking.offerMessage) {
      const nextOfferStatus = normalizedAction === 'accept' ? 'accepted' : 'declined';
      await ChatMessage.findByIdAndUpdate(booking.offerMessage, { 'offer.status': nextOfferStatus });
    }

    const hydrated = await fetchBookingWithDetails(id);
    const travelerRecipient = hydrated?.traveler?.email
      ? {
          name: hydrated.traveler.fullName,
          email: hydrated.traveler.email,
          role: USER_ROLES.GUEST,
        }
      : null;

    if (travelerRecipient) {
      const note =
        normalizedAction === 'accept'
          ? 'Your driver confirmed this booking request.'
          : 'Your driver declined this booking. Start a new chat to adjust plans.';
      sendBookingStatusUpdateEmail({
        recipient: travelerRecipient,
        booking: hydrated,
        vehicle: hydrated.vehicle,
        status: booking.status,
        note,
      }).catch((error) => console.warn('Traveler booking status email failed:', error));
    }

    return res.json({ booking: shapeBooking(hydrated, null, req) });
  } catch (error) {
    console.error('Driver booking response error:', error);
    return res.status(500).json({ message: 'Unable to update booking status right now.' });
  }
};

export const updateTravelerBooking = async (req, res) => {
  const { id } = req.params;
  const {
    startDate: startInput,
    endDate: endInput,
    flightNumber,
    arrivalTime,
    departureTime,
    startPoint,
    endPoint,
    specialRequests,
  } = req.body || {};

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid booking identifier.' });
  }

  try {
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.travelerUser?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to update this booking.' });
    }

    if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(booking.status)) {
      return res.status(400).json({ message: 'This booking is no longer active.' });
    }

    const now = new Date();
    if (booking.startDate && booking.startDate < now) {
      return res
        .status(400)
        .json({ message: 'Trips that have already started cannot be edited. Please contact your driver.' });
    }

    const hasStartUpdate = startInput !== undefined;
    const hasEndUpdate = endInput !== undefined;

    let nextStart = booking.startDate;
    let nextEnd = booking.endDate;

    if (hasStartUpdate) {
      const parsed = normalizeDateInput(startInput);
      if (!parsed) {
        return res.status(400).json({ message: 'Please provide a valid start date.' });
      }
      nextStart = parsed;
    }

    if (hasEndUpdate) {
      const parsed = normalizeDateInput(endInput);
      if (!parsed) {
        return res.status(400).json({ message: 'Please provide a valid end date.' });
      }
      nextEnd = parsed;
    }

    if (nextStart && nextEnd && nextEnd < nextStart) {
      return res.status(400).json({ message: 'End date must be on or after the start date.' });
    }

    const datesChanged =
      (nextStart && booking.startDate && nextStart.getTime() !== booking.startDate.getTime()) ||
      (nextEnd && booking.endDate && nextEnd.getTime() !== booking.endDate.getTime());

    if (datesChanged && booking.offerMessage) {
      return res
        .status(400)
        .json({ message: 'Please coordinate with your driver via chat to adjust offer-based bookings.' });
    }

    if (datesChanged) {
      const conflictingBooking = await Booking.exists({
        _id: { $ne: booking._id },
        vehicle: booking.vehicle,
        status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] },
        startDate: { $lte: nextEnd },
        endDate: { $gte: nextStart },
      });

      if (conflictingBooking) {
        return res
          .status(409)
          .json({ message: 'Those dates are no longer available. Please pick a different range.' });
      }

      const totalDays = calculateTotalDays(nextStart, nextEnd);
      booking.startDate = nextStart;
      booking.endDate = nextEnd;
      booking.totalDays = totalDays;

      if (!booking.offerMessage) {
        const rate = Number.isFinite(booking.pricePerDay) ? booking.pricePerDay : 0;
        booking.totalPrice = rate > 0 ? Math.max(rate * totalDays, rate) : booking.totalPrice;
      }

      if (booking.status === BOOKING_STATUS.CONFIRMED) {
        booking.status = BOOKING_STATUS.PENDING;
      }
    }

    const assignStringField = (fieldName, value, maxLength) => {
      if (value === undefined) {
        return;
      }
      const trimmed = typeof value === 'string' ? value.trim() : '';
      booking[fieldName] = trimmed && maxLength ? trimmed.slice(0, maxLength) : trimmed || undefined;
    };

    assignStringField('flightNumber', flightNumber, 40);
    assignStringField('arrivalTime', arrivalTime, 80);
    assignStringField('departureTime', departureTime, 80);
    assignStringField('startPoint', startPoint, 200);
    assignStringField('endPoint', endPoint, 200);
    assignStringField('specialRequests', specialRequests, 1000);

    await booking.save();

    const hydrated = await fetchBookingWithDetails(id);

    return res.json({ booking: shapeBooking(hydrated, null, req) });
  } catch (error) {
    console.error('Update traveler booking error:', error);
    return res.status(500).json({ message: 'Unable to update your booking right now.' });
  }
};

export const cancelTravelerBooking = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid booking identifier.' });
  }

  try {
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    if (booking.travelerUser?.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You are not authorized to cancel this booking.' });
    }

    if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(booking.status)) {
      const hydrated = await fetchBookingWithDetails(id);
      return res.json({ booking: shapeBooking(hydrated, null, req) });
    }

    booking.status = BOOKING_STATUS.CANCELLED;

    await booking.save();

    if (booking.offerMessage) {
      await ChatMessage.findByIdAndUpdate(booking.offerMessage, { 'offer.status': 'declined' });
    }

    const hydrated = await fetchBookingWithDetails(id);

    const travelerRecipient = hydrated?.traveler?.email
      ? {
          name: hydrated.traveler.fullName,
          email: hydrated.traveler.email,
          role: USER_ROLES.GUEST,
        }
      : null;

    const driverRecipient = hydrated?.driver?.email
      ? {
          name: hydrated.driver.name,
          email: hydrated.driver.email,
          role: USER_ROLES.DRIVER,
        }
      : null;

    if (travelerRecipient) {
      sendBookingStatusUpdateEmail({
        recipient: travelerRecipient,
        booking: hydrated,
        vehicle: hydrated.vehicle,
        status: booking.status,
        note: 'We cancelled this booking at your request.',
      }).catch((error) => console.warn('Traveler cancel email failed:', error));
    }

    if (driverRecipient) {
      sendBookingStatusUpdateEmail({
        recipient: driverRecipient,
        booking: hydrated,
        vehicle: hydrated.vehicle,
        status: booking.status,
        note: 'The traveller cancelled this booking.',
      }).catch((error) => console.warn('Driver cancel email failed:', error));
    }

    return res.json({ booking: shapeBooking(hydrated, null, req) });
  } catch (error) {
    console.error('Cancel traveler booking error:', error);
    return res.status(500).json({ message: 'Unable to cancel this booking right now.' });
  }
};

export default {
  listTravelerBookings,
  listDriverBookings,
  driverRespondToBooking,
  updateTravelerBooking,
  cancelTravelerBooking,
};

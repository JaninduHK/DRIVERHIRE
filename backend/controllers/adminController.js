import fs from 'fs';
import path from 'path';
import { validationResult } from 'express-validator';
import User, { DRIVER_STATUS, USER_ROLES, LICENSE_STATUS } from '../models/User.js';
import Vehicle, { VEHICLE_STATUS, VEHICLE_AVAILABILITY_STATUS } from '../models/Vehicle.js';
import Booking, { BOOKING_STATUS, DEFAULT_COMMISSION_RATE } from '../models/Booking.js';
import Review from '../models/Review.js';
import TourBrief from '../models/TourBrief.js';
import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import DriverCommission, { COMMISSION_STATUS } from '../models/DriverCommission.js';
import { OBSERVE_THRESHOLDS } from '../services/abuseSignals.js';
import { getSetting, setSetting, SETTING_KEYS } from '../models/Setting.js';
import { DEFAULT_BANK_DETAILS } from '../config/bankDetailsDefaults.js';
import {
  sendDriverStatusEmail,
  sendDriverProfileCompletionEmail,
  sendVehicleStatusEmail,
  sendBookingStatusUpdateEmail,
  sendDriverAdminMessageEmail,
  sendPasswordChangedEmail,
} from '../services/emailService.js';
import { mapAssetUrls, buildAssetUrl } from '../utils/assetUtils.js';
import { anonymizeUser, findBlockingBookings } from '../services/accountDeletionService.js';
import DeletedDriverRecord from '../models/DeletedDriverRecord.js';
import { RETENTION_YEARS } from '../services/driverArchiveService.js';
import { closeBriefsForBooking, reopenBriefsForBooking } from '../utils/briefClosure.js';
import {
  findBlockingVehicleBookings,
  blockingBookingsMessage,
  softDeleteVehicle,
} from '../services/vehicleDeletionService.js';
import * as cloudinaryService from '../services/cloudinaryService.js';

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
};

const entryTimeValue = (value) => {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
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
  return Number.isNaN(date.getTime()) ? null : date;
};

const toVehicleResponse = (vehicle, req) => {
  if (!vehicle) return null;
  const payload = typeof vehicle.toJSON === 'function' ? vehicle.toJSON() : vehicle;
  payload.images = mapAssetUrls(payload.images, req);
  return payload;
};

const toId = (value) => {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value._id) {
    return value._id.toString();
  }
  if (value.id) {
    return value.id.toString();
  }
  if (typeof value.toString === 'function') {
    return value.toString();
  }
  return null;
};

const shapeVehicle = (vehicle, req) => {
  if (!vehicle) return null;
  return {
    id: toId(vehicle),
    model: vehicle.model,
    pricePerDay: vehicle.pricePerDay,
    images: mapAssetUrls(vehicle.images, req),
  };
};

const shapeDriver = (driver) => {
  if (!driver) return null;
  return {
    id: toId(driver),
    name: driver.name,
    email: driver.email,
    contactNumber: driver.contactNumber,
  };
};

const shapeBooking = (booking, req) => {
  const baseRate = Number.isFinite(booking.commissionBaseRate)
    ? booking.commissionBaseRate
    : booking.commissionRate;
  const gross = Number.isFinite(booking.totalPrice) ? booking.totalPrice : 0;
  const discountRate =
    Number.isFinite(booking.commissionDiscountRate) && booking.commissionDiscountRate > 0
      ? booking.commissionDiscountRate
      : 0;
  const discountAmount = Math.round(gross * discountRate * 100) / 100;
  const payableTotal =
    Number.isFinite(booking.payableTotal) && booking.payableTotal > 0
      ? booking.payableTotal
      : Math.max(gross - discountAmount, 0);
  const discountLabel = booking.commissionDiscountLabel || null;
  const discountId = booking.commissionDiscount
    ? toId(booking.commissionDiscount)
    : booking.commissionDiscountId || null;

  return {
    id: booking._id.toString(),
    status: booking.status,
    startDate: booking.startDate,
    endDate: booking.endDate,
    totalPrice: gross,
    payableTotal,
    discountAmount,
    totalDays: booking.totalDays,
    pricePerDay: booking.pricePerDay,
    commissionBaseRate: Number.isFinite(baseRate) ? baseRate : DEFAULT_COMMISSION_RATE,
    commissionRate: booking.commissionRate,
    commissionAmount: booking.commissionAmount,
    commissionDiscountRate: discountRate,
    commissionDiscountLabel: discountLabel,
    commissionDiscountId: discountId,
    driverEarnings: booking.driverEarnings,
    paymentNote: booking.paymentNote,
    specialRequests: booking.specialRequests,
    startPoint: booking.startPoint,
    endPoint: booking.endPoint,
    flightNumber: booking.flightNumber,
    arrivalTime: booking.arrivalTime,
    departureTime: booking.departureTime,
    traveler: booking.traveler,
    travelerUser: toId(booking.travelerUser),
    vehicle: shapeVehicle(booking.vehicle, req),
    driver: shapeDriver(booking.driver),
    offerId: booking.offerMessage?._id ? booking.offerMessage._id.toString() : null,
    offerStatus: booking.offerMessage?.offer?.status || null,
    conversationId: booking.offerMessage?.conversation
      ? toId(booking.offerMessage.conversation)
      : null,
    cancellationReason: booking.cancellationReason || '',
    cancelledAt: booking.cancelledAt || null,
    cancelledBy: booking.cancelledBy || null,
    reviewRequestSentAt: booking.reviewRequestSentAt || null,
    reviewSubmittedAt: booking.reviewSubmittedAt || null,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
};

const calculateTotalDays = (startDate, endDate) => {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const diff = Math.max(Math.round((endDate - startDate) / MS_PER_DAY), 0);
  return diff + 1;
};

const shapeBrief = (brief) => ({
  id: brief._id.toString(),
  traveler: brief.traveler
    ? {
        id: toId(brief.traveler),
        name: brief.traveler.name,
        email: brief.traveler.email,
      }
    : null,
  startDate: brief.startDate,
  endDate: brief.endDate,
  startLocation: brief.startLocation,
  endLocation: brief.endLocation,
  adults: brief.adults,
  children: brief.children,
  message: brief.message,
  country: brief.country,
  maxOffers: brief.maxOffers ?? null,
  requiredLicenseType: brief.requiredLicenseType ?? null,
  status: brief.status,
  offersCount: brief.offersCount ?? brief.responses.length,
  responses: (brief.responses || []).map((response) => ({
    driver: toId(response.driver),
    driverName: response.driver?.name || null,
    vehicle: toId(response.vehicle),
    vehicleModel: response.vehicle?.model || null,
    conversation: toId(response.conversation),
    message: toId(response.message),
    totalPrice: response.message?.offer?.totalPrice ?? null,
    currency: response.message?.offer?.currency || 'USD',
    offerStatus: response.message?.offer?.status || null,
    note: response.note,
    createdAt: response.createdAt,
  })),
  createdAt: brief.createdAt,
  updatedAt: brief.updatedAt,
  lastResponseAt: brief.lastResponseAt,
});

const shapeOffer = (message) => ({
  id: message._id.toString(),
  status: message.offer?.status || 'pending',
  startDate: message.offer?.startDate,
  endDate: message.offer?.endDate,
  totalPrice: message.offer?.totalPrice,
  totalKms: message.offer?.totalKms,
  pricePerExtraKm: message.offer?.pricePerExtraKm,
  currency: message.offer?.currency,
  vehicle: message.offer?.vehicle
    ? {
        id: toId(message.offer.vehicle),
        model: message.offer.vehicle.model,
      }
    : null,
  conversationId: toId(message.conversation),
  body: message.body,
  warning: message.warning,
  brief: message.offer?.brief
    ? {
        id: toId(message.offer.brief),
        status: message.offer.brief.status,
        startLocation: message.offer.brief.startLocation,
        endLocation: message.offer.brief.endLocation,
        startDate: message.offer.brief.startDate,
        endDate: message.offer.brief.endDate,
        country: message.offer.brief.country,
      }
    : null,
  driver: message.sender
    ? {
        id: toId(message.sender),
        name: message.sender.name,
        role: message.sender.role,
      }
    : null,
  traveler: message.conversation?.traveler
    ? {
        id: toId(message.conversation.traveler),
        name: message.conversation.traveler.name,
        email: message.conversation.traveler.email,
      }
    : null,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const shapeMessage = (message) => ({
  id: toId(message),
  body: message.body,
  type: message.type,
  senderRole: message.senderRole,
  warning: message.warning,
  violations: Array.isArray(message.violations) ? message.violations : [],
  readBy: Array.isArray(message.readBy) ? message.readBy.map((user) => toId(user)).filter(Boolean) : [],
  briefRequest: message.briefRequest
    ? {
        briefId: toId(message.briefRequest.brief),
        startLocation: message.briefRequest.startLocation,
        endLocation: message.briefRequest.endLocation,
        startDate: message.briefRequest.startDate,
        endDate: message.briefRequest.endDate,
        adults: message.briefRequest.adults,
        children: message.briefRequest.children,
        country: message.briefRequest.country,
        message: message.briefRequest.message,
      }
    : null,
  offer: message.offer
    ? {
        startDate: message.offer.startDate,
        endDate: message.offer.endDate,
        vehicle: message.offer.vehicle
          ? { id: toId(message.offer.vehicle), model: message.offer.vehicle.model || null }
          : null,
        totalPrice: message.offer.totalPrice,
        totalKms: message.offer.totalKms,
        pricePerExtraKm: message.offer.pricePerExtraKm,
        currency: message.offer.currency,
        status: message.offer.status,
      }
    : null,
  sender: message.sender
    ? {
        id: toId(message.sender),
        name: message.sender.name,
        role: message.sender.role,
      }
    : null,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
  offerReminderSentAt: message.offerReminderSentAt || null,
  offerViewTokenExpires: message.offerViewTokenExpires || null,
});

// Mirrors chatController.js's findConversationBooking, shaped as a read-only
// notice for admin (no traveller PII beyond what's already visible elsewhere).
const shapeConversationBooking = (booking) => {
  if (!booking) {
    return null;
  }
  return {
    id: booking._id.toString(),
    status: booking.status,
    startDate: booking.startDate,
    endDate: booking.endDate,
    vehicleModel: booking.vehicle?.model || null,
    totalPrice: booking.totalPrice,
    totalDays: booking.totalDays,
  };
};

// Batched equivalent for the conversation list: one query for every
// driver/traveller pair instead of one query per conversation.
const findConversationBookingsMap = async (conversations) => {
  const driverIds = conversations.map((c) => toId(c.driver)).filter(Boolean);
  const travelerIds = conversations.map((c) => toId(c.traveler)).filter(Boolean);
  if (driverIds.length === 0 || travelerIds.length === 0) {
    return new Map();
  }
  const bookings = await Booking.find({
    driver: { $in: driverIds },
    travelerUser: { $in: travelerIds },
    status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] },
  })
    .sort({ createdAt: -1 })
    .populate('vehicle', 'model')
    .lean();

  const map = new Map();
  for (const booking of bookings) {
    const key = `${booking.driver}:${booking.travelerUser}`;
    if (!map.has(key)) {
      map.set(key, shapeConversationBooking(booking));
    }
  }
  return map;
};

const shapeConversation = (conversation, messages = [], booking = null) => ({
  id: conversation._id.toString(),
  traveler: conversation.traveler
    ? {
        id: toId(conversation.traveler),
        name: conversation.traveler.name,
        email: conversation.traveler.email,
      }
    : null,
  driver: conversation.driver
    ? {
        id: toId(conversation.driver),
        name: conversation.driver.name,
        email: conversation.driver.email,
      }
    : null,
  vehicle: conversation.vehicle ? { id: toId(conversation.vehicle), model: conversation.vehicle.model } : null,
  status: conversation.status,
  travelerUnreadCount: conversation.travelerUnreadCount,
  driverUnreadCount: conversation.driverUnreadCount,
  lastMessageAt: conversation.lastMessageAt,
  lastMessage: conversation.lastMessage
    ? {
        id: toId(conversation.lastMessage),
        body: conversation.lastMessage.body,
        type: conversation.lastMessage.type,
        createdAt: conversation.lastMessage.createdAt,
      }
    : null,
  createdAt: conversation.createdAt,
  updatedAt: conversation.updatedAt,
  booking,
  messages: messages.map((message) => shapeMessage(message)),
});

const refreshConversationMetadata = async (conversationId) => {
  if (!conversationId) {
    return;
  }
  const latestMessage = await ChatMessage.findOne({ conversation: conversationId })
    .sort({ createdAt: -1 })
    .select('_id createdAt');

  await ChatConversation.findByIdAndUpdate(conversationId, {
    lastMessage: latestMessage ? latestMessage._id : null,
    lastMessageAt: latestMessage ? latestMessage.createdAt : null,
  });
};

export const getDriverApplications = async (req, res) => {
  try {
    const drivers = await User.find({ role: USER_ROLES.DRIVER }).sort({ createdAt: -1 });
    return res.json({
      drivers: drivers.map((driver) => {
        const payload = driver.toJSON();
        payload.profilePhoto = buildAssetUrl(payload.profilePhoto, req);
        payload.licenseImage = buildAssetUrl(payload.licenseImage, req);
        payload.memberSince = payload.memberSince || payload.createdAt;
        return payload;
      }),
    });
  } catch (error) {
    console.error('Fetch driver applications error:', error);
    return res.status(500).json({ message: 'Unable to fetch driver applications' });
  }
};

const driverActivityEntry = (type, title, timestamp, metadata = {}) => {
  if (!timestamp) return null;
  return { type, title, timestamp, metadata };
};

// A single admin-facing record for a driver. The response deliberately uses an
// allow-list rather than returning the User document wholesale: authentication
// tokens, provider identifiers and device push tokens must never reach this UI.
export const getDriverDetails = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  try {
    const driver = await User.findOne({ _id: id, role: USER_ROLES.DRIVER })
      .populate('driverReviewedBy', 'name email')
      .populate('licenseReviewedBy', 'name email');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    const [vehicles, bookings, conversations, offers, reviews, commissions] = await Promise.all([
      Vehicle.find({ driver: id, deletedAt: null }).sort({ createdAt: -1 }),
      Booking.find({ driver: id })
        .sort({ createdAt: -1 })
        .populate('vehicle', 'model year pricePerDay images')
        .populate('driver', 'name email contactNumber')
        .populate({ path: 'offerMessage', select: 'offer conversation' }),
      ChatConversation.find({ driver: id })
        .sort({ lastMessageAt: -1 })
        .populate('traveler', 'name email')
        .populate('driver', 'name email')
        .populate('vehicle', 'model')
        .populate('lastMessage', 'body type createdAt'),
      ChatMessage.find({ sender: id, type: 'offer' })
        .sort({ createdAt: -1 })
        .populate('sender', 'name role email')
        .populate('offer.vehicle', 'model')
        .populate('offer.brief', 'status startLocation endLocation')
        .populate({
          path: 'conversation',
          populate: [
            { path: 'traveler', select: 'name email' },
            { path: 'driver', select: 'name email' },
          ],
        }),
      Review.find({ driver: id })
        .sort({ createdAt: -1 })
        .populate('vehicle', 'model year')
        .populate('travelerUser', 'name email'),
      DriverCommission.find({ driver: id })
        .sort({ year: -1, month: -1 })
        .populate('driver', 'name email contactNumber'),
    ]);

    const conversationIds = conversations.map((conversation) => conversation._id);
    const driverMessages = conversationIds.length
      ? await ChatMessage.find({ conversation: { $in: conversationIds }, sender: id })
          .sort({ createdAt: -1 })
          .populate('sender', 'name role')
          .populate('offer.vehicle', 'model')
      : [];

    const messagesByConversation = new Map();
    driverMessages.forEach((message) => {
      const key = message.conversation.toString();
      if (!messagesByConversation.has(key)) messagesByConversation.set(key, []);
      messagesByConversation.get(key).push(message);
    });

    const shapedVehicles = vehicles.map((vehicle) => toVehicleResponse(vehicle, req));
    const shapedBookings = bookings.map((booking) => shapeBooking(booking, req));
    const shapedOffers = offers.map((offer) => shapeOffer(offer));
    const shapedConversations = conversations.map((conversation) =>
      shapeConversation(
        conversation,
        messagesByConversation.get(conversation._id.toString()) || [],
        null
      )
    );
    const shapedReviews = reviews.map((review) => {
      const json = review.toJSON();
      return {
        ...json,
        vehicle: review.vehicle
          ? { id: toId(review.vehicle), model: review.vehicle.model, year: review.vehicle.year }
          : null,
        traveler: review.travelerUser
          ? { id: toId(review.travelerUser), name: review.travelerUser.name, email: review.travelerUser.email }
          : null,
        images: mapAssetUrls(review.images, req),
      };
    });
    const shapedCommissions = commissions.map((commission) => shapeCommission(commission, req));

    const now = new Date();
    const completedBookings = bookings.filter(
      (booking) => booking.status === BOOKING_STATUS.CONFIRMED && booking.endDate < now
    );
    const upcomingBookings = bookings.filter(
      (booking) =>
        [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status) &&
        booking.endDate >= now
    );
    const approvedReviews = reviews.filter((review) => review.status === 'approved');
    const averageRating = approvedReviews.length
      ? Math.round(
          (approvedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
            approvedReviews.length) *
            10
        ) / 10
      : 0;

    const activity = [
      driverActivityEntry('account', 'Driver account created', driver.createdAt),
      driverActivityEntry('account', `Driver application ${driver.driverStatus || 'updated'}`, driver.driverReviewedAt, {
        status: driver.driverStatus,
        actor: driver.driverReviewedBy?.name || null,
      }),
      driverActivityEntry('account', 'Driver approved', driver.driverApprovedAt),
      driverActivityEntry('profile', 'Profile onboarding completed', driver.driverProfileTourCompletedAt),
      driverActivityEntry('profile', 'Driver record updated', driver.updatedAt),
      driverActivityEntry('location', 'Live location updated', driver.driverLocation?.updatedAt, {
        label: driver.driverLocation?.label || null,
      }),
      driverActivityEntry('license', 'License submitted', driver.licenseSubmittedAt, { status: driver.licenseStatus }),
      driverActivityEntry('license', `License ${driver.licenseStatus || 'reviewed'}`, driver.licenseReviewedAt, {
        status: driver.licenseStatus,
        actor: driver.licenseReviewedBy?.name || null,
      }),
      ...vehicles.flatMap((vehicle) => [
        driverActivityEntry('vehicle', `Vehicle added: ${vehicle.model}`, vehicle.createdAt, {
          recordId: vehicle._id.toString(),
          status: vehicle.status,
        }),
        driverActivityEntry('vehicle', `Vehicle ${vehicle.status}`, vehicle.reviewedAt, {
          recordId: vehicle._id.toString(),
          status: vehicle.status,
        }),
        ...(vehicle.availability || []).flatMap((entry) => [
          driverActivityEntry('availability', `Vehicle availability set to ${entry.status}`, entry.createdAt, {
            recordId: entry._id?.toString?.() || null,
            vehicleId: vehicle._id.toString(),
            status: entry.status,
          }),
          entry.updatedAt && entry.createdAt && entry.updatedAt.getTime() !== entry.createdAt.getTime()
            ? driverActivityEntry('availability', 'Vehicle availability updated', entry.updatedAt, {
                recordId: entry._id?.toString?.() || null,
                vehicleId: vehicle._id.toString(),
                status: entry.status,
              })
            : null,
        ]),
      ]),
      ...bookings.flatMap((booking) => [
        driverActivityEntry('booking', `Booking created with ${booking.traveler?.fullName || 'traveller'}`, booking.createdAt, {
          recordId: booking._id.toString(),
          status: booking.status,
        }),
        driverActivityEntry('booking', `Booking cancelled by ${booking.cancelledBy || 'unknown'}`, booking.cancelledAt, {
          recordId: booking._id.toString(),
          status: booking.status,
        }),
        driverActivityEntry('review', 'Review submitted for booking', booking.reviewSubmittedAt, {
          recordId: booking._id.toString(),
        }),
      ]),
      ...driverMessages.map((message) =>
        driverActivityEntry(
          message.type === 'offer' ? 'offer' : 'message',
          message.type === 'offer' ? 'Offer sent' : 'Message sent',
          message.createdAt,
          {
            recordId: message._id.toString(),
            conversationId: message.conversation.toString(),
            status: message.offer?.status || null,
            warning: message.warning || null,
          }
        )
      ),
      ...conversations.map((conversation) =>
        driverActivityEntry('conversation', `Conversation opened with ${conversation.traveler?.name || 'traveller'}`, conversation.createdAt, {
          recordId: conversation._id.toString(),
          status: conversation.status,
        })
      ),
      ...reviews.flatMap((review) => [
        driverActivityEntry('review', `Review received (${review.rating}/5)`, review.createdAt, {
          recordId: review._id.toString(),
          status: review.status,
        }),
        driverActivityEntry('review', 'Review published', review.publishedAt, {
          recordId: review._id.toString(),
          status: review.status,
        }),
      ]),
      ...commissions.flatMap((commission) => [
        driverActivityEntry('payment', `Payment slip uploaded for ${MONTH_NAMES[commission.month - 1]} ${commission.year}`, commission.paymentSlipUploadedAt, {
          recordId: commission._id.toString(),
          status: commission.status,
        }),
        driverActivityEntry('payment', `Commission record ${commission.status}`, commission.updatedAt, {
          recordId: commission._id.toString(),
          status: commission.status,
        }),
      ]),
    ]
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const driverPayload = {
      id: driver._id.toString(),
      name: driver.name,
      email: driver.email,
      contactNumber: driver.contactNumber || '',
      address: driver.address || '',
      description: driver.description || '',
      tripAdvisor: driver.tripAdvisor || '',
      experienceYears: driver.experienceYears,
      memberSince: driver.memberSince || driver.createdAt,
      profilePhoto: buildAssetUrl(driver.profilePhoto, req),
      role: driver.role,
      authProvider: driver.authProvider,
      isVerified: Boolean(driver.isVerified),
      driverStatus: driver.driverStatus,
      driverReviewedAt: driver.driverReviewedAt,
      driverReviewedBy: driver.driverReviewedBy
        ? { id: toId(driver.driverReviewedBy), name: driver.driverReviewedBy.name, email: driver.driverReviewedBy.email }
        : null,
      driverApprovedAt: driver.driverApprovedAt,
      driverProfileTourCompletedAt: driver.driverProfileTourCompletedAt,
      featured: Boolean(driver.featured),
      featuredOrder: driver.featuredOrder,
      shareLiveLocation: driver.shareLiveLocation !== false,
      driverLocation: driver.driverLocation || null,
      messagingSuspendedUntil: driver.messagingSuspendedUntil,
      suspensionReason: driver.suspensionReason || '',
      licenseType: driver.licenseType,
      licenseImage: buildAssetUrl(driver.licenseImage, req),
      licenseStatus: driver.licenseStatus || null,
      licenseSubmittedAt: driver.licenseSubmittedAt,
      licenseReviewedAt: driver.licenseReviewedAt,
      licenseReviewedBy: driver.licenseReviewedBy
        ? { id: toId(driver.licenseReviewedBy), name: driver.licenseReviewedBy.name, email: driver.licenseReviewedBy.email }
        : null,
      licenseAdminNote: driver.licenseAdminNote || '',
      deletedAt: driver.deletedAt,
      createdAt: driver.createdAt,
      updatedAt: driver.updatedAt,
    };

    return res.json({
      driver: driverPayload,
      summary: {
        completedTrips: completedBookings.length,
        upcomingTrips: upcomingBookings.length,
        bookingCount: bookings.length,
        offerCount: offers.length,
        conversationCount: conversations.length,
        messageCount: driverMessages.length,
        vehicleCount: vehicles.length,
        reviewCount: approvedReviews.length,
        averageRating,
        totalGross: roundMoney(bookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0)),
        totalEarnings: roundMoney(bookings.reduce((sum, booking) => sum + Number(booking.driverEarnings || 0), 0)),
      },
      vehicles: shapedVehicles,
      bookings: shapedBookings,
      offers: shapedOffers,
      conversations: shapedConversations,
      reviews: shapedReviews,
      commissions: shapedCommissions,
      activity,
    });
  } catch (error) {
    console.error('Fetch driver details error:', error);
    return res.status(500).json({ message: 'Unable to load driver details.' });
  }
};

// Admin picks which drivers front the homepage strip. Mirrors setReviewFeatured:
// featuring appends to the end of the running order so existing picks keep theirs.
export const setDriverFeatured = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const { featured } = req.body || {};

  try {
    const driver = await User.findOne({ _id: id, role: USER_ROLES.DRIVER });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }
    // Featuring an unapproved driver would surface them publicly on the homepage.
    if (featured && driver.driverStatus !== DRIVER_STATUS.APPROVED) {
      return res.status(400).json({ message: 'Only approved drivers can be featured on the homepage.' });
    }

    if (featured) {
      const highest = await User.findOne({ role: USER_ROLES.DRIVER, featured: true })
        .sort({ featuredOrder: -1 })
        .select('featuredOrder');
      driver.featured = true;
      driver.featuredOrder = (highest?.featuredOrder ?? -1) + 1;
    } else {
      driver.featured = false;
      driver.featuredOrder = null;
    }

    await driver.save();
    return res.json({ driver: driver.toJSON() });
  } catch (error) {
    console.error('Set driver featured error:', error);
    return res.status(500).json({ message: 'Unable to update homepage picks.' });
  }
};

// Persists a reorder of the featured drivers. Body: { orderedIds: [...] } — every id
// must already be featured; their featuredOrder is rewritten 0..n-1 in that order.
export const reorderFeaturedDrivers = async (req, res) => {
  const orderedIds = Array.isArray(req.body?.orderedIds) ? req.body.orderedIds : [];
  if (!orderedIds.length) {
    return res.status(400).json({ message: 'Provide a non-empty list of driver ids.' });
  }

  try {
    const count = await User.countDocuments({
      _id: { $in: orderedIds },
      role: USER_ROLES.DRIVER,
      featured: true,
    });
    if (count !== orderedIds.length) {
      return res.status(400).json({ message: 'All drivers being reordered must already be featured.' });
    }

    await User.bulkWrite(
      orderedIds.map((driverId, index) => ({
        updateOne: { filter: { _id: driverId }, update: { $set: { featuredOrder: index } } },
      }))
    );

    return res.json({ message: 'Homepage picks reordered.' });
  } catch (error) {
    console.error('Reorder featured drivers error:', error);
    return res.status(500).json({ message: 'Unable to reorder homepage picks.' });
  }
};

export const updateDriverStatus = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const { status } = req.body;

  try {
    const driver = await User.findOne({ _id: id, role: USER_ROLES.DRIVER });

    if (!driver) {
      return res.status(404).json({ message: 'Driver application not found' });
    }

    if (!Object.values(DRIVER_STATUS).includes(status)) {
      return res.status(400).json({ message: 'Invalid driver status' });
    }

    const previousStatus = driver.driverStatus;
    const now = new Date();
    driver.driverStatus = status;
    driver.driverReviewedAt = now;
    driver.driverReviewedBy = req.user.id;
    if (status === DRIVER_STATUS.APPROVED && previousStatus !== DRIVER_STATUS.APPROVED) {
      driver.driverApprovedAt = now;
      driver.driverProfileTourCompletedAt = undefined;
    }
    // A deleted (anonymized) driver has its passwordHash cleared while authProvider
    // stays 'local', which would trip full-document validation on save. We only
    // change status fields here and the status itself is already route-validated,
    // so skip document validation to keep status changes working for any account.
    await driver.save({ validateBeforeSave: false });

    if (driver.email) {
      sendDriverStatusEmail({
        driver: { name: driver.name, email: driver.email },
        status,
      }).catch((error) => console.warn('Driver status email failed:', error));

      if (status === DRIVER_STATUS.APPROVED && previousStatus !== DRIVER_STATUS.APPROVED) {
        sendDriverProfileCompletionEmail({
          driver: { name: driver.name, email: driver.email },
        }).catch((error) => console.warn('Driver profile completion email failed:', error));
      }
    }

    return res.json({ driver: driver.toJSON() });
  } catch (error) {
    console.error('Update driver status error:', error);
    return res.status(500).json({ message: 'Unable to update driver status' });
  }
};

export const listLicenseSubmissions = async (req, res) => {
  const { status } = req.query;
  const filters = { role: USER_ROLES.DRIVER, licenseStatus: { $exists: true } };
  if (status && Object.values(LICENSE_STATUS).includes(status)) {
    filters.licenseStatus = status;
  }

  try {
    const drivers = await User.find(filters)
      .select(
        'name email contactNumber profilePhoto licenseType licenseImage licenseStatus licenseSubmittedAt licenseReviewedAt licenseReviewedBy licenseAdminNote'
      )
      .populate({ path: 'licenseReviewedBy', select: 'name' })
      .sort({ licenseSubmittedAt: -1 });

    const licenses = drivers.map((driver) => {
      const json = driver.toJSON();
      return {
        driverId: json.id,
        driverName: json.name,
        driverEmail: json.email,
        driverContactNumber: json.contactNumber || '',
        driverPhoto: json.profilePhoto ? buildAssetUrl(json.profilePhoto, req) : '',
        licenseType: json.licenseType,
        licenseImage: json.licenseImage ? buildAssetUrl(json.licenseImage, req) : '',
        status: json.licenseStatus,
        submittedAt: json.licenseSubmittedAt,
        reviewedAt: json.licenseReviewedAt,
        reviewedBy: json.licenseReviewedBy?.name || null,
        adminNote: json.licenseAdminNote || '',
      };
    });

    const countsAgg = await User.aggregate([
      { $match: { role: USER_ROLES.DRIVER, licenseStatus: { $exists: true } } },
      { $group: { _id: '$licenseStatus', count: { $sum: 1 } } },
    ]);
    const counts = { pending: 0, approved: 0, rejected: 0, total: 0 };
    countsAgg.forEach((row) => {
      if (counts[row._id] !== undefined) counts[row._id] = row.count;
      counts.total += row.count;
    });

    return res.json({ licenses, meta: { total: licenses.length, status: status || 'all', counts } });
  } catch (error) {
    console.error('List license submissions error:', error);
    return res.status(500).json({ message: 'Unable to load license submissions.' });
  }
};

export const updateLicenseStatus = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const { status, adminNote } = req.body;

  try {
    const driver = await User.findOne({ _id: id, role: USER_ROLES.DRIVER });
    if (!driver || !driver.licenseStatus) {
      return res.status(404).json({ message: 'License submission not found' });
    }

    driver.licenseStatus = status;
    driver.licenseReviewedAt = new Date();
    driver.licenseReviewedBy = req.user.id;
    driver.licenseAdminNote = status === LICENSE_STATUS.REJECTED && adminNote ? adminNote.trim() : undefined;

    await driver.save({ validateBeforeSave: false });
    await driver.populate({ path: 'licenseReviewedBy', select: 'name' });

    return res.json({
      message: status === LICENSE_STATUS.APPROVED ? 'License approved.' : 'License rejected.',
      driver: driver.toJSON(),
    });
  } catch (error) {
    console.error('Update license status error:', error);
    return res.status(500).json({ message: 'Unable to update license status.' });
  }
};

export const updateDriverDetails = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const {
    name,
    email,
    contactNumber,
    description,
    tripAdvisor,
    address,
    experienceYears,
    memberSince,
  } = req.body;

  try {
    const driver = await User.findOne({ _id: id, role: USER_ROLES.DRIVER });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    driver.name = name.trim();
    driver.email = email.trim().toLowerCase();
    driver.contactNumber = contactNumber?.trim() || undefined;
    driver.description = description?.trim() || undefined;
    driver.tripAdvisor = tripAdvisor?.trim() || undefined;
    driver.address = address?.trim() || undefined;
    driver.experienceYears = experienceYears === '' || experienceYears === undefined ? undefined : experienceYears;

    if (memberSince) {
      const parsedMemberSince = new Date(memberSince);
      if (Number.isNaN(parsedMemberSince.getTime())) {
        return res.status(400).json({ message: 'Member since date is invalid.' });
      }
      if (parsedMemberSince.getTime() > Date.now()) {
        return res.status(400).json({ message: 'Member since date cannot be in the future.' });
      }
      driver.memberSince = parsedMemberSince;
    }

    await driver.save();

    return res.json({ driver: driver.toJSON() });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Another account already uses that email address.' });
    }
    console.error('Update driver details error:', error);
    return res.status(500).json({ message: 'Unable to update driver details' });
  }
};

export const sendDriverDirectMessage = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const { subject, message } = req.body;

  try {
    const driver = await User.findOne({ _id: id, role: USER_ROLES.DRIVER });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    if (!driver.email) {
      return res.status(400).json({ message: 'Driver does not have an email address on file' });
    }

    await sendDriverAdminMessageEmail({
      driver: { name: driver.name, email: driver.email },
      subject,
      message,
      sender: { name: req.user?.name, email: req.user?.email },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Admin driver message error:', error);
    return res.status(500).json({ message: 'Unable to send email to driver' });
  }
};

// Admin override for a driver's login password — e.g. a driver locked out with no
// working email access. Unlike the driver's own change-password flow, this doesn't
// require the current password; the driver is emailed a notice either way so a
// change they didn't make (or forgot happened) doesn't go unnoticed.
export const setDriverPassword = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const { password } = req.body;

  try {
    const driver = await User.findOne({ _id: id, role: USER_ROLES.DRIVER });

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    await driver.setPassword(password);
    await driver.save();

    if (driver.email) {
      sendPasswordChangedEmail({ to: driver.email, name: driver.name }).catch((error) =>
        console.warn('Password-changed notification email failed:', error)
      );
    }

    return res.json({ message: 'Driver password updated.' });
  } catch (error) {
    console.error('Admin set driver password error:', error);
    return res.status(500).json({ message: 'Unable to update driver password' });
  }
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const clampCommissionRate = (value) => {
  if (!Number.isFinite(value)) return DEFAULT_COMMISSION_RATE;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
};

const roundMoney = (value) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const roundCommissionRate = (value) => Math.round((Number.isFinite(value) ? value : 0) * 10000) / 10000;

// Same fallback formula the driver-facing earnings summary uses, so the two
// views can never disagree on what a booking owes in commission.
const summariseBookingForCommission = (booking) => {
  const rate = clampCommissionRate(booking.commissionRate);
  const gross = Number.isFinite(booking.payableTotal) && booking.payableTotal > 0
    ? booking.payableTotal
    : Number.isFinite(booking.totalPrice)
      ? booking.totalPrice
      : 0;
  const commissionAmount = Number.isFinite(booking.commissionAmount) && booking.commissionAmount >= 0
    ? booking.commissionAmount
    : roundMoney(gross * rate);
  const driverEarnings = Number.isFinite(booking.driverEarnings) && booking.driverEarnings >= 0
    ? booking.driverEarnings
    : roundMoney(gross - commissionAmount);
  return { gross, commissionAmount, driverEarnings };
};

// A booking only becomes a payment obligation once the tour has actually
// happened — so `completedEnd` caps the query window at "now" for the current
// (or a future) month, meaning a booking scheduled for later this month won't
// show up until its end date has actually passed.
const getPeriodRange = (year, month) => {
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const now = new Date();
  const completedEnd = periodEnd < now ? periodEnd : now;
  return { periodStart, periodEnd, completedEnd };
};

const parseYearMonth = (yearInput, monthInput) => {
  const now = new Date();
  const year = Number.isFinite(Number(yearInput)) && yearInput !== undefined ? Number(yearInput) : now.getUTCFullYear();
  const month = Number.isFinite(Number(monthInput)) && monthInput !== undefined ? Number(monthInput) : now.getUTCMonth() + 1;
  if (!Number.isInteger(year) || year < 2000 || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
};

// Recompute a single driver's totals for one period straight from their
// completed (ended) confirmed bookings — used when admin acts on a driver's
// payment before that driver has ever opened their own earnings page.
const computeDriverPeriodTotals = async (driverId, year, month) => {
  const { periodStart, completedEnd } = getPeriodRange(year, month);
  const bookings = await Booking.find({
    driver: driverId,
    status: BOOKING_STATUS.CONFIRMED,
    endDate: { $gte: periodStart, $lte: completedEnd },
  });

  let totalGross = 0;
  let totalCommission = 0;
  let totalDriverEarnings = 0;
  for (const booking of bookings) {
    const { gross, commissionAmount, driverEarnings } = summariseBookingForCommission(booking);
    totalGross += gross;
    totalCommission += commissionAmount;
    totalDriverEarnings += driverEarnings;
  }

  return {
    bookingCount: bookings.length,
    totalGross: roundMoney(totalGross),
    commissionDue: roundMoney(totalCommission),
    driverEarnings: roundMoney(totalDriverEarnings),
    commissionRate: totalGross > 0 ? roundCommissionRate(totalCommission / totalGross) : DEFAULT_COMMISSION_RATE,
  };
};

const shapeCommission = (record, req) => ({
  id: record._id.toString(),
  driverId: toId(record.driver),
  driver: record.driver
    ? {
        id: toId(record.driver),
        name: record.driver.name,
        email: record.driver.email,
        contactNumber: record.driver.contactNumber,
      }
    : null,
  year: record.year,
  month: record.month,
  periodLabel: `${MONTH_NAMES[record.month - 1]} ${record.year}`,
  bookingCount: record.bookingCount,
  totalGross: record.totalGross,
  commissionRate: record.commissionRate,
  commissionDue: record.commissionDue,
  driverEarnings: record.driverEarnings,
  status: record.status,
  paymentSlipUrl: buildAssetUrl(record.paymentSlipUrl, req),
  paymentSlipFilename: record.paymentSlipFilename,
  paymentSlipUploadedAt: record.paymentSlipUploadedAt,
  adminNote: record.adminNote,
  lastRecalculatedAt: record.lastRecalculatedAt,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

// A driver whose payment was never viewed/submitted by them yet — no
// DriverCommission row exists — still needs to show up the moment their tour
// ends, so this shapes a "virtual" entry straight from live booking totals.
const shapeVirtualCommission = (driver, year, month, totals) => ({
  id: null,
  driverId: toId(driver),
  driver: { id: toId(driver), name: driver.name, email: driver.email, contactNumber: driver.contactNumber },
  year,
  month,
  periodLabel: `${MONTH_NAMES[month - 1]} ${year}`,
  bookingCount: totals.bookingCount,
  totalGross: totals.totalGross,
  commissionRate: totals.commissionRate,
  commissionDue: totals.commissionDue,
  driverEarnings: totals.driverEarnings,
  status: COMMISSION_STATUS.PENDING,
  paymentSlipUrl: null,
  paymentSlipFilename: null,
  paymentSlipUploadedAt: null,
  adminNote: null,
  lastRecalculatedAt: null,
  createdAt: null,
  updatedAt: null,
});

export const listDriverCommissions = async (req, res) => {
  const period = parseYearMonth(req.query.year, req.query.month);
  if (!period) {
    return res.status(400).json({ message: 'Provide a valid year and month.' });
  }
  const { year, month } = period;

  try {
    const { periodStart, completedEnd } = getPeriodRange(year, month);

    const bookings = await Booking.find({
      status: BOOKING_STATUS.CONFIRMED,
      endDate: { $gte: periodStart, $lte: completedEnd },
    }).populate('driver', 'name email contactNumber');

    const byDriver = new Map();
    for (const booking of bookings) {
      if (!booking.driver) continue;
      const driverId = booking.driver._id.toString();
      const { gross, commissionAmount, driverEarnings } = summariseBookingForCommission(booking);
      if (!byDriver.has(driverId)) {
        byDriver.set(driverId, { driver: booking.driver, bookingCount: 0, totalGross: 0, totalCommission: 0, totalDriverEarnings: 0 });
      }
      const entry = byDriver.get(driverId);
      entry.bookingCount += 1;
      entry.totalGross += gross;
      entry.totalCommission += commissionAmount;
      entry.totalDriverEarnings += driverEarnings;
    }

    const driverIds = Array.from(byDriver.keys());
    const existingRecords = await DriverCommission.find({ year, month, driver: { $in: driverIds } });
    const recordsByDriver = new Map(existingRecords.map((record) => [record.driver.toString(), record]));

    const results = [];
    for (const [driverId, entry] of byDriver.entries()) {
      const record = recordsByDriver.get(driverId);
      const totals = {
        bookingCount: entry.bookingCount,
        totalGross: roundMoney(entry.totalGross),
        commissionDue: roundMoney(entry.totalCommission),
        driverEarnings: roundMoney(entry.totalDriverEarnings),
        commissionRate: entry.totalGross > 0 ? roundCommissionRate(entry.totalCommission / entry.totalGross) : DEFAULT_COMMISSION_RATE,
      };
      if (record) {
        // Keep the persisted record's admin-facing fields (status/slip/note),
        // but always surface freshly computed totals in case bookings changed.
        record.bookingCount = totals.bookingCount;
        record.totalGross = totals.totalGross;
        record.commissionDue = totals.commissionDue;
        record.driverEarnings = totals.driverEarnings;
        record.commissionRate = totals.commissionRate;
        record.driver = entry.driver;
        results.push(shapeCommission(record, req));
      } else if (totals.commissionDue > 0) {
        // No persisted record and nothing actually owed (e.g. a fully
        // discounted booking) — this driver isn't "awaiting payment", so
        // don't manufacture a pending entry for them.
        results.push(shapeVirtualCommission(entry.driver, year, month, totals));
      }
    }

    // Surface previously-submitted/approved records for this period even if
    // their driver has no matching bookings right now (e.g. a booking was
    // edited or cancelled after the driver already uploaded proof), so admin
    // history doesn't silently disappear.
    const orphanRecords = await DriverCommission.find({ year, month, driver: { $nin: driverIds } }).populate('driver', 'name email contactNumber');
    for (const record of orphanRecords) {
      if (!record.driver) continue;
      // The driver-facing earnings page writes a record whenever it is opened, so a
      // driver with no bookings this period leaves behind an empty pending row. Only
      // surface a bookingless record when it actually carries something to act on.
      const hasMoneyDue = Number(record.commissionDue) > 0;
      const hasProof = Boolean(record.paymentSlipUrl);
      const wasActioned = record.status !== COMMISSION_STATUS.PENDING;
      if (!hasMoneyDue && !hasProof && !wasActioned) continue;
      results.push(shapeCommission(record, req));
    }

    results.sort((a, b) => (a.driver?.name || '').localeCompare(b.driver?.name || ''));

    return res.json({ commissions: results, period: { year, month, label: `${MONTH_NAMES[month - 1]} ${year}` } });
  } catch (error) {
    console.error('List driver commissions error:', error);
    return res.status(500).json({ message: 'Unable to load driver commissions.' });
  }
};

// The individual confirmed bookings behind a driver's commission total for
// one period — powers the admin payments row's "view bookings" expansion.
export const listDriverCommissionBookings = async (req, res) => {
  const { driverId, year: yearParam, month: monthParam } = req.params;
  const period = parseYearMonth(yearParam, monthParam);
  if (!period) {
    return res.status(400).json({ message: 'Provide a valid year and month.' });
  }
  const { year, month } = period;

  try {
    const driver = await User.findOne({ _id: driverId, role: USER_ROLES.DRIVER });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    const { periodStart, completedEnd } = getPeriodRange(year, month);
    const bookings = await Booking.find({
      driver: driverId,
      status: BOOKING_STATUS.CONFIRMED,
      endDate: { $gte: periodStart, $lte: completedEnd },
    })
      .populate('vehicle', 'model year')
      .sort({ endDate: 1 });

    const results = bookings.map((booking) => {
      const { gross, commissionAmount, driverEarnings } = summariseBookingForCommission(booking);
      return {
        id: booking._id.toString(),
        startDate: booking.startDate,
        endDate: booking.endDate,
        startPoint: booking.startPoint,
        endPoint: booking.endPoint,
        travelerName: booking.traveler?.fullName || 'Traveller',
        vehicle: booking.vehicle
          ? { id: booking.vehicle._id.toString(), model: booking.vehicle.model, year: booking.vehicle.year }
          : null,
        totalGross: roundMoney(gross),
        commissionRate: clampCommissionRate(booking.commissionRate),
        commissionAmount: roundMoney(commissionAmount),
        driverEarnings: roundMoney(driverEarnings),
      };
    });

    return res.json({ bookings: results, period: { year, month, label: `${MONTH_NAMES[month - 1]} ${year}` } });
  } catch (error) {
    console.error('List driver commission bookings error:', error);
    return res.status(500).json({ message: 'Unable to load bookings for this period.' });
  }
};

export const updateDriverCommissionStatus = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { driverId, year: yearParam, month: monthParam } = req.params;
  const { status, adminNote } = req.body;
  const year = Number(yearParam);
  const month = Number(monthParam);

  try {
    const driver = await User.findOne({ _id: driverId, role: USER_ROLES.DRIVER });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    let commission = await DriverCommission.findOne({ driver: driverId, year, month });

    if (!commission) {
      const totals = await computeDriverPeriodTotals(driverId, year, month);
      commission = new DriverCommission({ driver: driverId, year, month });
      commission.bookingCount = totals.bookingCount;
      commission.totalGross = totals.totalGross;
      commission.commissionDue = totals.commissionDue;
      commission.driverEarnings = totals.driverEarnings;
      commission.commissionRate = totals.commissionRate;
      commission.lastRecalculatedAt = new Date();
    }

    commission.status = status;
    commission.adminNote = adminNote?.trim() || undefined;
    await commission.save();
    commission.driver = driver;

    return res.json({ commission: shapeCommission(commission, req) });
  } catch (error) {
    console.error('Update driver commission status error:', error);
    return res.status(500).json({ message: 'Unable to update commission status.' });
  }
};

export const getVehicleSubmissions = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ deletedAt: null }).populate(
      'driver',
      'name email contactNumber address'
    );

    return res.json({
      vehicles: vehicles.map((vehicle) => toVehicleResponse(vehicle, req)),
    });
  } catch (error) {
    console.error('Fetch vehicle submissions error:', error);
    return res.status(500).json({ message: 'Unable to fetch vehicle submissions' });
  }
};

// Complete admin record for one vehicle, including its marketplace history and
// every persisted timestamp. Related user documents are explicitly field-limited
// so the response cannot expose authentication data.
export const getVehicleDetails = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  try {
    const vehicle = await Vehicle.findById(id)
      .populate('driver', 'name email contactNumber address profilePhoto driverStatus licenseType licenseStatus createdAt memberSince')
      .populate('reviewedBy', 'name email');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found.' });
    }

    const [bookings, reviews, conversations, offers] = await Promise.all([
      Booking.find({ vehicle: id })
        .sort({ createdAt: -1 })
        .populate('vehicle', 'model year pricePerDay images')
        .populate('driver', 'name email contactNumber')
        .populate({ path: 'offerMessage', select: 'offer conversation' }),
      Review.find({ vehicle: id })
        .sort({ createdAt: -1 })
        .populate('driver', 'name email')
        .populate('travelerUser', 'name email'),
      ChatConversation.find({ vehicle: id })
        .sort({ lastMessageAt: -1 })
        .populate('traveler', 'name email')
        .populate('driver', 'name email')
        .populate('vehicle', 'model')
        .populate('lastMessage', 'body type createdAt'),
      ChatMessage.find({ type: 'offer', 'offer.vehicle': id })
        .sort({ createdAt: -1 })
        .populate('sender', 'name role email')
        .populate('offer.vehicle', 'model')
        .populate('offer.brief', 'status startLocation endLocation')
        .populate({
          path: 'conversation',
          populate: [
            { path: 'traveler', select: 'name email' },
            { path: 'driver', select: 'name email' },
          ],
        }),
    ]);

    const conversationIds = conversations.map((conversation) => conversation._id);
    const messages = conversationIds.length
      ? await ChatMessage.find({ conversation: { $in: conversationIds } })
          .sort({ createdAt: 1 })
          .populate('sender', 'name role')
          .populate('offer.vehicle', 'model')
      : [];

    const messagesByConversation = new Map();
    messages.forEach((message) => {
      const key = message.conversation.toString();
      if (!messagesByConversation.has(key)) messagesByConversation.set(key, []);
      messagesByConversation.get(key).push(message);
    });

    const shapedBookings = bookings.map((booking) => shapeBooking(booking, req));
    const shapedOffers = offers.map((offer) => shapeOffer(offer));
    const shapedConversations = conversations.map((conversation) =>
      shapeConversation(
        conversation,
        messagesByConversation.get(conversation._id.toString()) || [],
        null
      )
    );
    const shapedReviews = reviews.map((review) => {
      const json = review.toJSON();
      return {
        ...json,
        driver: review.driver
          ? { id: toId(review.driver), name: review.driver.name, email: review.driver.email }
          : null,
        traveler: review.travelerUser
          ? { id: toId(review.travelerUser), name: review.travelerUser.name, email: review.travelerUser.email }
          : null,
        images: mapAssetUrls(review.images, req),
      };
    });

    const now = new Date();
    const completedBookings = bookings.filter(
      (booking) => booking.status === BOOKING_STATUS.CONFIRMED && booking.endDate < now
    );
    const upcomingBookings = bookings.filter(
      (booking) =>
        [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status) &&
        booking.endDate >= now
    );
    const approvedReviews = reviews.filter((review) => review.status === 'approved');
    const averageRating = approvedReviews.length
      ? Math.round(
          (approvedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
            approvedReviews.length) * 10
        ) / 10
      : 0;

    const activity = [
      driverActivityEntry('vehicle', 'Vehicle record created', vehicle.createdAt, { status: vehicle.status }),
      driverActivityEntry('vehicle', 'Vehicle record updated', vehicle.updatedAt, { status: vehicle.status }),
      driverActivityEntry('approval', `Vehicle ${vehicle.status}`, vehicle.reviewedAt, {
        status: vehicle.status,
        actor: vehicle.reviewedBy?.name || null,
      }),
      ...(vehicle.availability || []).flatMap((entry) => [
        driverActivityEntry('availability', `Availability set to ${entry.status}`, entry.createdAt, {
          recordId: entry._id?.toString?.() || null,
          status: entry.status,
        }),
        entry.updatedAt && entry.createdAt && entry.updatedAt.getTime() !== entry.createdAt.getTime()
          ? driverActivityEntry('availability', 'Availability entry updated', entry.updatedAt, {
              recordId: entry._id?.toString?.() || null,
              status: entry.status,
            })
          : null,
      ]),
      ...bookings.flatMap((booking) => [
        driverActivityEntry('booking', `Booking created by ${booking.traveler?.fullName || 'traveller'}`, booking.createdAt, {
          recordId: booking._id.toString(),
          status: booking.status,
        }),
        driverActivityEntry('booking', `Booking cancelled by ${booking.cancelledBy || 'unknown'}`, booking.cancelledAt, {
          recordId: booking._id.toString(),
          status: booking.status,
        }),
        driverActivityEntry('review', 'Review submitted for booking', booking.reviewSubmittedAt, {
          recordId: booking._id.toString(),
        }),
      ]),
      ...conversations.map((conversation) =>
        driverActivityEntry('conversation', `Conversation opened with ${conversation.traveler?.name || 'traveller'}`, conversation.createdAt, {
          recordId: conversation._id.toString(),
          status: conversation.status,
        })
      ),
      ...messages.map((message) =>
        driverActivityEntry(
          message.type === 'offer' ? 'offer' : 'message',
          message.type === 'offer'
            ? `Offer sent using ${vehicle.model}`
            : `${message.senderRole === 'driver' ? 'Driver' : 'Traveller'} message sent`,
          message.createdAt,
          {
            recordId: message._id.toString(),
            conversationId: message.conversation.toString(),
            status: message.offer?.status || null,
            warning: message.warning || null,
          }
        )
      ),
      ...reviews.flatMap((review) => [
        driverActivityEntry('review', `Review received (${review.rating}/5)`, review.createdAt, {
          recordId: review._id.toString(),
          status: review.status,
        }),
        driverActivityEntry('review', 'Review published', review.publishedAt, {
          recordId: review._id.toString(),
          status: review.status,
        }),
      ]),
    ]
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const payload = toVehicleResponse(vehicle, req);
    payload.driver = vehicle.driver
      ? {
          id: toId(vehicle.driver),
          name: vehicle.driver.name,
          email: vehicle.driver.email,
          contactNumber: vehicle.driver.contactNumber || '',
          address: vehicle.driver.address || '',
          profilePhoto: buildAssetUrl(vehicle.driver.profilePhoto, req),
          driverStatus: vehicle.driver.driverStatus,
          licenseType: vehicle.driver.licenseType,
          licenseStatus: vehicle.driver.licenseStatus,
          memberSince: vehicle.driver.memberSince || vehicle.driver.createdAt,
        }
      : null;
    payload.reviewedBy = vehicle.reviewedBy
      ? { id: toId(vehicle.reviewedBy), name: vehicle.reviewedBy.name, email: vehicle.reviewedBy.email }
      : null;

    return res.json({
      vehicle: payload,
      summary: {
        completedTrips: completedBookings.length,
        upcomingTrips: upcomingBookings.length,
        bookingCount: bookings.length,
        offerCount: offers.length,
        conversationCount: conversations.length,
        messageCount: messages.length,
        reviewCount: approvedReviews.length,
        averageRating,
        totalGross: roundMoney(bookings.reduce((sum, booking) => sum + Number(booking.totalPrice || 0), 0)),
        driverEarnings: roundMoney(bookings.reduce((sum, booking) => sum + Number(booking.driverEarnings || 0), 0)),
      },
      bookings: shapedBookings,
      offers: shapedOffers,
      conversations: shapedConversations,
      reviews: shapedReviews,
      activity,
    });
  } catch (error) {
    console.error('Fetch vehicle details error:', error);
    return res.status(500).json({ message: 'Unable to load vehicle details.' });
  }
};

export const updateVehicleStatus = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const { status, rejectedReason } = req.body;

  try {
    const vehicle = await Vehicle.findById(id).populate(
      'driver',
      'name email contactNumber address'
    );

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle submission not found' });
    }

    if (!Object.values(VEHICLE_STATUS).includes(status)) {
      return res.status(400).json({ message: 'Invalid vehicle status' });
    }

    vehicle.status = status;
    vehicle.reviewedAt = new Date();
    vehicle.reviewedBy = req.user.id;
    vehicle.rejectedReason =
      status === VEHICLE_STATUS.REJECTED && rejectedReason ? rejectedReason.trim() : undefined;

    await vehicle.save();
    await vehicle.populate('driver', 'name email contactNumber address');

    if (vehicle.driver?.email) {
      sendVehicleStatusEmail({
        driver: { name: vehicle.driver.name, email: vehicle.driver.email },
        vehicle: { model: vehicle.model },
        status,
        note: vehicle.rejectedReason,
      }).catch((error) => console.warn('Vehicle status email failed:', error));
    }

    return res.json({ vehicle: toVehicleResponse(vehicle, req) });
  } catch (error) {
    console.error('Update vehicle status error:', error);
    return res.status(500).json({ message: 'Unable to update vehicle status' });
  }
};

export const updateVehicleDetails = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
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

  try {
    const vehicle = await Vehicle.findById(id);

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle submission not found' });
    }

    vehicle.model = model.trim();
    vehicle.year = year;
    vehicle.description = description?.trim();
    vehicle.pricePerDay = pricePerDay;
    vehicle.seats = seats ?? undefined;
    vehicle.englishSpeakingDriver = Boolean(englishSpeakingDriver);
    vehicle.meetAndGreetAtAirport = Boolean(meetAndGreetAtAirport);
    vehicle.fuelAndInsurance = Boolean(fuelAndInsurance);
    vehicle.driverMealsAndAccommodation = Boolean(driverMealsAndAccommodation);
    vehicle.parkingFeesAndTolls = Boolean(parkingFeesAndTolls);
    vehicle.allTaxes = Boolean(allTaxes);

    vehicle.reviewedAt = new Date();
    vehicle.reviewedBy = req.user.id;

    await vehicle.save();
    await vehicle.populate('driver', 'name email contactNumber address');

    return res.json({ vehicle: toVehicleResponse(vehicle, req) });
  } catch (error) {
    console.error('Update vehicle details error:', error);
    return res.status(500).json({ message: 'Unable to update vehicle details' });
  }
};

export const addVehicleImages = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  if (!Array.isArray(req.files) || req.files.length === 0) {
    return res.status(400).json({ message: 'Upload at least one image.' });
  }

  const uploadedUrls = [];

  try {
    const vehicle = await Vehicle.findById(id).populate(
      'driver',
      'name email contactNumber address'
    );

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle submission not found' });
    }

    // Upload each image to Cloudinary
    for (const file of req.files) {
      try {
        const filename = cloudinaryService.generateUniqueFilename(`vehicle-${id}`);
        const cloudinaryUrl = await cloudinaryService.uploadImage(
          file.buffer,
          'vehicles',
          filename
        );
        uploadedUrls.push(cloudinaryUrl);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        // If any upload fails, clean up already uploaded images
        if (uploadedUrls.length > 0) {
          await cloudinaryService.deleteMultipleAssets(uploadedUrls, 'image');
        }
        return res.status(500).json({
          message: `Failed to upload image: ${uploadError.message}`,
        });
      }
    }

    // Update vehicle with new Cloudinary URLs
    const existing = Array.isArray(vehicle.images) ? vehicle.images : [];
    const combined = [...existing, ...uploadedUrls].slice(0, 5);
    vehicle.images = combined;
    vehicle.reviewedAt = new Date();
    vehicle.reviewedBy = req.user.id;

    await vehicle.save();
    await vehicle.populate('driver', 'name email contactNumber address');

    return res.json({ vehicle: toVehicleResponse(vehicle, req) });
  } catch (error) {
    console.error('Add vehicle images error:', error);
    // Clean up uploaded images if database save failed
    if (uploadedUrls.length > 0) {
      await cloudinaryService.deleteMultipleAssets(uploadedUrls, 'image');
    }
    return res.status(500).json({ message: 'Unable to add vehicle images' });
  }
};

export const removeVehicleImage = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const { image } = req.body;
  const trimmedImage = typeof image === 'string' ? image.trim() : '';

  if (!trimmedImage) {
    return res.status(400).json({ message: 'Image path is required' });
  }

  try {
    const vehicle = await Vehicle.findById(id).populate(
      'driver',
      'name email contactNumber address'
    );

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle submission not found' });
    }

    const existing = Array.isArray(vehicle.images) ? vehicle.images : [];

    // Find the image to remove (match by full URL or relative path)
    let imageToRemove = null;
    for (const img of existing) {
      if (img === trimmedImage || img.includes(trimmedImage) || trimmedImage.includes(img)) {
        imageToRemove = img;
        break;
      }
    }

    if (!imageToRemove) {
      return res.status(404).json({ message: 'Image not found on vehicle' });
    }

    // Remove from database
    const filtered = existing.filter((entry) => entry !== imageToRemove);
    vehicle.images = filtered;
    vehicle.reviewedAt = new Date();
    vehicle.reviewedBy = req.user.id;

    await vehicle.save();
    await vehicle.populate('driver', 'name email contactNumber address');

    // Delete from Cloudinary if it's a Cloudinary URL
    if (cloudinaryService.isCloudinaryUrl(imageToRemove)) {
      try {
        await cloudinaryService.deleteAsset(imageToRemove, 'image');
      } catch (deleteError) {
        console.warn('Failed to delete image from Cloudinary:', deleteError.message);
        // Continue anyway - image removed from database
      }
    } else {
      // Legacy local file - try to delete but don't fail if it doesn't exist
      const toStoredPath = (input) => {
        if (!input) return '';
        const idx = input.lastIndexOf('vehicles/');
        if (idx >= 0) {
          return input.slice(idx);
        }
        return input;
      };
      const localPath = toStoredPath(imageToRemove);
      const absolutePath = path.join(process.cwd(), 'uploads', localPath);
      fs.unlink(absolutePath, (err) => {
        if (err) {
          console.warn('Unable to delete local vehicle image file', absolutePath, err.message);
        }
      });
    }

    return res.json({ vehicle: toVehicleResponse(vehicle, req) });
  } catch (error) {
    console.error('Remove vehicle image error:', error);
    return res.status(500).json({ message: 'Unable to remove vehicle image' });
  }
};

/**
 * Drivers who deleted their account, kept for legal and tax purposes.
 * Admin-only: these records are the one place the person is still identifiable.
 */
export const listDeletedDrivers = async (req, res) => {
  try {
    const records = await DeletedDriverRecord.find()
      .sort({ deletedAt: -1 })
      .limit(500)
      .lean();

    return res.json({
      drivers: records.map((record) => ({
        ...record,
        id: record._id.toString(),
        _id: undefined,
        driver: record.driver?.toString() || null,
        licenseImage: buildAssetUrl(record.licenseImage, req),
      })),
      retentionYears: RETENTION_YEARS,
    });
  } catch (error) {
    console.error('List deleted drivers error:', error);
    return res.status(500).json({ message: 'Unable to load deleted driver records' });
  }
};

export const deleteVehicle = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  try {
    const vehicle = await Vehicle.findOne({ _id: id, deletedAt: null });

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Admin is blocked by live bookings too: cancel them in the Bookings tab
    // first, so the traveller is told rather than silently losing their trip.
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
    console.error('Admin vehicle delete error:', error);
    return res.status(500).json({ message: 'Unable to delete vehicle' });
  }
};

export const listVehicleAvailability = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  try {
    const vehicle = await Vehicle.findById(id).select('availability model driver');
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    // Bookings block dates just as driver-set "unavailable" entries do, but admin
    // must not be able to silently free a date a traveller has already booked, so
    // these come back read-only alongside the editable entries.
    const bookings = await Booking.find({
      vehicle: id,
      status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] },
    })
      .select('startDate endDate status traveler')
      .sort({ startDate: 1 })
      .lean();

    return res.json({
      availability: sanitizeAvailability(vehicle.availability),
      bookings: bookings.map((booking) => ({
        id: booking._id.toString(),
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
        travelerName: booking.traveler?.fullName || 'Traveller',
      })),
    });
  } catch (error) {
    console.error('List vehicle availability error:', error);
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
  const status = Object.values(VEHICLE_AVAILABILITY_STATUS).includes(req.body.status)
    ? req.body.status
    : VEHICLE_AVAILABILITY_STATUS.UNAVAILABLE;
  const note = typeof req.body.note === 'string' ? req.body.note.trim() : undefined;

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start and end dates are required' });
  }
  if (startDate > endDate) {
    return res.status(400).json({ message: 'Start date must be before end date' });
  }

  try {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    vehicle.availability.push({ startDate, endDate, status, note: note || undefined });
    await vehicle.save();

    return res.status(201).json({ availability: sanitizeAvailability(vehicle.availability) });
  } catch (error) {
    console.error('Create vehicle availability error:', error);
    return res.status(500).json({ message: 'Unable to add availability entry' });
  }
};

export const deleteVehicleAvailability = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id, availabilityId } = req.params;

  try {
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    const entry = vehicle.availability.id(availabilityId);
    if (!entry) {
      return res.status(404).json({ message: 'Availability entry not found' });
    }

    entry.deleteOne();
    await vehicle.save();

    return res.json({ availability: sanitizeAvailability(vehicle.availability) });
  } catch (error) {
    console.error('Delete vehicle availability error:', error);
    return res.status(500).json({ message: 'Unable to remove availability entry' });
  }
};

export const listBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate('vehicle', 'model pricePerDay images')
      .populate('driver', 'name email contactNumber')
      .populate({
        path: 'offerMessage',
        select: 'offer conversation',
      });

    return res.json({ bookings: bookings.map((booking) => shapeBooking(booking, req)) });
  } catch (error) {
    console.error('List bookings error:', error);
    return res.status(500).json({ message: 'Unable to load bookings.' });
  }
};

// Complete administrative record for one booking. This keeps the list endpoint
// lightweight while making the dedicated page the single place for the trip,
// financial, offer, conversation, review and payment history.
export const getBookingDetails = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  try {
    const booking = await Booking.findById(id)
      .populate('driver', 'name email contactNumber address profilePhoto driverStatus licenseType licenseStatus memberSince createdAt')
      .populate({
        path: 'vehicle',
        populate: { path: 'driver', select: 'name email' },
      })
      .populate('travelerUser', 'name email contactNumber authProvider isVerified createdAt deletedAt')
      .populate({
        path: 'offerMessage',
        populate: [
          { path: 'sender', select: 'name role email' },
          { path: 'offer.vehicle', select: 'model year pricePerDay images' },
          { path: 'offer.brief', select: 'status startLocation endLocation startDate endDate country message' },
          {
            path: 'conversation',
            populate: [
              { path: 'traveler', select: 'name email' },
              { path: 'driver', select: 'name email' },
            ],
          },
        ],
      });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    let conversation = null;
    const linkedConversationId = booking.offerMessage?.conversation?._id || booking.offerMessage?.conversation;
    if (linkedConversationId) {
      conversation = await ChatConversation.findById(linkedConversationId)
        .populate('traveler', 'name email')
        .populate('driver', 'name email')
        .populate('vehicle', 'model')
        .populate('lastMessage', 'body type createdAt');
    } else if (booking.travelerUser && booking.driver) {
      conversation = await ChatConversation.findOne({
        traveler: toId(booking.travelerUser),
        driver: toId(booking.driver),
        vehicle: toId(booking.vehicle),
      })
        .populate('traveler', 'name email')
        .populate('driver', 'name email')
        .populate('vehicle', 'model')
        .populate('lastMessage', 'body type createdAt');
    }

    const [messages, review, commission] = await Promise.all([
      conversation
        ? ChatMessage.find({ conversation: conversation._id })
            .sort({ createdAt: 1 })
            .populate('sender', 'name role')
            .populate('offer.vehicle', 'model')
        : [],
      Review.findOne({ booking: id })
        .populate('driver', 'name email')
        .populate('vehicle', 'model year')
        .populate('travelerUser', 'name email'),
      booking.driver && booking.endDate
        ? DriverCommission.findOne({
            driver: toId(booking.driver),
            year: booking.endDate.getUTCFullYear(),
            month: booking.endDate.getUTCMonth() + 1,
          }).populate('driver', 'name email contactNumber')
        : null,
    ]);

    const shapedBooking = shapeBooking(booking, req);
    const vehicleJson = booking.vehicle
      ? (typeof booking.vehicle.toJSON === 'function' ? booking.vehicle.toJSON() : booking.vehicle)
      : null;
    if (vehicleJson) {
      vehicleJson.images = mapAssetUrls(vehicleJson.images, req);
      vehicleJson.driver = booking.vehicle.driver
        ? { id: toId(booking.vehicle.driver), name: booking.vehicle.driver.name, email: booking.vehicle.driver.email }
        : null;
    }

    const driver = booking.driver
      ? {
          id: toId(booking.driver),
          name: booking.driver.name,
          email: booking.driver.email,
          contactNumber: booking.driver.contactNumber || '',
          address: booking.driver.address || '',
          profilePhoto: buildAssetUrl(booking.driver.profilePhoto, req),
          driverStatus: booking.driver.driverStatus,
          licenseType: booking.driver.licenseType,
          licenseStatus: booking.driver.licenseStatus,
          memberSince: booking.driver.memberSince || booking.driver.createdAt,
        }
      : null;

    const travelerAccount = booking.travelerUser
      ? {
          id: toId(booking.travelerUser),
          name: booking.travelerUser.name,
          email: booking.travelerUser.email,
          contactNumber: booking.travelerUser.contactNumber || '',
          authProvider: booking.travelerUser.authProvider,
          isVerified: Boolean(booking.travelerUser.isVerified),
          createdAt: booking.travelerUser.createdAt,
          deletedAt: booking.travelerUser.deletedAt,
        }
      : null;

    const shapedReview = review
      ? (() => {
          const json = review.toJSON();
          return {
            ...json,
            driver: review.driver ? { id: toId(review.driver), name: review.driver.name, email: review.driver.email } : null,
            vehicle: review.vehicle ? { id: toId(review.vehicle), model: review.vehicle.model, year: review.vehicle.year } : null,
            traveler: review.travelerUser ? { id: toId(review.travelerUser), name: review.travelerUser.name, email: review.travelerUser.email } : null,
            images: mapAssetUrls(review.images, req),
          };
        })()
      : null;

    const shapedOffer = booking.offerMessage ? shapeOffer(booking.offerMessage) : null;
    const shapedConversation = conversation ? shapeConversation(conversation, messages, null) : null;
    const shapedCommission = commission ? shapeCommission(commission, req) : null;

    const activity = [
      driverActivityEntry('booking', 'Booking created', booking.createdAt, { status: booking.status }),
      driverActivityEntry('booking', 'Booking record updated', booking.updatedAt, { status: booking.status }),
      driverActivityEntry('booking', `Booking cancelled by ${booking.cancelledBy || 'unknown'}`, booking.cancelledAt, {
        status: booking.status,
      }),
      driverActivityEntry('review', 'Review request sent', booking.reviewRequestSentAt),
      driverActivityEntry('review', 'Review submitted', booking.reviewSubmittedAt),
      driverActivityEntry('offer', 'Offer created', booking.offerMessage?.createdAt, {
        recordId: booking.offerMessage?._id?.toString?.() || null,
        status: booking.offerMessage?.offer?.status || null,
      }),
      driverActivityEntry('conversation', 'Conversation opened', conversation?.createdAt, {
        recordId: conversation?._id?.toString?.() || null,
        status: conversation?.status || null,
      }),
      ...messages.map((message) =>
        driverActivityEntry(
          message.type === 'offer' ? 'offer' : 'message',
          message.type === 'offer'
            ? 'Offer message sent'
            : `${message.senderRole === 'driver' ? 'Driver' : 'Traveller'} message sent`,
          message.createdAt,
          {
            recordId: message._id.toString(),
            status: message.offer?.status || null,
            warning: message.warning || null,
          }
        )
      ),
      driverActivityEntry('review', `Review received${review ? ` (${review.rating}/5)` : ''}`, review?.createdAt, {
        recordId: review?._id?.toString?.() || null,
        status: review?.status || null,
      }),
      driverActivityEntry('review', 'Review published', review?.publishedAt, {
        recordId: review?._id?.toString?.() || null,
        status: review?.status || null,
      }),
      driverActivityEntry('payment', 'Commission payment slip uploaded', commission?.paymentSlipUploadedAt, {
        recordId: commission?._id?.toString?.() || null,
        status: commission?.status || null,
      }),
      driverActivityEntry('payment', `Commission record ${commission?.status || 'updated'}`, commission?.updatedAt, {
        recordId: commission?._id?.toString?.() || null,
        status: commission?.status || null,
      }),
    ]
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.json({
      booking: shapedBooking,
      driver,
      vehicle: vehicleJson,
      travelerAccount,
      offer: shapedOffer,
      conversation: shapedConversation,
      review: shapedReview,
      commission: shapedCommission,
      activity,
    });
  } catch (error) {
    console.error('Fetch booking details error:', error);
    return res.status(500).json({ message: 'Unable to load booking details.' });
  }
};

export const updateBooking = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;
  const {
    status,
    startDate,
    endDate,
    pricePerDay,
    totalPrice,
    paymentNote,
    startPoint,
    endPoint,
    specialRequests,
    flightNumber,
    arrivalTime,
    departureTime,
  } = req.body;

  try {
    const booking = await Booking.findById(id)
      .populate('vehicle', 'model pricePerDay images')
      .populate('driver', 'name email contactNumber')
      .populate({
        path: 'offerMessage',
        select: 'offer conversation',
      });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }

    const previousStatus = booking.status;

    if (status) {
      booking.status = status;
    }

    const nextStart = startDate ? new Date(startDate) : booking.startDate;
    const nextEnd = endDate ? new Date(endDate) : booking.endDate;

    if (Number.isNaN(nextStart?.getTime()) || Number.isNaN(nextEnd?.getTime())) {
      return res.status(400).json({ message: 'Start and end dates must be valid.' });
    }
    if (nextEnd < nextStart) {
      return res.status(400).json({ message: 'End date cannot be before start date.' });
    }

    booking.startDate = nextStart;
    booking.endDate = nextEnd;
    booking.totalDays = calculateTotalDays(nextStart, nextEnd);

    if (pricePerDay !== undefined) {
      const normalizedPrice = Number(pricePerDay);
      if (Number.isNaN(normalizedPrice) || normalizedPrice < 0) {
        return res.status(400).json({ message: 'Price per day must be a positive number.' });
      }
      booking.pricePerDay = normalizedPrice;
    }

    if (totalPrice !== undefined) {
      const normalizedTotal = Number(totalPrice);
      if (Number.isNaN(normalizedTotal) || normalizedTotal < 0) {
        return res.status(400).json({ message: 'Total price must be a positive number.' });
      }
      booking.totalPrice = normalizedTotal;
    } else if (pricePerDay !== undefined) {
      booking.totalPrice = booking.pricePerDay * booking.totalDays;
    }

    if (paymentNote !== undefined) booking.paymentNote = paymentNote?.trim() || '';
    if (startPoint !== undefined) booking.startPoint = startPoint?.trim() || '';
    if (endPoint !== undefined) booking.endPoint = endPoint?.trim() || '';
    if (specialRequests !== undefined) booking.specialRequests = specialRequests?.trim() || '';
    if (flightNumber !== undefined) booking.flightNumber = flightNumber?.trim() || '';
    if (arrivalTime !== undefined) booking.arrivalTime = arrivalTime?.trim() || '';
    if (departureTime !== undefined) booking.departureTime = departureTime?.trim() || '';

    await booking.save();

    // Admin can cancel or reinstate a booking here too, so keep the traveller's
    // quote requests in step with the dates actually being free or taken.
    if (status && status !== previousStatus) {
      if ([BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(status)) {
        await reopenBriefsForBooking(booking._id);
      } else if (status === BOOKING_STATUS.CONFIRMED) {
        await closeBriefsForBooking(booking);
      }
    }

    if (status && status !== previousStatus) {
      const recipients = [];
      if (booking.traveler?.email) {
        recipients.push({
          name: booking.traveler.fullName,
          email: booking.traveler.email,
          role: USER_ROLES.GUEST,
        });
      }
      if (booking.driver?.email) {
        recipients.push({
          name: booking.driver.name,
          email: booking.driver.email,
          role: USER_ROLES.DRIVER,
        });
      }
      recipients.forEach((recipient) => {
        sendBookingStatusUpdateEmail({
          recipient,
          booking,
          vehicle: booking.vehicle,
          status,
          note: 'An administrator updated this booking status.',
        }).catch((error) => console.warn('Admin booking status email failed:', error));
      });
    }

    return res.json({ booking: shapeBooking(booking, req) });
  } catch (error) {
    console.error('Update booking error:', error);
    return res.status(500).json({ message: 'Unable to update booking.' });
  }
};

export const deleteBooking = async (req, res) => {
  const { id } = req.params;
  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    await Booking.deleteOne({ _id: id });
    await Review.deleteMany({ booking: id });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete booking error:', error);
    return res.status(500).json({ message: 'Unable to delete booking.' });
  }
};

// Per-driver abuse rollup. The Conversations tab already flags individual
// conversations; this answers the question it cannot — which DRIVER is doing it,
// and how often, across every chat they are in.
export const listAbuseSignals = async (_req, res) => {
  try {
    const [violationRows, duplicateRows] = await Promise.all([
      // Contact-detail attempts, grouped by driver.
      ChatMessage.aggregate([
        { $match: { senderRole: USER_ROLES.DRIVER, violations: { $exists: true, $ne: [] } } },
        {
          $group: {
            _id: '$sender',
            total: { $sum: 1 },
            phone: { $sum: { $cond: [{ $in: ['phone', '$violations'] }, 1, 0] } },
            email: { $sum: { $cond: [{ $in: ['email', '$violations'] }, 1, 0] } },
            link: { $sum: { $cond: [{ $in: ['link', '$violations'] }, 1, 0] } },
            firstAt: { $min: '$createdAt' },
            lastAt: { $max: '$createdAt' },
            samples: { $push: { body: '$body', createdAt: '$createdAt' } },
          },
        },
      ]),
      // Same normalised text sent into several different conversations.
      ChatMessage.aggregate([
        { $match: { senderRole: USER_ROLES.DRIVER, bodyHash: { $ne: null } } },
        {
          $group: {
            _id: { sender: '$sender', bodyHash: '$bodyHash' },
            conversations: { $addToSet: '$conversation' },
            sample: { $first: '$body' },
            lastAt: { $max: '$createdAt' },
          },
        },
        { $project: { sender: '$_id.sender', recipients: { $size: '$conversations' }, sample: 1, lastAt: 1 } },
        { $match: { recipients: { $gte: 3 } } },
        { $sort: { recipients: -1 } },
      ]),
    ]);

    const byDriver = new Map();
    const ensure = (id) => {
      const key = id.toString();
      if (!byDriver.has(key)) {
        byDriver.set(key, {
          driverId: key,
          driver: null,
          violations: { total: 0, phone: 0, email: 0, link: 0 },
          firstViolationAt: null,
          lastViolationAt: null,
          violationSamples: [],
          duplicateClusters: [],
        });
      }
      return byDriver.get(key);
    };

    for (const row of violationRows) {
      const entry = ensure(row._id);
      entry.violations = { total: row.total, phone: row.phone, email: row.email, link: row.link };
      entry.firstViolationAt = row.firstAt;
      entry.lastViolationAt = row.lastAt;
      entry.violationSamples = (row.samples || [])
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    }

    for (const row of duplicateRows) {
      const entry = ensure(row.sender);
      entry.duplicateClusters.push({
        recipients: row.recipients,
        sample: (row.sample || '').slice(0, 200),
        lastAt: row.lastAt,
      });
    }

    const driverIds = Array.from(byDriver.keys());
    const drivers = await User.find({ _id: { $in: driverIds } })
      .select('name email messagingSuspendedUntil suspensionReason')
      .lean();
    const driverMap = new Map(drivers.map((d) => [d._id.toString(), d]));

    const results = [];
    for (const entry of byDriver.values()) {
      const driver = driverMap.get(entry.driverId);
      if (!driver) continue; // deleted account
      results.push({
        ...entry,
        driver: { id: entry.driverId, name: driver.name, email: driver.email },
        suspendedUntil: driver.messagingSuspendedUntil || null,
        suspensionReason: driver.suspensionReason || '',
        // Worst-first: a blast to many travellers outweighs a single slip.
        score: entry.violations.total + entry.duplicateClusters.reduce((n, c) => n + c.recipients, 0),
      });
    }
    results.sort((a, b) => b.score - a.score);

    return res.json({ signals: results, thresholds: OBSERVE_THRESHOLDS });
  } catch (error) {
    console.error('List abuse signals error:', error);
    return res.status(500).json({ message: 'Unable to load abuse signals.' });
  }
};

// Freeze or lift a driver's ability to send messages, offers and brief responses.
// Their profile stays approved and bookable throughout.
export const setDriverMessagingSuspension = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) return validationError;

  const { id } = req.params;
  const { hours, reason } = req.body || {};

  try {
    const driver = await User.findOne({ _id: id, role: USER_ROLES.DRIVER });
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found.' });
    }

    if (!hours) {
      driver.messagingSuspendedUntil = null;
      driver.suspensionReason = '';
    } else {
      driver.messagingSuspendedUntil = new Date(Date.now() + Number(hours) * 60 * 60 * 1000);
      driver.suspensionReason = (reason || '').trim().slice(0, 300);
    }

    await driver.save();
    return res.json({
      driverId: driver.id,
      suspendedUntil: driver.messagingSuspendedUntil,
      suspensionReason: driver.suspensionReason,
      message: hours ? 'Messaging paused for this driver.' : 'Messaging restored.',
    });
  } catch (error) {
    console.error('Set driver messaging suspension error:', error);
    return res.status(500).json({ message: 'Unable to update messaging status.' });
  }
};

export const listBriefs = async (_req, res) => {
  try {
    const briefs = await TourBrief.find()
      .populate('traveler', 'name email')
      // Named drivers/vehicles so the briefs panel can list the offers received
      // rather than a column of ObjectIds.
      .populate('responses.driver', 'name email')
      .populate('responses.vehicle', 'model')
      // The quoted price lives on the offer message, not the brief, so pull it
      // through to show what each driver actually offered.
      .populate('responses.message', 'offer.totalPrice offer.currency offer.status')
      .sort({ createdAt: -1 });
    return res.json({ briefs: briefs.map((brief) => shapeBrief(brief)) });
  } catch (error) {
    console.error('List briefs error:', error);
    return res.status(500).json({ message: 'Unable to load tour briefs.' });
  }
};

// Complete administrative record for one traveller brief. The list stays
// lightweight; this endpoint joins each response to its driver, vehicle,
// offer, conversation, messages and any booking created from that offer.
export const getBriefDetails = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  try {
    const brief = await TourBrief.findById(id)
      .populate('traveler', 'name email contactNumber authProvider isVerified createdAt deletedAt')
      .populate('responses.driver', 'name email contactNumber address profilePhoto driverStatus licenseType licenseStatus memberSince createdAt')
      .populate({
        path: 'responses.vehicle',
        populate: { path: 'driver', select: 'name email' },
      })
      .populate({
        path: 'responses.message',
        populate: [
          { path: 'sender', select: 'name role email' },
          { path: 'offer.vehicle', select: 'model year pricePerDay images' },
          { path: 'offer.brief', select: 'status startLocation endLocation startDate endDate country' },
          {
            path: 'conversation',
            populate: [
              { path: 'traveler', select: 'name email' },
              { path: 'driver', select: 'name email' },
            ],
          },
        ],
      });

    if (!brief) {
      return res.status(404).json({ message: 'Tour brief not found.' });
    }

    const conversationIds = [...new Set((brief.responses || []).map((response) => toId(response.conversation)).filter(Boolean))];
    const offerMessageIds = [...new Set((brief.responses || []).map((response) => toId(response.message)).filter(Boolean))];

    const [conversations, messages, bookings] = await Promise.all([
      conversationIds.length
        ? ChatConversation.find({ _id: { $in: conversationIds } })
            .populate('traveler', 'name email')
            .populate('driver', 'name email')
            .populate('vehicle', 'model')
            .populate('lastMessage', 'body type createdAt')
        : [],
      conversationIds.length
        ? ChatMessage.find({ conversation: { $in: conversationIds } })
            .sort({ createdAt: 1 })
            .populate('sender', 'name role')
            .populate('offer.vehicle', 'model')
        : [],
      offerMessageIds.length
        ? Booking.find({ offerMessage: { $in: offerMessageIds } })
            .sort({ createdAt: -1 })
            .populate('vehicle', 'model pricePerDay images')
            .populate('driver', 'name email contactNumber')
            .populate({ path: 'offerMessage', select: 'offer conversation' })
        : [],
    ]);

    const conversationsById = new Map(conversations.map((conversation) => [conversation._id.toString(), conversation]));
    const messagesByConversation = new Map();
    messages.forEach((message) => {
      const key = toId(message.conversation);
      if (!messagesByConversation.has(key)) messagesByConversation.set(key, []);
      messagesByConversation.get(key).push(message);
    });
    const bookingsByOffer = new Map(bookings.map((booking) => [toId(booking.offerMessage), booking]));

    const responseRecords = (brief.responses || []).map((response) => {
      const conversationId = toId(response.conversation);
      const messageId = toId(response.message);
      const conversation = conversationsById.get(conversationId) || null;
      const booking = bookingsByOffer.get(messageId) || null;
      const driver = response.driver
        ? {
            id: toId(response.driver),
            name: response.driver.name,
            email: response.driver.email,
            contactNumber: response.driver.contactNumber || '',
            address: response.driver.address || '',
            profilePhoto: buildAssetUrl(response.driver.profilePhoto, req),
            driverStatus: response.driver.driverStatus,
            licenseType: response.driver.licenseType,
            licenseStatus: response.driver.licenseStatus,
            memberSince: response.driver.memberSince || response.driver.createdAt,
          }
        : null;
      const vehicle = response.vehicle ? toVehicleResponse(response.vehicle, req) : null;
      if (vehicle) {
        vehicle.driver = response.vehicle.driver
          ? { id: toId(response.vehicle.driver), name: response.vehicle.driver.name, email: response.vehicle.driver.email }
          : null;
      }
      return {
        id: messageId || `${toId(response.driver)}-${response.createdAt?.toISOString?.() || ''}`,
        note: response.note || '',
        createdAt: response.createdAt,
        driver,
        vehicle,
        offer: response.message ? shapeOffer(response.message) : null,
        conversation: conversation
          ? shapeConversation(conversation, messagesByConversation.get(conversationId) || [], booking ? shapeConversationBooking(booking) : null)
          : null,
        booking: booking ? shapeBooking(booking, req) : null,
      };
    });

    const traveler = brief.traveler
      ? {
          id: toId(brief.traveler),
          name: brief.traveler.name,
          email: brief.traveler.email,
          contactNumber: brief.traveler.contactNumber || '',
          authProvider: brief.traveler.authProvider,
          isVerified: Boolean(brief.traveler.isVerified),
          createdAt: brief.traveler.createdAt,
          deletedAt: brief.traveler.deletedAt,
        }
      : null;

    const offerPrices = responseRecords
      .map((response) => Number(response.offer?.totalPrice))
      .filter((price) => Number.isFinite(price));
    const allMessages = [...new Map(messages.map((message) => [message._id.toString(), message])).values()];
    const activity = [
      driverActivityEntry('brief', 'Tour brief created', brief.createdAt, { status: brief.status }),
      driverActivityEntry('brief', 'Tour brief updated', brief.updatedAt, { status: brief.status }),
      driverActivityEntry('offer', 'Latest driver response received', brief.lastResponseAt),
      ...(brief.responses || []).map((response) =>
        driverActivityEntry('offer', `Offer received from ${response.driver?.name || 'driver'}`, response.createdAt, {
          recordId: toId(response.message),
          status: response.message?.offer?.status || null,
        })
      ),
      ...conversations.map((conversation) =>
        driverActivityEntry('conversation', `Conversation opened with ${conversation.driver?.name || 'driver'}`, conversation.createdAt, {
          recordId: conversation._id.toString(),
          status: conversation.status,
        })
      ),
      ...allMessages.map((message) =>
        driverActivityEntry(
          message.type === 'offer' ? 'offer' : 'message',
          message.type === 'offer'
            ? `Offer message from ${message.sender?.name || 'driver'}`
            : `${message.sender?.name || 'User'} sent a ${message.type} message`,
          message.createdAt,
          {
            recordId: message._id.toString(),
            status: message.offer?.status || null,
            warning: message.warning || null,
          }
        )
      ),
      ...bookings.map((booking) =>
        driverActivityEntry('booking', `Booking ${booking.status}`, booking.createdAt, {
          recordId: booking._id.toString(),
          status: booking.status,
        })
      ),
    ]
      .filter(Boolean)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return res.json({
      brief: shapeBrief(brief),
      traveler,
      responses: responseRecords,
      bookings: bookings.map((booking) => shapeBooking(booking, req)),
      summary: {
        responseCount: responseRecords.length,
        acceptedCount: responseRecords.filter((response) => response.offer?.status === 'accepted').length,
        pendingCount: responseRecords.filter((response) => response.offer?.status === 'pending').length,
        declinedCount: responseRecords.filter((response) => response.offer?.status === 'declined').length,
        lowestOffer: offerPrices.length ? Math.min(...offerPrices) : null,
        highestOffer: offerPrices.length ? Math.max(...offerPrices) : null,
        messageCount: allMessages.length,
      },
      activity,
    });
  } catch (error) {
    console.error('Fetch brief details error:', error);
    return res.status(500).json({ message: 'Unable to load tour brief details.' });
  }
};

export const updateBrief = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }
  const { id } = req.params;
  const { status, startDate, endDate, startLocation, endLocation, message, country } = req.body;
  try {
    const brief = await TourBrief.findById(id).populate('traveler', 'name email');
    if (!brief) {
      return res.status(404).json({ message: 'Tour brief not found.' });
    }
    if (status) {
      brief.status = status;
    }
    if (startDate) {
      const parsed = new Date(startDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Invalid start date.' });
      }
      brief.startDate = parsed;
    }
    if (endDate) {
      const parsed = new Date(endDate);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({ message: 'Invalid end date.' });
      }
      brief.endDate = parsed;
    }
    if (brief.endDate < brief.startDate) {
      return res.status(400).json({ message: 'End date cannot be before start date.' });
    }
    if (startLocation !== undefined) {
      brief.startLocation = startLocation?.trim() || '';
    }
    if (endLocation !== undefined) {
      brief.endLocation = endLocation?.trim() || '';
    }
    if (message !== undefined) {
      brief.message = message?.trim() || '';
    }
    if (country !== undefined) {
      brief.country = country?.trim() || '';
    }
    await brief.save();
    return res.json({ brief: shapeBrief(brief) });
  } catch (error) {
    console.error('Update brief error:', error);
    return res.status(500).json({ message: 'Unable to update tour brief.' });
  }
};

export const deleteBrief = async (req, res) => {
  const { id } = req.params;
  try {
    const brief = await TourBrief.findById(id);
    if (!brief) {
      return res.status(404).json({ message: 'Tour brief not found.' });
    }
    await TourBrief.deleteOne({ _id: id });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete brief error:', error);
    return res.status(500).json({ message: 'Unable to delete tour brief.' });
  }
};

export const listOffers = async (_req, res) => {
  try {
    const offers = await ChatMessage.find({ type: 'offer' })
      .sort({ createdAt: -1 })
      .populate('sender', 'name role email')
      .populate('offer.vehicle', 'model')
      .populate('offer.brief', 'status')
      .populate({
        path: 'conversation',
        populate: [
          { path: 'traveler', select: 'name email' },
          { path: 'driver', select: 'name email' },
        ],
      });

    return res.json({ offers: offers.map((offer) => shapeOffer(offer)) });
  } catch (error) {
    console.error('List offers error:', error);
    return res.status(500).json({ message: 'Unable to load offers.' });
  }
};

export const updateOfferStatus = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const message = await ChatMessage.findById(id)
      .populate('sender', 'name role email')
      .populate('offer.vehicle', 'model')
      .populate('offer.brief', 'status')
      .populate({
        path: 'conversation',
        populate: [
          { path: 'traveler', select: 'name email' },
          { path: 'driver', select: 'name email' },
        ],
      });
    if (!message || message.type !== 'offer') {
      return res.status(404).json({ message: 'Offer not found.' });
    }
    message.offer.status = status;
    message.markModified('offer');
    await message.save();
    return res.json({ offer: shapeOffer(message) });
  } catch (error) {
    console.error('Update offer error:', error);
    return res.status(500).json({ message: 'Unable to update offer.' });
  }
};

export const deleteOffer = async (req, res) => {
  const { id } = req.params;
  try {
    const message = await ChatMessage.findById(id);
    if (!message || message.type !== 'offer') {
      return res.status(404).json({ message: 'Offer not found.' });
    }
    await ChatMessage.deleteOne({ _id: id });
    await Booking.updateMany(
      { offerMessage: id },
      { $unset: { offerMessage: '' } }
    );
    await refreshConversationMetadata(message.conversation);
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete offer error:', error);
    return res.status(500).json({ message: 'Unable to delete offer.' });
  }
};

export const listConversations = async (_req, res) => {
  try {
    const conversations = await ChatConversation.find()
      .sort({ updatedAt: -1 })
      .populate('traveler', 'name email')
      .populate('driver', 'name email')
      .populate('vehicle', 'model')
      .populate('lastMessage', 'body type createdAt');

    const conversationIds = conversations.map((conversation) => conversation._id);
    const messages = await ChatMessage.find({ conversation: { $in: conversationIds } })
      .sort({ createdAt: 1 })
      .populate('sender', 'name role')
      .populate('offer.vehicle', 'id model');

    const messagesByConversation = conversationIds.reduce((acc, id) => {
      acc[id.toString()] = [];
      return acc;
    }, {});

    messages.forEach((message) => {
      const key = message.conversation?.toString?.();
      if (key && messagesByConversation[key]) {
        messagesByConversation[key].push(message);
      }
    });

    const bookingsByPair = await findConversationBookingsMap(conversations);

    return res.json({
      conversations: conversations.map((conversation) =>
        shapeConversation(
          conversation,
          messagesByConversation[conversation._id.toString()] || [],
          bookingsByPair.get(`${toId(conversation.driver)}:${toId(conversation.traveler)}`) || null
        )
      ),
    });
  } catch (error) {
    console.error('List conversations error:', error);
    return res.status(500).json({ message: 'Unable to load conversations.' });
  }
};

export const updateConversationStatus = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }
  const { id } = req.params;
  const { status } = req.body;
  try {
    const conversation = await ChatConversation.findById(id)
      .populate('traveler', 'name email')
      .populate('driver', 'name email')
      .populate('vehicle', 'model')
      .populate('lastMessage', 'body type createdAt');

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    conversation.status = status;
    if (status === 'closed') {
      conversation.travelerUnreadCount = 0;
      conversation.driverUnreadCount = 0;
    }

    await conversation.save();
    const messages = await ChatMessage.find({ conversation: id })
      .sort({ createdAt: 1 })
      .populate('sender', 'name role')
      .populate('offer.vehicle', 'id model');

    const booking = await Booking.findOne({
      driver: toId(conversation.driver),
      travelerUser: toId(conversation.traveler),
      status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] },
    })
      .sort({ createdAt: -1 })
      .populate('vehicle', 'model')
      .lean();

    return res.json({ conversation: shapeConversation(conversation, messages, shapeConversationBooking(booking)) });
  } catch (error) {
    console.error('Update conversation error:', error);
    return res.status(500).json({ message: 'Unable to update conversation.' });
  }
};

export const deleteConversation = async (req, res) => {
  const { id } = req.params;
  try {
    const conversation = await ChatConversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    await ChatMessage.deleteMany({ conversation: id });
    await ChatConversation.deleteOne({ _id: id });
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return res.status(500).json({ message: 'Unable to delete conversation.' });
  }
};

export const getUsersList = async (_req, res) => {
  try {
    // Fetch all guest/tourist users
    const users = await User.find({ role: USER_ROLES.GUEST })
      .select('name email contactNumber isVerified createdAt authProvider deletedAt')
      .sort({ createdAt: -1 })
      .lean();

    // Get booking counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await Booking.countDocuments({ travelerUser: user._id });
        const briefCount = await TourBrief.countDocuments({ traveler: user._id });

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          contactNumber: user.contactNumber || '',
          isVerified: user.isVerified || false,
          authProvider: user.authProvider || 'local',
          registeredAt: user.createdAt,
          deletedAt: user.deletedAt || null,
          bookingsCount: bookingCount,
          briefsCount: briefCount,
        };
      })
    );

    return res.json({ users: usersWithStats });
  } catch (error) {
    console.error('List users error:', error);
    return res.status(500).json({ message: 'Unable to load users.' });
  }
};

// ---- Platform settings (admin-configurable) ----

const BANK_DETAIL_FIELDS = ['accountName', 'accountNumber', 'bankName', 'branch', 'swiftCode', 'referenceNote'];

// Merge stored bank details over the defaults so a partially-filled setting
// (or none saved yet) never surfaces blank fields to drivers.
const resolveBankDetails = async () => {
  const stored = await getSetting(SETTING_KEYS.PLATFORM_BANK_DETAILS, {});
  return { ...DEFAULT_BANK_DETAILS, ...(stored && typeof stored === 'object' ? stored : {}) };
};

// Read the current admin-configurable settings.
export const getAdminSettings = async (_req, res) => {
  try {
    const driverAutoApproval = Boolean(
      await getSetting(SETTING_KEYS.DRIVER_AUTO_APPROVAL, false)
    );
    const bankDetails = await resolveBankDetails();
    const briefDriverTypeSelection =
      (await getSetting(SETTING_KEYS.BRIEF_DRIVER_TYPE_SELECTION, true)) !== false;
    return res.json({ settings: { driverAutoApproval, bankDetails, briefDriverTypeSelection } });
  } catch (error) {
    console.error('Get admin settings error:', error);
    return res.status(500).json({ message: 'Unable to load settings.' });
  }
};

// Update admin-configurable settings: driver approval mode and/or bank details
// shown to drivers for commission payment.
export const updateAdminSettings = async (req, res) => {
  try {
    const { driverAutoApproval, bankDetails, briefDriverTypeSelection } = req.body || {};
    if (typeof driverAutoApproval === 'boolean') {
      await setSetting(SETTING_KEYS.DRIVER_AUTO_APPROVAL, driverAutoApproval);
    }
    if (typeof briefDriverTypeSelection === 'boolean') {
      await setSetting(SETTING_KEYS.BRIEF_DRIVER_TYPE_SELECTION, briefDriverTypeSelection);
    }
    if (bankDetails && typeof bankDetails === 'object' && !Array.isArray(bankDetails)) {
      const existing = await getSetting(SETTING_KEYS.PLATFORM_BANK_DETAILS, {});
      const merged = { ...(existing && typeof existing === 'object' ? existing : {}) };
      for (const field of BANK_DETAIL_FIELDS) {
        if (typeof bankDetails[field] === 'string') {
          merged[field] = bankDetails[field].trim();
        }
      }
      await setSetting(SETTING_KEYS.PLATFORM_BANK_DETAILS, merged);
    }
    const current = Boolean(await getSetting(SETTING_KEYS.DRIVER_AUTO_APPROVAL, false));
    const currentBankDetails = await resolveBankDetails();
    return res.json({
      message: current
        ? 'New drivers are now approved automatically.'
        : 'New drivers now require manual approval.',
      settings: {
        driverAutoApproval: current,
        bankDetails: currentBankDetails,
        briefDriverTypeSelection:
          (await getSetting(SETTING_KEYS.BRIEF_DRIVER_TYPE_SELECTION, true)) !== false,
      },
    });
  } catch (error) {
    console.error('Update admin settings error:', error);
    return res.status(500).json({ message: 'Unable to update settings.' });
  }
};

// Admin-triggered erasure, for deletion requests that arrive by email rather than
// through the app. Shares one code path with the self-serve route so the scrub can
// never drift between the two.
export const deleteUserAccount = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ message: 'Use your own account settings to delete your account.' });
  }

  try {
    const summary = await anonymizeUser(id, { actorId: req.user.id });
    return res.json({ message: 'Account deleted and personal data removed.', summary });
  } catch (error) {
    if (error.code === 'NOT_FOUND') {
      return res.status(404).json({ message: error.message });
    }
    if (error.code === 'ACTIVE_BOOKINGS') {
      return res.status(409).json({ message: error.message, bookings: error.bookings });
    }
    if (error.code === 'ALREADY_DELETED') {
      return res.status(409).json({ message: error.message });
    }
    console.error('Admin delete user error:', error);
    return res.status(500).json({ message: 'Unable to delete this account right now.' });
  }
};

// Lets an admin see why an erasure would be refused before attempting it.
export const previewUserDeletion = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name email role deletedAt');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    const blocking = await findBlockingBookings(user._id);
    return res.json({
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role, deletedAt: user.deletedAt || null },
      canDelete: !user.deletedAt && blocking.length === 0,
      blockingBookings: blocking,
    });
  } catch (error) {
    console.error('Preview user deletion error:', error);
    return res.status(500).json({ message: 'Unable to check this account right now.' });
  }
};

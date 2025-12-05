import { validationResult } from 'express-validator';
import User, { DRIVER_STATUS, USER_ROLES } from '../models/User.js';
import Vehicle, { VEHICLE_STATUS } from '../models/Vehicle.js';
import Booking, { BOOKING_STATUS, DEFAULT_COMMISSION_RATE } from '../models/Booking.js';
import Review from '../models/Review.js';
import TourBrief from '../models/TourBrief.js';
import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import {
  sendDriverStatusEmail,
  sendVehicleStatusEmail,
  sendBookingStatusUpdateEmail,
} from '../services/emailService.js';

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
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

const shapeVehicle = (vehicle) => {
  if (!vehicle) return null;
  return {
    id: toId(vehicle),
    model: vehicle.model,
    pricePerDay: vehicle.pricePerDay,
    images: Array.isArray(vehicle.images) ? vehicle.images : [],
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

const shapeBooking = (booking) => {
  const baseRate = Number.isFinite(booking.commissionBaseRate)
    ? booking.commissionBaseRate
    : booking.commissionRate;
  const discountRate =
    Number.isFinite(booking.commissionDiscountRate) && booking.commissionDiscountRate > 0
      ? booking.commissionDiscountRate
      : 0;
  const discountLabel = booking.commissionDiscountLabel || null;
  const discountId = booking.commissionDiscount
    ? toId(booking.commissionDiscount)
    : booking.commissionDiscountId || null;

  return {
    id: booking._id.toString(),
    status: booking.status,
    startDate: booking.startDate,
    endDate: booking.endDate,
    totalPrice: booking.totalPrice,
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
    travelerUser: booking.travelerUser ? booking.travelerUser.toString() : null,
    vehicle: shapeVehicle(booking.vehicle),
    driver: shapeDriver(booking.driver),
    offerId: booking.offerMessage?._id ? booking.offerMessage._id.toString() : null,
    offerStatus: booking.offerMessage?.offer?.status || null,
    conversationId: booking.offerMessage?.conversation
      ? toId(booking.offerMessage.conversation)
      : null,
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
  status: brief.status,
  offersCount: brief.offersCount ?? brief.responses.length,
  responses: (brief.responses || []).map((response) => ({
    driver: toId(response.driver),
    vehicle: toId(response.vehicle),
    conversation: toId(response.conversation),
    message: toId(response.message),
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

const shapeConversation = (conversation) => ({
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
    return res.json({ drivers: drivers.map((driver) => driver.toJSON()) });
  } catch (error) {
    console.error('Fetch driver applications error:', error);
    return res.status(500).json({ message: 'Unable to fetch driver applications' });
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

    driver.driverStatus = status;
    driver.driverReviewedAt = new Date();
    driver.driverReviewedBy = req.user.id;
    await driver.save();

    if (driver.email) {
      sendDriverStatusEmail({
        driver: { name: driver.name, email: driver.email },
        status,
      }).catch((error) => console.warn('Driver status email failed:', error));
    }

    return res.json({ driver: driver.toJSON() });
  } catch (error) {
    console.error('Update driver status error:', error);
    return res.status(500).json({ message: 'Unable to update driver status' });
  }
};

export const getVehicleSubmissions = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate(
      'driver',
      'name email contactNumber address'
    );

    return res.json({
      vehicles: vehicles.map((vehicle) => vehicle.toJSON()),
    });
  } catch (error) {
    console.error('Fetch vehicle submissions error:', error);
    return res.status(500).json({ message: 'Unable to fetch vehicle submissions' });
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

    return res.json({ vehicle: vehicle.toJSON() });
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

    return res.json({ vehicle: vehicle.toJSON() });
  } catch (error) {
    console.error('Update vehicle details error:', error);
    return res.status(500).json({ message: 'Unable to update vehicle details' });
  }
};

export const listBookings = async (_req, res) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate('vehicle', 'model pricePerDay images')
      .populate('driver', 'name email contactNumber')
      .populate({
        path: 'offerMessage',
        select: 'offer conversation',
      });

    return res.json({ bookings: bookings.map((booking) => shapeBooking(booking)) });
  } catch (error) {
    console.error('List bookings error:', error);
    return res.status(500).json({ message: 'Unable to load bookings.' });
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

    return res.json({ booking: shapeBooking(booking) });
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

export const listBriefs = async (_req, res) => {
  try {
    const briefs = await TourBrief.find()
      .populate('traveler', 'name email')
      .sort({ createdAt: -1 });
    return res.json({ briefs: briefs.map((brief) => shapeBrief(brief)) });
  } catch (error) {
    console.error('List briefs error:', error);
    return res.status(500).json({ message: 'Unable to load tour briefs.' });
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

    return res.json({
      conversations: conversations.map((conversation) => shapeConversation(conversation)),
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
    return res.json({ conversation: shapeConversation(conversation) });
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

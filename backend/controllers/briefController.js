import mongoose from 'mongoose';
import TourBrief from '../models/TourBrief.js';
import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import Vehicle from '../models/Vehicle.js';
import { DRIVER_STATUS, USER_ROLES } from '../models/User.js';
import { createChatMessage } from '../services/chatService.js';
import { sanitizeMessageContent } from '../utils/chatSanitizer.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed;
};

const toPlainBrief = (brief, currentUserId = null) => {
  const source = typeof brief.toJSON === 'function' ? brief.toJSON() : brief;
  const responses = Array.isArray(source.responses) ? source.responses : [];
  const travelerId =
    typeof source.traveler === 'object' && source.traveler !== null && source.traveler.id
      ? source.traveler.id
      : source.traveler?.toString?.();

  return {
    id: source.id || source._id?.toString(),
    traveler: source.traveler,
    startDate: source.startDate,
    endDate: source.endDate,
    startLocation: source.startLocation,
    endLocation: source.endLocation,
    adults: source.adults,
    children: source.children,
    message: source.message,
    country: source.country,
    status: source.status,
    offersCount: typeof source.offersCount === 'number' ? source.offersCount : responses.length,
    lastResponseAt: source.lastResponseAt,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    hasResponded:
      Boolean(currentUserId) &&
      responses.some(
        (response) => response.driver?.toString?.() === currentUserId
      ),
    isOwner: Boolean(currentUserId) && travelerId === currentUserId,
  };
};

export const createBrief = async (req, res) => {
  if (req.user.role !== USER_ROLES.GUEST) {
    return res.status(403).json({ message: 'Only travellers can create tour briefs.' });
  }

  const {
    startDate: startInput,
    endDate: endInput,
    startLocation = '',
    endLocation = '',
    adults,
    children = 0,
    message = '',
    country = '',
  } = req.body || {};

  const startDate = parseDate(startInput);
  const endDate = parseDate(endInput);

  if (!startDate || !endDate || endDate < startDate) {
    return res.status(400).json({ message: 'Please provide a valid start and end date.' });
  }

  const normalizedAdults = normalizeNumber(adults, 0);
  if (!Number.isFinite(normalizedAdults) || normalizedAdults < 1) {
    return res.status(400).json({ message: 'Number of adults must be at least 1.' });
  }

  const normalizedChildren = Math.max(0, normalizeNumber(children, 0));

  const trimmedStart = startLocation.trim();
  const trimmedEnd = endLocation.trim();
  const trimmedMessage = message.trim();
  const trimmedCountry = country.trim();

  if (!trimmedStart || !trimmedEnd || !trimmedMessage || !trimmedCountry) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    const brief = new TourBrief({
      traveler: req.user.id,
      startDate,
      endDate,
      startLocation: trimmedStart,
      endLocation: trimmedEnd,
      adults: normalizedAdults,
      children: normalizedChildren,
      message: trimmedMessage,
      country: trimmedCountry,
      status: 'open',
    });

    await brief.save();
    await brief.populate('traveler', 'id name country');

    return res.status(201).json({ brief: toPlainBrief(brief, req.user.id) });
  } catch (error) {
    console.error('Create brief error:', error);
    return res.status(500).json({ message: 'Unable to save your tour brief right now.' });
  }
};

export const listTravelerBriefs = async (req, res) => {
  if (req.user.role !== USER_ROLES.GUEST) {
    return res.status(403).json({ message: 'Only travellers can view their tour briefs.' });
  }

  try {
    const briefs = await TourBrief.find({ traveler: req.user.id })
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      briefs: briefs.map((brief) => toPlainBrief(brief, req.user.id)),
    });
  } catch (error) {
    console.error('List traveler briefs error:', error);
    return res.status(500).json({ message: 'Unable to load your tour briefs.' });
  }
};

export const listOpenBriefs = async (req, res) => {
  if (req.user.role !== USER_ROLES.DRIVER || req.user.driverStatus !== DRIVER_STATUS.APPROVED) {
    return res.status(403).json({ message: 'Only approved drivers can view open briefs.' });
  }

  try {
    const briefs = await TourBrief.find({ status: 'open' })
      .populate('traveler', 'id name country')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      briefs: briefs.map((brief) => toPlainBrief(brief, req.user.id)),
    });
  } catch (error) {
    console.error('List open briefs error:', error);
    return res.status(500).json({ message: 'Unable to load tour briefs.' });
  }
};

const formatDateSpan = (start, end) => {
  const startLabel = new Date(start).toDateString();
  const endLabel = new Date(end).toDateString();
  return `${startLabel} - ${endLabel}`;
};

const findConversationForBrief = async ({ travelerId, driverId, vehicleId }) => {
  const existingForVehicle = await ChatConversation.findOne({
    traveler: travelerId,
    driver: driverId,
    vehicle: vehicleId,
  });
  if (existingForVehicle) {
    return existingForVehicle;
  }

  const existingGeneric = await ChatConversation.findOne({
    traveler: travelerId,
    driver: driverId,
    vehicle: null,
  });
  if (existingGeneric) {
    return existingGeneric;
  }

  const conversation = new ChatConversation({
    traveler: travelerId,
    driver: driverId,
    vehicle: vehicleId,
    createdBy: driverId,
    status: 'active',
    travelerUnreadCount: 0,
    driverUnreadCount: 0,
  });
  await conversation.save();
  return conversation;
};

export const respondToBrief = async (req, res) => {
  if (req.user.role !== USER_ROLES.DRIVER || req.user.driverStatus !== DRIVER_STATUS.APPROVED) {
    return res.status(403).json({ message: 'Only approved drivers can send offers.' });
  }

  const { briefId } = req.params;
  if (!isValidObjectId(briefId)) {
    return res.status(400).json({ message: 'Invalid brief identifier.' });
  }

  const {
    vehicleId,
    totalPrice,
    totalKms,
    pricePerExtraKm,
    note = '',
    startDate: startInput,
    endDate: endInput,
  } = req.body || {};

  if (!vehicleId || !isValidObjectId(vehicleId)) {
    return res.status(400).json({ message: 'Vehicle identifier is required.' });
  }

  const normalizedPrice = Number(totalPrice);
  const normalizedKms = Number(totalKms);
  const normalizedExtraKmPrice = Number(pricePerExtraKm);

  if (
    Number.isNaN(normalizedPrice) ||
    normalizedPrice <= 0 ||
    Number.isNaN(normalizedKms) ||
    normalizedKms <= 0 ||
    Number.isNaN(normalizedExtraKmPrice) ||
    normalizedExtraKmPrice < 0
  ) {
    return res.status(400).json({ message: 'Offer pricing details are invalid.' });
  }

  const overrideStart = parseDate(startInput);
  const overrideEnd = parseDate(endInput);
  if ((overrideStart && !overrideEnd) || (!overrideStart && overrideEnd)) {
    return res
      .status(400)
      .json({ message: 'Provide both start and end dates if you override the schedule.' });
  }

  try {
    const brief = await TourBrief.findById(briefId);
    if (!brief || brief.status !== 'open') {
      return res.status(404).json({ message: 'Tour brief not found or already closed.' });
    }

    if (brief.traveler.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot respond to your own tour brief.' });
    }

    const alreadyResponded = brief.responses.some(
      (response) => response.driver?.toString?.() === req.user.id
    );
    if (alreadyResponded) {
      return res.status(409).json({ message: 'You already sent an offer for this brief.' });
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      driver: req.user.id,
    }).select('id model status');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found in your fleet.' });
    }

    const offerStart = overrideStart || brief.startDate;
    const offerEnd = overrideEnd || brief.endDate;
    if (!offerStart || !offerEnd || offerEnd < offerStart) {
      return res.status(400).json({ message: 'Offer dates are invalid.' });
    }

    const conversation = await findConversationForBrief({
      travelerId: brief.traveler,
      driverId: req.user.id,
      vehicleId: vehicle.id,
    });

    const guestsLabel = `${brief.adults} adult${brief.adults === 1 ? '' : 's'}${
      brief.children > 0 ? `, ${brief.children} child${brief.children === 1 ? '' : 'ren'}` : ''
    }`;

    const summary = `Offer for your tour brief ${brief.startLocation} → ${brief.endLocation}
Dates: ${formatDateSpan(offerStart, offerEnd)}
Guests: ${guestsLabel}
Vehicle: ${vehicle.model}
Total: $${normalizedPrice.toFixed(0)} (includes ${normalizedKms} km)`;

    const message = await createChatMessage({
      conversation,
      senderId: req.user.id,
      senderRole: USER_ROLES.DRIVER,
      content: summary,
      type: 'offer',
      offer: {
        startDate: offerStart,
        endDate: offerEnd,
        vehicle: vehicle.id,
        totalPrice: normalizedPrice,
        totalKms: normalizedKms,
        pricePerExtraKm: normalizedExtraKmPrice,
        currency: 'USD',
      },
    });

    let storedNote = '';
    if (note && note.trim()) {
      const { sanitized: sanitizedNote, violations, warning } = sanitizeMessageContent(note);
      if (sanitizedNote) {
        storedNote = sanitizedNote;
        message.body = `${message.body}\n\nNotes: ${sanitizedNote}`;
        if (violations.length > 0) {
          message.warning =
            message.warning ||
            warning ||
            'Contact details and direct links are hidden for safety. Share plans without phone numbers, emails, or URLs.';
          const mergedViolations = new Set([...(message.violations || []), ...violations]);
          message.violations = Array.from(mergedViolations);
        }
        await message.save();
      }
    }

    brief.responses.push({
      driver: req.user.id,
      vehicle: vehicle.id,
      conversation: conversation.id,
      message: message.id,
      note: storedNote,
      createdAt: new Date(),
    });
    brief.offersCount = brief.responses.length;
    brief.lastResponseAt = new Date();
    await brief.save();

    const populatedMessage = await ChatMessage.findById(message.id)
      .populate('sender', 'id name role')
      .populate('offer.vehicle', 'id model pricePerDay')
      .lean();

    return res.status(201).json({
      brief: toPlainBrief(brief, req.user.id),
      conversationId: conversation.id.toString(),
      message: {
        ...populatedMessage,
        id: populatedMessage._id.toString(),
        _id: undefined,
      },
    });
  } catch (error) {
    console.error('Respond to brief error:', error);
    return res.status(500).json({ message: 'Unable to send offer right now.' });
  }
};

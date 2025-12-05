import mongoose from 'mongoose';
import ChatConversation from '../models/ChatConversation.js';
import ChatMessage from '../models/ChatMessage.js';
import User, { DRIVER_STATUS, USER_ROLES } from '../models/User.js';
import Vehicle, { VEHICLE_STATUS } from '../models/Vehicle.js';
import { sanitizeMessageContent } from '../utils/chatSanitizer.js';
import { createChatMessage } from '../services/chatService.js';

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

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

const mapConversationResponse = (conversation, currentUserId) => {
  const view = conversation.toJSON();
  const isTraveler = view.traveler?.toString?.() === currentUserId;
  return {
    id: view.id,
    traveler: view.traveler,
    driver: view.driver,
    vehicle: view.vehicle,
    status: view.status,
    lastMessageAt: view.lastMessageAt,
    lastMessage: view.lastMessage,
    unreadCount: isTraveler ? view.travelerUnreadCount : view.driverUnreadCount,
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
  };
};

const markConversationAsRead = async (conversation, userId) => {
  const isTraveler = conversation.traveler.toString() === userId;
  if (isTraveler) {
    conversation.travelerUnreadCount = 0;
  } else if (conversation.driver.toString() === userId) {
    conversation.driverUnreadCount = 0;
  }
  await conversation.save();
};

export const startConversation = async (req, res) => {
  const { driverId, vehicleId, message: initialMessage } = req.body || {};

  if (req.user.role !== USER_ROLES.GUEST) {
    return res.status(403).json({ message: 'Only travellers can start conversations.' });
  }

  if (!isValidObjectId(driverId)) {
    return res.status(400).json({ message: 'Driver identifier is required.' });
  }

  if (vehicleId && !isValidObjectId(vehicleId)) {
    return res.status(400).json({ message: 'Vehicle identifier is invalid.' });
  }

  try {
    const driver = await User.findOne({
      _id: driverId,
      role: USER_ROLES.DRIVER,
      driverStatus: DRIVER_STATUS.APPROVED,
    }).select('id name driverStatus');

    if (!driver) {
      return res.status(404).json({ message: 'Driver not found or unavailable.' });
    }

    let vehicle = null;
    if (vehicleId) {
      vehicle = await Vehicle.findOne({
        _id: vehicleId,
        driver: driver.id,
        status: VEHICLE_STATUS.APPROVED,
      }).select('id model');

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle not available for this driver.' });
      }
    }

    const existingConversation = await ChatConversation.findOne({
      traveler: req.user.id,
      driver: driver.id,
      vehicle: vehicle ? vehicle.id : null,
    })
      .populate('traveler', 'id name role')
      .populate('driver', 'id name role')
      .populate('vehicle', 'id model pricePerDay');

    if (existingConversation) {
      let createdMessage = null;
      if (initialMessage && initialMessage.trim()) {
        createdMessage = await createChatMessage({
          conversation: existingConversation,
          senderId: req.user.id,
          senderRole: USER_ROLES.GUEST,
          content: initialMessage,
        });
      }

      return res.status(200).json({
        conversation: mapConversationResponse(existingConversation, req.user.id),
        message: createdMessage ? createdMessage.toJSON() : null,
        reuse: true,
      });
    }

    const conversation = new ChatConversation({
      traveler: req.user.id,
      driver: driver.id,
      vehicle: vehicle ? vehicle.id : null,
      createdBy: req.user.id,
      status: 'active',
      travelerUnreadCount: 0,
      driverUnreadCount: 0,
    });

    await conversation.save();

    conversation.traveler = req.user.id;
    conversation.driver = driver.id;
    if (vehicle) {
      conversation.vehicle = vehicle.id;
    }

    let createdMessage = null;
    if (initialMessage && initialMessage.trim()) {
      createdMessage = await createChatMessage({
        conversation,
        senderId: req.user.id,
        senderRole: USER_ROLES.GUEST,
        content: initialMessage,
      });
    } else {
      // Ensure unread counters stay accurate
      await conversation.save();
    }

    const responseConversation = await ChatConversation.findById(conversation.id)
      .populate('traveler', 'id name role')
      .populate('driver', 'id name role')
      .populate('vehicle', 'id model pricePerDay');

    return res.status(201).json({
      conversation: mapConversationResponse(responseConversation, req.user.id),
      message: createdMessage ? createdMessage.toJSON() : null,
      reuse: false,
    });
  } catch (error) {
    console.error('Start conversation error:', error);
    return res.status(500).json({ message: 'Unable to start conversation right now.' });
  }
};

export const listConversations = async (req, res) => {
  try {
    const conversations = await ChatConversation.find({
      $or: [{ traveler: req.user.id }, { driver: req.user.id }],
    })
      .populate('traveler', 'id name role')
      .populate('driver', 'id name role')
      .populate('vehicle', 'id model pricePerDay')
      .populate('lastMessage')
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(100);

    const payload = conversations.map((conversation) => {
      const mapped = mapConversationResponse(conversation, req.user.id);
      if (conversation.lastMessage) {
        mapped.lastMessage = conversation.lastMessage.toJSON();
      }
      mapped.participants = {
        traveler: conversation.traveler?.toJSON?.() || null,
        driver: conversation.driver?.toJSON?.() || null,
      };
      mapped.vehicle = conversation.vehicle?.toJSON?.() || null;
      return mapped;
    });

    return res.json({ conversations: payload });
  } catch (error) {
    console.error('List conversations error:', error);
    return res.status(500).json({ message: 'Unable to load conversations.' });
  }
};

export const fetchMessages = async (req, res) => {
  const { conversationId } = req.params;
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before;

  if (!isValidObjectId(conversationId)) {
    return res.status(400).json({ message: 'Invalid conversation identifier.' });
  }

  try {
    const conversation = await ChatConversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant =
      conversation.traveler.toString() === req.user.id ||
      conversation.driver.toString() === req.user.id;

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const filters = { conversation: conversationId };

    if (before && isValidObjectId(before)) {
      const beforeMessage = await ChatMessage.findById(before).select('createdAt');
      if (beforeMessage) {
        filters.createdAt = { $lt: beforeMessage.createdAt };
      }
    }

    const messages = await ChatMessage.find(filters)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'id name role')
      .populate('offer.vehicle', 'id model pricePerDay')
      .lean();

    await ChatMessage.updateMany(
      { conversation: conversationId, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );

    await markConversationAsRead(conversation, req.user.id);

    return res.json({
      messages: messages.reverse().map((message) => ({
        ...message,
        id: message._id.toString(),
        _id: undefined,
      })),
    });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return res.status(500).json({ message: 'Unable to load messages.' });
  }
};

export const sendMessage = async (req, res) => {
  const { conversationId } = req.params;
  const { body } = req.body || {};

  if (!isValidObjectId(conversationId)) {
    return res.status(400).json({ message: 'Invalid conversation identifier.' });
  }

  if (!body || !body.trim()) {
    return res.status(400).json({ message: 'Message content cannot be empty.' });
  }

  try {
    const conversation = await ChatConversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    let senderRole = null;
    if (conversation.traveler.toString() === req.user.id) {
      senderRole = USER_ROLES.GUEST;
    } else if (conversation.driver.toString() === req.user.id) {
      senderRole = USER_ROLES.DRIVER;
    } else {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const message = await createChatMessage({
      conversation,
      senderId: req.user.id,
      senderRole,
      content: body,
    });

    const response = await ChatMessage.findById(message.id)
      .populate('sender', 'id name role')
      .lean();

    return res.status(201).json({
      message: {
        ...response,
        id: response._id.toString(),
        _id: undefined,
      },
    });
  } catch (error) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Unable to send message right now.' });
  }
};

export const markConversationRead = async (req, res) => {
  const { conversationId } = req.params;

  if (!isValidObjectId(conversationId)) {
    return res.status(400).json({ message: 'Invalid conversation identifier.' });
  }

  try {
    const conversation = await ChatConversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    const isParticipant =
      conversation.traveler.toString() === req.user.id ||
      conversation.driver.toString() === req.user.id;

    if (!isParticipant) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    await markConversationAsRead(conversation, req.user.id);

    await ChatMessage.updateMany(
      { conversation: conversationId, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Mark conversation read error:', error);
    return res.status(500).json({ message: 'Unable to update conversation.' });
  }
};

export const sendOffer = async (req, res) => {
  const { conversationId } = req.params;
  const { startDate: startInput, endDate: endInput, vehicleId, totalPrice, totalKms, pricePerExtraKm, note } =
    req.body || {};

  if (!isValidObjectId(conversationId)) {
    return res.status(400).json({ message: 'Invalid conversation identifier.' });
  }

  if (!vehicleId || !isValidObjectId(vehicleId)) {
    return res.status(400).json({ message: 'Vehicle identifier is required.' });
  }

  const startDate = normalizeDateInput(startInput);
  const endDate = normalizeDateInput(endInput);

  if (!startDate || !endDate || endDate < startDate) {
    return res.status(400).json({ message: 'Start and end dates must be valid.' });
  }

  const normalizedTotalPrice = Number(totalPrice);
  const normalizedTotalKms = Number(totalKms);
  const normalizedExtraKmPrice = Number(pricePerExtraKm);

  if (
    Number.isNaN(normalizedTotalPrice) ||
    normalizedTotalPrice <= 0 ||
    Number.isNaN(normalizedTotalKms) ||
    normalizedTotalKms <= 0 ||
    Number.isNaN(normalizedExtraKmPrice) ||
    normalizedExtraKmPrice < 0
  ) {
    return res.status(400).json({ message: 'Offer pricing details are invalid.' });
  }

  try {
    const conversation = await ChatConversation.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    if (conversation.driver.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the assigned driver can send offers.' });
    }

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      driver: req.user.id,
    }).select('id model pricePerDay');

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found in your fleet.' });
    }

    const { sanitized: sanitizedNote, violations, warning } = sanitizeMessageContent(note || '');

    const offerSummary = `Offer: ${vehicle.model} • ${startDate.toDateString()} - ${endDate.toDateString()} • $${normalizedTotalPrice.toFixed(
      0
    )} total`;

    const message = await createChatMessage({
      conversation,
      senderId: req.user.id,
      senderRole: USER_ROLES.DRIVER,
      content: offerSummary,
      type: 'offer',
      offer: {
        startDate,
        endDate,
        vehicle: vehicle.id,
        totalPrice: normalizedTotalPrice,
        totalKms: normalizedTotalKms,
        pricePerExtraKm: normalizedExtraKmPrice,
        currency: 'USD',
      },
    });

    if (sanitizedNote) {
      message.body = `${message.body}\n\nNotes: ${sanitizedNote}`;
      if (violations.length > 0) {
        message.warning =
          message.warning ||
          warning ||
          'Contact details and direct links are hidden for safety. Share plans without posting phone numbers, emails, or URLs.';
        const mergedViolations = new Set([...(message.violations || []), ...violations]);
        message.violations = Array.from(mergedViolations);
      }
      await message.save();
    }

    const response = await ChatMessage.findById(message.id)
      .populate('sender', 'id name role')
      .populate('offer.vehicle', 'id model pricePerDay')
      .lean();

    return res.status(201).json({
      message: {
        ...response,
        id: response._id.toString(),
        _id: undefined,
      },
    });
  } catch (error) {
    console.error('Send offer error:', error);
    return res.status(500).json({ message: 'Unable to send offer right now.' });
  }
};

export const fetchOffer = async (req, res) => {
  const { offerId } = req.params;

  if (!isValidObjectId(offerId)) {
    return res.status(400).json({ message: 'Invalid offer identifier.' });
  }

  try {
    const message = await ChatMessage.findById(offerId)
      .populate('conversation')
      .populate('offer.vehicle', 'id model pricePerDay driver')
      .lean();

    if (!message || message.type !== 'offer') {
      return res.status(404).json({ message: 'Offer not found.' });
    }

    const { conversation } = message;

    if (
      conversation.traveler.toString() !== req.user.id &&
      conversation.driver.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    return res.json({
      offer: {
        id: message._id.toString(),
        conversationId: conversation._id.toString(),
        startDate: message.offer.startDate,
        endDate: message.offer.endDate,
        totalPrice: message.offer.totalPrice,
        totalKms: message.offer.totalKms,
        pricePerExtraKm: message.offer.pricePerExtraKm,
        currency: message.offer.currency,
        vehicle: message.offer.vehicle,
        note: message.body,
        warning: message.warning,
        createdAt: message.createdAt,
        driverId: conversation.driver.toString(),
        travelerId: conversation.traveler.toString(),
      },
    });
  } catch (error) {
    console.error('Fetch offer error:', error);
    return res.status(500).json({ message: 'Unable to load offer details.' });
  }
};

import ChatConversation from '../models/ChatConversation.js';
import '../models/Vehicle.js'; // registered for populate('vehicle') below
import { USER_ROLES } from '../models/User.js';
import { createChatMessage } from '../services/chatService.js';
import { passengerSummary } from './passengers.js';

const formatDay = (value) =>
  value ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '';

/**
 * Makes sure a booking has a chat between its traveller and driver, so either side
 * can message from the booking. Offer bookings reuse the offer's chat. A direct
 * booking reuses an existing chat for the same traveller, driver and vehicle, or
 * starts one with a short summary of the request (no email: the driver already gets
 * the booking email). Saves booking.conversation and returns the conversation id.
 */
export const ensureBookingConversation = async (booking, { vehicleModel } = {}) => {
  if (!booking) return null;
  if (booking.conversation) return booking.conversation;

  const offerConversation = booking.offerMessage?.conversation;
  if (offerConversation) {
    booking.conversation = offerConversation._id || offerConversation;
    await booking.save({ validateBeforeSave: false });
    return booking.conversation;
  }

  const traveler = booking.travelerUser;
  const driver = booking.driver?._id || booking.driver;
  // The vehicle id even when populate found no vehicle (e.g. it was deleted).
  const vehicle = (typeof booking.populated === 'function' && booking.populated('vehicle')) || booking.vehicle?._id || booking.vehicle || null;
  if (!traveler || !driver) return null;

  let conversation = await ChatConversation.findOne({ traveler, driver, vehicle });
  if (!conversation) {
    try {
      conversation = await ChatConversation.create({ traveler, driver, vehicle, createdBy: traveler });
    } catch (error) {
      // Created at the same moment by another request: use that one.
      if (error?.code !== 11000) throw error;
      conversation = await ChatConversation.findOne({ traveler, driver, vehicle });
    }
    const model = vehicleModel || booking.vehicle?.model || 'your vehicle';
    const passengers = passengerSummary(booking);
    const summary = [
      `Booking request: ${model}, ${formatDay(booking.startDate)} – ${formatDay(booking.endDate)}`,
      passengers,
      booking.startPoint && booking.endPoint ? `${booking.startPoint} → ${booking.endPoint}` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    await createChatMessage({
      conversation,
      senderId: traveler,
      senderRole: USER_ROLES.GUEST,
      content: summary,
      skipNotification: true,
    }).catch((error) => console.warn('Booking chat summary failed:', error?.message || error));
  }

  booking.conversation = conversation._id;
  await booking.save({ validateBeforeSave: false });
  return conversation._id;
};

/**
 * For booking lists (lean objects): gives older direct bookings that have no chat
 * one now, so "Message traveller" / "Message driver" always opens a conversation.
 * Sets `conversation` on the list items it fixes.
 */
export const attachMissingConversations = async (bookings, BookingModel) => {
  const missing = bookings.filter(
    (b) => !b.conversation && !b.offerMessage?.conversation && b.travelerUser && !['cancelled', 'rejected'].includes(b.status)
  );
  for (const item of missing) {
    try {
      const doc = await BookingModel.findById(item._id).populate({ path: 'vehicle', select: 'model' });
      if (!doc) continue;
      item.conversation = await ensureBookingConversation(doc, { vehicleModel: doc.vehicle?.model });
    } catch (error) {
      console.warn('Could not create chat for booking', String(item._id), error?.message || error);
    }
  }
};

export default { ensureBookingConversation, attachMissingConversations };

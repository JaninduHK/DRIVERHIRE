import { BOOKING_STATUS } from '../models/Booking.js';
import { USER_ROLES } from '../models/User.js';

/**
 * A traveller's email and phone number are only for a driver they have a
 * confirmed booking with. Until then (a pending request, or one that was
 * rejected or cancelled) the driver gets the name alone, so the two can only
 * talk through chat. Travellers and admins always see the full snapshot.
 */
export const canDriverSeeTravellerContact = (booking) =>
  booking?.status === BOOKING_STATUS.CONFIRMED;

export const travellerSnapshotFor = (booking, viewer) => {
  const traveler = booking?.traveler;
  if (!traveler) {
    return traveler ?? null;
  }
  if (viewer?.role !== USER_ROLES.DRIVER || canDriverSeeTravellerContact(booking)) {
    return traveler;
  }
  return { fullName: traveler.fullName };
};

export default { canDriverSeeTravellerContact, travellerSnapshotFor };

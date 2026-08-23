import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import { VEHICLE_AVAILABILITY_STATUS } from '../models/Vehicle.js';

// Same conflict rules used across vehicleController.js's listing/quote/booking
// flows: a date range is blocked if it overlaps either a driver-set
// "unavailable" entry or a booking that hasn't been cancelled/rejected.
export const rangesOverlap = (startA, endA, startB, endB) => startA <= endB && startB <= endA;

export const findAvailabilityConflict = (availabilityEntries = [], startDate, endDate) => {
  return (availabilityEntries || []).find((entry) => {
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

export const hasExistingBookingConflict = async (vehicleId, startDate, endDate) => {
  const conflict = await Booking.exists({
    vehicle: vehicleId,
    status: { $nin: [BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });
  return Boolean(conflict);
};

export const VEHICLE_UNAVAILABLE_MESSAGE =
  'Your vehicle is not available on selected dates. Check My Bookings or My Availability.';

// Convenience combined check for callers (offer creation) that just need a
// yes/no answer rather than the individual conflict details.
export const hasVehicleDateConflict = async (vehicle, startDate, endDate) => {
  if (findAvailabilityConflict(vehicle?.availability, startDate, endDate)) {
    return true;
  }
  return hasExistingBookingConflict(vehicle?.id || vehicle?._id, startDate, endDate);
};

import DeletedDriverRecord from '../models/DeletedDriverRecord.js';
import Booking, { BOOKING_STATUS } from '../models/Booking.js';
import Review from '../models/Review.js';
import Vehicle from '../models/Vehicle.js';
import DriverCommission, { COMMISSION_STATUS } from '../models/DriverCommission.js';
import { USER_ROLES } from '../models/User.js';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** How long an archived driver record is kept before it is destroyed. */
export const RETENTION_YEARS = 7;

export const purgeDateFor = (deletedAt = new Date()) =>
  new Date(new Date(deletedAt).getTime() + RETENTION_YEARS * YEAR_MS);

/**
 * Snapshot a driver's details before their account is anonymised.
 *
 * Must be called BEFORE the scrub — once anonymizeUser has run, the name, email
 * and contact number are gone and this would archive placeholders.
 *
 * Travellers are deliberately not archived: their erasure stays complete. A
 * driver has commission, payout and tax history that gives a reason to retain.
 */
export const archiveDriverForDeletion = async (user, { actorId = null } = {}) => {
  if (!user || user.role !== USER_ROLES.DRIVER) return null;

  // Deleting an already-archived driver should not throw on the unique index.
  const existing = await DeletedDriverRecord.findOne({ driver: user._id }).lean();
  if (existing) return existing;

  const [vehicles, bookings, commissions, reviewCount] = await Promise.all([
    Vehicle.find({ driver: user._id }).select('model year pricePerDay seats status').lean(),
    Booking.find({ driver: user._id })
      .select('status totalPrice commissionAmount endDate')
      .lean(),
    DriverCommission.find({ driver: user._id }).select('commissionDue status').lean(),
    Review.countDocuments({ driver: user._id }),
  ]);

  const settled = bookings.filter(
    (booking) => ![BOOKING_STATUS.CANCELLED, BOOKING_STATUS.REJECTED].includes(booking.status)
  );

  const activity = {
    bookings: bookings.length,
    completedBookings: settled.filter((booking) => booking.endDate && booking.endDate < new Date())
      .length,
    cancelledBookings: bookings.length - settled.length,
    grossRevenue: settled.reduce((sum, booking) => sum + (booking.totalPrice || 0), 0),
    commissionCharged: settled.reduce((sum, booking) => sum + (booking.commissionAmount || 0), 0),
    commissionOutstanding: commissions
      .filter((row) => row.status !== COMMISSION_STATUS.APPROVED)
      .reduce((sum, row) => sum + (row.commissionDue || 0), 0),
    reviewCount,
    lastBookingAt: settled.reduce(
      (latest, booking) => (!latest || booking.endDate > latest ? booking.endDate : latest),
      null
    ),
  };

  const deletedAt = new Date();

  return DeletedDriverRecord.create({
    driver: user._id,
    name: user.name,
    email: user.email,
    contactNumber: user.contactNumber,
    address: user.address,
    authProvider: user.authProvider,
    joinedAt: user.createdAt,
    driverStatus: user.driverStatus,
    driverApprovedAt: user.driverApprovedAt,
    experienceYears: user.experienceYears,
    licenseType: user.licenseType,
    licenseStatus: user.licenseStatus,
    licenseImage: user.licenseImage,
    licenseSubmittedAt: user.licenseSubmittedAt,
    licenseReviewedAt: user.licenseReviewedAt,
    vehicles: vehicles.map((vehicle) => ({
      model: vehicle.model,
      year: vehicle.year,
      pricePerDay: vehicle.pricePerDay,
      seats: vehicle.seats,
      status: vehicle.status,
    })),
    activity,
    deletedAt,
    deletedBy: actorId && actorId.toString() !== user._id.toString() ? 'admin' : 'self',
    actorId,
    purgeAfter: purgeDateFor(deletedAt),
  });
};

export default { archiveDriverForDeletion, purgeDateFor, RETENTION_YEARS };

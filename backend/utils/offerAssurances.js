import User, { LICENSE_STATUS } from '../models/User.js';
import Vehicle from '../models/Vehicle.js';
import { INSURANCE_STATE, insuranceState, startOfUtcDay } from './vehicleInsurance.js';
import { publicCredentials } from './driverCredentials.js';

/**
 * The "Good to know" checks shown with an offer in chat: whether the driver's
 * SLTDA licence and the offered vehicle's passenger insurance are verified.
 *
 * Worked out each time offers are read, never stored on the message, so a
 * licence that expires or cover that lapses after the offer was sent stops
 * showing as verified. Only yes/no leaves the server: the insurance documents
 * and dates stay private.
 */

const id = (value) => (value?._id || value)?.toString?.() || null;

export const isLicenceVerified = (driver, now = new Date()) =>
  Boolean(driver) &&
  driver.licenseStatus === LICENSE_STATUS.APPROVED &&
  (!driver.licenseExpiresAt || new Date(driver.licenseExpiresAt) >= now);

/** Verified, not flagged for re-checking, and in date through the trip's last day. */
export const isInsuranceVerifiedForTrip = (insurance, tripEnd, now = new Date()) => {
  if (!insurance || insurance.requestedAt) return false;
  const state = insuranceState(insurance, now);
  if (state !== INSURANCE_STATE.VERIFIED && state !== INSURANCE_STATE.EXPIRING) return false;
  if (!tripEnd) return true;
  return startOfUtcDay(insurance.endDate) >= startOfUtcDay(tripEnd);
};

/**
 * Sets `offer.assurances = { licenceVerified, insuranceVerified }` on every offer
 * message in `messages` (lean objects or documents). `driverId` is the
 * conversation's driver; offer vehicles may be populated or plain ids.
 */
export const attachOfferAssurances = async (messages, driverId) => {
  const offers = (Array.isArray(messages) ? messages : [messages]).filter(
    (message) => message?.type === 'offer' && message.offer
  );
  if (offers.length === 0) return;

  const vehicleIds = [...new Set(offers.map((message) => id(message.offer.vehicle)).filter(Boolean))];
  const [driver, vehicles] = await Promise.all([
    driverId ? User.findById(id(driverId)).select('licenseStatus licenseExpiresAt credentials').lean() : null,
    vehicleIds.length ? Vehicle.find({ _id: { $in: vehicleIds } }).select('+insurance').lean() : [],
  ]);
  const insuranceByVehicle = new Map(vehicles.map((vehicle) => [vehicle._id.toString(), vehicle.insurance]));
  const now = new Date();
  const licenceVerified = isLicenceVerified(driver, now);
  const credentials = publicCredentials(driver?.credentials);

  offers.forEach((message) => {
    message.offer.assurances = {
      licenceVerified,
      insuranceVerified: isInsuranceVerifiedForTrip(
        insuranceByVehicle.get(id(message.offer.vehicle)),
        message.offer.endDate,
        now
      ),
    };
    // The driver's admin-checked credentials: highlights show on the card, the
    // rest behind "See all credentials".
    if (credentials.length) message.offer.driverCredentials = credentials;
  });
};

export default attachOfferAssurances;

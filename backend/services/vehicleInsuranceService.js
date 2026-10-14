import Vehicle, { VEHICLE_STATUS } from '../models/Vehicle.js';
import '../models/User.js';
import { sendVehicleInsuranceEmail } from './emailService.js';
import { notifyUser } from './expoPushService.js';
import { INSURANCE_REMINDER_DAYS, startOfUtcDay } from '../utils/vehicleInsurance.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const INTERVAL_MS = HOUR;

const tellDriver = (vehicle, kind, push) => {
  const driver = vehicle.driver;
  if (!driver) return Promise.resolve();
  notifyUser(driver._id.toString(), { ...push, data: { type: 'vehicle', vehicleId: vehicle._id.toString() } });
  return sendVehicleInsuranceEmail({
    driver: { name: driver.name, email: driver.email },
    vehicle: { model: vehicle.model },
    kind,
    endDate: vehicle.insurance?.endDate,
  });
};

/**
 * Two checks on approved vehicles that have insurance on file. Vehicles approved
 * before insurance was collected have none and are left alone: an admin asks
 * for theirs one by one ("Request verification").
 *
 * 1. Cover ends within a week: remind the driver, once per cover period.
 * 2. Cover has ended: take the vehicle off the marketplace (status pending) and
 *    tell the driver. Cover runs through the whole of its end date, so this
 *    happens on the following day.
 *
 * Each vehicle is claimed with a conditional update BEFORE its email is sent, so
 * a failed send can never cause the same notice to go out again every hour.
 */
export const runVehicleInsuranceSweep = async ({ now = new Date() } = {}) => {
  const results = { reminded: 0, expired: 0, failed: 0 };
  const today = startOfUtcDay(now);
  const live = { deletedAt: null, status: VEHICLE_STATUS.APPROVED };

  try {
    const expiring = await Vehicle.find({
      ...live,
      'insurance.endDate': { $gte: today, $lte: new Date(today.getTime() + INSURANCE_REMINDER_DAYS * DAY) },
      'insurance.expiryReminderSentAt': null,
    })
      .select('+insurance')
      .populate('driver', 'name email')
      .limit(300);

    for (const vehicle of expiring) {
      try {
        const claimed = await Vehicle.updateOne(
          { _id: vehicle._id, 'insurance.expiryReminderSentAt': null },
          { $set: { 'insurance.expiryReminderSentAt': now } }
        );
        if (!claimed.modifiedCount) continue;
        await tellDriver(vehicle, 'expiring', {
          title: 'Insurance expires soon',
          body: `Update the insurance for ${vehicle.model} before it expires to stay on the marketplace.`,
        });
        results.reminded += 1;
      } catch (error) {
        results.failed += 1;
        console.error('Insurance reminder failed for vehicle', vehicle._id.toString(), error.message);
      }
    }

    const lapsed = await Vehicle.find({ ...live, 'insurance.endDate': { $lt: today } })
      .select('+insurance')
      .populate('driver', 'name email')
      .limit(300);

    for (const vehicle of lapsed) {
      try {
        const claimed = await Vehicle.updateOne(
          { _id: vehicle._id, status: VEHICLE_STATUS.APPROVED },
          { $set: { status: VEHICLE_STATUS.PENDING, 'insurance.expiredAt': now } }
        );
        if (!claimed.modifiedCount) continue;
        await tellDriver(vehicle, 'expired', {
          title: 'Insurance expired',
          body: `${vehicle.model} is off the marketplace. Upload your new passenger insurance document to put it back.`,
        });
        results.expired += 1;
      } catch (error) {
        results.failed += 1;
        console.error('Insurance expiry failed for vehicle', vehicle._id.toString(), error.message);
      }
    }

    if (results.reminded || results.expired || results.failed) {
      console.info('Vehicle insurance sweep:', JSON.stringify(results));
    }
  } catch (error) {
    console.error('Vehicle insurance sweep error:', error);
  }
  return results;
};

// Plain interval rather than a cron dependency, like the other sweeps: both
// checks are date-based, so a missed run simply catches up on the next tick.
export const startVehicleInsuranceScheduler = () => {
  if (process.env.DISABLE_VEHICLE_INSURANCE_CHECKS === 'true') {
    console.info('Vehicle insurance scheduler disabled via DISABLE_VEHICLE_INSURANCE_CHECKS.');
    return null;
  }
  const timer = setInterval(() => { runVehicleInsuranceSweep(); }, INTERVAL_MS);
  timer.unref?.();
  console.info('Vehicle insurance scheduler started (hourly).');
  return timer;
};

export default { runVehicleInsuranceSweep, startVehicleInsuranceScheduler };

import Booking, { BOOKING_STATUS, DEFAULT_COMMISSION_RATE } from '../models/Booking.js';
import DriverCommission from '../models/DriverCommission.js';
import User, { USER_ROLES, DRIVER_STATUS } from '../models/User.js';
import { sendCommissionDueEmail } from './emailService.js';
import buildAppUrl from '../utils/url.js';

const HOUR = 60 * 60 * 1000;
const INTERVAL_MS = HOUR;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const roundMoney = (value) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const clampRate = (value) => {
  if (!Number.isFinite(value)) return DEFAULT_COMMISSION_RATE;
  return Math.min(Math.max(value, 0), 1);
};

// Same fallback formula the earnings page and admin commissions list use, so all
// three can never disagree about what a booking owes.
const commissionForBooking = (booking) => {
  const rate = clampRate(booking.commissionRate);
  const gross = Number.isFinite(booking.payableTotal) && booking.payableTotal > 0
    ? booking.payableTotal
    : Number.isFinite(booking.totalPrice)
      ? booking.totalPrice
      : 0;
  return Number.isFinite(booking.commissionAmount) && booking.commissionAmount >= 0
    ? booking.commissionAmount
    : roundMoney(gross * rate);
};

/** The calendar month that has just finished, relative to `now`. */
export const previousMonthOf = (now = new Date()) => {
  const ref = new Date(now);
  const year = ref.getUTCFullYear();
  const month = ref.getUTCMonth(); // 0-indexed; this IS last month once we step back
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1, start, end };
};

/**
 * Emails every driver who owes commission for the month that just ended.
 *
 * Totals are computed from bookings, NOT from existing DriverCommission rows —
 * a row only exists once a driver has opened their earnings page, and the whole
 * point of this email is reaching the drivers who never look.
 */
export const runCommissionReminderSweep = async ({ now = new Date() } = {}) => {
  const results = { considered: 0, sent: 0, skipped: 0, failed: 0 };
  try {
    const period = previousMonthOf(now);
    const periodLabel = `${MONTH_NAMES[period.month - 1]} ${period.year}`;

    const bookings = await Booking.find({
      status: BOOKING_STATUS.CONFIRMED,
      endDate: { $gte: period.start, $lte: period.end },
    }).select('driver totalPrice payableTotal commissionRate commissionAmount');

    const byDriver = new Map();
    for (const booking of bookings) {
      if (!booking.driver) continue;
      const key = booking.driver.toString();
      const entry = byDriver.get(key) || { due: 0, bookingCount: 0 };
      entry.due += commissionForBooking(booking);
      entry.bookingCount += 1;
      byDriver.set(key, entry);
    }

    // Only drivers who actually owe something are contacted.
    const owing = [...byDriver.entries()].filter(([, v]) => roundMoney(v.due) > 0);
    results.considered = owing.length;
    if (owing.length === 0) return results;

    const drivers = await User.find({
      _id: { $in: owing.map(([id]) => id) },
      role: USER_ROLES.DRIVER,
      driverStatus: DRIVER_STATUS.APPROVED,
      deletedAt: null,
    }).select('name email');
    const driverMap = new Map(drivers.map((d) => [d._id.toString(), d]));

    const earningsUrl = buildAppUrl('/portal/driver#earnings');

    for (const [driverId, totals] of owing) {
      const driver = driverMap.get(driverId);
      if (!driver?.email) {
        results.skipped += 1;
        continue;
      }

      const due = roundMoney(totals.due);
      try {
        const record = await DriverCommission.findOneAndUpdate(
          { driver: driverId, year: period.year, month: period.month },
          { $setOnInsert: { driver: driverId, year: period.year, month: period.month } },
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        // Already chased for this month — never email twice.
        if (record.reminderSentAt) {
          results.skipped += 1;
          continue;
        }

        await sendCommissionDueEmail({
          to: driver.email,
          driverName: driver.name,
          periodLabel,
          amountLabel: `US$${due.toFixed(2)}`,
          bookingCount: totals.bookingCount,
          earningsUrl,
        });

        record.reminderSentAt = new Date();
        await record.save();
        results.sent += 1;
      } catch (error) {
        results.failed += 1;
        console.error('Commission reminder failed for driver', driverId, error.message);
      }
    }

    if (results.sent || results.failed) {
      console.info(`Commission reminder sweep (${periodLabel}):`, JSON.stringify(results));
    }
  } catch (error) {
    console.error('Commission reminder sweep error:', error);
  }
  return results;
};

// Hourly tick rather than a cron dependency, matching the other sweeps. The
// reminderSentAt guard makes it idempotent, so ticking often is harmless and a
// server that was down on the 1st simply catches up on its next tick.
export const startCommissionReminderScheduler = () => {
  if (process.env.DISABLE_COMMISSION_REMINDERS === 'true') {
    console.info('Commission reminder scheduler disabled via DISABLE_COMMISSION_REMINDERS.');
    return null;
  }
  const timer = setInterval(() => { runCommissionReminderSweep(); }, INTERVAL_MS);
  timer.unref?.();
  runCommissionReminderSweep();
  console.info('Commission reminder scheduler started (hourly, sends once per driver per month).');
  return timer;
};

export default { runCommissionReminderSweep, startCommissionReminderScheduler, previousMonthOf };

// Unpaid-commission freeze.
//
// Each month's commission must be marked paid (DriverCommission.status = approved)
// by the end of the 10th of the following month, Sri Lanka time. After that the
// driver is frozen: no messages, quotes or new bookings, and hidden from public
// listings (see utils/messagingSuspension.js and the listing queries). The freeze
// lifts as soon as every overdue month is paid or an admin grants extra time.
//
// Emails: one-time rule announcement, a warning on the 7th, a final notice on the
// 10th, a "frozen" notice, a reminder every few days while frozen, and an
// "active again" notice. Each is guarded by a timestamp so hourly ticks never repeat it.
import Booking, { BOOKING_STATUS, DEFAULT_COMMISSION_RATE } from '../models/Booking.js';
import DriverCommission, { COMMISSION_STATUS } from '../models/DriverCommission.js';
import User, { USER_ROLES, DRIVER_STATUS } from '../models/User.js';
import {
  sendCommissionFreezeWarningEmail,
  sendCommissionFrozenEmail,
  sendCommissionPolicyNoticeEmail,
  sendCommissionUnfrozenEmail,
} from './emailService.js';
import buildAppUrl from '../utils/url.js';

// First month whose commission is enforced: November 2026, so the first freeze can
// happen on 11 December 2026. Earlier months are never frozen automatically.
export const ENFORCE_FROM = { year: 2026, month: 11 };
const DEADLINE_DAY = 10;
const WARNING_DAY = 7;
const FROZEN_REMINDER_EVERY_MS = 3 * 24 * 60 * 60 * 1000;
const POLICY_NOTICES_PER_TICK = 40; // spread the announcement over a few hours of email quota
const SL_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // Sri Lanka is UTC+5:30, no daylight saving
const HOUR = 60 * 60 * 1000;

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const roundMoney = (value) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const moneyLabel = (value) => `US$${roundMoney(value).toFixed(2)}`;
const periodKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;
const periodLabel = (year, month) => `${MONTH_NAMES[month - 1]} ${year}`;
const comparePeriods = (a, b) => (a.year - b.year) * 12 + (a.month - b.month);

/** Year, month (1-12) and day of `now` on the Sri Lanka calendar. */
const slDate = (now) => {
  const d = new Date(now.getTime() + SL_OFFSET_MS);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
};

/** The moment a month's commission becomes overdue: end of the 10th of the next month, Sri Lanka time. */
export const deadlineFor = (year, month) =>
  new Date(Date.UTC(year, month, DEADLINE_DAY + 1) - SL_OFFSET_MS); // Date.UTC month is 0-based, so `month` = next month

export const deadlineLabel = (year, month) => {
  const next = new Date(Date.UTC(year, month, DEADLINE_DAY));
  return `${DEADLINE_DAY} ${MONTH_NAMES[next.getUTCMonth()]} ${next.getUTCFullYear()}`;
};

const previousPeriod = ({ year, month }) => (month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 });

const parseKey = (key) => {
  const [year, month] = String(key || '').split('-').map(Number);
  return Number.isInteger(year) && month >= 1 && month <= 12 ? { year, month } : null;
};

/** Where enforcement starts for a driver: the global start, or earlier if an admin chose. */
const enforceStartFor = (driver) => {
  const own = parseKey(driver?.commissionEnforceFrom);
  return own && comparePeriods(own, ENFORCE_FROM) < 0 ? own : ENFORCE_FROM;
};

/** Enforced months that have fully ended, oldest first. */
const endedEnforcedPeriods = (now, from = ENFORCE_FROM) => {
  const last = previousPeriod(slDate(now));
  const periods = [];
  for (let p = { ...from }; comparePeriods(p, last) <= 0; p = p.month === 12 ? { year: p.year + 1, month: 1 } : { year: p.year, month: p.month + 1 }) {
    periods.push(p);
  }
  return periods;
};

// Same formula as the reminder email and the earnings page: confirmed trips that
// ended in the month, net commission after any discount.
const commissionForBooking = (booking) => {
  const rate = Number.isFinite(booking.commissionRate) ? Math.min(Math.max(booking.commissionRate, 0), 1) : DEFAULT_COMMISSION_RATE;
  const gross = Number.isFinite(booking.payableTotal) && booking.payableTotal > 0
    ? booking.payableTotal
    : Number.isFinite(booking.totalPrice) ? booking.totalPrice : 0;
  return Number.isFinite(booking.commissionAmount) && booking.commissionAmount >= 0
    ? booking.commissionAmount
    : roundMoney(gross * rate);
};

/**
 * Makes sure every driver who owes commission for an enforced month has a
 * DriverCommission record with the amount, even if they never opened their
 * earnings page. Paid (approved) months are left untouched.
 */
const syncCommissionRecords = async (now, onlyDriverId = null, from = ENFORCE_FROM) => {
  for (const { year, month } of endedEnforcedPeriods(now, from)) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const filter = { status: BOOKING_STATUS.CONFIRMED, endDate: { $gte: start, $lte: end } };
    if (onlyDriverId) filter.driver = onlyDriverId;
    const bookings = await Booking.find(filter).select('driver totalPrice payableTotal commissionRate commissionAmount');

    const byDriver = new Map();
    for (const booking of bookings) {
      if (!booking.driver) continue;
      const key = booking.driver.toString();
      const entry = byDriver.get(key) || { due: 0, gross: 0, count: 0 };
      entry.due += commissionForBooking(booking);
      entry.gross += Number.isFinite(booking.payableTotal) && booking.payableTotal > 0 ? booking.payableTotal : booking.totalPrice || 0;
      entry.count += 1;
      byDriver.set(key, entry);
    }

    for (const [driverId, totals] of byDriver) {
      const due = roundMoney(totals.due);
      if (due <= 0) continue;
      await DriverCommission.updateOne(
        { driver: driverId, year, month, status: { $ne: COMMISSION_STATUS.APPROVED } },
        {
          $set: { commissionDue: due, bookingCount: totals.count, totalGross: roundMoney(totals.gross), driverEarnings: roundMoney(totals.gross - due) },
          $setOnInsert: { driver: driverId, year, month },
        },
        { upsert: true }
      ).catch((error) => {
        // A duplicate-key error means an approved row already exists for this month: nothing to do.
        if (error?.code !== 11000) throw error;
      });
    }
  }
};

const earningsUrl = () => buildAppUrl('/portal/driver#earnings');

/** Overdue, unpaid enforced months for these drivers, as a Map driverId -> [{ year, month, due }]. */
// Months before the global start (only for drivers an admin chose) are overdue as
// soon as they have ended: they are already long past their usual deadline.
const isOverdue = (p, now) => comparePeriods(p, ENFORCE_FROM) < 0 || deadlineFor(p.year, p.month) <= now;

const overdueByDriver = async (now, driverIds = null, from = ENFORCE_FROM) => {
  const ended = endedEnforcedPeriods(now, from).filter((p) => isOverdue(p, now));
  const result = new Map();
  if (!ended.length) return result;
  const filter = {
    $or: ended.map(({ year, month }) => ({ year, month })),
    status: { $ne: COMMISSION_STATUS.APPROVED },
    commissionDue: { $gt: 0 },
  };
  if (driverIds) filter.driver = { $in: driverIds };
  const records = await DriverCommission.find(filter).select('driver year month commissionDue').lean();
  for (const r of records) {
    const key = r.driver.toString();
    const list = result.get(key) || [];
    list.push({ year: r.year, month: r.month, due: r.commissionDue });
    result.set(key, list);
  }
  for (const list of result.values()) list.sort(comparePeriods);
  return result;
};

const periodsForEmail = (overdue) => overdue.map((p) => ({ label: periodLabel(p.year, p.month), amountLabel: moneyLabel(p.due) }));

/**
 * Freezes or unfreezes one driver to match their overdue months, and sends the
 * frozen / still-frozen / active-again emails. Returns 'frozen', 'unfrozen' or null.
 */
const applyFreezeState = async (driver, overdue, now) => {
  const graceActive = driver.commissionGraceUntil && new Date(driver.commissionGraceUntil) > now;
  const shouldFreeze = overdue.length > 0 && !graceActive;
  const keys = overdue.map((p) => periodKey(p.year, p.month));

  if (shouldFreeze && !driver.commissionFrozenAt) {
    driver.commissionFrozenAt = now;
    driver.commissionFrozenPeriods = keys;
    driver.commissionFreezeReminderAt = now;
    await driver.save({ validateBeforeSave: false });
    if (driver.email) {
      await sendCommissionFrozenEmail({ to: driver.email, driverName: driver.name, periods: periodsForEmail(overdue), earningsUrl: earningsUrl() })
        .catch((error) => console.error('Commission frozen email failed for', driver.id, error.message));
    }
    return 'frozen';
  }

  if (shouldFreeze) {
    const changed = keys.join() !== (driver.commissionFrozenPeriods || []).join();
    const reminderDue = !driver.commissionFreezeReminderAt || now - new Date(driver.commissionFreezeReminderAt) >= FROZEN_REMINDER_EVERY_MS;
    if (changed) driver.commissionFrozenPeriods = keys;
    if (reminderDue) driver.commissionFreezeReminderAt = now;
    if (changed || reminderDue) await driver.save({ validateBeforeSave: false });
    if (reminderDue && driver.email) {
      await sendCommissionFrozenEmail({ to: driver.email, driverName: driver.name, periods: periodsForEmail(overdue), reminder: true, earningsUrl: earningsUrl() })
        .catch((error) => console.error('Commission frozen reminder failed for', driver.id, error.message));
    }
    return null;
  }

  if (driver.commissionFrozenAt) {
    driver.commissionFrozenAt = null;
    driver.commissionFrozenPeriods = [];
    driver.commissionFreezeReminderAt = null;
    await driver.save({ validateBeforeSave: false });
    if (driver.email) {
      await sendCommissionUnfrozenEmail({ to: driver.email, driverName: driver.name, dashboardUrl: buildAppUrl('/portal/driver') })
        .catch((error) => console.error('Commission unfrozen email failed for', driver.id, error.message));
    }
    return 'unfrozen';
  }
  return null;
};

const FREEZE_FIELDS = 'name email role driverStatus deletedAt commissionFrozenAt commissionFrozenPeriods commissionGraceUntil commissionFreezeReminderAt commissionEnforceFrom';

/**
 * Re-checks one driver straight away, e.g. right after an admin marks a month
 * paid or grants extra time, so they don't wait for the hourly sweep.
 */
export const refreshDriverFreeze = async (driverId, { now = new Date() } = {}) => {
  try {
    const driver = await User.findOne({ _id: driverId, role: USER_ROLES.DRIVER }).select(FREEZE_FIELDS);
    if (!driver) return null;
    const from = enforceStartFor(driver);
    await syncCommissionRecords(now, driver._id, from);
    const overdue = (await overdueByDriver(now, [driver._id], from)).get(driver._id.toString()) || [];
    return await applyFreezeState(driver, overdue, now);
  } catch (error) {
    console.error('Commission freeze refresh failed for driver', driverId, error);
    return null;
  }
};

/** Warning on the 7th–9th and final notice on the 10th for last month's unpaid commission. */
const sendDeadlineWarnings = async (now, results) => {
  const today = slDate(now);
  if (today.day < WARNING_DAY || today.day > DEADLINE_DAY) return;
  const period = previousPeriod(today);
  if (comparePeriods(period, ENFORCE_FROM) < 0) return;
  const final = today.day === DEADLINE_DAY;
  const sentField = final ? 'freezeFinalNoticeSentAt' : 'freezeWarningSentAt';

  const records = await DriverCommission.find({
    year: period.year,
    month: period.month,
    status: { $ne: COMMISSION_STATUS.APPROVED },
    commissionDue: { $gt: 0 },
    [sentField]: null,
  });
  if (!records.length) return;
  const drivers = await User.find({
    _id: { $in: records.map((r) => r.driver) },
    role: USER_ROLES.DRIVER,
    driverStatus: DRIVER_STATUS.APPROVED,
    deletedAt: null,
  }).select('name email');
  const driverMap = new Map(drivers.map((d) => [d._id.toString(), d]));

  for (const record of records) {
    const driver = driverMap.get(record.driver.toString());
    if (!driver?.email) continue;
    try {
      await sendCommissionFreezeWarningEmail({
        to: driver.email,
        driverName: driver.name,
        periodLabel: periodLabel(period.year, period.month),
        amountLabel: moneyLabel(record.commissionDue),
        deadlineLabel: deadlineLabel(period.year, period.month),
        final,
        earningsUrl: earningsUrl(),
      });
      record[sentField] = now;
      await record.save();
      results.warnings += 1;
    } catch (error) {
      console.error('Commission freeze warning failed for driver', driver.id, error.message);
    }
  }
};

/** One-time announcement of the rule to approved drivers, a batch per tick. */
const sendPolicyNotices = async (now, results) => {
  const drivers = await User.find({
    role: USER_ROLES.DRIVER,
    driverStatus: DRIVER_STATUS.APPROVED,
    deletedAt: null,
    commissionPolicyNoticeSentAt: null,
    email: { $exists: true, $ne: '' },
  })
    .select('name email commissionPolicyNoticeSentAt')
    .limit(POLICY_NOTICES_PER_TICK);
  for (const driver of drivers) {
    try {
      await sendCommissionPolicyNoticeEmail({
        to: driver.email,
        driverName: driver.name,
        firstDeadlineLabel: deadlineLabel(ENFORCE_FROM.year, ENFORCE_FROM.month),
        earningsUrl: earningsUrl(),
      });
      driver.commissionPolicyNoticeSentAt = now;
      await driver.save({ validateBeforeSave: false });
      results.notices += 1;
    } catch (error) {
      console.error('Commission policy notice failed for driver', driver.id, error.message);
    }
  }
};

export const runCommissionFreezeSweep = async ({ now = new Date() } = {}) => {
  const results = { frozen: 0, unfrozen: 0, warnings: 0, notices: 0 };
  try {
    await sendPolicyNotices(now, results);
    await syncCommissionRecords(now);
    await sendDeadlineWarnings(now, results);

    const overdue = await overdueByDriver(now);
    // Drivers an admin set to also enforce older months: check them from their own start.
    const early = await User.find({ role: USER_ROLES.DRIVER, commissionEnforceFrom: { $ne: null } }).select('commissionEnforceFrom');
    for (const driver of early) {
      const from = enforceStartFor(driver);
      if (comparePeriods(from, ENFORCE_FROM) >= 0) continue;
      await syncCommissionRecords(now, driver._id, from);
      const own = (await overdueByDriver(now, [driver._id], from)).get(driver._id.toString());
      if (own?.length) overdue.set(driver._id.toString(), own);
    }
    // Everyone overdue, plus everyone currently frozen (who may now be clear).
    const drivers = await User.find({
      role: USER_ROLES.DRIVER,
      $or: [{ _id: { $in: [...overdue.keys()] } }, { commissionFrozenAt: { $ne: null } }],
    }).select(FREEZE_FIELDS);
    for (const driver of drivers) {
      const outcome = await applyFreezeState(driver, overdue.get(driver._id.toString()) || [], now);
      if (outcome === 'frozen') results.frozen += 1;
      if (outcome === 'unfrozen') results.unfrozen += 1;
    }

    if (Object.values(results).some(Boolean)) {
      console.info('Commission freeze sweep:', JSON.stringify(results));
    }
  } catch (error) {
    console.error('Commission freeze sweep error:', error);
  }
  return results;
};

export const startCommissionFreezeScheduler = () => {
  if (process.env.DISABLE_COMMISSION_FREEZE === 'true') {
    console.info('Commission freeze scheduler disabled via DISABLE_COMMISSION_FREEZE.');
    return null;
  }
  const timer = setInterval(() => { runCommissionFreezeSweep(); }, HOUR);
  timer.unref?.();
  runCommissionFreezeSweep();
  console.info('Commission freeze scheduler started (hourly).');
  return timer;
};

export default { runCommissionFreezeSweep, startCommissionFreezeScheduler, refreshDriverFreeze, deadlineFor, ENFORCE_FROM };

import Booking, { BOOKING_STATUS, DEFAULT_COMMISSION_RATE } from '../models/Booking.js';
import DriverCommission, {
  COMMISSION_STATUS,
} from '../models/DriverCommission.js';
import CommissionDiscount from '../models/CommissionDiscount.js';
import { buildAssetUrl } from '../utils/assetUtils.js';
import * as cloudinaryService from '../services/cloudinaryService.js';

const BANK_DETAILS = {
  accountName: process.env.PLATFORM_BANK_ACCOUNT_NAME || 'Car With Driver Operations',
  accountNumber: process.env.PLATFORM_BANK_ACCOUNT_NUMBER || '0001234567',
  bankName: process.env.PLATFORM_BANK_NAME || 'National Bank of Sri Lanka',
  branch: process.env.PLATFORM_BANK_BRANCH || 'Colombo HQ',
  swiftCode: process.env.PLATFORM_BANK_SWIFT || '',
  referenceNote:
    process.env.PLATFORM_BANK_REFERENCE ||
    'Use your Car With Driver ID and the commission month as the payment reference.',
};

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const clampRate = (value) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_COMMISSION_RATE;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
};

const roundCurrency = (value) => Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
const roundRate = (value) => Math.round((Number.isFinite(value) ? value : 0) * 10000) / 10000;

const parseMonthParam = (value) => {
  if (!value || typeof value !== 'string') {
    const now = new Date();
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }
  const [yearPart, monthPart] = value.split('-');
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    year < 2000
  ) {
    throw new Error('Month must be formatted as YYYY-MM');
  }
  return { year, month };
};

const buildPeriodMeta = (year, month) => {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const label = `${MONTH_NAMES[month - 1]} ${year}`;
  return {
    value: `${year}-${String(month).padStart(2, '0')}`,
    label,
    periodStart: start.toISOString(),
    periodEnd: lastDay.toISOString(),
    commissionDueDate: lastDay.toISOString(),
  };
};

const summariseBooking = (booking) => {
  const gross = Number.isFinite(booking.totalPrice) ? booking.totalPrice : 0;
  const baseRate = clampRate(booking.commissionBaseRate);
  const rate = clampRate(booking.commissionRate);
  const discountRate =
    Number.isFinite(booking.commissionDiscountRate) && booking.commissionDiscountRate > 0
      ? clampRate(booking.commissionDiscountRate)
      : 0;
  const discountAmount =
    Number.isFinite(booking.discountAmount) && booking.discountAmount > 0
      ? roundCurrency(booking.discountAmount)
      : roundCurrency(gross * discountRate);
  const payableTotal =
    Number.isFinite(booking.payableTotal) && booking.payableTotal > 0
      ? roundCurrency(booking.payableTotal)
      : roundCurrency(Math.max(gross - discountAmount, 0));
  const commissionAmount =
    Number.isFinite(booking.commissionAmount) && booking.commissionAmount >= 0
      ? booking.commissionAmount
      : roundCurrency(gross * rate);
  const driverEarnings =
    Number.isFinite(booking.driverEarnings) && booking.driverEarnings >= 0
      ? booking.driverEarnings
      : roundCurrency(payableTotal - commissionAmount);

  const travelerName =
    booking.traveler?.fullName ||
    booking.traveler?.email ||
    booking.traveler?.phoneNumber ||
    'Traveller';

  return {
    id: booking.id,
    startDate: booking.startDate,
    endDate: booking.endDate,
    status: booking.status,
    totalPrice: gross,
    payableTotal,
    discountAmount,
    commissionBaseRate: baseRate,
    commissionRate: rate,
    commissionDiscountRate:
      Number.isFinite(booking.commissionDiscountRate) && booking.commissionDiscountRate > 0
        ? clampRate(booking.commissionDiscountRate)
        : 0,
    commissionDiscountLabel: booking.commissionDiscountLabel || '',
    commissionDiscountId: booking.commissionDiscount?.toString() || null,
    commissionAmount,
    driverEarnings,
    travelerName,
  };
};

const shapeCommissionRecord = (record, req) => {
  if (!record) {
    return null;
  }
  const payload = typeof record.toJSON === 'function' ? record.toJSON() : record;
  payload.paymentSlipUrl = buildAssetUrl(payload.paymentSlipUrl, req);
  return payload;
};

export const getDriverEarningsSummary = async (req, res) => {
  try {
    const { year, month } = parseMonthParam(req.query.month);
    const periodMeta = buildPeriodMeta(year, month);

    const periodStart = new Date(periodMeta.periodStart);
    const periodEnd = new Date(periodMeta.periodEnd);

    const bookings = await Booking.find({
      driver: req.user.id,
      status: BOOKING_STATUS.CONFIRMED,
      endDate: { $gte: periodStart, $lte: periodEnd },
    })
      .sort({ endDate: 1 })
      .exec();

    let totalGross = 0;
    let totalCommission = 0;
    const bookingSummaries = [];

    for (const booking of bookings) {
      const rate = clampRate(booking.commissionRate);
      const gross = Number.isFinite(booking.payableTotal) && booking.payableTotal > 0
        ? Math.max(booking.payableTotal, 0)
        : Number.isFinite(booking.totalPrice)
          ? Math.max(booking.totalPrice, 0)
          : 0;
      const commissionAmount =
        Number.isFinite(booking.commissionAmount) && booking.commissionAmount >= 0
          ? booking.commissionAmount
          : roundCurrency(gross * rate);
      const driverEarnings =
        Number.isFinite(booking.driverEarnings) && booking.driverEarnings >= 0
          ? booking.driverEarnings
          : roundCurrency(gross - commissionAmount);

      if (
        booking.commissionRate !== rate ||
        booking.commissionAmount !== commissionAmount ||
        booking.driverEarnings !== driverEarnings
      ) {
        booking.commissionRate = rate;
        booking.commissionAmount = commissionAmount;
        booking.driverEarnings = driverEarnings;
        await booking.save();
      }

      bookingSummaries.push(
        summariseBooking({
          ...booking.toObject(),
          commissionRate: rate,
          commissionAmount,
          driverEarnings,
        })
      );

      totalGross += gross;
      totalCommission += commissionAmount;
    }

    const commissionDue = roundCurrency(totalCommission);
    const driverEarningsTotal = roundCurrency(totalGross - commissionDue);
    const effectiveRate = totalGross > 0 ? roundRate(totalCommission / totalGross) : 0;
    const fallbackRate = totalGross > 0 ? effectiveRate : DEFAULT_COMMISSION_RATE;

    let commissionRecord = await DriverCommission.findOne({
      driver: req.user.id,
      year,
      month,
    });

    if (!commissionRecord) {
      commissionRecord = new DriverCommission({
        driver: req.user.id,
        year,
        month,
      });
    }

    commissionRecord.bookingCount = bookingSummaries.length;
    commissionRecord.totalGross = roundCurrency(totalGross);
    commissionRecord.commissionRate = clampRate(fallbackRate);
    commissionRecord.commissionDue = commissionDue;
    commissionRecord.driverEarnings = driverEarningsTotal;
    commissionRecord.lastRecalculatedAt = new Date();

    await commissionRecord.save();

    const activeDiscount = await CommissionDiscount.findOne({
      active: true,
      startDate: { $lte: periodEnd },
      endDate: { $gte: periodStart },
    })
      .sort({ discountRate: -1, startDate: -1 })
      .exec();

    return res.json({
      period: periodMeta,
      totals: {
        bookingCount: bookingSummaries.length,
        totalGross: roundCurrency(totalGross),
        commissionDue,
        commissionRate: commissionRecord.commissionRate,
        effectiveCommissionRate: effectiveRate,
        driverEarnings: driverEarningsTotal,
      },
      commission: shapeCommissionRecord(commissionRecord, req),
      bookings: bookingSummaries,
      discount: activeDiscount ? activeDiscount.toJSON() : null,
      bankDetails: BANK_DETAILS,
    });
  } catch (error) {
    console.error('Driver earnings summary error:', error);
    if (error.message === 'Month must be formatted as YYYY-MM') {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Unable to load earnings summary right now.' });
  }
};

export const getDriverEarningsHistory = async (req, res) => {
  try {
    const commissions = await DriverCommission.find({ driver: req.user.id })
      .sort({ year: -1, month: -1 })
      .limit(24)
      .lean();

    const history = commissions.map((entry) => ({
      id: entry._id.toString(),
      period: buildPeriodMeta(entry.year, entry.month),
      totals: {
        bookingCount: entry.bookingCount ?? 0,
        totalGross: entry.totalGross ?? 0,
        commissionDue: entry.commissionDue ?? 0,
        commissionRate: entry.commissionRate ?? DEFAULT_COMMISSION_RATE,
        effectiveCommissionRate: entry.commissionRate ?? DEFAULT_COMMISSION_RATE,
        driverEarnings: entry.driverEarnings ?? 0,
      },
      status: entry.status,
      paymentSlipUrl: buildAssetUrl(entry.paymentSlipUrl || '', req),
      paymentSlipUploadedAt: entry.paymentSlipUploadedAt || null,
      updatedAt: entry.updatedAt,
    }));

    return res.json({ history });
  } catch (error) {
    console.error('Driver earnings history error:', error);
    return res.status(500).json({ message: 'Unable to load earnings history.' });
  }
};

export const uploadCommissionPaymentSlip = async (req, res) => {
  try {
    const { commissionId } = req.params;
    if (!commissionId) {
      return res.status(400).json({ message: 'Commission reference is required.' });
    }

    const commission = await DriverCommission.findOne({
      _id: commissionId,
      driver: req.user.id,
    });

    if (!commission) {
      return res.status(404).json({ message: 'Commission record not found.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Payment slip not provided.' });
    }

    // Delete old payment slip from Cloudinary if it exists
    if (commission.paymentSlipUrl && cloudinaryService.isCloudinaryUrl(commission.paymentSlipUrl)) {
      try {
        // Determine resource type based on the old file (could be PDF or image)
        const resourceType = commission.paymentSlipUrl.includes('.pdf') ? 'raw' : 'image';
        await cloudinaryService.deleteAsset(commission.paymentSlipUrl, resourceType);
      } catch (deleteError) {
        console.warn('Failed to delete old payment slip from Cloudinary:', deleteError.message);
        // Continue with upload even if delete fails
      }
    }

    // Determine resource type based on MIME type
    const isPdf = req.file.mimetype === 'application/pdf';
    const resourceType = isPdf ? 'raw' : 'image';

    // Upload to Cloudinary
    try {
      const filename = cloudinaryService.generateUniqueFilename(`commission-${commissionId}`);
      const cloudinaryUrl = await cloudinaryService.uploadFile(
        req.file.buffer,
        'commissions',
        filename,
        resourceType
      );

      commission.paymentSlipUrl = cloudinaryUrl;
      commission.paymentSlipFilename = filename; // Store just the filename for reference
      commission.paymentSlipUploadedAt = new Date();
      commission.status = COMMISSION_STATUS.SUBMITTED;
      await commission.save();

      return res.json({
        message: 'Payment slip uploaded successfully.',
        commission: shapeCommissionRecord(commission, req),
      });
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return res.status(500).json({
        message: `Failed to upload payment slip: ${uploadError.message}`,
      });
    }
  } catch (error) {
    console.error('Upload commission slip error:', error);
    return res.status(500).json({ message: 'Unable to upload payment slip right now.' });
  }
};

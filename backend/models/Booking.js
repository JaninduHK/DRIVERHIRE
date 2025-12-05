import mongoose from 'mongoose';
import CommissionDiscount, { MAX_DISCOUNT_RATE } from './CommissionDiscount.js';

export const DEFAULT_COMMISSION_RATE = 0.08;

export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
};

const statusValues = Object.values(BOOKING_STATUS);

const travelerSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
      index: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    traveler: {
      type: travelerSchema,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
    flightNumber: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    arrivalTime: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    departureTime: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    startPoint: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    endPoint: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    specialRequests: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    totalDays: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    commissionBaseRate: {
      type: Number,
      default: 0.08,
      min: 0,
      max: 1,
    },
    commissionRate: {
      type: Number,
      default: 0.08,
      min: 0,
      max: 1,
    },
    commissionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionDiscountRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },
    commissionDiscount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CommissionDiscount',
    },
    commissionDiscountLabel: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    driverEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: statusValues,
      default: BOOKING_STATUS.PENDING,
      index: true,
    },
    paymentNote: {
      type: String,
      trim: true,
      default: 'Payment will be collected by your driver on the first day of the trip.',
    },
    travelerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    offerMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const clampRate = (value, { fallback = DEFAULT_COMMISSION_RATE, max = 1 } = {}) => {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (value < 0) {
    return 0;
  }
  if (value > max) {
    return max;
  }
  return value;
};

const roundCurrency = (value) => {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
};

const RATE_EPSILON = 1e-6;

const valuesAreEqual = (current, next) => {
  if (current === undefined || current === null) {
    return next === undefined || next === null;
  }
  if (typeof current === 'number' && typeof next === 'number') {
    return Math.abs(current - next) < RATE_EPSILON;
  }
  if (
    current instanceof mongoose.Types.ObjectId ||
    (current && typeof current.toString === 'function')
  ) {
    const currentString = current.toString();
    const nextString =
      next instanceof mongoose.Types.ObjectId || (next && typeof next.toString === 'function')
        ? next.toString()
        : next;
    return currentString === nextString;
  }
  return current === next;
};

const assignIfChanged = (doc, path, value) => {
  const current = doc[path];
  if (value === undefined || value === null) {
    if (current === undefined || current === null) {
      return false;
    }
    doc.set(path, undefined);
    return true;
  }
  if (valuesAreEqual(current, value)) {
    return false;
  }
  doc.set(path, value);
  return true;
};

const findActiveDiscountForDate = async (date) => {
  if (!date) {
    return null;
  }
  const targetDate = new Date(date);
  if (Number.isNaN(targetDate.getTime())) {
    return null;
  }
  const discount = await CommissionDiscount.findOne({
    active: true,
    startDate: { $lte: targetDate },
    endDate: { $gte: targetDate },
  })
    .sort({ discountRate: -1, startDate: -1 })
    .exec();
  return discount;
};

bookingSchema.methods.applyCommissionRules = async function applyCommissionRules() {
  const baseRate = clampRate(this.commissionBaseRate, { fallback: DEFAULT_COMMISSION_RATE });
  const gross = Number.isFinite(this.totalPrice) ? Math.max(this.totalPrice, 0) : 0;
  let discountRate = 0;
  let discountLabel;
  let discountRef;

  if (this.startDate) {
    const discount = await findActiveDiscountForDate(this.startDate);
    if (discount) {
      const normalizedDiscount = clampRate(discount.discountRate, {
        fallback: 0,
        max: Math.min(MAX_DISCOUNT_RATE, baseRate),
      });
      discountRate = normalizedDiscount;
      discountLabel = discount.name;
      discountRef = discount._id;
    }
  }

  const effectiveDiscountRate = discountRate > baseRate ? baseRate : discountRate;
  const effectiveRate = clampRate(baseRate - effectiveDiscountRate, { fallback: baseRate, max: 1 });
  const commission = roundCurrency(gross * effectiveRate);
  const driverTake = roundCurrency(gross - commission);

  let changed = false;
  changed = assignIfChanged(this, 'commissionBaseRate', baseRate) || changed;
  changed = assignIfChanged(this, 'commissionDiscountRate', effectiveDiscountRate) || changed;
  changed =
    assignIfChanged(this, 'commissionDiscountLabel', discountLabel || undefined) || changed;
  changed = assignIfChanged(this, 'commissionDiscount', discountRef) || changed;
  changed = assignIfChanged(this, 'commissionRate', effectiveRate) || changed;
  changed = assignIfChanged(this, 'commissionAmount', commission) || changed;
  changed = assignIfChanged(this, 'driverEarnings', driverTake) || changed;

  if (!this.$locals) {
    this.$locals = {};
  }
  this.$locals.commissionRulesApplied = true;

  return changed;
};

bookingSchema.pre('save', async function recomputeCommission(next) {
  if (this.$locals?.commissionRulesApplied) {
    this.$locals.commissionRulesApplied = false;
    next();
    return;
  }
  try {
    await this.applyCommissionRules();
    next();
  } catch (error) {
    next(error);
  }
});

bookingSchema.index({ vehicle: 1, startDate: 1, endDate: 1 });

bookingSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (ret.commissionDiscount) {
      ret.commissionDiscount = ret.commissionDiscount.toString();
    }
    if (ret.travelerUser) {
      ret.travelerUser = ret.travelerUser.toString();
    }
    return ret;
  },
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;

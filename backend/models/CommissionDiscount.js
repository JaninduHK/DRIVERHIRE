import mongoose from 'mongoose';

export const MAX_DISCOUNT_RATE = 0.08;

const commissionDiscountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    discountRate: {
      type: Number,
      required: true,
      min: 0,
      max: MAX_DISCOUNT_RATE,
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
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

commissionDiscountSchema.index({ startDate: 1, endDate: 1 });
commissionDiscountSchema.index({ active: 1, startDate: 1 });

commissionDiscountSchema.pre('validate', function validateRange(next) {
  if (
    this.startDate &&
    this.endDate &&
    this.startDate instanceof Date &&
    this.endDate instanceof Date &&
    this.endDate < this.startDate
  ) {
    this.invalidate('endDate', 'End date must be on or after the start date.');
  }
  next();
});

const determineStatus = (discount, referenceDate = new Date()) => {
  if (!discount) {
    return 'inactive';
  }
  if (!discount.active) {
    return 'disabled';
  }
  const now = new Date(referenceDate);
  const start = new Date(discount.startDate);
  const end = new Date(discount.endDate);
  if (Number.isNaN(now.getTime()) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 'inactive';
  }
  if (now < start) {
    return 'scheduled';
  }
  if (now > end) {
    return 'expired';
  }
  return 'active';
};

commissionDiscountSchema.methods.getStatus = function getStatus(referenceDate = new Date()) {
  return determineStatus(this, referenceDate);
};

commissionDiscountSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.status = determineStatus(ret);
    ret.discountPercent = Math.round(((ret.discountRate ?? 0) * 100 + Number.EPSILON) * 100) / 100;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const CommissionDiscount = mongoose.model('CommissionDiscount', commissionDiscountSchema);

export default CommissionDiscount;

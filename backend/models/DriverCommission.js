import mongoose from 'mongoose';

export const COMMISSION_STATUS = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
};

const statusValues = Object.values(COMMISSION_STATUS);

const driverCommissionSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    bookingCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGross: {
      type: Number,
      default: 0,
      min: 0,
    },
    commissionRate: {
      type: Number,
      default: 0.08,
      min: 0,
      max: 1,
    },
    commissionDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    driverEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: statusValues,
      default: COMMISSION_STATUS.PENDING,
      index: true,
    },
    paymentSlipUrl: {
      type: String,
      trim: true,
    },
    paymentSlipFilename: {
      type: String,
      trim: true,
    },
    paymentSlipUploadedAt: Date,
    adminNote: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    lastRecalculatedAt: Date,
  },
  {
    timestamps: true,
  }
);

driverCommissionSchema.index({ driver: 1, year: 1, month: 1 }, { unique: true });

driverCommissionSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.driver = ret.driver?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const DriverCommission = mongoose.model('DriverCommission', driverCommissionSchema);

export default DriverCommission;

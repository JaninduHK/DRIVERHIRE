import mongoose from 'mongoose';

export const VEHICLE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const VEHICLE_AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
};

const statusValues = Object.values(VEHICLE_STATUS);
const availabilityStatusValues = Object.values(VEHICLE_AVAILABILITY_STATUS);

const availabilitySchema = new mongoose.Schema(
  {
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: availabilityStatusValues,
      default: VEHICLE_AVAILABILITY_STATUS.AVAILABLE,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    _id: true,
    timestamps: true,
  }
);

const vehicleSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    year: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    pricePerDay: {
      type: Number,
      required: true,
      min: 35,
      max: 250,
    },
    seats: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: statusValues,
      default: VEHICLE_STATUS.PENDING,
      index: true,
    },
    rejectedReason: {
      type: String,
      trim: true,
    },
    reviewedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    images: {
      type: [String],
      default: [],
    },
    englishSpeakingDriver: {
      type: Boolean,
      default: false,
    },
    meetAndGreetAtAirport: {
      type: Boolean,
      default: false,
    },
    fuelAndInsurance: {
      type: Boolean,
      default: false,
    },
    driverMealsAndAccommodation: {
      type: Boolean,
      default: false,
    },
    parkingFeesAndTolls: {
      type: Boolean,
      default: false,
    },
    allTaxes: {
      type: Boolean,
      default: false,
    },
    availability: {
      type: [availabilitySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

vehicleSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    if (Array.isArray(ret.availability)) {
      ret.availability = ret.availability
        .map((entry) => ({
          id: entry._id ? entry._id.toString() : entry.id,
          startDate: entry.startDate,
          endDate: entry.endDate,
          status: entry.status,
          note: entry.note,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        }))
        .sort((a, b) => {
          const aTime = a.startDate ? new Date(a.startDate).getTime() : 0;
          const bTime = b.startDate ? new Date(b.startDate).getTime() : 0;
          return aTime - bTime;
        });
    }
    return ret;
  },
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);

export default Vehicle;

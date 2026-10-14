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

// Proof of passenger insurance for the vehicle: photos of the document that
// shows the cover, and its period. They are private documents, so
// the whole block is excluded from queries by default (`select: false` below):
// public listings, chat offer cards and booking lookups can never leak it.
// Code that needs it asks for it explicitly with `.select('+insurance')`.
const insuranceSchema = new mongoose.Schema(
  {
    cardImages: { type: [String], default: [] },
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedReason: { type: String, trim: true },
    // Set when an admin asks the driver to verify the insurance again; cleared
    // when the driver resubmits.
    requestedAt: Date,
    requestNote: { type: String, trim: true },
    // Housekeeping for services/vehicleInsuranceService.js: the "expires in a
    // week" notice goes out once per cover period, and expiredAt records when
    // the vehicle was taken off the marketplace for lapsed cover.
    expiryReminderSentAt: Date,
    expiredAt: Date,
  },
  { _id: false }
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
    // Soft delete. Bookings, reviews, chat offer cards and commission records all
    // point at this vehicle, so removing the row would blank out history in five
    // collections. Deleted vehicles stay readable through populate and simply drop
    // out of every list, search and new-offer flow.
    deletedAt: {
      type: Date,
      default: null,
      index: true,
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
    insurance: {
      type: insuranceSchema,
      select: false,
    },
    // The number on the plate. Private like insurance (not shown to travellers;
    // the photos carry the plate anyway), so excluded from queries by default.
    // `key` is the normalised form duplicates are checked on; see
    // utils/vehicleRegistration.js.
    registration: {
      type: new mongoose.Schema(
        {
          number: { type: String, trim: true },
          key: { type: String },
        },
        { _id: false }
      ),
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// The hourly insurance checks look vehicles up by cover end date.
vehicleSchema.index({ 'insurance.endDate': 1 });
// Duplicate-listing check on registration number.
vehicleSchema.index({ 'registration.key': 1 });

vehicleSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    // Never serialised raw, even when it was selected: the driver and admin
    // endpoints add their own shaped copy (utils/vehicleInsurance.js).
    delete ret.insurance;
    delete ret.registration;
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

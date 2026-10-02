import mongoose from 'mongoose';

/**
 * A driver's details, kept for admin only after their account is erased.
 *
 * Account deletion anonymises the User row so the person disappears from every
 * public and operational surface (see services/accountDeletionService.js). That
 * is the right default, but it also removes the evidence that the platform was
 * dealing with a vetted, identifiable business counterparty — which commission,
 * tax and dispute records all depend on.
 *
 * So the identity is snapshotted here first. This collection is never exposed
 * outside the admin dashboard, and every record carries a `purgeAfter` date so
 * it does not become an indefinite store of personal data.
 */
const archivedVehicleSchema = new mongoose.Schema(
  {
    model: String,
    year: Number,
    pricePerDay: Number,
    seats: Number,
    status: String,
  },
  { _id: false }
);

const deletedDriverRecordSchema = new mongoose.Schema(
  {
    // The (now anonymised) User row, so archived records still join to bookings.
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // Identity as it stood at deletion.
    name: String,
    email: String,
    contactNumber: String,
    address: String,
    authProvider: String,
    joinedAt: Date,

    // Proof the driver was vetted.
    driverStatus: String,
    driverApprovedAt: Date,
    experienceYears: Number,
    licenseType: String,
    licenseStatus: String,
    licenseImage: String,
    licenseSubmittedAt: Date,
    licenseReviewedAt: Date,

    vehicles: {
      type: [archivedVehicleSchema],
      default: [],
    },

    // What they did on the platform, for tax and dispute questions.
    activity: {
      bookings: { type: Number, default: 0 },
      completedBookings: { type: Number, default: 0 },
      cancelledBookings: { type: Number, default: 0 },
      grossRevenue: { type: Number, default: 0 },
      commissionCharged: { type: Number, default: 0 },
      commissionOutstanding: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      lastBookingAt: Date,
    },

    deletedAt: { type: Date, required: true },
    // 'self' when the driver deleted their own account, 'admin' otherwise.
    deletedBy: { type: String, enum: ['self', 'admin'], default: 'self' },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // When this record itself is destroyed. Swept daily; see
    // services/retentionSweepService.js.
    purgeAfter: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

deletedDriverRecordSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    ret.id = ret._id?.toString();
    delete ret._id;
    ret.driver = ret.driver?.toString();
    return ret;
  },
});

const DeletedDriverRecord = mongoose.model('DeletedDriverRecord', deletedDriverRecordSchema);

export default DeletedDriverRecord;

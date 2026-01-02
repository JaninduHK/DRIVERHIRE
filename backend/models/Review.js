import mongoose from 'mongoose';

export const REVIEW_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const statusValues = Object.values(REVIEW_STATUS);

const reviewSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      unique: true,
      sparse: true,
      index: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      index: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    travelerUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    travelerName: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1200,
    },
    visitedStartDate: Date,
    visitedEndDate: Date,
    status: {
      type: String,
      enum: statusValues,
      default: REVIEW_STATUS.PENDING,
      index: true,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdByAdmin: {
      type: Boolean,
      default: false,
    },
    publishedAt: Date,
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ vehicle: 1, status: 1, createdAt: -1 });
reviewSchema.index({ travelerUser: 1, status: 1 });

reviewSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    ret.booking = ret.booking?.toString();
    ret.vehicle = ret.vehicle?.toString();
    ret.driver = ret.driver?.toString();
    ret.travelerUser = ret.travelerUser?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Review = mongoose.model('Review', reviewSchema);

export default Review;

import mongoose from 'mongoose';

const briefResponseSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatConversation',
      required: true,
    },
    message: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChatMessage',
      required: true,
    },
    note: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const tourBriefSchema = new mongoose.Schema(
  {
    traveler: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    startLocation: {
      type: String,
      required: true,
      trim: true,
    },
    endLocation: {
      type: String,
      required: true,
      trim: true,
    },
    adults: {
      type: Number,
      required: true,
      min: 1,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
    offersCount: {
      type: Number,
      default: 0,
    },
    lastResponseAt: {
      type: Date,
      default: null,
    },
    responses: {
      type: [briefResponseSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

tourBriefSchema.set('toJSON', {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const TourBrief = mongoose.model('TourBrief', tourBriefSchema);

export default TourBrief;

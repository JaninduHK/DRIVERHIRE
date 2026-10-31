import mongoose from 'mongoose';
import { LICENSE_TYPES } from './User.js';

// Languages the public site is translated into (frontend/src/i18n/locales.js),
// English excluded: an English request stores null.
export const BRIEF_LANGUAGES = ['de', 'fr', 'it', 'ru', 'ja'];

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
    // Optional traveller restrictions. null on both = unrestricted, which is the
    // behaviour every brief had before these were introduced.
    maxOffers: {
      type: Number,
      enum: [10, 15, 20],
      default: null,
    },
    // Stored as the exact LICENSE_TYPES string so it compares directly against
    // User.licenseType with no mapping layer.
    requiredLicenseType: {
      type: String,
      enum: Object.values(LICENSE_TYPES),
      default: null,
    },
    // The site language the traveller used when posting ('de', 'ja', …), so
    // drivers know which language the traveller reads. null = English or unknown.
    language: {
      type: String,
      enum: [...BRIEF_LANGUAGES, null],
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'closed', 'booked'],
      default: 'open',
      index: true,
    },
    // Which booking closed this request. Recorded so that cancelling that booking
    // can put the request back on the board instead of stranding it as 'booked'
    // forever. Null for requests closed any other way (admin, expiry sweep).
    closedByBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    offersCount: {
      type: Number,
      default: 0,
    },
    // Reminder emails sent to the traveller about this request's offers (see
    // services/quoteFollowUpService.js). Each step is sent at most once, except
    // 'update', which can repeat (at most daily);
    // optedOutAt is set when the traveller uses an email's stop link.
    followUp: {
      steps: {
        type: [
          new mongoose.Schema(
            {
              step: {
                type: String,
                enum: ['digest1', 'update', 'digest2', 'approaching30', 'approaching14', 'expiring', 'expired', 'noOffers'],
                required: true,
              },
              sentAt: { type: Date, required: true },
              offerCount: { type: Number, default: 0 },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
      optedOutAt: { type: Date, default: null },
      // Reminders are held until this date ("I haven't fixed my dates").
      pausedUntil: { type: Date, default: null },
      // The traveller's answer to "What's holding you back?" in the follow-up email.
      feedback: {
        reason: { type: String, enum: ['price', 'dates', 'choice', 'booked', null], default: null },
        at: { type: Date, default: null },
      },
      // The request created by "Post this request again" on the offers-expired email.
      repostedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'TourBrief', default: null },
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

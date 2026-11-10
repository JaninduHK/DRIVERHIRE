import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const USER_ROLES = {
  GUEST: 'guest',
  DRIVER: 'driver',
  ADMIN: 'admin',
};

export const DRIVER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const LICENSE_TYPES = {
  TOURIST_DRIVER: 'Tourist Driver',
  CHAUFFEUR_GUIDE_LECTURER: 'Chauffeur Guide Lecturer',
  NATIONAL_GUIDE_LECTURER: 'National Guide Lecturer',
};

export const LICENSE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  ASGARDEO: 'asgardeo',
};

const roleValues = Object.values(USER_ROLES);
const driverStatusValues = Object.values(DRIVER_STATUS);
const licenseTypeValues = Object.values(LICENSE_TYPES);
const licenseStatusValues = Object.values(LICENSE_STATUS);
const authProviderValues = Object.values(AUTH_PROVIDERS);

const driverLocationSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 120 },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    updatedAt: Date,
  },
  { _id: false }
);

export const EMAIL_PREFERENCES = {
  ALL: 'all', // every offer as it arrives, plus summaries
  SUMMARY: 'summary', // the first offer, then summaries at most once a day (default)
  ESSENTIAL: 'essential', // only driver messages and bookings
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: function () {
        return this.authProvider === AUTH_PROVIDERS.LOCAL;
      },
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    facebookId: {
      type: String,
      unique: true,
      sparse: true,
    },
    asgardeoSub: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: authProviderValues,
      default: AUTH_PROVIDERS.LOCAL,
    },
    role: {
      type: String,
      enum: roleValues,
      default: USER_ROLES.GUEST,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    contactNumber: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    tripAdvisor: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    driverStatus: {
      type: String,
      enum: driverStatusValues,
      default() {
        return this.role === USER_ROLES.DRIVER ? DRIVER_STATUS.PENDING : undefined;
      },
    },
    driverReviewedAt: Date,
    driverReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    driverApprovedAt: Date,
    driverProfileTourCompletedAt: Date,
    licenseType: {
      type: String,
      enum: licenseTypeValues,
      trim: true,
    },
    licenseImage: {
      type: String,
      trim: true,
    },
    licenseStatus: {
      type: String,
      enum: licenseStatusValues,
      // No default — stays undefined until the driver submits a license for
      // the first time, distinguishing "not submitted" from "pending review".
    },
    // Driver's "Available today" switch. Controls whether their saved location is
    // shared publicly (i.e. whether they appear on the traveller live map). It does
    // NOT touch vehicle availability — that stays date-range based.
    shareLiveLocation: {
      type: Boolean,
      default: true,
    },
    // Admin-imposed messaging freeze. Deliberately separate from driverStatus:
    // rejecting a driver would delist them publicly and email them, whereas a
    // freeze should silence the behaviour while leaving the profile bookable.
    messagingSuspendedUntil: {
      type: Date,
      default: null,
    },
    suspensionReason: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    // Unpaid-commission freeze (services/commissionFreezeService.js). Set when a month's
    // commission is still not marked paid after the 10th of the following month; cleared
    // once every overdue month is paid. While set the driver can't message, quote or be
    // booked, and is hidden from public listings.
    commissionFrozenAt: {
      type: Date,
      default: null,
      index: true,
    },
    // The overdue months behind the freeze, as 'YYYY-MM'.
    commissionFrozenPeriods: {
      type: [String],
      default: [],
    },
    // Admin chose to enforce older months for this driver too ('YYYY-MM'). Months from
    // here up to the global start count as overdue as soon as they have ended.
    commissionEnforceFrom: {
      type: String,
      default: null,
    },
    // Extra time an admin granted: no freeze until this date.
    commissionGraceUntil: {
      type: Date,
      default: null,
    },
    // Last "your account is still frozen" email, so they go out every few days, not hourly.
    commissionFreezeReminderAt: {
      type: Date,
      default: null,
    },
    // One-time email announcing the commission deadline and freeze rule.
    commissionPolicyNoticeSentAt: {
      type: Date,
      default: null,
    },
    // Admin-handpicked for the homepage driver strip, independent of ranking.
    // Mirrors Review.featured / Review.featuredOrder.
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Set by an admin for drivers who asked to keep getting "new traveller
    // brief" emails although they have the app. Only matters while the brief
    // alert email setting is "No app only" (see briefController.js).
    briefAlertEmailOptIn: {
      type: Boolean,
      default: false,
    },
    // Lower sorts first. Only meaningful while featured is true.
    featuredOrder: {
      type: Number,
      default: null,
    },
    licenseSubmittedAt: Date,
    licenseReviewedAt: Date,
    licenseReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    licenseAdminNote: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    profilePhoto: {
      type: String,
      trim: true,
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 60,
    },
    // Public-facing tenure can be adjusted by an administrator without
    // destroying the immutable account-registration timestamp in createdAt.
    memberSince: Date,
    driverLocation: driverLocationSchema,
    // Expo push notification tokens for this user's devices (driver mobile app).
    expoPushTokens: {
      type: [String],
      default: [],
    },
    // Set when the account has been erased on request. The row is kept (never
    // hard-deleted) because Booking/Review/Vehicle/Commission all hold required
    // refs to it — dropping it would orphan financial records. Identity fields
    // are scrubbed instead; see services/accountDeletionService.js.
    deletedAt: {
      type: Date,
      index: true,
    },
    // How much a traveller wants to hear about offers by email (see
    // EMAIL_PREFERENCES). Driver messages and booking emails ignore this: they
    // are service emails the traveller needs whatever they chose.
    emailPreference: {
      type: String,
      enum: ['all', 'summary', 'essential'],
      default: 'summary',
    },
    // When we last sent this traveller a reminder-type email (offer summaries,
    // "still planning", expiry notices…). Keeps those to one a day across all
    // of their requests.
    lastReminderEmailAt: {
      type: Date,
      default: null,
    },
    // The website language a traveller last used ('de', 'ja', …; null = English).
    // Their emails are written in it. Set from the page they use, so it follows
    // them if they switch language.
    language: {
      type: String,
      enum: ['en', 'de', 'fr', 'it', 'ru', 'ja', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.setPassword = async function setPassword(plainPassword) {
  const saltRounds = 12;
  this.passwordHash = await bcrypt.hash(plainPassword, saltRounds);
};

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    delete ret.googleId;
    delete ret.asgardeoSub;
    delete ret.verificationToken;
    delete ret.verificationTokenExpires;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    delete ret.expoPushTokens;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;

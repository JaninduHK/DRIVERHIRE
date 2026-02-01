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

export const AUTH_PROVIDERS = {
  LOCAL: 'local',
  GOOGLE: 'google',
};

const roleValues = Object.values(USER_ROLES);
const driverStatusValues = Object.values(DRIVER_STATUS);
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
    profilePhoto: {
      type: String,
      trim: true,
    },
    experienceYears: {
      type: Number,
      min: 0,
      max: 60,
    },
    driverLocation: driverLocationSchema,
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
    delete ret.verificationToken;
    delete ret.verificationTokenExpires;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpires;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);

export default User;

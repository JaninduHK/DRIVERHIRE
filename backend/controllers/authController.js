import crypto from 'crypto';
import { validationResult } from 'express-validator';
import User, { DRIVER_STATUS, USER_ROLES } from '../models/User.js';
import { generateAccessToken } from '../utils/jwt.js';
import buildAppUrl from '../utils/url.js';
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
} from '../services/emailService.js';
import { buildAssetUrl } from '../utils/assetUtils.js';

const buildVerificationUrl = (token) => {
  const url = new URL(buildAppUrl('/verify-email'));
  url.searchParams.set('token', token);
  return url.toString();
};

const createVerificationToken = () => {
  const token = crypto.randomBytes(48).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return { token, hash, expires };
};

const createPasswordResetToken = () => {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes
  return { token, hash, expires };
};

const buildPasswordResetUrl = (token) => {
  const url = new URL(buildAppUrl('/reset-password'));
  url.searchParams.set('token', token);
  return url.toString();
};

const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  return null;
};

export const registerUser = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  try {
    const {
      name,
      email,
      password,
      role,
      adminCode,
      contactNumber,
      description,
      tripAdvisor,
      address,
    } = req.body;
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const normalizedRole = role ? role.toLowerCase() : USER_ROLES.GUEST;

    if (!Object.values(USER_ROLES).includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid role provided' });
    }

    if (normalizedRole === USER_ROLES.ADMIN) {
      const requiredAdminCode = process.env.ADMIN_SETUP_CODE;
      if (!requiredAdminCode || adminCode !== requiredAdminCode) {
        return res.status(403).json({ message: 'Invalid admin setup code' });
      }
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      role: normalizedRole,
    });

    if (normalizedRole === USER_ROLES.DRIVER) {
      const requiredDriverFields = [
        { key: 'contactNumber', value: contactNumber },
        { key: 'description', value: description },
        { key: 'address', value: address },
      ];

      const missingFields = requiredDriverFields
        .filter(({ value }) => !value || !String(value).trim())
        .map(({ key }) => key);

      if (missingFields.length > 0) {
        return res.status(400).json({
          message: `Missing required driver field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(
            ', '
          )}`,
        });
      }

      user.contactNumber = contactNumber.trim();
      user.description = description.trim();
      user.address = address.trim();
      user.tripAdvisor = tripAdvisor ? tripAdvisor.trim() : '';
      user.driverStatus = DRIVER_STATUS.PENDING;
    }

    await user.setPassword(password);

    const { token, hash, expires } = createVerificationToken();
    user.verificationToken = hash;
    user.verificationTokenExpires = expires;

    await user.save();

    const verificationUrl = buildVerificationUrl(token);
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl,
    });

    return res.status(201).json({
      message: 'Registration successful. Check your email to verify your account.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Unable to register user' });
  }
};

export const loginUser = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Email verification required' });
    }

    const token = generateAccessToken(user);

    return res.json({
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Unable to login' });
  }
};

export const verifyEmail = async (req, res) => {
  const tokenFromRequest = req.query.token || req.body.token;

  if (!tokenFromRequest) {
    return res.status(400).json({ message: 'Verification token missing' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(tokenFromRequest).digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Token invalid or expired' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    const token = generateAccessToken(user);
    const responseUser = user.toJSON();

    if (responseUser.profilePhoto) {
      responseUser.profilePhoto = buildAssetUrl(responseUser.profilePhoto, req);
    }

    return res.json({
      message: 'Email verified successfully',
      token,
      user: responseUser,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).json({ message: 'Unable to verify email' });
  }
};

export const resendVerificationEmail = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({ message: 'Account not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Account already verified' });
    }

    const { token, hash, expires } = createVerificationToken();
    user.verificationToken = hash;
    user.verificationTokenExpires = expires;
    await user.save();

    const verificationUrl = buildVerificationUrl(token);
    await sendVerificationEmail({
      to: user.email,
      name: user.name,
      verificationUrl,
    });

    return res.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ message: 'Unable to resend verification email' });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user: user.toJSON() });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ message: 'Unable to fetch user' });
  }
};

const parseBooleanLike = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return false;
};

export const updateProfile = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const {
    name,
    contactNumber,
    description,
    tripAdvisor,
    address,
    currentLatitude,
    currentLongitude,
    currentLocationLabel,
    removeProfilePhoto,
    clearLocation,
  } = req.body || {};

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name !== undefined) {
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (!trimmed) {
        return res.status(400).json({ message: 'Name cannot be empty' });
      }
      user.name = trimmed;
    }

    if (contactNumber !== undefined) {
      user.contactNumber =
        typeof contactNumber === 'string' && contactNumber.trim() ? contactNumber.trim() : '';
    }

    if (address !== undefined) {
      user.address =
        typeof address === 'string' && address.trim() ? address.trim() : '';
    }

    if (user.role === USER_ROLES.DRIVER) {
      if (description !== undefined) {
        user.description =
          typeof description === 'string' && description.trim() ? description.trim() : '';
      }

      if (tripAdvisor !== undefined) {
        user.tripAdvisor =
          typeof tripAdvisor === 'string' && tripAdvisor.trim() ? tripAdvisor.trim() : '';
      }
    }

    if (req.file) {
      user.profilePhoto = `profiles/${req.file.filename}`;
    } else if (parseBooleanLike(removeProfilePhoto)) {
      user.profilePhoto = undefined;
    }

    const wantsToClearLocation = parseBooleanLike(clearLocation);
    const hasLat = currentLatitude !== undefined && currentLatitude !== '';
    const hasLng = currentLongitude !== undefined && currentLongitude !== '';
    const hasLocationLabel =
      currentLocationLabel !== undefined && currentLocationLabel !== null;

    if (wantsToClearLocation) {
      user.driverLocation = undefined;
    } else if (hasLat || hasLng || hasLocationLabel) {
      if (!hasLat || !hasLng) {
        return res
          .status(400)
          .json({ message: 'Please provide both latitude and longitude for your location.' });
      }

      const latitude = Number(currentLatitude);
      const longitude = Number(currentLongitude);

      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        return res.status(400).json({ message: 'Latitude must be between -90 and 90.' });
      }
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ message: 'Longitude must be between -180 and 180.' });
      }

      const label =
        typeof currentLocationLabel === 'string' ? currentLocationLabel.trim() : undefined;

      user.driverLocation = {
        label: label || undefined,
        latitude,
        longitude,
        updatedAt: new Date(),
      };
    }

    await user.save();

    const responseUser = user.toJSON();
    if (responseUser.profilePhoto) {
      responseUser.profilePhoto = buildAssetUrl(responseUser.profilePhoto, req);
    }

    return res.json({
      message: 'Profile updated successfully.',
      user: responseUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: 'Unable to update profile' });
  }
};

export const updatePassword = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { currentPassword, password: nextPassword } = req.body || {};

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const matches = await user.comparePassword(currentPassword);
    if (!matches) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    await user.setPassword(nextPassword);
    await user.save();

    return res.json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ message: 'Unable to update password' });
  }
};

export const requestPasswordReset = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { email } = req.body || {};
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  try {
    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const { token, hash, expires } = createPasswordResetToken();
      user.passwordResetToken = hash;
      user.passwordResetExpires = expires;
      await user.save();

      const resetUrl = buildPasswordResetUrl(token);
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    }

    return res.json({
      message: 'If an account exists for that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ message: 'Unable to process password reset right now.' });
  }
};

export const resetPassword = async (req, res) => {
  const validationError = handleValidation(req, res);
  if (validationError) {
    return validationError;
  }

  const { token, password: nextPassword } = req.body || {};
  if (!token) {
    return res.status(400).json({ message: 'Reset token is required.' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    await user.setPassword(nextPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    sendPasswordChangedEmail({
      to: user.email,
      name: user.name,
    }).catch((error) => console.warn('Password change email failed:', error));

    return res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ message: 'Unable to reset password right now.' });
  }
};

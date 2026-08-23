import crypto from 'crypto';
import RefreshToken from '../models/RefreshToken.js';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const generateRefreshTokenValue = () => crypto.randomBytes(64).toString('hex');

export const hashRefreshToken = (value) => crypto.createHash('sha256').update(value).digest('hex');

export const getRefreshTokenExpiry = () => new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

// Creates and stores a new refresh token for a user, returning the plaintext
// value for the response (only the hash is ever persisted).
export const issueRefreshToken = async (user) => {
  const value = generateRefreshTokenValue();
  await RefreshToken.create({
    user: user.id || user._id,
    tokenHash: hashRefreshToken(value),
    expiresAt: getRefreshTokenExpiry(),
  });
  return value;
};

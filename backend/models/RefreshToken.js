import mongoose from 'mongoose';

// One document per issued refresh token (per login/device), so a single
// device/session can be revoked without touching the others. Only the
// SHA-256 hash is ever stored — see utils/refreshToken.js.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
    },
    // Traces the rotation chain when a token is refreshed.
    replacedByTokenHash: {
      type: String,
    },
    // Set the first time this token is exchanged. It is how we tell a client that
    // never received its replacement (benign: reissue) from genuine token reuse
    // (an attacker replaying an old token after the real one has been used).
    usedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Mongo auto-purges expired tokens; no cleanup job needed.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('RefreshToken', refreshTokenSchema);

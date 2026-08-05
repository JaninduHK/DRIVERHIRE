import { OAuth2Client } from 'google-auth-library';

// Accept ID tokens issued to any of our OAuth clients: the web client (used by
// the website) plus the Android/iOS clients used by the driver mobile app. A
// native Google sign-in mints an ID token whose `aud` is the platform client id,
// so all of them must be trusted audiences.
const getAudiences = () => {
  return [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ].filter(Boolean);
};

const getClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID environment variable is not set');
  }
  return new OAuth2Client(clientId);
};

export const verifyGoogleToken = async (idToken) => {
  const client = getClient();

  const ticket = await client.verifyIdToken({
    idToken,
    audience: getAudiences(),
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error('Unable to verify Google token');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
  };
};

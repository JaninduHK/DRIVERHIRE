import crypto from 'crypto';

const GRAPH_BASE = 'https://graph.facebook.com/v19.0';

// Verify a Facebook user access token (from the JS SDK) and return the profile.
// Validates the token belongs to THIS app via debug_token, then reads the profile
// with an appsecret_proof for integrity.
export const verifyFacebookToken = async (accessToken) => {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('FACEBOOK_APP_ID / FACEBOOK_APP_SECRET environment variables are not set');
  }
  if (!accessToken) {
    throw new Error('Invalid Facebook token');
  }

  const appAccessToken = `${appId}|${appSecret}`;

  // 1) Confirm the token is valid and was issued for our app.
  const debugUrl = `${GRAPH_BASE}/debug_token?input_token=${encodeURIComponent(
    accessToken
  )}&access_token=${encodeURIComponent(appAccessToken)}`;
  const debugResponse = await fetch(debugUrl);
  const debugJson = await debugResponse.json().catch(() => null);
  const debugData = debugJson?.data;

  if (!debugResponse.ok || !debugData || debugData.is_valid !== true) {
    throw new Error('Invalid Facebook token');
  }
  if (String(debugData.app_id) !== String(appId)) {
    throw new Error('Invalid Facebook token');
  }

  // 2) Read the profile with an appsecret_proof.
  const proof = crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
  const meUrl = `${GRAPH_BASE}/me?fields=${encodeURIComponent(
    'id,name,email,picture.width(400).height(400)'
  )}&access_token=${encodeURIComponent(accessToken)}&appsecret_proof=${proof}`;
  const meResponse = await fetch(meUrl);
  const me = await meResponse.json().catch(() => null);

  if (!meResponse.ok || !me?.id) {
    throw new Error('Unable to retrieve Facebook profile');
  }

  return {
    facebookId: me.id,
    email: me.email || '',
    name: me.name || '',
    picture: me.picture?.data?.url || '',
  };
};

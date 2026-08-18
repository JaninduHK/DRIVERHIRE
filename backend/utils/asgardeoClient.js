import * as client from 'openid-client';

let discoveryPromise;

// Despite being a spec-standard-looking issuer URL, Asgardeo (built on the
// same underlying platform as self-hosted WSO2 Identity Server) serves its
// discovery document at <issuer>/oauth2/token/.well-known/openid-configuration
// rather than the bare <issuer>/.well-known/openid-configuration path —
// confirmed directly against a live tenant (the root path 302s to
// asgardeo.io's marketing site instead of returning JSON). openid-client's
// discovery() can't be pointed at this via the issuer URL alone, so fetch
// the metadata ourselves and build the Configuration directly.
const getAsgardeoConfig = () => {
  if (!discoveryPromise) {
    const issuer = process.env.ASGARDEO_ISSUER_URL;
    const clientId = process.env.ASGARDEO_CLIENT_ID;
    const clientSecret = process.env.ASGARDEO_CLIENT_SECRET;

    if (!issuer || !clientId || !clientSecret) {
      throw new Error('Asgardeo SSO environment variables are not configured');
    }

    discoveryPromise = fetch(`${issuer.replace(/\/+$/, '')}/oauth2/token/.well-known/openid-configuration`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Asgardeo discovery request failed with ${response.status}`);
        }
        const serverMetadata = await response.json();
        return new client.Configuration(serverMetadata, clientId, clientSecret);
      })
      .catch((error) => {
        discoveryPromise = undefined;
        throw error;
      });
  }

  return discoveryPromise;
};

export default getAsgardeoConfig;

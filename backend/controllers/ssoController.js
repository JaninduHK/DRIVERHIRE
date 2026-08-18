import crypto from 'crypto';
import * as client from 'openid-client';
import User, { AUTH_PROVIDERS, USER_ROLES } from '../models/User.js';
import { generateAccessToken } from '../utils/jwt.js';
import getAsgardeoConfig from '../utils/asgardeoClient.js';
import { putStateEntry, takeStateEntry, putExchangeEntry, takeExchangeEntry } from '../utils/ssoStateStore.js';

const STATE_TTL_MS = 5 * 60 * 1000;
const EXCHANGE_TTL_MS = 60 * 1000;

const buildFrontendUrl = (path) => new URL(path, process.env.CLIENT_ORIGIN);

const redirectWithError = (res, code) => {
  const url = buildFrontendUrl('/traveller/sign-in');
  url.searchParams.set('error', code);
  return res.redirect(url.href);
};

export const ssoLogin = async (req, res) => {
  try {
    const config = await getAsgardeoConfig();

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    putStateEntry(state, { codeVerifier }, STATE_TTL_MS);

    const authorizationUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: process.env.ASGARDEO_REDIRECT_URI,
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
    });

    return res.redirect(authorizationUrl.href);
  } catch (error) {
    console.error('SSO login error:', error);
    return res.status(500).json({ message: 'Unable to start SSO login' });
  }
};

export const ssoCallback = async (req, res) => {
  try {
    const config = await getAsgardeoConfig();
    const { state } = req.query;

    if (!state || typeof state !== 'string') {
      return redirectWithError(res, 'missing_state');
    }

    const stored = takeStateEntry(state);
    if (!stored) {
      return redirectWithError(res, 'expired_state');
    }

    const currentUrl = new URL(req.originalUrl, process.env.ASGARDEO_REDIRECT_URI);
    const tokens = await client.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: stored.codeVerifier,
      expectedState: state,
    });

    const claims = tokens.claims();
    const email = claims?.email;

    if (!email) {
      return redirectWithError(res, 'missing_email');
    }
    if (claims.email_verified === false) {
      return redirectWithError(res, 'email_not_verified');
    }

    const normalizedEmail = email.toLowerCase();
    let user = await User.findOne({ email: normalizedEmail });

    if (user && user.role !== USER_ROLES.GUEST) {
      // Don't let an SSO login hijack an existing driver/admin account —
      // same guard already used for Google/Facebook in authController.js.
      return redirectWithError(res, 'account_role_conflict');
    }

    if (user) {
      // Just-in-time link: an existing local traveller's first Asgardeo
      // login attaches their Asgardeo identity instead of creating a duplicate.
      if (!user.asgardeoSub) {
        user.asgardeoSub = claims.sub;
        user.authProvider = AUTH_PROVIDERS.ASGARDEO;
        if (!user.isVerified) {
          user.isVerified = true;
          user.verificationToken = undefined;
          user.verificationTokenExpires = undefined;
        }
        await user.save();
      }
    } else {
      user = await User.create({
        name: claims.name || normalizedEmail.split('@')[0],
        email: normalizedEmail,
        asgardeoSub: claims.sub,
        authProvider: AUTH_PROVIDERS.ASGARDEO,
        role: USER_ROLES.GUEST,
        isVerified: true,
      });
    }

    const token = generateAccessToken(user);
    const exchangeCode = crypto.randomBytes(32).toString('hex');
    putExchangeEntry(exchangeCode, { token, user: user.toJSON() }, EXCHANGE_TTL_MS);

    const redirectUrl = buildFrontendUrl('/auth/callback');
    redirectUrl.searchParams.set('xc', exchangeCode);
    return res.redirect(redirectUrl.href);
  } catch (error) {
    console.error('SSO callback error:', error);
    return redirectWithError(res, 'sso_failed');
  }
};

export const ssoExchange = (req, res) => {
  const { code } = req.body || {};

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ message: 'Exchange code is required' });
  }

  const entry = takeExchangeEntry(code);
  if (!entry) {
    return res.status(400).json({ message: 'Exchange code is invalid or expired' });
  }

  return res.json({ token: entry.token, user: entry.user });
};

export const ssoLogout = async (req, res) => {
  try {
    const config = await getAsgardeoConfig();

    // No id_token_hint is available here (the ID token isn't retained past
    // the callback), so Asgardeo may show a confirmation prompt before
    // ending the session rather than logging out silently.
    const endSessionUrl = client.buildEndSessionUrl(config, {
      post_logout_redirect_uri: process.env.ASGARDEO_POST_LOGOUT_REDIRECT_URI,
    });

    return res.json({ logoutUrl: endSessionUrl.href });
  } catch (error) {
    console.error('SSO logout error:', error);
    return res.status(500).json({ message: 'Unable to build SSO logout URL' });
  }
};

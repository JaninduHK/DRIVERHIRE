import crypto from 'crypto';
import * as client from 'openid-client';
import User, { AUTH_PROVIDERS, USER_ROLES } from '../models/User.js';
import { generateAccessToken } from '../utils/jwt.js';
import getAsgardeoConfig from '../utils/asgardeoClient.js';
import { putStateEntry, takeStateEntry, putExchangeEntry, takeExchangeEntry } from '../utils/ssoStateStore.js';
import { sendRedditSignUp } from '../services/redditConversionsService.js';

const STATE_TTL_MS = 5 * 60 * 1000;
const EXCHANGE_TTL_MS = 60 * 1000;

/**
 * Shown to drivers wherever a traveller's name appears, so it must never be
 * derived from their email address. The local part of an email is usually enough
 * for a driver to guess the whole address and contact the traveller off-platform,
 * which is exactly what the chat redaction exists to prevent.
 *
 * Asgardeo releases `name` only when the application is configured to share it;
 * self-registration otherwise fills given_name/family_name, so both are tried.
 */
export const TRAVELLER_FALLBACK_NAME = 'Traveller';

export const displayNameFromClaims = (claims = {}) => {
  const full = typeof claims.name === 'string' ? claims.name.trim() : '';
  if (full) return full;

  const given = typeof claims.given_name === 'string' ? claims.given_name.trim() : '';
  const family = typeof claims.family_name === 'string' ? claims.family_name.trim() : '';
  const composed = [given, family].filter(Boolean).join(' ').trim();

  // preferred_username is deliberately not used: Asgardeo commonly sets it to the
  // email address, which would reintroduce the leak this guards against.
  return composed;
};

const buildFrontendUrl = (path) => new URL(path, process.env.CLIENT_ORIGIN);

const redirectWithError = (res, code) => {
  // There's no /traveller/sign-in landing page anymore — /auth/callback
  // handles both the success (?xc=) and failure (?error=) outcomes of the
  // Asgardeo round-trip.
  const url = buildFrontendUrl('/auth/callback');
  url.searchParams.set('error', code);
  return res.redirect(url.href);
};

const SSO_UI_LOCALES = {
  de: 'de-DE de',
  fr: 'fr-FR fr',
  it: 'it-IT it',
  ru: 'ru-RU ru',
  ja: 'ja-JP ja',
};

export const ssoLogin = async (req, res) => {
  try {
    const config = await getAsgardeoConfig();

    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const state = client.randomState();

    // Remember the page language (?lang=de) so a new traveller's emails start in it.
    putStateEntry(state, { codeVerifier, lang: SSO_UI_LOCALES[req.query?.lang] ? req.query.lang : null }, STATE_TTL_MS);

    // ?lang=de from a translated page: ask Asgardeo for its sign-in pages in that
    // language (it falls back to English for any it does not support).
    const uiLocale = SSO_UI_LOCALES[req.query?.lang];

    const authorizationUrl = client.buildAuthorizationUrl(config, {
      redirect_uri: process.env.ASGARDEO_REDIRECT_URI,
      scope: 'openid email profile',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      ...(uiLocale ? { ui_locales: uiLocale } : {}),
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

    const claimedName = displayNameFromClaims(claims);

    if (user) {
      // Accounts created before this guard carry the email's local part as their
      // name, which leaks the address to drivers. Repair it the next time the
      // traveller signs in and Asgardeo gives us something real to use.
      if (claimedName && user.name === normalizedEmail.split('@')[0]) {
        user.name = claimedName;
      }

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
      }

      // One save covers both the link and the name repair — a returning traveller
      // hits the repair without ever entering the branch above.
      if (user.isModified()) {
        await user.save();
      }
    } else {
      user = await User.create({
        name: claimedName || TRAVELLER_FALLBACK_NAME,
        email: normalizedEmail,
        asgardeoSub: claims.sub,
        authProvider: AUTH_PROVIDERS.ASGARDEO,
        role: USER_ROLES.GUEST,
        isVerified: true,
        language: stored.lang || null,
      });
      // New traveller account: tell Reddit Ads (this request comes from the browser,
      // so it carries the visitor's Reddit cookies).
      sendRedditSignUp({ req, userId: user._id });
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

// Reddit Conversions API: tells Reddit Ads about conversions from the server, so they
// still count when the browser pixel is blocked. Each event carries the same
// conversion ID the browser pixel sends, so Reddit counts it once.
// Off unless REDDIT_CAPI_TOKEN is set. Failures are logged and never affect the request.
import crypto from 'node:crypto';
import User from '../models/User.js';

const PIXEL_ID = process.env.REDDIT_PIXEL_ID || 'p2_1a01tmkat9rp0';
const ENDPOINT = `https://ads-api.reddit.com/api/v3/pixels/${PIXEL_ID}/conversion_events`;
const TIMEOUT_MS = 5000;

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

const readCookie = (req, name) => {
  const header = req.headers?.cookie;
  if (!header) return '';
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) {
      try {
        return decodeURIComponent(rest.join('='));
      } catch {
        return rest.join('=');
      }
    }
  }
  return '';
};

/** Who the conversion came from, so Reddit can match it to an ad click. */
const buildMatchKeys = async (req, userId) => {
  const user = {};
  const ip = req.ip;
  const userAgent = req.get?.('user-agent');
  // Set by the Reddit pixel in the browser.
  const pixelUuid = readCookie(req, '_rdt_uuid');
  if (ip) user.ip_address = ip;
  if (userAgent) user.user_agent = userAgent;
  if (pixelUuid) user.uuid = pixelUuid;
  if (userId) user.external_id = sha256(String(userId));

  if (userId) {
    const traveler = await User.findById(userId).select('email').lean().catch(() => null);
    const email = traveler?.email?.trim().toLowerCase();
    if (email) user.email = sha256(email);
  }

  // Saved by the site when a visitor lands from a Reddit ad (?rdt_cid=...).
  const clickId = readCookie(req, 'cwd_rdt_cid');
  return { clickId, user };
};

const postEvents = async (events) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.REDDIT_CAPI_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'carwithdriver-server/1.0',
      },
      body: JSON.stringify({ data: { events } }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.warn(`Reddit Conversions API rejected an event (${response.status}): ${body.slice(0, 500)}`);
    }
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Send one conversion to Reddit. Fire-and-forget: call without await.
 * conversionId must match what the browser pixel sends for the same event
 * (if it sends one), so Reddit counts it once.
 */
const sendRedditEvent = ({ req, userId, trackingType, conversionId, metadata = {} }) => {
  if (!process.env.REDDIT_CAPI_TOKEN) return;

  (async () => {
    const { clickId, user } = await buildMatchKeys(req, userId);
    const event = {
      event_at: Date.now(),
      action_source: 'WEBSITE',
      type: { tracking_type: trackingType },
      user,
      metadata: { ...metadata, conversion_id: String(conversionId) },
    };
    if (clickId) event.click_id = clickId;
    await postEvents([event]);
  })().catch((error) => console.warn('Reddit Conversions API call failed:', error?.message || error));
};

/** A traveller posted a quote request. Pixel: rdt('track', 'Lead', { conversionId: briefId }). */
export const sendRedditLead = ({ req, conversionId, userId }) =>
  sendRedditEvent({ req, userId, trackingType: 'LEAD', conversionId });

/** A new traveller account was created (server only; the pixel doesn't send SignUp). */
export const sendRedditSignUp = ({ req, userId }) =>
  sendRedditEvent({ req, userId, trackingType: 'SIGN_UP', conversionId: `signup-${userId}` });

/**
 * A traveller booked: accepted a driver's offer or booked a vehicle directly.
 * Pixel: rdt('track', 'Purchase', { conversionId: bookingId, value, currency }).
 */
export const sendRedditPurchase = ({ req, userId, bookingId, value }) =>
  sendRedditEvent({
    req,
    userId,
    trackingType: 'PURCHASE',
    conversionId: bookingId,
    metadata: {
      item_count: 1,
      currency: 'USD',
      ...(Number.isFinite(value) && value > 0 ? { value } : {}),
    },
  });

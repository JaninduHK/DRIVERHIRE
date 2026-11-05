const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

let isInitialized = false;

const warnMissingId = () => {
  if (import.meta.env.DEV) {
    console.warn(
      'Google Analytics measurement ID is missing. Set VITE_GA_MEASUREMENT_ID in your environment.',
    );
  }
};

export const initAnalytics = () => {
  if (isInitialized || typeof window === 'undefined') return;
  if (!measurementId) {
    warnMissingId();
    return;
  }

  // Load the gtag script once.
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag() {
      window.dataLayer.push(arguments);
    };

  window.gtag('js', new Date());
  window.gtag('config', measurementId, { send_page_view: false });

  isInitialized = true;
};

export const trackPageView = (pagePath) => {
  if (typeof window === 'undefined') return;
  trackRedditPageVisit();
  if (!measurementId) {
    warnMissingId();
    return;
  }
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', 'page_view', {
    page_path: pagePath,
    page_location: window.location.href,
    send_to: measurementId,
  });
};

// ---- Reddit Pixel (Reddit Ads conversion tracking) ----
// The ID is public (it appears in the page source), so it defaults here rather than
// relying on a deploy .env that can silently drop it. Set VITE_REDDIT_PIXEL_ID to override.
const redditPixelId = import.meta.env.VITE_REDDIT_PIXEL_ID || 'p2_1948oeey1egjy';
// Skipped in local dev so test visits don't count as ad results.
const redditEnabled = Boolean(redditPixelId) && !import.meta.env.DEV;

let isRedditInitialized = false;

export const initRedditPixel = () => {
  if (isRedditInitialized || !redditEnabled || typeof window === 'undefined') return;

  // Reddit's loader: queue calls until pixel.js arrives.
  if (!window.rdt) {
    const rdt = function rdt(...args) {
      if (rdt.sendEvent) rdt.sendEvent(...args);
      else rdt.callQueue.push(args);
    };
    rdt.callQueue = [];
    window.rdt = rdt;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.redditstatic.com/ads/pixel.js?pixel_id=${encodeURIComponent(redditPixelId)}`;
    document.head.appendChild(script);
  }

  // Visitors from a Reddit ad arrive with ?rdt_cid=. Keep it for 28 days (Reddit's
  // attribution window) so the server's Conversions API event can name the ad click.
  try {
    const clickId = new URLSearchParams(window.location.search).get('rdt_cid');
    if (clickId) {
      const secure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `cwd_rdt_cid=${encodeURIComponent(clickId)}; Max-Age=${28 * 24 * 60 * 60}; Path=/; SameSite=Lax${secure}`;
    }
  } catch {
    /* cookies blocked: the server event just goes without the click ID */
  }

  // Page visits are sent on every route change by trackPageView, not here.
  window.rdt('init', redditPixelId);
  isRedditInitialized = true;
};

const trackReddit = (...args) => {
  if (!isRedditInitialized || typeof window.rdt !== 'function') return;
  window.rdt(...args);
};

export const trackRedditPageVisit = () => trackReddit('track', 'PageVisit');

/**
 * A traveller posted a quote request. Counts as a Lead in Reddit Ads and a
 * generate_lead event in Google Analytics. The request ID lets Reddit drop
 * duplicates if the Conversions API sends the same event later.
 */
export const trackQuoteRequest = (requestId) => {
  if (typeof window === 'undefined') return;
  trackReddit('track', 'Lead', requestId ? { conversionId: String(requestId) } : {});
  trackGa('generate_lead');
};

// ---- Quote form funnel (homepage mini-form and /get-quotes) ----
// form started → form submitted ("Next") → signed in → request posted (trackQuoteRequest).
const startedForms = new Set();

const trackGa = (eventName, params = {}) => {
  if (typeof window === 'undefined' || !measurementId || typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, { ...params, send_to: measurementId, transport_type: 'beacon' });
};

/** First interaction with a quote form, counted once per form per page load. */
export const trackQuoteFormStart = (formName) => {
  if (startedForms.has(formName)) return;
  startedForms.add(formName);
  trackGa('quote_form_start', { form_name: formName });
};

/** A quote form passed validation and the traveller pressed Next. */
export const trackQuoteFormSubmit = (formName) => {
  trackGa('quote_form_submit', { form_name: formName });
  trackReddit('track', 'Custom', { customEventName: 'QuoteFormSubmitted' });
};

/**
 * Run a full-page redirect after a short pause so tracking calls made just
 * before it get sent instead of being cut off by the page unloading.
 */
export const afterTracking = (callback, delayMs = 300) => {
  if (typeof window === 'undefined') {
    callback();
    return;
  }
  window.setTimeout(callback, delayMs);
};

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

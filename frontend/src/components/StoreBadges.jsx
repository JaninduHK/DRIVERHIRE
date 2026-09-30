// The driver app is drivers-only, so these links belong on driver-facing web pages
// (registration, driver guide) and nowhere on the traveller side.
export const APP_STORE_URL = 'https://apps.apple.com/lk/app/car-with-driver-driver-app/id6808452213';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=lk.carwithdriver.driver';

// Single-colour brand glyphs on our own button styling, rather than imitations of
// Apple's and Google's official badge artwork — those have to be their supplied
// assets to be used as badges.
const AppleGlyph = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const PlayGlyph = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
  </svg>
);

const badgeCls =
  'flex min-h-[52px] items-center gap-3 rounded-xl bg-slate-900 px-4 py-2.5 text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/30';

/**
 * Paired App Store / Google Play links for the drivers-only mobile app.
 * Always stacked — the only caller is a narrow sidebar column, where two of these
 * side by side would squeeze the labels.
 */
const StoreBadges = ({ className = '' }) => (
  <div className={`flex flex-col gap-2.5 ${className}`}>
    <a href={APP_STORE_URL} target="_blank" rel="noreferrer" className={badgeCls}>
      <AppleGlyph className="h-6 w-6 flex-shrink-0" />
      <span className="leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-white/60">Download on the</span>
        <span className="block text-[14px] font-bold">App Store</span>
      </span>
    </a>
    <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" className={badgeCls}>
      <PlayGlyph className="h-[22px] w-[22px] flex-shrink-0" />
      <span className="leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-white/60">Get it on</span>
        <span className="block text-[14px] font-bold">Google Play</span>
      </span>
    </a>
  </div>
);

export default StoreBadges;

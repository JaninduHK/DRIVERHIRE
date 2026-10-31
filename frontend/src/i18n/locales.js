// Languages the public site is available in. English is the default and lives
// at the root (/vehicles); every other language gets a path prefix (/de/vehicles).
export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['en', 'de', 'fr', 'it', 'ru', 'ja'];

export const LOCALE_INFO = {
  en: { name: 'English', english: 'English', flag: '🇬🇧', htmlLang: 'en', ogLocale: 'en_US', intl: 'en-US' },
  de: { name: 'Deutsch', english: 'German', flag: '🇩🇪', htmlLang: 'de', ogLocale: 'de_DE', intl: 'de-DE' },
  fr: { name: 'Français', english: 'French', flag: '🇫🇷', htmlLang: 'fr', ogLocale: 'fr_FR', intl: 'fr-FR' },
  it: { name: 'Italiano', english: 'Italian', flag: '🇮🇹', htmlLang: 'it', ogLocale: 'it_IT', intl: 'it-IT' },
  ru: { name: 'Русский', english: 'Russian', flag: '🇷🇺', htmlLang: 'ru', ogLocale: 'ru_RU', intl: 'ru-RU' },
  ja: { name: '日本語', english: 'Japanese', flag: '🇯🇵', htmlLang: 'ja', ogLocale: 'ja_JP', intl: 'ja-JP' },
};

// Text for the "this page is available in your language" banner. It is shown on
// English pages, so it cannot come from the (English-only) loaded messages.
export const LANGUAGE_SUGGESTION = {
  de: { message: 'Diese Seite ist auch auf Deutsch verfügbar.', action: 'Auf Deutsch ansehen', dismiss: 'Schließen' },
  fr: { message: 'Cette page est également disponible en français.', action: 'Voir en français', dismiss: 'Fermer' },
  it: { message: 'Questa pagina è disponibile anche in italiano.', action: 'Vedi in italiano', dismiss: 'Chiudi' },
  ru: { message: 'Эта страница также доступна на русском языке.', action: 'Открыть на русском', dismiss: 'Закрыть' },
  ja: { message: 'このページは日本語でもご覧いただけます。', action: '日本語で見る', dismiss: '閉じる' },
};

export const isLocale = (value) => LOCALES.includes(value);

// Public pages that exist in every language. Anything else (dashboards, admin,
// sign-in, driver pages) is English-only and keeps its plain path.
const LOCALIZED_PATTERNS = [
  /^\/$/,
  /^\/vehicles(\/[^/]+)?$/,
  /^\/drivers(\/[^/]+)?$/,
  /^\/live-map$/,
  /^\/get-quotes$/,
  /^\/trip-cost-calculator$/,
  /^\/about$/,
  /^\/contact$/,
  /^\/blog(\/[^/]+)?$/,
  /^\/terms$/,
  /^\/privacy-policy$/,
  /^\/dashboard$/,
  /^\/checkout\/[^/]+$/,
  /^\/offer\/[^/]+$/,
  /^\/review\/[^/]+$/,
];

export const isLocalizedPath = (pathname) => {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return LOCALIZED_PATTERNS.some((pattern) => pattern.test(clean || '/'));
};

// '/de/vehicles' -> 'de'; '/vehicles' -> 'en'.
export const getLocaleFromPath = (pathname = '/') => {
  const first = String(pathname).split('/')[1];
  return first && first !== DEFAULT_LOCALE && isLocale(first) ? first : DEFAULT_LOCALE;
};

// '/de/vehicles' -> '/vehicles'; '/de' -> '/'.
export const stripLocale = (pathname = '/') => {
  const locale = getLocaleFromPath(pathname);
  if (locale === DEFAULT_LOCALE) return pathname || '/';
  const rest = pathname.slice(locale.length + 1);
  return rest || '/';
};

// Turn an English path into the same page in `locale`. Paths to English-only
// pages, external URLs and anchors are returned unchanged.
export const localizePath = (to, locale) => {
  if (typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//')) return to;
  const match = to.match(/^([^?#]*)(.*)$/);
  const pathname = stripLocale(match[1] || '/');
  const suffix = match[2] || '';
  if (!locale || locale === DEFAULT_LOCALE || !isLocalizedPath(pathname)) {
    return `${pathname}${suffix}`;
  }
  return `${pathname === '/' ? `/${locale}` : `/${locale}${pathname}`}${suffix}`;
};

// The browser's preferred supported language other than English, if any.
export const detectBrowserLocale = (languages = []) => {
  for (const tag of languages) {
    const base = String(tag || '').toLowerCase().split('-')[0];
    if (base === DEFAULT_LOCALE) return null;
    if (isLocale(base)) return base;
  }
  return null;
};

export const LOCALE_STORAGE_KEY = 'cwd_lang';

// Remember a language the visitor picked (or dismissed) for the suggestion banner.
export const rememberLocale = (code) => {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, code);
  } catch {
    /* storage blocked: the choice just isn't remembered */
  }
};

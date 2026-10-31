import { LOCALE_INFO } from './locales.js';

// "🇩🇪 German" for a quote request's language code; null for English/unknown.
export const travellerLanguageLabel = (code) => {
  const info = code && code !== 'en' ? LOCALE_INFO[code] : null;
  return info ? `${info.flag} ${info.english}` : null;
};

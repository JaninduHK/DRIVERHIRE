import { DEFAULT_LOCALE, isLocale } from './locales.js';

// Each language's text lives in messages/<locale>/<page>.json. Vite bundles one
// chunk per language, so a visitor only downloads the language they are viewing.
const bundles = import.meta.glob('./messages/*/index.js');

const cache = {};

export const loadMessages = async (locale) => {
  const key = isLocale(locale) ? locale : DEFAULT_LOCALE;
  if (!cache[key]) {
    const mod = await bundles[`./messages/${key}/index.js`]();
    cache[key] = mod.default;
  }
  return cache[key];
};

// Synchronous access for code that runs after loadMessages (route meta, etc.).
export const getLoadedMessages = (locale) => cache[locale] || cache[DEFAULT_LOCALE] || {};

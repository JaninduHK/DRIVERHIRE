// Traveller emails in the traveller's website language. Text lives in
// i18n/emails/<lang>.json (same keys in every file; English is the source).
// `npm run check:i18n` in frontend/ checks the files line up, the same way it
// checks the website text.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const EMAIL_LANGUAGES = ['en', 'de', 'fr', 'it', 'ru', 'ja'];

const INTL = { en: 'en-US', de: 'de-DE', fr: 'fr-FR', it: 'it-IT', ru: 'ru-RU', ja: 'ja-JP' };

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'emails');
const cache = {};
const load = (lang) => {
  if (!cache[lang]) {
    try {
      cache[lang] = JSON.parse(fs.readFileSync(path.join(dir, `${lang}.json`), 'utf8'));
    } catch {
      cache[lang] = lang === 'en' ? {} : load('en');
    }
  }
  return cache[lang];
};

export const normalizeLanguage = (value) => (EMAIL_LANGUAGES.includes(value) ? value : 'en');

export const intlFor = (lang) => INTL[normalizeLanguage(lang)];

const lookup = (messages, key) =>
  key.split('.').reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), messages);

const pluralRules = {};

// emailT('de')('offer.title', { name }) -> German text, falling back to English
// for any key a language file is missing (the check script prevents that).
export const emailT = (lang) => {
  const code = normalizeLanguage(lang);
  const messages = load(code);
  const english = load('en');
  return (key, vars = {}) => {
    let value = lookup(messages, key);
    if (value === undefined) value = lookup(english, key);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const count = Number(vars.count);
      if (!pluralRules[code]) pluralRules[code] = new Intl.PluralRules(INTL[code]);
      value = value[pluralRules[code].select(Number.isFinite(count) ? count : 0)] ?? value.other;
    }
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return key;
    return value.replace(/\{(\w+)\}/g, (whole, name) => (vars[name] != null ? String(vars[name]) : whole));
  };
};

// Website links in a traveller email open in their language:
// https://carwithdriver.lk/dashboard?tab=x -> https://carwithdriver.lk/de/dashboard?tab=x
const LOCALIZED_PATH = /^\/(dashboard|offer\/|review\/|checkout\/|vehicles|drivers|get-quotes|$)/;
export const localizeUrl = (url, lang) => {
  const code = normalizeLanguage(lang);
  if (!url || code === 'en') return url;
  try {
    const parsed = new URL(url);
    if (!LOCALIZED_PATH.test(parsed.pathname) || parsed.pathname.startsWith('/api')) return url;
    parsed.pathname = parsed.pathname === '/' ? `/${code}` : `/${code}${parsed.pathname}`;
    return parsed.toString();
  } catch {
    return url;
  }
};

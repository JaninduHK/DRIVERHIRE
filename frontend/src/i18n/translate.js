import { DEFAULT_LOCALE, LOCALE_INFO } from './locales.js';
import { getLoadedMessages } from './messages.js';

const lookup = (messages, key) => {
  let node = messages;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
};

const interpolate = (text, vars) =>
  vars ? text.replace(/\{(\w+)\}/g, (whole, name) => (vars[name] != null ? String(vars[name]) : whole)) : text;

const pluralRulesCache = {};
const pluralCategory = (locale, count) => {
  const intl = LOCALE_INFO[locale]?.intl || 'en-US';
  if (!pluralRulesCache[intl]) pluralRulesCache[intl] = new Intl.PluralRules(intl);
  return pluralRulesCache[intl].select(count);
};

// t('home.hero.title', { name: 'Kasun' }). A message can be a plain string or,
// for counts, an object of plural forms ({ one, few, many, other }) picked by
// vars.count using the language's own plural rules.
export const createT = (locale, messages) => (key, vars) => {
  let value = lookup(messages, key);
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const count = Number(vars?.count);
    value = value[pluralCategory(locale, Number.isFinite(count) ? count : 0)] ?? value.other;
  }
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') {
    if (import.meta.env.DEV) console.warn(`[i18n] missing ${locale}:${key}`);
    return key;
  }
  return interpolate(value, vars);
};

// For code outside React (route meta functions).
export const getT = (locale = DEFAULT_LOCALE) => createT(locale, getLoadedMessages(locale));

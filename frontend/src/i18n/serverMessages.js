// The API answers in English (drivers, admins and the mobile app read it as
// is). On a translated page, a message the server sends back is shown in the
// page's language instead: it is matched against the English text in
// messages/en/server.json and replaced by the same line in the page language.
// Anything not in that file is shown unchanged.
import enServer from './messages/en/server.json';
import { DEFAULT_LOCALE, getLocaleFromPath } from './locales.js';
import { getT } from './translate.js';

// "Access denied" and "Access denied." are the same message.
const normalize = (text) => String(text).trim().replace(/\.$/, '');

// Fixed messages are looked up directly; ones with a value in them, like
// "Booking request received for {model}.", are matched as patterns.
const KEYS = new Map();
const PATTERNS = [];
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const collect = (node, path) => {
  for (const [key, value] of Object.entries(node)) {
    const fullKey = `server.${path}${key}`;
    if (typeof value === 'string') {
      const names = [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
      if (names.length === 0) {
        KEYS.set(normalize(value), fullKey);
      } else {
        const source = escapeRegExp(normalize(value)).replace(/\\\{\w+\\\}/g, '(.+?)');
        PATTERNS.push({ regex: new RegExp(`^${source}$`), names, key: fullKey });
      }
    } else if (value && typeof value === 'object') {
      collect(value, `${path}${key}.`);
    }
  }
};
collect(enServer, '');

const pageLocale = () =>
  typeof window === 'undefined' ? DEFAULT_LOCALE : getLocaleFromPath(window.location.pathname);

const translateLine = (line, t) => {
  const text = normalize(line);
  let key = KEYS.get(text);
  let vars;
  if (!key) {
    for (const pattern of PATTERNS) {
      const match = text.match(pattern.regex);
      if (match) {
        key = pattern.key;
        vars = Object.fromEntries(pattern.names.map((name, index) => [name, match[index + 1]]));
        break;
      }
    }
  }
  if (!key) return line;
  const translated = t(key, vars);
  return translated === key ? line : translated;
};

export const localizeServerMessage = (message, locale = pageLocale()) => {
  if (typeof message !== 'string' || !message || locale === DEFAULT_LOCALE) return message;
  const t = getT(locale);
  // Form validation can send several messages, one per line.
  return message
    .split('\n')
    .map((line) => translateLine(line, t))
    .join('\n');
};

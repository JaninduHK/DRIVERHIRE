import { cloneElement, createContext, Fragment, isValidElement, useContext, useMemo } from 'react';
import { DEFAULT_LOCALE, LOCALE_INFO, localizePath } from './locales.js';
import { createT } from './translate.js';

const I18nContext = createContext(null);

const buildValue = (locale, messages) => {
  const intl = LOCALE_INFO[locale]?.intl || 'en-US';
  const t = createT(locale, messages);
  return {
    locale,
    intl,
    t,
    lp: (path) => localizePath(path, locale),
    formatDate: (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat(intl, options).format(date);
    },
    formatNumber: (value, options) => new Intl.NumberFormat(intl, options).format(Number(value) || 0),
  };
};

export const I18nProvider = ({ locale = DEFAULT_LOCALE, messages, children }) => {
  const value = useMemo(() => buildValue(locale, messages || {}), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

const fallback = buildValue(DEFAULT_LOCALE, {});

export const useI18n = () => useContext(I18nContext) || fallback;

// Renders a message containing simple tags, e.g. "Pay <b>on day one</b>, see <link>terms</link>".
// Each tag name maps to an element in `components`; the tagged text becomes its children.
// A self-closing tag like <br/> is replaced by the element as-is.
// Pass `text` instead of `k` for text that is already translated (e.g. an item of a list message).
export const Trans = ({ k, vars, text: givenText, components = {} }) => {
  const { t } = useI18n();
  const text = givenText ?? t(k, vars);
  const parts = [];
  const pattern = /<(\w+)\s*\/>|<(\w+)>(.*?)<\/\2>/gs;
  let last = 0;
  let match;
  let index = 0;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const name = match[1] || match[2];
    const element = components[name];
    if (isValidElement(element)) {
      parts.push(
        match[1]
          ? cloneElement(element, { key: `t${index}` })
          : cloneElement(element, { key: `t${index}` }, match[3])
      );
    } else {
      parts.push(match[3] ?? '');
    }
    index += 1;
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <Fragment>{parts}</Fragment>;
};

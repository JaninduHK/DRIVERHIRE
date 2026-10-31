import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import {
  DEFAULT_LOCALE,
  LANGUAGE_SUGGESTION,
  LOCALE_INFO,
  LOCALE_STORAGE_KEY,
  detectBrowserLocale,
  isLocale,
  isLocalizedPath,
  localizePath,
  rememberLocale,
} from '../i18n/locales.js';

const readStored = () => {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY);
  } catch {
    return null;
  }
};

// On an English page, offer the visitor's own language instead of redirecting:
// the language they picked before, or else their browser language. Picking
// English or closing the banner stops it for good.
const LanguageSuggestion = () => {
  const { locale } = useI18n();
  const { pathname, search, hash } = useLocation();
  const [suggested, setSuggested] = useState(null);
  const onTranslatedPage = locale === DEFAULT_LOCALE && isLocalizedPath(pathname);

  useEffect(() => {
    if (!onTranslatedPage) {
      setSuggested(null);
      return;
    }
    const stored = readStored();
    if (stored === DEFAULT_LOCALE) return;
    const code = isLocale(stored) ? stored : detectBrowserLocale(navigator.languages || [navigator.language]);
    setSuggested(code && code !== DEFAULT_LOCALE ? code : null);
  }, [onTranslatedPage]);

  if (!onTranslatedPage || !suggested) return null;

  const text = LANGUAGE_SUGGESTION[suggested];
  const dismiss = () => {
    rememberLocale(DEFAULT_LOCALE);
    setSuggested(null);
  };

  return (
    <div
      lang={LOCALE_INFO[suggested].htmlLang}
      className="relative z-30 border-b border-emerald-100 bg-emerald-50"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <span className="text-lg" aria-hidden="true">{LOCALE_INFO[suggested].flag}</span>
        <p className="flex-1 text-[13.5px] font-medium text-ink">
          {text.message}{' '}
          <a
            href={`${localizePath(pathname, suggested)}${search}${hash}`}
            onClick={() => rememberLocale(suggested)}
            className="whitespace-nowrap font-bold text-brand-dark underline underline-offset-2"
          >
            {text.action} →
          </a>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={text.dismiss}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-emerald-100 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default LanguageSuggestion;

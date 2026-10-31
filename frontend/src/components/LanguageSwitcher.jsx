import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';
import {
  LOCALES,
  LOCALE_INFO,
  isLocalizedPath,
  localizePath,
  rememberLocale,
  stripLocale,
} from '../i18n/locales.js';

// The same page in each language. Switching is a plain link (full page load),
// so the new language's text is loaded fresh and the URL is shareable.
const useLanguageLinks = () => {
  const { pathname, search, hash } = useLocation();
  const basePath = stripLocale(pathname);
  return {
    available: isLocalizedPath(basePath),
    hrefFor: (code) => `${localizePath(basePath, code)}${search}${hash}`,
  };
};

// Header dropdown. Hidden on English-only pages (sign-in, driver pages).
export const LanguageMenu = ({ className = '' }) => {
  const { locale, t } = useI18n();
  const { available, hrefFor } = useLanguageLinks();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!available) return null;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('common.language.choose')}
        className="flex h-10 items-center gap-1.5 rounded-full border border-transparent bg-slate-100 px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
      >
        <Globe className="h-4 w-4" strokeWidth={1.9} />
        <span className="uppercase">{locale}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg"
        >
          {LOCALES.map((code) => (
            <a
              key={code}
              role="menuitem"
              href={hrefFor(code)}
              hrefLang={LOCALE_INFO[code].htmlLang}
              lang={LOCALE_INFO[code].htmlLang}
              onClick={() => rememberLocale(code)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 text-sm transition hover:bg-slate-50 ${
                code === locale ? 'font-bold text-brand-dark' : 'font-medium text-slate-700'
              }`}
            >
              <span aria-hidden="true">{LOCALE_INFO[code].flag}</span>
              <span className="flex-1">{LOCALE_INFO[code].name}</span>
              {code === locale ? <Check className="h-4 w-4" /> : null}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};

// Plain row of language links, for the mobile drawer and the footer.
export const LanguageLinks = ({ tone = 'light', className = '' }) => {
  const { locale, t } = useI18n();
  const { available, hrefFor } = useLanguageLinks();
  if (!available) return null;
  const idle = tone === 'dark' ? 'text-white/60 hover:text-white' : 'text-muted hover:text-ink';
  const active = tone === 'dark' ? 'font-bold text-white' : 'font-bold text-brand-dark';
  return (
    <nav aria-label={t('common.language.choose')} className={`flex flex-wrap items-center gap-x-3.5 gap-y-1.5 ${className}`}>
      <Globe className={`h-4 w-4 ${tone === 'dark' ? 'text-white/50' : 'text-muted-soft'}`} aria-hidden="true" />
      {LOCALES.map((code) => (
        <a
          key={code}
          href={hrefFor(code)}
          hrefLang={LOCALE_INFO[code].htmlLang}
          lang={LOCALE_INFO[code].htmlLang}
          onClick={() => rememberLocale(code)}
          aria-current={code === locale ? 'true' : undefined}
          className={`text-[12.5px] transition ${code === locale ? active : idle}`}
        >
          {LOCALE_INFO[code].name}
        </a>
      ))}
    </nav>
  );
};

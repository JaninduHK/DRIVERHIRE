import { useEffect, useState } from 'react';
import { BadgeCheck, ChevronRight, X } from 'lucide-react';
import { CREDENTIAL_SECTIONS, credentialSection } from '../constants/driverCredentials.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

/**
 * A driver's admin-checked credentials (degrees, experience, awards,
 * specialties, languages). The text is entered by our team in English.
 */

// Awards are gold and experience green everywhere (profile, popup and offer
// cards), each with a slowly flowing border (.cred-flow in index.css).
const AWARD_TILE = 'bg-gradient-to-br from-[#fde68a] to-[#f6c453] text-[#7a4b06]';
const FLOW = {
  awards: { ring: 'cred-flow cred-flow--gold', inner: 'bg-[#fff8e1] text-[#7a4b06]', icon: 'text-[#b7791f]' },
  experience: { ring: 'cred-flow cred-flow--green', inner: 'bg-[#effaf3] text-brand-dark', icon: 'text-brand' },
};

/** A tag; awards and experience get the flowing border. */
const CredentialTag = ({ section, rounded = 'rounded-full', className = '', children }) => {
  const flow = FLOW[section];
  if (!flow) return <span className={`inline-flex items-center ${rounded} bg-canvas text-ink-soft ${className}`}>{children}</span>;
  return (
    <span className={`${flow.ring} ${rounded}`}>
      <span className={`inline-flex items-center ${rounded} ${flow.inner} ${className}`}>{children}</span>
    </span>
  );
};

/**
 * The full list, one row per section: icon and section name, then the items as
 * tags. Awards are gold.
 */
export const CredentialSections = ({ credentials, className = '' }) => {
  const { t } = useI18n();
  const groups = CREDENTIAL_SECTIONS.map((section) => ({
    ...section,
    items: (credentials || []).filter((item) => item.section === section.key),
  })).filter((group) => group.items.length > 0);
  if (groups.length === 0) return null;

  return (
    <dl className={`m-0 divide-y divide-hairline ${className}`}>
      {groups.map(({ key, icon: Icon, items }) => (
        <div key={key} className="grid gap-2.5 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-4">
          <dt className="flex items-center gap-2.5 sm:items-start">
            <span className={`grid h-8 w-8 flex-none place-items-center rounded-[10px] ${key === 'awards' ? AWARD_TILE : 'bg-brand-tint text-brand-dark'}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-[12.5px] font-extrabold text-ink sm:pt-[7px]">{t(`common.credentials.sections.${key}`)}</span>
          </dt>
          <dd className="m-0 flex flex-wrap gap-1.5 sm:pt-0.5">
            {items.map((item) => (
              <CredentialTag key={item.text} section={key} className="px-3 py-[5px] text-[12.5px] font-semibold leading-tight">
                {item.text}
              </CredentialTag>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
};

/** "Verified by our team" pill that goes with every credentials list. */
export const CredentialsVerifiedNote = ({ className = '' }) => {
  const { t } = useI18n();
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-brand-tint px-2.5 py-1 text-[11.5px] font-bold text-brand-dark ${className}`}>
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      {t('common.credentials.verified')}
    </span>
  );
};

/** Profile block: heading with the verified pill, then the grouped list. */
export const CredentialsCard = ({ credentials, className = '' }) => {
  const { t } = useI18n();
  if (!Array.isArray(credentials) || credentials.length === 0) return null;
  return (
    <section className={`rounded-[18px] border border-hairline bg-white p-4 shadow-[0_2px_10px_rgba(15,31,45,0.04)] sm:p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3.5">
        <h3 className="m-0 text-[15.5px] font-extrabold tracking-tight text-ink">{t('common.credentials.title')}</h3>
        <CredentialsVerifiedNote />
      </div>
      <CredentialSections credentials={credentials} />
    </section>
  );
};

const APPEAL = ['awards', 'experience', 'specialties', 'languages', 'qualifications'];

const CredentialsDialog = ({ credentials, title, onClose }) => {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/45 sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full max-w-[560px] overflow-y-auto rounded-t-[22px] bg-white p-5 shadow-drawer sm:rounded-[22px] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-extrabold text-ink">{title}</h2>
            <CredentialsVerifiedNote className="mt-1.5" />
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.credentials.close')} className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-canvas text-ink hover:bg-[#e9efec]">
            <X className="h-4 w-4" />
          </button>
        </div>
        <CredentialSections credentials={credentials} />
      </div>
    </div>
  );
};

/**
 * For offer cards: the starred highlights (up to 4) as short lines, and
 * "See all credentials" opening the full list. Nothing when there are none.
 */
export const CredentialHighlights = ({ credentials, driverName, className = '' }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const list = Array.isArray(credentials) ? credentials : [];
  if (list.length === 0) return null;
  const highlights = list.filter((item) => item.highlight);
  // Nothing starred: lead with awards and experience, the most eye-catching.
  const byAppeal = [...list].sort((a, b) => APPEAL.indexOf(a.section) - APPEAL.indexOf(b.section));
  const shown = highlights.length ? highlights : byAppeal.slice(0, 3);
  const title = driverName ? t('common.credentials.titleFor', { name: driverName }) : t('common.credentials.title');

  return (
    <div className={className}>
      <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
        {shown.map((item) => {
          const Icon = credentialSection(item.section).icon;
          return (
            <li key={`${item.section}-${item.text}`} className="inline-flex">
              {FLOW[item.section] ? (
                <CredentialTag section={item.section} rounded="rounded-lg" className="gap-1.5 px-2 py-[3px] text-[11.5px] font-bold leading-snug">
                  <Icon className={`h-3.5 w-3.5 flex-none ${FLOW[item.section].icon}`} aria-hidden="true" />
                  {item.text}
                </CredentialTag>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-tint px-2 py-1 text-[11.5px] font-bold leading-snug text-brand-dark">
                  <Icon className="h-3.5 w-3.5 flex-none text-brand" aria-hidden="true" />
                  {item.text}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {list.length > shown.length ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-1.5 inline-flex items-center gap-0.5 text-[12px] font-extrabold text-brand-dark hover:underline">
          {t('common.credentials.seeAll', { count: list.length })}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {open ? <CredentialsDialog credentials={list} title={title} onClose={() => setOpen(false)} /> : null}
    </div>
  );
};

export default CredentialHighlights;

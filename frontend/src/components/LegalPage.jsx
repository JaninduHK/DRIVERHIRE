import { DEFAULT_LOCALE } from '../i18n/locales.js';
import { Trans, useI18n } from '../i18n/I18nProvider.jsx';

const Section = ({ title, children }) => (
  <section className="space-y-2">
    <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
    <div className="space-y-3 text-sm leading-6 text-slate-700">{children}</div>
  </section>
);

const emailLink = <a className="text-emerald-700 underline" href="mailto:hello@carwithdriver.lk" />;

// Terms and Privacy share one layout. Their text is in legal.json as
// { eyebrow, title, intro, sections: [{ title, paragraphs?, items? }] }.
// Translated versions say the English text is the binding one.
const LegalPage = ({ doc, englishPath }) => {
  const { t, locale } = useI18n();
  const updatedOn = '2024-06-01';
  const sections = t(`legal.${doc}.sections`);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-600">{t(`legal.${doc}.eyebrow`)}</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{t(`legal.${doc}.title`)}</h1>
          <p className="text-sm text-slate-600">{t(`legal.${doc}.intro`, { date: updatedOn })}</p>
        </header>

        {locale !== DEFAULT_LOCALE ? (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <Trans
              k="legal.englishPrevails"
              components={{ link: <a href={englishPath} hrefLang="en" lang="en" className="font-semibold underline" /> }}
            />
          </p>
        ) : null}

        <div className="mt-10 space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          {(Array.isArray(sections) ? sections : []).map((section) => (
            <Section key={section.title} title={section.title}>
              {(section.paragraphs || []).map((paragraph) => (
                <p key={paragraph}>
                  <Trans text={paragraph} components={{ email: emailLink }} />
                </p>
              ))}
              {section.items ? (
                <ul className="list-disc space-y-2 pl-5">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </Section>
          ))}
        </div>
      </div>
    </main>
  );
};

export default LegalPage;

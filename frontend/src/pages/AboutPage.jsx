import React, { useState } from 'react';
import {
  Globe2,
  ShieldCheck,
  MessageCircle,
  MapPin,
  Users,
  CheckCircle2,
  Quote,
} from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider.jsx';

const AboutPage = () => {
  const { t } = useI18n();
  // All text lives in about.json.
  const trustPillars = [
    { icon: Globe2, key: 'expertise' },
    { icon: ShieldCheck, key: 'matching' },
    { icon: MessageCircle, key: 'support' },
  ].map(({ icon, key }) => ({
    icon,
    title: t(`about.pillars.${key}.title`),
    description: t(`about.pillars.${key}.description`),
  }));

  const faqs = ['what', 'aim', 'otherSites', 'based', 'money', 'help'].map((key) => ({
    question: t(`about.faq.${key}.q`),
    answer: t(`about.faq.${key}.a`),
  }));

  const bookingBenefits = t('about.promises.items');

  const testimonials = [
    { name: 'Hannah and Luis', key: 'spain' },
    { name: 'Ravi and Aanya', key: 'india' },
  ].map(({ name, key }) => ({
    name,
    location: t(`about.testimonials.${key}.location`),
    feedback: t(`about.testimonials.${key}.feedback`),
  }));

  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  const toggleFaq = (index) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  return (
    <main className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl space-y-20 px-4 sm:px-6 lg:px-8">
        {/* 🚗 HERO SECTION (Simplified) */}
        {/* Removed the 'grid' structure and the 'Live Trip Snapshot' card for a cleaner look */}
        <section className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t('about.hero.badge')}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            {t('about.hero.title')}
          </h1>
          <p className="max-w-3xl text-lg leading-relaxed text-slate-600">
            {t('about.hero.lead')}
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <Users className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-slate-700">
                {t('about.hero.builtFor')}
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
              <MapPin className="h-5 w-5 text-emerald-600" />
              <p className="text-sm text-slate-700">
                {t('about.hero.coverage')}
              </p>
            </div>
          </div>
        </section>
        
        {/* --- */}

        {/* 🤝 TRUST PILLARS */}
        <section className="space-y-8 pt-10"> {/* Added padding for better separation */}
          <header className="space-y-2 text-center max-w-2xl mx-auto">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              {t('about.pillars.eyebrow')}
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {t('about.pillars.title')}
            </h2>
            <p className="text-base text-slate-600">
              {t('about.pillars.lead')}
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-3"> {/* Increased gap for visual space */}
            {trustPillars.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200 hover:shadow-xl transition-shadow" // Enhanced shadow/hover
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"> {/* Bigger icon badge */}
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-base leading-relaxed text-slate-700">{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* --- */}
        
        {/* ⚖️ WHY + SUPPORT */}
        <section className="grid gap-8 lg:grid-cols-2">
          <article className="rounded-3xl bg-white p-8 shadow-md ring-1 ring-slate-200"> {/* Increased padding */}
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              {t('about.why.eyebrow')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">
              {t('about.why.title')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              {t('about.why.body')}
            </p>
          </article>

          <article className="flex flex-col justify-between rounded-3xl bg-emerald-600 p-8 text-white ring-1 ring-emerald-700 shadow-md"> {/* Changed background to primary color for emphasis */}
            <div>
              <h2 className="text-2xl font-bold">
                {t('about.help.title')}
              </h2>
              <p className="mt-3 text-base leading-relaxed opacity-95">
                {t('about.help.body')}
              </p>
            </div>
            <p className="mt-6 text-sm opacity-80 border-t border-emerald-400 pt-4">
              {t('about.help.note')}
            </p>
          </article>
        </section>

        {/* --- */}

        {/* ❓ FAQ WITH TOGGLES */}
        <section className="space-y-8 pt-10">
          <header className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              {t('about.faq.eyebrow')}
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {t('about.faq.title')}
            </h2>
            <p className="max-w-3xl text-base text-slate-600">
              {t('about.faq.lead')}
            </p>
          </header>

          <div className="space-y-4 max-w-6xl"> {/* Constrained max-width for better readability */}
            {faqs.map(({ question, answer }, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={question}
                  className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200"
                >
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                  >
                    <span className="text-base font-semibold text-slate-900">{question}</span>
                    <span
                      className={
                        'flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold transition ' +
                        (isOpen
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200')
                      }
                    >
                      {isOpen ? '−' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 px-6 pb-5 pt-3">
                      <p className="text-base leading-relaxed text-slate-700">{answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        
        {/* --- */}

        {/* ✅ BOOKING PROMISES */}
        <section className="space-y-8 pt-10 mt-10">
          <header className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              {t('about.promises.eyebrow')}
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">{t('about.promises.title')}</h2>
            <p className="max-w-3xl text-base text-slate-600">
              {t('about.promises.lead')}
            </p>
          </header>

          <ul className="grid gap-5 md:grid-cols-2"> {/* Increased gap */}
            {bookingBenefits.map((benefit) => (
              <li
                key={benefit}
                className="flex gap-4 rounded-2xl bg-white p-5 text-base text-slate-700 shadow-sm ring-1 ring-slate-200" // Increased padding/text size
              >
                <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                <span className='font-medium'>{benefit}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* --- */}

        {/* ⭐ TESTIMONIALS */}
        <section className="space-y-8 pt-10 mt-10">
          <header className="space-y-2 text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              {t('about.testimonials.eyebrow')}
            </p>
            <h2 className="text-3xl font-semibold text-slate-900">
              {t('about.testimonials.title')}
            </h2>
            <p className="mx-auto max-w-3xl text-base text-slate-600">
              {t('about.testimonials.lead')}
            </p>
          </header>

          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map(({ name, location, feedback }) => (
              <article
                key={name}
                className="flex h-full flex-col justify-between rounded-3xl bg-white p-8 text-left shadow-lg ring-1 ring-slate-200" // Increased padding/shadow
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Quote className="h-5 w-5" />
                </div>
                <p className="text-base italic leading-relaxed text-slate-800">{feedback}</p>
                <p className="mt-6 text-base font-bold text-slate-900 border-t border-slate-100 pt-4">
                  {name}{' '}
                  <span className="font-normal text-slate-600">• {location}</span>
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default AboutPage;
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from '../i18n/router.jsx';
import { Trans, useI18n } from '../i18n/I18nProvider.jsx';
import { translateLicenseType } from '../i18n/labels.js';
import { useLoaderData } from 'react-router';
import toast from 'react-hot-toast';
import { Check, ChevronDown, Star, X } from 'lucide-react';
import { getStoredToken, getStoredUser, redirectToSsoLogin } from '../services/authToken.js';
import { savePendingBrief } from '../lib/pendingBrief.js';
import { calculateClassEstimates, calculateInclusionRates, priceFormatter } from '../lib/tripCostEstimator.js';
import { LICENSE_BADGE_STYLES } from '../constants/driverLicense.js';
import { LicenseIconBadge, LicenseTypeChip } from '../components/LicenseBadge.jsx';

const REQUESTS_PATH = '/dashboard?tab=requests';
const MESSAGE_MAX_LENGTH = 2000; // matches TourBrief.message's maxlength in backend/models/TourBrief.js

// Typical driving distance per touring day, from the same figures the trip cost
// calculator quotes (see getRouteInsight in lib/tripCostEstimator.js).
const KM_PER_DAY = { low: 120, high: 150 };

const DRIVER_TYPES_ARTICLE = '/blog/tourist-driver-vs-chauffeur-guide-vs-national-guide';

const QUOTE_LIMIT_OPTIONS = [
  { value: '', label: 'noLimit' },
  { value: '10', label: '10' },
  { value: '15', label: '15' },
  { value: '20', label: '20' },
];

// Values must match LICENSE_TYPES on the backend exactly.
const DRIVER_TYPE_OPTIONS = [
  { value: '', label: 'allDrivers' },
  { value: 'Tourist Driver', label: 'touristOnly' },
  { value: 'Chauffeur Guide Lecturer', label: 'chauffeurOnly' },
];

// A class with a single listing has identical bounds; "$120–$120" reads as a bug.
const formatBand = (low, high) =>
  Math.round(low) === Math.round(high)
    ? priceFormatter(low)
    : `${priceFormatter(low)}–${priceFormatter(high)}`;

const buildForm = () => ({
  startDate: '',
  endDate: '',
  startLocation: '',
  endLocation: '',
  adults: '2',
  children: '0',
  country: '',
  message: '',
  maxOffers: '',
  requiredLicenseType: '',
});

const inputCls =
  'w-full rounded-xl border-[1.5px] border-[#e5ebe8] bg-[#fbfcfc] px-3.5 py-3 text-[14.5px] font-semibold text-ink outline-none transition focus:border-brand';
const labelCls = 'mb-1.5 block text-xs font-bold text-muted';

// Text for these lives in getQuotes.json under the same keys.
const STEPS = ['1', '2', '3'];
const DRIVER_TYPES = [
  { name: 'Tourist Driver', key: 'touristDriver' },
  { name: 'Chauffeur Guide Lecturer', key: 'chauffeurGuideLecturer' },
  { name: 'National Guide Lecturer', key: 'nationalGuideLecturer' },
];
const REASONS = ['middleman', 'locked', 'private', 'licences', 'reviews', 'support'];
const FAQS = ['cost', 'fee', 'pay', 'difference', 'fuel', 'meals', 'howLong', 'change', 'wrong'];

const GetQuotes = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const loaderData = useLoaderData();
  const vehicles = useMemo(() => (Array.isArray(loaderData?.vehicles) ? loaderData.vehicles : []), [loaderData]);
  const driverTypeSelectionEnabled = loaderData?.driverTypeSelectionEnabled !== false;
  const recommendedDrivers = useMemo(
    () => (Array.isArray(loaderData?.recommendedDrivers) ? loaderData.recommendedDrivers : []),
    [loaderData]
  );

  const [form, setForm] = useState(buildForm());
  const [openFaq, setOpenFaq] = useState(0);
  const formRef = useRef(null);

  const setField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const todayDate = new Date().toISOString().split('T')[0];

  // Every figure below is derived from the live fleet, so the page can never
  // quote a rate no driver is actually offering.
  const classBands = useMemo(() => calculateClassEstimates({ vehicles, days: 1 }), [vehicles]);
  const inclusions = useMemo(() => calculateInclusionRates({ vehicles }), [vehicles]);
  const alwaysIncluded = useMemo(() => inclusions.filter((i) => i.percent >= 95), [inclusions]);
  const variesByListing = useMemo(() => inclusions.filter((i) => i.percent < 95), [inclusions]);

  const priced = useMemo(() => vehicles.map((v) => Number(v?.pricePerDay)).filter((n) => Number.isFinite(n) && n > 0), [vehicles]);
  const fleet = useMemo(() => {
    if (priced.length === 0) return null;
    return { count: priced.length, low: Math.min(...priced), high: Math.max(...priced) };
  }, [priced]);

  const jsonLd = useMemo(() => {
    const blocks = [
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t('getQuotes.breadcrumbHome'), item: `https://carwithdriver.lk${locale === 'en' ? '' : `/${locale}`}` },
          { '@type': 'ListItem', position: 2, name: t('getQuotes.breadcrumbCurrent'), item: `https://carwithdriver.lk${locale === 'en' ? '' : `/${locale}`}/get-quotes` },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((key) => ({
          '@type': 'Question',
          name: t(`getQuotes.faq.${key}.q`),
          acceptedAnswer: { '@type': 'Answer', text: t(`getQuotes.faq.${key}.a`) },
        })),
      },
    ];
    if (fleet) {
      blocks.splice(1, 0, {
        '@context': 'https://schema.org',
        '@type': 'Service',
        serviceType: 'Car with driver hire and chauffeur guide quotations',
        provider: { '@type': 'Organization', name: 'Car With Driver LK', url: 'https://carwithdriver.lk' },
        areaServed: { '@type': 'Country', name: 'Sri Lanka' },
        url: `https://carwithdriver.lk${locale === 'en' ? '' : `/${locale}`}/get-quotes`,
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'USD',
          lowPrice: String(fleet.low),
          highPrice: String(fleet.high),
          offerCount: String(fleet.count),
          availability: 'https://schema.org/InStock',
        },
      });
    }
    return blocks;
  }, [fleet, t, locale]);

  const handleNext = async (event) => {
    event.preventDefault();

    const payload = {
      startDate: form.startDate,
      endDate: form.endDate,
      startLocation: form.startLocation.trim(),
      endLocation: form.endLocation.trim(),
      adults: Number(form.adults || 0),
      children: Math.max(0, Number(form.children || 0)),
      message: form.message.trim(),
      country: form.country.trim(),
      maxOffers: form.maxOffers ? Number(form.maxOffers) : null,
      requiredLicenseType: driverTypeSelectionEnabled ? form.requiredLicenseType || null : null,
      // The language the traveller used, so drivers and admin can see it on the request.
      language: locale,
    };

    if (!payload.startDate || !payload.endDate) {
      toast.error(t('getQuotes.errors.dates'));
      return;
    }
    if (payload.endDate < payload.startDate) {
      toast.error(t('getQuotes.errors.endAfterStart'));
      return;
    }
    if (payload.startDate < todayDate) {
      toast.error(t('getQuotes.errors.startPast'));
      return;
    }
    if (!payload.startLocation || !payload.endLocation || !payload.message || !payload.country) {
      toast.error(t('getQuotes.errors.allFields'));
      return;
    }
    if (payload.message.length > MESSAGE_MAX_LENGTH) {
      toast.error(t('getQuotes.errors.tooLong', { max: MESSAGE_MAX_LENGTH }));
      return;
    }
    if (payload.adults < 1) {
      toast.error(t('getQuotes.errors.adults'));
      return;
    }

    // Nothing is posted from this page. The request is parked and My Requests
    // shows it back for the traveller to review, edit and post (see
    // lib/pendingBrief.js) — the same step whether they are already signed in
    // or come back from registering with Asgardeo.
    savePendingBrief(payload);

    const token = getStoredToken();
    const user = getStoredUser();
    if (token && user?.role === 'guest') {
      navigate(REQUESTS_PATH);
      return;
    }

    redirectToSsoLogin(REQUESTS_PATH);
  };

  return (
    <div className="bg-canvas">
      {jsonLd.map((block, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
        />
      ))}

      {/* Hero + form */}
      <section className="border-b border-[#eaeeec] bg-gradient-to-b from-[#f2f7f4] to-canvas">
        <div className="mx-auto max-w-[1320px] px-[clamp(14px,3vw,28px)] pb-[clamp(30px,4vw,56px)] pt-[clamp(26px,3.4vw,42px)]">
          {/* Text column gets the larger share: it carries a 46px headline, while the
              form's width is driven by its fields. Stacks below lg. */}
          <div className="grid items-center gap-[clamp(24px,3.4vw,56px)] lg:grid-cols-[1.2fr_minmax(0,1fr)]">
            <div className="min-w-0">
              {/* Sits with the heading so it stays attached when the column centres. */}
              <nav aria-label={t('getQuotes.breadcrumb')} className="mb-3.5 flex flex-wrap items-center gap-[7px] text-[13px] font-semibold text-muted-soft">
                <Link to="/" className="text-brand-dark hover:underline">{t('getQuotes.breadcrumbHome')}</Link>
                <span aria-hidden="true">/</span>
                <span className="font-bold text-ink">{t('getQuotes.breadcrumbCurrent')}</span>
              </nav>
              <h1 className="text-[clamp(28px,4.2vw,46px)] font-extrabold leading-[1.06] tracking-[-.03em] text-ink">
                {t('getQuotes.hero.title')}
              </h1>
              <p className="mt-4 max-w-[60ch] text-[clamp(15.5px,1.4vw,17.5px)] leading-[1.65] text-muted lg:mt-5">
                {t('getQuotes.hero.lead')}
              </p>

              <ul className="mt-5 flex flex-col gap-[11px] lg:mt-7 lg:gap-[15px]">
                {t('getQuotes.hero.points').map((text) => (
                  <li key={text} className="flex items-start gap-2.5 text-[14.5px] font-semibold leading-[1.5] text-ink-soft lg:text-[15.5px]">
                    <span className="mt-0.5 grid h-[21px] w-[21px] flex-shrink-0 place-items-center rounded-full bg-brand-tint">
                      <Check className="h-3 w-3 text-brand-dark" strokeWidth={3} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>

              {/* Always three across — these read as a single band, so they must not wrap. */}
              <div className="mt-[22px] grid grid-cols-3 gap-x-3 sm:gap-x-[clamp(26px,4vw,44px)] lg:mt-8">
                <Stat value={t('getQuotes.hero.stat1Value')} label={t('getQuotes.hero.stat1Label')} />
                <Stat value="10+" label={t('getQuotes.hero.stat2Label')} />
                <Stat value={t('getQuotes.hero.stat3Value')} label={t('getQuotes.hero.stat3Label')} />
              </div>
            </div>

            {/* Quote form */}
            <div ref={formRef} id="quote-form" className="min-w-0 scroll-mt-24">
              <form
                onSubmit={handleNext}
                className="rounded-[24px] border border-[#e7ecea] bg-white p-[clamp(16px,2.4vw,24px)] shadow-[0_18px_44px_rgba(15,36,48,.07)]"
              >
                <h2 className="text-[18px] font-extrabold tracking-[-.01em] text-ink">{t('getQuotes.form.title')}</h2>
                <p className="mt-1.5 text-[13.5px] leading-[1.55] text-muted">
                  {t('getQuotes.form.intro')}
                </p>

                <div className="mt-4 grid gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelCls}>{t('getQuotes.form.startDate')}</span>
                      <input
                        type="date"
                        required
                        value={form.startDate}
                        min={todayDate}
                        onChange={setField('startDate')}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('getQuotes.form.endDate')}</span>
                      <input
                        type="date"
                        required
                        value={form.endDate}
                        min={form.startDate || todayDate}
                        onChange={setField('endDate')}
                        className={inputCls}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelCls}>{t('getQuotes.form.pickup')}</span>
                      <input
                        type="text"
                        required
                        value={form.startLocation}
                        onChange={setField('startLocation')}
                        placeholder={t('getQuotes.form.placePlaceholder')}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('getQuotes.form.dropoff')}</span>
                      <input
                        type="text"
                        required
                        value={form.endLocation}
                        onChange={setField('endLocation')}
                        placeholder={t('getQuotes.form.placePlaceholder')}
                        className={inputCls}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className={labelCls}>{t('getQuotes.form.adults')}</span>
                      <input
                        type="number"
                        min="1"
                        required
                        value={form.adults}
                        onChange={setField('adults')}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('getQuotes.form.children')}</span>
                      <input
                        type="number"
                        min="0"
                        value={form.children}
                        onChange={setField('children')}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>{t('getQuotes.form.country')}</span>
                      <input
                        type="text"
                        required
                        value={form.country}
                        onChange={setField('country')}
                        placeholder={t('getQuotes.form.countryPlaceholder')}
                        className={inputCls}
                      />
                    </label>
                  </div>

                  <div className={`grid grid-cols-1 gap-4 ${driverTypeSelectionEnabled ? 'sm:grid-cols-2' : ''}`}>
                    <label className="block">
                      <span className={labelCls}>{t('getQuotes.form.limit')} <span className="font-semibold text-muted-soft">{t('getQuotes.form.optional')}</span></span>
                      <select
                        value={form.maxOffers}
                        onChange={setField('maxOffers')}
                        className={inputCls}
                      >
                        {QUOTE_LIMIT_OPTIONS.map((o) => (
                          <option key={o.label} value={o.value}>{o.value ? o.label : t(`getQuotes.form.${o.label}`)}</option>
                        ))}
                      </select>
                      <span className="mt-1.5 block text-[11.5px] leading-[1.5] text-muted-soft">
                        {t('getQuotes.form.limitHelp')}
                      </span>
                    </label>

                    {driverTypeSelectionEnabled ? (
                      <label className="block">
                        <span className={labelCls}>{t('getQuotes.form.driverType')} <span className="font-semibold text-muted-soft">{t('getQuotes.form.optional')}</span></span>
                        <select
                          value={form.requiredLicenseType}
                          onChange={setField('requiredLicenseType')}
                          className={inputCls}
                        >
                          {DRIVER_TYPE_OPTIONS.map((o) => (
                            <option key={o.label} value={o.value}>{t(`getQuotes.form.${o.label}`)}</option>
                          ))}
                        </select>
                        <span className="mt-1.5 block text-[11.5px] leading-[1.5] text-muted-soft">
                          {t('getQuotes.form.driverTypeHelp')}
                        </span>
                      </label>
                    ) : null}
                  </div>

                  <label className="block">
                    <span className={labelCls}>{t('getQuotes.form.notes')}</span>
                    <textarea
                      rows="4"
                      required
                      maxLength={MESSAGE_MAX_LENGTH}
                      value={form.message}
                      onChange={setField('message')}
                      placeholder={t('getQuotes.form.notesPlaceholder')}
                      className={`${inputCls} resize-y leading-[1.5]`}
                    />
                    <span className="mt-1.5 flex items-start justify-between gap-2 text-[11.5px] leading-[1.5] text-muted-soft">
                      <span>
                        {t('getQuotes.form.noContact')}
                      </span>
                      <span className={`flex-shrink-0 whitespace-nowrap ${form.message.length > MESSAGE_MAX_LENGTH ? 'text-red-600' : ''}`}>
                        {form.message.length}/{MESSAGE_MAX_LENGTH}
                      </span>
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="mt-1 flex min-h-[52px] items-center justify-center gap-2 rounded-[13px] bg-brand px-6 text-[15.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(16,163,90,.75)] transition hover:bg-[#0e9351] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {t('getQuotes.form.next')}
                  </button>
                  <p className="text-center text-xs leading-[1.5] text-muted-soft">
                    {t('getQuotes.form.footnote')}
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto flex max-w-[1100px] flex-col gap-[clamp(34px,5vw,60px)] px-[clamp(14px,3vw,28px)] pb-[clamp(44px,6vw,80px)] pt-[clamp(34px,5vw,64px)]">

        {/* How it works */}
        <section id="how-it-works" className="scroll-mt-24">
          <SectionHeading>{t('getQuotes.how.title')}</SectionHeading>
          <SectionLead>{t('getQuotes.how.lead')}</SectionLead>
          <div className="mt-[22px] grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((n) => (
              <div key={n} className="rounded-[20px] border border-[#e7ecea] bg-white p-5">
                <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-brand-tint text-[15px] font-extrabold text-brand-dark">
                  {n}
                </span>
                <h3 className="mt-3 text-[17px] font-extrabold tracking-[-.015em] text-ink">{t(`getQuotes.how.step${n}.title`)}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-muted">{t(`getQuotes.how.step${n}.body`)}</p>
                <div className="mt-3 text-[12.5px] font-extrabold text-brand-dark">{t(`getQuotes.how.step${n}.meta`)}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Driver types */}
        <section id="driver-types" className="scroll-mt-24">
          <SectionHeading>{t('getQuotes.types.title')}</SectionHeading>
          <SectionLead>{t('getQuotes.types.lead')}</SectionLead>
          <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {DRIVER_TYPES.map((type) => {
              const badge = LICENSE_BADGE_STYLES[type.name];
              const Icon = badge?.icon;
              return (
                <div key={type.name} className="rounded-[20px] border border-[#e7ecea] bg-white p-5">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-extrabold ${badge?.badgeClass || 'bg-slate-100 text-slate-700'}`}>
                    {Icon ? <Icon className={`h-3.5 w-3.5 ${badge.iconClass}`} /> : null}
                    {translateLicenseType(type.name, t)}
                  </span>
                  <p className="mt-3 text-[14.5px] leading-[1.6] text-muted">{t(`getQuotes.types.${type.key}.body`)}</p>
                  <p className="mt-3 text-[13px] font-bold leading-[1.5] text-ink-soft">{t('getQuotes.types.bestFor', { text: t(`getQuotes.types.${type.key}.bestFor`) })}</p>
                </div>
              );
            })}
          </div>
          <Link
            to={DRIVER_TYPES_ARTICLE}
            className="mt-4 inline-flex min-h-[48px] items-center gap-2 text-[14.5px] font-extrabold text-brand-dark hover:underline"
          >
            {t('getQuotes.types.readMore')}
          </Link>
        </section>

        {/* Rates */}
        <section id="rates" className="scroll-mt-24">
          <SectionHeading>{t('getQuotes.rates.title')}</SectionHeading>
          <SectionLead>{t('getQuotes.rates.lead')}</SectionLead>

          {classBands.length > 0 ? (
            <>
              {fleet ? (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#c9ead8] bg-brand-tint px-4 py-3.5">
                  <span className="text-[13px] font-extrabold text-brand-dark">
                    {t('getQuotes.rates.fromListings', { count: fleet.count })}
                  </span>
                  <span className="text-[13px] font-semibold text-ink-soft">
                    {t('getQuotes.rates.updated')}
                  </span>
                </div>
              ) : null}

              <div className="mt-3.5 overflow-x-auto rounded-[20px] border border-[#e7ecea] bg-white">
                <table className="w-full min-w-[620px] border-collapse">
                  <caption className="border-b border-[#eef2f0] px-[18px] py-[15px] text-left text-[13px] font-bold text-muted-soft">
                    {t('getQuotes.rates.caption')}
                  </caption>
                  <thead>
                    <tr className="bg-[#f7faf8]">
                      <th scope="col" className="px-[18px] py-3 text-left text-[12.5px] font-extrabold text-ink-soft">{t('getQuotes.rates.colClass')}</th>
                      <th scope="col" className="px-[18px] py-3 text-left text-[12.5px] font-extrabold text-ink-soft">{t('getQuotes.rates.colSeats')}</th>
                      <th scope="col" className="whitespace-nowrap px-[18px] py-3 text-right text-[12.5px] font-extrabold text-ink-soft">{t('getQuotes.rates.colPerDay')}</th>
                      <th scope="col" className="whitespace-nowrap px-[18px] py-3 text-right text-[12.5px] font-extrabold text-ink-soft">{t('getQuotes.rates.colListings')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classBands.map((b) => (
                      <tr key={b.id} className="border-t border-[#eef2f0]">
                        <th scope="row" className="px-[18px] py-3.5 text-left text-[14px] font-bold text-ink">
                          {t(`estimator.buckets.${b.id}.label`)}
                          {b.example ? <span className="block text-[12.5px] font-semibold text-muted-soft">{t('getQuotes.rates.example', { model: b.example })}</span> : null}
                        </th>
                        <td className="px-[18px] py-3.5 text-[14px] font-semibold text-muted">{t(`estimator.buckets.${b.id}.seats`)}</td>
                        <td className="whitespace-nowrap px-[18px] py-3.5 text-right text-[14px] font-extrabold text-ink">
                          {formatBand(b.perDay.low, b.perDay.high)}
                        </td>
                        <td className="whitespace-nowrap px-[18px] py-3.5 text-right text-[14px] font-semibold text-muted">{b.sampleSize}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[14px] leading-[1.6] text-muted-soft">
                {t('getQuotes.rates.note', { low: KM_PER_DAY.low, high: KM_PER_DAY.high })}{' '}
                <Link to="/trip-cost-calculator" className="font-bold text-brand-dark hover:underline">
                  {t('getQuotes.rates.estimate')}
                </Link>
              </p>
            </>
          ) : (
            <p className="mt-4 text-[15px] text-muted">
              {t('getQuotes.rates.loading')}{' '}
              <Link to="/vehicles" className="font-bold text-brand-dark hover:underline">{t('getQuotes.rates.browseFleet')}</Link>
            </p>
          )}
        </section>

        {/* What's included */}
        {inclusions.length > 0 ? (
          <section id="included" className="scroll-mt-24">
            <SectionHeading>{t('getQuotes.included.title')}</SectionHeading>
            <SectionLead>{t('getQuotes.included.lead')}</SectionLead>
            <div className="mt-5 grid gap-3.5 md:grid-cols-2">
              <div className="rounded-[20px] border-[1.5px] border-[#c9ead8] bg-white p-5">
                <div className="text-[12px] font-extrabold tracking-[.07em] text-brand-dark">{t('getQuotes.included.always')}</div>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {alwaysIncluded.map((i) => (
                    <li key={i.key} className="flex gap-2.5 text-[14.5px] font-semibold leading-[1.5] text-ink-soft">
                      <Check className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-brand-dark" strokeWidth={3} />
                      {t(`estimator.inclusions.${i.key}`)}
                    </li>
                  ))}
                  <li className="flex gap-2.5 text-[14.5px] font-semibold leading-[1.5] text-ink-soft">
                    <Check className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-brand-dark" strokeWidth={3} />
                    {t('getQuotes.included.kmPerDay', { low: KM_PER_DAY.low, high: KM_PER_DAY.high })}
                  </li>
                </ul>
              </div>
              <div className="rounded-[20px] border-[1.5px] border-[#e7ecea] bg-white p-5">
                <div className="text-[12px] font-extrabold tracking-[.07em] text-muted-soft">{t('getQuotes.included.varies')}</div>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {variesByListing.map((i) => (
                    <li key={i.key} className="flex gap-2.5 text-[14.5px] font-semibold leading-[1.5] text-ink-soft">
                      <X className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-muted-soft" strokeWidth={3} />
                      {t(`estimator.inclusions.${i.key}`)}
                    </li>
                  ))}
                  {t('getQuotes.included.notIncluded').map((text) => (
                    <li key={text} className="flex gap-2.5 text-[14.5px] font-semibold leading-[1.5] text-ink-soft">
                      <X className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-muted-soft" strokeWidth={3} />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {/* Recommended drivers */}
        {recommendedDrivers.length > 0 ? (
          <section id="recommended-drivers" className="scroll-mt-24">
            <SectionHeading>{t('getQuotes.recommended.title')}</SectionHeading>
            <SectionLead>{t('getQuotes.recommended.lead')}</SectionLead>
            <div className="mt-5 grid gap-3.5 sm:grid-cols-2">
              {recommendedDrivers.map((d) => (
                <article
                  key={d.id}
                  className="flex flex-col rounded-[20px] border border-[#e7ecea] bg-white p-5 transition hover:border-brand"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-full bg-brand-tint text-[21px] font-extrabold text-brand-dark">
                      {d.profilePhoto ? (
                        <img
                          src={d.profilePhoto}
                          alt={d.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (d.name || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-[7px]">
                        <h3 className="text-[16.5px] font-extrabold text-ink">{d.name}</h3>
                        <LicenseIconBadge licenseType={d.licenseType} />
                      </div>
                      {d.licenseType ? (
                        <LicenseTypeChip licenseType={d.licenseType} />
                      ) : d.location?.label ? (
                        <div className="mt-[3px] text-[12.5px] font-semibold text-muted-soft">{d.location.label}</div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold text-ink">
                    {d.reviewCount > 0 ? (
                      <>
                        <Star className="h-[15px] w-[15px] fill-[#f5b400] text-[#f5b400]" />
                        {d.reviewScore}
                        <span className="font-semibold text-muted-soft">· {t('getQuotes.recommended.reviews', { count: d.reviewCount })}</span>
                      </>
                    ) : null}
                    {d.experienceYears > 0 ? (
                      <span className="font-semibold text-muted-soft">
                        {d.reviewCount > 0 ? '· ' : ''}
                        {t('getQuotes.recommended.yearsDriving', { count: d.experienceYears })}
                      </span>
                    ) : null}
                  </div>

                  {d.description ? (
                    <p className="mt-[11px] flex-1 text-[14px] leading-[1.6] text-muted line-clamp-3">{d.description}</p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between gap-2.5 border-t border-[#f0f3f2] pt-3.5">
                    <div>
                      <div className="text-[11px] font-bold tracking-[.04em] text-muted-soft">
                        {d.vehicleCount > 1 ? t('getQuotes.recommended.vehiclesFrom', { count: d.vehicleCount }) : t('getQuotes.recommended.from')}
                      </div>
                      <div className="text-[17px] font-extrabold text-ink">
                        {d.fromPrice ? priceFormatter(d.fromPrice) : t('getQuotes.recommended.quote')}
                        <span className="text-[12.5px] font-semibold text-muted-soft">{t('getQuotes.recommended.perDay')}</span>
                      </div>
                    </div>
                    <Link
                      to={`/drivers/${d.id}`}
                      className="inline-flex min-h-[44px] items-center rounded-[11px] bg-brand-tint px-4 text-[13.5px] font-bold text-brand-dark"
                    >
                      {t('getQuotes.recommended.viewDriver')}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <Link
              to="/drivers"
              className="mt-4 inline-flex min-h-[48px] items-center gap-2 text-[14.5px] font-extrabold text-brand-dark hover:underline"
            >
              {t('getQuotes.recommended.browseAll')}
            </Link>
          </section>
        ) : null}

        {/* Why us */}
        <section id="why-us" className="scroll-mt-24">
          <SectionHeading>{t('getQuotes.why.title')}</SectionHeading>
          <SectionLead>{t('getQuotes.why.lead')}</SectionLead>
          <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((key) => (
              <div key={key} className="rounded-[20px] border border-[#e7ecea] bg-white p-[18px]">
                <h3 className="text-[16px] font-extrabold tracking-[-.015em] text-ink">{t(`getQuotes.why.${key}.title`)}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-muted">{t(`getQuotes.why.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <SectionHeading>{t('getQuotes.faq.title')}</SectionHeading>
          <div className="mt-4 flex flex-col gap-2.5">
            {FAQS.map((key, i) => {
              const open = openFaq === i;
              const f = { q: t(`getQuotes.faq.${key}.q`), a: t(`getQuotes.faq.${key}.a`) };
              return (
                <div key={key} className="overflow-hidden rounded-[18px] border border-[#e7ecea] bg-white">
                  <h3 className="m-0">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      className="flex min-h-[56px] w-full items-center gap-3.5 px-[18px] py-4 text-left text-[15.5px] font-extrabold leading-[1.4] tracking-[-.01em] text-ink"
                    >
                      <span className="flex-1">{f.q}</span>
                      <span className="grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-full bg-[#f2f6f4]">
                        <ChevronDown className={`h-3.5 w-3.5 text-ink-soft transition-transform duration-200 ${open ? 'rotate-180' : ''}`} strokeWidth={2.8} />
                      </span>
                    </button>
                  </h3>
                  {open ? (
                    <div className="px-[18px] pb-[17px]">
                      <p className="m-0 max-w-[70ch] text-[14.5px] leading-[1.65] text-muted">{f.a}</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-[14.5px] leading-[1.6] text-muted">
            <Trans
              k="getQuotes.faq.contact"
              components={{
                email: <a href="mailto:hello@carwithdriver.lk" className="font-bold text-brand-dark hover:underline" />,
                phone: <a href="tel:+94763021483" className="font-bold text-brand-dark hover:underline" />,
              }}
            />
          </p>
        </section>

        {/* Closing CTA */}
        <section className="rounded-[26px] bg-gradient-to-br from-brand-dark to-brand p-[clamp(22px,3.4vw,38px)] text-white">
          <h2 className="text-[clamp(21px,2.6vw,29px)] font-extrabold leading-[1.15] tracking-[-.025em]">
            {t('getQuotes.cta.title')}
          </h2>
          <p className="mt-3 max-w-[56ch] text-[16px] leading-[1.6] text-white/85">
            {t('getQuotes.cta.body')}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex min-h-[50px] items-center rounded-[13px] bg-white px-[22px] text-[15px] font-extrabold text-brand-dark"
            >
              {t('getQuotes.cta.request')}
            </button>
            <Link
              to="/trip-cost-calculator"
              className="inline-flex min-h-[50px] items-center rounded-[13px] border-[1.5px] border-white/55 px-[22px] text-[15px] font-extrabold text-white"
            >
              {t('getQuotes.cta.estimate')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

const Stat = ({ value, label }) => (
  <div>
    <div className="text-[clamp(20px,2.2vw,26px)] font-extrabold tracking-[-.02em] text-ink">{value}</div>
    <div className="mt-0.5 text-[11.5px] font-bold leading-tight text-muted-soft sm:text-[12.5px]">{label}</div>
  </div>
);

const SectionHeading = ({ children }) => (
  <h2 className="text-[clamp(22px,2.8vw,31px)] font-extrabold leading-[1.15] tracking-[-.025em] text-ink">{children}</h2>
);

const SectionLead = ({ children }) => (
  <p className="mt-2.5 max-w-[68ch] text-[16px] leading-[1.65] text-muted">{children}</p>
);

export default GetQuotes;

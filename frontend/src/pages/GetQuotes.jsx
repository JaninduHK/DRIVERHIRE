import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoaderData } from 'react-router';
import toast from 'react-hot-toast';
import { Check, ChevronDown, Loader2, Star, X } from 'lucide-react';
import { getStoredToken, getStoredUser, redirectToSsoLogin } from '../services/authToken.js';
import { createBrief } from '../services/briefApi.js';
import { calculateClassEstimates, calculateInclusionRates, priceFormatter } from '../lib/tripCostEstimator.js';
import { LICENSE_BADGE_STYLES } from '../constants/driverLicense.js';
import { LicenseIconBadge, LicenseTypeChip } from '../components/LicenseBadge.jsx';

// Stashed here right before handing off to Asgardeo; AuthCallback.jsx reads
// and submits it once sign-in completes, so the traveller never re-enters
// what they already typed here.
const AUTO_SUBMIT_BRIEF_KEY = 'carwithdriver:auto-submit-brief';
const REQUESTS_PATH = '/dashboard?tab=requests';
const MESSAGE_MAX_LENGTH = 2000; // matches TourBrief.message's maxlength in backend/models/TourBrief.js

// Typical driving distance per touring day, from the same figures the trip cost
// calculator quotes (see getRouteInsight in lib/tripCostEstimator.js).
const KM_PER_DAY = { low: 120, high: 150 };

const DRIVER_TYPES_ARTICLE = '/blog/tourist-driver-vs-chauffeur-guide-vs-national-guide';

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
});

const inputCls =
  'w-full rounded-xl border-[1.5px] border-[#e5ebe8] bg-[#fbfcfc] px-3.5 py-3 text-[14.5px] font-semibold text-ink outline-none transition focus:border-brand';
const labelCls = 'mb-1.5 block text-xs font-bold text-muted';

const STEPS = [
  {
    n: '1',
    title: 'Describe your trip once',
    body: 'Dates, pick-up, how many of you and a rough route. If something is still undecided, say so — drivers will suggest alternatives rather than guess.',
    meta: 'Takes about a minute',
  },
  {
    n: '2',
    title: 'Drivers send you quotes',
    body: 'Your request goes to approved drivers across the island. Each offer shows the vehicle, the driver, their rating and a fixed daily rate for your itinerary.',
    meta: 'Your contact details stay private',
  },
  {
    n: '3',
    title: 'Chat, compare and book',
    body: 'Ask questions in chat, adjust the plan, then accept the offer that fits. No card is needed — you pay your driver directly when you meet on day one.',
    meta: 'No booking fee at any point',
  },
];

const DRIVER_TYPES = [
  {
    name: 'Tourist Driver',
    body: 'Holds a standard licence and drives your itinerary, handles logistics and knows where to stop, eat and stay.',
    bestFor: 'Beach trips, transfers and travellers who like to read up themselves',
  },
  {
    name: 'Chauffeur Guide Lecturer',
    body: 'Licensed by the Sri Lanka Tourism Development Authority, so they drive and also explain the sites you visit.',
    bestFor: 'Most two-week itineraries — one person for the whole trip',
  },
  {
    name: 'National Guide Lecturer',
    body: 'The highest SLTDA guiding qualification, delivering full historical and cultural interpretation.',
    bestFor: 'History-led trips and special-interest groups',
  },
];

const REASONS = [
  {
    title: 'You pay the driver, not a middleman',
    body: 'Drivers list themselves, set their own price and keep the full fare. There is no agency margin on top, which is why offers here land below tour-operator pricing for the same route.',
  },
  {
    title: 'The price is locked once you accept',
    body: 'Accepting an offer fixes that total for the itinerary you agreed. The rate cannot be raised afterwards, and the dates are locked to the offer.',
  },
  {
    title: 'Your details stay private',
    body: 'Drivers see your itinerary, not your phone number or email. Contact details are exchanged only once you accept an offer and the booking is confirmed.',
  },
  {
    title: 'Licences are checked by our team',
    body: 'Drivers submit their driving licence for admin review before their profile is approved, and the licence type they hold is shown on their profile.',
  },
  {
    title: 'Reviews come from real trips',
    body: 'Travellers can only review a booking they actually made through the platform, once the trip has ended.',
  },
  {
    title: 'Support based in Sri Lanka',
    body: 'If plans change mid-trip or a vehicle has trouble, our team is in the same time zone you are travelling in and can reach your driver directly.',
  },
];

const FAQS = [
  {
    q: 'How much does it cost to hire a car with driver in Sri Lanka?',
    a: 'It depends on the vehicle and the length of your trip — drivers set their own rates. The table above is built from the live listings on this site right now, so it reflects what drivers are actually charging rather than a published price list. For a figure based on your own route and dates, use the trip cost calculator.',
  },
  {
    q: 'Is there a booking fee?',
    a: 'No. Requesting quotes, comparing offers and chatting with drivers is completely free, and we add no booking fee or service charge on top of the driver’s price. The rate you accept is the rate you pay.',
  },
  {
    q: 'How and when do I pay?',
    a: 'You pay your driver directly when you meet on the first day of the trip — no card details are taken on this site and no deposit is charged through the platform. Agree anything unusual with your driver in chat first so it stays on record.',
  },
  {
    q: 'What’s the difference between a tourist driver and a chauffeur guide?',
    a: 'A tourist driver holds a standard licence and drives your itinerary. A chauffeur guide lecturer is licensed by the Sri Lanka Tourism Development Authority and may also explain the sites you visit. A national guide lecturer holds the highest SLTDA qualification and delivers full historical interpretation.',
  },
  {
    q: 'Are fuel and kilometres included?',
    a: 'Nearly every listing includes fuel and insurance, and daily rates cover unlimited island-wide kilometres. Driver-guided trips typically cover 120–150 km on a touring day. Each offer spells out exactly what it includes, so check it before you accept.',
  },
  {
    q: 'Are the driver’s meals and accommodation included?',
    a: 'Many listings include them, but not all — it varies by driver, so it is shown on each listing and in the offer you receive. You are never asked to book a hotel room for your driver yourself; where it is included, that cost already sits inside the daily rate.',
  },
  {
    q: 'How long until I receive quotes?',
    a: 'Your request goes out to approved drivers as soon as you submit it, and you will get an email and a push notification for each new offer. Requests sent overnight in Sri Lanka time are usually answered the following morning.',
  },
  {
    q: 'Can I change my itinerary after booking?',
    a: 'Yes. Small changes on the road — swapping a beach, adding a temple, shifting a departure time — are normally fine. If a change adds driving days or a lot of distance, agree the adjusted rate with your driver in chat before you travel so it stays on record.',
  },
  {
    q: 'What if something goes wrong during my trip?',
    a: 'Email hello@carwithdriver.lk or call +94 76 3021 483. Every message and offer is stored, so there is always a record of what was agreed with your driver.',
  },
];

const GetQuotes = () => {
  const navigate = useNavigate();
  const loaderData = useLoaderData();
  const vehicles = useMemo(() => (Array.isArray(loaderData?.vehicles) ? loaderData.vehicles : []), [loaderData]);
  const recommendedDrivers = useMemo(
    () => (Array.isArray(loaderData?.recommendedDrivers) ? loaderData.recommendedDrivers : []),
    [loaderData]
  );

  const [form, setForm] = useState(buildForm());
  const [submitting, setSubmitting] = useState(false);
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
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://carwithdriver.lk' },
          { '@type': 'ListItem', position: 2, name: 'Get quotes', item: 'https://carwithdriver.lk/get-quotes' },
        ],
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
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
        url: 'https://carwithdriver.lk/get-quotes',
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
  }, [fleet]);

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
    };

    if (!payload.startDate || !payload.endDate) {
      toast.error('Select your start and end dates.');
      return;
    }
    if (payload.endDate < payload.startDate) {
      toast.error('End date must be after the start date.');
      return;
    }
    if (payload.startDate < todayDate) {
      toast.error('Start date cannot be in the past.');
      return;
    }
    if (!payload.startLocation || !payload.endLocation || !payload.message || !payload.country) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (payload.message.length > MESSAGE_MAX_LENGTH) {
      toast.error(`Itinerary details must be ${MESSAGE_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (payload.adults < 1) {
      toast.error('Please specify at least one adult traveller.');
      return;
    }

    const token = getStoredToken();
    const user = getStoredUser();

    // Already signed in as a traveller — submit right away, no detour through Asgardeo.
    if (token && user?.role === 'guest') {
      setSubmitting(true);
      try {
        await createBrief(payload);
        toast.success('Quote request sent to drivers!');
        navigate(REQUESTS_PATH);
      } catch (error) {
        toast.error(error?.message || 'Unable to submit your request. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Not signed in — stash the request and hand off to Asgardeo. AuthCallback.jsx
    // submits it automatically once sign-in/sign-up completes.
    try {
      sessionStorage.setItem(AUTO_SUBMIT_BRIEF_KEY, JSON.stringify(payload));
    } catch {
      /* ignore storage errors */
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
              <nav aria-label="Breadcrumb" className="mb-3.5 flex flex-wrap items-center gap-[7px] text-[13px] font-semibold text-muted-soft">
                <Link to="/" className="text-brand-dark hover:underline">Home</Link>
                <span aria-hidden="true">/</span>
                <span className="font-bold text-ink">Get quotes</span>
              </nav>
              <h1 className="text-[clamp(28px,4.2vw,46px)] font-extrabold leading-[1.06] tracking-[-.03em] text-ink">
                Get Free Quotes from Sri Lanka Drivers &amp; Chauffeur Guides
              </h1>
              <p className="mt-4 max-w-[60ch] text-[clamp(15.5px,1.4vw,17.5px)] leading-[1.65] text-muted lg:mt-5">
                Tell us your dates and where you want to go. We send your request to approved drivers and SLTDA
                chauffeur guides across the island — they quote you directly, you compare, chat and book. No booking
                fee, and you pay your driver, not us.
              </p>

              <ul className="mt-5 flex flex-col gap-[11px] lg:mt-7 lg:gap-[15px]">
                {[
                  'Offers from tourist drivers, chauffeur guides and national guide lecturers',
                  'Daily rates cover unlimited island-wide kilometres',
                  'Chat with drivers before you commit — your contact details stay private',
                  'Accept an offer and that price is locked for the itinerary you agreed',
                ].map((text) => (
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
                <Stat value="30 min" label="First quote, typically" />
                <Stat value="10+" label="Offers per request" />
                <Stat value="FREE" label="No booking fee" />
              </div>
            </div>

            {/* Quote form */}
            <div ref={formRef} id="quote-form" className="min-w-0 scroll-mt-24">
              <form
                onSubmit={handleNext}
                className="rounded-[24px] border border-[#e7ecea] bg-white p-[clamp(16px,2.4vw,24px)] shadow-[0_18px_44px_rgba(15,36,48,.07)]"
              >
                <h2 className="text-[18px] font-extrabold tracking-[-.01em] text-ink">Request your quotations</h2>
                <p className="mt-1.5 text-[13.5px] leading-[1.55] text-muted">
                  Takes about a minute. You&apos;ll sign in or create a free account on the next step — no need to fill
                  anything in twice.
                </p>

                <div className="mt-4 grid gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className={labelCls}>Start date</span>
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
                      <span className={labelCls}>End date</span>
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
                      <span className={labelCls}>Pick-up location</span>
                      <input
                        type="text"
                        required
                        value={form.startLocation}
                        onChange={setField('startLocation')}
                        placeholder="City, hotel or airport"
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Drop-off location</span>
                      <input
                        type="text"
                        required
                        value={form.endLocation}
                        onChange={setField('endLocation')}
                        placeholder="City, hotel or airport"
                        className={inputCls}
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className={labelCls}>Adults</span>
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
                      <span className={labelCls}>Children</span>
                      <input
                        type="number"
                        min="0"
                        value={form.children}
                        onChange={setField('children')}
                        className={inputCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Country of residence</span>
                      <input
                        type="text"
                        required
                        value={form.country}
                        onChange={setField('country')}
                        placeholder="e.g. Germany"
                        className={inputCls}
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className={labelCls}>Itinerary details</span>
                    <textarea
                      rows="4"
                      required
                      maxLength={MESSAGE_MAX_LENGTH}
                      value={form.message}
                      onChange={setField('message')}
                      placeholder="Places you want to see, flight times, kids or extra luggage. Anything that helps drivers quote accurately."
                      className={`${inputCls} resize-y leading-[1.5]`}
                    />
                    <span className="mt-1.5 flex items-start justify-between gap-2 text-[11.5px] leading-[1.5] text-muted-soft">
                      <span>
                        Please don&apos;t include phone numbers or emails here — we&apos;ll share contact details once you accept an offer and your booking is confirmed.
                      </span>
                      <span className={`flex-shrink-0 whitespace-nowrap ${form.message.length > MESSAGE_MAX_LENGTH ? 'text-red-600' : ''}`}>
                        {form.message.length}/{MESSAGE_MAX_LENGTH}
                      </span>
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="mt-1 flex min-h-[52px] items-center justify-center gap-2 rounded-[13px] bg-brand px-6 text-[15.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(16,163,90,.75)] transition hover:bg-[#0e9351] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                      </>
                    ) : (
                      'Next'
                    )}
                  </button>
                  <p className="text-center text-xs leading-[1.5] text-muted-soft">
                    Free to request · No booking fee · Pay the driver directly
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
          <SectionHeading>How it works in three steps</SectionHeading>
          <SectionLead>
            There is no search-and-guess step. You describe the trip once, and drivers who are free on your dates come
            to you with a price. Nothing is charged at any point — when you accept an offer you pay that driver
            directly, on the first day of the trip.
          </SectionLead>
          <div className="mt-[22px] grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-[20px] border border-[#e7ecea] bg-white p-5">
                <span className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-brand-tint text-[15px] font-extrabold text-brand-dark">
                  {s.n}
                </span>
                <h3 className="mt-3 text-[17px] font-extrabold tracking-[-.015em] text-ink">{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-muted">{s.body}</p>
                <div className="mt-3 text-[12.5px] font-extrabold text-brand-dark">{s.meta}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Driver types */}
        <section id="driver-types" className="scroll-mt-24">
          <SectionHeading>Which driver type do you need?</SectionHeading>
          <SectionLead>
            Sri Lanka has three distinct roles, and booking sites use the words loosely. The difference is licensing:
            the Sri Lanka Tourism Development Authority trains and certifies chauffeur guides and national guide
            lecturers, while a tourist driver holds a standard driving licence. Drivers on this site submit their
            licence for review, and the type they hold is shown on their profile.
          </SectionLead>
          <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {DRIVER_TYPES.map((t) => {
              const badge = LICENSE_BADGE_STYLES[t.name];
              const Icon = badge?.icon;
              return (
                <div key={t.name} className="rounded-[20px] border border-[#e7ecea] bg-white p-5">
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-extrabold ${badge?.badgeClass || 'bg-slate-100 text-slate-700'}`}>
                    {Icon ? <Icon className={`h-3.5 w-3.5 ${badge.iconClass}`} /> : null}
                    {t.name}
                  </span>
                  <p className="mt-3 text-[14.5px] leading-[1.6] text-muted">{t.body}</p>
                  <p className="mt-3 text-[13px] font-bold leading-[1.5] text-ink-soft">Best for: {t.bestFor}</p>
                </div>
              );
            })}
          </div>
          <Link
            to={DRIVER_TYPES_ARTICLE}
            className="mt-4 inline-flex min-h-[48px] items-center gap-2 text-[14.5px] font-extrabold text-brand-dark hover:underline"
          >
            Read the full comparison, including what each one costs →
          </Link>
        </section>

        {/* Rates */}
        <section id="rates" className="scroll-mt-24">
          <SectionHeading>What a car with driver costs in Sri Lanka</SectionHeading>
          <SectionLead>
            This is not a published price list — drivers set their own rates. The table below is built from the
            vehicles listed on carwithdriver.lk right now, grouped by size, showing the typical middle of the range
            for each class.
          </SectionLead>

          {classBands.length > 0 ? (
            <>
              {fleet ? (
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-[#c9ead8] bg-brand-tint px-4 py-3.5">
                  <span className="text-[13px] font-extrabold text-brand-dark">
                    FROM {fleet.count} LIVE LISTINGS
                  </span>
                  <span className="text-[13px] font-semibold text-ink-soft">
                    Updated automatically as drivers change their prices
                  </span>
                </div>
              ) : null}

              <div className="mt-3.5 overflow-x-auto rounded-[20px] border border-[#e7ecea] bg-white">
                <table className="w-full min-w-[620px] border-collapse">
                  <caption className="border-b border-[#eef2f0] px-[18px] py-[15px] text-left text-[13px] font-bold text-muted-soft">
                    Typical daily rate in USD, per vehicle, from current listings
                  </caption>
                  <thead>
                    <tr className="bg-[#f7faf8]">
                      <th scope="col" className="px-[18px] py-3 text-left text-[12.5px] font-extrabold text-ink-soft">Vehicle class</th>
                      <th scope="col" className="px-[18px] py-3 text-left text-[12.5px] font-extrabold text-ink-soft">Seats</th>
                      <th scope="col" className="whitespace-nowrap px-[18px] py-3 text-right text-[12.5px] font-extrabold text-ink-soft">Typical per day</th>
                      <th scope="col" className="whitespace-nowrap px-[18px] py-3 text-right text-[12.5px] font-extrabold text-ink-soft">Listings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classBands.map((b) => (
                      <tr key={b.id} className="border-t border-[#eef2f0]">
                        <th scope="row" className="px-[18px] py-3.5 text-left text-[14px] font-bold text-ink">
                          {b.label}
                          {b.example ? <span className="block text-[12.5px] font-semibold text-muted-soft">e.g. {b.example}</span> : null}
                        </th>
                        <td className="px-[18px] py-3.5 text-[14px] font-semibold text-muted">{b.seatLabel}</td>
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
                Rates cover unlimited island-wide kilometres; driver-guided trips typically cover {KM_PER_DAY.low}–{KM_PER_DAY.high} km
                on a touring day. Longer days and December–January peak dates sit at the upper end of each range.{' '}
                <Link to="/trip-cost-calculator" className="font-bold text-brand-dark hover:underline">
                  Estimate your own trip →
                </Link>
              </p>
            </>
          ) : (
            <p className="mt-4 text-[15px] text-muted">
              Live rates are loading.{' '}
              <Link to="/vehicles" className="font-bold text-brand-dark hover:underline">Browse the fleet →</Link>
            </p>
          )}
        </section>

        {/* What's included */}
        {inclusions.length > 0 ? (
          <section id="included" className="scroll-mt-24">
            <SectionHeading>What your quotation includes</SectionHeading>
            <SectionLead>
              Listings on this site declare what their rate covers, so the offers you compare are genuinely
              comparable. Some things are near-universal; others depend on the driver, so check them in the offer
              before you accept.
            </SectionLead>
            <div className="mt-5 grid gap-3.5 md:grid-cols-2">
              <div className="rounded-[20px] border-[1.5px] border-[#c9ead8] bg-white p-5">
                <div className="text-[12px] font-extrabold tracking-[.07em] text-brand-dark">INCLUDED IN NEARLY EVERY QUOTE</div>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {alwaysIncluded.map((i) => (
                    <li key={i.key} className="flex gap-2.5 text-[14.5px] font-semibold leading-[1.5] text-ink-soft">
                      <Check className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-brand-dark" strokeWidth={3} />
                      {i.label}
                    </li>
                  ))}
                  <li className="flex gap-2.5 text-[14.5px] font-semibold leading-[1.5] text-ink-soft">
                    <Check className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-brand-dark" strokeWidth={3} />
                    Unlimited island-wide kilometres
                  </li>
                </ul>
              </div>
              <div className="rounded-[20px] border-[1.5px] border-[#e7ecea] bg-white p-5">
                <div className="text-[12px] font-extrabold tracking-[.07em] text-muted-soft">VARIES BY LISTING — CHECK THE OFFER</div>
                <ul className="mt-3.5 flex flex-col gap-2.5">
                  {variesByListing.map((i) => (
                    <li key={i.key} className="flex gap-2.5 text-[14.5px] font-semibold leading-[1.5] text-ink-soft">
                      <X className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-muted-soft" strokeWidth={3} />
                      {i.label}
                    </li>
                  ))}
                  {['Site entry tickets — Sigiriya, Dambulla, the Temple of the Tooth', 'Safari jeeps at Yala, Udawalawe and Minneriya', 'Your own accommodation, meals and drinks', 'Tips for your driver — customary but never expected'].map((text) => (
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
            <SectionHeading>Recommended drivers</SectionHeading>
            <SectionLead>
              A few of the most experienced drivers on the platform. You do not have to pick one to request quotes —
              your request goes out island-wide either way — but it is worth seeing the kind of driver who will be
              answering you.
            </SectionLead>
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
                        <span className="font-semibold text-muted-soft">· {d.reviewCount} reviews</span>
                      </>
                    ) : null}
                    {d.experienceYears > 0 ? (
                      <span className="font-semibold text-muted-soft">
                        {d.reviewCount > 0 ? '· ' : ''}
                        {d.experienceYears} yrs driving
                      </span>
                    ) : null}
                  </div>

                  {d.description ? (
                    <p className="mt-[11px] flex-1 text-[14px] leading-[1.6] text-muted line-clamp-3">{d.description}</p>
                  ) : null}

                  <div className="mt-4 flex items-center justify-between gap-2.5 border-t border-[#f0f3f2] pt-3.5">
                    <div>
                      <div className="text-[11px] font-bold tracking-[.04em] text-muted-soft">
                        {d.vehicleCount > 1 ? `${d.vehicleCount} VEHICLES · FROM` : 'FROM'}
                      </div>
                      <div className="text-[17px] font-extrabold text-ink">
                        {d.fromPrice ? priceFormatter(d.fromPrice) : 'Quote'}
                        <span className="text-[12.5px] font-semibold text-muted-soft">/day</span>
                      </div>
                    </div>
                    <Link
                      to={`/drivers/${d.id}`}
                      className="inline-flex min-h-[44px] items-center rounded-[11px] bg-brand-tint px-4 text-[13.5px] font-bold text-brand-dark"
                    >
                      View driver
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <Link
              to="/drivers"
              className="mt-4 inline-flex min-h-[48px] items-center gap-2 text-[14.5px] font-extrabold text-brand-dark hover:underline"
            >
              Browse all drivers →
            </Link>
          </section>
        ) : null}

        {/* Why us */}
        <section id="why-us" className="scroll-mt-24">
          <SectionHeading>Why request through carwithdriver.lk</SectionHeading>
          <SectionLead>
            We are a Sri Lankan marketplace, not an overseas reseller. Drivers list themselves, set their own prices
            and keep the full fare — there is no tour operator taking a cut, and the person who answers your message
            is the person who will meet you at arrivals.
          </SectionLead>
          <div className="mt-5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((r) => (
              <div key={r.title} className="rounded-[20px] border border-[#e7ecea] bg-white p-[18px]">
                <h3 className="text-[16px] font-extrabold tracking-[-.015em] text-ink">{r.title}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-muted">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24">
          <SectionHeading>Frequently asked questions</SectionHeading>
          <div className="mt-4 flex flex-col gap-2.5">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={f.q} className="overflow-hidden rounded-[18px] border border-[#e7ecea] bg-white">
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
            Still unsure about something? Email{' '}
            <a href="mailto:hello@carwithdriver.lk" className="font-bold text-brand-dark hover:underline">hello@carwithdriver.lk</a>{' '}
            or call <a href="tel:+94763021483" className="font-bold text-brand-dark hover:underline">+94 76 3021 483</a>.
          </p>
        </section>

        {/* Closing CTA */}
        <section className="rounded-[26px] bg-gradient-to-br from-brand-dark to-brand p-[clamp(22px,3.4vw,38px)] text-white">
          <h2 className="text-[clamp(21px,2.6vw,29px)] font-extrabold leading-[1.15] tracking-[-.025em]">
            Ready to hear what your trip actually costs?
          </h2>
          <p className="mt-3 max-w-[56ch] text-[16px] leading-[1.6] text-white/85">
            Send one request and let drivers come to you. Free, no obligation, and your contact details stay private
            until you accept an offer.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="inline-flex min-h-[50px] items-center rounded-[13px] bg-white px-[22px] text-[15px] font-extrabold text-brand-dark"
            >
              Request free quotes
            </button>
            <Link
              to="/trip-cost-calculator"
              className="inline-flex min-h-[50px] items-center rounded-[13px] border-[1.5px] border-white/55 px-[22px] text-[15px] font-extrabold text-white"
            >
              Estimate it yourself
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

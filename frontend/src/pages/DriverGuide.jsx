import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Info,
  MessageSquare,
  Send,
  Smartphone,
} from 'lucide-react';

const COMMISSION_RATE = 8; // matches DriverCommission's default commissionRate (0.08)
const DISCOUNTED_RATE = 5; // matches CommissionDiscount.MAX_DISCOUNT_RATE (0.08 max discount)
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=lk.carwithdriver.driver&pcampaignid=web_share';

const DOCUMENTS = [
  'Your driving licence',
  'Chauffeur guide / tourist driver licence, if you hold one',
  'Vehicle registration book (for each vehicle)',
  'Valid insurance certificate',
  'Revenue licence',
];

const PROFILE_ITEMS = [
  { title: 'A clear photo of yourself.', body: 'Travellers want to see who will be driving them. A friendly, well-lit photo works best.' },
  { title: 'Your description.', body: 'Write about your experience, the areas you know well, the kind of trips you enjoy, and what travellers can expect from you. A few honest paragraphs beat one line.' },
  { title: 'Languages you speak.', body: 'Be realistic about your level.' },
  { title: 'Years of driving experience', body: 'and any tourism training or licences.' },
  { title: 'The regions you cover.', body: '' },
];

const VEHICLE_ITEMS = [
  'Make, model and year',
  'Number of passenger seats and luggage capacity',
  'Air conditioning',
  'Real photographs — outside, inside and luggage space',
];

const QUOTE_TIPS = [
  { title: 'Check the details first', body: 'Dates, total number of days, driver days, pick-up and drop-off points, number of passengers. If something looks wrong or unclear, correct it in your quote or ask the traveller before quoting.' },
  { title: 'Write to the traveller, not to everyone', body: 'Mention the specific places in their itinerary. Suggest a change if you think the plan is too rushed — travellers appreciate honest local advice, and it is often what wins the booking.' },
  { title: 'Be clear about what is included', body: 'Fuel, tolls, parking, your accommodation and meals, and the kilometre allowance. Say what happens if extra kilometres are needed. Being vague here causes arguments later.' },
  { title: 'Reply quickly', body: 'Travellers usually receive several quotes. The first good reply is often the one they talk to.' },
  { title: 'If you use AI to help you write, read it through properly', body: 'You are responsible for what your quote says, and generic or inaccurate quotes get removed.' },
];

const CONFIRMED_STEPS = [
  'Contact details are exchanged, and you can now message or call each other directly.',
  'Confirm the pick-up point and time in writing.',
  'Stay in touch. A short message a few days before arrival reassures travellers enormously, especially if it is their first visit to Sri Lanka.',
];

const CANCELLATION_ROWS = [
  { when: 'More than 2 days before the start date', get: 'Nothing', tone: 'text-slate-500' },
  { when: 'Within 2 days of the start date', get: '50% of the total cost', tone: 'text-slate-900' },
  { when: 'After the tour has started', get: '100% of completed days + 50% of remaining days', tone: 'text-emerald-700' },
];

const APP_FEATURES = [
  'Quote requests, wherever you are',
  'Messages with instant notifications',
  'Your bookings and trip briefs',
  'Add and edit vehicles',
];

const CHECKLIST = [
  'Real photo of yourself and your own vehicle',
  'A full, personal profile description',
  'Reply to quote requests fast',
  'Quote the actual itinerary, not a template',
  'Say clearly what is and is not included',
  'Keep all contact on the site until the booking is confirmed',
  'Ask every happy traveller for a review',
];

const PAGE_SECTIONS = [
  { id: 'register', label: 'Getting started' },
  { id: 'work', label: 'How work reaches you' },
  { id: 'quotes', label: 'Sending a good quote' },
  { id: 'discuss', label: 'Discuss and clarify' },
  { id: 'confirmed', label: 'Booking confirmed' },
  { id: 'commission', label: 'Commission & cancellations' },
  { id: 'reviews', label: 'After the tour' },
  { id: 'app', label: 'Mobile app' },
  { id: 'checklist', label: 'Quick checklist' },
];

const SectionKicker = ({ children }) => (
  <div className="flex items-center gap-3">
    <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-emerald-600">{children}</span>
    <span className="h-px flex-1 bg-slate-200" />
  </div>
);

const StepCard = ({ n, title, children }) => (
  <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-extrabold text-emerald-300">{n}</span>
      <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h3>
    </div>
    <div className="mt-3.5 space-y-3.5">{children}</div>
  </article>
);

const ChecklistChip = ({ children }) => (
  <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5">
    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
    <span className="text-sm font-semibold leading-snug text-slate-700">{children}</span>
  </div>
);

const Callout = ({ tone, icon: Icon, children }) => {
  const toneClasses = {
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
  }[tone];
  return (
    <div className={`flex gap-3 rounded-2xl border p-4 sm:p-5 ${toneClasses}`}>
      <Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <p className="text-sm leading-relaxed sm:text-[14.5px]">{children}</p>
    </div>
  );
};

const DriverGuide = () => (
  <main className="bg-white">
    <div className="mx-auto max-w-6xl space-y-14 px-4 py-10 sm:space-y-16 sm:px-6 sm:py-14 lg:px-8">

      {/* Hero */}
      <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 sm:p-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-extrabold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          For drivers &amp; chauffeur guides
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
          Everything you need to get work through carwithdriver.lk
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          From creating your account to finishing your first tour — and the habits that win you the next one.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            to="/register/driver"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-[15px] font-bold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Register free
          </Link>
          <a
            href="#checklist"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border-[1.5px] border-slate-200 bg-white px-6 text-[15px] font-bold text-slate-900 transition hover:border-slate-300"
          >
            Jump to the checklist
          </a>
        </div>
      </section>

      {/* Mobile on-this-page strip */}
      <nav
        aria-label="On this page"
        className="sticky top-16 z-30 -mx-4 border-y border-slate-100 bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
      >
        <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PAGE_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex-shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[13px] font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              {s.label}
            </a>
          ))}
        </div>
      </nav>

      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-12">
        <div className="min-w-0 flex-1 space-y-14 sm:space-y-16">

          {/* Getting started */}
          <section id="register" className="scroll-mt-[136px] lg:scroll-mt-28">
            <SectionKicker>Getting started</SectionKicker>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Four steps to a live profile</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Registration is free. Every account is checked by hand before it goes live, so travellers know each driver on the site is real and licensed.
            </p>

            <div className="mt-6 space-y-4">
              <StepCard n={1} title="Register">
                <p className="text-[15px] leading-relaxed text-slate-600">Create your driver account with your name, email and phone number. Registration is free.</p>
              </StepCard>

              <StepCard n={2} title="Wait for admin approval">
                <p className="text-[15px] leading-relaxed text-slate-600">Our team checks every new account by hand before it goes live. We do this so travellers know that every driver on the site is real and licensed.</p>
                <div>
                  <p className="text-[13px] font-extrabold uppercase tracking-wide text-slate-900">Have these ready — we may ask for them</p>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {DOCUMENTS.map((d) => (
                      <ChecklistChip key={d}>{d}</ChecklistChip>
                    ))}
                  </div>
                </div>
                <p className="text-[15px] leading-relaxed text-slate-600">You will receive an email as soon as your account is approved. If we need anything else, we will tell you exactly what is missing.</p>
              </StepCard>

              <StepCard n={3} title="Complete your profile">
                <p className="text-[15px] leading-relaxed text-slate-600">Your profile is what travellers read before they decide to book you. A complete profile gets far more enquiries than an empty one.</p>
                <div className="space-y-2.5">
                  {PROFILE_ITEMS.map((p) => (
                    <div key={p.title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3.5">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-500" />
                      <p className="text-[14.5px] leading-relaxed text-slate-600"><b className="text-slate-900">{p.title}</b> {p.body}</p>
                    </div>
                  ))}
                </div>
                <Callout tone="rose" icon={AlertTriangle}>
                  <b className="text-rose-900">Important:</b> do not put your phone number, WhatsApp, email, Facebook or website in your profile description. Contact details are exchanged automatically once a booking is confirmed. Profiles containing contact details are sent back for editing.
                </Callout>
              </StepCard>

              <StepCard n={4} title="Add your vehicles">
                <p className="text-[15px] leading-relaxed text-slate-600">Add every vehicle you can offer. For each one, include:</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {VEHICLE_ITEMS.map((v) => (
                    <ChecklistChip key={v}>{v}</ChecklistChip>
                  ))}
                </div>
                <p className="text-[15px] leading-relaxed text-slate-600">
                  <b className="text-slate-900">Real photographs of your own vehicle</b> — outside, inside and the luggage space. Do not use photos from the internet. Travellers filter by vehicle type and size, so an accurate listing puts you in front of the right people.
                </p>
              </StepCard>
            </div>
          </section>

          {/* How work reaches you */}
          <section id="work" className="scroll-mt-[136px] lg:scroll-mt-28">
            <SectionKicker>How work reaches you</SectionKicker>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">You are now ready to receive bookings</h2>
            <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
              <article className="rounded-2xl bg-slate-900 p-5 text-white sm:p-6">
                <span className="inline-flex rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-emerald-300">OPTION 1</span>
                <h3 className="mt-3.5 text-lg font-extrabold tracking-tight">Direct bookings</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-white/70">
                  Travellers browsing the site can book you directly from your profile. You will be notified straight away. Nothing is needed from you beforehand — this is why a complete profile and good photos matter so much.
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-emerald-700">OPTION 2</span>
                <h3 className="mt-3.5 text-lg font-extrabold tracking-tight text-slate-900">Quote requests</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-slate-600">
                  Travellers who want a tailored itinerary post a quote request. Go to{' '}
                  <Link to="/briefs" className="font-bold text-emerald-700">Tour Briefs</Link> and you will find trips that match the vehicles and areas you cover.
                </p>
              </article>
            </div>
          </section>

          {/* Sending a good quote */}
          <section id="quotes" className="scroll-mt-[136px] lg:scroll-mt-28">
            <SectionKicker>Winning the job</SectionKicker>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">How to send a good quote</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Open the request, read it carefully, and click <b className="text-slate-900">Send offer</b>.
            </p>
            <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
              {QUOTE_TIPS.map((q) => (
                <article key={q.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="text-[15.5px] font-extrabold tracking-tight text-slate-900">{q.title}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-slate-600">{q.body}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Discuss and clarify */}
          <section id="discuss" className="scroll-mt-[136px] lg:scroll-mt-28">
            <SectionKicker>Before confirmation</SectionKicker>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Discuss and clarify</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              The traveller will reply through the site&rsquo;s message system. Use this stage to agree everything: the route, the daily start times, the hotels, any extra stops, and who is paying for entrance tickets and safari jeeps.
            </p>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              You may discuss prices for third-party items like safaris, entrance tickets and hotels. Keep all conversation on the site until the booking is confirmed — no phone numbers, no WhatsApp, no email.
            </p>
            <div className="mt-5">
              <Callout tone="amber" icon={Info}>
                <b className="text-amber-900">Send a new offer if anything changes.</b> If the traveller adds days, changes the route or switches vehicle, send an updated offer rather than agreeing to a different price in a message. The confirmed offer is the price for the trip, and it cannot be increased afterwards.
              </Callout>
            </div>
          </section>

          {/* Booking confirmed */}
          <section id="confirmed" className="scroll-mt-[136px] lg:scroll-mt-28">
            <div className="rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 text-white sm:p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-extrabold tracking-wide">BOOKING CONFIRMED</span>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Congratulations — now keep it smooth</h2>
              <div className="mt-4 max-w-xl space-y-2.5">
                {CONFIRMED_STEPS.map((c) => (
                  <div key={c} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] flex-shrink-0" />
                    <span className="text-[15px] leading-relaxed text-white/90">{c}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 inline-flex items-center gap-2.5 rounded-2xl bg-white/15 px-4 py-3">
                <MessageSquare className="h-[19px] w-[19px] flex-shrink-0" />
                <b className="text-[15px] font-extrabold">You receive your payment on the first day of the tour.</b>
              </div>
            </div>
          </section>

          {/* Commission and cancellations */}
          <section id="commission" className="scroll-mt-[136px] lg:scroll-mt-28">
            <SectionKicker>Money</SectionKicker>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Commission and cancellations</h2>

            <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Commission</div>
                <div className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900">{COMMISSION_RATE}%</div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">You deposit it at the start of each month for the bookings on your account.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
                <div className="text-xs font-extrabold uppercase tracking-wide text-slate-400">If we discount the traveller</div>
                <div className="mt-2 flex items-center gap-2.5">
                  <span className="text-2xl font-extrabold text-slate-400 line-through">{COMMISSION_RATE}%</span>
                  <span aria-hidden="true" className="text-emerald-600">&rarr;</span>
                  <span className="text-3xl font-extrabold tracking-tight text-emerald-700">{DISCOUNTED_RATE}%</span>
                </div>
                <p className="mt-3 text-[14.5px] leading-relaxed text-slate-600">A promotional discount of 3–5% comes off your commission — a 3% discount means you pay 5% instead of 8%.</p>
              </div>
            </div>

            <h3 className="mt-8 text-lg font-extrabold tracking-tight text-slate-900">Cancellation policy</h3>
            <p className="mt-1.5 text-[14.5px] text-slate-600">This is the same for every driver on the site.</p>
            <div className="mt-3.5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 px-4 py-3 text-[11px] font-extrabold uppercase tracking-wide text-slate-400 sm:px-5">
                <div>Traveller cancels</div>
                <div>You receive</div>
              </div>
              {CANCELLATION_ROWS.map((row, i) => (
                <div
                  key={row.when}
                  className={`grid grid-cols-2 items-center gap-3 px-4 py-4 sm:px-5 ${i < CANCELLATION_ROWS.length - 1 ? 'border-b border-slate-100' : ''}`}
                >
                  <div className="text-[14px] font-semibold leading-snug text-slate-600">{row.when}</div>
                  <div className={`text-[14px] font-extrabold leading-snug ${row.tone}`}>{row.get}</div>
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-[14.5px] text-slate-600">
              Full details are in the <Link to="/driver-terms" className="font-bold text-emerald-700">Driver Terms &amp; Conditions</Link>.
            </p>
          </section>

          {/* After the tour */}
          <section id="reviews" className="scroll-mt-[136px] lg:scroll-mt-28">
            <SectionKicker>After the tour</SectionKicker>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Ask for an honest review</h2>
            <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Reviews are the single biggest factor in winning future bookings, and a driver with several genuine reviews will always be chosen over one with none.
            </p>
            <div className="mt-5">
              <Callout tone="rose" icon={Ban}>
                Never write fake reviews or pay for them. It is the one thing that gets an account permanently banned.
              </Callout>
            </div>
          </section>

          {/* Mobile app */}
          <section id="app" className="scroll-mt-[136px] lg:scroll-mt-28">
            <div className="rounded-3xl bg-slate-900 p-6 sm:p-8">
              <div className="grid gap-6 sm:grid-cols-2 sm:items-center">
                <div>
                  <div className="flex items-center gap-2.5 text-white">
                    <Smartphone className="h-6 w-6 text-emerald-300" />
                    <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Get the mobile app</h2>
                  </div>
                  <p className="mt-3 text-[15px] leading-relaxed text-white/70">
                    Manage your quote requests, messages, bookings and vehicles from your phone — and get a notification the moment a traveller replies.
                  </p>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-5 inline-flex min-h-[48px] items-center gap-2.5 rounded-xl bg-emerald-500 px-5 text-[15px] font-bold text-white transition hover:bg-emerald-600"
                  >
                    <Send className="h-[18px] w-[18px]" />
                    Download on Google Play
                  </a>
                </div>
                <div className="flex flex-col gap-2.5">
                  {APP_FEATURES.map((f) => (
                    <div key={f} className="flex items-center gap-2.5 rounded-xl bg-white/[.07] px-4 py-3">
                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-300" />
                      <span className="text-[14.5px] font-semibold text-white/85">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Quick checklist */}
          <section id="checklist" className="scroll-mt-[136px] lg:scroll-mt-28">
            <SectionKicker>Quick checklist</SectionKicker>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Seven habits that get you more bookings</h2>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {CHECKLIST.map((c) => (
                <ChecklistChip key={c}>{c}</ChecklistChip>
              ))}
            </div>
          </section>

          {/* Help */}
          <section id="help" className="border-t border-slate-100 pt-8 sm:pt-10">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Need help?</h2>
            <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600">
              Email <a href="mailto:hello@carwithdriver.lk" className="font-bold text-emerald-700">hello@carwithdriver.lk</a> and we will get back to you.
            </p>
          </section>

        </div>

        {/* Desktop on-this-page sidebar */}
        <aside className="hidden w-[280px] flex-shrink-0 lg:sticky lg:top-24 lg:block">
          <nav aria-label="On this page" className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-slate-400">On this page</p>
            <div className="mt-3 flex flex-col">
              {PAGE_SECTIONS.map((s, i) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`py-2.5 text-[14px] font-bold text-slate-600 transition hover:text-emerald-700 ${i < PAGE_SECTIONS.length - 1 ? 'border-b border-slate-200' : ''}`}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </nav>
          <div className="mt-4 rounded-2xl border-[1.5px] border-emerald-200 bg-white p-5">
            <p className="text-[15px] font-extrabold text-slate-900">Not registered yet?</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600">Free to join. Approval usually takes 1–2 working days.</p>
            <Link
              to="/register/driver"
              className="mt-3.5 flex min-h-[46px] items-center justify-center rounded-xl bg-emerald-600 text-[14.5px] font-bold text-white transition hover:bg-emerald-700"
            >
              Create driver account
            </Link>
          </div>
        </aside>
      </div>
    </div>
  </main>
);

export default DriverGuide;

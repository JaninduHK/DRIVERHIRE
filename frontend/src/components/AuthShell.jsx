import { useState } from 'react';
import { Link } from 'react-router-dom';

// Shared chrome for the redesigned Sign in / Create account pages (Login and Register.dc.html).
// The green marketing panel is hidden on mobile; the tabs navigate between /login and /register.

const GREEN_PANEL = 'linear-gradient(160deg,#0f7a45 0%,#10a35a 55%,#18b866 100%)';

const PANEL = {
  signin: {
    badge: 'Welcome back',
    title: 'Pick up where your trip planning left off.',
    blurb: 'Sign in to see new quotes, reply to drivers and manage upcoming journeys.',
  },
  register: {
    badge: 'Traveller account',
    title: 'One account for every trip you plan.',
    blurb: 'Create your free account to request quotes, chat with drivers and keep your bookings together.',
  },
};

const PANEL_POINTS = [
  'Compare fixed quotes from vetted drivers, side by side.',
  'Message a driver before you commit to anything.',
  'Keep every trip, quote and receipt in one place.',
  'Free to join, no booking fee, pay the driver directly.',
];

const STATS = [
  { v: '12,000+', l: 'Travellers hosted' },
  { v: '4.9 / 5', l: 'Driver rating' },
  { v: '< 1 hr', l: 'Quote reply time' },
];

const FORM_COPY = {
  signin: { title: 'Sign in to your account', sub: 'Use the email address you signed up with.' },
  register: {
    title: 'Create your free account',
    sub: 'A few details and you are in. Trip preferences can wait until later.',
  },
};

// Shared field styles / helpers used by both pages.
export const authInputCls =
  'w-full min-h-[50px] rounded-[13px] border-[1.5px] border-[#e5ebe8] bg-[#fbfcfc] px-[15px] py-[13px] text-[15px] font-semibold text-ink outline-none transition placeholder:text-[#a3b0bb] focus:border-brand focus:bg-white focus:shadow-[0_0_0_3px_rgba(16,163,90,0.14)]';

export const authSubmitCls =
  'min-h-[52px] w-full rounded-[13px] bg-brand text-[15.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(16,163,90,.75)] transition hover:bg-[#0e9351] disabled:cursor-not-allowed disabled:opacity-70';

export const AuthLabel = ({ children }) => (
  <span className="mb-[7px] block text-[12.5px] font-bold text-ink-soft">{children}</span>
);

export const AuthPasswordInput = ({ label = 'Password', rightSlot, hint, ...inputProps }) => {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-[7px] flex items-center justify-between gap-2.5">
        <span className="text-[12.5px] font-bold text-ink-soft">{label}</span>
        {rightSlot}
      </span>
      <span className="relative block">
        <input {...inputProps} type={show ? 'text' : 'password'} className={`${authInputCls} pr-[82px]`} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-[7px] top-1/2 min-h-[36px] -translate-y-1/2 rounded-[9px] bg-[#eef7f2] px-3 text-[12.5px] font-bold text-brand-dark"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </span>
      {hint ? <span className="mt-2 block text-[12.5px] leading-[1.5] text-muted-soft">{hint}</span> : null}
    </label>
  );
};

const tabCls = (active) =>
  `flex min-h-[44px] items-center justify-center rounded-[11px] text-[14.5px] font-bold transition ${
    active ? 'bg-white text-ink shadow-[0_2px_8px_-3px_rgba(15,31,45,.3)]' : 'bg-transparent text-muted hover:text-ink'
  }`;

const AuthShell = ({ mode, children, social, footerNote }) => {
  const isSignin = mode === 'signin';
  const panel = PANEL[mode];
  const copy = FORM_COPY[mode];

  return (
    <div className="flex min-h-[70vh] w-full items-center justify-center py-2 font-sans">
      <div className="grid w-full max-w-[1000px] overflow-hidden rounded-[clamp(18px,2.4vw,26px)] border border-[#e5ebe8] bg-white shadow-[0_30px_70px_-40px_rgba(15,31,45,.35)] md:grid-cols-2">
        {/* Marketing panel — hidden on mobile */}
        <section
          className="hidden flex-col gap-[22px] p-[clamp(26px,3.4vw,44px)] text-white md:flex"
          style={{ background: GREEN_PANEL }}
        >
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/[.18] px-[13px] py-[7px] text-xs font-bold tracking-[.02em]">
              {panel.badge}
            </span>
            <h1 className="mt-[18px] text-[clamp(25px,2.9vw,34px)] font-extrabold leading-[1.14] tracking-[-.025em]">
              {panel.title}
            </h1>
            <p className="mt-3 max-w-[36ch] text-[15px] leading-[1.6] text-white/85">{panel.blurb}</p>
          </div>
          <ul className="m-0 grid list-none gap-3.5 p-0">
            {PANEL_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-[11px] text-[14.5px] font-semibold leading-[1.5] text-white/[.94]">
                <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 opacity-90">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M6.6 10.2l2.3 2.3 4.5-4.7" />
                </svg>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap gap-x-[22px] gap-y-2.5 border-t border-white/20 pt-2">
            {STATS.map((stat) => (
              <div key={stat.l}>
                <div className="text-[19px] font-extrabold">{stat.v}</div>
                <div className="text-[11.5px] font-semibold uppercase tracking-[.03em] text-white/75">{stat.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Form */}
        <section className="p-[clamp(24px,3.2vw,42px)]">
          <div role="tablist" aria-label="Account access" className="grid grid-cols-2 gap-1 rounded-[14px] bg-[#f2f5f4] p-1">
            <Link to="/login" role="tab" aria-selected={isSignin} className={tabCls(isSignin)}>Sign in</Link>
            <Link to="/register" role="tab" aria-selected={!isSignin} className={tabCls(!isSignin)}>Create account</Link>
          </div>

          <h2 className="mt-6 text-[clamp(21px,2.2vw,25px)] font-extrabold tracking-[-.02em]">{copy.title}</h2>
          <p className="mt-[7px] text-[14px] leading-[1.55] text-muted">{copy.sub}</p>

          {children}

          {social ? (
            <div className="mt-5">
              <div className="flex items-center gap-3 text-xs font-bold text-[#a3b0bb]">
                <span className="h-px flex-1 bg-[#e5ebe8]" />
                or
                <span className="h-px flex-1 bg-[#e5ebe8]" />
              </div>
              <div className="mt-4">{social}</div>
            </div>
          ) : null}

          <p className="mt-5 text-[13.5px] leading-[1.6] text-muted">
            {isSignin ? 'New to Car With Driver? ' : 'Already have an account? '}
            <Link to={isSignin ? '/register' : '/login'} className="font-bold text-brand-dark">
              {isSignin ? 'Create a free account' : 'Sign in instead'}
            </Link>
          </p>

          {footerNote}

          <p className="mt-2.5 text-[12.5px] leading-[1.6] text-muted-soft">
            {isSignin ? 'By signing in you agree to our' : 'By creating an account you agree to our'}{' '}
            <Link to="/terms" className="font-bold text-brand-dark">Terms of Service</Link> and{' '}
            <Link to="/privacy-policy" className="font-bold text-brand-dark">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AuthShell;

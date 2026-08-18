import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SSO_LOGIN_URL } from '../services/authToken.js';

// Chrome for the driver/admin sign-in page. Traveller sign-in/sign-up moved
// to Asgardeo SSO (goes straight to SSO_LOGIN_URL, no local page) — this shell now serves a single
// audience and a single mode, so there's no more tab switcher or "create
// account" variant to carry around.

const GREEN_PANEL = 'linear-gradient(160deg,#0f7a45 0%,#10a35a 55%,#18b866 100%)';

const PANEL_POINTS = [
  'Manage your vehicle listings and availability.',
  'Track bookings, payouts and driver reviews.',
  'Message travellers directly from your portal.',
  'Admins get full oversight of drivers and bookings.',
];

// Shared field styles / helpers, also used by ForgotPassword/ResetPassword.
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

const AuthShell = ({ children, footerNote }) => {
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
              Driver &amp; admin sign in
            </span>
            <h1 className="mt-[18px] text-[clamp(25px,2.9vw,34px)] font-extrabold leading-[1.14] tracking-[-.025em]">
              Sign in to your operator account.
            </h1>
            <p className="mt-3 max-w-[36ch] text-[15px] leading-[1.6] text-white/85">
              Manage your listings, bookings and payouts, or access the admin console.
            </p>
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
        </section>

        {/* Form */}
        <section className="p-[clamp(24px,3.2vw,42px)]">
          <h2 className="text-[clamp(21px,2.2vw,25px)] font-extrabold tracking-[-.02em]">Sign in to your account</h2>
          <p className="mt-[7px] text-[14px] leading-[1.55] text-muted">Use the email address you signed up with.</p>

          {children}

          <p className="mt-5 text-[13.5px] leading-[1.6] text-muted">
            Booking a trip?{' '}
            <a href={SSO_LOGIN_URL} className="font-bold text-brand-dark">
              Continue as a traveller
            </a>
            .
          </p>

          {footerNote}

          <p className="mt-2.5 text-[12.5px] leading-[1.6] text-muted-soft">
            By signing in you agree to our{' '}
            <Link to="/terms" className="font-bold text-brand-dark">Terms of Service</Link> and{' '}
            <Link to="/privacy-policy" className="font-bold text-brand-dark">Privacy Policy</Link>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default AuthShell;

import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { buildApiUrl } from '../constants/api.js';

const ERROR_MESSAGES = {
  account_role_conflict:
    'That email already belongs to a driver or admin account. Sign in at /login instead.',
  email_not_verified: 'Please verify your email with the provider before continuing.',
  missing_email: 'We could not read an email address from your account. Please try again.',
  expired_state: 'That sign-in link expired. Please try again.',
  sso_failed: 'Something went wrong signing you in. Please try again.',
};

// Single entry point for traveller sign-in and sign-up — both are handled by
// Asgardeo's hosted login page (including Google/Facebook, federated there).
// This page just kicks off the redirect; there's no local form here.
const TravellerSignIn = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');
  const shownError = useRef(null);

  useEffect(() => {
    if (error && shownError.current !== error) {
      shownError.current = error;
      toast.error(ERROR_MESSAGES[error] || 'Unable to sign you in. Please try again.');
    }
  }, [error]);

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-tint px-[13px] py-[7px] text-xs font-bold tracking-[.02em] text-brand-dark">
          Traveller account
        </span>
        <h1 className="mt-4 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-.02em] text-ink">
          Sign in or create your account
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-muted">
          Request quotes, message drivers and manage your bookings — all in one place.
        </p>
      </div>

      <a
        href={buildApiUrl('/auth/sso/login')}
        className="inline-flex min-h-[52px] w-full max-w-xs items-center justify-center rounded-[13px] bg-brand px-6 text-[15.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(16,163,90,.75)] transition hover:bg-[#0e9351]"
      >
        Continue
      </a>

      <p className="text-[12.5px] leading-[1.6] text-muted-soft">
        By continuing you agree to our{' '}
        <Link to="/terms" className="font-bold text-brand-dark">Terms of Service</Link> and{' '}
        <Link to="/privacy-policy" className="font-bold text-brand-dark">Privacy Policy</Link>.
      </p>

      <p className="text-[13.5px] leading-[1.6] text-muted-soft">
        Driver or admin?{' '}
        <Link to="/login" className="font-bold text-brand-dark">Sign in here</Link>.
      </p>
    </section>
  );
};

export default TravellerSignIn;

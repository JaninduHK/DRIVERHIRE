import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ssoExchange } from '../services/authApi.js';
import { createBrief } from '../services/briefApi.js';
import { consumeAuthMessage, consumeReturnPath, persistAuthSession, SSO_LOGIN_URL } from '../services/authToken.js';

// Shown when Asgardeo redirects back with ?error=<code> instead of a code to
// exchange — e.g. the traveller cancelled, or the backend rejected the
// callback (see ssoController.js's redirectWithError). Moved here from the
// old /traveller/sign-in landing page, which no longer exists — this route
// is now the single place both success and failure land after Asgardeo.
const ERROR_MESSAGES = {
  account_role_conflict:
    'That email already belongs to a driver or admin account. Sign in at /login instead.',
  email_not_verified: 'Please verify your email with the provider before continuing.',
  missing_email: 'We could not read an email address from your account. Please try again.',
  expired_state: 'That sign-in link expired. Please try again.',
  sso_failed: 'Something went wrong signing you in. Please try again.',
};

// Stashed by GetQuotes.jsx right before the Asgardeo hand-off. Submitted here,
// in parallel with landing on the dashboard, so the traveller's quote request
// goes out without them having to fill the form in twice.
const AUTO_SUBMIT_BRIEF_KEY = 'carwithdriver:auto-submit-brief';

const submitPendingBrief = () => {
  let pending = null;
  try {
    const raw = sessionStorage.getItem(AUTO_SUBMIT_BRIEF_KEY);
    if (raw) {
      pending = JSON.parse(raw);
      sessionStorage.removeItem(AUTO_SUBMIT_BRIEF_KEY);
    }
  } catch {
    pending = null;
  }
  if (!pending) return;

  createBrief(pending)
    .then(() => toast.success('Your quote request has been sent to drivers!'))
    .catch((error) => {
      toast.error(
        error?.message || "Signed in, but we couldn't submit your quote request. Please post it again from My Requests."
      );
    });
};

// Landing point after a successful Asgardeo SSO round-trip. The backend redirects
// here with a one-time exchange code (not the JWT itself, to keep it out of
// the URL/browser history) — trade it in for the real session.
const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('xc') || '';
  const errorCode = searchParams.get('error') || '';

  const [error, setError] = useState('');
  // The exchange code is single-use server-side; React StrictMode's dev-mode
  // double-invocation of effects would otherwise burn it on the first
  // (discarded) run and fail on the second. Guard with a ref, not state, so
  // it isn't reset between the two invocations. Once this fires, it's the
  // only exchange attempt this component instance will ever make — no
  // "cancelled" bail-out on its result, since StrictMode's synthetic
  // cleanup would mark it cancelled without a real unmount ever happening,
  // discarding a legitimately successful response.
  const hasExchanged = useRef(false);

  useEffect(() => {
    if (errorCode) {
      setError(ERROR_MESSAGES[errorCode] || 'Unable to sign you in. Please try again.');
      return;
    }
    if (!code) {
      setError('Missing sign-in code. Please try again.');
      return;
    }
    if (hasExchanged.current) {
      return;
    }
    hasExchanged.current = true;

    const exchange = async () => {
      try {
        const response = await ssoExchange(code);

        persistAuthSession({ token: response.token, user: response.user });

        const firstName = response?.user?.name?.split(' ')?.[0] || 'there';
        toast.success(`Welcome, ${firstName}!`);

        // Set by handleSessionExpired() before it redirected here — e.g. "Your
        // session expired, please sign in again" — surfaced now that they're
        // actually back, since there was no page in between to show it on.
        const pendingMessage = consumeAuthMessage();
        if (pendingMessage) {
          toast(pendingMessage);
        }

        const savedPath = consumeReturnPath();
        navigate(savedPath || '/dashboard', { replace: true });
        submitPendingBrief();
      } catch (err) {
        setError(err?.message || 'Unable to complete sign-in right now.');
      }
    };

    exchange();
  }, [code, errorCode, navigate]);

  if (error) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-[22px] font-extrabold text-ink">Sign-in didn&apos;t complete</h1>
        <p className="text-[14.5px] leading-[1.6] text-muted">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href={SSO_LOGIN_URL}
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-brand px-5 text-[14px] font-bold text-white transition hover:bg-brand-dark"
          >
            Try again
          </a>
          <Link to="/" className="text-[13.5px] font-bold text-muted-soft hover:text-ink">
            Back to homepage
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="h-3 w-3 animate-ping rounded-full bg-brand" />
      <p className="text-[14.5px] font-semibold text-muted">Finishing sign-in…</p>
    </section>
  );
};

export default AuthCallback;

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ssoExchange } from '../services/authApi.js';
import { createBrief } from '../services/briefApi.js';
import { consumeReturnPath, persistAuthSession } from '../services/authToken.js';

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

        const savedPath = consumeReturnPath();
        navigate(savedPath || '/dashboard', { replace: true });
        submitPendingBrief();
      } catch (err) {
        setError(err?.message || 'Unable to complete sign-in right now.');
      }
    };

    exchange();
  }, [code, navigate]);

  if (error) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-[22px] font-extrabold text-ink">Sign-in didn&apos;t complete</h1>
        <p className="text-[14.5px] leading-[1.6] text-muted">{error}</p>
        <Link
          to="/traveller/sign-in"
          className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-brand px-5 text-[14px] font-bold text-white transition hover:bg-brand-dark"
        >
          Try again
        </Link>
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

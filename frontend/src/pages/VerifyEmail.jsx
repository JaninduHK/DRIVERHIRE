import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { verifyEmail as verifyEmailRequest } from '../services/authApi.js';
import { persistAuthSession } from '../services/authToken.js';

const resolveDestination = (user) => {
  if (user?.role === 'admin') {
    return '/admin';
  }
  if (user?.role === 'driver') {
    return user?.driverStatus === 'approved' ? '/portal/driver' : '/';
  }
  return '/dashboard';
};

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [state, setState] = useState({
    loading: true,
    message: '',
    error: '',
    destination: '/dashboard',
  });

  useEffect(() => {
    if (!token) {
      setState({
        loading: false,
        message: '',
        error: 'Verification token is missing. Please use the link from your email.',
        destination: '/login',
      });
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        const response = await verifyEmailRequest(token);
        if (cancelled) {
          return;
        }

        if (response?.token && response?.user) {
          persistAuthSession({ token: response.token, user: response.user });
        }

        const destination = resolveDestination(response?.user);
        setState({
          loading: false,
          message: response?.message || 'Email verified successfully.',
          error: '',
          destination,
        });
        toast.success('Email verified! Redirecting to your dashboard...');
        setTimeout(() => navigate(destination, { replace: true }), 1000);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          loading: false,
          message: '',
          error: error?.message || 'Unable to verify your email right now.',
          destination: '/login',
        });
      }
    };

    verify();

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  const statusLabel = useMemo(() => {
    if (state.loading) {
      return 'Confirming your email...';
    }
    if (state.error) {
      return 'Verification failed';
    }
    return 'Email verified';
  }, [state.loading, state.error]);

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
            {statusLabel}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            {state.loading ? 'Checking your link...' : 'Thanks for confirming your email'}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {state.loading
              ? 'Hang tight while we activate your account.'
              : state.error
              ? state.error
              : state.message || 'Your account is ready.'}
          </p>
        </div>
        <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Secure
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
        {state.loading ? (
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="h-3 w-3 animate-ping rounded-full bg-emerald-500" />
            Verifying your link...
          </div>
        ) : state.error ? (
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              We couldn&apos;t confirm this link. It may have expired or already been used. Request a new
              verification email or sign in to try again.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Go to login
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-700"
              >
                Create account
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">You&apos;re all set.</p>
              <p className="text-slate-600">
                We&apos;ll take you straight to your dashboard so you can continue planning trips.
              </p>
            </div>
            <Link
              to={state.destination}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              Continue
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default VerifyEmail;

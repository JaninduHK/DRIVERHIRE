import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { requestPasswordReset } from '../services/authApi.js';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error('Enter the email you registered with.');
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
      toast.success('If an account exists, a reset link has been sent.');
    } catch (error) {
      toast.error(error?.message || 'Unable to send reset email right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="absolute -top-40 left-24 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr]">
        <div className="relative z-10 p-8 sm:p-10">
          <div className="mx-auto w-full max-w-lg space-y-6">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Account recovery
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Forgot your password?
              </h1>
              <p className="text-sm text-slate-600">
                Enter the email you used to sign up. We&apos;ll send a secure link so you can choose a new password.
              </p>
            </header>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="reset-email">
                  Email address
                </label>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-600/70"
              >
                {loading ? 'Sending link...' : 'Send reset link'}
              </button>

              {sent ? (
                <p className="text-xs text-emerald-700">
                  Check your inbox for the reset email. The link will expire after one hour.
                </p>
              ) : null}
            </form>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Remembered your password?</span>
              <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Return to login
              </Link>
            </div>
          </div>
        </div>

        <aside className="hidden flex-col justify-between bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-white md:flex">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
              Safety first
            </span>
            <h2 className="text-2xl font-bold leading-snug">
              Resetting your password keeps your trips and messages secure.
            </h2>
            <p className="text-sm text-slate-200/80">
              We never share your details. Use a strong password you haven&apos;t used elsewhere and keep your account protected.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <p className="text-sm font-medium text-slate-100/90">
              “Support replied fast when I needed to reset my login. Everything was back to normal within minutes.”
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-emerald-100">
              — Driver community feedback
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ForgotPassword;

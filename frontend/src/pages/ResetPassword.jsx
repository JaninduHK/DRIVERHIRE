import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { resetPassword } from '../services/authApi.js';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [formState, setFormState] = useState({
    password: '',
    confirmPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      toast.error('Reset link is missing or has expired.');
      return;
    }
    if (!formState.password || formState.password.length < 8) {
      toast.error('Use at least 8 characters for your new password.');
      return;
    }
    if (formState.password !== formState.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ token, password: formState.password });
      toast.success('Password updated. You can now sign in.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error?.message || 'Unable to reset password right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const missingToken = !token;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="absolute -bottom-36 right-10 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden flex-col justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 p-10 text-white md:flex">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
              New credentials
            </span>
            <h2 className="text-2xl font-bold leading-snug">
              Choose a strong password to keep your account secure.
            </h2>
            <ul className="space-y-2 text-sm text-emerald-50/90">
              <li>• Use at least 8 characters with a mix of letters and numbers.</li>
              <li>• Avoid passwords you&apos;ve used on other sites.</li>
              <li>• Sign back in right after saving your new password.</li>
            </ul>
          </div>
        </aside>

        <div className="relative z-10 p-8 sm:p-10">
          <div className="mx-auto w-full max-w-lg space-y-6">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Reset password
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Set a new password
              </h1>
              <p className="text-sm text-slate-600">
                Create a fresh password to unlock your account. You&apos;ll be redirected to sign in once it&apos;s saved.
              </p>
            </header>

            {missingToken ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p>We couldn&apos;t find a reset token. Please open the latest link from your email.</p>
                <Link to="/forgot-password" className="mt-2 inline-flex text-xs font-semibold text-amber-900 underline">
                  Request a new reset link
                </Link>
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="new-password">
                  New password
                </label>
                <input
                  id="new-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={formState.password}
                  onChange={handleFieldChange}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Create a strong password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700" htmlFor="confirm-password">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formState.confirmPassword}
                  onChange={handleFieldChange}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || missingToken}
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-600/70"
              >
                {submitting ? 'Updating password...' : 'Update password'}
              </button>
            </form>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Back to</span>
              <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ResetPassword;

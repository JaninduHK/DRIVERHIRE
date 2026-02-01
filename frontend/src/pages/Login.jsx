import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login } from '../services/authApi.js';
import { consumeAuthMessage, consumeReturnPath, persistAuthSession } from '../services/authToken.js';
import GoogleSignInButton from '../components/GoogleSignInButton.jsx';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = consumeAuthMessage();
    if (message) {
      toast.error(message);
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData);
      persistAuthSession({ token: response.token, user: response.user });

      const user = response?.user;
      const firstName = user?.name?.split(' ')?.[0] || 'there';
      toast.success(`Welcome back, ${firstName}!`);

      const savedPath = consumeReturnPath();
      const destinationFromReturn = savedPath && !savedPath.startsWith('/register') ? savedPath : '';

      let destination = destinationFromReturn || '/';

      if (!destinationFromReturn) {
        if (user?.role === 'admin') {
          destination = '/admin';
        } else if (user?.role === 'driver') {
          if (user?.driverStatus === 'approved') {
            destination = '/portal/driver';
          } else {
            toast(
              'Your driver profile is pending approval. We will notify you once you are approved.',
              { icon: '⏳' }
            );
          }
        } else {
          destination = '/dashboard';
        }
      }

      navigate(destination);
    } catch (error) {
      toast.error(error.message || 'Unable to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="absolute -top-40 right-20 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="grid grid-cols-1 md:grid-cols-2">
        <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-emerald-500 to-emerald-600 p-10 text-white md:flex">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-50">
              Secure Access
            </span>
            <h2 className="mt-6 text-3xl font-bold leading-tight">
              Manage every journey with confidence.
            </h2>
            <p className="mt-4 text-sm text-emerald-50/90">
              Car With Driver keeps your bookings, riders, and routes in one place so you can focus on
              the road ahead.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 backdrop-blur">
            <p className="text-sm font-medium text-emerald-50/90">
              “Logging in takes seconds, and I can instantly see the day’s schedule at a glance.”
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-emerald-100">
              — Driver community feedback
            </p>
          </div>
        </aside>

        <div className="relative z-10 p-8 sm:p-10">
          <div className="mx-auto w-full max-w-md">
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Welcome back
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                New to Car With Driver?{' '}
                <Link to="/register" className="font-semibold text-emerald-600 hover:text-emerald-700">
                  Create an account
                </Link>
              </p>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-600/70"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

              <GoogleSignInButton
                onLoadingChange={setLoading}
                context="signin"
              />
            </form>

            <p className="mt-6 text-center text-xs text-slate-500">
              By logging in, you agree to our{' '}
              <a href="#" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Login;

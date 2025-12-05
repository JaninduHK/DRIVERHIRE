import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { register as registerUser } from '../services/authApi.js';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      role: 'guest',
    };

    try {
      await registerUser(payload);
      toast.success('Registration successful! Please verify your email to activate your account.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Unable to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="absolute -bottom-32 left-24 h-80 w-80 rounded-full bg-emerald-200/25 blur-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="relative hidden bg-gradient-to-br from-emerald-500 to-emerald-600 p-12 text-white lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-50">
              Traveller Account
            </span>
            <h2 className="mt-6 text-3xl font-bold leading-tight">
              Join Car With Driver and elevate every trip.
            </h2>
            <p className="mt-4 text-sm text-emerald-50/90">
              Whether you are exploring new destinations or managing a fleet, Car With Driver gives you
              the tools to move smarter.
            </p>
          </div>
          <ul className="space-y-4 text-sm text-emerald-50/90">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-white" />
              Trusted drivers and transparent bookings.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-white" />
              Real-time updates that keep your plans on track.
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-block h-2 w-2 rounded-full bg-white" />
              Admin tools designed for fleet-wide oversight.
            </li>
          </ul>
        </div>

        <div className="relative z-10 p-8 sm:p-10 lg:col-span-3">
          <div className="mx-auto w-full max-w-xl">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Create your traveller account
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
                  Sign in
                </Link>
              </p>
            </div>

            <form className="mt-8 space-y-8" onSubmit={handleSubmit} noValidate>
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                    Full name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Jane Doe"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700">
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
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    placeholder="Create a strong password"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Use at least 8 characters with upper and lower case letters and a number.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-600/70"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-500">
              Are you a driver?{' '}
              <Link to="/register/driver" className="font-semibold text-emerald-600 hover:text-emerald-700">
                Submit your application here
              </Link>
              .
            </p>

            <p className="mt-6 text-xs text-slate-500">
              By creating an account, you agree to Car With Driver’s{' '}
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

export default Register;

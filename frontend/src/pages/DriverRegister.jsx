import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { register as registerUser } from '../services/authApi.js';

const DriverRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    description: '',
    tripAdvisor: '',
    address: '',
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
      contactNumber: formData.contactNumber.trim(),
      description: formData.description.trim(),
      tripAdvisor: formData.tripAdvisor.trim(),
      address: formData.address.trim(),
      password: formData.password,
      role: 'driver',
    };

    try {
      await registerUser(payload);
      toast.success('Welcome aboard! We will review your driver profile shortly.');
      navigate('/login');
    } catch (error) {
      toast.error(error.message || 'Unable to submit your application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Become a Car With Driver partner
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Share your details so travellers can discover and book you with confidence.
          </p>
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
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Jane Perera"
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
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="contactNumber" className="block text-sm font-medium text-slate-700">
                  Contact number
                </label>
                <input
                  id="contactNumber"
                  name="contactNumber"
                  type="tel"
                  required
                  value={formData.contactNumber}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="+94 71 234 5678"
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="tripAdvisor" className="block text-sm font-medium text-slate-700">
                  TripAdvisor profile link
                </label>
                <input
                  id="tripAdvisor"
                  name="tripAdvisor"
                  type="url"
                  value={formData.tripAdvisor}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="https://www.tripadvisor.com/..."
                />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">
                  Driver bio
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  required
                  value={formData.description}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Tell travellers about your experience, vehicle type, languages, and specialties."
                />
              </div>
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-700">
                  Base location
                </label>
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Street, city, region"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                  Account password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="Minimum 8 characters"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-600/70"
            >
              {loading ? 'Submitting profile...' : 'Submit driver application'}
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-500">
            Already registered?{' '}
            <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Sign in here
            </Link>
            .
          </p>
        </div>

        <aside className="space-y-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Why join Car With Driver?</h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li>Reach travellers planning bespoke journeys across Sri Lanka.</li>
              <li>Manage bookings, messages, and payments from one dashboard.</li>
              <li>Earn trust with reviews linked to your TripAdvisor profile.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
            <p className="font-semibold">Need help?</p>
            <p className="mt-2">
              Email{' '}
              <a href="mailto:support@carwithdriver.lk" className="underline">
                support@carwithdriver.lk
              </a>{' '}
              and we’ll guide you through the onboarding process.
            </p>
          </div>
          <p className="text-xs text-slate-500">
            By submitting this form you agree to Car With Driver’s Terms of Service and Privacy Policy.
          </p>
        </aside>
      </div>
    </section>
  );
};

export default DriverRegister;

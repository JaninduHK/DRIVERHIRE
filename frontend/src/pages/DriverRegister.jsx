import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { register as registerUser } from '../services/authApi.js';
import { LICENSE_BADGE_STYLES } from '../constants/driverLicense.js';

const LICENSE_TYPES = Object.keys(LICENSE_BADGE_STYLES);

const DriverRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contactNumber: '',
    experienceYears: '',
    description: '',
    tripAdvisor: '',
    address: '',
    password: '',
  });
  const [licenseType, setLicenseType] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [licenseImage, setLicenseImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const profilePhotoPreview = useMemo(() => (profilePhoto ? URL.createObjectURL(profilePhoto) : ''), [profilePhoto]);
  const licenseImagePreview = useMemo(() => (licenseImage ? URL.createObjectURL(licenseImage) : ''), [licenseImage]);
  useEffect(() => () => { if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview); }, [profilePhotoPreview]);
  useEffect(() => () => { if (licenseImagePreview) URL.revokeObjectURL(licenseImagePreview); }, [licenseImagePreview]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const experienceValue = Number(formData.experienceYears);
    if (!Number.isFinite(experienceValue) || experienceValue < 0) {
      toast.error('Enter how many years you have been driving guests (0 or more).');
      return;
    }
    if (!licenseType) {
      toast.error('Select your license type.');
      return;
    }
    if (!profilePhoto) {
      toast.error('Upload a profile photo so travellers know who is picking them up.');
      return;
    }
    if (!licenseImage) {
      toast.error('Upload a photo of your license for verification.');
      return;
    }

    setLoading(true);

    const payload = new FormData();
    payload.append('name', formData.name.trim());
    payload.append('email', formData.email.trim().toLowerCase());
    payload.append('contactNumber', formData.contactNumber.trim());
    payload.append('experienceYears', String(Math.min(60, Math.round(experienceValue))));
    payload.append('description', formData.description.trim());
    payload.append('tripAdvisor', formData.tripAdvisor.trim());
    payload.append('address', formData.address.trim());
    payload.append('password', formData.password);
    payload.append('role', 'driver');
    payload.append('licenseType', licenseType);
    payload.append('profilePhoto', profilePhoto);
    payload.append('licenseImage', licenseImage);

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
          <div>
            <label htmlFor="experienceYears" className="block text-sm font-medium text-slate-700">
              Years of driving experience
            </label>
            <input
              id="experienceYears"
              name="experienceYears"
              type="number"
              inputMode="numeric"
              min="0"
              max="60"
              required
              value={formData.experienceYears}
              onChange={handleChange}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="e.g. 5"
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
                  placeholder="City"
                />
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700">Profile photo</span>
                <p className="mt-1 text-xs text-slate-500">Required — travellers see this before their trip.</p>
                <div className="mt-2 flex items-center gap-4">
                  {profilePhotoPreview ? (
                    <img src={profilePhotoPreview} alt="" className="h-16 w-16 flex-shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="h-16 w-16 flex-shrink-0 rounded-xl bg-slate-100" />
                  )}
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700">
                    {profilePhoto ? 'Change photo' : 'Upload photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => setProfilePhoto(event.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700">License type</span>
                <p className="mt-1 text-xs text-slate-500">Required — choose the license you hold.</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {LICENSE_TYPES.map((type) => {
                    const style = LICENSE_BADGE_STYLES[type];
                    const Icon = style.icon;
                    const active = licenseType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setLicenseType(type)}
                        className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-xs font-semibold transition ${
                          active ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <Icon className={`h-4 w-4 flex-shrink-0 ${active ? 'text-emerald-600' : style.iconClass}`} />
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700">License photo</span>
                <p className="mt-1 text-xs text-slate-500">Required — a clear photo of the license selected above.</p>
                <div className="mt-2 flex items-center gap-4">
                  {licenseImagePreview ? (
                    <img src={licenseImagePreview} alt="" className="h-16 w-24 flex-shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="h-16 w-24 flex-shrink-0 rounded-xl bg-slate-100" />
                  )}
                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700">
                    {licenseImage ? 'Change photo' : 'Upload photo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => setLicenseImage(event.target.files?.[0] || null)}
                    />
                  </label>
                </div>
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

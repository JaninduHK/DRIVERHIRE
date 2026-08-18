import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { getStoredToken, getStoredUser, redirectToSsoLogin } from '../services/authToken.js';
import { createBrief } from '../services/briefApi.js';

// Stashed here right before handing off to Asgardeo; AuthCallback.jsx reads
// and submits it once sign-in completes, so the traveller never re-enters
// what they already typed here.
const AUTO_SUBMIT_BRIEF_KEY = 'carwithdriver:auto-submit-brief';
const REQUESTS_PATH = '/dashboard?tab=requests';

const buildForm = () => ({
  startDate: '',
  endDate: '',
  startLocation: '',
  endLocation: '',
  adults: '2',
  children: '0',
  country: '',
  message: '',
});

const inputCls =
  'w-full rounded-xl border-[1.5px] border-[#e5ebe8] bg-[#fbfcfc] px-3.5 py-3 text-[14.5px] font-semibold text-ink outline-none transition focus:border-brand';
const labelCls = 'mb-1.5 block text-xs font-bold text-muted';

const GetQuotes = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(buildForm());
  const [submitting, setSubmitting] = useState(false);

  const setField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const todayDate = new Date().toISOString().split('T')[0];

  const handleNext = async (event) => {
    event.preventDefault();

    const payload = {
      startDate: form.startDate,
      endDate: form.endDate,
      startLocation: form.startLocation.trim(),
      endLocation: form.endLocation.trim(),
      adults: Number(form.adults || 0),
      children: Math.max(0, Number(form.children || 0)),
      message: form.message.trim(),
      country: form.country.trim(),
    };

    if (!payload.startDate || !payload.endDate) {
      toast.error('Select your start and end dates.');
      return;
    }
    if (payload.endDate < payload.startDate) {
      toast.error('End date must be after the start date.');
      return;
    }
    if (payload.startDate < todayDate) {
      toast.error('Start date cannot be in the past.');
      return;
    }
    if (!payload.startLocation || !payload.endLocation || !payload.message || !payload.country) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (payload.adults < 1) {
      toast.error('Please specify at least one adult traveller.');
      return;
    }

    const token = getStoredToken();
    const user = getStoredUser();

    // Already signed in as a traveller — submit right away, no detour through Asgardeo.
    if (token && user?.role === 'guest') {
      setSubmitting(true);
      try {
        await createBrief(payload);
        toast.success('Quote request sent to drivers!');
        navigate(REQUESTS_PATH);
      } catch (error) {
        toast.error(error?.message || 'Unable to submit your request. Please try again.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Not signed in — stash the request and hand off to Asgardeo. AuthCallback.jsx
    // submits it automatically once sign-in/sign-up completes.
    try {
      sessionStorage.setItem(AUTO_SUBMIT_BRIEF_KEY, JSON.stringify(payload));
    } catch {
      /* ignore storage errors */
    }
    redirectToSsoLogin(REQUESTS_PATH);
  };

  return (
    <section className="mx-auto max-w-2xl px-4 py-[clamp(28px,4vw,56px)]">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-tint px-[13px] py-[7px] text-xs font-bold tracking-[.02em] text-brand-dark">
          Free &amp; no obligation
        </span>
        <h1 className="mt-4 text-[clamp(26px,3.4vw,36px)] font-extrabold tracking-[-.02em] text-ink">
          Get quotes from drivers
        </h1>
        <p className="mx-auto mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-muted">
          Tell us about your trip. Next you&apos;ll sign in or create a free account, then we send your request
          straight to vetted drivers — no need to fill anything in twice.
        </p>
      </div>

      <form
        onSubmit={handleNext}
        className="mt-8 rounded-[22px] border border-[#e5ebe8] bg-white p-[clamp(20px,2.6vw,30px)] shadow-[0_28px_60px_-32px_rgba(15,31,45,.28)]"
      >
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Start date</span>
              <input
                type="date"
                required
                value={form.startDate}
                min={todayDate}
                onChange={setField('startDate')}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>End date</span>
              <input
                type="date"
                required
                value={form.endDate}
                min={form.startDate || todayDate}
                onChange={setField('endDate')}
                className={inputCls}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={labelCls}>Pick-up location</span>
              <input
                type="text"
                required
                value={form.startLocation}
                onChange={setField('startLocation')}
                placeholder="City, hotel or airport"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Drop-off location</span>
              <input
                type="text"
                required
                value={form.endLocation}
                onChange={setField('endLocation')}
                placeholder="City, hotel or airport"
                className={inputCls}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <label className="block">
              <span className={labelCls}>Adults</span>
              <input
                type="number"
                min="1"
                required
                value={form.adults}
                onChange={setField('adults')}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Children</span>
              <input
                type="number"
                min="0"
                value={form.children}
                onChange={setField('children')}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>Country of residence</span>
              <input
                type="text"
                required
                value={form.country}
                onChange={setField('country')}
                placeholder="e.g. Germany"
                className={inputCls}
              />
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>Itinerary details</span>
            <textarea
              rows="4"
              required
              value={form.message}
              onChange={setField('message')}
              placeholder="Places you want to see, flight times, kids or extra luggage. Anything that helps drivers quote accurately."
              className={`${inputCls} resize-y leading-[1.5]`}
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex min-h-[52px] items-center justify-center gap-2 rounded-[13px] bg-brand px-6 text-[15.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(16,163,90,.75)] transition hover:bg-[#0e9351] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
              </>
            ) : (
              'Next'
            )}
          </button>
          <p className="text-center text-xs leading-[1.5] text-muted-soft">
            Free to request · No booking fee · Pay the driver directly
          </p>
        </div>
      </form>
    </section>
  );
};

export default GetQuotes;

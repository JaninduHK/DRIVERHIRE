import { useState } from 'react';
import { Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { submitSupportRequest } from '../services/supportApi.js';

const contactInfo = [
  {
    icon: Phone,
    label: 'Call / WhatsApp',
    value: '+94 76 302 1483',
    hint: 'Best for urgent airport pickups & same-day tours',
  },
  {
    icon: Mail,
    label: 'Support Email',
    value: 'hello@carwithdriver.lk',
    hint: 'Send booking details or screenshots for faster help',
  },
];

const placeholderIndentStyle = { textIndent: '5px' };

const ContactPage = () => {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    category: '',
    bookingId: '',
    message: '',
    submitting: false,
  });

  const handleFieldChange = (field) => (event) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = formState.name.trim();
    const email = formState.email.trim();
    const message = formState.message.trim();

    if (!name || !email || !message) {
      toast.error('Please add your name, email, and message.');
      return;
    }

    setFormState((prev) => ({ ...prev, submitting: true }));
    try {
      await submitSupportRequest({
        name,
        email,
        category: formState.category.trim(),
        bookingId: formState.bookingId.trim(),
        message,
      });
      toast.success('Your request was sent to our support inbox.');
      setFormState({
        name: '',
        email: '',
        category: '',
        bookingId: '',
        message: '',
        submitting: false,
      });
    } catch (error) {
      toast.error(error?.message || 'Unable to send your request.');
      setFormState((prev) => ({ ...prev, submitting: false }));
    }
  };

  return (
    <section className="min-h-[80vh] bg-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-16 lg:flex-row lg:py-20">
        {/* LEFT: SUPPORT OVERVIEW + BIG BUTTONS */}
        <div className="w-full lg:w-[45%]">
          <div className="flex h-full flex-col justify-between rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 px-6 py-8 text-white shadow-xl lg:px-8 lg:py-10">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
                24/7 TOUR SUPPORT
              </span>

              <div>
                <h1 className="text-3xl font-semibold leading-snug tracking-tight sm:text-4xl">
                  Need help with your
                  <br />
                  driver or tour booking?
                </h1>
                <p className="mt-3 max-w-md text-sm text-emerald-50/90 sm:text-base">
                  Our team is here for tourists who need support before, during, or after
                  their trip in Sri Lanka — changes, questions, issues, or new booking help.
                </p>
              </div>

              {/* Support scenarios */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-500/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/90">
                    We can help with
                  </p>
                  <ul className="mt-2 space-y-1.5 text-xs text-emerald-50/95">
                    <li>• Changing pickup time or location</li>
                    <li>• Updating your itinerary or stops</li>
                    <li>• Questions about prices or vehicles</li>
                  </ul>
                </div>
                <div className="rounded-2xl bg-emerald-900/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/90">
                    Average response time
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">Under 3 hrs</p>
                  <p className="mt-1 text-xs text-emerald-50/85">
                    We prioritise active travellers already in Sri Lanka & airport arrivals.
                  </p>
                </div>
              </div>
            </div>

            {/* BIG QUICK-ACTION BUTTONS */}
            <div className="mt-8 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/95">
                Quick contact for tourists
              </p>

              <div className="space-y-3">
                <a
                  href="tel:+94763021483"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <Phone className="h-5 w-5" />
                  Call / WhatsApp support now
                </a>

                <a
                  href="mailto:hello@carwithdriver.lk"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-semibold text-emerald-600 shadow-sm transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                >
                  <Mail className="h-5 w-5" />
                  Email booking details to support
                </a>
              </div>

              <p className="text-xs text-emerald-50/80">
                Tip: When you contact us, include your booking ID (if you have one), travel dates,
                and the name the booking is under. This helps us assist you faster.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: SUPPORT FORM + INFO STRIP */}
        <div className="flex w-full flex-col gap-6 lg:w-[55%]">
          {/* FORM CARD */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  Tell us what you need help with
                </h2>
                <p className="text-xs text-slate-500 sm:text-sm">
                  Use this form if you prefer email support. We’ll reply with clear next steps and
                  options for your driver or tour.
                </p>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
                  No
                  <br />
                  Booking
                  <br />
                  Fees
                </p>
              </div>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Reason / Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  What do you need help with?
                </label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                  value={formState.category}
                  onChange={handleFieldChange('category')}
                  style={placeholderIndentStyle}
                >
                  <option value="" disabled>
                    Select an option
                  </option>
                  <option>Change or cancel an existing booking</option>
                  <option>Question about my upcoming booking</option>
                  <option>Problem during my trip (driver / vehicle)</option>
                  <option>Urgent same-day / tomorrow airport pickup</option>
                  <option>New tour / driver quote</option>
                  <option>Something else</option>
                </select>
              </div>

              {/* Name + Email */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Name on your booking"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    value={formState.name}
                    onChange={handleFieldChange('name')}
                    required
                    style={placeholderIndentStyle}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    value={formState.email}
                    onChange={handleFieldChange('email')}
                    required
                    style={placeholderIndentStyle}
                  />
                </div>
              </div>

              {/* Optional booking ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Booking ID (if you have one)
                </label>
                  <input
                    type="text"
                    placeholder="#DRIVER12345 or platform reference"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    value={formState.bookingId}
                    onChange={handleFieldChange('bookingId')}
                    style={placeholderIndentStyle}
                  />
                </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Explain your situation
                </label>
                  <textarea
                    rows={5}
                    placeholder="Tell us your travel dates, where you are now (or landing), what went wrong or what you want to change. Include driver name or vehicle type if possible."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
                    value={formState.message}
                    onChange={handleFieldChange('message')}
                    required
                    style={placeholderIndentStyle}
                  />
                </div>

              {/* Big button + note */}
              <div className="space-y-2 pt-1">
                <button
                  type="submit"
                  disabled={formState.submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-600/70"
                >
                  {formState.submitting ? 'Sending...' : 'Send support request'}
                </button>
                <p className="text-xs text-slate-500">
                  We answer all tourists personally — no bots. For urgent same-day issues, we
                  recommend calling or using WhatsApp first, then sending this form with details.
                </p>
              </div>
            </form>
          </div>

          {/* CONTACT INFO STRIP */}
          <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-2">
            {contactInfo.map(({ icon: Icon, label, value, hint }) => (
              <div key={label} className="space-y-2 rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">
                    {label}
                  </p>
                </div>
                <p className="text-lg font-semibold text-slate-900">{value}</p>
                {hint && <p className="text-sm text-slate-500">{hint}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactPage;

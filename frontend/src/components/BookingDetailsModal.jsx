import { useEffect } from 'react';
import { X, Calendar, MapPin, Plane, User2, Mail, Phone, Car } from 'lucide-react';

const fmtDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

const STATUS_STYLES = {
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

/**
 * Full booking details, shown as a bottom sheet on mobile and a centered card on desktop.
 * Accepts either a driver-bookings shape (booking.vehicle.model) or the chat-linked shape
 * (booking.vehicleModel); every field is optional and only rendered when present.
 */
const BookingDetailsModal = ({ booking, onClose }) => {
  useEffect(() => {
    if (!booking) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [booking, onClose]);

  if (!booking) return null;

  const traveler = booking.traveler || {};
  const name = traveler.fullName || booking.travelerName || 'Traveller';
  const vehicleModel = booking.vehicleModel || booking.vehicle?.model;
  const status = (booking.status || 'pending').toLowerCase();
  const hasRoute = booking.startPoint || booking.endPoint;
  const hasFlight = booking.flightNumber || booking.arrivalTime || booking.departureTime;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white sm:max-w-lg sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-ink">Booking details</h2>
            {vehicleModel ? <p className="truncate text-[13px] text-muted">{vehicleModel}</p> : null}
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase ${
                STATUS_STYLES[status] || 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {status}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5">
          <Section title="Traveller">
            <Row icon={User2} label="Name" value={name} />
            {traveler.email ? (
              <Row
                icon={Mail}
                label="Email"
                value={
                  <a href={`mailto:${traveler.email}`} className="text-brand-dark underline">
                    {traveler.email}
                  </a>
                }
              />
            ) : null}
            {traveler.phoneNumber ? (
              <Row
                icon={Phone}
                label="Phone"
                value={
                  <a href={`tel:${traveler.phoneNumber}`} className="text-brand-dark underline">
                    {traveler.phoneNumber}
                  </a>
                }
              />
            ) : null}
          </Section>

          <Section title="Trip">
            <Row icon={Calendar} label="Dates" value={`${fmtDate(booking.startDate)} – ${fmtDate(booking.endDate)}`} />
            {booking.totalDays ? (
              <Row icon={Calendar} label="Days" value={`${booking.totalDays} day${booking.totalDays === 1 ? '' : 's'}`} />
            ) : null}
            {vehicleModel ? <Row icon={Car} label="Vehicle" value={vehicleModel} /> : null}
          </Section>

          {hasRoute ? (
            <Section title="Pick-up & drop-off">
              {booking.startPoint ? <Row icon={MapPin} label="Start point" value={booking.startPoint} /> : null}
              {booking.endPoint ? <Row icon={MapPin} label="Drop-off point" value={booking.endPoint} /> : null}
            </Section>
          ) : null}

          {hasFlight ? (
            <Section title="Flight">
              {booking.flightNumber ? <Row icon={Plane} label="Flight number" value={booking.flightNumber} /> : null}
              {booking.arrivalTime ? <Row icon={Plane} label="Arrival time" value={booking.arrivalTime} /> : null}
              {booking.departureTime ? <Row icon={Plane} label="Departure time" value={booking.departureTime} /> : null}
            </Section>
          ) : null}

          {booking.specialRequests ? (
            <Section title="Notes & extras">
              <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-ink-soft">
                {booking.specialRequests}
              </p>
            </Section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

function Section({ title, children }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-soft">{title}</h3>
      <div className="space-y-2.5 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-soft" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold text-muted-soft">{label}</div>
        <div className="break-words text-[13.5px] font-semibold text-ink">{value}</div>
      </div>
    </div>
  );
}

export default BookingDetailsModal;

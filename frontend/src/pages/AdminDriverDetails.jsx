import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  KeyRound,
  Mail,
  MessageCircle,
  Pencil,
  RefreshCw,
  Star,
  Undo2,
  Wallet,
  XCircle,
  MailCheck,
  Clock,
} from 'lucide-react';
import {
  fetchDriverDetails,
  sendDriverEmail,
  setDriverFeatured,
  setDriverCredentials,
  setDriverBriefAlertEmail,
  setDriverEmailVerified,
  setDriverCommissionGrace,
  clearDriverLiveLocation,
  setDriverCommissionEnforceFrom,
  setDriverMessagingSuspension,
  setDriverPassword,
  updateDriverDetails,
  updateDriverStatus,
  updateLicenseType,
} from '../services/adminApi.js';
import { fetchCurrentUser } from '../services/profileApi.js';
import { clearStoredToken } from '../services/authToken.js';
import AdminShell from './admin/AdminShell.jsx';
import AdminModal from './admin/AdminModal.jsx';
import { ADMIN_NAV_GROUPS } from './admin/adminNav.js';
import { formatCurrency, formatDateInput, formatDateTime, tagClass } from './admin/adminFormatters.js';
import { LICENSE_TYPE_OPTIONS, getLicenseBadge } from '../constants/driverLicense.js';
import LocationSelect from '../components/LocationSelect.jsx';
import ServiceAreasPicker from '../components/ServiceAreasPicker.jsx';
import { guessLocationName } from '../constants/locations.js';
import { CREDENTIAL_SECTIONS, MAX_CREDENTIALS, MAX_CREDENTIAL_HIGHLIGHTS, MAX_CREDENTIAL_LENGTH } from '../constants/driverCredentials.js';

const DRIVER_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };
const STATUS_COLORS = { pending: 'amber', submitted: 'amber', approved: 'green', confirmed: 'green', active: 'green', accepted: 'green', rejected: 'red', cancelled: 'red', declined: 'red', closed: 'grey' };
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const EMPTY = 'Not provided';

const inputCls = 'mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';

const statusTag = (status) => tagClass(STATUS_COLORS[status] || 'grey');

const Panel = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`rounded-[18px] bg-surface shadow-card ${className}`}>
    <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
      <div>
        <h2 className="text-[15px] font-extrabold text-ink">{title}</h2>
        {subtitle ? <p className="mt-1 text-[11.5px] text-muted-soft">{subtitle}</p> : null}
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const DetailRow = ({ label, value, children, mono = false }) => (
  <div className="grid gap-1 border-b border-hairline py-3 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[150px_1fr] sm:gap-4">
    <dt className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</dt>
    <dd className={`min-w-0 break-words text-[13px] font-semibold text-ink ${mono ? 'font-mono text-[12px]' : ''}`}>
      {children ?? value ?? <span className="font-normal text-muted-soft">{EMPTY}</span>}
    </dd>
  </div>
);

const EmptyState = ({ icon = ClipboardList, text }) => (
  <div className="flex min-h-[230px] flex-col items-center justify-center gap-2 rounded-[18px] bg-surface text-center text-sm text-muted shadow-card">
    {createElement(icon, { className: 'h-9 w-9 text-muted-soft' })}
    <p>{text}</p>
  </div>
);

const Stat = ({ value, label }) => (
  <div className="rounded-2xl border border-hairline bg-surface px-4 py-4 shadow-card">
    <div className="text-xl font-extrabold text-ink">{value}</div>
    <div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</div>
  </div>
);

const Timestamp = ({ value }) => <span title={value || ''}>{formatDateTime(value)}</span>;

// Extra qualifications our team has checked (degrees, experience, awards,
// specialties, languages). Starred ones show on every offer the driver sends.
const CredentialsEditor = ({ driver, onSave, saving }) => {
  const fromDriver = () => (Array.isArray(driver.credentials) ? driver.credentials.map((item) => ({ ...item })) : []);
  const [items, setItems] = useState(fromDriver);
  const [draft, setDraft] = useState({ section: 'qualifications', text: '' });
  useEffect(() => { setItems(fromDriver()); }, [driver.credentials]); // eslint-disable-line react-hooks/exhaustive-deps

  const highlightCount = items.filter((item) => item.highlight).length;
  const dirty = JSON.stringify(items) !== JSON.stringify(fromDriver());
  const update = (index, patch) => setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const remove = (index) => setItems((current) => current.filter((_, i) => i !== index));
  const move = (index, step) => setItems((current) => {
    const next = [...current];
    const target = index + step;
    if (target < 0 || target >= next.length || next[target].section !== next[index].section) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const add = (event) => {
    event.preventDefault();
    const text = draft.text.replace(/\s+/g, ' ').trim();
    if (!text) return;
    if (items.length >= MAX_CREDENTIALS) { toast.error(`A driver can have up to ${MAX_CREDENTIALS} credentials.`); return; }
    setItems((current) => [...current, { section: draft.section, text, highlight: false }]);
    setDraft((current) => ({ ...current, text: '' }));
  };
  const toggleStar = (index) => {
    if (!items[index].highlight && highlightCount >= MAX_CREDENTIAL_HIGHLIGHTS) {
      toast.error(`Star up to ${MAX_CREDENTIAL_HIGHLIGHTS} highlights. Unstar one first.`);
      return;
    }
    update(index, { highlight: !items[index].highlight });
  };

  return (
    <Panel
      title="Credentials"
      subtitle={`Add only what you have checked (certificate, award page). Shown on the profile as "Verified by our team"; starred lines (up to ${MAX_CREDENTIAL_HIGHLIGHTS}) show on every offer. Don't add licences: the SLTDA licence has its own badge.`}
      action={driver.credentialsUpdatedAt ? <span className="text-[11px] text-muted-soft">Updated <Timestamp value={driver.credentialsUpdatedAt} /></span> : null}
    >
      {CREDENTIAL_SECTIONS.map((section) => {
        const rows = items.map((item, index) => ({ item, index })).filter(({ item }) => item.section === section.key);
        if (rows.length === 0) return null;
        return (
          <div key={section.key} className="mb-4">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
              {createElement(section.icon, { className: 'h-3.5 w-3.5' })} {section.label}
            </div>
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {rows.map(({ item, index }) => (
                <li key={index} className="flex items-center gap-2 rounded-xl bg-canvas px-2.5 py-1.5">
                  <button type="button" onClick={() => toggleStar(index)} title={item.highlight ? 'Shown on offers. Click to unstar.' : 'Star to show on offers'} className={`grid h-7 w-7 flex-none place-items-center rounded-lg ${item.highlight ? 'bg-amber-100 text-amber-600' : 'text-muted-soft hover:bg-white'}`}>
                    <Star className="h-4 w-4" fill={item.highlight ? 'currentColor' : 'none'} />
                  </button>
                  <input value={item.text} maxLength={MAX_CREDENTIAL_LENGTH} onChange={(event) => update(index, { text: event.target.value })} className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-ink focus:border-line focus:bg-white focus:outline-none" />
                  <button type="button" onClick={() => move(index, -1)} title="Move up" className="px-1 text-xs font-bold text-muted-soft hover:text-ink">↑</button>
                  <button type="button" onClick={() => move(index, 1)} title="Move down" className="px-1 text-xs font-bold text-muted-soft hover:text-ink">↓</button>
                  <button type="button" onClick={() => remove(index)} title="Remove" className="grid h-7 w-7 flex-none place-items-center rounded-lg text-rose-500 hover:bg-white"><XCircle className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {items.length === 0 ? <p className="mb-4 text-sm text-muted-soft">No credentials yet.</p> : null}

      <form onSubmit={add} className="flex flex-wrap gap-2">
        <select value={draft.section} onChange={(event) => setDraft((current) => ({ ...current, section: event.target.value }))} className="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm font-semibold text-ink">
          {CREDENTIAL_SECTIONS.map((section) => <option key={section.key} value={section.key}>{section.label}</option>)}
        </select>
        <input value={draft.text} maxLength={MAX_CREDENTIAL_LENGTH} onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))} placeholder={`e.g. ${CREDENTIAL_SECTIONS.find((section) => section.key === draft.section)?.example}`} className="min-w-[200px] flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-ink focus:outline-none" />
        <button type="submit" className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink hover:bg-canvas">Add</button>
      </form>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-hairline pt-4">
        <span className="text-xs text-muted-soft">{items.length} of {MAX_CREDENTIALS} · {highlightCount} of {MAX_CREDENTIAL_HIGHLIGHTS} starred</span>
        <div className="flex gap-2">
          {dirty ? <button type="button" onClick={() => setItems(fromDriver())} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink">Undo changes</button> : null}
          <button type="button" disabled={!dirty || saving} onClick={() => onSave(items)} className="rounded-xl bg-brand px-5 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save credentials'}</button>
        </div>
      </div>
    </Panel>
  );
};

const DriverOverview = ({ data, onEdit, onVerification, onChangeLicenseType, onEnforceFrom, onClearLocation, onSaveCredentials, actionLoading }) => {
  // Month picked for "Freeze if unpaid" (older months, before the automatic start).
  const [enforceMonth, setEnforceMonth] = useState('2026-10');
  const { driver } = data;
  const licenseBadge = getLicenseBadge(driver.licenseType);
  const LicenseIcon = licenseBadge?.icon;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="flex flex-col gap-5">
        <Panel
          title="Profile information"
          subtitle="Information supplied by the driver and shown across the marketplace."
          action={<button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-canvas"><Pencil className="h-3.5 w-3.5" /> Edit</button>}
        >
          <dl>
            <DetailRow label="Full name" value={driver.name} />
            <DetailRow label="Email" value={driver.email} />
            <DetailRow label="Contact number" value={driver.contactNumber} />
            <DetailRow label="Base location" value={driver.address} />
            <DetailRow label="Experience" value={driver.experienceYears != null ? `${driver.experienceYears} years` : null} />
            <DetailRow label="Member since"><Timestamp value={driver.memberSince} /></DetailRow>
            <DetailRow label="TripAdvisor">
              {driver.tripAdvisor ? <a href={driver.tripAdvisor} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-dark hover:underline">Open profile <ExternalLink className="h-3.5 w-3.5" /></a> : null}
            </DetailRow>
            <DetailRow label="Bio"><span className="whitespace-pre-wrap font-normal leading-relaxed text-muted">{driver.description || EMPTY}</span></DetailRow>
          </dl>
        </Panel>

        <CredentialsEditor driver={driver} onSave={onSaveCredentials} saving={actionLoading === 'credentials'} />

        <Panel title="License verification" subtitle="SLTDA license information and the latest review decision." action={<div className="flex flex-wrap items-center gap-3">{driver.licenseStatus ? <button type="button" onClick={onChangeLicenseType} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-canvas">Change type</button> : null}<button type="button" onClick={onVerification} className="text-xs font-bold text-brand-dark hover:underline">Open verification</button></div>}>
          <div className="grid gap-5 md:grid-cols-[180px_1fr]">
            {driver.licenseImage ? (
              <a href={driver.licenseImage} target="_blank" rel="noreferrer" className="block">
                <img src={driver.licenseImage} alt="Driver license" className="h-32 w-full rounded-xl border border-hairline object-cover" />
              </a>
            ) : (
              <div className="grid h-32 place-items-center rounded-xl bg-canvas text-xs font-semibold text-muted-soft">No license image</div>
            )}
            <dl>
              <DetailRow label="License type">
                {driver.licenseType ? <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 ${licenseBadge?.badgeClass || 'bg-canvas text-muted'}`}>{LicenseIcon ? <LicenseIcon className={`h-3.5 w-3.5 ${licenseBadge.iconClass}`} /> : null}{driver.licenseType}</span> : null}
              </DetailRow>
              <DetailRow label="Status">{driver.licenseStatus ? <span className={statusTag(driver.licenseStatus)}>{driver.licenseStatus}</span> : null}</DetailRow>
              <DetailRow label="Submitted"><Timestamp value={driver.licenseSubmittedAt} /></DetailRow>
              <DetailRow label="Reviewed"><Timestamp value={driver.licenseReviewedAt} /></DetailRow>
              <DetailRow label="Reviewed by" value={driver.licenseReviewedBy?.name} />
              <DetailRow label="Admin note" value={driver.licenseAdminNote} />
            </dl>
          </div>
        </Panel>
      </div>

      <div className="flex flex-col gap-5">
        <Panel title="Account and access" subtitle="Private operational information for administrators.">
          <dl>
            <DetailRow label="Driver ID" value={driver.id} mono />
            <DetailRow label="Role" value={driver.role} />
            <DetailRow label="Authentication" value={driver.authProvider} />
            <DetailRow label="Email verified">{driver.isVerified ? <span className={tagClass('green')}>Verified</span> : <span className={tagClass('amber')}>Not verified</span>}</DetailRow>
            <DetailRow label="Application">{driver.driverStatus ? <span className={statusTag(driver.driverStatus)}>{driver.driverStatus}</span> : null}</DetailRow>
            <DetailRow label="Older unpaid months">
              {driver.commissionEnforceFrom ? (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <span className={tagClass('red')}>Enforced from {driver.commissionEnforceFrom}</span>
                  <button type="button" disabled={Boolean(actionLoading)} onClick={() => onEnforceFrom?.(null)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-bold text-ink hover:bg-canvas disabled:opacity-60">Stop</button>
                </span>
              ) : (
                <span className="inline-flex flex-wrap items-center gap-2">
                  <input type="month" value={enforceMonth} max="2026-10" onChange={(e) => setEnforceMonth(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink" />
                  <button type="button" disabled={Boolean(actionLoading) || !enforceMonth} onClick={() => onEnforceFrom?.(enforceMonth)} className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60">Freeze if unpaid</button>
                </span>
              )}
            </DetailRow>
            <DetailRow label="Commission">
              {driver.commissionFrozenAt
                ? <span className={tagClass('red')}>Frozen: {(driver.commissionFrozenPeriods || []).join(', ') || 'unpaid commission'}</span>
                : <span className={tagClass('green')}>Active</span>}
              {driver.commissionGraceUntil && new Date(driver.commissionGraceUntil) > new Date()
                ? <span className={`ml-2 ${tagClass('blue')}`}>Extra time until {new Date(driver.commissionGraceUntil).toLocaleDateString()}</span>
                : null}
            </DetailRow>
            <DetailRow label="Reviewed"><Timestamp value={driver.driverReviewedAt} /></DetailRow>
            <DetailRow label="Reviewed by" value={driver.driverReviewedBy?.name} />
            <DetailRow label="Approved"><Timestamp value={driver.driverApprovedAt} /></DetailRow>
            <DetailRow label="Onboarding complete"><Timestamp value={driver.driverProfileTourCompletedAt} /></DetailRow>
            <DetailRow label="Homepage">{driver.featured ? <span className={tagClass('amber')}>Featured #{Number(driver.featuredOrder ?? 0) + 1}</span> : <span className={tagClass('grey')}>Not featured</span>}</DetailRow>
            <DetailRow label="Brief emails">{driver.briefAlertEmailOptIn ? <span className={tagClass('green')}>Always emailed</span> : <span className={tagClass('grey')}>Default</span>}<span className="mt-1 block text-[11.5px] font-normal text-muted-soft">{driver.briefAlertEmailOptIn ? 'Gets "new traveller brief" emails even with the app installed.' : 'Follows the brief alert email setting in the Briefs tab.'}</span></DetailRow>
            <DetailRow label="Messaging">{driver.messagingSuspendedUntil && new Date(driver.messagingSuspendedUntil) > new Date() ? <span className={tagClass('red')}>Suspended until {formatDateTime(driver.messagingSuspendedUntil)}</span> : <span className={tagClass('green')}>Active</span>}</DetailRow>
            <DetailRow label="Suspension reason" value={driver.suspensionReason} />
          </dl>
        </Panel>

        <Panel
          title="Location and availability"
          subtitle="The location shared through the driver dashboard."
          action={
            driver.driverLocation?.latitude != null || driver.driverLocation?.label ? (
              <button type="button" disabled={Boolean(actionLoading)} onClick={onClearLocation} className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-60">
                {actionLoading === 'clear-location' ? 'Clearing…' : 'Clear live location'}
              </button>
            ) : null
          }
        >
          <dl>
            <DetailRow label="Sharing enabled">{driver.shareLiveLocation ? <span className={tagClass('green')}>Yes</span> : <span className={tagClass('grey')}>No</span>}</DetailRow>
            <DetailRow label="Location label" value={driver.driverLocation?.label} />
            <DetailRow label="Coordinates" value={driver.driverLocation?.latitude != null && driver.driverLocation?.longitude != null ? `${driver.driverLocation.latitude}, ${driver.driverLocation.longitude}` : null} />
            <DetailRow label="Location updated"><Timestamp value={driver.driverLocation?.updatedAt} /></DetailRow>
          </dl>
        </Panel>

        <Panel title="Record timestamps" subtitle="Exact timestamps stored on the account record.">
          <dl>
            <DetailRow label="Account created"><Timestamp value={driver.createdAt} /></DetailRow>
            <DetailRow label="Record updated"><Timestamp value={driver.updatedAt} /></DetailRow>
            <DetailRow label="Deleted/anonymized"><Timestamp value={driver.deletedAt} /></DetailRow>
          </dl>
        </Panel>
      </div>
    </div>
  );
};

const VehiclesTab = ({ vehicles }) => {
  if (!vehicles.length) return <EmptyState icon={Car} text="This driver has not added any vehicles." />;
  const features = [
    ['englishSpeakingDriver', 'English-speaking driver'],
    ['meetAndGreetAtAirport', 'Airport meet & greet'],
    ['fuelAndInsurance', 'Fuel & insurance'],
    ['driverMealsAndAccommodation', 'Driver meals & accommodation'],
    ['parkingFeesAndTolls', 'Parking fees & tolls'],
    ['allTaxes', 'All taxes'],
  ];
  return (
    <div className="flex flex-col gap-5">
      {vehicles.map((vehicle) => (
        <Panel key={vehicle.id} title={`${vehicle.model} · ${vehicle.year}`} subtitle={`Vehicle ID ${vehicle.id}`} action={<span className={statusTag(vehicle.status)}>{vehicle.status}</span>}>
          <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
            <div>
              {vehicle.images?.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {vehicle.images.map((image, index) => <a key={image} href={image} target="_blank" rel="noreferrer" className={index === 0 ? 'col-span-2' : ''}><img src={image} alt="" className={`w-full rounded-xl border border-hairline object-cover ${index === 0 ? 'h-36' : 'h-20'}`} /></a>)}
                </div>
              ) : <div className="grid h-36 place-items-center rounded-xl bg-canvas text-xs text-muted-soft">No vehicle images</div>}
            </div>
            <div className="grid gap-x-6 md:grid-cols-2">
              <dl>
                <DetailRow label="Daily price" value={formatCurrency(vehicle.pricePerDay)} />
                <DetailRow label="Seats" value={vehicle.seats} />
                <DetailRow label="Description"><span className="whitespace-pre-wrap font-normal text-muted">{vehicle.description || EMPTY}</span></DetailRow>
                <DetailRow label="Rejected reason" value={vehicle.rejectedReason} />
              </dl>
              <dl>
                <DetailRow label="Created"><Timestamp value={vehicle.createdAt} /></DetailRow>
                <DetailRow label="Updated"><Timestamp value={vehicle.updatedAt} /></DetailRow>
                <DetailRow label="Reviewed"><Timestamp value={vehicle.reviewedAt} /></DetailRow>
                <DetailRow label="Availability entries" value={vehicle.availability?.length || 0} />
              </dl>
              <div className="md:col-span-2 mt-4 flex flex-wrap gap-2">
                {features.map(([key, label]) => <span key={key} className={tagClass(vehicle[key] ? 'green' : 'grey')}>{vehicle[key] ? 'Included' : 'Not included'} · {label}</span>)}
              </div>
              {vehicle.availability?.length ? (
                <div className="md:col-span-2 mt-4 overflow-x-auto rounded-xl border border-hairline">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="bg-canvas text-muted-soft"><tr><th className="px-3 py-2">Start</th><th className="px-3 py-2">End</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Note</th><th className="px-3 py-2">Updated</th></tr></thead>
                    <tbody>{vehicle.availability.map((entry) => <tr key={entry.id} className="border-t border-hairline"><td className="px-3 py-2"><Timestamp value={entry.startDate} /></td><td className="px-3 py-2"><Timestamp value={entry.endDate} /></td><td className="px-3 py-2"><span className={statusTag(entry.status)}>{entry.status}</span></td><td className="px-3 py-2 text-muted">{entry.note || '—'}</td><td className="px-3 py-2 text-muted"><Timestamp value={entry.updatedAt} /></td></tr>)}</tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
};

const BookingsTab = ({ bookings }) => {
  if (!bookings.length) return <EmptyState icon={CalendarDays} text="No bookings are associated with this driver." />;
  return (
    <div className="flex flex-col gap-4">
      {bookings.map((booking) => (
        <Panel key={booking.id} title={`${booking.startPoint || 'Start not set'} → ${booking.endPoint || 'End not set'}`} subtitle={`Booking ID ${booking.id}`} action={<span className={statusTag(booking.status)}>{booking.status}</span>}>
          <div className="grid gap-x-6 lg:grid-cols-3">
            <dl>
              <DetailRow label="Traveller" value={booking.traveler?.fullName} />
              <DetailRow label="Email" value={booking.traveler?.email} />
              <DetailRow label="Phone" value={booking.traveler?.phoneNumber} />
              <DetailRow label="Vehicle" value={booking.vehicle?.model} />
            </dl>
            <dl>
              <DetailRow label="Trip starts"><Timestamp value={booking.startDate} /></DetailRow>
              <DetailRow label="Trip ends"><Timestamp value={booking.endDate} /></DetailRow>
              <DetailRow label="Duration" value={booking.totalDays != null ? `${booking.totalDays} days` : null} />
              <DetailRow label="Flight" value={booking.flightNumber} />
              <DetailRow label="Arrival / departure" value={[booking.arrivalTime, booking.departureTime].filter(Boolean).join(' / ') || null} />
            </dl>
            <dl>
              <DetailRow label="Price per day" value={formatCurrency(booking.pricePerDay)} />
              <DetailRow label="Gross" value={formatCurrency(booking.totalPrice)} />
              <DetailRow label="Discount" value={booking.discountAmount ? `${formatCurrency(booking.discountAmount)}${booking.commissionDiscountLabel ? ` · ${booking.commissionDiscountLabel}` : ''}` : formatCurrency(0)} />
              <DetailRow label="Payable" value={formatCurrency(booking.payableTotal)} />
              <DetailRow label="Commission" value={`${formatCurrency(booking.commissionAmount)} · ${Math.round(Number(booking.commissionRate || 0) * 100)}%`} />
              <DetailRow label="Driver earnings" value={formatCurrency(booking.driverEarnings)} />
            </dl>
          </div>
          <div className="mt-4 grid gap-x-6 border-t border-hairline pt-4 lg:grid-cols-2">
            <dl><DetailRow label="Special requests" value={booking.specialRequests} /><DetailRow label="Payment note" value={booking.paymentNote} /><DetailRow label="Cancellation" value={booking.cancellationReason} /><DetailRow label="Cancelled by" value={booking.cancelledBy} /><DetailRow label="Offer / conversation" value={[booking.offerId, booking.conversationId].filter(Boolean).join(' / ') || null} mono /></dl>
            <dl><DetailRow label="Created"><Timestamp value={booking.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={booking.updatedAt} /></DetailRow><DetailRow label="Cancelled"><Timestamp value={booking.cancelledAt} /></DetailRow><DetailRow label="Review requested"><Timestamp value={booking.reviewRequestSentAt} /></DetailRow><DetailRow label="Review submitted"><Timestamp value={booking.reviewSubmittedAt} /></DetailRow></dl>
          </div>
        </Panel>
      ))}
    </div>
  );
};

const OffersChatsTab = ({ offers, conversations }) => {
  if (!offers.length && !conversations.length) return <EmptyState icon={MessageCircle} text="This driver has not sent offers or started conversations." />;
  return (
    <div className="flex flex-col gap-5">
      <Panel title={`Offers (${offers.length})`} subtitle="All structured offers authored by this driver.">
        {offers.length ? <div className="divide-y divide-hairline">{offers.map((offer) => (
          <div key={offer.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_1fr_auto]">
            <div><div className="flex items-center gap-2"><b className="text-sm text-ink">{offer.vehicle?.model || 'Vehicle not available'}</b><span className={statusTag(offer.status)}>{offer.status}</span></div><p className="mt-1 text-xs text-muted">Traveller: {offer.traveler?.name || 'Unknown'} · {offer.totalKms ?? 0} km</p><p className="mt-1 font-mono text-[10px] text-muted-soft">Offer {offer.id} · Conversation {offer.conversationId || '—'}{offer.brief?.id ? ` · Brief ${offer.brief.id}` : ''}</p><p className="mt-2 whitespace-pre-wrap text-xs text-muted">{offer.body}</p></div>
            <div className="text-xs text-muted"><p>{formatDateTime(offer.startDate)} → {formatDateTime(offer.endDate)}</p><p className="mt-1">Extra kilometre: {formatCurrency(offer.pricePerExtraKm)}</p>{offer.warning ? <p className="mt-2 font-semibold text-rose-600">Warning: {offer.warning}</p> : null}</div>
            <div className="text-right"><b className="text-base text-ink">{formatCurrency(offer.totalPrice)}</b><p className="mt-1 text-[11px] text-muted-soft">Created <Timestamp value={offer.createdAt} /></p><p className="mt-1 text-[11px] text-muted-soft">Updated <Timestamp value={offer.updatedAt} /></p></div>
          </div>
        ))}</div> : <p className="text-sm text-muted">No offers.</p>}
      </Panel>

      <div className="flex flex-col gap-4">
        {conversations.map((conversation) => (
          <Panel key={conversation.id} title={conversation.traveler?.name || 'Traveller conversation'} subtitle={`${conversation.traveler?.email || 'No email'} · ${conversation.vehicle?.model || 'No vehicle selected'} · ${conversation.id}`} action={<span className={statusTag(conversation.status)}>{conversation.status}</span>}>
            <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted"><span>Created: <Timestamp value={conversation.createdAt} /></span><span>Updated: <Timestamp value={conversation.updatedAt} /></span><span>Last message: <Timestamp value={conversation.lastMessageAt} /></span><span>Driver messages: {conversation.messages?.length || 0}</span><span>Unread: traveller {conversation.travelerUnreadCount || 0}, driver {conversation.driverUnreadCount || 0}</span></div>
            {conversation.messages?.length ? <div className="space-y-2">{conversation.messages.map((message) => (
              <div key={message.id} className="rounded-xl bg-canvas p-3"><div className="flex items-center justify-between gap-3"><span className={statusTag(message.type === 'offer' ? message.offer?.status : 'active')}>{message.type}{message.offer?.status ? ` · ${message.offer.status}` : ''}</span><span className="text-[11px] text-muted-soft"><Timestamp value={message.createdAt} /></span></div><p className="mt-2 whitespace-pre-wrap text-[12.5px] text-ink">{message.body}</p>{message.warning ? <p className="mt-2 text-xs font-semibold text-rose-600">Warning: {message.warning}</p> : null}</div>
            ))}</div> : <p className="text-sm text-muted">No driver-authored messages in this conversation.</p>}
          </Panel>
        ))}
      </div>
    </div>
  );
};

const ReviewsTab = ({ reviews }) => {
  if (!reviews.length) return <EmptyState icon={Star} text="No reviews are associated with this driver." />;
  return <div className="grid gap-4 xl:grid-cols-2">{reviews.map((review) => (
    <Panel key={review.id} title={review.title || `${review.rating}/5 review`} subtitle={`${review.travelerName || review.traveler?.name || 'Traveller'} · ${review.vehicle?.model || 'Driver review'}`} action={<span className={statusTag(review.status)}>{review.status}</span>}>
      <div className="flex gap-1 text-amber-500">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-current' : 'text-muted-soft'}`} />)}</div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{review.comment}</p>
      {review.images?.length ? <div className="mt-3 flex gap-2 overflow-x-auto">{review.images.map((image) => <a key={image} href={image} target="_blank" rel="noreferrer"><img src={image} alt="" className="h-20 w-24 rounded-lg object-cover" /></a>)}</div> : null}
      <dl className="mt-4"><DetailRow label="Review ID" value={review.id} mono /><DetailRow label="Booking ID" value={review.booking} mono /><DetailRow label="Visit" value={[formatDateTime(review.visitedStartDate), formatDateTime(review.visitedEndDate)].join(' → ')} /><DetailRow label="Review date"><Timestamp value={review.reviewDate} /></DetailRow><DetailRow label="Submitted"><Timestamp value={review.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={review.updatedAt} /></DetailRow><DetailRow label="Published"><Timestamp value={review.publishedAt} /></DetailRow><DetailRow label="Created by admin" value={review.createdByAdmin ? 'Yes' : 'No'} /><DetailRow label="Featured" value={review.featured ? `Yes${review.featuredOrder != null ? ` · #${review.featuredOrder + 1}` : ''}` : 'No'} /><DetailRow label="Admin note" value={review.adminNote} /></dl>
    </Panel>
  ))}</div>;
};

const PaymentsTab = ({ commissions }) => {
  if (!commissions.length) return <EmptyState icon={Wallet} text="No commission or payment records exist for this driver." />;
  return <div className="flex flex-col gap-4">{commissions.map((commission) => (
    <Panel key={commission.id} title={commission.periodLabel} subtitle={`${commission.bookingCount || 0} completed bookings`} action={<span className={statusTag(commission.status)}>{commission.status}</span>}>
      <div className="grid gap-4 sm:grid-cols-4"><Stat value={formatCurrency(commission.totalGross)} label="Gross" /><Stat value={formatCurrency(commission.commissionDue)} label="Commission due" /><Stat value={formatCurrency(commission.driverEarnings)} label="Driver earnings" /><Stat value={`${Math.round(Number(commission.commissionRate || 0) * 100)}%`} label="Rate" /></div>
      <dl className="mt-5 grid gap-x-6 lg:grid-cols-2"><div><DetailRow label="Payment slip">{commission.paymentSlipUrl ? <a href={commission.paymentSlipUrl} target="_blank" rel="noreferrer" className="text-brand-dark hover:underline">{commission.paymentSlipFilename || 'Open payment slip'}</a> : null}</DetailRow><DetailRow label="Slip uploaded"><Timestamp value={commission.paymentSlipUploadedAt} /></DetailRow></div><div><DetailRow label="Admin note" value={commission.adminNote} /><DetailRow label="Recalculated"><Timestamp value={commission.lastRecalculatedAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={commission.updatedAt} /></DetailRow></div></dl>
    </Panel>
  ))}</div>;
};

const ActivityTab = ({ activity }) => {
  const [filter, setFilter] = useState('all');
  const types = useMemo(() => ['all', ...new Set(activity.map((entry) => entry.type))], [activity]);
  const filtered = filter === 'all' ? activity : activity.filter((entry) => entry.type === filter);
  return (
    <Panel title="Driver activity" subtitle="A chronological view reconstructed from timestamps stored across the platform.">
      <div className="mb-5 flex flex-wrap gap-2">{types.map((type) => <button key={type} type="button" onClick={() => setFilter(type)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${filter === type ? 'bg-brand text-white' : 'bg-canvas text-muted'}`}>{type}</button>)}</div>
      {filtered.length ? <ol className="relative ml-2 border-l border-line">{filtered.map((entry, index) => (
        <li key={`${entry.type}-${entry.timestamp}-${index}`} className="relative ml-5 pb-6 last:pb-0"><span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-surface" /><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[13px] font-bold text-ink">{entry.title}</p><div className="mt-1 flex flex-wrap gap-2">{entry.metadata?.status ? <span className={statusTag(entry.metadata.status)}>{entry.metadata.status}</span> : null}{entry.metadata?.actor ? <span className="text-xs text-muted">by {entry.metadata.actor}</span> : null}{entry.metadata?.warning ? <span className="text-xs font-semibold text-rose-600">Flagged</span> : null}</div></div><time className="text-[11.5px] font-semibold text-muted-soft"><Timestamp value={entry.timestamp} /></time></div></li>
      ))}</ol> : <p className="py-12 text-center text-sm text-muted">No matching activity.</p>}
    </Panel>
  );
};

const AdminDriverDetails = () => {
  const { driverId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const driversListPath = location.state?.from || '/admin?section=drivers';
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [actionLoading, setActionLoading] = useState('');
  const [modal, setModal] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [formError, setFormError] = useState('');
  const [licenseTypeChoice, setLicenseTypeChoice] = useState('');

  const loadDetails = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetchDriverDetails(driverId);
      setData(response);
    } catch (loadError) {
      setError(loadError?.message || 'Unable to load driver details.');
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);
  useEffect(() => { fetchCurrentUser().then((response) => setCurrentUser(response?.user || null)).catch(() => setCurrentUser(null)); }, []);

  const handleLogout = () => {
    clearStoredToken();
    toast.success('You have been logged out.');
    navigate('/login');
  };

  const closeModal = () => {
    if (actionLoading) return;
    setModal(null);
    setFormError('');
  };

  const runAction = async (key, action, successMessage) => {
    setActionLoading(key);
    try {
      await action();
      toast.success(successMessage);
      setModal(null);
      setFormError('');
      await loadDetails();
    } catch (actionError) {
      setFormError(actionError?.message || 'Unable to complete this action.');
      toast.error(actionError?.message || 'Unable to complete this action.');
    } finally {
      setActionLoading('');
    }
  };

  const changeStatus = (status) => runAction(`status-${status}`, () => updateDriverStatus(driverId, status), status === DRIVER_STATUS.APPROVED ? 'Driver approved.' : 'Driver status updated.');

  const openEdit = () => {
    const driver = data.driver;
    setEditForm({ name: driver.name || '', email: driver.email || '', contactNumber: driver.contactNumber || '', address: guessLocationName(driver.address) || driver.address || '', serviceAreas: driver.serviceAreas || [], experienceYears: driver.experienceYears ?? '', tripAdvisor: driver.tripAdvisor || '', description: driver.description || '', memberSince: formatDateInput(driver.memberSince) });
    setFormError('');
    setModal('edit');
  };

  const submitEdit = (event) => {
    event.preventDefault();
    const experience = editForm.experienceYears === '' ? undefined : Number(editForm.experienceYears);
    if (!editForm.name?.trim() || !/^\S+@\S+\.\S+$/.test(editForm.email || '')) return setFormError('Enter a name and valid email address.');
    if (experience !== undefined && (!Number.isFinite(experience) || experience < 0 || experience > 60)) return setFormError('Experience must be between 0 and 60 years.');
    return runAction('edit', () => updateDriverDetails(driverId, { ...editForm, name: editForm.name.trim(), email: editForm.email.trim(), experienceYears: experience, memberSince: editForm.memberSince || undefined }), 'Driver details updated.');
  };

  const submitEmail = (event) => {
    event.preventDefault();
    if (emailForm.subject.trim().length < 3 || emailForm.message.trim().length < 10) return setFormError('Enter a subject and a message of at least 10 characters.');
    return runAction('email', () => sendDriverEmail(driverId, { subject: emailForm.subject.trim(), message: emailForm.message.trim() }), 'Email sent to driver.');
  };

  const submitPassword = (event) => {
    event.preventDefault();
    if (!PASSWORD_RULE.test(passwordForm.password)) return setFormError('Use at least 8 characters with uppercase, lowercase and a number.');
    if (passwordForm.password !== passwordForm.confirm) return setFormError('Passwords do not match.');
    return runAction('password', () => setDriverPassword(driverId, passwordForm.password), 'Driver password updated.');
  };

  // Extra time on unpaid commission: no freeze for 7 more days (unfreezes now if frozen).
  const graceActive = Boolean(data?.driver?.commissionGraceUntil && new Date(data.driver.commissionGraceUntil) > new Date());
  const toggleCommissionGrace = () => {
    if (graceActive) {
      runAction('commission-grace', () => setDriverCommissionGrace(driverId, null), 'Extra time removed. The driver is frozen again if a month is still overdue.');
      return;
    }
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    runAction('commission-grace', () => setDriverCommissionGrace(driverId, until), 'Driver has 7 days extra time and is not frozen until then.');
  };

  // Remove a stale or wrong live location from the live map and profile.
  const clearLocation = () => {
    if (!window.confirm('Clear this driver\'s live location? It disappears from the live map until they share it again.')) return;
    runAction('clear-location', () => clearDriverLiveLocation(driverId), 'Live location cleared.');
  };

  // Freeze for an older unpaid month (before the automatic start, November 2026).
  const applyEnforceFrom = (from) =>
    runAction('commission-enforce', async () => {
      const result = await setDriverCommissionEnforceFrom(driverId, from);
      if (from && !result?.commissionFrozenAt) {
        throw new Error('No unpaid commission found from that month, so the driver was not frozen.');
      }
    }, from ? 'Driver frozen for unpaid commission. They unfreeze when the month is marked paid.' : 'Older months are no longer enforced for this driver.');

  const toggleEmailVerified = () => {
    const verified = Boolean(data.driver.isVerified);
    // Un-verifying blocks the driver's password sign-in, so ask first.
    if (verified && !window.confirm('Mark this driver\'s email as NOT verified? They won\'t be able to sign in with their password until it is verified again.')) {
      return;
    }
    runAction('email-verified', () => setDriverEmailVerified(driverId, !verified), verified ? 'Email marked as not verified.' : 'Email marked as verified. The driver can now sign in.');
  };
  const toggleBriefEmails = () => runAction('brief-emails', () => setDriverBriefAlertEmail(driverId, !data.driver.briefAlertEmailOptIn), data.driver.briefAlertEmailOptIn ? 'Brief emails back to the default for this driver.' : 'This driver will now get brief emails.');
  const toggleFeatured = () => runAction('featured', () => setDriverFeatured(driverId, !data.driver.featured), data.driver.featured ? 'Driver removed from the homepage.' : 'Driver added to the homepage.');

  const toggleSuspension = async () => {
    const paused = data.driver.messagingSuspendedUntil && new Date(data.driver.messagingSuspendedUntil) > new Date();
    if (paused) {
      if (!window.confirm(`Resume messaging for ${data.driver.name}?`)) return;
      await runAction('suspension', () => setDriverMessagingSuspension(driverId, { hours: 0, reason: '' }), 'Messaging restored.');
      return;
    }
    const reason = window.prompt(`Pause messaging for ${data.driver.name} for 24 hours.\n\nReason shown to the driver:`, 'Repeatedly sharing contact details in chat.');
    if (reason === null) return;
    await runAction('suspension', () => setDriverMessagingSuspension(driverId, { hours: 24, reason }), 'Messaging paused.');
  };

  const shell = (content, title = data?.driver?.name || 'Driver record') => (
    <AdminShell
      navGroups={ADMIN_NAV_GROUPS}
      activeSection="drivers"
      onSectionChange={(section) => navigate(section === 'overview' ? '/admin' : `/admin?section=${section}`)}
      currentUser={currentUser}
      onOpenProfile={() => navigate('/admin?section=profile')}
      onLogout={handleLogout}
      crumb="SUPPLY & PEOPLE / DRIVERS"
      title={title}
    >
      {content}
    </AdminShell>
  );

  if (loading) return shell(<div className="flex min-h-[440px] items-center justify-center rounded-[18px] bg-surface text-sm text-muted shadow-card"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading complete driver record…</div>);
  if (error || !data) return shell(<div className="flex min-h-[440px] flex-col items-center justify-center gap-4 rounded-[18px] bg-surface text-center shadow-card"><XCircle className="h-10 w-10 text-rose-500" /><div><h2 className="font-extrabold text-ink">Driver record unavailable</h2><p className="mt-1 text-sm text-muted">{error}</p></div><div className="flex gap-2"><button type="button" onClick={() => navigate(driversListPath)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink">Back to drivers</button><button type="button" onClick={loadDetails} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">Try again</button></div></div>, 'Driver record');

  const { driver, summary } = data;
  const paused = driver.messagingSuspendedUntil && new Date(driver.messagingSuspendedUntil) > new Date();
  const tabs = [
    ['overview', 'Overview', null],
    ['vehicles', 'Vehicles', data.vehicles.length],
    ['bookings', 'Bookings', data.bookings.length],
    ['offers', 'Offers & chats', data.offers.length + data.conversations.length],
    ['reviews', 'Reviews', data.reviews.length],
    ['payments', 'Payments', data.commissions.length],
    ['activity', 'Activity', data.activity.length],
  ];

  return shell(
    <>
      <button type="button" onClick={() => navigate(driversListPath)} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back to all drivers</button>

      <section className="rounded-[20px] bg-surface p-5 shadow-card">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            {driver.profilePhoto ? <img src={driver.profilePhoto} alt="" className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover" /> : <div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-2xl bg-canvas text-2xl font-extrabold text-muted">{driver.name.slice(0, 1).toUpperCase()}</div>}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-extrabold tracking-tight text-ink">{driver.name}</h2><span className={statusTag(driver.driverStatus)}>{driver.driverStatus}</span>{driver.licenseStatus ? <span className={statusTag(driver.licenseStatus)}>License {driver.licenseStatus}</span> : null}{driver.featured ? <span className={tagClass('amber')}>Featured</span> : null}{paused ? <span className={tagClass('red')}>Messaging paused</span> : null}</div>
              <p className="mt-2 text-sm font-semibold text-muted">{driver.email} · {driver.contactNumber || 'No contact number'} · {driver.address || 'No base location'}</p>
              <p className="mt-1 font-mono text-[11px] text-muted-soft">{driver.id}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {driver.driverStatus !== DRIVER_STATUS.APPROVED ? <button type="button" disabled={Boolean(actionLoading)} onClick={() => changeStatus(DRIVER_STATUS.APPROVED)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Approve</button> : null}
            {driver.driverStatus !== DRIVER_STATUS.REJECTED ? <button type="button" disabled={Boolean(actionLoading)} onClick={() => changeStatus(DRIVER_STATUS.REJECTED)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-600 disabled:opacity-60"><XCircle className="h-4 w-4" /> Reject</button> : null}
            <button type="button" onClick={() => { setEmailForm({ subject: '', message: '' }); setFormError(''); setModal('email'); }} className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-canvas"><Mail className="h-4 w-4" /> Email</button>
            <button type="button" onClick={openEdit} className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-canvas"><Pencil className="h-4 w-4" /> Edit</button>
            <Link to={`/drivers/${driver.id}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-canvas"><ExternalLink className="h-4 w-4" /> Public profile</Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><Stat value={summary.completedTrips} label="Completed trips" /><Stat value={summary.upcomingTrips} label="Upcoming" /><Stat value={summary.offerCount} label="Offers" /><Stat value={summary.averageRating ? `${summary.averageRating}/5` : '—'} label={`${summary.reviewCount} reviews`} /><Stat value={formatCurrency(summary.totalGross)} label="Booking value" /><Stat value={formatCurrency(summary.totalEarnings)} label="Driver earnings" /></div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
          <button type="button" disabled={Boolean(actionLoading)} onClick={toggleCommissionGrace} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-canvas disabled:opacity-60"><Clock className="h-4 w-4" /> {graceActive ? 'Remove commission extra time' : 'Give 7 days extra time (commission)'}</button>
          <button type="button" disabled={Boolean(actionLoading)} onClick={toggleEmailVerified} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-canvas disabled:opacity-60"><MailCheck className="h-4 w-4" /> {driver.isVerified ? 'Mark email not verified' : 'Mark email verified'}</button>
          <button type="button" disabled={Boolean(actionLoading)} onClick={toggleBriefEmails} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-canvas disabled:opacity-60"><Mail className="h-4 w-4" /> {driver.briefAlertEmailOptIn ? 'Stop brief emails' : 'Send brief emails'}</button>
          <button type="button" disabled={Boolean(actionLoading)} onClick={toggleFeatured} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-canvas disabled:opacity-60"><Star className={`h-4 w-4 ${driver.featured ? 'fill-amber-400 text-amber-500' : ''}`} /> {driver.featured ? 'Remove from homepage' : 'Feature on homepage'}</button>
          <button type="button" disabled={Boolean(actionLoading)} onClick={toggleSuspension} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-canvas disabled:opacity-60">{paused ? <Undo2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />} {paused ? 'Resume messaging' : 'Pause messaging'}</button>
          <button type="button" onClick={() => { setPasswordForm({ password: '', confirm: '' }); setFormError(''); setModal('password'); }} className="inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs font-bold text-ink hover:bg-canvas"><KeyRound className="h-4 w-4" /> Set password</button>
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto rounded-[16px] bg-surface p-1.5 shadow-card">{tabs.map(([id, label, count]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition ${activeTab === id ? 'bg-brand text-white' : 'text-muted hover:bg-canvas hover:text-ink'}`}>{label}{count != null ? ` (${count})` : ''}</button>)}</nav>

      {activeTab === 'overview' ? <DriverOverview data={data} onEdit={openEdit} onChangeLicenseType={() => { setLicenseTypeChoice(driver.licenseType || ''); setFormError(''); setModal('license-type'); }} onVerification={() => navigate(`/admin?section=verification&search=${encodeURIComponent(driver.email)}`)} onEnforceFrom={applyEnforceFrom} onClearLocation={clearLocation} onSaveCredentials={(credentials) => runAction('credentials', () => setDriverCredentials(driverId, credentials), 'Credentials saved.')} actionLoading={actionLoading} /> : null}
      {activeTab === 'vehicles' ? <VehiclesTab vehicles={data.vehicles} /> : null}
      {activeTab === 'bookings' ? <BookingsTab bookings={data.bookings} /> : null}
      {activeTab === 'offers' ? <OffersChatsTab offers={data.offers} conversations={data.conversations} /> : null}
      {activeTab === 'reviews' ? <ReviewsTab reviews={data.reviews} /> : null}
      {activeTab === 'payments' ? <PaymentsTab commissions={data.commissions} /> : null}
      {activeTab === 'activity' ? <ActivityTab activity={data.activity} /> : null}

      <AdminModal open={modal === 'edit'} onClose={closeModal} title="Edit driver details" subtitle="Account registration time remains unchanged; member since is a separate public date.">
        <form onSubmit={submitEdit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">{[['name', 'Full name', 'text'], ['email', 'Email', 'email'], ['contactNumber', 'Contact number', 'text'], ['experienceYears', 'Experience years', 'number'], ['memberSince', 'Member since', 'date']].map(([name, label, type]) => <label key={name} className={labelCls}>{label}<input name={name} type={type} min={name === 'experienceYears' ? 0 : undefined} max={name === 'experienceYears' ? 60 : undefined} value={editForm[name] ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, [name]: event.target.value }))} className={inputCls} /></label>)}</div><label className={labelCls}>Base location<LocationSelect value={editForm.address} onChange={(value) => setEditForm((current) => ({ ...current, address: value }))} className={inputCls} />{editForm.address && !guessLocationName(editForm.address) ? <span className="mt-1 block text-xs font-semibold text-amber-700">Current value &quot;{editForm.address}&quot; is not in the list. Choose a town.</span> : null}</label><div className={labelCls}>Also available in (up to 3)<div className="mt-1.5"><ServiceAreasPicker value={editForm.serviceAreas} onChange={(serviceAreas) => setEditForm((current) => ({ ...current, serviceAreas }))} /></div></div><label className={labelCls}>TripAdvisor link<input value={editForm.tripAdvisor || ''} onChange={(event) => setEditForm((current) => ({ ...current, tripAdvisor: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Bio<textarea rows={4} value={editForm.description || ''} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className={inputCls} /></label>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<button type="submit" disabled={Boolean(actionLoading)} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{actionLoading === 'edit' ? 'Saving…' : 'Save changes'}</button></form>
      </AdminModal>

      <AdminModal open={modal === 'email'} onClose={closeModal} title="Email driver" subtitle={`Send a direct administrative message to ${driver.email}.`}>
        <form onSubmit={submitEmail} className="space-y-4"><label className={labelCls}>Subject<input value={emailForm.subject} onChange={(event) => setEmailForm((current) => ({ ...current, subject: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Message<textarea rows={7} value={emailForm.message} onChange={(event) => setEmailForm((current) => ({ ...current, message: event.target.value }))} className={inputCls} /></label>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<button type="submit" disabled={Boolean(actionLoading)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Mail className="h-4 w-4" /> {actionLoading === 'email' ? 'Sending…' : 'Send email'}</button></form>
      </AdminModal>

      <AdminModal open={modal === 'license-type'} onClose={closeModal} title="Change license type" subtitle="Corrects the type on this driver's verification record. The verification status stays as it is.">
        <div className="space-y-4"><label className={labelCls}>License type<select value={licenseTypeChoice} onChange={(event) => setLicenseTypeChoice(event.target.value)} className={inputCls}>{!driver.licenseType ? <option value="">Not set</option> : null}{LICENSE_TYPE_OPTIONS.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink">Cancel</button><button type="button" disabled={Boolean(actionLoading) || !licenseTypeChoice || licenseTypeChoice === driver.licenseType} onClick={() => runAction('license-type', () => updateLicenseType(driver.id, licenseTypeChoice), `License type changed to ${licenseTypeChoice}.`)} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{actionLoading === 'license-type' ? 'Saving…' : 'Save type'}</button></div></div>
      </AdminModal>
      <AdminModal open={modal === 'password'} onClose={closeModal} title="Set driver password" subtitle="The driver will receive an email notifying them of the change.">
        <form onSubmit={submitPassword} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className={labelCls}>New password<input type="password" autoComplete="new-password" value={passwordForm.password} onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Confirm password<input type="password" autoComplete="new-password" value={passwordForm.confirm} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))} className={inputCls} /></label></div><p className="text-xs text-muted">At least 8 characters with uppercase, lowercase and a number.</p>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<button type="submit" disabled={Boolean(actionLoading)} className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"><KeyRound className="h-4 w-4" /> {actionLoading === 'password' ? 'Saving…' : 'Set password'}</button></form>
      </AdminModal>
    </>,
    driver.name
  );
};

export default AdminDriverDetails;

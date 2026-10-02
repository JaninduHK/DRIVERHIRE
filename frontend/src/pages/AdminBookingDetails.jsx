import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CalendarDays,
  Car,
  ClipboardList,
  ExternalLink,
  MessageCircle,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
  Wallet,
  XCircle,
} from 'lucide-react';
import { deleteBooking, fetchBookingDetails, updateBooking } from '../services/adminApi.js';
import { fetchCurrentUser } from '../services/profileApi.js';
import { clearStoredToken } from '../services/authToken.js';
import { calculateCancellationFee } from '../lib/cancellationPolicy.js';
import { VEHICLE_FEATURES } from '../constants/vehicleFeatures.js';
import AdminShell from './admin/AdminShell.jsx';
import AdminModal from './admin/AdminModal.jsx';
import { ADMIN_NAV_GROUPS } from './admin/adminNav.js';
import { formatCurrency, formatDateInput, formatDateTime, tagClass } from './admin/adminFormatters.js';

const STATUS_COLORS = {
  pending: 'amber',
  confirmed: 'green',
  approved: 'green',
  active: 'green',
  accepted: 'green',
  paid: 'green',
  cancelled: 'grey',
  rejected: 'red',
  declined: 'red',
  closed: 'grey',
};
const BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'rejected'];
const inputCls = 'mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';
const EMPTY = 'Not provided';

const statusTag = (status) => tagClass(STATUS_COLORS[status] || 'grey');
const percentage = (value) => `${((Number(value) || 0) * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;

const Panel = ({ title, subtitle, action, children, className = '' }) => (
  <section className={`rounded-[18px] bg-surface shadow-card ${className}`}>
    <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
      <div><h2 className="text-[15px] font-extrabold text-ink">{title}</h2>{subtitle ? <p className="mt-1 text-[11.5px] text-muted-soft">{subtitle}</p> : null}</div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const DetailRow = ({ label, value, children, mono = false }) => (
  <div className="grid gap-1 border-b border-hairline py-3 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[155px_1fr] sm:gap-4">
    <dt className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</dt>
    <dd className={`min-w-0 break-words text-[13px] font-semibold text-ink ${mono ? 'font-mono text-[12px]' : ''}`}>{children ?? value ?? <span className="font-normal text-muted-soft">{EMPTY}</span>}</dd>
  </div>
);

const Timestamp = ({ value }) => <span title={value || ''}>{formatDateTime(value)}</span>;

const Stat = ({ value, label }) => (
  <div className="rounded-2xl border border-hairline bg-surface px-4 py-4 shadow-card"><div className="text-xl font-extrabold text-ink">{value}</div><div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</div></div>
);

const EmptyState = ({ icon = ClipboardList, text }) => (
  <div className="flex min-h-[230px] flex-col items-center justify-center gap-2 rounded-[18px] bg-surface text-center text-sm text-muted shadow-card">
    {createElement(icon, { className: 'h-9 w-9 text-muted-soft' })}<p>{text}</p>
  </div>
);

const OverviewTab = ({ data, onEdit, recordPath }) => {
  const { booking, driver, vehicle, travelerAccount } = data;
  const cancellation = booking.status === 'cancelled' ? calculateCancellationFee(booking) : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <div className="flex flex-col gap-5">
        <Panel title="Trip itinerary" subtitle="Travel details supplied when this booking was placed." action={<button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-canvas"><Pencil className="h-3.5 w-3.5" /> Edit</button>}>
          <dl>
            <DetailRow label="Route" value={[booking.startPoint, booking.endPoint].filter(Boolean).join(' → ') || null} />
            <DetailRow label="Start"><Timestamp value={booking.startDate} /></DetailRow>
            <DetailRow label="End"><Timestamp value={booking.endDate} /></DetailRow>
            <DetailRow label="Duration" value={booking.totalDays != null ? `${booking.totalDays} day${booking.totalDays === 1 ? '' : 's'}` : null} />
            <DetailRow label="Flight number" value={booking.flightNumber} />
            <DetailRow label="Arrival time" value={booking.arrivalTime} />
            <DetailRow label="Departure time" value={booking.departureTime} />
            <DetailRow label="Special requests"><span className="whitespace-pre-wrap font-normal leading-relaxed text-muted">{booking.specialRequests || EMPTY}</span></DetailRow>
          </dl>
        </Panel>

        <Panel title="Pricing and commission" subtitle="The values frozen on this booking record.">
          <div className="grid gap-x-7 lg:grid-cols-2">
            <dl>
              <DetailRow label="Price per day" value={formatCurrency(booking.pricePerDay)} />
              <DetailRow label="Gross total" value={formatCurrency(booking.totalPrice)} />
              <DetailRow label="Discount label" value={booking.commissionDiscountLabel} />
              <DetailRow label="Discount rate" value={percentage(booking.commissionDiscountRate)} />
              <DetailRow label="Discount amount" value={formatCurrency(booking.discountAmount)} />
              <DetailRow label="Traveller payable" value={formatCurrency(booking.payableTotal)} />
            </dl>
            <dl>
              <DetailRow label="Base commission" value={percentage(booking.commissionBaseRate)} />
              <DetailRow label="Effective rate" value={percentage(booking.commissionRate)} />
              <DetailRow label="Commission due" value={formatCurrency(booking.commissionAmount)} />
              <DetailRow label="Driver earnings" value={formatCurrency(booking.driverEarnings)} />
              <DetailRow label="Discount ID" value={booking.commissionDiscountId} mono />
              <DetailRow label="Payment note"><span className="whitespace-pre-wrap font-normal text-muted">{booking.paymentNote || EMPTY}</span></DetailRow>
            </dl>
          </div>
        </Panel>

        {booking.status === 'cancelled' ? (
          <Panel title="Cancellation record" subtitle="Stored cancellation data and the calculated driver fee.">
            <dl>
              <DetailRow label="Cancelled by" value={booking.cancelledBy} />
              <DetailRow label="Cancelled at"><Timestamp value={booking.cancelledAt} /></DetailRow>
              <DetailRow label="Reason"><span className="whitespace-pre-wrap font-normal text-muted">{booking.cancellationReason || EMPTY}</span></DetailRow>
              <DetailRow label="Amount owed" value={cancellation?.amount == null ? null : formatCurrency(cancellation.amount)} />
              <DetailRow label="Policy result" value={cancellation?.label} />
            </dl>
          </Panel>
        ) : null}
      </div>

      <div className="flex flex-col gap-5">
        <Panel title="Traveller" subtitle="Contact captured on the booking and the linked platform account.">
          <dl>
            <DetailRow label="Full name" value={booking.traveler?.fullName} />
            <DetailRow label="Email" value={booking.traveler?.email} />
            <DetailRow label="Phone" value={booking.traveler?.phoneNumber} />
            <DetailRow label="Account ID" value={travelerAccount?.id || booking.travelerUser} mono />
            <DetailRow label="Account name" value={travelerAccount?.name} />
            <DetailRow label="Account contact" value={travelerAccount?.contactNumber} />
            <DetailRow label="Sign-in provider" value={travelerAccount?.authProvider} />
            <DetailRow label="Verified" value={travelerAccount ? (travelerAccount.isVerified ? 'Yes' : 'No') : null} />
            <DetailRow label="Registered"><Timestamp value={travelerAccount?.createdAt} /></DetailRow>
            {travelerAccount?.deletedAt ? <DetailRow label="Deleted"><Timestamp value={travelerAccount.deletedAt} /></DetailRow> : null}
          </dl>
        </Panel>

        <Panel title="Driver" subtitle="Assigned driver and verification summary.">
          {driver ? <><div className="mb-4 flex items-center gap-3">{driver.profilePhoto ? <img src={driver.profilePhoto} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-canvas text-lg font-extrabold text-muted">{driver.name?.slice(0, 1)}</div>}<div><b className="text-sm text-ink">{driver.name}</b><p className="text-xs text-muted-soft">{driver.email}</p></div></div><dl><DetailRow label="Driver ID" value={driver.id} mono /><DetailRow label="Phone" value={driver.contactNumber} /><DetailRow label="Base location" value={driver.address} /><DetailRow label="Driver status"><span className={statusTag(driver.driverStatus)}>{driver.driverStatus || 'unknown'}</span></DetailRow><DetailRow label="License">{driver.licenseStatus ? <span className={statusTag(driver.licenseStatus)}>{driver.licenseType || 'License'} · {driver.licenseStatus}</span> : null}</DetailRow><DetailRow label="Member since"><Timestamp value={driver.memberSince} /></DetailRow></dl><Link to={`/admin/drivers/${driver.id}`} state={{ from: recordPath }} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-dark hover:underline">Open full driver record <ExternalLink className="h-3.5 w-3.5" /></Link></> : <p className="text-sm text-muted">The assigned driver account is unavailable.</p>}
        </Panel>

        <Panel title="Vehicle" subtitle="Vehicle selected for this trip.">
          {vehicle ? <><div className="mb-4 flex items-center gap-3">{vehicle.images?.[0] ? <img src={vehicle.images[0]} alt="" className="h-16 w-20 rounded-xl object-cover" /> : <div className="grid h-16 w-20 place-items-center rounded-xl bg-canvas"><Car className="h-6 w-6 text-muted-soft" /></div>}<div><b className="text-sm text-ink">{vehicle.model}</b><p className="text-xs text-muted-soft">{vehicle.year || 'Year not set'} · {vehicle.seats || '—'} seats</p></div></div><dl><DetailRow label="Vehicle ID" value={vehicle.id} mono /><DetailRow label="Listing status"><span className={statusTag(vehicle.status)}>{vehicle.status || 'unknown'}</span></DetailRow><DetailRow label="Listed price" value={formatCurrency(vehicle.pricePerDay)} /><DetailRow label="Description"><span className="whitespace-pre-wrap font-normal text-muted">{vehicle.description || EMPTY}</span></DetailRow></dl><div className="mt-4 grid gap-2 sm:grid-cols-2">{VEHICLE_FEATURES.map(({ key, label }) => <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-canvas px-3 py-2 text-[11.5px] font-semibold text-ink"><span>{label}</span><span className={tagClass(vehicle[key] ? 'green' : 'grey')}>{vehicle[key] ? 'Yes' : 'No'}</span></div>)}</div><Link to={`/admin/vehicles/${vehicle.id}`} state={{ from: recordPath }} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-dark hover:underline">Open full vehicle record <ExternalLink className="h-3.5 w-3.5" /></Link></> : <p className="text-sm text-muted">The booked vehicle is unavailable.</p>}
        </Panel>

        <Panel title="Record timestamps" subtitle="Identifiers and exact timestamps stored for this booking.">
          <dl>
            <DetailRow label="Booking ID" value={booking.id} mono />
            <DetailRow label="Offer ID" value={booking.offerId} mono />
            <DetailRow label="Conversation ID" value={booking.conversationId} mono />
            <DetailRow label="Created"><Timestamp value={booking.createdAt} /></DetailRow>
            <DetailRow label="Updated"><Timestamp value={booking.updatedAt} /></DetailRow>
            <DetailRow label="Review requested"><Timestamp value={booking.reviewRequestSentAt} /></DetailRow>
            <DetailRow label="Review submitted"><Timestamp value={booking.reviewSubmittedAt} /></DetailRow>
          </dl>
        </Panel>
      </div>
    </div>
  );
};

const ConversationTab = ({ offer, conversation }) => {
  if (!offer && !conversation) return <EmptyState icon={MessageCircle} text="No offer or conversation is linked to this booking." />;
  return <div className="flex flex-col gap-5">
    <Panel title="Accepted offer" subtitle="The structured offer that originated this booking." action={offer ? <span className={statusTag(offer.status)}>{offer.status}</span> : null}>
      {offer ? <div className="grid gap-x-7 lg:grid-cols-2"><dl><DetailRow label="Offer ID" value={offer.id} mono /><DetailRow label="Driver" value={offer.driver?.name} /><DetailRow label="Vehicle" value={offer.vehicle?.model} /><DetailRow label="Start"><Timestamp value={offer.startDate} /></DetailRow><DetailRow label="End"><Timestamp value={offer.endDate} /></DetailRow><DetailRow label="Offer total" value={formatCurrency(offer.totalPrice)} /><DetailRow label="Distance" value={offer.totalKms != null ? `${offer.totalKms} km` : null} /><DetailRow label="Extra kilometre" value={offer.pricePerExtraKm != null ? formatCurrency(offer.pricePerExtraKm) : null} /></dl><dl><DetailRow label="Brief ID" value={offer.brief?.id} mono /><DetailRow label="Brief status" value={offer.brief?.status} /><DetailRow label="Brief route" value={[offer.brief?.startLocation, offer.brief?.endLocation].filter(Boolean).join(' → ') || null} /><DetailRow label="Brief country" value={offer.brief?.country} /><DetailRow label="Brief dates">{offer.brief ? <><Timestamp value={offer.brief.startDate} /> → <Timestamp value={offer.brief.endDate} /></> : null}</DetailRow><DetailRow label="Created"><Timestamp value={offer.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={offer.updatedAt} /></DetailRow><DetailRow label="Warning" value={offer.warning} /></dl><div className="lg:col-span-2 mt-4 rounded-xl bg-canvas p-4"><p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Offer message</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink">{offer.body || EMPTY}</p></div></div> : <p className="text-sm text-muted">No structured offer is attached.</p>}
    </Panel>
    <Panel title="Conversation" subtitle={conversation ? `${conversation.messages?.length || 0} messages linked to the traveller and driver.` : 'No conversation is attached.'} action={conversation ? <span className={statusTag(conversation.status)}>{conversation.status}</span> : null}>
      {conversation ? <><div className="grid gap-x-7 md:grid-cols-2 xl:grid-cols-3"><dl><DetailRow label="Conversation ID" value={conversation.id} mono /><DetailRow label="Traveller" value={conversation.traveler?.name} /><DetailRow label="Driver" value={conversation.driver?.name} /></dl><dl><DetailRow label="Created"><Timestamp value={conversation.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={conversation.updatedAt} /></DetailRow><DetailRow label="Last message"><Timestamp value={conversation.lastMessageAt} /></DetailRow></dl><dl><DetailRow label="Traveller unread" value={conversation.travelerUnreadCount} /><DetailRow label="Driver unread" value={conversation.driverUnreadCount} /><DetailRow label="Message count" value={conversation.messages?.length || 0} /></dl></div>{conversation.messages?.length ? <div className="mt-5 space-y-2 border-t border-hairline pt-5">{conversation.messages.map((message) => <article key={message.id} className="rounded-xl bg-canvas p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-extrabold text-ink">{message.sender?.name || message.senderRole || 'Unknown sender'}</span><span className={statusTag(message.offer?.status || (message.type === 'offer' ? 'pending' : 'active'))}>{message.type}{message.offer?.status ? ` · ${message.offer.status}` : ''}</span></div><span className="text-[11px] font-semibold text-muted-soft"><Timestamp value={message.createdAt} /></span></div><p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{message.body || EMPTY}</p>{message.offer ? <div className="mt-3 flex flex-wrap gap-4 rounded-lg border border-line bg-surface px-3 py-2 text-[11.5px] font-semibold text-muted"><span>{formatCurrency(message.offer.totalPrice)}</span><span>{message.offer.totalKms ?? '—'} km</span><span>{formatDateTime(message.offer.startDate)} → {formatDateTime(message.offer.endDate)}</span></div> : null}{message.warning ? <p className="mt-2 text-xs font-bold text-rose-600">Warning: {message.warning}</p> : null}</article>)}</div> : <p className="mt-5 border-t border-hairline pt-5 text-sm text-muted">No messages were found.</p>}</> : <p className="text-sm text-muted">No conversation is attached.</p>}
    </Panel>
  </div>;
};

const ReviewTab = ({ review, booking }) => {
  if (!review) return <EmptyState icon={Star} text={booking.reviewRequestSentAt ? 'A review was requested, but no review has been submitted.' : 'No review is associated with this booking.'} />;
  return <Panel title={review.title || `${review.rating}/5 traveller review`} subtitle={`Review ${review.id}`} action={<span className={statusTag(review.status)}>{review.status}</span>}><div className="flex gap-1 text-amber-500">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-5 w-5 ${index < review.rating ? 'fill-current' : 'text-muted-soft'}`} />)}</div><p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">{review.comment}</p>{review.images?.length ? <div className="mt-4 flex gap-3 overflow-x-auto">{review.images.map((image) => <a key={image} href={image} target="_blank" rel="noreferrer"><img src={image} alt="Review attachment" className="h-32 w-40 rounded-xl object-cover" /></a>)}</div> : null}<div className="mt-5 grid gap-x-7 border-t border-hairline pt-5 lg:grid-cols-2"><dl><DetailRow label="Traveller" value={review.travelerName || review.traveler?.name} /><DetailRow label="Traveller email" value={review.traveler?.email} /><DetailRow label="Driver" value={review.driver?.name} /><DetailRow label="Vehicle" value={review.vehicle?.model} /><DetailRow label="Visited"><Timestamp value={review.visitedStartDate} /> → <Timestamp value={review.visitedEndDate} /></DetailRow><DetailRow label="Review date"><Timestamp value={review.reviewDate} /></DetailRow></dl><dl><DetailRow label="Created by admin" value={review.createdByAdmin ? 'Yes' : 'No'} /><DetailRow label="Featured" value={review.featured ? `Yes${review.featuredOrder != null ? ` · position ${review.featuredOrder}` : ''}` : 'No'} /><DetailRow label="Admin note" value={review.adminNote} /><DetailRow label="Created"><Timestamp value={review.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={review.updatedAt} /></DetailRow><DetailRow label="Published"><Timestamp value={review.publishedAt} /></DetailRow></dl></div></Panel>;
};

const PaymentTab = ({ commission, booking }) => (
  <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
    <Panel title="This booking" subtitle="Financial contribution from this trip."><dl><DetailRow label="Gross total" value={formatCurrency(booking.totalPrice)} /><DetailRow label="Traveller payable" value={formatCurrency(booking.payableTotal)} /><DetailRow label="Commission rate" value={percentage(booking.commissionRate)} /><DetailRow label="Commission due" value={formatCurrency(booking.commissionAmount)} /><DetailRow label="Driver earnings" value={formatCurrency(booking.driverEarnings)} /><DetailRow label="Payment note" value={booking.paymentNote} /></dl></Panel>
    <Panel title="Driver payment period" subtitle="Aggregate commission record for the month in which this trip ends." action={commission ? <span className={statusTag(commission.status)}>{commission.status}</span> : null}>
      {commission ? <div className="grid gap-x-7 lg:grid-cols-2"><dl><DetailRow label="Commission ID" value={commission.id} mono /><DetailRow label="Period" value={commission.periodLabel} /><DetailRow label="Bookings" value={commission.bookingCount} /><DetailRow label="Period gross" value={formatCurrency(commission.totalGross)} /><DetailRow label="Average rate" value={percentage(commission.commissionRate)} /><DetailRow label="Commission due" value={formatCurrency(commission.commissionDue)} /><DetailRow label="Driver earnings" value={formatCurrency(commission.driverEarnings)} /></dl><dl><DetailRow label="Driver" value={commission.driver?.name} /><DetailRow label="Admin note" value={commission.adminNote} /><DetailRow label="Last recalculated"><Timestamp value={commission.lastRecalculatedAt} /></DetailRow><DetailRow label="Created"><Timestamp value={commission.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={commission.updatedAt} /></DetailRow><DetailRow label="Slip uploaded"><Timestamp value={commission.paymentSlipUploadedAt} /></DetailRow><DetailRow label="Payment slip">{commission.paymentSlipUrl ? <a href={commission.paymentSlipUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-dark hover:underline">{commission.paymentSlipFilename || 'Open payment slip'} <ExternalLink className="h-3.5 w-3.5" /></a> : null}</DetailRow></dl></div> : <div className="py-12 text-center"><Wallet className="mx-auto h-9 w-9 text-muted-soft" /><p className="mt-3 text-sm font-bold text-ink">No persisted payment record</p><p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-muted">A driver commission record has not been created for this booking’s completion month. The frozen booking amounts remain visible alongside this message.</p></div>}
    </Panel>
  </div>
);

const ActivityTab = ({ activity }) => {
  const [filter, setFilter] = useState('all');
  const types = useMemo(() => ['all', ...new Set(activity.map((entry) => entry.type))], [activity]);
  const filtered = filter === 'all' ? activity : activity.filter((entry) => entry.type === filter);
  return <Panel title="Booking activity" subtitle="A chronological timeline reconstructed from timestamps across linked records."><div className="mb-5 flex flex-wrap gap-2">{types.map((type) => <button key={type} type="button" onClick={() => setFilter(type)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${filter === type ? 'bg-brand text-white' : 'bg-canvas text-muted'}`}>{type}</button>)}</div>{filtered.length ? <ol className="relative ml-2 border-l border-line">{filtered.map((entry, index) => <li key={`${entry.type}-${entry.timestamp}-${index}`} className="relative ml-5 pb-6 last:pb-0"><span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-surface" /><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[13px] font-bold text-ink">{entry.title}</p><div className="mt-1 flex flex-wrap gap-2">{entry.metadata?.status ? <span className={statusTag(entry.metadata.status)}>{entry.metadata.status}</span> : null}{entry.metadata?.recordId ? <span className="font-mono text-[10.5px] text-muted-soft">{entry.metadata.recordId}</span> : null}{entry.metadata?.warning ? <span className="text-xs font-semibold text-rose-600">Flagged</span> : null}</div></div><time className="text-[11.5px] font-semibold text-muted-soft"><Timestamp value={entry.timestamp} /></time></div></li>)}</ol> : <p className="py-12 text-center text-sm text-muted">No matching activity.</p>}</Panel>;
};

const AdminBookingDetails = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const bookingsListPath = location.state?.from || '/admin?section=bookings';
  const recordPath = `/admin/bookings/${bookingId}`;
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [busy, setBusy] = useState('');
  const [modal, setModal] = useState(null);
  const [formError, setFormError] = useState('');
  const [editForm, setEditForm] = useState({});

  const loadDetails = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await fetchBookingDetails(bookingId)); }
    catch (loadError) { setError(loadError?.message || 'Unable to load booking details.'); }
    finally { setLoading(false); }
  }, [bookingId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);
  useEffect(() => { fetchCurrentUser().then((response) => setCurrentUser(response?.user || null)).catch(() => setCurrentUser(null)); }, []);

  const handleLogout = () => { clearStoredToken(); toast.success('You have been logged out.'); navigate('/login'); };
  const closeModal = () => { if (busy) return; setModal(null); setFormError(''); };
  const openEdit = () => {
    const booking = data.booking;
    setEditForm({
      status: booking.status || 'pending', startDate: formatDateInput(booking.startDate), endDate: formatDateInput(booking.endDate),
      pricePerDay: booking.pricePerDay ?? '', totalPrice: booking.totalPrice ?? '', paymentNote: booking.paymentNote || '',
      startPoint: booking.startPoint || '', endPoint: booking.endPoint || '', specialRequests: booking.specialRequests || '',
      flightNumber: booking.flightNumber || '', arrivalTime: booking.arrivalTime || '', departureTime: booking.departureTime || '',
    });
    setFormError(''); setModal('edit');
  };
  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editForm.startDate || !editForm.endDate) return setFormError('Start and end dates are required.');
    if (new Date(editForm.endDate) < new Date(editForm.startDate)) return setFormError('End date cannot be before the start date.');
    const pricePerDay = Number(editForm.pricePerDay); const totalPrice = Number(editForm.totalPrice);
    if (!Number.isFinite(pricePerDay) || pricePerDay < 0) return setFormError('Enter a valid price per day.');
    if (!Number.isFinite(totalPrice) || totalPrice < 0) return setFormError('Enter a valid total price.');
    setBusy('edit'); setFormError('');
    try {
      await updateBooking(bookingId, { ...editForm, pricePerDay, totalPrice });
      toast.success('Booking updated.'); setModal(null); await loadDetails();
    } catch (actionError) { setFormError(actionError?.message || 'Unable to update booking.'); toast.error(actionError?.message || 'Unable to update booking.'); }
    finally { setBusy(''); }
  };
  const confirmDelete = async () => {
    setBusy('delete'); setFormError('');
    try { await deleteBooking(bookingId); toast.success('Booking deleted.'); navigate(bookingsListPath); }
    catch (actionError) { setFormError(actionError?.message || 'Unable to delete booking.'); toast.error(actionError?.message || 'Unable to delete booking.'); setBusy(''); }
  };

  const shell = (content, title = data?.booking ? `${data.booking.traveler?.fullName || 'Traveller'} booking` : 'Booking record') => <AdminShell navGroups={ADMIN_NAV_GROUPS} activeSection="bookings" onSectionChange={(section) => navigate(section === 'overview' ? '/admin' : `/admin?section=${section}`)} currentUser={currentUser} onOpenProfile={() => navigate('/admin?section=profile')} onLogout={handleLogout} crumb="MARKETPLACE / BOOKINGS" title={title}>{content}</AdminShell>;

  if (loading) return shell(<div className="flex min-h-[440px] items-center justify-center rounded-[18px] bg-surface text-sm text-muted shadow-card"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading complete booking record…</div>);
  if (error || !data) return shell(<div className="flex min-h-[440px] flex-col items-center justify-center gap-4 rounded-[18px] bg-surface text-center shadow-card"><XCircle className="h-10 w-10 text-rose-500" /><div><h2 className="font-extrabold text-ink">Booking record unavailable</h2><p className="mt-1 text-sm text-muted">{error}</p></div><div className="flex gap-2"><button type="button" onClick={() => navigate(bookingsListPath)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink">Back to bookings</button><button type="button" onClick={loadDetails} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">Try again</button></div></div>, 'Booking record');

  const { booking } = data;
  const cancellation = booking.status === 'cancelled' ? calculateCancellationFee(booking) : null;
  const tabs = [['overview', 'Overview', null], ['conversation', 'Offer & chat', data.conversation?.messages?.length || (data.offer ? 1 : 0)], ['review', 'Review', data.review ? 1 : 0], ['payment', 'Payment', data.commission ? 1 : 0], ['activity', 'Activity', data.activity.length]];

  return shell(<>
    <button type="button" onClick={() => navigate(bookingsListPath)} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back to all bookings</button>
    <section className="rounded-[20px] bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4"><div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-2xl bg-canvas"><CalendarDays className="h-8 w-8 text-brand-dark" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-extrabold tracking-tight text-ink">{booking.traveler?.fullName || 'Traveller booking'}</h2><span className={statusTag(booking.status)}>{booking.status}</span></div><p className="mt-2 text-sm font-semibold text-muted">{booking.startPoint || 'Start not set'} → {booking.endPoint || 'End not set'} · {booking.driver?.name || 'Unassigned driver'} · {booking.vehicle?.model || 'Vehicle unavailable'}</p><p className="mt-1 font-mono text-[11px] text-muted-soft">{booking.id}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={openEdit} className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-canvas"><Pencil className="h-4 w-4" /> Edit booking</button><button type="button" onClick={() => { setFormError(''); setModal('delete'); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-600"><Trash2 className="h-4 w-4" /> Delete</button></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><Stat value={`${booking.totalDays || 0}`} label="Trip days" /><Stat value={formatCurrency(booking.totalPrice)} label="Gross total" /><Stat value={formatCurrency(booking.payableTotal)} label="Traveller pays" /><Stat value={formatCurrency(booking.commissionAmount)} label="Commission" /><Stat value={formatCurrency(booking.driverEarnings)} label="Driver earnings" /><Stat value={cancellation?.amount != null ? formatCurrency(cancellation.amount) : (data.review ? `${data.review.rating}/5` : '—')} label={cancellation?.amount != null ? 'Cancellation fee' : 'Review'} /></div>
    </section>
    <nav className="flex gap-1 overflow-x-auto rounded-[16px] bg-surface p-1.5 shadow-card">{tabs.map(([id, label, count]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition ${activeTab === id ? 'bg-brand text-white' : 'text-muted hover:bg-canvas hover:text-ink'}`}>{label}{count != null ? ` (${count})` : ''}</button>)}</nav>
    {activeTab === 'overview' ? <OverviewTab data={data} onEdit={openEdit} recordPath={recordPath} /> : null}
    {activeTab === 'conversation' ? <ConversationTab offer={data.offer} conversation={data.conversation} /> : null}
    {activeTab === 'review' ? <ReviewTab review={data.review} booking={booking} /> : null}
    {activeTab === 'payment' ? <PaymentTab commission={data.commission} booking={booking} /> : null}
    {activeTab === 'activity' ? <ActivityTab activity={data.activity} /> : null}

    <AdminModal open={modal === 'edit'} onClose={closeModal} title="Edit booking" subtitle="Update trip, status, traveller instructions and frozen pricing." widthClass="sm:max-w-4xl"><form onSubmit={submitEdit} className="space-y-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className={labelCls}>Status<select value={editForm.status || 'pending'} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} className={inputCls}>{BOOKING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className={labelCls}>Start date<input type="date" value={editForm.startDate || ''} onChange={(event) => setEditForm((current) => ({ ...current, startDate: event.target.value }))} className={inputCls} /></label><label className={labelCls}>End date<input type="date" value={editForm.endDate || ''} onChange={(event) => setEditForm((current) => ({ ...current, endDate: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Flight number<input maxLength={40} value={editForm.flightNumber || ''} onChange={(event) => setEditForm((current) => ({ ...current, flightNumber: event.target.value }))} className={inputCls} /></label></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className={labelCls}>Start point<input maxLength={200} value={editForm.startPoint || ''} onChange={(event) => setEditForm((current) => ({ ...current, startPoint: event.target.value }))} className={inputCls} /></label><label className={labelCls}>End point<input maxLength={200} value={editForm.endPoint || ''} onChange={(event) => setEditForm((current) => ({ ...current, endPoint: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Arrival time<input maxLength={80} value={editForm.arrivalTime || ''} onChange={(event) => setEditForm((current) => ({ ...current, arrivalTime: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Departure time<input maxLength={80} value={editForm.departureTime || ''} onChange={(event) => setEditForm((current) => ({ ...current, departureTime: event.target.value }))} className={inputCls} /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className={labelCls}>Price per day<input type="number" min="0" step="0.01" value={editForm.pricePerDay ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, pricePerDay: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Total price<input type="number" min="0" step="0.01" value={editForm.totalPrice ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, totalPrice: event.target.value }))} className={inputCls} /></label></div><label className={labelCls}>Special requests<textarea rows={4} maxLength={1000} value={editForm.specialRequests || ''} onChange={(event) => setEditForm((current) => ({ ...current, specialRequests: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Payment note<textarea rows={3} maxLength={500} value={editForm.paymentNote || ''} onChange={(event) => setEditForm((current) => ({ ...current, paymentNote: event.target.value }))} className={inputCls} /></label>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink">Cancel</button><button type="submit" disabled={Boolean(busy)} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy === 'edit' ? 'Saving…' : 'Save changes'}</button></div></form></AdminModal>
    <AdminModal open={modal === 'delete'} onClose={closeModal} title="Delete booking permanently?" subtitle="This operation cannot be undone."><div className="space-y-4"><div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-700"><b>Booking {booking.id}</b> and any review linked to it will be deleted. The driver, traveller, vehicle, offer, and conversation accounts will remain.</div>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink">Keep booking</button><button type="button" disabled={Boolean(busy)} onClick={confirmDelete} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Trash2 className="h-4 w-4" /> {busy === 'delete' ? 'Deleting…' : 'Delete booking'}</button></div></div></AdminModal>
  </>, `${booking.traveler?.fullName || 'Traveller'} booking`);
};

export default AdminBookingDetails;

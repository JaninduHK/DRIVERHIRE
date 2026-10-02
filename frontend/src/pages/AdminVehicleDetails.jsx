import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Image as ImageIcon,
  MessageCircle,
  Pencil,
  RefreshCw,
  Star,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import {
  addVehicleImages,
  deleteVehicle,
  fetchVehicleDetails,
  removeVehicleImage,
  updateVehicleDetails,
  updateVehicleStatus,
} from '../services/adminApi.js';
import { fetchCurrentUser } from '../services/profileApi.js';
import { clearStoredToken } from '../services/authToken.js';
import { VEHICLE_FEATURES } from '../constants/vehicleFeatures.js';
import AdminShell from './admin/AdminShell.jsx';
import AdminModal from './admin/AdminModal.jsx';
import VehicleAvailabilitySection from './admin/VehicleAvailabilitySection.jsx';
import { ADMIN_NAV_GROUPS } from './admin/adminNav.js';
import { formatCurrency, formatDateTime, tagClass } from './admin/adminFormatters.js';

const STATUS_COLORS = { pending: 'amber', approved: 'green', confirmed: 'green', active: 'green', accepted: 'green', available: 'green', rejected: 'red', cancelled: 'red', declined: 'red', unavailable: 'red', closed: 'grey' };
const inputCls = 'mt-1 w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10';
const labelCls = 'block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft';
const EMPTY = 'Not provided';

const statusTag = (status) => tagClass(STATUS_COLORS[status] || 'grey');

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
  <div className="grid gap-1 border-b border-hairline py-3 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[150px_1fr] sm:gap-4">
    <dt className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</dt>
    <dd className={`min-w-0 break-words text-[13px] font-semibold text-ink ${mono ? 'font-mono text-[12px]' : ''}`}>{children ?? value ?? <span className="font-normal text-muted-soft">{EMPTY}</span>}</dd>
  </div>
);

const EmptyState = ({ icon = ClipboardList, text }) => (
  <div className="flex min-h-[230px] flex-col items-center justify-center gap-2 rounded-[18px] bg-surface text-center text-sm text-muted shadow-card">
    {createElement(icon, { className: 'h-9 w-9 text-muted-soft' })}<p>{text}</p>
  </div>
);

const Stat = ({ value, label }) => (
  <div className="rounded-2xl border border-hairline bg-surface px-4 py-4 shadow-card"><div className="text-xl font-extrabold text-ink">{value}</div><div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</div></div>
);

const Timestamp = ({ value }) => <span title={value || ''}>{formatDateTime(value)}</span>;

const VehicleOverview = ({ vehicle, onEdit, onUpload, onRemoveImage, busy }) => (
  <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
    <div className="flex flex-col gap-5">
      <Panel
        title="Vehicle images"
        subtitle={`${vehicle.images?.length || 0} of 5 images uploaded.`}
        action={
          <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-canvas ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            <Upload className="h-3.5 w-3.5" /> Add images
            <input type="file" accept="image/*" multiple className="sr-only" disabled={busy} onChange={(event) => { onUpload(event.target.files); event.target.value = ''; }} />
          </label>
        }
      >
        {vehicle.images?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehicle.images.map((image, index) => (
              <div key={image} className={`group relative overflow-hidden rounded-xl border border-hairline ${index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}`}>
                <a href={image} target="_blank" rel="noreferrer"><img src={image} alt={`${vehicle.model} ${index + 1}`} className={`w-full object-cover ${index === 0 ? 'h-64' : 'h-40'}`} /></a>
                <button type="button" disabled={busy} onClick={() => onRemoveImage(image)} className="absolute right-2 top-2 rounded-lg bg-surface/95 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100 disabled:opacity-60">Remove</button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-[260px] place-items-center rounded-xl bg-canvas"><div className="text-center text-muted-soft"><ImageIcon className="mx-auto h-10 w-10" /><p className="mt-2 text-sm">No images uploaded.</p></div></div>
        )}
      </Panel>

      <Panel title="Vehicle information" subtitle="Details supplied by the driver and displayed in the marketplace." action={<button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-canvas"><Pencil className="h-3.5 w-3.5" /> Edit</button>}>
        <dl>
          <DetailRow label="Vehicle ID" value={vehicle.id} mono />
          <DetailRow label="Model" value={vehicle.model} />
          <DetailRow label="Year" value={vehicle.year} />
          <DetailRow label="Price per day" value={formatCurrency(vehicle.pricePerDay)} />
          <DetailRow label="Seats" value={vehicle.seats} />
          <DetailRow label="Description"><span className="whitespace-pre-wrap font-normal leading-relaxed text-muted">{vehicle.description || EMPTY}</span></DetailRow>
        </dl>
      </Panel>

      <Panel title="Included services" subtitle="The exact inclusions configured on this vehicle.">
        <div className="grid gap-2 sm:grid-cols-2">{VEHICLE_FEATURES.map(({ key, label }) => <div key={key} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3.5 py-3"><span className="text-[12.5px] font-semibold text-ink">{label}</span><span className={tagClass(vehicle[key] ? 'green' : 'grey')}>{vehicle[key] ? 'Included' : 'Not included'}</span></div>)}</div>
      </Panel>
    </div>

    <div className="flex flex-col gap-5">
      <Panel title="Owner" subtitle="The driver account that owns this listing.">
        {vehicle.driver ? <><div className="mb-4 flex items-center gap-3">{vehicle.driver.profilePhoto ? <img src={vehicle.driver.profilePhoto} alt="" className="h-14 w-14 rounded-xl object-cover" /> : <div className="grid h-14 w-14 place-items-center rounded-xl bg-canvas text-lg font-extrabold text-muted">{vehicle.driver.name?.slice(0, 1)}</div>}<div><b className="text-sm text-ink">{vehicle.driver.name}</b><p className="text-xs text-muted-soft">{vehicle.driver.email}</p></div></div><dl><DetailRow label="Driver ID" value={vehicle.driver.id} mono /><DetailRow label="Contact" value={vehicle.driver.contactNumber} /><DetailRow label="Base location" value={vehicle.driver.address} /><DetailRow label="Driver status"><span className={statusTag(vehicle.driver.driverStatus)}>{vehicle.driver.driverStatus}</span></DetailRow><DetailRow label="License">{vehicle.driver.licenseStatus ? <span className={statusTag(vehicle.driver.licenseStatus)}>{vehicle.driver.licenseType || 'License'} · {vehicle.driver.licenseStatus}</span> : null}</DetailRow><DetailRow label="Member since"><Timestamp value={vehicle.driver.memberSince} /></DetailRow></dl><Link to={`/admin/drivers/${vehicle.driver.id}`} state={{ from: `/admin/vehicles/${vehicle.id}` }} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-dark hover:underline">Open full driver record <ExternalLink className="h-3.5 w-3.5" /></Link></> : <p className="text-sm text-muted">The owner account is unavailable.</p>}
      </Panel>

      <Panel title="Approval and moderation" subtitle="Current listing state and its latest administrator review.">
        <dl><DetailRow label="Status"><span className={statusTag(vehicle.status)}>{vehicle.status}</span></DetailRow><DetailRow label="Rejection reason" value={vehicle.rejectedReason} /><DetailRow label="Reviewed"><Timestamp value={vehicle.reviewedAt} /></DetailRow><DetailRow label="Reviewed by" value={vehicle.reviewedBy?.name} /><DetailRow label="Reviewer email" value={vehicle.reviewedBy?.email} /></dl>
      </Panel>

      <Panel title="Availability summary" subtitle="Driver-created date ranges stored on this vehicle.">
        <div className="grid grid-cols-2 gap-3"><Stat value={vehicle.availability?.length || 0} label="Total entries" /><Stat value={vehicle.availability?.filter((entry) => entry.status === 'unavailable').length || 0} label="Blocked ranges" /></div>
        {vehicle.availability?.length ? <div className="mt-4 divide-y divide-hairline">{vehicle.availability.slice(0, 5).map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 py-2.5"><div><p className="text-xs font-bold text-ink">{formatDateTime(entry.startDate)} → {formatDateTime(entry.endDate)}</p><p className="text-[11px] text-muted-soft">{entry.note || 'No note'}</p></div><span className={statusTag(entry.status)}>{entry.status}</span></div>)}</div> : <p className="mt-4 text-xs text-muted">No availability ranges have been set.</p>}
      </Panel>

      <Panel title="Record timestamps" subtitle="Exact timestamps stored on the vehicle record.">
        <dl><DetailRow label="Created"><Timestamp value={vehicle.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={vehicle.updatedAt} /></DetailRow><DetailRow label="Reviewed"><Timestamp value={vehicle.reviewedAt} /></DetailRow></dl>
      </Panel>
    </div>
  </div>
);

const BookingsTab = ({ bookings }) => {
  if (!bookings.length) return <EmptyState icon={CalendarDays} text="No bookings are associated with this vehicle." />;
  return <div className="flex flex-col gap-4">{bookings.map((booking) => (
    <Panel key={booking.id} title={`${booking.startPoint || 'Start not set'} → ${booking.endPoint || 'End not set'}`} subtitle={`Booking ${booking.id}`} action={<span className={statusTag(booking.status)}>{booking.status}</span>}>
      <div className="grid gap-x-6 lg:grid-cols-3"><dl><DetailRow label="Traveller" value={booking.traveler?.fullName} /><DetailRow label="Email" value={booking.traveler?.email} /><DetailRow label="Phone" value={booking.traveler?.phoneNumber} /><DetailRow label="Driver" value={booking.driver?.name} /></dl><dl><DetailRow label="Trip starts"><Timestamp value={booking.startDate} /></DetailRow><DetailRow label="Trip ends"><Timestamp value={booking.endDate} /></DetailRow><DetailRow label="Duration" value={booking.totalDays != null ? `${booking.totalDays} days` : null} /><DetailRow label="Flight" value={booking.flightNumber} /><DetailRow label="Arrival / departure" value={[booking.arrivalTime, booking.departureTime].filter(Boolean).join(' / ') || null} /></dl><dl><DetailRow label="Price per day" value={formatCurrency(booking.pricePerDay)} /><DetailRow label="Gross" value={formatCurrency(booking.totalPrice)} /><DetailRow label="Discount" value={formatCurrency(booking.discountAmount)} /><DetailRow label="Commission" value={formatCurrency(booking.commissionAmount)} /><DetailRow label="Driver earnings" value={formatCurrency(booking.driverEarnings)} /></dl></div>
      <div className="mt-4 grid gap-x-6 border-t border-hairline pt-4 lg:grid-cols-2"><dl><DetailRow label="Special requests" value={booking.specialRequests} /><DetailRow label="Payment note" value={booking.paymentNote} /><DetailRow label="Cancellation" value={booking.cancellationReason} /><DetailRow label="Cancelled by" value={booking.cancelledBy} /></dl><dl><DetailRow label="Created"><Timestamp value={booking.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={booking.updatedAt} /></DetailRow><DetailRow label="Cancelled"><Timestamp value={booking.cancelledAt} /></DetailRow><DetailRow label="Review requested"><Timestamp value={booking.reviewRequestSentAt} /></DetailRow><DetailRow label="Review submitted"><Timestamp value={booking.reviewSubmittedAt} /></DetailRow></dl></div>
    </Panel>
  ))}</div>;
};

const ReviewsTab = ({ reviews }) => {
  if (!reviews.length) return <EmptyState icon={Star} text="No reviews are associated with this vehicle." />;
  return <div className="grid gap-4 xl:grid-cols-2">{reviews.map((review) => (
    <Panel key={review.id} title={review.title || `${review.rating}/5 review`} subtitle={`${review.travelerName || review.traveler?.name || 'Traveller'} · ${review.id}`} action={<span className={statusTag(review.status)}>{review.status}</span>}>
      <div className="flex gap-1 text-amber-500">{Array.from({ length: 5 }, (_, index) => <Star key={index} className={`h-4 w-4 ${index < review.rating ? 'fill-current' : 'text-muted-soft'}`} />)}</div><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{review.comment}</p>
      {review.images?.length ? <div className="mt-3 flex gap-2 overflow-x-auto">{review.images.map((image) => <a key={image} href={image} target="_blank" rel="noreferrer"><img src={image} alt="" className="h-20 w-24 rounded-lg object-cover" /></a>)}</div> : null}
      <dl className="mt-4"><DetailRow label="Booking ID" value={review.booking} mono /><DetailRow label="Review date"><Timestamp value={review.reviewDate} /></DetailRow><DetailRow label="Visit" value={`${formatDateTime(review.visitedStartDate)} → ${formatDateTime(review.visitedEndDate)}`} /><DetailRow label="Created"><Timestamp value={review.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={review.updatedAt} /></DetailRow><DetailRow label="Published"><Timestamp value={review.publishedAt} /></DetailRow><DetailRow label="Admin note" value={review.adminNote} /><DetailRow label="Featured" value={review.featured ? 'Yes' : 'No'} /></dl>
    </Panel>
  ))}</div>;
};

const ConversationsTab = ({ offers, conversations }) => {
  if (!offers.length && !conversations.length) return <EmptyState icon={MessageCircle} text="No offers or conversations reference this vehicle." />;
  return <div className="flex flex-col gap-5">
    <Panel title={`Offers (${offers.length})`} subtitle="Structured offers that selected this vehicle.">
      {offers.length ? <div className="divide-y divide-hairline">{offers.map((offer) => <div key={offer.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[1fr_1fr_auto]"><div><div className="flex items-center gap-2"><b className="text-sm text-ink">{offer.driver?.name || 'Driver'}</b><span className={statusTag(offer.status)}>{offer.status}</span></div><p className="mt-1 text-xs text-muted">Traveller: {offer.traveler?.name || 'Unknown'} · {offer.totalKms ?? 0} km</p><p className="mt-1 font-mono text-[10px] text-muted-soft">{offer.id} · Conversation {offer.conversationId || '—'}</p><p className="mt-2 whitespace-pre-wrap text-xs text-muted">{offer.body}</p></div><div className="text-xs text-muted"><p>{formatDateTime(offer.startDate)} → {formatDateTime(offer.endDate)}</p><p className="mt-1">Extra kilometre: {formatCurrency(offer.pricePerExtraKm)}</p>{offer.warning ? <p className="mt-2 font-semibold text-rose-600">Warning: {offer.warning}</p> : null}</div><div className="text-right"><b className="text-base text-ink">{formatCurrency(offer.totalPrice)}</b><p className="mt-1 text-[11px] text-muted-soft"><Timestamp value={offer.createdAt} /></p></div></div>)}</div> : <p className="text-sm text-muted">No offers.</p>}
    </Panel>
    {conversations.map((conversation) => <Panel key={conversation.id} title={conversation.traveler?.name || 'Traveller conversation'} subtitle={`${conversation.driver?.name || 'Unknown driver'} · ${conversation.traveler?.email || 'No email'} · ${conversation.id}`} action={<span className={statusTag(conversation.status)}>{conversation.status}</span>}><div className="mb-4 flex flex-wrap gap-4 text-xs text-muted"><span>Created: <Timestamp value={conversation.createdAt} /></span><span>Updated: <Timestamp value={conversation.updatedAt} /></span><span>Last message: <Timestamp value={conversation.lastMessageAt} /></span><span>Messages: {conversation.messages?.length || 0}</span><span>Unread: traveller {conversation.travelerUnreadCount || 0}, driver {conversation.driverUnreadCount || 0}</span></div>{conversation.messages?.length ? <div className="space-y-2">{conversation.messages.map((message) => <div key={message.id} className="rounded-xl bg-canvas p-3"><div className="flex items-center justify-between gap-3"><span className={statusTag(message.type === 'offer' ? message.offer?.status : 'active')}>{message.sender?.name || message.senderRole} · {message.type}{message.offer?.status ? ` · ${message.offer.status}` : ''}</span><span className="text-[11px] text-muted-soft"><Timestamp value={message.createdAt} /></span></div><p className="mt-2 whitespace-pre-wrap text-[12.5px] text-ink">{message.body}</p>{message.warning ? <p className="mt-2 text-xs font-semibold text-rose-600">Warning: {message.warning}</p> : null}</div>)}</div> : <p className="text-sm text-muted">No messages in this conversation.</p>}</Panel>)}
  </div>;
};

const ActivityTab = ({ activity }) => {
  const [filter, setFilter] = useState('all');
  const types = useMemo(() => ['all', ...new Set(activity.map((entry) => entry.type))], [activity]);
  const filtered = filter === 'all' ? activity : activity.filter((entry) => entry.type === filter);
  return <Panel title="Vehicle activity" subtitle="A chronological view reconstructed from timestamps stored across the platform."><div className="mb-5 flex flex-wrap gap-2">{types.map((type) => <button key={type} type="button" onClick={() => setFilter(type)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${filter === type ? 'bg-brand text-white' : 'bg-canvas text-muted'}`}>{type}</button>)}</div>{filtered.length ? <ol className="relative ml-2 border-l border-line">{filtered.map((entry, index) => <li key={`${entry.type}-${entry.timestamp}-${index}`} className="relative ml-5 pb-6 last:pb-0"><span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-surface" /><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[13px] font-bold text-ink">{entry.title}</p><div className="mt-1 flex flex-wrap gap-2">{entry.metadata?.status ? <span className={statusTag(entry.metadata.status)}>{entry.metadata.status}</span> : null}{entry.metadata?.actor ? <span className="text-xs text-muted">by {entry.metadata.actor}</span> : null}{entry.metadata?.warning ? <span className="text-xs font-semibold text-rose-600">Flagged</span> : null}</div></div><time className="text-[11.5px] font-semibold text-muted-soft"><Timestamp value={entry.timestamp} /></time></div></li>)}</ol> : <p className="py-12 text-center text-sm text-muted">No matching activity.</p>}</Panel>;
};

const AdminVehicleDetails = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const vehiclesListPath = location.state?.from || '/admin?section=vehicles';
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [busy, setBusy] = useState('');
  const [modal, setModal] = useState(null);
  const [formError, setFormError] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [editForm, setEditForm] = useState({});

  const loadDetails = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await fetchVehicleDetails(vehicleId)); }
    catch (loadError) { setError(loadError?.message || 'Unable to load vehicle details.'); }
    finally { setLoading(false); }
  }, [vehicleId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);
  useEffect(() => { fetchCurrentUser().then((response) => setCurrentUser(response?.user || null)).catch(() => setCurrentUser(null)); }, []);

  const handleLogout = () => { clearStoredToken(); toast.success('You have been logged out.'); navigate('/login'); };
  const closeModal = () => { if (busy) return; setModal(null); setFormError(''); };
  const runAction = async (key, action, successMessage) => {
    setBusy(key);
    try { await action(); toast.success(successMessage); setModal(null); setFormError(''); await loadDetails(); }
    catch (actionError) { setFormError(actionError?.message || 'Unable to complete this action.'); toast.error(actionError?.message || 'Unable to complete this action.'); }
    finally { setBusy(''); }
  };

  const changeStatus = (status, rejectedReason) => runAction(`status-${status}`, () => updateVehicleStatus(vehicleId, { status, ...(status === 'rejected' && rejectedReason ? { rejectedReason } : {}) }), status === 'approved' ? 'Vehicle approved.' : 'Vehicle rejected and the driver was notified.');
  const openEdit = () => {
    const vehicle = data.vehicle;
    setEditForm({ model: vehicle.model || '', year: vehicle.year || '', pricePerDay: vehicle.pricePerDay || '', seats: vehicle.seats || '', description: vehicle.description || '', ...Object.fromEntries(VEHICLE_FEATURES.map(({ key }) => [key, Boolean(vehicle[key])])) });
    setFormError(''); setModal('edit');
  };
  const submitEdit = (event) => {
    event.preventDefault();
    const year = Number(editForm.year); const pricePerDay = Number(editForm.pricePerDay); const seats = editForm.seats === '' ? undefined : Number(editForm.seats);
    if (!editForm.model?.trim()) return setFormError('Vehicle model is required.');
    if (!Number.isInteger(year) || year < 1990 || year > new Date().getFullYear() + 1) return setFormError('Enter a valid vehicle year.');
    if (!Number.isFinite(pricePerDay) || pricePerDay < 35 || pricePerDay > 250) return setFormError('Price per day must be between $35 and $250.');
    if (seats !== undefined && (!Number.isInteger(seats) || seats < 1)) return setFormError('Seats must be at least 1.');
    const payload = { ...editForm, model: editForm.model.trim(), year, pricePerDay, description: editForm.description?.trim() || '' };
    if (seats === undefined) delete payload.seats;
    else payload.seats = seats;
    return runAction('edit', () => updateVehicleDetails(vehicleId, payload), 'Vehicle details updated.');
  };
  const uploadImages = (fileList) => {
    const files = Array.from(fileList || []); if (!files.length) return;
    const slots = Math.max(5 - (data.vehicle.images?.length || 0), 0);
    if (!slots) return toast.error('This vehicle already has 5 images.');
    const form = new FormData(); files.slice(0, slots).forEach((file) => form.append('images', file));
    if (files.length > slots) toast.error(`Only ${slots} more image${slots === 1 ? '' : 's'} can be added.`);
    return runAction('images', () => addVehicleImages(vehicleId, form), 'Vehicle images added.');
  };
  const deleteThisVehicle = async () => {
    setBusy('delete');
    try {
      await deleteVehicle(vehicleId);
      toast.success('Vehicle deleted.');
      navigate(vehiclesListPath);
    } catch (deleteError) {
      // 409 = the vehicle still has upcoming bookings; the server says which.
      setFormError(deleteError?.message || 'Unable to delete this vehicle.');
      toast.error(deleteError?.message || 'Unable to delete this vehicle.');
    } finally {
      setBusy('');
    }
  };

  const removeImage = (image) => {
    if (!window.confirm('Remove this image from the vehicle?')) return;
    runAction('images', () => removeVehicleImage(vehicleId, image), 'Vehicle image removed.');
  };

  const shell = (content, title = data?.vehicle?.model || 'Vehicle record') => <AdminShell navGroups={ADMIN_NAV_GROUPS} activeSection="vehicles" onSectionChange={(section) => navigate(section === 'overview' ? '/admin' : `/admin?section=${section}`)} currentUser={currentUser} onOpenProfile={() => navigate('/admin?section=profile')} onLogout={handleLogout} crumb="SUPPLY & PEOPLE / VEHICLES" title={title}>{content}</AdminShell>;

  if (loading) return shell(<div className="flex min-h-[440px] items-center justify-center rounded-[18px] bg-surface text-sm text-muted shadow-card"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading complete vehicle record…</div>);
  if (error || !data) return shell(<div className="flex min-h-[440px] flex-col items-center justify-center gap-4 rounded-[18px] bg-surface text-center shadow-card"><XCircle className="h-10 w-10 text-rose-500" /><div><h2 className="font-extrabold text-ink">Vehicle record unavailable</h2><p className="mt-1 text-sm text-muted">{error}</p></div><div className="flex gap-2"><button type="button" onClick={() => navigate(vehiclesListPath)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink">Back to vehicles</button><button type="button" onClick={loadDetails} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">Try again</button></div></div>, 'Vehicle record');

  const { vehicle, summary } = data;
  const tabs = [['overview', 'Overview', null], ['availability', 'Availability', vehicle.availability?.length || 0], ['bookings', 'Bookings', data.bookings.length], ['reviews', 'Reviews', data.reviews.length], ['conversations', 'Offers & chats', data.offers.length + data.conversations.length], ['activity', 'Activity', data.activity.length]];

  return shell(<>
    <button type="button" onClick={() => navigate(vehiclesListPath)} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back to all vehicles</button>
    <section className="rounded-[20px] bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4">{vehicle.images?.[0] ? <img src={vehicle.images[0]} alt="" className="h-20 w-24 flex-shrink-0 rounded-2xl object-cover" /> : <div className="grid h-20 w-24 flex-shrink-0 place-items-center rounded-2xl bg-canvas"><Car className="h-8 w-8 text-muted-soft" /></div>}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-extrabold tracking-tight text-ink">{vehicle.model}</h2><span className={statusTag(vehicle.status)}>{vehicle.status}</span></div><p className="mt-2 text-sm font-semibold text-muted">{vehicle.year} · {formatCurrency(vehicle.pricePerDay)}/day · {vehicle.seats || '—'} seats · {vehicle.driver?.name || 'Unknown driver'}</p><p className="mt-1 font-mono text-[11px] text-muted-soft">{vehicle.id}</p></div></div><div className="flex flex-wrap gap-2">{vehicle.status !== 'approved' ? <button type="button" disabled={Boolean(busy)} onClick={() => changeStatus('approved')} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Approve</button> : null}{vehicle.status !== 'rejected' ? <button type="button" disabled={Boolean(busy)} onClick={() => { setRejectReason(''); setFormError(''); setModal('reject'); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-600 disabled:opacity-60"><XCircle className="h-4 w-4" /> Reject</button> : null}<button type="button" onClick={openEdit} className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-canvas"><Pencil className="h-4 w-4" /> Edit</button><Link to={`/vehicles/${vehicle.id}`} target="_blank" className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-canvas"><ExternalLink className="h-4 w-4" /> Public listing</Link><button type="button" disabled={Boolean(busy)} onClick={() => { setFormError(''); setModal('delete'); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-600 disabled:opacity-60"><Trash2 className="h-4 w-4" /> Delete</button></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6"><Stat value={summary.completedTrips} label="Completed trips" /><Stat value={summary.upcomingTrips} label="Upcoming" /><Stat value={summary.offerCount} label="Offers" /><Stat value={summary.averageRating ? `${summary.averageRating}/5` : '—'} label={`${summary.reviewCount} reviews`} /><Stat value={formatCurrency(summary.totalGross)} label="Booking value" /><Stat value={formatCurrency(summary.driverEarnings)} label="Driver earnings" /></div>
    </section>
    <nav className="flex gap-1 overflow-x-auto rounded-[16px] bg-surface p-1.5 shadow-card">{tabs.map(([id, label, count]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition ${activeTab === id ? 'bg-brand text-white' : 'text-muted hover:bg-canvas hover:text-ink'}`}>{label}{count != null ? ` (${count})` : ''}</button>)}</nav>
    {activeTab === 'overview' ? <VehicleOverview vehicle={vehicle} onEdit={openEdit} onUpload={uploadImages} onRemoveImage={removeImage} busy={Boolean(busy)} /> : null}
    {activeTab === 'availability' ? <Panel title="Availability management" subtitle="Driver-created ranges are editable; dates blocked by bookings are read-only."><VehicleAvailabilitySection vehicleId={vehicle.id} /></Panel> : null}
    {activeTab === 'bookings' ? <BookingsTab bookings={data.bookings} /> : null}
    {activeTab === 'reviews' ? <ReviewsTab reviews={data.reviews} /> : null}
    {activeTab === 'conversations' ? <ConversationsTab offers={data.offers} conversations={data.conversations} /> : null}
    {activeTab === 'activity' ? <ActivityTab activity={data.activity} /> : null}

    <AdminModal open={modal === 'edit'} onClose={closeModal} title="Edit vehicle details" subtitle="Update the information shown throughout the marketplace."><form onSubmit={submitEdit} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className={labelCls}>Model<input value={editForm.model || ''} onChange={(event) => setEditForm((current) => ({ ...current, model: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Year<input type="number" min="1990" max={new Date().getFullYear() + 1} value={editForm.year || ''} onChange={(event) => setEditForm((current) => ({ ...current, year: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Price per day<input type="number" min="35" max="250" value={editForm.pricePerDay || ''} onChange={(event) => setEditForm((current) => ({ ...current, pricePerDay: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Seats<input type="number" min="1" value={editForm.seats || ''} onChange={(event) => setEditForm((current) => ({ ...current, seats: event.target.value }))} className={inputCls} /></label></div><label className={labelCls}>Description<textarea rows={4} value={editForm.description || ''} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className={inputCls} /></label><fieldset className="rounded-xl border border-line p-3"><legend className="px-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Included services</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{VEHICLE_FEATURES.map(({ key, label }) => <label key={key} className="flex items-center gap-2 text-[12.5px] font-semibold text-ink"><input type="checkbox" checked={Boolean(editForm[key])} onChange={(event) => setEditForm((current) => ({ ...current, [key]: event.target.checked }))} className="h-4 w-4 rounded border-line text-brand focus:ring-brand" />{label}</label>)}</div></fieldset>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<button type="submit" disabled={Boolean(busy)} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy === 'edit' ? 'Saving…' : 'Save changes'}</button></form></AdminModal>
    <AdminModal open={modal === 'delete'} onClose={closeModal} title="Delete this vehicle?" subtitle="It is removed from search, the driver's list and any new offers. Past bookings, reviews and chat history keep showing it."><div className="space-y-4"><p className="text-sm text-muted">Any offer still waiting on this vehicle is withdrawn. This cannot be undone from the dashboard.</p>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink">Cancel</button><button type="button" disabled={Boolean(busy)} onClick={deleteThisVehicle} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><Trash2 className="h-4 w-4" /> {busy === 'delete' ? 'Deleting…' : 'Delete vehicle'}</button></div></div></AdminModal>
    <AdminModal open={modal === 'reject'} onClose={closeModal} title="Reject vehicle" subtitle="The reason is included in the email sent to the driver."><div className="space-y-4"><label className={labelCls}>Reason (optional)<textarea rows={5} maxLength={500} value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} className={inputCls} placeholder="Explain what the driver should correct." /></label>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink">Cancel</button><button type="button" disabled={Boolean(busy)} onClick={() => changeStatus('rejected', rejectReason.trim())} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><XCircle className="h-4 w-4" /> {busy ? 'Rejecting…' : 'Reject vehicle'}</button></div></div></AdminModal>
  </>, vehicle.model);
};

export default AdminVehicleDetails;

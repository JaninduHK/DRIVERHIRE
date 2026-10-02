import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  CalendarDays,
  Car,
  ClipboardList,
  ExternalLink,
  FileText,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
} from 'lucide-react';
import { deleteBrief, fetchBriefDetails, updateBrief } from '../services/adminApi.js';
import { fetchCurrentUser } from '../services/profileApi.js';
import { clearStoredToken } from '../services/authToken.js';
import { VEHICLE_FEATURES } from '../constants/vehicleFeatures.js';
import AdminShell from './admin/AdminShell.jsx';
import AdminModal from './admin/AdminModal.jsx';
import { ADMIN_NAV_GROUPS } from './admin/adminNav.js';
import { formatCurrency, formatDate, formatDateInput, formatDateTime, tagClass } from './admin/adminFormatters.js';

const STATUS_COLORS = {
  open: 'green', booked: 'blue', closed: 'grey', pending: 'amber', accepted: 'green',
  declined: 'red', active: 'green', confirmed: 'green', cancelled: 'grey', rejected: 'red', approved: 'green',
};
const BRIEF_STATUSES = ['open', 'booked', 'closed'];
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
  <div className="grid gap-1 border-b border-hairline py-3 first:pt-0 last:border-b-0 last:pb-0 sm:grid-cols-[155px_1fr] sm:gap-4">
    <dt className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</dt>
    <dd className={`min-w-0 break-words text-[13px] font-semibold text-ink ${mono ? 'font-mono text-[12px]' : ''}`}>{children ?? value ?? <span className="font-normal text-muted-soft">{EMPTY}</span>}</dd>
  </div>
);

const Timestamp = ({ value }) => <span title={value || ''}>{formatDateTime(value)}</span>;
const Stat = ({ value, label }) => <div className="rounded-2xl border border-hairline bg-surface px-4 py-4 shadow-card"><div className="text-xl font-extrabold text-ink">{value}</div><div className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">{label}</div></div>;
const EmptyState = ({ icon = ClipboardList, text }) => <div className="flex min-h-[230px] flex-col items-center justify-center gap-2 rounded-[18px] bg-surface text-center text-sm text-muted shadow-card">{createElement(icon, { className: 'h-9 w-9 text-muted-soft' })}<p>{text}</p></div>;

const OverviewTab = ({ data, onEdit }) => {
  const { brief, traveler } = data;
  return <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
    <div className="flex flex-col gap-5">
      <Panel title="Traveller request" subtitle="The complete tour request submitted to the driver marketplace." action={<button type="button" onClick={onEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-ink hover:bg-canvas"><Pencil className="h-3.5 w-3.5" /> Edit</button>}>
        <dl>
          <DetailRow label="Route" value={`${brief.startLocation || 'Start not set'} → ${brief.endLocation || 'End not set'}`} />
          <DetailRow label="Trip starts" value={formatDate(brief.startDate)} />
          <DetailRow label="Trip ends" value={formatDate(brief.endDate)} />
          <DetailRow label="Country" value={brief.country} />
          <DetailRow label="Adults" value={brief.adults} />
          <DetailRow label="Children" value={brief.children} />
          <DetailRow label="Traveller message"><span className="whitespace-pre-wrap font-normal leading-relaxed text-muted">{brief.message || EMPTY}</span></DetailRow>
        </dl>
      </Panel>
      <Panel title="Quote controls" subtitle="Restrictions chosen by the traveller when publishing the request.">
        <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-canvas p-4"><p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Maximum quotes</p><b className="mt-2 block text-lg text-ink">{brief.maxOffers || 'Unlimited'}</b></div><div className="rounded-xl bg-canvas p-4"><p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Required licence</p><b className="mt-2 block text-sm text-ink">{brief.requiredLicenseType || 'Any approved driver'}</b></div><div className="rounded-xl bg-canvas p-4"><p className="text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Remaining slots</p><b className="mt-2 block text-lg text-ink">{brief.maxOffers ? Math.max(brief.maxOffers - data.summary.responseCount, 0) : '∞'}</b></div></div>
      </Panel>
    </div>
    <div className="flex flex-col gap-5">
      <Panel title="Traveller account" subtitle="Platform account that published this brief.">
        <dl><DetailRow label="Account ID" value={traveler?.id || brief.traveler?.id} mono /><DetailRow label="Name" value={traveler?.name || brief.traveler?.name} /><DetailRow label="Email" value={traveler?.email || brief.traveler?.email} /><DetailRow label="Phone" value={traveler?.contactNumber} /><DetailRow label="Sign-in provider" value={traveler?.authProvider} /><DetailRow label="Verified" value={traveler ? (traveler.isVerified ? 'Yes' : 'No') : null} /><DetailRow label="Registered"><Timestamp value={traveler?.createdAt} /></DetailRow>{traveler?.deletedAt ? <DetailRow label="Deleted"><Timestamp value={traveler.deletedAt} /></DetailRow> : null}</dl>
      </Panel>
      <Panel title="Record timestamps" subtitle="Exact timestamps and identifiers stored for this request.">
        <dl><DetailRow label="Brief ID" value={brief.id} mono /><DetailRow label="Created"><Timestamp value={brief.createdAt} /></DetailRow><DetailRow label="Updated"><Timestamp value={brief.updatedAt} /></DetailRow><DetailRow label="Latest response"><Timestamp value={brief.lastResponseAt} /></DetailRow><DetailRow label="Stored offer count" value={brief.offersCount} /><DetailRow label="Response records" value={brief.responses?.length || 0} /></dl>
      </Panel>
    </div>
  </div>;
};

const MessageThread = ({ conversation }) => {
  if (!conversation) return <p className="text-sm text-muted">The linked conversation is unavailable.</p>;
  return <div>
    <div className="grid gap-x-6 md:grid-cols-3"><dl><DetailRow label="Conversation ID" value={conversation.id} mono /><DetailRow label="Status"><span className={statusTag(conversation.status)}>{conversation.status}</span></DetailRow></dl><dl><DetailRow label="Created"><Timestamp value={conversation.createdAt} /></DetailRow><DetailRow label="Last message"><Timestamp value={conversation.lastMessageAt} /></DetailRow></dl><dl><DetailRow label="Traveller unread" value={conversation.travelerUnreadCount} /><DetailRow label="Driver unread" value={conversation.driverUnreadCount} /></dl></div>
    {conversation.messages?.length ? <div className="mt-4 space-y-2 border-t border-hairline pt-4">{conversation.messages.map((message) => <article key={message.id} className="rounded-xl bg-canvas p-3.5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><b className="text-xs text-ink">{message.sender?.name || message.senderRole || 'Unknown sender'}</b><span className={statusTag(message.offer?.status || (message.type === 'offer' ? 'pending' : 'active'))}>{message.type}{message.offer?.status ? ` · ${message.offer.status}` : ''}</span></div><span className="text-[11px] font-semibold text-muted-soft"><Timestamp value={message.createdAt} /></span></div><p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{message.body || EMPTY}</p>{message.briefRequest ? <div className="mt-3 rounded-lg border border-line bg-surface p-3 text-[11.5px] text-muted"><b className="text-ink">Brief snapshot</b><p className="mt-1">{message.briefRequest.startLocation} → {message.briefRequest.endLocation} · {message.briefRequest.adults} adults · {message.briefRequest.children} children</p><p className="mt-1 whitespace-pre-wrap">{message.briefRequest.message}</p></div> : null}{message.offer ? <div className="mt-3 flex flex-wrap gap-4 rounded-lg border border-line bg-surface px-3 py-2 text-[11.5px] font-semibold text-muted"><span>{formatCurrency(message.offer.totalPrice)}</span><span>{message.offer.totalKms ?? '—'} km</span><span>{formatDate(message.offer.startDate)} → {formatDate(message.offer.endDate)}</span></div> : null}{message.warning ? <p className="mt-2 text-xs font-bold text-rose-600">Warning: {message.warning}</p> : null}{message.violations?.length ? <p className="mt-1 text-[11px] font-semibold text-rose-600">Detected: {message.violations.join(', ')}</p> : null}</article>)}</div> : <p className="mt-4 border-t border-hairline pt-4 text-sm text-muted">No messages found in this conversation.</p>}
  </div>;
};

const ResponsesTab = ({ responses, recordPath }) => {
  if (!responses.length) return <EmptyState icon={Send} text="No driver has quoted on this brief yet." />;
  return <div className="flex flex-col gap-5">{responses.map((response, index) => {
    const { offer, driver, vehicle, booking } = response;
    return <Panel key={response.id || index} title={`${driver?.name || 'Driver'} · ${vehicle?.model || 'Vehicle unavailable'}`} subtitle={`Response ${index + 1} · ${response.id || 'No offer ID'}`} action={<span className={statusTag(offer?.status)}>{offer?.status || 'unknown'}</span>}>
      <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <div className="space-y-5">
          <div className="grid gap-x-6 lg:grid-cols-2"><dl><DetailRow label="Offer total" value={offer ? formatCurrency(offer.totalPrice) : null} /><DetailRow label="Distance" value={offer?.totalKms != null ? `${offer.totalKms} km` : null} /><DetailRow label="Extra kilometre" value={offer?.pricePerExtraKm != null ? formatCurrency(offer.pricePerExtraKm) : null} /><DetailRow label="Offer dates">{offer ? <>{formatDate(offer.startDate)} → {formatDate(offer.endDate)}</> : null}</DetailRow><DetailRow label="Responded"><Timestamp value={response.createdAt} /></DetailRow><DetailRow label="Driver note"><span className="whitespace-pre-wrap font-normal text-muted">{response.note || EMPTY}</span></DetailRow></dl><dl><DetailRow label="Driver ID" value={driver?.id} mono /><DetailRow label="Driver email" value={driver?.email} /><DetailRow label="Driver phone" value={driver?.contactNumber} /><DetailRow label="Driver status"><span className={statusTag(driver?.driverStatus)}>{driver?.driverStatus || 'unknown'}</span></DetailRow><DetailRow label="Licence" value={[driver?.licenseType, driver?.licenseStatus].filter(Boolean).join(' · ') || null} /><DetailRow label="Member since"><Timestamp value={driver?.memberSince} /></DetailRow></dl></div>
          {driver ? <Link to={`/admin/drivers/${driver.id}`} state={{ from: recordPath }} className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-dark hover:underline">Open full driver record <ExternalLink className="h-3.5 w-3.5" /></Link> : null}
          <div className="rounded-xl bg-canvas p-4"><div className="flex items-center gap-3">{vehicle?.images?.[0] ? <img src={vehicle.images[0]} alt="" className="h-16 w-20 rounded-xl object-cover" /> : <div className="grid h-16 w-20 place-items-center rounded-xl bg-surface"><Car className="h-6 w-6 text-muted-soft" /></div>}<div><b className="text-sm text-ink">{vehicle?.model || 'Vehicle unavailable'}</b><p className="text-xs text-muted-soft">{vehicle?.year || '—'} · {vehicle?.seats || '—'} seats · {formatCurrency(vehicle?.pricePerDay)}/day</p></div></div>{vehicle ? <><div className="mt-3 grid gap-1.5 sm:grid-cols-2">{VEHICLE_FEATURES.map(({ key, label }) => <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-3 py-2 text-[11px] font-semibold text-ink"><span>{label}</span><span className={tagClass(vehicle[key] ? 'green' : 'grey')}>{vehicle[key] ? 'Yes' : 'No'}</span></div>)}</div><Link to={`/admin/vehicles/${vehicle.id}`} state={{ from: recordPath }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-dark hover:underline">Open full vehicle record <ExternalLink className="h-3.5 w-3.5" /></Link></> : null}</div>
          {offer?.warning ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">Safety warning: {offer.warning}</div> : null}
          {booking ? <Link to={`/admin/bookings/${booking.id}`} state={{ from: recordPath }} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800"><div><b className="text-sm">Booking created from this offer</b><p className="mt-1 text-xs">{booking.status} · {formatCurrency(booking.totalPrice)} · {formatDate(booking.startDate)} – {formatDate(booking.endDate)}</p></div><ExternalLink className="h-4 w-4 flex-shrink-0" /></Link> : null}
        </div>
        <div className="rounded-xl border border-hairline p-4"><h3 className="mb-4 text-[12px] font-extrabold uppercase tracking-wide text-muted-soft">Conversation and messages</h3><MessageThread conversation={response.conversation} /></div>
      </div>
    </Panel>;
  })}</div>;
};

const BookingsTab = ({ bookings, recordPath }) => {
  if (!bookings.length) return <EmptyState icon={CalendarDays} text="No booking has been created from the offers on this brief." />;
  return <div className="flex flex-col gap-4">{bookings.map((booking) => <Panel key={booking.id} title={`${booking.startPoint || 'Start not set'} → ${booking.endPoint || 'End not set'}`} subtitle={`Booking ${booking.id}`} action={<span className={statusTag(booking.status)}>{booking.status}</span>}><div className="grid gap-x-7 lg:grid-cols-3"><dl><DetailRow label="Traveller" value={booking.traveler?.fullName} /><DetailRow label="Driver" value={booking.driver?.name} /><DetailRow label="Vehicle" value={booking.vehicle?.model} /></dl><dl><DetailRow label="Trip starts" value={formatDate(booking.startDate)} /><DetailRow label="Trip ends" value={formatDate(booking.endDate)} /><DetailRow label="Duration" value={`${booking.totalDays || 0} days`} /></dl><dl><DetailRow label="Gross total" value={formatCurrency(booking.totalPrice)} /><DetailRow label="Commission" value={formatCurrency(booking.commissionAmount)} /><DetailRow label="Driver earnings" value={formatCurrency(booking.driverEarnings)} /></dl></div><Link to={`/admin/bookings/${booking.id}`} state={{ from: recordPath }} className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-brand-dark hover:underline">Open full booking record <ExternalLink className="h-3.5 w-3.5" /></Link></Panel>)}</div>;
};

const ActivityTab = ({ activity }) => {
  const [filter, setFilter] = useState('all');
  const types = useMemo(() => ['all', ...new Set(activity.map((entry) => entry.type))], [activity]);
  const filtered = filter === 'all' ? activity : activity.filter((entry) => entry.type === filter);
  return <Panel title="Brief activity" subtitle="Chronological activity reconstructed from the brief and every linked response."><div className="mb-5 flex flex-wrap gap-2">{types.map((type) => <button key={type} type="button" onClick={() => setFilter(type)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${filter === type ? 'bg-brand text-white' : 'bg-canvas text-muted'}`}>{type}</button>)}</div>{filtered.length ? <ol className="relative ml-2 border-l border-line">{filtered.map((entry, index) => <li key={`${entry.type}-${entry.timestamp}-${index}`} className="relative ml-5 pb-6 last:pb-0"><span className="absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-surface" /><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[13px] font-bold text-ink">{entry.title}</p><div className="mt-1 flex flex-wrap gap-2">{entry.metadata?.status ? <span className={statusTag(entry.metadata.status)}>{entry.metadata.status}</span> : null}{entry.metadata?.recordId ? <span className="font-mono text-[10.5px] text-muted-soft">{entry.metadata.recordId}</span> : null}{entry.metadata?.warning ? <span className="text-xs font-semibold text-rose-600">Flagged</span> : null}</div></div><time className="text-[11.5px] font-semibold text-muted-soft"><Timestamp value={entry.timestamp} /></time></div></li>)}</ol> : <p className="py-12 text-center text-sm text-muted">No matching activity.</p>}</Panel>;
};

const AdminBriefDetails = () => {
  const { briefId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const briefsListPath = location.state?.from || '/admin?section=briefs';
  const recordPath = `/admin/briefs/${briefId}`;
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
    try { setData(await fetchBriefDetails(briefId)); }
    catch (loadError) { setError(loadError?.message || 'Unable to load tour brief details.'); }
    finally { setLoading(false); }
  }, [briefId]);

  useEffect(() => { loadDetails(); }, [loadDetails]);
  useEffect(() => { fetchCurrentUser().then((response) => setCurrentUser(response?.user || null)).catch(() => setCurrentUser(null)); }, []);

  const handleLogout = () => { clearStoredToken(); toast.success('You have been logged out.'); navigate('/login'); };
  const closeModal = () => { if (busy) return; setModal(null); setFormError(''); };
  const openEdit = () => {
    const brief = data.brief;
    setEditForm({ status: brief.status || 'open', startDate: formatDateInput(brief.startDate), endDate: formatDateInput(brief.endDate), startLocation: brief.startLocation || '', endLocation: brief.endLocation || '', message: brief.message || '', country: brief.country || '' });
    setFormError(''); setModal('edit');
  };
  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editForm.message.trim()) return setFormError('Traveller message is required.');
    if (!editForm.country.trim()) return setFormError('Country is required.');
    if (!editForm.startDate || !editForm.endDate) return setFormError('Start and end dates are required.');
    if (new Date(editForm.endDate) < new Date(editForm.startDate)) return setFormError('End date cannot be before the start date.');
    setBusy('edit'); setFormError('');
    try { await updateBrief(briefId, editForm); toast.success('Tour brief updated.'); setModal(null); await loadDetails(); }
    catch (actionError) { setFormError(actionError?.message || 'Unable to update tour brief.'); toast.error(actionError?.message || 'Unable to update tour brief.'); }
    finally { setBusy(''); }
  };
  const confirmDelete = async () => {
    setBusy('delete'); setFormError('');
    try { await deleteBrief(briefId); toast.success('Tour brief deleted.'); navigate(briefsListPath); }
    catch (actionError) { setFormError(actionError?.message || 'Unable to delete tour brief.'); toast.error(actionError?.message || 'Unable to delete tour brief.'); setBusy(''); }
  };

  const shell = (content, title = data?.brief ? `${data.brief.startLocation} → ${data.brief.endLocation}` : 'Tour brief record') => <AdminShell navGroups={ADMIN_NAV_GROUPS} activeSection="briefs" onSectionChange={(section) => navigate(section === 'overview' ? '/admin' : `/admin?section=${section}`)} currentUser={currentUser} onOpenProfile={() => navigate('/admin?section=profile')} onLogout={handleLogout} crumb="MARKETPLACE / BRIEFS" title={title}>{content}</AdminShell>;

  if (loading) return shell(<div className="flex min-h-[440px] items-center justify-center rounded-[18px] bg-surface text-sm text-muted shadow-card"><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Loading complete tour brief record…</div>);
  if (error || !data) return shell(<div className="flex min-h-[440px] flex-col items-center justify-center gap-4 rounded-[18px] bg-surface text-center shadow-card"><XCircle className="h-10 w-10 text-rose-500" /><div><h2 className="font-extrabold text-ink">Tour brief unavailable</h2><p className="mt-1 text-sm text-muted">{error}</p></div><div className="flex gap-2"><button type="button" onClick={() => navigate(briefsListPath)} className="rounded-xl border border-line px-4 py-2 text-sm font-bold text-ink">Back to briefs</button><button type="button" onClick={loadDetails} className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">Try again</button></div></div>, 'Tour brief record');

  const { brief, summary } = data;
  const tabs = [['overview', 'Overview', null], ['responses', 'Quotes & chats', summary.responseCount], ['bookings', 'Bookings', data.bookings.length], ['activity', 'Activity', data.activity.length]];

  return shell(<>
    <button type="button" onClick={() => navigate(briefsListPath)} className="inline-flex w-fit items-center gap-2 text-sm font-bold text-muted transition hover:text-ink"><ArrowLeft className="h-4 w-4" /> Back to all briefs</button>
    <section className="rounded-[20px] bg-surface p-5 shadow-card">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div className="flex min-w-0 items-start gap-4"><div className="grid h-20 w-20 flex-shrink-0 place-items-center rounded-2xl bg-canvas"><FileText className="h-8 w-8 text-brand-dark" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-2xl font-extrabold tracking-tight text-ink">{brief.startLocation || 'Start'} → {brief.endLocation || 'End'}</h2><span className={statusTag(brief.status)}>{brief.status}</span></div><p className="mt-2 text-sm font-semibold text-muted">{brief.traveler?.name || 'Traveller'} · {brief.country} · {formatDate(brief.startDate)} – {formatDate(brief.endDate)}</p><p className="mt-1 font-mono text-[11px] text-muted-soft">{brief.id}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => navigate(`/admin?section=offers&search=${brief.id}`)} className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-canvas"><Send className="h-4 w-4" /> Offers list</button><button type="button" onClick={openEdit} className="inline-flex items-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-xs font-bold text-ink hover:bg-canvas"><Pencil className="h-4 w-4" /> Edit brief</button><button type="button" onClick={() => { setFormError(''); setModal('delete'); }} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-600"><Trash2 className="h-4 w-4" /> Delete</button></div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><Stat value={summary.responseCount} label="Quotes received" /><Stat value={summary.pendingCount} label="Pending quotes" /><Stat value={summary.acceptedCount} label="Accepted" /><Stat value={summary.lowestOffer == null ? '—' : formatCurrency(summary.lowestOffer)} label="Lowest quote" /><Stat value={summary.highestOffer == null ? '—' : formatCurrency(summary.highestOffer)} label="Highest quote" /><Stat value={summary.messageCount} label="Chat messages" /></div>
    </section>
    <nav className="flex gap-1 overflow-x-auto rounded-[16px] bg-surface p-1.5 shadow-card">{tabs.map(([id, label, count]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`whitespace-nowrap rounded-xl px-3.5 py-2.5 text-xs font-extrabold transition ${activeTab === id ? 'bg-brand text-white' : 'text-muted hover:bg-canvas hover:text-ink'}`}>{label}{count != null ? ` (${count})` : ''}</button>)}</nav>
    {activeTab === 'overview' ? <OverviewTab data={data} onEdit={openEdit} /> : null}
    {activeTab === 'responses' ? <ResponsesTab responses={data.responses} recordPath={recordPath} /> : null}
    {activeTab === 'bookings' ? <BookingsTab bookings={data.bookings} recordPath={recordPath} /> : null}
    {activeTab === 'activity' ? <ActivityTab activity={data.activity} /> : null}

    <AdminModal open={modal === 'edit'} onClose={closeModal} title="Edit tour brief" subtitle="Update the request information shown to drivers." widthClass="sm:max-w-4xl"><form onSubmit={submitEdit} className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><label className={labelCls}>Status<select value={editForm.status || 'open'} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))} className={inputCls}>{BRIEF_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></label><label className={labelCls}>Start date<input type="date" value={editForm.startDate || ''} onChange={(event) => setEditForm((current) => ({ ...current, startDate: event.target.value }))} className={inputCls} /></label><label className={labelCls}>End date<input type="date" value={editForm.endDate || ''} onChange={(event) => setEditForm((current) => ({ ...current, endDate: event.target.value }))} className={inputCls} /></label></div><div className="grid gap-3 sm:grid-cols-2"><label className={labelCls}>Start location<input maxLength={200} value={editForm.startLocation || ''} onChange={(event) => setEditForm((current) => ({ ...current, startLocation: event.target.value }))} className={inputCls} /></label><label className={labelCls}>End location<input maxLength={200} value={editForm.endLocation || ''} onChange={(event) => setEditForm((current) => ({ ...current, endLocation: event.target.value }))} className={inputCls} /></label></div><label className={labelCls}>Traveller message<textarea rows={6} maxLength={2000} value={editForm.message || ''} onChange={(event) => setEditForm((current) => ({ ...current, message: event.target.value }))} className={inputCls} /></label><label className={labelCls}>Country<input maxLength={120} value={editForm.country || ''} onChange={(event) => setEditForm((current) => ({ ...current, country: event.target.value }))} className={inputCls} /></label>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink">Cancel</button><button type="submit" disabled={Boolean(busy)} className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{busy === 'edit' ? 'Saving…' : 'Save changes'}</button></div></form></AdminModal>
    <AdminModal open={modal === 'delete'} onClose={closeModal} title="Delete tour brief permanently?" subtitle="This operation cannot be undone."><div className="space-y-4"><div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm leading-relaxed text-rose-700"><b>Brief {brief.id}</b> will be deleted. Existing offers, conversations, messages, and bookings will remain because they are independent transaction records.</div>{formError ? <p className="text-sm font-semibold text-rose-600">{formError}</p> : null}<div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-ink">Keep brief</button><button type="button" disabled={Boolean(busy)} onClick={confirmDelete} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"><Trash2 className="h-4 w-4" /> {busy === 'delete' ? 'Deleting…' : 'Delete brief'}</button></div></div></AdminModal>
  </>, `${brief.startLocation} → ${brief.endLocation}`);
};

export default AdminBriefDetails;

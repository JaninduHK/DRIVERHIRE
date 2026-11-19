import { useCallback, useEffect, useMemo, useState } from 'react';
import DateField from '../components/DateField.jsx';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarCheck,
  CalendarDays,
  Car,
  ClipboardList,
  DollarSign,
  EyeOff,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  Send,
  User2,
  Users,
  X,
} from 'lucide-react';
import { fetchOpenBriefs, respondToBrief } from '../services/briefApi.js';
import { fetchDriverVehicles } from '../services/driverApi.js';
import { fetchCurrentUser } from '../services/profileApi.js';
import { getStoredToken, getStoredUser, saveReturnPath, clearStoredToken } from '../services/authToken.js';
import { DashboardSidebar, DriverDrawer, MobileHeader, Sheet } from '../components/dashboard/mobile.jsx';
import ContactWarning from '../components/ContactWarning.jsx';
import { OfferInclusionPicker } from '../components/OfferInclusions.jsx';
import { Avatar } from '../components/dashboard/primitives.jsx';
import { travellerLanguageLabel } from '../i18n/languageLabel.js';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: User2, href: '/portal/driver' },
  { id: 'vehicles', label: 'My Vehicles', icon: Car, href: '/portal/driver#vehicles' },
  { id: 'bookings', label: 'My Bookings', icon: CalendarDays, href: '/portal/driver#bookings' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/portal/driver/messages' },
  { id: 'briefs', label: 'Tour Briefs', icon: MapPin, href: '/briefs', active: true },
  { id: 'earnings', label: 'My Earnings', icon: DollarSign, href: '/portal/driver#earnings' },
  { id: 'availability', label: 'My Availability', icon: CalendarCheck, href: '/portal/driver#availability' },
  { id: 'profile', label: 'My Profile', icon: ClipboardList, href: '/portal/driver#profile' },
];

const formatDateLabel = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateInput = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

// Server decides eligibility (backend/controllers/briefController.js) so web and
// mobile can't drift on the rule; this only renders the reason.
const BLOCK_COPY = {
  limit_reached: 'Quote limit reached',
  license_mismatch: 'Not open to your licence type',
};

const TourBriefsBoard = () => {
  const navigate = useNavigate();
  // Start from the user saved at sign-in so a signed-in driver sees the dashboard at
  // once (this page renders in the browser only); the account is re-checked below.
  const [userState, setUserState] = useState(() => {
    const stored = getStoredToken() ? getStoredUser() : null;
    return stored ? { loading: false, error: '', data: stored } : { loading: true, error: '', data: null };
  });
  // Desktop list controls.
  const [briefFilter, setBriefFilter] = useState('all');
  const [briefSort, setBriefSort] = useState('newest');
  const [briefQuery, setBriefQuery] = useState('');
  const [expandedBriefs, setExpandedBriefs] = useState(() => new Set());
  const [briefsState, setBriefsState] = useState({ loading: true, error: '', items: [] });
  const [vehiclesState, setVehiclesState] = useState({ loading: false, error: '', items: [] });
  const [offerModal, setOfferModal] = useState({ open: false, brief: null });
  const [offerForm, setOfferForm] = useState({
    startDate: '',
    endDate: '',
    vehicleId: '',
    totalPrice: '',
    totalKms: '',
    pricePerExtraKm: '',
    inclusions: [],
    note: '',
  });
  const [sendingOffer, setSendingOffer] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isApprovedDriver =
    userState.data?.role === 'driver' && userState.data?.driverStatus === 'approved';
  const driverName = userState.data?.name || 'Driver';

  const handleLogout = () => {
    clearStoredToken();
    navigate('/login');
  };

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetchCurrentUser();
        setUserState({ loading: false, error: '', data: response?.user || null });
      } catch (error) {
        setUserState({
          loading: false,
          error: error?.message || 'Sign in to continue.',
          data: null,
        });
      }
    };
    loadCurrentUser();
  }, []);

  const loadBriefs = useCallback(async () => {
    setBriefsState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchOpenBriefs();
      setBriefsState({
        loading: false,
        error: '',
        items: Array.isArray(data?.briefs) ? data.briefs : [],
      });
    } catch (error) {
      setBriefsState({
        loading: false,
        error: error?.message || 'Unable to load briefs right now.',
        items: [],
      });
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    setVehiclesState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchDriverVehicles();
      const allVehicles = Array.isArray(data?.vehicles) ? data.vehicles : [];
      const approvedVehicles = allVehicles.filter((v) => v.status === 'approved');
      setVehiclesState({
        loading: false,
        error: '',
        items: approvedVehicles,
      });
    } catch (error) {
      setVehiclesState({
        loading: false,
        error: error?.message || 'Unable to load your vehicles.',
        items: [],
      });
    }
  }, []);

  useEffect(() => {
    if (isApprovedDriver) {
      loadBriefs();
      loadVehicles();
    } else if (!userState.loading) {
      setBriefsState((prev) => ({ ...prev, loading: false }));
    }
  }, [isApprovedDriver, userState.loading, loadBriefs, loadVehicles]);

  const openOfferModal = (brief) => {
    if (!isApprovedDriver) {
      toast.error('Only approved drivers can send offers.');
      return;
    }
    if (brief.hasResponded) {
      toast('You already responded to this brief.');
      return;
    }
    const defaultVehicleId = offerForm.vehicleId || vehiclesState.items[0]?.id || '';
    setOfferForm({
      startDate: formatDateInput(brief.startDate),
      endDate: formatDateInput(brief.endDate),
      vehicleId: defaultVehicleId,
      totalPrice: '',
      totalKms: '',
      pricePerExtraKm: '',
      inclusions: [],
      note: '',
    });
    setOfferModal({ open: true, brief });
  };

  const closeOfferModal = () => {
    setOfferModal({ open: false, brief: null });
    setOfferForm({
      startDate: '',
      endDate: '',
      vehicleId: '',
      totalPrice: '',
      totalKms: '',
      pricePerExtraKm: '',
      inclusions: [],
      note: '',
    });
    setSendingOffer(false);
  };

  const handleOfferFieldChange = (event) => {
    const { name, value } = event.target;
    setOfferForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOfferSubmit = async (event) => {
    event.preventDefault();
    if (!offerModal.brief) {
      return;
    }
    if (!offerForm.vehicleId) {
      toast.error('Select a vehicle for this offer.');
      return;
    }
    const totalPriceNumber = Number(offerForm.totalPrice);
    const totalKmsNumber = Number(offerForm.totalKms);
    const extraKmNumber = Number(offerForm.pricePerExtraKm);
    if (
      Number.isNaN(totalPriceNumber) ||
      totalPriceNumber <= 0 ||
      Number.isNaN(totalKmsNumber) ||
      totalKmsNumber <= 0 ||
      Number.isNaN(extraKmNumber) ||
      extraKmNumber < 0
    ) {
      toast.error('Enter valid pricing details.');
      return;
    }
    if (extraKmNumber > 1) {
      toast.error('Extra km rate must be between $0.00 and $1.00 (USD).');
      return;
    }
    setSendingOffer(true);
    try {
      await respondToBrief(offerModal.brief.id, {
        vehicleId: offerForm.vehicleId,
        startDate: offerForm.startDate,
        endDate: offerForm.endDate,
        totalPrice: totalPriceNumber,
        totalKms: totalKmsNumber,
        pricePerExtraKm: extraKmNumber,
        inclusions: offerForm.inclusions,
        note: offerForm.note,
      });
      toast.success('Offer sent via chat. Continue the conversation from Driver Messages.');
      closeOfferModal();
      await loadBriefs();
    } catch (error) {
      toast.error(error?.message || 'Unable to send offer.');
      setSendingOffer(false);
    }
  };

  const handleSignInClick = () => {
    saveReturnPath();
    navigate('/login');
  };

  const isLoggedIn = Boolean(getStoredToken());

  const renderGate = useMemo(() => {
    if (userState.loading) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          Checking your account…
        </div>
      );
    }
    if (!isApprovedDriver) {
      return (
        <div className="w-full max-w-[380px] rounded-[20px] bg-white p-7 text-center shadow-card">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-tint">
            <MapPin className="h-7 w-7 text-brand" />
          </div>
          <p className="mt-4 text-[18px] font-extrabold text-ink">Drivers only</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
            Sign in with an approved driver account to view live tour briefs and send offers.
          </p>
          {!isLoggedIn ? (
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleSignInClick}
                className="w-full rounded-[12px] bg-brand py-3 text-[14px] font-extrabold text-white transition hover:bg-brand-dark"
              >
                Sign in
              </button>
              <Link
                to="/register/driver"
                className="w-full rounded-[12px] border-[1.5px] border-[#e2e8ea] py-3 text-[14px] font-bold text-ink transition hover:border-muted-soft"
              >
                Apply as driver
              </Link>
            </div>
          ) : userState.data?.role !== 'driver' ? (
            <div className="mt-5">
              <Link
                to="/register/driver"
                className="block w-full rounded-[12px] bg-brand py-3 text-[14px] font-extrabold text-white transition hover:bg-brand-dark"
              >
                Apply as driver
              </Link>
              <p className="mt-2 text-[12px] text-muted-soft">
                You&apos;re signed in as a traveller. Drivers need a separate approved account.
              </p>
            </div>
          ) : (
            <p className="mt-5 rounded-[12px] bg-[#fdf0d8] px-3 py-2.5 text-[12.5px] font-semibold text-[#a86a15]">
              Your driver account is pending approval. Check back once approved.
            </p>
          )}
        </div>
      );
    }
    return null;
  }, [userState.loading, userState.data, isApprovedDriver, isLoggedIn]);

  // ---- Desktop list: filters, search, sort and summary counts ----
  const now = Date.now();
  const tripDays = (brief) =>
    brief.startDate && brief.endDate
      ? Math.max(1, Math.round((new Date(brief.endDate) - new Date(brief.startDate)) / 86400000) + 1)
      : null;
  const startsSoon = (brief) => brief.startDate && new Date(brief.startDate) - now <= 14 * 86400000;
  const stats = {
    open: briefsState.items.length,
    unanswered: briefsState.items.filter((brief) => !brief.hasResponded).length,
    soon: briefsState.items.filter(startsSoon).length,
  };
  const term = briefQuery.trim().toLowerCase();
  const visibleBriefs = briefsState.items
    .filter((brief) => (briefFilter === 'unanswered' ? !brief.hasResponded : briefFilter === 'answered' ? brief.hasResponded : true))
    .filter((brief) => !term || `${brief.startLocation} ${brief.endLocation} ${brief.country} ${brief.message}`.toLowerCase().includes(term))
    .sort((a, b) =>
      briefSort === 'soonest'
        ? new Date(a.startDate || 0) - new Date(b.startDate || 0)
        : new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  const postedAgo = (value) => {
    if (!value) return '';
    const hours = Math.round((now - new Date(value).getTime()) / 3600000);
    if (hours < 1) return 'Posted just now';
    if (hours < 24) return `Posted ${hours} h ago`;
    const days = Math.round(hours / 24);
    return `Posted ${days} day${days === 1 ? '' : 's'} ago`;
  };

  const inputCls =
    'h-11 w-full min-w-0 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-medium text-ink placeholder:font-normal placeholder:text-[#adb8c0] focus:border-brand focus:outline-none';
  const labelCls = 'text-[12.5px] font-bold text-ink-soft';

  return (
    <div className="min-h-screen overflow-x-clip bg-[#e7ebef] font-sans text-ink">
      {renderGate ? (
        <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-canvas">
          <div className="flex items-center justify-between px-5 py-4">
            <span className="text-base font-extrabold tracking-tight text-ink">
              car<span className="text-brand">withdriver</span>
            </span>
            <Link to="/" className="text-[13px] font-bold text-brand-dark">
              Home
            </Link>
          </div>
          <div className="flex flex-1 items-center justify-center px-5 pb-16">{renderGate}</div>
        </div>
      ) : (
        <div className="lg:flex">
          <DriverDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            navItems={NAV_ITEMS}
            onSelect={(item, event) => {
              event?.preventDefault?.();
              navigate(item.href);
            }}
            user={{ name: driverName, roleLabel: 'Approved driver', image: userState.data?.profilePhoto }}
            onLogout={handleLogout}
          />
          <DashboardSidebar
            navItems={NAV_ITEMS}
            onSelect={(item) => navigate(item.href)}
            user={{ name: driverName, roleLabel: 'Approved driver', image: userState.data?.profilePhoto }}
            onLogout={handleLogout}
          />
          <div className="mx-auto min-h-screen w-full max-w-[480px] bg-canvas shadow-[0_0_60px_rgba(15,31,45,0.06)] lg:mx-0 lg:max-w-none lg:flex-1 lg:shadow-none">
            <MobileHeader
              onMenu={() => setDrawerOpen(true)}
              right={<Avatar name={driverName} image={userState.data?.profilePhoto} tone="light" className="h-10 w-10 text-[15px]" />}
              eyebrow="TOUR BRIEFS"
              title="Open briefs"
              subtitle="Live trip requests — send an offer to start a chat."
            />
            <Sheet wide>
              {briefsState.loading ? (
                <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
                  <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading tour briefs…
                </div>
              ) : briefsState.error ? (
                <div className="rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
                  <p className="text-[#e11d48]">{briefsState.error}</p>
                  <button
                    type="button"
                    onClick={loadBriefs}
                    className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft"
                  >
                    Try again
                  </button>
                </div>
              ) : briefsState.items.length === 0 ? (
                <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
                  <b className="mb-1 block text-ink">No open briefs right now.</b>
                  Check back soon — new itineraries are posted daily.
                </div>
              ) : (
                <>
                {/* ---------- Desktop ---------- */}
                <div className="hidden lg:block">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Open requests', value: stats.open, note: 'Travellers waiting for quotes' },
                      { label: 'Not answered by you', value: stats.unanswered, note: 'Send an offer to start a chat', accent: true },
                      { label: 'Starting within 14 days', value: stats.soon, note: 'Quote these first' },
                    ].map((tile) => (
                      <div key={tile.label} className={`rounded-[18px] p-5 shadow-card ${tile.accent ? 'bg-gradient-to-br from-[#0c7a44] to-brand text-white' : 'bg-white'}`}>
                        <p className={`text-[12px] font-bold uppercase tracking-wide ${tile.accent ? 'text-white/80' : 'text-muted-soft'}`}>{tile.label}</p>
                        <p className={`mt-2 text-[28px] font-extrabold tracking-tight ${tile.accent ? '' : 'text-ink'}`}>{tile.value}</p>
                        <p className={`mt-0.5 text-[12.5px] ${tile.accent ? 'text-white/80' : 'text-muted-soft'}`}>{tile.note}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center gap-3 rounded-[18px] bg-white px-4 py-3 shadow-card">
                    <div className="inline-flex rounded-xl bg-canvas p-1">
                      {[
                        { value: 'all', label: `All (${stats.open})` },
                        { value: 'unanswered', label: `Not answered (${stats.unanswered})` },
                        { value: 'answered', label: `Offer sent (${stats.open - stats.unanswered})` },
                      ].map((option) => (
                        <button key={option.value} type="button" onClick={() => setBriefFilter(option.value)}
                          className={`rounded-lg px-3.5 py-2 text-[13px] font-bold transition ${briefFilter === option.value ? 'bg-white text-ink shadow-sm' : 'text-muted-soft hover:text-ink'}`}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-soft" />
                      <input value={briefQuery} onChange={(e) => setBriefQuery(e.target.value)} placeholder="Search route, country or message" className="h-10 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white pl-9 pr-3 text-[13px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
                    </div>
                    <select value={briefSort} onChange={(e) => setBriefSort(e.target.value)} aria-label="Sort" className="h-10 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-[13px] font-semibold text-ink focus:border-brand focus:outline-none">
                      <option value="newest">Newest first</option>
                      <option value="soonest">Trip date: soonest</option>
                    </select>
                  </div>

                  {vehiclesState.items.length === 0 ? (
                    <p className="mt-4 rounded-xl bg-[#fdf0d8] px-4 py-3 text-[13px] font-semibold text-[#a86a15]">Add a vehicle in your portal to send offers.</p>
                  ) : null}

                  <div className="mt-5 flex flex-col gap-3">
                    {visibleBriefs.length === 0 ? (
                      <div className="rounded-[18px] bg-white p-10 text-center text-[13.5px] text-muted shadow-card">No requests match these filters.</div>
                    ) : null}
                    {visibleBriefs.map((brief) => {
                      const start = formatDateLabel(brief.startDate);
                      const end = formatDateLabel(brief.endDate);
                      const days = tripDays(brief);
                      const hasResponded = Boolean(brief.hasResponded);
                      const blockReason =
                        brief.eligibility && !brief.eligibility.canRespond && brief.eligibility.reason !== 'already_responded'
                          ? brief.eligibility.reason
                          : null;
                      const restrictionLabel = brief.requiredLicenseType
                        ? `${brief.requiredLicenseType}s only`
                        : brief.maxOffers
                          ? `${brief.offersCount} of ${brief.maxOffers} quotes`
                          : null;
                      const expanded = expandedBriefs.has(brief.id);
                      const longMessage = (brief.message || '').length > 240;
                      return (
                        <article key={brief.id} id={`brief-d-${brief.id}`} className={`grid grid-cols-[minmax(0,1fr)_240px] overflow-hidden rounded-[18px] bg-white shadow-card ${hasResponded ? 'opacity-80' : ''}`}>
                          <div className="min-w-0 p-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <h2 className="flex min-w-0 items-center gap-1.5 text-[16.5px] font-extrabold text-ink">
                                <MapPin className="h-4 w-4 flex-shrink-0 text-brand" />
                                <span className="truncate">{brief.startLocation}</span>
                                <span className="text-muted-soft">→</span>
                                <span className="truncate">{brief.endLocation}</span>
                              </h2>
                              {startsSoon(brief) && !hasResponded ? <span className="rounded-md bg-[#fdf0d8] px-2 py-0.5 text-[11px] font-extrabold text-[#a86a15]">Starts soon</span> : null}
                              {hasResponded ? <span className="rounded-md bg-brand-tint px-2 py-0.5 text-[11px] font-extrabold uppercase text-brand-dark">Offer sent</span> : null}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] font-semibold text-ink-soft">
                              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-muted-soft" />{start && end ? `${start} – ${end}` : 'Dates to be confirmed'}{days ? ` · ${days} day${days === 1 ? '' : 's'}` : ''}</span>
                              <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-muted-soft" />{brief.adults} adult{brief.adults === 1 ? '' : 's'}{brief.children > 0 ? ` · ${brief.children} child${brief.children === 1 ? '' : 'ren'}` : ''}</span>
                              {brief.traveler?.name ? <span className="inline-flex items-center gap-1.5"><User2 className="h-4 w-4 text-muted-soft" />{brief.traveler.name}{brief.country ? ` · ${brief.country}` : ''}</span> : null}
                              {travellerLanguageLabel(brief.language) ? <span title="The language the traveller used on the website">Language: {travellerLanguageLabel(brief.language)}</span> : null}
                            </div>
                            {brief.message ? (
                              <div className="mt-3 rounded-xl bg-canvas px-4 py-3">
                                <p className={`whitespace-pre-line text-[13.5px] leading-relaxed text-muted ${expanded || !longMessage ? '' : 'line-clamp-3'}`}>{brief.message}</p>
                                {longMessage ? (
                                  <button type="button" onClick={() => setExpandedBriefs((prev) => { const next = new Set(prev); if (next.has(brief.id)) next.delete(brief.id); else next.add(brief.id); return next; })} className="mt-1 text-[12.5px] font-bold text-brand-dark">
                                    {expanded ? 'Show less' : 'Read more'}
                                  </button>
                                ) : null}
                              </div>
                            ) : null}
                            {brief.contactHidden ? (
                              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-muted-soft"><EyeOff className="h-3 w-3" /> Contact details are hidden — message the traveller in chat instead.</p>
                            ) : null}
                          </div>
                          <div className="flex flex-col justify-between gap-3 border-l border-hairline bg-[#fbfcfc] p-5">
                            <div className="text-[12.5px] text-muted">
                              <p className="flex items-center gap-1.5 font-bold text-ink"><MessageCircle className="h-4 w-4 text-muted-soft" /> {brief.offersCount} offer{brief.offersCount === 1 ? '' : 's'} so far</p>
                              {restrictionLabel ? <p className="mt-2 inline-block rounded-lg bg-[#fdf7e8] px-2.5 py-1 text-[11.5px] font-bold text-[#7a5410]">{restrictionLabel}</p> : null}
                              <p className="mt-2 text-[11.5px] text-muted-soft">{postedAgo(brief.createdAt)}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => openOfferModal(brief)}
                              disabled={hasResponded || vehiclesState.items.length === 0 || blockReason}
                              className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
                            >
                              {hasResponded ? 'Offer sent' : blockReason ? BLOCK_COPY[blockReason] || 'Not accepting quotes' : <><Send className="h-[15px] w-[15px]" /> Send offer</>}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>

                {/* ---------- Phones ---------- */}
                <div className="grid gap-3 lg:hidden">
                  {briefsState.items.map((brief) => {
                    const start = formatDateLabel(brief.startDate);
                    const end = formatDateLabel(brief.endDate);
                    const offerLabel = brief.offersCount === 1 ? 'offer' : 'offers';
                    const hasResponded = Boolean(brief.hasResponded);
                    const blockReason =
                      brief.eligibility && !brief.eligibility.canRespond && brief.eligibility.reason !== 'already_responded'
                        ? brief.eligibility.reason
                        : null;
                    const restrictionLabel = brief.requiredLicenseType
                      ? `${brief.requiredLicenseType}s only`
                      : brief.maxOffers
                        ? `${brief.offersCount} of ${brief.maxOffers} quotes`
                        : null;
                    const noVehicles = vehiclesState.items.length === 0;
                    return (
                      <article key={brief.id} id={`brief-${brief.id}`} className="min-w-0 rounded-[18px] bg-white p-4 shadow-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-1.5 text-[15px] font-extrabold text-ink">
                            <MapPin className="h-4 w-4 flex-shrink-0 text-brand" />
                            <span className="truncate">{brief.startLocation}</span>
                            <span className="flex-shrink-0 text-muted-soft">→</span>
                            <span className="truncate">{brief.endLocation}</span>
                          </div>
                          {hasResponded ? (
                            <span className="flex-shrink-0 rounded-[7px] bg-brand-tint px-2 py-[3px] text-[10.5px] font-extrabold uppercase text-brand-dark">
                              Offer sent
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 text-[12.5px] text-muted-soft">
                          {start && end ? `${start} – ${end}` : 'Dates to be confirmed'}
                          {brief.traveler?.name ? ` · ${brief.traveler.name}` : ''}
                        </div>
                        {brief.message ? (
                          <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-muted">{brief.message}</p>
                        ) : null}
                        {brief.contactHidden ? (
                          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-soft">
                            <EyeOff className="h-3 w-3 flex-none" />
                            <span>Contact details are hidden — message the traveller in chat instead.</span>
                          </div>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] font-semibold text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-muted-soft" />
                            {brief.adults} adult{brief.adults === 1 ? '' : 's'}
                            {brief.children > 0 ? ` · ${brief.children} child${brief.children === 1 ? '' : 'ren'}` : ''}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-muted-soft" />
                            {brief.country}
                          </span>
                          {travellerLanguageLabel(brief.language) ? (
                            <span className="inline-flex items-center gap-1.5 text-ink" title="The language the traveller used on the website">
                              Language: {travellerLanguageLabel(brief.language)}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5 text-muted-soft" />
                            {brief.offersCount} {offerLabel}
                          </span>
                        </div>
                        {restrictionLabel ? (
                          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#fdf7e8] px-2.5 py-1.5 text-[12px] font-bold text-[#7a5410]">
                            {restrictionLabel}
                          </div>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openOfferModal(brief)}
                          disabled={hasResponded || noVehicles || blockReason}
                          className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-brand py-3 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
                        >
                          {hasResponded ? (
                            'Offer sent'
                          ) : blockReason ? (
                            BLOCK_COPY[blockReason] || 'Not accepting quotes'
                          ) : (
                            <>
                              <Send className="h-[15px] w-[15px]" />
                              Send offer
                            </>
                          )}
                        </button>
                        {noVehicles ? (
                          <p className="mt-2 text-center text-[12px] font-semibold text-[#a86a15]">
                            Add a vehicle in your portal to send offers.
                          </p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
                </>
              )}
            </Sheet>
          </div>

          {offerModal.open && offerModal.brief ? (
            <div className="fixed inset-0 z-[70] flex items-end justify-center lg:items-center lg:p-6">
              <div className="absolute inset-0 bg-ink/45" onClick={closeOfferModal} aria-hidden="true" />
              <div className="relative mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] bg-canvas p-5 pb-8 shadow-drawer lg:max-w-[640px] lg:rounded-[24px] lg:p-7">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#cbd5db] lg:hidden" />
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand">Send offer</p>
                    <b className="block truncate text-[17px] text-ink">
                      {offerModal.brief.startLocation} → {offerModal.brief.endLocation}
                    </b>
                    <p className="text-[12px] text-muted-soft">
                      {formatDateLabel(offerModal.brief.startDate)} – {formatDateLabel(offerModal.brief.endDate)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeOfferModal}
                    aria-label="Close"
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-white shadow-soft"
                  >
                    <X className="h-4 w-4 text-ink" />
                  </button>
                </div>
                <form onSubmit={handleOfferSubmit} className="flex flex-col gap-3">
                  <div className="flex gap-2.5">
                    <div className="min-w-0 flex-1">
                      <label className={labelCls}>Start date</label>
                      <DateField name="startDate" value={offerForm.startDate} onChange={handleOfferFieldChange} className={`mt-1 ${inputCls}`} required />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className={labelCls}>End date</label>
                      <DateField name="endDate" value={offerForm.endDate} onChange={handleOfferFieldChange} className={`mt-1 ${inputCls}`} required />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Vehicle</label>
                    <select name="vehicleId" value={offerForm.vehicleId} onChange={handleOfferFieldChange} className={`mt-1 ${inputCls}`} required>
                      <option value="">Select vehicle</option>
                      {vehiclesState.items.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>{vehicle.model}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2.5">
                    <div className="min-w-0 flex-1">
                      <label className={labelCls}>Total price (USD)</label>
                      <input type="number" min="0" step="1" name="totalPrice" value={offerForm.totalPrice} onChange={handleOfferFieldChange} className={`mt-1 ${inputCls}`} required />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className={labelCls}>Included kms</label>
                      <input type="number" min="0" step="1" name="totalKms" value={offerForm.totalKms} onChange={handleOfferFieldChange} className={`mt-1 ${inputCls}`} required />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Extra km rate (USD)</label>
                    <input type="number" min="0" max="1" step="0.001" inputMode="decimal" name="pricePerExtraKm" value={offerForm.pricePerExtraKm} onChange={handleOfferFieldChange} className={`mt-1 ${inputCls}`} required />
                    <p className="mt-1 text-[11px] text-muted-soft">In USD, between $0.00 and $1.00 per km.</p>
                  </div>
                  <OfferInclusionPicker
                    value={offerForm.inclusions}
                    onChange={(inclusions) => setOfferForm((prev) => ({ ...prev, inclusions }))}
                    labelClassName={labelCls}
                  />
                  <div>
                    <label className={labelCls}>Personal note</label>
                    <textarea name="note" rows={3} value={offerForm.note} onChange={handleOfferFieldChange} placeholder="Share what's included, vehicle perks, or daily plan highlights." className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
                    <ContactWarning value={offerForm.note} />
                    <p className="mt-1 text-[11.5px] text-muted-soft">Contact details are hidden automatically to keep travellers safe.</p>
                  </div>
                  <button
                    type="submit"
                    disabled={sendingOffer}
                    className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70"
                  >
                    {sendingOffer ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      'Send offer'
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default TourBriefsBoard;

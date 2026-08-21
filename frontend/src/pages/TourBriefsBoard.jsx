import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Send,
  User2,
  Users,
  X,
} from 'lucide-react';
import { fetchOpenBriefs, respondToBrief } from '../services/briefApi.js';
import { fetchDriverVehicles } from '../services/driverApi.js';
import { fetchCurrentUser } from '../services/profileApi.js';
import { getStoredToken, saveReturnPath, clearStoredToken } from '../services/authToken.js';
import { DashboardSidebar, DriverDrawer, MobileHeader, Sheet } from '../components/dashboard/mobile.jsx';
import { Avatar } from '../components/dashboard/primitives.jsx';

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

const TourBriefsBoard = () => {
  const navigate = useNavigate();
  const [userState, setUserState] = useState({ loading: true, error: '', data: null });
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
    setSendingOffer(true);
    try {
      await respondToBrief(offerModal.brief.id, {
        vehicleId: offerForm.vehicleId,
        startDate: offerForm.startDate,
        endDate: offerForm.endDate,
        totalPrice: totalPriceNumber,
        totalKms: totalKmsNumber,
        pricePerExtraKm: extraKmNumber,
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
            <Sheet>
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
                <div className="grid gap-3 lg:grid-cols-2">
                  {briefsState.items.map((brief) => {
                    const start = formatDateLabel(brief.startDate);
                    const end = formatDateLabel(brief.endDate);
                    const offerLabel = brief.offersCount === 1 ? 'offer' : 'offers';
                    const hasResponded = Boolean(brief.hasResponded);
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
                          <span className="inline-flex items-center gap-1.5">
                            <MessageCircle className="h-3.5 w-3.5 text-muted-soft" />
                            {brief.offersCount} {offerLabel}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openOfferModal(brief)}
                          disabled={hasResponded || noVehicles}
                          className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-[12px] bg-brand py-3 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
                        >
                          {hasResponded ? (
                            'Offer sent'
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
              )}
            </Sheet>
          </div>

          {offerModal.open && offerModal.brief ? (
            <div className="fixed inset-0 z-[70] flex items-end justify-center">
              <div className="absolute inset-0 bg-ink/45" onClick={closeOfferModal} aria-hidden="true" />
              <div className="relative mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] bg-canvas p-5 pb-8 shadow-drawer">
                <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#cbd5db]" />
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
                      <input type="date" name="startDate" value={offerForm.startDate} onChange={handleOfferFieldChange} className={`mt-1 ${inputCls}`} required />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className={labelCls}>End date</label>
                      <input type="date" name="endDate" value={offerForm.endDate} onChange={handleOfferFieldChange} className={`mt-1 ${inputCls}`} required />
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
                    <input type="number" min="0" step="0.001" inputMode="decimal" name="pricePerExtraKm" value={offerForm.pricePerExtraKm} onChange={handleOfferFieldChange} className={`mt-1 ${inputCls}`} required />
                  </div>
                  <div>
                    <label className={labelCls}>Personal note</label>
                    <textarea name="note" rows={3} value={offerForm.note} onChange={handleOfferFieldChange} placeholder="Share what's included, vehicle perks, or daily plan highlights." className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
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

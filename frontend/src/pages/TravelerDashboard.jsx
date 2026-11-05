import { localizeServerMessage } from '../i18n/serverMessages.js';
import DateField from '../components/DateField.jsx';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from '../i18n/router.jsx';
import { Trans, useI18n } from '../i18n/I18nProvider.jsx';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Calculator,
  CalendarDays,
  Car,
  CheckCheck,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PlusCircle,
  Search,
  Send,
  Settings as SettingsIcon,
  Sparkles,
  Star,
  User2,
  Users,
  X,
} from 'lucide-react';
import {
  fetchConversations,
  fetchMessages,
  sendMessage as sendChatMessage,
  markConversationRead,
} from '../services/chatApi.js';
import {
  fetchTravelerBookings,
  updateTravelerBooking,
  cancelTravelerBooking,
  submitBookingReview,
} from '../services/bookingApi.js';
import {
  fetchCurrentUser as fetchProfileCurrentUser,
  updateProfile as updateProfileRequest,
  updatePassword as updatePasswordRequest,
  saveLanguage,
} from '../services/profileApi.js';
import {
  fetchMyBriefs as fetchTravelerBriefs,
  createBrief as createTravelerBrief,
} from '../services/briefApi.js';
import { clearStoredToken, getStoredToken, redirectToSsoLogin } from '../services/authToken.js';
import { DashboardSidebar, DriverDrawer, MobileHeader, Sheet } from '../components/dashboard/mobile.jsx';
import { Avatar } from '../components/dashboard/primitives.jsx';
import BookingDetailsModal from '../components/BookingDetailsModal.jsx';
import DriverProfileSheet from '../components/DriverProfileSheet.jsx';
import { LicenseIconBadge, LicenseTypeChip } from '../components/LicenseBadge.jsx';
import DeleteAccountCard from '../components/DeleteAccountCard.jsx';
import OfferVehicleImages from '../components/OfferVehicleImages.jsx';
import { OfferInclusionList } from '../components/OfferInclusions.jsx';
import { clearPendingBrief, hasPendingBrief, readPendingBrief } from '../lib/pendingBrief.js';
import { trackQuoteRequest } from '../lib/analytics.js';
import BriefRequestBubble from '../components/BriefRequestBubble.jsx';
import MessageMeta from '../components/MessageMeta.jsx';
import { offerExpiryNotice, offerExpiryClass } from '../lib/offerExpiry.js';
import { translateLicenseType } from '../i18n/labels.js';

const NAV_ITEMS = [
  { id: 'overview', icon: User2 },
  { id: 'bookings', icon: CalendarDays },
  { id: 'messages', icon: MessageCircle },
  { id: 'requests', icon: MapPin },
  { id: 'settings', icon: SettingsIcon },
];
const VALID_TABS = NAV_ITEMS.map((item) => item.id);

// External browse links surfaced in the mobile drawer (navigate to public pages, not dashboard tabs).
const BROWSE_LINKS = [
  { id: 'browse-vehicles', icon: Car, href: '/vehicles' },
  { id: 'browse-drivers', icon: Users, href: '/drivers' },
  { id: 'browse-trip-cost', icon: Calculator, href: '/trip-cost-calculator' },
];

// Explicit order for the mobile drawer, interleaving dashboard tabs with browse links.
const DRAWER_ORDER = [
  'overview',
  'browse-vehicles',
  'browse-drivers',
  'bookings',
  'messages',
  'requests',
  'browse-trip-cost',
  'settings',
];

const AVATAR_TONES = ['amber', 'purple', 'blue'];

const inputCls =
  'h-11 w-full min-w-0 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-medium text-ink placeholder:font-normal placeholder:text-[#adb8c0] focus:border-brand focus:outline-none';
const labelCls = 'text-[12.5px] font-bold text-ink-soft';

// Grows a composer textarea to fit its content (up to maxHeight), so multi-line
// messages stay visible while typing instead of scrolling inside a fixed box.
const autoGrowTextarea = (element, maxHeight) => {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
};

const formatDateForInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const buildBookingEditForm = (booking) => ({
  startDate: formatDateForInput(booking?.startDate),
  endDate: formatDateForInput(booking?.endDate),
  startPoint: booking?.startPoint || '',
  endPoint: booking?.endPoint || '',
  flightNumber: booking?.flightNumber || '',
  arrivalTime: booking?.arrivalTime || '',
  departureTime: booking?.departureTime || '',
  specialRequests: booking?.specialRequests || '',
});

const toIsoDateString = (value, boundary = 'start') => {
  if (!value) return undefined;
  const suffix = boundary === 'end' ? 'T23:59:59.000Z' : 'T00:00:00.000Z';
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

// Presets keep the reason useful to admin, and the explanation is required so a
// cancellation row is never just a one-word shrug. The English value is what is
// saved (admin and the driver read English); dash.cancel.reasons.<key> is shown.
const CANCELLATION_REASONS = [
  { key: 'plansChanged', value: 'Travel plans changed' },
  { key: 'betterPrice', value: 'Found a better price elsewhere' },
  { key: 'datesMoved', value: 'Trip dates moved' },
  { key: 'driverSilent', value: 'Driver stopped responding' },
  { key: 'driverAsked', value: 'Driver asked to cancel' },
  { key: 'notTravelling', value: 'No longer travelling to Sri Lanka' },
  { key: 'other', value: 'Something else' },
];

// Dates on this page follow the page language; set once per render by the
// dashboard (the language never changes without a full page load).
let DATE_LOCALE = 'en-US';

const buildBriefForm = () => ({
  startDate: '',
  endDate: '',
  startLocation: '',
  endLocation: '',
  adults: '2',
  children: '0',
  message: '',
  country: '',
});


const buildTravelerProfileForm = (profile) => ({
  name: profile?.name || '',
  contactNumber: profile?.contactNumber || '',
  address: profile?.address || '',
});

const TravelerDashboard = () => {
  const { t, intl, locale } = useI18n();
  DATE_LOCALE = intl;
  const [searchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversationsState, setConversationsState] = useState({ loading: true, error: '', items: [] });
  // Seeded from ?conversationId= so an offer/message notification email can
  // deep-link straight into the right thread instead of landing on the inbox.
  const [selectedConversationId, setSelectedConversationId] = useState(
    searchParams.get('conversationId') || ''
  );
  const [messagesState, setMessagesState] = useState({ loading: false, error: '', items: [], booking: null });
  const [composerValue, setComposerValue] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [travelerBookingsState, setTravelerBookingsState] = useState({ loading: true, error: '', items: [] });
  const [profileState, setProfileState] = useState({
    loading: true,
    error: '',
    data: null,
    savingProfile: false,
    savingPassword: false,
  });
  const [travelerBriefsState, setTravelerBriefsState] = useState({ loading: true, error: '', items: [] });
  const [creatingBrief, setCreatingBrief] = useState(false);
  // Set by the overview's "Request quotes" card so My Requests opens with the form ready.
  const [openRequestForm, setOpenRequestForm] = useState(false);
  const startQuoteRequest = () => {
    setOpenRequestForm(true);
    setActiveTab('requests');
  };

  const location = useLocation();
  const navigate = useNavigate();
  const travelerName = profileState?.data?.name || t('dash.traveller');
  const travelerFirstName = profileState?.data?.name?.split(' ')?.[0] || t('dash.travellerLower');

  const unreadMessageCount = useMemo(
    () => conversationsState.items.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0),
    [conversationsState.items]
  );

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      redirectToSsoLogin();
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    clearStoredToken();
    toast.success(t('dash.toast.loggedOut'));
    navigate('/');
  }, [navigate, t]);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setConversationsState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchConversations();
      const items = Array.isArray(data?.conversations) ? data.conversations : [];
      setConversationsState({ loading: false, error: '', items });
    } catch (error) {
      if (!silent) {
        setConversationsState({ loading: false, error: error?.message || t('dash.errors.conversations'), items: [] });
      }
    }
  }, [t]);

  const loadMessages = useCallback(async (conversationId, { silent = false } = {}) => {
    if (!conversationId) {
      setMessagesState({ loading: false, error: '', items: [], booking: null });
      return;
    }
    if (!silent) setMessagesState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchMessages(conversationId);
      setMessagesState({
        loading: false,
        error: '',
        items: Array.isArray(data?.messages) ? data.messages : [],
        booking: data?.booking || null,
      });
      try {
        await markConversationRead(conversationId);
      } catch (readError) {
        console.warn('Unable to mark conversation as read:', readError);
      }
      setConversationsState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === conversationId ? { ...item, unreadCount: 0 } : item)),
      }));
    } catch (error) {
      if (!silent) setMessagesState({ loading: false, error: error?.message || t('dash.errors.messages'), items: [], booking: null });
    }
  }, [t]);

  const loadTravelerBookings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setTravelerBookingsState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchTravelerBookings();
      setTravelerBookingsState({ loading: false, error: '', items: Array.isArray(data?.bookings) ? data.bookings : [] });
    } catch (error) {
      setTravelerBookingsState({ loading: false, error: error?.message || t('dash.errors.bookings'), items: [] });
    }
  }, [t]);

  const loadTravelerBriefs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setTravelerBriefsState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchTravelerBriefs();
      setTravelerBriefsState({ loading: false, error: '', items: Array.isArray(data?.briefs) ? data.briefs : [] });
    } catch (error) {
      setTravelerBriefsState({ loading: false, error: error?.message || t('dash.errors.briefs'), items: [] });
    }
  }, [t]);

  const loadTravelerProfile = useCallback(async ({ silent = false } = {}) => {
    setProfileState((prev) => ({ ...prev, loading: silent ? prev.loading : true, error: silent ? prev.error : '' }));
    try {
      const response = await fetchProfileCurrentUser();
      setProfileState((prev) => ({ ...prev, loading: false, error: '', data: response?.user || null }));
    } catch (error) {
      setProfileState((prev) => ({ ...prev, loading: false, data: null, error: error?.message || t('dash.errors.profile') }));
    }
  }, [t]);

  useEffect(() => {
    loadTravelerProfile({ silent: false });
  }, [loadTravelerProfile]);

  // Emails follow the language the traveller uses the site in.
  const savedLanguage = profileState.data ? profileState.data.language || 'en' : null;
  useEffect(() => {
    if (!savedLanguage || savedLanguage === locale) return;
    saveLanguage(locale).catch(() => {});
  }, [savedLanguage, locale]);

  useEffect(() => {
    loadTravelerBookings();
  }, [loadTravelerBookings]);

  useEffect(() => {
    loadConversations();
    const id = setInterval(() => loadConversations({ silent: true }), 15000);
    return () => clearInterval(id);
  }, [loadConversations]);

  useEffect(() => {
    if (activeTab === 'requests') loadTravelerBriefs();
    // The overview shows the traveller's open requests in place of the "get
    // quotes" guide; refresh quietly so the card doesn't blink on every visit.
    if (activeTab === 'overview') loadTravelerBriefs({ silent: true });
  }, [activeTab, loadTravelerBriefs]);

  useEffect(() => {
    if (activeTab === 'settings' && !profileState.data && !profileState.loading) {
      loadTravelerProfile({ silent: false });
    }
  }, [activeTab, profileState.data, profileState.loading, loadTravelerProfile]);

  // A request typed before signing in is waiting to be reviewed. Sign-in normally
  // lands on My Requests already, but not when it was finished in another tab.
  useEffect(() => {
    if (hasPendingBrief()) setActiveTab('requests');
  }, []);

  useEffect(() => {
    if (!location.state) return;
    const { openTab, conversationId } = location.state;
    if (openTab) setActiveTab(openTab);
    if (conversationId) setSelectedConversationId(conversationId);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  // If the open conversation disappears, drop back to the inbox list. Gated on
  // `!loading` so a conversationId seeded from the URL (email deep link) or
  // location.state isn't cleared before the conversation list has even loaded.
  useEffect(() => {
    if (
      !conversationsState.loading &&
      selectedConversationId &&
      !conversationsState.items.some((item) => item.id === selectedConversationId)
    ) {
      setSelectedConversationId('');
    }
  }, [conversationsState.loading, conversationsState.items, selectedConversationId]);

  useEffect(() => {
    if (activeTab !== 'messages' || !selectedConversationId) return;
    loadMessages(selectedConversationId);
  }, [activeTab, selectedConversationId, loadMessages]);

  useEffect(() => {
    if (activeTab !== 'messages' || !selectedConversationId) return;
    const id = setInterval(() => loadMessages(selectedConversationId, { silent: true }), 5000);
    return () => clearInterval(id);
  }, [activeTab, selectedConversationId, loadMessages]);

  const selectedConversation = useMemo(
    () => conversationsState.items.find((item) => item.id === selectedConversationId) || null,
    [conversationsState.items, selectedConversationId]
  );

  const openConversation = useCallback((conversationId) => {
    setActiveTab('messages');
    setSelectedConversationId(conversationId || '');
  }, []);

  const handleSendMessage = async () => {
    if (!selectedConversationId || !composerValue.trim()) return;
    setSendingMessage(true);
    try {
      const payload = await sendChatMessage(selectedConversationId, composerValue.trim());
      const newMessage = payload?.message;
      if (newMessage) {
        setMessagesState((prev) => ({ ...prev, loading: false, error: '', items: [...prev.items, newMessage] }));
        setConversationsState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === selectedConversationId
              ? { ...item, lastMessage: newMessage, lastMessageAt: newMessage.createdAt, unreadCount: 0 }
              : item
          ),
        }));
      }
      setComposerValue('');
      await markConversationRead(selectedConversationId);
      loadConversations({ silent: true });
    } catch (error) {
      toast.error(error?.message || t('dash.errors.send'));
    } finally {
      setSendingMessage(false);
    }
  };

  // An expired offer cannot be booked, so its button asks the driver for a fresh
  // one instead: an ordinary chat message, which the driver answers with a new offer.
  const [requestingOfferId, setRequestingOfferId] = useState('');
  const handleRequestNewOffer = async (message) => {
    if (!selectedConversationId || requestingOfferId) return;
    setRequestingOfferId(message.id);
    try {
      const payload = await sendChatMessage(selectedConversationId, buildNewOfferRequest(message.offer));
      const newMessage = payload?.message;
      if (newMessage) {
        setMessagesState((prev) => ({ ...prev, loading: false, error: '', items: [...prev.items, newMessage] }));
        setConversationsState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === selectedConversationId
              ? { ...item, lastMessage: newMessage, lastMessageAt: newMessage.createdAt, unreadCount: 0 }
              : item
          ),
        }));
      }
      toast.success(t('dash.toast.newOfferRequested'));
      loadConversations({ silent: true });
    } catch (error) {
      toast.error(error?.message || t('dash.errors.newOffer'));
    } finally {
      setRequestingOfferId('');
    }
  };

  const handleOfferBooking = (message) => {
    const vehicleRef = message?.offer?.vehicle;
    let vehicleId = null;
    if (typeof vehicleRef === 'string') vehicleId = vehicleRef;
    else if (vehicleRef && typeof vehicleRef === 'object') vehicleId = vehicleRef.id || vehicleRef._id || null;
    if (!vehicleId) {
      toast.error(t('dash.errors.offerVehicle'));
      return;
    }
    navigate(`/checkout/${vehicleId}?offer=${message.id}`, { state: { offerId: message.id } });
  };

  const handleTravelerProfileSave = useCallback(
    async (payload) => {
      setProfileState((prev) => ({ ...prev, savingProfile: true }));
      try {
        await updateProfileRequest(payload);
        toast.success(t('dash.toast.profileUpdated'));
        await loadTravelerProfile({ silent: true });
      } catch (error) {
        toast.error(error?.message || t('dash.errors.updateProfile'));
        throw error;
      } finally {
        setProfileState((prev) => ({ ...prev, savingProfile: false }));
      }
    },
    [loadTravelerProfile, t]
  );

  const handleTravelerPasswordChange = useCallback(async (payload) => {
    setProfileState((prev) => ({ ...prev, savingPassword: true }));
    try {
      await updatePasswordRequest(payload);
      toast.success(t('dash.toast.passwordUpdated'));
    } catch (error) {
      toast.error(error?.message || t('dash.errors.updatePassword'));
      throw error;
    } finally {
      setProfileState((prev) => ({ ...prev, savingPassword: false }));
    }
  }, [t]);

  const handleTravelerBriefCreate = useCallback(
    async (payload) => {
      setCreatingBrief(true);
      try {
        const created = await createTravelerBrief(payload);
        trackQuoteRequest(created?.brief?._id || created?.brief?.id);
        toast.success(t('dash.toast.briefPosted'));
        await loadTravelerBriefs({ silent: true });
      } catch (error) {
        toast.error(error?.message || t('dash.errors.postBrief'));
        throw error;
      } finally {
        setCreatingBrief(false);
      }
    },
    [loadTravelerBriefs, t]
  );

  const headerProps = { onMenu: () => setDrawerOpen(true), travelerName };

  let screen = null;
  if (activeTab === 'overview') {
    screen = (
      <TravelerOverview
        {...headerProps}
        firstName={travelerFirstName}
        bookings={travelerBookingsState.items}
        conversations={conversationsState.items}
        unreadCount={unreadMessageCount}
        onNavigate={setActiveTab}
        onOpenConversation={openConversation}
        onRequestQuotes={startQuoteRequest}
        briefsState={travelerBriefsState}
      />
    );
  } else if (activeTab === 'bookings') {
    screen = (
      <TravelerBookings
        {...headerProps}
        bookingsState={travelerBookingsState}
        onReload={() => loadTravelerBookings({ silent: false })}
        onOpenConversation={openConversation}
      />
    );
  } else if (activeTab === 'messages') {
    screen = (
      <TravelerMessages
        {...headerProps}
        conversationsState={conversationsState}
        selectedConversationId={selectedConversationId}
        selectedConversation={selectedConversation}
        onSelectConversation={setSelectedConversationId}
        messagesState={messagesState}
        composerValue={composerValue}
        onComposerChange={setComposerValue}
        onSendMessage={handleSendMessage}
        sending={sendingMessage}
        onBookOffer={handleOfferBooking}
        onRequestNewOffer={handleRequestNewOffer}
        requestingOfferId={requestingOfferId}
        onReloadConversations={() => loadConversations({ silent: false })}
      />
    );
  } else if (activeTab === 'requests') {
    screen = (
      <TravelerRequests
        {...headerProps}
        briefsState={travelerBriefsState}
        onReload={() => loadTravelerBriefs({ silent: false })}
        onCreateBrief={handleTravelerBriefCreate}
        creating={creatingBrief}
        onOpenMessages={() => setActiveTab('messages')}
        autoOpenForm={openRequestForm}
        onAutoOpenHandled={() => setOpenRequestForm(false)}
      />
    );
  } else if (activeTab === 'settings') {
    screen = (
      <TravelerSettings
        {...headerProps}
        state={profileState}
        onSave={handleTravelerProfileSave}
        onPasswordChange={handleTravelerPasswordChange}
        onRetry={() => loadTravelerProfile({ silent: false })}
      />
    );
  }

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    label: t(`dash.nav.${item.id}`),
    active: item.id === activeTab,
    badge: item.id === 'messages' ? unreadMessageCount : 0,
  }));
  // Mobile drawer interleaves dashboard tabs with public browse links per DRAWER_ORDER.
  const drawerItemsById = {
    ...Object.fromEntries(BROWSE_LINKS.map((link) => [link.id, { ...link, label: t(`dash.nav.${link.id}`) }])),
    ...Object.fromEntries(navItems.map((item) => [item.id, item])),
  };
  const drawerNavItems = DRAWER_ORDER.map((id) => drawerItemsById[id]).filter(Boolean);
  const handleNavSelect = (item, event) => {
    event?.preventDefault?.();
    if (item.href) {
      navigate(item.href);
      return;
    }
    setActiveTab(item.id);
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#e7ebef] font-sans text-ink lg:flex">
      <DriverDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={drawerNavItems}
        onSelect={handleNavSelect}
        user={{ name: travelerName, roleLabel: t('dash.traveller') }}
        onLogout={handleLogout}
      />
      <DashboardSidebar
        navItems={navItems}
        onSelect={(item) => setActiveTab(item.id)}
        user={{ name: travelerName, roleLabel: t('dash.traveller') }}
        onLogout={handleLogout}
      />
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-canvas shadow-[0_0_60px_rgba(15,31,45,0.06)] lg:mx-0 lg:max-w-none lg:flex-1 lg:shadow-none">
        {screen}
      </div>
    </div>
  );
};

// ---------- Overview ----------
const TravelerOverview = ({
  onMenu,
  travelerName,
  firstName,
  bookings = [],
  conversations = [],
  unreadCount = 0,
  onRequestQuotes,
  briefsState,
  onNavigate,
  onOpenConversation,
}) => {
  const { t } = useI18n();
  const now = Date.now();
  const isCancelled = (b) => ['cancelled', 'rejected'].includes(b.status);
  const upcoming = bookings.filter((b) => !isCancelled(b) && (!b.endDate || new Date(b.endDate).getTime() >= now));
  const completed = bookings.filter((b) => b.endDate && new Date(b.endDate).getTime() < now && !isCancelled(b));
  const totalSpent = bookings
    .filter((b) => !isCancelled(b))
    .reduce((sum, b) => {
      const amount = typeof b.payableTotal === 'number' && b.payableTotal > 0 ? b.payableTotal : b.totalPrice;
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0);
  const nextTrip =
    [...upcoming].filter((b) => b.startDate).sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] ||
    upcoming[0] ||
    null;
  const recent = conversations.slice(0, 3);

  return (
    <>
      <div className="lg:hidden">
      <MobileHeader
        onMenu={onMenu}
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate('messages')}
              aria-label={t('dash.nav.messages')}
              className="relative grid h-10 w-10 place-items-center rounded-xl bg-white/[0.18] text-white transition hover:bg-white/25"
            >
              <Mail className="h-[17px] w-[17px]" strokeWidth={1.8} />
              {unreadCount > 0 ? (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-[#12924f] bg-[#ffd23f]" />
              ) : null}
            </button>
            <Avatar name={travelerName} tone="light" className="h-10 w-10 text-[15px]" />
          </div>
        }
      >
        <div className="pt-3.5">
          <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/80">{t('dash.overview.eyebrow')}</p>
          <h1 className="mt-1 text-[25px] font-extrabold leading-tight tracking-tight">{t('dash.overview.welcome', { name: firstName })}</h1>
          <p className="mt-1.5 text-[13.5px] text-white/85">
            {t('dash.overview.lead')}
          </p>
        </div>
      </MobileHeader>

      <Sheet>
        <div className="flex gap-2.5">
          <OverviewStat value={upcoming.length} label={t('dash.overview.upcoming')} />
          <OverviewStat value={completed.length} label={t('dash.overview.completed')} />
          <OverviewStat value={formatCurrency(totalSpent)} label={t('dash.overview.totalSpent')} />
        </div>

        <OverviewRequestsSlot briefsState={briefsState} onRequest={onRequestQuotes} onNavigate={onNavigate} className="mt-3.5" />

        {nextTrip ? (
          <NextTripCard trip={nextTrip} />
        ) : (
          <div className="mt-3.5 rounded-[20px] bg-white p-5 text-center text-sm text-muted shadow-card">
            {t('dash.overview.noUpcoming')}{' '}
            <Link to="/vehicles" className="font-bold text-brand-dark">
              {t('dash.browseVehicles')}
            </Link>
          </div>
        )}

        <div className="mb-2.5 mt-5 flex items-center gap-2.5 px-0.5">
          <b className="text-base font-extrabold text-ink">{t('dash.overview.recentMessages')}</b>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-[#f43f5e] px-2 py-0.5 text-[11px] font-extrabold text-white">{unreadCount}</span>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            {t('dash.overview.noConversationsHint')}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {recent.map((conversation, index) => (
              <OverviewMessageCard
                key={conversation.id}
                conversation={conversation}
                tone={AVATAR_TONES[index % AVATAR_TONES.length]}
                onOpen={() => onOpenConversation(conversation.id)}
              />
            ))}
          </div>
        )}
      </Sheet>
      </div>

      <div className="hidden min-h-screen lg:block">
        <div className="px-8 py-8">
          <div
            className="flex items-center justify-between gap-6 rounded-[20px] px-[30px] py-[26px] text-white"
            style={{ background: 'linear-gradient(120deg,#0f7a45,#10a35a 60%,#18b866)' }}
          >
            <div>
              <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/80">{t('dash.overview.eyebrow')}</p>
              <div className="mt-1 text-[28px] font-extrabold tracking-tight">{t('dash.overview.welcome', { name: firstName })}</div>
              <p className="mt-1.5 text-[14px] text-white/85">{t('dash.overview.lead')}</p>
            </div>
            <div className="flex flex-shrink-0 gap-3.5">
              <DeskStat value={upcoming.length} label={t('dash.overview.upcoming')} />
              <DeskStat value={completed.length} label={t('dash.overview.completed')} />
              <DeskStat value={formatCurrency(totalSpent)} label={t('dash.overview.totalSpent')} />
            </div>
          </div>

          <OverviewRequestsSlot briefsState={briefsState} onRequest={onRequestQuotes} onNavigate={onNavigate} className="mt-[22px]" />

          {/* minmax(0, …): a plain fr track grows to fit its longest unwrapped line, so one
              long message preview would push the page wider than the screen. */}
          <div className="mt-[22px] grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-5">
            <div className="min-w-0 rounded-[18px] bg-white p-5 shadow-card">
              <div className="mb-3.5 flex items-center justify-between gap-3">
                <b className="text-[16px] text-ink">{t('dash.overview.upcomingTrips')}</b>
                <button type="button" onClick={() => onNavigate('bookings')} className="flex-shrink-0 whitespace-nowrap text-[13px] font-bold text-brand-dark">
                  {t('dash.overview.viewAll')}
                </button>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted">{t('dash.overview.noUpcoming')}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {upcoming.slice(0, 4).map((b, i) => (
                    <DeskTripRow key={b.id} booking={b} tone={AVATAR_TONES[i % AVATAR_TONES.length]} />
                  ))}
                </div>
              )}
            </div>
            <div className="min-w-0 rounded-[18px] bg-white p-5 shadow-card">
              <div className="mb-3.5 flex items-center justify-between">
                <b className="text-[16px] text-ink">{t('dash.overview.recentMessages')}</b>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-[#f43f5e] px-2 py-0.5 text-[11px] font-extrabold text-white">{unreadCount}</span>
                ) : null}
              </div>
              {recent.length === 0 ? (
                <p className="text-sm text-muted">{t('dash.overview.noConversations')}</p>
              ) : (
                <div className="flex flex-col gap-3.5">
                  {recent.map((c, i) => (
                    <DeskMsgRow key={c.id} conversation={c} tone={AVATAR_TONES[i % AVATAR_TONES.length]} onOpen={() => onOpenConversation(c.id)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Text in dash.quoteSteps.step<n>.
const QUOTE_STEPS = ['1', '2', '3'];

// The overview's starting point for a traveller who signed up directly and has
// nothing here yet: says what the site does for them and where to begin.
const RequestQuotesCard = ({ onRequest, className = '' }) => {
  const { t } = useI18n();
  return (
  <section className={`rounded-[20px] border-[1.5px] border-[#cdeede] bg-white p-5 shadow-card ${className}`}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <b className="block text-[17px] font-extrabold text-ink">{t('dash.quoteCard.title')}</b>
        <p className="mt-1 text-[13.5px] leading-relaxed text-muted">
          {t('dash.quoteCard.body')}
        </p>
      </div>
      <button
        type="button"
        onClick={onRequest}
        className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-[13px] bg-brand px-5 py-3 text-[14.5px] font-extrabold text-white transition hover:bg-brand-dark"
      >
        <PlusCircle className="h-4 w-4" /> {t('dash.quoteCard.cta')}
      </button>
    </div>
    <ol className="m-0 mt-4 grid list-none gap-3 p-0 lg:grid-cols-3">
      {QUOTE_STEPS.map((n, index) => (
        <li key={n} className="flex items-start gap-3 rounded-[14px] bg-[#f4f9f6] p-3.5">
          <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand text-[13px] font-extrabold text-white">{index + 1}</span>
          <div className="min-w-0">
            <b className="block text-[13.5px] text-ink">{t(`dash.quoteSteps.step${n}.title`)}</b>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{t(`dash.quoteSteps.step${n}.body`)}</p>
          </div>
        </li>
      ))}
    </ol>
  </section>
  );
};

const OVERVIEW_REQUEST_LIMIT = 2;

// One slot on the overview, two states: a traveller with nothing open sees the
// "get quotes" guide; one who has posted sees those requests and their offers.
// Requests that are closed or already booked don't count — at that point the
// useful next step is posting a new one, so the guide comes back.
const OverviewRequestsSlot = ({ briefsState, onRequest, onNavigate, className = '' }) => {
  const { t } = useI18n();
  const { loading, items = [] } = briefsState || {};
  const open = items.filter((brief) => brief.status === 'open');
  // First load: show nothing rather than flash the guide at someone who has requests.
  if (loading && items.length === 0) return null;
  if (open.length === 0) return <RequestQuotesCard onRequest={onRequest} className={className} />;

  return (
    <section className={`rounded-[20px] border-[1.5px] border-[#cdeede] bg-white p-5 shadow-card ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <b className="block text-[17px] font-extrabold text-ink">{t('dash.slot.title', { count: open.length })}</b>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            {t('dash.slot.body')}
          </p>
        </div>
        <button
          type="button"
          onClick={onRequest}
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-2.5 text-[13.5px] font-bold text-ink transition hover:border-muted-soft"
        >
          <PlusCircle className="h-4 w-4" /> {t('dash.slot.newRequest')}
        </button>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {open.slice(0, OVERVIEW_REQUEST_LIMIT).map((brief) => {
          const start = formatDateLabel(brief.startDate);
          const end = formatDateLabel(brief.endDate);
          const offers = brief.offersCount || 0;
          const guests = guestsLabel(brief, t);
          return (
            <article key={brief.id} className="min-w-0 rounded-[14px] bg-[#f4f9f6] p-3.5">
              <div className="flex items-start justify-between gap-2">
                <b className="min-w-0 truncate text-[14.5px] text-ink">{brief.startLocation} → {brief.endLocation}</b>
                <span className={`flex-shrink-0 rounded-lg px-2 py-1 text-[11px] font-extrabold uppercase ${offers > 0 ? 'bg-brand text-white' : 'bg-white text-muted-soft'}`}>
                  {offers > 0 ? t('dash.offersCount', { count: offers }) : t('dash.awaitingOffers')}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {start && end ? <RequestTag>{`${start} – ${end}`}</RequestTag> : null}
                <RequestTag>{guests}</RequestTag>
              </div>
              {offers > 0 ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.('messages')}
                  className="mt-3 w-full rounded-[11px] bg-brand py-2.5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark"
                >
                  {t('dash.viewOffers')}
                </button>
              ) : (
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{t('dash.slot.noOffers')}</p>
              )}
            </article>
          );
        })}
      </div>
      {open.length > OVERVIEW_REQUEST_LIMIT ? (
        <button type="button" onClick={() => onNavigate?.('requests')} className="mt-3 text-[13px] font-bold text-brand-dark">
          {t('dash.slot.viewAll', { count: open.length })}
        </button>
      ) : null}
    </section>
  );
};

const OverviewStat = ({ value, label }) => (
  <div className="flex-1 rounded-2xl bg-white p-[13px] shadow-card">
    <div className="text-[22px] font-extrabold text-ink">{value}</div>
    <div className="text-[11px] font-semibold text-muted-soft">{label}</div>
  </div>
);

const NextTripCard = ({ trip }) => {
  const { t } = useI18n();
  const now = Date.now();
  const startMs = trip.startDate ? new Date(trip.startDate).getTime() : null;
  const daysAway = startMs ? Math.ceil((startMs - now) / 86400000) : null;
  const awayLabel =
    daysAway === null
      ? t('dash.nextTrip.scheduled')
      : daysAway <= 0
        ? t('dash.nextTrip.inProgress')
        : t('dash.nextTrip.daysAway', { count: daysAway });
  const route =
    trip.startPoint && trip.endPoint
      ? `${trip.startPoint} → ${trip.endPoint}`
      : trip.vehicle?.model || t('dash.nextTrip.upcomingTrip');
  const start = formatDateLabel(trip.startDate);
  const end = formatDateLabel(trip.endDate);
  const driverName = trip.driver?.name || t('dash.nextTrip.yourDriver');
  return (
    <div className="mt-3.5 rounded-[20px] p-[17px] text-white" style={{ background: 'linear-gradient(135deg,#0f1f2d,#1c3345)' }}>
      <div className="flex items-center justify-between">
        <b className="text-[15px]">{t('dash.nextTrip.title')}</b>
        <span className="rounded-full bg-white/15 px-[9px] py-1 text-[12px] font-extrabold">{awayLabel}</span>
      </div>
      <div className="mt-3 flex items-center gap-[11px]">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] bg-white/15">
          <Car className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold">{route}</div>
          <div className="truncate text-[12px] text-white/75">
            {start && end ? `${start} – ${end}` : t('dash.nextTrip.datesToConfirm')} · {t('dash.nextTrip.withDriver', { name: driverName })}
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewMessageCard = ({ conversation, tone, onOpen }) => {
  const { t } = useI18n();
  const driverName =
    conversation.participants?.driver?.name || conversation.participants?.driver?.email || t('dash.driver');
  const isOffer = conversation.lastMessage?.type === 'offer';
  const preview = isOffer
    ? `${t('dash.sentOffer')}${conversation.vehicle?.model ? ` · ${conversation.vehicle.model}` : ''}`
    : conversation.lastMessage?.body || t('dash.conversationStarted');
  return (
    <div className="min-w-0 rounded-[18px] bg-white p-[15px] shadow-card" style={{ borderLeft: `4px solid ${isOffer ? '#10a35a' : '#d6e9fb'}` }}>
      <div className="mb-2.5 flex items-center gap-[11px]">
        <Avatar name={driverName} image={conversation.participants?.driver?.profilePhoto} tone={tone} className="h-10 w-10 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-ink">{driverName}</div>
          <div className="truncate text-[12px] text-muted-soft">{preview}</div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={`flex-1 rounded-[11px] py-[11px] text-[13.5px] font-bold transition ${
            isOffer ? 'bg-brand text-white hover:bg-brand-dark' : 'border-[1.5px] border-[#e2e8ea] bg-white text-ink hover:border-muted-soft'
          }`}
        >
          {isOffer ? t('dash.viewOffer') : t('dash.openChat')}
        </button>
        {isOffer ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-[11px] text-[13.5px] font-bold text-ink transition hover:border-muted-soft"
          >
            {t('dash.message')}
          </button>
        ) : null}
      </div>
    </div>
  );
};

// ---------- My Bookings ----------
const TravelerBookings = ({ onMenu, travelerName, bookingsState, onReload, onOpenConversation }) => {
  const { t } = useI18n();
  const { loading, error, items } = bookingsState;
  const [view, setView] = useState('upcoming');
  const [expandedId, setExpandedId] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState(buildBookingEditForm({}));
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelDetail, setCancelDetail] = useState('');
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: '5', title: '', comment: '', images: [] });
  const [submittingReview, setSubmittingReview] = useState(false);

  const openEditModal = (booking) => {
    setEditingBooking(booking);
    setEditForm(buildBookingEditForm(booking));
  };
  const closeEditModal = () => {
    setEditingBooking(null);
    setEditForm(buildBookingEditForm({}));
    setSavingEdit(false);
  };
  const handleEditFieldChange = (field, value) => setEditForm((prev) => ({ ...prev, [field]: value }));

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingBooking) return;
    const canEditDates = !editingBooking.offerId;
    const payload = {
      flightNumber: editForm.flightNumber,
      arrivalTime: editForm.arrivalTime,
      departureTime: editForm.departureTime,
      startPoint: editForm.startPoint,
      endPoint: editForm.endPoint,
      specialRequests: editForm.specialRequests,
    };
    if (canEditDates) {
      if (!editForm.startDate || !editForm.endDate) {
        toast.error(t('dash.bookings.errors.bothDates'));
        return;
      }
      const startIso = toIsoDateString(editForm.startDate, 'start');
      const endIso = toIsoDateString(editForm.endDate, 'end');
      if (!startIso || !endIso) {
        toast.error(t('dash.bookings.errors.validDates'));
        return;
      }
      payload.startDate = startIso;
      payload.endDate = endIso;
    }
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    setSavingEdit(true);
    try {
      await updateTravelerBooking(editingBooking.id, payload);
      toast.success(t('dash.bookings.toast.updated'));
      closeEditModal();
      onReload();
    } catch (err) {
      toast.error(err?.message || t('dash.bookings.errors.update'));
      setSavingEdit(false);
    }
  };

  const openCancelModal = (booking) => {
    setCancellingBooking(booking);
    setCancelReason('');
    setCancelDetail('');
  };
  const closeCancelModal = () => {
    setCancellingBooking(null);
    setCancelReason('');
    setCancelDetail('');
  };

  const handleCancelBooking = async (event) => {
    event.preventDefault();
    if (!cancellingBooking) return;
    const detail = cancelDetail.trim();
    if (!cancelReason) {
      toast.error(t('dash.cancel.errors.reason'));
      return;
    }
    if (!detail) {
      toast.error(t('dash.cancel.errors.detail'));
      return;
    }
    const reason = detail && cancelReason !== 'Something else' ? `${cancelReason} — ${detail}` : detail || cancelReason;
    const booking = cancellingBooking;
    setCancellingId(booking.id);
    try {
      await cancelTravelerBooking(booking.id, reason);
      toast.success(t('dash.cancel.toast.cancelled'));
      closeCancelModal();
      onReload();
    } catch (err) {
      toast.error(err?.message || t('dash.cancel.errors.cancel'));
    } finally {
      setCancellingId('');
    }
  };

  const openReviewModal = (booking) => {
    setReviewingBooking(booking);
    setReviewForm({
      rating: booking.review?.rating ? String(booking.review.rating) : '5',
      title: booking.review?.title || '',
      comment: booking.review?.comment || '',
      images: [],
    });
  };
  const closeReviewModal = () => {
    setReviewingBooking(null);
    setReviewForm({ rating: '5', title: '', comment: '', images: [] });
    setSubmittingReview(false);
  };
  const handleReviewFieldChange = (field, value) => setReviewForm((prev) => ({ ...prev, [field]: value }));
  const handleReviewImages = (event) => {
    const picked = Array.from(event.target.files || []).filter((file) => file.type.startsWith('image/'));
    setReviewForm((prev) => ({ ...prev, images: [...prev.images, ...picked].slice(0, 4) }));
    event.target.value = '';
  };
  const removeReviewImage = (index) =>
    setReviewForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  const reviewPreviews = useMemo(
    () => reviewForm.images.map((file) => URL.createObjectURL(file)),
    [reviewForm.images]
  );
  useEffect(() => () => reviewPreviews.forEach((url) => URL.revokeObjectURL(url)), [reviewPreviews]);

  const handleReviewSubmit = async (event) => {
    event.preventDefault();
    if (!reviewingBooking || reviewingBooking.review) {
      closeReviewModal();
      return;
    }
    const ratingValue = Number(reviewForm.rating);
    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      toast.error(t('dash.review.errors.rating'));
      return;
    }
    if (!reviewForm.comment || reviewForm.comment.trim().length < 10) {
      toast.error(t('dash.review.errors.tooShort'));
      return;
    }
    setSubmittingReview(true);
    try {
      await submitBookingReview(reviewingBooking.id, {
        rating: ratingValue,
        title: reviewForm.title,
        comment: reviewForm.comment.trim(),
        images: reviewForm.images,
      });
      toast.success(t('dash.review.toast.submitted'));
      closeReviewModal();
      onReload();
    } catch (err) {
      toast.error(err?.message || t('dash.review.errors.submit'));
      setSubmittingReview(false);
    }
  };

  const head = (
    <MobileHeader
      onMenu={onMenu}
      right={<Avatar name={travelerName} tone="light" className="h-10 w-10 text-[15px]" />}
      eyebrow={t('dash.bookings.eyebrow')}
      title={t('dash.nav.bookings')}
    />
  );

  if (loading) {
    return (
      <>
        {head}
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> {t('dash.bookings.loading')}
          </div>
        </Sheet>
      </>
    );
  }

  if (error) {
    return (
      <>
        {head}
        <Sheet>
          <div className="rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
            <p className="text-[#e11d48]">{error}</p>
            <button type="button" onClick={onReload} className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft">
              {t('dash.tryAgain')}
            </button>
          </div>
        </Sheet>
      </>
    );
  }

  const now = Date.now();
  const isCancelled = (b) => ['cancelled', 'rejected'].includes(b.status);
  const isPast = (b) => b.endDate && new Date(b.endDate).getTime() < now;
  const upcoming = (items || []).filter((b) => !isCancelled(b) && !isPast(b));
  const completed = (items || []).filter((b) => isCancelled(b) || isPast(b));
  const list = view === 'upcoming' ? upcoming : completed;

  const desktopBookings =
    items.length === 0 ? (
      <div className="rounded-[18px] bg-white p-6 text-sm text-muted shadow-card">
        <b className="mb-1 block text-ink">{t('dash.bookings.emptyTitle')}</b>
        {t('dash.bookings.emptyBody')}{' '}
        <Link to="/vehicles" className="font-bold text-brand-dark">
          {t('dash.browseVehicles')}
        </Link>
      </div>
    ) : list.length === 0 ? (
      <div className="rounded-[18px] bg-white p-6 text-sm text-muted shadow-card">
        {view === 'upcoming' ? t('dash.bookings.noUpcoming') : t('dash.bookings.noCompleted')}
      </div>
    ) : (
      <div className="grid grid-cols-2 gap-4">
        {list.map((booking, index) => (
          <TravelerBookingCard
            key={booking.id}
            booking={booking}
            tone={AVATAR_TONES[index % AVATAR_TONES.length]}
            expanded={expandedId === booking.id}
            onToggle={() => setExpandedId((prev) => (prev === booking.id ? '' : booking.id))}
            onMessage={() => (booking.conversationId ? onOpenConversation(booking.conversationId) : toast(t('dash.bookings.noConversation')))}
            onEdit={() => openEditModal(booking)}
            onCancel={() => openCancelModal(booking)}
            onReview={() => openReviewModal(booking)}
            cancelling={cancellingId === booking.id}
          />
        ))}
      </div>
    );

  return (
    <>
      <div className="lg:hidden">
      {head}
      <Sheet>
        {items.length === 0 ? (
          <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            <b className="mb-1 block text-ink">{t('dash.bookings.emptyTitle')}</b>
            {t('dash.bookings.emptyBody')}
            <Link to="/vehicles" className="mt-3 block font-bold text-brand-dark">
              {t('dash.browseVehicles')}
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-3.5 flex gap-1.5 rounded-xl bg-[#eef1f0] p-1">
              <button
                type="button"
                onClick={() => setView('upcoming')}
                className={`flex-1 rounded-[9px] py-2 text-[13px] font-bold transition ${view === 'upcoming' ? 'bg-brand text-white' : 'text-muted'}`}
              >
                {t('dash.overview.upcoming')}{upcoming.length ? ` ${upcoming.length}` : ''}
              </button>
              <button
                type="button"
                onClick={() => setView('completed')}
                className={`flex-1 rounded-[9px] py-2 text-[13px] font-bold transition ${view === 'completed' ? 'bg-brand text-white' : 'text-muted'}`}
              >
                {t('dash.overview.completed')}{completed.length ? ` ${completed.length}` : ''}
              </button>
            </div>
            {list.length === 0 ? (
              <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
                {view === 'upcoming' ? t('dash.bookings.noUpcoming') : t('dash.bookings.noCompleted')}
              </div>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {list.map((booking, index) => (
                  <TravelerBookingCard
                    key={booking.id}
                    booking={booking}
                    tone={AVATAR_TONES[index % AVATAR_TONES.length]}
                    expanded={expandedId === booking.id}
                    onToggle={() => setExpandedId((prev) => (prev === booking.id ? '' : booking.id))}
                    onMessage={() => (booking.conversationId ? onOpenConversation(booking.conversationId) : toast(t('dash.bookings.noConversation')))}
                    onEdit={() => openEditModal(booking)}
                    onCancel={() => openCancelModal(booking)}
                    onReview={() => openReviewModal(booking)}
                    cancelling={cancellingId === booking.id}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Sheet>
      </div>

      <div className="hidden lg:block">
        <div className="px-8 py-8">
          <DesktopTitleBar title={t('dash.nav.bookings')}>
            {items.length ? (
              <DeskTabs view={view} onView={setView} upcoming={upcoming.length} completed={completed.length} />
            ) : null}
          </DesktopTitleBar>
          {desktopBookings}
        </div>
      </div>

      {cancellingBooking ? (
        <BottomSheet title={t('dash.cancel.title')} onClose={closeCancelModal}>
          <p className="mb-3 whitespace-pre-line rounded-xl bg-[#fdf0d8] px-3 py-2 text-[12px] font-semibold leading-[1.5] text-[#a86a15]">
            {t('dash.cancel.notice').join('\n\n')}
          </p>
          <form onSubmit={handleCancelBooking} className="flex flex-col gap-3">
            <div>
              <label className={labelCls}>{t('dash.cancel.why')}</label>
              <div className="mt-1.5 flex flex-col gap-1.5">
                {CANCELLATION_REASONS.map(({ key, value: reason }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`rounded-[10px] border-[1.5px] px-3 py-2 text-left text-[13px] font-bold transition ${
                      cancelReason === reason
                        ? 'border-brand bg-brand-tint text-brand-dark'
                        : 'border-[#e2e8ea] text-ink hover:border-muted-soft'
                    }`}
                  >
                    {t(`dash.cancel.reasons.${key}`)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('dash.cancel.explain')}</label>
              <textarea
                rows={3}
                maxLength={400}
                value={cancelDetail}
                onChange={(e) => setCancelDetail(e.target.value)}
                required
                placeholder={t('dash.cancel.explainPlaceholder')}
                className={`mt-1 ${inputCls} resize-y`}
              />
            </div>
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={closeCancelModal}
                className="flex-1 rounded-[10px] border-[1.5px] border-[#e2e8ea] py-2.5 text-[13px] font-bold text-ink transition hover:border-muted-soft"
              >
                {t('dash.cancel.keep')}
              </button>
              <button
                type="submit"
                disabled={Boolean(cancellingId)}
                className="flex-1 rounded-[10px] border-[1.5px] border-[#ffd3d9] bg-[#fff5f6] py-2.5 text-[13px] font-bold text-[#f43f5e] transition hover:border-[#f43f5e] disabled:opacity-60"
              >
                {cancellingId ? t('dash.cancel.cancelling') : t('dash.cancel.title')}
              </button>
            </div>
          </form>
        </BottomSheet>
      ) : null}

      {editingBooking ? (
        <BottomSheet title={t('dash.edit.title')} onClose={closeEditModal}>
          {editingBooking.offerId ? (
            <p className="mb-3 rounded-xl bg-[#fdf0d8] px-3 py-2 text-[12px] font-semibold text-[#a86a15]">
              {t('dash.edit.offerDates')}
            </p>
          ) : null}
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.form.startDate')}</label>
                <DateField value={editForm.startDate} disabled={Boolean(editingBooking.offerId)} onChange={(e) => handleEditFieldChange('startDate', e.target.value)} className={`mt-1 ${inputCls} disabled:bg-[#eef1f0]`} required={!editingBooking.offerId} />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.form.endDate')}</label>
                <DateField value={editForm.endDate} disabled={Boolean(editingBooking.offerId)} onChange={(e) => handleEditFieldChange('endDate', e.target.value)} className={`mt-1 ${inputCls} disabled:bg-[#eef1f0]`} required={!editingBooking.offerId} />
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.edit.pickup')}</label>
                <input type="text" value={editForm.startPoint} onChange={(e) => handleEditFieldChange('startPoint', e.target.value)} placeholder={t('dash.edit.pickupPlaceholder')} className={`mt-1 ${inputCls}`} />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.edit.dropoff')}</label>
                <input type="text" value={editForm.endPoint} onChange={(e) => handleEditFieldChange('endPoint', e.target.value)} placeholder={t('dash.edit.dropoffPlaceholder')} className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('dash.edit.flight')}</label>
              <input type="text" value={editForm.flightNumber} onChange={(e) => handleEditFieldChange('flightNumber', e.target.value)} placeholder={t('dash.edit.flightPlaceholder')} className={`mt-1 ${inputCls}`} />
            </div>
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.edit.arrival')}</label>
                <input type="text" value={editForm.arrivalTime} onChange={(e) => handleEditFieldChange('arrivalTime', e.target.value)} placeholder={t('dash.edit.timePlaceholder', { time: '08:30' })} className={`mt-1 ${inputCls}`} />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.edit.departure')}</label>
                <input type="text" value={editForm.departureTime} onChange={(e) => handleEditFieldChange('departureTime', e.target.value)} placeholder={t('dash.edit.timePlaceholder', { time: '17:45' })} className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('dash.edit.special')}</label>
              <textarea rows={3} value={editForm.specialRequests} onChange={(e) => handleEditFieldChange('specialRequests', e.target.value)} placeholder={t('dash.edit.specialPlaceholder')} className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
            </div>
            <button type="submit" disabled={savingEdit} className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
              {savingEdit ? (<><Loader2 className="h-4 w-4 animate-spin" /> {t('dash.saving')}</>) : t('dash.saveChanges')}
            </button>
          </form>
        </BottomSheet>
      ) : null}

      {reviewingBooking ? (
        <BottomSheet
          title={reviewingBooking.vehicle?.model ? t('dash.review.titleModel', { model: reviewingBooking.vehicle.model }) : t('dash.review.title')}
          onClose={closeReviewModal}
        >
          {reviewingBooking.review ? (
            <div className="rounded-[16px] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase ${reviewStatusChip(reviewingBooking.review.status)}`}>
                  {reviewStatusLabel(reviewingBooking.review.status, t)}
                </span>
                <span className="inline-flex items-center gap-1 text-[15px] font-bold text-star">
                  <Star className="h-4 w-4" fill="#f5b042" stroke="none" />
                  {reviewingBooking.review.rating}/5
                </span>
              </div>
              {reviewingBooking.review.title ? <p className="mt-2 text-[14px] font-bold text-ink">{reviewingBooking.review.title}</p> : null}
              <p className="mt-1 whitespace-pre-line text-[13px] text-muted">{reviewingBooking.review.comment}</p>
              {reviewingBooking.review.adminNote ? (
                <div className="mt-2 rounded-lg bg-[#fdf0d8] px-3 py-2 text-[12px] text-[#a86a15]">
                  <b>{t('dash.review.adminNote')}</b> {reviewingBooking.review.adminNote}
                </div>
              ) : null}
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>{t('dash.review.rating')}</label>
                <select value={reviewForm.rating} onChange={(e) => handleReviewFieldChange('rating', e.target.value)} className={`mt-1 ${inputCls}`}>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={String(value)}>
                      {value} — {t(`dash.review.ratings.r${value}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('dash.review.reviewTitle')}</label>
                <input type="text" value={reviewForm.title} onChange={(e) => handleReviewFieldChange('title', e.target.value)} maxLength={120} placeholder={t('dash.review.titlePlaceholder')} className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>{t('dash.review.experience')}</label>
                <textarea rows={5} value={reviewForm.comment} onChange={(e) => handleReviewFieldChange('comment', e.target.value)} maxLength={1200} required placeholder={t('dash.review.experiencePlaceholder')} className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
                <p className="mt-1 text-[11.5px] text-muted-soft">{t('dash.review.minChars')}</p>
              </div>
              <div>
                <label className={labelCls}>{t('dash.review.photos')}</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {reviewForm.images.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-xl border border-[#e2e8ea]">
                      <img src={reviewPreviews[index]} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeReviewImage(index)} aria-label={t('dash.review.removePhoto')} className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-white">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {reviewForm.images.length < 4 ? (
                    <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-xl border-[1.5px] border-dashed border-[#cbd5d1] text-muted-soft transition hover:border-brand hover:text-brand">
                      <PlusCircle className="h-5 w-5" />
                      <input type="file" accept="image/*" multiple onChange={handleReviewImages} className="hidden" />
                    </label>
                  ) : null}
                </div>
                <p className="mt-1 text-[11.5px] text-muted-soft">{t('dash.review.photosHelp')}</p>
              </div>
              <button type="submit" disabled={submittingReview} className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
                {submittingReview ? (<><Loader2 className="h-4 w-4 animate-spin" /> {t('dash.review.submitting')}</>) : t('dash.review.submit')}
              </button>
            </form>
          )}
        </BottomSheet>
      ) : null}
    </>
  );
};

const reviewStatusChip = (status) =>
  status === 'approved' ? 'bg-brand-tint text-brand-dark' : status === 'rejected' ? 'bg-[#ffe4e9] text-[#e11d48]' : 'bg-[#fdf0d8] text-[#a86a15]';
const reviewStatusLabel = (status, t) =>
  status === 'approved'
    ? t('dash.review.status.published')
    : status === 'rejected'
      ? t('dash.review.status.declined')
      : t('dash.review.status.awaiting');

// Booking statuses from the API (pending, confirmed, cancelled, rejected, …), shown in capitals.
const bookingStatusLabel = (status, t) => {
  const key = `dash.card.status.${status}`;
  const label = t(key);
  return (label === key ? status : label).toUpperCase();
};

const TravelerBookingCard = ({ booking, tone, expanded, onToggle, onMessage, onEdit, onCancel, onReview, cancelling }) => {
  const { t } = useI18n();
  const now = Date.now();
  const driverName = booking.driver?.name || t('dash.card.driverTbd');
  const vehicleName = booking.vehicle?.model || t('dash.card.vehicleTbd');
  const seats = booking.vehicle?.seats;
  const price =
    typeof booking.payableTotal === 'number' && booking.payableTotal > 0
      ? formatCurrency(booking.payableTotal)
      : typeof booking.totalPrice === 'number' && booking.totalPrice > 0
        ? formatCurrency(booking.totalPrice)
        : null;
  const start = formatDateLabel(booking.startDate);
  const end = formatDateLabel(booking.endDate);
  const route = booking.startPoint && booking.endPoint ? `${booking.startPoint} → ${booking.endPoint}` : vehicleName;
  const past = booking.endDate && new Date(booking.endDate).getTime() < now;
  const cancelled = ['cancelled', 'rejected'].includes(booking.status);
  const startMs = booking.startDate ? new Date(booking.startDate).getTime() : null;
  const daysAway = startMs ? Math.ceil((startMs - now) / 86400000) : null;
  // `past` must be checked before the plain "confirmed" branch below, or a finished
  // trip whose status was never anything but 'confirmed' would show CONFIRMED forever.
  const chip = cancelled
    ? { text: bookingStatusLabel(booking.status, t), cls: 'bg-[#ffe4e9] text-[#e11d48]', border: '#f43f5e' }
    : booking.status === 'confirmed' && past
    ? { text: bookingStatusLabel('completed', t), cls: 'bg-[#eef1f0] text-muted', border: '#d6e9fb' }
    : booking.status === 'confirmed' && daysAway !== null && daysAway > 0 && daysAway <= 3
    ? { text: t('dash.card.startsIn', { count: daysAway }).toUpperCase(), cls: 'bg-[#e5f0fb] text-[#1d6fb8]', border: '#d6e9fb' }
    : booking.status === 'confirmed'
    ? { text: bookingStatusLabel('confirmed', t), cls: 'bg-brand-tint text-brand-dark', border: '#10a35a' }
    : past
    ? { text: bookingStatusLabel('completed', t), cls: 'bg-[#eef1f0] text-muted', border: '#d6e9fb' }
    : { text: bookingStatusLabel(booking.status || 'pending', t), cls: 'bg-[#fdf0d8] text-[#a86a15]', border: '#f0b429' };
  const canManage = !cancelled && !past;
  const showReviewPrompt = booking.canReview && !booking.review;

  return (
    <div className="min-w-0 rounded-[18px] bg-white p-[15px] shadow-card" style={{ borderLeft: `4px solid ${chip.border}` }}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase ${chip.cls}`}>{chip.text}</span>
        {price ? <b className="text-[16px] text-ink">{price}</b> : null}
      </div>
      <div className="flex items-center gap-[11px]">
        <Avatar name={driverName} tone={tone} className="h-10 w-10 text-sm" />
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold text-ink">{driverName}</div>
          <div className="truncate text-[12px] text-muted-soft">
            {vehicleName}
            {seats ? ` · ${t('dash.card.seats', { count: seats })}` : ''}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-canvas px-[13px] py-[11px] text-[13px]">
        <div className="flex items-center gap-1.5 font-bold text-ink">
          <MapPin className="h-3.5 w-3.5 text-brand" />
          <span className="truncate">{route}</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-muted">
          <CalendarDays className="h-3.5 w-3.5 text-muted-soft" />
          {start && end ? `${start} – ${end}` : t('dash.card.datesTbd')}
        </div>
      </div>

      {booking.review ? (
        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-hairline bg-canvas px-3 py-2">
          <span className={`rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase ${reviewStatusChip(booking.review.status)}`}>
            {reviewStatusLabel(booking.review.status, t)}
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-star">
            <Star className="h-3.5 w-3.5" fill="#f5b042" stroke="none" />
            {booking.review.rating}/5
          </span>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onMessage} className="flex-1 rounded-[11px] bg-brand py-[11px] text-[13.5px] font-bold text-white transition hover:bg-brand-dark">
          {t('dash.card.messageDriver')}
        </button>
        <button type="button" onClick={onToggle} className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-[11px] text-[13.5px] font-bold text-ink transition hover:border-muted-soft">
          {t('dash.card.details')}
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-hairline pt-3">
          {booking.vehicle?.id ? (
            <Link to={`/vehicles/${booking.vehicle.id}`} className="rounded-[10px] border-[1.5px] border-[#e2e8ea] py-2 text-center text-[12.5px] font-bold text-ink transition hover:border-muted-soft">
              {t('dash.card.viewVehicle')}
            </Link>
          ) : null}
          {canManage ? (
            <div className="flex gap-2">
              <button type="button" onClick={onEdit} className="flex-1 rounded-[10px] border-[1.5px] border-[#e2e8ea] py-2 text-[12.5px] font-bold text-ink transition hover:border-muted-soft">
                {t('dash.card.editDetails')}
              </button>
              <button type="button" onClick={onCancel} disabled={cancelling} className="flex-1 rounded-[10px] border-[1.5px] border-[#ffd3d9] py-2 text-[12.5px] font-bold text-[#f43f5e] transition hover:border-[#f43f5e] disabled:opacity-60">
                {cancelling ? t('dash.cancel.cancelling') : t('dash.cancel.title')}
              </button>
            </div>
          ) : null}
          {booking.review ? (
            <button type="button" onClick={onReview} className="rounded-[10px] border-[1.5px] border-[#e2e8ea] py-2 text-[12.5px] font-bold text-ink transition hover:border-muted-soft">
              {t('dash.card.viewReview')}
            </button>
          ) : showReviewPrompt ? (
            <button type="button" onClick={onReview} className="flex items-center justify-center gap-1.5 rounded-[10px] bg-brand-tint py-2 text-[12.5px] font-bold text-brand-dark">
              <Star className="h-3.5 w-3.5" /> {t('dash.card.leaveReview')}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

// ---------- Messages ----------
const TravelerMessages = ({
  onMenu,
  travelerName,
  conversationsState,
  selectedConversation,
  onSelectConversation,
  messagesState,
  composerValue,
  onComposerChange,
  onSendMessage,
  sending,
  onBookOffer,
  onRequestNewOffer,
  requestingOfferId,
  onReloadConversations,
}) => {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const { loading: convLoading, error: convError, items: conversations } = conversationsState;
  const { loading: msgLoading, error: msgError, items: messages, booking: conversationBooking } = messagesState;
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [driverProfileOpen, setDriverProfileOpen] = useState(false);
  const mobileComposerRef = useRef(null);
  const desktopComposerRef = useRef(null);

  // Open a conversation at its newest messages, and follow new ones as they
  // arrive. One marker per layout; the hidden layout's marker is a no-op.
  const mobileEndRef = useRef(null);
  const desktopEndRef = useRef(null);
  const lastShownRef = useRef({ conversationId: '', messageId: '' });
  const activeConversationId = selectedConversation?.id || '';
  const newestMessageId = messages.length > 0 ? messages[messages.length - 1].id : '';
  useEffect(() => {
    if (!activeConversationId) {
      lastShownRef.current = { conversationId: '', messageId: '' };
      return;
    }
    if (!newestMessageId) return;
    const shown = lastShownRef.current;
    if (shown.conversationId === activeConversationId && shown.messageId === newestMessageId) return;
    // Jump when the thread is first shown; glide when a message is added to it.
    const behavior = shown.conversationId === activeConversationId ? 'smooth' : 'auto';
    lastShownRef.current = { conversationId: activeConversationId, messageId: newestMessageId };
    // Next frame, once the new messages are laid out. Deliberately not cancelled
    // on cleanup: the position is already recorded above, so a cancelled frame
    // would never be retried.
    requestAnimationFrame(() => {
      mobileEndRef.current?.scrollIntoView({ block: 'end', behavior });
      desktopEndRef.current?.scrollIntoView({ block: 'end', behavior });
    });
  }, [activeConversationId, newestMessageId]);

  useEffect(() => {
    if (!composerValue) {
      if (mobileComposerRef.current) mobileComposerRef.current.style.height = '';
      if (desktopComposerRef.current) desktopComposerRef.current.style.height = '';
    }
  }, [composerValue]);

  const driverNameOf = (conversation) =>
    conversation?.participants?.driver?.name || conversation?.participants?.driver?.email || t('dash.driver');
  const driverPhotoOf = (conversation) => conversation?.participants?.driver?.profilePhoto || '';
  const filtered = conversations.filter((c) => driverNameOf(c).toLowerCase().includes(search.trim().toLowerCase()));

  const activeName = selectedConversation ? driverNameOf(selectedConversation) : '';
  const activeSubtitle = selectedConversation?.vehicle?.model
    ? t('dash.chat.discussing', { model: selectedConversation.vehicle.model })
    : t('dash.chat.general');
  const activeDriverId = selectedConversation?.participants?.driver?.id;
  const activeDriverPhoto = selectedConversation ? driverPhotoOf(selectedConversation) : '';
  const activeDriverLicenseType = selectedConversation?.participants?.driver?.licenseType || null;
  const openDriverProfile = () => { if (activeDriverId) setDriverProfileOpen(true); };

  const chatMessages =
    msgLoading && messages.length === 0 ? (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-brand" /> {t('dash.chat.loadingMessages')}
      </div>
    ) : msgError ? (
      <div className="flex flex-1 items-center justify-center text-sm text-[#e11d48]">{msgError}</div>
    ) : messages.length === 0 ? (
      <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-muted">
        {t('dash.chat.introduce')}
      </div>
    ) : (
      messages.map((message, index) => {
        const isTraveller = message.sender?.role === 'guest' || message.senderRole === 'guest';
        const align = isTraveller ? 'end' : 'start';
        const meta = <MessageMeta message={message} mine={isTraveller} />;
        if (message.type === 'brief' && message.briefRequest) {
          return (
            <div key={message.id}>
              <BriefRequestBubble message={message} align={align} />
              {meta}
            </div>
          );
        }
        if (message.type === 'offer' && message.offer) {
          return (
            <div key={message.id}>
              <TravelerOfferBubble
                message={message}
                align={align}
                onBook={() => onBookOffer(message)}
                onRequestNew={() => onRequestNewOffer?.(message)}
                requesting={requestingOfferId === message.id}
                followUp={offerFollowUp(messages.slice(index + 1))}
              />
              {meta}
            </div>
          );
        }
        return (
          <div key={message.id}>
          <div className={`flex ${isTraveller ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-[13px] py-[10px] text-[13.5px] shadow-[0_2px_8px_rgba(15,31,45,0.05)] ${isTraveller ? 'rounded-[14px_14px_4px_14px] bg-brand text-white' : 'rounded-[14px_14px_14px_4px] bg-white text-ink'}`}>
              <div className="whitespace-pre-wrap">{message.body}</div>
              {message.warning ? (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#fdf0d8] px-2 py-1.5 text-[11px] font-semibold text-[#a86a15]">
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" />
                  <span>{localizeServerMessage(message.warning)}</span>
                </div>
              ) : null}
            </div>
          </div>
          {meta}
          </div>
        );
      })
    );

  const submitMessage = (event) => {
    event.preventDefault();
    if (composerValue.trim()) onSendMessage();
  };

  // Notice at the top of the thread when there's a booking with this driver.
  const bookingNotice = conversationBooking ? (
    <button
      type="button"
      onClick={() => setBookingDetailOpen(true)}
      className="flex w-full items-center gap-2.5 rounded-[14px] border border-brand/25 bg-brand-tint px-3.5 py-2.5 text-left transition hover:border-brand"
    >
      <CalendarDays className="h-5 w-5 flex-shrink-0 text-brand-dark" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold text-ink">
          {conversationBooking.status === 'confirmed'
            ? t('dash.chat.bookingConfirmed')
            : t('dash.chat.bookingWithDriver')}
        </span>
        <span className="block truncate text-[12px] text-muted">{t('dash.chat.tapForDetails')}</span>
      </span>
      <span className="flex-shrink-0 text-[15px] font-extrabold text-brand-dark">›</span>
    </button>
  ) : null;

  const conversationList = (variant) => {
    if (convLoading) {
      return (
        <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> {t('dash.chat.loadingConversations')}
        </div>
      );
    }
    if (convError) {
      return (
        <div className="m-4 rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
          <p className="text-[#e11d48]">{convError}</p>
          <button type="button" onClick={onReloadConversations} className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft">
            {t('dash.tryAgain')}
          </button>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="m-4 rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
          {conversations.length === 0 ? t('dash.chat.emptyList') : t('dash.chat.noMatch')}
        </div>
      );
    }
    return filtered.map((conversation, index) => {
      const name = driverNameOf(conversation);
      const photo = driverPhotoOf(conversation);
      const preview = conversation.lastMessage?.body || t('dash.conversationStarted');
      const timestamp = formatShortDateTime(conversation.lastMessageAt || conversation.updatedAt);
      const unread = conversation.unreadCount > 0;
      const active = variant === 'desktop' && conversation.id === selectedConversation?.id;
      const latestOffer = conversation.latestOffer;
      // Same "trust the date, not the status" rule as the offer card itself.
      const offerState = !latestOffer
        ? null
        : offerExpiryNotice(latestOffer)?.tone === 'expired'
          ? 'expired'
          : latestOffer.status;
      const offerLive = offerState === 'pending' || offerState === 'accepted';
      return (
        <button
          key={conversation.id}
          type="button"
          onClick={() => onSelectConversation(conversation.id)}
          className={`flex w-full items-center gap-[11px] py-3.5 text-left ${
            variant === 'desktop'
              ? `px-[18px] border-l-[3px] ${active ? 'border-brand bg-[#f3fbf6]' : 'border-transparent hover:bg-canvas'}`
              : `px-3.5 ${index > 0 ? 'border-t border-hairline' : ''} ${unread ? 'bg-[#f3fbf6]' : ''}`
          }`}
        >
          <Avatar name={name} image={photo} tone={AVATAR_TONES[index % AVATAR_TONES.length]} className="h-11 w-11 flex-shrink-0 rounded-[11px] text-sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[14.5px] font-bold text-ink">{name}</span>
              <span className="flex-shrink-0 text-[11px] text-muted-soft">{timestamp}</span>
            </div>
            <div className="flex items-center gap-1 text-[12.5px] text-ink-soft">
              {conversation.lastMessage?.mine ? (
                <CheckCheck
                  className={`h-3.5 w-3.5 flex-shrink-0 ${conversation.lastMessage.readByRecipient ? 'text-brand' : 'text-muted-soft'}`}
                  aria-label={conversation.lastMessage.readByRecipient ? t('dash.chat.read') : t('dash.chat.sent')}
                />
              ) : null}
              <span className="truncate">{preview}</span>
            </div>
            {latestOffer ? (
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-extrabold ${offerLive ? 'bg-brand-tint text-brand-dark' : 'bg-[#eef1f0] text-muted-soft line-through'}`}>
                  {formatCurrency(latestOffer.totalPrice)}
                </span>
                <span className="text-[11px] font-semibold text-muted-soft">
                  {offerState === 'accepted'
                    ? t('dash.chat.offerAccepted')
                    : offerState === 'expired'
                      ? t('dash.chat.offerExpired')
                      : offerState === 'declined'
                        ? t('dash.chat.offerDeclined')
                        : t('dash.chat.latestOffer')}
                </span>
              </div>
            ) : null}
          </div>
          {unread ? (
            <span className="ml-1 min-w-[18px] rounded-full bg-brand px-[5px] py-0.5 text-center text-[11px] font-extrabold text-white">
              {conversation.unreadCount}
            </span>
          ) : null}
        </button>
      );
    });
  };

  return (
    <>
      {/* MOBILE: list <-> thread */}
      <div className="lg:hidden">
        {selectedConversation ? (
          <div className="flex min-h-screen flex-col">
            {/* Pinned like the composer below, so who you are chatting with (and the way back) stays in reach in a long thread. */}
            <div className="sticky top-0 z-20 text-white shadow-[0_2px_10px_rgba(15,31,45,0.12)]" style={{ background: 'linear-gradient(160deg,#0f7a45,#10a35a 55%,#18b866)' }}>
              <div className="flex items-center gap-3 px-4 pb-4 pt-4">
                <button type="button" onClick={() => onSelectConversation('')} aria-label={t('dash.back')} className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white/[0.18] transition hover:bg-white/25">
                  <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
                <button
                  type="button"
                  onClick={openDriverProfile}
                  disabled={!activeDriverId}
                  aria-label={t('dash.chat.viewProfile', { name: activeName })}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 pr-2 text-left transition active:bg-white/10 disabled:cursor-default"
                >
                  <Avatar name={activeName} image={activeDriverPhoto} tone="light" className="h-10 w-10 flex-shrink-0 text-[15px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="truncate text-[16px] font-extrabold">{activeName}</div>
                      <LicenseIconBadge licenseType={activeDriverLicenseType} />
                    </div>
                    {activeDriverLicenseType ? (
                      <LicenseTypeChip licenseType={activeDriverLicenseType} className="!mt-0" />
                    ) : (
                      <div className="truncate text-[12px] text-white/80">{activeSubtitle}</div>
                    )}
                  </div>
                  {activeDriverId ? <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/70" /> : null}
                </button>
              </div>
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">
                {bookingNotice}
                {chatMessages}
                {/* scroll-mb keeps the last message clear of the pinned composer */}
                <div ref={mobileEndRef} className="scroll-mb-24" aria-hidden="true" />
              </div>
              <div className="sticky bottom-0 z-10 border-t border-hairline bg-white px-4 py-3">
                <form onSubmit={submitMessage} className="flex items-end gap-2.5">
                  <textarea
                    ref={mobileComposerRef}
                    rows={1}
                    value={composerValue}
                    onChange={(e) => {
                      onComposerChange(e.target.value);
                      autoGrowTextarea(e.target, 100);
                    }}
                    placeholder={t('dash.chat.placeholder')}
                    className="max-h-[100px] min-h-[38px] min-w-0 flex-1 resize-none rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2 text-[13px] leading-snug text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
                  />
                  <button type="submit" disabled={!composerValue.trim() || sending} aria-label={t('dash.chat.send')} className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-brand transition hover:bg-brand-dark disabled:opacity-50">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-[17px] w-[17px] text-white" />}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <>
            <MobileHeader onMenu={onMenu} right={<Avatar name={travelerName} tone="light" className="h-10 w-10 text-[15px]" />} eyebrow={t('dash.chat.eyebrow')} title={t('dash.nav.messages')} />
            <Sheet>
              <div className="mb-3.5 flex items-center gap-2.5 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5">
                <Search className="h-4 w-4 flex-shrink-0 text-muted-soft" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('dash.chat.search')} className="w-full min-w-0 bg-transparent text-[13.5px] text-ink placeholder:text-[#adb8c0] focus:outline-none" />
              </div>
              <div className="overflow-hidden rounded-[18px] bg-white shadow-card">{conversationList('mobile')}</div>
            </Sheet>
          </>
        )}
      </div>

      {/* DESKTOP: conversation list + chat pane (navy sidebar is the 3rd pane) */}
      <div className="hidden h-screen lg:flex">
        <div className="flex w-[340px] flex-shrink-0 flex-col border-r border-hairline bg-white">
          <div className="px-[18px] pb-3.5 pt-5">
            <h1 className="mb-3 text-[20px] font-extrabold text-ink">{t('dash.nav.messages')}</h1>
            <div className="flex items-center gap-2.5 rounded-[11px] border-[1.5px] border-[#e2e8ea] px-3 py-2.5">
              <Search className="h-4 w-4 flex-shrink-0 text-muted-soft" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('dash.chat.search')} className="w-full min-w-0 bg-transparent text-[13px] text-ink placeholder:text-[#adb8c0] focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">{conversationList('desktop')}</div>
        </div>

        <div className="flex flex-1 flex-col bg-canvas">
          {selectedConversation ? (
            <>
              <div className="flex h-[72px] flex-shrink-0 items-center border-b border-hairline bg-white px-6">
                <button
                  type="button"
                  onClick={openDriverProfile}
                  disabled={!activeDriverId}
                  aria-label={t('dash.chat.viewProfile', { name: activeName })}
                  className="group flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1.5 pr-3 text-left transition hover:bg-canvas disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <Avatar name={activeName} image={activeDriverPhoto} tone="brand" className="h-10 w-10 flex-shrink-0 rounded-[11px] text-[15px]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <b className="block truncate text-[15px] text-ink">{activeName}</b>
                      <LicenseIconBadge licenseType={activeDriverLicenseType} />
                    </div>
                    {activeDriverLicenseType ? (
                      <LicenseTypeChip licenseType={activeDriverLicenseType} className="!mt-0" />
                    ) : (
                      <div className="truncate text-[12px] text-muted-soft">{activeSubtitle}</div>
                    )}
                  </div>
                  {activeDriverId ? <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-soft transition group-hover:text-brand-dark" /> : null}
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-6 py-6">
                {bookingNotice}
                {chatMessages}
                <div ref={desktopEndRef} aria-hidden="true" />
              </div>
              <div className="flex-shrink-0 border-t border-hairline bg-white px-6 py-4">
                <form onSubmit={submitMessage} className="flex items-end gap-2.5">
                  <textarea
                    ref={desktopComposerRef}
                    rows={1}
                    value={composerValue}
                    onChange={(e) => {
                      onComposerChange(e.target.value);
                      autoGrowTextarea(e.target, 120);
                    }}
                    placeholder={t('dash.chat.placeholder')}
                    className="max-h-[120px] min-h-[42px] min-w-0 flex-1 resize-none rounded-[12px] border-[1.5px] border-[#e2e8ea] bg-white px-3.5 py-2.5 text-[13.5px] leading-snug text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
                  />
                  <button type="submit" disabled={!composerValue.trim() || sending} className="h-[42px] flex-shrink-0 rounded-[12px] bg-brand px-5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50">
                    {sending ? t('dash.chat.sending') : t('dash.chat.send')}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">{t('dash.chat.select')}</div>
          )}
        </div>
      </div>
      {bookingDetailOpen ? (
        <BookingDetailsModal
          booking={conversationBooking}
          onClose={() => setBookingDetailOpen(false)}
        />
      ) : null}
      {driverProfileOpen && activeDriverId ? (
        <DriverProfileSheet
          driverId={activeDriverId}
          activeVehicleId={selectedConversation?.vehicle?.id}
          hasBooking={Boolean(conversationBooking)}
          onClose={() => setDriverProfileOpen(false)}
          onViewTripDetails={() => {
            setDriverProfileOpen(false);
            setBookingDetailOpen(true);
          }}
        />
      ) : null}
    </>
  );
};

// Sent to the driver, so it stays in English whatever language the traveller uses.
const NEW_OFFER_REQUEST_MARKER = 'has expired. Could you please send me a new offer?';

const buildNewOfferRequest = (offer) =>
  `Hi, your offer${offer?.vehicle?.model ? ` for the ${offer.vehicle.model}` : ''} ${NEW_OFFER_REQUEST_MARKER}`;

// What has happened in the chat since an (expired) offer: the driver already
// sent a newer one, or the traveller already asked for one. Derived from the
// messages so it survives a reload and never lets the request be sent twice.
const offerFollowUp = (laterMessages) => {
  if (laterMessages.some((later) => later.type === 'offer' && later.offer)) return 'newer-offer';
  if (laterMessages.some((later) => later.type !== 'offer' && (later.body || '').includes(NEW_OFFER_REQUEST_MARKER))) return 'requested';
  return null;
};

const TravelerOfferBubble = ({ message, align, onBook, onRequestNew, requesting = false, followUp = null }) => {
  const { t } = useI18n();
  const { offer } = message;
  const start = formatDateLabel(offer.startDate);
  const end = formatDateLabel(offer.endDate);
  const discount = offer.discount;
  const expiry = offerExpiryNotice(offer, undefined, t);
  const lapsed = expiry?.tone === 'expired';
  return (
    <div className={`flex ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-[16px] border-[1.5px] border-[#cdeede] bg-white p-3.5 shadow-[0_4px_14px_rgba(15,31,45,0.06)] ${lapsed && followUp ? 'opacity-70' : ''}`}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="rounded-[7px] bg-brand-tint px-2 py-[3px] text-[10.5px] font-extrabold uppercase text-brand-dark">{t('dash.offer.received')}</span>
          <div className="text-right">
            {discount ? <div className="text-[11px] font-semibold text-[#e11d48] line-through">{formatCurrency(offer.totalPrice)}</div> : null}
            <b className="text-[18px] text-ink">{formatCurrency(discount ? discount.payableTotal : offer.totalPrice)}</b>
          </div>
        </div>
        {discount ? (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 px-2.5 py-1 text-[10.5px] font-bold text-white">
            <Sparkles className="h-3 w-3" /> {t('dash.offer.discount', { name: discount.name, percent: discount.discountPercent })}
          </div>
        ) : null}
        <OfferVehicleImages
          images={offer.vehicle?.images}
          alt={offer.vehicle?.model || t('dash.offer.vehicle')}
          className="mb-2"
        />
        <div className="text-[13px] font-bold text-ink">
          {offer.vehicle?.model || t('dash.offer.selectedVehicle')} · {start}–{end}
        </div>
        <div className="mt-0.5 text-[12px] text-muted-soft">
          {t('dash.offer.kms', { km: offer.totalKms, rate: formatRate(offer.pricePerExtraKm) })}
        </div>
        <OfferInclusionList inclusions={offer.inclusions} className="mt-2" />
        {message.body ? <div className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-muted">{message.body}</div> : null}
        {expiry ? (
          <div className={`mt-2 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${offerExpiryClass(expiry.tone)}`}>
            <Clock className="h-3 w-3 flex-none" />
            {expiry.text}
          </div>
        ) : null}
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={lapsed ? onRequestNew : onBook}
            disabled={lapsed && (requesting || Boolean(followUp))}
            className="flex-1 rounded-[11px] bg-brand py-[11px] text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-brand"
          >
            {!lapsed
              ? t('dash.offer.accept')
              : requesting
                ? t('dash.chat.sending')
                : followUp === 'newer-offer'
                  ? t('dash.offer.newerBelow')
                  : followUp === 'requested'
                    ? t('dash.offer.requested')
                    : t('dash.offer.requestNew')}
          </button>
          {lapsed ? null : (
            <button type="button" onClick={() => toast(t('dash.offer.declineHint'))} className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-[11px] text-[13.5px] font-bold text-ink transition hover:border-muted-soft">
              {t('dash.offer.decline')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------- My Requests ----------
const TravelerRequests = ({ onMenu, travelerName, briefsState, onReload, onCreateBrief, creating, onOpenMessages, autoOpenForm = false, onAutoOpenHandled }) => {
  const { t } = useI18n();
  const { loading, error, items } = briefsState;
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState(() => buildBriefForm());
  // True while the form is showing a request the traveller typed before signing
  // in (homepage form or /get-quotes): it is shown back for review, not posted.
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) return; // still a guest flash before the auth redirect; leave the draft intact.
    const pending = readPendingBrief();
    if (pending) {
      setFormState((prev) => ({
        ...prev,
        ...pending,
        adults: String(pending.adults ?? prev.adults),
        children: String(pending.children ?? prev.children),
      }));
      setReviewing(true);
      setFormOpen(true);
    }
  }, []);

  const openBlankForm = () => {
    setFormState(buildBriefForm());
    setReviewing(false);
    setFormOpen(true);
  };

  // Arriving from the overview's "Request quotes" card: open the empty form
  // straight away. A draft waiting for review (above) takes priority.
  useEffect(() => {
    if (!autoOpenForm) return;
    onAutoOpenHandled?.();
    if (!readPendingBrief()) openBlankForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenForm]);

  // Closing the sheet is a decision not to post this draft, so it must not
  // reappear on the next visit.
  const closeForm = () => {
    if (reviewing) clearPendingBrief();
    setReviewing(false);
    setFormOpen(false);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onCreateBrief) return;
    const payload = {
      startDate: formState.startDate,
      endDate: formState.endDate,
      startLocation: formState.startLocation.trim(),
      endLocation: formState.endLocation.trim(),
      adults: Number(formState.adults || 0),
      children: Math.max(0, Number(formState.children || 0)),
      message: formState.message.trim(),
      country: formState.country.trim(),
      // Only /get-quotes collects these; carried through unchanged when present.
      ...(formState.maxOffers ? { maxOffers: Number(formState.maxOffers) } : {}),
      ...(formState.requiredLicenseType ? { requiredLicenseType: formState.requiredLicenseType } : {}),
      // The site language the request was started in (/de/get-quotes -> 'de').
      ...(formState.language ? { language: formState.language } : {}),
    };
    if (!payload.startDate || !payload.endDate) {
      toast.error(t('dash.requests.errors.dates'));
      return;
    }
    if (!payload.startLocation || !payload.endLocation || !payload.message || !payload.country) {
      toast.error(t('dash.requests.errors.allFields'));
      return;
    }
    if (payload.adults < 1) {
      toast.error(t('dash.requests.errors.adults'));
      return;
    }
    try {
      await onCreateBrief(payload);
      clearPendingBrief();
      setFormState(buildBriefForm());
      setReviewing(false);
      setFormOpen(false);
    } catch (submitError) {
      console.warn('Create brief failed', submitError);
    }
  };

  const renderBriefCard = (brief) => {
    const start = formatDateLabel(brief.startDate);
    const end = formatDateLabel(brief.endDate);
    const hasOffers = brief.offersCount > 0;
    const isBooked = brief.status === 'booked';
    const guests = guestsLabel(brief, t);
    return (
      <article key={brief.id} className="min-w-0 rounded-[18px] bg-white p-4 shadow-card" style={hasOffers ? { borderLeft: '4px solid #10a35a' } : undefined}>
        <div className="flex items-start justify-between gap-2">
          <b className="min-w-0 truncate text-[15.5px] text-ink">
            {brief.startLocation} → {brief.endLocation}
          </b>
          {isBooked ? (
            <span className="flex-shrink-0 rounded-lg bg-brand px-2 py-1 text-[11px] font-extrabold uppercase text-white">
              {t('dash.requests.booked')}
            </span>
          ) : hasOffers ? (
            <span className="flex-shrink-0 rounded-lg bg-brand-tint px-2 py-1 text-[11px] font-extrabold uppercase text-brand-dark">
              {t('dash.offersCount', { count: brief.offersCount })}
            </span>
          ) : (
            <span className="flex-shrink-0 text-[11px] font-bold text-muted-soft">{t('dash.awaitingOffers')}</span>
          )}
        </div>
        <div className="my-3 flex flex-wrap gap-1.5">
          {start && end ? <RequestTag>{`${start} – ${end}`}</RequestTag> : null}
          <RequestTag>{guests}</RequestTag>
          {brief.country ? <RequestTag>{brief.country}</RequestTag> : null}
        </div>
        {brief.message ? <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-muted">{brief.message}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenMessages}
            disabled={!hasOffers}
            className={`flex-1 rounded-[11px] py-2.5 text-[13.5px] font-bold transition ${hasOffers ? 'bg-brand text-white hover:bg-brand-dark' : 'border-[1.5px] border-[#e2e8ea] bg-white text-muted'}`}
          >
            {t('dash.viewOffers')}
          </button>
          <button
            type="button"
            onClick={openBlankForm}
            className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-2.5 text-[13.5px] font-bold text-ink transition hover:border-muted-soft"
          >
            {t('dash.requests.new')}
          </button>
        </div>
      </article>
    );
  };

  const head = (
    <MobileHeader
      onMenu={onMenu}
      right={<Avatar name={travelerName} tone="light" className="h-10 w-10 text-[15px]" />}
      eyebrow={t('dash.requests.eyebrow')}
      title={t('dash.requests.title')}
      subtitle={t('dash.requests.subtitle')}
    />
  );

  if (loading) {
    return (
      <>
        {head}
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> {t('dash.requests.loading')}
          </div>
        </Sheet>
      </>
    );
  }

  if (error) {
    return (
      <>
        {head}
        <Sheet>
          <div className="rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
            <p className="text-[#e11d48]">{error}</p>
            <button type="button" onClick={onReload} className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft">
              {t('dash.tryAgain')}
            </button>
          </div>
        </Sheet>
      </>
    );
  }

  return (
    <>
      <div className="lg:hidden">
      {head}
      <Sheet>
        <button
          type="button"
          onClick={openBlankForm}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[14.5px] font-extrabold text-white transition hover:bg-brand-dark"
        >
          <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2} />
          {t('dash.requests.postNew')}
        </button>

        {items.length === 0 ? (
          <div className="mt-4 rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            <b className="mb-1 block text-ink">{t('dash.requests.emptyTitle')}</b>
            {t('dash.requests.emptyBody')}
          </div>
        ) : (
          <div className="mt-3.5 grid gap-3 lg:grid-cols-2">
            {items.map((brief) => {
              const start = formatDateLabel(brief.startDate);
              const end = formatDateLabel(brief.endDate);
              const hasOffers = brief.offersCount > 0;
              const guests = guestsLabel(brief, t);
              return (
                <article key={brief.id} className="min-w-0 rounded-[18px] bg-white p-4 shadow-card" style={hasOffers ? { borderLeft: '4px solid #10a35a' } : undefined}>
                  <div className="flex items-start justify-between gap-2">
                    <b className="min-w-0 truncate text-[15.5px] text-ink">
                      {brief.startLocation} → {brief.endLocation}
                    </b>
                    {hasOffers ? (
                      <span className="flex-shrink-0 rounded-lg bg-brand-tint px-2 py-1 text-[11px] font-extrabold uppercase text-brand-dark">
                        {t('dash.offersCount', { count: brief.offersCount })}
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-[11px] font-bold text-muted-soft">{t('dash.awaitingOffers')}</span>
                    )}
                  </div>
                  <div className="my-3 flex flex-wrap gap-1.5">
                    {start && end ? <RequestTag>{`${start} – ${end}`}</RequestTag> : null}
                    <RequestTag>{guests}</RequestTag>
                    {brief.country ? <RequestTag>{brief.country}</RequestTag> : null}
                  </div>
                  {brief.message ? <p className="mb-3 line-clamp-2 text-[13px] leading-relaxed text-muted">{brief.message}</p> : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={onOpenMessages}
                      disabled={!hasOffers}
                      className={`flex-1 rounded-[11px] py-2.5 text-[13.5px] font-bold transition ${hasOffers ? 'bg-brand text-white hover:bg-brand-dark' : 'border-[1.5px] border-[#e2e8ea] bg-white text-muted'}`}
                    >
                      {t('dash.viewOffers')}
                    </button>
                    <button
                      type="button"
                      onClick={openBlankForm}
                      className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-2.5 text-[13.5px] font-bold text-ink transition hover:border-muted-soft"
                    >
                      {t('dash.requests.new')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Sheet>
      </div>

      <div className="hidden lg:block">
        <div className="px-8 py-8">
          <DesktopTitleBar title={t('dash.requests.title')}>
            <button
              type="button"
              onClick={openBlankForm}
              className="rounded-[11px] bg-brand px-[18px] py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-dark"
            >
              {t('dash.requests.postNew')}
            </button>
          </DesktopTitleBar>
          {items.length === 0 ? (
            <div className="rounded-[18px] bg-white p-6 text-sm text-muted shadow-card">
              <b className="mb-1 block text-ink">{t('dash.requests.emptyTitle')}</b>
              {t('dash.requests.emptyBody')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">{items.map(renderBriefCard)}</div>
          )}
        </div>
      </div>

      {formOpen ? (
        <BottomSheet title={reviewing ? t('dash.requests.form.reviewTitle') : t('dash.requests.form.title')} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {reviewing ? (
              <p className="rounded-xl bg-brand-tint px-3.5 py-3 text-[13px] font-semibold leading-relaxed text-ink">
                {t('dash.requests.form.reviewNote')}
              </p>
            ) : null}
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.form.startDate')}</label>
                <DateField name="startDate" value={formState.startDate} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.form.endDate')}</label>
                <DateField name="endDate" value={formState.endDate} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.requests.form.from')}</label>
                <input type="text" name="startLocation" value={formState.startLocation} onChange={handleFieldChange} placeholder={t('dash.requests.form.fromPlaceholder')} className={`mt-1 ${inputCls}`} required />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.requests.form.to')}</label>
                <input type="text" name="endLocation" value={formState.endLocation} onChange={handleFieldChange} placeholder={t('dash.requests.form.toPlaceholder')} className={`mt-1 ${inputCls}`} required />
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.requests.form.adults')}</label>
                <input type="number" min="1" name="adults" value={formState.adults} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>{t('dash.requests.form.children')}</label>
                <input type="number" min="0" name="children" value={formState.children} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>{t('dash.requests.form.country')}</label>
              <input type="text" name="country" value={formState.country} onChange={handleFieldChange} placeholder={t('dash.requests.form.countryPlaceholder')} className={`mt-1 ${inputCls}`} required />
            </div>
            <div>
              <label className={labelCls}>{t('dash.requests.form.details')}</label>
              <textarea name="message" rows={4} value={formState.message} onChange={handleFieldChange} placeholder={t('dash.requests.form.detailsPlaceholder')} className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" required />
              <span className="mt-1.5 block text-[11.5px] leading-[1.5] text-muted-soft">
                {t('dash.requests.form.noContact')}
              </span>
            </div>
            {formState.maxOffers || formState.requiredLicenseType ? (
              <p className="text-[12px] font-semibold text-muted">
                {[
                  formState.maxOffers ? t('dash.requests.form.upTo', { count: formState.maxOffers }) : null,
                  formState.requiredLicenseType
                    ? t('dash.requests.form.onlyType', { type: translateLicenseType(formState.requiredLicenseType, t) })
                    : null,
                ].filter(Boolean).join(' · ')}
              </p>
            ) : null}
            <div className="rounded-xl border border-[#e2e8ea] bg-[#f9fbfa] px-3.5 py-3 text-[12.5px] leading-relaxed text-muted">
              <b className="mb-0.5 block text-ink">{t('dash.requests.form.nextTitle')}</b>
              {t('dash.requests.form.nextBody')}
            </div>
            <button type="submit" disabled={creating} className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
              {creating ? (<><Loader2 className="h-4 w-4 animate-spin" /> {t('dash.requests.form.posting')}</>) : reviewing ? t('dash.requests.form.postToDrivers') : t('dash.requests.form.post')}
            </button>
          </form>
        </BottomSheet>
      ) : null}
    </>
  );
};

const RequestTag = ({ children }) => (
  <span className="rounded-lg bg-[#eef1f0] px-2.5 py-[5px] text-[11.5px] font-bold text-ink-soft">{children}</span>
);

// ---------- Settings ----------
const TravelerSettings = ({ onMenu, travelerName, state, onSave, onPasswordChange, onRetry }) => {
  const { t } = useI18n();
  const { loading, error, data, savingProfile, savingPassword } = state;
  const [formState, setFormState] = useState(() => buildTravelerProfileForm(data));
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });

  useEffect(() => {
    setFormState(buildTravelerProfileForm(data));
  }, [data]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!onSave) return;
    try {
      await onSave({ name: formState.name, contactNumber: formState.contactNumber, address: formState.address });
    } catch (err) {
      console.warn('Profile update failed', err);
    }
  };

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!onPasswordChange) return;
    if (!passwordForm.password || passwordForm.password !== passwordForm.confirmPassword) {
      toast.error(t('dash.settings.mismatch'));
      return;
    }
    try {
      await onPasswordChange({ currentPassword: passwordForm.currentPassword, password: passwordForm.password });
      setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
    } catch (err) {
      console.warn('Password update failed', err);
    }
  };

  const head = (
    <MobileHeader
      onMenu={onMenu}
      right={<Avatar name={travelerName} tone="light" className="h-10 w-10 text-[15px]" />}
      eyebrow={t('dash.settings.eyebrow')}
      title={t('dash.nav.settings')}
      subtitle={t('dash.settings.subtitle')}
    />
  );

  if (loading) {
    return (
      <>
        {head}
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> {t('dash.settings.loading')}
          </div>
        </Sheet>
      </>
    );
  }

  if (error) {
    return (
      <>
        {head}
        <Sheet>
          <div className="rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
            <p className="text-[#e11d48]">{error}</p>
            <button type="button" onClick={onRetry} className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft">
              {t('dash.retry')}
            </button>
          </div>
        </Sheet>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {head}
        <Sheet>
          <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">{t('dash.settings.noProfile')}</div>
        </Sheet>
      </>
    );
  }

  return (
    <>
      <div className="lg:hidden">
      {head}
      <Sheet>
        <form onSubmit={handleProfileSubmit} className="rounded-[18px] bg-white p-4 shadow-card">
          <div>
            <label className={labelCls} htmlFor="traveler-name">{t('dash.settings.fullName')}</label>
            <input id="traveler-name" name="name" value={formState.name} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-email">{t('dash.settings.email')}</label>
            <input id="traveler-email" value={data.email} readOnly className="mt-1 h-11 w-full cursor-not-allowed rounded-xl border-[1.5px] border-[#e2e8ea] bg-canvas px-3 text-sm font-medium text-muted-soft" />
            <p className="mt-1 text-[11.5px] text-muted-soft">{t('dash.settings.emailHelp')}</p>
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-contact">{t('dash.settings.contact')}</label>
            <input id="traveler-contact" name="contactNumber" value={formState.contactNumber} onChange={handleFieldChange} placeholder={t('dash.settings.contactPlaceholder', { example: '+94 71 123 4567' })} className={`mt-1 ${inputCls}`} />
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-address">{t('dash.settings.homeBase')}</label>
            <input id="traveler-address" name="address" value={formState.address} onChange={handleFieldChange} placeholder={t('dash.settings.homeBasePlaceholder')} className={`mt-1 ${inputCls}`} />
          </div>
          <button type="submit" disabled={savingProfile} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
            {savingProfile ? (<><Loader2 className="h-4 w-4 animate-spin" /> {t('dash.saving')}</>) : t('dash.saveChanges')}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="mt-3 rounded-[18px] bg-white p-4 shadow-card">
          <b className="text-[15px] text-ink">{t('dash.settings.resetPassword')}</b>
          <p className="mb-3 mt-0.5 text-[12.5px] text-muted-soft">{t('dash.settings.resetHelp')}</p>
          <div>
            <label className={labelCls} htmlFor="traveler-password-current">{t('dash.settings.currentPassword')}</label>
            <input id="traveler-password-current" name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required />
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-password-new">{t('dash.settings.newPassword')}</label>
            <input id="traveler-password-new" name="password" type="password" value={passwordForm.password} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required minLength={8} />
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-password-confirm">{t('dash.settings.confirmPassword')}</label>
            <input id="traveler-password-confirm" name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required />
          </div>
          <button type="submit" disabled={savingPassword} className="mt-4 w-full rounded-[14px] border-[1.5px] border-[#e2e8ea] bg-white py-[13px] text-[14px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-70">
            {savingPassword ? t('dash.settings.updating') : t('dash.settings.updatePassword')}
          </button>
        </form>
        <DeleteAccountCard requiresPassword={data.authProvider === 'local'} />
      </Sheet>
      </div>

      <div className="hidden lg:block">
        <div className="px-8 py-8">
          <div className="mx-auto max-w-[560px]">
            <h1 className="text-[24px] font-extrabold tracking-tight text-ink">{t('dash.nav.settings')}</h1>
            <p className="mt-1 text-[14px] text-muted">{t('dash.settings.subtitle')}</p>
            <form onSubmit={handleProfileSubmit} className="mt-5 rounded-[18px] bg-white p-6 shadow-card">
              <div className="flex gap-3.5">
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>{t('dash.settings.fullName')}</label>
                  <input name="name" value={formState.name} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
                </div>
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>{t('dash.settings.contact')}</label>
                  <input name="contactNumber" value={formState.contactNumber} onChange={handleFieldChange} placeholder="+94 71 123 4567" className={`mt-1 ${inputCls}`} />
                </div>
              </div>
              <div className="mt-3.5">
                <label className={labelCls}>{t('dash.settings.email')}</label>
                <input value={data.email} readOnly className="mt-1 h-11 w-full cursor-not-allowed rounded-xl border-[1.5px] border-[#e2e8ea] bg-canvas px-3 text-sm font-medium text-muted-soft" />
                <p className="mt-1 text-[11.5px] text-muted-soft">{t('dash.settings.emailHelp')}</p>
              </div>
              <div className="mt-3.5">
                <label className={labelCls}>{t('dash.settings.homeBase')}</label>
                <input name="address" value={formState.address} onChange={handleFieldChange} placeholder={t('dash.settings.homeBasePlaceholder')} className={`mt-1 ${inputCls}`} />
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" disabled={savingProfile} className="rounded-[12px] bg-brand px-6 py-3 text-[14px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
                  {savingProfile ? t('dash.saving') : t('dash.saveChanges')}
                </button>
              </div>
            </form>
            <form onSubmit={handlePasswordSubmit} className="mt-4 rounded-[18px] bg-white p-6 shadow-card">
              <b className="text-[16px] text-ink">{t('dash.settings.resetPassword')}</b>
              <p className="mb-3 mt-1 text-[13px] text-muted-soft">{t('dash.settings.resetHelp')}</p>
              <div className="flex gap-3.5">
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>{t('dash.settings.currentPassword')}</label>
                  <input name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required />
                </div>
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>{t('dash.settings.newPassword')}</label>
                  <input name="password" type="password" value={passwordForm.password} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required minLength={8} />
                </div>
              </div>
              <div className="mt-3.5">
                <label className={labelCls}>{t('dash.settings.confirmPassword')}</label>
                <input name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required />
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" disabled={savingPassword} className="rounded-[12px] border-[1.5px] border-[#e2e8ea] bg-white px-5 py-2.5 text-[14px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-70">
                  {savingPassword ? t('dash.settings.updating') : t('dash.settings.updatePassword')}
                </button>
              </div>
            </form>
            <DeleteAccountCard requiresPassword={data.authProvider === 'local'} />
          </div>
        </div>
      </div>
    </>
  );
};

// ---------- Desktop building blocks ----------
const DeskStat = ({ value, label }) => (
  <div className="rounded-[14px] bg-white/15 px-5 py-3.5 text-center">
    <div className="text-[22px] font-extrabold">{value}</div>
    <div className="text-[11.5px] text-white/80">{label}</div>
  </div>
);

const DeskTripRow = ({ booking, tone }) => {
  const { t } = useI18n();
  const driverName = booking.driver?.name || t('dash.driver');
  const vehicleName = booking.vehicle?.model || t('dash.offer.vehicle');
  const route = booking.startPoint && booking.endPoint ? `${booking.startPoint} → ${booking.endPoint}` : vehicleName;
  const start = formatDateLabel(booking.startDate);
  const end = formatDateLabel(booking.endDate);
  const dates = start && end ? `${start} – ${end}` : t('dash.card.datesTbdShort');
  const price =
    typeof booking.payableTotal === 'number' && booking.payableTotal > 0
      ? formatCurrency(booking.payableTotal)
      : typeof booking.totalPrice === 'number' && booking.totalPrice > 0
        ? formatCurrency(booking.totalPrice)
        : null;
  return (
    <div className="flex items-center gap-[13px] rounded-[14px] border border-hairline p-[13px]">
      <Avatar name={driverName} tone={tone} className="h-[42px] w-[42px] flex-shrink-0 text-sm" />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[14.5px] text-ink">{route}</b>
        <div className="truncate text-[12.5px] text-muted-soft">
          {driverName} · {dates} · {vehicleName}
        </div>
      </div>
      {price ? <b className="flex-shrink-0 text-[15px] text-ink">{price}</b> : null}
    </div>
  );
};

const DeskMsgRow = ({ conversation, tone, onOpen }) => {
  const { t } = useI18n();
  const name = conversation.participants?.driver?.name || conversation.participants?.driver?.email || t('dash.driver');
  const isOffer = conversation.lastMessage?.type === 'offer';
  const preview = isOffer
    ? `${t('dash.sentOffer')}${conversation.vehicle?.model ? ` · ${conversation.vehicle.model}` : ''}`
    : conversation.lastMessage?.body || t('dash.conversationStarted');
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-[11px] text-left">
      <Avatar name={name} image={conversation.participants?.driver?.profilePhoto} tone={tone} className="h-9 w-9 flex-shrink-0 rounded-[10px] text-[13px]" />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px] text-ink">{name}</b>
        <div className="truncate text-[12px] text-muted-soft">{preview}</div>
      </div>
    </button>
  );
};

const DesktopTitleBar = ({ title, children }) => (
  <div className="mb-5 flex items-center justify-between gap-4">
    <h1 className="text-[24px] font-extrabold tracking-tight text-ink">{title}</h1>
    {children}
  </div>
);

const DeskTabs = ({ view, onView, upcoming, completed }) => {
  const { t } = useI18n();
  return (
  <div className="flex gap-1.5 rounded-xl bg-[#eef1f0] p-1">
    <button
      type="button"
      onClick={() => onView('upcoming')}
      className={`rounded-[9px] px-4 py-2 text-[13px] font-bold transition ${view === 'upcoming' ? 'bg-brand text-white' : 'text-muted'}`}
    >
      {t('dash.overview.upcoming')}{upcoming ? ` ${upcoming}` : ''}
    </button>
    <button
      type="button"
      onClick={() => onView('completed')}
      className={`rounded-[9px] px-4 py-2 text-[13px] font-bold transition ${view === 'completed' ? 'bg-brand text-white' : 'text-muted'}`}
    >
      {t('dash.overview.completed')}{completed ? ` ${completed}` : ''}
    </button>
  </div>
  );
};

// ---------- Shared bottom sheet ----------
const BottomSheet = ({ title, onClose, children }) => {
  const { t } = useI18n();
  return (
  <div className="fixed inset-0 z-[70] flex items-end justify-center">
    <div className="absolute inset-0 bg-ink/45" onClick={onClose} aria-hidden="true" />
    <div className="relative mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] bg-canvas p-5 pb-8 shadow-drawer">
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#cbd5db]" />
      <div className="mb-3 flex items-center justify-between gap-3">
        <b className="min-w-0 truncate text-[17px] text-ink">{title}</b>
        <button type="button" onClick={onClose} aria-label={t('dash.close')} className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-white shadow-soft">
          <X className="h-4 w-4 text-ink" />
        </button>
      </div>
      {children}
    </div>
  </div>
  );
};

const formatShortDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(DATE_LOCALE, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(DATE_LOCALE, { month: 'short', day: 'numeric', year: 'numeric' });
};

const guestsLabel = (brief, t) =>
  `${t('dash.guests', { count: brief.adults })}${brief.children > 0 ? ` +${brief.children}` : ''}`;

const formatCurrency = (value) => {
  if (typeof value !== 'number') return '$0';
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

// Per-km rates are small decimals (e.g. $0.30), so keep the fractional part.
const formatRate = (value) =>
  typeof value === 'number'
    ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`
    : '$0.00';

export default TravelerDashboard;

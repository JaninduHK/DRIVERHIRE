import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  Calculator,
  CalendarDays,
  Car,
  ChevronLeft,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  PlusCircle,
  Search,
  Send,
  Settings as SettingsIcon,
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
} from '../services/profileApi.js';
import {
  fetchMyBriefs as fetchTravelerBriefs,
  createBrief as createTravelerBrief,
} from '../services/briefApi.js';
import { clearStoredToken, getStoredToken, saveReturnPath } from '../services/authToken.js';
import { DashboardSidebar, DriverDrawer, MobileHeader, Sheet } from '../components/dashboard/mobile.jsx';
import { Avatar } from '../components/dashboard/primitives.jsx';
import BookingDetailsModal from '../components/BookingDetailsModal.jsx';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: User2 },
  { id: 'bookings', label: 'My Bookings', icon: CalendarDays },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'requests', label: 'My Requests', icon: MapPin },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];
const VALID_TABS = NAV_ITEMS.map((item) => item.id);

// External browse links surfaced in the mobile drawer (navigate to public pages, not dashboard tabs).
const BROWSE_LINKS = [
  { id: 'browse-vehicles', label: 'Vehicles', icon: Car, href: '/vehicles' },
  { id: 'browse-drivers', label: 'Drivers', icon: Users, href: '/drivers' },
  { id: 'browse-trip-cost', label: 'Trip Cost', icon: Calculator, href: '/trip-cost-calculator' },
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

const BOOKING_CANCELLATION_NOTICE = [
  'Free to cancel up to 2 days before start date.',
  '50% of total cost to be paid to driver if cancelling within 2 days of start date.',
  '100% of completed days and 50% of uncompleted days to be paid to driver if cancelling after start date.',
].join('\n\n');

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

// Set by the homepage "Get driver quotes" form / "Price my own itinerary" button; read once here.
const PENDING_BRIEF_KEY = 'carwithdriver:pending-brief';

const buildTravelerProfileForm = (profile) => ({
  name: profile?.name || '',
  contactNumber: profile?.contactNumber || '',
  address: profile?.address || '',
});

const TravelerDashboard = () => {
  const [searchParams] = useSearchParams();
  const initialTab = VALID_TABS.includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [conversationsState, setConversationsState] = useState({ loading: true, error: '', items: [] });
  const [selectedConversationId, setSelectedConversationId] = useState('');
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

  const location = useLocation();
  const navigate = useNavigate();
  const travelerName = profileState?.data?.name || 'Traveller';
  const travelerFirstName = profileState?.data?.name?.split(' ')?.[0] || 'traveller';

  const unreadMessageCount = useMemo(
    () => conversationsState.items.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0),
    [conversationsState.items]
  );

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      saveReturnPath();
      navigate('/traveller/sign-in', { replace: true });
    }
  }, [navigate]);

  const handleLogout = useCallback(() => {
    clearStoredToken();
    toast.success('You have been logged out.');
    navigate('/traveller/sign-in');
  }, [navigate]);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setConversationsState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchConversations();
      const items = Array.isArray(data?.conversations) ? data.conversations : [];
      setConversationsState({ loading: false, error: '', items });
    } catch (error) {
      if (!silent) {
        setConversationsState({ loading: false, error: error?.message || 'Unable to load conversations.', items: [] });
      }
    }
  }, []);

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
      if (!silent) setMessagesState({ loading: false, error: error?.message || 'Unable to load messages.', items: [], booking: null });
    }
  }, []);

  const loadTravelerBookings = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setTravelerBookingsState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchTravelerBookings();
      setTravelerBookingsState({ loading: false, error: '', items: Array.isArray(data?.bookings) ? data.bookings : [] });
    } catch (error) {
      setTravelerBookingsState({ loading: false, error: error?.message || 'Unable to load your bookings right now.', items: [] });
    }
  }, []);

  const loadTravelerBriefs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setTravelerBriefsState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchTravelerBriefs();
      setTravelerBriefsState({ loading: false, error: '', items: Array.isArray(data?.briefs) ? data.briefs : [] });
    } catch (error) {
      setTravelerBriefsState({ loading: false, error: error?.message || 'Unable to load your tour briefs.', items: [] });
    }
  }, []);

  const loadTravelerProfile = useCallback(async ({ silent = false } = {}) => {
    setProfileState((prev) => ({ ...prev, loading: silent ? prev.loading : true, error: silent ? prev.error : '' }));
    try {
      const response = await fetchProfileCurrentUser();
      setProfileState((prev) => ({ ...prev, loading: false, error: '', data: response?.user || null }));
    } catch (error) {
      setProfileState((prev) => ({ ...prev, loading: false, data: null, error: error?.message || 'Unable to load profile.' }));
    }
  }, []);

  useEffect(() => {
    loadTravelerProfile({ silent: false });
  }, [loadTravelerProfile]);

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
  }, [activeTab, loadTravelerBriefs]);

  useEffect(() => {
    if (activeTab === 'settings' && !profileState.data && !profileState.loading) {
      loadTravelerProfile({ silent: false });
    }
  }, [activeTab, profileState.data, profileState.loading, loadTravelerProfile]);

  useEffect(() => {
    if (!location.state) return;
    const { openTab, conversationId } = location.state;
    if (openTab) setActiveTab(openTab);
    if (conversationId) setSelectedConversationId(conversationId);
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  // If the open conversation disappears, drop back to the inbox list.
  useEffect(() => {
    if (
      selectedConversationId &&
      !conversationsState.items.some((item) => item.id === selectedConversationId)
    ) {
      setSelectedConversationId('');
    }
  }, [conversationsState.items, selectedConversationId]);

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
      toast.error(error?.message || 'Unable to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleOfferBooking = (message) => {
    const vehicleRef = message?.offer?.vehicle;
    let vehicleId = null;
    if (typeof vehicleRef === 'string') vehicleId = vehicleRef;
    else if (vehicleRef && typeof vehicleRef === 'object') vehicleId = vehicleRef.id || vehicleRef._id || null;
    if (!vehicleId) {
      toast.error('Vehicle details are missing for this offer.');
      return;
    }
    navigate(`/checkout/${vehicleId}?offer=${message.id}`, { state: { offerId: message.id } });
  };

  const handleTravelerProfileSave = useCallback(
    async (payload) => {
      setProfileState((prev) => ({ ...prev, savingProfile: true }));
      try {
        await updateProfileRequest(payload);
        toast.success('Profile updated.');
        await loadTravelerProfile({ silent: true });
      } catch (error) {
        toast.error(error?.message || 'Unable to update profile.');
        throw error;
      } finally {
        setProfileState((prev) => ({ ...prev, savingProfile: false }));
      }
    },
    [loadTravelerProfile]
  );

  const handleTravelerPasswordChange = useCallback(async (payload) => {
    setProfileState((prev) => ({ ...prev, savingPassword: true }));
    try {
      await updatePasswordRequest(payload);
      toast.success('Password updated.');
    } catch (error) {
      toast.error(error?.message || 'Unable to update password.');
      throw error;
    } finally {
      setProfileState((prev) => ({ ...prev, savingPassword: false }));
    }
  }, []);

  const handleTravelerBriefCreate = useCallback(
    async (payload) => {
      setCreatingBrief(true);
      try {
        await createTravelerBrief(payload);
        toast.success('Tour brief posted.');
        await loadTravelerBriefs({ silent: true });
      } catch (error) {
        toast.error(error?.message || 'Unable to post tour brief.');
        throw error;
      } finally {
        setCreatingBrief(false);
      }
    },
    [loadTravelerBriefs]
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
    active: item.id === activeTab,
    badge: item.id === 'messages' ? unreadMessageCount : 0,
  }));
  // Mobile drawer interleaves dashboard tabs with public browse links per DRAWER_ORDER.
  const drawerItemsById = {
    ...Object.fromEntries(BROWSE_LINKS.map((link) => [link.id, link])),
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
        user={{ name: travelerName, roleLabel: 'Traveller' }}
        onLogout={handleLogout}
      />
      <DashboardSidebar
        navItems={navItems}
        onSelect={(item) => setActiveTab(item.id)}
        user={{ name: travelerName, roleLabel: 'Traveller' }}
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
  onNavigate,
  onOpenConversation,
}) => {
  const now = Date.now();
  const isCancelled = (b) => ['cancelled', 'rejected'].includes(b.status);
  const upcoming = bookings.filter((b) => !isCancelled(b) && (!b.endDate || new Date(b.endDate).getTime() >= now));
  const completed = bookings.filter((b) => b.endDate && new Date(b.endDate).getTime() < now && !isCancelled(b));
  const totalSpent = bookings
    .filter((b) => !isCancelled(b))
    .reduce((sum, b) => sum + (typeof b.totalPrice === 'number' ? b.totalPrice : 0), 0);
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
              aria-label="Messages"
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
          <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/80">TRAVELLER DASHBOARD</p>
          <h1 className="mt-1 text-[25px] font-extrabold leading-tight tracking-tight">Welcome back, {firstName}</h1>
          <p className="mt-1.5 text-[13.5px] text-white/85">
            Manage your trips, conversations, and requests all in one place.
          </p>
        </div>
      </MobileHeader>

      <Sheet>
        <div className="flex gap-2.5">
          <OverviewStat value={upcoming.length} label="Upcoming" />
          <OverviewStat value={completed.length} label="Completed" />
          <OverviewStat value={formatCurrency(totalSpent)} label="Total spent" />
        </div>

        {nextTrip ? (
          <NextTripCard trip={nextTrip} />
        ) : (
          <div className="mt-3.5 rounded-[20px] bg-white p-5 text-center text-sm text-muted shadow-card">
            No upcoming trips yet.{' '}
            <Link to="/vehicles" className="font-bold text-brand-dark">
              Browse vehicles
            </Link>
          </div>
        )}

        <div className="mb-2.5 mt-5 flex items-center gap-2.5 px-0.5">
          <b className="text-base font-extrabold text-ink">Recent messages</b>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-[#f43f5e] px-2 py-0.5 text-[11px] font-extrabold text-white">{unreadCount}</span>
          ) : null}
        </div>
        {recent.length === 0 ? (
          <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            No conversations yet. Message a driver from a vehicle page.
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
              <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/80">TRAVELLER DASHBOARD</p>
              <div className="mt-1 text-[28px] font-extrabold tracking-tight">Welcome back, {firstName}</div>
              <p className="mt-1.5 text-[14px] text-white/85">Manage your trips, conversations, and requests all in one place.</p>
            </div>
            <div className="flex flex-shrink-0 gap-3.5">
              <DeskStat value={upcoming.length} label="Upcoming" />
              <DeskStat value={completed.length} label="Completed" />
              <DeskStat value={formatCurrency(totalSpent)} label="Total spent" />
            </div>
          </div>

          <div className="mt-[22px] grid grid-cols-[1.3fr_1fr] gap-5">
            <div className="rounded-[18px] bg-white p-5 shadow-card">
              <div className="mb-3.5 flex items-center justify-between">
                <b className="text-[16px] text-ink">Upcoming trips</b>
                <button type="button" onClick={() => onNavigate('bookings')} className="text-[13px] font-bold text-brand-dark">
                  View all
                </button>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted">No upcoming trips yet.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {upcoming.slice(0, 4).map((b, i) => (
                    <DeskTripRow key={b.id} booking={b} tone={AVATAR_TONES[i % AVATAR_TONES.length]} />
                  ))}
                </div>
              )}
            </div>
            <div className="rounded-[18px] bg-white p-5 shadow-card">
              <div className="mb-3.5 flex items-center justify-between">
                <b className="text-[16px] text-ink">Recent messages</b>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-[#f43f5e] px-2 py-0.5 text-[11px] font-extrabold text-white">{unreadCount}</span>
                ) : null}
              </div>
              {recent.length === 0 ? (
                <p className="text-sm text-muted">No conversations yet.</p>
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

const OverviewStat = ({ value, label }) => (
  <div className="flex-1 rounded-2xl bg-white p-[13px] shadow-card">
    <div className="text-[22px] font-extrabold text-ink">{value}</div>
    <div className="text-[11px] font-semibold text-muted-soft">{label}</div>
  </div>
);

const NextTripCard = ({ trip }) => {
  const now = Date.now();
  const startMs = trip.startDate ? new Date(trip.startDate).getTime() : null;
  const daysAway = startMs ? Math.ceil((startMs - now) / 86400000) : null;
  const awayLabel =
    daysAway === null ? 'Scheduled' : daysAway <= 0 ? 'In progress' : daysAway === 1 ? '1 day away' : `${daysAway} days away`;
  const route =
    trip.startPoint && trip.endPoint
      ? `${trip.startPoint} → ${trip.endPoint}`
      : trip.vehicle?.model || 'Upcoming trip';
  const start = formatDateLabel(trip.startDate);
  const end = formatDateLabel(trip.endDate);
  const driverName = trip.driver?.name || 'your driver';
  return (
    <div className="mt-3.5 rounded-[20px] p-[17px] text-white" style={{ background: 'linear-gradient(135deg,#0f1f2d,#1c3345)' }}>
      <div className="flex items-center justify-between">
        <b className="text-[15px]">Your next trip</b>
        <span className="rounded-full bg-white/15 px-[9px] py-1 text-[12px] font-extrabold">{awayLabel}</span>
      </div>
      <div className="mt-3 flex items-center gap-[11px]">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[11px] bg-white/15">
          <Car className="h-[18px] w-[18px]" strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold">{route}</div>
          <div className="truncate text-[12px] text-white/75">
            {start && end ? `${start} – ${end}` : 'Dates to confirm'} · with {driverName}
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewMessageCard = ({ conversation, tone, onOpen }) => {
  const driverName =
    conversation.participants?.driver?.name || conversation.participants?.driver?.email || 'Driver';
  const isOffer = conversation.lastMessage?.type === 'offer';
  const preview = isOffer
    ? `Sent an offer${conversation.vehicle?.model ? ` · ${conversation.vehicle.model}` : ''}`
    : conversation.lastMessage?.body || 'Conversation started.';
  return (
    <div className="rounded-[18px] bg-white p-[15px] shadow-card" style={{ borderLeft: `4px solid ${isOffer ? '#10a35a' : '#d6e9fb'}` }}>
      <div className="mb-2.5 flex items-center gap-[11px]">
        <Avatar name={driverName} tone={tone} className="h-10 w-10 text-sm" />
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
          {isOffer ? 'View offer' : 'Open chat'}
        </button>
        {isOffer ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-[11px] text-[13.5px] font-bold text-ink transition hover:border-muted-soft"
          >
            Message
          </button>
        ) : null}
      </div>
    </div>
  );
};

// ---------- My Bookings ----------
const TravelerBookings = ({ onMenu, travelerName, bookingsState, onReload, onOpenConversation }) => {
  const { loading, error, items } = bookingsState;
  const [view, setView] = useState('upcoming');
  const [expandedId, setExpandedId] = useState('');
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState(buildBookingEditForm({}));
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
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
        toast.error('Please select both start and end dates.');
        return;
      }
      const startIso = toIsoDateString(editForm.startDate, 'start');
      const endIso = toIsoDateString(editForm.endDate, 'end');
      if (!startIso || !endIso) {
        toast.error('Choose valid travel dates.');
        return;
      }
      payload.startDate = startIso;
      payload.endDate = endIso;
    }
    Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);
    setSavingEdit(true);
    try {
      await updateTravelerBooking(editingBooking.id, payload);
      toast.success('Booking updated.');
      closeEditModal();
      onReload();
    } catch (err) {
      toast.error(err?.message || 'Unable to update booking.');
      setSavingEdit(false);
    }
  };

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`${BOOKING_CANCELLATION_NOTICE}\n\nDo you want to cancel this booking?`)) return;
    setCancellingId(booking.id);
    try {
      await cancelTravelerBooking(booking.id);
      toast.success('Booking cancelled.');
      onReload();
    } catch (err) {
      toast.error(err?.message || 'Unable to cancel booking.');
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
      toast.error('Please choose a rating between 1 and 5.');
      return;
    }
    if (!reviewForm.comment || reviewForm.comment.trim().length < 10) {
      toast.error('Tell us a bit more about your experience (at least 10 characters).');
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
      toast.success('Review submitted for moderation.');
      closeReviewModal();
      onReload();
    } catch (err) {
      toast.error(err?.message || 'Unable to submit review.');
      setSubmittingReview(false);
    }
  };

  const head = (
    <MobileHeader
      onMenu={onMenu}
      right={<Avatar name={travelerName} tone="light" className="h-10 w-10 text-[15px]" />}
      eyebrow="TRIPS"
      title="My Bookings"
    />
  );

  if (loading) {
    return (
      <>
        {head}
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading your bookings…
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
              Try again
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
        <b className="mb-1 block text-ink">No trips booked yet</b>
        When you confirm a driver your itinerary appears here.{' '}
        <Link to="/vehicles" className="font-bold text-brand-dark">
          Browse vehicles
        </Link>
      </div>
    ) : list.length === 0 ? (
      <div className="rounded-[18px] bg-white p-6 text-sm text-muted shadow-card">
        {view === 'upcoming' ? 'No upcoming trips.' : 'No completed trips yet.'}
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
            onMessage={() => (booking.conversationId ? onOpenConversation(booking.conversationId) : toast('No conversation for this trip yet.'))}
            onEdit={() => openEditModal(booking)}
            onCancel={() => handleCancelBooking(booking)}
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
            <b className="mb-1 block text-ink">No trips booked yet</b>
            When you confirm a driver your itinerary appears here.
            <Link to="/vehicles" className="mt-3 block font-bold text-brand-dark">
              Browse vehicles
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
                Upcoming{upcoming.length ? ` ${upcoming.length}` : ''}
              </button>
              <button
                type="button"
                onClick={() => setView('completed')}
                className={`flex-1 rounded-[9px] py-2 text-[13px] font-bold transition ${view === 'completed' ? 'bg-brand text-white' : 'text-muted'}`}
              >
                Completed{completed.length ? ` ${completed.length}` : ''}
              </button>
            </div>
            {list.length === 0 ? (
              <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
                {view === 'upcoming' ? 'No upcoming trips.' : 'No completed trips yet.'}
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
                    onMessage={() => (booking.conversationId ? onOpenConversation(booking.conversationId) : toast('No conversation for this trip yet.'))}
                    onEdit={() => openEditModal(booking)}
                    onCancel={() => handleCancelBooking(booking)}
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
          <DesktopTitleBar title="My Bookings">
            {items.length ? (
              <DeskTabs view={view} onView={setView} upcoming={upcoming.length} completed={completed.length} />
            ) : null}
          </DesktopTitleBar>
          {desktopBookings}
        </div>
      </div>

      {editingBooking ? (
        <BottomSheet title="Update booking" onClose={closeEditModal}>
          {editingBooking.offerId ? (
            <p className="mb-3 rounded-xl bg-[#fdf0d8] px-3 py-2 text-[12px] font-semibold text-[#a86a15]">
              Dates were confirmed through a driver offer. Message your driver to change the schedule.
            </p>
          ) : null}
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>Start date</label>
                <input type="date" value={editForm.startDate} disabled={Boolean(editingBooking.offerId)} onChange={(e) => handleEditFieldChange('startDate', e.target.value)} className={`mt-1 ${inputCls} disabled:bg-[#eef1f0]`} required={!editingBooking.offerId} />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>End date</label>
                <input type="date" value={editForm.endDate} disabled={Boolean(editingBooking.offerId)} onChange={(e) => handleEditFieldChange('endDate', e.target.value)} className={`mt-1 ${inputCls} disabled:bg-[#eef1f0]`} required={!editingBooking.offerId} />
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>Pickup</label>
                <input type="text" value={editForm.startPoint} onChange={(e) => handleEditFieldChange('startPoint', e.target.value)} placeholder="Hotel or meeting point" className={`mt-1 ${inputCls}`} />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>Drop-off</label>
                <input type="text" value={editForm.endPoint} onChange={(e) => handleEditFieldChange('endPoint', e.target.value)} placeholder="Final destination" className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Flight number (optional)</label>
              <input type="text" value={editForm.flightNumber} onChange={(e) => handleEditFieldChange('flightNumber', e.target.value)} placeholder="e.g. UL 403" className={`mt-1 ${inputCls}`} />
            </div>
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>Arrival time</label>
                <input type="text" value={editForm.arrivalTime} onChange={(e) => handleEditFieldChange('arrivalTime', e.target.value)} placeholder="e.g. 08:30" className={`mt-1 ${inputCls}`} />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>Departure time</label>
                <input type="text" value={editForm.departureTime} onChange={(e) => handleEditFieldChange('departureTime', e.target.value)} placeholder="e.g. 17:45" className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Special requests</label>
              <textarea rows={3} value={editForm.specialRequests} onChange={(e) => handleEditFieldChange('specialRequests', e.target.value)} placeholder="Dietary needs, accessibility notes, anything your driver should know." className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
            </div>
            <button type="submit" disabled={savingEdit} className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
              {savingEdit ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : 'Save changes'}
            </button>
          </form>
        </BottomSheet>
      ) : null}

      {reviewingBooking ? (
        <BottomSheet
          title={reviewingBooking.vehicle?.model ? `Review · ${reviewingBooking.vehicle.model}` : 'Trip feedback'}
          onClose={closeReviewModal}
        >
          {reviewingBooking.review ? (
            <div className="rounded-[16px] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase ${reviewStatusChip(reviewingBooking.review.status)}`}>
                  {reviewStatusLabel(reviewingBooking.review.status)}
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
                  <b>Admin note</b> {reviewingBooking.review.adminNote}
                </div>
              ) : null}
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3">
              <div>
                <label className={labelCls}>Rating</label>
                <select value={reviewForm.rating} onChange={(e) => handleReviewFieldChange('rating', e.target.value)} className={`mt-1 ${inputCls}`}>
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={String(value)}>
                      {value} — {value === 5 ? 'Amazing' : value === 4 ? 'Great' : value === 3 ? 'Good' : value === 2 ? 'Okay' : 'Needs improvement'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Review title (optional)</label>
                <input type="text" value={reviewForm.title} onChange={(e) => handleReviewFieldChange('title', e.target.value)} maxLength={120} placeholder="Highlights from your trip" className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>Share your experience</label>
                <textarea rows={5} value={reviewForm.comment} onChange={(e) => handleReviewFieldChange('comment', e.target.value)} maxLength={1200} required placeholder="Tell us about your driver, vehicle, and itinerary highlights." className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
                <p className="mt-1 text-[11.5px] text-muted-soft">Minimum 10 characters.</p>
              </div>
              <div>
                <label className={labelCls}>Photos (optional)</label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {reviewForm.images.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-xl border border-[#e2e8ea]">
                      <img src={reviewPreviews[index]} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => removeReviewImage(index)} aria-label="Remove photo" className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded-full bg-ink/70 text-white">
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
                <p className="mt-1 text-[11.5px] text-muted-soft">Add up to 4 photos from your trip.</p>
              </div>
              <button type="submit" disabled={submittingReview} className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
                {submittingReview ? (<><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>) : 'Submit review'}
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
const reviewStatusLabel = (status) =>
  status === 'approved' ? 'Published' : status === 'rejected' ? 'Declined' : 'Awaiting approval';

const TravelerBookingCard = ({ booking, tone, expanded, onToggle, onMessage, onEdit, onCancel, onReview, cancelling }) => {
  const now = Date.now();
  const driverName = booking.driver?.name || 'Driver to be assigned';
  const vehicleName = booking.vehicle?.model || 'Vehicle to be confirmed';
  const seats = booking.vehicle?.seats;
  const price = typeof booking.totalPrice === 'number' && booking.totalPrice > 0 ? formatCurrency(booking.totalPrice) : null;
  const start = formatDateLabel(booking.startDate);
  const end = formatDateLabel(booking.endDate);
  const route = booking.startPoint && booking.endPoint ? `${booking.startPoint} → ${booking.endPoint}` : vehicleName;
  const past = booking.endDate && new Date(booking.endDate).getTime() < now;
  const cancelled = ['cancelled', 'rejected'].includes(booking.status);
  const startMs = booking.startDate ? new Date(booking.startDate).getTime() : null;
  const daysAway = startMs ? Math.ceil((startMs - now) / 86400000) : null;
  const chip = cancelled
    ? { text: booking.status.toUpperCase(), cls: 'bg-[#ffe4e9] text-[#e11d48]', border: '#f43f5e' }
    : booking.status === 'confirmed' && daysAway !== null && daysAway > 0 && daysAway <= 3
    ? { text: `STARTS IN ${daysAway} DAY${daysAway === 1 ? '' : 'S'}`, cls: 'bg-[#e5f0fb] text-[#1d6fb8]', border: '#d6e9fb' }
    : booking.status === 'confirmed'
    ? { text: 'CONFIRMED', cls: 'bg-brand-tint text-brand-dark', border: '#10a35a' }
    : past
    ? { text: 'COMPLETED', cls: 'bg-[#eef1f0] text-muted', border: '#d6e9fb' }
    : { text: (booking.status || 'pending').toUpperCase(), cls: 'bg-[#fdf0d8] text-[#a86a15]', border: '#f0b429' };
  const canManage = !cancelled && !past;
  const showReviewPrompt = booking.canReview && !booking.review;

  return (
    <div className="rounded-[18px] bg-white p-[15px] shadow-card" style={{ borderLeft: `4px solid ${chip.border}` }}>
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
            {seats ? ` · ${seats} seats` : ''}
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
          {start && end ? `${start} – ${end}` : 'Dates to be confirmed'}
        </div>
      </div>

      {booking.review ? (
        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-hairline bg-canvas px-3 py-2">
          <span className={`rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase ${reviewStatusChip(booking.review.status)}`}>
            {reviewStatusLabel(booking.review.status)}
          </span>
          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-star">
            <Star className="h-3.5 w-3.5" fill="#f5b042" stroke="none" />
            {booking.review.rating}/5
          </span>
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onMessage} className="flex-1 rounded-[11px] bg-brand py-[11px] text-[13.5px] font-bold text-white transition hover:bg-brand-dark">
          Message driver
        </button>
        <button type="button" onClick={onToggle} className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-[11px] text-[13.5px] font-bold text-ink transition hover:border-muted-soft">
          Details
        </button>
      </div>

      {expanded ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-hairline pt-3">
          {booking.vehicle?.id ? (
            <Link to={`/vehicles/${booking.vehicle.id}`} className="rounded-[10px] border-[1.5px] border-[#e2e8ea] py-2 text-center text-[12.5px] font-bold text-ink transition hover:border-muted-soft">
              View vehicle
            </Link>
          ) : null}
          {canManage ? (
            <div className="flex gap-2">
              <button type="button" onClick={onEdit} className="flex-1 rounded-[10px] border-[1.5px] border-[#e2e8ea] py-2 text-[12.5px] font-bold text-ink transition hover:border-muted-soft">
                Edit details
              </button>
              <button type="button" onClick={onCancel} disabled={cancelling} className="flex-1 rounded-[10px] border-[1.5px] border-[#ffd3d9] py-2 text-[12.5px] font-bold text-[#f43f5e] transition hover:border-[#f43f5e] disabled:opacity-60">
                {cancelling ? 'Cancelling…' : 'Cancel booking'}
              </button>
            </div>
          ) : null}
          {booking.review ? (
            <button type="button" onClick={onReview} className="rounded-[10px] border-[1.5px] border-[#e2e8ea] py-2 text-[12.5px] font-bold text-ink transition hover:border-muted-soft">
              View review
            </button>
          ) : showReviewPrompt ? (
            <button type="button" onClick={onReview} className="flex items-center justify-center gap-1.5 rounded-[10px] bg-brand-tint py-2 text-[12.5px] font-bold text-brand-dark">
              <Star className="h-3.5 w-3.5" /> Leave a review
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
  onReloadConversations,
}) => {
  const [search, setSearch] = useState('');
  const { loading: convLoading, error: convError, items: conversations } = conversationsState;
  const { loading: msgLoading, error: msgError, items: messages, booking: conversationBooking } = messagesState;
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);

  const driverNameOf = (conversation) =>
    conversation?.participants?.driver?.name || conversation?.participants?.driver?.email || 'Driver';
  const filtered = conversations.filter((c) => driverNameOf(c).toLowerCase().includes(search.trim().toLowerCase()));

  const activeName = selectedConversation ? driverNameOf(selectedConversation) : '';
  const activeSubtitle = selectedConversation?.vehicle?.model
    ? `Discussing ${selectedConversation.vehicle.model}`
    : 'General conversation';

  const chatMessages =
    msgLoading && messages.length === 0 ? (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-brand" /> Loading messages…
      </div>
    ) : msgError ? (
      <div className="flex flex-1 items-center justify-center text-sm text-[#e11d48]">{msgError}</div>
    ) : messages.length === 0 ? (
      <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-muted">
        Send a message to introduce yourself to the driver.
      </div>
    ) : (
      messages.map((message) => {
        const isTraveller = message.sender?.role === 'guest' || message.senderRole === 'guest';
        if (message.type === 'offer' && message.offer) {
          return <TravelerOfferBubble key={message.id} message={message} align={isTraveller ? 'end' : 'start'} onBook={() => onBookOffer(message)} />;
        }
        return (
          <div key={message.id} className={`flex ${isTraveller ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-[13px] py-[10px] text-[13.5px] shadow-[0_2px_8px_rgba(15,31,45,0.05)] ${isTraveller ? 'rounded-[14px_14px_4px_14px] bg-brand text-white' : 'rounded-[14px_14px_14px_4px] bg-white text-ink'}`}>
              <div className="whitespace-pre-wrap">{message.body}</div>
              {message.warning ? (
                <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-[#fdf0d8] px-2 py-1.5 text-[11px] font-semibold text-[#a86a15]">
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-none" />
                  <span>{message.warning}</span>
                </div>
              ) : null}
            </div>
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
            ? 'Your booking with this driver is confirmed'
            : 'You have a booking with this driver'}
        </span>
        <span className="block truncate text-[12px] text-muted">Tap to view your trip details</span>
      </span>
      <span className="flex-shrink-0 text-[15px] font-extrabold text-brand-dark">›</span>
    </button>
  ) : null;

  const conversationList = (variant) => {
    if (convLoading) {
      return (
        <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> Loading conversations…
        </div>
      );
    }
    if (convError) {
      return (
        <div className="m-4 rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
          <p className="text-[#e11d48]">{convError}</p>
          <button type="button" onClick={onReloadConversations} className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft">
            Try again
          </button>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="m-4 rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
          {conversations.length === 0 ? 'Start a conversation from a vehicle page to see it here.' : 'No conversations match your search.'}
        </div>
      );
    }
    return filtered.map((conversation, index) => {
      const name = driverNameOf(conversation);
      const preview = conversation.lastMessage?.body || 'Conversation started.';
      const timestamp = formatShortDateTime(conversation.lastMessageAt || conversation.updatedAt);
      const unread = conversation.unreadCount > 0;
      const active = variant === 'desktop' && conversation.id === selectedConversation?.id;
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
          <Avatar name={name} tone={AVATAR_TONES[index % AVATAR_TONES.length]} className="h-11 w-11 flex-shrink-0 rounded-[11px] text-sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[14.5px] font-bold text-ink">{name}</span>
              <span className="flex-shrink-0 text-[11px] text-muted-soft">{timestamp}</span>
            </div>
            <div className="truncate text-[12.5px] text-ink-soft">{preview}</div>
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
            <div className="text-white" style={{ background: 'linear-gradient(160deg,#0f7a45,#10a35a 55%,#18b866)' }}>
              <div className="flex items-center gap-3 px-4 pb-4 pt-4">
                <button type="button" onClick={() => onSelectConversation('')} aria-label="Back" className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white/[0.18] transition hover:bg-white/25">
                  <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
                <Avatar name={activeName} tone="light" className="h-10 w-10 flex-shrink-0 text-[15px]" />
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-extrabold">{activeName}</div>
                  <div className="truncate text-[12px] text-white/80">{activeSubtitle}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-1 flex-col">
              <div className="flex flex-1 flex-col gap-2.5 px-4 py-4">
                {bookingNotice}
                {chatMessages}
              </div>
              <div className="sticky bottom-0 z-10 border-t border-hairline bg-white px-4 py-3">
                <form onSubmit={submitMessage} className="flex items-center gap-2.5">
                  <input value={composerValue} onChange={(e) => onComposerChange(e.target.value)} placeholder="Message…" className="h-[38px] min-w-0 flex-1 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-3 text-[13px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
                  <button type="submit" disabled={!composerValue.trim() || sending} aria-label="Send" className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-brand transition hover:bg-brand-dark disabled:opacity-50">
                    {sending ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-[17px] w-[17px] text-white" />}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <>
            <MobileHeader onMenu={onMenu} right={<Avatar name={travelerName} tone="light" className="h-10 w-10 text-[15px]" />} eyebrow="INBOX" title="Messages" />
            <Sheet>
              <div className="mb-3.5 flex items-center gap-2.5 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5">
                <Search className="h-4 w-4 flex-shrink-0 text-muted-soft" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" className="w-full min-w-0 bg-transparent text-[13.5px] text-ink placeholder:text-[#adb8c0] focus:outline-none" />
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
            <h1 className="mb-3 text-[20px] font-extrabold text-ink">Messages</h1>
            <div className="flex items-center gap-2.5 rounded-[11px] border-[1.5px] border-[#e2e8ea] px-3 py-2.5">
              <Search className="h-4 w-4 flex-shrink-0 text-muted-soft" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" className="w-full min-w-0 bg-transparent text-[13px] text-ink placeholder:text-[#adb8c0] focus:outline-none" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">{conversationList('desktop')}</div>
        </div>

        <div className="flex flex-1 flex-col bg-canvas">
          {selectedConversation ? (
            <>
              <div className="flex h-[72px] flex-shrink-0 items-center gap-3 border-b border-hairline bg-white px-6">
                <Avatar name={activeName} tone="brand" className="h-10 w-10 flex-shrink-0 rounded-[11px] text-[15px]" />
                <div className="min-w-0">
                  <b className="block truncate text-[15px] text-ink">{activeName}</b>
                  <div className="truncate text-[12px] text-muted-soft">{activeSubtitle}</div>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-6 py-6">
                {bookingNotice}
                {chatMessages}
              </div>
              <div className="flex-shrink-0 border-t border-hairline bg-white px-6 py-4">
                <form onSubmit={submitMessage} className="flex items-center gap-2.5">
                  <input value={composerValue} onChange={(e) => onComposerChange(e.target.value)} placeholder="Message…" className="h-[42px] min-w-0 flex-1 rounded-[12px] border-[1.5px] border-[#e2e8ea] bg-white px-3.5 text-[13.5px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
                  <button type="submit" disabled={!composerValue.trim() || sending} className="h-[42px] flex-shrink-0 rounded-[12px] bg-brand px-5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50">
                    {sending ? 'Sending…' : 'Send'}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted">Select a conversation to view messages.</div>
          )}
        </div>
      </div>
      {bookingDetailOpen ? (
        <BookingDetailsModal
          booking={conversationBooking}
          onClose={() => setBookingDetailOpen(false)}
        />
      ) : null}
    </>
  );
};

const TravelerOfferBubble = ({ message, align, onBook }) => {
  const { offer } = message;
  const start = formatDateLabel(offer.startDate);
  const end = formatDateLabel(offer.endDate);
  return (
    <div className={`flex ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[88%] rounded-[16px] border-[1.5px] border-[#cdeede] bg-white p-3.5 shadow-[0_4px_14px_rgba(15,31,45,0.06)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="rounded-[7px] bg-brand-tint px-2 py-[3px] text-[10.5px] font-extrabold uppercase text-brand-dark">Offer received</span>
          <b className="text-[18px] text-ink">{formatCurrency(offer.totalPrice)}</b>
        </div>
        <div className="text-[13px] font-bold text-ink">
          {offer.vehicle?.model || 'Selected vehicle'} · {start}–{end}
        </div>
        <div className="mt-0.5 text-[12px] text-muted-soft">
          {offer.totalKms} km included · {formatRate(offer.pricePerExtraKm)} / extra km
        </div>
        {message.body ? <div className="mt-1.5 text-[12px] leading-relaxed text-muted">{message.body}</div> : null}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={onBook} className="flex-1 rounded-[11px] bg-brand py-[11px] text-[13.5px] font-bold text-white transition hover:bg-brand-dark">
            Accept offer
          </button>
          <button type="button" onClick={() => toast('Reply in the chat to negotiate or decline.')} className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-[11px] text-[13.5px] font-bold text-ink transition hover:border-muted-soft">
            Decline
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------- My Requests ----------
const TravelerRequests = ({ onMenu, travelerName, briefsState, onReload, onCreateBrief, creating, onOpenMessages }) => {
  const { loading, error, items } = briefsState;
  const [formOpen, setFormOpen] = useState(false);
  const [formState, setFormState] = useState(() => buildBriefForm());

  // Open + prefill the request form when arriving from the homepage quote form (post login/register).
  useEffect(() => {
    if (!getStoredToken()) return; // still a guest flash before the auth redirect; leave the stash intact.
    let pending = null;
    try {
      const raw = sessionStorage.getItem(PENDING_BRIEF_KEY);
      if (raw) {
        pending = JSON.parse(raw);
        sessionStorage.removeItem(PENDING_BRIEF_KEY);
      }
    } catch {
      pending = null;
    }
    if (pending) {
      setFormState((prev) => ({ ...prev, ...pending }));
      setFormOpen(true);
    }
  }, []);

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
    };
    if (!payload.startDate || !payload.endDate) {
      toast.error('Please select travel dates.');
      return;
    }
    if (!payload.startLocation || !payload.endLocation || !payload.message || !payload.country) {
      toast.error('All fields are required.');
      return;
    }
    if (payload.adults < 1) {
      toast.error('Please specify at least one adult traveller.');
      return;
    }
    try {
      await onCreateBrief(payload);
      setFormState(buildBriefForm());
      setFormOpen(false);
    } catch (submitError) {
      console.warn('Create brief failed', submitError);
    }
  };

  const renderBriefCard = (brief) => {
    const start = formatDateLabel(brief.startDate);
    const end = formatDateLabel(brief.endDate);
    const hasOffers = brief.offersCount > 0;
    const guests = `${brief.adults} guest${brief.adults === 1 ? '' : 's'}${brief.children > 0 ? ` +${brief.children}` : ''}`;
    return (
      <article key={brief.id} className="min-w-0 rounded-[18px] bg-white p-4 shadow-card" style={hasOffers ? { borderLeft: '4px solid #10a35a' } : undefined}>
        <div className="flex items-start justify-between gap-2">
          <b className="min-w-0 truncate text-[15.5px] text-ink">
            {brief.startLocation} → {brief.endLocation}
          </b>
          {hasOffers ? (
            <span className="flex-shrink-0 rounded-lg bg-brand-tint px-2 py-1 text-[11px] font-extrabold uppercase text-brand-dark">
              {brief.offersCount} offer{brief.offersCount === 1 ? '' : 's'}
            </span>
          ) : (
            <span className="flex-shrink-0 text-[11px] font-bold text-muted-soft">Awaiting offers</span>
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
            View offers
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-2.5 text-[13.5px] font-bold text-ink transition hover:border-muted-soft"
          >
            New
          </button>
        </div>
      </article>
    );
  };

  const head = (
    <MobileHeader
      onMenu={onMenu}
      right={<Avatar name={travelerName} tone="light" className="h-10 w-10 text-[15px]" />}
      eyebrow="MY REQUESTS"
      title="Tour Requests"
      subtitle="Trips you've posted for drivers to bid on."
    />
  );

  if (loading) {
    return (
      <>
        {head}
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading your requests…
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
              Try again
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
          onClick={() => setFormOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[14.5px] font-extrabold text-white transition hover:bg-brand-dark"
        >
          <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2} />
          Post a new request
        </button>

        {items.length === 0 ? (
          <div className="mt-4 rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            <b className="mb-1 block text-ink">No requests yet</b>
            Post your first itinerary to invite vetted drivers to respond with offers.
          </div>
        ) : (
          <div className="mt-3.5 grid gap-3 lg:grid-cols-2">
            {items.map((brief) => {
              const start = formatDateLabel(brief.startDate);
              const end = formatDateLabel(brief.endDate);
              const hasOffers = brief.offersCount > 0;
              const guests = `${brief.adults} guest${brief.adults === 1 ? '' : 's'}${brief.children > 0 ? ` +${brief.children}` : ''}`;
              return (
                <article key={brief.id} className="min-w-0 rounded-[18px] bg-white p-4 shadow-card" style={hasOffers ? { borderLeft: '4px solid #10a35a' } : undefined}>
                  <div className="flex items-start justify-between gap-2">
                    <b className="min-w-0 truncate text-[15.5px] text-ink">
                      {brief.startLocation} → {brief.endLocation}
                    </b>
                    {hasOffers ? (
                      <span className="flex-shrink-0 rounded-lg bg-brand-tint px-2 py-1 text-[11px] font-extrabold uppercase text-brand-dark">
                        {brief.offersCount} offer{brief.offersCount === 1 ? '' : 's'}
                      </span>
                    ) : (
                      <span className="flex-shrink-0 text-[11px] font-bold text-muted-soft">Awaiting offers</span>
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
                      View offers
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormOpen(true)}
                      className="flex-shrink-0 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-4 py-2.5 text-[13.5px] font-bold text-ink transition hover:border-muted-soft"
                    >
                      New
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
          <DesktopTitleBar title="Tour Requests">
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="rounded-[11px] bg-brand px-[18px] py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-dark"
            >
              Post a new request
            </button>
          </DesktopTitleBar>
          {items.length === 0 ? (
            <div className="rounded-[18px] bg-white p-6 text-sm text-muted shadow-card">
              <b className="mb-1 block text-ink">No requests yet</b>
              Post your first itinerary to invite vetted drivers to respond with offers.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">{items.map(renderBriefCard)}</div>
          )}
        </div>
      </div>

      {formOpen ? (
        <BottomSheet title="Post a request" onClose={() => setFormOpen(false)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>Start date</label>
                <input type="date" name="startDate" value={formState.startDate} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>End date</label>
                <input type="date" name="endDate" value={formState.endDate} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>From</label>
                <input type="text" name="startLocation" value={formState.startLocation} onChange={handleFieldChange} placeholder="Colombo airport" className={`mt-1 ${inputCls}`} required />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>To</label>
                <input type="text" name="endLocation" value={formState.endLocation} onChange={handleFieldChange} placeholder="Kandy" className={`mt-1 ${inputCls}`} required />
              </div>
            </div>
            <div className="flex gap-2.5">
              <div className="min-w-0 flex-1">
                <label className={labelCls}>Adults</label>
                <input type="number" min="1" name="adults" value={formState.adults} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
              </div>
              <div className="min-w-0 flex-1">
                <label className={labelCls}>Children</label>
                <input type="number" min="0" name="children" value={formState.children} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Country of residence</label>
              <input type="text" name="country" value={formState.country} onChange={handleFieldChange} placeholder="United Kingdom" className={`mt-1 ${inputCls}`} required />
            </div>
            <div>
              <label className={labelCls}>Trip details</label>
              <textarea name="message" rows={4} value={formState.message} onChange={handleFieldChange} placeholder="Must-see stops, accommodation needs, languages, etc." className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" required />
            </div>
            <button type="submit" disabled={creating} className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
              {creating ? (<><Loader2 className="h-4 w-4 animate-spin" /> Posting…</>) : 'Post tour brief'}
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
      toast.error('New passwords do not match.');
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
      eyebrow="ACCOUNT"
      title="Settings"
      subtitle="Tell us how to reach you while you travel."
    />
  );

  if (loading) {
    return (
      <>
        {head}
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading profile…
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
              Retry
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
          <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">No profile details available.</div>
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
            <label className={labelCls} htmlFor="traveler-name">Full name</label>
            <input id="traveler-name" name="name" value={formState.name} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-email">Email</label>
            <input id="traveler-email" value={data.email} readOnly className="mt-1 h-11 w-full cursor-not-allowed rounded-xl border-[1.5px] border-[#e2e8ea] bg-canvas px-3 text-sm font-medium text-muted-soft" />
            <p className="mt-1 text-[11.5px] text-muted-soft">Need to change your email? Contact support.</p>
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-contact">Contact number</label>
            <input id="traveler-contact" name="contactNumber" value={formState.contactNumber} onChange={handleFieldChange} placeholder="e.g. +94 71 123 4567" className={`mt-1 ${inputCls}`} />
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-address">Home base</label>
            <input id="traveler-address" name="address" value={formState.address} onChange={handleFieldChange} placeholder="City, country" className={`mt-1 ${inputCls}`} />
          </div>
          <button type="submit" disabled={savingProfile} className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
            {savingProfile ? (<><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>) : 'Save changes'}
          </button>
        </form>

        <form onSubmit={handlePasswordSubmit} className="mt-3 rounded-[18px] bg-white p-4 shadow-card">
          <b className="text-[15px] text-ink">Reset password</b>
          <p className="mb-3 mt-0.5 text-[12.5px] text-muted-soft">Update your password to keep your account secure.</p>
          <div>
            <label className={labelCls} htmlFor="traveler-password-current">Current password</label>
            <input id="traveler-password-current" name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required />
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-password-new">New password</label>
            <input id="traveler-password-new" name="password" type="password" value={passwordForm.password} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required minLength={8} />
          </div>
          <div className="mt-3">
            <label className={labelCls} htmlFor="traveler-password-confirm">Confirm new password</label>
            <input id="traveler-password-confirm" name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required />
          </div>
          <button type="submit" disabled={savingPassword} className="mt-4 w-full rounded-[14px] border-[1.5px] border-[#e2e8ea] bg-white py-[13px] text-[14px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-70">
            {savingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </Sheet>
      </div>

      <div className="hidden lg:block">
        <div className="px-8 py-8">
          <div className="mx-auto max-w-[560px]">
            <h1 className="text-[24px] font-extrabold tracking-tight text-ink">Settings</h1>
            <p className="mt-1 text-[14px] text-muted">Tell us how to reach you while you travel.</p>
            <form onSubmit={handleProfileSubmit} className="mt-5 rounded-[18px] bg-white p-6 shadow-card">
              <div className="flex gap-3.5">
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>Full name</label>
                  <input name="name" value={formState.name} onChange={handleFieldChange} className={`mt-1 ${inputCls}`} required />
                </div>
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>Contact number</label>
                  <input name="contactNumber" value={formState.contactNumber} onChange={handleFieldChange} placeholder="+94 71 123 4567" className={`mt-1 ${inputCls}`} />
                </div>
              </div>
              <div className="mt-3.5">
                <label className={labelCls}>Email</label>
                <input value={data.email} readOnly className="mt-1 h-11 w-full cursor-not-allowed rounded-xl border-[1.5px] border-[#e2e8ea] bg-canvas px-3 text-sm font-medium text-muted-soft" />
                <p className="mt-1 text-[11.5px] text-muted-soft">Need to change your email? Contact support.</p>
              </div>
              <div className="mt-3.5">
                <label className={labelCls}>Home base</label>
                <input name="address" value={formState.address} onChange={handleFieldChange} placeholder="City, country" className={`mt-1 ${inputCls}`} />
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" disabled={savingProfile} className="rounded-[12px] bg-brand px-6 py-3 text-[14px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
                  {savingProfile ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
            <form onSubmit={handlePasswordSubmit} className="mt-4 rounded-[18px] bg-white p-6 shadow-card">
              <b className="text-[16px] text-ink">Reset password</b>
              <p className="mb-3 mt-1 text-[13px] text-muted-soft">Update your password to keep your account secure.</p>
              <div className="flex gap-3.5">
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>Current password</label>
                  <input name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required />
                </div>
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>New password</label>
                  <input name="password" type="password" value={passwordForm.password} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required minLength={8} />
                </div>
              </div>
              <div className="mt-3.5">
                <label className={labelCls}>Confirm new password</label>
                <input name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={handlePasswordFieldChange} className={`mt-1 ${inputCls}`} required />
              </div>
              <div className="mt-4 flex justify-end">
                <button type="submit" disabled={savingPassword} className="rounded-[12px] border-[1.5px] border-[#e2e8ea] bg-white px-5 py-2.5 text-[14px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-70">
                  {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </div>
            </form>
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
  const driverName = booking.driver?.name || 'Driver';
  const vehicleName = booking.vehicle?.model || 'Vehicle';
  const route = booking.startPoint && booking.endPoint ? `${booking.startPoint} → ${booking.endPoint}` : vehicleName;
  const start = formatDateLabel(booking.startDate);
  const end = formatDateLabel(booking.endDate);
  const dates = start && end ? `${start} – ${end}` : 'Dates TBD';
  const price = typeof booking.totalPrice === 'number' && booking.totalPrice > 0 ? formatCurrency(booking.totalPrice) : null;
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
  const name = conversation.participants?.driver?.name || conversation.participants?.driver?.email || 'Driver';
  const isOffer = conversation.lastMessage?.type === 'offer';
  const preview = isOffer
    ? `Sent an offer${conversation.vehicle?.model ? ` · ${conversation.vehicle.model}` : ''}`
    : conversation.lastMessage?.body || 'Conversation started.';
  return (
    <button type="button" onClick={onOpen} className="flex w-full items-center gap-[11px] text-left">
      <Avatar name={name} tone={tone} className="h-9 w-9 flex-shrink-0 rounded-[10px] text-[13px]" />
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

const DeskTabs = ({ view, onView, upcoming, completed }) => (
  <div className="flex gap-1.5 rounded-xl bg-[#eef1f0] p-1">
    <button
      type="button"
      onClick={() => onView('upcoming')}
      className={`rounded-[9px] px-4 py-2 text-[13px] font-bold transition ${view === 'upcoming' ? 'bg-brand text-white' : 'text-muted'}`}
    >
      Upcoming{upcoming ? ` ${upcoming}` : ''}
    </button>
    <button
      type="button"
      onClick={() => onView('completed')}
      className={`rounded-[9px] px-4 py-2 text-[13px] font-bold transition ${view === 'completed' ? 'bg-brand text-white' : 'text-muted'}`}
    >
      Completed{completed ? ` ${completed}` : ''}
    </button>
  </div>
);

// ---------- Shared bottom sheet ----------
const BottomSheet = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[70] flex items-end justify-center">
    <div className="absolute inset-0 bg-ink/45" onClick={onClose} aria-hidden="true" />
    <div className="relative mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] bg-canvas p-5 pb-8 shadow-drawer">
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#cbd5db]" />
      <div className="mb-3 flex items-center justify-between gap-3">
        <b className="min-w-0 truncate text-[17px] text-ink">{title}</b>
        <button type="button" onClick={onClose} aria-label="Close" className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg bg-white shadow-soft">
          <X className="h-4 w-4 text-ink" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const formatShortDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const formatDateLabel = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

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

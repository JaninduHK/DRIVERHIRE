import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Car,
  ChevronLeft,
  ClipboardList,
  DollarSign,
  Loader2,
  MapPin,
  MessageCircle,
  Search,
  Send,
  User2,
  X,
} from 'lucide-react';
import {
  fetchConversations,
  fetchMessages,
  sendMessage as sendChatMessage,
  sendOffer,
  markConversationRead,
} from '../services/chatApi.js';
import { fetchDriverVehicles } from '../services/driverApi.js';
import { DashboardSidebar, DriverDrawer, MobileHeader, Sheet } from '../components/dashboard/mobile.jsx';
import { Avatar } from '../components/dashboard/primitives.jsx';
import BookingDetailsModal from '../components/BookingDetailsModal.jsx';
import { clearStoredToken, getStoredUser } from '../services/authToken.js';

const HEADER_GRADIENT = 'linear-gradient(160deg,#0f7a45,#10a35a 55%,#18b866)';
const AVATAR_TONES = ['amber', 'purple', 'blue'];

const DriverMessages = () => {
  const [conversationsState, setConversationsState] = useState({
    loading: true,
    error: '',
    items: [],
  });
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [messagesState, setMessagesState] = useState({
    loading: false,
    error: '',
    items: [],
    booking: null,
  });
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [composerValue, setComposerValue] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
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
  const [vehiclesState, setVehiclesState] = useState({
    loading: false,
    error: '',
    items: [],
  });
  const [view, setView] = useState('list');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [search, setSearch] = useState('');

  const navigate = useNavigate();

  const storedUser = getStoredUser();
  const driverName = storedUser?.name || 'Driver';
  const driverPhoto = storedUser?.profilePhoto || '';
  const sidebarUser = { name: driverName, roleLabel: 'Approved driver', image: driverPhoto };

  const handleLogout = useCallback(() => {
    clearStoredToken();
    navigate('/login');
  }, [navigate]);

  const loadConversations = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setConversationsState((prev) => ({
          ...prev,
          loading: true,
          error: '',
        }));
      }
      try {
        const data = await fetchConversations();
        const items = Array.isArray(data?.conversations) ? data.conversations : [];
        setConversationsState({
          loading: false,
          error: '',
          items,
        });
      } catch (error) {
        const message = error?.message || 'Unable to load conversations.';
        if (!silent) {
          setConversationsState({
            loading: false,
            error: message,
            items: [],
          });
        }
      }
    },
    []
  );

  const loadMessages = useCallback(
    async (conversationId, { silent = false } = {}) => {
      if (!conversationId) {
        setMessagesState({
          loading: false,
          error: '',
          items: [],
          booking: null,
        });
        return;
      }
      if (!silent) {
        setMessagesState((prev) => ({
          ...prev,
          loading: true,
          error: '',
        }));
      }
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
          items: prev.items.map((item) =>
            item.id === conversationId ? { ...item, unreadCount: 0 } : item
          ),
        }));
      } catch (error) {
        const message = error?.message || 'Unable to load messages.';
        if (!silent) {
          setMessagesState({
            loading: false,
            error: message,
            items: [],
            booking: null,
          });
        }
      }
    },
    []
  );

  const loadVehicles = useCallback(async () => {
    setVehiclesState((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));
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
      const message = error?.message || 'Unable to load your vehicles.';
      setVehiclesState({
        loading: false,
        error: message,
        items: [],
      });
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadVehicles();
  }, [loadConversations, loadVehicles]);

  useEffect(() => {
    const interval = setInterval(() => loadConversations({ silent: true }), 15000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Mobile flow: don't auto-open a thread. If the open conversation disappears, return to the list.
  useEffect(() => {
    if (
      selectedConversationId &&
      !conversationsState.items.some((item) => item.id === selectedConversationId)
    ) {
      setSelectedConversationId('');
      setView('list');
    }
  }, [conversationsState.items, selectedConversationId]);

  const handleSelectConversation = (id) => {
    setSelectedConversationId(id);
    setView('thread');
  };

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    if (!selectedConversationId) {
      return;
    }
    const interval = setInterval(() => loadMessages(selectedConversationId, { silent: true }), 5000);
    return () => clearInterval(interval);
  }, [selectedConversationId, loadMessages]);

  const selectedConversation = useMemo(
    () => conversationsState.items.find((item) => item.id === selectedConversationId) || null,
    [conversationsState.items, selectedConversationId]
  );

  useEffect(() => {
    if (selectedConversation?.vehicle?.id) {
      setOfferForm((prev) => ({
        ...prev,
        vehicleId: prev.vehicleId || selectedConversation.vehicle.id,
      }));
    }
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    if (!selectedConversationId || !composerValue.trim()) {
      return;
    }
    setSendingMessage(true);
    try {
      const payload = await sendChatMessage(selectedConversationId, composerValue.trim());
      const newMessage = payload?.message;
      if (newMessage) {
        setMessagesState((prev) => ({
          loading: false,
          error: '',
          items: [...prev.items, newMessage],
        }));
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
      const message = error?.message || 'Unable to send message.';
      toast.error(message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleOfferChange = (field, value) => {
    setOfferForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSendOffer = async (event) => {
    event.preventDefault();
    if (!selectedConversationId) {
      toast.error('Select a conversation before sending an offer.');
      return;
    }

    const { startDate, endDate, vehicleId, totalPrice, totalKms, pricePerExtraKm, note } = offerForm;

    if (!startDate || !endDate || !vehicleId || !totalPrice || !totalKms) {
      toast.error('Fill in the offer details before sending.');
      return;
    }

    setSendingOffer(true);
    try {
      const payload = await sendOffer(selectedConversationId, {
        startDate,
        endDate,
        vehicleId,
        totalPrice: Number(totalPrice),
        totalKms: Number(totalKms),
        pricePerExtraKm: Number(pricePerExtraKm || 0),
        note,
      });

      const newMessage = payload?.message;
      if (newMessage) {
        setMessagesState((prev) => ({
          loading: false,
          error: '',
          items: [...prev.items, newMessage],
        }));
        setConversationsState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === selectedConversationId
              ? { ...item, lastMessage: newMessage, lastMessageAt: newMessage.createdAt, unreadCount: 0 }
              : item
          ),
        }));
      }

      toast.success('Offer sent to the traveller.');
      setOfferForm((prev) => ({
        ...prev,
        totalPrice: '',
        totalKms: '',
        pricePerExtraKm: '',
        note: '',
      }));
      setOfferOpen(false);
      loadConversations({ silent: true });
    } catch (error) {
      const message = error?.message || 'Unable to send offer.';
      toast.error(message);
    } finally {
      setSendingOffer(false);
    }
  };

  const conversations = conversationsState.items;
  const messages = messagesState.items;
  const travellerNameOf = (conversation) =>
    conversation?.participants?.traveler?.name ||
    conversation?.participants?.traveler?.email ||
    'Traveller';
  const filteredConversations = conversations.filter((conversation) =>
    travellerNameOf(conversation).toLowerCase().includes(search.trim().toLowerCase())
  );
  const navItems = [
    { id: 'overview', label: 'Overview', icon: User2, href: '/portal/driver' },
    { id: 'vehicles', label: 'My Vehicles', icon: Car, href: '/portal/driver#vehicles' },
    { id: 'bookings', label: 'My Bookings', icon: CalendarDays, href: '/portal/driver#bookings' },
    { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/portal/driver/messages', active: true },
    { id: 'briefs', label: 'Tour Briefs', icon: MapPin, href: '/briefs' },
    { id: 'earnings', label: 'My Earnings', icon: DollarSign, href: '/portal/driver#earnings' },
    { id: 'availability', label: 'My Availability', icon: CalendarCheck, href: '/portal/driver#availability' },
    { id: 'profile', label: 'My Profile', icon: ClipboardList, href: '/portal/driver#profile' },
  ];
  const inputCls =
    'h-11 w-full min-w-0 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-medium text-ink placeholder:font-normal placeholder:text-[#adb8c0] focus:border-brand focus:outline-none';
  const labelCls = 'text-[12.5px] font-bold text-ink-soft';
  const threadName = travellerNameOf(selectedConversation);
  const threadSubtitle = selectedConversation?.vehicle?.model
    ? `Interested in ${selectedConversation.vehicle.model}`
    : 'General enquiry';

  const renderMessage = (message) => {
    const isDriver = message.sender?.role === 'driver' || message.senderRole === 'driver';
    if (message.type === 'offer' && message.offer) {
      return <OfferBubble key={message.id} message={message} align={isDriver ? 'end' : 'start'} />;
    }
    return (
      <div key={message.id} className={`flex ${isDriver ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[80%] px-[13px] py-[10px] text-[13.5px] shadow-[0_2px_8px_rgba(15,31,45,0.05)] ${
            isDriver ? 'rounded-[14px_14px_4px_14px] bg-brand text-white' : 'rounded-[14px_14px_14px_4px] bg-white text-ink'
          }`}
        >
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
  };

  const chatBody =
    messagesState.loading && messages.length === 0 ? (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin text-brand" /> Loading messages…
      </div>
    ) : messagesState.error ? (
      <div className="flex flex-1 items-center justify-center text-sm text-[#e11d48]">{messagesState.error}</div>
    ) : messages.length === 0 ? (
      <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-muted">
        Welcome the traveller and share itinerary ideas.
      </div>
    ) : (
      messages.map(renderMessage)
    );

  const submitMessage = (event) => {
    event.preventDefault();
    if (composerValue.trim()) handleSendMessage();
  };

  // Notice shown at the top of the thread when this traveller already has a booking with
  // the driver. Tapping it opens the full booking-details view.
  const conversationBooking = messagesState.booking;
  const bookingNotice = conversationBooking ? (
    <button
      type="button"
      onClick={() => setBookingDetailOpen(true)}
      className="flex w-full items-center gap-2.5 rounded-[14px] border border-brand/25 bg-brand-tint px-3.5 py-2.5 text-left transition hover:border-brand"
    >
      <CalendarCheck className="h-5 w-5 flex-shrink-0 text-brand-dark" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold text-ink">
          {conversationBooking.status === 'confirmed'
            ? 'Confirmed booking with this traveller'
            : 'Booking request from this traveller'}
        </span>
        <span className="block truncate text-[12px] text-muted">Tap to view the trip details</span>
      </span>
      <span className="flex-shrink-0 text-[15px] font-extrabold text-brand-dark">›</span>
    </button>
  ) : null;

  const renderConvList = (variant) => {
    if (conversationsState.loading) {
      return (
        <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted">
          <Loader2 className="h-4 w-4 animate-spin text-brand" /> Loading conversations…
        </div>
      );
    }
    if (conversationsState.error) {
      return (
        <div className="m-4 rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
          <p className="text-[#e11d48]">{conversationsState.error}</p>
          <button type="button" onClick={() => loadConversations({ silent: false })} className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft">
            Try again
          </button>
        </div>
      );
    }
    if (filteredConversations.length === 0) {
      return (
        <div className="m-4 rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
          {conversations.length === 0 ? 'No messages yet. Travellers can reach out from a vehicle page.' : 'No conversations match your search.'}
        </div>
      );
    }
    return filteredConversations.map((conversation, index) => {
      const nm = travellerNameOf(conversation);
      const preview = conversation.lastMessage?.body || 'Conversation started.';
      const timestamp = formatShortDateTime(conversation.lastMessageAt || conversation.updatedAt);
      const unread = conversation.unreadCount > 0;
      const active = variant === 'desktop' && conversation.id === selectedConversationId;
      return (
        <button
          key={conversation.id}
          type="button"
          onClick={() => handleSelectConversation(conversation.id)}
          className={`flex w-full items-center gap-[11px] py-3.5 text-left ${
            variant === 'desktop'
              ? `px-[18px] border-l-[3px] ${active ? 'border-brand bg-[#f3fbf6]' : 'border-transparent hover:bg-canvas'}`
              : `px-3.5 ${index > 0 ? 'border-t border-hairline' : ''} ${unread ? 'bg-[#f3fbf6]' : ''}`
          }`}
        >
          <Avatar name={nm} tone={AVATAR_TONES[index % AVATAR_TONES.length]} className="h-11 w-11 flex-shrink-0 rounded-[11px] text-sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[14.5px] font-bold text-ink">{nm}</span>
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
    <div className="min-h-screen overflow-x-clip bg-[#e7ebef] font-sans text-ink lg:flex">
      <DriverDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
        onSelect={(item, event) => {
          event?.preventDefault?.();
          navigate(item.href);
        }}
        user={sidebarUser}
        onLogout={handleLogout}
      />
      <DashboardSidebar
        navItems={navItems}
        onSelect={(item) => navigate(item.href)}
        user={sidebarUser}
        onLogout={handleLogout}
      />

      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-canvas shadow-[0_0_60px_rgba(15,31,45,0.06)] lg:mx-0 lg:max-w-none lg:flex-1 lg:shadow-none">
        <div className="lg:hidden">
        {view === 'thread' && selectedConversation ? (
          <div className="flex min-h-screen flex-col">
            <div className="text-white" style={{ background: HEADER_GRADIENT }}>
              <div className="flex items-center gap-3 px-4 pb-4 pt-4">
                <button
                  type="button"
                  onClick={() => setView('list')}
                  aria-label="Back"
                  className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white/[0.18] transition hover:bg-white/25"
                >
                  <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2} />
                </button>
                <Avatar name={threadName} tone="light" className="h-10 w-10 flex-shrink-0 text-[15px]" />
                <div className="min-w-0">
                  <div className="truncate text-[16px] font-extrabold">{threadName}</div>
                  <div className="truncate text-[12px] text-white/80">{threadSubtitle}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-1 flex-col">
              <div className="flex-1 space-y-2.5 px-4 py-4">
                {bookingNotice}
                {messagesState.loading && messages.length === 0 ? (
                  <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-brand" /> Loading messages…
                  </div>
                ) : messagesState.error ? (
                  <div className="flex min-h-[30vh] items-center justify-center text-sm text-[#e11d48]">
                    {messagesState.error}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex min-h-[30vh] items-center justify-center px-8 text-center text-sm text-muted">
                    Welcome the traveller and share itinerary ideas.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isDriver =
                      message.sender?.role === 'driver' || message.senderRole === 'driver';
                    if (message.type === 'offer' && message.offer) {
                      return (
                        <OfferBubble key={message.id} message={message} align={isDriver ? 'end' : 'start'} />
                      );
                    }
                    return (
                      <div key={message.id} className={`flex ${isDriver ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] px-[13px] py-[10px] text-[13.5px] shadow-[0_2px_8px_rgba(15,31,45,0.05)] ${
                            isDriver
                              ? 'rounded-[14px_14px_4px_14px] bg-brand text-white'
                              : 'rounded-[14px_14px_14px_4px] bg-white text-ink'
                          }`}
                        >
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
                )}
              </div>

              <div className="sticky bottom-0 z-10 border-t border-hairline bg-white px-4 py-3">
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (composerValue.trim()) handleSendMessage();
                  }}
                  className="flex items-center gap-2.5"
                >
                  <button
                    type="button"
                    onClick={() => setOfferOpen(true)}
                    aria-label="Send an offer"
                    className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white transition hover:border-brand"
                  >
                    <CalendarRange className="h-[17px] w-[17px] text-brand" />
                  </button>
                  <input
                    value={composerValue}
                    onChange={(event) => setComposerValue(event.target.value)}
                    placeholder="Message…"
                    className="h-[38px] flex-1 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white px-3 text-[13px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!composerValue.trim() || sendingMessage}
                    aria-label="Send"
                    className="grid h-[38px] w-[38px] flex-shrink-0 place-items-center rounded-[11px] bg-brand transition hover:bg-brand-dark disabled:opacity-50"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <Send className="h-[17px] w-[17px] text-white" />
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          <>
            <MobileHeader
              onMenu={() => setDrawerOpen(true)}
              right={<Avatar name={driverName} image={driverPhoto} tone="light" className="h-10 w-10 text-[15px]" />}
              eyebrow="INBOX"
              title="Messages"
            />
            <Sheet>
              <div className="mb-3.5 flex items-center gap-2.5 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5">
                <Search className="h-4 w-4 flex-shrink-0 text-muted-soft" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations"
                  className="w-full bg-transparent text-[13.5px] text-ink placeholder:text-[#adb8c0] focus:outline-none"
                />
              </div>

              {conversationsState.loading ? (
                <div className="flex min-h-[30vh] items-center justify-center gap-2 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" /> Loading conversations…
                </div>
              ) : conversationsState.error ? (
                <div className="rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
                  <p className="text-[#e11d48]">{conversationsState.error}</p>
                  <button
                    type="button"
                    onClick={() => loadConversations({ silent: false })}
                    className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft"
                  >
                    Try again
                  </button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
                  {conversations.length === 0
                    ? 'No messages yet. Travellers can reach out from the vehicle details page.'
                    : 'No conversations match your search.'}
                </div>
              ) : (
                <div className="overflow-hidden rounded-[18px] bg-white shadow-card">
                  {filteredConversations.map((conversation, index) => {
                    const travellerName = travellerNameOf(conversation);
                    const preview = conversation.lastMessage?.body || 'Conversation started.';
                    const timestamp = formatShortDateTime(
                      conversation.lastMessageAt || conversation.updatedAt
                    );
                    const unread = conversation.unreadCount > 0;
                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => handleSelectConversation(conversation.id)}
                        className={`flex w-full items-center gap-[11px] px-3.5 py-3.5 text-left ${
                          index > 0 ? 'border-t border-hairline' : ''
                        } ${unread ? 'bg-[#f3fbf6]' : ''}`}
                      >
                        <Avatar
                          name={travellerName}
                          tone={AVATAR_TONES[index % AVATAR_TONES.length]}
                          className="h-11 w-11 flex-shrink-0 text-sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[14.5px] font-bold text-ink">{travellerName}</span>
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
                  })}
                </div>
              )}

              <div className="mt-4 rounded-[16px] border-[1.5px] border-dashed border-[#cbd5db] bg-white p-4">
                <b className="text-[14px] text-ink">Send a formal offer</b>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-soft">
                  Open a conversation to share dates, vehicle, and price — travellers can book it instantly at checkout.
                </p>
              </div>
            </Sheet>
          </>
        )}
        </div>

        <div className="hidden h-screen lg:flex">
          <div className="flex w-[340px] flex-shrink-0 flex-col border-r border-hairline bg-white">
            <div className="px-[18px] pb-3.5 pt-5">
              <h1 className="mb-3 text-[20px] font-extrabold text-ink">Messages</h1>
              <div className="flex items-center gap-2.5 rounded-[11px] border-[1.5px] border-[#e2e8ea] px-3 py-2.5">
                <Search className="h-4 w-4 flex-shrink-0 text-muted-soft" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations"
                  className="w-full min-w-0 bg-transparent text-[13px] text-ink placeholder:text-[#adb8c0] focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">{renderConvList('desktop')}</div>
          </div>

          <div className="flex flex-1 flex-col bg-canvas">
            {selectedConversation ? (
              <>
                <div className="flex h-[72px] flex-shrink-0 items-center gap-3 border-b border-hairline bg-white px-6">
                  <Avatar name={threadName} tone="amber" className="h-10 w-10 flex-shrink-0 rounded-[11px] text-[15px]" />
                  <div className="min-w-0">
                    <b className="block truncate text-[15px] text-ink">{threadName}</b>
                    <div className="truncate text-[12px] text-muted-soft">{threadSubtitle}</div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-6 py-6">
                  {bookingNotice}
                  {chatBody}
                </div>
                <div className="flex-shrink-0 border-t border-hairline bg-white px-6 py-4">
                  <form onSubmit={submitMessage} className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => setOfferOpen(true)}
                      aria-label="Send an offer"
                      className="grid h-[42px] w-[42px] flex-shrink-0 place-items-center rounded-[12px] border-[1.5px] border-[#e2e8ea] bg-white transition hover:border-brand"
                    >
                      <CalendarRange className="h-[18px] w-[18px] text-brand" />
                    </button>
                    <input
                      value={composerValue}
                      onChange={(event) => setComposerValue(event.target.value)}
                      placeholder="Message…"
                      className="h-[42px] min-w-0 flex-1 rounded-[12px] border-[1.5px] border-[#e2e8ea] bg-white px-3.5 text-[13.5px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!composerValue.trim() || sendingMessage}
                      className="h-[42px] flex-shrink-0 rounded-[12px] bg-brand px-5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-50"
                    >
                      {sendingMessage ? 'Sending…' : 'Send'}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted">
                Select a conversation to view messages.
              </div>
            )}
          </div>
        </div>
      </div>

      {offerOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-ink/45" onClick={() => setOfferOpen(false)} aria-hidden="true" />
          <div className="relative mx-auto max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-[24px] bg-canvas p-5 pb-8 shadow-drawer">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#cbd5db]" />
            <div className="mb-3 flex items-center justify-between">
              <b className="text-[17px] text-ink">Send an offer</b>
              <button
                type="button"
                onClick={() => setOfferOpen(false)}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-lg bg-white shadow-soft"
              >
                <X className="h-4 w-4 text-ink" />
              </button>
            </div>
            <form onSubmit={handleSendOffer} className="flex flex-col gap-3">
              <div className="flex gap-2.5">
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>Start date</label>
                  <input type="date" value={offerForm.startDate} onChange={(e) => handleOfferChange('startDate', e.target.value)} className={`mt-1 ${inputCls}`} required />
                </div>
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>End date</label>
                  <input type="date" value={offerForm.endDate} onChange={(e) => handleOfferChange('endDate', e.target.value)} className={`mt-1 ${inputCls}`} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>Vehicle</label>
                <select value={offerForm.vehicleId} onChange={(e) => handleOfferChange('vehicleId', e.target.value)} className={`mt-1 ${inputCls}`} required>
                  <option value="">Select a vehicle</option>
                  {vehiclesState.items.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.model} · ${vehicle.pricePerDay}/day
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2.5">
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>Total price (USD)</label>
                  <input type="number" min="0" value={offerForm.totalPrice} onChange={(e) => handleOfferChange('totalPrice', e.target.value)} className={`mt-1 ${inputCls}`} required />
                </div>
                <div className="min-w-0 flex-1">
                  <label className={labelCls}>Included kms</label>
                  <input type="number" min="0" value={offerForm.totalKms} onChange={(e) => handleOfferChange('totalKms', e.target.value)} className={`mt-1 ${inputCls}`} required />
                </div>
              </div>
              <div>
                <label className={labelCls}>Price per extra km (USD)</label>
                <input type="number" min="0" step="0.001" inputMode="decimal" value={offerForm.pricePerExtraKm} onChange={(e) => handleOfferChange('pricePerExtraKm', e.target.value)} className={`mt-1 ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>Notes to traveller (optional)</label>
                <textarea rows={3} value={offerForm.note} onChange={(e) => handleOfferChange('note', e.target.value)} placeholder="Share highlights, inclusions, or expectations." className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" />
              </div>
              {vehiclesState.error ? <p className="text-[12px] text-[#e11d48]">{vehiclesState.error}</p> : null}
              <button
                type="submit"
                disabled={sendingOffer || !selectedConversationId}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70"
              >
                {sendingOffer ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending offer…
                  </>
                ) : (
                  'Send offer'
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}
      {bookingDetailOpen ? (
        <BookingDetailsModal
          booking={conversationBooking}
          onClose={() => setBookingDetailOpen(false)}
        />
      ) : null}
    </div>
  );
};

const OfferBubble = ({ message, align }) => {
  const { offer } = message;
  const start = formatDateLabel(offer.startDate);
  const end = formatDateLabel(offer.endDate);
  return (
    <div className={`flex ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[88%] rounded-[16px] border-[1.5px] border-[#cdeede] bg-white p-3.5 shadow-[0_4px_14px_rgba(15,31,45,0.06)]">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="rounded-[7px] bg-brand-tint px-2 py-[3px] text-[10.5px] font-extrabold uppercase text-brand-dark">
            Offer sent
          </span>
          <b className="text-[18px] text-ink">{formatCurrency(offer.totalPrice)}</b>
        </div>
        <div className="text-[13px] font-bold text-ink">
          {offer.vehicle?.model || 'Selected vehicle'} · {start}–{end}
        </div>
        <div className="mt-0.5 text-[12px] text-muted-soft">
          {offer.totalKms} km included · {formatRate(offer.pricePerExtraKm)} / extra km
        </div>
        {message.body ? (
          <div className="mt-1.5 text-[12px] leading-relaxed text-muted">{message.body}</div>
        ) : null}
      </div>
    </div>
  );
};

const formatShortDateTime = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


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

const formatCurrency = (value) => {
  if (typeof value !== 'number') {
    return '$0';
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

// Per-km rates are small decimals (e.g. $0.30), so keep the fractional part.
const formatRate = (value) =>
  typeof value === 'number'
    ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`
    : '$0.00';

export default DriverMessages;

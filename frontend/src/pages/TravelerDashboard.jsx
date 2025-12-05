import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CalendarDays,
  CalendarRange,
  Car,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Users,
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
import { clearStoredToken } from '../services/authToken.js';

const tabs = [
  {
    id: 'bookings',
    label: 'My Bookings',
    icon: CalendarDays,
    description: 'Upcoming and past trips at a glance.',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: MessageCircle,
    description: 'Stay in sync with drivers and support.',
  },
  {
    id: 'requests',
    label: 'My Requests',
    icon: MapPin,
    description: 'Track quotes and open itinerary requests.',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'Manage your traveller profile and preferences.',
  },
];

const formatDateForInput = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
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
  if (!value) {
    return undefined;
  }
  const suffix = boundary === 'end' ? 'T23:59:59.000Z' : 'T00:00:00.000Z';
  const iso = `${value}${suffix}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const BOOKING_CANCELLATION_NOTICE = [
  'Free to cancel up to 2 days before start date.',
  '50% of total cost to be paid to driver if cancelling within 2 days of start date.',
  '100% of completed days and 50% of uncompleted days to be paid to driver if cancelling after start date.',
].join('\n\n');

const TravelerDashboard = () => {
  const [activeTab, setActiveTab] = useState('bookings');
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
  });
  const [composerValue, setComposerValue] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [travelerBookingsState, setTravelerBookingsState] = useState({
    loading: true,
    error: '',
    items: [],
  });
  const [profileState, setProfileState] = useState({
    loading: true,
    error: '',
    data: null,
    savingProfile: false,
    savingPassword: false,
  });
  const [travelerBriefsState, setTravelerBriefsState] = useState({
    loading: true,
    error: '',
    items: [],
  });
  const [creatingBrief, setCreatingBrief] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const travelerFirstName = profileState?.data?.name?.split(' ')?.[0] || 'traveller';

  const handleLogout = useCallback(() => {
    clearStoredToken();
    toast.success('You have been logged out.');
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
          });
        }
      }
    },
    []
  );

  const loadTravelerBookings = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setTravelerBookingsState((prev) => ({
          ...prev,
          loading: true,
          error: '',
        }));
      }

      try {
        const data = await fetchTravelerBookings();
        const items = Array.isArray(data?.bookings) ? data.bookings : [];
        setTravelerBookingsState({
          loading: false,
          error: '',
          items,
        });
      } catch (error) {
        const message = error?.message || 'Unable to load your bookings right now.';
        setTravelerBookingsState({
          loading: false,
          error: message,
          items: [],
        });
      }
    },
    []
  );

  const loadTravelerBriefs = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setTravelerBriefsState((prev) => ({
          ...prev,
          loading: true,
          error: '',
        }));
      }
      try {
        const data = await fetchTravelerBriefs();
        setTravelerBriefsState({
          loading: false,
          error: '',
          items: Array.isArray(data?.briefs) ? data.briefs : [],
        });
      } catch (error) {
        setTravelerBriefsState({
          loading: false,
          error: error?.message || 'Unable to load your tour briefs.',
          items: [],
        });
      }
    },
    []
  );

  const loadTravelerProfile = useCallback(
    async ({ silent = false } = {}) => {
      setProfileState((prev) => ({
        ...prev,
        loading: silent ? prev.loading : true,
        error: silent ? prev.error : '',
      }));
      try {
        const response = await fetchProfileCurrentUser();
        setProfileState((prev) => ({
          ...prev,
          loading: false,
          error: '',
          data: response?.user || null,
        }));
      } catch (error) {
        setProfileState((prev) => ({
          ...prev,
          loading: false,
          data: null,
          error: error?.message || 'Unable to load profile.',
        }));
      }
    },
    []
  );

  useEffect(() => {
    loadTravelerProfile({ silent: false });
  }, [loadTravelerProfile]);

  useEffect(() => {
    loadConversations();
    const id = setInterval(() => loadConversations({ silent: true }), 15000);
    return () => clearInterval(id);
  }, [loadConversations]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadTravelerBookings();
    }
  }, [activeTab, loadTravelerBookings]);

  useEffect(() => {
    if (activeTab === 'requests') {
      loadTravelerBriefs();
    }
  }, [activeTab, loadTravelerBriefs]);

  useEffect(() => {
    if (activeTab === 'settings' && !profileState.data && !profileState.loading) {
      loadTravelerProfile({ silent: false });
    }
  }, [activeTab, profileState.data, profileState.loading, loadTravelerProfile]);

  useEffect(() => {
    if (!location.state) {
      return;
    }
    const { openTab, conversationId } = location.state;
    if (openTab) {
      setActiveTab(openTab);
    }
    if (conversationId) {
      setSelectedConversationId(conversationId);
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location, navigate]);

  useEffect(() => {
    if (
      conversationsState.items.length > 0 &&
      (!selectedConversationId || !conversationsState.items.some((item) => item.id === selectedConversationId))
    ) {
      setSelectedConversationId(conversationsState.items[0].id);
    }
  }, [conversationsState.items, selectedConversationId]);

  useEffect(() => {
    if (activeTab !== 'messages' || !selectedConversationId) {
      return;
    }
    loadMessages(selectedConversationId);
  }, [activeTab, selectedConversationId, loadMessages]);

  useEffect(() => {
    if (activeTab !== 'messages' || !selectedConversationId) {
      return;
    }
    const id = setInterval(() => loadMessages(selectedConversationId, { silent: true }), 5000);
    return () => clearInterval(id);
  }, [activeTab, selectedConversationId, loadMessages]);

  const selectedConversation = useMemo(
    () => conversationsState.items.find((item) => item.id === selectedConversationId) || null,
    [conversationsState.items, selectedConversationId]
  );

  const handleConversationSelect = (conversationId) => {
    setActiveTab('messages');
    setSelectedConversationId(conversationId);
  };

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
              ? {
                  ...item,
                  lastMessage: newMessage,
                  lastMessageAt: newMessage.createdAt,
                  unreadCount: 0,
                }
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

  const handleOfferBooking = (message) => {
    const vehicleRef = message?.offer?.vehicle;
    let vehicleId = null;

    if (typeof vehicleRef === 'string') {
      vehicleId = vehicleRef;
    } else if (vehicleRef && typeof vehicleRef === 'object') {
      vehicleId =
        vehicleRef.id ||
        vehicleRef._id ||
        (typeof vehicleRef.toString === 'function' ? vehicleRef.toString() : null);
    }

    if (!vehicleId) {
      toast.error('Vehicle details are missing for this offer.');
      return;
    }
    navigate(`/checkout/${vehicleId}?offer=${message.id}`, {
      state: { offerId: message.id },
    });
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

  const tabContent = (() => {
    switch (activeTab) {
      case 'bookings':
        return (
          <BookingsPanel
            bookingsState={travelerBookingsState}
            onReload={() => loadTravelerBookings({ silent: false })}
          />
        );
      case 'messages':
        return (
          <MessagesPanel
            conversationsState={conversationsState}
            selectedConversationId={selectedConversationId}
            selectedConversation={selectedConversation}
            onSelectConversation={handleConversationSelect}
            messagesState={messagesState}
            composerValue={composerValue}
            onComposerChange={setComposerValue}
            onSendMessage={handleSendMessage}
            sending={sendingMessage}
            onBookOffer={handleOfferBooking}
            onReloadConversations={() => loadConversations({ silent: false })}
          />
        );
      case 'requests':
        return (
          <RequestsPanel
            briefsState={travelerBriefsState}
            onReload={() => loadTravelerBriefs({ silent: false })}
            onCreateBrief={handleTravelerBriefCreate}
            creating={creatingBrief}
          />
        );
      case 'settings':
        return (
          <SettingsPanel
            state={profileState}
            onSave={handleTravelerProfileSave}
            onPasswordChange={handleTravelerPasswordChange}
            onRetry={() => loadTravelerProfile({ silent: false })}
          />
        );
      default:
        return null;
    }
  })();

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Traveller dashboard
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Welcome back, {travelerFirstName}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Manage your trips, conversations, and requests all in one place.
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
              >
                Logout
              </button>
            </div>
          </header>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">{tabContent}</div>
        </div>
      </div>
    </section>
  );
};

const BookingsPanel = ({ bookingsState, onReload }) => {
  const { loading, error, items } = bookingsState;
  const [editingBooking, setEditingBooking] = useState(null);
  const [editForm, setEditForm] = useState(buildBookingEditForm({}));
  const [savingEdit, setSavingEdit] = useState(false);
  const [cancellingId, setCancellingId] = useState('');
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: '5', title: '', comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const activeReviewStatus = reviewingBooking?.review?.status;
  const activeReviewLabel =
    activeReviewStatus === 'pending'
      ? 'Awaiting approval'
      : activeReviewStatus === 'approved'
      ? 'Published'
      : activeReviewStatus === 'rejected'
      ? 'Declined'
      : '';
  const activeReviewBadgeClass = activeReviewStatus
    ? reviewStatusStyles[activeReviewStatus] || 'bg-slate-200 text-slate-700'
    : 'bg-slate-200 text-slate-700';

  const statusStyles = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
    rejected: 'bg-rose-100 text-rose-700',
  };
  const reviewStatusStyles = {
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-rose-100 text-rose-700',
  };

  const handleReload = () => {
    if (typeof onReload === 'function') {
      onReload();
    }
  };

  const openEditModal = (booking) => {
    setEditingBooking(booking);
    setEditForm(buildBookingEditForm(booking));
  };

  const closeEditModal = () => {
    setEditingBooking(null);
    setEditForm(buildBookingEditForm({}));
    setSavingEdit(false);
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingBooking) {
      return;
    }
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

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    setSavingEdit(true);
    try {
      await updateTravelerBooking(editingBooking.id, payload);
      toast.success('Booking updated.');
      closeEditModal();
      handleReload();
    } catch (error) {
      toast.error(error?.message || 'Unable to update booking.');
      setSavingEdit(false);
    }
  };

  const handleCancelBooking = async (booking) => {
    const confirmation = window.confirm(`${BOOKING_CANCELLATION_NOTICE}\n\nDo you want to cancel this booking?`);
    if (!confirmation) {
      return;
    }
    setCancellingId(booking.id);
    try {
      await cancelTravelerBooking(booking.id);
      toast.success('Booking cancelled.');
      handleReload();
    } catch (error) {
      toast.error(error?.message || 'Unable to cancel booking.');
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
    });
  };

  const closeReviewModal = () => {
    setReviewingBooking(null);
    setReviewForm({ rating: '5', title: '', comment: '' });
    setSubmittingReview(false);
  };

  const handleReviewFieldChange = (field, value) => {
    setReviewForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

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
      });
      toast.success('Review submitted for moderation.');
      closeReviewModal();
      handleReload();
    } catch (error) {
      toast.error(error?.message || 'Unable to submit review.');
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        Loading your bookings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p>{error}</p>
        <button
          type="button"
          onClick={handleReload}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <h2 className="text-base font-semibold text-slate-900">No trips booked yet</h2>
        <p>
          When you confirm a driver your itinerary will appear here. Head back to the vehicle catalog to
          find your next adventure.
        </p>
        <Link
          to="/vehicles"
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Browse vehicles
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">My bookings</h2>
            <p className="text-sm text-slate-500">Track upcoming trips and review past journeys.</p>
          </div>
        <button
          type="button"
          onClick={handleReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Refresh
        </button>
      </div>
      <ul className="space-y-3">
        {items.map((booking) => {
          const start = formatDateLabel(booking.startDate);
          const end = formatDateLabel(booking.endDate);
          const vehicleName = booking.vehicle?.model || 'Vehicle to be confirmed';
          const driverName = booking.driver?.name || 'Driver to be assigned';
          const priceLabel =
            typeof booking.totalPrice === 'number' && booking.totalPrice > 0
              ? formatCurrency(booking.totalPrice)
              : 'Rate on arrival';
          const statusClass = statusStyles[booking.status] || 'bg-slate-100 text-slate-600';
          const statusLabel = booking.status
            ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
            : 'Pending';
          const conversationState = booking.conversationId
            ? { openTab: 'messages', conversationId: booking.conversationId }
            : null;
          const isPast = booking.endDate ? new Date(booking.endDate) < new Date() : false;
          const offerLabel = booking.offerStatus
            ? booking.offerStatus.charAt(0).toUpperCase() + booking.offerStatus.slice(1)
            : null;
          const canManage = !['cancelled', 'rejected'].includes(booking.status) && !isPast;
          const reviewStatus = booking.review?.status;
          const reviewStatusLabel =
            reviewStatus === 'pending'
              ? 'Awaiting approval'
              : reviewStatus === 'approved'
              ? 'Published'
              : reviewStatus === 'rejected'
              ? 'Declined'
              : '';
          const reviewBadgeClass = reviewStatus
            ? reviewStatusStyles[reviewStatus] || 'bg-slate-100 text-slate-600'
            : '';
          const showReviewPrompt = booking.canReview && !booking.review;

          return (
            <li
              key={booking.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  {vehicleName}
                  <span className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {start && end ? (
                    <>
                      {start} – {end}
                    </>
                  ) : (
                    'Dates to be confirmed'
                  )}
                </p>
                <p className="text-sm text-slate-500">
                  Driver <span className="font-medium text-slate-700">{driverName}</span>
                </p>
                <p className="text-sm text-slate-500">
                  Total <span className="font-medium text-slate-700">{priceLabel}</span>
                </p>
                {offerLabel ? (
                  <p className="text-xs text-emerald-600">Offer status: {offerLabel}</p>
                ) : null}
                {isPast ? (
                  <p className="mt-1 text-xs text-slate-400">Trip completed</p>
                ) : null}
                {booking.review ? (
                  <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${reviewBadgeClass}`}
                      >
                        {reviewStatusLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-500">
                        <Star className="h-4 w-4" fill="currentColor" />
                        {booking.review.rating}/5
                      </span>
                    </div>
                    {booking.review.title ? (
                      <p className="text-sm font-semibold text-slate-700">{booking.review.title}</p>
                    ) : null}
                    <p className="text-xs text-slate-500">{booking.review.comment}</p>
                    <button
                      type="button"
                      onClick={() => openReviewModal(booking)}
                      className="text-xs font-semibold text-emerald-600 transition hover:text-emerald-700"
                    >
                      View review
                    </button>
                  </div>
                ) : null}
                {showReviewPrompt ? (
                  <button
                    type="button"
                    onClick={() => openReviewModal(booking)}
                    className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    <Star className="h-4 w-4" />
                    Leave a review
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-600">
                {conversationState ? (
                  <Link
                    to="/dashboard"
                    state={conversationState}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800"
                  >
                    Open chat
                  </Link>
                ) : null}
                {booking.vehicle?.id ? (
                  <Link
                    to={`/vehicles/${booking.vehicle.id}`}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                  >
                    View vehicle
                  </Link>
                ) : null}
                {canManage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => openEditModal(booking)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                    >
                      Edit details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancelBooking(booking)}
                      disabled={cancellingId === booking.id}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:border-rose-200 disabled:text-rose-400"
                    >
                      {cancellingId === booking.id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Cancelling...
                        </>
                      ) : (
                        'Cancel booking'
                      )}
                    </button>
                  </>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      </div>
      {editingBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Update booking</h3>
                <p className="text-xs text-slate-500">
                  {editingBooking.vehicle?.model
                    ? `Adjust details for ${editingBooking.vehicle.model}.`
                    : 'Update traveller details for this itinerary.'}
                </p>
                {editingBooking.offerId ? (
                  <p className="mt-2 text-xs text-amber-600">
                    Dates were confirmed through a driver offer. Message your driver to change the schedule.
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={editForm.startDate}
                    onChange={(event) => handleEditFieldChange('startDate', event.target.value)}
                    disabled={Boolean(editingBooking.offerId)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                    required={!editingBooking.offerId}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    End date
                  </label>
                  <input
                    type="date"
                    value={editForm.endDate}
                    onChange={(event) => handleEditFieldChange('endDate', event.target.value)}
                    disabled={Boolean(editingBooking.offerId)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                    required={!editingBooking.offerId}
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Pickup location
                  </label>
                  <input
                    type="text"
                    value={editForm.startPoint}
                    onChange={(event) => handleEditFieldChange('startPoint', event.target.value)}
                    placeholder="Hotel or meeting point"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Drop-off location
                  </label>
                  <input
                    type="text"
                    value={editForm.endPoint}
                    onChange={(event) => handleEditFieldChange('endPoint', event.target.value)}
                    placeholder="Final destination"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Flight number (optional)
                  </label>
                  <input
                    type="text"
                    value={editForm.flightNumber}
                    onChange={(event) => handleEditFieldChange('flightNumber', event.target.value)}
                    placeholder="e.g. UL 403"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Arrival time
                    </label>
                    <input
                      type="text"
                      value={editForm.arrivalTime}
                      onChange={(event) => handleEditFieldChange('arrivalTime', event.target.value)}
                      placeholder="e.g. 08:30"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Departure time
                    </label>
                    <input
                      type="text"
                      value={editForm.departureTime}
                      onChange={(event) => handleEditFieldChange('departureTime', event.target.value)}
                      placeholder="e.g. 17:45"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Special requests
                </label>
                <textarea
                  rows={3}
                  value={editForm.specialRequests}
                  onChange={(event) => handleEditFieldChange('specialRequests', event.target.value)}
                  placeholder="Dietary needs, accessibility notes, or anything else you'd like your driver to know."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/60"
                >
                  {savingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {reviewingBooking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {reviewingBooking.vehicle?.model
                    ? `Review for ${reviewingBooking.vehicle.model}`
                    : 'Share your trip feedback'}
                </h3>
                <p className="text-xs text-slate-500">
                  Let future travellers know what to expect from this experience.
                </p>
              </div>
              <button
                type="button"
                onClick={closeReviewModal}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            {reviewingBooking.review ? (
              <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${activeReviewBadgeClass}`}
                  >
                    {activeReviewLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-lg font-semibold text-amber-500">
                    <Star className="h-5 w-5" fill="currentColor" />
                    {reviewingBooking.review.rating}/5
                  </span>
                </div>
                {reviewingBooking.review.title ? (
                  <p className="text-sm font-semibold text-slate-700">
                    {reviewingBooking.review.title}
                  </p>
                ) : null}
                <p className="text-sm text-slate-600 whitespace-pre-line">
                  {reviewingBooking.review.comment}
                </p>
                {reviewingBooking.review.adminNote ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    <p className="font-semibold">Admin note</p>
                    <p>{reviewingBooking.review.adminNote}</p>
                  </div>
                ) : null}
                <p className="text-xs text-slate-500">
                  Submitted {formatDateLabel(reviewingBooking.review.submittedAt)}
                </p>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="review-rating"
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Rating
                  </label>
                  <select
                    id="review-rating"
                    value={reviewForm.rating}
                    onChange={(event) => handleReviewFieldChange('rating', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    {[5, 4, 3, 2, 1].map((value) => (
                      <option key={value} value={String(value)}>
                        {value} — {value === 5 ? 'Amazing' : value === 4 ? 'Great' : value === 3 ? 'Good' : value === 2 ? 'Okay' : 'Needs improvement'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="review-title"
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Review title (optional)
                  </label>
                  <input
                    id="review-title"
                    type="text"
                    value={reviewForm.title}
                    onChange={(event) => handleReviewFieldChange('title', event.target.value)}
                    placeholder="Highlights from your trip"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    maxLength={120}
                  />
                </div>
                <div>
                  <label
                    htmlFor="review-comment"
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Share your experience
                  </label>
                  <textarea
                    id="review-comment"
                    value={reviewForm.comment}
                    onChange={(event) => handleReviewFieldChange('comment', event.target.value)}
                    placeholder="Tell us about your driver, vehicle, and itinerary highlights."
                    rows={5}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                    maxLength={1200}
                  />
                  <p className="mt-1 text-xs text-slate-400">Minimum 10 characters.</p>
                </div>
                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeReviewModal}
                    className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submittingReview ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit review'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

const MessagesPanel = ({
  conversationsState,
  selectedConversationId,
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
  const { loading: convLoading, error: convError, items: conversations } = conversationsState;
  const { loading: msgLoading, error: msgError, items: messages } = messagesState;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!composerValue.trim()) {
      return;
    }
    onSendMessage();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Conversations</h2>
          <p className="text-sm text-slate-500">
            Coordinate plans with drivers. Phone numbers, links, and emails are hidden automatically.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {convLoading ? (
            <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
              Loading conversations...
            </div>
          ) : convError ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center space-y-2 text-center text-sm text-rose-600">
              <p>{convError}</p>
              <button
                type="button"
                onClick={onReloadConversations}
                className="inline-flex items-center rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300"
              >
                Try again
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center text-center text-sm text-slate-500">
              Start a conversation from a vehicle page to see it here.
            </div>
          ) : (
            <ul className="space-y-2">
              {conversations.map((conversation) => {
                const isActive = conversation.id === selectedConversationId;
                const driverName =
                  conversation.participants?.driver?.name ||
                  conversation.participants?.driver?.email ||
                  'Driver';
                const vehicleLabel = conversation.vehicle?.model ? ` • ${conversation.vehicle.model}` : '';
                const preview = conversation.lastMessage?.body || 'Conversation started.';
                const timestamp = formatShortDateTime(conversation.lastMessageAt || conversation.updatedAt);

                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                        isActive
                          ? 'border-emerald-300 bg-white shadow-sm'
                          : 'border-transparent bg-white/60 hover:border-slate-200 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {driverName}
                          {vehicleLabel}
                        </span>
                        <span className="text-xs text-slate-400">{timestamp}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">{preview}</p>
                      {conversation.unreadCount > 0 ? (
                        <span className="mt-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                          {conversation.unreadCount} new
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        <section className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-25">
          {selectedConversation ? (
            <>
              <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    {selectedConversation.participants?.driver?.name || 'Driver'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedConversation.vehicle?.model
                      ? `Discussing ${selectedConversation.vehicle.model}`
                      : 'General conversation'}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  Live chat
                </span>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-white px-4 py-4">
                {msgLoading && messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-400" />
                    Loading messages...
                  </div>
                ) : msgError ? (
                  <div className="flex h-full items-center justify-center text-sm text-rose-600">
                    {msgError}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">
                    Send a message to introduce yourself to the driver.
                  </div>
                ) : (
                  messages.map((message) => {
                    const isTraveller = message.sender?.role === 'guest' || message.senderRole === 'guest';
                    const containerClass = isTraveller
                      ? 'justify-end'
                      : 'justify-start';
                    const bubbleClass = isTraveller
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-800 border border-slate-200';
                    const timestamp = formatChatTimestamp(message.createdAt);

                    return (
                      <div key={message.id} className={`flex ${containerClass}`}>
                        <div className={`max-w-full rounded-2xl px-4 py-3 text-sm shadow-sm ${bubbleClass}`}>
                          <p className={`text-[11px] font-semibold ${isTraveller ? 'text-emerald-100/80' : 'text-slate-500'}`}>
                            {isTraveller ? 'You' : message.sender?.name || 'Driver'} • {timestamp}
                          </p>
                          <div className="mt-1 whitespace-pre-wrap text-sm">
                            {message.body}
                          </div>
                          {message.warning ? (
                            <div
                              className={`mt-2 flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
                                isTraveller
                                  ? 'border-emerald-500/40 bg-emerald-700/40 text-emerald-50'
                                  : 'border-amber-200 bg-amber-50 text-amber-700'
                              }`}
                            >
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                              <span>{message.warning}</span>
                            </div>
                          ) : null}
                          {message.type === 'offer' && message.offer ? (
                            <OfferDetails message={message} onBookOffer={onBookOffer} />
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
                {msgLoading && messages.length > 0 ? (
                  <div className="flex items-center justify-center text-xs text-slate-400">
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    Refreshing...
                  </div>
                ) : null}
              </div>

              <footer className="border-t border-slate-200 bg-white px-4 py-3">
                <form onSubmit={handleSubmit} className="space-y-2">
                  <textarea
                    value={composerValue}
                    onChange={(event) => onComposerChange(event.target.value)}
                    placeholder="Write a message to your driver..."
                    className="min-h-[80px] w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    disabled={!selectedConversationId}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <p>Keep communication on Car With Driver. Personal contact details are hidden for your safety.</p>
                    <button
                      type="submit"
                      disabled={!composerValue.trim() || sending}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {sending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-white" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send message
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl bg-white text-sm text-slate-500">
              Select a conversation to view messages.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

const OfferDetails = ({ message, onBookOffer }) => {
  const { offer } = message;
  const start = formatDateLabel(offer.startDate);
  const end = formatDateLabel(offer.endDate);
  const totalPrice = formatCurrency(offer.totalPrice);
  const vehicleName = offer.vehicle?.model || 'Selected vehicle';

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <CalendarRange className="h-4 w-4" />
        Offer details
      </div>
      <p>
        <strong>Vehicle:</strong> {vehicleName}
      </p>
      <p>
        <strong>Dates:</strong> {start} to {end}
      </p>
      <p>
        <strong>Total price:</strong> {totalPrice} ({offer.currency})
      </p>
      <p>
        <strong>Included distance:</strong> {offer.totalKms} km · Extra km {formatCurrency(offer.pricePerExtraKm)}
      </p>
      <button
        type="button"
        onClick={() => onBookOffer(message)}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <Car className="h-3.5 w-3.5" />
        Book this offer
      </button>
    </div>
  );
};

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

const RequestsPanel = ({ briefsState, onReload, onCreateBrief, creating }) => {
  const { loading, error, items } = briefsState;
  const [formState, setFormState] = useState(() => buildBriefForm());

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!onCreateBrief) {
      return;
    }
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
    } catch (submitError) {
      console.warn('Create brief failed', submitError);
    }
  };

  if (loading) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        Loading your tour briefs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p>{error}</p>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-base font-semibold text-slate-900">Share your next trip</h2>
          <p className="text-sm text-slate-500">
            Describe your itinerary so approved drivers can send tailored offers.
          </p>
        </header>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start date
              </label>
              <input
                type="date"
                name="startDate"
                value={formState.startDate}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                End date
              </label>
              <input
                type="date"
                name="endDate"
                value={formState.endDate}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Start location
              </label>
              <input
                type="text"
                name="startLocation"
                value={formState.startLocation}
                onChange={handleFieldChange}
                placeholder="e.g. Colombo airport"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                End location
              </label>
              <input
                type="text"
                name="endLocation"
                value={formState.endLocation}
                onChange={handleFieldChange}
                placeholder="e.g. Kandy"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Adults
              </label>
              <input
                type="number"
                min="1"
                name="adults"
                value={formState.adults}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Children
              </label>
              <input
                type="number"
                min="0"
                name="children"
                value={formState.children}
                onChange={handleFieldChange}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Country of residence
            </label>
            <input
              type="text"
              name="country"
              value={formState.country}
              onChange={handleFieldChange}
              placeholder="e.g. United Kingdom"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Trip details
            </label>
            <textarea
              name="message"
              rows={4}
              value={formState.message}
              onChange={handleFieldChange}
              placeholder="Share must-see stops, accommodation needs, languages, etc."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
            <p className="mt-1 text-xs text-slate-400">Drivers receive this brief instantly.</p>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Post tour brief
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Your tour briefs</h2>
            <p className="text-sm text-slate-500">
              Track driver interest and keep conversations moving.
            </p>
          </div>
          <button
            type="button"
            onClick={onReload}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            Refresh
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
            <p className="font-medium text-slate-800">No briefs published yet.</p>
            <p className="mt-1">
              Post your first itinerary above to invite vetted drivers to respond with offers.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((brief) => {
              const start = formatDateLabel(brief.startDate);
              const end = formatDateLabel(brief.endDate);
              const dateLabel = start && end ? `${start} – ${end}` : 'Dates to be confirmed';
              const offerLabel = brief.offersCount === 1 ? 'offer' : 'offers';
              const lastResponse = brief.lastResponseAt
                ? formatShortDateTime(brief.lastResponseAt)
                : null;
              const statusClass =
                brief.status === 'open'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-200 text-slate-600';

              return (
                <li
                  key={brief.id}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {brief.startLocation} → {brief.endLocation}
                      </p>
                      <p className="text-xs text-slate-500">{dateLabel}</p>
                    </div>
                    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusClass}`}>
                      {brief.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600 whitespace-pre-line">{brief.message}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-400" />
                      {brief.adults} adult{brief.adults === 1 ? '' : 's'}
                      {brief.children > 0 ? ` · ${brief.children} child${brief.children === 1 ? '' : 'ren'}` : ''}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {brief.country}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5 text-slate-400" />
                      {brief.offersCount} {offerLabel}
                    </span>
                    {lastResponse ? (
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                        Last response {lastResponse}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
};

const buildTravelerProfileForm = (profile) => ({
  name: profile?.name || '',
  contactNumber: profile?.contactNumber || '',
  address: profile?.address || '',
});

const SettingsPanel = ({ state, onSave, onPasswordChange, onRetry }) => {
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
      await onSave({
        name: formState.name,
        contactNumber: formState.contactNumber,
        address: formState.address,
      });
    } catch (error) {
      console.warn('Profile update failed', error);
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
      await onPasswordChange({
        currentPassword: passwordForm.currentPassword,
        password: passwordForm.password,
      });
      setPasswordForm({ currentPassword: '', password: '', confirmPassword: '' });
    } catch (error) {
      console.warn('Password update failed', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        Loading profile…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center text-sm text-rose-600">
        <p>{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
        No profile details available.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">Profile details</h2>
          <p className="text-sm text-slate-500">Tell us how to reach you while you travel.</p>
        </header>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label htmlFor="traveler-name" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Full name
            </label>
            <input
              id="traveler-name"
              name="name"
              value={formState.name}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <div>
            <label htmlFor="traveler-email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Email
            </label>
            <input
              id="traveler-email"
              value={data.email}
              readOnly
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
            <p className="mt-1 text-xs text-slate-400">Need to change your email? Contact support.</p>
          </div>
          <div>
            <label htmlFor="traveler-contact" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Contact number
            </label>
            <input
              id="traveler-contact"
              name="contactNumber"
              value={formState.contactNumber}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="e.g. +94 71 123 4567"
            />
          </div>
          <div>
            <label htmlFor="traveler-address" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Home base
            </label>
            <input
              id="traveler-address"
              name="address"
              value={formState.address}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="City, country"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">Reset password</h2>
          <p className="text-sm text-slate-500">Update your password to keep your account secure.</p>
        </header>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="traveler-password-current" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current password
            </label>
            <input
              id="traveler-password-current"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <div>
            <label htmlFor="traveler-password-new" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              New password
            </label>
            <input
              id="traveler-password-new"
              name="password"
              type="password"
              value={passwordForm.password}
              onChange={handlePasswordFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
              minLength={8}
            />
          </div>
          <div>
            <label htmlFor="traveler-password-confirm" className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Confirm new password
            </label>
            <input
              id="traveler-password-confirm"
              name="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              onChange={handlePasswordFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                'Update password'
              )}
            </button>
          </div>
        </form>
      </section>
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

const formatChatTimestamp = (value) => {
  if (!value) {
    return 'now';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'now';
  }
  return date.toLocaleTimeString('en-US', {
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

export default TravelerDashboard;

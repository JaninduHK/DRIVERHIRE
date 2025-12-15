import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  Car,
  CheckCircle2,
  CircleUserRound,
  ClipboardList,
  DollarSign,
  FileText,
  Gauge,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Percent,
  RotateCcw,
  Send,
  Users,
  XCircle,
  Star,
} from 'lucide-react';
import {
  fetchDriverApplications,
  updateDriverStatus as updateDriverStatusRequest,
  fetchVehicleSubmissions,
  updateVehicleStatus as updateVehicleStatusRequest,
  updateVehicleDetails as updateVehicleDetailsRequest,
  fetchReviews,
  updateReviewStatus as updateReviewStatusRequest,
  fetchBookings as fetchAdminBookings,
  updateBooking as updateAdminBooking,
  deleteBooking as deleteAdminBooking,
  fetchBriefs as fetchAdminBriefs,
  updateBrief as updateAdminBrief,
  deleteBrief as deleteAdminBrief,
  fetchOffers as fetchAdminOffers,
  updateOfferStatus as updateAdminOfferStatus,
  deleteOffer as deleteAdminOffer,
  fetchConversations as fetchAdminConversations,
  updateConversationStatus as updateAdminConversationStatus,
  deleteConversation as deleteAdminConversation,
  fetchCommissionDiscounts as fetchAdminDiscounts,
  createCommissionDiscount as createAdminDiscount,
  updateCommissionDiscount as updateAdminDiscount,
  deleteCommissionDiscount as deleteAdminDiscount,
  sendDriverEmail as sendDriverEmailRequest,
} from '../services/adminApi.js';
import {
  fetchCurrentUser as fetchProfileCurrentUser,
  updateProfile as updateProfileRequest,
  updatePassword as updatePasswordRequest,
} from '../services/profileApi.js';
import { clearStoredToken } from '../services/authToken.js';
import { VEHICLE_FEATURES, getVehicleFeatureLabels } from '../constants/vehicleFeatures.js';

const NAV_ITEMS = [
  { id: 'bookings', label: 'Bookings', icon: CalendarDays },
  { id: 'discounts', label: 'Discounts', icon: Percent },
  { id: 'briefs', label: 'Briefs', icon: FileText },
  { id: 'offers', label: 'Offers', icon: Send },
  { id: 'conversations', label: 'Conversations', icon: MessageCircle },
  { id: 'drivers', label: 'Drivers', icon: CircleUserRound },
  { id: 'vehicles', label: 'Vehicles', icon: Car },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'reports', label: 'Reports', icon: ClipboardList },
  { id: 'performance', label: 'Performance', icon: Gauge },
  { id: 'profile', label: 'Profile', icon: Mail },
];

const DRIVER_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const VEHICLE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const driverStatusStyles = {
  [DRIVER_STATUS.PENDING]: 'bg-amber-100 text-amber-700',
  [DRIVER_STATUS.APPROVED]: 'bg-emerald-100 text-emerald-700',
  [DRIVER_STATUS.REJECTED]: 'bg-rose-100 text-rose-700',
};

const vehicleStatusStyles = {
  [VEHICLE_STATUS.PENDING]: 'bg-amber-100 text-amber-700',
  [VEHICLE_STATUS.APPROVED]: 'bg-emerald-100 text-emerald-700',
  [VEHICLE_STATUS.REJECTED]: 'bg-rose-100 text-rose-700',
};

const BOOKING_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
];

const BRIEF_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

const OFFER_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
];

const CONVERSATION_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
];

const buildAdminVehicleForm = (vehicle = {}) => ({
  model: vehicle.model ?? '',
  year: vehicle.year ? String(vehicle.year) : '',
  pricePerDay: vehicle.pricePerDay ? String(vehicle.pricePerDay) : '',
  seats: vehicle.seats ? String(vehicle.seats) : '',
  description: vehicle.description ?? '',
  englishSpeakingDriver: Boolean(vehicle.englishSpeakingDriver),
  meetAndGreetAtAirport: Boolean(vehicle.meetAndGreetAtAirport),
  fuelAndInsurance: Boolean(vehicle.fuelAndInsurance),
  driverMealsAndAccommodation: Boolean(vehicle.driverMealsAndAccommodation),
  parkingFeesAndTolls: Boolean(vehicle.parkingFeesAndTolls),
  allTaxes: Boolean(vehicle.allTaxes),
});

const buildAdminBookingForm = (booking = {}) => ({
  status: booking.status || 'pending',
  startDate: formatDateInput(booking.startDate),
  endDate: formatDateInput(booking.endDate),
  pricePerDay: booking.pricePerDay ? String(booking.pricePerDay) : '',
  totalPrice: booking.totalPrice ? String(booking.totalPrice) : '',
  paymentNote: booking.paymentNote || '',
  startPoint: booking.startPoint || '',
  endPoint: booking.endPoint || '',
  specialRequests: booking.specialRequests || '',
  flightNumber: booking.flightNumber || '',
  arrivalTime: booking.arrivalTime || '',
  departureTime: booking.departureTime || '',
});

const buildAdminBriefForm = (brief = {}) => ({
  status: brief.status || 'open',
  startDate: formatDateInput(brief.startDate),
  endDate: formatDateInput(brief.endDate),
  startLocation: brief.startLocation || '',
  endLocation: brief.endLocation || '',
  message: brief.message || '',
  country: brief.country || '',
});

const buildAdminDiscountForm = (discount = {}) => ({
  id: discount.id || '',
  name: discount.name || '',
  description: discount.description || '',
  discountPercent:
    typeof discount.discountPercent === 'number' ? String(discount.discountPercent) : '',
  startDate: formatDateInput(discount.startDate),
  endDate: formatDateInput(discount.endDate),
  active: discount.active ?? true,
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('drivers');
  const [bookingState, setBookingState] = useState({
    items: [],
    loading: true,
    error: '',
    updatingId: null,
    deletingId: null,
  });
  const [briefState, setBriefState] = useState({
    items: [],
    loading: true,
    error: '',
    updatingId: null,
    deletingId: null,
  });
  const [offerState, setOfferState] = useState({
    items: [],
    loading: true,
    error: '',
    updatingId: null,
    deletingId: null,
  });
  const [conversationState, setConversationState] = useState({
    items: [],
    loading: true,
    error: '',
    updatingId: null,
    deletingId: null,
  });
  const [discountState, setDiscountState] = useState({
    items: [],
    loading: true,
    error: '',
    saving: false,
    updatingId: null,
    deletingId: null,
  });
  const [driverState, setDriverState] = useState({ items: [], loading: true, error: '', updatingId: null });
  const [vehicleState, setVehicleState] = useState({ items: [], loading: true, error: '', updatingId: null });
  const [reviewFilter, setReviewFilter] = useState('pending');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [reviewState, setReviewState] = useState({
    items: [],
    meta: { total: 0, status: 'pending' },
    loading: true,
    error: '',
    updatingId: null,
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const handleLogout = useCallback(() => {
    clearStoredToken();
    toast.success('You have been logged out.');
    navigate('/login');
  }, [navigate]);

  const loadBookings = useCallback(async () => {
    setBookingState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminBookings();
      setBookingState((prev) => ({
        ...prev,
        items: response.bookings || [],
        loading: false,
        error: '',
      }));
    } catch (error) {
      setBookingState((prev) => ({
        ...prev,
        items: [],
        loading: false,
        error: error.message || 'Unable to load bookings.',
      }));
    }
  }, []);

  const loadBriefs = useCallback(async () => {
    setBriefState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminBriefs();
      setBriefState((prev) => ({
        ...prev,
        items: response.briefs || [],
        loading: false,
        error: '',
      }));
    } catch (error) {
      setBriefState((prev) => ({
        ...prev,
        items: [],
        loading: false,
        error: error.message || 'Unable to load tour briefs.',
      }));
    }
  }, []);

  const loadOffers = useCallback(async () => {
    setOfferState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminOffers();
      setOfferState((prev) => ({
        ...prev,
        items: response.offers || [],
        loading: false,
        error: '',
      }));
    } catch (error) {
      setOfferState((prev) => ({
        ...prev,
        items: [],
        loading: false,
        error: error.message || 'Unable to load offers.',
      }));
    }
  }, []);

  const loadAdminConversations = useCallback(async () => {
    setConversationState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminConversations();
      setConversationState((prev) => ({
        ...prev,
        items: response.conversations || [],
        loading: false,
        error: '',
      }));
    } catch (error) {
      setConversationState((prev) => ({
        ...prev,
        items: [],
        loading: false,
        error: error.message || 'Unable to load conversations.',
      }));
    }
  }, []);

  const loadDiscounts = useCallback(async () => {
    setDiscountState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminDiscounts();
      setDiscountState((prev) => ({
        ...prev,
        items: response.discounts || [],
        loading: false,
        error: '',
      }));
    } catch (error) {
      setDiscountState((prev) => ({
        ...prev,
        items: [],
        loading: false,
        error: error.message || 'Unable to load discounts.',
      }));
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    try {
      setDriverState((prev) => ({ ...prev, loading: true, error: '' }));
      const response = await fetchDriverApplications();
      setDriverState({ items: response.drivers || [], loading: false, error: '', updatingId: null });
    } catch (err) {
      setDriverState({ items: [], loading: false, error: err.message || 'Unable to load driver applications', updatingId: null });
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    try {
      setVehicleState((prev) => ({ ...prev, loading: true, error: '' }));
      const response = await fetchVehicleSubmissions();
      setVehicleState({ items: response.vehicles || [], loading: false, error: '', updatingId: null });
    } catch (err) {
      setVehicleState({ items: [], loading: false, error: err.message || 'Unable to load vehicle submissions', updatingId: null });
    }
  }, []);

  const loadReviews = useCallback(async (status = 'pending') => {
    try {
      setReviewState((prev) => ({ ...prev, loading: true, error: '' }));
      const response = await fetchReviews(status !== 'all' ? { status } : {});
      setReviewState({
        items: response.reviews || [],
        meta: response.meta || { total: 0, status },
        loading: false,
        error: '',
        updatingId: null,
      });
      if (status === 'pending') {
        setPendingReviewCount(response.meta?.total ?? (response.reviews?.length ?? 0));
      }
      return response;
    } catch (err) {
      setReviewState({
        items: [],
        meta: { total: 0, status },
        loading: false,
        error: err.message || 'Unable to load reviews',
        updatingId: null,
      });
      throw err;
    }
  }, []);

  useEffect(() => {
    loadDrivers();
    loadVehicles();
  }, [loadDrivers, loadVehicles]);

  useEffect(() => {
    if (activeSection === 'bookings') {
      loadBookings();
    }
  }, [activeSection, loadBookings]);

  useEffect(() => {
    if (activeSection === 'briefs') {
      loadBriefs();
    }
  }, [activeSection, loadBriefs]);

  useEffect(() => {
    if (activeSection === 'offers') {
      loadOffers();
    }
  }, [activeSection, loadOffers]);

  useEffect(() => {
    if (activeSection === 'conversations') {
      loadAdminConversations();
    }
  }, [activeSection, loadAdminConversations]);

  useEffect(() => {
    if (activeSection === 'discounts') {
      loadDiscounts();
    }
  }, [activeSection, loadDiscounts]);

  const handleBookingUpdate = useCallback(
    async (bookingId, payload) => {
      setBookingState((prev) => ({ ...prev, updatingId: bookingId }));
      try {
        const { booking } = await updateAdminBooking(bookingId, payload);
        setBookingState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === booking.id ? booking : item)),
          updatingId: null,
        }));
        toast.success('Booking updated.');
      } catch (error) {
        setBookingState((prev) => ({ ...prev, updatingId: null }));
        toast.error(error?.message || 'Unable to update booking.');
        throw error;
      }
    },
    []
  );

  const handleBookingDelete = useCallback(
    async (bookingId) => {
      setBookingState((prev) => ({ ...prev, deletingId: bookingId }));
      try {
        await deleteAdminBooking(bookingId);
        setBookingState((prev) => ({
          ...prev,
          items: prev.items.filter((item) => item.id !== bookingId),
          deletingId: null,
        }));
        toast.success('Booking deleted.');
      } catch (error) {
        setBookingState((prev) => ({ ...prev, deletingId: null }));
        toast.error(error?.message || 'Unable to delete booking.');
        throw error;
      }
    },
    []
  );

  const handleBriefUpdate = useCallback(
    async (briefId, payload) => {
      setBriefState((prev) => ({ ...prev, updatingId: briefId }));
      try {
        const { brief } = await updateAdminBrief(briefId, payload);
        setBriefState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === brief.id ? brief : item)),
          updatingId: null,
        }));
        toast.success('Brief updated.');
      } catch (error) {
        setBriefState((prev) => ({ ...prev, updatingId: null }));
        toast.error(error?.message || 'Unable to update brief.');
        throw error;
      }
    },
    []
  );

  const handleBriefDelete = useCallback(
    async (briefId) => {
      setBriefState((prev) => ({ ...prev, deletingId: briefId }));
      try {
        await deleteAdminBrief(briefId);
        setBriefState((prev) => ({
          ...prev,
          items: prev.items.filter((item) => item.id !== briefId),
          deletingId: null,
        }));
        toast.success('Brief deleted.');
      } catch (error) {
        setBriefState((prev) => ({ ...prev, deletingId: null }));
        toast.error(error?.message || 'Unable to delete brief.');
        throw error;
      }
    },
    []
  );

  const handleOfferStatusChange = useCallback(
    async (offerId, status) => {
      setOfferState((prev) => ({ ...prev, updatingId: offerId }));
      try {
        const { offer } = await updateAdminOfferStatus(offerId, status);
        setOfferState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === offer.id ? offer : item)),
          updatingId: null,
        }));
        toast.success('Offer updated.');
      } catch (error) {
        setOfferState((prev) => ({ ...prev, updatingId: null }));
        toast.error(error?.message || 'Unable to update offer.');
        throw error;
      }
    },
    []
  );

  const handleOfferDelete = useCallback(
    async (offerId) => {
      setOfferState((prev) => ({ ...prev, deletingId: offerId }));
      try {
        await deleteAdminOffer(offerId);
        setOfferState((prev) => ({
          ...prev,
          items: prev.items.filter((item) => item.id !== offerId),
          deletingId: null,
        }));
        toast.success('Offer deleted.');
      } catch (error) {
        setOfferState((prev) => ({ ...prev, deletingId: null }));
        toast.error(error?.message || 'Unable to delete offer.');
        throw error;
      }
    },
    []
  );

  const handleConversationStatusChange = useCallback(
    async (conversationId, status) => {
      setConversationState((prev) => ({ ...prev, updatingId: conversationId }));
      try {
        const { conversation } = await updateAdminConversationStatus(conversationId, status);
        setConversationState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === conversation.id ? conversation : item)),
          updatingId: null,
        }));
        toast.success('Conversation updated.');
      } catch (error) {
        setConversationState((prev) => ({ ...prev, updatingId: null }));
        toast.error(error?.message || 'Unable to update conversation.');
        throw error;
      }
    },
    []
  );

  const handleConversationDelete = useCallback(
    async (conversationId) => {
      setConversationState((prev) => ({ ...prev, deletingId: conversationId }));
      try {
        await deleteAdminConversation(conversationId);
        setConversationState((prev) => ({
          ...prev,
          items: prev.items.filter((item) => item.id !== conversationId),
          deletingId: null,
        }));
        toast.success('Conversation deleted.');
      } catch (error) {
        setConversationState((prev) => ({ ...prev, deletingId: null }));
        toast.error(error?.message || 'Unable to delete conversation.');
        throw error;
      }
    },
    []
  );

  const handleDiscountCreate = useCallback(
    async (payload) => {
      setDiscountState((prev) => ({ ...prev, saving: true }));
      try {
        const response = await createAdminDiscount(payload);
        await loadDiscounts();
        setDiscountState((prev) => ({ ...prev, saving: false }));
        const impact =
          typeof response?.recalculatedBookings === 'number' && response.recalculatedBookings > 0
            ? ` Updated ${response.recalculatedBookings} booking${
                response.recalculatedBookings === 1 ? '' : 's'
              }.`
            : '';
        toast.success(`Discount created.${impact}`);
        return response.discount;
      } catch (error) {
        setDiscountState((prev) => ({ ...prev, saving: false }));
        toast.error(error?.message || 'Unable to create discount.');
        throw error;
      }
    },
    [loadDiscounts]
  );

  const handleDiscountUpdate = useCallback(
    async (discountId, payload) => {
      setDiscountState((prev) => ({ ...prev, updatingId: discountId }));
      try {
        const response = await updateAdminDiscount(discountId, payload);
        await loadDiscounts();
        setDiscountState((prev) => ({ ...prev, updatingId: null }));
        const impact =
          typeof response?.recalculatedBookings === 'number' && response.recalculatedBookings > 0
            ? ` Updated ${response.recalculatedBookings} booking${
                response.recalculatedBookings === 1 ? '' : 's'
              }.`
            : '';
        toast.success(`Discount updated.${impact}`);
        return response.discount;
      } catch (error) {
        setDiscountState((prev) => ({ ...prev, updatingId: null }));
        toast.error(error?.message || 'Unable to update discount.');
        throw error;
      }
    },
    [loadDiscounts]
  );

  const handleDiscountDelete = useCallback(
    async (discountId) => {
      setDiscountState((prev) => ({ ...prev, deletingId: discountId }));
      try {
        const response = await deleteAdminDiscount(discountId);
        await loadDiscounts();
        setDiscountState((prev) => ({ ...prev, deletingId: null }));
        const impact =
          typeof response?.recalculatedBookings === 'number' && response.recalculatedBookings > 0
            ? ` Updated ${response.recalculatedBookings} booking${
                response.recalculatedBookings === 1 ? '' : 's'
              }.`
            : '';
        toast.success(`Discount removed.${impact}`);
      } catch (error) {
        setDiscountState((prev) => ({ ...prev, deletingId: null }));
        toast.error(error?.message || 'Unable to delete discount.');
        throw error;
      }
    },
    [loadDiscounts]
  );

  const loadCurrentUserProfile = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setProfileLoading(true);
        setProfileError('');
      }
      try {
        const response = await fetchProfileCurrentUser();
        setCurrentUser(response?.user || null);
        setProfileError('');
      } catch (error) {
        setCurrentUser(null);
        setProfileError(error?.message || 'Unable to load profile.');
      } finally {
        setProfileLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCurrentUserProfile({ silent: false });
  }, [loadCurrentUserProfile]);

  useEffect(() => {
    loadReviews(reviewFilter);
  }, [loadReviews, reviewFilter]);

  const pendingDriverCount = useMemo(
    () => driverState.items.filter((app) => app.driverStatus === DRIVER_STATUS.PENDING).length,
    [driverState.items]
  );

  const pendingVehicleCount = useMemo(
    () => vehicleState.items.filter((vehicle) => vehicle.status === VEHICLE_STATUS.PENDING).length,
    [vehicleState.items]
  );

  const handleDriverStatusChange = async (applicationId, nextStatus) => {
    setDriverState((prev) => ({ ...prev, updatingId: applicationId }));
    try {
      const { driver } = await updateDriverStatusRequest(applicationId, nextStatus);
      setDriverState((prev) => ({
        ...prev,
        items: prev.items.map((application) => (application.id === driver.id ? driver : application)),
        updatingId: null,
      }));
      toast.success(
        nextStatus === DRIVER_STATUS.APPROVED
          ? 'Driver approved successfully.'
          : 'Driver application updated.'
      );
    } catch (err) {
      toast.error(err.message || 'Unable to update driver status.');
      setDriverState((prev) => ({ ...prev, updatingId: null }));
    }
  };

  const handleDriverMessageSend = useCallback(async (driverId, payload) => {
    await sendDriverEmailRequest(driverId, payload);
  }, []);

  const handleVehicleStatusChange = async (vehicleId, nextStatus) => {
    setVehicleState((prev) => ({ ...prev, updatingId: vehicleId }));
    try {
      const payload = { status: nextStatus };
      const { vehicle } = await updateVehicleStatusRequest(vehicleId, payload);
      setVehicleState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === vehicle.id ? vehicle : item)),
        updatingId: null,
      }));
      toast.success(
        nextStatus === VEHICLE_STATUS.APPROVED
          ? 'Vehicle approved successfully.'
          : 'Vehicle status updated.'
      );
    } catch (err) {
      toast.error(err.message || 'Unable to update vehicle status.');
      setVehicleState((prev) => ({ ...prev, updatingId: null }));
    }
  };

  const handleReviewFilterChange = (status) => {
    setReviewFilter(status);
  };

  const handleReviewStatusChange = async (reviewId, nextStatus, adminNote) => {
    setReviewState((prev) => ({ ...prev, updatingId: reviewId }));
    try {
      await updateReviewStatusRequest(reviewId, { status: nextStatus, adminNote });
      toast.success(
        nextStatus === 'approved' ? 'Review approved and published.' : 'Review declined.'
      );
      await loadReviews(reviewFilter);
      if (reviewFilter !== 'pending') {
        try {
          const pendingSnapshot = await fetchReviews({ status: 'pending' });
          setPendingReviewCount(
            pendingSnapshot.meta?.total ?? (pendingSnapshot.reviews?.length ?? 0)
          );
        } catch (refreshError) {
          console.error('Unable to refresh pending review count:', refreshError);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Unable to update review.');
      setReviewState((prev) => ({ ...prev, updatingId: null }));
    }
  };

  const handleAdminProfileSave = useCallback(
    async (payload) => {
      setProfileSaving(true);
      try {
        await updateProfileRequest(payload);
        toast.success('Profile updated.');
        await loadCurrentUserProfile({ silent: true });
      } catch (error) {
        toast.error(error?.message || 'Unable to update profile.');
        throw error;
      } finally {
        setProfileSaving(false);
      }
    },
    [loadCurrentUserProfile]
  );

  const handleAdminPasswordChange = useCallback(async (payload) => {
    setPasswordSaving(true);
    try {
      await updatePasswordRequest(payload);
      toast.success('Password updated.');
    } catch (error) {
      toast.error(error?.message || 'Unable to update password.');
      throw error;
    } finally {
      setPasswordSaving(false);
    }
  }, []);

  const handleVehicleDetailsUpdate = async (vehicleId, payload) => {
    setVehicleState((prev) => ({ ...prev, updatingId: vehicleId }));
    try {
      const { vehicle } = await updateVehicleDetailsRequest(vehicleId, payload);
      setVehicleState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === vehicle.id ? vehicle : item)),
        updatingId: null,
      }));
      toast.success('Vehicle details updated.');
    } catch (err) {
      toast.error(err.message || 'Unable to update vehicle details.');
      setVehicleState((prev) => ({ ...prev, updatingId: null }));
      throw err;
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <h1 className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Admin Console
          </h1>
          <nav className="mt-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              const badgeCount =
                item.id === 'drivers'
                  ? pendingDriverCount
                  : item.id === 'vehicles'
                  ? pendingVehicleCount
                  : item.id === 'reviews'
                  ? pendingReviewCount
                  : 0;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span className="font-medium">{item.label}</span>
                  </span>
                  {badgeCount > 0 && (
                    <span
                      className={`inline-flex min-w-[1.75rem] justify-center rounded-full px-2 text-xs ${
                        isActive ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {activeSection === 'bookings'
                    ? 'Bookings'
                    : activeSection === 'discounts'
                    ? 'Commission Discounts'
                    : activeSection === 'briefs'
                    ? 'Tour Briefs'
                    : activeSection === 'offers'
                    ? 'Driver Offers'
                    : activeSection === 'conversations'
                    ? 'Conversations'
                    : activeSection === 'drivers'
                    ? 'Driver Applications'
                    : activeSection === 'vehicles'
                    ? 'Vehicle Submissions'
                    : activeSection === 'reviews'
                    ? 'Traveller Feedback'
                    : activeSection === 'profile'
                    ? 'Admin Profile'
                    : 'Coming Soon'}
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {activeSection === 'bookings'
                    ? 'Manage every booking from one place'
                    : activeSection === 'discounts'
                    ? 'Launch platform-wide commission discounts'
                    : activeSection === 'briefs'
                    ? 'Keep traveller briefs organised and moderated'
                    : activeSection === 'offers'
                    ? 'Audit driver offers and pricing'
                    : activeSection === 'conversations'
                    ? 'Monitor ongoing traveller-driver conversations'
                    : activeSection === 'drivers'
                    ? 'Review and onboard new drivers'
                    : activeSection === 'vehicles'
                    ? 'Approve vehicles before they go live'
                    : activeSection === 'reviews'
                    ? 'Moderate traveller reviews before publishing'
                    : activeSection === 'profile'
                    ? 'Manage your admin account'
                    : 'This module will be available soon'}
                </h2>
                {activeSection === 'bookings' && (
                  <p className="text-sm text-slate-600">
                    Adjust itineraries, update statuses, or remove bookings that no longer meet policy.
                  </p>
                )}
                {activeSection === 'discounts' && (
                  <p className="text-sm text-slate-600">
                    Schedule and monitor commission promotions that automatically reduce driver fees.
                  </p>
                )}
                {activeSection === 'briefs' && (
                  <p className="text-sm text-slate-600">
                    Close spam briefs quickly and help travellers keep their trip plans accurate.
                  </p>
                )}
                {activeSection === 'offers' && (
                  <p className="text-sm text-slate-600">
                    Review every offer drivers share with travellers to keep pricing fair and compliant.
                  </p>
                )}
                {activeSection === 'conversations' && (
                  <p className="text-sm text-slate-600">
                    Step into any chat, close inactive threads, and resolve disputes in seconds.
                  </p>
                )}
                {activeSection === 'drivers' && (
                  <p className="text-sm text-slate-600">
                    Approve or reject driver submissions. Approved drivers gain access to their dashboards automatically.
                  </p>
                )}
                {activeSection === 'vehicles' && (
                  <p className="text-sm text-slate-600">
                    Ensure each vehicle meets platform standards before travellers can book it.
                  </p>
                )}
                {activeSection === 'reviews' && (
                  <p className="text-sm text-slate-600">
                    Approve traveller stories and keep your marketplace trustworthy.
                  </p>
                )}
                {activeSection === 'profile' && (
                  <p className="text-sm text-slate-600">
                    Update your contact information and manage admin credentials.
                  </p>
                )}
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

          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            {activeSection === 'bookings' ? (
              <BookingsPanel
                state={bookingState}
                onReload={loadBookings}
                onUpdate={handleBookingUpdate}
                onDelete={handleBookingDelete}
              />
            ) : activeSection === 'discounts' ? (
              <DiscountsPanel
                state={discountState}
                onReload={loadDiscounts}
                onCreate={handleDiscountCreate}
                onUpdate={handleDiscountUpdate}
                onDelete={handleDiscountDelete}
              />
            ) : activeSection === 'briefs' ? (
              <BriefsPanel
                state={briefState}
                onReload={loadBriefs}
                onUpdate={handleBriefUpdate}
                onDelete={handleBriefDelete}
              />
            ) : activeSection === 'offers' ? (
              <OffersPanel
                state={offerState}
                onReload={loadOffers}
                onStatusChange={handleOfferStatusChange}
                onDelete={handleOfferDelete}
              />
            ) : activeSection === 'conversations' ? (
              <ConversationsPanel
                state={conversationState}
                onReload={loadAdminConversations}
                onStatusChange={handleConversationStatusChange}
                onDelete={handleConversationDelete}
              />
            ) : activeSection === 'drivers' ? (
              <DriversPanel
                state={driverState}
                onRetry={loadDrivers}
                onStatusChange={handleDriverStatusChange}
                onSendMessage={handleDriverMessageSend}
              />
            ) : activeSection === 'vehicles' ? (
              <VehiclesPanel
                state={vehicleState}
                onRetry={loadVehicles}
                onStatusChange={handleVehicleStatusChange}
                onUpdate={handleVehicleDetailsUpdate}
              />
            ) : activeSection === 'reviews' ? (
              <ReviewsPanel
                state={reviewState}
                filter={reviewFilter}
                onFilterChange={handleReviewFilterChange}
                onRetry={() => loadReviews(reviewFilter)}
                onStatusChange={handleReviewStatusChange}
              />
            ) : activeSection === 'profile' ? (
              <AdminProfilePanel
                profile={currentUser}
                loading={profileLoading}
                error={profileError}
                onRetry={() => loadCurrentUserProfile({ silent: false })}
                onSave={handleAdminProfileSave}
                onPasswordChange={handleAdminPasswordChange}
                savingProfile={profileSaving}
                savingPassword={passwordSaving}
              />
            ) : (
              <PlaceholderPanel />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const BookingsPanel = ({ state, onReload, onUpdate, onDelete }) => {
  const { items, loading, error, updatingId, deletingId } = state;
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(() => buildAdminBookingForm());
  const [formError, setFormError] = useState('');

  const startEditing = (booking) => {
    if (editingId === booking.id) {
      setEditingId(null);
      setFormState(buildAdminBookingForm());
      setFormError('');
      return;
    }
    setEditingId(booking.id);
    setFormState(buildAdminBookingForm(booking));
    setFormError('');
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingId) return;
    if (!formState.startDate || !formState.endDate) {
      setFormError('Start and end dates are required.');
      return;
    }
    const payload = {
      status: formState.status,
      startDate: formState.startDate,
      endDate: formState.endDate,
      pricePerDay: formState.pricePerDay ? Number(formState.pricePerDay) : undefined,
      totalPrice: formState.totalPrice ? Number(formState.totalPrice) : undefined,
      paymentNote: formState.paymentNote,
      startPoint: formState.startPoint,
      endPoint: formState.endPoint,
      specialRequests: formState.specialRequests,
      flightNumber: formState.flightNumber,
      arrivalTime: formState.arrivalTime,
      departureTime: formState.departureTime,
    };

    try {
      await onUpdate?.(editingId, payload);
      setEditingId(null);
      setFormState(buildAdminBookingForm());
      setFormError('');
    } catch (submitError) {
      setFormError(submitError?.message || 'Unable to update booking.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading bookings...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Bookings</h3>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
          <CalendarDays className="mb-3 h-10 w-10 text-slate-300" />
          <p>No bookings found.</p>
        </div>
      ) : (
        items.map((booking) => {
          const isEditing = editingId === booking.id;
          const isUpdating = updatingId === booking.id;
          const isDeleting = deletingId === booking.id;
          const travelerName = booking.traveler?.fullName || 'Traveller';
          const driverName = booking.driver?.name || 'Unassigned driver';
          const vehicleLabel = booking.vehicle?.model || 'Vehicle unavailable';

          return (
            <article key={booking.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {travelerName}
                  <span className="text-xs font-medium text-slate-500">→ {driverName}</span>
                  <span
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600"
                  >
                    {booking.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{vehicleLabel}</p>
                <p className="text-xs text-slate-500">
                  {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
                </p>
                <p className="text-xs text-slate-500">
                  Total {formatCurrency(booking.totalPrice || 0)} | {booking.totalDays} day
                  {booking.totalDays === 1 ? '' : 's'}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Conversation: {booking.conversationId || '—'}</p>
                <p>Offer: {booking.offerId || '—'}</p>
              </div>
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formState.status}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      {BOOKING_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
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
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Price / day (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="pricePerDay"
                      value={formState.pricePerDay}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total price (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      name="totalPrice"
                      value={formState.totalPrice}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Flight #
                    </label>
                    <input
                      type="text"
                      name="flightNumber"
                      value={formState.flightNumber}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Start point
                    </label>
                    <input
                      type="text"
                      name="startPoint"
                      value={formState.startPoint}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      End point
                    </label>
                    <input
                      type="text"
                      name="endPoint"
                      value={formState.endPoint}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Arrival time
                    </label>
                    <input
                      type="text"
                      name="arrivalTime"
                      value={formState.arrivalTime}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Departure time
                    </label>
                    <input
                      type="text"
                      name="departureTime"
                      value={formState.departureTime}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Payment note
                    </label>
                    <input
                      type="text"
                      name="paymentNote"
                      value={formState.paymentNote}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Special requests
                  </label>
                  <textarea
                    name="specialRequests"
                    rows={3}
                    value={formState.specialRequests}
                    onChange={handleFieldChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                {formError ? <p className="text-xs text-rose-600">{formError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-700/70"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(booking)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Close editor
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(booking)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <Pencil className="h-4 w-4" />
                  Edit booking
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    if (window.confirm('Delete this booking?')) {
                      onDelete?.(booking.id);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
            </article>
          );
        })
      )}
    </div>
  );
};

const discountStatusStyles = {
  active: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-emerald-50 text-emerald-700',
  expired: 'bg-slate-200 text-slate-600',
  disabled: 'bg-slate-200 text-slate-600',
};

const DiscountsPanel = ({ state, onReload, onCreate, onUpdate, onDelete }) => {
  const { items, loading, error, saving, updatingId, deletingId } = state;
  const [formState, setFormState] = useState(() => buildAdminDiscountForm());
  const [editingId, setEditingId] = useState('');
  const [formError, setFormError] = useState('');

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormState(buildAdminDiscountForm());
    setEditingId('');
    setFormError('');
  };

  const handleEdit = (discount) => {
    setEditingId(discount.id);
    setFormState(buildAdminDiscountForm(discount));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      setFormError('Provide a discount name.');
      return;
    }
    if (!formState.startDate || !formState.endDate) {
      setFormError('Select a start and end date.');
      return;
    }
    const percentValue = Number(formState.discountPercent);
    if (!Number.isFinite(percentValue) || percentValue < 0 || percentValue > 8) {
      setFormError('Discount must be between 0% and 8%.');
      return;
    }

    const payload = {
      name: formState.name.trim(),
      description: formState.description?.trim() || undefined,
      discountPercent: percentValue,
      startDate: formState.startDate,
      endDate: formState.endDate,
      active: formState.active,
    };

    try {
      if (editingId) {
        await onUpdate?.(editingId, payload);
      } else {
        await onCreate?.(payload);
      }
      resetForm();
    } catch (submitError) {
      setFormError(submitError?.message || 'Unable to save discount.');
    }
  };

  const handleToggleActive = async (discount) => {
    try {
      await onUpdate?.(discount.id, { active: !discount.active });
    } catch (toggleError) {
      toast.error(toggleError?.message || 'Unable to update discount status.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading discounts...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">
          Commission discounts
          {items.length > 0 ? (
            <span className="ml-2 text-sm font-normal text-slate-400">({items.length})</span>
          ) : null}
        </h3>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Refresh
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {editingId ? 'Edit discount' : 'Create new discount'}
            </p>
            <p className="text-xs text-slate-500">
              Automatically reduce the platform commission for bookings within a window.
            </p>
          </div>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-semibold text-slate-500 transition hover:text-slate-700"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Name
            </label>
            <input
              type="text"
              name="name"
              value={formState.name}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Discount (%)
            </label>
            <input
              type="number"
              name="discountPercent"
              min="0"
              max="8"
              step="0.1"
              value={formState.discountPercent}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Start date
            </label>
            <input
              type="date"
              name="startDate"
              value={formState.startDate}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Description
          </label>
          <textarea
            name="description"
            rows={2}
            value={formState.description}
            onChange={handleFieldChange}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            placeholder="Optional note shown to admins"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            name="active"
            checked={formState.active}
            onChange={handleFieldChange}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          Active
        </label>
        {formError ? <p className="text-xs text-rose-600">{formError}</p> : null}
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-700/70"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : editingId ? (
            'Update discount'
          ) : (
            'Create discount'
          )}
        </button>
      </form>

      {items.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center text-center text-sm text-slate-500">
          <Percent className="mb-3 h-10 w-10 text-slate-300" />
          <p>No discounts configured yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((discount) => {
            const percentLabel = formatPercentValue(
              typeof discount.discountPercent === 'number'
                ? discount.discountPercent
                : (discount.discountRate ?? 0) * 100
            );
            const statusClass =
              discountStatusStyles[discount.status] || 'bg-slate-200 text-slate-600';
            const isUpdating = updatingId === discount.id;
            const isDeleting = deletingId === discount.id;
            return (
              <article key={discount.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                      {discount.name}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusClass}`}
                      >
                        {discount.status || (discount.active ? 'active' : 'disabled')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {formatDate(discount.startDate)} – {formatDate(discount.endDate)}
                    </p>
                    <p className="text-xs font-medium text-emerald-600">
                      {percentLabel} off base commission
                    </p>
                    {discount.description ? (
                      <p className="mt-2 text-sm text-slate-600">{discount.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(discount)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => handleToggleActive(discount)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        discount.active
                          ? 'border-amber-200 text-amber-600 hover:border-amber-300 hover:text-amber-700'
                          : 'border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:text-emerald-700'
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {isUpdating
                        ? 'Updating...'
                        : discount.active
                        ? 'Disable'
                        : 'Enable'}
                    </button>
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={async () => {
                        if (window.confirm('Delete this discount?')) {
                          try {
                            await onDelete?.(discount.id);
                          } catch (_error) {
                            // Error already surfaced via toast in handler
                          }
                        }
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const BriefsPanel = ({ state, onReload, onUpdate, onDelete }) => {
  const { items, loading, error, updatingId, deletingId } = state;
  const [editingId, setEditingId] = useState(null);
  const [formState, setFormState] = useState(() => buildAdminBriefForm());
  const [formError, setFormError] = useState('');

  const startEditing = (brief) => {
    if (editingId === brief.id) {
      setEditingId(null);
      setFormState(buildAdminBriefForm());
      setFormError('');
      return;
    }
    setEditingId(brief.id);
    setFormState(buildAdminBriefForm(brief));
    setFormError('');
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!editingId) return;
    if (!formState.message.trim()) {
      setFormError('Message is required.');
      return;
    }
    const payload = {
      status: formState.status,
      startDate: formState.startDate,
      endDate: formState.endDate,
      startLocation: formState.startLocation,
      endLocation: formState.endLocation,
      message: formState.message,
      country: formState.country,
    };
    try {
      await onUpdate?.(editingId, payload);
      setEditingId(null);
      setFormState(buildAdminBriefForm());
      setFormError('');
    } catch (submitError) {
      setFormError(submitError?.message || 'Unable to update brief.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading briefs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Tour briefs</h3>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
          <FileText className="mb-3 h-10 w-10 text-slate-300" />
          <p>No briefs posted yet.</p>
        </div>
      ) : (
        items.map((brief) => {
          const isEditing = editingId === brief.id;
          const isUpdating = updatingId === brief.id;
          const isDeleting = deletingId === brief.id;
          const travelerName = brief.traveler?.name || 'Traveller';

          return (
            <article key={brief.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  {travelerName}
                  <span className="text-xs font-medium text-slate-500">{brief.country}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      brief.status === 'open'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {brief.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {brief.startLocation} → {brief.endLocation}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(brief.startDate)} – {formatDate(brief.endDate)}
                </p>
                <p className="text-xs text-slate-500">{brief.offersCount} offer(s)</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Traveler email: {brief.traveler?.email || '—'}</p>
                <p>Responses: {brief.responses?.length || 0}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-slate-600 whitespace-pre-line">{brief.message}</p>

            {isEditing ? (
              <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formState.status}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    >
                      {BRIEF_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Start date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      value={formState.startDate}
                      onChange={handleFieldChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
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
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Traveller message
                  </label>
                  <textarea
                    name="message"
                    rows={3}
                    value={formState.message}
                    onChange={handleFieldChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formState.country}
                    onChange={handleFieldChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                </div>
                {formError ? <p className="text-xs text-rose-600">{formError}</p> : null}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-700/70"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEditing(brief)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                  >
                    Close editor
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(brief)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <Pencil className="h-4 w-4" />
                  Edit brief
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    if (window.confirm('Delete this brief?')) {
                      onDelete?.(brief.id);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            )}
          </article>
        );
        })
      )}
    </div>
  );
};

const OffersPanel = ({ state, onReload, onStatusChange, onDelete }) => {
  const { items, loading, error, updatingId, deletingId } = state;

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading offers...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Offers</h3>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
          <Send className="mb-3 h-10 w-10 text-slate-300" />
          <p>No offers have been sent yet.</p>
        </div>
      ) : (
        items.map((offer) => {
          const isUpdating = updatingId === offer.id;
          const isDeleting = deletingId === offer.id;
          return (
            <article key={offer.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {offer.driver?.name || 'Driver'}
                    <span className="text-xs font-medium text-slate-500">
                      Vehicle: {offer.vehicle?.model || 'Pending'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      {offer.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Traveller: {offer.traveler?.name || 'Unknown'} • Conversation {offer.conversationId || '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(offer.startDate)} – {formatDate(offer.endDate)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Total {formatCurrency(offer.totalPrice || 0)} ({offer.totalKms || 0} km)
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Created {formatDate(offer.createdAt)}</p>
                </div>
              </div>
              {offer.body ? (
                <p className="mt-3 text-sm text-slate-600 whitespace-pre-line">{offer.body}</p>
              ) : null}
              {offer.warning ? (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {offer.warning}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <select
                  value={offer.status}
                  onChange={(event) => onStatusChange?.(offer.id, event.target.value)}
                  disabled={isUpdating}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 focus:border-slate-900 focus:outline-none"
                >
                  {OFFER_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    if (window.confirm('Delete this offer?')) {
                      onDelete?.(offer.id);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
};

const ConversationsPanel = ({ state, onReload, onStatusChange, onDelete }) => {
  const { items, loading, error, updatingId, deletingId } = state;
  const formatDateTime = (value) => {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading conversations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Conversations</h3>
        <button
          type="button"
          onClick={onReload}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
        >
          Refresh
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
          <MessageCircle className="mb-3 h-10 w-10 text-slate-300" />
          <p>No conversations in progress.</p>
        </div>
      ) : (
        items.map((conversation) => {
          const isUpdating = updatingId === conversation.id;
          const isDeleting = deletingId === conversation.id;
          const messages = Array.isArray(conversation.messages) ? conversation.messages : [];

          return (
            <article key={conversation.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {conversation.traveler?.name || 'Traveller'}
                    <span className="text-xs font-medium text-slate-500">
                      ↔ {conversation.driver?.name || 'Driver'}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        conversation.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {conversation.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Vehicle: {conversation.vehicle?.model || '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    Last message {formatDateTime(conversation.lastMessageAt)}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <p>Unread (traveller): {conversation.travelerUnreadCount}</p>
                  <p>Unread (driver): {conversation.driverUnreadCount}</p>
                </div>
              </div>
              {messages.length > 0 ? (
                <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <span>Conversation history</span>
                    <span className="text-slate-400">
                      {messages.length} message{messages.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {messages.map((message) => {
                      const isDriver = message.senderRole === 'driver';
                      const senderLabel =
                        message.sender?.name ||
                        (message.senderRole === 'guest'
                          ? 'Traveller'
                          : message.senderRole === 'admin'
                          ? 'Admin'
                          : 'Driver');
                      const timestamp = formatDateTime(message.createdAt);
                      const offerLabel =
                        message.offer && typeof message.offer.totalPrice === 'number'
                          ? `Offer • ${formatCurrency(message.offer.totalPrice)}`
                          : message.offer
                          ? 'Offer shared'
                          : '';
                      return (
                        <div
                          key={message.id}
                          className={`rounded-lg border px-3 py-2 text-sm leading-relaxed ${
                            isDriver ? 'border-emerald-100 bg-white' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
                            <span className={isDriver ? 'text-emerald-600' : 'text-slate-600'}>
                              {senderLabel}
                            </span>
                            <span className="text-slate-400">{timestamp}</span>
                          </div>
                          <p className="mt-1 whitespace-pre-line text-sm text-slate-700">
                            {message.body}
                          </p>
                          {offerLabel ? (
                            <p className="mt-1 text-xs font-medium text-amber-600">{offerLabel}</p>
                          ) : null}
                          {message.warning ? (
                            <p className="mt-1 text-[11px] text-amber-600">{message.warning}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : conversation.lastMessage ? (
                <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {conversation.lastMessage.body}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <select
                  value={conversation.status}
                  onChange={(event) => onStatusChange?.(conversation.id, event.target.value)}
                  disabled={isUpdating}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 focus:border-slate-900 focus:outline-none"
                >
                  {CONVERSATION_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    if (window.confirm('Delete this conversation and its messages?')) {
                      onDelete?.(conversation.id);
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
};

const DriversPanel = ({ state, onRetry, onStatusChange, onSendMessage }) => {
  const { items, loading, error, updatingId } = state;
  const [messageForm, setMessageForm] = useState({
    driverId: null,
    subject: '',
    message: '',
    sending: false,
    error: '',
  });

  const toggleMessageForm = (driverId) => {
    setMessageForm((prev) => {
      const shouldClose = !driverId || prev.driverId === driverId;
      if (shouldClose) {
        return { driverId: null, subject: '', message: '', sending: false, error: '' };
      }
      return { driverId, subject: '', message: '', sending: false, error: '' };
    });
  };

  const handleMessageFieldChange = (event) => {
    const { name, value } = event.target;
    setMessageForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMessageSubmit = async (event) => {
    event.preventDefault();
    if (!messageForm.driverId || !onSendMessage) {
      return;
    }

    const trimmedSubject = messageForm.subject.trim();
    const trimmedMessage = messageForm.message.trim();

    if (trimmedSubject.length < 3) {
      setMessageForm((prev) => ({ ...prev, error: 'Subject must be at least 3 characters.' }));
      return;
    }

    if (trimmedMessage.length < 10) {
      setMessageForm((prev) => ({ ...prev, error: 'Message must be at least 10 characters.' }));
      return;
    }

    setMessageForm((prev) => ({ ...prev, sending: true, error: '' }));
    try {
      await onSendMessage(messageForm.driverId, {
        subject: trimmedSubject,
        message: trimmedMessage,
      });
      toast.success('Email sent to driver.');
      setMessageForm({ driverId: null, subject: '', message: '', sending: false, error: '' });
    } catch (submitError) {
      setMessageForm((prev) => ({
        ...prev,
        sending: false,
        error: submitError?.message || 'Unable to send email.',
      }));
      toast.error(submitError?.message || 'Unable to send email.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading driver applications...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
        <CircleUserRound className="mb-3 h-10 w-10 text-slate-300" />
        <p>No driver applications have been submitted yet.</p>
      </div>
    );
  }

  const pendingCount = items.filter((application) => application.driverStatus === DRIVER_STATUS.PENDING).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Driver applications</h3>
        <span className="text-sm text-slate-500">
          {items.length} total • {pendingCount} pending review
        </span>
      </div>

      <div className="space-y-3">
        {items.map((application) => {
          const isUpdating = updatingId === application.id;
          const disableApprove =
            isUpdating || application.driverStatus === DRIVER_STATUS.APPROVED;
          const disableReject =
            isUpdating || application.driverStatus === DRIVER_STATUS.REJECTED;
          const isFormOpen = messageForm.driverId === application.id;
          const isSendingMessage = isFormOpen && messageForm.sending;

          return (
            <article
              key={application.id}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {application.name}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        driverStatusStyles[application.driverStatus] || driverStatusStyles[DRIVER_STATUS.PENDING]
                      }`}
                    >
                      {application.driverStatus || DRIVER_STATUS.PENDING}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Reference: {application.id}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Submitted on {formatDate(application.createdAt)}
                  </p>
                  {application.driverReviewedAt && (
                    <p className="mt-1 text-xs text-slate-400">
                      Last reviewed {formatDate(application.driverReviewedAt)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {application.email}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {application.address || 'Address not provided'}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-600">
                {application.description || 'No bio provided.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span>Contact: {application.contactNumber || 'Not shared'}</span>
                {application.tripAdvisor ? (
                  <a
                    href={application.tripAdvisor}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-600 hover:text-emerald-700"
                  >
                    View TripAdvisor profile
                  </a>
                ) : (
                  <span className="text-slate-400">TripAdvisor link not provided</span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={disableApprove}
                  onClick={() => {
                    if (!disableApprove) {
                      onStatusChange(application.id, DRIVER_STATUS.APPROVED);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition ${
                    disableApprove ? 'cursor-not-allowed opacity-60' : 'hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isUpdating ? 'Updating...' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={disableReject}
                  onClick={() => {
                    if (!disableReject) {
                      onStatusChange(application.id, DRIVER_STATUS.REJECTED);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition ${
                    disableReject ? 'cursor-not-allowed opacity-60' : 'hover:bg-rose-100'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  {isUpdating ? 'Updating...' : 'Reject'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleMessageForm(application.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition ${
                    isFormOpen ? 'bg-slate-200' : 'hover:bg-slate-100'
                  }`}
                  disabled={isSendingMessage}
                >
                  <Mail className="h-4 w-4" />
                  {isFormOpen ? (isSendingMessage ? 'Sending...' : 'Close email form') : 'Email driver'}
                </button>
              </div>

              {isFormOpen && (
                <form
                  onSubmit={handleMessageSubmit}
                  className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  {messageForm.error ? (
                    <p className="text-sm font-medium text-rose-600">{messageForm.error}</p>
                  ) : null}
                  <div>
                    <label
                      htmlFor={`subject-${application.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Subject
                    </label>
                    <input
                      id={`subject-${application.id}`}
                      name="subject"
                      type="text"
                      value={messageForm.subject}
                      onChange={handleMessageFieldChange}
                      disabled={isSendingMessage}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="e.g. New platform update"
                      maxLength={120}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor={`message-${application.id}`}
                      className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                    >
                      Message
                    </label>
                    <textarea
                      id={`message-${application.id}`}
                      name="message"
                      rows={4}
                      value={messageForm.message}
                      onChange={handleMessageFieldChange}
                      disabled={isSendingMessage}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="Share updates, reminders, or policy changes."
                      maxLength={2000}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={isSendingMessage}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSendingMessage ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send email
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isSendingMessage}
                      onClick={() => toggleMessageForm(application.id)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
};

const VehiclesPanel = ({ state, onRetry, onStatusChange, onUpdate }) => {
  const { items, loading, error, updatingId } = state;
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [formData, setFormData] = useState(() => buildAdminVehicleForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleFieldChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const startEditing = (vehicle) => {
    if (editingVehicleId === vehicle.id) {
      setEditingVehicleId(null);
      setFormData(buildAdminVehicleForm());
      setFormError('');
      return;
    }
    setEditingVehicleId(vehicle.id);
    setFormData(buildAdminVehicleForm(vehicle));
    setFormError('');
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingVehicleId) {
      return;
    }

    setFormError('');

    const sanitizedModel = formData.model.trim();
    if (!sanitizedModel) {
      setFormError('Vehicle model is required.');
      return;
    }

    const normalizedYear = Number(formData.year);
    const currentYear = new Date().getFullYear() + 1;
    if (Number.isNaN(normalizedYear) || normalizedYear < 1990 || normalizedYear > currentYear) {
      setFormError('Enter a valid year.');
      return;
    }

    const normalizedPrice = Number(formData.pricePerDay);
    if (Number.isNaN(normalizedPrice) || normalizedPrice <= 0) {
      setFormError('Price per day must be greater than 0.');
      return;
    }

    const normalizedSeats = formData.seats ? Number(formData.seats) : undefined;
    if (normalizedSeats !== undefined && (Number.isNaN(normalizedSeats) || normalizedSeats < 1)) {
      setFormError('Seats must be at least 1.');
      return;
    }

    const payload = {
      model: sanitizedModel,
      year: normalizedYear,
      pricePerDay: normalizedPrice,
      description: formData.description.trim(),
      englishSpeakingDriver: Boolean(formData.englishSpeakingDriver),
      meetAndGreetAtAirport: Boolean(formData.meetAndGreetAtAirport),
      fuelAndInsurance: Boolean(formData.fuelAndInsurance),
      driverMealsAndAccommodation: Boolean(formData.driverMealsAndAccommodation),
      parkingFeesAndTolls: Boolean(formData.parkingFeesAndTolls),
      allTaxes: Boolean(formData.allTaxes),
    };

    if (normalizedSeats !== undefined) {
      payload.seats = normalizedSeats;
    }

    setSaving(true);
    try {
      await onUpdate(editingVehicleId, payload);
      setEditingVehicleId(null);
      setFormData(buildAdminVehicleForm());
    } catch (error) {
      setFormError(error?.message || 'Unable to update vehicle details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading vehicle submissions...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          <RotateCcw className="h-4 w-4" />
          Try again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
        <Car className="mb-3 h-10 w-10 text-slate-300" />
        <p>No vehicle submissions yet.</p>
      </div>
    );
  }

  const pendingCount = items.filter((vehicle) => vehicle.status === VEHICLE_STATUS.PENDING).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Vehicle submissions</h3>
        <span className="text-sm text-slate-500">
          {items.length} total • {pendingCount} pending review
        </span>
      </div>

      <div className="space-y-3">
        {items.map((vehicle) => {
          const isUpdating = updatingId === vehicle.id;
          const isEditing = editingVehicleId === vehicle.id;
          const featureLabels = getVehicleFeatureLabels(vehicle);
          const disableApprove =
            isUpdating || isEditing || vehicle.status === VEHICLE_STATUS.APPROVED;
          const disableReject =
            isUpdating || isEditing || vehicle.status === VEHICLE_STATUS.REJECTED;

          return (
            <article
              key={vehicle.id}
              className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {vehicle.model}
                    <span className="text-xs font-medium text-slate-500">{vehicle.year}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        vehicleStatusStyles[vehicle.status] || vehicleStatusStyles[VEHICLE_STATUS.PENDING]
                      }`}
                    >
                      {vehicle.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Submitted {formatDate(vehicle.createdAt)}</p>
                  {vehicle.reviewedAt && (
                    <p className="mt-1 text-xs text-slate-400">Reviewed {formatDate(vehicle.reviewedAt)}</p>
                  )}
                  {isEditing ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      <Pencil className="h-3 w-3" /> Editing
                    </span>
                  ) : null}
                </div>
                {vehicle.driver ? (
                  <div className="flex flex-col items-end text-right text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">{vehicle.driver.name}</span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3.5 w-3.5" />
                      {vehicle.driver.email}
                    </span>
                    {vehicle.driver.contactNumber && (
                      <span>{vehicle.driver.contactNumber}</span>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <DollarSign className="h-3.5 w-3.5" />
                  {(vehicle.pricePerDay ?? 0).toLocaleString()} / day
                </span>
                {vehicle.seats ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {vehicle.seats} seats
                  </span>
                ) : null}
                {vehicle.driver?.address ? <span>{vehicle.driver.address}</span> : null}
              </div>

              {vehicle.description && (
                <p className="mt-3 text-sm text-slate-600">{vehicle.description}</p>
              )}

              {featureLabels.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {featureLabels.map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}

              {vehicle.status === VEHICLE_STATUS.REJECTED && vehicle.rejectedReason && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  Rejection notes: {vehicle.rejectedReason}
                </p>
              )}

              {isEditing ? (
                <form
                  onSubmit={handleEditSubmit}
                  className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`admin-model-${vehicle.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Model
                      </label>
                      <input
                        id={`admin-model-${vehicle.id}`}
                        name="model"
                        type="text"
                        required
                        value={formData.model}
                        onChange={handleFieldChange}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <div>
                      <label htmlFor={`admin-year-${vehicle.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Year
                      </label>
                      <input
                        id={`admin-year-${vehicle.id}`}
                        name="year"
                        type="number"
                        required
                        min={1990}
                        max={new Date().getFullYear() + 1}
                        value={formData.year}
                        onChange={handleFieldChange}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <div>
                      <label htmlFor={`admin-price-${vehicle.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Price per day (LKR)
                      </label>
                      <input
                        id={`admin-price-${vehicle.id}`}
                        name="pricePerDay"
                        type="number"
                        required
                        min={0}
                        step="100"
                        value={formData.pricePerDay}
                        onChange={handleFieldChange}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      />
                    </div>
                    <div>
                      <label htmlFor={`admin-seats-${vehicle.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Seats
                      </label>
                      <input
                        id={`admin-seats-${vehicle.id}`}
                        name="seats"
                        type="number"
                        min={1}
                        value={formData.seats}
                        onChange={handleFieldChange}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        placeholder="Optional"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label htmlFor={`admin-description-${vehicle.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Description
                      </label>
                      <textarea
                        id={`admin-description-${vehicle.id}`}
                        name="description"
                        rows={3}
                        value={formData.description}
                        onChange={handleFieldChange}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                        placeholder="Key highlights for travellers"
                      />
                    </div>
                  </div>

                  <fieldset className="rounded-lg border border-slate-200 p-3">
                    <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Included services
                    </legend>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {VEHICLE_FEATURES.map(({ key, label }) => (
                        <label
                          key={key}
                          className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:border-slate-300"
                        >
                          <input
                            type="checkbox"
                            name={key}
                            checked={Boolean(formData[key])}
                            onChange={handleFieldChange}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  {formError ? <p className="text-xs text-rose-600">{formError}</p> : null}

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={saving || isUpdating}
                      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-700/70"
                    >
                      {saving || isUpdating ? 'Saving...' : 'Save changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(vehicle)}
                      disabled={saving || isUpdating}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => startEditing(vehicle)}
                  disabled={saving && isEditing}
                  className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition ${
                    saving && isEditing
                      ? 'cursor-not-allowed opacity-60'
                      : 'hover:border-slate-300 hover:text-slate-900'
                  }`}
                >
                  <Pencil className="h-4 w-4" />
                  {isEditing ? 'Close editor' : 'Edit details'}
                </button>
                <button
                  type="button"
                  disabled={disableApprove}
                  onClick={() => {
                    if (!disableApprove) {
                      onStatusChange(vehicle.id, VEHICLE_STATUS.APPROVED);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition ${
                    disableApprove ? 'cursor-not-allowed opacity-60' : 'hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isUpdating ? 'Updating...' : 'Approve'}
                </button>
                <button
                  type="button"
                  disabled={disableReject}
                  onClick={() => {
                    if (!disableReject) {
                      onStatusChange(vehicle.id, VEHICLE_STATUS.REJECTED);
                    }
                  }}
                  className={`inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition ${
                    disableReject ? 'cursor-not-allowed opacity-60' : 'hover:bg-rose-100'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  {isUpdating ? 'Updating...' : 'Reject'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

const reviewStatusStyles = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const getReviewStatusLabel = (status) => {
  switch (status) {
    case 'approved':
      return 'Published';
    case 'rejected':
      return 'Declined';
    case 'pending':
    default:
      return 'Pending';
  }
};

const ReviewsPanel = ({ state, filter, onFilterChange, onRetry, onStatusChange }) => {
  const { items, meta, loading, error, updatingId } = state;

  const filters = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Published' },
    { value: 'rejected', label: 'Declined' },
    { value: 'all', label: 'All' },
  ];

  const handleFilterClick = (value) => {
    if (value === filter) {
      return;
    }
    onFilterChange?.(value);
  };

  const emptyCopy =
    filter === 'pending'
      ? 'No reviews are awaiting moderation right now.'
      : filter === 'approved'
      ? 'No reviews have been published yet.'
      : filter === 'rejected'
      ? 'No reviews have been declined.'
      : 'No reviews found.';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((option) => {
            const isActive = filter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFilterClick(option.value)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <span className="text-sm text-slate-500">
          {meta?.total ?? 0} result{(meta?.total ?? 0) === 1 ? '' : 's'}
        </span>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`review-skeleton-${index}`}
              className="animate-pulse space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="h-4 w-1/3 rounded-full bg-slate-200" />
              <div className="h-5 w-3/4 rounded-full bg-slate-200" />
              <div className="h-16 rounded-2xl bg-slate-200" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 text-center">
          <p className="text-sm font-medium text-rose-600">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
          <Star className="mb-3 h-10 w-10 text-slate-300" />
          <p>{emptyCopy}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((review) => {
            const vehicleModel = review.vehicle?.model || 'Vehicle unavailable';
            const driverName = review.vehicle?.driver?.name;
            const bookingStart = review.booking?.startDate ? formatDate(review.booking.startDate) : null;
            const bookingEnd = review.booking?.endDate ? formatDate(review.booking.endDate) : null;
            const submittedOn = review.createdAt ? formatDate(review.createdAt) : null;
            const statusLabel = getReviewStatusLabel(review.status);
            const badgeClass = reviewStatusStyles[review.status] || 'bg-slate-100 text-slate-600';
            const isUpdating = updatingId === review.id;

            const handleDecline = () => {
              let note = review.adminNote || '';
              if (typeof window !== 'undefined') {
                const input = window.prompt('Add an optional note for this traveller:', note);
                note = typeof input === 'string' ? input.trim() : note?.trim();
              }
              onStatusChange?.(review.id, 'rejected', note || undefined);
            };

            return (
              <article key={review.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <Star className="h-4 w-4" fill="currentColor" />
                        {review.rating}/5
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                        {statusLabel}
                      </span>
                    </div>
                    {submittedOn ? (
                      <p className="mt-1 text-xs text-slate-500">Submitted {submittedOn}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-slate-500">
                      Traveller: {review.travelerName || 'Anonymous'}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p className="font-semibold text-slate-700">{vehicleModel}</p>
                    {driverName ? <p>Driver: {driverName}</p> : null}
                    {bookingStart && bookingEnd ? (
                      <p>
                        Trip: {bookingStart} – {bookingEnd}
                      </p>
                    ) : null}
                  </div>
                </div>
                {review.title ? (
                  <h3 className="mt-3 text-base font-semibold text-slate-900">{review.title}</h3>
                ) : null}
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                  {review.comment}
                </p>
                {review.adminNote ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    <p className="font-semibold">Admin note</p>
                    <p>{review.adminNote}</p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {review.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onStatusChange?.(review.id, 'approved')}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4" />
                            Approve
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleDecline}
                        disabled={isUpdating}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <XCircle className="h-4 w-4" />
                        {isUpdating ? 'Updating...' : 'Decline'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStatusChange?.(review.id, 'pending')}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          Reopen
                        </>
                      )}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const buildAdminProfileForm = (profile) => ({
  name: profile?.name || '',
  contactNumber: profile?.contactNumber || '',
  address: profile?.address || '',
});

const AdminProfilePanel = ({
  profile,
  loading,
  error,
  onRetry,
  onSave,
  onPasswordChange,
  savingProfile,
  savingPassword,
}) => {
  const [formState, setFormState] = useState(() => buildAdminProfileForm(profile));
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });

  useEffect(() => {
    setFormState(buildAdminProfileForm(profile));
  }, [profile]);

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
      console.warn('Admin profile update failed', error);
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
      console.warn('Admin password update failed', error);
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

  if (!profile) {
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
          <p className="text-sm text-slate-500">Update the information used across the admin console.</p>
        </header>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="admin-profile-name">
              Name
            </label>
            <input
              id="admin-profile-name"
              name="name"
              value={formState.name}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="admin-profile-contact">
              Contact number
            </label>
            <input
              id="admin-profile-contact"
              name="contactNumber"
              value={formState.contactNumber}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="admin-profile-address">
              Office location
            </label>
            <input
              id="admin-profile-address"
              name="address"
              value={formState.address}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
          <p className="text-sm text-slate-500">Choose a strong password to protect admin access.</p>
        </header>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="admin-password-current">
              Current password
            </label>
            <input
              id="admin-password-current"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="admin-password-new">
              New password
            </label>
            <input
              id="admin-password-new"
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
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="admin-password-confirm">
              Confirm new password
            </label>
            <input
              id="admin-password-confirm"
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

const PlaceholderPanel = () => (
  <div className="flex min-h-[240px] flex-col items-center justify-center text-center text-sm text-slate-500">
    <ClipboardList className="mb-3 h-10 w-10 text-slate-300" />
    <p>Reporting and performance insights are under construction.</p>
  </div>
);

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

const formatPercentValue = (value, maximumFractionDigits = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return '0%';
  }
  return `${numeric.toLocaleString(undefined, {
    minimumFractionDigits: Number.isInteger(numeric) ? 0 : Math.min(1, maximumFractionDigits),
    maximumFractionDigits,
  })}%`;
};

const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '$0';
  }
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
};

const formatDate = (dateString) => {
  if (!dateString) {
    return '—';
  }

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default AdminDashboard;

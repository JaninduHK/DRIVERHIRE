import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  CalendarDays,
  Car,
  CircleUserRound,
  ClipboardList,
  FileText,
  Gauge,
  LayoutDashboard,
  MessageCircle,
  Percent,
  Send,
  Star,
  Users,
} from 'lucide-react';
import {
  fetchDriverApplications,
  updateDriverStatus as updateDriverStatusRequest,
  fetchVehicleSubmissions,
  updateVehicleStatus as updateVehicleStatusRequest,
  updateVehicleDetails as updateVehicleDetailsRequest,
  addVehicleImages as addVehicleImagesRequest,
  removeVehicleImage as removeVehicleImageRequest,
  fetchReviews,
  createReview as createAdminReview,
  bulkImportReviews,
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
  fetchUsers,
} from '../services/adminApi.js';
import {
  fetchCurrentUser as fetchProfileCurrentUser,
  updateProfile as updateProfileRequest,
  updatePassword as updatePasswordRequest,
} from '../services/profileApi.js';
import { clearStoredToken } from '../services/authToken.js';
import { downloadCsv } from '../lib/csv.js';
import AdminShell from './admin/AdminShell.jsx';
import OverviewPanel from './admin/OverviewPanel.jsx';
import BookingsPanel from './admin/BookingsPanel.jsx';
import DiscountsPanel from './admin/DiscountsPanel.jsx';
import BriefsPanel from './admin/BriefsPanel.jsx';
import OffersPanel from './admin/OffersPanel.jsx';
import ConversationsPanel from './admin/ConversationsPanel.jsx';
import UsersPanel from './admin/UsersPanel.jsx';
import DriversPanel, { DriverApprovalSetting } from './admin/DriversPanel.jsx';
import VehiclesPanel from './admin/VehiclesPanel.jsx';
import ReviewsPanel from './admin/ReviewsPanel.jsx';
import ReportsPanel from './admin/ReportsPanel.jsx';
import PerformancePanel from './admin/PerformancePanel.jsx';
import AdminProfilePanel from './admin/AdminProfilePanel.jsx';
import { formatDate } from './admin/adminFormatters.js';

const DRIVER_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };
const VEHICLE_STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };

const SECTION_META = {
  overview: { crumb: 'CONTROL ROOM', title: 'Overview' },
  bookings: { crumb: 'MARKETPLACE', title: 'Bookings' },
  discounts: { crumb: 'MARKETPLACE', title: 'Discounts' },
  briefs: { crumb: 'MARKETPLACE', title: 'Tour briefs' },
  offers: { crumb: 'MARKETPLACE', title: 'Driver offers' },
  conversations: { crumb: 'MARKETPLACE', title: 'Conversations' },
  users: { crumb: 'SUPPLY & PEOPLE', title: 'Users' },
  drivers: { crumb: 'SUPPLY & PEOPLE', title: 'Drivers' },
  vehicles: { crumb: 'SUPPLY & PEOPLE', title: 'Vehicle approvals' },
  reviews: { crumb: 'SUPPLY & PEOPLE', title: 'Reviews' },
  reports: { crumb: 'INSIGHTS', title: 'Reports' },
  performance: { crumb: 'INSIGHTS', title: 'Performance' },
  profile: { crumb: 'ACCOUNT', title: 'Admin profile' },
};

// Sections with a header search box + CSV export wired to their current (filtered) rows.
const SEARCHABLE_SECTIONS = new Set(['bookings', 'discounts', 'briefs', 'offers', 'conversations', 'users', 'drivers', 'vehicles', 'reviews']);

const matches = (term, fields) => {
  if (!term) return true;
  return fields.filter(Boolean).some((field) => String(field).toLowerCase().includes(term));
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  const [bookingState, setBookingState] = useState({ items: [], loading: true, error: '', updatingId: null, deletingId: null });
  const [briefState, setBriefState] = useState({ items: [], loading: true, error: '', updatingId: null, deletingId: null });
  const [offerState, setOfferState] = useState({ items: [], loading: true, error: '', updatingId: null, deletingId: null });
  const [conversationState, setConversationState] = useState({ items: [], loading: true, error: '', updatingId: null, deletingId: null });
  const [discountState, setDiscountState] = useState({ items: [], loading: true, error: '', saving: false, updatingId: null, deletingId: null });
  const [usersState, setUsersState] = useState({ items: [], loading: true, error: '' });
  const [driverState, setDriverState] = useState({ items: [], loading: true, error: '', updatingId: null });
  const [vehicleState, setVehicleState] = useState({ items: [], loading: true, error: '', updatingId: null });
  const [reviewFilter, setReviewFilter] = useState('all');
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [reviewState, setReviewState] = useState({ items: [], meta: { total: 0, status: 'pending' }, loading: true, error: '', updatingId: null, creating: false });
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

  const handleSectionChange = useCallback((section) => {
    setActiveSection(section);
    setSearchTerm('');
  }, []);

  const loadBookings = useCallback(async () => {
    setBookingState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminBookings();
      setBookingState((prev) => ({ ...prev, items: response.bookings || [], loading: false, error: '' }));
    } catch (error) {
      setBookingState((prev) => ({ ...prev, items: [], loading: false, error: error.message || 'Unable to load bookings.' }));
    }
  }, []);

  const loadBriefs = useCallback(async () => {
    setBriefState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminBriefs();
      setBriefState((prev) => ({ ...prev, items: response.briefs || [], loading: false, error: '' }));
    } catch (error) {
      setBriefState((prev) => ({ ...prev, items: [], loading: false, error: error.message || 'Unable to load tour briefs.' }));
    }
  }, []);

  const loadOffers = useCallback(async () => {
    setOfferState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminOffers();
      setOfferState((prev) => ({ ...prev, items: response.offers || [], loading: false, error: '' }));
    } catch (error) {
      setOfferState((prev) => ({ ...prev, items: [], loading: false, error: error.message || 'Unable to load offers.' }));
    }
  }, []);

  const loadAdminConversations = useCallback(async () => {
    setConversationState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminConversations();
      setConversationState((prev) => ({ ...prev, items: response.conversations || [], loading: false, error: '' }));
    } catch (error) {
      setConversationState((prev) => ({ ...prev, items: [], loading: false, error: error.message || 'Unable to load conversations.' }));
    }
  }, []);

  const loadDiscounts = useCallback(async () => {
    setDiscountState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchAdminDiscounts();
      setDiscountState((prev) => ({ ...prev, items: response.discounts || [], loading: false, error: '' }));
    } catch (error) {
      setDiscountState((prev) => ({ ...prev, items: [], loading: false, error: error.message || 'Unable to load discounts.' }));
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const response = await fetchUsers();
      setUsersState({ items: response.users || [], loading: false, error: '' });
    } catch (error) {
      setUsersState({ items: [], loading: false, error: error.message || 'Unable to load users.' });
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
      setReviewState((prev) => ({ ...prev, items: response.reviews || [], meta: response.meta || { total: 0, status }, loading: false, error: '', updatingId: null }));
      const pendingCount = response.meta?.counts?.pending;
      if (typeof pendingCount === 'number') {
        setPendingReviewCount(pendingCount);
      } else if (status === 'pending') {
        setPendingReviewCount(response.meta?.total ?? (response.reviews?.length ?? 0));
      }
      return response;
    } catch (err) {
      setReviewState((prev) => ({ ...prev, items: [], meta: { total: 0, status }, loading: false, error: err.message || 'Unable to load reviews', updatingId: null }));
      throw err;
    }
  }, []);

  useEffect(() => {
    loadDrivers();
    loadVehicles();
  }, [loadDrivers, loadVehicles]);

  // Bookings/briefs back both their own tabs AND the Overview/Reports/Performance aggregates.
  useEffect(() => {
    if (['bookings', 'overview', 'reports', 'performance'].includes(activeSection)) loadBookings();
  }, [activeSection, loadBookings]);

  useEffect(() => {
    if (['briefs', 'overview', 'performance'].includes(activeSection)) loadBriefs();
  }, [activeSection, loadBriefs]);

  useEffect(() => {
    if (activeSection === 'offers') loadOffers();
  }, [activeSection, loadOffers]);

  useEffect(() => {
    if (activeSection === 'conversations') loadAdminConversations();
  }, [activeSection, loadAdminConversations]);

  useEffect(() => {
    if (activeSection === 'discounts') loadDiscounts();
  }, [activeSection, loadDiscounts]);

  useEffect(() => {
    if (activeSection === 'users') loadUsers();
  }, [activeSection, loadUsers]);

  const handleBookingUpdate = useCallback(async (bookingId, payload) => {
    setBookingState((prev) => ({ ...prev, updatingId: bookingId }));
    try {
      const { booking } = await updateAdminBooking(bookingId, payload);
      setBookingState((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === booking.id ? booking : item)), updatingId: null }));
      toast.success('Booking updated.');
    } catch (error) {
      setBookingState((prev) => ({ ...prev, updatingId: null }));
      toast.error(error?.message || 'Unable to update booking.');
      throw error;
    }
  }, []);

  const handleBookingDelete = useCallback(async (bookingId) => {
    setBookingState((prev) => ({ ...prev, deletingId: bookingId }));
    try {
      await deleteAdminBooking(bookingId);
      setBookingState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== bookingId), deletingId: null }));
      toast.success('Booking deleted.');
    } catch (error) {
      setBookingState((prev) => ({ ...prev, deletingId: null }));
      toast.error(error?.message || 'Unable to delete booking.');
      throw error;
    }
  }, []);

  const handleBriefUpdate = useCallback(async (briefId, payload) => {
    setBriefState((prev) => ({ ...prev, updatingId: briefId }));
    try {
      const { brief } = await updateAdminBrief(briefId, payload);
      setBriefState((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === brief.id ? brief : item)), updatingId: null }));
      toast.success('Brief updated.');
    } catch (error) {
      setBriefState((prev) => ({ ...prev, updatingId: null }));
      toast.error(error?.message || 'Unable to update brief.');
      throw error;
    }
  }, []);

  const handleBriefDelete = useCallback(async (briefId) => {
    setBriefState((prev) => ({ ...prev, deletingId: briefId }));
    try {
      await deleteAdminBrief(briefId);
      setBriefState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== briefId), deletingId: null }));
      toast.success('Brief deleted.');
    } catch (error) {
      setBriefState((prev) => ({ ...prev, deletingId: null }));
      toast.error(error?.message || 'Unable to delete brief.');
      throw error;
    }
  }, []);

  const handleOfferStatusChange = useCallback(async (offerId, status) => {
    setOfferState((prev) => ({ ...prev, updatingId: offerId }));
    try {
      const { offer } = await updateAdminOfferStatus(offerId, status);
      setOfferState((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === offer.id ? offer : item)), updatingId: null }));
      toast.success('Offer updated.');
    } catch (error) {
      setOfferState((prev) => ({ ...prev, updatingId: null }));
      toast.error(error?.message || 'Unable to update offer.');
      throw error;
    }
  }, []);

  const handleOfferDelete = useCallback(async (offerId) => {
    setOfferState((prev) => ({ ...prev, deletingId: offerId }));
    try {
      await deleteAdminOffer(offerId);
      setOfferState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== offerId), deletingId: null }));
      toast.success('Offer deleted.');
    } catch (error) {
      setOfferState((prev) => ({ ...prev, deletingId: null }));
      toast.error(error?.message || 'Unable to delete offer.');
      throw error;
    }
  }, []);

  const handleConversationStatusChange = useCallback(async (conversationId, status) => {
    setConversationState((prev) => ({ ...prev, updatingId: conversationId }));
    try {
      const { conversation } = await updateAdminConversationStatus(conversationId, status);
      setConversationState((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === conversation.id ? conversation : item)), updatingId: null }));
      toast.success('Conversation updated.');
    } catch (error) {
      setConversationState((prev) => ({ ...prev, updatingId: null }));
      toast.error(error?.message || 'Unable to update conversation.');
      throw error;
    }
  }, []);

  const handleConversationDelete = useCallback(async (conversationId) => {
    setConversationState((prev) => ({ ...prev, deletingId: conversationId }));
    try {
      await deleteAdminConversation(conversationId);
      setConversationState((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== conversationId), deletingId: null }));
      toast.success('Conversation deleted.');
    } catch (error) {
      setConversationState((prev) => ({ ...prev, deletingId: null }));
      toast.error(error?.message || 'Unable to delete conversation.');
      throw error;
    }
  }, []);

  const handleDiscountCreate = useCallback(async (payload) => {
    setDiscountState((prev) => ({ ...prev, saving: true }));
    try {
      const response = await createAdminDiscount(payload);
      await loadDiscounts();
      setDiscountState((prev) => ({ ...prev, saving: false }));
      const impact = typeof response?.recalculatedBookings === 'number' && response.recalculatedBookings > 0 ? ` Updated ${response.recalculatedBookings} booking${response.recalculatedBookings === 1 ? '' : 's'}.` : '';
      toast.success(`Discount created.${impact}`);
      return response.discount;
    } catch (error) {
      setDiscountState((prev) => ({ ...prev, saving: false }));
      toast.error(error?.message || 'Unable to create discount.');
      throw error;
    }
  }, [loadDiscounts]);

  const handleDiscountUpdate = useCallback(async (discountId, payload) => {
    setDiscountState((prev) => ({ ...prev, updatingId: discountId }));
    try {
      const response = await updateAdminDiscount(discountId, payload);
      await loadDiscounts();
      setDiscountState((prev) => ({ ...prev, updatingId: null }));
      const impact = typeof response?.recalculatedBookings === 'number' && response.recalculatedBookings > 0 ? ` Updated ${response.recalculatedBookings} booking${response.recalculatedBookings === 1 ? '' : 's'}.` : '';
      toast.success(`Discount updated.${impact}`);
      return response.discount;
    } catch (error) {
      setDiscountState((prev) => ({ ...prev, updatingId: null }));
      toast.error(error?.message || 'Unable to update discount.');
      throw error;
    }
  }, [loadDiscounts]);

  const handleDiscountDelete = useCallback(async (discountId) => {
    setDiscountState((prev) => ({ ...prev, deletingId: discountId }));
    try {
      const response = await deleteAdminDiscount(discountId);
      await loadDiscounts();
      setDiscountState((prev) => ({ ...prev, deletingId: null }));
      const impact = typeof response?.recalculatedBookings === 'number' && response.recalculatedBookings > 0 ? ` Updated ${response.recalculatedBookings} booking${response.recalculatedBookings === 1 ? '' : 's'}.` : '';
      toast.success(`Discount removed.${impact}`);
    } catch (error) {
      setDiscountState((prev) => ({ ...prev, deletingId: null }));
      toast.error(error?.message || 'Unable to delete discount.');
      throw error;
    }
  }, [loadDiscounts]);

  const loadCurrentUserProfile = useCallback(async ({ silent = false } = {}) => {
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
  }, []);

  useEffect(() => {
    loadCurrentUserProfile({ silent: false });
  }, [loadCurrentUserProfile]);

  useEffect(() => {
    loadReviews(reviewFilter);
  }, [loadReviews, reviewFilter]);

  const pendingDriverCount = useMemo(() => driverState.items.filter((app) => app.driverStatus === DRIVER_STATUS.PENDING).length, [driverState.items]);
  const pendingVehicleCount = useMemo(() => vehicleState.items.filter((vehicle) => vehicle.status === VEHICLE_STATUS.PENDING).length, [vehicleState.items]);
  const pendingBookingCount = useMemo(() => bookingState.items.filter((b) => b.status === 'pending').length, [bookingState.items]);
  const openBriefsCount = useMemo(() => briefState.items.filter((b) => b.status === 'open').length, [briefState.items]);
  const pendingOfferCount = useMemo(() => offerState.items.filter((o) => o.status === 'pending').length, [offerState.items]);
  const flaggedConversationCount = useMemo(
    () => conversationState.items.filter((c) => Array.isArray(c.messages) && c.messages.some((m) => m.warning)).length,
    [conversationState.items]
  );

  const handleDriverStatusChange = async (applicationId, nextStatus) => {
    setDriverState((prev) => ({ ...prev, updatingId: applicationId }));
    try {
      const { driver } = await updateDriverStatusRequest(applicationId, nextStatus);
      setDriverState((prev) => ({ ...prev, items: prev.items.map((application) => (application.id === driver.id ? driver : application)), updatingId: null }));
      toast.success(nextStatus === DRIVER_STATUS.APPROVED ? 'Driver approved successfully.' : 'Driver application updated.');
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
      const { vehicle } = await updateVehicleStatusRequest(vehicleId, { status: nextStatus });
      setVehicleState((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === vehicle.id ? vehicle : item)), updatingId: null }));
      toast.success(nextStatus === VEHICLE_STATUS.APPROVED ? 'Vehicle approved successfully.' : 'Vehicle status updated.');
    } catch (err) {
      toast.error(err.message || 'Unable to update vehicle status.');
      setVehicleState((prev) => ({ ...prev, updatingId: null }));
    }
  };

  const handleReviewFilterChange = (status) => setReviewFilter(status);

  const handleReviewStatusChange = async (reviewId, nextStatus, adminNote) => {
    setReviewState((prev) => ({ ...prev, updatingId: reviewId }));
    try {
      await updateReviewStatusRequest(reviewId, { status: nextStatus, adminNote });
      toast.success(nextStatus === 'approved' ? 'Review approved and published.' : 'Review declined.');
      await loadReviews(reviewFilter);
      if (reviewFilter !== 'pending') {
        try {
          const pendingSnapshot = await fetchReviews({ status: 'pending' });
          setPendingReviewCount(pendingSnapshot.meta?.total ?? (pendingSnapshot.reviews?.length ?? 0));
        } catch (refreshError) {
          console.error('Unable to refresh pending review count:', refreshError);
        }
      }
    } catch (err) {
      toast.error(err.message || 'Unable to update review.');
      setReviewState((prev) => ({ ...prev, updatingId: null }));
    }
  };

  const handleReviewCreate = useCallback(async (payload) => {
    setReviewState((prev) => ({ ...prev, creating: true }));
    try {
      await createAdminReview(payload);
      toast.success(payload.status === 'pending' ? 'Review saved as pending.' : payload.status === 'rejected' ? 'Review saved.' : 'Review published.');
      await loadReviews(reviewFilter);
    } catch (err) {
      toast.error(err.message || 'Unable to add review.');
      throw err;
    } finally {
      setReviewState((prev) => ({ ...prev, creating: false }));
    }
  }, [loadReviews, reviewFilter]);

  const handleReviewBulkImport = useCallback(async (rows) => {
    const response = await bulkImportReviews(rows);
    if (response?.created > 0) {
      toast.success(response.message || `${response.created} reviews imported.`);
      await loadReviews(reviewFilter);
    } else {
      toast.error(response?.message || 'No reviews were imported.');
    }
    return response;
  }, [loadReviews, reviewFilter]);

  const handleAdminProfileSave = useCallback(async (payload) => {
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
  }, [loadCurrentUserProfile]);

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
      setVehicleState((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === vehicle.id ? vehicle : item)), updatingId: null }));
      toast.success('Vehicle details updated.');
    } catch (err) {
      toast.error(err.message || 'Unable to update vehicle details.');
      setVehicleState((prev) => ({ ...prev, updatingId: null }));
      throw err;
    }
  };

  const handleVehicleImagesAdd = async (vehicleId, formData) => {
    setVehicleState((prev) => ({ ...prev, updatingId: vehicleId }));
    try {
      const { vehicle } = await addVehicleImagesRequest(vehicleId, formData);
      setVehicleState((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === vehicle.id ? vehicle : item)), updatingId: null }));
      toast.success('Images added.');
    } catch (err) {
      toast.error(err.message || 'Unable to add images.');
      setVehicleState((prev) => ({ ...prev, updatingId: null }));
      throw err;
    }
  };

  const handleVehicleImageRemove = async (vehicleId, image) => {
    setVehicleState((prev) => ({ ...prev, updatingId: vehicleId }));
    try {
      const { vehicle } = await removeVehicleImageRequest(vehicleId, image);
      setVehicleState((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === vehicle.id ? vehicle : item)), updatingId: null }));
      toast.success('Image removed.');
    } catch (err) {
      toast.error(err.message || 'Unable to remove image.');
      setVehicleState((prev) => ({ ...prev, updatingId: null }));
      throw err;
    }
  };

  // Header search filters each table's currently-loaded rows in memory (every
  // admin list endpoint already returns its full collection, unpaginated).
  const term = searchTerm.trim().toLowerCase();
  const filteredBookings = useMemo(
    () => bookingState.items.filter((b) => matches(term, [b.traveler?.fullName, b.driver?.name, b.vehicle?.model, b.startPoint, b.endPoint, b.status])),
    [bookingState.items, term]
  );
  const filteredDiscounts = useMemo(() => discountState.items.filter((d) => matches(term, [d.name, d.description])), [discountState.items, term]);
  const filteredBriefs = useMemo(
    () => briefState.items.filter((b) => matches(term, [b.traveler?.name, b.startLocation, b.endLocation, b.country, b.message])),
    [briefState.items, term]
  );
  const filteredOffers = useMemo(
    () => offerState.items.filter((o) => matches(term, [o.driver?.name, o.vehicle?.model, o.traveler?.name, o.status])),
    [offerState.items, term]
  );
  const filteredConversations = useMemo(
    () => conversationState.items.filter((c) => matches(term, [c.traveler?.name, c.driver?.name, c.vehicle?.model])),
    [conversationState.items, term]
  );
  const filteredUsers = useMemo(() => usersState.items.filter((u) => matches(term, [u.name, u.email, u.contactNumber])), [usersState.items, term]);
  const filteredDrivers = useMemo(() => driverState.items.filter((d) => matches(term, [d.name, d.email, d.address])), [driverState.items, term]);
  const filteredVehicles = useMemo(
    () => vehicleState.items.filter((v) => matches(term, [v.model, v.driver?.name, v.driver?.address])),
    [vehicleState.items, term]
  );
  const filteredReviews = useMemo(
    () => reviewState.items.filter((r) => matches(term, [r.travelerName, r.vehicle?.model, r.vehicle?.driver?.name, r.comment])),
    [reviewState.items, term]
  );

  const handleExport = useCallback(() => {
    switch (activeSection) {
      case 'bookings':
        downloadCsv('bookings', filteredBookings.map((b) => ({
          ref: b.id, traveler: b.traveler?.fullName || '', driver: b.driver?.name || '', vehicle: b.vehicle?.model || '',
          start: formatDate(b.startDate), end: formatDate(b.endDate), total: b.totalPrice || 0, status: b.status,
        })));
        break;
      case 'discounts':
        downloadCsv('discounts', filteredDiscounts.map((d) => ({ name: d.name, percent: d.discountPercent, start: formatDate(d.startDate), end: formatDate(d.endDate), status: d.status })));
        break;
      case 'briefs':
        downloadCsv('tour-briefs', filteredBriefs.map((b) => ({
          traveler: b.traveler?.name || '', country: b.country, start: formatDate(b.startDate), end: formatDate(b.endDate), status: b.status, offers: b.offersCount || 0,
        })));
        break;
      case 'offers':
        downloadCsv('driver-offers', filteredOffers.map((o) => ({ driver: o.driver?.name || '', vehicle: o.vehicle?.model || '', traveler: o.traveler?.name || '', total: o.totalPrice || 0, status: o.status, created: formatDate(o.createdAt) })));
        break;
      case 'conversations':
        downloadCsv('conversations', filteredConversations.map((c) => ({
          traveler: c.traveler?.name || '', driver: c.driver?.name || '', vehicle: c.vehicle?.model || '', status: c.status,
          flagged: Array.isArray(c.messages) && c.messages.some((m) => m.warning) ? 'yes' : 'no',
        })));
        break;
      case 'users':
        downloadCsv('users', filteredUsers.map((u) => ({ name: u.name, email: u.email, contactNumber: u.contactNumber || '', bookings: u.bookingsCount, briefs: u.briefsCount, registered: formatDate(u.registeredAt) })));
        break;
      case 'drivers':
        downloadCsv('drivers', filteredDrivers.map((d) => ({ name: d.name, email: d.email, contactNumber: d.contactNumber || '', status: d.driverStatus, address: d.address || '' })));
        break;
      case 'vehicles':
        downloadCsv('vehicles', filteredVehicles.map((v) => ({ model: v.model, year: v.year, pricePerDay: v.pricePerDay, seats: v.seats || '', status: v.status, driver: v.driver?.name || '' })));
        break;
      case 'reviews':
        downloadCsv('reviews', filteredReviews.map((r) => ({ travelerName: r.travelerName || '', vehicle: r.vehicle?.model || '', driver: r.vehicle?.driver?.name || '', rating: r.rating, status: r.status, comment: r.comment })));
        break;
      default:
        break;
    }
  }, [activeSection, filteredBookings, filteredDiscounts, filteredBriefs, filteredOffers, filteredConversations, filteredUsers, filteredDrivers, filteredVehicles, filteredReviews]);

  const navGroups = [
    { items: [{ id: 'overview', label: 'Overview', icon: LayoutDashboard }] },
    {
      label: 'MARKETPLACE',
      items: [
        { id: 'bookings', label: 'Bookings', icon: CalendarDays, badge: pendingBookingCount },
        { id: 'discounts', label: 'Discounts', icon: Percent },
        { id: 'briefs', label: 'Briefs', icon: FileText, badge: openBriefsCount },
        { id: 'offers', label: 'Offers', icon: Send, badge: pendingOfferCount },
        { id: 'conversations', label: 'Conversations', icon: MessageCircle, badge: flaggedConversationCount },
      ],
    },
    {
      label: 'SUPPLY & PEOPLE',
      items: [
        { id: 'users', label: 'Users', icon: Users },
        { id: 'drivers', label: 'Drivers', icon: CircleUserRound, badge: pendingDriverCount },
        { id: 'vehicles', label: 'Vehicles', icon: Car, badge: pendingVehicleCount },
        { id: 'reviews', label: 'Reviews', icon: Star, badge: pendingReviewCount },
      ],
    },
    {
      label: 'INSIGHTS',
      items: [
        { id: 'reports', label: 'Reports', icon: ClipboardList },
        { id: 'performance', label: 'Performance', icon: Gauge },
      ],
    },
  ];

  const meta = SECTION_META[activeSection] || SECTION_META.overview;
  const isSearchable = SEARCHABLE_SECTIONS.has(activeSection);

  let content;
  if (activeSection === 'overview') {
    content = <OverviewPanel bookings={bookingState.items} briefs={briefState.items} drivers={driverState.items} vehicles={vehicleState.items} onNavigate={handleSectionChange} />;
  } else if (activeSection === 'bookings') {
    content = <BookingsPanel state={{ ...bookingState, items: filteredBookings }} onReload={loadBookings} onUpdate={handleBookingUpdate} onDelete={handleBookingDelete} />;
  } else if (activeSection === 'discounts') {
    content = <DiscountsPanel state={{ ...discountState, items: filteredDiscounts }} onReload={loadDiscounts} onCreate={handleDiscountCreate} onUpdate={handleDiscountUpdate} onDelete={handleDiscountDelete} />;
  } else if (activeSection === 'briefs') {
    content = <BriefsPanel state={{ ...briefState, items: filteredBriefs }} onReload={loadBriefs} onUpdate={handleBriefUpdate} onDelete={handleBriefDelete} />;
  } else if (activeSection === 'offers') {
    content = <OffersPanel state={{ ...offerState, items: filteredOffers }} onReload={loadOffers} onStatusChange={handleOfferStatusChange} onDelete={handleOfferDelete} />;
  } else if (activeSection === 'conversations') {
    content = <ConversationsPanel state={{ ...conversationState, items: filteredConversations }} onReload={loadAdminConversations} onStatusChange={handleConversationStatusChange} onDelete={handleConversationDelete} />;
  } else if (activeSection === 'users') {
    content = <UsersPanel state={{ ...usersState, items: filteredUsers }} onReload={loadUsers} />;
  } else if (activeSection === 'drivers') {
    content = (
      <div className="flex flex-col gap-4">
        <DriverApprovalSetting />
        <DriversPanel state={{ ...driverState, items: filteredDrivers }} onRetry={loadDrivers} onStatusChange={handleDriverStatusChange} onSendMessage={handleDriverMessageSend} />
      </div>
    );
  } else if (activeSection === 'vehicles') {
    content = (
      <VehiclesPanel
        state={{ ...vehicleState, items: filteredVehicles }}
        onRetry={loadVehicles}
        onStatusChange={handleVehicleStatusChange}
        onUpdate={handleVehicleDetailsUpdate}
        onAddImages={handleVehicleImagesAdd}
        onRemoveImage={handleVehicleImageRemove}
      />
    );
  } else if (activeSection === 'reviews') {
    content = (
      <ReviewsPanel
        state={{ ...reviewState, items: filteredReviews }}
        filter={reviewFilter}
        onFilterChange={handleReviewFilterChange}
        onRetry={() => loadReviews(reviewFilter)}
        onStatusChange={handleReviewStatusChange}
        onCreate={handleReviewCreate}
        onBulkImport={handleReviewBulkImport}
        drivers={driverState.items}
        vehicles={vehicleState.items}
      />
    );
  } else if (activeSection === 'reports') {
    content = <ReportsPanel bookings={bookingState.items} />;
  } else if (activeSection === 'performance') {
    content = <PerformancePanel bookings={bookingState.items} briefs={briefState.items} drivers={driverState.items} reviews={reviewState.items} />;
  } else {
    content = (
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
    );
  }

  return (
    <AdminShell
      navGroups={navGroups}
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      currentUser={currentUser}
      onOpenProfile={() => handleSectionChange('profile')}
      onLogout={handleLogout}
      crumb={meta.crumb}
      title={meta.title}
      searchValue={searchTerm}
      onSearchChange={isSearchable ? setSearchTerm : undefined}
      searchPlaceholder={`Search ${meta.title.toLowerCase()}…`}
      onExport={isSearchable ? handleExport : undefined}
    >
      {content}
    </AdminShell>
  );
};

export default AdminDashboard;

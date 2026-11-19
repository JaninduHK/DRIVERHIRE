// /src/pages/DriverDashboard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DateField from '../components/DateField.jsx';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  Car,
  ClipboardList,
  DollarSign,
  KeyRound,
  LifeBuoy,
  Loader2,
  RefreshCw,
  Pencil,
  MapPin,
  MessageCircle,
  Phone,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  Star,
  Trash2,
  Upload,
  User2,
  Users,
  XCircle,
  ExternalLink,
  Circle,
  Search,
} from 'lucide-react';
import {
  DashboardSidebar,
  DriverDrawer,
  MobileHeader,
  NotificationBell,
  Sheet,
} from '../components/dashboard/mobile.jsx';
import { Avatar, Chip, ProgressBar } from '../components/dashboard/primitives.jsx';
import {
  fetchDriverOverview,
  fetchDriverVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle as deleteVehicleRequest,
  createVehicleAvailability,
  updateVehicleAvailability,
  deleteVehicleAvailability,
  fetchDriverEarningsSummary,
  fetchDriverEarningsHistory,
  uploadCommissionSlip,
  completeDriverProfileTour,
  updateDriverLicense as updateDriverLicenseRequest,
} from '../services/driverApi.js';
import {
  updateProfile as updateProfileRequest,
  updatePassword as updatePasswordRequest,
} from '../services/profileApi.js';
import { fetchDriverBookings, driverRespondToBooking } from '../services/bookingApi.js';
import BookingDetailsModal from '../components/BookingDetailsModal.jsx';
import { fetchOpenBriefs } from '../services/briefApi.js';
import { fetchConversations } from '../services/chatApi.js';
import { VEHICLE_FEATURES, getVehicleFeatureLabels } from '../constants/vehicleFeatures.js';
import { LICENSE_COPY } from '../constants/driverLicense.js';
import ContactWarning from '../components/ContactWarning.jsx';
import { bioContactWarningMessage } from '../lib/contactWarning.js';
import { clearStoredToken, getStoredToken, saveReturnPath } from '../services/authToken.js';
import DeleteAccountCard from '../components/DeleteAccountCard.jsx';
import imageCompression from 'browser-image-compression';
import LocationSelect from '../components/LocationSelect.jsx';
import ServiceAreasPicker from '../components/ServiceAreasPicker.jsx';
import { SERVICE_AREAS, guessLocationName } from '../constants/locations.js';
import CoverPhotoCard from '../components/CoverPhotoCard.jsx';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: User2, hash: 'overview' },
  { id: 'vehicles', label: 'My Vehicles', icon: Car, hash: 'vehicles' },
  { id: 'bookings', label: 'My Bookings', icon: CalendarDays, hash: 'bookings' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/portal/driver/messages' },
  { id: 'briefs', label: 'Tour Briefs', icon: MapPin, href: '/briefs' },
  { id: 'earnings', label: 'My Earnings', icon: DollarSign, hash: 'earnings' },
  { id: 'availability', label: 'My Availability', icon: CalendarCheck, hash: 'availability' },
  { id: 'profile', label: 'My Profile', icon: ClipboardList, hash: 'profile' },
];

const HASHABLE_TABS = ['overview', 'vehicles', 'bookings', 'earnings', 'availability', 'profile'];
const HASH_TARGETS = [...HASHABLE_TABS, 'messages'];

const LICENSE_TYPES = ['Tourist Driver', 'Chauffeur Guide Lecturer', 'National Guide Lecturer'];
const LICENSE_STATUS_TAGS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-rose-50 text-rose-700',
};
const licenseStatusLabel = (status) => {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'pending':
      return 'Pending review';
    default:
      return 'Not submitted';
  }
};

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_VEHICLE_UPLOAD_BYTES = MAX_IMAGE_SIZE_BYTES * 5;
// Vehicle photo and insurance rules; mirror backend/utils/vehicleInsurance.js.
// A vehicle is listed with exactly five photos, so the minimum and maximum match.
const MIN_VEHICLE_IMAGES = 5;
const MAX_VEHICLE_IMAGES = 5;
const MAX_INSURANCE_IMAGES = 2;
// Up to 7 files go up in one request, so each is brought down to about 2MB
// first (the server keeps at most 1920px anyway) to stay well inside the limit.
const VEHICLE_IMAGE_TARGET_MB = 2;

const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const VEHICLE_PHOTO_RULES = [
  `Upload ${MIN_VEHICLE_IMAGES} clear, good-quality photos.`,
  'Show the outside and the inside.',
  'The number plate must be visible.',
  'No people in the photos.',
];

// How a vehicle's insurance is shown to its driver, by the state the server reports.
const INSURANCE_NOTICES = {
  missing: { chip: 'No insurance', tone: 'bg-[#fdf0d8] text-[#a86a15]', text: 'Add your passenger insurance document and cover dates. Edit this vehicle to upload them.' },
  pending: { chip: 'Insurance in review', tone: 'bg-[#e6f0fb] text-[#1d5fa8]', text: '' },
  verified: { chip: 'Insurance verified', tone: 'bg-brand-tint text-brand-dark', text: '' },
  expiring: { chip: 'Insurance expires soon', tone: 'bg-[#fdf0d8] text-[#a86a15]', text: 'Upload your renewed passenger insurance document before the cover ends, or this vehicle leaves the marketplace.' },
  expired: { chip: 'Insurance expired', tone: 'bg-[#ffe4e9] text-[#e11d48]', text: 'This vehicle is off the marketplace. Edit it and upload your new passenger insurance document to put it back.' },
  rejected: { chip: 'Insurance not accepted', tone: 'bg-[#ffe4e9] text-[#e11d48]', text: 'We could not verify the insurance you sent. Edit this vehicle and upload a clear photo of your current passenger insurance document.' },
};

// Compress image if it exceeds the size limit (common on mobile phones)
// Ensures mobile formats (HEIC, HEIF, WebP) are converted to JPEG for compatibility
const compressImageIfNeeded = async (file, maxSizeMB = 9.5) => {
  if (file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }
  const options = {
    maxSizeMB,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: 'image/jpeg', // Always convert to JPEG for mobile compatibility
    initialQuality: 0.8, // Better quality for initial compression
    alwaysKeepResolution: false, // Allow resolution reduction
  };
  const compressed = await imageCompression(file, options);
  // Generate JPEG filename if needed
  const fileName = file.name.replace(/\.(heic|heif|webp|png)$/i, '.jpg');
  const result = new File([compressed], fileName, { type: 'image/jpeg' });
  // Validate that compression actually reduced the size below the limit
  if (result.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Unable to compress "${file.name}" below 10MB. Try a smaller image.`);
  }
  return result;
};

const parseTabFromHash = (hash = '') => {
  const normalized = hash.startsWith('#') ? hash.slice(1) : hash;
  if (HASH_TARGETS.includes(normalized)) {
    return normalized;
  }
  return 'overview';
};

const VEHICLE_STATUS_STYLES = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

const AVAILABILITY_STATUS = {
  AVAILABLE: 'available',
  UNAVAILABLE: 'unavailable',
};

const AVAILABILITY_STATUS_STYLES = {
  [AVAILABILITY_STATUS.AVAILABLE]: 'bg-emerald-100 text-emerald-700',
  [AVAILABILITY_STATUS.UNAVAILABLE]: 'bg-slate-200 text-slate-700',
};

const buildAvailabilityForm = () => ({
  startDate: '',
  endDate: '',
  status: AVAILABILITY_STATUS.AVAILABLE,
  note: '',
});

const buildInitialVehicleForm = () => ({
  model: '',
  registrationNumber: '',
  year: new Date().getFullYear().toString(),
  pricePerDay: '',
  seats: '',
  description: '',
  englishSpeakingDriver: false,
  meetAndGreetAtAirport: false,
  fuelAndInsurance: false,
  driverMealsAndAccommodation: false,
  parkingFeesAndTolls: false,
  allTaxes: false,
});

const buildVehicleFormFromData = (vehicle) => ({
  model: vehicle?.model ?? '',
  registrationNumber: vehicle?.registrationNumber ?? '',
  year: vehicle?.year ? String(vehicle.year) : new Date().getFullYear().toString(),
  pricePerDay: vehicle?.pricePerDay ? String(vehicle.pricePerDay) : '',
  seats: vehicle?.seats ? String(vehicle.seats) : '',
  description: vehicle?.description ?? '',
  englishSpeakingDriver: Boolean(vehicle?.englishSpeakingDriver),
  meetAndGreetAtAirport: Boolean(vehicle?.meetAndGreetAtAirport),
  fuelAndInsurance: Boolean(vehicle?.fuelAndInsurance),
  driverMealsAndAccommodation: Boolean(vehicle?.driverMealsAndAccommodation),
  parkingFeesAndTolls: Boolean(vehicle?.parkingFeesAndTolls),
  allTaxes: Boolean(vehicle?.allTaxes),
});

const getCurrentMonthValue = () => {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const buildProfileTourSteps = (profile, vehicles) => {
  const hasLocation =
    typeof profile?.driverLocation?.latitude === 'number' &&
    typeof profile?.driverLocation?.longitude === 'number';
  const hasVehicle = Array.isArray(vehicles) && vehicles.length > 0;

  return [
    {
      id: 'photo',
      label: 'Upload a profile photo',
      description: 'Add a clear headshot so travellers can see who will drive them.',
      tab: 'profile',
      done: Boolean(profile?.profilePhoto),
    },
    {
      id: 'description',
      label: 'Add a driver description',
      description: 'Share your experience, languages, and tour style.',
      tab: 'profile',
      done: Boolean(profile?.description && profile.description.trim()),
    },
    {
      id: 'location',
      label: 'Set your live location',
      description: 'Place your pin on the homepage live map.',
      tab: 'profile',
      done: hasLocation,
    },
    {
      id: 'vehicle',
      label: 'Add your first vehicle',
      description: 'Publish a vehicle so travellers can request quotes.',
      tab: 'vehicles',
      done: hasVehicle,
    },
  ];
};

// Small helper to guarantee we never stay stuck in loading
const withTimeout = (promise, ms = 15000, msg = 'Request timed out') => {
  let id;
  const timeout = new Promise((_, reject) => {
    id = setTimeout(() => reject(new Error(msg)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(id)), timeout]);
};

const getTodayDateKey = () => new Date().toISOString().slice(0, 10);

const buildLocationPromptKey = (profile) => {
  if (!profile) {
    return 'driver-location-prompt:unknown';
  }
  const identifier = profile.email || profile.contactNumber || profile.name || 'driver';
  return `driver-location-prompt:${identifier}`;
};

const hasSeenLocationPromptToday = (profile) => {
  if (typeof window === 'undefined' || !profile) {
    return true;
  }
  const key = buildLocationPromptKey(profile);
  const today = getTodayDateKey();
  return window.localStorage.getItem(key) === today;
};

const markLocationPromptSeenToday = (profile) => {
  if (typeof window === 'undefined' || !profile) {
    return;
  }
  const key = buildLocationPromptKey(profile);
  window.localStorage.setItem(key, getTodayDateKey());
};

const getDeviceLocation = () =>
  new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      reject(new Error('Live location is unavailable in this browser.'));
      return;
    }
    if (!navigator.geolocation) {
      reject(new Error('Live location is not supported on this device.'));
      return;
    }
    if (!window.isSecureContext) {
      reject(
        new Error('Location requires HTTPS or localhost. Enter coordinates manually instead.')
      );
      return;
    }

    let fallbackWatchId = null;
    const cleanup = () => {
      if (fallbackWatchId !== null && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(fallbackWatchId);
      }
    };

    const onSuccess = (position) => {
      cleanup();
      const { latitude, longitude } = position.coords || {};
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        resolve({ latitude, longitude });
      } else {
        reject(new Error('Unable to read coordinates from your device.'));
      }
    };

    const onError = (error) => {
      // If the initial fetch fails with a transient error, try a single watch as a fallback.
      if (
        error?.code === error?.POSITION_UNAVAILABLE &&
        typeof navigator.geolocation.watchPosition === 'function'
      ) {
        fallbackWatchId = navigator.geolocation.watchPosition(onSuccess, (watchError) => {
          cleanup();
          reject(watchError);
        });
        return;
      }
      cleanup();
      reject(error || new Error('Unable to fetch your location.'));
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0,
    });
  });

const DriverDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => parseTabFromHash(location.hash));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');

  const [vehicles, setVehicles] = useState([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehiclesError, setVehiclesError] = useState('');
  const [driverBookingsState, setDriverBookingsState] = useState({
    loading: true,
    error: '',
    items: [],
  });
  const [briefsState, setBriefsState] = useState({
    loading: true,
    error: '',
    items: [],
  });
  const [conversationsState, setConversationsState] = useState({
    loading: true,
    error: '',
    items: [],
  });
  const [driverEarningsState, setDriverEarningsState] = useState(() => ({
    loading: false,
    error: '',
    summary: null,
    history: [],
    selectedMonth: getCurrentMonthValue(),
    uploading: false,
  }));
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [profileTourCompletedAt, setProfileTourCompletedAt] = useState(null);
  const [profileTourSubmitting, setProfileTourSubmitting] = useState(false);
  const [locationPromptOpen, setLocationPromptOpen] = useState(false);
  const [locationPromptForm, setLocationPromptForm] = useState({
    label: '',
    latitude: '',
    longitude: '',
  });
  const [locationPromptStatus, setLocationPromptStatus] = useState('');
  const [locationPromptLocating, setLocationPromptLocating] = useState(false);
  const [locationPromptSaving, setLocationPromptSaving] = useState(false);

  const isMountedRef = useRef(false);
  const profileTourAutoCompleteRef = useRef(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      saveReturnPath();
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const loadOverview = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setOverviewLoading(true);
        setOverviewError('');
      }
      try {
        const data = await withTimeout(fetchDriverOverview(), 15000);
        if (isMountedRef.current) {
          setOverview(data);
          setOverviewError('');
        }
      } catch (error) {
        if (isMountedRef.current) {
          setOverview(null);
          setOverviewError(error.message || 'Unable to load driver dashboard.');
        }
      } finally {
        if (isMountedRef.current) {
          setOverviewLoading(false);
        }
      }
    },
    []
  );

  const refreshVehicles = useCallback(async () => {
    try {
      setVehiclesLoading(true);
      setVehiclesError('');
      const response = await fetchDriverVehicles();
      if (isMountedRef.current) {
        setVehicles(response.vehicles || []);
      }
    } catch (error) {
      if (isMountedRef.current) {
        setVehicles([]);
        setVehiclesError(error.message || 'Unable to load vehicles.');
      }
    } finally {
      if (isMountedRef.current) {
        setVehiclesLoading(false);
      }
    }
  }, []);

  const loadDriverBookings = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setDriverBookingsState((prev) => ({
          ...prev,
          loading: true,
          error: '',
        }));
      }

      try {
        const response = await fetchDriverBookings();
        const items = Array.isArray(response?.bookings) ? response.bookings : [];
        if (isMountedRef.current) {
          setDriverBookingsState({
            loading: false,
            error: '',
            items,
          });
        }
      } catch (error) {
        if (isMountedRef.current) {
          setDriverBookingsState({
            loading: false,
            error: error?.message || 'Unable to load bookings.',
            items: [],
          });
        }
      }
    },
    []
  );

  const loadOpenBriefs = useCallback(async () => {
    try {
      const data = await fetchOpenBriefs();
      const items = Array.isArray(data?.briefs) ? data.briefs : [];
      if (isMountedRef.current) {
        setBriefsState({ loading: false, error: '', items });
      }
    } catch (error) {
      if (isMountedRef.current) {
        setBriefsState({
          loading: false,
          error: error?.message || 'Unable to load quote requests.',
          items: [],
        });
      }
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const data = await fetchConversations();
      const items = Array.isArray(data?.conversations) ? data.conversations : [];
      if (isMountedRef.current) {
        setConversationsState({
          loading: false,
          error: '',
          items,
        });
      }
    } catch (error) {
      if (isMountedRef.current) {
        setConversationsState({
          loading: false,
          error: error?.message || 'Unable to load conversations.',
          items: [],
        });
      }
    }
  }, []);

  const loadDriverEarnings = useCallback(
    async ({ month, forceHistory = false } = {}) => {
      const targetMonth =
        month || driverEarningsState.selectedMonth || getCurrentMonthValue();

      setDriverEarningsState((prev) => ({
        ...prev,
        loading: true,
        error: '',
        selectedMonth: targetMonth,
      }));

      try {
        const shouldRefreshHistory =
          forceHistory ||
          driverEarningsState.history.length === 0 ||
          targetMonth !== driverEarningsState.selectedMonth;

        const summaryPromise = fetchDriverEarningsSummary({ month: targetMonth });
        const historyPromise = shouldRefreshHistory
          ? fetchDriverEarningsHistory()
          : Promise.resolve({ history: driverEarningsState.history });

        const [summary, historyResponse] = await Promise.all([summaryPromise, historyPromise]);

        const historyEntries = Array.isArray(historyResponse?.history)
          ? historyResponse.history
          : driverEarningsState.history;

        setDriverEarningsState((prev) => ({
          ...prev,
          loading: false,
          summary,
          history: historyEntries,
          error: '',
          selectedMonth: targetMonth,
        }));
      } catch (error) {
        setDriverEarningsState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || 'Unable to load earnings.',
        }));
      }
    },
    [driverEarningsState.history, driverEarningsState.selectedMonth]
  );

  const handleDriverProfileSave = useCallback(
    async (payload) => {
      setProfileSaving(true);
      try {
        await updateProfileRequest(payload);
        toast.success('Profile updated.');
        await loadOverview({ silent: true });
      } catch (error) {
        toast.error(error?.message || 'Unable to update profile.');
        throw error;
      } finally {
        setProfileSaving(false);
      }
    },
    [loadOverview]
  );

  const handleDriverPasswordChange = useCallback(async (payload) => {
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

  const handleDriverLicenseSave = useCallback(
    async (payload) => {
      setLicenseSaving(true);
      try {
        await updateDriverLicenseRequest(payload);
        toast.success('License submitted for review.');
        await loadOverview({ silent: true });
      } catch (error) {
        toast.error(error?.message || 'Unable to submit license.');
        throw error;
      } finally {
        setLicenseSaving(false);
      }
    },
    [loadOverview]
  );

  useEffect(() => {
    loadOverview({ silent: false });
    refreshVehicles();
    loadConversations();
    loadDriverBookings();
    loadOpenBriefs();
  }, [refreshVehicles, loadOverview, loadConversations, loadDriverBookings, loadOpenBriefs]);

  useEffect(() => {
    if (!overview) {
      setProfileTourCompletedAt(null);
      return;
    }
    const completionDate =
      overview?.onboarding?.profileTourCompletedAt ||
      overview?.profile?.driverProfileTourCompletedAt ||
      null;
    setProfileTourCompletedAt(completionDate || null);
  }, [overview]);

  useEffect(() => {
    if (activeTab === 'bookings') {
      loadDriverBookings();
    }
  }, [activeTab, loadDriverBookings]);

  useEffect(() => {
    if (activeTab === 'earnings' && !driverEarningsState.summary && !driverEarningsState.loading) {
      loadDriverEarnings({ forceHistory: true });
    }
  }, [activeTab, driverEarningsState.summary, driverEarningsState.loading, loadDriverEarnings]);

  const pendingApproval = useMemo(
    () => /pending approval/i.test(overviewError),
    [overviewError]
  );

  const unreadMessageCount = useMemo(
    () => conversationsState.items.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0),
    [conversationsState.items]
  );

  const pendingBookingsCount = useMemo(
    () => driverBookingsState.items.filter((booking) => booking.status === 'pending').length,
    [driverBookingsState.items]
  );

  const handleEarningsMonthChange = useCallback(
    (month) => {
      if (!month) {
        return;
      }
      loadDriverEarnings({ month });
    },
    [loadDriverEarnings]
  );

  const handleCommissionSlipUpload = useCallback(
    async (commissionId, file) => {
      if (!commissionId || !file) {
        return;
      }
      setDriverEarningsState((prev) => ({
        ...prev,
        uploading: true,
      }));
      try {
        await uploadCommissionSlip(commissionId, file);
        toast.success('Payment slip uploaded.');
        await loadDriverEarnings({
          month: driverEarningsState.selectedMonth,
          forceHistory: true,
        });
      } catch (error) {
        toast.error(error?.message || 'Unable to upload payment slip.');
      } finally {
        setDriverEarningsState((prev) => ({
          ...prev,
          uploading: false,
        }));
      }
    },
    [driverEarningsState.selectedMonth, loadDriverEarnings]
  );

  const handleProfileTourCompletion = useCallback(async () => {
    if (profileTourCompletedAt || profileTourSubmitting) {
      return;
    }
    setProfileTourSubmitting(true);
    try {
      const response = await completeDriverProfileTour();
      const completedAt = response?.completedAt || new Date().toISOString();
      setProfileTourCompletedAt(completedAt);
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              onboarding: {
                ...(prev.onboarding || {}),
                profileTourCompletedAt: completedAt,
                showProfileTour: false,
              },
              profile: prev.profile
                ? { ...prev.profile, driverProfileTourCompletedAt: completedAt }
                : prev.profile,
            }
          : prev
      );
    } catch (error) {
      toast.error(error?.message || 'Unable to update your onboarding checklist.');
    } finally {
      setProfileTourSubmitting(false);
    }
  }, [profileTourCompletedAt, profileTourSubmitting, setOverview, completeDriverProfileTour]);

  const handleVehicleSubmit = async (formPayload) => {
    try {
      // Accepts FormData (preferred) or plain object
      await createVehicle(formPayload);
      toast.success('Vehicle submitted for approval.');
      await refreshVehicles();
    } catch (error) {
      toast.error(error.message || 'Unable to submit vehicle.');
      throw error; // keep button state accurate in the child
    }
  };

  const handleVehicleUpdate = async (vehicleId, formPayload) => {
    try {
      await updateVehicle(vehicleId, formPayload);
      toast.success('Vehicle changes submitted for review.');
      await refreshVehicles();
    } catch (error) {
      toast.error(error.message || 'Unable to update vehicle.');
      throw error;
    }
  };

  const handleVehicleDelete = async (vehicleId) => {
    try {
      await deleteVehicleRequest(vehicleId);
      toast.success('Vehicle deleted.');
      await refreshVehicles();
    } catch (error) {
      // 409 means it still has upcoming bookings; the server explains which.
      toast.error(error.message || 'Unable to delete vehicle.');
      throw error;
    }
  };

  const handleAvailabilityCreate = async (vehicleId, payload) => {
    try {
      await createVehicleAvailability(vehicleId, payload);
      toast.success('Availability added.');
      await refreshVehicles();
    } catch (error) {
      toast.error(error.message || 'Unable to add availability.');
      throw error;
    }
  };

  const handleAvailabilityUpdate = async (vehicleId, availabilityId, payload) => {
    try {
      await updateVehicleAvailability(vehicleId, availabilityId, payload);
      toast.success('Availability updated.');
      await refreshVehicles();
    } catch (error) {
      toast.error(error.message || 'Unable to update availability.');
      throw error;
    }
  };

  const handleAvailabilityDelete = async (vehicleId, availabilityId) => {
    try {
      await deleteVehicleAvailability(vehicleId, availabilityId);
      toast.success('Availability removed.');
      await refreshVehicles();
    } catch (error) {
      toast.error(error.message || 'Unable to remove availability.');
      throw error;
    }
  };

  const scrollToTab = useCallback((tabId) => {
    if (!tabId) {
      return;
    }
    requestAnimationFrame(() => {
      const element = document.getElementById(tabId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, []);

  useEffect(() => {
    const targetTab = parseTabFromHash(location.hash);
    if (targetTab === 'messages') {
      navigate('/portal/driver/messages');
      return;
    }
    if (targetTab !== activeTab) {
      setActiveTab(targetTab);
    }
    scrollToTab(targetTab);
  }, [location.hash, navigate, activeTab, scrollToTab]);

  const handleLogout = useCallback(() => {
    clearStoredToken();
    toast.success('You have been logged out.');
    navigate('/login');
  }, [navigate]);

  const { profile, activity } = overview ?? {};

  useEffect(() => {
    if (!profile) {
      return;
    }
    setLocationPromptForm((prev) => {
      const nextLabel = prev.label || profile.driverLocation?.label || profile.address || '';
      const nextLatitude =
        prev.latitude ||
        (typeof profile.driverLocation?.latitude === 'number'
          ? String(profile.driverLocation.latitude)
          : '');
      const nextLongitude =
        prev.longitude ||
        (typeof profile.driverLocation?.longitude === 'number'
          ? String(profile.driverLocation.longitude)
          : '');
      if (prev.label === nextLabel && prev.latitude === nextLatitude && prev.longitude === nextLongitude) {
        return prev;
      }
      return {
        ...prev,
        label: nextLabel,
        latitude: nextLatitude,
        longitude: nextLongitude,
      };
    });
  }, [profile]);

  useEffect(() => {
    if (!profile || overviewLoading) {
      return;
    }
    if (hasSeenLocationPromptToday(profile)) {
      return;
    }
    setLocationPromptStatus('');
    setLocationPromptOpen(true);
  }, [profile, overviewLoading]);

  const handleLocationPromptClose = useCallback(() => {
    setLocationPromptOpen(false);
    setLocationPromptLocating(false);
    setLocationPromptSaving(false);
    setLocationPromptStatus('');
    if (profile) {
      markLocationPromptSeenToday(profile);
    }
  }, [profile]);

  const handleLocationFieldChange = useCallback((field, value) => {
    setLocationPromptForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleUseDeviceLocation = useCallback(() => {
    setLocationPromptLocating(true);
    setLocationPromptStatus('Requesting your current position...');
    getDeviceLocation()
      .then(({ latitude, longitude }) => {
        setLocationPromptLocating(false);
        setLocationPromptForm((prev) => ({
          ...prev,
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        }));
        setLocationPromptStatus('Location captured. Save to update the live map.');
      })
      .catch((error) => {
        setLocationPromptLocating(false);
        const message =
          error?.message ||
          'Unable to fetch your location. Check permissions or enter coordinates manually.';
        setLocationPromptStatus(message);
        toast.error(message);
        console.warn('Geolocation error', error);
      });
  }, []);

  const handleSaveLiveLocation = useCallback(async () => {
    const label = locationPromptForm.label.trim();
    const hasLatitude = String(locationPromptForm.latitude ?? '').trim() !== '';
    const hasLongitude = String(locationPromptForm.longitude ?? '').trim() !== '';
    const latitude = Number(locationPromptForm.latitude);
    const longitude = Number(locationPromptForm.longitude);

    if (!label) {
      toast.error('Add a short label for where you are today.');
      return;
    }
    if (!hasLatitude || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      toast.error('Enter a valid latitude.');
      return;
    }
    if (!hasLongitude || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast.error('Enter a valid longitude.');
      return;
    }

    setLocationPromptSaving(true);
    setLocationPromptStatus('Saving your live location...');
    try {
      const payload = new FormData();
      payload.append('currentLocationLabel', label);
      payload.append('currentLatitude', latitude.toString());
      payload.append('currentLongitude', longitude.toString());
      await updateProfileRequest(payload);
      toast.success('Live location updated for today.');
      markLocationPromptSeenToday(profile);
      setLocationPromptOpen(false);
      setLocationPromptStatus('');
      await loadOverview({ silent: true });
    } catch (error) {
      console.warn('Live location update failed', error);
      toast.error(error?.message || 'Unable to update live location.');
    } finally {
      setLocationPromptSaving(false);
    }
  }, [locationPromptForm, profile, loadOverview]);

  const handleUnavailableToday = useCallback(async () => {
    setLocationPromptSaving(true);
    setLocationPromptStatus('Marking you as unavailable for today...');
    try {
      const payload = new FormData();
      payload.append('clearLocation', 'true');
      await updateProfileRequest(payload);
      toast.success("You're marked unavailable today.");
      markLocationPromptSeenToday(profile);
      setLocationPromptOpen(false);
      setLocationPromptStatus('');
      setLocationPromptForm({ label: '', latitude: '', longitude: '' });
      await loadOverview({ silent: true });
    } catch (error) {
      console.warn('Mark unavailable failed', error);
      toast.error(error?.message || 'Unable to update your availability.');
    } finally {
      setLocationPromptSaving(false);
    }
  }, [profile, loadOverview]);

  const profileTourSteps = useMemo(
    () => buildProfileTourSteps(profile, vehicles),
    [profile, vehicles]
  );
  const profileTourNextStep = useMemo(
    () =>
      profileTourSteps.length > 0
        ? profileTourSteps.find((step) => !step.done) ||
          profileTourSteps[profileTourSteps.length - 1]
        : null,
    [profileTourSteps]
  );
  const profileTourComplete = useMemo(
    () => profileTourSteps.length > 0 && profileTourSteps.every((step) => step.done),
    [profileTourSteps]
  );
  const shouldShowProfileTour =
    !profileTourCompletedAt && (overview?.onboarding?.showProfileTour ?? true);
  const currentTabId = useMemo(
    () => NAV_ITEMS.find((item) => item.id === activeTab || item.hash === activeTab)?.id || 'overview',
    [activeTab]
  );

  const goToTab = useCallback(
    (tabId) => {
      if (!tabId) {
        return;
      }
      if (tabId === 'messages') {
        navigate('/portal/driver/messages');
        return;
      }
      if (tabId === 'briefs') {
        navigate('/briefs');
        return;
      }
      setActiveTab(tabId);
      navigate(`#${tabId}`);
      scrollToTab(tabId);
    },
    [navigate, scrollToTab]
  );

  useEffect(() => {
    if (!profileTourComplete) {
      profileTourAutoCompleteRef.current = false;
    }
  }, [profileTourComplete]);

  useEffect(() => {
    if (profileTourComplete && !profileTourCompletedAt && !profileTourAutoCompleteRef.current) {
      profileTourAutoCompleteRef.current = true;
      handleProfileTourCompletion();
    }
  }, [profileTourComplete, profileTourCompletedAt, handleProfileTourCompletion]);

  const handleNavSelect = (item, event) => {
    if (event) {
      event.preventDefault();
    }
    if (item.href) {
      navigate(item.href);
      return;
    }
    goToTab(item.hash || item.id);
  };

  if (overviewLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas font-sans text-sm text-muted">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-brand" />
          Loading driver dashboard…
        </div>
      </div>
    );
  }

  if (overviewError && !overview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas px-5 font-sans">
        <div className="w-full max-w-[420px] rounded-[20px] bg-white p-8 text-center shadow-card">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-[#e0a52c]" />
          <h1 className="text-xl font-extrabold text-ink">Driver dashboard unavailable</h1>
          <p className="mt-3 text-sm text-muted">
            {pendingApproval
              ? 'Your driver application is still under review. We will email you as soon as it is approved.'
              : overviewError}
          </p>
          <p className="mt-6 text-xs text-muted-soft">
            Need help? Email{' '}
            <a href="mailto:support@carwithdriver.lk" className="font-semibold text-brand-dark underline">
              support@carwithdriver.lk
            </a>
            .
          </p>
        </div>
      </div>
    );
  }

  const firstName = profile?.name?.split(' ')?.[0] || 'driver';
  const driverName = profile?.name || 'Driver';
  const city = profile?.driverLocation?.label || profile?.address || 'Colombo';
  // "New quote requests" = open tour briefs travellers posted that this driver hasn't answered yet.
  const quoteRequests = briefsState.items.filter((brief) => !brief.hasResponded);
  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    active: currentTabId === item.id || activeTab === item.hash,
    badge:
      item.id === 'messages'
        ? unreadMessageCount
        : item.id === 'bookings'
        ? pendingBookingsCount
        : 0,
  }));
  const openDrawer = () => setDrawerOpen(true);
  const tabContext = {
    profile,
    driverName,
    onMenu: openDrawer,
    onNavigate: goToTab,
    onLogout: handleLogout,
    vehicles,
    vehiclesLoading,
    vehiclesError,
    onVehicleRefresh: refreshVehicles,
    onVehicleCreate: handleVehicleSubmit,
    onVehicleUpdate: handleVehicleUpdate,
    onVehicleDelete: handleVehicleDelete,
    onAvailabilityCreate: handleAvailabilityCreate,
    onAvailabilityUpdate: handleAvailabilityUpdate,
    onAvailabilityDelete: handleAvailabilityDelete,
    driverBookingsState,
    onBookingsRefresh: () => loadDriverBookings({ silent: false }),
    driverEarningsState,
    onEarningsRefresh: (options) => loadDriverEarnings(options ?? {}),
    onEarningsMonthChange: handleEarningsMonthChange,
    onEarningsSlipUpload: handleCommissionSlipUpload,
    onProfileSave: handleDriverProfileSave,
    // Refresh profile data quietly after a cover photo upload/removal.
    onProfileRefresh: () => loadOverview({ silent: true }),
    onPasswordChange: handleDriverPasswordChange,
    onLicenseSave: handleDriverLicenseSave,
    profileSaving,
    passwordSaving,
    licenseSaving,
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#e7ebef] font-sans text-ink lg:flex">
      <DriverDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navItems={navItems}
        onSelect={(item, event) => handleNavSelect(item, event)}
        user={{ name: driverName, roleLabel: 'Approved driver', image: profile?.profilePhoto }}
        onLogout={handleLogout}
      />
      <DashboardSidebar
        navItems={navItems}
        onSelect={(item) => handleNavSelect(item)}
        user={{ name: driverName, roleLabel: 'Approved driver', image: profile?.profilePhoto }}
        onLogout={handleLogout}
      />
      <DailyLocationPrompt
        open={locationPromptOpen}
        form={locationPromptForm}
        status={locationPromptStatus}
        locating={locationPromptLocating}
        saving={locationPromptSaving}
        onClose={handleLocationPromptClose}
        onFieldChange={handleLocationFieldChange}
        onUseDeviceLocation={handleUseDeviceLocation}
        onSave={handleSaveLiveLocation}
        onUnavailable={handleUnavailableToday}
      />
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-canvas shadow-[0_0_60px_rgba(15,31,45,0.06)] lg:mx-0 lg:max-w-none lg:flex-1 lg:shadow-none">
        {profile?.commissionFrozenAt ? (
          // Unpaid-commission freeze (server: commissionFreezeService). Shown on every tab.
          <div className="m-3 rounded-[14px] border border-rose-200 bg-rose-50 p-4 text-rose-800 lg:mx-6 lg:mt-5">
            <b className="text-[14px]">Your account is frozen</b>
            <p className="mt-1 text-[12.5px] leading-relaxed">
              Commission for {formatFrozenPeriods(profile.commissionFrozenPeriods)} is unpaid. Until it is paid you can&apos;t send quotes or
              messages, travellers can&apos;t book you, and your profile is hidden. Pay and upload the slip; your account unfreezes once we confirm it.
            </p>
            <button type="button" onClick={() => goToTab('earnings')} className="mt-2.5 rounded-[10px] bg-rose-600 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-rose-700">
              Pay commission
            </button>
          </div>
        ) : null}
        {currentTabId === 'overview' ? (
          <DriverOverview
            firstName={firstName}
            driverName={driverName}
            driverImage={profile?.profilePhoto}
            city={city}
            activity={activity}
            quoteRequests={quoteRequests}
            quoteCount={quoteRequests.length}
            unreadCount={unreadMessageCount}
            showTour={shouldShowProfileTour}
            steps={profileTourSteps}
            nextStep={profileTourNextStep}
            allDone={profileTourComplete}
            onNavigate={goToTab}
            onMenu={openDrawer}
          />
        ) : (
          renderTabContent(currentTabId, tabContext)
        )}
      </div>
    </div>
  );
};

const FROZEN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// ['2026-11'] -> 'November 2026'
const formatFrozenPeriods = (periods) => {
  const names = (periods || []).map((key) => {
    const [year, month] = String(key).split('-').map(Number);
    return FROZEN_MONTHS[month - 1] ? `${FROZEN_MONTHS[month - 1]} ${year}` : key;
  });
  return names.length ? names.join(', ') : 'a previous month';
};

// ---- Driver Overview (redesign direction 1b "Bold header") ----
const OverviewStat = ({ value, label, star = false }) => (
  <div className="flex-1 rounded-2xl bg-white p-[13px] shadow-card">
    <div className="flex items-center gap-[3px] text-[22px] font-extrabold text-ink">
      {value}
      {star ? <Star className="mt-0.5 h-3 w-3" fill="#f5b042" stroke="none" /> : null}
    </div>
    <div className="text-[11px] font-semibold text-muted-soft">{label}</div>
  </div>
);

const BannerStat = ({ value, label, star = false }) => (
  <div className="rounded-[14px] bg-white/15 px-5 py-3.5 text-center">
    <div className="flex items-center justify-center gap-1 text-[22px] font-extrabold">
      {value}
      {star ? <Star className="mt-0.5 h-3.5 w-3.5" fill="#f5b042" stroke="none" /> : null}
    </div>
    <div className="text-[11.5px] text-white/80">{label}</div>
  </div>
);

const DriverOverview = ({
  firstName,
  driverName,
  driverImage,
  activity,
  quoteRequests = [],
  quoteCount = 0,
  unreadCount = 0,
  showTour,
  steps,
  nextStep,
  allDone,
  onNavigate,
  onMenu,
}) => {
  const count = quoteRequests.length;
  return (
    <>
      <div className="lg:hidden">
      <MobileHeader
        onMenu={onMenu}
        right={
          <div className="flex items-center gap-2">
            <NotificationBell
              onClick={() => onNavigate(quoteCount > 0 ? 'briefs' : 'messages')}
              hasUnread={quoteCount > 0 || unreadCount > 0}
            />
            <Avatar name={driverName} image={driverImage} tone="light" className="h-10 w-10 text-[15px]" />
          </div>
        }
      >
        <div className="pt-3.5">
          <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/80">
            DRIVER DASHBOARD
          </p>
          <h1 className="mt-1 text-[25px] font-extrabold leading-tight tracking-tight">
            Welcome back, {firstName}
          </h1>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[12px] font-bold">
            <BadgeCheck className="h-3.5 w-3.5" />
            Approved driver
          </div>
        </div>
      </MobileHeader>

      <Sheet>
        <div className="flex gap-2.5">
          <OverviewStat value={activity?.totalTrips ?? 0} label="Trips" />
          <OverviewStat value={activity?.upcomingTrips ?? 0} label="Upcoming" />
          <OverviewStat value={Number(activity?.rating ?? 0).toFixed(1)} label="Rating" star />
        </div>

        {showTour ? (
          <ProfileCompletionCard
            steps={steps}
            nextStep={nextStep}
            allDone={allDone}
            onNavigate={onNavigate}
          />
        ) : null}

        <div className="mb-2.5 mt-5 flex items-center gap-2.5 px-0.5">
          <b className="text-base font-extrabold text-ink">New quote requests</b>
          {count > 0 ? (
            <span className="rounded-full bg-[#f43f5e] px-2 py-0.5 text-[11px] font-extrabold text-white">
              {count}
            </span>
          ) : null}
        </div>
        {count === 0 ? (
          <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            No quote requests yet. They&apos;ll appear here when travellers reach out.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {quoteRequests.slice(0, 5).map((brief, index) => (
              <QuoteRequestCard
                key={brief.id || index}
                brief={brief}
                tone={index % 2 === 0 ? 'amber' : 'purple'}
                onRespond={() => onNavigate('briefs')}
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
              <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/80">DRIVER DASHBOARD</p>
              <div className="mt-1 text-[28px] font-extrabold tracking-tight">Welcome back, {firstName}</div>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[12.5px] font-bold">
                <BadgeCheck className="h-3.5 w-3.5" />
                Approved driver
              </div>
            </div>
            <div className="flex flex-shrink-0 gap-3.5">
              <BannerStat value={activity?.totalTrips ?? 0} label="Trips" />
              <BannerStat value={activity?.upcomingTrips ?? 0} label="Upcoming" />
              <BannerStat value={Number(activity?.rating ?? 0).toFixed(1)} label="Rating" star />
            </div>
          </div>

          <div className="mt-[22px] grid grid-cols-[1.3fr_1fr] gap-5">
            <div className="rounded-[18px] bg-white p-5 shadow-card">
              <div className="mb-3.5 flex items-center gap-2.5">
                <b className="text-[16px] text-ink">New quote requests</b>
                {count > 0 ? (
                  <span className="rounded-full bg-[#f43f5e] px-2 py-0.5 text-[11px] font-extrabold text-white">{count}</span>
                ) : null}
              </div>
              {count === 0 ? (
                <p className="text-sm text-muted">No quote requests yet. They&apos;ll appear here when travellers reach out.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {quoteRequests.slice(0, 5).map((brief, index) => (
                    <QuoteRequestCard
                      key={brief.id || index}
                      brief={brief}
                      tone={index % 2 === 0 ? 'amber' : 'purple'}
                      onRespond={() => onNavigate('briefs')}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-5">
              {showTour ? (
                <ProfileCompletionCard steps={steps} nextStep={nextStep} allDone={allDone} onNavigate={onNavigate} />
              ) : null}
              <div className="rounded-[18px] bg-white p-5 shadow-card">
                <b className="text-[16px] text-ink">At a glance</b>
                <div className="mt-3 flex flex-col gap-2.5 text-[13.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">New quote requests</span>
                    <b className="text-ink">{count}</b>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Unread messages</span>
                    <b className="text-ink">{unreadCount}</b>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Upcoming trips</span>
                    <b className="text-ink">{activity?.upcomingTrips ?? 0}</b>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const ProfileCompletionCard = ({ steps = [], nextStep, allDone, onNavigate }) => {
  const total = steps.length;
  const done = steps.filter((step) => step.done).length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="mt-3.5 rounded-[20px] p-[17px] text-white"
      style={{ background: 'linear-gradient(135deg,#0f1f2d,#1c3345)' }}
    >
      <div className="flex items-center justify-between">
        <b className="text-[15px]">Finish your profile</b>
        <span className="rounded-full bg-white/15 px-[9px] py-1 text-[12px] font-extrabold">
          {done} / {total}
        </span>
      </div>
      <div className="my-3 h-2 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${percent}%`, background: 'linear-gradient(90deg,#2ecc71,#7bed9f)' }}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[13.5px] text-white/85">
          {allDone ? 'Your profile is complete' : `Next: ${nextStep?.label || 'complete your profile'}`}
        </span>
        {allDone ? null : (
          <button
            type="button"
            onClick={() => onNavigate(nextStep?.tab || 'profile')}
            className="flex-shrink-0 rounded-[10px] bg-[#2ecc71] px-3.5 py-2 text-[13px] font-extrabold text-[#08331d]"
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
};

const QuoteRequestCard = ({ brief, tone = 'amber', onRespond }) => {
  const name = brief.traveler?.name || 'Traveller';
  const start = formatDate(brief.startDate);
  const end = formatDate(brief.endDate);
  const dateLabel =
    start !== '—' && end !== '—'
      ? `${start} – ${end}`
      : start !== '—'
      ? start
      : 'Dates flexible';
  const route =
    [brief.startLocation, brief.endLocation].filter(Boolean).join(' → ') || 'Route to confirm';
  const adults = brief.adults || 0;
  const children = brief.children || 0;
  const paxLabel = `${adults} adult${adults === 1 ? '' : 's'}${
    children > 0 ? ` · ${children} child${children === 1 ? '' : 'ren'}` : ''
  }`;
  const offersLabel =
    brief.offersCount > 0 ? `${brief.offersCount} offer${brief.offersCount === 1 ? '' : 's'}` : null;
  const borderColor = tone === 'amber' ? '#10a35a' : '#d6e9fb';
  return (
    <div
      className="min-w-0 rounded-[18px] bg-white p-[15px] shadow-card"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="mb-2.5 flex items-center gap-[11px]">
        <Avatar name={name} tone={tone} className="h-10 w-10 text-sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-ink">{name}</div>
          <div className="truncate text-[12px] text-muted-soft">
            {route} · {dateLabel}
          </div>
        </div>
      </div>
      <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
        <span>{paxLabel}</span>
        {brief.country ? <span>· {brief.country}</span> : null}
        {offersLabel ? <span>· {offersLabel}</span> : null}
      </div>
      {brief.message ? (
        <p className="mb-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{brief.message}</p>
      ) : null}
      <button
        type="button"
        onClick={onRespond}
        className="w-full rounded-[11px] bg-brand px-3 py-[11px] text-[13.5px] font-bold text-white transition hover:bg-brand-dark"
      >
        Send offer
      </button>
    </div>
  );
};

const DailyLocationPrompt = ({
  open,
  form,
  status,
  locating,
  saving,
  onClose,
  onFieldChange,
  onUseDeviceLocation,
  onSave,
  onUnavailable,
}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Daily check-in
            </p>
            <h2 className="text-lg font-semibold text-slate-900">Set your live location for today</h2>
            <p className="text-sm text-slate-600">
              Share where you&apos;re starting from or mark yourself unavailable for the day.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Location label
            </label>
            <input
              type="text"
              value={form.label}
              onChange={(event) => onFieldChange?.('label', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="Eg: Kandy city centre, Ella, Colombo airport"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Latitude
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.000001"
                value={form.latitude}
                onChange={(event) => onFieldChange?.('latitude', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="6.927079"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Longitude
              </label>
              <input
                type="number"
                inputMode="decimal"
                step="0.000001"
                value={form.longitude}
                onChange={(event) => onFieldChange?.('longitude', event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="79.861244"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onUseDeviceLocation}
              disabled={locating || saving}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {locating ? 'Locating...' : 'Use my device location'}
            </button>
            <p className="text-xs text-slate-500">
              {status || 'Coordinates help us place you correctly on the live map.'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Update at first login each day so travellers know if you&apos;re available.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onUnavailable}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <XCircle className="h-4 w-4" />
              I&apos;m unavailable today
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/70"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save live location
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const OverviewPanel = ({ profile }) => (
  <div className="space-y-6">
    <div>
      <h2 className="text-lg font-semibold text-slate-900">Profile summary</h2>
      <p className="text-sm text-slate-500">
        Travellers see these details when browsing your services on Car With Driver.
      </p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <InfoCard title="Contact" icon={Phone}>
        <p className="text-sm text-slate-700">{profile?.contactNumber || 'Not provided'}</p>
        <p className="text-xs text-slate-500">{profile?.email}</p>
      </InfoCard>
      <InfoCard title="Live location" icon={MapPin}>
        <p className="text-sm text-slate-700">
          {profile?.driverLocation?.label ||
            profile?.address ||
            'Not provided'}
        </p>
        {profile?.driverLocation?.label && profile?.address ? (
          <p className="text-xs text-slate-500">Base: {profile.address}</p>
        ) : null}
      </InfoCard>
      <InfoCard title="TripAdvisor" icon={BadgeCheck}>
        {profile?.tripAdvisor ? (
          <a
            href={profile.tripAdvisor}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            View profile
          </a>
        ) : (
          <p className="text-sm text-slate-500">No link added</p>
        )}
      </InfoCard>
      <InfoCard title="Member since" icon={CalendarCheck}>
        <p className="text-sm text-slate-700">{formatDate(profile?.createdAt)}</p>
      </InfoCard>
    </div>

    <div className="rounded-2xl border border-slate-200 p-5">
      <h3 className="text-sm font-semibold text-slate-900">About you</h3>
      <p className="mt-2 text-sm text-slate-600">
        {profile?.description || 'Add a short bio so travellers know what makes your tours special.'}
      </p>
    </div>

    <DeleteAccountCard requiresPassword={profile?.authProvider === 'local'} isDriver />
  </div>
);

// Desktop page title used where the green phone header is hidden on large screens.
const DesktopPageTitle = ({ eyebrow, title, subtitle, actions }) => (
  <div className="mb-6 hidden items-end justify-between gap-4 lg:flex">
    <div className="min-w-0">
      <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-brand-dark">{eyebrow}</p>
      <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-ink">{title}</h1>
      {subtitle ? <p className="mt-1 text-[13.5px] text-muted-soft">{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex flex-shrink-0 items-center gap-2">{actions}</div> : null}
  </div>
);

const StatTile = ({ label, value, hint, icon: Icon, tone = 'bg-brand-tint text-brand-dark' }) => (
  <div className="rounded-[18px] bg-white p-5 shadow-card">
    <div className="flex items-start justify-between gap-3">
      <p className="text-[12px] font-bold uppercase tracking-wide text-muted-soft">{label}</p>
      {Icon ? (
        <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      ) : null}
    </div>
    <p className="mt-1 text-[26px] font-extrabold tracking-tight text-ink">{value}</p>
    {hint ? <p className="mt-1 text-[12.5px] text-muted-soft">{hint}</p> : null}
  </div>
);

const VEHICLE_STATUS_DISPLAY = {
  approved: { label: 'Live', cls: 'bg-brand-tint text-brand-dark' },
  pending: { label: 'In review', cls: 'bg-[#fdf0d8] text-[#a86a15]' },
  rejected: { label: 'Rejected', cls: 'bg-[#ffe4e9] text-[#e11d48]' },
};

const INSURANCE_ATTENTION_STATES = ['missing', 'expiring', 'expired', 'rejected'];

const VehiclesPanel = ({ onMenu, driverName, driverImage, vehicles, loading, error, onRefresh, onCreate, onUpdate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(() => buildInitialVehicleForm());
  const [pendingFiles, setPendingFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [insuranceFiles, setInsuranceFiles] = useState([]);
  const [insuranceDates, setInsuranceDates] = useState({ startDate: '', endDate: '' });
  const insuranceInputRef = useRef(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState('');

  const clearPendingFiles = useCallback(() => {
    setPendingFiles((prev) => {
      prev.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
      return [];
    });
    setInsuranceFiles((prev) => {
      prev.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
      return [];
    });
  }, []);

  const handleInsuranceFiles = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = '';
    if (picked.length === 0) return;
    try {
      const processed = await Promise.all(picked.map((file) => compressImageIfNeeded(file, VEHICLE_IMAGE_TARGET_MB)));
      setInsuranceFiles((prev) => {
        const combined = [...prev, ...processed.map((file) => Object.assign(file, { preview: URL.createObjectURL(file) }))];
        combined.slice(MAX_INSURANCE_IMAGES).forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
        if (combined.length > MAX_INSURANCE_IMAGES) toast.error(`You can upload up to ${MAX_INSURANCE_IMAGES} passenger insurance photos.`);
        return combined.slice(0, MAX_INSURANCE_IMAGES);
      });
    } catch (error) {
      toast.error(error?.message || 'Unable to add that photo. Please try another one.');
    }
  };

  const removeInsuranceFile = (target) => {
    setInsuranceFiles((prev) => {
      if (target.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((file) => file !== target);
    });
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    // Compress all images proactively for mobile compatibility
    // Mobile photos are often 5-20MB even if they look small
    const needsCompression = acceptedFiles.some((file) => file.size > VEHICLE_IMAGE_TARGET_MB * 1024 * 1024);
    let processedFiles = acceptedFiles;

    if (needsCompression) {
      try {
        toast.loading('Optimizing images for upload...', { id: 'compress-vehicle' });
        processedFiles = await Promise.all(
          acceptedFiles.map((file) => compressImageIfNeeded(file, VEHICLE_IMAGE_TARGET_MB))
        );
        toast.success('Images optimized successfully', { id: 'compress-vehicle' });
      } catch (error) {
        toast.error(error?.message || 'Unable to optimize images. Please choose smaller images or try again.', { id: 'compress-vehicle' });
        return;
      }
    }

    // Validate all files are under the size limit
    const oversizedFiles = processedFiles.filter((file) => file.size > MAX_IMAGE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map((f) => f.name).join(', ');
      toast.error(`These images are too large (max 10MB each): ${names}`);
      return;
    }

    setPendingFiles((prev) => {
      const mapped = processedFiles.map((file) =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );
      const combined = [...prev, ...mapped];
      const limited = combined.slice(0, MAX_VEHICLE_IMAGES);
      const dropped = combined.slice(MAX_VEHICLE_IMAGES);
      dropped.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
      if (prev.length + processedFiles.length > MAX_VEHICLE_IMAGES) {
        toast.error(`A vehicle has ${MAX_VEHICLE_IMAGES} photos. Remove one to add another.`);
      }
      const totalBytes = limited.reduce((sum, file) => sum + (file.size || 0), 0);
      if (totalBytes > MAX_VEHICLE_UPLOAD_BYTES) {
        mapped.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
        toast.error('Total upload size must stay under 50MB. Try adding fewer photos at once.');
        return prev;
      }
      return limited;
    });
  }, []);

  const onDropRejected = useCallback((fileRejections) => {
    const messages = new Set();
    fileRejections.forEach(({ errors }) => {
      errors.forEach((error) => {
        if (error.code === 'too-many-files') {
          messages.add(`A vehicle has ${MAX_VEHICLE_IMAGES} photos. Add up to ${MAX_VEHICLE_IMAGES} at a time.`);
        } else if (error.code === 'file-invalid-type') {
          messages.add('Only image files are allowed.');
        } else {
          messages.add(error.message || 'Unable to add that file.');
        }
      });
    });
    messages.forEach((message) => toast.error(message));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: MAX_VEHICLE_IMAGES,
    onDrop,
    onDropRejected,
  });

  // Clean up previews whenever the files list changes or on unmount
  useEffect(() => {
    return () => {
      pendingFiles.forEach((file) => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
    };
  }, [pendingFiles]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleRemoveFile = (name) => {
    setPendingFiles((prev) => {
      prev
        .filter((file) => file.name === name && file.preview)
        .forEach((file) => URL.revokeObjectURL(file.preview));
      return prev.filter((file) => file.name !== name);
    });
  };

  const handleNewVehicleClick = () => {
    if (editingVehicle) {
      clearPendingFiles();
      setEditingVehicle(null);
      setFormData(buildInitialVehicleForm());
      setShowForm(false);
      return;
    }

    if (showForm) {
      clearPendingFiles();
      setFormData(buildInitialVehicleForm());
      setShowForm(false);
      return;
    }

    clearPendingFiles();
    setEditingVehicle(null);
    setFormData(buildInitialVehicleForm());
    setInsuranceDates({ startDate: '', endDate: '' });
    setShowForm(true);
  };

  const handleEditVehicle = (vehicle) => {
    clearPendingFiles();
    setFormData(buildVehicleFormFromData(vehicle));
    setExistingImages(Array.isArray(vehicle.images) ? [...vehicle.images] : []);
    setInsuranceDates({
      startDate: toDateInputValue(vehicle.insurance?.startDate),
      endDate: toDateInputValue(vehicle.insurance?.endDate),
    });
    setEditingVehicle(vehicle);
    setShowForm(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const sanitizedModel = formData.model.trim();
    if (!sanitizedModel) {
      toast.error('Vehicle model is required.');
      return;
    }

    const parsedYear = Number(formData.year);
    if (Number.isNaN(parsedYear) || parsedYear < 1990 || parsedYear > new Date().getFullYear() + 1) {
      toast.error('Enter a valid year.');
      return;
    }

    // Checked against every other listing on the server, which refuses a
    // registration that is already published (one listing per vehicle).
    const registrationNumber = formData.registrationNumber.trim();
    if (!registrationNumber) {
      toast.error('Enter the vehicle registration number.');
      return;
    }

    const parsedPrice = Number(formData.pricePerDay);
    if (Number.isNaN(parsedPrice) || parsedPrice < 35 || parsedPrice > 250) {
      toast.error('Set a price between $35 and $250 per day.');
      return;
    }

    const parsedSeats = formData.seats ? Number(formData.seats) : undefined;
    if (parsedSeats !== undefined && (Number.isNaN(parsedSeats) || parsedSeats < 1)) {
      toast.error('Seats must be at least 1.');
      return;
    }

    // Photos and insurance are checked here so the driver hears about a problem
    // before anything uploads; the server applies the same rules.
    const keptPhotoCount = editingVehicle ? existingImages.length : 0;
    if (keptPhotoCount + pendingFiles.length < MIN_VEHICLE_IMAGES) {
      toast.error(`Add ${MIN_VEHICLE_IMAGES} photos of the vehicle. You have ${keptPhotoCount + pendingFiles.length}.`);
      return;
    }
    const insuranceOnFile = editingVehicle?.insurance;
    // Missing, expired or rejected insurance cannot carry a save, and neither can
    // the old document once we have asked for it to be verified again.
    const needsNewCard =
      !insuranceOnFile ||
      ['missing', 'expired', 'rejected'].includes(insuranceOnFile.state) ||
      Boolean(insuranceOnFile.requestedAt);
    if (needsNewCard && insuranceFiles.length === 0) {
      toast.error('Upload a photo of your current passenger insurance document.');
      return;
    }
    if (!insuranceDates.startDate || !insuranceDates.endDate) {
      toast.error('Enter the start and end date of your insurance cover.');
      return;
    }
    if (insuranceDates.endDate <= insuranceDates.startDate) {
      toast.error('The insurance end date must be after the start date.');
      return;
    }
    if (insuranceDates.endDate < new Date().toISOString().slice(0, 10)) {
      toast.error('This insurance cover has already expired. Upload your current passenger insurance document.');
      return;
    }

    const payload = new FormData();
    payload.append('model', sanitizedModel);
    payload.append('registrationNumber', registrationNumber);
    payload.append('year', String(parsedYear));
    payload.append('pricePerDay', String(parsedPrice));
    if (parsedSeats) payload.append('seats', String(parsedSeats));
    if (formData.description.trim()) payload.append('description', formData.description.trim());

    // When editing, tell the backend which existing images to keep (the rest are removed).
    if (editingVehicle) {
      payload.append('existingImages', JSON.stringify(existingImages));
    }

    pendingFiles
      .slice(0, Math.max(MAX_VEHICLE_IMAGES - keptPhotoCount, 0))
      .forEach((file) => payload.append('images', file));

    payload.append('insuranceStartDate', insuranceDates.startDate);
    payload.append('insuranceEndDate', insuranceDates.endDate);
    insuranceFiles.forEach((file) => payload.append('insuranceImages', file));

    VEHICLE_FEATURES.forEach(({ key }) => {
      if (formData[key]) {
        payload.append(key, 'true');
      }
    });

    setSubmitting(true);
    try {
      if (editingVehicle && onUpdate) {
        await onUpdate(editingVehicle.id, payload);
      } else {
        await onCreate(payload);
      }
      setFormData(buildInitialVehicleForm());
      clearPendingFiles();
      setExistingImages([]);
      setInsuranceDates({ startDate: '', endDate: '' });
      setEditingVehicle(null);
      setShowForm(false);
    } catch (error) {
      console.warn('Vehicle submit/update failed', error);
    } finally {
      setSubmitting(false);
    }
  };

  const photoCount = (editingVehicle ? existingImages.length : 0) + pendingFiles.length;

  const head = showForm ? (
    <MobileHeader
      onBack={handleNewVehicleClick}
      cancelLabel="Cancel"
      right={<Avatar name={driverName} image={driverImage} tone="light" className="h-10 w-10 text-[15px]" />}
      eyebrow="FLEET"
      title={editingVehicle ? 'Edit vehicle' : 'Submit a vehicle'}
      subtitle="Complete details help admins approve faster."
    />
  ) : (
    <MobileHeader
      onMenu={onMenu}
      right={<Avatar name={driverName} image={driverImage} tone="light" className="h-10 w-10 text-[15px]" />}
      eyebrow="FLEET"
      title="My Vehicles"
      subtitle="Manage the vehicles travellers can book."
    />
  );

  if (loading) {
    return (
      <>
        {head}
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading vehicles…
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
          <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm font-semibold text-[#e11d48]">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="rounded-full border border-[#e2e8ea] px-4 py-2 text-sm font-semibold text-ink transition hover:border-muted-soft"
            >
              Try again
            </button>
          </div>
        </Sheet>
      </>
    );
  }

  const vehicleList = Array.isArray(vehicles) ? vehicles : [];
  const liveCount = vehicleList.filter((v) => v.status === 'approved').length;
  const reviewCount = vehicleList.filter((v) => v.status === 'pending').length;
  const rejectedCount = vehicleList.filter((v) => v.status === 'rejected').length;
  const insuranceAttention = vehicleList.filter(
    (v) => INSURANCE_ATTENTION_STATES.includes(v.insurance?.state) || v.insurance?.requestedAt
  ).length;
  const lowestPrice = vehicleList.length ? Math.min(...vehicleList.map((v) => Number(v.pricePerDay) || 0)) : 0;
  const highestPrice = vehicleList.length ? Math.max(...vehicleList.map((v) => Number(v.pricePerDay) || 0)) : 0;

  return (
    <>
      <div className="lg:hidden">{head}</div>
      <Sheet wide className="lg:!mt-8">
        {showForm ? (
          <>
          <DesktopPageTitle
            eyebrow="Fleet"
            title={editingVehicle ? `Edit ${editingVehicle.model || 'vehicle'}` : 'Submit a vehicle'}
            subtitle="Complete details and clear photos help our team approve your vehicle faster."
            actions={
              <button
                type="button"
                onClick={handleNewVehicleClick}
                className="inline-flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-5 text-[13.5px] font-bold text-ink transition hover:border-muted-soft"
              >
                Cancel
              </button>
            }
          />
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:gap-6"
          >
            {/* On phones these wrappers vanish (display: contents) and `order` keeps the original card order. */}
            <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-6">
            <div className="order-1 rounded-[18px] bg-white p-4 shadow-card lg:order-none lg:p-6">
              <div className="mb-4 hidden border-b border-hairline pb-3 lg:block">
                <h3 className="text-[14.5px] font-extrabold text-ink">Vehicle details</h3>
                <p className="mt-0.5 text-[12px] text-muted-soft">What travellers see on your listing.</p>
              </div>
              <div className="flex gap-2.5">
                <div className="min-w-0 flex-1">
                  <label htmlFor="model" className="text-[12.5px] font-bold text-ink-soft">Model</label>
                  <input
                    id="model" name="model" type="text" required value={formData.model} onChange={handleChange}
                    placeholder="Toyota Prius"
                    className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none"
                  />
                </div>
                <div className="w-24">
                  <label htmlFor="year" className="text-[12.5px] font-bold text-ink-soft">Year</label>
                  <input
                    id="year" name="year" type="number" required min="1990" max={new Date().getFullYear() + 1}
                    value={formData.year} onChange={handleChange}
                    className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-3.5">
                <label htmlFor="registrationNumber" className="text-[12.5px] font-bold text-ink-soft">Registration number</label>
                <input
                  id="registrationNumber" name="registrationNumber" type="text" required maxLength={20}
                  value={formData.registrationNumber} onChange={handleChange} placeholder="CAB-1234" autoCapitalize="characters"
                  className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-semibold uppercase text-ink placeholder:font-normal placeholder:normal-case placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
                />
                <p className="mt-1 text-[11.5px] text-muted-soft">As shown on the number plate. Only you and our team can see it.</p>
              </div>
              <div className="mt-3.5 flex gap-2.5">
                <div className="min-w-0 flex-1">
                  <label htmlFor="pricePerDay" className="text-[12.5px] font-bold text-ink-soft">Price / day (USD)</label>
                  <input
                    id="pricePerDay" name="pricePerDay" type="number" required min="35" max="250" step="1"
                    value={formData.pricePerDay} onChange={handleChange} placeholder="35 – 250"
                    className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
                  />
                </div>
                <div className="w-24">
                  <label htmlFor="seats" className="text-[12.5px] font-bold text-ink-soft">Seats</label>
                  <input
                    id="seats" name="seats" type="number" min="1" value={formData.seats} onChange={handleChange} placeholder="4"
                    className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-semibold text-ink placeholder:font-normal placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-3.5">
                <label htmlFor="description" className="text-[12.5px] font-bold text-ink-soft">Description</label>
                <textarea
                  id="description" name="description" rows={3} value={formData.description} onChange={handleChange}
                  placeholder="Highlight vehicle type, comfort features, and ideal trip styles."
                  className="mt-1.5 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-[13px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            <div className="order-2 rounded-[18px] bg-white p-4 shadow-card lg:order-none lg:p-6">
              <b className="text-[14px] text-ink lg:text-[14.5px] lg:font-extrabold">Included services</b>
              <p className="mb-3 mt-0.5 text-[12.5px] text-muted-soft">What&apos;s bundled with every booking.</p>
              <div className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
                {VEHICLE_FEATURES.map(({ key, label }) => {
                  const on = Boolean(formData[key]);
                  return (
                    <label
                      key={key}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border-[1.5px] px-3 py-2.5 text-[13.5px] font-semibold ${
                        on ? 'border-brand bg-[#f3fbf6] text-ink' : 'border-[#e2e8ea] text-muted'
                      }`}
                    >
                      <input type="checkbox" name={key} checked={on} onChange={handleChange} className="sr-only" />
                      <span
                        className={`grid h-5 w-5 flex-shrink-0 place-items-center rounded-md ${
                          on ? 'bg-brand' : 'border-[1.5px] border-[#cbd5db]'
                        }`}
                      >
                        {on ? <CheckCircle2 className="h-3.5 w-3.5 text-white" strokeWidth={0} fill="none" /> : null}
                        {on ? <svg width="12" height="12" viewBox="0 0 16 16" fill="#fff"><path d="M6.5 11.5L3.5 8.5l1-1 2 2 5-5 1 1z"/></svg> : null}
                      </span>
                      {label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="order-4 rounded-[18px] bg-white p-4 shadow-card lg:order-none lg:p-6">
              <b className="text-[14px] text-ink lg:text-[14.5px] lg:font-extrabold">Passenger insurance</b>
              <p className="mb-3 mt-0.5 text-[12.5px] text-muted-soft">
                Upload a clear photo of the document that shows this vehicle&apos;s passenger insurance, and enter its cover period. Only you and our team can see it.
              </p>
              {editingVehicle?.insurance?.requestedAt ? (
                <p className="mb-3 rounded-xl bg-[#fdf0d8] px-3 py-2 text-[12.5px] font-semibold text-[#a86a15]">
                  We asked you to verify this vehicle&apos;s insurance. Upload a new photo of your current passenger insurance document.
                  {editingVehicle.insurance.requestNote ? ` Note from our team: ${editingVehicle.insurance.requestNote}` : ''}
                </p>
              ) : null}
              <div className="flex gap-2.5">
                <div className="min-w-0 flex-1">
                  <label htmlFor="insuranceStartDate" className="text-[12.5px] font-bold text-ink-soft">Cover starts</label>
                  <DateField
                    id="insuranceStartDate" required value={insuranceDates.startDate}
                    onChange={(event) => setInsuranceDates((prev) => ({ ...prev, startDate: event.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <label htmlFor="insuranceEndDate" className="text-[12.5px] font-bold text-ink-soft">Cover ends</label>
                  <DateField
                    id="insuranceEndDate" required value={insuranceDates.endDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(event) => setInsuranceDates((prev) => ({ ...prev, endDate: event.target.value }))}
                    className="mt-1.5 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {insuranceFiles.length === 0 && editingVehicle?.insurance?.cardImages?.length > 0 ? (
                <div className="mt-3.5">
                  <div className="mb-2 text-[12.5px] font-bold text-ink-soft">Document on file</div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {editingVehicle.insurance.cardImages.map((url, index) => (
                      <img key={url || index} src={url} alt={`Passenger insurance document ${index + 1}`} className="h-20 w-full rounded-xl border border-[#e2e8ea] object-cover" />
                    ))}
                  </div>
                </div>
              ) : null}
              {insuranceFiles.length > 0 ? (
                <div className="mt-3.5">
                  <div className="mb-2 text-[12.5px] font-bold text-ink-soft">New photo{insuranceFiles.length === 1 ? '' : 's'}</div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {insuranceFiles.map((file) => (
                      <div key={file.preview} className="relative overflow-hidden rounded-xl border border-[#e2e8ea]">
                        <img src={file.preview} alt={file.name} className="h-20 w-full object-cover" />
                        <button
                          type="button" onClick={() => removeInsuranceFile(file)}
                          className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#e11d48] shadow"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <input ref={insuranceInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInsuranceFiles} />
              <button
                type="button"
                onClick={() => insuranceInputRef.current?.click()}
                className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white py-[11px] text-[13.5px] font-bold text-ink transition hover:border-muted-soft"
              >
                <ShieldCheck className="h-[15px] w-[15px]" />
                {editingVehicle?.insurance?.cardImages?.length > 0 || insuranceFiles.length > 0 ? 'Replace passenger insurance photo' : 'Upload passenger insurance photo'}
              </button>
              <p className="mt-1.5 text-[12px] text-muted-soft">1 photo required, 2 allowed if the cover runs over two pages.</p>
            </div>
            </div>

            <div className="contents lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-4">
            <div className="order-3 flex flex-col gap-3 lg:order-none">
            <div className="rounded-[18px] bg-white p-4 shadow-card lg:p-6">
              <div className="flex items-baseline justify-between gap-3">
                <b className="text-[14px] text-ink lg:text-[14.5px] lg:font-extrabold">Vehicle photos</b>
                <span className={`text-[12px] font-bold ${photoCount >= MIN_VEHICLE_IMAGES ? 'text-brand-dark' : 'text-[#a86a15]'}`}>
                  {photoCount} of {MIN_VEHICLE_IMAGES}
                </span>
              </div>
              <ul className="mb-3 mt-2 list-none space-y-1 rounded-xl bg-[#f4f9f6] p-3 text-[12.5px] leading-snug text-ink-soft">
                {VEHICLE_PHOTO_RULES.map((rule) => (
                  <li key={rule} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-[1px] h-3.5 w-3.5 flex-shrink-0 text-brand" />
                    <span>{rule}</span>
                  </li>
                ))}
              </ul>
              <div
                {...getRootProps({
                  className: `rounded-2xl border-[1.8px] border-dashed px-6 py-6 text-center transition ${
                    isDragActive ? 'border-brand bg-[#f3fbf6]' : 'border-[#cbd5db] bg-white'
                  }`,
                })}
              >
                <input {...getInputProps()} />
                <Camera className="mx-auto h-7 w-7 text-brand" strokeWidth={1.6} />
                <div className="mt-2 text-[13.5px] font-extrabold text-ink">Drag &amp; drop, or tap to upload</div>
                <div className="mt-0.5 text-[12px] text-muted-soft">{MIN_VEHICLE_IMAGES} photos · under 10MB each</div>
              </div>
            </div>

            {editingVehicle && existingImages.length > 0 && (
              <div>
                <div className="mb-2 text-[12.5px] font-bold text-ink-soft">
                  Current photos ({existingImages.length})
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {existingImages.map((url, index) => (
                    <div key={url || index} className="relative overflow-hidden rounded-xl border border-[#e2e8ea]">
                      <img src={url} alt={`Vehicle photo ${index + 1}`} className="h-20 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setExistingImages((prev) => prev.filter((u) => u !== url))}
                        className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#e11d48] shadow"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-1.5 text-[12px] text-muted-soft">
                  Remove any you don&apos;t want, then add new ones above ({MIN_VEHICLE_IMAGES} in total).
                </div>
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div>
                <div className="mb-2 text-[12.5px] font-bold text-ink-soft">New photos</div>
                <div className="grid grid-cols-3 gap-2.5">
                  {pendingFiles.map((file) => (
                    <div key={file.name} className="relative overflow-hidden rounded-xl border border-[#e2e8ea]">
                      <img src={file.preview} alt={file.name} className="h-20 w-full object-cover" />
                      <button
                        type="button" onClick={() => handleRemoveFile(file.name)}
                        className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#e11d48] shadow"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            </div>

            <button
              type="submit"
              disabled={submitting}
              className="order-5 w-full rounded-[14px] bg-brand lg:order-none py-[15px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70"
            >
              {submitting
                ? editingVehicle ? 'Saving…' : 'Submitting…'
                : editingVehicle ? 'Save changes' : 'Submit for approval'}
            </button>
            </div>
          </form>
          </>
        ) : (
          <>
          {/* ---------- Desktop ---------- */}
          <div className="hidden lg:block">
            <DesktopPageTitle
              eyebrow="Fleet"
              title="My Vehicles"
              subtitle="Manage the vehicles travellers can book with you."
              actions={
                <>
                  <button type="button" onClick={onRefresh} aria-label="Refresh" className="grid h-11 w-11 place-items-center rounded-xl border-[1.5px] border-[#e2e8ea] bg-white text-muted transition hover:border-muted-soft">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={handleNewVehicleClick} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark">
                    <PlusCircle className="h-4 w-4" strokeWidth={2} /> Add vehicle
                  </button>
                </>
              }
            />

            <div className="grid grid-cols-4 gap-4">
              <StatTile label="Vehicles" value={vehicleList.length} hint={vehicleList.length ? `$${lowestPrice}${highestPrice !== lowestPrice ? `–$${highestPrice}` : ''} per day` : 'None listed yet'} icon={Car} />
              <StatTile label="Live" value={liveCount} hint="Bookable by travellers" icon={CheckCircle2} />
              <StatTile
                label="In review"
                value={reviewCount}
                hint={rejectedCount ? `${rejectedCount} rejected` : 'Waiting for our team'}
                icon={ClipboardList}
                tone="bg-[#fdf0d8] text-[#a86a15]"
              />
              <StatTile
                label="Insurance"
                value={insuranceAttention ? insuranceAttention : 'All good'}
                hint={insuranceAttention ? `vehicle${insuranceAttention === 1 ? '' : 's'} need${insuranceAttention === 1 ? 's' : ''} attention` : 'No action needed'}
                icon={insuranceAttention ? ShieldAlert : ShieldCheck}
                tone={insuranceAttention ? 'bg-[#ffe4e9] text-[#e11d48]' : 'bg-brand-tint text-brand-dark'}
              />
            </div>

            <div className="mt-6 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
              <div className="flex min-w-0 flex-col gap-4">
                {vehicleList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-[18px] bg-white px-8 py-14 text-center shadow-card">
                    <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-tint text-brand-dark"><Car className="h-7 w-7" /></span>
                    <h3 className="mt-4 text-[17px] font-extrabold text-ink">No vehicles yet</h3>
                    <p className="mt-1 max-w-sm text-[13.5px] text-muted-soft">Submit your first vehicle. Once our team approves it, travellers can find and book it.</p>
                    <button type="button" onClick={handleNewVehicleClick} className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark">
                      <PlusCircle className="h-4 w-4" strokeWidth={2} /> Add vehicle
                    </button>
                  </div>
                ) : (
                  vehicleList.map((vehicle) => {
                    const statusDisplay = VEHICLE_STATUS_DISPLAY[vehicle.status] || { label: vehicle.status || 'Unknown', cls: 'bg-[#eef1f0] text-muted' };
                    const included = getVehicleFeatureLabels(vehicle);
                    const insuranceNotice = INSURANCE_NOTICES[vehicle.insurance?.state] || null;
                    const cover = Array.isArray(vehicle.images) ? vehicle.images[0] : null;
                    const photos = Array.isArray(vehicle.images) ? vehicle.images.length : 0;
                    const notes = [];
                    if (vehicle.status === 'rejected' && vehicle.rejectedReason) {
                      notes.push({ key: 'rejected', cls: 'bg-[#fff5f6] text-[#e11d48]', text: `Rejection notes: ${vehicle.rejectedReason}` });
                    }
                    if (vehicle.insurance?.requestedAt) {
                      notes.push({
                        key: 'requested',
                        cls: 'bg-[#fffaf0] text-[#a86a15]',
                        text: `We asked you to verify this vehicle's insurance. Edit it and resubmit with a new photo of your passenger insurance document and ${MIN_VEHICLE_IMAGES} photos.${vehicle.insurance.requestNote ? ` Note from our team: ${vehicle.insurance.requestNote}` : ''}`,
                      });
                    } else if (insuranceNotice?.text) {
                      notes.push({ key: 'insurance', cls: 'bg-[#fffaf0] text-[#a86a15]', text: insuranceNotice.text });
                    }
                    return (
                      <article key={vehicle.id} className="overflow-hidden rounded-[18px] bg-white shadow-card">
                        <div className="grid grid-cols-[210px_minmax(0,1fr)_auto] gap-6 p-5">
                          <div className="relative h-[140px] overflow-hidden rounded-[14px] bg-[#eef1f0]">
                            {cover ? (
                              <img src={cover} alt={vehicle.model} className="h-full w-full object-cover" />
                            ) : (
                              <div className="grid h-full w-full place-items-center"><Car className="h-9 w-9 text-muted-soft" strokeWidth={1.5} /></div>
                            )}
                            {photos ? (
                              <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-bold text-white">
                                <Camera className="h-3 w-3" /> {photos}
                              </span>
                            ) : null}
                          </div>

                          <div className="min-w-0 py-0.5">
                            <div className="flex items-center gap-2.5">
                              <h3 className="truncate text-[18px] font-extrabold tracking-tight text-ink">{vehicle.model}</h3>
                              <span className={`flex-shrink-0 rounded-full px-2.5 py-[3px] text-[11.5px] font-extrabold ${statusDisplay.cls}`}>{statusDisplay.label}</span>
                            </div>
                            <p className="mt-0.5 text-[12.5px] text-muted-soft">
                              {vehicle.registrationNumber ? <span className="font-bold uppercase text-ink-soft">{vehicle.registrationNumber}</span> : null}
                              {vehicle.registrationNumber ? ' · ' : ''}{vehicle.year} · {vehicle.status === 'pending' ? 'submitted' : 'added'} {formatDate(vehicle.createdAt)}
                            </p>
                            <dl className="mt-4 grid max-w-md grid-cols-3 gap-4">
                              <div>
                                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-soft">Price / day</dt>
                                <dd className="mt-0.5 text-[16px] font-extrabold text-brand-dark">${(vehicle.pricePerDay ?? 0).toLocaleString()}</dd>
                              </div>
                              <div>
                                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-soft">Seats</dt>
                                <dd className="mt-0.5 text-[16px] font-extrabold text-ink">{vehicle.seats || '—'}</dd>
                              </div>
                              <div>
                                <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-soft">Year</dt>
                                <dd className="mt-0.5 text-[16px] font-extrabold text-ink">{vehicle.year || '—'}</dd>
                              </div>
                            </dl>
                            {included.length > 0 ? (
                              <div className="mt-3.5 flex flex-wrap gap-1.5">
                                {included.map((label) => (
                                  <span key={label} className="rounded-lg bg-canvas px-2.5 py-[5px] text-[11.5px] font-bold text-ink-soft">{label}</span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex w-[210px] flex-col items-end justify-between gap-4">
                            {insuranceNotice ? (
                              <div className="text-right">
                                <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-[5px] text-[11.5px] font-bold ${insuranceNotice.tone}`}>
                                  <ShieldCheck className="h-3.5 w-3.5" /> {insuranceNotice.chip}
                                </span>
                                {vehicle.insurance?.endDate && ['verified', 'expiring', 'pending'].includes(vehicle.insurance.state) ? (
                                  <p className="mt-1 text-[12px] text-muted-soft">Cover until {formatDate(vehicle.insurance.endDate)}</p>
                                ) : null}
                              </div>
                            ) : <span />}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleEditVehicle(vehicle)}
                                className="inline-flex h-10 items-center gap-1.5 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-4 text-[13px] font-bold text-ink transition hover:border-brand disabled:opacity-50"
                              >
                                <Pencil className="h-4 w-4" /> Edit
                              </button>
                              <button
                                type="button"
                                disabled={submitting || deletingId === vehicle.id}
                                onClick={() => setDeleteTarget(vehicle)}
                                aria-label={`Delete ${vehicle.model}`}
                                className="inline-flex h-10 items-center gap-1.5 rounded-xl border-[1.5px] border-[#ffd2da] bg-[#fff5f6] px-3.5 text-[13px] font-bold text-[#e11d48] transition hover:border-[#f43f5e] disabled:opacity-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                {deletingId === vehicle.id ? 'Deleting…' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                        {notes.map((note) => (
                          <div key={note.key} className={`flex items-start gap-2 border-t border-hairline px-5 py-3 text-[12.5px] font-semibold ${note.cls}`}>
                            <AlertTriangle className="mt-[1px] h-4 w-4 flex-shrink-0" />
                            <span>{note.text}</span>
                          </div>
                        ))}
                      </article>
                    );
                  })
                )}
              </div>

              <aside className="sticky top-6 flex flex-col gap-4">
                <section className="rounded-[18px] bg-white shadow-card">
                  <div className="border-b border-hairline px-5 py-4">
                    <h3 className="text-[14.5px] font-extrabold text-ink">What our team checks</h3>
                    <p className="mt-0.5 text-[12px] text-muted-soft">Before a vehicle goes live.</p>
                  </div>
                  <ul className="flex flex-col gap-3 px-5 py-4 text-[13px] text-ink-soft">
                    {[
                      `${MIN_VEHICLE_IMAGES} clear photos, inside and out`,
                      'Registration number as on the plate',
                      'Current passenger insurance and cover dates',
                      'A daily price above $50',
                      'One listing per vehicle',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-[1px] h-4 w-4 flex-shrink-0 text-brand" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="rounded-[18px] bg-white p-5 shadow-card">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e6f0fb] text-[#1d5fa8]"><ShieldCheck className="h-[18px] w-[18px]" /></span>
                    <h3 className="text-[14.5px] font-extrabold text-ink">Keep insurance current</h3>
                  </div>
                  <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
                    A vehicle leaves the marketplace when its passenger insurance expires. Upload the renewed document before the cover ends to stay bookable.
                  </p>
                </section>
              </aside>
            </div>
          </div>

          {/* ---------- Phone ---------- */}
          <div className="lg:hidden">
            <button
              type="button"
              onClick={handleNewVehicleClick}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[14.5px] font-extrabold text-white transition hover:bg-brand-dark"
            >
              <PlusCircle className="h-[18px] w-[18px]" strokeWidth={2} />
              Add vehicle
            </button>

            {vehicles.length === 0 ? (
              <div className="mt-4 flex min-h-[160px] flex-col items-center justify-center rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
                <Car className="mb-3 h-8 w-8 text-muted-soft" />
                <p>No vehicles added yet. Submit your first vehicle to start receiving bookings.</p>
              </div>
            ) : (
              <div className="mt-3.5 grid gap-3">
                {vehicles.map((vehicle) => {
                  const isPending = vehicle.status === 'pending';
                  const isRejected = vehicle.status === 'rejected';
                  const statusTone = isRejected
                    ? { chip: 'bg-[#ffe4e9] text-[#e11d48]', border: '#f43f5e' }
                    : isPending
                    ? { chip: 'bg-[#fdf0d8] text-[#a86a15]', border: '#f0b429' }
                    : { chip: 'bg-brand-tint text-brand-dark', border: null };
                  const included = getVehicleFeatureLabels(vehicle);
                  const insuranceNotice = INSURANCE_NOTICES[vehicle.insurance?.state] || null;
                  return (
                    <article
                      key={vehicle.id}
                      className="rounded-[18px] bg-white p-4 shadow-card"
                      style={statusTone.border ? { borderLeft: `4px solid ${statusTone.border}` } : undefined}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <b className="truncate text-[17px] text-ink">{vehicle.model}</b>
                            <span className={`flex-shrink-0 rounded-[7px] px-2 py-[3px] text-[11px] font-extrabold uppercase ${statusTone.chip}`}>
                              {vehicle.status}
                            </span>
                          </div>
                          <div className="mt-0.5 text-[12.5px] text-muted-soft">
                            {vehicle.registrationNumber ? `${vehicle.registrationNumber} · ` : ''}{vehicle.year} · {isPending ? 'submitted' : 'added'} {formatDate(vehicle.createdAt)}
                          </div>
                        </div>
                        <div className="grid h-[50px] w-[50px] flex-shrink-0 place-items-center rounded-[13px] bg-[#eef1f0]">
                          <Car className="h-6 w-6 text-muted-soft" strokeWidth={1.6} />
                        </div>
                      </div>
                      <div className="my-3 flex gap-4 text-[13.5px] font-bold">
                        <span className="inline-flex items-center gap-1.5 text-brand-dark">
                          <DollarSign className="h-3.5 w-3.5" />${(vehicle.pricePerDay ?? 0).toLocaleString()} / day
                        </span>
                        {vehicle.seats ? (
                          <span className="inline-flex items-center gap-1.5 text-muted">
                            <Users className="h-3.5 w-3.5" />{vehicle.seats} seats
                          </span>
                        ) : null}
                      </div>
                      {included.length > 0 ? (
                        <div className="mb-3 flex flex-wrap gap-1.5">
                          {included.map((label) => (
                            <span key={label} className="rounded-lg bg-brand-tint px-2.5 py-[5px] text-[11.5px] font-bold text-brand-dark">
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {insuranceNotice ? (
                        <div className="mb-3">
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-[5px] text-[11.5px] font-bold ${insuranceNotice.tone}`}>
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {insuranceNotice.chip}
                            {vehicle.insurance?.endDate && ['verified', 'expiring', 'pending'].includes(vehicle.insurance.state)
                              ? ` · until ${formatDate(vehicle.insurance.endDate)}`
                              : ''}
                          </span>
                          {vehicle.insurance?.requestedAt ? (
                            <p className="mt-2 rounded-xl bg-[#fdf0d8] px-3 py-2 text-[12.5px] text-[#a86a15]">
                              We asked you to verify this vehicle&apos;s insurance. Edit it and resubmit with a new photo of your passenger insurance document and {MIN_VEHICLE_IMAGES} photos.
                              {vehicle.insurance.requestNote ? ` Note from our team: ${vehicle.insurance.requestNote}` : ''}
                            </p>
                          ) : insuranceNotice.text ? (
                            <p className="mt-2 text-[12.5px] leading-snug text-muted">{insuranceNotice.text}</p>
                          ) : null}
                        </div>
                      ) : null}
                      {isRejected && vehicle.rejectedReason ? (
                        <p className="mb-3 rounded-xl bg-[#ffe4e9] px-3 py-2 text-[12.5px] text-[#e11d48]">
                          Rejection notes: {vehicle.rejectedReason}
                        </p>
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={submitting}
                          onClick={() => handleEditVehicle(vehicle)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white py-[11px] text-[13.5px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-50"
                        >
                          <Pencil className="h-[15px] w-[15px]" />
                          Edit details
                        </button>
                        <button
                          type="button"
                          disabled={submitting || deletingId === vehicle.id}
                          onClick={() => setDeleteTarget(vehicle)}
                          aria-label={`Delete ${vehicle.model}`}
                          className="flex flex-shrink-0 items-center justify-center gap-1.5 rounded-[11px] border-[1.5px] border-[#ffd2da] bg-[#fff5f6] px-3.5 py-[11px] text-[13.5px] font-bold text-[#e11d48] transition hover:border-[#f43f5e] disabled:opacity-50"
                        >
                          <Trash2 className="h-[15px] w-[15px]" />
                          {deletingId === vehicle.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          </>
        )}
      </Sheet>

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[18px] bg-white p-5 shadow-card">
            <b className="text-[16px] text-ink">Delete {deleteTarget.model}?</b>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              It stops appearing in search and in your vehicle list, and any offer still waiting on it
              is withdrawn. Past bookings and reviews keep showing it. This cannot be undone.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-[11px] border-[1.5px] border-[#e2e8ea] bg-white py-[11px] text-[13.5px] font-bold text-ink disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={async () => {
                  setDeletingId(deleteTarget.id);
                  try {
                    await onDelete(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch {
                    // The parent already surfaced the reason (e.g. upcoming bookings).
                  } finally {
                    setDeletingId('');
                  }
                }}
                className="flex-1 rounded-[11px] bg-[#e11d48] py-[11px] text-[13.5px] font-bold text-white disabled:opacity-50"
              >
                {deletingId ? 'Deleting…' : 'Delete vehicle'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

const DriverBookingsPanel = ({ onMenu, onNavigate, driverName, driverImage, bookingsState, onReload }) => {
  const navigate = useNavigate();
  const { loading, error, items } = bookingsState;
  const [responding, setResponding] = useState({ id: '', action: '' });
  const [selectedBooking, setSelectedBooking] = useState(null);

  const [view, setView] = useState('upcoming');
  const [deskFilter, setDeskFilter] = useState('upcoming');
  const [deskQuery, setDeskQuery] = useState('');

  const handleReload = () => {
    if (typeof onReload === 'function') onReload();
  };

  const handleRespond = async (bookingId, action) => {
    setResponding({ id: bookingId, action });
    try {
      await driverRespondToBooking(bookingId, action);
      toast.success(action === 'accept' ? 'Booking confirmed.' : 'Booking rejected.');
      handleReload();
    } catch (error) {
      toast.error(error?.message || 'Unable to update booking.');
    } finally {
      setResponding({ id: '', action: '' });
    }
  };

  const head = (
    <MobileHeader
      onMenu={onMenu}
      right={<Avatar name={driverName} image={driverImage} tone="light" className="h-10 w-10 text-[15px]" />}
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
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading bookings…
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
            <button
              type="button"
              onClick={handleReload}
              className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft"
            >
              Try again
            </button>
          </div>
        </Sheet>
      </>
    );
  }

  const bookings = Array.isArray(items) ? items : [];
  // A confirmed/pending booking whose trip already ended is done, regardless of
  // whether anything ever flipped its stored status — same rule as the traveller
  // dashboard and the mobile app use for their own upcoming/completed split.
  const isPastEnd = (b) => Boolean(b.endDate) && new Date(b.endDate).getTime() < Date.now();
  const isUpcoming = (b) => (b.status === 'pending' || b.status === 'confirmed') && !isPastEnd(b);
  const upcoming = bookings.filter(isUpcoming);
  const completed = bookings.filter((b) => !isUpcoming(b));
  const list = view === 'upcoming' ? upcoming : completed;

  // Desktop: counts, filter, search and sort.
  const pendingList = upcoming.filter((b) => b.status === 'pending');
  const confirmedUpcoming = upcoming.filter((b) => b.status === 'confirmed');
  const completedTrips = completed.filter((b) => b.status === 'confirmed');
  const sumEarnings = (rows) => rows.reduce((sum, b) => sum + (typeof b.driverEarnings === 'number' ? b.driverEarnings : 0), 0);
  const deskSource =
    deskFilter === 'pending' ? pendingList
    : deskFilter === 'confirmed' ? confirmedUpcoming
    : deskFilter === 'past' ? completed
    : deskFilter === 'all' ? bookings
    : upcoming;
  const q = deskQuery.trim().toLowerCase();
  const startTime = (b) => (b.startDate ? new Date(b.startDate).getTime() : 0);
  const deskRows = deskSource
    .filter((b) =>
      !q ||
      [b.traveler?.fullName, b.vehicle?.model, b.startPoint, b.endPoint]
        .filter(Boolean)
        .some((text) => String(text).toLowerCase().includes(q))
    )
    .slice()
    .sort((a, b) => (deskFilter === 'upcoming' || deskFilter === 'pending' || deskFilter === 'confirmed' ? startTime(a) - startTime(b) : startTime(b) - startTime(a)));
  const DAY_MS = 86400000;
  const tripTiming = (b) => {
    if (!b.startDate) return '';
    const start = new Date(b.startDate).getTime();
    const end = b.endDate ? new Date(b.endDate).getTime() : start;
    const now = Date.now();
    if (end < now) return 'Finished';
    if (start <= now) return 'On trip now';
    const days = Math.ceil((start - now) / DAY_MS);
    return days <= 1 ? 'Starts tomorrow' : `Starts in ${days} days`;
  };
  const tripDays = (b) => {
    if (!b.startDate || !b.endDate) return null;
    return Math.max(1, Math.round((new Date(b.endDate).getTime() - new Date(b.startDate).getTime()) / DAY_MS) + 1);
  };
  const bookingValue = (b) =>
    typeof b.payableTotal === 'number' && b.payableTotal > 0 ? b.payableTotal
    : typeof b.totalPrice === 'number' && b.totalPrice > 0 ? b.totalPrice
    : null;
  const deskChip = (b) => {
    const pastEnd = isPastEnd(b);
    if (b.status === 'pending') return pastEnd ? { text: 'Expired', cls: 'bg-[#eef1f0] text-muted' } : { text: 'Needs reply', cls: 'bg-[#fdf0d8] text-[#a86a15]' };
    if (b.status === 'confirmed') return pastEnd ? { text: 'Completed', cls: 'bg-[#eef1f0] text-ink-soft' } : { text: 'Confirmed', cls: 'bg-brand-tint text-brand-dark' };
    if (b.status === 'rejected') return { text: 'Rejected', cls: 'bg-[#ffe4e9] text-[#e11d48]' };
    if (b.status === 'cancelled') return { text: 'Cancelled', cls: 'bg-[#ffe4e9] text-[#e11d48]' };
    const label = String(b.status || 'Past');
    return { text: label.charAt(0).toUpperCase() + label.slice(1), cls: 'bg-[#eef1f0] text-muted' };
  };
  const openMessages = (booking) =>
    booking.conversationId
      ? navigate(`/portal/driver/messages?conversation=${booking.conversationId}`)
      : onNavigate?.('messages');
  const DESK_FILTERS = [
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'pending', label: 'Needs reply', count: pendingList.length },
    { key: 'confirmed', label: 'Confirmed', count: confirmedUpcoming.length },
    { key: 'past', label: 'Past', count: completed.length },
    { key: 'all', label: 'All', count: bookings.length },
  ];

  return (
    <>
      <div className="lg:hidden">{head}</div>
      <Sheet wide className="lg:!mt-8">
        {/* ---------- Desktop ---------- */}
        <div className="hidden lg:block">
          <DesktopPageTitle
            eyebrow="Trips"
            title="My Bookings"
            subtitle="Reply to new requests and keep track of every trip."
            actions={
              <button type="button" onClick={handleReload} aria-label="Refresh" className="inline-flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-4 text-[13.5px] font-bold text-ink transition hover:border-muted-soft">
                <RefreshCw className="h-4 w-4" /> Refresh
              </button>
            }
          />

          <div className="grid grid-cols-4 gap-4">
            <StatTile label="Needs reply" value={pendingList.length} hint={pendingList.length ? 'Accept or reject soon' : 'You are all caught up'} icon={MessageCircle} tone="bg-[#fdf0d8] text-[#a86a15]" />
            <StatTile label="Confirmed upcoming" value={confirmedUpcoming.length} hint={confirmedUpcoming[0] ? `Next: ${formatDate(confirmedUpcoming.slice().sort((a, b) => startTime(a) - startTime(b))[0].startDate)}` : 'No trips scheduled'} icon={CalendarCheck} />
            <StatTile label="Upcoming earnings" value={formatMoney(sumEarnings(confirmedUpcoming))} hint="After commission, confirmed trips" icon={DollarSign} />
            <StatTile label="Completed trips" value={completedTrips.length} hint={completedTrips.length ? `${formatMoney(sumEarnings(completedTrips))} earned` : 'None yet'} icon={CheckCircle2} tone="bg-[#e6f0fb] text-[#1d5fa8]" />
          </div>

          {pendingList.length > 0 && deskFilter !== 'pending' ? (
            <div className="mt-5 flex items-center justify-between gap-4 rounded-[16px] border border-[#f6dfb0] bg-[#fffaf0] px-5 py-3.5">
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#a86a15]">
                <AlertTriangle className="h-4 w-4" />
                {pendingList.length === 1 ? '1 booking request is' : `${pendingList.length} booking requests are`} waiting for your reply.
              </p>
              <button type="button" onClick={() => setDeskFilter('pending')} className="text-[13px] font-extrabold text-[#a86a15] underline-offset-2 hover:underline">
                Review now
              </button>
            </div>
          ) : null}

          <section className="mt-6 overflow-hidden rounded-[18px] bg-white shadow-card">
            <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
              <div className="flex gap-1 rounded-xl bg-[#eef1f0] p-1">
                {DESK_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setDeskFilter(f.key)}
                    className={`inline-flex items-center gap-1.5 rounded-[9px] px-3.5 py-1.5 text-[13px] font-bold transition ${
                      deskFilter === f.key ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {f.label}
                    <span className={`rounded-full px-1.5 text-[11px] ${deskFilter === f.key ? 'bg-brand-tint text-brand-dark' : 'bg-white/70 text-muted-soft'}`}>{f.count}</span>
                  </button>
                ))}
              </div>
              <label className="flex h-10 w-72 items-center gap-2 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 focus-within:border-brand">
                <Search className="h-4 w-4 text-muted-soft" />
                <input
                  value={deskQuery}
                  onChange={(event) => setDeskQuery(event.target.value)}
                  placeholder="Search traveller, vehicle or place"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-ink placeholder:text-muted-soft focus:outline-none"
                />
              </label>
            </div>

            <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.9fr)_260px] gap-4 border-b border-hairline bg-canvas/60 px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">
              <span>Traveller</span>
              <span>Trip</span>
              <span>Vehicle</span>
              <span>Your earnings</span>
              <span className="text-right">Status &amp; actions</span>
            </div>

            {deskRows.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-muted-soft" />
                <p className="mt-3 text-[14px] font-bold text-ink">
                  {q ? 'No bookings match your search' : deskFilter === 'pending' ? 'No requests waiting for you' : deskFilter === 'past' ? 'No past trips yet' : 'No bookings here yet'}
                </p>
                <p className="mt-1 text-[12.5px] text-muted-soft">New requests and confirmed trips appear here as soon as travellers book.</p>
              </div>
            ) : (
              <ul>
                {deskRows.map((booking, index) => {
                  const name = booking.traveler?.fullName || 'Traveller';
                  const chip = deskChip(booking);
                  const value = bookingValue(booking);
                  const days = tripDays(booking);
                  const busy = responding?.id === booking.id;
                  const pendingOpen = booking.status === 'pending' && !isPastEnd(booking);
                  const canMessage = !['cancelled', 'rejected'].includes(booking.status);
                  return (
                    <li
                      key={booking.id || index}
                      className={`grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,0.9fr)_260px] items-center gap-4 border-b border-hairline px-5 py-4 last:border-b-0 ${pendingOpen ? 'bg-[#fffdf7]' : ''}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={name} tone={index % 2 === 0 ? 'amber' : 'purple'} className="h-10 w-10 flex-shrink-0 text-sm" />
                        <div className="min-w-0">
                          <div className="truncate text-[14px] font-bold text-ink">{name}</div>
                          <div className="truncate text-[12px] text-muted-soft">
                            {booking.passengerSummary || (booking.guests ?? booking.numberOfGuests ? `${booking.guests ?? booking.numberOfGuests} guests` : 'Passengers to confirm')}
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-bold text-ink">
                          {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
                        </div>
                        <div className="truncate text-[12px] text-muted-soft">
                          {days ? `${days} day${days === 1 ? '' : 's'} · ` : ''}{tripTiming(booking)}
                        </div>
                        {booking.startPoint && booking.endPoint ? (
                          <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[12px] text-ink-soft">
                            <MapPin className="h-3 w-3 flex-shrink-0 text-muted-soft" />
                            <span className="truncate">{booking.startPoint} → {booking.endPoint}</span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink">
                        <Car className="h-4 w-4 flex-shrink-0 text-brand" />
                        <span className="truncate">{booking.vehicle?.model || 'Vehicle to confirm'}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-[14px] font-extrabold text-brand-dark">
                          {typeof booking.driverEarnings === 'number' ? formatMoney(booking.driverEarnings) : '—'}
                        </div>
                        {value ? (
                          <div className="text-[11.5px] text-muted-soft">
                            of {formatMoney(value)}{typeof booking.commissionRate === 'number' ? ` · ${formatRatePercent(booking.commissionRate, 1)} fee` : ''}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {pendingOpen ? (
                          <>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRespond(booking.id, 'accept')}
                              className="h-9 rounded-[10px] bg-brand px-3.5 text-[12.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
                            >
                              {busy && responding.action === 'accept' ? 'Confirming…' : 'Accept'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleRespond(booking.id, 'reject')}
                              className="h-9 rounded-[10px] border-[1.5px] border-[#ffd3d9] bg-white px-3.5 text-[12.5px] font-bold text-[#f43f5e] transition hover:border-[#f43f5e] disabled:opacity-60"
                            >
                              {busy && responding.action === 'reject' ? 'Rejecting…' : 'Reject'}
                            </button>
                          </>
                        ) : (
                          <>
                            <span className={`rounded-full px-2.5 py-[3px] text-[11.5px] font-extrabold ${chip.cls}`}>{chip.text}</span>
                            {canMessage ? (
                              <button
                                type="button"
                                onClick={() => openMessages(booking)}
                                aria-label={`Message ${name}`}
                                title="Message traveller"
                                className="grid h-9 w-9 place-items-center rounded-[10px] border-[1.5px] border-[#e2e8ea] bg-white text-ink transition hover:border-brand hover:text-brand-dark"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </button>
                            ) : null}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedBooking(booking)}
                          className="h-9 rounded-[10px] border-[1.5px] border-[#e2e8ea] bg-white px-3 text-[12.5px] font-bold text-ink transition hover:border-muted-soft"
                        >
                          Details
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* ---------- Phone ---------- */}
        <div className="lg:hidden">
        <div className="mb-3.5 flex gap-1.5 rounded-xl bg-[#eef1f0] p-1">
          <button
            type="button"
            onClick={() => setView('upcoming')}
            className={`flex-1 rounded-[9px] py-2 text-[13px] font-bold transition ${
              view === 'upcoming' ? 'bg-brand text-white' : 'text-muted'
            }`}
          >
            Upcoming{upcoming.length ? ` ${upcoming.length}` : ''}
          </button>
          <button
            type="button"
            onClick={() => setView('completed')}
            className={`flex-1 rounded-[9px] py-2 text-[13px] font-bold transition ${
              view === 'completed' ? 'bg-brand text-white' : 'text-muted'
            }`}
          >
            Completed{completed.length ? ` ${completed.length}` : ''}
          </button>
        </div>
        {list.length === 0 ? (
          <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            {view === 'upcoming'
              ? 'No upcoming bookings yet. New requests and confirmed trips will appear here.'
              : 'No completed trips yet.'}
          </div>
        ) : (
          <div className="grid gap-3">
            {list.map((booking, index) => (
              <BookingCard
                key={booking.id || index}
                booking={booking}
                tone={index % 2 === 0 ? 'amber' : 'purple'}
                responding={responding}
                onRespond={handleRespond}
                onMessage={() =>
                  booking.conversationId
                    ? navigate(`/portal/driver/messages?conversation=${booking.conversationId}`)
                    : onNavigate?.('messages')
                }
                onView={setSelectedBooking}
              />
            ))}
          </div>
        )}
        </div>
      </Sheet>
      {selectedBooking ? (
        <BookingDetailsModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      ) : null}
    </>
  );
};

const BookingCard = ({ booking, tone = 'amber', responding, onRespond, onMessage, onView }) => {
  const name = booking.traveler?.fullName || 'Traveller';
  const vehicleName = booking.vehicle?.model || 'Vehicle to confirm';
  const start = formatDate(booking.startDate);
  const end = formatDate(booking.endDate);
  const price =
    typeof booking.payableTotal === 'number' && booking.payableTotal > 0
      ? formatMoney(booking.payableTotal)
      : typeof booking.totalPrice === 'number' && booking.totalPrice > 0
      ? formatMoney(booking.totalPrice)
      : null;
  const guests = booking.guests ?? booking.numberOfGuests ?? null;
  const payoutLabel =
    typeof booking.driverEarnings === 'number' ? formatMoney(booking.driverEarnings) : null;
  const bookingCommissionRateLabel =
    typeof booking.commissionRate === 'number' ? formatRatePercent(booking.commissionRate, 1) : null;
  const isPending = booking.status === 'pending';
  // A confirmed trip whose end date has passed reads as "confirmed" forever otherwise —
  // there's no separate "completed" status stored on the booking (see BOOKING_STATUS).
  const isPastEnd = Boolean(booking.endDate) && new Date(booking.endDate).getTime() < Date.now();
  const chip = isPending
    ? { text: 'PENDING', cls: 'bg-[#fdf0d8] text-[#a86a15]', border: '#f0b429' }
    : booking.status === 'confirmed' && isPastEnd
    ? { text: 'COMPLETED', cls: 'bg-[#eef1f0] text-muted', border: '#d6e9fb' }
    : booking.status === 'confirmed'
    ? { text: 'CONFIRMED', cls: 'bg-brand-tint text-brand-dark', border: '#10a35a' }
    : { text: (booking.status || 'past').toUpperCase(), cls: 'bg-[#eef1f0] text-muted', border: '#d6e9fb' };
  const busy = responding?.id === booking.id;
  return (
    <div
      className="min-w-0 rounded-[18px] bg-white p-[15px] shadow-card"
      style={{ borderLeft: `4px solid ${chip.border}` }}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <span className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase ${chip.cls}`}>
          {chip.text}
        </span>
        {price ? <b className="text-[16px] text-ink">{price}</b> : null}
      </div>
      <div className="flex items-center gap-[11px]">
        <Avatar name={name} tone={tone} className="h-10 w-10 text-sm" />
        <div className="min-w-0">
          <div className="truncate text-[14.5px] font-bold text-ink">{name}</div>
          <div className="truncate text-[12px] text-muted-soft">
            {booking.passengerSummary ? `${booking.passengerSummary} · ` : guests ? `${guests} guests · ` : ''}
            {vehicleName}
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onView?.(booking)}
        className="mt-3 w-full rounded-xl bg-canvas px-[13px] py-[11px] text-left text-[13px] transition hover:bg-[#e9efec]"
      >
        <div className="flex items-center justify-between gap-1.5 font-bold text-ink">
          <span className="flex min-w-0 items-center gap-1.5">
            <Car className="h-3.5 w-3.5 flex-shrink-0 text-brand" />
            <span className="truncate">{vehicleName}</span>
          </span>
          <span className="flex-shrink-0 text-[11px] font-extrabold text-brand-dark">View details ›</span>
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 text-muted">
          <CalendarDays className="h-3.5 w-3.5 text-muted-soft" />
          {start} – {end}
        </div>
        {payoutLabel ? (
          <div className="mt-1.5 text-[12px] font-semibold text-brand-dark">
            Earning after commission{bookingCommissionRateLabel ? ` (${bookingCommissionRateLabel})` : ''}: {payoutLabel}
          </div>
        ) : null}
      </button>
      {isPending ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onRespond(booking.id, 'accept')}
            className="flex-1 rounded-[11px] bg-brand py-[11px] text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
          >
            {busy && responding.action === 'accept' ? 'Confirming…' : 'Accept'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onRespond(booking.id, 'reject')}
            className="flex-1 rounded-[11px] border-[1.5px] border-[#ffd3d9] bg-white py-[11px] text-[13.5px] font-bold text-[#f43f5e] transition hover:border-[#f43f5e] disabled:opacity-60"
          >
            {busy && responding.action === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onMessage}
          className="mt-3 w-full rounded-[11px] bg-brand py-[11px] text-[13.5px] font-bold text-white transition hover:bg-brand-dark"
        >
          Message traveller
        </button>
      )}
    </div>
  );
};

const statusBadgeStyles = {
  pending: 'bg-amber-100 text-amber-700',
  submitted: 'bg-emerald-50 text-emerald-700',
  approved: 'bg-emerald-100 text-emerald-700',
};

const formatCurrency = (value) => {
  if (!Number.isFinite(value)) {
    return '$0.00';
  }
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const DriverEarningsPanel = ({ onMenu, driverName, driverImage, state, onMonthChange, onRefresh, onSlipUpload }) => {
  const { loading, error, summary, history, selectedMonth, uploading } = state;
  const fileInputRef = useRef(null);

  const monthOptions = useMemo(() => {
    const options = [];
    const seen = new Set();
    if (Array.isArray(history)) {
      history.forEach((entry) => {
        if (entry?.period?.value && !seen.has(entry.period.value)) {
          seen.add(entry.period.value);
          options.push({
            value: entry.period.value,
            label: entry.period.label || entry.period.value,
          });
        }
      });
    }
    if (summary?.period?.value && !seen.has(summary.period.value)) {
      options.unshift({
        value: summary.period.value,
        label: summary.period.label || summary.period.value,
      });
    }
    if (options.length === 0) {
      const fallback = selectedMonth || getCurrentMonthValue();
      options.push({ value: fallback, label: fallback });
    }
    return options;
  }, [history, summary, selectedMonth]);

  const handleMonthSelect = (event) => {
    onMonthChange?.(event.target.value);
  };

  const handleRefresh = () => {
    onRefresh?.({ month: selectedMonth, forceHistory: true });
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file && summary?.commission?.id) {
      onSlipUpload?.(summary.commission.id, file);
    }
    event.target.value = '';
  };

  const displayDate = (value) => {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const simpleHead = (
    <MobileHeader
      onMenu={onMenu}
      right={<Avatar name={driverName} image={driverImage} tone="light" className="h-10 w-10 text-[15px]" />}
      eyebrow="EARNINGS"
      title="My Earnings"
    />
  );

  if (loading) {
    return (
      <>
        {simpleHead}
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading earnings…
          </div>
        </Sheet>
      </>
    );
  }

  if (error) {
    return (
      <>
        {simpleHead}
        <Sheet>
          <div className="rounded-[18px] bg-white p-6 text-center text-sm shadow-card">
            <p className="text-[#e11d48]">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft"
            >
              Try again
            </button>
          </div>
        </Sheet>
      </>
    );
  }

  if (!summary) {
    return (
      <>
        {simpleHead}
        <Sheet>
          <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            <b className="mb-1 block text-ink">No earnings to show yet</b>
            When bookings are completed you&apos;ll see the commission due for that month here.
          </div>
        </Sheet>
      </>
    );
  }

  const { period, totals, commission, bookings, bankDetails, discount } = summary;
  const dueDateLabel = displayDate(period?.commissionDueDate);
  const commissionDueLabel = formatCurrency(totals?.commissionDue);
  const driverEarningsLabel = formatCurrency(totals?.driverEarnings);
  const totalGrossLabel = formatCurrency(totals?.totalGross);
  const statusBadge = statusBadgeStyles[commission?.status] || 'bg-slate-200 text-slate-700';
  // The server says when a slip may be filed: only once the month is over, and not once it's paid.
  const slipNotYet = period?.slipUploadAllowed === false;
  const canUploadSlip = commission?.status !== 'approved' && !slipNotYet;
  const baseCommissionRate =
    bookings?.find((booking) => Number.isFinite(booking.commissionBaseRate))?.commissionBaseRate ||
    0.08;
  const effectiveRate =
    (totals?.effectiveCommissionRate && totals.effectiveCommissionRate > 0
      ? totals.effectiveCommissionRate
      : totals?.commissionRate) || 0.08;
  const commissionRateLabel = formatRatePercent(effectiveRate, 2);
  const baseRateLabel = formatRatePercent(baseCommissionRate, 2);
  const discountPercentLabel = discount
    ? formatPercentValue(
        typeof discount.discountPercent === 'number'
          ? discount.discountPercent
          : (discount.discountRate ?? 0) * 100,
        2
      )
    : null;

  // ---- Desktop view data ----
  const COMMISSION_STATUS_LABELS = { pending: 'Not paid', submitted: 'Slip under review', approved: 'Paid' };
  const statusLabel = COMMISSION_STATUS_LABELS[commission?.status] || 'Not paid';
  const bookingValue = (booking) =>
    typeof booking.payableTotal === 'number' && booking.payableTotal > 0 ? booking.payableTotal : booking.totalPrice;
  const gross = Number(totals?.totalGross) || 0;
  const driverShare = Number(totals?.driverEarnings) || 0;
  const sharePercent = gross > 0 ? Math.round((driverShare / gross) * 100) : 0;
  // Last 6 months of history, oldest first, for the earnings chart.
  const chartMonths = (Array.isArray(history) ? [...history] : [])
    .filter((entry) => entry?.period?.value)
    .sort((a, b) => (a.period.value < b.period.value ? -1 : 1))
    .slice(-6);
  const chartMax = Math.max(1, ...chartMonths.map((entry) => Number(entry.totals?.driverEarnings) || 0));
  const historyRows = (Array.isArray(history) ? [...history] : []).sort((a, b) => (a.period?.value < b.period?.value ? 1 : -1));
  const copyText = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Unable to copy');
    }
  };
  const bankRows = [
    ['Account name', bankDetails?.accountName],
    ['Account number', bankDetails?.accountNumber],
    ['Bank', bankDetails?.bankName],
    ['Branch', bankDetails?.branch],
    ['SWIFT / BIC', bankDetails?.swiftCode],
    ['Reference', bankDetails?.referenceNote],
  ].filter(([, value]) => value);

  return (
    <>
      {/* ---------- Desktop ---------- */}
      <div className="hidden px-8 pb-16 pt-8 lg:block">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em] text-brand-dark">Earnings</p>
            <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-ink">My Earnings · {period?.label || selectedMonth}</h1>
            <p className="mt-1 text-[13.5px] text-muted-soft">Commission for this month is due by <b className="text-ink">{dueDateLabel}</b>.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={handleMonthSelect}
              aria-label="Month"
              className="h-11 min-w-[200px] rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-[13.5px] font-semibold text-ink focus:border-brand focus:outline-none"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <button type="button" onClick={handleRefresh} aria-label="Refresh" className="grid h-11 w-11 place-items-center rounded-xl border-[1.5px] border-[#e2e8ea] bg-white text-muted transition hover:border-muted-soft">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* KPI tiles */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="rounded-[18px] bg-white p-5 shadow-card">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted-soft">Booking value</p>
            <p className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">{totalGrossLabel}</p>
            <p className="mt-1 text-[12.5px] text-muted-soft">{totals?.bookingCount ?? bookings?.length ?? 0} completed trip{(totals?.bookingCount ?? bookings?.length ?? 0) === 1 ? '' : 's'}</p>
          </div>
          <div className="rounded-[18px] bg-gradient-to-br from-[#0c7a44] to-brand p-5 text-white shadow-card">
            <p className="text-[12px] font-bold uppercase tracking-wide text-white/80">Your earnings</p>
            <p className="mt-2 text-[26px] font-extrabold tracking-tight">{driverEarningsLabel}</p>
            <p className="mt-1 text-[12.5px] text-white/80">{sharePercent}% of booking value</p>
          </div>
          <div className="rounded-[18px] bg-white p-5 shadow-card">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted-soft">Commission ({commissionRateLabel})</p>
            <p className="mt-2 text-[26px] font-extrabold tracking-tight text-ink">{commissionDueLabel}</p>
            <p className="mt-1 text-[12.5px] text-muted-soft">{discount ? `${discount.name} applied` : `Standard rate ${baseRateLabel}`}</p>
          </div>
          <div className="rounded-[18px] bg-white p-5 shadow-card">
            <p className="text-[12px] font-bold uppercase tracking-wide text-muted-soft">Payment status</p>
            <span className={`mt-2.5 inline-block rounded-lg px-2.5 py-1 text-[12px] font-extrabold ${statusBadge}`}>{statusLabel}</span>
            <p className="mt-2 text-[12.5px] text-muted-soft">
              {commission?.paymentSlipUrl ? (
                <a href={commission.paymentSlipUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-brand-dark">View uploaded slip <ExternalLink className="h-3 w-3" /></a>
              ) : (
                `Due by ${dueDateLabel}`
              )}
            </p>
          </div>
        </div>

        {/* Where the booking value goes */}
        {gross > 0 ? (
          <div className="mt-4 rounded-[18px] bg-white px-5 py-4 shadow-card">
            <div className="flex items-center justify-between text-[12.5px] font-semibold text-muted">
              <span>Where the booking value goes</span>
              <span>{totalGrossLabel} total</span>
            </div>
            <div className="mt-2.5 flex h-3 gap-[2px] overflow-hidden rounded-full">
              <div className="h-full rounded-l-full bg-brand" style={{ width: `${sharePercent}%` }} title={`Your earnings: ${driverEarningsLabel}`} />
              <div className="h-full flex-1 rounded-r-full bg-[#9fb3c0]" title={`Commission: ${commissionDueLabel}`} />
            </div>
            <div className="mt-2 flex items-center gap-5 text-[12.5px] text-ink-soft">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Your earnings {driverEarningsLabel} ({sharePercent}%)</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[#9fb3c0]" /> Commission {commissionDueLabel} ({100 - sharePercent}%)</span>
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid grid-cols-[minmax(0,1fr)_380px] items-start gap-6">
          <div className="flex min-w-0 flex-col gap-6">
            {/* Bookings this month */}
            <section className="overflow-hidden rounded-[18px] bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
                <h2 className="text-[15px] font-extrabold text-ink">Trips in {period?.label || 'this month'}</h2>
                <span className="text-[12.5px] text-muted-soft">Confirmed trips that ended this month</span>
              </div>
              {Array.isArray(bookings) && bookings.length > 0 ? (
                <table className="w-full border-collapse text-left text-[13.5px]">
                  <thead>
                    <tr className="bg-[#f7faf8] text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">
                      <th className="px-6 py-2.5 font-bold">Traveller</th>
                      <th className="px-3 py-2.5 font-bold">Dates</th>
                      <th className="px-3 py-2.5 text-right font-bold">Booking value</th>
                      <th className="px-3 py-2.5 text-right font-bold">Commission</th>
                      <th className="px-6 py-2.5 text-right font-bold">Your earnings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking, index) => (
                      <tr key={booking.id || index} className="border-t border-hairline">
                        <td className="px-6 py-3 font-bold text-ink">{booking.travelerName}</td>
                        <td className="px-3 py-3 text-muted">{displayDate(booking.startDate)} – {displayDate(booking.endDate)}</td>
                        <td className="px-3 py-3 text-right font-semibold text-ink">{formatCurrency(bookingValue(booking))}</td>
                        <td className="px-3 py-3 text-right text-muted">
                          {formatCurrency(booking.commissionAmount)}
                          {booking.commissionDiscountLabel ? <span className="ml-1 text-[11px] text-brand-dark">({booking.commissionDiscountLabel})</span> : null}
                        </td>
                        <td className="px-6 py-3 text-right font-bold text-brand-dark">{formatCurrency(booking.driverEarnings)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-hairline bg-[#f7faf8] font-extrabold text-ink">
                      <td className="px-6 py-3" colSpan={2}>Total</td>
                      <td className="px-3 py-3 text-right">{totalGrossLabel}</td>
                      <td className="px-3 py-3 text-right">{commissionDueLabel}</td>
                      <td className="px-6 py-3 text-right text-brand-dark">{driverEarningsLabel}</td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="px-6 py-10 text-center text-[13.5px] text-muted">No confirmed trips ended during this month.</p>
              )}
            </section>

            {/* Earnings history: chart + table */}
            <section className="rounded-[18px] bg-white shadow-card">
              <div className="border-b border-hairline px-6 py-4">
                <h2 className="text-[15px] font-extrabold text-ink">Your earnings by month</h2>
                <p className="mt-0.5 text-[12.5px] text-muted-soft">After commission, last {chartMonths.length || 6} months</p>
              </div>
              {chartMonths.length > 0 ? (
                <div className="px-6 pb-2 pt-6">
                  <div className="flex h-44 items-end gap-3 border-b border-[#dfe6e2]">
                    {chartMonths.map((entry, index) => {
                      const value = Number(entry.totals?.driverEarnings) || 0;
                      const isLatest = index === chartMonths.length - 1;
                      const isSelected = entry.period.value === selectedMonth;
                      return (
                        <div key={entry.period.value} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                          {isLatest ? <span className="mb-1 text-[11.5px] font-bold text-ink">{formatCurrency(value)}</span> : null}
                          <button
                            type="button"
                            onClick={() => onMonthChange?.(entry.period.value)}
                            aria-label={`${entry.period.label}: ${formatCurrency(value)}`}
                            className={`w-full max-w-[56px] rounded-t-[4px] transition ${isSelected ? 'bg-brand' : 'bg-[#8fd1ae] hover:bg-brand'}`}
                            style={{ height: `${Math.max(2, (value / chartMax) * 100)}%` }}
                          />
                          <div className="pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-lg group-hover:block">
                            {entry.period.label}: {formatCurrency(value)} · {entry.totals?.bookingCount ?? 0} trips
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex gap-3">
                    {chartMonths.map((entry) => (
                      <span key={entry.period.value} className="flex-1 text-center text-[11.5px] font-semibold text-muted-soft">{(entry.period.label || '').replace(/ \d{4}$/, '').slice(0, 3)}</span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11.5px] text-muted-soft">Click a bar to open that month.</p>
                </div>
              ) : null}
              {historyRows.length > 0 ? (
                <table className="mt-2 w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="bg-[#f7faf8] text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">
                      <th className="px-6 py-2.5 font-bold">Month</th>
                      <th className="px-3 py-2.5 text-right font-bold">Trips</th>
                      <th className="px-3 py-2.5 text-right font-bold">Booking value</th>
                      <th className="px-3 py-2.5 text-right font-bold">Commission</th>
                      <th className="px-3 py-2.5 text-right font-bold">Your earnings</th>
                      <th className="px-6 py-2.5 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((entry) => (
                      <tr
                        key={entry.id || entry.period?.value}
                        onClick={() => onMonthChange?.(entry.period?.value)}
                        className={`cursor-pointer border-t border-hairline transition hover:bg-canvas ${entry.period?.value === selectedMonth ? 'bg-[#f3fbf6]' : ''}`}
                      >
                        <td className="px-6 py-3 font-bold text-ink">{entry.period?.label}</td>
                        <td className="px-3 py-3 text-right text-muted">{entry.totals?.bookingCount ?? 0}</td>
                        <td className="px-3 py-3 text-right text-ink-soft">{formatCurrency(entry.totals?.totalGross)}</td>
                        <td className="px-3 py-3 text-right text-ink-soft">{formatCurrency(entry.totals?.commissionDue)}</td>
                        <td className="px-3 py-3 text-right font-bold text-brand-dark">{formatCurrency(entry.totals?.driverEarnings)}</td>
                        <td className="px-6 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold ${statusBadgeStyles[entry.status] || 'bg-slate-200 text-slate-700'}`}>
                            {COMMISSION_STATUS_LABELS[entry.status] || 'Not paid'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="px-6 py-8 text-center text-[13px] text-muted">Your monthly history appears here once you have completed trips.</p>
              )}
            </section>
          </div>

          <aside className="flex flex-col gap-6">
            {/* Pay commission */}
            <section className="rounded-[18px] bg-white shadow-card">
              <div className="border-b border-hairline px-6 py-4">
                <h2 className="text-[15px] font-extrabold text-ink">Pay commission</h2>
                <p className="mt-0.5 text-[12.5px] text-muted-soft">One bank transfer by {dueDateLabel}, then upload the slip.</p>
              </div>
              <div className="px-6 py-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wide text-muted-soft">Amount due</p>
                    <p className="mt-1 text-[28px] font-extrabold tracking-tight text-ink">{commissionDueLabel}</p>
                  </div>
                  <span className={`rounded-lg px-2.5 py-1 text-[11.5px] font-extrabold ${statusBadge}`}>{statusLabel}</span>
                </div>
                <dl className="mt-4 divide-y divide-hairline rounded-xl border border-hairline">
                  {bankRows.map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                      <div className="min-w-0">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-muted-soft">{label}</dt>
                        <dd className="truncate text-[13.5px] font-semibold text-ink">{value}</dd>
                      </div>
                      <button type="button" onClick={() => copyText(String(value), label)} className="flex-shrink-0 rounded-lg px-2 py-1 text-[11.5px] font-bold text-brand-dark hover:bg-brand-tint">Copy</button>
                    </div>
                  ))}
                </dl>
                {slipNotYet && commission?.status !== 'approved' ? (
                  <p className="mt-4 rounded-xl bg-canvas px-3.5 py-3 text-[12.5px] text-muted">
                    You can upload the payment slip for {period?.label} from {period?.slipUploadOpensLabel}, once the month has ended.
                  </p>
                ) : null}
                {canUploadSlip ? (
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-70"
                  >
                    {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4" /> {commission?.paymentSlipUrl ? 'Replace payment slip' : 'Upload payment slip'}</>}
                  </button>
                ) : null}
                {commission?.status === 'approved' ? (
                  <p className="mt-4 flex items-center gap-2 rounded-xl bg-brand-tint px-3.5 py-3 text-[12.5px] font-semibold text-brand-dark">
                    <CheckCircle2 className="h-4 w-4" /> Paid and confirmed. Thank you!
                  </p>
                ) : null}
              </div>
            </section>

            {/* Commission programme */}
            <section className="rounded-[18px] bg-white px-6 py-5 shadow-card">
              <h2 className="text-[15px] font-extrabold text-ink">Commission rate</h2>
              {discount ? (
                <div className="mt-2 text-[13px] text-muted">
                  <p className="font-bold text-ink">{discount.name}</p>
                  <p className="mt-1">
                    {discountPercentLabel} off the standard {baseRateLabel}. You pay <b className="text-ink">{commissionRateLabel}</b> on trips in this window.
                  </p>
                  <p className="mt-1 text-[12px] text-muted-soft">
                    {discount.status === 'scheduled'
                      ? `Starts ${displayDate(discount.startDate)}`
                      : discount.status === 'expired'
                      ? `Ended ${displayDate(discount.endDate)}`
                      : `Valid through ${displayDate(discount.endDate)}`}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-[13px] text-muted">Standard commission is {baseRateLabel} of each trip&apos;s booking value. No promotional discount this month.</p>
              )}
              <p className="mt-3 border-t border-hairline pt-3 text-[12px] leading-relaxed text-muted-soft">
                Commission is due by the 10th of the following month. Unpaid commission after that freezes your account until it is paid.
              </p>
            </section>
          </aside>
        </div>
      </div>

      {/* ---------- Phones ---------- */}
      <div className="lg:hidden">
      <MobileHeader
        onMenu={onMenu}
        right={<Avatar name={driverName} image={driverImage} tone="light" className="h-10 w-10 text-[15px]" />}
        pb="pb-16"
      >
        <div className="pt-4">
          <p className="text-[12px] font-extrabold tracking-[0.08em] text-white/80">
            EARNINGS · {(period?.label || selectedMonth || '').toUpperCase()}
          </p>
          <div className="mt-1 text-[40px] font-extrabold leading-none tracking-tight">
            {driverEarningsLabel}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[12.5px] font-bold">
            Commission due {commissionDueLabel}
          </div>
        </div>
      </MobileHeader>

      <Sheet pull="-mt-12">
        <div className="mb-3 flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={handleMonthSelect}
            className="flex-1 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-[13px] font-semibold text-ink focus:border-brand focus:outline-none"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleRefresh}
            aria-label="Refresh"
            className="grid h-11 w-11 place-items-center rounded-xl border-[1.5px] border-[#e2e8ea] bg-white text-muted transition hover:border-muted-soft"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <StatCard label="Total booking value" value={totalGrossLabel} />
          <StatCard label="Driver share" value={driverEarningsLabel} />
          <StatCard label={`Commission (${commissionRateLabel})`} value={commissionDueLabel} highlight />
          <div className="rounded-2xl bg-white p-[14px] shadow-card">
            <p className="text-[12px] font-semibold text-muted-soft">Payment status</p>
            <span className={`mt-1.5 inline-block rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase ${statusBadge}`}>
              {commission?.status || 'pending'}
            </span>
            {commission?.paymentSlipUrl ? (
              <a
                href={commission.paymentSlipUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 flex items-center gap-1.5 text-[12px] font-bold text-brand-dark"
              >
                <BadgeCheck className="h-4 w-4" />
                View slip
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-3 rounded-[18px] bg-white p-4 shadow-card">
          <p className="text-[12px] font-extrabold uppercase tracking-wide text-muted-soft">
            Commission programme
          </p>
          {discount ? (
            <div className="mt-1.5 space-y-1 text-[13px] text-muted">
              <p className="text-[14px] font-bold text-ink">{discount.name}</p>
              <p>
                {discountPercentLabel} off the standard {baseRateLabel} commission. You&apos;re paying{' '}
                <b className="text-ink">{commissionRateLabel}</b> on bookings in this window.
              </p>
              <p className="text-[12px] text-muted-soft">
                {discount.status === 'scheduled'
                  ? `Starts ${displayDate(discount.startDate)}`
                  : discount.status === 'expired'
                  ? `Ended ${displayDate(discount.endDate)}`
                  : `Valid through ${displayDate(discount.endDate)}`}
              </p>
            </div>
          ) : (
            <p className="mt-1.5 text-[13px] text-muted">
              No promotional discount this month. Standard commission is {baseRateLabel}.
            </p>
          )}
        </div>

        <div className="mt-3 rounded-[18px] bg-white p-4 shadow-card">
          <b className="text-[14px] text-ink">Bank details</b>
          <p className="text-[12px] text-muted-soft">
            Transfer the commission by {dueDateLabel || 'month end'} as a single payment.
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3">
            <DetailLine label="Account name" value={bankDetails?.accountName || '—'} />
            <DetailLine label="Account number" value={bankDetails?.accountNumber || '—'} />
            <DetailLine label="Bank" value={bankDetails?.bankName || '—'} />
            <DetailLine label="Branch" value={bankDetails?.branch || '—'} />
            {bankDetails?.swiftCode ? (
              <DetailLine label="SWIFT / BIC" value={bankDetails.swiftCode} />
            ) : null}
            <DetailLine label="Reference" value={bankDetails?.referenceNote || '—'} fullWidth />
          </dl>
          {slipNotYet && commission?.status !== 'approved' ? (
            <p className="mt-3 rounded-[12px] bg-canvas px-3 py-2.5 text-[12.5px] text-muted">
              You can upload the payment slip for {period?.label} from {period?.slipUploadOpensLabel}, once the month has ended.
            </p>
          ) : null}
          {canUploadSlip ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={handleUploadClick}
                disabled={uploading}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-[12px] bg-brand py-3 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-70"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" /> Upload payment slip
                  </>
                )}
              </button>
            </>
          ) : null}
        </div>

        <div className="mb-2.5 mt-5 flex items-center justify-between px-0.5">
          <b className="text-base font-extrabold text-ink">Bookings this month</b>
          <span className="text-[12px] text-muted-soft">
            {totals?.bookingCount ?? bookings?.length ?? 0}
          </span>
        </div>
        {Array.isArray(bookings) && bookings.length > 0 ? (
          <div className="overflow-hidden rounded-[18px] bg-white shadow-card">
            {bookings.map((booking, index) => (
              <div
                key={booking.id || index}
                className={`flex items-center justify-between px-4 py-3 ${
                  index > 0 ? 'border-t border-hairline' : ''
                }`}
              >
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-bold text-ink">{booking.travelerName}</div>
                  <div className="text-[12px] text-muted-soft">
                    {displayDate(booking.startDate)} – {displayDate(booking.endDate)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-bold text-ink">
                    {formatCurrency(
                      typeof booking.payableTotal === 'number' && booking.payableTotal > 0
                        ? booking.payableTotal
                        : booking.totalPrice
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-brand-dark">
                    +{formatCurrency(booking.driverEarnings)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            No confirmed bookings were completed during this month.
          </div>
        )}
      </Sheet>
      </div>
    </>
  );
};

const buildDriverProfileForm = (profile) => ({
  name: profile?.name || '',
  contactNumber: profile?.contactNumber || '',
  experienceYears: (() => {
    const numeric = Number(profile?.experienceYears);
    return Number.isFinite(numeric) && numeric >= 0 ? String(numeric) : '';
  })(),
  // Older typed locations are preselected as their nearest list town when one matches.
  address: guessLocationName(profile?.address) || profile?.address || '',
  serviceAreas: Array.isArray(profile?.serviceAreas) ? profile.serviceAreas : [],
  description: profile?.description || '',
  tripAdvisor: profile?.tripAdvisor || '',
  profilePhoto: profile?.profilePhoto || '',
  currentLocationLabel: profile?.driverLocation?.label || '',
  currentLatitude:
    typeof profile?.driverLocation?.latitude === 'number'
      ? String(profile.driverLocation.latitude)
      : '',
  currentLongitude:
    typeof profile?.driverLocation?.longitude === 'number'
      ? String(profile.driverLocation.longitude)
      : '',
});

// A titled card for the profile edit screen: heading and short description on top,
// fields below. Roomier padding on desktop.
const FormSection = ({ title, description, action, children }) => (
  <section className="rounded-[18px] bg-white shadow-card">
    <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 lg:px-6 lg:py-4">
      <div className="min-w-0">
        <h3 className="text-[14.5px] font-extrabold text-ink">{title}</h3>
        {description ? <p className="mt-0.5 text-[12px] leading-relaxed text-muted-soft">{description}</p> : null}
      </div>
      {action}
    </div>
    <div className="p-4 lg:p-6">{children}</div>
  </section>
);

const DriverProfilePanel = ({
  onMenu,
  onProfileRefresh,
  driverName,
  driverImage,
  onLogout,
  profile,
  onSave,
  onPasswordChange,
  onLicenseSave,
  savingProfile,
  savingPassword,
  licenseSaving,
}) => {
  const [mode, setMode] = useState('view');
  const [formState, setFormState] = useState(() => buildDriverProfileForm(profile));
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    password: '',
    confirmPassword: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(profile?.profilePhoto || '');
  const [removePhoto, setRemovePhoto] = useState(false);
  const [clearLocation, setClearLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  const [licenseType, setLicenseType] = useState(profile?.licenseType || '');
  const [licenseExpiry, setLicenseExpiry] = useState(profile?.licenseExpiresAt ? String(profile.licenseExpiresAt).slice(0, 10) : '');
  // An approved licence can't be resubmitted until it expires (the server enforces this too).
  const licenseLocked =
    profile?.licenseStatus === 'approved' && (!profile?.licenseExpiresAt || new Date(profile.licenseExpiresAt) > new Date());
  const licenseExpiryLabel = profile?.licenseExpiresAt
    ? new Date(profile.licenseExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const [licenseFile, setLicenseFile] = useState(null);
  const [licensePreview, setLicensePreview] = useState(profile?.licenseImage || '');
  const photoInputRef = useRef(null);
  const licenseInputRef = useRef(null);

  useEffect(() => {
    setFormState(buildDriverProfileForm(profile));
    setPhotoPreview(profile?.profilePhoto || '');
    setPhotoFile(null);
    setRemovePhoto(false);
    setClearLocation(false);
    setLocating(false);
    setLocationStatus('');
    setLicenseType(profile?.licenseType || '');
    setLicensePreview(profile?.licenseImage || '');
    setLicenseFile(null);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  useEffect(() => {
    return () => {
      if (licensePreview && licensePreview.startsWith('blob:')) {
        URL.revokeObjectURL(licensePreview);
      }
    };
  }, [licensePreview]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (['currentLocationLabel', 'currentLatitude', 'currentLongitude'].includes(name)) {
      setClearLocation(false);
    }
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    let processedFile = file;
    // Compress all images proactively, especially for mobile photos
    if (file.size && file.size > 2 * 1024 * 1024) {
      try {
        toast.loading('Optimizing image...', { id: 'compress-photo' });
        processedFile = await compressImageIfNeeded(file);
        toast.success('Image optimized successfully', { id: 'compress-photo' });
      } catch (error) {
        toast.error(error?.message || 'Unable to optimize image. Please try a different photo.', { id: 'compress-photo' });
        event.target.value = '';
        return;
      }
    }
    // Final size validation
    if (processedFile.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error('Image is too large (max 10MB). Please choose a smaller image.');
      event.target.value = '';
      return;
    }
    setPhotoFile(processedFile);
    setRemovePhoto(false);
    setPhotoPreview((current) => {
      if (current && current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(processedFile);
    });
  };

  const handleRemovePhotoClick = () => {
    setPhotoFile(null);
    setRemovePhoto(true);
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview('');
  };

  const handleLicenseFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    let processedFile = file;
    if (file.size && file.size > 2 * 1024 * 1024) {
      try {
        toast.loading('Optimizing image...', { id: 'compress-license' });
        processedFile = await compressImageIfNeeded(file);
        toast.success('Image optimized successfully', { id: 'compress-license' });
      } catch (error) {
        toast.error(error?.message || 'Unable to optimize image. Please try a different photo.', { id: 'compress-license' });
        event.target.value = '';
        return;
      }
    }
    if (processedFile.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error('Image is too large (max 10MB). Please choose a smaller image.');
      event.target.value = '';
      return;
    }
    setLicenseFile(processedFile);
    setLicensePreview((current) => {
      if (current && current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(processedFile);
    });
  };

  const handleLicenseSubmit = async (event) => {
    event.preventDefault();
    if (!onLicenseSave) {
      return;
    }
    if (!licenseType) {
      toast.error('Select your license type.');
      return;
    }
    if (!licenseFile && !profile?.licenseImage) {
      toast.error('Upload an image of your SLTDA license, not your driving license.');
      return;
    }
    if (!licenseExpiry) {
      toast.error('Enter the expiry date shown on your license.');
      return;
    }
    try {
      const payload = new FormData();
      payload.append('licenseType', licenseType);
      payload.append('licenseExpiresAt', licenseExpiry);
      if (licenseFile) {
        payload.append('licenseImage', licenseFile);
      }
      await onLicenseSave(payload);
    } catch (error) {
      console.warn('License submit failed', error);
    }
  };

  const handleClearLocation = () => {
    setFormState((prev) => ({
      ...prev,
      currentLocationLabel: '',
      currentLatitude: '',
      currentLongitude: '',
    }));
    setClearLocation(true);
    setLocationStatus('Location cleared. Save to remove yourself from the live map.');
  };

  const handleUseLiveLocation = () => {
    setLocating(true);
    setLocationStatus('Requesting your current position...');

    getDeviceLocation()
      .then(({ latitude, longitude }) => {
        setLocating(false);
        setFormState((prev) => ({
          ...prev,
          currentLatitude: latitude.toFixed(6),
          currentLongitude: longitude.toFixed(6),
        }));
        setClearLocation(false);
        setLocationStatus('Location captured from your device.');
      })
      .catch((error) => {
        setLocating(false);
        const message =
          error?.message ||
          'Unable to fetch your location. Check permissions or enter coordinates manually.';
        setLocationStatus(message);
        toast.error(message);
        console.warn('Geolocation error', error);
      });
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!onSave) {
      return;
    }

    const hasExperienceInput =
      formState.experienceYears !== undefined &&
      formState.experienceYears !== null &&
      String(formState.experienceYears).trim() !== '';

    let normalizedExperience = null;
    if (hasExperienceInput) {
      const parsedExperience = Number(formState.experienceYears);
      if (!Number.isFinite(parsedExperience) || parsedExperience < 0) {
        toast.error('Enter your driving experience in years (0 or more).');
        return;
      }
      normalizedExperience = Math.min(60, Math.round(parsedExperience));
    }

    try {
      const payload = new FormData();
      payload.append('name', formState.name);
      payload.append('contactNumber', formState.contactNumber || '');
      if (hasExperienceInput && normalizedExperience !== null) {
        payload.append('experienceYears', String(normalizedExperience));
      }
      payload.append('address', formState.address || '');
      payload.append('serviceAreas', (formState.serviceAreas || []).join(','));
      payload.append('description', formState.description || '');
      payload.append('tripAdvisor', formState.tripAdvisor || '');

      if (photoFile) {
        payload.append('profilePhoto', photoFile);
      } else if (removePhoto) {
        payload.append('removeProfilePhoto', 'true');
      }

      const hasEditedLocation =
        (formState.currentLocationLabel && formState.currentLocationLabel.trim()) ||
        formState.currentLatitude ||
        formState.currentLongitude;

      if (clearLocation) {
        payload.append('clearLocation', 'true');
      } else if (!hasEditedLocation && profile?.driverLocation) {
        payload.append('clearLocation', 'true');
      } else {
        if (formState.currentLocationLabel.trim()) {
          payload.append('currentLocationLabel', formState.currentLocationLabel.trim());
        }
        if (formState.currentLatitude) {
          payload.append('currentLatitude', formState.currentLatitude);
        }
        if (formState.currentLongitude) {
          payload.append('currentLongitude', formState.currentLongitude);
        }
      }

      await onSave(payload);
      setMode('view');
    } catch (error) {
      console.warn('Driver profile update failed', error);
    }
  };

  const handlePasswordFieldChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (!onPasswordChange) {
      return;
    }
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
      setMode('view');
    } catch (error) {
      console.warn('Driver password update failed', error);
    }
  };

  if (!profile) {
    return (
      <>
        <MobileHeader onMenu={onMenu} pb="pb-16" />
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading profile…
          </div>
        </Sheet>
      </>
    );
  }

  const inputCls =
    'mt-1 h-11 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-sm font-medium text-ink placeholder:font-normal placeholder:text-[#adb8c0] focus:border-brand focus:outline-none';
  const labelCls = 'text-[12.5px] font-bold text-ink-soft';
  const headerAvatar = <Avatar name={driverName} image={driverImage} tone="light" className="h-10 w-10 text-[15px]" />;
  const city = profile?.driverLocation?.label || profile?.address || 'Colombo';

  if (mode === 'password') {
    return (
      <>
        <MobileHeader
          onBack={() => setMode('view')}
          cancelLabel="Cancel"
          right={headerAvatar}
          eyebrow="SECURITY"
          title="Change password"
        />
        <Sheet>
          <form onSubmit={handlePasswordSubmit} className="rounded-[18px] bg-white p-4 shadow-card">
            <div>
              <label className={labelCls} htmlFor="driver-password-current">Current password</label>
              <input id="driver-password-current" name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={handlePasswordFieldChange} className={inputCls} required />
            </div>
            <div className="mt-3">
              <label className={labelCls} htmlFor="driver-password-new">New password</label>
              <input id="driver-password-new" name="password" type="password" value={passwordForm.password} onChange={handlePasswordFieldChange} className={inputCls} required minLength={8} />
            </div>
            <div className="mt-3">
              <label className={labelCls} htmlFor="driver-password-confirm">Confirm new password</label>
              <input id="driver-password-confirm" name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={handlePasswordFieldChange} className={inputCls} required />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70"
            >
              {savingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Updating…
                </>
              ) : (
                'Update password'
              )}
            </button>
          </form>
        </Sheet>
      </>
    );
  }

  if (mode === 'edit') {
    return (
      <>
        <MobileHeader
          onBack={() => setMode('view')}
          cancelLabel="Cancel"
          right={headerAvatar}
          eyebrow="PROFILE"
          title="Edit details"
        />
        <Sheet wide>
          {/* Phones: one column. Desktop: photos on the left (stay in view), the
              details in titled sections on the right. */}
          <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6">
            <aside className="flex flex-col gap-3 lg:sticky lg:top-6">
              <section className="rounded-[18px] bg-white p-4 shadow-card lg:p-6">
                <div className="flex items-center gap-3.5 lg:flex-col lg:text-center">
                  <div className="grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-2xl bg-canvas lg:h-28 lg:w-28 lg:rounded-full lg:ring-4 lg:ring-[#f3fbf6]">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Avatar name={formState.name} className="h-full w-full rounded-2xl text-xl lg:rounded-full lg:text-3xl" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 lg:flex-none">
                    <p className="text-[13.5px] font-bold text-ink">Profile photo</p>
                    <p className="mt-0.5 hidden text-[11.5px] text-muted-soft lg:block">A clear photo of your face helps travellers trust you.</p>
                    <div className="lg:flex lg:justify-center">
                <div className="mt-1.5 flex gap-2">
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                  <button type="button" onClick={() => photoInputRef.current?.click()} className="rounded-lg border-[1.5px] border-[#e2e8ea] px-3 py-1.5 text-[12px] font-bold text-ink">
                    Upload
                  </button>
                  {photoPreview || profile?.profilePhoto ? (
                    <button type="button" onClick={handleRemovePhotoClick} className="rounded-lg border-[1.5px] border-[#ffd3d9] px-3 py-1.5 text-[12px] font-bold text-[#f43f5e]">
                      Remove
                    </button>
                  ) : null}
                </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Cover photo uploads and removes on its own (it needs admin approval). */}
              <CoverPhotoCard key={profile?.id || 'cover'} profile={profile} className="lg:p-6" onChanged={onProfileRefresh} />
            </aside>

            <div className="flex min-w-0 flex-col gap-3">
              <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3">
                <FormSection title="Personal details" description="Shown on your public profile.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                <label className={labelCls} htmlFor="driver-profile-name">Name</label>
                <input id="driver-profile-name" name="name" value={formState.name} onChange={handleFieldChange} className={inputCls} required />
                    </div>
                    <div>
                <label className={labelCls} htmlFor="driver-profile-contact">Contact number</label>
                <input id="driver-profile-contact" name="contactNumber" value={formState.contactNumber} onChange={handleFieldChange} className={inputCls} placeholder="e.g. +94 71 555 5555" />
                    </div>
                    <div>
                <label className={labelCls} htmlFor="driver-profile-experience">Years of driving experience</label>
                <input id="driver-profile-experience" name="experienceYears" type="number" inputMode="numeric" min="0" max="60" value={formState.experienceYears} onChange={handleFieldChange} className={inputCls} placeholder="e.g. 5" />
                    </div>
                  </div>
                </FormSection>

                <FormSection title="Where you work" description="Travellers use this to find drivers near them, and it decides which city pages you appear on.">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div>
                      <label className={labelCls} htmlFor="driver-profile-address">Base location</label>
                      <LocationSelect id="driver-profile-address" name="address" value={formState.address} onChange={(_value, event) => handleFieldChange(event)} className={inputCls} />
                      <p className="mt-1 text-[11.5px] text-muted-soft">Choose the town you are based in, or the nearest one.</p>
                      {formState.address && !guessLocationName(formState.address) ? (
                        <p className="mt-1 text-[11.5px] font-semibold text-amber-700">
                          Your current location &quot;{formState.address}&quot; is not in the list. Please choose your town or the nearest one.
                        </p>
                      ) : null}
                    </div>
                    <div className="lg:col-span-2">
                      <span className={`${labelCls} block`}>Also available in</span>
                      <div className="mt-1.5">
                        <ServiceAreasPicker value={formState.serviceAreas} onChange={(serviceAreas) => setFormState((prev) => ({ ...prev, serviceAreas }))} />
                      </div>
                    </div>
                  </div>
                </FormSection>

                <FormSection title="About you" description="Your bio is public. Tell travellers about your experience and the trips you love.">
                  <div className="flex flex-col gap-3">
                    <div>
                <label className={labelCls} htmlFor="driver-profile-description">Bio</label>
                <textarea id="driver-profile-description" name="description" value={formState.description} onChange={handleFieldChange} rows={4} className="mt-1 w-full rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 py-2.5 text-sm text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none" placeholder="Tell travellers about your experience and specialties." />
                <p className="mt-1 text-[11.5px] text-muted-soft">Do not put phone numbers, email addresses or links here — your bio is public and is not masked.</p>
                <ContactWarning value={formState.description} messageFor={bioContactWarningMessage} />
                    </div>
                    <div>
                <label className={labelCls} htmlFor="driver-profile-tripAdvisor">TripAdvisor link</label>
                <input id="driver-profile-tripAdvisor" name="tripAdvisor" value={formState.tripAdvisor} onChange={handleFieldChange} className={inputCls} placeholder="https://" />
                    </div>
                  </div>
                </FormSection>

                <FormSection
                  title="Live location"
                  description="Set your base so the homepage map can spotlight you."
                  action={formState.currentLatitude || formState.currentLongitude || formState.currentLocationLabel ? (
                    <button type="button" onClick={handleClearLocation} className="text-[12px] font-bold text-[#f43f5e]">Clear</button>
                  ) : null}
                >
                            <button
                type="button"
                onClick={handleUseLiveLocation}
                disabled={locating}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-[#cdeede] bg-[#f3fbf6] py-2.5 text-[13px] font-bold text-brand-dark transition disabled:opacity-70"
              >
                {locating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Locating…
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4" /> Use my device location
                  </>
                )}
              </button>
              <div className="mt-2.5">
                <label className={labelCls} htmlFor="driver-profile-location-label">Location label</label>
                <input id="driver-profile-location-label" name="currentLocationLabel" value={formState.currentLocationLabel} onChange={handleFieldChange} className={inputCls} placeholder="e.g. Near Kandy city center" />
              </div>
              {formState.currentLatitude && formState.currentLongitude ? (
                <p className="mt-1.5 text-[12px] font-semibold text-brand-dark">
                  Captured {formState.currentLatitude}, {formState.currentLongitude}
                </p>
              ) : null}
              {locationStatus ? <p className="mt-1.5 text-[12px] text-muted-soft">{locationStatus}</p> : null}
                </FormSection>

            <button
              type="submit"
              disabled={savingProfile}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[15px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70 lg:ml-auto lg:w-auto lg:px-10 lg:py-3"
            >
              {savingProfile ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                'Save changes'
              )}
            </button>

              </form>

          <form onSubmit={handleLicenseSubmit} className="flex flex-col gap-3">
            <div className="rounded-[18px] bg-white p-4 shadow-card lg:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[14.5px] font-extrabold text-ink">{LICENSE_COPY.heading}</h3>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${LICENSE_STATUS_TAGS[profile?.licenseStatus] || 'bg-canvas text-muted-soft'}`}>
                  {licenseStatusLabel(profile?.licenseStatus)}
                </span>
              </div>
              {licenseLocked ? (
                <div className="mt-3 rounded-lg border border-[#cdeede] bg-[#f3fbf6] p-3 text-[12.5px] text-brand-dark">
                  <p className="font-bold">
                    {profile?.licenseType ? `${profile.licenseType} · ` : ''}Approved{licenseExpiryLabel ? ` until ${licenseExpiryLabel}` : ''}
                  </p>
                  <p className="mt-1 text-muted">
                    {licenseExpiryLabel
                      ? 'You can submit a new license after this date.'
                      : 'Your license is approved. Contact support if you need to update it.'}
                  </p>
                </div>
              ) : (
              <>
              <p className="mt-0.5 text-[12px] text-muted-soft">Select your license type and upload a photo for admin verification.</p>

              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
                <p className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" /> {LICENSE_COPY.warningTitle}
                </p>
                <p className="mt-1 leading-relaxed">{LICENSE_COPY.warningBody}</p>
              </div>

              {profile?.licenseStatus === 'rejected' && profile?.licenseAdminNote ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-700">
                  <p className="font-bold">Admin note</p>
                  <p>{profile.licenseAdminNote}</p>
                </div>
              ) : null}

              <div className="mt-3">
                <label className={labelCls} htmlFor="driver-license-type">{LICENSE_COPY.typeHeading}</label>
                <select
                  id="driver-license-type"
                  value={licenseType}
                  onChange={(event) => setLicenseType(event.target.value)}
                  className={inputCls}
                  required
                >
                  <option value="">Select license type</option>
                  {LICENSE_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="mt-3 flex items-center gap-3.5">
                <div className="grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-2xl bg-canvas">
                  {licensePreview ? (
                    <img src={licensePreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ShieldCheck className="h-6 w-6 text-muted-soft" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-bold text-ink">{LICENSE_COPY.photoHeading}</p>
                  <p className="mt-0.5 text-[11.5px] text-muted-soft">{LICENSE_COPY.photoHelp}</p>
                  <div className="mt-1.5">
                    <input ref={licenseInputRef} type="file" accept="image/*" className="hidden" onChange={handleLicenseFileChange} />
                    <button type="button" onClick={() => licenseInputRef.current?.click()} className="rounded-lg border-[1.5px] border-[#e2e8ea] px-3 py-1.5 text-[12px] font-bold text-ink">
                      Upload
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <label className={labelCls} htmlFor="driver-license-expiry">License expiry date</label>
                <input
                  id="driver-license-expiry"
                  type="date"
                  value={licenseExpiry}
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  onChange={(event) => setLicenseExpiry(event.target.value)}
                  className={inputCls}
                  required
                />
                <p className="mt-1 text-[11.5px] text-muted-soft">As printed on your license. Once approved, you can submit a new license only after this date.</p>
              </div>
              </>
              )}
            </div>

            {licenseLocked ? null : (
            <button
              type="submit"
              disabled={licenseSaving}
              className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-brand py-[15px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70 lg:ml-auto lg:w-auto lg:px-10 lg:py-3"
            >
              {licenseSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : (
                'Submit license'
              )}
            </button>
            )}
          </form>
            </div>
          </div>
        </Sheet>
      </>
    );
  }

  // Desktop profile overview: what's filled in, for the checklist card.
  const serviceAreaNames = (profile?.serviceAreas || [])
    .map((slug) => SERVICE_AREAS.find((area) => area.slug === slug)?.name)
    .filter(Boolean);
  const checklist = [
    { label: 'Profile photo', done: Boolean(profile?.profilePhoto) },
    { label: 'Cover photo', done: profile?.coverPhotoStatus === 'approved', note: profile?.coverPhotoStatus === 'pending' ? 'Waiting for approval' : '' },
    { label: 'Bio (at least 100 characters)', done: (profile?.description || '').trim().length >= 100 },
    { label: 'Base town from the list', done: Boolean(guessLocationName(profile?.address)) },
    { label: '"Also available in" areas', done: serviceAreaNames.length > 0 },
    { label: 'SLTDA licence approved', done: profile?.licenseStatus === 'approved' },
  ];
  const checklistDone = checklist.filter((item) => item.done).length;
  const baseTown = guessLocationName(profile?.address) || profile?.address || '';
  const expiryText = profile?.licenseExpiresAt
    ? new Date(profile.licenseExpiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <>
      {/* Phones keep the green header; desktop uses the profile card below instead. */}
      <div className="lg:hidden">
        <MobileHeader
          onMenu={onMenu}
          pb="pb-20"
          right={
            <button
              type="button"
              onClick={onLogout}
              className="h-10 rounded-xl bg-white/[0.18] px-3.5 text-[13px] font-bold text-white transition hover:bg-white/25"
            >
              Logout
            </button>
          }
        />
      </div>
      <Sheet pull="-mt-14" wide className="lg:!mt-8">
        {/* ---------- Desktop ---------- */}
        <div className="hidden lg:block">
          <section className="overflow-hidden rounded-[20px] bg-white shadow-card">
            <div className="relative h-44 bg-gradient-to-br from-[#0c7a44] to-brand">
              {profile?.coverPhoto ? <img src={profile.coverPhoto} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="flex items-end gap-6 px-8 pb-6">
              <div className="relative z-10 -mt-14 flex-shrink-0 rounded-full bg-white p-1.5 shadow-[0_8px_22px_rgba(15,31,45,0.16)]">
                <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full">
                  {profile?.profilePhoto ? (
                    <img src={profile.profilePhoto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Avatar name={profile?.name} className="h-full w-full rounded-full text-[36px]" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1 pt-4">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-[26px] font-extrabold tracking-tight text-ink">{profile?.name || 'Driver'}</h1>
                  <BadgeCheck className="h-6 w-6 flex-shrink-0 text-brand" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] font-bold">
                  <span className="rounded-full bg-brand-tint px-3 py-1 text-brand-dark">Approved driver</span>
                  {profile?.licenseType ? <span className="rounded-full bg-[#e5f0fb] px-3 py-1 text-[#1d6fb8]">{profile.licenseType}</span> : null}
                  {baseTown ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-3 py-1 text-ink-soft"><MapPin className="h-3.5 w-3.5" /> {baseTown}</span>
                  ) : null}
                  {profile?.experienceYears ? <span className="rounded-full bg-canvas px-3 py-1 text-ink-soft">{profile.experienceYears} years driving</span> : null}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                {profile?.id ? (
                  <a href={`/drivers/${profile.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-[#e2e8ea] px-4 text-[13.5px] font-bold text-ink transition hover:border-brand">
                    <ExternalLink className="h-4 w-4" /> View public profile
                  </a>
                ) : null}
                <button type="button" onClick={() => setMode('edit')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark">
                  <Pencil className="h-4 w-4" /> Edit profile
                </button>
              </div>
            </div>
          </section>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_340px] items-start gap-6">
            <div className="flex min-w-0 flex-col gap-6">
              <section className="rounded-[18px] bg-white shadow-card">
                <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
                  <h2 className="text-[15px] font-extrabold text-ink">About</h2>
                  <button type="button" onClick={() => setMode('edit')} className="text-[13px] font-bold text-brand-dark hover:text-brand">Edit</button>
                </div>
                <p className="whitespace-pre-line px-6 py-5 text-[14px] leading-relaxed text-ink-soft">
                  {profile?.description || 'Add a short bio so travellers know what makes your tours special.'}
                </p>
              </section>

              <section className="rounded-[18px] bg-white shadow-card">
                <div className="border-b border-hairline px-6 py-4">
                  <h2 className="text-[15px] font-extrabold text-ink">Details</h2>
                </div>
                <dl className="grid grid-cols-2 gap-x-8 gap-y-5 px-6 py-5 text-[13.5px]">
                  <div>
                    <dt className="text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">Contact number</dt>
                    <dd className="mt-1 flex items-center gap-2 font-semibold text-ink"><Phone className="h-4 w-4 text-muted-soft" /> {profile?.contactNumber || 'Not added'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">Base location</dt>
                    <dd className="mt-1 flex items-center gap-2 font-semibold text-ink"><MapPin className="h-4 w-4 text-muted-soft" /> {baseTown || 'Not set'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">Also available in</dt>
                    <dd className="mt-1 font-semibold text-ink">{serviceAreaNames.length ? serviceAreaNames.join(', ') : 'Not set'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">Driving experience</dt>
                    <dd className="mt-1 font-semibold text-ink">{profile?.experienceYears ? `${profile.experienceYears} years` : 'Not added'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">SLTDA licence</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-ink">
                      <ShieldCheck className="h-4 w-4 text-muted-soft" />
                      {profile?.licenseType || 'Not submitted'}
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${LICENSE_STATUS_TAGS[profile?.licenseStatus] || 'bg-canvas text-muted-soft'}`}>
                        {licenseStatusLabel(profile?.licenseStatus)}
                      </span>
                    </dd>
                    {expiryText ? <p className="mt-0.5 text-[12px] text-muted-soft">Valid until {expiryText}</p> : null}
                  </div>
                  <div>
                    <dt className="text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">TripAdvisor</dt>
                    <dd className="mt-1 font-semibold">
                      {profile?.tripAdvisor ? (
                        <a href={profile.tripAdvisor} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand-dark hover:text-brand">View TripAdvisor profile <ExternalLink className="h-3.5 w-3.5" /></a>
                      ) : (
                        <span className="text-ink">Not added</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            <aside className="flex flex-col gap-6">
              <section className="rounded-[18px] bg-white shadow-card">
                <div className="border-b border-hairline px-6 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-extrabold text-ink">Profile checklist</h2>
                    <span className="text-[12.5px] font-bold text-brand-dark">{checklistDone}/{checklist.length}</span>
                  </div>
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${(checklistDone / checklist.length) * 100}%` }} />
                  </div>
                  <p className="mt-2 text-[12px] text-muted-soft">Complete profiles get more quote requests and bookings.</p>
                </div>
                <ul className="flex flex-col gap-2.5 px-6 py-4 text-[13px]">
                  {checklist.map((item) => (
                    <li key={item.label} className="flex items-start gap-2.5">
                      {item.done ? <CheckCircle2 className="mt-px h-4 w-4 flex-shrink-0 text-brand" /> : <Circle className="mt-px h-4 w-4 flex-shrink-0 text-[#c3ccd3]" />}
                      <span className={item.done ? 'text-ink-soft' : 'font-semibold text-ink'}>
                        {item.label}
                        {!item.done && item.note ? <span className="ml-1 font-normal text-muted-soft">· {item.note}</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
                {checklistDone < checklist.length ? (
                  <div className="px-6 pb-5">
                    <button type="button" onClick={() => setMode('edit')} className="w-full rounded-xl bg-brand-tint py-2.5 text-[13px] font-bold text-brand-dark transition hover:bg-[#d8f1e3]">Complete your profile</button>
                  </div>
                ) : null}
              </section>

              <section className="overflow-hidden rounded-[18px] bg-white shadow-card">
                <div className="border-b border-hairline px-6 py-4">
                  <h2 className="text-[15px] font-extrabold text-ink">Account</h2>
                </div>
                <button type="button" onClick={() => setMode('password')} className="flex w-full items-center gap-3 px-6 py-3.5 text-left transition hover:bg-canvas">
                  <KeyRound className="h-[18px] w-[18px] text-muted" strokeWidth={1.8} />
                  <span className="flex-1 text-[13.5px] font-semibold text-ink">Change password</span>
                  <ChevronRight className="h-4 w-4 text-[#c3ccd3]" />
                </button>
                <a href="mailto:support@carwithdriver.lk" className="flex w-full items-center gap-3 border-t border-hairline px-6 py-3.5 text-left transition hover:bg-canvas">
                  <LifeBuoy className="h-[18px] w-[18px] text-muted" strokeWidth={1.8} />
                  <span className="flex-1 text-[13.5px] font-semibold text-ink">Help &amp; support</span>
                  <ChevronRight className="h-4 w-4 text-[#c3ccd3]" />
                </a>
                <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 border-t border-hairline px-6 py-3.5 text-left text-[13.5px] font-bold text-[#f43f5e] transition hover:bg-[#fef4f5]">
                  Log out
                </button>
              </section>
            </aside>
          </div>
        </div>

        {/* ---------- Phones ---------- */}
        <div className="lg:hidden">
        <div className="flex flex-col items-center">
          <div className="-mt-12 rounded-[24px] bg-white p-1 shadow-[0_8px_22px_rgba(15,31,45,0.14)]">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[20px]">
              {profile?.profilePhoto ? (
                <img src={profile.profilePhoto} alt="" className="h-full w-full object-cover" />
              ) : (
                <Avatar name={profile?.name} className="h-full w-full rounded-[20px] text-[30px]" />
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5">
            <b className="text-[20px] text-ink">{profile?.name || 'Driver'}</b>
            <BadgeCheck className="h-[18px] w-[18px] text-brand" />
          </div>
          <div className="mt-0.5 text-[13px] font-semibold text-muted-soft">Approved driver · {city}</div>
        </div>

        <div className="mt-4 rounded-[18px] bg-white p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <b className="text-[14px] text-ink">About</b>
            <button type="button" onClick={() => setMode('edit')} className="text-[12.5px] font-bold text-brand-dark">
              Edit
            </button>
          </div>
          <p className="text-[13px] leading-relaxed text-muted">
            {profile?.description || 'Add a short bio so travellers know what makes your tours special.'}
          </p>
        </div>

        <div className="mt-3 rounded-[18px] bg-white p-4 shadow-card">
          <b className="text-[14px] text-ink">Details</b>
          <div className="mt-2.5 flex flex-col gap-2.5 text-[13px]">
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 flex-shrink-0 text-muted-soft" />
              <span className="text-ink-soft">{profile?.contactNumber || 'No contact number added'}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 flex-shrink-0 text-muted-soft" />
              <span className="text-ink-soft">{city}</span>
            </div>
            {profile?.experienceYears ? (
              <div className="flex items-center gap-2.5">
                <BadgeCheck className="h-4 w-4 flex-shrink-0 text-muted-soft" />
                <span className="text-ink-soft">{profile.experienceYears} years driving</span>
              </div>
            ) : null}
            {profile?.tripAdvisor ? (
              <a href={profile.tripAdvisor} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 font-bold text-brand-dark">
                <BadgeCheck className="h-4 w-4 flex-shrink-0" />
                TripAdvisor profile
              </a>
            ) : null}
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 flex-shrink-0 text-muted-soft" />
              <span className="text-ink-soft">{profile?.licenseType || 'License not submitted'}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-[10.5px] font-bold ${LICENSE_STATUS_TAGS[profile?.licenseStatus] || 'bg-canvas text-muted-soft'}`}>
                {licenseStatusLabel(profile?.licenseStatus)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-[18px] bg-white shadow-card">
          <button type="button" onClick={() => setMode('edit')} className="flex w-full items-center gap-3 px-4 py-[13px] text-left">
            <Pencil className="h-[19px] w-[19px] text-muted" strokeWidth={1.8} />
            <span className="flex-1 text-[14px] font-semibold text-ink">Edit profile details</span>
            <ChevronRight className="h-4 w-4 text-[#c3ccd3]" />
          </button>
          <div className="mx-4 h-px bg-hairline" />
          <button type="button" onClick={() => setMode('password')} className="flex w-full items-center gap-3 px-4 py-[13px] text-left">
            <KeyRound className="h-[19px] w-[19px] text-muted" strokeWidth={1.8} />
            <span className="flex-1 text-[14px] font-semibold text-ink">Change password</span>
            <ChevronRight className="h-4 w-4 text-[#c3ccd3]" />
          </button>
          <div className="mx-4 h-px bg-hairline" />
          <a href="mailto:support@carwithdriver.lk" className="flex w-full items-center gap-3 px-4 py-[13px] text-left">
            <LifeBuoy className="h-[19px] w-[19px] text-muted" strokeWidth={1.8} />
            <span className="flex-1 text-[14px] font-semibold text-ink">Help &amp; support</span>
            <ChevronRight className="h-4 w-4 text-[#c3ccd3]" />
          </a>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-3 w-full rounded-[14px] border-[1.5px] border-[#ffd3d9] bg-white py-3 text-[14px] font-bold text-[#f43f5e] transition hover:border-[#f43f5e]"
        >
          Log out
        </button>
        </div>
      </Sheet>
    </>
  );
};

const StatCard = ({ label, value, highlight = false }) => (
  <div className={`rounded-2xl p-[14px] shadow-card ${highlight ? 'bg-brand text-white' : 'bg-white'}`}>
    <p className={`text-[12px] font-semibold ${highlight ? 'text-white/70' : 'text-muted-soft'}`}>{label}</p>
    <p className={`mt-1 text-[20px] font-extrabold ${highlight ? 'text-white' : 'text-ink'}`}>{value}</p>
  </div>
);

const DetailLine = ({ label, value, fullWidth = false }) => (
  <div className={fullWidth ? 'col-span-2' : undefined}>
    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-soft">{label}</p>
    <p className="mt-0.5 text-[13px] font-semibold leading-relaxed text-ink-soft">{value}</p>
  </div>
);

const AvailabilityPanel = ({
  onMenu,
  driverName,
  driverImage,
  vehicles,
  loading,
  error,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [formState, setFormState] = useState({});
  const [creatingVehicleId, setCreatingVehicleId] = useState('');
  const [updatingEntryId, setUpdatingEntryId] = useState('');
  const [removingEntryId, setRemovingEntryId] = useState('');

  const getFormState = (vehicleId) => formState[vehicleId] ?? buildAvailabilityForm();

  const handleInputChange = (vehicleId, field, value) => {
    setFormState((prev) => ({
      ...prev,
      [vehicleId]: {
        ...(prev[vehicleId] ?? buildAvailabilityForm()),
        [field]: value,
      },
    }));
  };

  const toIsoDate = (date, type) => {
    if (!date) return null;
    const isoString = type === 'end' ? `${date}T23:59:59.999Z` : `${date}T00:00:00.000Z`;
    const parsed = new Date(isoString);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  };

  const handleFormSubmit = async (event, vehicleId) => {
    event.preventDefault();
    const data = getFormState(vehicleId);

    if (!data.startDate || !data.endDate) {
      toast.error('Select both start and end dates.');
      return;
    }

    if (data.endDate < data.startDate) {
      toast.error('End date cannot be before start date.');
      return;
    }

    const startDate = toIsoDate(data.startDate, 'start');
    const endDate = toIsoDate(data.endDate, 'end');

    if (!startDate || !endDate) {
      toast.error('Please choose valid dates.');
      return;
    }

    const payload = {
      startDate,
      endDate,
      status: data.status,
    };

    if (data.note.trim()) {
      payload.note = data.note.trim();
    }

    setCreatingVehicleId(vehicleId);
    try {
      await onCreate?.(vehicleId, payload);
      setFormState((prev) => ({
        ...prev,
        [vehicleId]: buildAvailabilityForm(),
      }));
    } catch (error) {
      console.warn('Availability create failed', error);
    } finally {
      setCreatingVehicleId('');
    }
  };

  const handleStatusToggle = async (vehicleId, entry) => {
    const nextStatus =
      entry.status === AVAILABILITY_STATUS.AVAILABLE
        ? AVAILABILITY_STATUS.UNAVAILABLE
        : AVAILABILITY_STATUS.AVAILABLE;

    setUpdatingEntryId(entry.id);
    try {
      await onUpdate?.(vehicleId, entry.id, { status: nextStatus });
    } catch (error) {
      console.warn('Availability update failed', error);
    } finally {
      setUpdatingEntryId('');
    }
  };

  const handleEntryDelete = async (vehicleId, entryId) => {
    setRemovingEntryId(entryId);
    try {
      await onDelete?.(vehicleId, entryId);
    } catch (error) {
      console.warn('Availability delete failed', error);
    } finally {
      setRemovingEntryId('');
    }
  };

  const head = (
    <MobileHeader
      onMenu={onMenu}
      right={<Avatar name={driverName} image={driverImage} tone="light" className="h-10 w-10 text-[15px]" />}
      eyebrow="SCHEDULE"
      title="My Availability"
      subtitle="Set date ranges travellers can book each vehicle."
    />
  );

  if (loading) {
    return (
      <>
        {head}
        <Sheet>
          <div className="flex min-h-[40vh] items-center justify-center gap-2 text-sm text-muted">
            <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading availability…
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
            <button
              type="button"
              onClick={onRefresh}
              className="mt-3 rounded-full border border-[#e2e8ea] px-4 py-2 text-xs font-bold text-ink transition hover:border-muted-soft"
            >
              Try again
            </button>
          </div>
        </Sheet>
      </>
    );
  }

  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return (
      <>
        {head}
        <Sheet>
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[18px] bg-white p-6 text-center text-sm text-muted shadow-card">
            <CalendarCheck className="mb-3 h-8 w-8 text-muted-soft" />
            <p>Submit a vehicle to start planning your availability.</p>
          </div>
        </Sheet>
      </>
    );
  }

  // Desktop: per-day status for the next 60 days, from the vehicle's date ranges.
  const DAYS_AHEAD = 60;
  const todayUtc = (() => {
    const now = new Date();
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  })();
  const dayStrip = (entries) =>
    Array.from({ length: DAYS_AHEAD }, (_, index) => {
      const dayMs = todayUtc + index * 86400000;
      const entry = entries.find((item) => {
        const start = new Date(item.startDate).getTime();
        const end = new Date(item.endDate).getTime();
        return dayMs + 43200000 >= start && dayMs <= end;
      });
      return { dayMs, status: entry ? entry.status : null };
    });
  const dayCount = (entry) =>
    Math.max(1, Math.round((new Date(entry.endDate).getTime() - new Date(entry.startDate).getTime()) / 86400000));

  const fieldCls =
    'mt-1 h-11 w-full min-w-0 rounded-xl border-[1.5px] border-[#e2e8ea] bg-white px-3 text-[13.5px] font-semibold text-ink focus:border-brand focus:outline-none';

  return (
    <>
      {head}
      <Sheet wide>
        {/* ---------- Desktop ---------- */}
        <div className="hidden flex-col gap-6 lg:flex">
          <div className="flex items-center gap-6 rounded-[18px] bg-white px-6 py-4 text-[12.5px] text-muted shadow-card">
            <span className="font-bold text-ink">How it works</span>
            <span>Add the dates a vehicle is available or blocked. Travellers can't book blocked dates.</span>
            <span className="ml-auto flex items-center gap-4 whitespace-nowrap">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-brand" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-[#f43f5e]" /> Unavailable</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[3px] bg-[#e6ece9]" /> Not set</span>
            </span>
          </div>

          {vehicles.map((vehicle) => {
            const entries = Array.isArray(vehicle.availability) ? vehicle.availability : [];
            const sorted = [...entries].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            const form = getFormState(vehicle.id);
            const photo = Array.isArray(vehicle.images) ? vehicle.images[0] : null;
            const strip = dayStrip(entries);
            return (
              <section key={vehicle.id} className="overflow-hidden rounded-[20px] bg-white shadow-card">
                <div className="flex items-center gap-4 border-b border-hairline px-6 py-4">
                  <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-canvas">
                    {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Car className="h-6 w-6 text-muted-soft" /></div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-[17px] font-extrabold text-ink">{vehicle.model}</h2>
                      <span className={`flex-shrink-0 rounded-[7px] px-2 py-[3px] text-[11px] font-extrabold uppercase ${VEHICLE_STATUS_STYLES[vehicle.status] || VEHICLE_STATUS_STYLES.pending}`}>
                        {vehicle.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-muted-soft">
                      {[vehicle.registrationNumber, vehicle.seats ? `${vehicle.seats} seats` : null, vehicle.pricePerDay ? `$${vehicle.pricePerDay.toLocaleString()} / day` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <span className="rounded-full bg-canvas px-3 py-1 text-[12px] font-bold text-ink-soft">
                    {entries.length === 0 ? 'No dates set' : `${entries.length} date range${entries.length === 1 ? '' : 's'}`}
                  </span>
                </div>

                {/* Next 60 days at a glance */}
                <div className="border-b border-hairline px-6 py-4">
                  <div className="mb-2 flex items-center justify-between text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">
                    <span>Next {DAYS_AHEAD} days</span>
                    <span>{formatDate(new Date(todayUtc).toISOString())} → {formatDate(new Date(todayUtc + (DAYS_AHEAD - 1) * 86400000).toISOString())}</span>
                  </div>
                  <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${DAYS_AHEAD}, minmax(0, 1fr))` }}>
                    {strip.map((day) => (
                      <span
                        key={day.dayMs}
                        title={`${formatDate(new Date(day.dayMs).toISOString())}${day.status ? ` · ${day.status}` : ''}`}
                        className={`h-7 rounded-[4px] ${day.status === AVAILABILITY_STATUS.AVAILABLE ? 'bg-brand' : day.status === AVAILABILITY_STATUS.UNAVAILABLE ? 'bg-[#f43f5e]' : 'bg-[#e6ece9]'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-[340px_minmax(0,1fr)]">
                  <form onSubmit={(event) => handleFormSubmit(event, vehicle.id)} className="border-r border-hairline p-6">
                    <h3 className="text-[14px] font-extrabold text-ink">Add dates</h3>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="block text-[12px] font-bold text-muted">
                        Start
                        <DateField value={form.startDate} required onChange={(e) => handleInputChange(vehicle.id, 'startDate', e.target.value)} className={fieldCls} />
                      </label>
                      <label className="block text-[12px] font-bold text-muted">
                        End
                        <DateField value={form.endDate} required onChange={(e) => handleInputChange(vehicle.id, 'endDate', e.target.value)} className={fieldCls} />
                      </label>
                    </div>
                    <div className="mt-3">
                      <span className="text-[12px] font-bold text-muted">Status</span>
                      <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-canvas p-1">
                        {[
                          { value: AVAILABILITY_STATUS.AVAILABLE, label: 'Available' },
                          { value: AVAILABILITY_STATUS.UNAVAILABLE, label: 'Unavailable' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleInputChange(vehicle.id, 'status', option.value)}
                            className={`rounded-lg py-2 text-[13px] font-bold transition ${form.status === option.value ? 'bg-white text-ink shadow-sm' : 'text-muted-soft hover:text-ink'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="mt-3 block text-[12px] font-bold text-muted">
                      Note (optional)
                      <input type="text" value={form.note} onChange={(e) => handleInputChange(vehicle.id, 'note', e.target.value)} placeholder="Guidance for travellers" className={`${fieldCls} font-normal placeholder:text-[#adb8c0]`} />
                    </label>
                    <button
                      type="submit"
                      disabled={creatingVehicleId === vehicle.id}
                      className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
                    >
                      <PlusCircle className="h-4 w-4" />
                      {creatingVehicleId === vehicle.id ? 'Adding…' : 'Add dates'}
                    </button>
                  </form>

                  <div className="min-w-0 p-6">
                    <h3 className="text-[14px] font-extrabold text-ink">Scheduled dates</h3>
                    {sorted.length === 0 ? (
                      <div className="mt-3 flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-[#dfe6e2] text-center text-[13px] text-muted-soft">
                        <CalendarCheck className="mb-2 h-6 w-6" />
                        No dates yet. Add the dates this vehicle is available or blocked.
                      </div>
                    ) : (
                      <table className="mt-3 w-full border-collapse text-left text-[13px]">
                        <thead>
                          <tr className="text-[11.5px] font-bold uppercase tracking-wide text-muted-soft">
                            <th className="pb-2 font-bold">Dates</th>
                            <th className="pb-2 font-bold">Days</th>
                            <th className="pb-2 font-bold">Status</th>
                            <th className="pb-2 font-bold">Note</th>
                            <th className="pb-2" />
                          </tr>
                        </thead>
                        <tbody>
                          {sorted.map((entry) => {
                            const rangeStart = formatDate(entry.startDate);
                            const rangeEnd = formatDate(entry.endDate);
                            const isAvail = entry.status === AVAILABILITY_STATUS.AVAILABLE;
                            const isUpdating = updatingEntryId === entry.id;
                            const isRemoving = removingEntryId === entry.id;
                            return (
                              <tr key={entry.id} className="border-t border-hairline align-middle">
                                <td className="py-3 pr-3 font-bold text-ink">{rangeStart === rangeEnd ? rangeStart : `${rangeStart} → ${rangeEnd}`}</td>
                                <td className="py-3 pr-3 text-muted">{dayCount(entry)}</td>
                                <td className="py-3 pr-3">
                                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${isAvail ? 'bg-brand-tint text-brand-dark' : 'bg-[#ffe4e9] text-[#e11d48]'}`}>
                                    {isAvail ? 'Available' : 'Unavailable'}
                                  </span>
                                </td>
                                <td className="max-w-[220px] truncate py-3 pr-3 text-muted" title={entry.note || ''}>{entry.note || '—'}</td>
                                <td className="whitespace-nowrap py-3 text-right">
                                  <button type="button" disabled={isUpdating} onClick={() => handleStatusToggle(vehicle.id, entry)} className="rounded-lg border-[1.5px] border-[#e2e8ea] px-3 py-1.5 text-[12px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-60">
                                    {isUpdating ? 'Updating…' : isAvail ? 'Mark unavailable' : 'Mark available'}
                                  </button>
                                  <button type="button" disabled={isRemoving} onClick={() => handleEntryDelete(vehicle.id, entry.id)} aria-label="Remove dates" className="ml-2 inline-grid h-8 w-8 place-items-center rounded-lg border-[1.5px] border-[#ffd3d9] text-[#f43f5e] transition hover:border-[#f43f5e] disabled:opacity-60">
                                    {isRemoving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* ---------- Phones ---------- */}
        <div className="grid gap-3.5 lg:hidden">
          {vehicles.map((vehicle) => {
            const entries = Array.isArray(vehicle.availability) ? vehicle.availability : [];
            const form = getFormState(vehicle.id);
            return (
              <article key={vehicle.id} className="rounded-[18px] bg-white p-4 shadow-card">
                <div className="flex items-center gap-2">
                  <b className="truncate text-[16px] text-ink">{vehicle.model}</b>
                  <span
                    className={`flex-shrink-0 rounded-[7px] px-2 py-[3px] text-[11px] font-extrabold uppercase ${
                      VEHICLE_STATUS_STYLES[vehicle.status] || VEHICLE_STATUS_STYLES.pending
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </div>
                <p className="mt-0.5 text-[12.5px] text-muted-soft">
                  {entries.length === 0 ? 'No slots yet' : `${entries.length} slot${entries.length === 1 ? '' : 's'}`}
                  {vehicle.pricePerDay ? ` · $${vehicle.pricePerDay.toLocaleString()} / day` : ''}
                </p>

                <form onSubmit={(event) => handleFormSubmit(event, vehicle.id)} className="mt-3 rounded-xl bg-canvas p-3">
                  <div className="flex gap-2.5">
                    <div className="min-w-0 flex-1">
                      <label className="text-[11.5px] font-bold text-muted-soft">Start</label>
                      <DateField
                        value={form.startDate} required
                        onChange={(e) => handleInputChange(vehicle.id, 'startDate', e.target.value)}
                        className="mt-1 h-10 w-full min-w-0 rounded-lg border-[1.5px] border-[#e2e8ea] bg-white px-2.5 text-[13px] font-semibold text-ink focus:border-brand focus:outline-none"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <label className="text-[11.5px] font-bold text-muted-soft">End</label>
                      <DateField
                        value={form.endDate} required
                        onChange={(e) => handleInputChange(vehicle.id, 'endDate', e.target.value)}
                        className="mt-1 h-10 w-full min-w-0 rounded-lg border-[1.5px] border-[#e2e8ea] bg-white px-2.5 text-[13px] font-semibold text-ink focus:border-brand focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-2.5">
                    <div className="min-w-0 flex-1">
                      <label className="text-[11.5px] font-bold text-muted-soft">Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => handleInputChange(vehicle.id, 'status', e.target.value)}
                        className="mt-1 h-10 w-full min-w-0 rounded-lg border-[1.5px] border-[#e2e8ea] bg-white px-2.5 text-[13px] font-semibold text-ink focus:border-brand focus:outline-none"
                      >
                        <option value={AVAILABILITY_STATUS.AVAILABLE}>Available</option>
                        <option value={AVAILABILITY_STATUS.UNAVAILABLE}>Unavailable</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <label className="text-[11.5px] font-bold text-muted-soft">Note (optional)</label>
                    <input
                      type="text" value={form.note}
                      onChange={(e) => handleInputChange(vehicle.id, 'note', e.target.value)}
                      placeholder="Guidance for travellers"
                      className="mt-1 h-10 w-full min-w-0 rounded-lg border-[1.5px] border-[#e2e8ea] bg-white px-2.5 text-[13px] text-ink placeholder:text-[#adb8c0] focus:border-brand focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creatingVehicleId === vehicle.id}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[11px] bg-brand py-2.5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
                  >
                    <PlusCircle className="h-[16px] w-[16px]" />
                    {creatingVehicleId === vehicle.id ? 'Adding…' : 'Add slot'}
                  </button>
                </form>

                {entries.length > 0 ? (
                  <div className="mt-3 flex flex-col gap-2">
                    {entries.map((entry) => {
                      const rangeStart = formatDate(entry.startDate);
                      const rangeEnd = formatDate(entry.endDate);
                      const rangeLabel = rangeStart === rangeEnd ? rangeStart : `${rangeStart} → ${rangeEnd}`;
                      const isAvail = entry.status === AVAILABILITY_STATUS.AVAILABLE;
                      const isUpdating = updatingEntryId === entry.id;
                      const isRemoving = removingEntryId === entry.id;
                      return (
                        <div key={entry.id} className="rounded-xl border border-hairline bg-canvas p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-[13.5px] font-bold text-ink">
                              <CalendarCheck className="h-4 w-4 text-brand" />
                              {rangeLabel}
                            </div>
                            <span
                              className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${
                                isAvail ? 'bg-brand-tint text-brand-dark' : 'bg-[#eef1f0] text-muted'
                              }`}
                            >
                              {entry.status}
                            </span>
                          </div>
                          {entry.note ? <p className="mt-1.5 text-[12.5px] text-muted">{entry.note}</p> : null}
                          <div className="mt-2.5 flex gap-2">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleStatusToggle(vehicle.id, entry)}
                              className="flex-1 rounded-[10px] border-[1.5px] border-[#e2e8ea] bg-white py-2 text-[12.5px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-60"
                            >
                              {isUpdating ? 'Updating…' : isAvail ? 'Mark unavailable' : 'Mark available'}
                            </button>
                            <button
                              type="button"
                              disabled={isRemoving}
                              onClick={() => handleEntryDelete(vehicle.id, entry.id)}
                              className="rounded-[10px] border-[1.5px] border-[#ffd3d9] bg-white px-3 py-2 text-[12.5px] font-bold text-[#f43f5e] transition hover:border-[#f43f5e] disabled:opacity-60"
                            >
                              {isRemoving ? '…' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </Sheet>
    </>
  );
};

const PlaceholderPanel = ({ title }) => (
  <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
    <ShieldAlert className="mb-3 h-8 w-8 text-slate-300" />
    <p>{title} will appear here once we wire it up.</p>
  </div>
);

const renderTabContent = (tabId, context) => {
  const {
    profile,
    driverName,
    onMenu,
    onNavigate,
    onLogout,
    vehicles,
    vehiclesLoading,
    vehiclesError,
    onVehicleRefresh,
    onVehicleCreate,
    onVehicleUpdate,
    onVehicleDelete,
    onAvailabilityCreate,
    onAvailabilityUpdate,
    onAvailabilityDelete,
    driverBookingsState,
    onBookingsRefresh,
    driverEarningsState,
    onEarningsRefresh,
    onEarningsMonthChange,
    onEarningsSlipUpload,
    onProfileSave,
    onProfileRefresh,
    onPasswordChange,
    onLicenseSave,
    profileSaving,
    passwordSaving,
    licenseSaving,
  } = context;
  const header = { onMenu, onNavigate, driverName, driverImage: profile?.profilePhoto };
  switch (tabId) {
    case 'overview':
      return <OverviewPanel profile={profile} />;
    case 'vehicles':
      return (
        <VehiclesPanel
          {...header}
          vehicles={vehicles}
          loading={vehiclesLoading}
          error={vehiclesError}
          onRefresh={onVehicleRefresh}
          onCreate={onVehicleCreate}
          onUpdate={onVehicleUpdate}
          onDelete={onVehicleDelete}
        />
      );
    case 'availability':
      return (
        <AvailabilityPanel
          {...header}
          vehicles={vehicles}
          loading={vehiclesLoading}
          error={vehiclesError}
          onRefresh={onVehicleRefresh}
          onCreate={onAvailabilityCreate}
          onUpdate={onAvailabilityUpdate}
          onDelete={onAvailabilityDelete}
        />
      );
    case 'bookings':
      return (
        <DriverBookingsPanel
          {...header}
          bookingsState={driverBookingsState}
          onReload={onBookingsRefresh}
        />
      );
    case 'earnings':
      return (
        <DriverEarningsPanel
          {...header}
          state={driverEarningsState}
          onRefresh={onEarningsRefresh}
          onMonthChange={onEarningsMonthChange}
          onSlipUpload={onEarningsSlipUpload}
        />
      );
    case 'messages':
      return <PlaceholderPanel title="Traveller conversations" />;
    case 'profile':
      return (
        <DriverProfilePanel
          {...header}
          profile={profile}
          onLogout={onLogout}
          onSave={onProfileSave}
          onProfileRefresh={onProfileRefresh}
          onPasswordChange={onPasswordChange}
          onLicenseSave={onLicenseSave}
          savingProfile={profileSaving}
          savingPassword={passwordSaving}
          licenseSaving={licenseSaving}
        />
      );
    default:
      return null;
  }
};

const InfoCard = ({ title, icon: Icon, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
      <Icon className="h-4 w-4 text-emerald-600" />
      {title}
    </div>
    <div className="mt-2 space-y-1">{children}</div>
  </div>
);

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatMoney = (value) => {
  if (typeof value !== 'number') {
    return '$0';
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
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

const formatRatePercent = (rate, maximumFractionDigits = 1) =>
  formatPercentValue((Number(rate) || 0) * 100, maximumFractionDigits);

export default DriverDashboard;

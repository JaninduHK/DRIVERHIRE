// /src/pages/DriverDashboard.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import {
  BadgeCheck,
  CalendarDays,
  CalendarCheck,
  CheckCircle2,
  Car,
  ClipboardList,
  DollarSign,
  Loader2,
  RefreshCw,
  Pencil,
  MapPin,
  MessageCircle,
  Phone,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  Upload,
  User2,
  Users,
  XCircle,
} from 'lucide-react';
import {
  fetchDriverOverview,
  fetchDriverVehicles,
  createVehicle,
  updateVehicle,
  createVehicleAvailability,
  updateVehicleAvailability,
  deleteVehicleAvailability,
  fetchDriverEarningsSummary,
  fetchDriverEarningsHistory,
  uploadCommissionSlip,
  completeDriverProfileTour,
} from '../services/driverApi.js';
import {
  updateProfile as updateProfileRequest,
  updatePassword as updatePasswordRequest,
} from '../services/profileApi.js';
import { fetchDriverBookings, driverRespondToBooking } from '../services/bookingApi.js';
import { VEHICLE_FEATURES, getVehicleFeatureLabels } from '../constants/vehicleFeatures.js';
import { clearStoredToken } from '../services/authToken.js';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: User2, hash: 'overview' },
  { id: 'vehicles', label: 'My Vehicles', icon: Car, hash: 'vehicles' },
  { id: 'bookings', label: 'My Bookings', icon: CalendarDays, hash: 'bookings' },
  { id: 'messages', label: 'Messages', icon: MessageCircle, href: '/portal/driver/messages' },
  { id: 'earnings', label: 'My Earnings', icon: DollarSign, hash: 'earnings' },
  { id: 'availability', label: 'My Availability', icon: CalendarCheck, hash: 'availability' },
  { id: 'profile', label: 'My Profile', icon: ClipboardList, hash: 'profile' },
];

const HASHABLE_TABS = ['overview', 'vehicles', 'bookings', 'earnings', 'availability', 'profile'];
const HASH_TARGETS = [...HASHABLE_TABS, 'messages'];

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

const DriverDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => parseTabFromHash(location.hash));

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

  useEffect(() => {
    loadOverview({ silent: false });
    refreshVehicles();
  }, [refreshVehicles, loadOverview]);

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
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Live location is not available in this browser.');
      return;
    }
    setLocationPromptLocating(true);
    setLocationPromptStatus('Requesting your current position...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationPromptLocating(false);
        const { latitude, longitude } = position.coords || {};
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          setLocationPromptForm((prev) => ({
            ...prev,
            latitude: latitude.toFixed(6),
            longitude: longitude.toFixed(6),
          }));
          setLocationPromptStatus('Location captured. Save to update the live map.');
        } else {
          setLocationPromptStatus('We could not read coordinates from your device.');
          toast.error('Unable to read coordinates from your device.');
        }
      },
      (error) => {
        setLocationPromptLocating(false);
        setLocationPromptStatus('Unable to fetch your location. Check permissions and try again.');
        console.warn('Geolocation error', error);
        toast.error('Please enable location access to use live location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
          Loading driver dashboard...
        </div>
      </section>
    );
  }

  if (overviewError && !overview) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center text-amber-800">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10" />
          <h1 className="text-2xl font-semibold">Driver dashboard unavailable</h1>
          <p className="mt-3 text-sm">
            {pendingApproval
              ? 'Your driver application is still under review. We will email you as soon as it is approved.'
              : overviewError}
          </p>
          <p className="mt-6 text-xs text-amber-700">
            Need help? Email{' '}
            <a href="mailto:support@carwithdriver.lk" className="underline">
              support@carwithdriver.lk
            </a>.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
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
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = currentTabId === item.id || activeTab === item.hash;
              const href = item.href || `#${item.hash || item.id}`;
              return (
                <a
                  key={item.id}
                  href={href}
                  onClick={(event) => handleNavSelect(item, event)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.label}</span>
              </a>
            );
          })}
          </nav>
        </aside>

        <div className="space-y-6">
          <header className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Driver dashboard
                </p>
                <h1 className="text-2xl font-semibold text-slate-900">
                  Welcome back, {profile?.name?.split(' ')?.[0] || 'driver'}
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                  Keep track of your bookings, traveller conversations, and profile.
                </p>
              </div>
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-4 w-4" /> Approved driver
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                  Logout
                </button>
              </div>
            </div>
          </header>

          {shouldShowProfileTour ? (
            <ProfileCompletionTour
              steps={profileTourSteps}
              nextStep={profileTourNextStep}
              allDone={profileTourComplete}
              onNavigate={goToTab}
              onComplete={handleProfileTourCompletion}
              completing={profileTourSubmitting}
            />
          ) : null}

          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard label="Total trips" value={activity?.totalTrips ?? 0} />
            <MetricCard label="Upcoming trips" value={activity?.upcomingTrips ?? 0} />
            <MetricCard label="Average rating" value={Number(activity?.rating ?? 0).toFixed(1)} />
          </section>

          <div id={currentTabId} className="rounded-2xl border border-slate-200 bg-white p-6">
            {renderTabContent(currentTabId, {
              profile,
              vehicles,
              vehiclesLoading,
              vehiclesError,
              onVehicleRefresh: refreshVehicles,
              onVehicleCreate: handleVehicleSubmit,
              onVehicleUpdate: handleVehicleUpdate,
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
              onPasswordChange: handleDriverPasswordChange,
              profileSaving,
              passwordSaving,
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

const MetricCard = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

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

const ProfileCompletionTour = ({ steps = [], nextStep, allDone, onNavigate, onComplete, completing }) => {
  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  const completedCount = steps.filter((step) => step.done).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Profile completion tour
          </p>
          <h2 className="text-lg font-semibold text-emerald-900">Finish your profile to go live</h2>
          <p className="text-sm text-emerald-800/90">
            We&apos;ll guide you through photo, description, live location, and adding your vehicle.
          </p>
        </div>
        <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
          {completedCount}/{steps.length} done
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-start gap-3 rounded-xl border px-3 py-2 ${
                step.done ? 'border-emerald-200 bg-white' : 'border-emerald-300 bg-white/70'
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  step.done
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 ring-1 ring-emerald-200'
                }`}
              >
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-900">{step.label}</p>
                <p className="text-xs text-slate-600">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {allDone ? 'All steps completed' : 'Up next'}
            </p>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              {progressPercent}% done
            </span>
          </div>
          <p className="text-xs text-slate-600">
            {allDone
              ? 'Great work. Save this to stop seeing the checklist.'
              : nextStep?.description || 'Keep your profile fresh for travellers.'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {nextStep && !allDone ? (
              <button
                type="button"
                onClick={() => onNavigate?.(nextStep.tab)}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Go to {nextStep.tab === 'profile' ? 'profile' : nextStep.tab}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!allDone || completing}
              onClick={onComplete}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {completing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Mark checklist done'
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
  </div>
);

const VehiclesPanel = ({ vehicles, loading, error, onRefresh, onCreate, onUpdate }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(() => buildInitialVehicleForm());
  const [pendingFiles, setPendingFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const clearPendingFiles = useCallback(() => {
    setPendingFiles((prev) => {
      prev.forEach((file) => file.preview && URL.revokeObjectURL(file.preview));
      return [];
    });
  }, []);

  const onDrop = useCallback((acceptedFiles) => {
    setPendingFiles((prev) => {
      const mapped = acceptedFiles.map((file) =>
        Object.assign(file, { preview: URL.createObjectURL(file) })
      );
      const combined = [...prev, ...mapped].slice(0, 5);
      if (prev.length + acceptedFiles.length > 5) {
        toast.error('You can upload up to 5 images.');
      }
      return combined;
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 5,
    onDrop,
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
    setShowForm(true);
  };

  const handleEditVehicle = (vehicle) => {
    clearPendingFiles();
    setFormData(buildVehicleFormFromData(vehicle));
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

    const payload = new FormData();
    payload.append('model', sanitizedModel);
    payload.append('year', String(parsedYear));
    payload.append('pricePerDay', String(parsedPrice));
    if (parsedSeats) payload.append('seats', String(parsedSeats));
    if (formData.description.trim()) payload.append('description', formData.description.trim());

    pendingFiles.slice(0, 5).forEach((file) => payload.append('images', file));

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
      setEditingVehicle(null);
      setShowForm(false);
    } catch (error) {
      console.warn('Vehicle submit/update failed', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading vehicles...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Fleet overview</h2>
          <p className="text-sm text-slate-500">Manage the vehicles travellers can book.</p>
        </div>
        <button
          type="button"
          onClick={handleNewVehicleClick}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          {editingVehicle ? <Pencil className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
          {editingVehicle ? 'Cancel edit' : showForm ? 'Cancel' : 'Add vehicle'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              {editingVehicle ? `Edit ${editingVehicle.model}` : 'Submit a vehicle for review'}
            </h3>
            <span className="text-xs text-slate-500">
              {editingVehicle
                ? 'Updating details will resubmit this vehicle for approval.'
                : 'Complete details help the admin team approve faster.'}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-slate-700">Model</label>
              <input
                id="model" name="model" type="text" required value={formData.model}
                onChange={handleChange}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Toyota Prius"
              />
            </div>
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-slate-700">Year</label>
              <input
                id="year" name="year" type="number" required min="1990" max={new Date().getFullYear() + 1}
                value={formData.year} onChange={handleChange}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label htmlFor="pricePerDay" className="block text-sm font-medium text-slate-700">
                Price per day (USD)
              </label>
              <input
                id="pricePerDay"
                name="pricePerDay"
                type="number"
                required
                min="35"
                max="250"
                step="1"
                value={formData.pricePerDay}
                onChange={handleChange}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Enter a rate between 35 and 250"
              />
            </div>
            <div>
              <label htmlFor="seats" className="block text-sm font-medium text-slate-700">Seats</label>
              <input
                id="seats" name="seats" type="number" min="1" value={formData.seats} onChange={handleChange}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="4"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
              <textarea
                id="description" name="description" rows={3} value={formData.description} onChange={handleChange}
                className="mt-2 block w-full rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                placeholder="Highlight vehicle type, comfort features, and ideal trip styles."
              />
            </div>
          </div>

          <fieldset className="rounded-2xl border border-slate-200 p-4">
            <legend className="px-2 text-sm font-semibold text-slate-900">Included services</legend>
            <p className="px-2 text-xs text-slate-500">
              Let travellers know what&apos;s bundled with every booking.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {VEHICLE_FEATURES.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-emerald-400/70"
                >
                  <input
                    type="checkbox"
                    name={key}
                    checked={Boolean(formData[key])}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div
            {...getRootProps({
              className: `flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-4 py-6 text-sm transition ${
                isDragActive ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 bg-slate-50'
              }`,
            })}
          >
            <input {...getInputProps()} />
            <p className="font-semibold text-slate-700">Drag & drop images here, or click to select</p>
            <p className="text-xs text-slate-500">Up to 5 images. Each must be under 5MB.</p>
          </div>

          {pendingFiles.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-5">
              {pendingFiles.map((file) => (
                <div key={file.name} className="relative overflow-hidden rounded-xl border border-slate-200">
                  <img src={file.preview} alt={file.name} className="h-24 w-full object-cover" />
                  <button
                    type="button" onClick={() => handleRemoveFile(file.name)}
                    className="absolute right-2 top-2 rounded-full bg-white/80 px-2 py-1 text-xs font-semibold text-rose-600 shadow"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/70"
          >
            {submitting
              ? editingVehicle
                ? 'Saving...'
                : 'Submitting...'
              : editingVehicle
                ? 'Save changes'
                : 'Submit for approval'}
          </button>
        </form>
      )}

      {vehicles.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center text-center text-sm text-slate-500">
          <Car className="mb-3 h-8 w-8 text-slate-300" />
          <p>No vehicles added yet. Submit your first vehicle to start receiving bookings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((vehicle) => (
            <article key={vehicle.id} className="rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                    <span>{vehicle.model}</span>
                    <span className="text-xs font-medium text-slate-500">{vehicle.year}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        VEHICLE_STATUS_STYLES[vehicle.status] || VEHICLE_STATUS_STYLES.pending
                      }`}
                    >
                      {vehicle.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Submitted {formatDate(vehicle.createdAt)}</p>
                  {vehicle.reviewedAt && (
                    <p className="mt-1 text-xs text-slate-400">Reviewed {formatDate(vehicle.reviewedAt)}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap justify-end gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <DollarSign className="h-3.5 w-3.5" />
                      {(vehicle.pricePerDay ?? 0).toLocaleString()} / day
                    </span>
                    {vehicle.seats ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />{vehicle.seats} seats
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleEditVehicle(vehicle)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit details
                  </button>
                </div>
              </div>

              {editingVehicle?.id === vehicle.id ? (
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <Pencil className="h-3 w-3" /> Editing now
                </span>
              ) : null}

              {vehicle.description && (
                <p className="mt-3 text-sm text-slate-600">{vehicle.description}</p>
              )}

              {(() => {
                const included = getVehicleFeatureLabels(vehicle);
                if (included.length === 0) {
                  return null;
                }
                return (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {included.map((label) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                );
              })()}

              {vehicle.status === 'rejected' && vehicle.rejectedReason && (
                <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  Rejection notes: {vehicle.rejectedReason}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

const DriverBookingsPanel = ({ bookingsState, onReload }) => {
  const { loading, error, items } = bookingsState;
  const [responding, setResponding] = useState({ id: '', action: '' });

  const statusStyles = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-rose-100 text-rose-700',
    rejected: 'bg-rose-100 text-rose-700',
  };

  const handleReload = () => {
    if (typeof onReload === 'function') {
      onReload();
    }
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

  if (loading) {
    return (
      <div className="flex h-60 flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        Loading bookings...
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
        <h2 className="text-base font-semibold text-slate-900">No bookings yet</h2>
        <p>
          Once travellers confirm your offers their itineraries will appear here. Keep your availability up to date
          to receive more enquiries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Traveller bookings</h2>
          <p className="text-sm text-slate-500">Review upcoming itineraries and traveller details.</p>
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
          const start = formatDate(booking.startDate);
          const end = formatDate(booking.endDate);
          const travelerName = booking.traveler?.fullName || 'Traveller';
          const travelerEmail = booking.traveler?.email;
          const travelerPhone = booking.traveler?.phoneNumber;
          const vehicleName = booking.vehicle?.model || 'Vehicle to be confirmed';
          const grossTotal =
            typeof booking.totalPrice === 'number' && booking.totalPrice > 0
              ? booking.totalPrice
              : null;
          const totalLabel =
            grossTotal !== null
              ? formatMoney(grossTotal)
              : 'Rate on arrival';
          const discountAmountValue =
            typeof booking.discountAmount === 'number' && booking.discountAmount > 0
              ? booking.discountAmount
              : grossTotal !== null && typeof booking.commissionDiscountRate === 'number'
                ? grossTotal * booking.commissionDiscountRate
                : 0;
          const discountAmountLabel =
            discountAmountValue > 0 ? formatMoney(discountAmountValue) : null;
          const travelerPaysLabel =
            typeof booking.payableTotal === 'number' && booking.payableTotal > 0
              ? formatMoney(booking.payableTotal)
              : totalLabel;
          const statusClass = statusStyles[booking.status] || 'bg-slate-100 text-slate-600';
          const statusLabel = booking.status
            ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1)
            : 'Pending';
          const extraNote = booking.specialRequests ? booking.specialRequests : null;
          const commissionRateLabel = Number.isFinite(booking.commissionRate)
            ? formatRatePercent(booking.commissionRate, 2)
            : null;
          const discountLabel = booking.commissionDiscountLabel || '';
          const driverPayoutLabel =
            typeof booking.driverEarnings === 'number' ? formatMoney(booking.driverEarnings) : null;

          return (
            <li
              key={booking.id}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    {travelerName}
                    <span className={`rounded-full px-3 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusClass}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">
                    {start} – {end}
                  </p>
                  <p className="text-sm text-slate-500">
                    Vehicle <span className="font-medium text-slate-700">{vehicleName}</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    Traveller pays{' '}
                    <span className="font-medium text-slate-700">{travelerPaysLabel}</span>
                  </p>
                  {discountAmountLabel ? (
                    <p className="text-xs text-emerald-600">Discount applied: -{discountAmountLabel}</p>
                  ) : null}
                  {commissionRateLabel ? (
                    <p className="text-xs text-slate-500">
                      Commission {commissionRateLabel}
                      {discountLabel ? ` (${discountLabel})` : ''}
                    </p>
                  ) : null}
                  {driverPayoutLabel ? (
                    <p className="text-xs font-semibold text-slate-900">
                      Driver payout after commission: {driverPayoutLabel}
                    </p>
                  ) : null}
                </div>
                <div className="min-w-[200px] space-y-1 text-sm text-slate-500">
                  {travelerEmail ? <p className="truncate">Email: {travelerEmail}</p> : null}
                  {travelerPhone ? <p>Phone: {travelerPhone}</p> : null}
                  <p className="text-xs text-slate-400">Payment collected on trip start.</p>
                </div>
              </div>
              {extraNote ? (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Special requests</span>
                  <br />
                  {extraNote}
                </p>
              ) : null}
              {booking.status === 'pending' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleRespond(booking.id, 'accept')}
                    disabled={responding.id === booking.id}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-500/60"
                  >
                    {responding.id === booking.id && responding.action === 'accept' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Accept
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespond(booking.id, 'reject')}
                    disabled={responding.id === booking.id}
                    className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:border-rose-200/70 disabled:text-rose-400"
                  >
                    {responding.id === booking.id && responding.action === 'reject' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        Reject
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
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

const DriverEarningsPanel = ({ state, onMonthChange, onRefresh, onSlipUpload }) => {
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

  if (loading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 text-sm text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        Loading earnings…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        <p>{error}</p>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        <h2 className="text-base font-semibold text-slate-900">No earnings to show yet</h2>
        <p>When bookings are completed you will see the commission due for that month here.</p>
      </div>
    );
  }

  const { period, totals, commission, bookings, bankDetails, discount } = summary;
  const dueDateLabel = displayDate(period?.commissionDueDate);
  const commissionDueLabel = formatCurrency(totals?.commissionDue);
  const driverEarningsLabel = formatCurrency(totals?.driverEarnings);
  const totalGrossLabel = formatCurrency(totals?.totalGross);
  const statusBadge = statusBadgeStyles[commission?.status] || 'bg-slate-200 text-slate-700';
  const canUploadSlip = commission?.status !== 'approved';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Monthly earnings — {period?.label || selectedMonth}
          </h2>
          <p className="text-sm text-slate-500">
            Commission applies to bookings completed between {displayDate(period?.periodStart)} and{' '}
            {displayDate(period?.periodEnd)}.
          </p>
          <p className="text-xs text-slate-400">Pay the commission by {dueDateLabel || 'month end'}.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={selectedMonth}
            onChange={handleMonthSelect}
            className="rounded-full border border-slate-300 px-3 py-2 text-sm text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
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
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total booking value" value={totalGrossLabel} />
        <StatCard label="Driver share" value={driverEarningsLabel} />
        <StatCard label={`Commission due (${commissionRateLabel})`} value={commissionDueLabel} highlight />
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Payment status</p>
          <div className="mt-2 inline-flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusBadge}`}>
              {commission?.status || 'pending'}
            </span>
            {commission?.paymentSlipUploadedAt ? (
              <span className="text-[11px] text-slate-400">
                Slip uploaded {displayDate(commission.paymentSlipUploadedAt)}
              </span>
            ) : null}
          </div>
          {commission?.paymentSlipUrl ? (
            <a
              href={commission.paymentSlipUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <BadgeCheck className="h-4 w-4" />
              View uploaded slip
            </a>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Commission programme</p>
        {discount ? (
          <div className="mt-2 space-y-1 text-sm text-slate-600">
            <p className="text-sm font-semibold text-slate-900">{discount.name}</p>
            <p>
              {discountPercentLabel} off the standard {baseRateLabel} commission. You're paying{' '}
              <span className="font-semibold text-slate-900">{commissionRateLabel}</span> on bookings
              in this window.
            </p>
            <p className="text-xs text-slate-500">
              {discount.status === 'scheduled'
                ? `Starts ${displayDate(discount.startDate)}`
                : discount.status === 'expired'
                ? `Ended ${displayDate(discount.endDate)}`
                : `Valid through ${displayDate(discount.endDate)}`}
            </p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            No promotional discount this month. Standard commission is {baseRateLabel}.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Bank details</h3>
            <p className="text-xs text-slate-500">
              Transfer the full monthly commission as a single payment.
            </p>
          </div>
          {canUploadSlip ? (
            <div className="flex flex-wrap gap-2">
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
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload payment slip
                  </>
                )}
              </button>
            </div>
          ) : null}
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailLine label="Account name" value={bankDetails?.accountName || '—'} />
          <DetailLine label="Account number" value={bankDetails?.accountNumber || '—'} />
          <DetailLine label="Bank" value={bankDetails?.bankName || '—'} />
          <DetailLine label="Branch" value={bankDetails?.branch || '—'} />
          {bankDetails?.swiftCode ? (
            <DetailLine label="SWIFT / BIC" value={bankDetails.swiftCode} />
          ) : null}
      <DetailLine label="Reference" value={bankDetails?.referenceNote || '—'} />
    </dl>
  </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Bookings included</h3>
          <span className="text-xs text-slate-500">
            {totals?.bookingCount ?? bookings?.length ?? 0} booking
            {(totals?.bookingCount ?? bookings?.length ?? 0) === 1 ? '' : 's'}
          </span>
        </div>
        {Array.isArray(bookings) && bookings.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Traveller</th>
                  <th className="px-3 py-2 font-medium">Dates</th>
                  <th className="px-3 py-2 font-medium text-right">Gross</th>
                  <th className="px-3 py-2 font-medium text-right">Commission</th>
                  <th className="px-3 py-2 font-medium text-right">Driver share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-3 py-2">{booking.travelerName}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {displayDate(booking.startDate)} – {displayDate(booking.endDate)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-700">
                      {formatCurrency(booking.totalPrice)}
                    </td>
                    <td className="px-3 py-2 text-right text-rose-600">
                      {formatCurrency(booking.commissionAmount)}
                    </td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      {formatCurrency(booking.driverEarnings)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No confirmed bookings were completed during this month.
          </p>
        )}
      </div>
    </div>
  );
};

const buildDriverProfileForm = (profile) => ({
  name: profile?.name || '',
  contactNumber: profile?.contactNumber || '',
  address: profile?.address || '',
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

const DriverProfilePanel = ({
  profile,
  onSave,
  onPasswordChange,
  savingProfile,
  savingPassword,
}) => {
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
  const photoInputRef = useRef(null);

  useEffect(() => {
    setFormState(buildDriverProfileForm(profile));
    setPhotoPreview(profile?.profilePhoto || '');
    setPhotoFile(null);
    setRemovePhoto(false);
    setClearLocation(false);
    setLocating(false);
    setLocationStatus('');
  }, [profile]);

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
    if (['currentLocationLabel', 'currentLatitude', 'currentLongitude'].includes(name)) {
      setClearLocation(false);
    }
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setPhotoFile(file);
    setRemovePhoto(false);
    setPhotoPreview((current) => {
      if (current && current.startsWith('blob:')) {
        URL.revokeObjectURL(current);
      }
      return URL.createObjectURL(file);
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
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Live location is not available in this browser.');
      return;
    }
    setLocating(true);
    setLocationStatus('Requesting your current position...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude } = position.coords || {};
        if (typeof latitude === 'number' && typeof longitude === 'number') {
          setFormState((prev) => ({
            ...prev,
            currentLatitude: latitude.toFixed(6),
            currentLongitude: longitude.toFixed(6),
          }));
          setClearLocation(false);
          setLocationStatus('Location captured from your device.');
        } else {
          setLocationStatus('We could not read coordinates from your device.');
          toast.error('Unable to read coordinates from your device.');
        }
      },
      (error) => {
        setLocating(false);
        setLocationStatus('Unable to fetch your location. Check permissions and try again.');
        console.warn('Geolocation error', error);
        toast.error('Please enable location access to use live location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleProfileSubmit = async (event) => {
    event.preventDefault();
    if (!onSave) {
      return;
    }

    try {
      const payload = new FormData();
      payload.append('name', formState.name);
      payload.append('contactNumber', formState.contactNumber || '');
      payload.append('address', formState.address || '');
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
    } catch (error) {
      console.warn('Driver password update failed', error);
    }
  };

  if (!profile) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
        <Loader2 className="mb-3 h-6 w-6 animate-spin text-emerald-500" />
        Loading profile…
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">Profile details</h2>
          <p className="text-sm text-slate-500">Update the information travellers see on your listings.</p>
        </header>
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-white">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt={`${formState.name || 'Driver'} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <User2 className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Profile photo</p>
                <p className="text-xs text-slate-500">
                  A friendly face builds trust when travellers browse drivers.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload photo
              </button>
              {(photoPreview || profile?.profilePhoto) && (
                <button
                  type="button"
                  onClick={handleRemovePhotoClick}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-600 transition hover:border-rose-300"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Remove
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="driver-profile-name">
              Name
            </label>
            <input
              id="driver-profile-name"
              name="name"
              value={formState.name}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="driver-profile-contact">
              Contact number
            </label>
            <input
              id="driver-profile-contact"
              name="contactNumber"
              value={formState.contactNumber}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="e.g. +94 71 555 5555"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="driver-profile-address">
              Base location
            </label>
            <input
              id="driver-profile-address"
              name="address"
              value={formState.address}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="City, region"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="driver-profile-description">
              Bio
            </label>
            <textarea
              id="driver-profile-description"
              name="description"
              value={formState.description}
              onChange={handleFieldChange}
              rows={4}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="Tell travellers about your experience and specialties."
            />
          </div>
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Live location</p>
                <p className="text-xs text-slate-500">
                  Set your current base so the homepage map can spotlight you in real time.
                </p>
              </div>
              {(formState.currentLatitude || formState.currentLongitude || formState.currentLocationLabel) && (
                <button
                  type="button"
                  onClick={handleClearLocation}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-rose-200 hover:text-rose-600"
                >
                  Clear location
                </button>
              )}
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleUseLiveLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {locating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Locating...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4" />
                      Use my live location
                    </>
                  )}
                </button>
                {formState.currentLatitude && formState.currentLongitude ? (
                  <span className="text-xs font-medium text-emerald-700">
                    Captured {formState.currentLatitude}, {formState.currentLongitude}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500">
                    We only save your base point—never continuous tracking.
                  </span>
                )}
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  htmlFor="driver-profile-location-label"
                >
                  Location label
                </label>
                <input
                  id="driver-profile-location-label"
                  name="currentLocationLabel"
                  value={formState.currentLocationLabel}
                  onChange={handleFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  placeholder="e.g. Near Kandy city center"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Coordinates power the homepage live map. Leave blank if you don&apos;t want to appear there.
                </p>
              </div>
              {locationStatus ? (
                <p className="text-xs text-slate-500">{locationStatus}</p>
              ) : null}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="driver-profile-tripAdvisor">
              TripAdvisor link
            </label>
            <input
              id="driver-profile-tripAdvisor"
              name="tripAdvisor"
              value={formState.tripAdvisor}
              onChange={handleFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="https://"
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

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
        <header>
          <h2 className="text-lg font-semibold text-slate-900">Reset password</h2>
          <p className="text-sm text-slate-500">Update your password to keep your account secure.</p>
        </header>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="driver-password-current">
              Current password
            </label>
            <input
              id="driver-password-current"
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              onChange={handlePasswordFieldChange}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="driver-password-new">
              New password
            </label>
            <input
              id="driver-password-new"
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
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="driver-password-confirm">
              Confirm new password
            </label>
            <input
              id="driver-password-confirm"
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

const StatCard = ({ label, value, highlight = false }) => (
  <div
    className={`rounded-2xl border ${
      highlight ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
    } p-4`}
  >
    <p
      className={`text-xs uppercase tracking-wide ${
        highlight ? 'text-emerald-700' : 'text-slate-500'
      }`}
    >
      {label}
    </p>
    <p
      className={`mt-2 text-xl font-semibold ${
        highlight ? 'text-emerald-700' : 'text-slate-900'
      }`}
    >
      {value}
    </p>
  </div>
);

const DetailLine = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
    <p className="mt-1 text-sm font-medium text-slate-700">{value}</p>
  </div>
);

const AvailabilityPanel = ({
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

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading availability...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-medium text-rose-600">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!Array.isArray(vehicles) || vehicles.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center text-center text-sm text-slate-500">
        <CalendarCheck className="mb-3 h-8 w-8 text-slate-300" />
        <p>Submit a vehicle to start planning your availability.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {vehicles.map((vehicle) => {
        const entries = Array.isArray(vehicle.availability) ? vehicle.availability : [];
        const form = getFormState(vehicle.id);
        return (
          <article
            key={vehicle.id}
            className="space-y-4 rounded-2xl border border-slate-200 p-5 transition hover:border-slate-300"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-900">
                  <span>{vehicle.model}</span>
                  {vehicle.year ? (
                    <span className="text-xs font-medium text-slate-500">{vehicle.year}</span>
                  ) : null}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      VEHICLE_STATUS_STYLES[vehicle.status] || VEHICLE_STATUS_STYLES.pending
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {entries.length === 0
                    ? 'No availability slots added yet.'
                    : `${entries.length} availability slot${entries.length === 1 ? '' : 's'} added.`}
                </p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p className="font-semibold text-slate-700">
                  {vehicle.pricePerDay ? `${vehicle.pricePerDay.toLocaleString()} / day` : '—'}
                </p>
                {vehicle.seats ? <p>{vehicle.seats} seats</p> : null}
              </div>
            </div>

            <form
              onSubmit={(event) => handleFormSubmit(event, vehicle.id)}
              className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor={`availability-start-${vehicle.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Start date
                  </label>
                  <input
                    id={`availability-start-${vehicle.id}`}
                    type="date"
                    value={form.startDate}
                    onChange={(event) => handleInputChange(vehicle.id, 'startDate', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={`availability-end-${vehicle.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    End date
                  </label>
                  <input
                    id={`availability-end-${vehicle.id}`}
                    type="date"
                    value={form.endDate}
                    onChange={(event) => handleInputChange(vehicle.id, 'endDate', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                  />
                </div>
                <div>
                  <label htmlFor={`availability-status-${vehicle.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </label>
                  <select
                    id={`availability-status-${vehicle.id}`}
                    value={form.status}
                    onChange={(event) => handleInputChange(vehicle.id, 'status', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  >
                    <option value={AVAILABILITY_STATUS.AVAILABLE}>Available</option>
                    <option value={AVAILABILITY_STATUS.UNAVAILABLE}>Unavailable</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`availability-note-${vehicle.id}`} className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Note (optional)
                  </label>
                  <textarea
                    id={`availability-note-${vehicle.id}`}
                    rows={2}
                    value={form.note}
                    onChange={(event) => handleInputChange(vehicle.id, 'note', event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    placeholder="Add guidance for travellers or internal reminders."
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creatingVehicleId === vehicle.id}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/60"
                >
                  <PlusCircle className="h-4 w-4" />
                  {creatingVehicleId === vehicle.id ? 'Adding...' : 'Add slot'}
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {entries.length === 0 ? (
                <p className="rounded-xl bg-white px-4 py-3 text-sm text-slate-500">
                  No availability entries yet. Add your first slot above.
                </p>
              ) : (
                <ul className="space-y-3">
                  {entries.map((entry) => {
                    const rangeStart = formatDate(entry.startDate);
                    const rangeEnd = formatDate(entry.endDate);
                    const rangeLabel =
                      rangeStart === rangeEnd ? rangeStart : `${rangeStart} → ${rangeEnd}`;
                    const badgeClass =
                      AVAILABILITY_STATUS_STYLES[entry.status] || 'bg-slate-200 text-slate-700';
                    const isUpdating = updatingEntryId === entry.id;
                    const isRemoving = removingEntryId === entry.id;
                    return (
                      <li
                        key={entry.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                              <CalendarCheck className="h-4 w-4 text-emerald-600" />
                              <span>{rangeLabel}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className={`rounded-full px-2 py-0.5 font-semibold ${badgeClass}`}>
                                {entry.status}
                              </span>
                              {entry.updatedAt ? (
                                <span>Updated {formatDate(entry.updatedAt)}</span>
                              ) : null}
                            </div>
                            {entry.note ? (
                              <p className="mt-2 text-sm text-slate-600">{entry.note}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleStatusToggle(vehicle.id, entry)}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                entry.status === AVAILABILITY_STATUS.AVAILABLE
                                  ? 'border-amber-300 text-amber-700 hover:border-amber-400 hover:text-amber-800'
                                  : 'border-emerald-300 text-emerald-700 hover:border-emerald-400 hover:text-emerald-800'
                              }`}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {entry.status === AVAILABILITY_STATUS.AVAILABLE
                                ? isUpdating
                                  ? 'Updating...'
                                  : 'Mark unavailable'
                                : isUpdating
                                  ? 'Updating...'
                                  : 'Mark available'}
                            </button>
                            <button
                              type="button"
                              disabled={isRemoving}
                              onClick={() => handleEntryDelete(vehicle.id, entry.id)}
                              className="inline-flex items-center gap-2 rounded-full border border-rose-300 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-400 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              {isRemoving ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </article>
        );
      })}
    </div>
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
    vehicles,
    vehiclesLoading,
    vehiclesError,
    onVehicleRefresh,
    onVehicleCreate,
    onVehicleUpdate,
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
    onPasswordChange,
    profileSaving,
    passwordSaving,
  } = context;
  switch (tabId) {
    case 'overview':
      return <OverviewPanel profile={profile} />;
    case 'vehicles':
      return (
        <VehiclesPanel
          vehicles={vehicles}
          loading={vehiclesLoading}
          error={vehiclesError}
          onRefresh={onVehicleRefresh}
          onCreate={onVehicleCreate}
          onUpdate={onVehicleUpdate}
        />
      );
    case 'availability':
      return (
        <AvailabilityPanel
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
          bookingsState={driverBookingsState}
          onReload={onBookingsRefresh}
        />
      );
    case 'earnings':
      return (
        <DriverEarningsPanel
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
          profile={profile}
          onSave={onProfileSave}
          onPasswordChange={onPasswordChange}
          savingProfile={profileSaving}
          savingPassword={passwordSaving}
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

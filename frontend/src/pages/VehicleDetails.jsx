import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLoaderData } from 'react-router';
import toast from 'react-hot-toast';
import {
  Calendar,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Loader2,
  MapPin,
  MessageSquare,
  Minus,
  Plus,
  Share2,
  Shield,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import {
  fetchVehicleDetails,
  checkVehicleAvailability,
  fetchVehicleReviews,
} from '../services/vehicleCatalogApi.js';
import { getStoredToken, saveReturnPath } from '../services/authToken.js';
import { getVehicleFeatureLabels } from '../constants/vehicleFeatures.js';
import { startConversation as startChatConversation } from '../services/chatApi.js';
import { Avatar } from '../components/dashboard/primitives.jsx';
import ReviewPhotos from '../components/ReviewPhotos.jsx';

const DEFAULT_REVIEW_META = {
  total: 0,
  averageRating: null,
  countsByRating: [0, 0, 0, 0, 0],
};

const formatPrice = (value) => {
  if (typeof value !== 'number') {
    return null;
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const formatDate = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const INITIAL_AVAILABILITY_STATE = {
  checking: false,
  ready: false,
  notice: '',
  noticeTone: 'neutral',
  quote: null,
};

const VehicleDetails = () => {
  const params = useParams();
  const vehicleId = params.vehicleId || params.id;
  const navigate = useNavigate();

  // Seeded by the route loader so the vehicle detail is in the SSR HTML.
  const loaderData = useLoaderData();
  const [state, setState] = useState(
    loaderData?.vehicle
      ? { vehicle: loaderData.vehicle, loading: false, error: '' }
      : { vehicle: null, loading: true, error: '' },
  );
  const [dateForm, setDateForm] = useState({ start: '', end: '' });
  const [guests, setGuests] = useState(2);
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY_STATE);
  const [creatingConversation, setCreatingConversation] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [reviewRefreshIndex, setReviewRefreshIndex] = useState(0);
  const [reviewFilters, setReviewFilters] = useState({ rating: 'all', sort: 'recent' });
  const [reviewsState, setReviewsState] = useState({
    loading: true,
    error: '',
    items: [],
    meta: { ...DEFAULT_REVIEW_META },
  });

  useEffect(() => {
    let cancelled = false;
    if (!vehicleId) {
      setState({ vehicle: null, loading: false, error: 'Vehicle not found.' });
      return () => { cancelled = true; };
    }
    setState((prev) => ({ ...prev, loading: prev.vehicle ? false : true, error: '' }));
    fetchVehicleDetails(vehicleId)
      .then(({ vehicle }) => {
        if (cancelled) return;
        if (!vehicle) {
          setState({ vehicle: null, loading: false, error: 'Vehicle not found.' });
          return;
        }
        setState({ vehicle, loading: false, error: '' });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ vehicle: null, loading: false, error: error?.message || 'Unable to load vehicle details.' });
      });
    return () => { cancelled = true; };
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) {
      setReviewsState({ loading: false, error: '', items: [], meta: { ...DEFAULT_REVIEW_META } });
      return;
    }
    let cancelled = false;
    setReviewsState((prev) => ({ ...prev, loading: true, error: '' }));
    const reviewParams = {};
    if (reviewFilters.rating !== 'all') {
      reviewParams.minRating = reviewFilters.rating;
      reviewParams.maxRating = reviewFilters.rating;
    }
    if (reviewFilters.sort) {
      reviewParams.sort = reviewFilters.sort;
    }
    fetchVehicleReviews(vehicleId, reviewParams)
      .then((data) => {
        if (cancelled) return;
        setReviewsState({
          loading: false,
          error: '',
          items: Array.isArray(data?.reviews) ? data.reviews : [],
          meta: {
            total: data?.meta?.total ?? 0,
            averageRating: typeof data?.meta?.averageRating === 'number' ? data.meta.averageRating : null,
            countsByRating: Array.isArray(data?.meta?.countsByRating) ? data.meta.countsByRating : [...DEFAULT_REVIEW_META.countsByRating],
          },
        });
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setReviewsState({
          loading: false,
          error: fetchError?.message || 'Unable to load reviews right now.',
          items: [],
          meta: { ...DEFAULT_REVIEW_META },
        });
      });
    return () => { cancelled = true; };
  }, [vehicleId, reviewFilters, reviewRefreshIndex]);

  const { vehicle, loading, error } = state;
  const { items: reviews, meta: reviewMeta, loading: reviewsLoading, error: reviewsError } = reviewsState;
  const averageRatingLabel = typeof reviewMeta.averageRating === 'number' ? reviewMeta.averageRating.toFixed(1) : '—';
  const ratingCounts = Array.isArray(reviewMeta.countsByRating) ? reviewMeta.countsByRating : DEFAULT_REVIEW_META.countsByRating;
  const ratingOptions = [
    { value: 'all', label: 'All', count: reviewMeta.total ?? 0 },
    ...[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value}★`, count: ratingCounts[value - 1] ?? 0 })),
  ];

  const includedServices = useMemo(() => getVehicleFeatureLabels(vehicle), [vehicle]);
  const todayDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const galleryImages = useMemo(() => {
    if (!vehicle || !Array.isArray(vehicle.images) || vehicle.images.length === 0) return [];
    return vehicle.images.slice(0, 5);
  }, [vehicle]);

  const handleDateChange = (field, value) => {
    setDateForm((prev) => ({ ...prev, [field]: value }));
    setAvailability((prev) => ({ ...prev, checking: false, ready: false, notice: '', noticeTone: 'neutral', quote: null }));
  };

  const handleReviewRatingFilter = (value) => setReviewFilters((prev) => (prev.rating === value ? prev : { ...prev, rating: value }));
  const handleReviewSortChange = (value) => setReviewFilters((prev) => (prev.sort === value ? prev : { ...prev, sort: value }));
  const handleReviewReload = () => setReviewRefreshIndex((prev) => prev + 1);

  const handleDateSubmit = (event) => {
    event.preventDefault();
    if (!vehicleId) {
      setAvailability({ checking: false, ready: false, notice: 'Vehicle information is missing. Please try again from the catalog.', noticeTone: 'error', quote: null });
      return;
    }
    if (!dateForm.start || !dateForm.end) {
      setAvailability({ checking: false, ready: false, notice: 'Select both start and end dates to search availability.', noticeTone: 'error', quote: null });
      return;
    }
    if (dateForm.end < dateForm.start) {
      setAvailability({ checking: false, ready: false, notice: 'End date must be after start date.', noticeTone: 'error', quote: null });
      return;
    }
    if (dateForm.start < todayDate) {
      setAvailability({ checking: false, ready: false, notice: 'Start date cannot be in the past.', noticeTone: 'error', quote: null });
      return;
    }
    setAvailability({ checking: true, ready: false, notice: '', noticeTone: 'neutral', quote: null });
    checkVehicleAvailability(vehicleId, { startDate: dateForm.start, endDate: dateForm.end })
      .then((response) => {
        if (response?.available) {
          const totalDays = response.quote?.totalDays;
          const successMessage = typeof totalDays === 'number' && totalDays > 0
            ? `Great news! Free for your ${totalDays}-day trip.`
            : 'Great news! This vehicle is free for your selected dates.';
          setAvailability({ checking: false, ready: true, notice: successMessage, noticeTone: 'success', quote: response.quote || null });
        } else {
          const failureMessage = typeof response?.reason === 'string' && response.reason.trim()
            ? response.reason
            : 'This vehicle is not available for the selected dates.';
          setAvailability({ checking: false, ready: false, notice: failureMessage, noticeTone: 'error', quote: null });
        }
      })
      .catch((err) => {
        setAvailability({ checking: false, ready: false, notice: err?.message || 'Unable to check availability. Please try again shortly.', noticeTone: 'error', quote: null });
      });
  };

  const handleBookNow = () => {
    if (!availability.ready || availability.checking) return;
    if (!dateForm.start || !dateForm.end || !vehicleId) return;
    const searchParams = new URLSearchParams({ start: dateForm.start, end: dateForm.end, guests: String(guests) });
    const checkoutPath = `/checkout/${vehicleId}?${searchParams.toString()}`;
    const token = getStoredToken();
    if (!token) {
      saveReturnPath(checkoutPath);
      navigate('/register');
      return;
    }
    navigate(checkoutPath, {
      state: {
        quote: availability.quote || null,
        vehicleSummary: vehicle ? { id: vehicle.id, model: vehicle.model, pricePerDay: vehicle.pricePerDay, driverName: vehicle.driver?.name } : null,
      },
    });
  };

  const handleSendMessage = async () => {
    if (!vehicle?.driver?.id) {
      toast.error('Driver information is missing for this vehicle.');
      return;
    }
    if (creatingConversation) return;
    setCreatingConversation(true);
    try {
      const response = await startChatConversation({ driverId: vehicle.driver.id, vehicleId: vehicle.id });
      const conversationId = response?.conversation?.id;
      toast.success('Conversation ready in your inbox.');
      navigate('/dashboard', { state: { openTab: 'messages', conversationId: conversationId || null } });
    } catch (err) {
      const message = err?.message || 'Unable to start a conversation right now.';
      toast.error(message);
      if (message.toLowerCase().includes('sign in') || message.toLowerCase().includes('auth')) {
        navigate('/login', { state: { redirectTo: `/vehicles/${vehicleId}` } });
      }
    } finally {
      setCreatingConversation(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 bg-canvas font-sans text-sm text-muted">
        <Loader2 className="h-5 w-5 animate-spin text-brand" /> Loading vehicle…
      </div>
    );
  }
  if (error || !vehicle) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-canvas px-5 font-sans">
        <div className="w-full max-w-[420px] rounded-[20px] bg-white p-8 text-center shadow-card">
          <p className="text-[16px] font-extrabold text-ink">We hit a bump</p>
          <p className="mt-2 text-sm text-muted">{error || 'This vehicle could not be found.'}</p>
          <div className="mt-5 flex justify-center gap-2.5">
            <Link to="/vehicles" className="rounded-full bg-brand px-4 py-2 text-sm font-bold text-white">Browse vehicles</Link>
            <Link to="/" className="rounded-full border border-[#e2e8ea] px-4 py-2 text-sm font-bold text-ink">Home</Link>
          </div>
        </div>
      </div>
    );
  }

  const activeDiscount = vehicle?.activeDiscount;
  const pricePerDayValue = typeof activeDiscount?.discountedPricePerDay === 'number' ? activeDiscount.discountedPricePerDay : vehicle.pricePerDay;
  const priceLabel = formatPrice(pricePerDayValue);
  const originalPriceLabel = activeDiscount && typeof vehicle.pricePerDay === 'number' ? formatPrice(vehicle.pricePerDay) : null;
  const driverAddress = vehicle.driver?.address;
  const locationLabel = typeof driverAddress === 'string' && driverAddress.trim() ? driverAddress.trim() : 'Pickup shared after confirmation';
  const driverName = vehicle.driver?.name ?? 'Approved driver';
  const firstName = driverName.split(' ')[0] || driverName;
  const memberSinceLabel = vehicle.driver?.createdAt ? `Member since ${formatDate(vehicle.driver.createdAt)}` : 'Verified driver';
  const quoteTotalValue = availability.quote?.totalPrice ?? null;
  const quotePayableValue = availability.quote?.payableTotal ?? quoteTotalValue;
  const quoteDiscount = availability.quote?.discount;
  const quoteDiscountAmount = typeof quoteDiscount?.amount === 'number'
    ? quoteDiscount.amount
    : quoteTotalValue && typeof quoteDiscount?.discountRate === 'number' ? quoteTotalValue * quoteDiscount.discountRate : null;
  const quoteTotalLabel = typeof quoteTotalValue === 'number' ? formatPrice(quoteTotalValue) : null;
  const quotePayableLabel = typeof quotePayableValue === 'number' ? formatPrice(quotePayableValue) : null;
  const quoteDiscountLabel = typeof quoteDiscountAmount === 'number' ? formatPrice(quoteDiscountAmount) : null;

  const goDriverProfile = () => vehicle.driver?.id && navigate(`/drivers/${vehicle.driver.id}`);
  const scrollToTrip = () => document.getElementById('trip-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const specIcon = 'h-[17px] w-[17px]';
  const specs = [
    { node: <Users className={specIcon} strokeWidth={1.8} />, label: 'Seats', value: vehicle.seats || '—' },
    { node: <Calendar className={specIcon} strokeWidth={1.8} />, label: 'Year', value: vehicle.year || '—' },
    { node: <Star className={specIcon} strokeWidth={1.8} />, label: 'Rating', value: averageRatingLabel },
    { node: <Wallet className={specIcon} strokeWidth={1.8} />, label: 'Payment', value: 'On arrival' },
  ];

  const bookingProps = {
    priceLabel, originalPriceLabel, activeDiscount, dateForm, handleDateChange, todayDate,
    handleDateSubmit, availability, handleBookNow, guests, setGuests,
    quoteTotalLabel, quotePayableLabel, quoteDiscountLabel,
  };
  const reviewProps = {
    reviews, reviewMeta, reviewsLoading, reviewsError, averageRatingLabel, ratingCounts,
    ratingOptions, reviewFilters, handleReviewRatingFilter, handleReviewSortChange, handleReviewReload, firstName,
  };
  const driverProps = { driverName, memberSinceLabel, driverAddress, averageRatingLabel, handleSendMessage, creatingConversation, goDriverProfile };

  return (
    <div className="bg-[#eef1f4] font-sans text-ink">
      {/* ---------------- MOBILE ---------------- */}
      <div className="min-h-screen bg-canvas pb-[88px] lg:hidden">
        {/* Hero gallery */}
        <div className="relative h-[280px] w-full bg-ink">
          {galleryImages.length ? (
            <button type="button" onClick={() => setGalleryIndex((i) => (i + 1) % galleryImages.length)} className="h-full w-full">
              <img src={galleryImages[galleryIndex]} alt={vehicle.model} className="h-full w-full object-cover" />
            </button>
          ) : (
            <div className="grid h-full w-full place-items-center text-white/50"><Car className="h-10 w-10" /></div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink/45 via-transparent to-transparent" />
          <div className="absolute inset-x-3.5 top-3.5 flex justify-between">
            <button type="button" onClick={() => navigate(-1)} aria-label="Back" className="pointer-events-auto grid h-[38px] w-[38px] place-items-center rounded-xl bg-ink/55 text-white backdrop-blur">
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
            </button>
            <div className="flex gap-2">
              <button type="button" aria-label="Save" className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-ink/55 text-white"><Heart className="h-4 w-4" /></button>
              <button type="button" aria-label="Share" className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-ink/55 text-white"><Share2 className="h-4 w-4" /></button>
            </div>
          </div>
          {galleryImages.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length)}
                aria-label="Previous photo"
                className="absolute left-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-white backdrop-blur transition hover:bg-ink/70"
              >
                <ChevronLeft className="h-5 w-5" strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => setGalleryIndex((i) => (i + 1) % galleryImages.length)}
                aria-label="Next photo"
                className="absolute right-2.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-ink/50 text-white backdrop-blur transition hover:bg-ink/70"
              >
                <ChevronRight className="h-5 w-5" strokeWidth={2.2} />
              </button>
              <div className="absolute inset-x-0 bottom-3.5 flex justify-center gap-1.5">
                {galleryImages.map((_, i) => (
                  <span key={i} className={`h-1.5 rounded-full transition-all ${i === galleryIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}`} />
                ))}
              </div>
            </>
          ) : null}
        </div>

        <div className="relative -mt-[22px] rounded-t-[26px] bg-canvas px-[18px] pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[23px] font-extrabold leading-tight tracking-tight text-ink">{vehicle.model}</h1>
              <div className="mt-1.5 flex items-center gap-2 text-[13px] font-semibold text-muted">
                <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5" fill="#f5b400" stroke="none" /><b className="text-ink">{averageRatingLabel}</b>({reviewMeta.total})</span>
                <span className="h-1 w-1 rounded-full bg-[#cfd8dd]" />
                <span className="truncate">{locationLabel}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {specs.map((s) => <SpecCard key={s.label} {...s} />)}
          </div>

          <div id="trip-card" className="mt-5 rounded-[18px] bg-white p-[18px] shadow-card">
            <BookingPanel {...bookingProps} title="Your trip" />
          </div>

          {includedServices.length > 0 ? (
            <div className="mt-5">
              <h3 className="text-[16px] font-extrabold text-ink">What's included</h3>
              <div className="mt-3 flex flex-col gap-2.5">
                {includedServices.map((label) => <IncludedRow key={label}>{label}</IncludedRow>)}
              </div>
            </div>
          ) : null}

          {vehicle.description ? (
            <div className="mt-5">
              <h3 className="text-[16px] font-extrabold text-ink">About this vehicle</h3>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{vehicle.description}</p>
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="text-[16px] font-extrabold text-ink">Your driver</h3>
            <div className="mt-2.5 rounded-[18px] bg-white p-4 shadow-card"><DriverCard {...driverProps} /></div>
          </div>

          <div className="mt-5 pb-2">
            <h3 className="text-[16px] font-extrabold text-ink">Reviews</h3>
            <div className="mt-2.5"><ReviewsSection {...reviewProps} /></div>
          </div>
        </div>

        {/* Sticky bar */}
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-[480px] items-center gap-3 border-t border-hairline bg-white px-4 pb-4 pt-3 shadow-[0_-8px_24px_rgba(15,31,45,0.06)]">
          <div className="flex-shrink-0">
            <div className="text-[17px] font-extrabold text-ink">{priceLabel || 'Quote'}<span className="text-[11.5px] font-semibold text-muted-soft">/day</span></div>
            {originalPriceLabel ? <div className="text-[11px] text-muted-soft line-through">{originalPriceLabel}</div> : <div className="text-[11px] text-muted-soft">all-in</div>}
          </div>
          {availability.ready ? (
            <button type="button" onClick={handleBookNow} className="flex-1 rounded-[14px] bg-brand py-[14px] text-[14.5px] font-bold text-white transition hover:bg-brand-dark">Book now</button>
          ) : (
            <button type="button" onClick={scrollToTrip} className="flex-1 rounded-[14px] bg-brand py-[14px] text-[14.5px] font-bold text-white transition hover:bg-brand-dark">Check availability</button>
          )}
        </div>
      </div>

      {/* ---------------- DESKTOP ---------------- */}
      <div className="hidden min-h-screen lg:block">
        <div className="mx-auto max-w-[1180px] px-9 py-8">
          <button type="button" onClick={() => navigate(-1)} className="mb-5 flex items-center gap-2 text-[13.5px] font-bold text-muted transition hover:text-ink">
            <ChevronLeft className="h-4 w-4" strokeWidth={2} /> Back to vehicles
          </button>

          {/* Gallery grid */}
          {galleryImages.length ? (
            <div className="grid grid-cols-[2fr_1fr_1fr] grid-rows-2 gap-3 overflow-hidden rounded-[22px]" style={{ height: 380 }}>
              <img src={galleryImages[0]} alt={vehicle.model} className="col-span-1 row-span-2 h-full w-full object-cover" />
              {[1, 2, 3, 4].map((i) => (
                galleryImages[i] ? (
                  <img key={i} src={galleryImages[i]} alt={`${vehicle.model} ${i + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <div key={i} className="grid h-full w-full place-items-center bg-[#e3e8ea] text-muted-soft"><Car className="h-6 w-6" /></div>
                )
              ))}
            </div>
          ) : (
            <div className="grid h-[300px] place-items-center rounded-[22px] bg-[#e3e8ea] text-muted-soft">
              <div className="flex items-center gap-2 text-sm font-semibold"><Car className="h-5 w-5" /> No images uploaded yet</div>
            </div>
          )}

          <div className="mt-7 grid grid-cols-[1fr_360px] items-start gap-9">
            <div>
              <h1 className="text-[30px] font-extrabold tracking-tight text-ink">{vehicle.model}</h1>
              <div className="mt-2 flex items-center gap-3 text-[14px] font-semibold text-muted">
                <span className="flex items-center gap-1.5"><Star className="h-4 w-4" fill="#f5b400" stroke="none" /><b className="text-ink">{averageRatingLabel}</b> ({reviewMeta.total} reviews)</span>
                <span className="h-1 w-1 rounded-full bg-[#cfd8dd]" />
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-soft" /> {locationLabel}</span>
              </div>

              <div className="mt-6 grid grid-cols-4 gap-3">
                {specs.map((s) => <SpecCard key={s.label} {...s} desktop />)}
              </div>

              {vehicle.description ? (
                <div className="mt-8">
                  <h2 className="text-[18px] font-extrabold text-ink">About this vehicle</h2>
                  <p className="mt-2.5 max-w-[640px] whitespace-pre-line text-[15px] leading-relaxed text-ink-soft">{vehicle.description}</p>
                </div>
              ) : null}

              {includedServices.length > 0 ? (
                <div className="mt-8">
                  <h2 className="text-[18px] font-extrabold text-ink">What's included</h2>
                  <div className="mt-3.5 grid max-w-[640px] grid-cols-2 gap-x-6 gap-y-3">
                    {includedServices.map((label) => <IncludedRow key={label}>{label}</IncludedRow>)}
                  </div>
                </div>
              ) : null}

              <div className="mt-8">
                <h2 className="text-[18px] font-extrabold text-ink">Your driver</h2>
                <div className="mt-3.5 rounded-[18px] border border-[#e7ebe9] bg-white p-6"><DriverCard {...driverProps} desktop /></div>
              </div>

              <div className="mt-8">
                <h2 className="text-[18px] font-extrabold text-ink">Reviews</h2>
                <div className="mt-3.5"><ReviewsSection {...reviewProps} /></div>
              </div>
            </div>

            {/* Sticky booking card */}
            <div className="sticky top-6">
              <div className="rounded-[18px] border border-[#e7ebe9] bg-white p-[22px] shadow-[0_18px_40px_-18px_rgba(15,31,45,0.25)]">
                <BookingPanel {...bookingProps} desktop />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------- Booking panel (shared) ----------------
const BookingPanel = ({
  priceLabel, originalPriceLabel, activeDiscount, dateForm, handleDateChange, todayDate,
  handleDateSubmit, availability, handleBookNow, guests, setGuests,
  quoteTotalLabel, quotePayableLabel, quoteDiscountLabel, title, desktop = false,
}) => {
  const inputCls = 'w-full rounded-[12px] border border-[#e2e8ea] bg-white px-3 py-2.5 text-[13.5px] font-semibold text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
  return (
    <div>
      <div className="flex items-baseline gap-1.5">
        <b className={`text-ink ${desktop ? 'text-[26px]' : 'text-[22px]'}`}>{priceLabel || 'Request quote'}</b>
        {priceLabel ? <span className="text-[13.5px] font-semibold text-muted-soft">/ day</span> : null}
        {originalPriceLabel ? <span className="text-[13px] font-semibold text-[#e11d48] line-through">{originalPriceLabel}</span> : null}
      </div>
      {activeDiscount?.discountPercent ? (
        <span className="mt-2 inline-flex rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-extrabold text-brand-dark">Save {activeDiscount.discountPercent}% this trip</span>
      ) : title ? (
        <p className="mt-1 text-[12.5px] font-semibold text-muted-soft">{title}</p>
      ) : null}

      <form className="mt-4 space-y-3" onSubmit={handleDateSubmit}>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">Start</span>
            <input type="date" value={dateForm.start} min={todayDate} onChange={(e) => handleDateChange('start', e.target.value)} className={inputCls} required />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-wide text-muted-soft">End</span>
            <input type="date" value={dateForm.end} min={dateForm.start || todayDate} onChange={(e) => handleDateChange('end', e.target.value)} className={inputCls} required />
          </label>
        </div>
        <div className="flex items-center justify-between rounded-[12px] border border-[#e2e8ea] px-3 py-2">
          <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink"><Users className="h-4 w-4 text-muted-soft" /> Travellers</span>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Fewer travellers" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="grid h-7 w-7 place-items-center rounded-full border border-[#e2e8ea] text-ink"><Minus className="h-3.5 w-3.5" /></button>
            <span className="w-4 text-center text-[14px] font-extrabold text-ink">{guests}</span>
            <button type="button" aria-label="More travellers" onClick={() => setGuests((g) => Math.min(20, g + 1))} className="grid h-7 w-7 place-items-center rounded-full border border-[#e2e8ea] text-ink"><Plus className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <button type="submit" disabled={availability.checking} className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-ink py-[13px] text-[14px] font-bold text-white transition hover:bg-ink/90 disabled:opacity-70">
          {availability.checking ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : 'Check availability'}
        </button>
      </form>

      {availability.notice ? (
        <p className={`mt-3 text-[12.5px] font-semibold ${availability.noticeTone === 'error' ? 'text-[#e11d48]' : availability.noticeTone === 'success' ? 'text-brand-dark' : 'text-muted'}`}>
          {availability.notice}
        </p>
      ) : null}

      {availability.ready && availability.quote ? (
        <div className="mt-3 space-y-1.5 rounded-[14px] bg-brand-tint p-3.5 text-[12.5px] text-brand-dark">
          <div className="flex justify-between"><span>{availability.quote.totalDays}-day trip</span><b>{quoteTotalLabel}</b></div>
          {quoteDiscountLabel ? <div className="flex justify-between"><span>Discount</span><b>-{quoteDiscountLabel}</b></div> : null}
          {quotePayableLabel ? <div className="flex justify-between border-t border-brand/20 pt-1.5 text-[14px] font-extrabold text-brand-dark"><span>Pay your driver</span><span>{quotePayableLabel}</span></div> : null}
          {availability.quote.paymentNote ? <p className="text-[11px] text-brand-dark/70">{availability.quote.paymentNote}</p> : null}
        </div>
      ) : null}

      {availability.ready ? (
        <button type="button" onClick={handleBookNow} disabled={availability.checking} className="mt-3 w-full rounded-[14px] bg-brand py-[14px] text-[15px] font-extrabold text-white transition hover:bg-brand-dark disabled:opacity-70">
          Book now
        </button>
      ) : null}

      <div className="mt-4 flex flex-col gap-2.5 border-t border-hairline pt-3.5 text-[12px] font-semibold text-muted">
        <span className="flex items-center gap-2.5"><Shield className="h-[15px] w-[15px] text-brand" /> Identity &amp; licence verified</span>
        <span className="flex items-center gap-2.5"><Wallet className="h-[15px] w-[15px] text-brand" /> Pay the driver on arrival</span>
        <span className="flex items-center gap-2.5"><Check className="h-[15px] w-[15px] text-brand" strokeWidth={2.5} /> Free cancellation until 2 days before your trip</span>
      </div>
    </div>
  );
};

// ---------------- Small pieces ----------------
const SpecCard = ({ node, label, value, desktop = false }) => (
  <div className={`flex items-center gap-3 rounded-[14px] bg-white ${desktop ? 'border border-[#eef1f0] p-4' : 'p-3.5 shadow-card'}`}>
    <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[10px] bg-brand-tint text-brand">{node}</span>
    <div className="min-w-0">
      <div className="truncate text-[15px] font-extrabold text-ink">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-muted-soft">{label}</div>
    </div>
  </div>
);

const IncludedRow = ({ children }) => (
  <div className="flex items-center gap-2.5 text-[13.5px] font-semibold text-ink lg:text-[14px]">
    <span className="grid h-[18px] w-[18px] flex-shrink-0 place-items-center rounded-full border-[2px] border-brand">
      <Check className="h-2.5 w-2.5 text-brand" strokeWidth={3.5} />
    </span>
    {children}
  </div>
);

const DriverCard = ({ driverName, memberSinceLabel, driverAddress, averageRatingLabel, handleSendMessage, creatingConversation, goDriverProfile, desktop = false }) => (
  <div>
    <div className="flex items-center gap-3.5">
      <Avatar name={driverName} tone="ink" className={`flex-shrink-0 rounded-full ${desktop ? 'h-14 w-14 text-lg' : 'h-12 w-12 text-base'}`} />
      <div className="min-w-0 flex-1">
        <b className="block truncate text-[15.5px] text-ink">{driverName}</b>
        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[12px] text-muted-soft">
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" fill="#f5b400" stroke="none" /> {averageRatingLabel} rating</span>
          <span className="h-1 w-1 rounded-full bg-[#cfd8dd]" />
          <span className="truncate">{memberSinceLabel}</span>
        </div>
        {driverAddress ? <div className="mt-1 flex items-center gap-1 text-[12px] text-muted-soft"><MapPin className="h-3.5 w-3.5" /> {driverAddress}</div> : null}
      </div>
    </div>
    <div className="mt-4 flex gap-2.5">
      <button type="button" onClick={handleSendMessage} disabled={creatingConversation} className="flex flex-1 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-[#e2e8ea] py-2.5 text-[13.5px] font-bold text-ink transition hover:border-muted-soft disabled:opacity-70">
        {creatingConversation ? <><Loader2 className="h-4 w-4 animate-spin text-muted-soft" /> Starting…</> : <><MessageSquare className="h-4 w-4" strokeWidth={1.7} /> Message</>}
      </button>
      <button type="button" onClick={goDriverProfile} className="flex-1 rounded-[14px] bg-brand py-2.5 text-[13.5px] font-bold text-white transition hover:bg-brand-dark">
        View profile
      </button>
    </div>
  </div>
);

const ReviewsSection = ({
  reviews, reviewMeta, reviewsLoading, reviewsError, averageRatingLabel, ratingCounts,
  ratingOptions, reviewFilters, handleReviewRatingFilter, handleReviewSortChange, handleReviewReload, firstName,
}) => {
  const maxCount = Math.max(...(ratingCounts || [1]), 1);
  return (
    <div className="rounded-[18px] border border-[#e7ebe9] bg-white p-5 lg:p-6">
      <div className="flex flex-col gap-4 border-b border-hairline pb-5 sm:flex-row sm:items-center sm:gap-6">
        <div className="flex items-center gap-3.5">
          <div className="text-center">
            <div className="text-[36px] font-extrabold leading-none text-ink">{averageRatingLabel}</div>
            <div className="mt-1 text-[11px] text-muted-soft">{reviewMeta.total} review{reviewMeta.total === 1 ? '' : 's'}</div>
          </div>
          <div className="flex w-[130px] flex-col gap-1.5">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="w-2.5 text-[10.5px] text-muted-soft">{star}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${((ratingCounts[star - 1] || 0) / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">
          {ratingOptions.map((option) => {
            const isActive = reviewFilters.rating === option.value;
            return (
              <button key={option.value} type="button" onClick={() => handleReviewRatingFilter(option.value)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${isActive ? 'bg-brand text-white' : 'bg-canvas text-muted hover:text-ink'}`}>
                {option.label} <span className={isActive ? 'text-white/70' : 'text-muted-soft'}>{option.count}</span>
              </button>
            );
          })}
          <select value={reviewFilters.sort} onChange={(e) => handleReviewSortChange(e.target.value)}
            className="rounded-full border border-[#e2e8ea] bg-white px-3 py-1.5 text-[12px] font-bold text-muted focus:border-brand focus:outline-none">
            <option value="recent">Newest</option>
            <option value="ratingDesc">Highest</option>
            <option value="ratingAsc">Lowest</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
      </div>

      <div className="mt-5">
        {reviewsLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin text-brand" /> Loading reviews…</div>
        ) : reviewsError ? (
          <div className="text-sm text-muted">
            <p className="text-[#e11d48]">{reviewsError}</p>
            <button type="button" onClick={handleReviewReload} className="mt-2 rounded-full border border-[#e2e8ea] px-3 py-1.5 text-xs font-bold text-ink">Try again</button>
          </div>
        ) : reviews.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-hairline bg-canvas p-5 text-[13px] text-muted-soft">
            No reviews yet. Be the first to explore Sri Lanka with {firstName} and share your story.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => {
              const travelStart = formatDate(review.visitedStartDate);
              const travelEnd = formatDate(review.visitedEndDate);
              const travelerName = review.travelerName || 'Traveller';
              return (
                <article key={review.id} className="rounded-[16px] border border-[#eef1f0] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={travelerName} tone="purple" className="h-9 w-9 rounded-[11px] text-[13px]" />
                      <div>
                        <b className="text-[13.5px] text-ink">{travelerName}</b>
                        <div className="text-[11px] text-muted-soft">{travelStart && travelEnd ? `${travelStart} – ${travelEnd}` : 'Recent trip'}</div>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-[13px] font-extrabold text-ink"><Star className="h-3.5 w-3.5" fill="#f5b400" stroke="none" /> {review.rating}</span>
                  </div>
                  {review.title ? <p className="mt-2.5 text-[13.5px] font-bold text-ink">{review.title}</p> : null}
                  <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{review.comment}</p>
                  <ReviewPhotos images={review.images} />
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleDetails;

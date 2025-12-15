import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BadgeCheck,
  Calendar,
  CalendarClock,
  Car,
  Loader2,
  MapPin,
  MessageCircle,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import {
  fetchVehicleDetails,
  checkVehicleAvailability,
  fetchVehicleReviews,
} from '../services/vehicleCatalogApi.js';
import { getVehicleFeatureLabels } from '../constants/vehicleFeatures.js';
import { startConversation as startChatConversation } from '../services/chatApi.js';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80';

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

  const [state, setState] = useState({
    vehicle: null,
    loading: true,
    error: '',
  });
  const [dateForm, setDateForm] = useState({ start: '', end: '' });
  const [availability, setAvailability] = useState(INITIAL_AVAILABILITY_STATE);
  const [creatingConversation, setCreatingConversation] = useState(false);
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
      setState({
        vehicle: null,
        loading: false,
        error: 'Vehicle not found.',
      });
      return () => {
        cancelled = true;
      };
    }

    setState((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));

    fetchVehicleDetails(vehicleId)
      .then(({ vehicle }) => {
        if (cancelled) {
          return;
        }
        if (!vehicle) {
          setState({
            vehicle: null,
            loading: false,
            error: 'Vehicle not found.',
          });
          return;
        }
        setState({
          vehicle,
          loading: false,
          error: '',
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setState({
          vehicle: null,
          loading: false,
          error: error?.message || 'Unable to load vehicle details.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) {
      setReviewsState({
        loading: false,
        error: '',
        items: [],
        meta: { ...DEFAULT_REVIEW_META },
      });
      return;
    }

    let cancelled = false;

    setReviewsState((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));

    const params = {};
    if (reviewFilters.rating !== 'all') {
      params.minRating = reviewFilters.rating;
      params.maxRating = reviewFilters.rating;
    }
    if (reviewFilters.sort) {
      params.sort = reviewFilters.sort;
    }

    fetchVehicleReviews(vehicleId, params)
      .then((data) => {
        if (cancelled) {
          return;
        }
        setReviewsState({
          loading: false,
          error: '',
          items: Array.isArray(data?.reviews) ? data.reviews : [],
          meta: {
            total: data?.meta?.total ?? 0,
            averageRating:
              typeof data?.meta?.averageRating === 'number' ? data.meta.averageRating : null,
            countsByRating: Array.isArray(data?.meta?.countsByRating)
              ? data.meta.countsByRating
              : [...DEFAULT_REVIEW_META.countsByRating],
          },
        });
      })
      .catch((fetchError) => {
        if (cancelled) {
          return;
        }
        setReviewsState({
          loading: false,
          error: fetchError?.message || 'Unable to load reviews right now.',
          items: [],
          meta: { ...DEFAULT_REVIEW_META },
        });
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId, reviewFilters, reviewRefreshIndex]);

  const { vehicle, loading, error } = state;
  const {
    items: reviews,
    meta: reviewMeta,
    loading: reviewsLoading,
    error: reviewsError,
  } = reviewsState;
  const averageRatingLabel =
    typeof reviewMeta.averageRating === 'number' ? reviewMeta.averageRating.toFixed(1) : '—';
  const ratingCounts = Array.isArray(reviewMeta.countsByRating)
    ? reviewMeta.countsByRating
    : DEFAULT_REVIEW_META.countsByRating;
  const ratingOptions = [
    { value: 'all', label: 'All', count: reviewMeta.total ?? 0 },
    ...[5, 4, 3, 2, 1].map((value) => ({
      value: String(value),
      label: `${value} star${value === 1 ? '' : 's'}`,
      count: ratingCounts[value - 1] ?? 0,
    })),
  ];

  const includedServices = useMemo(() => getVehicleFeatureLabels(vehicle), [vehicle]);
  const galleryImages = useMemo(() => {
    if (!vehicle || !Array.isArray(vehicle.images) || vehicle.images.length === 0) {
      return Array.from({ length: 5 }, () => FALLBACK_IMAGE);
    }
    const normalized = vehicle.images.slice(0, 5);
    while (normalized.length < 5) {
      normalized.push(FALLBACK_IMAGE);
    }
    return normalized;
  }, [vehicle]);

  const handleDateChange = (field, value) => {
    setDateForm((prev) => ({ ...prev, [field]: value }));
    setAvailability((prev) => ({
      ...prev,
      checking: false,
      ready: false,
      notice: '',
      noticeTone: 'neutral',
      quote: null,
    }));
  };

  const handleReviewRatingFilter = (value) => {
    setReviewFilters((prev) => {
      if (prev.rating === value) {
        return prev;
      }
      return { ...prev, rating: value };
    });
  };

  const handleReviewSortChange = (value) => {
    setReviewFilters((prev) => {
      if (prev.sort === value) {
        return prev;
      }
      return { ...prev, sort: value };
    });
  };

  const handleReviewReload = () => {
    setReviewRefreshIndex((prev) => prev + 1);
  };

  const handleDateSubmit = (event) => {
    event.preventDefault();
    if (!vehicleId) {
      setAvailability({
        checking: false,
        ready: false,
        notice: 'Vehicle information is missing. Please try again from the catalog.',
        noticeTone: 'error',
        quote: null,
      });
      return;
    }
    if (!dateForm.start || !dateForm.end) {
      setAvailability({
        checking: false,
        ready: false,
        notice: 'Select both start and end dates to search availability.',
        noticeTone: 'error',
        quote: null,
      });
      return;
    }
    if (dateForm.end < dateForm.start) {
      setAvailability({
        checking: false,
        ready: false,
        notice: 'End date must be after start date.',
        noticeTone: 'error',
        quote: null,
      });
      return;
    }

    setAvailability({
      checking: true,
      ready: false,
      notice: '',
      noticeTone: 'neutral',
      quote: null,
    });

    checkVehicleAvailability(vehicleId, {
      startDate: dateForm.start,
      endDate: dateForm.end,
    })
      .then((response) => {
        if (response?.available) {
          const totalDays = response.quote?.totalDays;
          const successMessage =
            typeof totalDays === 'number' && totalDays > 0
              ? `Great news! This vehicle is free for your ${totalDays}-day trip.`
              : 'Great news! This vehicle is free for your selected dates.';
          setAvailability({
            checking: false,
            ready: true,
            notice: successMessage,
            noticeTone: 'success',
            quote: response.quote || null,
          });
        } else {
          const failureMessage =
            typeof response?.reason === 'string' && response.reason.trim()
              ? response.reason
              : 'This vehicle is not available for the selected dates.';
          setAvailability({
            checking: false,
            ready: false,
            notice: failureMessage,
            noticeTone: 'error',
            quote: null,
          });
        }
      })
      .catch((error) => {
        setAvailability({
          checking: false,
          ready: false,
          notice: error?.message || 'Unable to check availability. Please try again shortly.',
          noticeTone: 'error',
          quote: null,
        });
      });
  };

  const handleBookNow = () => {
    if (!availability.ready || availability.checking) {
      return;
    }
    if (!dateForm.start || !dateForm.end || !vehicleId) {
      return;
    }

    const searchParams = new URLSearchParams({
      start: dateForm.start,
      end: dateForm.end,
    });

    navigate(`/checkout/${vehicleId}?${searchParams.toString()}`, {
      state: {
        quote: availability.quote || null,
        vehicleSummary: vehicle
          ? {
              id: vehicle.id,
              model: vehicle.model,
              pricePerDay: vehicle.pricePerDay,
              driverName: vehicle.driver?.name,
            }
          : null,
      },
    });
  };

  const handleSendMessage = async () => {
    if (!vehicle?.driver?.id) {
      toast.error('Driver information is missing for this vehicle.');
      return;
    }
    if (creatingConversation) {
      return;
    }

    setCreatingConversation(true);
    try {
      const response = await startChatConversation({
        driverId: vehicle.driver.id,
        vehicleId: vehicle.id,
      });

      const conversationId = response?.conversation?.id;
      toast.success('Conversation ready in your inbox.');

      navigate('/dashboard', {
        state: {
          openTab: 'messages',
          conversationId: conversationId || null,
        },
      });
    } catch (error) {
      const message = error?.message || 'Unable to start a conversation right now.';
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
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error) {
    return (
      <section className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">We hit a bump</h1>
        <p className="text-sm text-slate-600">{error}</p>
        <div className="flex justify-center gap-3">
          <Link
            to="/vehicles"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Browse vehicles
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Back home
          </Link>
        </div>
      </section>
    );
  }

  if (!vehicle) {
    return null;
    // The guard above ensures we only get here on unexpected state.
  }

  const priceLabel = formatPrice(vehicle.pricePerDay);
  const driverAddress = vehicle.driver?.address;
  const locationLabel =
    typeof driverAddress === 'string' && driverAddress.trim()
      ? driverAddress.trim()
      : 'Pickup details shared after confirmation.';
  const driverName = vehicle.driver?.name ?? 'Approved driver';
  const driverInitial = driverName?.charAt(0)?.toUpperCase() || 'D';
  const seatText = vehicle.seats ? `${vehicle.seats} seats` : 'Seat count on request';
  const yearLabel = vehicle.year ? `Year ${vehicle.year}` : null;
  const memberSinceLabel = vehicle.driver?.createdAt
    ? `Member since ${formatDate(vehicle.driver.createdAt)}`
    : 'Member since —';
  const firstName = driverName.split(' ')[0] || driverName;

  return (
    <section className="space-y-10 py-6">
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
            <img
              src={galleryImages[0]}
              alt={`${vehicle.model} primary view`}
              className="h-full w-full object-cover transition duration-700 ease-out hover:scale-105"
              loading="lazy"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {galleryImages.slice(1).map((image, index) => (
              <div
                key={`gallery-thumb-${index}`}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
              >
                <img
                  src={image}
                  alt={`${vehicle.model} gallery ${index + 2}`}
                  className="h-28 w-full object-cover transition duration-500 hover:scale-110"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        <aside className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
              <Car className="h-4 w-4 text-slate-500" />
              Verified Vehicle
            </div>
            <div className="space-y-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  {vehicle.model}
                </h1>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <BadgeCheck className="h-4 w-4" />
                  Verified Vehicle
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-400" />
                <span>{seatText}</span>
              </div>
              {yearLabel ? (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{yearLabel}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{locationLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-slate-400" />
                <span>Pay on arrival</span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wide text-slate-500">Price per day</span>
                <div className="mt-1 text-3xl font-semibold text-slate-900">
                  {priceLabel ?? 'Request quote'}
                  {priceLabel ? (
                    <span className="text-base font-medium text-slate-500"> /day</span>
                  ) : null}
                </div>
              </div>
              <CalendarClock className="h-6 w-6 text-slate-400" />
            </div>
            <form className="mt-4 space-y-3" onSubmit={handleDateSubmit}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-slate-600">
                  Start date
                  <input
                    type="date"
                    value={dateForm.start}
                    onChange={(event) => handleDateChange('start', event.target.value)}
                    className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-slate-600">
                  End date
                  <input
                    type="date"
                    value={dateForm.end}
                    onChange={(event) => handleDateChange('end', event.target.value)}
                    className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    required
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={availability.checking}
                className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {availability.checking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  'Check availability'
                )}
              </button>
            </form>
            {availability.notice ? (
              <p
                className={`mt-3 text-xs ${
                  availability.noticeTone === 'error'
                    ? 'text-rose-600'
                    : availability.noticeTone === 'success'
                    ? 'text-emerald-600'
                    : 'text-slate-600'
                }`}
              >
                {availability.notice}
              </p>
            ) : null}
            {availability.ready && availability.quote ? (
              <div className="mt-3 space-y-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-xs text-emerald-700 shadow-sm">
                <p className="font-semibold">
                  {availability.quote.totalDays} day itinerary confirmed
                </p>
                {typeof availability.quote.pricePerDay === 'number' ? (
                  <p>
                    {formatPrice(availability.quote.pricePerDay)} per day, estimated total{' '}
                    <span className="font-semibold">{formatPrice(availability.quote.totalPrice)}</span>
                  </p>
                ) : (
                  <p>Pricing will be confirmed directly with your driver.</p>
                )}
                <p className="text-[11px] text-emerald-600/80">{availability.quote.paymentNote}</p>
              </div>
            ) : null}
            {availability.ready ? (
              <button
                type="button"
                onClick={handleBookNow}
                disabled={availability.checking}
                className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Book now
              </button>
            ) : null}
          </div>
        </aside>
      </div>

      <section className="space-y-6">
        <article className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">About this vehicle</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
              {vehicle.description
                ? vehicle.description
                : 'Share your itinerary and the driver will curate scenic stops, dining suggestions, and memorable experiences tailored to your group.'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Included services</h3>
            {includedServices.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {includedServices.map((label) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                Included services will be confirmed during the booking conversation.
              </p>
            )}
          </div>
        </article>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-semibold text-white">
                {driverInitial}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-base font-semibold text-slate-900">{driverName}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {driverAddress ?? 'Location shared once your trip is confirmed.'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Star className="h-3.5 w-3.5 text-amber-500" fill="currentColor" />
                    4.8 / 5 rating
                  </span>
                </div>
                <p className="text-xs text-slate-400">{memberSinceLabel}</p>
              </div>
            </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={creatingConversation}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-70 sm:flex-1"
            >
              {creatingConversation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  Starting chat...
                </>
              ) : (
                <>
                  <MessageCircle className="h-4 w-4" />
                  Send message
                </>
              )}
            </button>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 sm:flex-1"
            >
              View profile
            </button>
          </div>
        </aside>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Traveller reviews</h2>
            <p className="text-sm text-slate-500">
              {reviewMeta.total > 0
                ? `Based on ${reviewMeta.total} trip${reviewMeta.total === 1 ? '' : 's'} with ${firstName}.`
                : `Be the first to share your journey with ${firstName}.`}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-600">
            <Star className="h-4 w-4" fill="currentColor" />
            {averageRatingLabel}
            <span className="text-xs font-normal text-amber-600/70">
              {reviewMeta.total > 0 ? '/ 5' : 'No ratings yet'}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {ratingOptions.map((option) => {
              const isActive = reviewFilters.rating === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleReviewRatingFilter(option.value)}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`min-w-[2rem] rounded-full px-2 py-0.5 text-xs ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {option.count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="vehicle-review-sort"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Sort by
            </label>
            <select
              id="vehicle-review-sort"
              value={reviewFilters.sort}
              onChange={(event) => handleReviewSortChange(event.target.value)}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="recent">Newest</option>
              <option value="ratingDesc">Highest rated</option>
              <option value="ratingAsc">Lowest rated</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {reviewsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`vehicle-review-skeleton-${index}`}
                  className="animate-pulse space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="h-4 w-1/3 rounded-full bg-slate-200" />
                  <div className="h-5 w-2/3 rounded-full bg-slate-200" />
                  <div className="h-16 rounded-2xl bg-slate-200" />
                </div>
              ))}
            </div>
          ) : reviewsError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              <p>{reviewsError}</p>
              <button
                type="button"
                onClick={handleReviewReload}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
              >
                Try again
              </button>
            </div>
          ) : reviews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              No reviews yet. Be the first to explore Sri Lanka with {firstName} and share your story.
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => {
                const publishedLabel = formatDate(review.publishedAt);
                const travelStart = formatDate(review.visitedStartDate);
                const travelEnd = formatDate(review.visitedEndDate);
                const travelerName = review.travelerName || 'Traveller';
                const travelerInitial = travelerName
                  ? travelerName.charAt(0).toUpperCase()
                  : 'T';
                return (
                  <article
                    key={review.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                          {travelerInitial}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{travelerName}</p>
                          <p className="text-xs text-slate-500">
                            {travelStart && travelEnd
                              ? `Travelled ${travelStart} – ${travelEnd}`
                              : 'Travel dates not shared'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-amber-500">
                        <Star className="h-4 w-4" fill="currentColor" />
                        <span className="text-sm font-semibold">{review.rating}/5</span>
                        {publishedLabel ? (
                          <span className="text-xs text-slate-400">Published {publishedLabel}</span>
                        ) : null}
                      </div>
                    </div>
                    {review.title ? (
                      <h3 className="mt-3 text-base font-semibold text-slate-900">{review.title}</h3>
                    ) : null}
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                      {review.comment}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </section>
  );
};

export default VehicleDetails;

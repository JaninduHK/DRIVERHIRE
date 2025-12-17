import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Car,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchVehicleDetails, checkVehicleAvailability, createVehicleBooking } from '../services/vehicleCatalogApi.js';
import { fetchOffer } from '../services/chatApi.js';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1600&q=80';

const formatPrice = (value) => {
  if (typeof value !== 'number') {
    return null;
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const formatDateLabel = (value) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateRange = (start, end) => {
  const startLabel = formatDateLabel(start);
  const endLabel = formatDateLabel(end);
  if (!startLabel || !endLabel) {
    return '';
  }
  if (startLabel === endLabel) {
    return startLabel;
  }
  return `${startLabel} to ${endLabel}`;
};

const toDateInputValue = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 10);
};

const calculateTripDays = (start, end) => {
  if (!start || !end) {
    return 0;
  }
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0;
  }
  const diff = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  return Math.max(diff + 1, 0);
};

const Checkout = () => {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const routeState = location.state || {};

  const [vehicleState, setVehicleState] = useState({
    vehicle: null,
    loading: true,
    error: '',
  });

  const [availabilityState, setAvailabilityState] = useState({
    loading: false,
    available: false,
    quote: routeState?.quote || null,
    error: '',
  });

  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    flightNumber: '',
    arrivalTime: '',
    departureTime: '',
    startPoint: '',
    endPoint: '',
    specialRequests: '',
  });

  const queryParams = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      start: searchParams.get('start') || '',
      end: searchParams.get('end') || '',
      offerId: searchParams.get('offer') || '',
    };
  }, [location.search]);

  const [offerState, setOfferState] = useState({
    loading: Boolean(queryParams.offerId),
    error: '',
    offer: routeState?.offer || null,
  });

  const [submitting, setSubmitting] = useState(false);
  const [bookingFeedback, setBookingFeedback] = useState({
    success: false,
    message: '',
    error: '',
  });
  const [bookingResult, setBookingResult] = useState(null);

  const bookingDates = useMemo(() => {
    const offerStart = offerState.offer ? toDateInputValue(offerState.offer.startDate) : '';
    const offerEnd = offerState.offer ? toDateInputValue(offerState.offer.endDate) : '';
    return {
      start: offerStart || queryParams.start,
      end: offerEnd || queryParams.end,
    };
  }, [offerState.offer, queryParams.start, queryParams.end]);

  const hasDates = Boolean(bookingDates.start && bookingDates.end);

  useEffect(() => {
    if (!vehicleId) {
      setVehicleState({
        vehicle: null,
        loading: false,
        error: 'Vehicle identifier is missing. Return to the catalog and try again.',
      });
      return;
    }

    let cancelled = false;
    setVehicleState((prev) => ({
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
          setVehicleState({
            vehicle: null,
            loading: false,
            error: 'Vehicle not found.',
          });
          return;
        }
        setVehicleState({
          vehicle,
          loading: false,
          error: '',
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setVehicleState({
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
    if (!queryParams.offerId) {
      setOfferState((prev) => ({
        loading: false,
        error: '',
        offer: prev.offer && !prev.offer?.id ? null : prev.offer,
      }));
      return;
    }

    let cancelled = false;
    setOfferState({
      loading: true,
      error: '',
      offer: null,
    });

    fetchOffer(queryParams.offerId)
      .then(({ offer }) => {
        if (cancelled) {
          return;
        }
        if (!offer) {
          setOfferState({
            loading: false,
            error: 'Offer details were not found. Please request a new offer from your driver.',
            offer: null,
          });
          return;
        }
        const offerVehicleId =
          offer.vehicle?.id || (typeof offer.vehicle === 'string' ? offer.vehicle : null);
        if (vehicleId && offerVehicleId && offerVehicleId !== vehicleId) {
          setOfferState({
            loading: false,
            error:
              'This offer belongs to a different vehicle. Open checkout from the original conversation to continue.',
            offer: null,
          });
          return;
        }
        setOfferState({
          loading: false,
          error: '',
          offer,
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setOfferState({
          loading: false,
          error: error?.message || 'Unable to load offer details.',
          offer: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [queryParams.offerId, vehicleId]);

  useEffect(() => {
    if (!vehicleId) {
      return;
    }

    if (!hasDates) {
      if (queryParams.offerId) {
        if (offerState.loading) {
          return;
        }
        setAvailabilityState({
          loading: false,
          available: false,
          quote: null,
          error:
            offerState.error ||
            'This offer does not include valid travel dates. Request a fresh offer from your driver.',
        });
      } else {
        setAvailabilityState({
          loading: false,
          available: false,
          quote: null,
          error: 'Select your travel dates from the vehicle page to continue.',
        });
      }
      return;
    }

    let cancelled = false;
    setAvailabilityState((prev) => ({
      ...prev,
      loading: true,
      error: '',
    }));

    checkVehicleAvailability(vehicleId, {
      startDate: bookingDates.start,
      endDate: bookingDates.end,
    })
      .then((response) => {
        if (cancelled) {
          return;
        }
        if (response?.available) {
          setAvailabilityState({
            loading: false,
            available: true,
            quote: response.quote || null,
            error: '',
          });
        } else {
          setAvailabilityState({
            loading: false,
            available: false,
            quote: null,
            error:
              typeof response?.reason === 'string' && response.reason.trim()
                ? response.reason
                : 'This vehicle is not available for the selected dates.',
          });
        }
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setAvailabilityState({
          loading: false,
          available: false,
          quote: null,
          error: error?.message || 'Unable to verify availability right now.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleId, bookingDates.start, bookingDates.end, hasDates, queryParams.offerId, offerState.loading, offerState.error]);

  const handleInputChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (bookingFeedback.error || bookingFeedback.message) {
      setBookingFeedback({
        success: false,
        message: '',
        error: '',
      });
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!hasDates) {
      setBookingFeedback({
        success: false,
        message: '',
        error: 'Select your travel dates before confirming the booking.',
      });
      return;
    }

    const trimmedName = formState.fullName.trim();
    const trimmedEmail = formState.email.trim();
    const trimmedPhone = formState.phoneNumber.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      setBookingFeedback({
        success: false,
        message: '',
        error: 'Full name, email, and phone number are required.',
      });
      return;
    }

    if (!availabilityState.available) {
      setBookingFeedback({
        success: false,
        message: '',
        error: 'These dates are no longer available. Please pick a different range.',
      });
      return;
    }

    const payload = {
      startDate: bookingDates.start,
      endDate: bookingDates.end,
      fullName: trimmedName,
      email: trimmedEmail,
      phoneNumber: trimmedPhone,
      flightNumber: formState.flightNumber.trim() || undefined,
      arrivalTime: formState.arrivalTime.trim() || undefined,
      departureTime: formState.departureTime.trim() || undefined,
      startPoint: formState.startPoint.trim() || undefined,
      endPoint: formState.endPoint.trim() || undefined,
      specialRequests: formState.specialRequests.trim() || undefined,
    };

    if (queryParams.offerId) {
      payload.offerId = queryParams.offerId;
    }

    setSubmitting(true);
    setBookingFeedback({
      success: false,
      message: '',
      error: '',
    });

    createVehicleBooking(vehicleId, payload)
      .then((data) => {
        setBookingResult(data.booking || null);
        const successMessage =
          typeof data?.message === 'string' && data.message.trim()
            ? data.message
            : 'Your booking has been confirmed.';
        setBookingFeedback({
          success: true,
          message: successMessage,
          error: '',
        });
        toast.success(successMessage);
      })
      .catch((error) => {
        const message = error?.message || 'Unable to confirm booking right now.';
        setBookingFeedback({
          success: false,
          message: '',
          error: message,
        });
        toast.error(message);
      })
      .finally(() => {
        setSubmitting(false);
      });
  };

  const { vehicle, loading: vehicleLoading, error: vehicleError } = vehicleState;
  const { quote, loading: availabilityLoading, error: availabilityError, available } =
    availabilityState;

  const coverImage = vehicle?.images?.[0] || FALLBACK_IMAGE;
  const vehicleModel = vehicle?.model || 'Selected vehicle';
  const driverName = vehicle?.driver?.name || 'Assigned driver';

  const effectiveStartDate = offerState.offer?.startDate || bookingDates.start;
  const effectiveEndDate = offerState.offer?.endDate || bookingDates.end;

  const pricePerDay = offerState.offer
    ? null
    : formatPrice(
        quote?.discount?.discountedPricePerDay ??
          quote?.pricePerDay ??
          vehicle?.activeDiscount?.discountedPricePerDay ??
          vehicle?.pricePerDay
      );
  const totalPriceValue = offerState.offer
    ? offerState.offer.totalPrice
    : quote?.totalPrice ?? bookingResult?.totalPrice ?? null;
  const discountSource = quote?.discount || vehicle?.activeDiscount || null;
  const discountPercent =
    discountSource?.discountPercent ??
    (typeof discountSource?.discountRate === 'number'
      ? Math.round(discountSource.discountRate * 100 * 100) / 100
      : null);
  const discountAmountValue =
    quote?.discount?.amount ??
    bookingResult?.discountAmount ??
    (typeof totalPriceValue === 'number' && typeof discountPercent === 'number'
      ? Math.round(totalPriceValue * (discountPercent / 100) * 100) / 100
      : null);
  const payableTotalValue =
    quote?.discount?.payableTotal ??
    bookingResult?.payableTotal ??
    (typeof totalPriceValue === 'number' && typeof discountAmountValue === 'number'
      ? Math.max(totalPriceValue - discountAmountValue, 0)
      : totalPriceValue);
  const totalPrice = formatPrice(totalPriceValue);
  const discountAmount =
    typeof discountAmountValue === 'number' && discountAmountValue > 0
      ? formatPrice(discountAmountValue)
      : null;
  const payableTotal = formatPrice(payableTotalValue);

  const tripDateRange = useMemo(
    () => formatDateRange(effectiveStartDate, effectiveEndDate),
    [effectiveStartDate, effectiveEndDate]
  );

  const totalDaysLabel = useMemo(() => {
    const days = calculateTripDays(effectiveStartDate, effectiveEndDate);
    return days > 0 ? `${days} day${days > 1 ? 's' : ''}` : '';
  }, [effectiveStartDate, effectiveEndDate]);

  const paymentNote = offerState.offer
    ? 'This booking reflects the offer agreed with your driver. Pay the driver directly on day one.'
    : quote?.paymentNote ||
      'Payment will be made directly to your driver on the first day of the trip.';

  const offerExtras = offerState.offer
    ? {
        totalKms: offerState.offer.totalKms,
        pricePerExtraKm: offerState.offer.pricePerExtraKm,
        currency: offerState.offer.currency,
      }
    : null;

  const offerReference = queryParams.offerId ? queryParams.offerId.slice(-6).toUpperCase() : '';

  const formDisabled =
    submitting || availabilityLoading || offerState.loading || !available || Boolean(bookingResult) || Boolean(offerState.error);

  if (vehicleLoading || offerState.loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
      </div>
    );
  }

  if (vehicleError || !vehicle) {
    return (
      <section className="space-y-4 py-12 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">We hit a bump</h1>
        <p className="text-sm text-slate-600">
          {vehicleError || 'We could not load this vehicle. Please start over from the catalog.'}
        </p>
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

  if (queryParams.offerId && offerState.error) {
    return (
      <section className="space-y-6 py-6">
        <div className="space-y-3 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          <h1 className="text-lg font-semibold text-rose-800">We couldn&apos;t load this offer</h1>
          <p>{offerState.error}</p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300"
            >
              Return to messages
            </Link>
            <Link
              to={vehicleId ? `/vehicles/${vehicleId}` : '/vehicles'}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Browse vehicles
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!hasDates) {
    return (
      <section className="space-y-6 py-6">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <ArrowLeft className="h-4 w-4 text-slate-400" />
          <span>Please return to the vehicle page and select your travel dates.</span>
        </div>
        <div>
          <Link
            to={vehicleId ? `/vehicles/${vehicleId}` : '/vehicles'}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Choose dates
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-8 py-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Secure checkout
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Confirm your booking</h1>
            <p className="mt-2 text-sm text-slate-600">
              Share your travel details and we will connect you with {driverName}. Payment is due to
              the driver when you meet on day one.
            </p>
          </div>

          {bookingResult ? (
            <div className="space-y-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-700">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-1 h-5 w-5" />
                <div className="space-y-1">
                  <p className="text-base font-semibold text-emerald-800">
                    Booking confirmed for {vehicleModel}
                  </p>
                  <p>{bookingFeedback.message || 'Your driver will reach out shortly.'}</p>
                </div>
              </div>
              <ul className="space-y-1 text-emerald-700">
                {tripDateRange ? <li>Trip dates: {tripDateRange}</li> : null}
                {totalDaysLabel ? <li>Trip length: {totalDaysLabel}</li> : null}
                {totalPrice ? <li>Base total: {totalPrice}</li> : null}
                {discountAmount ? <li>Discount: -{discountAmount}</li> : null}
                {payableTotal ? <li>Total due to driver: {payableTotal}</li> : null}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  to="/vehicles"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  Explore more vehicles
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                >
                  View my trips
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <fieldset className="space-y-4" disabled={formDisabled}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Full name
                    <input
                      type="text"
                      value={formState.fullName}
                      onChange={handleInputChange('fullName')}
                      className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="Alex Traveler"
                      required
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Email
                    <input
                      type="email"
                      value={formState.email}
                      onChange={handleInputChange('email')}
                      className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="alex@example.com"
                      required
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Phone number
                    <input
                      type="tel"
                      value={formState.phoneNumber}
                      onChange={handleInputChange('phoneNumber')}
                      className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="+94 70 000 0000"
                      required
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Flight number <span className="font-normal text-slate-400">(optional)</span>
                    <input
                      type="text"
                      value={formState.flightNumber}
                      onChange={handleInputChange('flightNumber')}
                      className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="UL 504"
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Arrival time <span className="font-normal text-slate-400">(optional)</span>
                    <input
                      type="text"
                      value={formState.arrivalTime}
                      onChange={handleInputChange('arrivalTime')}
                      className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="eg: 09:30 AM"
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Departure time <span className="font-normal text-slate-400">(optional)</span>
                    <input
                      type="text"
                      value={formState.departureTime}
                      onChange={handleInputChange('departureTime')}
                      className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="eg: 08:00 PM"
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    Start point
                    <input
                      type="text"
                      value={formState.startPoint}
                      onChange={handleInputChange('startPoint')}
                      className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="Colombo Airport"
                      required
                    />
                  </label>
                  <label className="space-y-1 text-sm font-medium text-slate-700">
                    End point
                    <input
                      type="text"
                      value={formState.endPoint}
                      onChange={handleInputChange('endPoint')}
                      className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                      placeholder="Galle Fort"
                      required
                    />
                  </label>
                </div>
                <label className="space-y-1 text-sm font-medium text-slate-700">
                  Special requests <span className="font-normal text-slate-400">(optional)</span>
                  <textarea
                    value={formState.specialRequests}
                    onChange={handleInputChange('specialRequests')}
                    rows="4"
                    className="block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                    placeholder="Let us know about child seats, extra stops, or anything else we should prepare."
                  />
                </label>
              </fieldset>

              {bookingFeedback.error ? (
                <p className="text-sm text-rose-600">{bookingFeedback.error}</p>
              ) : null}
              {bookingFeedback.success && bookingFeedback.message ? (
                <p className="text-sm text-emerald-600">{bookingFeedback.message}</p>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={formDisabled}
                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Confirming...
                    </>
                  ) : (
                    'Confirm booking'
                  )}
                </button>
                <p className="text-xs text-slate-500">No online payment required. Pay your driver in person.</p>
              </div>
            </form>
          )}
        </article>

        <aside className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <img
              src={coverImage}
              alt={`${vehicleModel} cover`}
              className="h-44 w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">Trip summary</h2>
            <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-slate-400" />
                <span>{vehicleModel}</span>
              </div>
              {tripDateRange ? (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span>{tripDateRange}</span>
                </div>
              ) : null}
              {totalDaysLabel ? <div className="pl-6 text-xs text-slate-500">{totalDaysLabel}</div> : null}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>
                  <strong className="text-slate-700">Driver:</strong> {driverName}
                </span>
              </div>
              {pricePerDay ? (
                <div className="pl-6 text-xs text-slate-500">Rate: {pricePerDay} per day</div>
              ) : (
                <div className="pl-6 text-xs text-slate-500">Rates will be confirmed by the driver.</div>
              )}
              {totalPrice ? (
                <div className="pl-6 text-xs font-semibold text-slate-600">
                  Estimated total: {totalPrice}
                  {discountAmount ? (
                    <div className="text-xs font-medium text-emerald-700">
                      Discount: -{discountAmount}
                    </div>
                  ) : null}
                  {payableTotal ? (
                    <div className="text-sm font-semibold text-emerald-700">
                      You pay driver: {payableTotal}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {offerExtras ? (
                <>
                  <div className="pl-6 text-xs text-slate-500">
                    Included distance: {typeof offerExtras.totalKms === 'number' ? offerExtras.totalKms : '—'} km
                  </div>
                  <div className="pl-6 text-xs text-slate-500">
                    Extra km:{' '}
                    {typeof offerExtras.pricePerExtraKm === 'number'
                      ? `${formatPrice(offerExtras.pricePerExtraKm)} per km`
                      : '—'}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
            <h3 className="font-semibold text-emerald-800">Payment on arrival</h3>
            <p>{paymentNote}</p>
          </div>

          {offerExtras ? (
            <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              <h3 className="font-semibold text-emerald-800">Offer terms</h3>
              <p>This itinerary was confirmed by your driver. Booking locks in their quoted total price.</p>
              {offerReference ? (
                <p>
                  Offer reference:{' '}
                  <span className="font-semibold">{offerReference}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            <p className="inline-flex items-center gap-2 text-sm text-slate-600">
              <Mail className="h-4 w-4 text-slate-400" />
              {formState.email || 'We will confirm via email once submitted'}
            </p>
            <p className="inline-flex items-center gap-2 text-sm text-slate-600">
              <Phone className="h-4 w-4 text-slate-400" />
              {formState.phoneNumber || 'Add your phone number so the driver can reach you'}
            </p>
            {availabilityLoading ? (
              <div className="inline-flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                Checking availability...
              </div>
            ) : availabilityError ? (
              <p className="text-sm text-rose-600">{availabilityError}</p>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
};

export default Checkout;

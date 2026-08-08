import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Car,
  Check,
  ChevronDown,
  Loader2,
  Mail,
  MessageSquare,
  ShieldCheck,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchVehicleDetails, checkVehicleAvailability, createVehicleBooking } from '../services/vehicleCatalogApi.js';
import { fetchOffer } from '../services/chatApi.js';

const EXTRAS = [
  'Child seat',
  'Extra luggage space',
  'English-speaking guide',
  'Wheelchair access',
  'Airport meet & greet',
];

const fieldCls =
  'w-full min-h-[50px] rounded-[13px] border-[1.5px] border-[#e5ebe8] bg-[#fbfcfc] px-[15px] py-[13px] text-[15px] font-semibold text-ink outline-none transition placeholder:text-[#a3b0bb] focus:border-brand focus:bg-white focus:shadow-[0_0_0_3px_rgba(16,163,90,0.14)]';
const fieldLabelCls = 'mb-[7px] block text-[12.5px] font-bold text-ink-soft';
const cardCls =
  'rounded-[clamp(16px,2vw,22px)] border border-[#e5ebe8] bg-white p-[clamp(18px,2.4vw,28px)]';

const formatPrice = (value) => {
  if (typeof value !== 'number') {
    return null;
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

// Per-km rates are small decimals (e.g. $0.30), so keep the fractional part.
const formatRate = (value) =>
  typeof value === 'number'
    ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`
    : null;

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
  const [selectedExtras, setSelectedExtras] = useState({});
  const toggleExtra = (label) =>
    setSelectedExtras((prev) => ({ ...prev, [label]: !prev[label] }));

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

    const chosenExtras = EXTRAS.filter((label) => selectedExtras[label]);
    const combinedNotes = [
      chosenExtras.length ? `Requested extras: ${chosenExtras.join(', ')}` : '',
      formState.specialRequests.trim(),
    ]
      .filter(Boolean)
      .join('\n');

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
      specialRequests: combinedNotes || undefined,
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

  const coverImage = Array.isArray(vehicle?.images) ? vehicle.images[0] : null;
  const vehicleModel = vehicle?.model || 'Selected vehicle';
  const driverName = vehicle?.driver?.name || 'Your driver';

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
  const payLabel = payableTotal || totalPrice || '—';

  const tripDateRange = useMemo(
    () => formatDateRange(effectiveStartDate, effectiveEndDate),
    [effectiveStartDate, effectiveEndDate]
  );

  const totalDaysLabel = useMemo(() => {
    const days = calculateTripDays(effectiveStartDate, effectiveEndDate);
    return days > 0 ? `${days} day${days > 1 ? 's' : ''}` : '';
  }, [effectiveStartDate, effectiveEndDate]);

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

  // ---- Guard states ----
  if (vehicleLoading || offerState.loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#f7faf8] font-sans">
        <Loader2 className="h-7 w-7 animate-spin text-brand" />
      </div>
    );
  }

  if (vehicleError || !vehicle) {
    return (
      <GuardShell
        title="We hit a bump"
        message={vehicleError || 'We could not load this vehicle. Please start over from the catalog.'}
        primary={{ to: '/vehicles', label: 'Browse vehicles' }}
        secondary={{ to: '/', label: 'Back home' }}
      />
    );
  }

  if (queryParams.offerId && offerState.error) {
    return (
      <GuardShell
        title="We couldn't load this offer"
        message={offerState.error}
        primary={{ to: vehicleId ? `/vehicles/${vehicleId}` : '/vehicles', label: 'Browse vehicles' }}
        secondary={{ to: '/dashboard', label: 'Return to messages' }}
      />
    );
  }

  if (!hasDates) {
    return (
      <GuardShell
        title="Choose your travel dates"
        message="Please return to the vehicle page and select your travel dates to continue to checkout."
        primary={{ to: vehicleId ? `/vehicles/${vehicleId}` : '/vehicles', label: 'Choose dates' }}
      />
    );
  }

  // ---- Trip summary breakdown (shared by mobile drawer + desktop aside) ----
  const summaryRows = (
    <dl className="m-0 grid gap-[9px] text-[13.5px]">
      {totalPrice ? <SummaryRow label="Estimated total" value={totalPrice} /> : null}
      {discountAmount ? <SummaryRow label="Discount" value={`-${discountAmount}`} green /> : null}
      {pricePerDay ? <SummaryRow label="Rate per day" value={pricePerDay} /> : null}
      {offerExtras && typeof offerExtras.totalKms === 'number' ? (
        <SummaryRow label="Included distance" value={`${offerExtras.totalKms} km`} />
      ) : null}
      {offerExtras && typeof offerExtras.pricePerExtraKm === 'number' ? (
        <SummaryRow label="Extra kilometres" value={`${formatRate(offerExtras.pricePerExtraKm)} per km`} />
      ) : null}
    </dl>
  );

  return (
    <div className="min-h-screen bg-[#f7faf8] font-sans text-ink">
      <main className="mx-auto w-full max-w-[1160px] px-[clamp(14px,4vw,40px)] pb-[clamp(28px,4vw,56px)] pt-[clamp(14px,2.6vw,30px)]">
        {/* Stepper — desktop */}
        <div className="hidden flex-wrap items-center gap-3 lg:flex">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-[11px] border border-[#e5ebe8] bg-white px-3.5 text-sm font-bold text-ink transition hover:border-muted-soft"
          >
            <ArrowLeft className="h-4 w-4" /> Back to offer
          </button>
          <ol className="m-0 flex items-center gap-2 overflow-x-auto p-0 text-[12.5px] font-bold text-muted-soft">
            <li className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-brand text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
              Quote agreed
            </li>
            <span className="text-[#cfd8dd]">›</span>
            <li className="flex items-center gap-1.5 whitespace-nowrap text-ink">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[11px] font-extrabold text-[#7fd9a8]">2</span>
              Your details
            </li>
            <span className="text-[#cfd8dd]">›</span>
            <li className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#e9efec] text-[11px] font-extrabold text-muted-soft">3</span>
              Driver confirms
            </li>
          </ol>
        </div>

        <h1 className="mt-[clamp(16px,2.4vw,26px)] max-w-[16ch] text-[clamp(26px,3.4vw,38px)] font-extrabold leading-[1.1] tracking-[-.028em]">
          Confirm your booking
        </h1>
        <p className="mt-2.5 max-w-[60ch] text-[clamp(14.5px,1.3vw,16px)] leading-[1.6] text-muted">
          {driverName} has locked in your price. Share a few travel details and they will confirm by email within the
          hour. Nothing is charged today.
        </p>

        <div className="mt-[clamp(18px,2.4vw,28px)] grid items-start gap-[clamp(14px,2.2vw,26px)] lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
          {/* Mobile collapsible summary */}
          <details className="group overflow-hidden rounded-[18px] border border-[#e5ebe8] bg-white lg:hidden">
            <summary className="flex min-h-[44px] list-none items-center gap-3 p-3.5 [&::-webkit-details-marker]:hidden">
              <span className="h-[46px] w-[46px] flex-shrink-0 overflow-hidden rounded-xl bg-[#eef2f0]">
                {coverImage ? (
                  <img src={coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center text-muted-soft"><Car className="h-5 w-5" /></span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold tracking-[-.01em]">
                  {vehicleModel}{totalDaysLabel ? `, ${totalDaysLabel}` : ''}
                </span>
                <span className="block text-[12.5px] font-semibold text-muted">{tripDateRange || 'Trip dates'}</span>
              </span>
              <span className="flex flex-shrink-0 items-center gap-2">
                <span className="text-[15.5px] font-extrabold text-brand-dark">{payLabel}</span>
                <ChevronDown className="h-[15px] w-[15px] text-muted transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="px-4 pb-4">
              <div className="border-t border-[#eef2f0] pt-3.5">{summaryRows}</div>
              <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-dashed border-[#dfe7e3] pt-2.5 text-[14px] font-extrabold">
                <span>You pay the driver</span>
                <span className="text-brand-dark">{payLabel}</span>
              </div>
              {offerReference ? (
                <p className="mt-3 text-[12.5px] leading-[1.55] text-muted">Offer reference {offerReference}, price fixed by your driver.</p>
              ) : null}
            </div>
          </details>

          {/* Left column: success state or form */}
          {bookingResult ? (
            <div className="min-w-0">
              <div className="rounded-[clamp(16px,2vw,22px)] border border-brand/30 bg-brand-tint p-[clamp(18px,2.4vw,28px)]">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-6 w-6 flex-shrink-0 text-brand-dark" />
                  <div>
                    <h2 className="text-[18px] font-extrabold text-ink">
                      {bookingResult.status === 'confirmed'
                        ? `Booking confirmed for ${vehicleModel}`
                        : `Booking request sent for ${vehicleModel}`}
                    </h2>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
                      {bookingResult.status === 'confirmed'
                        ? `Your booking is confirmed — ${driverName} has agreed to your trip and will meet you as arranged. No further confirmation needed.`
                        : `${driverName} will review your request and confirm by email shortly.`}
                    </p>
                  </div>
                </div>
                <ul className="mt-4 grid gap-1.5 border-t border-brand/20 pt-4 text-[13.5px] font-semibold text-ink-soft">
                  {tripDateRange ? <li>Trip dates: {tripDateRange}</li> : null}
                  {totalDaysLabel ? <li>Trip length: {totalDaysLabel}</li> : null}
                  {totalPrice ? <li>Estimated total: {totalPrice}</li> : null}
                  {discountAmount ? <li>Discount: -{discountAmount}</li> : null}
                  {payableTotal ? <li className="font-extrabold text-brand-dark">You pay the driver: {payableTotal}</li> : null}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Link to="/dashboard" className="rounded-[13px] bg-brand px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark">
                    View my trips
                  </Link>
                  <Link to="/vehicles" className="rounded-[13px] border border-[#e5ebe8] bg-white px-5 py-3 text-[14px] font-bold text-ink transition hover:border-muted-soft">
                    Explore more vehicles
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid min-w-0 gap-[clamp(12px,1.6vw,16px)]">
              <fieldset disabled={formDisabled} className="grid gap-[clamp(12px,1.6vw,16px)] border-0 p-0">
                {/* Section 1 */}
                <section className={cardCls}>
                  <SectionHead title="Who is travelling" step="Step 1 of 3" />
                  <div className="mt-4 grid gap-3.5">
                    <label className="block">
                      <span className={fieldLabelCls}>Full name</span>
                      <input type="text" autoComplete="name" value={formState.fullName} onChange={handleInputChange('fullName')} placeholder="Alex Traveler" className={fieldCls} required />
                    </label>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      <label className="block">
                        <span className={fieldLabelCls}>Email address</span>
                        <input type="email" autoComplete="email" value={formState.email} onChange={handleInputChange('email')} placeholder="alex@example.com" className={fieldCls} required />
                        <span className="mt-[7px] block text-[12.5px] text-muted-soft">Your confirmation and driver contact go here.</span>
                      </label>
                      <label className="block">
                        <span className={fieldLabelCls}>Phone / WhatsApp</span>
                        <input type="tel" autoComplete="tel" value={formState.phoneNumber} onChange={handleInputChange('phoneNumber')} placeholder="+94 70 000 0000" className={fieldCls} required />
                        <span className="mt-[7px] block text-[12.5px] text-muted-soft">So your driver can reach you on arrival day.</span>
                      </label>
                    </div>
                  </div>
                </section>

                {/* Section 2 */}
                <section className={cardCls}>
                  <SectionHead title="Pick-up & drop-off" step="Step 2 of 3" />
                  <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
                    <label className="block">
                      <span className={fieldLabelCls}>Start point</span>
                      <input type="text" value={formState.startPoint} onChange={handleInputChange('startPoint')} placeholder="Colombo Airport" className={fieldCls} required />
                    </label>
                    <label className="block">
                      <span className={fieldLabelCls}>End point</span>
                      <input type="text" value={formState.endPoint} onChange={handleInputChange('endPoint')} placeholder="Galle Fort" className={fieldCls} required />
                    </label>
                  </div>
                  <div className="mt-4 border-t border-[#eef2f0] pt-4">
                    <p className="mb-3 text-[12.5px] font-bold text-muted">
                      Flying in? Add flight details so your driver waits at the right time <span className="font-semibold text-[#a3b0bb]">(optional)</span>
                    </p>
                    <div className="grid gap-3.5 sm:grid-cols-3">
                      <label className="block">
                        <span className={fieldLabelCls}>Flight number</span>
                        <input type="text" value={formState.flightNumber} onChange={handleInputChange('flightNumber')} placeholder="UL 504" className={fieldCls} />
                      </label>
                      <label className="block">
                        <span className={fieldLabelCls}>Arrival time</span>
                        <input type="text" value={formState.arrivalTime} onChange={handleInputChange('arrivalTime')} placeholder="09:30 AM" className={fieldCls} />
                      </label>
                      <label className="block">
                        <span className={fieldLabelCls}>Departure time</span>
                        <input type="text" value={formState.departureTime} onChange={handleInputChange('departureTime')} placeholder="08:00 PM" className={fieldCls} />
                      </label>
                    </div>
                  </div>
                </section>

                {/* Section 3 */}
                <section className={cardCls}>
                  <SectionHead title="Anything to prepare?" step="Step 3 of 3" />
                  <div className="mt-4 flex flex-wrap gap-2">
                    {EXTRAS.map((label) => {
                      const active = Boolean(selectedExtras[label]);
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => toggleExtra(label)}
                          className={`min-h-[44px] rounded-full border-[1.5px] px-4 text-[13.5px] font-bold transition ${
                            active ? 'border-brand bg-[#eef7f2] text-brand-dark' : 'border-[#e5ebe8] bg-white text-ink-soft hover:border-muted-soft'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <label className="mt-4 block">
                    <span className="mb-[7px] flex items-center justify-between gap-2 text-[12.5px] font-bold text-ink-soft">
                      Notes for your driver <span className="font-semibold text-[#a3b0bb]">Optional</span>
                    </span>
                    <textarea
                      rows="3"
                      value={formState.specialRequests}
                      onChange={handleInputChange('specialRequests')}
                      placeholder="Extra stops, dietary needs, hotel names you already booked, anything that helps your driver plan."
                      className={`${fieldCls} min-h-[auto] resize-y leading-[1.55]`}
                    />
                  </label>
                </section>
              </fieldset>

              {/* Availability warning */}
              {!available && !availabilityLoading && availabilityError ? (
                <div className="flex items-start gap-2.5 rounded-2xl border border-[#f4e2c2] bg-[#fff8ec] p-3.5">
                  <AlertTriangle className="mt-0.5 h-[18px] w-[18px] flex-shrink-0 text-[#b8801f]" />
                  <p className="text-[13.5px] font-semibold leading-[1.55] text-[#7a5a15]">
                    {availabilityError}{' '}
                    <Link to={vehicleId ? `/vehicles/${vehicleId}` : '/vehicles'} className="text-brand-dark underline">
                      change your dates
                    </Link>{' '}
                    first.
                  </p>
                </div>
              ) : null}
              {availabilityLoading ? (
                <p className="flex items-center gap-2 text-[13px] font-semibold text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" /> Checking availability…
                </p>
              ) : null}
              {bookingFeedback.error ? (
                <p className="rounded-2xl bg-[#fff5f6] px-4 py-3 text-[13.5px] font-semibold text-[#b23050]">{bookingFeedback.error}</p>
              ) : null}

              {/* Inline CTA — desktop */}
              <div className="hidden flex-wrap items-center gap-3.5 rounded-[clamp(16px,2vw,22px)] border border-[#e5ebe8] bg-white p-[clamp(16px,2vw,22px)] lg:flex">
                <button
                  type="submit"
                  disabled={formDisabled}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[13px] bg-brand px-[30px] text-[15.5px] font-bold text-white shadow-[0_12px_26px_-14px_rgba(16,163,90,.75)] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send booking request'}
                </button>
                <p className="max-w-[34ch] text-[13px] leading-[1.5] text-muted">
                  No card needed now. You pay <strong className="text-ink">{payLabel}</strong> to your driver when you meet on day one.
                </p>
              </div>
            </form>
          )}

          {/* Aside — desktop */}
          <aside className="sticky top-[86px] hidden gap-3.5 lg:grid">
            <section className="overflow-hidden rounded-[22px] border border-[#e5ebe8] bg-white">
              <div className="h-[168px] bg-[#eef2f0]">
                {coverImage ? (
                  <img src={coverImage} alt={vehicleModel} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-soft"><Car className="h-8 w-8" /></div>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-[18px] font-extrabold tracking-[-.015em]">Trip summary</h2>
                <div className="mt-3.5 grid gap-[11px] text-[14px]">
                  <div className="flex items-start gap-2.5"><Car className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-brand" /><span className="font-bold">{vehicleModel}</span></div>
                  {tripDateRange ? (
                    <div className="flex items-start gap-2.5">
                      <Calendar className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-brand" />
                      <span><span className="block font-bold">{tripDateRange}</span>{totalDaysLabel ? <span className="block text-[13px] font-semibold text-muted">{totalDaysLabel}</span> : null}</span>
                    </div>
                  ) : null}
                  <div className="flex items-start gap-2.5"><User className="mt-0.5 h-[17px] w-[17px] flex-shrink-0 text-brand" /><span className="font-bold">{driverName}</span></div>
                </div>
                <div className="mt-4 border-t border-[#eef2f0] pt-3.5">{summaryRows}</div>
                <div className="mt-3.5 flex items-baseline justify-between gap-3 rounded-[14px] bg-[#eef7f2] px-4 py-3.5">
                  <span className="text-[13.5px] font-extrabold">You pay the driver</span>
                  <span className="text-[21px] font-extrabold tracking-[-.02em] text-brand-dark">{payLabel}</span>
                </div>
              </div>
            </section>

            <section className="rounded-[20px] border border-[#e5ebe8] bg-white px-5 py-[18px]">
              <h3 className="text-[14.5px] font-extrabold">What happens next</h3>
              <ul className="mt-3 grid list-none gap-[11px] p-0">
                <NextItem icon={Mail}>Email confirmation lands right away.</NextItem>
                <NextItem icon={MessageSquare}>Your driver replies in chat within an hour.</NextItem>
                <NextItem icon={ShieldCheck}>Price stays fixed{offerReference ? `, offer ref ${offerReference}` : ''}.</NextItem>
              </ul>
              <p className="mt-3.5 border-t border-[#eef2f0] pt-3 text-[12.5px] leading-[1.55] text-muted">
                Free cancellation until 2 days before your trip starts.
              </p>
            </section>
          </aside>
        </div>
      </main>

      {/* Mobile sticky action bar */}
      {!bookingResult ? (
        <div className="sticky bottom-0 z-20 flex items-center gap-3 border-t border-[#e5ebe8] bg-white/95 px-3.5 py-2.5 pb-[calc(11px+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <span className="flex-shrink-0 leading-[1.25]">
            <span className="block text-[11px] font-bold uppercase tracking-[.04em] text-muted-soft">Pay driver</span>
            <span className="block text-[18px] font-extrabold text-brand-dark">{payLabel}</span>
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={formDisabled}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-[13px] bg-brand text-[15.5px] font-bold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : 'Send booking request'}
          </button>
        </div>
      ) : null}
    </div>
  );
};

const SectionHead = ({ title, step }) => (
  <div className="flex items-baseline gap-2.5">
    <h2 className="text-[clamp(17px,1.8vw,20px)] font-extrabold tracking-[-.015em]">{title}</h2>
    <span className="ml-auto text-[12px] font-bold text-muted-soft">{step}</span>
  </div>
);

const SummaryRow = ({ label, value, green = false }) => (
  <div className="flex justify-between gap-3">
    <dt className="font-semibold text-muted">{label}</dt>
    <dd className={`m-0 font-bold ${green ? 'text-brand-dark' : 'text-ink'}`}>{value}</dd>
  </div>
);

const NextItem = ({ icon, children }) => {
  const Icon = icon;
  return (
    <li className="flex gap-2.5 text-[13.5px] font-semibold leading-[1.5] text-ink-soft">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand" strokeWidth={1.9} />
      {children}
    </li>
  );
};

const GuardShell = ({ title, message, primary, secondary }) => (
  <div className="flex min-h-[70vh] items-center justify-center bg-[#f7faf8] px-5 py-12 font-sans text-ink">
    <div className="w-full max-w-[460px] rounded-[22px] border border-[#e5ebe8] bg-white p-8 text-center shadow-[0_30px_70px_-40px_rgba(15,31,45,.35)]">
      <h1 className="text-[20px] font-extrabold">{title}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{message}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2.5">
        {primary ? (
          <Link to={primary.to} className="rounded-[13px] bg-brand px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-dark">
            {primary.label}
          </Link>
        ) : null}
        {secondary ? (
          <Link to={secondary.to} className="rounded-[13px] border border-[#e5ebe8] bg-white px-5 py-3 text-[14px] font-bold text-ink transition hover:border-muted-soft">
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </div>
  </div>
);

export default Checkout;

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Link2, Loader2, Star, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchDriverProfile } from '../services/driverDirectoryApi.js';
import { useAggregatedDriverReviews } from '../hooks/useAggregatedDriverReviews.js';
import { Avatar } from './dashboard/primitives.jsx';
import { LicenseIconBadge, LicenseTypeChip } from './LicenseBadge.jsx';

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatCurrency = (value) => (Number.isFinite(value) ? `$${value.toLocaleString('en-US')}` : null);

const STAR_ORDER = [5, 4, 3, 2, 1];

/**
 * Driver-details sheet opened from the chat header. Shows only real data from
 * /drivers/:id + aggregated reviews — no invented stats.
 */
const DriverProfileSheet = ({ driverId, activeVehicleId, hasBooking, onClose, onViewTripDetails }) => {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!driverId) {
      setState({ loading: false, error: 'Driver information is missing.', data: null });
      return undefined;
    }
    let active = true;
    setState({ loading: true, error: '', data: null });
    fetchDriverProfile(driverId)
      .then((response) => { if (active) setState({ loading: false, error: '', data: response }); })
      .catch((error) => { if (active) setState({ loading: false, error: error?.message || 'Unable to load driver profile.', data: null }); });
    return () => { active = false; };
  }, [driverId]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const driver = state.data?.driver;
  const vehicles = useMemo(() => state.data?.vehicles || [], [state.data]);
  const reviews = useAggregatedDriverReviews(vehicles);
  const shownReviews = expanded ? reviews.reviews : reviews.reviews.slice(0, 3);
  const ratingLabel = Number.isFinite(driver?.reviewScore) ? driver.reviewScore.toFixed(1) : null;

  const copyProfileLink = async () => {
    const url = `${window.location.origin}/drivers/${driverId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Profile link copied.');
    } catch {
      toast.error('Unable to copy link.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Driver profile"
    >
      <div
        className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-canvas sm:max-w-[460px] sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="flex-shrink-0 px-4 pb-5 pt-4 text-white"
          style={{ background: 'linear-gradient(160deg,#0f7a45,#10a35a 55%,#18b866)' }}
        >
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} aria-label="Close" className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white/[0.18] transition hover:bg-white/25">
              <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.4} />
            </button>
            <div className="text-[15px] font-bold opacity-90">Driver profile</div>
            <button type="button" onClick={copyProfileLink} aria-label="Copy profile link" className="ml-auto grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-white/[0.18] transition hover:bg-white/25">
              <Link2 className="h-[17px] w-[17px]" strokeWidth={2.1} />
            </button>
          </div>

          {driver ? (
            <div className="mt-4 flex items-center gap-3.5">
              <Avatar name={driver.name} tone="light" image={driver.profilePhoto} className="h-[68px] w-[68px] flex-shrink-0 rounded-[20px] text-[21px]" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="m-0 truncate text-[clamp(19px,6vw,23px)] font-extrabold leading-tight tracking-tight">{driver.name}</h1>
                  <LicenseIconBadge licenseType={driver.licenseType} />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {ratingLabel ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-white/[0.18] px-2 py-1 text-[12px] font-extrabold">
                      <Star className="h-3 w-3" fill="#ffd166" stroke="none" /> {ratingLabel}
                    </span>
                  ) : driver.licenseType ? null : (
                    <span className="inline-flex items-center rounded-lg bg-white/[0.18] px-2 py-1 text-[11px] font-extrabold">New driver</span>
                  )}
                  <span className="text-[12px] font-semibold opacity-90">
                    {driver.reviewCount || 0} review{driver.reviewCount === 1 ? '' : 's'} · {driver.location?.label || driver.address || 'Sri Lanka'}
                  </span>
                </div>
                {driver.licenseType ? (
                  <LicenseTypeChip licenseType={driver.licenseType} className="!mt-1.5" />
                ) : null}
              </div>
            </div>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto px-4 pb-5 pt-4">
          {state.loading ? (
            <div className="flex min-h-[240px] items-center justify-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin text-brand" /> Loading driver profile…
            </div>
          ) : state.error || !driver ? (
            <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-sm text-muted">
              <p>{state.error || 'This driver profile could not be found.'}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div className="grid grid-cols-3 gap-2.5">
                <StatTile value={`${Math.max(0, Math.round(Number(driver.experienceYears) || 0))} yrs`} label="Experience" />
                <StatTile value={ratingLabel || '—'} label="Rating" />
                <StatTile value={String(driver.vehicleCount ?? vehicles.length)} label="Vehicles" />
              </div>

              <section className="rounded-[18px] border border-hairline bg-surface p-4">
                <h2 className="m-0 text-[15.5px] font-extrabold tracking-tight text-ink">About {driver.name.split(' ')[0]}</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">
                  {driver.description?.trim() || `${driver.name} hasn't added a bio yet.`}
                </p>
                {Array.isArray(driver.badges) && driver.badges.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {driver.badges.map((label) => (
                      <span key={label} className="rounded-full border border-hairline bg-canvas px-2.5 py-1.5 text-[12px] font-bold text-ink-soft">{label}</span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3.5 flex flex-wrap gap-3 border-t border-hairline pt-3.5">
                  <InfoField label="Location" value={driver.location?.label || driver.address || 'Sri Lanka'} />
                  {formatDate(driver.joinedAt) ? <InfoField label="Member since" value={formatDate(driver.joinedAt)} /> : null}
                </div>
              </section>

              <section className="rounded-[18px] border border-hairline bg-surface p-4">
                <h2 className="m-0 mb-2.5 text-[15.5px] font-extrabold tracking-tight text-ink">Vehicles ({vehicles.length})</h2>
                <div className="flex flex-col gap-2.5">
                  {vehicles.length === 0 ? (
                    <p className="text-[13px] text-muted-soft">No vehicles listed right now.</p>
                  ) : (
                    vehicles.map((vehicle) => {
                      const isDiscussed = activeVehicleId && vehicle.id === activeVehicleId;
                      return (
                        <div key={vehicle.id} className={`flex items-center gap-3 rounded-[15px] border-[1.5px] p-3 ${isDiscussed ? 'border-brand/40 bg-brand-tint/40' : 'border-hairline bg-canvas'}`}>
                          <span className="grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-[13px] bg-brand-tint">
                            {vehicle.image ? <img src={vehicle.image} alt="" className="h-full w-full object-cover" /> : <Users className="h-5 w-5 text-brand-dark" strokeWidth={1.8} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[14px] font-extrabold text-ink">{vehicle.model}{vehicle.year ? ` ${vehicle.year}` : ''}</span>
                              {isDiscussed ? <span className="rounded-md bg-brand px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white">IN THIS CHAT</span> : null}
                            </div>
                            {vehicle.seats ? <div className="mt-0.5 text-[12px] font-semibold text-muted-soft">{vehicle.seats} seats</div> : null}
                          </div>
                          {formatCurrency(vehicle.discountedPricePerDay ?? vehicle.pricePerDay) ? (
                            <div className="flex-shrink-0 text-right">
                              <div className="text-[14px] font-extrabold text-ink">{formatCurrency(vehicle.discountedPricePerDay ?? vehicle.pricePerDay)}</div>
                              <div className="text-[10px] font-bold text-muted-soft">PER DAY</div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-[18px] border border-hairline bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="m-0 text-[15.5px] font-extrabold tracking-tight text-ink">Reviews</h2>
                  {ratingLabel ? (
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold text-ink">
                      <Star className="h-3.5 w-3.5" fill="#f0a12b" stroke="none" /> {ratingLabel} <span className="font-semibold text-muted-soft">/ 5</span>
                    </span>
                  ) : null}
                </div>

                {reviews.loading ? (
                  <div className="mt-3 flex items-center gap-2 text-[13px] text-muted-soft"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading reviews…</div>
                ) : reviews.meta.total === 0 ? (
                  <p className="mt-2.5 text-[13px] text-muted-soft">No reviews yet. Be the first to explore Sri Lanka with this driver and share your story.</p>
                ) : (
                  <>
                    <div className="mt-3 flex flex-col gap-1.5">
                      {STAR_ORDER.map((star) => {
                        const count = reviews.meta.counts[star - 1] || 0;
                        const pct = reviews.meta.total ? Math.round((count / reviews.meta.total) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="w-3 flex-shrink-0 text-right text-[11.5px] font-bold text-muted-soft">{star}</span>
                            <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-hairline">
                              <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                            </span>
                            <span className="w-6 flex-shrink-0 text-[11.5px] font-bold text-muted-soft">{count}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex flex-col gap-3">
                      {shownReviews.map((review) => (
                        <div key={review.id} className="border-t border-hairline pt-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={review.travelerName || 'Traveler'} tone="brand" className="h-9 w-9 flex-shrink-0 rounded-xl text-[12.5px]" />
                            <div className="min-w-0 flex-1">
                              <div className="text-[13.5px] font-extrabold text-ink">{review.travelerName || 'Traveler'}</div>
                              <div className="mt-0.5 text-[11.5px] font-semibold text-muted-soft">
                                {[review.vehicle?.model, formatDate(review.publishedAt || review.createdAt)].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                            <span className="inline-flex flex-shrink-0 items-center gap-1 text-[12.5px] font-extrabold text-ink">
                              <Star className="h-3 w-3" fill="#f0a12b" stroke="none" /> {Number(review.rating).toFixed(1)}
                            </span>
                          </div>
                          {review.comment ? <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{review.comment}</p> : null}
                        </div>
                      ))}
                    </div>

                    {reviews.reviews.length > 3 ? (
                      <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-3.5 w-full rounded-[13px] border-[1.5px] border-hairline bg-surface py-2.5 text-[13.5px] font-extrabold text-ink-soft transition hover:border-brand hover:text-brand-dark">
                        {expanded ? 'Show fewer reviews' : `Read all ${reviews.reviews.length} reviews`}
                      </button>
                    ) : null}
                  </>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="flex flex-shrink-0 gap-2.5 border-t border-hairline bg-surface p-3" style={{ paddingBottom: 'max(12px,env(safe-area-inset-bottom))' }}>
          {hasBooking ? (
            <button type="button" onClick={onViewTripDetails} className="flex-shrink-0 rounded-[14px] border-[1.5px] border-hairline bg-surface px-4 text-[14px] font-extrabold text-ink transition hover:border-brand" style={{ minHeight: 50 }}>
              Trip details
            </button>
          ) : null}
          <button type="button" onClick={onClose} className="flex-1 rounded-[14px] bg-brand text-[14.5px] font-extrabold text-white transition hover:bg-brand-dark" style={{ minHeight: 50 }}>
            Back to chat
          </button>
        </div>
      </div>
    </div>
  );
};

const StatTile = ({ value, label }) => (
  <div className="rounded-2xl border border-hairline bg-surface py-3 text-center">
    <div className="text-[18px] font-extrabold tracking-tight text-ink">{value}</div>
    <div className="mt-0.5 text-[10.5px] font-extrabold tracking-wide text-muted-soft">{label.toUpperCase()}</div>
  </div>
);

const InfoField = ({ label, value }) => (
  <div className="min-w-[120px] flex-1">
    <div className="text-[10.5px] font-extrabold tracking-wide text-muted-soft">{label.toUpperCase()}</div>
    <div className="mt-0.5 text-[13.5px] font-bold text-ink">{value}</div>
  </div>
);

export default DriverProfileSheet;

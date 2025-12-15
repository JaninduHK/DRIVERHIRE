import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { CalendarDays, Loader2, MapPin, MessageCircle, Send, Users } from 'lucide-react';
import { fetchOpenBriefs, respondToBrief } from '../services/briefApi.js';
import { fetchDriverVehicles } from '../services/driverApi.js';
import { fetchCurrentUser } from '../services/profileApi.js';

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

const TourBriefsBoard = () => {
  const [userState, setUserState] = useState({ loading: true, error: '', data: null });
  const [briefsState, setBriefsState] = useState({ loading: true, error: '', items: [] });
  const [vehiclesState, setVehiclesState] = useState({ loading: false, error: '', items: [] });
  const [offerModal, setOfferModal] = useState({ open: false, brief: null });
  const [offerForm, setOfferForm] = useState({
    startDate: '',
    endDate: '',
    vehicleId: '',
    totalPrice: '',
    totalKms: '',
    pricePerExtraKm: '',
    note: '',
  });
  const [sendingOffer, setSendingOffer] = useState(false);

  const isApprovedDriver =
    userState.data?.role === 'driver' && userState.data?.driverStatus === 'approved';

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const response = await fetchCurrentUser();
        setUserState({ loading: false, error: '', data: response?.user || null });
      } catch (error) {
        setUserState({
          loading: false,
          error: error?.message || 'Sign in to continue.',
          data: null,
        });
      }
    };
    loadCurrentUser();
  }, []);

  const loadBriefs = useCallback(async () => {
    setBriefsState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchOpenBriefs();
      setBriefsState({
        loading: false,
        error: '',
        items: Array.isArray(data?.briefs) ? data.briefs : [],
      });
    } catch (error) {
      setBriefsState({
        loading: false,
        error: error?.message || 'Unable to load briefs right now.',
        items: [],
      });
    }
  }, []);

  const loadVehicles = useCallback(async () => {
    setVehiclesState((prev) => ({ ...prev, loading: true, error: '' }));
    try {
      const data = await fetchDriverVehicles();
      setVehiclesState({
        loading: false,
        error: '',
        items: Array.isArray(data?.vehicles) ? data.vehicles : [],
      });
    } catch (error) {
      setVehiclesState({
        loading: false,
        error: error?.message || 'Unable to load your vehicles.',
        items: [],
      });
    }
  }, []);

  useEffect(() => {
    if (isApprovedDriver) {
      loadBriefs();
      loadVehicles();
    } else if (!userState.loading) {
      setBriefsState((prev) => ({ ...prev, loading: false }));
    }
  }, [isApprovedDriver, userState.loading, loadBriefs, loadVehicles]);

  const openOfferModal = (brief) => {
    if (!isApprovedDriver) {
      toast.error('Only approved drivers can send offers.');
      return;
    }
    if (brief.hasResponded) {
      toast('You already responded to this brief.');
      return;
    }
    const defaultVehicleId = offerForm.vehicleId || vehiclesState.items[0]?.id || '';
    setOfferForm({
      startDate: formatDateInput(brief.startDate),
      endDate: formatDateInput(brief.endDate),
      vehicleId: defaultVehicleId,
      totalPrice: '',
      totalKms: '',
      pricePerExtraKm: '',
      note: '',
    });
    setOfferModal({ open: true, brief });
  };

  const closeOfferModal = () => {
    setOfferModal({ open: false, brief: null });
    setOfferForm({
      startDate: '',
      endDate: '',
      vehicleId: '',
      totalPrice: '',
      totalKms: '',
      pricePerExtraKm: '',
      note: '',
    });
    setSendingOffer(false);
  };

  const handleOfferFieldChange = (event) => {
    const { name, value } = event.target;
    setOfferForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleOfferSubmit = async (event) => {
    event.preventDefault();
    if (!offerModal.brief) {
      return;
    }
    if (!offerForm.vehicleId) {
      toast.error('Select a vehicle for this offer.');
      return;
    }
    const totalPriceNumber = Number(offerForm.totalPrice);
    const totalKmsNumber = Number(offerForm.totalKms);
    const extraKmNumber = Number(offerForm.pricePerExtraKm);
    if (
      Number.isNaN(totalPriceNumber) ||
      totalPriceNumber <= 0 ||
      Number.isNaN(totalKmsNumber) ||
      totalKmsNumber <= 0 ||
      Number.isNaN(extraKmNumber) ||
      extraKmNumber < 0
    ) {
      toast.error('Enter valid pricing details.');
      return;
    }
    setSendingOffer(true);
    try {
      await respondToBrief(offerModal.brief.id, {
        vehicleId: offerForm.vehicleId,
        startDate: offerForm.startDate,
        endDate: offerForm.endDate,
        totalPrice: totalPriceNumber,
        totalKms: totalKmsNumber,
        pricePerExtraKm: extraKmNumber,
        note: offerForm.note,
      });
      toast.success('Offer sent via chat. Continue the conversation from Driver Messages.');
      closeOfferModal();
      await loadBriefs();
    } catch (error) {
      toast.error(error?.message || 'Unable to send offer.');
      setSendingOffer(false);
    }
  };

  const renderGate = useMemo(() => {
    if (userState.loading) {
      return (
        <div className="flex h-60 flex-col items-center justify-center gap-3 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
          Checking your account...
        </div>
      );
    }
    if (!isApprovedDriver) {
      return (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
          <p className="text-base font-semibold text-slate-900">Drivers only</p>
          <p>
            Sign in with an approved driver account to view live tour briefs and send offers. Want to
            join? Apply through the driver portal.
          </p>
          {userState.error ? (
            <p className="text-xs text-slate-400">{userState.error}</p>
          ) : null}
        </div>
      );
    }
    return null;
  }, [userState.loading, userState.error, isApprovedDriver]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
            Live tour briefs
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Connect with travellers ready to book</h1>
          <p className="max-w-2xl text-base text-slate-600">
            Browse the latest trip requests from tourists on Car With Driver. Send a tailored offer to open
            a chat thread and negotiate the itinerary.
          </p>
        </header>

        {renderGate || (
          <div className="space-y-4">
            {briefsState.loading ? (
              <div className="flex h-60 flex-col items-center justify-center gap-3 text-sm text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
                Loading tour briefs...
              </div>
            ) : briefsState.error ? (
              <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
                <p>{briefsState.error}</p>
                <button
                  type="button"
                  onClick={loadBriefs}
                  className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
                >
                  Try again
                </button>
              </div>
            ) : briefsState.items.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
                <p className="font-semibold text-slate-800">No open briefs right now.</p>
                <p className="mt-1">Check back soon—new itineraries are posted daily.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {briefsState.items.map((brief) => {
                  const start = formatDateLabel(brief.startDate);
                  const end = formatDateLabel(brief.endDate);
                  const offerLabel = brief.offersCount === 1 ? 'offer' : 'offers';
                  const hasResponded = Boolean(brief.hasResponded);
                  return (
                    <li
                      key={brief.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {brief.startLocation} → {brief.endLocation}
                          </p>
                          <p className="text-xs text-slate-500">
                            {start && end ? `${start} – ${end}` : 'Dates to be confirmed'}
                          </p>
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {brief.traveler?.name ? `Posted by ${brief.traveler.name}` : 'Traveller'}
                        </span>
                      </div>
                      <p className="mt-3 text-sm text-slate-600 whitespace-pre-line">{brief.message}</p>
                      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
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
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={() => openOfferModal(brief)}
                          disabled={hasResponded || vehiclesState.items.length === 0}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/60"
                        >
                          {hasResponded ? 'Offer sent' : (
                            <>
                              <Send className="h-4 w-4" />
                              Send offer
                            </>
                          )}
                        </button>
                        {vehiclesState.items.length === 0 ? (
                          <p className="text-xs text-amber-600">
                            Add a vehicle in your driver portal to send offers.
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {offerModal.open && offerModal.brief ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Offer</p>
                <h2 className="text-lg font-semibold text-slate-900">
                  {offerModal.brief.startLocation} → {offerModal.brief.endLocation}
                </h2>
                <p className="text-xs text-slate-500">
                  {formatDateLabel(offerModal.brief.startDate)} – {formatDateLabel(offerModal.brief.endDate)}
                </p>
              </div>
              <button
                type="button"
                onClick={closeOfferModal}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleOfferSubmit} className="mt-5 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Start date
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={offerForm.startDate}
                    onChange={handleOfferFieldChange}
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
                    value={offerForm.endDate}
                    onChange={handleOfferFieldChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Vehicle
                </label>
                <select
                  name="vehicleId"
                  value={offerForm.vehicleId}
                  onChange={handleOfferFieldChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  required
                >
                  <option value="">Select vehicle</option>
                  {vehiclesState.items.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total price (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="totalPrice"
                    value={offerForm.totalPrice}
                    onChange={handleOfferFieldChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Included kms
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="totalKms"
                    value={offerForm.totalKms}
                    onChange={handleOfferFieldChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Extra km rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    inputMode="decimal"
                    name="pricePerExtraKm"
                    value={offerForm.pricePerExtraKm}
                    onChange={handleOfferFieldChange}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Personal note
                </label>
                <textarea
                  name="note"
                  rows={3}
                  value={offerForm.note}
                  onChange={handleOfferFieldChange}
                  placeholder="Share what's included, vehicle perks, or daily plan highlights."
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Contact details are hidden automatically to keep travellers safe.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeOfferModal}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                  disabled={sendingOffer}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingOffer}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/60"
                >
                  {sendingOffer ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send offer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default TourBriefsBoard;

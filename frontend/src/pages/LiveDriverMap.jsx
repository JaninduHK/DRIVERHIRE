import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLoaderData } from 'react-router';
import toast from 'react-hot-toast';
import { Loader2, MessageSquare, Star, Users, X } from 'lucide-react';
import { fetchDriverDirectory } from '../services/driverDirectoryApi.js';
import { startConversation as startChatConversation } from '../services/chatApi.js';
import { getStoredToken, redirectToSsoLogin } from '../services/authToken.js';
import { Avatar } from '../components/dashboard/primitives.jsx';
import ClientOnly from '../../app/components/ClientOnly.jsx';
import LiveMap from '../components/LiveMap.jsx';

const RETURN_PATH = '/live-map';
const LOCATION_FRESH_MS = 48 * 60 * 60 * 1000; // "available now" = checked in within 48h

const formatCurrency = (value) => (!Number.isFinite(value) ? '$0' : `$${value.toLocaleString('en-US')}`);

const yearsLabel = (years) => {
  const value = Number(years);
  if (!Number.isFinite(value) || value <= 0) return 'New guide';
  return `${Math.round(value)} yrs`;
};

const isFresh = (isoDate) => {
  if (!isoDate) return false;
  const time = new Date(isoDate).getTime();
  return Number.isFinite(time) && Date.now() - time <= LOCATION_FRESH_MS;
};

const FILTERS = [
  { value: 'all', label: 'All drivers', test: () => true },
  { value: 'available', label: 'Available now', test: (d) => Boolean(d.location) && isFresh(d.location.updatedAt) },
  { value: 'group', label: '6+ seats', test: (d) => Number(d.featuredVehicle?.seats) >= 6 },
  { value: 'top', label: 'Top rated', test: (d) => Number(d.reviewScore) >= 4.8 },
];

const LiveDriverMap = () => {
  const navigate = useNavigate();
  const loaderData = useLoaderData();
  const [drivers, setDrivers] = useState(loaderData?.drivers || []);
  const [loading, setLoading] = useState((loaderData?.drivers || []).length === 0);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [creatingConversation, setCreatingConversation] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetchDriverDirectory();
        if (!cancelled) setDrivers(response?.drivers || []);
      } catch {
        // Keep whatever the SSR loader already seeded; a silent client refresh failure isn't fatal here.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeFilter = FILTERS.find((f) => f.value === filter) || FILTERS[0];
  const visibleDrivers = useMemo(() => drivers.filter(activeFilter.test), [drivers, activeFilter]);
  const selected = useMemo(() => drivers.find((d) => d.id === selectedId) || null, [drivers, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [selectedId]);

  const startChat = async (driverId) => {
    if (!driverId) return;
    const token = getStoredToken();
    if (!token) {
      redirectToSsoLogin(RETURN_PATH);
      return;
    }
    if (creatingConversation) return;
    setCreatingConversation(true);
    try {
      const response = await startChatConversation({ driverId });
      toast.success('Conversation ready in your inbox.');
      navigate('/dashboard', { state: { openTab: 'messages', conversationId: response?.conversation?.id || null } });
    } catch (err) {
      const message = err?.message || 'Unable to start a conversation right now.';
      toast.error(message);
      if (message.toLowerCase().includes('sign in') || message.toLowerCase().includes('auth')) {
        redirectToSsoLogin(RETURN_PATH);
      }
    } finally {
      setCreatingConversation(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="flex flex-wrap items-end gap-3 sm:gap-5">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#cdeadb] bg-[#e8f7ef] px-3 py-1.5 text-[12px] font-extrabold tracking-wide text-brand-dark">
            <span className="h-2 w-2 rounded-full bg-brand" />
            LIVE · {drivers.filter(FILTERS[1].test).length} DRIVERS ONLINE
          </span>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink sm:text-4xl">Drivers near you, right now</h1>
          <p className="mt-2 max-w-xl text-[14.5px] leading-relaxed text-muted sm:text-[15px]">
            Tap a pin on the map or a card below to see the driver&rsquo;s vehicle, languages and daily rate — then start a chat.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
        {FILTERS.map((f) => {
          const count = drivers.filter(f.test).length;
          const isActive = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`flex-shrink-0 inline-flex min-h-[42px] items-center gap-2 rounded-xl border px-4 text-[13.5px] font-bold transition ${
                isActive ? 'border-brand bg-brand text-white' : 'border-[#e0e7e3] bg-white text-ink-soft hover:border-muted-soft'
              }`}
            >
              {f.label}
              <span className={`text-[11.5px] font-extrabold ${isActive ? 'text-white/75' : 'text-muted-soft'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        <section aria-label="Driver map" className="min-w-0 flex-1 lg:flex-[1.4]">
          <div className="h-[340px] sm:h-[420px] lg:h-[calc(100vh-220px)] lg:min-h-[520px]">
            <ClientOnly
              fallback={
                <div className="grid h-full w-full place-items-center rounded-[20px] border border-hairline bg-[#eef1ec] text-muted-soft">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              }
            >
              <LiveMap drivers={visibleDrivers} selectedDriverId={selectedId} onSelectDriver={setSelectedId} />
            </ClientOnly>
          </div>
        </section>

        <section aria-label="Recommended drivers" className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-[16.5px] font-extrabold tracking-tight text-ink">Recommended for you</h2>
            <span className="text-[12.5px] font-bold text-muted-soft">{visibleDrivers.length} of {drivers.length}</span>
          </div>

          <div className="flex max-h-[340px] flex-col gap-2.5 overflow-y-auto pr-1 sm:max-h-[420px] lg:max-h-[calc(100vh-220px)] lg:min-h-[520px]">
            {loading && drivers.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center text-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : visibleDrivers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d7e0da] bg-white p-6 text-center">
                <p className="text-[14px] font-extrabold text-ink">No drivers match this filter</p>
                <p className="mt-1 text-[12.5px] font-semibold text-muted-soft">Try &ldquo;All drivers&rdquo; to see everyone on the map.</p>
              </div>
            ) : (
              visibleDrivers.map((driver) => (
                <DriverListCard
                  key={driver.id}
                  driver={driver}
                  isSelected={driver.id === selectedId}
                  onClick={() => setSelectedId(driver.id)}
                />
              ))
            )}
          </div>
        </section>
      </div>

      {selected ? (
        <DriverDetailSheet
          driver={selected}
          onClose={() => setSelectedId(null)}
          onChat={() => startChat(selected.id)}
          chatting={creatingConversation}
        />
      ) : null}
    </div>
  );
};

const DriverListCard = ({ driver, isSelected, onClick }) => {
  const cityLabel = driver.location?.label || driver.address || 'Sri Lanka';
  const rating = Number(driver.reviewScore) > 0 ? Number(driver.reviewScore).toFixed(1) : '—';
  const price = Number.isFinite(driver.averagePricePerDay) && driver.averagePricePerDay > 0 ? formatCurrency(driver.averagePricePerDay) : 'Quote';
  const isOnline = Boolean(driver.location) && isFresh(driver.location.updatedAt);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-[0_1px_2px_rgba(15,31,45,.04)] transition hover:border-brand ${
        isSelected ? 'border-brand shadow-[0_10px_26px_rgba(16,163,90,.16)]' : 'border-[#e6ece9]'
      }`}
    >
      <span className="relative flex-shrink-0">
        <Avatar
          name={driver.name}
          tone="light"
          image={driver.profilePhoto}
          className="h-14 w-14 rounded-[15px] text-[15px]"
        />
        <span className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-brand' : 'bg-[#f0a12b]'}`} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-[15px] font-extrabold text-ink">{driver.name}</span>
          <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-ink">
            <Star className="h-3.5 w-3.5 fill-star text-star" /> {rating}
          </span>
          <span className="text-[12px] font-semibold text-muted-soft">({driver.reviewCount ?? 0})</span>
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] font-semibold text-muted-soft">
          {driver.featuredVehicle?.model || 'Multiday tours'} · {cityLabel}
        </span>
        <span className="mt-1 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-brand-tint px-2 py-1 text-[11px] font-bold text-brand-dark">{yearsLabel(driver.experienceYears)}</span>
          {driver.featuredVehicle?.seats ? (
            <span className="inline-flex items-center gap-1 rounded-lg bg-[#f5f7f6] px-2 py-1 text-[11px] font-bold text-ink-soft">
              <Users className="h-3 w-3" /> {driver.featuredVehicle.seats} seats
            </span>
          ) : null}
        </span>
      </span>
      <span className="flex-shrink-0 text-right">
        <span className="block text-[15px] font-extrabold text-ink">{price}</span>
        <span className="block text-[10.5px] font-bold text-muted-soft">per day</span>
      </span>
    </button>
  );
};

const DriverDetailSheet = ({ driver, onClose, onChat, chatting }) => {
  const [vehicleImageFailed, setVehicleImageFailed] = useState(false);
  const cityLabel = driver.location?.label || driver.address || 'Sri Lanka';
  const rating = Number(driver.reviewScore) > 0 ? Number(driver.reviewScore).toFixed(1) : '—';
  const price = Number.isFinite(driver.averagePricePerDay) && driver.averagePricePerDay > 0 ? formatCurrency(driver.averagePricePerDay) : 'Quote';
  const stats = [
    { label: 'BASED IN', value: cityLabel },
    { label: 'EXPERIENCE', value: yearsLabel(driver.experienceYears) },
    { label: 'REVIEWS', value: `${driver.reviewCount ?? 0}` },
    { label: 'VEHICLES', value: `${driver.vehicleCount ?? 0}` },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label="Driver details" className="fixed inset-0 z-[1000] flex items-end justify-center bg-[#0f1f2d]/45 backdrop-blur-[2px] sm:items-center sm:p-4">
      <div onClick={onClose} className="absolute inset-0" />
      <div className="relative max-h-[92vh] w-full max-w-[540px] overflow-y-auto rounded-t-[24px] bg-white shadow-[0_-18px_50px_rgba(15,31,45,.25)] sm:rounded-[24px]">
        <div className="relative px-5 pt-5 sm:px-7">
          <button type="button" onClick={onClose} aria-label="Close" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-xl border border-[#e6ece9] bg-white text-muted-soft transition hover:text-ink sm:right-6">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3.5 pr-12">
            <Avatar name={driver.name} tone="light" image={driver.profilePhoto} className="h-16 w-16 flex-shrink-0 rounded-[18px] text-[19px]" />
            <div className="min-w-0">
              <h2 className="truncate text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{driver.name}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[13px] font-bold text-ink">
                  <Star className="h-3.5 w-3.5 fill-star text-star" /> {rating}
                </span>
                <span className="text-[12.5px] font-semibold text-muted-soft">{driver.reviewCount ?? 0} reviews</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 px-5 sm:grid-cols-4 sm:px-7">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[14px] border border-hairline bg-canvas px-3 py-2.5">
              <div className="text-[10px] font-extrabold tracking-wide text-muted-soft">{stat.label}</div>
              <div className="mt-1 truncate text-[13.5px] font-extrabold text-ink">{stat.value}</div>
            </div>
          ))}
        </div>

        {driver.featuredVehicle ? (
          <div className="mt-4 px-5 sm:px-7">
            <div className="text-[11px] font-extrabold tracking-wide text-muted-soft">VEHICLE</div>
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#e6ece9] p-3">
              {driver.featuredVehicle.image && !vehicleImageFailed ? (
                <img
                  src={driver.featuredVehicle.image}
                  alt={driver.featuredVehicle.model}
                  onError={() => setVehicleImageFailed(true)}
                  className="h-11 w-11 flex-shrink-0 rounded-xl object-cover"
                />
              ) : (
                <span className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl bg-brand-tint text-brand-dark">
                  <Users className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-[14px] font-extrabold text-ink">{driver.featuredVehicle.model}</div>
                <div className="text-[12px] font-semibold text-muted-soft">{driver.featuredVehicle.seats ? `${driver.featuredVehicle.seats} seats` : 'Seats vary'}</div>
              </div>
            </div>
          </div>
        ) : null}

        {driver.badges?.length ? (
          <div className="mt-4 px-5 sm:px-7">
            <div className="text-[11px] font-extrabold tracking-wide text-muted-soft">GOOD TO KNOW</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {driver.badges.map((badge) => (
                <span key={badge} className="rounded-full bg-[#f5f7f6] px-3 py-1.5 text-[12px] font-bold text-ink-soft">{badge}</span>
              ))}
            </div>
          </div>
        ) : null}

        {driver.description ? (
          <p className="mt-4 px-5 text-[13.5px] leading-relaxed text-muted sm:px-7">{driver.description}</p>
        ) : null}

        <div className="sticky bottom-0 mt-5 flex flex-wrap items-center gap-2.5 border-t border-hairline bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
          <div className="min-w-0 flex-1">
            <div className="text-[18px] font-extrabold text-ink">{price}<span className="text-[12px] font-bold text-muted-soft"> / day</span></div>
          </div>
          <Link to={`/drivers/${driver.id}`} className="inline-flex min-h-[46px] items-center rounded-xl border border-[#e2e8ea] px-4 text-[13.5px] font-bold text-ink transition hover:border-muted-soft">
            View profile
          </Link>
          <button
            type="button"
            onClick={onChat}
            disabled={chatting}
            className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-[14px] font-extrabold text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70 sm:flex-initial"
          >
            <MessageSquare className="h-4 w-4" />
            {chatting ? 'Opening chat…' : `Chat with ${driver.name.split(' ')[0]}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveDriverMap;

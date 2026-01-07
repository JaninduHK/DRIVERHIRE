import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Car,
  Crown,
  MapPin,
  ShieldCheck,
  Star,
  UserRoundCheck,
} from 'lucide-react';
import { fetchVehicles, fetchVehicleReviews } from '../services/vehicleCatalogApi.js';
import { fetchDriverDirectory } from '../services/driverDirectoryApi.js';
import sriLankaTouristMap from '../assets/sri lanka tourist map.jpg';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}/day`;
};

const formatExperience = (years) => {
  const numeric = Number(years);
  if (!Number.isFinite(numeric)) {
    return 'Experienced guide';
  }
  const normalized = Math.max(0, Math.round(numeric));
  if (normalized === 0) {
    return 'New to guiding';
  }
  return `${normalized} year${normalized === 1 ? '' : 's'} guiding`;
};

const getVehicleImage = (vehicle) => {
  if (Array.isArray(vehicle?.images) && vehicle.images.length) {
    return vehicle.images[0];
  }
  if (vehicle?.image) {
    return vehicle.image;
  }
  if (vehicle?.featuredImage) {
    return vehicle.featuredImage;
  }
  return null;
};

const showcasePlaceholders = [0, 1, 2];

const formatDateRange = (startDate, endDate) => {
  const format = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const start = format(startDate);
  const end = format(endDate);

  if (start && end) {
    return `${start} – ${end}`;
  }
  return start || end || null;
};

const formatReviewSubline = (review, vehicle) => {
  const tripRange = formatDateRange(review?.visitedStartDate, review?.visitedEndDate);
  if (tripRange && vehicle?.model) {
    return `${tripRange} • ${vehicle.model}`;
  }
  if (vehicle?.model) {
    return vehicle.model;
  }
  if (tripRange) {
    return `${tripRange} • Private driver trip`;
  }
  return 'Chauffeur-driven Sri Lanka itinerary';
};

const heroFeatures = [
  { icon: ShieldCheck, label: 'Licensed & insured drivers' },
  { icon: MapPin, label: 'Island-wide coverage' },
  { icon: Crown, label: 'Tailored chauffeur tours' },
];

const seoKeywords =
  'Sri Lanka private driver | Car With Driver | chauffeur tours Sri Lanka | Sri Lanka car rentals with driver';

const CITY_POSITIONS = [
  {
    id: 'colombo',
    label: 'Colombo',
    top: '72%',
    left: '27%',
    keywords: ['colombo', 'cmb', 'negombo', 'katunayake', 'mount lavinia', 'kalutara'],
  },
  {
    id: 'galle',
    label: 'Galle',
    top: '84%',
    left: '33%',
    keywords: ['galle', 'matara', 'mirissa', 'hikkaduwa', 'unawatuna', 'weligama'],
  },
  {
    id: 'kandy',
    label: 'Kandy',
    top: '57%',
    left: '47%',
    keywords: ['kandy', 'peradeniya'],
  },
  {
    id: 'nuwara-eliya',
    label: 'Nuwara Eliya',
    top: '63%',
    left: '52%',
    keywords: ['nuwara', 'eliya', 'ella', 'hatton', 'kitulgala'],
  },
  {
    id: 'sigiriya',
    label: 'Sigiriya',
    top: '46%',
    left: '50%',
    keywords: ['sigiriya', 'dambulla', 'habanara', 'habarana'],
  },
  {
    id: 'anuradhapura',
    label: 'Anuradhapura',
    top: '36%',
    left: '44%',
    keywords: ['anuradhapura'],
  },
  {
    id: 'jaffna',
    label: 'Jaffna',
    top: '18%',
    left: '46%',
    keywords: ['jaffna'],
  },
  {
    id: 'trincomalee',
    label: 'Trincomalee',
    top: '40%',
    left: '68%',
    keywords: ['trincomalee', 'nilaveli', 'kuchchaveli'],
  },
  {
    id: 'batticaloa',
    label: 'Batticaloa',
    top: '60%',
    left: '70%',
    keywords: ['batticaloa', 'pasikuda', 'passekudah', 'arugam'],
  },
  {
    id: 'hambantota',
    label: 'Hambantota',
    top: '86%',
    left: '55%',
    keywords: ['hambantota', 'yala', 'tissa', 'tissamaharama', 'udawalawe'],
  },
];

const detectCityFromAddress = (address = '') => {
  const normalized = address.toLowerCase();
  return (
    CITY_POSITIONS.find((city) =>
      city.keywords.some((keyword) => normalized.includes(keyword)),
    ) || null
  );
};

const buildCityPinsFromAddress = (drivers = []) => {
  if (!Array.isArray(drivers) || drivers.length === 0) {
    return [];
  }

  const usedDriverIndexes = new Set();
  return CITY_POSITIONS.reduce((acc, city) => {
    const matchIndex = drivers.findIndex((driver, index) => {
      if (usedDriverIndexes.has(index)) {
        return false;
      }
      if (!driver?.address) {
        return false;
      }
      const normalized = driver.address.toLowerCase();
      return city.keywords.some((keyword) => normalized.includes(keyword));
    });

    if (matchIndex === -1) {
      return acc;
    }

    usedDriverIndexes.add(matchIndex);
    const driver = drivers[matchIndex];

    acc.push({
      id: driver.id || `driver-${matchIndex}`,
      name: driver.name || 'Driver',
      city,
      style: {
        top: city.top,
        left: city.left,
      },
      driverCount: drivers.filter((currentDriver, index) => {
        if (!currentDriver?.address) {
          return false;
        }
        const normalized = currentDriver.address.toLowerCase();
        return city.keywords.some((keyword) => normalized.includes(keyword));
      }).length,
      label: driver.address || city.label,
      avatar: driver.profilePhoto || null,
    });

    return acc;
  }, []);
};

const MAP_BOUNDS = {
  minLat: 5.5,
  maxLat: 10.1,
  minLng: 79.4,
  maxLng: 82.1,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const projectLatLng = (latitude, longitude) => {
  const latRange = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat || 1;
  const lngRange = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng || 1;
  const normalizedLat =
    (clamp(latitude, MAP_BOUNDS.minLat, MAP_BOUNDS.maxLat) - MAP_BOUNDS.minLat) / latRange;
  const normalizedLng =
    (clamp(longitude, MAP_BOUNDS.minLng, MAP_BOUNDS.maxLng) - MAP_BOUNDS.minLng) / lngRange;

  return {
    top: `${(1 - normalizedLat) * 100}%`,
    left: `${normalizedLng * 100}%`,
  };
};

const buildLiveDriverPins = (drivers = []) => {
  if (!Array.isArray(drivers) || drivers.length === 0) {
    return [];
  }

  const getLocation = (driver) => driver?.location || driver?.driverLocation;

  const pinsWithCoordinates = drivers
    .filter(
      (driver) =>
        typeof getLocation(driver)?.latitude === 'number' &&
        typeof getLocation(driver)?.longitude === 'number'
    )
    .slice(0, 10)
    .map((driver) => {
      const location = getLocation(driver);
      return {
        id: driver.id,
        name: driver.name || 'Driver',
        label: location?.label || driver.address || 'On the road',
        style: projectLatLng(location.latitude, location.longitude),
        lat: location.latitude,
        lng: location.longitude,
        driverCount: 1,
        avatar: driver.profilePhoto || null,
      };
    });

  if (pinsWithCoordinates.length) {
    return pinsWithCoordinates;
  }

  return buildCityPinsFromAddress(drivers);
};

const spreadOverlappingPins = (pins = []) => {
  const clusters = pins.reduce((acc, pin) => {
    const key = `${pin.style.top}|${pin.style.left}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(pin);
    return acc;
  }, {});

  return pins.map((pin) => {
    const key = `${pin.style.top}|${pin.style.left}`;
    const cluster = clusters[key];

    if (!cluster || cluster.length <= 1) {
      return pin;
    }

    const index = cluster.indexOf(pin);
    const angle = (index / cluster.length) * 2 * Math.PI;
    const radius = 10 + cluster.length * 2;
    const offset = {
      x: Math.round(Math.cos(angle) * radius * 10) / 10,
      y: Math.round(Math.sin(angle) * radius * 10) / 10,
    };

    return {
      ...pin,
      offset,
      driverCount: Math.max(pin.driverCount || 1, cluster.length),
    };
  });
};

const googleMapsLoader = (() => {
  let loaderPromise = null;
  return (apiKey) => {
    if (typeof window !== 'undefined' && window.google?.maps) {
      return Promise.resolve(window.google.maps);
    }
    if (!apiKey) {
      return Promise.reject(new Error('Google Maps API key missing.'));
    }
    if (!loaderPromise) {
      loaderPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-google-maps-loader]');
        if (existing) {
          existing.addEventListener('load', () => resolve(window.google.maps));
          existing.addEventListener('error', () =>
            reject(new Error('Unable to load Google Maps.'))
          );
          return;
        }
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=marker`;
        script.async = true;
        script.defer = true;
        script.dataset.googleMapsLoader = 'true';
        script.onload = () => resolve(window.google.maps);
        script.onerror = () => reject(new Error('Unable to load Google Maps.'));
        document.head.appendChild(script);
      });
    }
    return loaderPromise;
  };
})();

const LiveDriversMapCard = ({ drivers, loading, error, onReload }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const [mapError, setMapError] = useState('');
  const [mapLoading, setMapLoading] = useState(false);
  const pins = useMemo(
    () => spreadOverlappingPins(buildLiveDriverPins(drivers)),
    [drivers]
  );

  const clearMarkers = useCallback(() => {
    overlaysRef.current.forEach((overlay) => {
      try {
        overlay.setMap(null);
      } catch (e) {
        // ignore
      }
    });
    overlaysRef.current = [];
  }, []);

  const createDriverMarker = useCallback((maps, mapInstance, pin) => {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.transform = 'translate(-50%, -100%)';
    container.style.cursor = 'pointer';
    container.style.filter = 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))';

    const badge = document.createElement('div');
    badge.style.display = 'flex';
    badge.style.alignItems = 'center';
    badge.style.gap = '8px';
    badge.style.padding = '6px 10px';
    badge.style.borderRadius = '999px';
    badge.style.background = 'white';
    badge.style.fontSize = '12px';
    badge.style.fontWeight = '600';
    badge.style.color = '#0f172a';
    badge.style.boxShadow = '0 10px 25px rgba(15,23,42,0.25)';

    const avatarWrapper = document.createElement('div');
    avatarWrapper.style.width = '28px';
    avatarWrapper.style.height = '28px';
    avatarWrapper.style.borderRadius = '50%';
    avatarWrapper.style.overflow = 'hidden';
    avatarWrapper.style.border = '2px solid #d1fae5';
    avatarWrapper.style.background = '#ecfdf3';

    if (pin.avatar) {
      const img = document.createElement('img');
      img.src = pin.avatar;
      img.alt = pin.name || 'Driver';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      avatarWrapper.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.style.width = '100%';
      placeholder.style.height = '100%';
      placeholder.style.display = 'flex';
      placeholder.style.alignItems = 'center';
      placeholder.style.justifyContent = 'center';
      placeholder.style.color = '#10b981';
      placeholder.style.fontWeight = '700';
      placeholder.textContent = (pin.name || 'D')[0] || 'D';
      avatarWrapper.appendChild(placeholder);
    }

    const textWrapper = document.createElement('div');
    textWrapper.style.display = 'flex';
    textWrapper.style.flexDirection = 'column';
    textWrapper.style.lineHeight = '1.1';

    const nameEl = document.createElement('span');
    nameEl.textContent = (pin.name || 'Driver').split(' ')[0];
    nameEl.style.fontSize = '12px';

    const labelEl = document.createElement('span');
    labelEl.textContent = pin.label || 'On the road';
    labelEl.style.fontSize = '10px';
    labelEl.style.color = '#475569';

    textWrapper.appendChild(nameEl);
    textWrapper.appendChild(labelEl);

    badge.appendChild(avatarWrapper);
    badge.appendChild(textWrapper);

    const dot = document.createElement('div');
    dot.style.width = '8px';
    dot.style.height = '8px';
    dot.style.borderRadius = '50%';
    dot.style.background = '#10b981';
    dot.style.margin = '6px auto 0';
    dot.style.boxShadow = '0 0 10px 4px rgba(16,185,129,0.45)';

    container.appendChild(badge);
    container.appendChild(dot);

    container.addEventListener('click', () => {
      window.location.href = `/drivers/${pin.id}`;
    });

    class DriverOverlay extends maps.OverlayView {
      constructor(position) {
        super();
        this.position = position;
      }
      onAdd() {
        const panes = this.getPanes();
        panes.overlayMouseTarget.appendChild(container);
      }
      draw() {
        const overlayProjection = this.getProjection();
        if (!overlayProjection) return;
        const pos = overlayProjection.fromLatLngToDivPixel(this.position);
        container.style.left = `${pos.x}px`;
        container.style.top = `${pos.y}px`;
      }
      onRemove() {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }

    const overlay = new DriverOverlay(new maps.LatLng(pin.lat, pin.lng));
    overlay.setMap(mapInstance);
    overlaysRef.current.push(overlay);
  }, []);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!mapContainerRef.current) {
      return;
    }
    if (loading || error) {
      return;
    }
    if (!apiKey) {
      setMapError('Add VITE_GOOGLE_MAPS_API_KEY to show the live driver map.');
      return;
    }
    setMapError('');
    setMapLoading(true);

    googleMapsLoader(apiKey)
      .then((maps) => {
        setMapLoading(false);
        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapContainerRef.current, {
            center: { lat: 7.8731, lng: 80.7718 },
            zoom: 7,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
        }

        clearMarkers();

        if (!pins.length) {
          return;
        }

        const bounds = new maps.LatLngBounds();
        pins.forEach((pin) => {
          if (typeof pin.lat !== 'number' || typeof pin.lng !== 'number') {
            return;
          }
          createDriverMarker(maps, mapRef.current, pin);
          bounds.extend(new maps.LatLng(pin.lat, pin.lng));
        });

        if (!bounds.isEmpty()) {
          mapRef.current.fitBounds(bounds);
        }
      })
      .catch((loadError) => {
        console.warn('Google Maps failed', loadError);
        setMapLoading(false);
        setMapError(loadError?.message || 'Unable to load map.');
      });
  }, [pins, loading, error, clearMarkers, createDriverMarker]);

  return (
    <div className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-[30px] border border-white/60 bg-white/80 shadow-2xl shadow-emerald-200/60 backdrop-blur lg:max-w-[460px]">
      <div className="absolute inset-0 rounded-[30px] bg-gradient-to-tr from-emerald-300/20 to-transparent blur-3xl" />
      <div className="relative h-[600px] w-full">
        <div className="absolute left-0 top-0 z-30 rounded-br-2xl bg-slate-950/85 px-4 py-3 text-xs font-semibold uppercase tracking-[0.35em] text-emerald-200 shadow-lg shadow-black/30">
          Live driver map ·{' '}
          <span className="text-white">{pins.length || (loading ? '—' : 0)} live pins</span>
        </div>
        <div className="absolute right-3 top-3 z-30 flex flex-col gap-2">
          <button
            type="button"
            onClick={onReload}
            className="rounded-full bg-slate-900/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 shadow hover:bg-slate-900"
          >
            Refresh
          </button>
        </div>
        <div
          ref={mapContainerRef}
          className="absolute inset-0 h-full w-full overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950"
        />
        {(loading || mapLoading) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/30 text-sm text-white backdrop-blur">
            Loading live map...
          </div>
        )}
        {(error || mapError) && !loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/40 px-4 text-center text-sm text-amber-100 backdrop-blur">
            <p>{mapError || error}</p>
            <button
              type="button"
              onClick={onReload}
              className="rounded-full border border-amber-200/60 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-white/10"
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !mapLoading && !error && !mapError && !pins.length ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center text-sm text-slate-200 backdrop-blur-sm">
            <p>No live drivers to show yet.</p>
            <p className="mt-1 text-xs text-slate-400">Check back soon.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const HomePage = () => {
  const [vehicleState, setVehicleState] = useState({ loading: true, error: '', items: [] });
  const [vehicleReloadKey, setVehicleReloadKey] = useState(0);
  const [driverState, setDriverState] = useState({ loading: true, error: '', items: [] });
  const [driverReloadKey, setDriverReloadKey] = useState(0);
  const [reviewState, setReviewState] = useState({ loading: true, error: '', items: [] });
  const [reviewReloadKey, setReviewReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    setVehicleState((prev) => ({ ...prev, loading: true, error: '' }));

    fetchVehicles({ sort: 'rating_desc' })
      .then(({ vehicles }) => {
        if (cancelled) {
          return;
        }
        setVehicleState({
          loading: false,
          error: '',
          items: Array.isArray(vehicles) ? vehicles : [],
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setVehicleState({
          loading: false,
          error: error?.message || 'Unable to load vehicles right now.',
          items: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [vehicleReloadKey]);

  useEffect(() => {
    let cancelled = false;

    setDriverState((prev) => ({ ...prev, loading: true, error: '' }));

    fetchDriverDirectory()
      .then(({ drivers }) => {
        if (cancelled) {
          return;
        }
        setDriverState({
          loading: false,
          error: '',
          items: Array.isArray(drivers) ? drivers : [],
        });
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }
        setDriverState({
          loading: false,
          error: error?.message || 'Unable to load drivers right now.',
          items: [],
        });
      });

    return () => {
      cancelled = true;
    };
  }, [driverReloadKey]);

  const featuredVehicles = useMemo(
    () => vehicleState.items.slice(0, 3),
    [vehicleState.items],
  );
  const featuredDrivers = useMemo(
    () => driverState.items.slice(0, 3),
    [driverState.items],
  );

  const retryVehicles = () => setVehicleReloadKey((prev) => prev + 1);
  const retryDrivers = () => setDriverReloadKey((prev) => prev + 1);
  const retryReviews = () => setReviewReloadKey((prev) => prev + 1);

  useEffect(() => {
    let cancelled = false;

    if (vehicleState.loading) {
      setReviewState((prev) => ({ ...prev, loading: true }));
      return () => {
        cancelled = true;
      };
    }

    if (!featuredVehicles.length) {
      setReviewState({ loading: false, error: '', items: [] });
      return () => {
        cancelled = true;
      };
    }

    setReviewState((prev) => ({ ...prev, loading: true, error: '' }));

    const loadReviews = async () => {
      try {
        const responses = await Promise.all(
          featuredVehicles.map((vehicle) =>
            fetchVehicleReviews(vehicle.id)
              .then((payload) => ({
                vehicle,
                reviews: Array.isArray(payload?.reviews) ? payload.reviews : [],
              }))
              .catch(() => ({ vehicle, reviews: [] })),
          ),
        );

        if (cancelled) {
          return;
        }

        const aggregated = responses.flatMap(({ vehicle, reviews }) =>
          reviews.slice(0, 2).map((review) => ({
            review,
            vehicle,
          })),
        );

        const sorted = aggregated
          .sort((a, b) => {
            const aDate = new Date(a.review.publishedAt || a.review.createdAt || 0).getTime();
            const bDate = new Date(b.review.publishedAt || b.review.createdAt || 0).getTime();
            return bDate - aDate;
          })
          .slice(0, 3);

        setReviewState({
          loading: false,
          error: '',
          items: sorted,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setReviewState({
          loading: false,
          error: error?.message || 'Unable to load guest reviews right now.',
          items: [],
        });
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [vehicleState.loading, featuredVehicles, reviewReloadKey]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 text-slate-900">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-emerald-100/70 to-transparent blur-3xl" />
        <div className="relative w-full px-6 pb-16 pt-24 sm:px-10 sm:pt-28 sm:pb-24 lg:px-16 xl:px-24">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur">
                Trusted Sri Lanka Car With Driver platform
              </p>
              <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                Chauffeur-driven tours & car rentals designed for{' '}
                <span className="text-emerald-600">Sri Lankan adventures</span>.
              </h1>
              <p className="mt-5 text-lg text-slate-600">
                Book a private driver, customize your itinerary, and explore Sri Lanka&apos;s beaches, tea
                mountains, and UNESCO sites with confidence. We combine vetted drivers, modern vehicles, and live
                itinerary tracking to deliver five-star journeys.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Plan my Sri Lanka trip
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
                <a
                  href="/vehicles"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-300"
                >
                  Browse vehicles & drivers
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-4">
                {heroFeatures.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm"
                  >
                    <Icon className="h-4 w-4 text-emerald-500" />
                    {label}
                  </div>
                ))}
              </div>
              <p className="mt-6 text-xs uppercase tracking-widest text-slate-400">
                {seoKeywords}
              </p>
            </div>

            <div className="flex justify-center lg:justify-end">
              <LiveDriversMapCard
                drivers={driverState.items}
                loading={driverState.loading}
                error={driverState.error}
                onReload={retryDrivers}
              />
            </div>
          </div>
        </div>
      </section>

      {/* VEHICLE COLLECTION */}
      <section className="w-full px-6 py-16 sm:px-10 lg:px-16 xl:px-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              Fleet for every journey
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              Premium vehicles for island-wide car rentals in Sri Lanka
            </h2>
            <p className="mt-3 text-slate-600 max-w-2xl">
              Choose from modern SUVs, executive sedans, and group-friendly vans. Each vehicle is professionally
              maintained, GPS-enabled, and paired with a bilingual driver so you can relax from Colombo to Yala.
            </p>
          </div>
          <a
            href="/vehicles"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-400"
          >
            View all vehicles
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
        <div className="mt-10">
          {vehicleState.loading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {showcasePlaceholders.map((placeholder) => (
                <div
                  key={`vehicle-skeleton-${placeholder}`}
                  className="animate-pulse rounded-2xl border border-slate-100 bg-white/70 p-6 shadow-sm"
                >
                  <div className="h-40 w-full rounded-2xl bg-slate-100" />
                  <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-slate-100" />
                  <div className="mt-6 h-8 w-2/3 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : vehicleState.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              <p>{vehicleState.error}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryVehicles}
                  className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
                >
                  Try again
                </button>
                <a
                  href="/vehicles"
                  className="inline-flex items-center rounded-full border border-rose-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-200"
                >
                  Open catalog
                </a>
              </div>
            </div>
          ) : featuredVehicles.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              No vehicles are ready yet.{' '}
              <a href="/vehicles" className="font-semibold text-emerald-600">
                Browse the catalog
              </a>{' '}
              to see the latest additions.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {featuredVehicles.map((vehicle) => {
                const image = getVehicleImage(vehicle);
                const discount = vehicle.activeDiscount;
                const dailyRate = formatCurrency(
                  typeof discount?.discountedPricePerDay === 'number'
                    ? discount.discountedPricePerDay
                    : vehicle.pricePerDay
                ) || 'Custom quote';
                const originalRate =
                  discount && typeof vehicle.pricePerDay === 'number'
                    ? formatCurrency(vehicle.pricePerDay)
                    : null;
                const seatLabel = vehicle.seats ? `${vehicle.seats} seats` : 'Seats on request';
                const driverName = vehicle.driver?.name ?? 'Approved driver';

                return (
                  <Link
                    key={vehicle.id}
                    to={`/vehicles/${vehicle.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  >
                    {image ? (
                      <div className="h-48 w-full overflow-hidden bg-slate-100">
                        <img
                          src={image}
                          alt={vehicle.model || 'Vehicle image'}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-slate-400">
                        <Car className="h-10 w-10" />
                      </div>
                    )}
                    <div className="flex flex-1 flex-col gap-4 p-6">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {vehicle.model || 'Featured vehicle'}
                        </h3>
                        <p className="line-clamp-2 text-sm text-slate-600">
                          {vehicle.description || 'Spacious, comfortable, and ready for Sri Lanka road trips.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1">
                          {seatLabel}
                        </span>
                        {vehicle.year ? (
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1">
                            Year {vehicle.year}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Average rate</p>
                          <p className="text-sm font-semibold text-slate-900">
                            {dailyRate}
                            {originalRate ? (
                              <span className="ml-2 text-xs font-semibold text-slate-400 line-through">
                                {originalRate}
                              </span>
                            ) : null}
                          </p>
                          {discount?.discountPercent ? (
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                              Save {discount.discountPercent}%
                            </p>
                          ) : null}
                        </div>
                        <p className="text-xs font-medium text-slate-500">By {driverName}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* DRIVER TALENT */}
      <section className="bg-white/70 py-16">
        <div className="w-full px-6 sm:px-10 lg:px-16 xl:px-24">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Driver partners</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Meet the chauffeurs trusted by thousands of tourists
              </h2>
              <p className="mt-3 text-slate-600 max-w-2xl">
                Every driver is background-checked, insured, and trained in hospitality. They know hidden viewpoints,
                heritage sites, and the best roadside cafes—making them the ultimate hosts on wheels.
              </p>
            </div>
            <a
              href="/drivers"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-400"
            >
              Explore driver directory
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        <div className="mt-10">
          {driverState.loading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {showcasePlaceholders.map((placeholder) => (
                <div
                  key={`driver-skeleton-${placeholder}`}
                  className="animate-pulse rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-sm"
                >
                  <div className="h-6 w-1/2 rounded bg-slate-100" />
                  <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
                  <div className="mt-2 h-4 w-2/3 rounded bg-slate-100" />
                  <div className="mt-6 h-8 w-1/3 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : driverState.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              <p>{driverState.error}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryDrivers}
                  className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
                >
                  Try again
                </button>
                <a
                  href="/drivers"
                  className="inline-flex items-center rounded-full border border-rose-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-200"
                >
                  View directory
                </a>
              </div>
            </div>
          ) : featuredDrivers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              No drivers are published yet.{' '}
              <a href="/drivers" className="font-semibold text-emerald-600">
                Browse the full directory
              </a>{' '}
              for verified chauffeurs.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {featuredDrivers.map((driver) => {
                const heroImage =
                  driver.featuredVehicle?.image ||
                  driver.featuredVehicle?.coverImage ||
                  driver.featuredVehicle?.media?.[0] ||
                  null;
                const ratingLabel = driver.reviewScore
                  ? `${driver.reviewScore.toFixed(1)} • ${driver.reviewCount ?? 0} reviews`
                  : 'No reviews yet';
                const averageRate = formatCurrency(driver.averagePricePerDay) || 'Custom quote';
                const locationLabel = driver.location?.label || driver.address || 'Island-wide';

                return (
                  <Link
                    key={driver.id}
                    to={`/drivers/${driver.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                  >
                    {heroImage ? (
                      <div className="h-48 w-full overflow-hidden bg-slate-100">
                        <img
                          src={heroImage}
                          alt={driver.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                    ) : null}
                    <div className="flex flex-1 flex-col gap-4 p-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
                            {driver.profilePhoto ? (
                              <img
                                src={driver.profilePhoto}
                                alt={driver.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                <UserRoundCheck className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-900">{driver.name}</h3>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                                <UserRoundCheck className="h-4 w-4" />
                                Verified
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{locationLabel}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <Star className="h-4 w-4 text-amber-500" />
                          {ratingLabel}
                        </div>
                        <p className="line-clamp-2 text-sm text-slate-600">
                          {driver.description || 'Trusted chauffeur for bespoke Sri Lanka tours.'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                          <Award className="h-3.5 w-3.5 text-emerald-500" />
                          {driver.featuredVehicle?.model || 'Multiday tours'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                          {formatExperience(driver.experienceYears)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1">
                          {locationLabel}
                        </span>
                      </div>
                      {driver.badges?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {driver.badges.slice(0, 3).map((badge) => (
                            <span
                              key={badge}
                              className="inline-flex items-center rounded-full bg-slate-900/5 px-3 py-1 text-xs font-medium text-slate-700"
                            >
                              {badge}
                            </span>
                          ))}
                          {driver.badges.length > 3 ? (
                            <span className="text-xs text-slate-500">+{driver.badges.length - 3} more</span>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-400">Avg. daily rate</p>
                          <p className="text-sm font-semibold text-slate-900">{averageRate}</p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 transition group-hover:border-emerald-300 group-hover:text-emerald-600">
                          View driver
                          <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="w-full px-6 py-16 sm:px-10 lg:px-16 xl:px-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Guest stories</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">
              4.9 ★ rated trips from beach breaks to cultural odysseys
            </h2>
            <p className="mt-3 text-slate-600 max-w-2xl">
              Our reviews are packed with keywords tourists search for—car rentals with driver, Sri Lanka chauffeur
              tours, hill country road trips—because we deliver on every promise.
            </p>
          </div>
          <a
            href="/drivers"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-emerald-400"
          >
            Read more reviews
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
        <div className="mt-10">
          {reviewState.loading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {showcasePlaceholders.map((placeholder) => (
                <div
                  key={`review-skeleton-${placeholder}`}
                  className="animate-pulse rounded-2xl border border-slate-100 bg-white/80 p-6 shadow-sm"
                >
                  <div className="h-4 w-32 rounded bg-slate-100" />
                  <div className="mt-4 h-3 w-1/2 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                  <div className="mt-6 h-10 w-1/3 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          ) : reviewState.error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
              <p>{reviewState.error}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={retryReviews}
                  className="inline-flex items-center rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-300 hover:text-rose-800"
                >
                  Try again
                </button>
                <a
                  href="/vehicles"
                  className="inline-flex items-center rounded-full border border-rose-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-200"
                >
                  Browse trips
                </a>
              </div>
            </div>
          ) : reviewState.items.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Be the first to leave a review after your chauffeur-driven tour.{' '}
              <a href="/register" className="font-semibold text-emerald-600">
                Plan your trip
              </a>{' '}
              and share your story.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {reviewState.items.map(({ review, vehicle }, index) => {
                const roundedRating = Math.max(1, Math.min(5, Math.round(review.rating || 0)));
                const travelerName = review.travelerName || 'Traveler';
                const summary = formatReviewSubline(review, vehicle);
                const comment =
                  review.comment ||
                  review.title ||
                  'This traveler shared a private rating for their car-with-driver journey.';
                const reviewKey =
                  review.id || `${vehicle?.id || 'vehicle'}-${review.booking || index}`;

                return (
                  <blockquote
                    key={reviewKey}
                    className="flex h-full flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center gap-1 text-amber-500">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Star
                          key={`${review.id}-star-${index}`}
                          className={`h-4 w-4 ${index < roundedRating ? 'fill-current' : ''}`}
                        />
                      ))}
                      <span className="ml-2 text-sm font-semibold text-slate-700">
                        {Number(review.rating || 0).toFixed(1)} / 5
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-emerald-600">
                      {summary}
                    </p>
                    <p className="review-comment mt-3 text-sm text-slate-600">{comment}</p>
                    <footer className="mt-6 flex items-center justify-between gap-3 text-sm font-semibold text-slate-900">
                      <div className="flex items-center gap-3">
                        <img
                          src={`https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(travelerName)}`}
                          alt={travelerName}
                          className="h-9 w-9 rounded-full border border-slate-200 bg-white"
                        />
                        <div>
                          <p>{travelerName}</p>
                          <p className="text-xs font-normal text-slate-500">
                            {vehicle?.model ? `Rode in ${vehicle.model}` : 'Car With Driver traveler'}
                          </p>
                        </div>
                      </div>
                      {vehicle?.id ? (
                        <Link
                          to={`/vehicles/${vehicle.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600"
                        >
                          View ride
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : null}
                    </footer>
                  </blockquote>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* SEO CTA */}
      <section className="w-full px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="rounded-3xl border border-emerald-100 bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-10 text-white sm:px-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-emerald-100">
                Car With Driver · Sri Lanka tours
              </p>
            <h2 className="mt-3 text-3xl font-bold">
              Ready to secure the best driver for your Sri Lanka itinerary?
            </h2>
              <p className="mt-2 text-emerald-50">
                Share your travel dates, passenger count, and wish list. We match you with the ideal vehicle and driver, and keep you updated.
              </p>
            </div>
            <a
              href="/register"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-emerald-700 shadow-lg shadow-emerald-900/20 transition hover:translate-y-0.5"
            >
              Get a custom quote
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
      <p className="mt-6 px-6 text-center text-xs uppercase tracking-[0.4em] text-emerald-500 sm:px-10 lg:px-16 xl:px-24">
        Sri Lanka tourism · chauffeur tours · car rentals with driver · driver for tourists
      </p>
    </main>
  );
};

export default HomePage;

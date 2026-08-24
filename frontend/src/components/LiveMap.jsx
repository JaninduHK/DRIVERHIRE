import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

// Sri Lanka-wide default view, used whenever no driver has a real location yet.
const SRI_LANKA_CENTER = [7.8731, 80.7718];
const DEFAULT_ZOOM = 7;

const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'D';

const buildIcon = (L, name, isSelected) => {
  const size = isSelected ? 40 : 32;
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${isSelected ? '#0f1f2d' : '#10a35a'};border:2.5px solid #fff;box-shadow:0 6px 16px rgba(15,31,45,.28);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:${isSelected ? 13 : 11}px;font-family:'Plus Jakarta Sans',system-ui,sans-serif">${getInitials(name)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Real OpenStreetMap tiles + real driver pins (drivers who have shared a live
// location). No fabricated "on a trip" pins — the app has no real signal for
// that, so every real pin renders the same "available" style.
//
// Leaflet touches `window` at module-load time, so it's imported dynamically
// inside an effect (never runs during SSR) instead of a static top-level
// import — a static import would crash server rendering even though this
// component itself is only ever mounted client-side.
const LiveMap = ({ drivers, selectedDriverId, onSelectDriver }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null);
  const markersRef = useRef(new Map());
  const [ready, setReady] = useState(false);

  const located = useMemo(
    () => drivers.filter((driver) => Number.isFinite(driver.location?.latitude) && Number.isFinite(driver.location?.longitude)),
    [drivers]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true }).setView(SRI_LANKA_CENTER, DEFAULT_ZOOM);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      }).addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;

    const nextIds = new Set(located.map((driver) => driver.id));
    markersRef.current.forEach((marker, id) => {
      if (!nextIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    located.forEach((driver) => {
      const isSelected = driver.id === selectedDriverId;
      const icon = buildIcon(L, driver.name, isSelected);
      const existing = markersRef.current.get(driver.id);
      if (existing) {
        existing.setIcon(icon);
        existing.setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        const marker = L.marker([driver.location.latitude, driver.location.longitude], { icon })
          .addTo(map)
          .on('click', () => onSelectDriver(driver.id));
        marker.bindTooltip(driver.name, { direction: 'top', offset: [0, -18] });
        markersRef.current.set(driver.id, marker);
      }
    });

    if (located.length > 0) {
      const bounds = L.latLngBounds(located.map((driver) => [driver.location.latitude, driver.location.longitude]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 });
    } else {
      map.setView(SRI_LANKA_CENTER, DEFAULT_ZOOM);
    }
  }, [ready, located, selectedDriverId, onSelectDriver]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[20px] border border-hairline">
      <div ref={containerRef} className="h-full w-full" />
      {!ready ? (
        <div className="absolute inset-0 z-[400] grid place-items-center bg-[#eef1ec]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-soft" />
        </div>
      ) : null}
      {ready && located.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-[500] rounded-2xl bg-white/95 px-4 py-3 text-center text-[13px] font-semibold text-muted shadow-card">
          No drivers have shared their live location yet — browse everyone below.
        </div>
      ) : null}
    </div>
  );
};

export default LiveMap;

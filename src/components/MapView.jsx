import { useEffect, useRef } from 'react';
import { X, Map } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix the broken default marker icons that bundlers can't resolve automatically
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon   from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

/**
 * MapView — full-screen Leaflet map overlay.
 *
 * Props:
 *   travelLog  – sprint.travelLog object (date → { locations, photo })
 *   days       – sorted array of 'yyyy-MM-dd' strings (all sprint days)
 *   darkMode   – boolean (switches tile provider)
 *   onClose    – function to dismiss the overlay
 */
export default function MapView({ travelLog, days, darkMode, onClose }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    /* ── collect pinnable points (lat/lng ≠ 0,0) ── */
    const allPoints = [];
    days.forEach(date => {
      const locs = travelLog?.[date]?.locations || [];
      locs.forEach(loc => {
        if (loc.lat !== 0 || loc.lng !== 0) {
          allPoints.push({ date, ...loc });
        }
      });
    });

    /* ── initialise map ── */
    const map = L.map(containerRef.current, { zoomControl: true });

    /* ── tile layer ── */
    const tileUrl = darkMode
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = darkMode
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    L.tileLayer(tileUrl, { attribution, maxZoom: 19 }).addTo(map);

    if (allPoints.length === 0) {
      /* no locations yet — default to India */
      map.setView([22.5937, 78.9629], 5);
    } else {
      /* markers */
      allPoints.forEach(pt => {
        const label = format(parseISO(pt.date), 'EEE, MMM d');
        L.marker([pt.lat, pt.lng])
          .addTo(map)
          .bindPopup(
            `<div style="font-family:sans-serif;font-size:12px;">
               <b style="color:#6366f1">${label}</b><br/>
               ${pt.name}
             </div>`
          );
      });

      /* route polyline — first valid location per day, in order */
      const routeCoords = [];
      days.forEach(date => {
        const firstValid = (travelLog?.[date]?.locations || [])
          .find(l => l.lat !== 0 || l.lng !== 0);
        if (firstValid) routeCoords.push([firstValid.lat, firstValid.lng]);
      });

      if (routeCoords.length > 1) {
        L.polyline(routeCoords, {
          color:     '#6366f1',
          weight:    3,
          dashArray: '8 5',
          opacity:   0.85,
        }).addTo(map);
      }

      /* fit map to all pins */
      map.fitBounds(
        L.latLngBounds(allPoints.map(p => [p.lat, p.lng])),
        { padding: [50, 50], maxZoom: 14 },
      );
    }

    return () => map.remove();
  }, [travelLog, days, darkMode]);

  /* ── stats for the header ── */
  const totalPins = days.reduce((n, d) =>
    n + ((travelLog?.[d]?.locations || []).filter(l => l.lat !== 0 || l.lng !== 0).length), 0);
  const daysWithPins = days.filter(d =>
    (travelLog?.[d]?.locations || []).some(l => l.lat !== 0 || l.lng !== 0)).length;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col">

      {/* ── header bar ── */}
      <div className="flex-shrink-0 flex items-center justify-between
        px-4 sm:px-6 py-3
        bg-gray-900 border-b border-gray-700"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <Map className="w-4 h-4 text-brand-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Travel Map</h2>
            {totalPins > 0 ? (
              <p className="text-[11px] text-gray-400">
                {totalPins} pin{totalPins !== 1 ? 's' : ''} across {daysWithPins} day{daysWithPins !== 1 ? 's' : ''}
                {daysWithPins > 1 && (
                  <span className="ml-1 text-brand-400">· — route line</span>
                )}
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">
                No GPS locations yet — tap <span className="text-brand-400">Add Current Location</span> in any day column
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex-shrink-0"
          title="Close map"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── leaflet map ── */}
      <div ref={containerRef} className="flex-1 w-full" />
    </div>
  );
}

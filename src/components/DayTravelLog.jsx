import { useState, useRef } from 'react';
import { MapPin, Camera, X, Pencil, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { reverseGeocode } from '../lib/travelLog';
import { compressImage } from '../lib/imageUtils';

export default function DayTravelLog({ date, dayLog }) {
  const { addLocation, removeLocation, setDayPhoto } = useApp();

  // dayLog guaranteed shape from parent: { locations: [], photo: null }
  const locations = dayLog?.locations || [];
  const photo     = dayLog?.photo     || null;

  const [geoLoading,  setGeoLoading]  = useState(false);
  const [geoError,    setGeoError]    = useState('');
  const [photoLoading,setPhotoLoading]= useState(false);
  const [showManual,  setShowManual]  = useState(false);
  const [manualName,  setManualName]  = useState('');
  const fileInputRef                  = useRef(null);

  /* ── Geolocation → Nominatim → Firestore ── */
  const handleGeoAdd = async () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported. Use manual entry.');
      setShowManual(true);
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const name = await reverseGeocode(lat, lng);
      await addLocation(date, lat, lng, name);
    } catch (err) {
      setGeoError('Could not get location. Try manual entry.');
      setShowManual(true);
    } finally {
      setGeoLoading(false);
    }
  };

  /* ── Manual add ── */
  const handleManualAdd = async () => {
    const name = manualName.trim();
    if (!name) return;
    await addLocation(date, 0, 0, name);
    setManualName('');
    setShowManual(false);
    setGeoError('');
  };

  /* ── Remove location ── */
  const handleRemove = (id) => removeLocation(date, id);

  /* ── Photo add ── */
  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const dataUrl = await compressImage(file);
      await setDayPhoto(date, dataUrl);
    } finally {
      setPhotoLoading(false);
      e.target.value = '';
    }
  };

  /* ── Photo remove ── */
  const handleRemovePhoto = () => setDayPhoto(date, null);

  return (
    <div className="border-t border-gray-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/60 px-3 py-3 space-y-3">

      {/* ── Locations ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Locations
        </p>

        {/* Chips */}
        {locations.length > 0 && (
          <div className="space-y-1.5 mb-2">
            {locations.map(loc => (
              <div
                key={loc.id}
                className="flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-2.5 py-1.5"
              >
                <MapPin className="w-3 h-3 text-brand-400 flex-shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{loc.name}</span>
                <button
                  onClick={() => handleRemove(loc.id)}
                  className="text-gray-300 dark:text-gray-600 hover:text-rose-400 transition-colors flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Manual input */}
        {showManual && (
          <div className="flex gap-1.5 mb-2">
            <input
              autoFocus
              type="text"
              value={manualName}
              onChange={e => setManualName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleManualAdd();
                if (e.key === 'Escape') { setShowManual(false); setGeoError(''); }
              }}
              placeholder="e.g. Jaipur, Rajasthan"
              className="input-field text-xs py-1.5 flex-1"
            />
            <button
              onClick={handleManualAdd}
              className="px-2.5 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => { setShowManual(false); setGeoError(''); }}
              className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Action buttons */}
        {!showManual && (
          <div className="flex gap-1.5">
            <button
              onClick={handleGeoAdd}
              disabled={geoLoading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 px-2 rounded-lg
                border border-dashed border-brand-300 dark:border-brand-700
                text-brand-500 dark:text-brand-400
                hover:bg-brand-50 dark:hover:bg-brand-900/30
                disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {geoLoading
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Getting location…</>
                : <><MapPin className="w-3 h-3" /> Add Current Location</>
              }
            </button>
            <button
              onClick={() => setShowManual(true)}
              title="Enter location manually"
              className="px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400
                hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}

        {geoError && (
          <p className="text-[10px] text-rose-500 mt-1">{geoError}</p>
        )}
      </div>

      {/* ── Day Photo ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-1">
          <Camera className="w-3 h-3" /> Day Photo <span className="font-normal normal-case">(optional)</span>
        </p>

        {photo ? (
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={photo}
              alt="Day photo"
              className="w-full h-28 object-cover rounded-lg"
            />
            <button
              onClick={handleRemovePhoto}
              className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white
                hover:bg-black/80 transition-colors"
              title="Remove photo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-1.5 text-xs py-2 px-3 rounded-lg
            border border-dashed border-gray-300 dark:border-gray-600
            text-gray-400 dark:text-gray-500
            hover:border-brand-300 hover:text-brand-500
            cursor-pointer transition-colors"
          >
            {photoLoading
              ? <><Loader2 className="w-3 h-3 animate-spin" /> Compressing…</>
              : <><Camera className="w-3 h-3" /> Add Photo</>
            }
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handlePhotoChange}
              disabled={photoLoading}
            />
          </label>
        )}
      </div>
    </div>
  );
}

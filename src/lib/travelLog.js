import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';

/* ─── helpers ────────────────────────────────────────────────── */

function sprintDocRef(username, sprintId) {
  return doc(db, 'sprints', `${username}__${sprintId}`);
}

/**
 * Reverse-geocode lat/lng → "City, State" string via OpenStreetMap Nominatim.
 * Free, no API key required.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await res.json();
    const { suburb, city_district, city, town, village, county, state, country } = data.address || {};
    const localPart = suburb || city_district || city || town || village || county || 'Unknown';
    const regionPart = state || country || '';
    return regionPart ? `${localPart}, ${regionPart}` : localPart;
  } catch {
    return 'Unknown location';
  }
}

/* ─── per-day log helpers ──────────────────────────────────────── */

async function getDayLog(ref, date) {
  const snap = await getDoc(ref);
  const travelLog = snap.data()?.travelLog || {};
  return travelLog[date] || { locations: [], photo: null };
}

/* ─── location ops ─────────────────────────────────────────────── */

/**
 * Add a location pin to a day's travel log.
 * Returns the full updated travelLog map for optimistic state update.
 */
export async function addLocation(username, sprintId, date, lat, lng, name) {
  const ref  = sprintDocRef(username, sprintId);
  const snap = await getDoc(ref);
  const travelLog = snap.data()?.travelLog || {};
  const dayLog    = travelLog[date] || { locations: [], photo: null };
  const newLoc    = { id: uuidv4(), lat, lng, name, addedAt: new Date().toISOString() };
  const updatedDay = { ...dayLog, locations: [...dayLog.locations, newLoc] };
  const updatedLog = { ...travelLog, [date]: updatedDay };
  await updateDoc(ref, { [`travelLog.${date}`]: updatedDay });
  return updatedLog;
}

/**
 * Remove a location pin from a day's travel log.
 * Returns the full updated travelLog map.
 */
export async function removeLocation(username, sprintId, date, locationId) {
  const ref  = sprintDocRef(username, sprintId);
  const snap = await getDoc(ref);
  const travelLog = snap.data()?.travelLog || {};
  const dayLog    = travelLog[date] || { locations: [], photo: null };
  const updatedDay = {
    ...dayLog,
    locations: dayLog.locations.filter(l => l.id !== locationId),
  };
  const updatedLog = { ...travelLog, [date]: updatedDay };
  await updateDoc(ref, { [`travelLog.${date}`]: updatedDay });
  return updatedLog;
}

/* ─── photo ops ────────────────────────────────────────────────── */

/**
 * Set or clear the cover photo for a day (base64 JPEG string or null).
 * Returns the full updated travelLog map.
 */
export async function setDayPhoto(username, sprintId, date, base64OrNull) {
  const ref  = sprintDocRef(username, sprintId);
  const snap = await getDoc(ref);
  const travelLog = snap.data()?.travelLog || {};
  const dayLog    = travelLog[date] || { locations: [], photo: null };
  const updatedDay = { ...dayLog, photo: base64OrNull };
  const updatedLog = { ...travelLog, [date]: updatedDay };
  await updateDoc(ref, { [`travelLog.${date}`]: updatedDay });
  return updatedLog;
}

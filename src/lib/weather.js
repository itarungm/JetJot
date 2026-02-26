import { format, subDays } from 'date-fns';

/**
 * WMO weather code → emoji
 * https://open-meteo.com/en/docs (WMO Weather interpretation codes)
 */
const WMO = {
  0: '☀️',
  1: '🌤️', 2: '⛅', 3: '☁️',
  45: '🌫️', 48: '🌫️',
  51: '🌦️', 53: '🌦️', 55: '🌧️',
  56: '🌧️', 57: '🌧️',
  61: '🌧️', 63: '🌧️', 65: '🌧️',
  66: '🌧️', 67: '🌧️',
  71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌦️', 81: '🌧️', 82: '⛈️',
  85: '🌨️', 86: '🌨️',
  95: '⛈️', 96: '⛈️', 99: '⛈️',
};

function wmoEmoji(code) {
  if (WMO[code] !== undefined) return WMO[code];
  // Nearest lower code fallback
  const sorted = Object.keys(WMO).map(Number).sort((a, b) => b - a);
  const found = sorted.find(k => k <= code);
  return found != null ? WMO[found] : '🌡️';
}

function parseInto(results, data) {
  (data.daily?.time || []).forEach((date, i) => {
    results[date] = {
      emoji: wmoEmoji(data.daily.weathercode[i]),
      max: Math.round(data.daily.temperature_2m_max[i]),
      min: Math.round(data.daily.temperature_2m_min[i]),
    };
  });
}

/**
 * Fetch weather for an entire sprint date range.
 * - Past dates   → archive-api.open-meteo.com (historical, free)
 * - Today/future → api.open-meteo.com (forecast, free)
 * Defaults to centre of India if no coordinates given.
 */
export async function fetchSprintWeather(
  startDate,
  endDate,
  lat = 22.5937,
  lng = 78.9629,
) {
  const today     = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const results   = {};
  const params    = `latitude=${lat}&longitude=${lng}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata`;

  const fetches = [];

  // Past dates — archive API
  if (startDate <= yesterday) {
    const archiveEnd = endDate <= yesterday ? endDate : yesterday;
    fetches.push(
      fetch(
        `https://archive-api.open-meteo.com/v1/archive?${params}&start_date=${startDate}&end_date=${archiveEnd}`,
      )
        .then(r => r.json())
        .then(d => parseInto(results, d))
        .catch(() => {}),
    );
  }

  // Today & future — forecast API
  if (endDate >= today) {
    const forecastStart = startDate >= today ? startDate : today;
    fetches.push(
      fetch(
        `https://api.open-meteo.com/v1/forecast?${params}&start_date=${forecastStart}&end_date=${endDate}`,
      )
        .then(r => r.json())
        .then(d => parseInto(results, d))
        .catch(() => {}),
    );
  }

  await Promise.all(fetches);
  return results; // { 'yyyy-MM-dd': { emoji, max, min } }
}

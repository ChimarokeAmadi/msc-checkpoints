// Weather App: fetches weather data from the free Open-Meteo API (no API key needed)
//   1. Geocoding API: city name -> latitude/longitude
//   2. Forecast API: latitude/longitude -> current weather + 5-day forecast

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const DEFAULT_CITY = 'Tunis';

// ---------- Page elements ----------
const form = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const locationBtn = document.getElementById('location-btn');
const statusEl = document.getElementById('status');
const currentCard = document.getElementById('current');
const forecastSection = document.getElementById('forecast-section');
const forecastEl = document.getElementById('forecast');
const unitButtons = document.querySelectorAll('.unit-btn');

// ---------- App state ----------
let unit = loadSetting('unit', 'C'); // "C" or "F"
let lastResult = null; // the last weather data, so switching °C/°F doesn't need a new request

// ---------- Weather codes (WMO) -> text, icon and background ----------
// Open-Meteo describes the weather with a number. This turns it into something readable.
const WEATHER_CODES = {
  0: ['Clear sky', '☀️', 'clear'],
  1: ['Mainly clear', '🌤️', 'clear'],
  2: ['Partly cloudy', '⛅', 'cloudy'],
  3: ['Overcast', '☁️', 'cloudy'],
  45: ['Fog', '🌫️', 'cloudy'],
  48: ['Freezing fog', '🌫️', 'cloudy'],
  51: ['Light drizzle', '🌦️', 'rain'],
  53: ['Drizzle', '🌦️', 'rain'],
  55: ['Heavy drizzle', '🌧️', 'rain'],
  56: ['Freezing drizzle', '🌧️', 'rain'],
  57: ['Heavy freezing drizzle', '🌧️', 'rain'],
  61: ['Light rain', '🌦️', 'rain'],
  63: ['Rain', '🌧️', 'rain'],
  65: ['Heavy rain', '🌧️', 'rain'],
  66: ['Freezing rain', '🌧️', 'rain'],
  67: ['Heavy freezing rain', '🌧️', 'rain'],
  71: ['Light snow', '🌨️', 'snow'],
  73: ['Snow', '🌨️', 'snow'],
  75: ['Heavy snow', '❄️', 'snow'],
  77: ['Snow grains', '🌨️', 'snow'],
  80: ['Light showers', '🌦️', 'rain'],
  81: ['Showers', '🌧️', 'rain'],
  82: ['Violent showers', '⛈️', 'storm'],
  85: ['Snow showers', '🌨️', 'snow'],
  86: ['Heavy snow showers', '❄️', 'snow'],
  95: ['Thunderstorm', '⛈️', 'storm'],
  96: ['Thunderstorm with hail', '⛈️', 'storm'],
  99: ['Thunderstorm with heavy hail', '⛈️', 'storm'],
};

function describeWeather(code, isDay = true) {
  const [text, icon, theme] = WEATHER_CODES[code] ?? ['Unknown', '🌡️', 'default'];
  // at night, no sun: a moon for clear skies, a cloud for partly cloudy, and a dark background
  const NIGHT_ICONS = { 0: '🌙', 1: '🌙', 2: '☁️' };
  if (!isDay && code in NIGHT_ICONS) return { text, icon: NIGHT_ICONS[code], theme: 'night' };
  return { text, icon, theme };
}

// ---------- Fetching data ----------

/** fetch() + error handling + JSON parsing in one place */
async function getJson(url) {
  let response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Could not reach the weather service. Check your internet connection.');
  }
  if (!response.ok) {
    throw new Error(`The weather service answered with an error (${response.status}). Please try again.`);
  }
  return response.json();
}

/** City name -> { name, country, region, latitude, longitude } */
async function findCity(name) {
  const url = `${GEOCODING_URL}?name=${encodeURIComponent(name)}&count=1&language=en&format=json`;
  const data = await getJson(url);
  if (!data.results || data.results.length === 0) {
    throw new Error(`No city called "${name}" was found. Check the spelling and try again.`);
  }
  const place = data.results[0];
  return {
    name: place.name,
    country: place.country ?? '',
    region: place.admin1 && place.admin1 !== place.name ? place.admin1 : '', // skip "Lagos, Lagos"
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

/** Coordinates -> current weather and 5-day forecast (always fetched in °C and km/h) */
async function getWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '5',
  });
  return getJson(`${FORECAST_URL}?${params}`);
}

// ---------- Main actions ----------

async function searchCity(cityName) {
  const name = cityName.trim();
  if (!name) {
    showStatus('Please type a city name.', true);
    return;
  }

  setLoading(true, `Searching for ${name}...`);
  try {
    const place = await findCity(name);
    const weather = await getWeather(place.latitude, place.longitude);
    lastResult = { place, weather };
    render();
    saveSetting('lastCity', place.name);
    showStatus('');
  } catch (error) {
    console.warn(error.message); // a warning, not an error: "city not found" is an expected situation
    showStatus(error.message, true);
  } finally {
    setLoading(false);
  }
}

function searchMyLocation() {
  if (!('geolocation' in navigator)) {
    showStatus('Your browser does not support geolocation.', true);
    return;
  }

  setLoading(true, 'Finding your location...');
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const weather = await getWeather(coords.latitude, coords.longitude);
        lastResult = {
          place: {
            name: 'Your location',
            country: '',
            region: `${coords.latitude.toFixed(2)}°, ${coords.longitude.toFixed(2)}°`,
          },
          weather,
        };
        render();
        showStatus('');
      } catch (error) {
        showStatus(error.message, true);
      } finally {
        setLoading(false);
      }
    },
    () => {
      setLoading(false);
      showStatus('Location permission was denied. Search for a city instead.', true);
    },
    { timeout: 10000 }
  );
}

// ---------- Displaying the data ----------

const toUnit = (celsius) => (unit === 'F' ? (celsius * 9) / 5 + 32 : celsius);
const formatTemp = (celsius) => `${Math.round(toUnit(celsius))}°${unit}`;
const formatWind = (kmh) => (unit === 'F' ? `${Math.round(kmh / 1.609)} mph` : `${Math.round(kmh)} km/h`);

function render() {
  if (!lastResult) return;
  const { place, weather } = lastResult;
  const { current, daily } = weather;
  const { text, icon, theme } = describeWeather(current.weather_code, current.is_day === 1);

  // Current weather
  document.getElementById('city-name').textContent = [place.name, place.country].filter(Boolean).join(', ');
  document.getElementById('local-time').textContent = [place.region, `Local time ${formatLocalTime(current.time)}`]
    .filter(Boolean)
    .join(' · ');
  document.getElementById('weather-icon').textContent = icon;
  document.getElementById('temperature').textContent = formatTemp(current.temperature_2m);
  document.getElementById('description').textContent = text;
  document.getElementById('high-low').textContent =
    `H: ${formatTemp(daily.temperature_2m_max[0])}  ·  L: ${formatTemp(daily.temperature_2m_min[0])}`;
  document.getElementById('feels-like').textContent = formatTemp(current.apparent_temperature);
  document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
  document.getElementById('wind').textContent = formatWind(current.wind_speed_10m);

  // 5-day forecast
  forecastEl.innerHTML = '';
  daily.time.forEach((date, i) => {
    const day = describeWeather(daily.weather_code[i]);
    const card = document.createElement('article');
    card.className = 'day';
    card.innerHTML = `
      <p class="name">${i === 0 ? 'Today' : formatDay(date)}</p>
      <div class="icon" title="${day.text}">${day.icon}</div>
      <p class="temps"><span class="max">${formatTemp(daily.temperature_2m_max[i])}</span>
        <span class="min">${formatTemp(daily.temperature_2m_min[i])}</span></p>`;
    forecastEl.appendChild(card);
  });

  document.body.className = `theme-${theme}`;
  document.title = `${formatTemp(current.temperature_2m)} ${place.name} | Weather App`;
  currentCard.classList.remove('hidden');
  forecastSection.classList.remove('hidden');
}

// "2026-11-05T20:00" is already in the city's local time (timezone=auto), so just show the hour
function formatLocalTime(isoTime) {
  const [datePart, timePart] = isoTime.split('T');
  const date = new Date(`${datePart}T12:00:00`);
  return `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}, ${timePart}`;
}

function formatDay(isoDate) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
}

// ---------- Small UI helpers ----------

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError && message !== '');
}

function setLoading(isLoading, message = '') {
  form.querySelectorAll('button').forEach((btn) => (btn.disabled = isLoading));
  if (isLoading) showStatus(message);
}

function setUnit(newUnit) {
  unit = newUnit;
  saveSetting('unit', unit);
  unitButtons.forEach((btn) => {
    const active = btn.dataset.unit === unit;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  render(); // re-display the same data in the new unit, no new request needed
}

// localStorage can be blocked (private mode), so never let it break the app
function loadSetting(key, fallback) {
  try {
    return localStorage.getItem(`weather-app:${key}`) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key, value) {
  try {
    localStorage.setItem(`weather-app:${key}`, value);
  } catch {
    // ignore
  }
}

// ---------- Event listeners ----------

form.addEventListener('submit', (event) => {
  event.preventDefault(); // don't reload the page
  searchCity(cityInput.value);
});

locationBtn.addEventListener('click', searchMyLocation);

unitButtons.forEach((btn) => btn.addEventListener('click', () => setUnit(btn.dataset.unit)));

// ---------- Start: show the last searched city (or Tunis) ----------
setUnit(unit);
const startCity = loadSetting('lastCity', DEFAULT_CITY);
cityInput.value = startCity;
searchCity(startCity);

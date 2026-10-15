import React, { useState, useEffect, useRef } from 'react';
import { Wind, Droplets, Eye, Thermometer, AlertTriangle, CheckCircle, CloudRain, Sun, Cloud, CloudSnow, CloudLightning, CloudDrizzle, CloudFog, RefreshCw, MapPin } from 'lucide-react';

// ─── Open-Meteo WMO Code → Condition mapping ───────────────────────────────
const WMO_CONDITIONS = {
  0:  { label: 'Clear Sky',           icon: '☀️',  severity: 'clear'  },
  1:  { label: 'Mainly Clear',        icon: '🌤️',  severity: 'clear'  },
  2:  { label: 'Partly Cloudy',       icon: '⛅',  severity: 'clear'  },
  3:  { label: 'Overcast',            icon: '☁️',  severity: 'cloudy' },
  45: { label: 'Foggy',               icon: '🌫️',  severity: 'caution'},
  48: { label: 'Icy Fog',             icon: '🌫️',  severity: 'caution'},
  51: { label: 'Light Drizzle',       icon: '🌦️',  severity: 'caution'},
  53: { label: 'Drizzle',             icon: '🌦️',  severity: 'caution'},
  55: { label: 'Heavy Drizzle',       icon: '🌧️',  severity: 'rain'   },
  61: { label: 'Light Rain',          icon: '🌧️',  severity: 'rain'   },
  63: { label: 'Rain',                icon: '🌧️',  severity: 'rain'   },
  65: { label: 'Heavy Rain',          icon: '🌧️',  severity: 'danger' },
  71: { label: 'Light Snow',          icon: '🌨️',  severity: 'caution'},
  73: { label: 'Snow',                icon: '❄️',   severity: 'danger' },
  75: { label: 'Heavy Snow',          icon: '❄️',   severity: 'danger' },
  77: { label: 'Snow Grains',         icon: '🌨️',  severity: 'caution'},
  80: { label: 'Light Showers',       icon: '🌦️',  severity: 'caution'},
  81: { label: 'Rain Showers',        icon: '🌧️',  severity: 'rain'   },
  82: { label: 'Heavy Rain Showers',  icon: '⛈️',   severity: 'danger' },
  85: { label: 'Snow Showers',        icon: '🌨️',  severity: 'danger' },
  95: { label: 'Thunderstorm',        icon: '⛈️',   severity: 'danger' },
  96: { label: 'Thunderstorm + Hail', icon: '⛈️',   severity: 'danger' },
  99: { label: 'Severe Thunderstorm', icon: '🌪️',  severity: 'danger' },
};

// ─── Known freight route waypoints ─────────────────────────────────────────
const ROUTE_WAYPOINTS = {
  'HYD-GOA': ['Kalaburagi', 'Hubli'],
  'GOA-HYD': ['Hubli', 'Kalaburagi'],
  'HYD-MUM': ['Pune'],
  'MUM-HYD': ['Pune'],
  'DEL-MUM': ['Nagpur'],
  'MUM-DEL': ['Nagpur'],
  'DEL-BAN': ['Nagpur', 'Pune'],
  'BAN-DEL': ['Pune', 'Nagpur'],
  'DEL-CHE': ['Nagpur', 'Hyderabad'],
  'CHE-DEL': ['Hyderabad', 'Nagpur'],
  'HYD-CHE': [],
  'CHE-HYD': [],
  'MUM-BAN': ['Pune'],
  'BAN-MUM': ['Pune'],
  'HYD-BAN': [],
  'BAN-HYD': [],
  'DEL-KOL': ['Varanasi'],
  'KOL-DEL': ['Varanasi'],
};

// City short code helpers
const CITY_SHORT = (city = '') => {
  const c = city.trim().toLowerCase();
  if (c.includes('hyderabad'))  return 'HYD';
  if (c.includes('goa') || c.includes('panaji') || c.includes('vasco')) return 'GOA';
  if (c.includes('mumbai') || c.includes('bombay')) return 'MUM';
  if (c.includes('delhi') || c.includes('new delhi')) return 'DEL';
  if (c.includes('bangalore') || c.includes('bengaluru')) return 'BAN';
  if (c.includes('chennai') || c.includes('madras')) return 'CHE';
  if (c.includes('kolkata') || c.includes('calcutta')) return 'KOL';
  if (c.includes('pune'))   return 'PUN';
  if (c.includes('nagpur')) return 'NAG';
  if (c.includes('hubli'))  return 'HUB';
  if (c.includes('kalaburagi') || c.includes('gulbarga')) return 'KBG';
  return city.trim().substring(0, 3).toUpperCase();
};

const getWaypoints = (origin, destination) => {
  const key = `${CITY_SHORT(origin)}-${CITY_SHORT(destination)}`;
  return ROUTE_WAYPOINTS[key] || [];
};

// ─── Severity config for UI ─────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  clear:   { bg: 'hsla(142, 60%, 18%, 0.6)', border: 'hsla(142, 60%, 35%, 0.5)', badge: '#22c55e', label: 'Clear & Safe'      },
  cloudy:  { bg: 'hsla(220, 30%, 18%, 0.6)', border: 'hsla(220, 30%, 40%, 0.5)', badge: '#94a3b8', label: 'Cloudy'            },
  caution: { bg: 'hsla(38,  80%, 15%, 0.6)', border: 'hsla(38,  80%, 40%, 0.4)', badge: '#f59e0b', label: 'Caution Advised'   },
  rain:    { bg: 'hsla(215, 70%, 18%, 0.6)', border: 'hsla(215, 70%, 40%, 0.5)', badge: '#3b82f6', label: 'Rain Expected'     },
  danger:  { bg: 'hsla(0,   65%, 18%, 0.6)', border: 'hsla(0,   65%, 40%, 0.4)', badge: '#ef4444', label: 'Severe — Drive Safe'},
};

// ─── Geocode a city name → { lat, lon } ────────────────────────────────────
const geocodeCity = async (city) => {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
  );
  const data = await res.json();
  if (!data.results?.length) throw new Error(`City not found: ${city}`);
  const { latitude, longitude, name, country } = data.results[0];
  return { lat: latitude, lon: longitude, name, country };
};

// ─── Fetch weather for lat/lon ──────────────────────────────────────────────
const fetchWeather = async (lat, lon) => {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,visibility` +
    `&hourly=precipitation&forecast_days=1&timezone=Asia%2FKolkata`
  );
  const data = await res.json();
  const c = data.current;
  // Sum next 6 hours precipitation
  const now = new Date();
  const currentHour = now.getHours();
  const precip6h = data.hourly?.precipitation
    ?.slice(currentHour, currentHour + 6)
    ?.reduce((a, b) => a + (b || 0), 0) || 0;

  return {
    temp:        Math.round(c.temperature_2m),
    feelsLike:   Math.round(c.apparent_temperature),
    humidity:    c.relative_humidity_2m,
    windSpeed:   Math.round(c.wind_speed_10m),
    visibility:  c.visibility ? Math.round(c.visibility / 1000) : null,
    weatherCode: c.weather_code,
    precip6h:    Math.round(precip6h * 10) / 10,
  };
};

// ─── Overall banner severity for the route ─────────────────────────────────
const ORDER = ['clear', 'cloudy', 'caution', 'rain', 'danger'];
const worstSeverity = (stops) => {
  let worst = 'clear';
  for (const s of stops) {
    if (!s.weather) continue;
    const cond = WMO_CONDITIONS[s.weather.weatherCode] || WMO_CONDITIONS[0];
    if (ORDER.indexOf(cond.severity) > ORDER.indexOf(worst)) worst = cond.severity;
  }
  return worst;
};

// ─── Single Stop Card ───────────────────────────────────────────────────────
function StopCard({ stop, isFirst, isLast, index, total }) {
  if (stop.loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={14} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
      <div>
        <div style={{ fontWeight: '600', fontSize: '0.82rem' }}>{stop.city}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Fetching weather…</div>
      </div>
    </div>
  );

  if (stop.error) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'hsla(0,40%,14%,0.5)', borderRadius: '10px', border: '1px dashed hsla(0,50%,40%,0.4)' }}>
      <span style={{ fontSize: '1.2rem' }}>⚠️</span>
      <div>
        <div style={{ fontWeight: '600', fontSize: '0.82rem' }}>{stop.city}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--accent-danger)' }}>Unable to fetch weather</div>
      </div>
    </div>
  );

  const { weather } = stop;
  const condition = WMO_CONDITIONS[weather.weatherCode] || WMO_CONDITIONS[0];
  const sev = SEVERITY_CONFIG[condition.severity];

  return (
    <div style={{
      background: sev.bg,
      border: `1px solid ${sev.border}`,
      borderRadius: '10px',
      padding: '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Stop label */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={12} color={sev.badge} />
          <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>
            {isFirst ? '🟢 ' : isLast ? '🏁 ' : '📍 '}
            {stop.city}
          </span>
          {(isFirst || isLast) && (
            <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
              {isFirst ? 'ORIGIN' : 'DESTINATION'}
            </span>
          )}
          {!isFirst && !isLast && (
            <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: '4px', color: 'var(--text-secondary)' }}>
              WAYPOINT
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{condition.icon}</span>
          <span style={{
            fontSize: '0.65rem', fontWeight: '700', padding: '2px 7px',
            borderRadius: '4px', background: sev.badge, color: '#fff',
            letterSpacing: '0.03em'
          }}>{sev.label}</span>
        </div>
      </div>

      {/* Condition label */}
      <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>
        {condition.label}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {[
          { icon: <Thermometer size={11} />, label: 'Temp',   value: `${weather.temp}°C` },
          { icon: <Droplets    size={11} />, label: 'Humidity', value: `${weather.humidity}%` },
          { icon: <Wind        size={11} />, label: 'Wind',   value: `${weather.windSpeed} km/h` },
          { icon: <CloudRain   size={11} />, label: 'Rain 6h', value: `${weather.precip6h} mm` },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-void)', borderRadius: '6px',
            padding: '5px 6px', textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px', color: 'var(--text-muted)', marginBottom: '2px' }}>
              {stat.icon}
              <span style={{ fontSize: '0.6rem' }}>{stat.label}</span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Visibility */}
      {weather.visibility !== null && (
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Eye size={10} />
          Visibility: <strong style={{ color: weather.visibility < 1 ? '#ef4444' : 'var(--text-primary)' }}>
            {weather.visibility < 1 ? '< 1 km — Fog Risk' : `${weather.visibility} km`}
          </strong>
          {weather.feelsLike !== weather.temp && (
            <span style={{ marginLeft: 'auto' }}>Feels like <strong>{weather.feelsLike}°C</strong></span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function RouteWeatherPanel({ origin, destination }) {
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const debounceRef = useRef(null);

  const fetchRouteWeather = async (orig, dest) => {
    if (!orig?.trim() || !dest?.trim() || orig.trim().length < 3 || dest.trim().length < 3) return;

    setLoading(true);

    const waypoints  = getWaypoints(orig, dest);
    const allCities  = [orig, ...waypoints, dest];
    const initialStops = allCities.map(city => ({ city, loading: true, error: false, weather: null }));
    setStops(initialStops);

    // Fetch each city weather in parallel
    const results = await Promise.allSettled(
      allCities.map(async (city) => {
        const geo  = await geocodeCity(city);
        const wth  = await fetchWeather(geo.lat, geo.lon);
        return { city: geo.name || city, loading: false, error: false, weather: wth };
      })
    );

    const resolved = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { city: allCities[i], loading: false, error: true, weather: null }
    );

    setStops(resolved);
    setLastFetched(new Date());
    setLoading(false);
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchRouteWeather(origin, destination);
    }, 900);
    return () => clearTimeout(debounceRef.current);
  }, [origin, destination]);

  if (!origin?.trim() || !destination?.trim()) return null;

  const severity   = worstSeverity(stops);
  const sevConfig  = SEVERITY_CONFIG[severity];

  const BANNER_ICONS = {
    clear:   <CheckCircle size={16} color="#22c55e" />,
    cloudy:  <Cloud       size={16} color="#94a3b8" />,
    caution: <CloudFog    size={16} color="#f59e0b" />,
    rain:    <CloudDrizzle size={16} color="#3b82f6" />,
    danger:  <AlertTriangle size={16} color="#ef4444" />,
  };

  const BANNER_MSGS = {
    clear:   'Route looks clear — safe to dispatch!',
    cloudy:  'Mostly cloudy skies along the route.',
    caution: 'Fog or drizzle possible — drive carefully.',
    rain:    'Rain expected on route — check load cover.',
    danger:  'Severe weather on route — consider delay or extra precautions.',
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ background: 'hsla(210, 80%, 25%, 0.5)', padding: '7px', borderRadius: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🛣️</span>
          </div>
          <div>
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', margin: 0 }}>Route Weather Advisory</h3>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', margin: 0 }}>
              {origin} → {destination}
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchRouteWeather(origin, destination)}
          disabled={loading}
          title="Refresh weather"
          style={{
            background: 'var(--bg-void)', border: '1px solid var(--border-subtle)',
            borderRadius: '6px', padding: '5px 8px', cursor: loading ? 'not-allowed' : 'pointer',
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem'
          }}
        >
          <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Overall banner */}
      {stops.length > 0 && !stops.every(s => s.loading) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 14px', borderRadius: '8px', marginBottom: '14px',
          background: sevConfig.bg, border: `1px solid ${sevConfig.border}`,
        }}>
          {BANNER_ICONS[severity]}
          <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>
            {BANNER_MSGS[severity]}
          </span>
        </div>
      )}

      {/* Stops */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {stops.map((stop, i) => (
          <StopCard
            key={i}
            stop={stop}
            index={i}
            total={stops.length}
            isFirst={i === 0}
            isLast={i === stops.length - 1}
          />
        ))}
      </div>

      {/* Footer */}
      {lastFetched && (
        <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'right' }}>
          Updated: {lastFetched.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST · Powered by Open-Meteo
        </p>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

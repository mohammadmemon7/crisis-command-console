/**
 * OpenCage geocoding — converts place names to coordinates.
 * Set GEOCODE_API_KEY (or OPENCAGE_API_KEY) in .env — OpenCage API key.
 */

const FALLBACK = { lat: 19.0760, lng: 72.8777 };

function getApiKey() {
  return process.env.GEOCODE_API_KEY || process.env.OPENCAGE_API_KEY;
}

async function geocodeLocation(locationString) {
  const key = getApiKey();
  const q = `${String(locationString || '').trim()}, Mumbai, India`;

  try {
    if (!key) {
      console.warn('[geocoder] GEOCODE_API_KEY / OPENCAGE_API_KEY missing — using Mumbai fallback');
      console.log('[geocoder] result (fallback):', FALLBACK);
      return { ...FALLBACK };
    }

    const url = new URL('https://api.opencagedata.com/geocode/v1/json');
    url.searchParams.set('q', q);
    url.searchParams.set('key', key);
    url.searchParams.set('limit', '1');
    url.searchParams.set('countrycode', 'in');

    const res = await fetch(url.toString());
    if (!res.ok) {
      console.warn('[geocoder] HTTP', res.status, '— using fallback');
      console.log('[geocoder] result (fallback):', FALLBACK);
      return { ...FALLBACK };
    }

    const data = await res.json();
    const first = data.results && data.results[0];
    const lat = first?.geometry?.lat;
    const lng = first?.geometry?.lng;

    if (lat == null || lng == null || Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
      console.warn('[geocoder] empty or invalid results — using fallback');
      console.log('[geocoder] result (fallback):', FALLBACK);
      return { ...FALLBACK };
    }

    const out = { lat: Number(lat), lng: Number(lng) };
    console.log('[geocoder] result:', out);
    return out;
  } catch (err) {
    console.error('[geocoder] error:', err.message);
    console.log('[geocoder] result (fallback):', FALLBACK);
    return { ...FALLBACK };
  }
}

module.exports = { geocodeLocation };

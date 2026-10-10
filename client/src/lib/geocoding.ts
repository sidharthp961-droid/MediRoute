// ─── Location Geocoding & Coordinate Parsing Service ───
import type { Coordinates } from '@/types';

export interface GeocodingResult {
  displayName: string;
  coords: Coordinates;
  type?: string;
  source: 'nominatim' | 'coordinates';
}

/**
 * Checks if a string looks like a coordinate pair: "lat, lng" or "lat lng"
 */
export function parseCoordinateString(query: string): Coordinates | null {
  const clean = query.trim();
  // Match "9.8959, 76.7184" or "9.8959 76.7184" or "9.8959,76.7184"
  const match = clean.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;

  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);

  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

/**
 * Searches for a location using OpenStreetMap Nominatim with Kerala priority bounding box.
 * Free public API without API keys.
 */
export async function searchLocationOSM(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodingResult[]> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return [];

  // Check if user entered direct coordinates first
  const parsed = parseCoordinateString(clean);
  if (parsed) {
    return [
      {
        displayName: `Coordinates: ${parsed.lat.toFixed(5)}°N, ${parsed.lng.toFixed(5)}°E`,
        coords: parsed,
        type: 'coordinate_input',
        source: 'coordinates',
      },
    ];
  }

  // Query OpenStreetMap Nominatim
  // Prioritize Kerala corridor (viewbox approx 75.8, 9.2 to 77.3, 10.5)
  const encodedQuery = encodeURIComponent(clean);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=in&viewbox=75.8,10.5,77.3,9.2&bounded=0&limit=5`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(url, {
      signal: signal || controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Geocoding service returned status ${res.status}`);
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data.map((item: any) => ({
      displayName: item.display_name || clean,
      coords: {
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
      },
      type: item.type || item.class,
      source: 'nominatim',
    }));
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Location search request timed out. You can click on the map directly.');
    }
    throw err;
  }
}

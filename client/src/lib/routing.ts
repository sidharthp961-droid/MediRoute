// ─── Kerala Road Routing Service via OSRM ───
import type { Coordinates } from '@/types';

export interface KeralaCorridor {
  id: string;
  name: string;
  shortName: string;
  highway: string;
  origin: {
    name: string;
    town: string;
    coords: Coordinates;
  };
  destination: {
    name: string;
    town: string;
    coords: Coordinates;
  };
  description: string;
}

export interface RouteGeometry {
  coordinates: [number, number][]; // Leaflet format: [lat, lng]
}

export interface RouteStep {
  instruction: string;
  name: string;
  distanceMetres: number;
  durationSeconds: number;
  type: string;
  modifier?: string;
  location: [number, number]; // Leaflet format: [lat, lng]
}

export interface RouteOption {
  id: string;
  index: number;
  distanceMetres: number;
  distanceKm: string;
  durationSeconds: number;
  durationMinutes: string;
  summary: string;
  coordinates: [number, number][]; // Leaflet format: [lat, lng]
  weightName?: string;
  isPrimary: boolean;
  steps?: RouteStep[];
}

export interface RoutingResult {
  corridorId?: string;
  origin: Coordinates;
  destination: Coordinates;
  originLabel?: string;
  destinationLabel?: string;
  routes: RouteOption[];
  selectedRouteIndex: number;
  fetchedAt: number;
  provider: 'OSRM (OpenStreetMap Roads)';
  disclaimer: string;
}

// ── Priority Corridors in Kerala ──
export const KERALA_CORRIDORS: KeralaCorridor[] = [
  {
    id: 'thodupuzha-ernakulam',
    name: 'Thodupuzha → Ernakulam (Kochi)',
    shortName: 'Kochi (Ernakulam)',
    highway: 'SH 8 / SH 41 via Muvattupuzha & Thrippunithura',
    origin: {
      name: 'District Hospital Thodupuzha',
      town: 'Thodupuzha',
      coords: { lat: 9.8959, lng: 76.7184 },
    },
    destination: {
      name: 'General Hospital / Aster Medcity',
      town: 'Ernakulam (Kochi)',
      coords: { lat: 9.9816, lng: 76.2999 },
    },
    description: 'Major arterial corridor connecting Idukki foothills to Kochi tertiary care hospitals.',
  },
  {
    id: 'thodupuzha-kottayam',
    name: 'Thodupuzha → Kottayam',
    shortName: 'Kottayam',
    highway: 'SH 8 / MC Road via Pala & Ettumanoor',
    origin: {
      name: 'District Hospital Thodupuzha',
      town: 'Thodupuzha',
      coords: { lat: 9.8959, lng: 76.7184 },
    },
    destination: {
      name: 'Govt Medical College Kottayam (Gandhinagar)',
      town: 'Kottayam',
      coords: { lat: 9.5916, lng: 76.5222 },
    },
    description: 'Fast link to Kottayam Medical College and specialized trauma centres.',
  },
  {
    id: 'thodupuzha-muvattupuzha',
    name: 'Thodupuzha → Muvattupuzha',
    shortName: 'Muvattupuzha',
    highway: 'SH 8 (Thodupuzha - Muvattupuzha Highway)',
    origin: {
      name: 'District Hospital Thodupuzha',
      town: 'Thodupuzha',
      coords: { lat: 9.8959, lng: 76.7184 },
    },
    destination: {
      name: 'General Hospital Muvattupuzha',
      town: 'Muvattupuzha',
      coords: { lat: 9.9894, lng: 76.5790 },
    },
    description: 'High-density link to the central Ernakulam district junction.',
  },
  {
    id: 'thodupuzha-perumbavoor',
    name: 'Thodupuzha → Perumbavoor',
    shortName: 'Perumbavoor',
    highway: 'SH 8 / AM Road via Muvattupuzha',
    origin: {
      name: 'District Hospital Thodupuzha',
      town: 'Thodupuzha',
      coords: { lat: 9.8959, lng: 76.7184 },
    },
    destination: {
      name: 'Taluk Hospital Perumbavoor',
      town: 'Perumbavoor',
      coords: { lat: 10.1076, lng: 76.4732 },
    },
    description: 'Direct medical transfer route toward northern Ernakulam and Aluva bypass.',
  },
  {
    id: 'thodupuzha-pala',
    name: 'Thodupuzha → Pala',
    shortName: 'Pala',
    highway: 'SH 8 / Pala Main Road via Kollapally',
    origin: {
      name: 'District Hospital Thodupuzha',
      town: 'Thodupuzha',
      coords: { lat: 9.8959, lng: 76.7184 },
    },
    destination: {
      name: 'Mar Sleeva Medicity / General Hospital',
      town: 'Pala',
      coords: { lat: 9.7124, lng: 76.6834 },
    },
    description: 'Direct route to Mar Sleeva Medicity multi-specialty care in Cherpumkal-Pala.',
  },
  {
    id: 'thodupuzha-idukki',
    name: 'Thodupuzha → Idukki (Painavu)',
    shortName: 'Idukki (Painavu)',
    highway: 'SH 33 / Hill Highway via Vannappuram & Chelachuvadu',
    origin: {
      name: 'District Hospital Thodupuzha',
      town: 'Thodupuzha',
      coords: { lat: 9.8959, lng: 76.7184 },
    },
    destination: {
      name: 'Govt Medical College Idukki (Painavu)',
      town: 'Idukki',
      coords: { lat: 9.8492, lng: 76.9744 },
    },
    description: 'High-altitude ghat corridor connecting Thodupuzha with Idukki Medical College.',
  },
];

// In-memory route cache to avoid hammering OSRM on repeated renders or minor movements
const routeCache = new Map<string, RoutingResult>();

function getCacheKey(origin: Coordinates, destination: Coordinates): string {
  return `${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}->${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`;
}

/**
 * Fetch real road route from public OSRM API following OpenStreetMap roads.
 * Includes alternative routes if available.
 */
export async function fetchRoadRoute(
  origin: Coordinates,
  destination: Coordinates,
  options?: {
    corridorId?: string;
    originLabel?: string;
    destinationLabel?: string;
    bypassCache?: boolean;
  },
): Promise<RoutingResult> {
  const cacheKey = getCacheKey(origin, destination);

  if (!options?.bypassCache && routeCache.has(cacheKey)) {
    const cached = routeCache.get(cacheKey)!;
    return {
      ...cached,
      originLabel: options?.originLabel || cached.originLabel,
      destinationLabel: options?.destinationLabel || cached.destinationLabel,
      corridorId: options?.corridorId || cached.corridorId,
    };
  }

  // OSRM format: /driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson&alternatives=true&steps=true
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng.toFixed(5)},${origin.lat.toFixed(5)};${destination.lng.toFixed(5)},${destination.lat.toFixed(5)}?overview=full&geometries=geojson&alternatives=true&steps=true`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`OSRM routing service responded with HTTP status ${res.status}`);
    }

    const data = await res.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(data.message || 'No drivable road route found between selected coordinates.');
    }

    // Parse routes
    const routes: RouteOption[] = data.routes.map((r: any, idx: number) => {
      // OSRM geojson coordinates are [lng, lat]. Leaflet requires [lat, lng].
      const leafletCoords: [number, number][] = (r.geometry?.coordinates || []).map(
        (c: [number, number]) => [c[1], c[0]],
      );

      const distanceKm = (r.distance / 1000).toFixed(1);
      const durationMinutes = Math.round(r.duration / 60).toString();

      // Parse turn maneuvers and route steps
      const steps: RouteStep[] = (r.legs?.[0]?.steps || []).map((s: any) => {
        const maneuver = s.maneuver || {};
        const stepLocation: [number, number] = maneuver.location
          ? [maneuver.location[1], maneuver.location[0]]
          : [0, 0];

        let instruction = s.name ? `Proceed onto ${s.name}` : 'Continue on road';
        if (maneuver.type === 'depart') {
          instruction = s.name ? `Depart on ${s.name}` : 'Depart towards destination';
        } else if (maneuver.type === 'arrive') {
          instruction = 'Arrive at destination healthcare facility';
        } else if (maneuver.type === 'turn') {
          instruction = `Turn ${maneuver.modifier || ''} ${s.name ? `onto ${s.name}` : ''}`.trim();
        } else if (maneuver.type === 'roundabout') {
          instruction = `Enter roundabout and take exit ${s.name ? `onto ${s.name}` : ''}`.trim();
        } else if (maneuver.type === 'fork') {
          instruction = `Keep ${maneuver.modifier || ''} at the fork ${s.name ? `onto ${s.name}` : ''}`.trim();
        } else if (maneuver.modifier) {
          instruction = `${maneuver.modifier} ${s.name ? `onto ${s.name}` : ''}`.trim();
        }

        return {
          instruction,
          name: s.name || '',
          distanceMetres: Math.round(s.distance || 0),
          durationSeconds: Math.round(s.duration || 0),
          type: maneuver.type || 'turn',
          modifier: maneuver.modifier,
          location: stepLocation,
        };
      });

      return {
        id: `route-${idx}`,
        index: idx,
        distanceMetres: Math.round(r.distance),
        distanceKm: `${distanceKm} km`,
        durationSeconds: Math.round(r.duration),
        durationMinutes: `${durationMinutes} mins`,
        summary: r.legs?.[0]?.summary || (idx === 0 ? 'Primary highway route' : `Alternative route ${idx}`),
        coordinates: leafletCoords,
        weightName: r.weight_name,
        isPrimary: idx === 0,
        steps,
      };
    });

    const result: RoutingResult = {
      corridorId: options?.corridorId,
      origin,
      destination,
      originLabel: options?.originLabel,
      destinationLabel: options?.destinationLabel,
      routes,
      selectedRouteIndex: 0,
      fetchedAt: Date.now(),
      provider: 'OSRM (OpenStreetMap Roads)',
      disclaimer: 'Actual road routing geometry via OpenStreetMap / OSRM. Driving duration is estimated using standard highway speed limits; does not reflect real-time live traffic congestion or signal delays.',
    };

    // Cache the result
    routeCache.set(cacheKey, result);

    return result;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Routing service request timed out (12s). Check internet connectivity.');
    }
    throw err;
  }
}

/**
 * Get corridor by ID
 */
export function getKeralaCorridor(id: string): KeralaCorridor | undefined {
  return KERALA_CORRIDORS.find((c) => c.id === id);
}

/**
 * Default Kerala center (Thodupuzha)
 */
export const KERALA_CENTER: Coordinates = {
  lat: 9.8959,
  lng: 76.7184,
};

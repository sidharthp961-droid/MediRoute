// ─── Haversine distance and server-authoritative geofence logic ───

import { Coordinates } from './types';

const EARTH_RADIUS_M = 6_371_000; // Earth mean radius in metres

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Validates that coordinate values are numeric, finite, and within valid geographic bounds.
 * Latitude must be in [-90, 90], Longitude in [-180, 180].
 */
export function isValidCoordinates(coords: unknown): coords is Coordinates {
  if (!coords || typeof coords !== 'object') return false;
  const c = coords as Record<string, unknown>;
  if (typeof c.lat !== 'number' || typeof c.lng !== 'number') return false;
  if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) return false;
  if (c.lat < -90 || c.lat > 90) return false;
  if (c.lng < -180 || c.lng > 180) return false;
  return true;
}

/**
 * Calculates great-circle Haversine distance between two coordinates in metres.
 * Uses numerical clamping to prevent floating-point asin NaN edge cases.
 */
export function haversineDistance(a: Coordinates, b: Coordinates): number {
  if (!isValidCoordinates(a) || !isValidCoordinates(b)) {
    throw new Error('haversineDistance: Invalid coordinates provided');
  }

  // Exact identical coordinates optimization
  if (a.lat === b.lat && a.lng === b.lng) {
    return 0;
  }

  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLng = Math.sin(dLng / 2);

  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      sinHalfDLng *
      sinHalfDLng;

  // Clamp h to [0, 1] to avoid Math.asin(>1) returning NaN due to floating-point rounding
  const safeH = Math.min(1, Math.max(0, h));
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(safeH));
}

/**
 * BOUNDARY RULE: Inclusive 1,000-metre threshold.
 * Returns true if the distance between center and point is <= radiusM.
 * Exactly 1,000.0m is considered IN-BOUNDS (eligible).
 * Greater than 1,000.0m (e.g. 1000.001m, 1001m) is OUT-OF-BOUNDS (ineligible).
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusM: number = 1000,
): boolean {
  if (!isValidCoordinates(center) || !isValidCoordinates(point)) return false;
  return haversineDistance(center, point) <= radiusM;
}

/**
 * Given a list of vehicles and their locations, returns only those within the radius
 * along with their calculated integer distance in metres.
 * Invalid locations or non-numeric points are safely discarded.
 */
export function filterNearbyVehicles(
  center: Coordinates,
  vehicles: Array<{ id: string; location: Coordinates | null }>,
  radiusM: number = 1000,
): Array<{ id: string; distance: number }> {
  if (!isValidCoordinates(center)) return [];

  const results: Array<{ id: string; distance: number }> = [];
  for (const v of vehicles) {
    if (!v.location || !isValidCoordinates(v.location)) continue;
    const dist = haversineDistance(center, v.location);
    // Inclusive boundary comparison
    if (dist <= radiusM) {
      results.push({ id: v.id, distance: Math.round(dist) });
    }
  }
  return results;
}

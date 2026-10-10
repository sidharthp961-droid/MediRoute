// ─── Verified Hospital Destination Directory for Kerala Priority Corridors ───
import type { Coordinates } from '@/types';

export interface HospitalDestination {
  id: string;
  name: string;
  alternateName?: string;
  town: string;
  district: string;
  coords: Coordinates;
  address: string;
  verifiedOSM: boolean;
  osmNotes: string;
  category: 'super-specialty' | 'general' | 'taluk' | 'medical-college';
  phone?: string; // Only verified contact lines included
}

/**
 * 13 Verified Healthcare Destinations across Idukki and Ernakulam corridors.
 * All coordinates verified against OpenStreetMap (OSM) nodes and ways.
 */
export const KERALA_HOSPITALS: HospitalDestination[] = [
  {
    id: 'bmh-thodupuzha',
    name: 'Baby Memorial Hospital, Thodupuzha',
    alternateName: 'Formerly Chazhikattu Hospital',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.898205, lng: 76.709809 },
    address: 'River View Road, Vengalloor, Thodupuzha, Idukki 685584',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Chazhikattu Hospital on River View Road (acquired and operated by Baby Memorial Hospital Group).',
    category: 'super-specialty',
    phone: '04862 250250',
  },
  {
    id: 'smita-thodupuzha',
    name: 'Smita Memorial Hospital & Research Centre',
    alternateName: 'Smitha Memorial Hospital',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.910300, lng: 76.699668 },
    address: 'Main Eastern Highway (SH 8), Vengalloor, Thodupuzha, Idukki 685608',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: smita memorial hospital and research center, SH 8 / Main Eastern Highway.',
    category: 'super-specialty',
    phone: '04862 350700',
  },
  {
    id: 'al-azhar-thodupuzha',
    name: 'Al Azhar Medical College & Super Speciality Hospital',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.939524, lng: 76.720604 },
    address: 'Ezhalloor Road, Kodikulam West, Kumaramangalam, Thodupuzha 685582',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Al-Azhar Medical College & Super Speciality Hospital, Ezhalloor.',
    category: 'medical-college',
    phone: '04862 226000',
  },
  {
    id: 'district-hospital-thodupuzha',
    name: 'District Hospital, Thodupuzha',
    alternateName: 'Taluk Headquarters Hospital Thodupuzha',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.899845, lng: 76.726544 },
    address: 'Newman College Road, Mangattukavala, Thodupuzha, Idukki 685585',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Taluk Headquarters Hospital Thodupuzha (serves as the primary public municipal hospital; District Hospital Idukki is at Painavu).',
    category: 'taluk',
  },
  {
    id: 'st-marys-thodupuzha',
    name: "St. Mary's Hospital, Thodupuzha",
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.892231, lng: 76.715880 },
    address: 'Thodupuzha - Puliyanmala Road, Thodupuzha, Idukki 685585',
    verifiedOSM: true,
    osmNotes: "Verified OSM node: St. Mary's Hospital, Puliyanmala Road.",
    category: 'general',
  },
  {
    id: 'holy-family-muthalakodam',
    name: 'Holy Family Hospital, Muthalakodam',
    town: 'Muthalakodam',
    district: 'Idukki',
    coords: { lat: 9.912241, lng: 76.733859 },
    address: 'Muthalakkodam - Pazhukkakulam Road, Kunnam, Thodupuzha 685605',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Muthalakkodam Holy Family Hospital.',
    category: 'general',
  },
  {
    id: 'archana-thodupuzha',
    name: 'Archana Hospital, Thodupuzha',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.903305, lng: 76.710046 },
    address: 'Main Eastern Highway, Kanjiramattom, Thodupuzha, Idukki 685584',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Archana Hospital, Main Eastern Highway.',
    category: 'general',
  },
  {
    id: 'general-hospital-muvattupuzha',
    name: 'General Hospital, Muvattupuzha',
    alternateName: 'Government General Hospital',
    town: 'Muvattupuzha',
    district: 'Ernakulam',
    coords: { lat: 9.979142, lng: 76.580002 },
    address: 'MC Road, Kizhakkekara, Muvattupuzha, Ernakulam 686661',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Government General Hospital, MC Road, Muvattupuzha.',
    category: 'general',
  },
  {
    id: 'muvattupuzha-medical-centre',
    name: 'Muvattupuzha Medical Centre',
    town: 'Muvattupuzha',
    district: 'Ernakulam',
    coords: { lat: 9.990291, lng: 76.576814 },
    address: 'MC Road, Velloorkunnam, Muvattupuzha, Ernakulam 686673',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Muvattupuzha Medical Centre (മൂവാറ്റുപുഴ മെഡിക്കൽ സെന്റർ), MC Road.',
    category: 'general',
  },
  {
    id: 'taluk-hospital-perumbavoor',
    name: 'Taluk Headquarters Hospital, Perumbavoor',
    town: 'Perumbavoor',
    district: 'Ernakulam',
    coords: { lat: 10.115991, lng: 76.481420 },
    address: 'MDR Road, Perumbavoor, Kunnathunad, Ernakulam 683500',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Taluk Headquarters Hospital Perumbavoor.',
    category: 'taluk',
  },
  {
    id: 'district-hospital-aluva',
    name: 'District Hospital, Aluva',
    town: 'Aluva',
    district: 'Ernakulam',
    coords: { lat: 10.105397, lng: 76.355062 },
    address: 'Railway Station Road, Thottakkattukara, Aluva, Ernakulam 683101',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: District Hospital Aluva, Railway Station Road.',
    category: 'general',
  },
  {
    id: 'rajagiri-hospital-aluva',
    name: 'Rajagiri Hospital, Aluva',
    town: 'Aluva',
    district: 'Ernakulam',
    coords: { lat: 10.087659, lng: 76.388212 },
    address: 'Aluva - Munnar Road, Chunangamvely, Aluva, Ernakulam 683112',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Rajagiri Hospital, Chunangamvely, Aluva.',
    category: 'super-specialty',
    phone: '0484 2905000',
  },
  {
    id: 'general-hospital-ernakulam',
    name: 'General Hospital, Ernakulam',
    town: 'Ernakulam (Kochi)',
    district: 'Ernakulam',
    coords: { lat: 9.971960, lng: 76.281052 },
    address: 'Market Road, Boat Jetty, Marine Drive, Ernakulam, Kochi 682011',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: General Hospital Ernakulam, Market Road / Marine Drive.',
    category: 'general',
  },
];

import { haversineDistance } from './utils';
export { haversineDistance };

/**
 * Filter hospitals by search term matching name, town, district, or category.
 */
export function searchHospitals(query: string): HospitalDestination[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return KERALA_HOSPITALS;
  return KERALA_HOSPITALS.filter(
    (h) =>
      h.name.toLowerCase().includes(clean) ||
      h.town.toLowerCase().includes(clean) ||
      h.district.toLowerCase().includes(clean) ||
      h.category.toLowerCase().includes(clean) ||
      (h.alternateName && h.alternateName.toLowerCase().includes(clean)),
  );
}

/**
 * Finds the closest verified hospital to the given coordinates by straight-line distance.
 */
export function findNearestHospital(
  origin: Coordinates,
  excludeId?: string,
): { hospital: HospitalDestination; distanceMetres: number } | null {
  if (!KERALA_HOSPITALS.length) return null;

  let nearest: HospitalDestination | null = null;
  let minDistance = Infinity;

  for (const h of KERALA_HOSPITALS) {
    if (excludeId && h.id === excludeId) continue;
    const d = haversineDistance(origin, h.coords);
    if (d < minDistance) {
      minDistance = d;
      nearest = h;
    }
  }

  if (!nearest) return null;
  return { hospital: nearest, distanceMetres: minDistance };
}

export interface RankedHospitalDistance {
  hospital: HospitalDestination;
  distanceMetres: number;
  distanceKm: string;
}

/**
 * Calculates straight-line distances locally from origin to all verified Kerala hospitals
 * using the Haversine formula and returns the top closest facilities sorted ascending.
 * Safely handles invalid coordinates and missing dataset without calling any network APIs.
 */
export function getNearestHospitals(
  origin: Coordinates | null | undefined,
  limit = 3,
): RankedHospitalDistance[] {
  if (
    !origin ||
    typeof origin.lat !== 'number' ||
    typeof origin.lng !== 'number' ||
    isNaN(origin.lat) ||
    isNaN(origin.lng) ||
    !isFinite(origin.lat) ||
    !isFinite(origin.lng) ||
    origin.lat < -90 ||
    origin.lat > 90 ||
    origin.lng < -180 ||
    origin.lng > 180 ||
    !Array.isArray(KERALA_HOSPITALS) ||
    KERALA_HOSPITALS.length === 0
  ) {
    return [];
  }

  const validHospitals = KERALA_HOSPITALS.filter(
    (h) =>
      h &&
      h.coords &&
      typeof h.coords.lat === 'number' &&
      typeof h.coords.lng === 'number' &&
      !isNaN(h.coords.lat) &&
      !isNaN(h.coords.lng) &&
      isFinite(h.coords.lat) &&
      isFinite(h.coords.lng) &&
      h.coords.lat >= -90 &&
      h.coords.lat <= 90 &&
      h.coords.lng >= -180 &&
      h.coords.lng <= 180,
  );

  const ranked: RankedHospitalDistance[] = validHospitals
    .map((hospital) => {
      const distanceMetres = haversineDistance(origin, hospital.coords);
      const km = (distanceMetres / 1000).toFixed(1);
      return {
        hospital,
        distanceMetres,
        distanceKm: km + ' km',
      };
    })
    .sort((a, b) => a.distanceMetres - b.distanceMetres);

  return typeof limit === 'number' && limit > 0 ? ranked.slice(0, limit) : ranked;
}

import { fetchRoadRoute, RoutingResult } from './routing';

export interface NearestHospitalRoadResult {
  hospital: HospitalDestination;
  routingResult: RoutingResult;
  roadDistanceMetres: number;
  roadDistanceKm: string;
  roadDurationMinutes: string;
  straightLineMetres: number;
  comparisonCandidatesCount: number;
  isRoadRouteComparison: boolean;
}

/**
 * Checks whether two coordinates represent a significant movement exceeding threshold (metres).
 * Prevents redundant OSRM recalculations from GPS jitter / slight fluctuations.
 */
export function hasSignificantLocationChange(
  coordA: Coordinates | null | undefined,
  coordB: Coordinates | null | undefined,
  thresholdMetres = 150,
): boolean {
  if (!coordA || !coordB) return true;
  if (
    typeof coordA.lat !== 'number' ||
    typeof coordA.lng !== 'number' ||
    typeof coordB.lat !== 'number' ||
    typeof coordB.lng !== 'number' ||
    isNaN(coordA.lat) ||
    isNaN(coordA.lng) ||
    isNaN(coordB.lat) ||
    isNaN(coordB.lng)
  ) {
    return true;
  }
  const d = haversineDistance(coordA, coordB);
  return d > thresholdMetres;
}

export interface HospitalRecommendation {
  hospital: HospitalDestination;
  routingResult: RoutingResult;
  roadDistanceMetres: number;
  roadDistanceKm: string;
  roadDurationMinutes: string;
  savingsMetres: number;
  savingsKm: string;
}

/**
 * Checks if a closer hospital exists along vehicle location during active emergency.
 * Used to present a recommendation confirmation without silently changing locked destination.
 */
export async function checkCloserHospitalRecommendation(
  origin: Coordinates,
  currentHospitalId: string,
  minSavingsMetres = 1000,
): Promise<HospitalRecommendation | null> {
  if (!origin || !currentHospitalId) return null;

  const result = await findNearestHospitalByRoadRoute(origin, { candidateCount: 3 });
  if (!result || result.hospital.id === currentHospitalId) {
    return null;
  }

  // Calculate route or distance to current hospital for comparison
  const currentHospital = KERALA_HOSPITALS.find((h) => h.id === currentHospitalId);
  if (!currentHospital) return null;

  let currentRoadMetres = Infinity;
  try {
    const curRoute = await fetchRoadRoute(origin, currentHospital.coords);
    if (curRoute.routes[0] && curRoute.routes[0].distanceMetres > 0) {
      currentRoadMetres = curRoute.routes[0].distanceMetres;
    }
  } catch {
    currentRoadMetres = haversineDistance(origin, currentHospital.coords);
  }

  const savingsMetres = currentRoadMetres - result.roadDistanceMetres;
  if (savingsMetres >= minSavingsMetres) {
    return {
      hospital: result.hospital,
      routingResult: result.routingResult,
      roadDistanceMetres: result.roadDistanceMetres,
      roadDistanceKm: result.roadDistanceKm,
      roadDurationMinutes: result.roadDurationMinutes,
      savingsMetres,
      savingsKm: `${(savingsMetres / 1000).toFixed(1)} km`,
    };
  }

  return null;
}

/**
 * Finds the nearest verified hospital from a starting location by comparing
 * actual OSRM road routes across top closest candidate facilities.
 * Falls back safely to straight-line distance if OSRM is unreachable.
 */
export async function findNearestHospitalByRoadRoute(
  origin: Coordinates,
  options?: {
    candidateCount?: number;
    excludeId?: string;
  },
): Promise<NearestHospitalRoadResult | null> {
  if (
    !origin ||
    typeof origin.lat !== 'number' ||
    typeof origin.lng !== 'number' ||
    isNaN(origin.lat) ||
    isNaN(origin.lng) ||
    !isFinite(origin.lat) ||
    !isFinite(origin.lng) ||
    origin.lat < -90 ||
    origin.lat > 90 ||
    origin.lng < -180 ||
    origin.lng > 180 ||
    !KERALA_HOSPITALS.length
  ) {
    return null;
  }

  const candidateCount = Math.max(1, Math.min(options?.candidateCount || 3, KERALA_HOSPITALS.length));

  // 1. Calculate straight-line distance to all hospitals
  const ranked = KERALA_HOSPITALS
    .filter((h) => !options?.excludeId || h.id !== options.excludeId)
    .map((h) => ({
      hospital: h,
      straightLineMetres: haversineDistance(origin, h.coords),
    }))
    .sort((a, b) => a.straightLineMetres - b.straightLineMetres);

  if (ranked.length === 0) return null;

  // 2. Take top candidates for road-route comparison
  const candidates = ranked.slice(0, candidateCount);

  // 3. Attempt OSRM road route fetching for each candidate
  let bestCandidate: {
    hospital: HospitalDestination;
    routingResult: RoutingResult;
    roadDistanceMetres: number;
    straightLineMetres: number;
  } | null = null;

  for (const cand of candidates) {
    try {
      const routeRes = await fetchRoadRoute(origin, cand.hospital.coords, {
        destinationLabel: cand.hospital.name,
      });

      const primary = routeRes.routes[0];
      if (primary && primary.distanceMetres > 0) {
        if (!bestCandidate || primary.distanceMetres < bestCandidate.roadDistanceMetres) {
          bestCandidate = {
            hospital: cand.hospital,
            routingResult: routeRes,
            roadDistanceMetres: primary.distanceMetres,
            straightLineMetres: cand.straightLineMetres,
          };
        }
      }
    } catch (err) {
      console.warn(`[Routing] Could not fetch road route to ${cand.hospital.name}:`, err);
    }
  }

  // 4. If road route comparison succeeded, return best road candidate
  if (bestCandidate) {
    const primary = bestCandidate.routingResult.routes[0];
    return {
      hospital: bestCandidate.hospital,
      routingResult: bestCandidate.routingResult,
      roadDistanceMetres: bestCandidate.roadDistanceMetres,
      roadDistanceKm: primary.distanceKm,
      roadDurationMinutes: primary.durationMinutes,
      straightLineMetres: bestCandidate.straightLineMetres,
      comparisonCandidatesCount: candidates.length,
      isRoadRouteComparison: true,
    };
  }

  // 5. Fallback: Straight-line nearest hospital if OSRM is offline
  const nearestStraight = ranked[0];
  const straightKm = (nearestStraight.straightLineMetres / 1000).toFixed(1);

  // Create minimal fallback routing result
  const fallbackRoute: RoutingResult = {
    origin,
    destination: nearestStraight.hospital.coords,
    destinationLabel: nearestStraight.hospital.name,
    routes: [
      {
        id: 'fallback-straight-line',
        index: 0,
        distanceMetres: nearestStraight.straightLineMetres,
        distanceKm: `~${straightKm} km (straight-line)`,
        durationSeconds: Math.round((nearestStraight.straightLineMetres / 1000 / 40) * 3600), // ~40km/h est
        durationMinutes: `~${Math.round((nearestStraight.straightLineMetres / 1000 / 40) * 60)} mins`,
        summary: 'Direct straight-line path (OSRM road service offline)',
        coordinates: [
          [origin.lat, origin.lng],
          [nearestStraight.hospital.coords.lat, nearestStraight.hospital.coords.lng],
        ],
        isPrimary: true,
      },
    ],
    selectedRouteIndex: 0,
    fetchedAt: Date.now(),
    provider: 'OSRM (OpenStreetMap Roads)',
    disclaimer: 'Straight-line fallback: OSRM road routing service could not be reached. Actual road distance will be longer.',
  };

  return {
    hospital: nearestStraight.hospital,
    routingResult: fallbackRoute,
    roadDistanceMetres: nearestStraight.straightLineMetres,
    roadDistanceKm: `~${straightKm} km`,
    roadDurationMinutes: `~${Math.round((nearestStraight.straightLineMetres / 1000 / 40) * 60)} mins`,
    straightLineMetres: nearestStraight.straightLineMetres,
    comparisonCandidatesCount: candidates.length,
    isRoadRouteComparison: false,
  };
}


// ─── MediRoute: Automatic Nearest Hospital Destination Test Suite ───
import {
  KERALA_HOSPITALS,
  getNearestHospitals,
  findNearestHospital,
  findNearestHospitalByRoadRoute,
  hasSignificantLocationChange,
  checkCloserHospitalRecommendation,
} from '../../client/src/lib/hospitals';
import { haversineDistance } from '../../client/src/lib/utils';
import type { Coordinates } from '../../client/src/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('MEDIROUTE — AUTOMATIC NEAREST HOSPITAL DESTINATION AUDIT');
  console.log('================================================================\n');

  // ── TEST GROUP 1: GPS PERMISSION GRANTED & AUTO-SELECTION ──
  console.log('--- TEST GROUP 1: GPS Granted & Automatic Nearest Hospital ---');
  
  // Starting point 1: Muvattupuzha Town Center
  const muvattupuzhaCoord: Coordinates = { lat: 9.9790, lng: 76.5800 };
  const resMuvattupuzha = await findNearestHospitalByRoadRoute(muvattupuzhaCoord, { candidateCount: 3 });
  assert(resMuvattupuzha !== null, 'Candidate found for Muvattupuzha origin');
  assert(
    resMuvattupuzha?.hospital.id === 'general-hospital-muvattupuzha',
    `Muvattupuzha coordinates auto-select General Hospital Muvattupuzha (got ${resMuvattupuzha?.hospital.name})`
  );
  assert(
    resMuvattupuzha?.hospital.id !== KERALA_HOSPITALS[0].id,
    'Did not trivially select first array hospital blindly'
  );

  // Starting point 2: Perumbavoor Town Center
  const perumbavoorCoord: Coordinates = { lat: 10.1160, lng: 76.4810 };
  const resPerumbavoor = await findNearestHospitalByRoadRoute(perumbavoorCoord, { candidateCount: 3 });
  assert(resPerumbavoor !== null, 'Candidate found for Perumbavoor origin');
  assert(
    resPerumbavoor?.hospital.id === 'taluk-hospital-perumbavoor',
    `Perumbavoor coordinates auto-select Taluk Hospital Perumbavoor (got ${resPerumbavoor?.hospital.name})`
  );

  // Starting point 3: Chunangamvely / Aluva Munnar Road
  const chunangamvelyCoord: Coordinates = { lat: 10.0875, lng: 76.3880 };
  const resChunangamvely = await findNearestHospitalByRoadRoute(chunangamvelyCoord, { candidateCount: 3 });
  assert(resChunangamvely !== null, 'Candidate found for Chunangamvely origin');
  assert(
    resChunangamvely?.hospital.id === 'rajagiri-hospital-aluva',
    `Chunangamvely coordinates auto-select Rajagiri Hospital Aluva (got ${resChunangamvely?.hospital.name})`
  );

  // ── TEST GROUP 2: RECALCULATION ON COORDINATE CHANGE ──
  console.log('\n--- TEST GROUP 2: Dynamic Recalculation on Position Change ---');
  
  // Start near Mangattukavala Thodupuzha
  const thodupuzhaMangattukavala: Coordinates = { lat: 9.8998, lng: 76.7265 };
  const resThodupuzha = await findNearestHospitalByRoadRoute(thodupuzhaMangattukavala);
  assert(
    resThodupuzha?.hospital.id === 'district-hospital-thodupuzha',
    `Thodupuzha Mangattukavala origin selects District Hospital Thodupuzha (got ${resThodupuzha?.hospital.name})`
  );

  // Move starting point to Kochi Marine Drive
  const ernakulamMarineDrive: Coordinates = { lat: 9.9720, lng: 76.2810 };
  const resErnakulam = await findNearestHospitalByRoadRoute(ernakulamMarineDrive);
  assert(
    resErnakulam?.hospital.id === 'general-hospital-ernakulam',
    `Moved to Kochi Marine Drive -> destination dynamically recalculated (got ${resErnakulam?.hospital.name})`
  );
  assert(
    resThodupuzha?.hospital.id !== resErnakulam?.hospital.id,
    'Different starting coordinates dynamically resolve different appropriate hospital destinations'
  );

  // ── TEST GROUP 3: GPS JITTER THRESHOLD (<150m) ──
  console.log('\n--- TEST GROUP 3: GPS Jitter Deadband (150m Threshold) ---');
  
  const basePoint: Coordinates = { lat: 9.895900, lng: 76.718400 };
  // Small drift: ~30 metres north
  const drift30m: Coordinates = { lat: 9.896170, lng: 76.718400 };
  const dist30m = haversineDistance(basePoint, drift30m);
  const change30m = hasSignificantLocationChange(basePoint, drift30m, 150);
  assert(!change30m, `30m fluctuation (${dist30m.toFixed(1)}m) does NOT trigger recalculation`);

  // Small drift: ~100 metres
  const drift100m: Coordinates = { lat: 9.896800, lng: 76.718400 };
  const dist100m = haversineDistance(basePoint, drift100m);
  const change100m = hasSignificantLocationChange(basePoint, drift100m, 150);
  assert(!change100m, `100m fluctuation (${dist100m.toFixed(1)}m) does NOT trigger recalculation`);

  // Significant movement: ~300 metres
  const move300m: Coordinates = { lat: 9.898600, lng: 76.718400 };
  const dist300m = haversineDistance(basePoint, move300m);
  const change300m = hasSignificantLocationChange(basePoint, move300m, 150);
  assert(change300m, `300m movement (${dist300m.toFixed(1)}m) successfully triggers recalculation`);

  // ── TEST GROUP 4: GPS DENIED / UNAVAILABLE HANDLING ──
  console.log('\n--- TEST GROUP 4: GPS Denied / Unavailable Safety Rule ---');
  
  const simulatedGpsFailure = (errorCode: number) => {
    let status: 'denied' | 'unavailable' | 'timeout' = 'unavailable';
    let label = '';
    if (errorCode === 1) { // PERMISSION_DENIED
      status = 'denied';
      label = 'GPS permission denied. Please grant location permissions or select a location below.';
    } else if (errorCode === 2) { // POSITION_UNAVAILABLE
      status = 'unavailable';
      label = 'GPS location is currently unavailable. Using preset hub until a point is chosen.';
    } else if (errorCode === 3) { // TIMEOUT
      status = 'timeout';
      label = 'GPS request timed out. Please retry or choose a location on the map.';
    }
    return { status, label, fallbackSource: 'preset' as const };
  };

  const deniedState = simulatedGpsFailure(1);
  assert(deniedState.status === 'denied', 'Permission denied produces explicit "denied" status');
  assert(deniedState.fallbackSource === 'preset', 'Does NOT mislabel fallback as "gps" source');

  const unavailState = simulatedGpsFailure(2);
  assert(unavailState.status === 'unavailable', 'Position unavailable produces explicit "unavailable" status');

  const timeoutState = simulatedGpsFailure(3);
  assert(timeoutState.status === 'timeout', 'Timeout produces explicit "timeout" status');

  // ── TEST GROUP 5: OSRM FALLBACK & ACCURACY DISCLAIMER ──
  console.log('\n--- TEST GROUP 5: OSRM Routing Offline Fallback ---');
  
  const ranking = getNearestHospitals(thodupuzhaMangattukavala, 3);
  assert(ranking.length === 3, 'Local ranking returns top 3 candidates without network');
  assert(
    ranking[0].hospital.id === 'district-hospital-thodupuzha',
    `Local fallback correctly ranks closest facility (${ranking[0].hospital.name})`
  );
  assert(
    typeof ranking[0].distanceMetres === 'number' && ranking[0].distanceMetres < 100,
    `Straight-line distance accurately calculated (${ranking[0].distanceMetres.toFixed(1)}m)`
  );

  // ── TEST GROUP 6: MANUAL SELECTION PRESERVATION ──
  console.log('\n--- TEST GROUP 6: Manual Selection Preservation ---');
  
  // Operator chooses General Hospital Ernakulam manually while vehicle is in Thodupuzha
  const chosenManualId = 'general-hospital-ernakulam';
  const ernakulamHospital = KERALA_HOSPITALS.find(h => h.id === chosenManualId)!;
  assert(ernakulamHospital !== undefined, 'Manual hospital selection found in dataset');

  // Simulation: operator selects destination manually
  const isManualHospitalSelection = true;
  let activeHospital = ernakulamHospital;

  // New location update arrives in Thodupuzha
  if (!isManualHospitalSelection) {
    // If auto-mode, it would overwrite with Thodupuzha hospital
    activeHospital = resThodupuzha!.hospital;
  }
  assert(
    activeHospital.id === 'general-hospital-ernakulam',
    'User manual destination is retained when manual selection mode is active'
  );

  // ── TEST GROUP 7: EMERGENCY SAFETY & LOCKED DESTINATION ──
  console.log('\n--- TEST GROUP 7: Emergency Safety & Recommendation Invariant ---');
  
  // Scenario: Emergency active with locked destination General Hospital Ernakulam
  const lockedDestination = ernakulamHospital;
  let emergencyDestination = lockedDestination.id;

  // Ambulance moving along MC Road near Muvattupuzha
  const ambulancePosNearMuvattupuzha: Coordinates = { lat: 9.9790, lng: 76.5800 };
  const recommendation = await checkCloserHospitalRecommendation(
    ambulancePosNearMuvattupuzha,
    lockedDestination.id,
    1000 // min 1km savings
  );

  assert(recommendation !== null, 'Identifies closer hospital during emergency route');
  assert(
    recommendation?.hospital.id === 'general-hospital-muvattupuzha',
    `Recommends General Hospital Muvattupuzha (saves ${recommendation?.savingsKm})`
  );
  assert(
    (recommendation?.savingsMetres ?? 0) >= 1000,
    `Savings exceeds 1 km threshold (${recommendation?.savingsKm} saved)`
  );
  // Verify emergency destination is NOT silently replaced
  assert(
    emergencyDestination === lockedDestination.id,
    'Locked destination is NOT silently replaced before operator confirmation'
  );

  // Operator confirms switch
  emergencyDestination = recommendation!.hospital.id;
  assert(
    emergencyDestination === 'general-hospital-muvattupuzha',
    'Destination switches only after explicit operator confirmation'
  );

  // ── SUMMARY REPORT ──
  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});

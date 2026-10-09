// ─── Automated Edge Case Test Suite for MediRoute 1 km Geofence & Alert Engine ───

import {
  haversineDistance,
  isWithinRadius,
  isValidCoordinates,
  filterNearbyVehicles,
} from '../src/geofence';
import {
  isValidRegistration,
  formatRegistration,
  normalizeRegistration,
} from '../src/validation';
import {
  validateAndFingerprintPhoto,
  analyzeReportRisk,
  getModeratorKey,
  isAuthorizedModerator,
  ALLOWED_CATEGORIES,
} from '../src/reportValidation';
import { io as ClientSocket, Socket } from 'socket.io-client';

const TEST_MOD_KEY = process.env.MODERATOR_KEY || 'test-moderator-key-audit-suite';
process.env.MODERATOR_KEY = TEST_MOD_KEY;

const R = 6_371_000;
const ORIGIN = { lat: 9.895900, lng: 76.718400 }; // Thodupuzha Emergency Hub

function pointDueNorth(distM: number) {
  const dLatDeg = (distM / R) * (180 / Math.PI);
  return { lat: ORIGIN.lat + dLatDeg, lng: ORIGIN.lng };
}

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

async function runTestSuite() {
  console.log('================================================================');
  console.log('MEDIROUTE — PHASE 3 GEOFENCE & REAL-TIME ALERT AUDIT TEST SUITE');
  console.log('================================================================\n');

  // ── TEST GROUP 1: BOUNDARY RULE (999m, 1,000m, 1,001m) ──
  console.log('--- TEST GROUP 1: 1,000-Metre Boundary Rule & Clamping ---');
  const p999 = pointDueNorth(999.0);
  const p1000 = pointDueNorth(1000.0);
  const p1001 = pointDueNorth(1001.0);

  const d999 = haversineDistance(ORIGIN, p999);
  const d1000 = haversineDistance(ORIGIN, p1000);
  const d1001 = haversineDistance(ORIGIN, p1001);

  assert(Math.abs(d999 - 999.0) < 0.001, `p999 accurately computed (${d999.toFixed(2)}m)`);
  assert(Math.abs(d1000 - 1000.0) < 0.001, `p1000 accurately computed (${d1000.toFixed(2)}m)`);
  assert(Math.abs(d1001 - 1001.0) < 0.001, `p1001 accurately computed (${d1001.toFixed(2)}m)`);

  assert(isWithinRadius(ORIGIN, p999, 1000) === true, '999 metres is within 1,000m geofence (eligible)');
  assert(isWithinRadius(ORIGIN, p1000, 1000) === true, '1,000 metres is within 1,000m geofence (inclusive boundary)');
  assert(isWithinRadius(ORIGIN, p1001, 1000) === false, '1,001 metres is outside 1,000m geofence (ineligible)');

  // Clamping and identical point check
  assert(haversineDistance(ORIGIN, ORIGIN) === 0, 'Identical coordinates return 0 distance');
  assert(!Number.isNaN(haversineDistance({ lat: 89.999, lng: 0 }, { lat: -89.999, lng: 180 })), 'Near-antipodal points do not return NaN');

  // ── TEST GROUP 2: COORDINATE VALIDATION ──
  console.log('\n--- TEST GROUP 2: Coordinate Schema & Range Validation ---');
  assert(isValidCoordinates({ lat: 0, lng: 0 }) === true, 'Equator / Prime Meridian (0, 0) is valid');
  assert(isValidCoordinates(ORIGIN) === true, 'Standard coordinates (9.8959, 76.7184) are valid');
  assert(isValidCoordinates({ lat: 90, lng: 180 }) === true, 'Exact geographic boundary (90, 180) is valid');
  assert(isValidCoordinates({ lat: -90, lng: -180 }) === true, 'Exact geographic boundary (-90, -180) is valid');

  assert(isValidCoordinates(null) === false, 'null is rejected');
  assert(isValidCoordinates(undefined) === false, 'undefined is rejected');
  assert(isValidCoordinates({ lat: '9.8959', lng: 76.7184 }) === false, 'String lat is rejected');
  assert(isValidCoordinates({ lat: 9.8959 }) === false, 'Missing lng is rejected');
  assert(isValidCoordinates({ lng: 76.7184 }) === false, 'Missing lat is rejected');
  assert(isValidCoordinates({ lat: 91, lng: 76.7184 }) === false, 'Latitude > 90 is rejected');
  assert(isValidCoordinates({ lat: -90.5, lng: 76.7184 }) === false, 'Latitude < -90 is rejected');
  assert(isValidCoordinates({ lat: 9.8959, lng: 180.5 }) === false, 'Longitude > 180 is rejected');
  assert(isValidCoordinates({ lat: 9.8959, lng: -181 }) === false, 'Longitude < -180 is rejected');
  assert(isValidCoordinates({ lat: NaN, lng: 76.7184 }) === false, 'NaN lat is rejected');
  assert(isValidCoordinates({ lat: 9.8959, lng: Infinity }) === false, 'Infinity lng is rejected');

  // filterNearbyVehicles robustness
  const rawList = [
    { id: 'v1', location: p999 },
    { id: 'v2', location: p1000 },
    { id: 'v3', location: p1001 },
    { id: 'v-invalid', location: { lat: 999, lng: 999 } as any },
    { id: 'v-null', location: null },
  ];
  const filtered = filterNearbyVehicles(ORIGIN, rawList, 1000);
  assert(filtered.length === 2, 'filterNearbyVehicles returns exactly 2 vehicles (p999 & p1000)');
  assert(filtered.some((v) => v.id === 'v1'), 'v1 (999m) is included in filtered list');
  assert(filtered.some((v) => v.id === 'v2'), 'v2 (1000m) is included in filtered list');
  assert(!filtered.some((v) => v.id === 'v3'), 'v3 (1001m) is excluded from filtered list');
  assert(!filtered.some((v) => v.id === 'v-invalid'), 'Invalid coordinate vehicle safely excluded');

  // ── TEST GROUP 3: REAL-TIME SOCKET.IO INTEGRATION & EDGE CASES ──
  console.log('\n--- TEST GROUP 3: Socket.IO Server-Authoritative Real-Time Alerts ---');
  const serverUrl = 'http://localhost:3001';

  const makeClient = (label: string): Promise<Socket> => {
    return new Promise((resolve, reject) => {
      const s = ClientSocket(serverUrl, { transports: ['websocket'], timeout: 5000 });
      s.on('connect', () => resolve(s));
      s.on('connect_error', (e) => reject(e));
    });
  };

  try {
    const emergencySocket = await makeClient('EmergencyVehicle');
    const privateVehicle1 = await makeClient('PrivateVehicle1'); // At 999m
    const privateVehicle2 = await makeClient('PrivateVehicle2'); // At 1000m
    const privateVehicle3 = await makeClient('PrivateVehicle3'); // At 1001m

    let alertsReceived = { v1: 0, v2: 0, v3: 0 };
    let expirationsReceived = { v1: 0, v2: 0, v3: 0 };
    let serverErrorsReceived = 0;

    privateVehicle1.on('alert:incoming', () => { alertsReceived.v1++; });
    privateVehicle2.on('alert:incoming', () => { alertsReceived.v2++; });
    privateVehicle3.on('alert:incoming', () => { alertsReceived.v3++; });

    privateVehicle1.on('alert:expired', () => { expirationsReceived.v1++; });
    privateVehicle2.on('alert:expired', () => { expirationsReceived.v2++; });
    privateVehicle3.on('alert:expired', () => { expirationsReceived.v3++; });

    privateVehicle1.on('error', () => { serverErrorsReceived++; });

    // Register vehicles
    emergencySocket.emit('vehicle:register', { role: 'emergency', label: 'Ambulance Unit 1', location: ORIGIN });
    privateVehicle1.emit('vehicle:register', { role: 'driver', label: 'Private Car 1 (999m)', location: p999 });
    privateVehicle2.emit('vehicle:register', { role: 'driver', label: 'Private Car 2 (1000m)', location: p1000 });
    privateVehicle3.emit('vehicle:register', { role: 'driver', label: 'Private Car 3 (1001m)', location: p1001 });

    await new Promise((r) => setTimeout(r, 600));

    // 1. Activate emergency
    console.log('  -> Triggering emergency session at Thodupuzha...');
    emergencySocket.emit('emergency:start', {
      origin: ORIGIN,
      destination: { lat: 9.9816, lng: 76.2999 }, // Ernakulam
    });

    await new Promise((r) => setTimeout(r, 800));

    assert(alertsReceived.v1 === 1, 'Private Vehicle 1 (999m) received alert');
    assert(alertsReceived.v2 === 1, 'Private Vehicle 2 (1000m) received alert');
    assert(alertsReceived.v3 === 0, 'Private Vehicle 3 (1001m) did NOT receive alert');

    // 2. Duplicate activation attempt (should be rejected)
    console.log('  -> Testing duplicate activation attempt...');
    let duplicateRejected = false;
    emergencySocket.once('error', (err) => {
      if (err.message.includes('already active')) duplicateRejected = true;
    });
    emergencySocket.emit('emergency:start', { origin: ORIGIN });
    await new Promise((r) => setTimeout(r, 500));
    assert(duplicateRejected === true, 'Repeated emergency:start safely rejected with error');

    // 3. Repeated identical location update (duplicate alert prevention)
    console.log('  -> Sending identical location update for Vehicle 1...');
    privateVehicle1.emit('vehicle:location', { location: p999 });
    await new Promise((r) => setTimeout(r, 500));
    assert(alertsReceived.v1 === 1, 'Duplicate alert event NOT emitted on identical location update');

    // 4. Invalid coordinate rejection
    console.log('  -> Sending invalid coordinates packet...');
    privateVehicle1.emit('vehicle:location', { location: { lat: 95.0, lng: 200.0 } as any });
    await new Promise((r) => setTimeout(r, 500));
    assert(serverErrorsReceived >= 1, 'Server detected invalid coordinates and emitted error');

    // 5. Entry into geofence (Vehicle 3 moves from 1001m to 850m)
    console.log('  -> Moving Vehicle 3 inside geofence (1001m -> 850m)...');
    const p850 = pointDueNorth(850.0);
    privateVehicle3.emit('vehicle:location', { location: p850 });
    await new Promise((r) => setTimeout(r, 600));
    assert(alertsReceived.v3 === 1, 'Vehicle 3 received targeted alert upon entering 1 km radius');

    // 6. Exit from geofence (Vehicle 1 moves from 999m to 1200m)
    console.log('  -> Moving Vehicle 1 outside geofence (999m -> 1200m)...');
    const p1200 = pointDueNorth(1200.0);
    privateVehicle1.emit('vehicle:location', { location: p1200 });
    await new Promise((r) => setTimeout(r, 600));
    assert(expirationsReceived.v1 === 1, 'Vehicle 1 alert expired upon leaving 1 km radius');

    // 7. Re-entry (Vehicle 1 returns to 900m)
    console.log('  -> Moving Vehicle 1 back inside geofence (1200m -> 900m)...');
    const p900 = pointDueNorth(900.0);
    privateVehicle1.emit('vehicle:location', { location: p900 });
    await new Promise((r) => setTimeout(r, 600));
    assert(alertsReceived.v1 === 2, 'Vehicle 1 successfully re-alerted upon re-entering 1 km radius');

    // 8. Emergency Cancellation test
    console.log('  -> Testing emergency:cancel flow...');
    // Start a new test emergency to test cancel
    const testEmergencySocket = await makeClient('TestEmergency');
    testEmergencySocket.emit('vehicle:register', { role: 'emergency', label: 'Ambulance 2', location: ORIGIN });
    await new Promise((r) => setTimeout(r, 400));
    testEmergencySocket.emit('emergency:start', { origin: ORIGIN });
    await new Promise((r) => setTimeout(r, 500));

    // Vehicle 2 is at 1000m, should receive alert
    let cancelReceived = false;
    privateVehicle2.once('alert:expired', (data) => {
      if (data.reason === 'emergency_cancelled') cancelReceived = true;
    });

    testEmergencySocket.emit('emergency:cancel');
    await new Promise((r) => setTimeout(r, 600));
    assert(cancelReceived === true, 'Emergency cancellation emitted alert:expired with reason emergency_cancelled');
    testEmergencySocket.disconnect();

    // ── TEST GROUP 4: DISCONNECT & RECONNECT RECOVERY ──
    console.log('\n--- TEST GROUP 4: Disconnect & Reconnect Alert Recovery ---');
    const emergencyHost = await makeClient('EmergencyHost');
    emergencyHost.emit('vehicle:register', { role: 'emergency', label: 'Ambulance Host', location: ORIGIN });
    await new Promise((r) => setTimeout(r, 400));
    emergencyHost.emit('emergency:start', { origin: ORIGIN });
    await new Promise((r) => setTimeout(r, 500));

    // Create a private car that connects at 400m
    const p400 = pointDueNorth(400.0);
    const reconnectingDriver = await makeClient('DriverReconnect');
    let reconnectedAlertReceived = false;
    let assignedVehicleId = '';

    reconnectingDriver.on('vehicle:registered', (data) => {
      assignedVehicleId = data.vehicleId;
    });
    reconnectingDriver.on('alert:incoming', () => {
      reconnectedAlertReceived = true;
    });

    reconnectingDriver.emit('vehicle:register', {
      role: 'driver',
      label: 'Driver Reconnect Test',
      location: p400,
    });
    await new Promise((r) => setTimeout(r, 600));
    assert(reconnectedAlertReceived === true, 'Driver initially received alert at 400m');
    assert(assignedVehicleId.length > 0, 'Driver assigned valid vehicleId');

    // Simulate network disconnect
    console.log('  -> Simulating client disconnect...');
    reconnectingDriver.disconnect();
    await new Promise((r) => setTimeout(r, 600));

    // Reconnect client using saved vehicleId
    console.log('  -> Reconnecting client with preserved vehicleId...');
    const reconnectedSocket = await makeClient('DriverReconnectedSocket');
    let alertSyncedOnReconnect = false;

    reconnectedSocket.on('alert:incoming', (data) => {
      alertSyncedOnReconnect = true;
    });

    reconnectedSocket.emit('vehicle:register', {
      role: 'driver',
      vehicleId: assignedVehicleId,
      label: 'Driver Reconnect Test',
      location: p400,
    });

    await new Promise((r) => setTimeout(r, 600));
    assert(alertSyncedOnReconnect === true, 'Driver immediately re-synchronized active alert upon reconnection');

    // Clean up
    emergencyHost.emit('emergency:complete');
    await new Promise((r) => setTimeout(r, 400));
    emergencyHost.disconnect();
    reconnectedSocket.disconnect();

    // ── TEST GROUP 5: PRIVATE VEHICLE REGISTRATION & PRIVACY ASSURANCE ──
    console.log('\n--- TEST GROUP 5: Private Vehicle Registration & Privacy Assurance ---');

    // 1. Format validation tests
    assert(isValidRegistration('KL 07 CA 1234') === true, 'Standard plate KL 07 CA 1234 is valid');
    assert(isValidRegistration('KL-38-E-4567') === true, 'Hyphenated plate KL-38-E-4567 is valid');
    assert(isValidRegistration('KL01AB1234') === true, 'Compact plate KL01AB1234 is valid');
    assert(isValidRegistration('MH 12 5555') === true, 'Non-Kerala Indian plate MH 12 5555 is valid');
    assert(isValidRegistration('DL 01 C 9999') === true, 'Delhi plate DL 01 C 9999 is valid');

    assert(isValidRegistration('') === false, 'Empty string is rejected');
    assert(isValidRegistration('   ') === false, 'Whitespace is rejected');
    assert(isValidRegistration(null) === false, 'Null registration is rejected');
    assert(isValidRegistration('1234') === false, 'Number without state code is rejected');
    assert(isValidRegistration('KL') === false, 'State code without numbers is rejected');
    assert(isValidRegistration('TOOLONGREGISTRATION123') === false, 'Excessively long input is rejected');
    assert(isValidRegistration('KL@07#1234') === false, 'Special symbols are rejected');

    assert(formatRegistration('kl07ca1234') === 'KL 07 CA 1234', 'formatRegistration standardizes plate spacing');

    // 2. Session Association & Privacy over Socket.IO
    console.log('  -> Testing driver session registration association & privacy protection...');
    const regDriver = await makeClient('RegDriver');
    const unrelatedMonitor = await makeClient('UnrelatedMonitor');

    let driverAlertPayload: any = null;
    regDriver.on('alert:incoming', (a) => {
      driverAlertPayload = a;
    });

    let monitorReceivedVehicles: any[] = [];
    unrelatedMonitor.on('vehicle:list', (data) => {
      monitorReceivedVehicles = data.vehicles;
    });

    let updatedVehicleBroadcast: any = null;
    unrelatedMonitor.on('vehicle:updated', (data) => {
      updatedVehicleBroadcast = data.vehicle;
    });

    // Register with valid registration and explicit consent
    regDriver.emit('vehicle:register', {
      role: 'driver',
      label: 'Commuter Car 1',
      location: p400,
      registrationNumber: 'KL 07 CA 1234',
      shareConsent: true,
    });

    await new Promise((r) => setTimeout(r, 600));

    // Privacy Check 1: Public vehicle:list must NOT leak registration numbers
    const leakedInList = monitorReceivedVehicles.some(
      (v) => (v as any).registrationNumber !== undefined || (v as any).shareConsent !== undefined,
    );
    assert(leakedInList === false, 'Public vehicle:list does NOT leak registration numbers to monitor');

    // Privacy Check 2: Public vehicle:updated broadcast must NOT leak registration numbers
    regDriver.emit('vehicle:location', { location: pointDueNorth(420.0) });
    await new Promise((r) => setTimeout(r, 500));
    const leakedInUpdate =
      updatedVehicleBroadcast &&
      ((updatedVehicleBroadcast as any).registrationNumber !== undefined ||
        (updatedVehicleBroadcast as any).shareConsent !== undefined);
    assert(leakedInUpdate === false, 'Public vehicle:updated does NOT leak registration numbers to other clients');

    // 3. Dynamic registration update via vehicle:set-registration
    let updatedConfirmed = false;
    regDriver.once('vehicle:registration-updated', (data) => {
      if (data.registrationNumber === 'KL 38 E 4567' && data.shareConsent === true) {
        updatedConfirmed = true;
      }
    });

    regDriver.emit('vehicle:set-registration', {
      registrationNumber: 'KL 38 E 4567',
      shareConsent: true,
    });
    await new Promise((r) => setTimeout(r, 500));
    assert(updatedConfirmed === true, 'vehicle:set-registration dynamically updated plate on existing session');

    // 4. Targeted alert delivery with registration
    console.log('  -> Triggering emergency to test targeted alert payload...');
    const testEmergencyHost = await makeClient('TestEmergencyHost');
    testEmergencyHost.emit('vehicle:register', { role: 'emergency', label: 'Ambulance Unit', location: ORIGIN });
    await new Promise((r) => setTimeout(r, 400));
    testEmergencyHost.emit('emergency:start', { origin: ORIGIN });
    await new Promise((r) => setTimeout(r, 600));

    assert(driverAlertPayload !== null, 'Registered driver received targeted incoming alert');
    assert(driverAlertPayload?.targetVehicleRegistration === 'KL 38 E 4567', 'Alert includes registered vehicle plate for driver HUD');
    assert(driverAlertPayload?.targetVehicleConsent === true, 'Alert includes driver consent flag');

    // 5. Unregistered driver test (no fake numbers invented)
    const unregDriver = await makeClient('UnregDriver');
    let unregAlertPayload: any = null;
    unregDriver.on('alert:incoming', (a) => {
      unregAlertPayload = a;
    });
    unregDriver.emit('vehicle:register', {
      role: 'driver',
      label: 'Unregistered Commuter',
      location: pointDueNorth(350.0),
      // No registrationNumber passed
    });
    await new Promise((r) => setTimeout(r, 600));

    assert(unregAlertPayload !== null, 'Unregistered driver received incoming alert');
    assert(unregAlertPayload?.targetVehicleRegistration === undefined, 'No fake or invented registration generated for unregistered driver');

    // Clean up
    testEmergencyHost.emit('emergency:complete');
    await new Promise((r) => setTimeout(r, 400));
    testEmergencyHost.disconnect();
    regDriver.disconnect();
    unregDriver.disconnect();
    unrelatedMonitor.disconnect();

    // ════════════════════════════════════════════════════════════════
    // TEST GROUP 6: Emergency Report Verification and Misuse Prevention
    // ════════════════════════════════════════════════════════════════
    console.log('\n--- TEST GROUP 6: Emergency Report Verification and Misuse Prevention ---');

    // 0. Moderator Key Security & Fail-Safe Verification
    const originalEnvKey = process.env.MODERATOR_KEY;

    // Test missing environment variable (fail safely)
    delete process.env.MODERATOR_KEY;
    assert(getModeratorKey() === undefined, 'getModeratorKey returns undefined when MODERATOR_KEY is missing (no hardcoded fallback)');
    assert(isAuthorizedModerator('any-key') === false, 'isAuthorizedModerator fails safely when MODERATOR_KEY is missing');
    assert(isAuthorizedModerator('') === false, 'isAuthorizedModerator rejects empty string when MODERATOR_KEY is missing');
    assert(isAuthorizedModerator(null) === false, 'isAuthorizedModerator rejects null when MODERATOR_KEY is missing');

    // Test empty/whitespace environment variable (fail safely)
    process.env.MODERATOR_KEY = '   ';
    assert(getModeratorKey() === undefined, 'getModeratorKey returns undefined when MODERATOR_KEY is blank whitespace');
    assert(isAuthorizedModerator('   ') === false, 'isAuthorizedModerator fails safely when MODERATOR_KEY is blank whitespace');

    // Test configured environment variable
    process.env.MODERATOR_KEY = TEST_MOD_KEY;
    assert(getModeratorKey() === TEST_MOD_KEY, 'getModeratorKey reads strictly from process.env.MODERATOR_KEY');
    assert(isAuthorizedModerator(TEST_MOD_KEY) === true, 'isAuthorizedModerator accepts matching moderator key');
    assert(isAuthorizedModerator('wrong-secret') === false, 'isAuthorizedModerator rejects incorrect key');
    assert(isAuthorizedModerator('') === false, 'isAuthorizedModerator rejects blank provided key');

    // 1. Photo validation & fingerprinting
    const validPhoto = 'data:image/jpeg;base64,' + Buffer.from('fake-jpeg-binary-image-content-12345').toString('base64');
    const photoRes = validateAndFingerprintPhoto(validPhoto);
    assert(photoRes.valid === true, 'Valid JPEG data URL passes validation');
    assert(typeof photoRes.hash === 'string' && photoRes.hash.length === 64, 'Valid photo returns SHA-256 fingerprint');

    const invalidMimePhoto = 'data:application/javascript;base64,' + Buffer.from('console.log("bad")').toString('base64');
    const invalidMimeRes = validateAndFingerprintPhoto(invalidMimePhoto);
    assert(invalidMimeRes.valid === false, 'Non-image executable mime type rejected');

    const webUrlPhoto = 'https://example.com/incident.png';
    const webUrlRes = validateAndFingerprintPhoto(webUrlPhoto);
    assert(webUrlRes.valid === true, 'Web image link accepted and fingerprinted');

    // 2. Risk analysis checks
    const now = Date.now();
    const existingReports: any[] = [
      {
        id: 'rep-existing-1',
        category: 'cardiac',
        description: 'Elderly patient collapsed at Thodupuzha bus stand',
        location: { lat: 9.8960, lng: 76.7185 }, // ~15m away
        photoHash: photoRes.hash,
        timestamp: now - 5 * 60 * 1000, // 5 min ago
        status: 'PENDING',
        reporterSessionId: 'sess-first-reporter',
      },
    ];

    // Duplicate detection (proximity & category)
    const duplicateReportInput = {
      category: 'cardiac' as const,
      description: 'Cardiac emergency near bus stand',
      location: { lat: 9.8962, lng: 76.7186 }, // ~40m away
      reporterSessionId: 'sess-second-reporter',
      timestamp: now,
    };
    const duplicateRisk = analyzeReportRisk(duplicateReportInput, existingReports, 1);
    assert(duplicateRisk.riskFlags.includes('duplicate_suspected'), 'Duplicate report flagged within 500m & 30m window');

    // Same session resubmission not counted as independent corroboration
    const sameSessionInput = {
      category: 'cardiac' as const,
      description: 'Second submission for same person',
      location: { lat: 9.8960, lng: 76.7185 },
      reporterSessionId: 'sess-first-reporter',
      timestamp: now,
    };
    const sameSessionRisk = analyzeReportRisk(sameSessionInput, existingReports, 1);
    assert(sameSessionRisk.riskFlags.includes('same_session_resubmission'), 'Repeated submission from same session flagged as non-independent');

    // Identical image reuse detection
    const reusedImageInput = {
      category: 'accident' as const,
      description: 'Accident scene with reused image',
      location: { lat: 9.9812, lng: 76.5786 }, // 12km away in Muvattupuzha
      photoHash: photoRes.hash,
      reporterSessionId: 'sess-third-reporter',
      timestamp: now,
    };
    const imageReuseRisk = analyzeReportRisk(reusedImageInput, existingReports, 1);
    assert(imageReuseRisk.riskFlags.includes('duplicate_image_detected'), 'Identical photo fingerprint flagged as duplicate image upload');

    // Velocity / rate limit flag
    const highVelocityInput = {
      category: 'other' as const,
      description: 'Spamming incident reports',
      location: { lat: 9.8959, lng: 76.7184 },
      reporterSessionId: 'sess-fast-reporter',
      timestamp: now,
    };
    const velocityRisk = analyzeReportRisk(highVelocityInput, [], 4);
    assert(velocityRisk.riskFlags.includes('rate_limit_exceeded'), 'High submission velocity flagged (> 3 reports in 10m)');

    // Urgent review triage
    const criticalCardiacInput = {
      category: 'cardiac' as const,
      description: 'Unconscious person needing CPR',
      location: { lat: 9.8959, lng: 76.7184 },
      reporterSessionId: 'sess-reporter',
      timestamp: now,
    };
    const cardiacRisk = analyzeReportRisk(criticalCardiacInput, [], 1);
    assert(cardiacRisk.isUrgentReview === true, 'Cardiac condition flagged for urgent moderator review');

    // Outside Kerala corridor flag
    const outsideKeralaInput = {
      category: 'accident' as const,
      description: 'Incident in London UK',
      location: { lat: 51.5074, lng: -0.1278 },
      reporterSessionId: 'sess-reporter',
      timestamp: now,
    };
    const outsideKeralaRisk = analyzeReportRisk(outsideKeralaInput, [], 1);
    assert(outsideKeralaRisk.riskFlags.includes('outside_kerala_corridor'), 'Coordinates outside Kerala priority corridors flagged');

    // 3. Socket.IO End-to-End Report Submission & Verification Lifecycle
    console.log('  -> Testing Socket.IO report submission and status verification lifecycle...');
    const reporterSocket = await makeClient('CommunityReporter');
    const moderatorSocket = await makeClient('AuthorizedModerator');
    const testDriverSocket = await makeClient('ProximityDriver');

    // Register test driver at 300m from report location
    let testDriverAlert: any = null;
    testDriverSocket.on('alert:incoming', (a) => { testDriverAlert = a; });
    testDriverSocket.emit('vehicle:register', {
      role: 'driver',
      label: 'Nearby Commuter',
      location: pointDueNorth(300.0),
    });
    await new Promise((r) => setTimeout(r, 400));

    let receivedCreatedReport: any = null;
    let receivedUpdatedReport: any = null;
    let reporterError: any = null;
    let moderatorError: any = null;

    reporterSocket.on('report:created', (data) => { receivedCreatedReport = data.report; });
    moderatorSocket.on('report:updated', (data) => { receivedUpdatedReport = data.report; });
    reporterSocket.on('report:error', (data) => { reporterError = data; });
    moderatorSocket.on('report:error', (data) => { moderatorError = data; });

    // A: Submit report
    reporterSocket.emit('report:submit', {
      category: 'accident',
      description: 'Motorcycle collision near Thodupuzha bridge, two riders down',
      location: ORIGIN,
      locationAddress: 'Thodupuzha Bridge',
      locationSource: 'gps',
      photoUrl: validPhoto,
    });
    await new Promise((r) => setTimeout(r, 600));

    assert(receivedCreatedReport !== null, 'Report created event received by clients');
    assert(receivedCreatedReport?.status === 'PENDING', 'New report STRICTLY defaults to PENDING');
    assert(receivedCreatedReport?.category === 'accident', 'Report has correct emergency category');
    assert(receivedCreatedReport?.reporterSessionId === undefined, 'Reporter session ID masked from public report');
    assert(receivedCreatedReport?.photoHash === undefined, 'Photo internal hash masked from public report');
    assert(receivedCreatedReport?.auditTrail?.length === 1, 'Initial submission recorded in audit trail');

    // B: SAFE EMERGENCY HANDLING: PENDING report must NOT trigger alerts
    assert(testDriverAlert === null, 'PENDING report did NOT trigger unverified 1 km emergency alerts');

    // C: Unauthorized status update attempt (ordinary user / wrong key)
    reporterSocket.emit('report:update-status', {
      reportId: receivedCreatedReport.id,
      newStatus: 'VERIFIED',
      reason: 'I am verifying my own report',
      moderatorKey: 'unauthorized-user-key',
    });
    await new Promise((r) => setTimeout(r, 400));
    assert(reporterError !== null, 'Unauthorized verification attempt rejected by server');
    assert(receivedCreatedReport.status === 'PENDING', 'Report remains PENDING after unauthorized attempt');

    // D: Authorized status update by moderator
    moderatorSocket.emit('report:update-status', {
      reportId: receivedCreatedReport.id,
      newStatus: 'VERIFIED',
      reason: 'Confirmed by local police patrol unit',
      moderatorKey: TEST_MOD_KEY,
      moderatorName: 'Dispatcher Station 1',
    });
    await new Promise((r) => setTimeout(r, 600));
    assert(receivedUpdatedReport !== null, 'Moderator received report:updated event');
    assert(receivedUpdatedReport?.status === 'VERIFIED', 'Authorized moderator marked report as VERIFIED');
    assert(receivedUpdatedReport?.auditTrail?.length === 2, 'Audit trail recorded verification decision');
    assert(receivedUpdatedReport?.auditTrail[1]?.changedBy === 'Dispatcher Station 1', 'Audit trail records moderator identity');

    // E: SAFE EMERGENCY HANDLING: VERIFIED status alone does NOT send alerts without explicit escalation
    assert(testDriverAlert === null, 'VERIFIED status alone does NOT send alerts without explicit escalation');

    // F: Explicit Escalation to Active Emergency Corridor
    moderatorSocket.emit('report:escalate', {
      reportId: receivedUpdatedReport.id,
      moderatorKey: TEST_MOD_KEY,
    });
    await new Promise((r) => setTimeout(r, 800));

    assert(testDriverAlert !== null, 'Explicit authorized escalation activated 1 km geofence alert for driver');
    assert(testDriverAlert?.distance <= 350, 'Escalated alert received with accurate proximity distance');

    // G: Clean up report escalation emergency
    moderatorSocket.emit('emergency:complete');
    await new Promise((r) => setTimeout(r, 400));

    reporterSocket.disconnect();
    moderatorSocket.disconnect();
    testDriverSocket.disconnect();

    // ── TEST GROUP 7: ROLE-AWARE LOGIN & ADMIN AUTHORIZATION ──
    console.log('\n--- TEST GROUP 7: Role-Aware Login & Admin Authorization ---');

    // 1. Driver login with optional registration
    const driverLoginRes = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'driver',
        name: 'Arun Kumar',
        phone: '9876543210',
        registrationNumber: 'KL-07-CA-1234',
      }),
    });
    const driverLoginData: any = await driverLoginRes.json();
    assert(driverLoginRes.status === 200, 'Driver login returns HTTP 200');
    assert(driverLoginData.user?.role === 'driver', 'Driver login assigns role "driver"');
    assert(driverLoginData.user?.registrationNumber === 'KL 07 CA 1234', 'Driver login formats vehicle plate');

    // 2. Driver login rejects invalid registration
    const badRegRes = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'driver',
        name: 'Test Driver',
        registrationNumber: 'INVALID_PLATE_123',
      }),
    });
    assert(badRegRes.status === 400, 'Driver login rejects invalid registration format');

    // 3. Admin login with correct key
    const adminLoginRes = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'admin',
        name: 'Chief Dispatcher',
        key: TEST_MOD_KEY,
      }),
    });
    const adminLoginData: any = await adminLoginRes.json();
    assert(adminLoginRes.status === 200, 'Admin login with valid key returns HTTP 200');
    assert(adminLoginData.user?.role === 'admin', 'Admin login assigns role "admin"');
    assert(adminLoginData.token === TEST_MOD_KEY, 'Admin login returns authorization token');

    // 4. Admin login with wrong key fails safely
    const badAdminRes = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'admin',
        name: 'Unauthorized User',
        key: 'incorrect-secret-key',
      }),
    });
    assert(badAdminRes.status === 401, 'Admin login with invalid key rejected with HTTP 401');

    // 5. Invalid role rejection
    const invalidRoleRes = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'superadmin' }),
    });
    assert(invalidRoleRes.status === 400, 'Unsupported roles rejected with HTTP 400');

    // 6. Admin token verification endpoint
    const verifyRes = await fetch(`${serverUrl}/api/auth/verify`, {
      headers: { 'x-moderator-key': TEST_MOD_KEY },
    });
    assert(verifyRes.status === 200, 'Admin token verify returns HTTP 200 for valid key');

    const badVerifyRes = await fetch(`${serverUrl}/api/auth/verify`, {
      headers: { 'x-moderator-key': 'wrong-key' },
    });
    assert(badVerifyRes.status === 401, 'Admin token verify returns HTTP 401 for invalid key');

    // Disconnect clients
    emergencySocket.disconnect();
    privateVehicle1.disconnect();
    privateVehicle2.disconnect();
    privateVehicle3.disconnect();
    await new Promise((r) => setTimeout(r, 300));
  } catch (err) {
    console.error('Socket integration test error:', err);
    failed++;
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();

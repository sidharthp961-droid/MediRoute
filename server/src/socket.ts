// ─── Socket.IO event handlers with Robust Geofence & Vehicle Registration ───

import { Server, Socket } from 'socket.io';
import { v4 as uuid } from 'uuid';
import { state } from './state';
import { isValidCoordinates, filterNearbyVehicles, haversineDistance } from './geofence';
import { isValidRegistration, formatRegistration } from './validation';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Vehicle,
  EmergencyReport,
  PublicEmergencyReport,
  EmergencyReportStatus,
} from './types';
import {
  analyzeReportRisk,
  validateAndFingerprintPhoto,
  MODERATOR_SECRET,
  ALLOWED_CATEGORIES,
  getPublicReport,
} from './reportValidation';

type IOServer = Server<ClientToServerEvents, ServerToClientEvents>;
type IOSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(io: IOServer): void {

  // ── Broadcast helpers ──

  function getPublicVehicle(v: Vehicle) {
    const { socketId, registrationNumber, shareConsent, ...rest } = v;
    return rest;
  }

  function broadcastVehicleList() {
    io.emit('vehicle:list', { vehicles: state.getAllVehiclesPublic() });
  }

  function broadcastEmergencyUpdate() {
    io.emit('emergency:update', { session: state.getEmergencySessionPublic() });
  }

  function broadcastNetworkStatus() {
    io.emit('network:status', {
      connectedClients: io.engine.clientsCount,
      activeEmergency: state.emergencySession !== null,
      vehicleCount: state.vehicles.size,
    });
  }

  function broadcastTimeline(evt: ReturnType<typeof state.addTimelineEvent>) {
    io.emit('timeline:event', evt);
  }

  function broadcastReportCreated(report: EmergencyReport) {
    io.emit('report:created', { report: getPublicReport(report) });
  }

  function broadcastReportUpdated(report: EmergencyReport) {
    io.emit('report:updated', { report: getPublicReport(report) });
  }

  /**
   * Server-authoritative proximity check.
   * Finds all eligible driver vehicles within the 1,000 m emergency radius and
   * delivers targeted alerts ONLY to eligible vehicles.
   */
  function evaluateProximityAlerts() {
    const session = state.emergencySession;
    if (!session || session.status !== 'active') return;

    // Check emergency vehicle staleness (> 45s without telemetry)
    const stalenessChanged = state.checkEmergencyStaleness(45_000);
    if (stalenessChanged) {
      broadcastEmergencyUpdate();
    }

    const drivers = state.getDriverVehicles();
    const eligible = filterNearbyVehicles(
      session.origin,
      drivers.map((d) => ({
        id: d.id,
        location: d.location,
      })),
      session.radiusMetres,
    );

    const eligibleIds = new Set(eligible.map((e) => e.id));

    // Send alerts to newly-eligible vehicles (prevents duplicate emissions)
    for (const { id, distance } of eligible) {
      if (!session.alertedVehicleIds.has(id)) {
        const vehicle = state.getVehicle(id);
        if (!vehicle) continue;

        session.alertedVehicleIds.add(id);

        // Targeted alert — sent only to this specific vehicle's socket
        io.to(vehicle.socketId).emit('alert:incoming', {
          sessionId: session.id,
          emergencyOrigin: session.origin,
          distance,
          message:
            'Emergency vehicle approaching. Stay alert and make way only when safe.',
          isStale: session.isStale,
          timestamp: Date.now(),
          targetVehicleRegistration: vehicle.registrationNumber,
          targetVehicleConsent: vehicle.shareConsent,
        });

        const evt = state.addTimelineEvent(
          'vehicle_alerted',
          `Alert sent to ${vehicle.label || vehicle.id} (${distance}m away)`,
          vehicle.id,
        );
        broadcastTimeline(evt);
      }
    }

    // Expire alerts for vehicles that moved out of range
    for (const alertedId of Array.from(session.alertedVehicleIds)) {
      if (!eligibleIds.has(alertedId)) {
        session.alertedVehicleIds.delete(alertedId);

        const vehicle = state.getVehicle(alertedId);
        if (vehicle) {
          io.to(vehicle.socketId).emit('alert:expired', {
            sessionId: session.id,
            reason: 'out_of_range',
          });

          const evt = state.addTimelineEvent(
            'alert_expired',
            `Alert expired for ${vehicle.label || vehicle.id} (moved out of range)`,
            vehicle.id,
          );
          broadcastTimeline(evt);
        }
      }
    }

    broadcastEmergencyUpdate();
  }

  // ── Connection ──

  io.on('connection', (socket: IOSocket) => {
    broadcastNetworkStatus();

    // Send current state to newly connected client
    socket.emit('vehicle:list', { vehicles: state.getAllVehiclesPublic() });
    socket.emit('emergency:update', { session: state.getEmergencySessionPublic() });
    socket.emit('report:list', { reports: state.getAllReportsPublic() });

    // ── Register vehicle ──
    socket.on('vehicle:register', (data) => {
      if (!data || !data.role || !['emergency', 'driver', 'monitor'].includes(data.role)) {
        socket.emit('error', { message: 'Invalid registration: valid role is required' });
        return;
      }

      if (data.location && !isValidCoordinates(data.location)) {
        socket.emit('error', { message: 'Invalid registration: coordinates are invalid' });
        return;
      }

      if (data.registrationNumber && !isValidRegistration(data.registrationNumber)) {
        socket.emit('error', {
          message: 'Invalid vehicle registration format (e.g. KL 07 CA 1234 required)',
        });
        return;
      }

      // Check if re-registering an existing vehicle ID (reconnection)
      let vehicle: Vehicle | undefined;
      if (data.vehicleId) {
        vehicle = state.rebindVehicleSocket(data.vehicleId, socket.id);
        if (vehicle) {
          if (data.location) vehicle.location = data.location;
          if (data.label) vehicle.label = data.label;
          if (data.registrationNumber) {
            vehicle.registrationNumber = formatRegistration(data.registrationNumber);
          }
          if (typeof data.shareConsent === 'boolean') {
            vehicle.shareConsent = data.shareConsent;
          }
        }
      }

      // Check if socket was already registered
      if (!vehicle) {
        const existingBySocket = state.getVehicleBySocket(socket.id);
        if (existingBySocket) {
          existingBySocket.role = data.role;
          if (data.location) existingBySocket.location = data.location;
          if (data.label) existingBySocket.label = data.label;
          if (data.registrationNumber) {
            existingBySocket.registrationNumber = formatRegistration(data.registrationNumber);
          }
          if (typeof data.shareConsent === 'boolean') {
            existingBySocket.shareConsent = data.shareConsent;
          }
          existingBySocket.lastSeen = Date.now();
          vehicle = existingBySocket;
        }
      }

      // Create new vehicle if not found
      if (!vehicle) {
        vehicle = {
          id: data.vehicleId || uuid(),
          socketId: socket.id,
          role: data.role,
          location: data.location || null,
          lastSeen: Date.now(),
          label: data.label,
          isSimulated: data.isSimulated || false,
          registrationNumber: data.registrationNumber
            ? formatRegistration(data.registrationNumber)
            : undefined,
          shareConsent: Boolean(data.shareConsent),
        };
        state.addVehicle(vehicle);
      }

      socket.emit('vehicle:registered', { vehicleId: vehicle.id });

      const evt = state.addTimelineEvent(
        'vehicle_connected',
        `${vehicle.label || vehicle.role} connected`,
        vehicle.id,
      );
      broadcastTimeline(evt);
      broadcastVehicleList();
      broadcastNetworkStatus();

      // If active emergency, check if this vehicle is immediately eligible for an alert
      const session = state.emergencySession;
      if (session && session.status === 'active' && vehicle.role === 'driver' && vehicle.location) {
        if (isValidCoordinates(vehicle.location)) {
          const dist = haversineDistance(session.origin, vehicle.location);
          if (dist <= session.radiusMetres) {
            session.alertedVehicleIds.add(vehicle.id);
            socket.emit('alert:incoming', {
              sessionId: session.id,
              emergencyOrigin: session.origin,
              distance: Math.round(dist),
              message:
                'Emergency vehicle approaching. Stay alert and make way only when safe.',
              isStale: session.isStale,
              timestamp: Date.now(),
              targetVehicleRegistration: vehicle.registrationNumber,
              targetVehicleConsent: vehicle.shareConsent,
            });
          }
        }
        evaluateProximityAlerts();
      }
    });

    // ── Update vehicle registration number & consent ──
    socket.on('vehicle:set-registration', (data) => {
      const vehicle = state.getVehicleBySocket(socket.id);
      if (!vehicle) {
        socket.emit('error', { message: 'Vehicle not registered' });
        return;
      }

      let formatted: string | null = null;
      if (data.registrationNumber && data.registrationNumber.trim()) {
        if (!isValidRegistration(data.registrationNumber)) {
          socket.emit('error', {
            message: 'Invalid registration format. Must conform to standard plates (e.g. KL 07 CA 1234).',
          });
          return;
        }
        formatted = formatRegistration(data.registrationNumber);
        vehicle.registrationNumber = formatted;
      } else {
        vehicle.registrationNumber = undefined;
      }

      vehicle.shareConsent = Boolean(data.shareConsent);

      socket.emit('vehicle:registration-updated', {
        registrationNumber: formatted,
        shareConsent: vehicle.shareConsent,
      });

      // If active emergency and this vehicle is alerted, re-dispatch alert with updated registration
      const session = state.emergencySession;
      if (session && session.status === 'active' && session.alertedVehicleIds.has(vehicle.id) && vehicle.location) {
        const dist = haversineDistance(session.origin, vehicle.location);
        socket.emit('alert:incoming', {
          sessionId: session.id,
          emergencyOrigin: session.origin,
          distance: Math.round(dist),
          message:
            'Emergency vehicle approaching. Stay alert and make way only when safe.',
          isStale: session.isStale,
          timestamp: Date.now(),
          targetVehicleRegistration: vehicle.registrationNumber,
          targetVehicleConsent: vehicle.shareConsent,
        });
      }
    });

    // ── Location update ──
    socket.on('vehicle:location', (data) => {
      if (!isValidCoordinates(data?.location)) {
        socket.emit('error', {
          message: 'Invalid coordinates: latitude must be [-90, 90] and longitude [-180, 180]',
        });
        return;
      }

      const vehicle = state.getVehicleBySocket(socket.id);
      if (!vehicle) {
        socket.emit('error', { message: 'Vehicle not registered' });
        return;
      }

      // Out-of-order update protection
      if (typeof data.timestamp === 'number') {
        if (vehicle.lastLocationTimestamp && data.timestamp < vehicle.lastLocationTimestamp) {
          // Discard older out-of-order packet
          return;
        }
        vehicle.lastLocationTimestamp = data.timestamp;
      }

      vehicle.location = data.location;
      vehicle.lastSeen = Date.now();

      // If this vehicle is the active emergency vehicle, update emergency session origin
      if (state.emergencySession && state.emergencySession.vehicleId === vehicle.id) {
        state.updateEmergencyOrigin(data.location);
      }

      io.emit('vehicle:updated', {
        vehicle: getPublicVehicle(vehicle),
      });

      // Re-evaluate proximity
      evaluateProximityAlerts();
    });

    // ── Start emergency ──
    socket.on('emergency:start', (data) => {
      if (!isValidCoordinates(data?.origin)) {
        socket.emit('error', { message: 'Invalid origin coordinates' });
        return;
      }

      if (data?.destination && !isValidCoordinates(data.destination)) {
        socket.emit('error', { message: 'Invalid destination coordinates' });
        return;
      }

      if (state.emergencySession?.status === 'active') {
        socket.emit('error', { message: 'An emergency is already active' });
        return;
      }

      const vehicle = state.getVehicleBySocket(socket.id);
      if (!vehicle) {
        socket.emit('error', { message: 'Vehicle not registered' });
        return;
      }

      // Update vehicle location to emergency origin
      vehicle.location = data.origin;
      vehicle.lastSeen = Date.now();

      state.startEmergency(
        vehicle.id,
        data.origin,
        data.destination || null,
      );

      const evt = state.addTimelineEvent(
        'emergency_started',
        `Emergency started by ${vehicle.label || vehicle.id}`,
        vehicle.id,
      );
      broadcastTimeline(evt);
      broadcastEmergencyUpdate();
      broadcastVehicleList();
      broadcastNetworkStatus();

      // Evaluate proximity immediately
      evaluateProximityAlerts();
    });

    // ── Cancel emergency ──
    socket.on('emergency:cancel', () => {
      const session = state.emergencySession;
      if (!session || session.status !== 'active') {
        socket.emit('error', { message: 'No active emergency to cancel' });
        return;
      }

      // Notify all alerted vehicles
      for (const alertedId of Array.from(session.alertedVehicleIds)) {
        const v = state.getVehicle(alertedId);
        if (v) {
          io.to(v.socketId).emit('alert:expired', {
            sessionId: session.id,
            reason: 'emergency_cancelled',
          });
        }
      }

      state.endEmergency('cancelled');

      const evt = state.addTimelineEvent(
        'emergency_cancelled',
        'Emergency cancelled',
      );
      broadcastTimeline(evt);
      broadcastEmergencyUpdate();
      broadcastNetworkStatus();
    });

    // ── Complete emergency ──
    socket.on('emergency:complete', () => {
      const session = state.emergencySession;
      if (!session || session.status !== 'active') {
        socket.emit('error', { message: 'No active emergency to complete' });
        return;
      }

      // Notify all alerted vehicles
      for (const alertedId of Array.from(session.alertedVehicleIds)) {
        const v = state.getVehicle(alertedId);
        if (v) {
          io.to(v.socketId).emit('alert:expired', {
            sessionId: session.id,
            reason: 'emergency_ended',
          });
        }
      }

      state.endEmergency('completed');

      const evt = state.addTimelineEvent(
        'emergency_completed',
        'Emergency completed — patient delivered safely',
      );
      broadcastTimeline(evt);
      broadcastEmergencyUpdate();
      broadcastNetworkStatus();
    });

    // ── Simulation: create vehicle ──
    socket.on('sim:create-vehicle', (data) => {
      if (!data?.label || !isValidCoordinates(data?.location)) {
        socket.emit('error', { message: 'Simulation vehicle requires valid label and coordinates' });
        return;
      }

      const vehicle: Vehicle = {
        id: uuid(),
        socketId: socket.id, // managed by the monitor client
        role: 'driver',
        location: data.location,
        lastSeen: Date.now(),
        label: data.label,
        isSimulated: true,
      };

      state.addVehicle(vehicle);
      state.simulatedVehicleIds.add(vehicle.id);

      const evt = state.addTimelineEvent(
        'vehicle_connected',
        `Simulated ${vehicle.label} added`,
        vehicle.id,
      );
      broadcastTimeline(evt);
      broadcastVehicleList();
      broadcastNetworkStatus();
      evaluateProximityAlerts();
    });

    // ── Simulation: move vehicle ──
    socket.on('sim:move', (data) => {
      if (!data?.vehicleId || !isValidCoordinates(data?.location)) {
        socket.emit('error', { message: 'Move requires vehicleId and valid coordinates' });
        return;
      }

      const vehicle = state.getVehicle(data.vehicleId);
      if (!vehicle) {
        socket.emit('error', { message: 'Vehicle not found' });
        return;
      }

      vehicle.location = data.location;
      vehicle.lastSeen = Date.now();

      io.emit('vehicle:updated', {
        vehicle: getPublicVehicle(vehicle),
      });

      evaluateProximityAlerts();
    });

    // ── Simulation: stop (remove all simulated vehicles) ──
    socket.on('sim:stop', () => {
      for (const simId of Array.from(state.simulatedVehicleIds)) {
        // Expire any alerts for this simulated vehicle
        if (state.emergencySession) {
          state.emergencySession.alertedVehicleIds.delete(simId);
        }
        state.removeVehicle(simId);
        io.emit('vehicle:removed', { vehicleId: simId });
      }
      state.simulatedVehicleIds.clear();

      const evt = state.addTimelineEvent(
        'simulation_stopped',
        'All simulated vehicles removed',
      );
      broadcastTimeline(evt);
      broadcastVehicleList();
      broadcastNetworkStatus();
    });

    // ── Emergency Report Submission (Phase 5) ──
    socket.on('report:submit', (data) => {
      if (!data || !ALLOWED_CATEGORIES.includes(data.category)) {
        socket.emit('report:error', { message: 'Valid emergency category is required' });
        return;
      }

      if (!data.description || typeof data.description !== 'string' || data.description.trim().length < 5) {
        socket.emit('report:error', { message: 'Description must be at least 5 characters' });
        return;
      }

      if (!isValidCoordinates(data.location)) {
        socket.emit('report:error', { message: 'Invalid or missing incident coordinates' });
        return;
      }

      const photoCheck = validateAndFingerprintPhoto(data.photoUrl);
      if (!photoCheck.valid) {
        socket.emit('report:error', { message: photoCheck.error || 'Invalid photo format' });
        return;
      }

      // Check velocity for this socket
      const velocity = state.recordSubmissionVelocity(socket.id);
      if (velocity > 5) {
        socket.emit('report:error', {
          message: 'Rate limit exceeded: too many reports submitted in 10 minutes',
        });
        return;
      }

      const existingReports = Array.from(state.reports.values());
      const risk = analyzeReportRisk(
        {
          category: data.category,
          description: data.description.trim(),
          location: data.location,
          photoHash: photoCheck.hash,
          reporterSessionId: socket.id,
          timestamp: data.clientTimestamp || Date.now(),
        },
        existingReports,
        velocity,
      );

      const report: EmergencyReport = {
        id: uuid(),
        category: data.category,
        description: data.description.trim(),
        location: data.location,
        locationAddress: data.locationAddress,
        locationSource: data.locationSource || 'gps',
        photoUrl: data.photoUrl,
        photoHash: photoCheck.hash,
        timestamp: data.clientTimestamp || Date.now(),
        status: 'PENDING', // STRICT DEFAULT TO PENDING
        reporterSessionId: socket.id,
        riskScore: risk.riskScore,
        riskFlags: risk.riskFlags,
        riskNotes: risk.riskNotes,
        isUrgentReview: risk.isUrgentReview,
        auditTrail: [
          {
            id: uuid(),
            timestamp: Date.now(),
            previousStatus: 'PENDING',
            newStatus: 'PENDING',
            changedBy: 'system',
            reason: 'Initial community report submission (pending verification)',
          },
        ],
      };

      state.addReport(report);
      broadcastReportCreated(report);

      const evt = state.addTimelineEvent(
        'vehicle_alerted',
        `Community report filed: ${report.category.toUpperCase()} (Pending Moderator Review)`,
      );
      broadcastTimeline(evt);
    });

    // ── Moderator Verification Workflow ──
    socket.on('report:update-status', (data) => {
      if (!data || data.moderatorKey !== MODERATOR_SECRET) {
        socket.emit('report:error', {
          message: 'Unauthorized: valid moderator authorization key required',
        });
        return;
      }

      if (!['PENDING', 'VERIFIED', 'SUSPICIOUS', 'REJECTED'].includes(data.newStatus)) {
        socket.emit('report:error', { message: 'Invalid target status' });
        return;
      }

      const report = state.getReport(data.reportId);
      if (!report) {
        socket.emit('report:error', { message: 'Report not found' });
        return;
      }

      const updated = state.updateReportStatus(
        data.reportId,
        data.newStatus,
        data.moderatorName || 'Authorized Moderator',
        data.reason || 'Status updated via moderation queue',
      );

      if (updated) {
        broadcastReportUpdated(updated);
        const evt = state.addTimelineEvent(
          data.newStatus === 'VERIFIED' ? 'emergency_started' : 'emergency_cancelled',
          `Report #${report.id.slice(0, 6)} marked ${data.newStatus} by moderator (${data.reason || 'verified'})`,
        );
        broadcastTimeline(evt);
      }
    });

    // ── Escalate Verified Report into Active Emergency Corridor ──
    socket.on('report:escalate', (data) => {
      if (!data || data.moderatorKey !== MODERATOR_SECRET) {
        socket.emit('report:error', {
          message: 'Unauthorized: valid moderator authorization key required',
        });
        return;
      }

      const report = state.getReport(data.reportId);
      if (!report) {
        socket.emit('report:error', { message: 'Report not found' });
        return;
      }

      if (report.status !== 'VERIFIED') {
        socket.emit('report:error', {
          message: 'Safe Handling Rule: Only VERIFIED reports can be escalated to an active emergency corridor',
        });
        return;
      }

      if (state.emergencySession?.status === 'active') {
        socket.emit('error', { message: 'An emergency corridor is already active' });
        return;
      }

      const escalatedVehicleId = `esc-rep-${report.id.slice(0, 8)}`;
      const emergencyVehicle: Vehicle = {
        id: escalatedVehicleId,
        socketId: socket.id,
        role: 'emergency',
        location: report.location,
        lastSeen: Date.now(),
        label: `Escalated Unit: ${report.category.toUpperCase()}`,
      };

      state.addVehicle(emergencyVehicle);
      const session = state.startEmergency(
        escalatedVehicleId,
        report.location,
        data.destination || null,
      );

      report.escalatedToEmergencyId = session.id;
      report.auditTrail.push({
        id: uuid(),
        timestamp: Date.now(),
        previousStatus: 'VERIFIED',
        newStatus: 'VERIFIED',
        changedBy: 'Authorized Moderator',
        reason: 'Explicitly escalated into active emergency response corridor (1 km geofence active)',
      });

      broadcastReportUpdated(report);
      broadcastEmergencyUpdate();
      broadcastVehicleList();
      broadcastNetworkStatus();

      const evt = state.addTimelineEvent(
        'emergency_started',
        `Active Emergency activated from verified report #${report.id.slice(0, 6)}: ${report.category.toUpperCase()}`,
        escalatedVehicleId,
      );
      broadcastTimeline(evt);

      // Trigger 1 km geofence immediately
      evaluateProximityAlerts();
    });

    // ── Disconnection ──
    socket.on('disconnect', () => {
      const vehicle = state.removeVehicleBySocket(socket.id);
      if (vehicle) {
        // Clean up alerts
        if (state.emergencySession) {
          state.emergencySession.alertedVehicleIds.delete(vehicle.id);
        }

        const evt = state.addTimelineEvent(
          'vehicle_disconnected',
          `${vehicle.label || vehicle.role} disconnected`,
          vehicle.id,
        );
        broadcastTimeline(evt);
        broadcastVehicleList();
        broadcastNetworkStatus();
      }
    });
  });

  // ── Periodic stale cleanup & emergency staleness heartbeat every 15 seconds ──
  setInterval(() => {
    // 1. Check emergency staleness
    const stalenessChanged = state.checkEmergencyStaleness(45_000);
    if (stalenessChanged) {
      broadcastEmergencyUpdate();
    }

    // 2. Cleanup stale drivers
    const stale = state.cleanupStale();
    if (stale.length > 0) {
      for (const id of stale) {
        io.emit('vehicle:removed', { vehicleId: id });
      }
      broadcastVehicleList();
      broadcastNetworkStatus();
    }
  }, 15_000);
}

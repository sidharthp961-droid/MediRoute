import {
  Vehicle,
  EmergencySession,
  TimelineEvent,
  Coordinates,
  EmergencyReport,
  PublicEmergencyReport,
  EmergencyReportStatus,
} from './types';
import { v4 as uuid } from 'uuid';

class AppState {
  vehicles: Map<string, Vehicle> = new Map();
  emergencySession: EmergencySession | null = null;
  timeline: TimelineEvent[] = [];
  simulatedVehicleIds: Set<string> = new Set();
  reports: Map<string, EmergencyReport> = new Map();
  submissionHistory: Map<string, number[]> = new Map(); // sessionId/IP -> timestamps

  // ── Vehicles ──

  addVehicle(vehicle: Vehicle): void {
    this.vehicles.set(vehicle.id, vehicle);
  }

  rebindVehicleSocket(vehicleId: string, socketId: string): Vehicle | undefined {
    const v = this.vehicles.get(vehicleId);
    if (v) {
      v.socketId = socketId;
      v.lastSeen = Date.now();
      return v;
    }
    return undefined;
  }

  removeVehicle(vehicleId: string): void {
    this.vehicles.delete(vehicleId);
    this.simulatedVehicleIds.delete(vehicleId);
  }

  removeVehicleBySocket(socketId: string): Vehicle | undefined {
    for (const [id, v] of this.vehicles) {
      if (v.socketId === socketId) {
        this.vehicles.delete(id);
        this.simulatedVehicleIds.delete(id);
        return v;
      }
    }
    return undefined;
  }

  getVehicle(vehicleId: string): Vehicle | undefined {
    return this.vehicles.get(vehicleId);
  }

  getVehicleBySocket(socketId: string): Vehicle | undefined {
    for (const v of this.vehicles.values()) {
      if (v.socketId === socketId) return v;
    }
    return undefined;
  }

  /**
   * Returns active driver vehicles.
   * Discards stale drivers (lastSeen > 60s ago) and drivers without a valid location.
   */
  getDriverVehicles(): Vehicle[] {
    const cutoff = Date.now() - 60_000;
    return Array.from(this.vehicles.values()).filter(
      (v) => v.role === 'driver' && v.location !== null && v.lastSeen >= cutoff,
    );
  }

  setVehicleRegistration(
    vehicleId: string,
    registrationNumber: string | null,
    shareConsent: boolean,
  ): Vehicle | undefined {
    const v = this.vehicles.get(vehicleId);
    if (v) {
      v.registrationNumber = registrationNumber || undefined;
      v.shareConsent = shareConsent;
      return v;
    }
    return undefined;
  }

  /**
   * Returns sanitized vehicle list for public broadcast.
   * Strips socketId, private vehicle registration numbers, and consent flags by default.
   */
  getAllVehiclesPublic() {
    return Array.from(this.vehicles.values()).map(
      ({ socketId, registrationNumber, shareConsent, ...rest }) => rest,
    );
  }

  // ── Emergency ──

  startEmergency(
    vehicleId: string,
    origin: Coordinates,
    destination: Coordinates | null,
  ): EmergencySession {
    const now = Date.now();
    this.emergencySession = {
      id: uuid(),
      vehicleId,
      status: 'active',
      origin,
      destination,
      radiusMetres: 1000,
      createdAt: now,
      lastOriginUpdate: now,
      isStale: false,
      endedAt: null,
      alertedVehicleIds: new Set(),
    };
    return this.emergencySession;
  }

  updateEmergencyOrigin(location: Coordinates): boolean {
    if (!this.emergencySession || this.emergencySession.status !== 'active') {
      return false;
    }
    this.emergencySession.origin = location;
    this.emergencySession.lastOriginUpdate = Date.now();
    this.emergencySession.isStale = false;
    return true;
  }

  /**
   * Checks if emergency vehicle telemetry is older than threshold.
   * If stale, marks isStale = true.
   * Returns true if staleness state changed.
   */
  checkEmergencyStaleness(thresholdMs: number = 45_000): boolean {
    if (!this.emergencySession || this.emergencySession.status !== 'active') {
      return false;
    }
    const lastUpdate = this.emergencySession.lastOriginUpdate || this.emergencySession.createdAt;
    const nowStale = Date.now() - lastUpdate > thresholdMs;
    if (this.emergencySession.isStale !== nowStale) {
      this.emergencySession.isStale = nowStale;
      return true;
    }
    return false;
  }

  endEmergency(status: 'completed' | 'cancelled'): EmergencySession | null {
    if (!this.emergencySession) return null;
    this.emergencySession.status = status;
    this.emergencySession.endedAt = Date.now();
    const session = this.emergencySession;
    this.emergencySession = null;
    return session;
  }

  getEmergencySessionPublic() {
    if (!this.emergencySession) return null;
    return {
      ...this.emergencySession,
      alertedVehicleIds: Array.from(this.emergencySession.alertedVehicleIds),
    };
  }

  // ── Emergency Reports (Phase 5) ──

  addReport(report: EmergencyReport): EmergencyReport {
    this.reports.set(report.id, report);
    return report;
  }

  getReport(id: string): EmergencyReport | undefined {
    return this.reports.get(id);
  }

  /**
   * Sanitizes reports for public consumption.
   * Masks internal reporterSessionId and photoHash.
   * Assures private vehicle registrations are never exposed.
   */
  getAllReportsPublic(): PublicEmergencyReport[] {
    return Array.from(this.reports.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(({ reporterSessionId, photoHash, ...rest }) => rest);
  }

  updateReportStatus(
    reportId: string,
    newStatus: EmergencyReportStatus,
    changedBy: string,
    reason: string,
  ): EmergencyReport | undefined {
    const report = this.reports.get(reportId);
    if (!report) return undefined;

    const previousStatus = report.status;
    report.status = newStatus;
    report.auditTrail.push({
      id: uuid(),
      timestamp: Date.now(),
      previousStatus,
      newStatus,
      changedBy,
      reason,
    });

    return report;
  }

  recordSubmissionVelocity(identifier: string): number {
    const now = Date.now();
    const cutoff = now - 10 * 60 * 1000; // 10 minutes
    const timestamps = (this.submissionHistory.get(identifier) || []).filter((t) => t >= cutoff);
    timestamps.push(now);
    this.submissionHistory.set(identifier, timestamps);
    return timestamps.length;
  }

  // ── Timeline ──

  addTimelineEvent(
    type: TimelineEvent['type'],
    message: string,
    vehicleId?: string,
  ): TimelineEvent {
    const evt: TimelineEvent = {
      id: uuid(),
      timestamp: Date.now(),
      type,
      message,
      vehicleId,
    };
    this.timeline.push(evt);
    if (this.timeline.length > 200) {
      this.timeline = this.timeline.slice(-100);
    }
    return evt;
  }

  // ── Cleanup stale locations (> 60s) ──
  cleanupStale(): string[] {
    const cutoff = Date.now() - 60_000;
    const staleIds: string[] = [];
    for (const [id, v] of this.vehicles) {
      if (v.lastSeen < cutoff && v.role !== 'monitor') {
        staleIds.push(id);
      }
    }
    for (const id of staleIds) {
      this.vehicles.delete(id);
      this.simulatedVehicleIds.delete(id);
    }
    return staleIds;
  }
}

export const state = new AppState();

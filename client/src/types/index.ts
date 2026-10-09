// ─── Client-side types (mirrors server types without socketId) ───

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: string;
  role: 'emergency' | 'driver' | 'monitor';
  location: Coordinates | null;
  lastSeen: number;
  label?: string;
  isSimulated?: boolean;
  registrationNumber?: string;
  shareConsent?: boolean;
}

export type EmergencyStatus = 'idle' | 'active' | 'completed' | 'cancelled';

export interface EmergencySession {
  id: string;
  vehicleId: string;
  status: EmergencyStatus;
  origin: Coordinates;
  destination: Coordinates | null;
  radiusMetres: number;
  createdAt: number;
  endedAt: number | null;
  alertedVehicleIds: string[];
  isStale?: boolean;
  lastOriginUpdate?: number;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: string;
  message: string;
  vehicleId?: string;
}

export interface AlertData {
  sessionId: string;
  emergencyOrigin: Coordinates;
  distance: number;
  message: string;
  isStale?: boolean;
  timestamp?: number;
  targetVehicleRegistration?: string;
  targetVehicleConsent?: boolean;
}

export interface NetworkStatus {
  connectedClients: number;
  activeEmergency: boolean;
  vehicleCount: number;
}

export type EmergencyReportStatus = 'PENDING' | 'VERIFIED' | 'SUSPICIOUS' | 'REJECTED';

export type EmergencyCategory =
  | 'cardiac'
  | 'accident'
  | 'maternal'
  | 'respiratory'
  | 'trauma'
  | 'stroke'
  | 'other';

export interface ReportAuditEntry {
  id: string;
  timestamp: number;
  previousStatus: EmergencyReportStatus;
  newStatus: EmergencyReportStatus;
  changedBy: string;
  reason: string;
}

export interface EmergencyReport {
  id: string;
  category: EmergencyCategory;
  description: string;
  location: Coordinates;
  locationAddress?: string;
  locationSource: 'gps' | 'manual';
  photoUrl?: string;
  timestamp: number;
  status: EmergencyReportStatus;
  riskScore: number;
  riskFlags: string[];
  riskNotes: string[];
  isUrgentReview?: boolean;
  escalatedToEmergencyId?: string;
  auditTrail: ReportAuditEntry[];
}

// Demo coordinates — Kerala (Thodupuzha emergency hub)
export const DEMO_COORDS = {
  emergency: { lat: 9.8959, lng: 76.7184 }, // Thodupuzha District Hospital / Town Junction
  vehicleA:  { lat: 9.8980, lng: 76.7202 }, // ~306m north-east (within 1km radius -> alerts)
  vehicleB:  { lat: 9.9015, lng: 76.7231 }, // ~808m north-east (within 1km radius -> alerts)
  vehicleC:  { lat: 9.9050, lng: 76.7260 }, // ~1310m north-east (outside 1km radius -> no alert)
} as const;


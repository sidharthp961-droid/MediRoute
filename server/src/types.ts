// ─── Shared types for MediRoute ───

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Vehicle {
  id: string;
  socketId: string;
  role: 'emergency' | 'driver' | 'monitor';
  location: Coordinates | null;
  lastSeen: number;
  lastLocationTimestamp?: number;
  label?: string;
  isSimulated?: boolean;
  registrationNumber?: string; // Private vehicle registration (user-entered, unverified)
  shareConsent?: boolean;       // Driver's explicit opt-in consent to share registration
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
  lastOriginUpdate?: number;
  isStale?: boolean;
  endedAt: number | null;
  alertedVehicleIds: Set<string>;
}

export interface TimelineEvent {
  id: string;
  timestamp: number;
  type: 'emergency_started' | 'emergency_cancelled' | 'emergency_completed'
    | 'vehicle_alerted' | 'alert_expired' | 'vehicle_connected'
    | 'vehicle_disconnected' | 'vehicle_moved' | 'simulation_started'
    | 'simulation_stopped';
  message: string;
  vehicleId?: string;
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
  photoHash?: string;
  timestamp: number;
  status: EmergencyReportStatus;
  reporterSessionId: string;
  riskScore: number;
  riskFlags: string[];
  riskNotes: string[];
  isUrgentReview?: boolean;
  escalatedToEmergencyId?: string;
  auditTrail: ReportAuditEntry[];
}

export type PublicEmergencyReport = Omit<EmergencyReport, 'reporterSessionId' | 'photoHash'>;

// ─── Socket.IO Event Contracts ───

export interface ClientToServerEvents {
  'vehicle:register': (data: {
    role: Vehicle['role'];
    vehicleId?: string;
    label?: string;
    location?: Coordinates;
    isSimulated?: boolean;
    registrationNumber?: string;
    shareConsent?: boolean;
  }) => void;

  'vehicle:location': (data: {
    location: Coordinates;
    timestamp?: number;
  }) => void;

  'vehicle:set-registration': (data: {
    registrationNumber: string | null;
    shareConsent: boolean;
  }) => void;

  'emergency:start': (data: {
    origin: Coordinates;
    destination?: Coordinates;
  }) => void;

  'emergency:cancel': () => void;
  'emergency:complete': () => void;

  'report:submit': (data: {
    category: EmergencyCategory;
    description: string;
    location: Coordinates;
    locationAddress?: string;
    locationSource: 'gps' | 'manual';
    photoUrl?: string;
    clientTimestamp?: number;
  }) => void;

  'report:update-status': (data: {
    reportId: string;
    newStatus: EmergencyReportStatus;
    reason: string;
    moderatorKey: string;
    moderatorName?: string;
  }) => void;

  'report:escalate': (data: {
    reportId: string;
    moderatorKey: string;
    destination?: Coordinates;
  }) => void;

  'sim:start': () => void;
  'sim:stop': () => void;
  'sim:move': (data: {
    vehicleId: string;
    location: Coordinates;
  }) => void;
  'sim:create-vehicle': (data: {
    label: string;
    location: Coordinates;
  }) => void;
}

export interface ServerToClientEvents {
  'vehicle:registered': (data: {
    vehicleId: string;
  }) => void;

  'vehicle:list': (data: {
    vehicles: Array<Omit<Vehicle, 'socketId' | 'registrationNumber' | 'shareConsent'> & {
      socketId?: never;
      registrationNumber?: never;
      shareConsent?: never;
    }>;
  }) => void;

  'vehicle:updated': (data: {
    vehicle: Omit<Vehicle, 'socketId' | 'registrationNumber' | 'shareConsent'> & {
      socketId?: never;
      registrationNumber?: never;
      shareConsent?: never;
    };
  }) => void;

  'vehicle:removed': (data: {
    vehicleId: string;
  }) => void;

  'vehicle:registration-updated': (data: {
    registrationNumber: string | null;
    shareConsent: boolean;
  }) => void;

  'emergency:update': (data: {
    session: {
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
    } | null;
  }) => void;

  'alert:incoming': (data: {
    sessionId: string;
    emergencyOrigin: Coordinates;
    distance: number;
    message: string;
    isStale?: boolean;
    timestamp?: number;
    targetVehicleRegistration?: string; // Recipient driver's registered vehicle (if set)
    targetVehicleConsent?: boolean;
  }) => void;

  'alert:expired': (data: {
    sessionId: string;
    reason: 'out_of_range' | 'emergency_ended' | 'emergency_cancelled';
  }) => void;

  'timeline:event': (data: TimelineEvent) => void;

  'network:status': (data: {
    connectedClients: number;
    activeEmergency: boolean;
    vehicleCount: number;
  }) => void;

  'report:list': (data: {
    reports: PublicEmergencyReport[];
  }) => void;

  'report:created': (data: {
    report: PublicEmergencyReport;
  }) => void;

  'report:updated': (data: {
    report: PublicEmergencyReport;
  }) => void;

  'report:error': (data: {
    message: string;
  }) => void;

  'error': (data: { message: string }) => void;
}

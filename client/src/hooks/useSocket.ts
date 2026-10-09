// ─── useSocket hook — robust connection lifecycle and subscription management ───

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import type {
  Vehicle,
  EmergencySession,
  TimelineEvent,
  AlertData,
  NetworkStatus,
  Coordinates,
  EmergencyReport,
  EmergencyReportStatus,
  EmergencyCategory,
} from '@/types';
import type { Socket } from 'socket.io-client';

export function useSocket(
  role: Vehicle['role'],
  label?: string,
  initialLocation?: Coordinates | null,
) {
  const [connected, setConnected] = useState(false);
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [emergency, setEmergency] = useState<EmergencySession | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [alert, setAlert] = useState<AlertData | null>(null);
  const [reports, setReports] = useState<EmergencyReport[]>([]);
  const [reportError, setReportError] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(() => {
    try {
      return localStorage.getItem('mediroute_driver_reg');
    } catch {
      return null;
    }
  });
  const [shareConsent, setShareConsent] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mediroute_driver_consent') === 'true';
    } catch {
      return false;
    }
  });

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    connectedClients: 0,
    activeEmergency: false,
    vehicleCount: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const vehicleIdRef = useRef<string | null>(null);
  const regRef = useRef<string | null>(registrationNumber);
  const consentRef = useRef<boolean>(shareConsent);

  useEffect(() => {
    vehicleIdRef.current = vehicleId;
  }, [vehicleId]);

  useEffect(() => {
    regRef.current = registrationNumber;
  }, [registrationNumber]);

  useEffect(() => {
    consentRef.current = shareConsent;
  }, [shareConsent]);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    function onConnect() {
      setConnected(true);
      setError(null);
      // Pass vehicleIdRef and driver registration if reconnecting
      socket.emit('vehicle:register', {
        role,
        label,
        vehicleId: vehicleIdRef.current || undefined,
        location: initialLocation || undefined,
        registrationNumber: regRef.current || undefined,
        shareConsent: consentRef.current,
      } as any);
    }

    function onDisconnect() {
      setConnected(false);
    }

    function onVehicleRegistered(data: { vehicleId: string }) {
      setVehicleId(data.vehicleId);
      vehicleIdRef.current = data.vehicleId;
    }

    function onVehicleList(data: { vehicles: Vehicle[] }) {
      setVehicles(data.vehicles);
    }

    function onVehicleUpdated(data: { vehicle: Vehicle }) {
      setVehicles((prev) =>
        prev.map((v) => (v.id === data.vehicle.id ? data.vehicle : v)),
      );
    }

    function onVehicleRemoved(data: { vehicleId: string }) {
      setVehicles((prev) => prev.filter((v) => v.id !== data.vehicleId));
    }

    function onEmergencyUpdate(data: { session: EmergencySession | null }) {
      setEmergency(data.session);
    }

    function onAlertIncoming(data: AlertData) {
      setAlert(data);
    }

    function onAlertExpired(_data: { sessionId: string; reason: string }) {
      setAlert(null);
    }

    function onRegistrationUpdated(data: {
      registrationNumber: string | null;
      shareConsent: boolean;
    }) {
      setRegistrationNumber(data.registrationNumber);
      setShareConsent(data.shareConsent);
    }

    function onTimelineEvent(data: TimelineEvent) {
      setTimeline((prev) => [...prev.slice(-99), data]);
    }

    function onNetworkStatus(data: NetworkStatus) {
      setNetworkStatus(data);
    }

    function onError(data: { message: string }) {
      setError(data.message);
      setTimeout(() => setError(null), 5000);
    }

    function onReportList(data: { reports: EmergencyReport[] }) {
      setReports(data.reports);
    }

    function onReportCreated(data: { report: EmergencyReport }) {
      setReports((prev) => [data.report, ...prev.filter((r) => r.id !== data.report.id)]);
    }

    function onReportUpdated(data: { report: EmergencyReport }) {
      setReports((prev) => prev.map((r) => (r.id === data.report.id ? data.report : r)));
    }

    function onReportError(data: { message: string }) {
      setReportError(data.message);
      setTimeout(() => setReportError(null), 5000);
    }

    // Attach listeners
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('vehicle:registered', onVehicleRegistered);
    socket.on('vehicle:list', onVehicleList);
    socket.on('vehicle:updated', onVehicleUpdated);
    socket.on('vehicle:removed', onVehicleRemoved);
    socket.on('emergency:update', onEmergencyUpdate);
    socket.on('alert:incoming', onAlertIncoming);
    socket.on('alert:expired', onAlertExpired);
    socket.on('vehicle:registration-updated' as any, onRegistrationUpdated);
    socket.on('timeline:event', onTimelineEvent);
    socket.on('network:status', onNetworkStatus);
    socket.on('report:list' as any, onReportList);
    socket.on('report:created' as any, onReportCreated);
    socket.on('report:updated' as any, onReportUpdated);
    socket.on('report:error' as any, onReportError);
    socket.on('error' as any, onError);

    if (socket.connected) {
      onConnect();
    } else {
      socket.connect();
    }

    // Clean up ONLY our own registered listeners
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('vehicle:registered', onVehicleRegistered);
      socket.off('vehicle:list', onVehicleList);
      socket.off('vehicle:updated', onVehicleUpdated);
      socket.off('vehicle:removed', onVehicleRemoved);
      socket.off('emergency:update', onEmergencyUpdate);
      socket.off('alert:incoming', onAlertIncoming);
      socket.off('alert:expired', onAlertExpired);
      socket.off('vehicle:registration-updated' as any, onRegistrationUpdated);
      socket.off('timeline:event', onTimelineEvent);
      socket.off('network:status', onNetworkStatus);
      socket.off('report:list' as any, onReportList);
      socket.off('report:created' as any, onReportCreated);
      socket.off('report:updated' as any, onReportUpdated);
      socket.off('report:error' as any, onReportError);
      socket.off('error' as any, onError);
    };
  }, [role, label, initialLocation]);

  const submitReport = useCallback(
    (data: {
      category: EmergencyCategory;
      description: string;
      location: Coordinates;
      locationAddress?: string;
      locationSource: 'gps' | 'manual';
      photoUrl?: string;
    }) => {
      socketRef.current?.emit('report:submit', {
        ...data,
        clientTimestamp: Date.now(),
      } as any);
    },
    [],
  );

  const updateReportStatus = useCallback(
    (
      reportId: string,
      newStatus: EmergencyReportStatus,
      reason: string,
      moderatorKey: string,
      moderatorName?: string,
    ) => {
      socketRef.current?.emit('report:update-status', {
        reportId,
        newStatus,
        reason,
        moderatorKey,
        moderatorName,
      } as any);
    },
    [],
  );

  const escalateReport = useCallback(
    (reportId: string, moderatorKey: string, destination?: Coordinates) => {
      socketRef.current?.emit('report:escalate', {
        reportId,
        moderatorKey,
        destination,
      } as any);
    },
    [],
  );

  const startEmergency = useCallback(
    (origin: Coordinates, destination?: Coordinates) => {
      socketRef.current?.emit('emergency:start', { origin, destination } as any);
    },
    [],
  );

  const cancelEmergency = useCallback(() => {
    socketRef.current?.emit('emergency:cancel');
  }, []);

  const completeEmergency = useCallback(() => {
    socketRef.current?.emit('emergency:complete');
  }, []);

  const updateLocation = useCallback((location: Coordinates) => {
    socketRef.current?.emit('vehicle:location', {
      location,
      timestamp: Date.now(),
    } as any);
  }, []);

  const setVehicleRegistration = useCallback((reg: string | null, consent: boolean) => {
    socketRef.current?.emit('vehicle:set-registration', {
      registrationNumber: reg,
      shareConsent: consent,
    } as any);
    setRegistrationNumber(reg);
    setShareConsent(consent);
    try {
      if (reg) {
        localStorage.setItem('mediroute_driver_reg', reg);
      } else {
        localStorage.removeItem('mediroute_driver_reg');
      }
      localStorage.setItem('mediroute_driver_consent', String(consent));
    } catch {
      // ignore localStorage quotas
    }
  }, []);

  const createSimVehicle = useCallback(
    (simLabel: string, location: Coordinates) => {
      socketRef.current?.emit('sim:create-vehicle', {
        label: simLabel,
        location,
      } as any);
    },
    [],
  );

  const moveSimVehicle = useCallback(
    (simVehicleId: string, location: Coordinates) => {
      socketRef.current?.emit('sim:move', {
        vehicleId: simVehicleId,
        location,
      } as any);
    },
    [],
  );

  const stopSimulation = useCallback(() => {
    socketRef.current?.emit('sim:stop');
  }, []);

  const clearAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return {
    connected,
    vehicleId,
    vehicles,
    emergency,
    timeline,
    alert,
    reports,
    reportError,
    networkStatus,
    error,
    registrationNumber,
    shareConsent,
    setVehicleRegistration,
    submitReport,
    updateReportStatus,
    escalateReport,
    startEmergency,
    cancelEmergency,
    completeEmergency,
    updateLocation,
    createSimVehicle,
    moveSimVehicle,
    stopSimulation,
    clearAlert,
  };
}

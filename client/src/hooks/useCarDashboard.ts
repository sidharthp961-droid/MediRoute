import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  AlertData,
  EmergencySession,
  Coordinates,
  JunctionTask,
  EmergencyTrip,
  DEMO_COORDS,
} from '@/types';
import { KERALA_CORRIDORS, KeralaCorridor } from '@/lib/routing';

export interface BackendConnectionState {
  coreConnected: boolean;
  coreConnecting: boolean;
  coreUrl: string;
  coreError: string | null;
  officerConnected: boolean;
  officerConnecting: boolean;
  officerUrl: string;
  officerError: string | null;
  coreToOfficerBridgeConnected: boolean;
}

export interface UnifiedEmergencyAlert {
  id: string;
  source: 'core-geofence' | 'officer-corridor' | 'demo';
  vehicleId?: string;
  priority: 'CRITICAL' | 'URGENT' | 'ROUTINE';
  vehicleType: string;
  distanceMetres: number;
  message: string;
  isStale: boolean;
  timestamp: number;
  origin?: Coordinates;
  destinationHospital?: string;
  corridorName?: string;
  highway?: string;
  targetPlate?: string;
  acknowledged: boolean;
  acknowledgedAt?: number;
}

export function useCarDashboard() {
  // Configurable URLs with localStorage persistence
  const [coreUrl, setCoreUrlState] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('mediroute_car_core_url') ||
        (typeof window !== 'undefined'
          ? `http://${window.location.hostname || 'localhost'}:3001`
          : 'http://localhost:3001')
      );
    } catch {
      return 'http://localhost:3001';
    }
  });

  const [officerUrl, setOfficerUrlState] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('mediroute_car_officer_url') ||
        (typeof window !== 'undefined'
          ? `http://${window.location.hostname || 'localhost'}:3002`
          : 'http://localhost:3002')
      );
    } catch {
      return 'http://localhost:3002';
    }
  });

  // Connection states
  const [connections, setConnections] = useState<BackendConnectionState>({
    coreConnected: false,
    coreConnecting: true,
    coreUrl,
    coreError: null,
    officerConnected: false,
    officerConnecting: true,
    officerUrl,
    officerError: null,
    coreToOfficerBridgeConnected: false,
  });

  // Active Live Data
  const [liveCoreAlert, setLiveCoreAlert] = useState<AlertData | null>(null);
  const [liveActiveTrip, setLiveActiveTrip] = useState<EmergencyTrip | null>(null);
  const [liveJunctions, setLiveJunctions] = useState<JunctionTask[]>([]);
  const [isAlertAcknowledged, setIsAlertAcknowledged] = useState(false);
  const [acknowledgedTimestamp, setAcknowledgedTimestamp] = useState<number | null>(null);

  // Selected corridor for navigation
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('thodupuzha-muvattupuzha');

  // Registration & Driver plate
  const [driverPlate, setDriverPlate] = useState<string>(() => {
    try {
      return localStorage.getItem('mediroute_driver_plate') || 'KL 07 CA 1234';
    } catch {
      return 'KL 07 CA 1234';
    }
  });

  // Sound Alarm & Mute state
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mediroute_car_muted') === 'true';
    } catch {
      return false;
    }
  });
  const [isAlarmSounding, setIsAlarmSounding] = useState(false);

  // Demo Mode state
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoAlert, setDemoAlert] = useState<UnifiedEmergencyAlert | null>(null);
  const [demoJunctions, setDemoJunctions] = useState<JunctionTask[]>([]);

  // Sockets refs
  const coreSocketRef = useRef<Socket | null>(null);
  const officerSocketRef = useRef<Socket | null>(null);
  const seenAlertSignatures = useRef<Set<string>>(new Set());

  // Web Audio Context refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null);

  // ─── Sound System (Synthesized Warning Tone) ───
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const stopAlarm = useCallback(() => {
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      if (lfoRef.current) {
        lfoRef.current.stop();
        lfoRef.current.disconnect();
        lfoRef.current = null;
      }
      if (gainRef.current) {
        gainRef.current.disconnect();
        gainRef.current = null;
      }
    } catch {
      // ignore cleanup errors
    }
    setIsAlarmSounding(false);
  }, []);

  const playEmergencyTone = useCallback(() => {
    if (isMuted) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    stopAlarm();

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ctx.currentTime);

      // Warning siren LFO modulation
      lfo.type = 'triangle';
      lfo.frequency.setValueAtTime(2.2, ctx.currentTime);
      lfoGain.gain.setValueAtTime(200, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      lfo.start();
      osc.start();

      oscRef.current = osc;
      lfoRef.current = lfo;
      lfoGainRef.current = lfoGain;
      gainRef.current = gain;

      setIsAlarmSounding(true);
    } catch (err) {
      console.warn('[CarDashboard] Audio context alarm error:', err);
    }
  }, [getAudioContext, isMuted, stopAlarm]);

  const testSpeaker = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    stopAlarm();

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {
          // ignore
        }
      }, 700);
    } catch (err) {
      console.warn('[CarDashboard] Test tone failed:', err);
    }
  }, [getAudioContext, stopAlarm]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('mediroute_car_muted', String(next));
      } catch {
        // ignore
      }
      if (next) {
        stopAlarm();
      }
      return next;
    });
  }, [stopAlarm]);

  // ─── Core Server Socket Connection ───
  useEffect(() => {
    setConnections((prev) => ({
      ...prev,
      coreUrl,
      coreConnecting: true,
      coreError: null,
    }));

    const socket = io(coreUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 6000,
      timeout: 8000,
      transports: ['websocket', 'polling'],
    });

    coreSocketRef.current = socket;

    socket.on('connect', () => {
      setConnections((prev) => ({
        ...prev,
        coreConnected: true,
        coreConnecting: false,
        coreError: null,
      }));

      // Register driver vehicle to receive 1 km proximity alerts
      socket.emit('vehicle:register', {
        role: 'driver',
        label: 'Car Display HUD',
        location: DEMO_COORDS.vehicleA,
        registrationNumber: driverPlate,
        shareConsent: true,
      } as any);
    });

    socket.on('disconnect', (reason) => {
      setConnections((prev) => ({
        ...prev,
        coreConnected: false,
        coreConnecting: true,
        coreError: `Disconnected: ${reason}`,
      }));
    });

    socket.on('connect_error', (err) => {
      setConnections((prev) => ({
        ...prev,
        coreConnected: false,
        coreConnecting: true,
        coreError: err.message,
      }));
    });

    // Proximity alert from Core Server (1 km Geofence Engine)
    socket.on('alert:incoming', (data: AlertData) => {
      // Deduplication check
      const sig = `${data.sessionId}-${Math.round(data.distance / 100)}`;
      const isDuplicate = seenAlertSignatures.current.has(sig);
      seenAlertSignatures.current.add(sig);

      setLiveCoreAlert(data);
      setIsAlertAcknowledged(false);

      if (!isDuplicate && !isMuted) {
        playEmergencyTone();
      }
    });

    socket.on('alert:expired', () => {
      setLiveCoreAlert(null);
      stopAlarm();
    });

    socket.on('emergency:update', (data: { session: EmergencySession | null }) => {
      if (!data?.session || data.session.status !== 'active') {
        setLiveCoreAlert(null);
        stopAlarm();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [coreUrl, driverPlate, isMuted, playEmergencyTone, stopAlarm]);

  // ─── Officer Alert Server Socket Connection ───
  useEffect(() => {
    setConnections((prev) => ({
      ...prev,
      officerUrl,
      officerConnecting: true,
      officerError: null,
    }));

    const socket = io(officerUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 6000,
      timeout: 8000,
      transports: ['websocket', 'polling'],
    });

    officerSocketRef.current = socket;

    socket.on('connect', () => {
      setConnections((prev) => ({
        ...prev,
        officerConnected: true,
        officerConnecting: false,
        officerError: null,
      }));

      // Fetch active trip from REST endpoint
      fetch(`${officerUrl}/api/v1/trips/active`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.trip) {
            setLiveActiveTrip(data.trip);
            setLiveJunctions(data.trip.junctions || []);
          }
        })
        .catch(() => {
          // REST endpoint might be starting
        });
    });

    socket.on('disconnect', (reason) => {
      setConnections((prev) => ({
        ...prev,
        officerConnected: false,
        officerConnecting: true,
        officerError: `Disconnected: ${reason}`,
      }));
    });

    socket.on('connect_error', (err) => {
      setConnections((prev) => ({
        ...prev,
        officerConnected: false,
        officerConnecting: true,
        officerError: err.message,
      }));
    });

    socket.on('core-bridge:status', (data: { connectedToCore: boolean }) => {
      setConnections((prev) => ({
        ...prev,
        coreToOfficerBridgeConnected: Boolean(data?.connectedToCore),
      }));
    });

    socket.on('officer:alert', (data: { trip: EmergencyTrip; alarmTrigger: boolean }) => {
      if (data?.trip) {
        setLiveActiveTrip(data.trip);
        setLiveJunctions(data.trip.junctions || []);
        setIsAlertAcknowledged(false);

        if (data.alarmTrigger && !isMuted) {
          playEmergencyTone();
        }
      }
    });

    socket.on('junction:status-changed', (data: { junction: JunctionTask }) => {
      if (data?.junction) {
        setLiveJunctions((prev) =>
          prev.map((j) => (j.id === data.junction.id ? data.junction : j)),
        );
        setLiveActiveTrip((prev) =>
          prev
            ? {
                ...prev,
                junctions: prev.junctions.map((j) =>
                  j.id === data.junction.id ? data.junction : j,
                ),
              }
            : null,
        );
      }
    });

    socket.on('trip:location-update', (data: any) => {
      if (data?.currentLocation) {
        setLiveActiveTrip((prev) =>
          prev
            ? {
                ...prev,
                currentLocation: data.currentLocation,
                totalDistanceKm: data.distanceRemainingKm || prev.totalDistanceKm,
                etaMinutes: data.etaMinutes ?? prev.etaMinutes,
                junctions: data.junctions || prev.junctions,
              }
            : null,
        );
      }
      if (data?.junctions) {
        setLiveJunctions(data.junctions);
      }
    });

    socket.on('trip:status-update', (data: { tripId: string; status: string }) => {
      if (data.status === 'COMPLETED' || data.status === 'CANCELLED') {
        setLiveActiveTrip(null);
        setLiveJunctions([]);
        stopAlarm();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [officerUrl, isMuted, playEmergencyTone, stopAlarm]);

  // ─── Acknowledge Alert Flow ───
  const acknowledgeAlert = useCallback(() => {
    setIsAlertAcknowledged(true);
    setAcknowledgedTimestamp(Date.now());
    stopAlarm();

    // If active officer trip exists, notify server
    if (liveActiveTrip && officerSocketRef.current?.connected) {
      officerSocketRef.current.emit('trip:acknowledge', {
        tripId: liveActiveTrip.tripId,
        officerId: 'car-driver-unit',
      });
    }

    // Notice: Acknowledging does NOT clear road clearance. Road clearance is police-authoritative.
  }, [liveActiveTrip, stopAlarm]);

  // ─── Set URL Config ───
  const updateUrls = useCallback((newCore: string, newOfficer: string) => {
    try {
      localStorage.setItem('mediroute_car_core_url', newCore.trim());
      localStorage.setItem('mediroute_car_officer_url', newOfficer.trim());
    } catch {
      // ignore
    }
    setCoreUrlState(newCore.trim());
    setOfficerUrlState(newOfficer.trim());
  }, []);

  // ─── Update Driver Plate ───
  const updateDriverPlate = useCallback((newPlate: string) => {
    const formatted = newPlate.trim().toUpperCase();
    try {
      localStorage.setItem('mediroute_driver_plate', formatted);
    } catch {
      // ignore
    }
    setDriverPlate(formatted);

    // Re-register if core socket is connected
    if (coreSocketRef.current?.connected) {
      coreSocketRef.current.emit('vehicle:register', {
        role: 'driver',
        label: 'Car Display HUD',
        location: DEMO_COORDS.vehicleA,
        registrationNumber: formatted,
        shareConsent: true,
      } as any);
    }
  }, []);

  // ─── Demo Mode Controls ───
  const toggleDemoMode = useCallback(() => {
    setIsDemoMode((prev) => {
      const next = !prev;
      if (!next) {
        // Exiting demo mode
        setDemoAlert(null);
        setDemoJunctions([]);
        stopAlarm();
      } else {
        // Entering demo mode - initialize demo junctions for SH 8 corridor
        setDemoJunctions([
          {
            id: 'j-demo-1',
            tripId: 'demo-trip-sh8',
            name: 'Vazhakulam Junction (SH 8)',
            landmark: 'Near Govt High School',
            location: { lat: 9.9405, lng: 76.6432 },
            sequenceOrder: 1,
            status: 'CLEARED',
            assignedOfficerName: 'SI Vinod Kumar (KP-4055)',
            distanceFromAmbulanceMetres: 250,
            lastUpdatedAt: Date.now(),
          },
          {
            id: 'j-demo-2',
            tripId: 'demo-trip-sh8',
            name: 'Avoly Traffic Point',
            landmark: 'St. Sebastian Church Turn',
            location: { lat: 9.9123, lng: 76.6912 },
            sequenceOrder: 2,
            status: 'CLEARING',
            assignedOfficerName: 'ASI Rajesh K. (KP-5120)',
            distanceFromAmbulanceMetres: 850,
            lastUpdatedAt: Date.now(),
          },
          {
            id: 'j-demo-3',
            tripId: 'demo-trip-sh8',
            name: 'Muvattupuzha KSRTC Roundabout',
            landmark: 'KSRTC Bus Stand Intersection',
            location: { lat: 9.9821, lng: 76.5812 },
            sequenceOrder: 3,
            status: 'ASSIGNED',
            assignedOfficerName: 'Traffic Warden Anoop',
            distanceFromAmbulanceMetres: 2100,
            lastUpdatedAt: Date.now(),
          },
          {
            id: 'j-demo-4',
            tripId: 'demo-trip-sh8',
            name: 'General Hospital Approach Cross',
            landmark: 'Hospital Road Entry Gate',
            location: { lat: 9.9889, lng: 76.5785 },
            sequenceOrder: 4,
            status: 'PENDING',
            distanceFromAmbulanceMetres: 3400,
            lastUpdatedAt: Date.now(),
          },
        ]);
      }
      return next;
    });
  }, [stopAlarm]);

  const triggerDemoAlert = useCallback(
    (distanceM = 320, isStale = false) => {
      const alertObj: UnifiedEmergencyAlert = {
        id: `DEMO-ALERT-${Math.floor(1000 + Math.random() * 9000)}`,
        source: 'demo',
        vehicleId: 'amb-kl-38-9901',
        priority: 'CRITICAL',
        vehicleType: 'Advanced Cardiac Life Support Ambulance',
        distanceMetres: distanceM,
        message: 'Emergency vehicle approaching on SH 8. Yield corridor safely.',
        isStale,
        timestamp: Date.now(),
        destinationHospital: 'General Hospital Muvattupuzha',
        corridorName: 'SH 8 Thodupuzha - Muvattupuzha Corridor',
        highway: 'State Highway 8',
        targetPlate: driverPlate,
        acknowledged: false,
      };
      setDemoAlert(alertObj);
      setIsAlertAcknowledged(false);
      if (!isMuted) {
        playEmergencyTone();
      }
    },
    [driverPlate, isMuted, playEmergencyTone],
  );

  const simulateApproachStep = useCallback(() => {
    if (!demoAlert) {
      triggerDemoAlert(850);
      return;
    }
    const current = demoAlert.distanceMetres;
    const nextDistance = current > 200 ? current - 250 : 75;
    setDemoAlert((prev) =>
      prev
        ? {
            ...prev,
            distanceMetres: nextDistance,
            timestamp: Date.now(),
          }
        : null,
    );
  }, [demoAlert, triggerDemoAlert]);

  const toggleDemoStale = useCallback(() => {
    setDemoAlert((prev) => (prev ? { ...prev, isStale: !prev.isStale } : null));
  }, []);

  const advanceDemoJunction = useCallback(() => {
    setDemoJunctions((prev) => {
      // Find first non-cleared junction and advance it
      const nextList = [...prev];
      const targetIdx = nextList.findIndex((j) => j.status !== 'CLEARED');
      if (targetIdx !== -1) {
        const current = nextList[targetIdx].status;
        if (current === 'PENDING') nextList[targetIdx].status = 'ASSIGNED';
        else if (current === 'ASSIGNED') nextList[targetIdx].status = 'CLEARING';
        else if (current === 'CLEARING') nextList[targetIdx].status = 'CLEARED';
        nextList[targetIdx].lastUpdatedAt = Date.now();
      }
      return nextList;
    });
  }, []);

  const clearDemoAlert = useCallback(() => {
    setDemoAlert(null);
    stopAlarm();
  }, [stopAlarm]);

  // Unified Active Alert (picks demo if demo mode and active, else real alerts)
  const currentCorridor: KeralaCorridor | undefined = KERALA_CORRIDORS.find(
    (c) => c.id === selectedCorridorId,
  );

  let activeAlert: UnifiedEmergencyAlert | null = null;
  if (isDemoMode && demoAlert) {
    activeAlert = demoAlert;
  } else if (liveActiveTrip && liveActiveTrip.status === 'ACTIVE') {
    activeAlert = {
      id: liveActiveTrip.tripId,
      source: 'officer-corridor',
      vehicleId: liveActiveTrip.vehicleId,
      priority: liveActiveTrip.priority,
      vehicleType: 'Emergency Corridor Transport',
      distanceMetres:
        liveCoreAlert?.distance ??
        (liveActiveTrip.junctions[0]?.distanceFromAmbulanceMetres || 950),
      message: `${liveActiveTrip.priority} Alert: Emergency ambulance en route to ${liveActiveTrip.destinationName}.`,
      isStale: Boolean(liveCoreAlert?.isStale),
      timestamp: liveActiveTrip.updatedAt,
      destinationHospital: liveActiveTrip.destinationName,
      corridorName: currentCorridor?.name || 'Kerala Emergency Transit Corridor',
      highway: currentCorridor?.highway || 'State Highway',
      targetPlate: driverPlate,
      acknowledged: isAlertAcknowledged,
      acknowledgedAt: acknowledgedTimestamp ?? undefined,
    };
  } else if (liveCoreAlert) {
    activeAlert = {
      id: `CORE-${liveCoreAlert.sessionId.slice(0, 8)}`,
      source: 'core-geofence',
      priority: 'CRITICAL',
      vehicleType: 'Emergency Transport Vehicle',
      distanceMetres: liveCoreAlert.distance,
      message: liveCoreAlert.message,
      isStale: Boolean(liveCoreAlert.isStale),
      timestamp: liveCoreAlert.timestamp || Date.now(),
      destinationHospital: currentCorridor?.destination.name || 'District Hospital Hub',
      corridorName: currentCorridor?.name || 'Thodupuzha Emergency Priority Corridor',
      highway: currentCorridor?.highway || 'SH 8',
      targetPlate: liveCoreAlert.targetVehicleRegistration || driverPlate,
      acknowledged: isAlertAcknowledged,
      acknowledgedAt: acknowledgedTimestamp ?? undefined,
    };
  }

  // Active junctions
  const activeJunctions = isDemoMode ? demoJunctions : liveJunctions;

  return {
    connections,
    activeAlert,
    isAlertAcknowledged,
    acknowledgedTimestamp,
    activeJunctions,
    selectedCorridor: currentCorridor,
    selectedCorridorId,
    setSelectedCorridorId,
    driverPlate,
    updateDriverPlate,
    isMuted,
    toggleMute,
    testSpeaker,
    isAlarmSounding,
    acknowledgeAlert,
    updateUrls,
    isDemoMode,
    toggleDemoMode,
    triggerDemoAlert,
    simulateApproachStep,
    toggleDemoStale,
    advanceDemoJunction,
    clearDemoAlert,
  };
}

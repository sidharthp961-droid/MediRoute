// ─── Emergency Command Centre — Kerala Priority Corridors & Google Maps Navigation Mode ───
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Radio,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MapPin,
  Users,
  Clock,
  Navigation,
  Compass,
  ArrowRight,
  RefreshCw,
  Layers,
  Building2,
  AlertCircle,
  Play,
  Pause,
  Square,
  Volume2,
  VolumeX,
  Sparkles,
  Gauge,
  List,
  Shield,
  Info,
  X,
  CornerUpRight,
  LocateFixed,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { EmergencyMap, HospitalMarkerInfo } from '@/components/EmergencyMap';
import { Timeline } from '@/components/Timeline';
import { HospitalDirectory } from '@/components/HospitalDirectory';
import { NavigationMode } from '@/components/NavigationMode';
import { DEMO_COORDS } from '@/types';
import type {
  Vehicle,
  EmergencySession,
  TimelineEvent,
  Coordinates,
} from '@/types';
import {
  KERALA_CORRIDORS,
  fetchRoadRoute,
  RoutingResult,
  KeralaCorridor,
} from '@/lib/routing';
import {
  KERALA_HOSPITALS,
  HospitalDestination,
  findNearestHospital,
  findNearestHospitalByRoadRoute,
  getNearestHospitals,
  haversineDistance,
  hasSignificantLocationChange,
  checkCloserHospitalRecommendation,
  HospitalRecommendation,
} from '@/lib/hospitals';
import {
  StartingLocationSelector,
  StartingLocation,
  GpsStatus,
} from '@/components/StartingLocationSelector';
import { useJourneySimulation } from '@/hooks/useJourneySimulation';

interface CommandCentreProps {
  vehicles: Vehicle[];
  emergency: EmergencySession | null;
  timeline: TimelineEvent[];
  connected: boolean;
  onStartEmergency: (origin: Coordinates, destination?: Coordinates) => void;
  onCancelEmergency: () => void;
  onCompleteEmergency: () => void;
}

export function CommandCentre({
  vehicles,
  emergency,
  timeline,
  connected,
  onStartEmergency,
  onCancelEmergency,
  onCompleteEmergency,
}: CommandCentreProps) {
  // Navigation tabs: 'corridors' | 'hospitals' | 'simulation'
  const [activeTab, setActiveTab] = useState<'corridors' | 'hospitals' | 'simulation'>('corridors');

  // Dedicated Google Maps Navigation Mode state
  const [isNavigating, setIsNavigating] = useState(false);
  const [navMode, setNavMode] = useState<'demo' | 'live'>('demo');
  const [showDestinationModal, setShowDestinationModal] = useState(false);

  // Dedicated Starting Location State (Phase 2 & 3)
  const [startingLocation, setStartingLocation] = useState<StartingLocation>({
    coords: DEMO_COORDS.emergency,
    label: 'District Hospital Thodupuzha (Emergency Hub)',
    source: 'preset',
  });
  const [isPickingOnMap, setIsPickingOnMap] = useState(false);
  const [isSearchingHospitals, setIsSearchingHospitals] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('idle');
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);
  const [isManualHospitalSelection, setIsManualHospitalSelection] = useState(false);
  const [closerRecommendation, setCloserRecommendation] = useState<HospitalRecommendation | null>(null);
  const [dismissedRecommendationHospitalId, setDismissedRecommendationHospitalId] = useState<string | null>(null);

  const lastResolvedCoordsRef = useRef<Coordinates | null>(null);
  const lastRecCheckCoordsRef = useRef<Coordinates | null>(null);
  const hasMountedGpsRef = useRef(false);

  // Priority corridor selection (default: Thodupuzha → Ernakulam)
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('thodupuzha-ernakulam');
  const [selectedHospital, setSelectedHospital] = useState<HospitalDestination | null>(null);
  const [routeResult, setRouteResult] = useState<RoutingResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const selectedCorridor = useMemo<KeralaCorridor | undefined>(
    () => KERALA_CORRIDORS.find((c) => c.id === selectedCorridorId),
    [selectedCorridorId],
  );

  const activeDestinationName = useMemo(() => {
    if (selectedHospital) return selectedHospital.name;
    if (selectedCorridor) return selectedCorridor.destination.name;
    return 'Hospital Destination';
  }, [selectedHospital, selectedCorridor]);

  const activeDestinationTown = useMemo(() => {
    if (selectedHospital) return selectedHospital.town;
    if (selectedCorridor) return selectedCorridor.destination.town;
    return undefined;
  }, [selectedHospital, selectedCorridor]);

  const currentActiveRoute = routeResult?.routes[routeResult.selectedRouteIndex || 0] || null;

  // Safe Journey Simulation Engine (Local Presentation Only — No Socket Emissions)
  const sim = useJourneySimulation(currentActiveRoute, activeDestinationName);

  // Live Emergency Vehicle telemetry
  const liveEmergencyVehicle = useMemo(() => {
    if (!emergency) return null;
    return vehicles.find((v) => v.id === emergency.vehicleId) || null;
  }, [emergency, vehicles]);

  const liveVehicleCoord = liveEmergencyVehicle?.location || emergency?.origin || null;

  // Load road route between specified points via OSRM
  const loadRoute = useCallback(
    async (
      origin: Coordinates,
      destination: Coordinates,
      labels?: { corridorId?: string; originLabel?: string; destinationLabel?: string },
      bypassCache = false,
    ) => {
      setIsLoadingRoute(true);
      setRouteError(null);
      try {
        const result = await fetchRoadRoute(origin, destination, {
          corridorId: labels?.corridorId,
          originLabel: labels?.originLabel || 'Thodupuzha Hub',
          destinationLabel: labels?.destinationLabel,
          bypassCache,
        });
        setRouteResult(result);
      } catch (err: any) {
        console.error('[Routing] Error fetching road route:', err);
        setRouteError(
          err.message || 'Unable to connect to OSRM routing service. Please select another facility or retry.',
        );
        setRouteResult(null);
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [],
  );

  // Automatically find nearest hospital by comparing actual road routes (Phase 3)
  const resolveNearestHospitalForOrigin = useCallback(
    async (origin: Coordinates, originLabel?: string, force = false) => {
      // Jitter Deadband: suppress redundant OSRM recalculations if movement < 150m
      if (
        !force &&
        !hasSignificantLocationChange(lastResolvedCoordsRef.current, origin, 150) &&
        selectedHospital
      ) {
        return;
      }

      lastResolvedCoordsRef.current = origin;
      setIsSearchingHospitals(true);
      setRouteError(null);
      try {
        const result = await findNearestHospitalByRoadRoute(origin, { candidateCount: 3 });
        if (result) {
          if (isManualHospitalSelection && selectedHospital) {
            // Keep user manual hospital selection, only update route from new starting origin
            loadRoute(origin, selectedHospital.coords, {
              originLabel: originLabel || 'Starting Location',
              destinationLabel: selectedHospital.name,
            });
          } else {
            setSelectedHospital(result.hospital);
            setRouteResult(result.routingResult);
          }
        } else {
          setRouteError(
            'No verified hospital facility could be located near incident coordinates. Please manually select a destination from the directory.',
          );
        }
      } catch (err: any) {
        console.warn('[NearestHospital] Error in road-route comparison:', err);
        setRouteError('Error calculating road routes to hospitals. Please pick a destination manually.');
      } finally {
        setIsSearchingHospitals(false);
      }
    },
    [isManualHospitalSelection, selectedHospital, loadRoute],
  );

  // Acquire live device GPS with high accuracy and clear error reporting
  const acquireLiveGPS = useCallback(
    (onComplete?: (success: boolean) => void) => {
      setGpsErrorMessage(null);

      if (typeof window === 'undefined' || !navigator.geolocation) {
        const msg = 'Geolocation is not supported by your browser. Please select a starting point on the map or search.';
        setGpsStatus('unavailable');
        setGpsErrorMessage(msg);
        onComplete?.(false);
        return;
      }

      setGpsStatus('acquiring');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setGpsStatus('granted');
          setGpsErrorMessage(null);

          const newLoc: StartingLocation = {
            coords: { lat: latitude, lng: longitude },
            label: `Current GPS Location (±${Math.round(accuracy)}m)`,
            source: 'gps',
            accuracy,
          };

          setStartingLocation(newLoc);
          setIsManualHospitalSelection(false);

          if (hasSignificantLocationChange(lastResolvedCoordsRef.current, newLoc.coords, 150)) {
            lastResolvedCoordsRef.current = newLoc.coords;
            resolveNearestHospitalForOrigin(newLoc.coords, newLoc.label, true);
          }

          onComplete?.(true);
        },
        (error) => {
          let status: GpsStatus = 'unavailable';
          let msg = 'Unable to determine GPS location.';

          if (error.code === error.PERMISSION_DENIED) {
            status = 'denied';
            msg = 'GPS permission denied. Please enable location permissions or pick a point on the map.';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            status = 'unavailable';
            msg = 'GPS location is currently unavailable. Using preset hub until a point is chosen.';
          } else if (error.code === error.TIMEOUT) {
            status = 'timeout';
            msg = 'GPS request timed out. Please retry or choose a location on the map.';
          }

          setGpsStatus(status);
          setGpsErrorMessage(msg);
          onComplete?.(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        },
      );
    },
    [resolveNearestHospitalForOrigin],
  );

  // Automatic live GPS detection on startup
  useEffect(() => {
    if (hasMountedGpsRef.current) return;
    hasMountedGpsRef.current = true;

    acquireLiveGPS((success) => {
      if (!success) {
        // If GPS is unavailable/denied, resolve nearest hospital for the default preset
        // so the map and destination are immediately populated and ready,
        // without misrepresenting preset coordinates as real GPS
        lastResolvedCoordsRef.current = startingLocation.coords;
        resolveNearestHospitalForOrigin(startingLocation.coords, startingLocation.label, true);
      }
    });
  }, [acquireLiveGPS, resolveNearestHospitalForOrigin, startingLocation.coords, startingLocation.label]);

  // Map Click Handler for Starting Location Selection (Phase 2 Option 2)
  const handleMapClick = useCallback(
    (coords: Coordinates) => {
      if (isPickingOnMap) {
        setIsPickingOnMap(false);
        setIsManualHospitalSelection(false);
        const updated: StartingLocation = {
          coords,
          label: `Map Point (${coords.lat.toFixed(4)}°N, ${coords.lng.toFixed(4)}°E)`,
          source: 'map',
        };
        setStartingLocation(updated);
        lastResolvedCoordsRef.current = coords;
        resolveNearestHospitalForOrigin(coords, updated.label, true);
      }
    },
    [isPickingOnMap, resolveNearestHospitalForOrigin],
  );

  const handleSelectStartingLocation = useCallback(
    (loc: StartingLocation) => {
      setIsManualHospitalSelection(false);
      setStartingLocation(loc);
      setIsPickingOnMap(false);
      lastResolvedCoordsRef.current = loc.coords;
      resolveNearestHospitalForOrigin(loc.coords, loc.label, true);
    },
    [resolveNearestHospitalForOrigin],
  );

  const handleResetToPreset = useCallback(() => {
    setIsManualHospitalSelection(false);
    const preset: StartingLocation = {
      coords: DEMO_COORDS.emergency,
      label: 'District Hospital Thodupuzha (Emergency Hub)',
      source: 'preset',
    };
    setStartingLocation(preset);
    setIsPickingOnMap(false);
    lastResolvedCoordsRef.current = preset.coords;
    resolveNearestHospitalForOrigin(preset.coords, preset.label, true);
  }, [resolveNearestHospitalForOrigin]);

  // 1. AUTOMATIC NEAREST HOSPITAL RESOLUTION ON EMERGENCY ACTIVATION
  useEffect(() => {
    if (emergency?.status === 'active' && emergency?.origin && typeof emergency.origin.lat === 'number' && typeof emergency.origin.lng === 'number') {
      // Sync starting location with emergency origin
      setStartingLocation((prev) => {
        if (
          prev?.coords &&
          typeof prev.coords.lat === 'number' &&
          typeof prev.coords.lng === 'number' &&
          Math.abs(prev.coords.lat - emergency.origin.lat) < 0.0001 &&
          Math.abs(prev.coords.lng - emergency.origin.lng) < 0.0001
        ) {
          return prev;
        }
        return {
          coords: emergency.origin,
          label: 'Active Incident Location',
          source: 'gps',
        };
      });

      // If destination already explicitly chosen, lock it and use it
      if (emergency.destination) {
        const matched = KERALA_HOSPITALS.find(
          (h) =>
            Math.abs(h.coords.lat - emergency.destination!.lat) < 0.001 &&
            Math.abs(h.coords.lng - emergency.destination!.lng) < 0.001,
        );
        if (matched) {
          setSelectedHospital(matched);
          loadRoute(emergency.origin, matched.coords, {
            originLabel: 'Incident Location',
            destinationLabel: matched.name,
          });
          return;
        }
      }

      // If hospital already active before emergency start, lock to it
      if (selectedHospital) {
        loadRoute(emergency.origin, selectedHospital.coords, {
          originLabel: 'Incident Location',
          destinationLabel: selectedHospital.name,
        });
        return;
      }

      // Automatically find nearest hospital comparing road routes only if no destination was set
      resolveNearestHospitalForOrigin(emergency.origin, 'Incident Location', true);
    }
  }, [emergency?.status, emergency?.origin?.lat, emergency?.origin?.lng, emergency?.destination, loadRoute, resolveNearestHospitalForOrigin, selectedHospital]);

  // Emergency safety recommendation monitor (never silently replace locked destination)
  useEffect(() => {
    if (!emergency || emergency.status !== 'active' || !selectedHospital) {
      setCloserRecommendation(null);
      return;
    }

    const currentCoords = liveVehicleCoord || emergency.origin;
    if (!currentCoords || typeof currentCoords.lat !== 'number' || typeof currentCoords.lng !== 'number') {
      return;
    }

    // Only re-check recommendation if coordinates have moved significantly (> 250m)
    if (!hasSignificantLocationChange(lastRecCheckCoordsRef.current, currentCoords, 250)) {
      return;
    }

    lastRecCheckCoordsRef.current = currentCoords;

    checkCloserHospitalRecommendation(currentCoords, selectedHospital.id, 1000)
      .then((rec) => {
        if (rec && rec.hospital.id !== dismissedRecommendationHospitalId) {
          setCloserRecommendation(rec);
        } else {
          setCloserRecommendation(null);
        }
      })
      .catch((err) => {
        console.warn('[Recommendation] Error checking closer hospital:', err);
      });
  }, [
    emergency?.status,
    liveVehicleCoord?.lat,
    liveVehicleCoord?.lng,
    emergency?.origin?.lat,
    emergency?.origin?.lng,
    selectedHospital?.id,
    dismissedRecommendationHospitalId,
  ]);

  // Initial load for default corridor if not already loaded and no hospital chosen
  useEffect(() => {
    if (selectedCorridor && !selectedHospital && !emergency && gpsStatus === 'idle') {
      loadRoute(
        selectedCorridor.origin.coords,
        selectedCorridor.destination.coords,
        {
          corridorId: selectedCorridor.id,
          originLabel: selectedCorridor.origin.town,
          destinationLabel: selectedCorridor.destination.town,
        },
      );
    }
  }, [selectedCorridor, selectedHospital, emergency, loadRoute, gpsStatus]);

  // Handle hospital selection from Directory
  const handleSelectHospital = (hospital: HospitalDestination) => {
    setIsManualHospitalSelection(true);
    setSelectedHospital(hospital);
  };

  const handleGetHospitalDirections = (hospital: HospitalDestination) => {
    setIsManualHospitalSelection(true);
    setSelectedHospital(hospital);
    const originCoords = emergency?.origin || startingLocation.coords;
    loadRoute(originCoords, hospital.coords, {
      originLabel: emergency ? 'Incident Location' : startingLocation.label,
      destinationLabel: hospital.name,
    }, true);
  };

  const handleStartDemoJourney = (hospital: HospitalDestination) => {
    setIsManualHospitalSelection(true);
    setSelectedHospital(hospital);
    setActiveTab('simulation');
    const originCoords = emergency?.origin || startingLocation.coords;
    loadRoute(originCoords, hospital.coords, {
      originLabel: emergency ? 'Incident Location' : startingLocation.label,
      destinationLabel: hospital.name,
    }, true).then(() => {
      setTimeout(() => sim.startSimulation(), 400);
    });
  };

  // 2. START NAVIGATION HANDLER
  const handleStartNavigation = () => {
    if (!currentActiveRoute) return;
    setIsNavigating(true);

    if (navMode === 'demo') {
      sim.startSimulation();
    }
  };

  const handleEndNavigation = () => {
    setIsNavigating(false);
    sim.stopSimulation();
  };

  const handleCorridorSelect = (corridorId: string) => {
    setSelectedHospital(null);
    setSelectedCorridorId(corridorId);
    const corridor = KERALA_CORRIDORS.find((c) => c.id === corridorId);
    if (corridor) {
      loadRoute(corridor.origin.coords, corridor.destination.coords, {
        corridorId: corridor.id,
        originLabel: corridor.origin.town,
        destinationLabel: corridor.destination.town,
      });
    }
  };

  const handleSelectRouteIndex = (idx: number) => {
    if (routeResult) {
      setRouteResult({
        ...routeResult,
        selectedRouteIndex: idx,
      });
    }
  };

  const isActive = emergency?.status === 'active';
  const alertedCount = emergency?.alertedVehicleIds?.length || 0;
  const driverCount = vehicles.filter((v) => v.role === 'driver').length;

  function handleStartEmergency() {
    const originCoords = startingLocation.coords;
    let destinationCoords: Coordinates | undefined;

    if (selectedHospital) {
      destinationCoords = selectedHospital.coords;
    } else if (selectedCorridor) {
      destinationCoords = selectedCorridor.destination.coords;
    }

    onStartEmergency(originCoords, destinationCoords);
  }

  // Compile the nearest 3 hospital markers locally (via Haversine) + active destination marker
  const hospitalMarkers = useMemo<HospitalMarkerInfo[]>(() => {
    const originCoords = startingLocation?.coords || emergency?.origin || DEMO_COORDS.emergency;
    const activeDestinationCoords = selectedHospital?.coords || selectedCorridor?.destination.coords;

    // 1. Calculate nearest 3 hospitals using local Haversine formula (no network/OSRM call)
    const nearby = getNearestHospitals(originCoords, 3);
    const list: HospitalMarkerInfo[] = [];

    nearby.forEach((item, index) => {
      const h = item.hospital;
      const isDest = Boolean(
        activeDestinationCoords &&
          Math.abs(h.coords.lat - activeDestinationCoords.lat) < 0.0005 &&
          Math.abs(h.coords.lng - activeDestinationCoords.lng) < 0.0005,
      );

      list.push({
        name: h.name,
        town: h.town,
        coords: h.coords,
        isDestination: isDest,
        distanceKm: item.distanceKm,
        distanceMetres: item.distanceMetres,
        rank: index + 1,
        isNearby: true,
        alternateName: h.alternateName,
        category: h.category,
        address: h.address,
        verifiedOSM: h.verifiedOSM,
        onSelectDestination: () => {
          setSelectedHospital(h);
        },
        onGetDirections: () => {
          handleGetHospitalDirections(h);
        },
      });
    });

    // 2. If the active destination is outside the top 3 nearest, keep it visible as destination marker
    if (activeDestinationCoords) {
      const isAlreadyInList = list.some((m) => m.isDestination);
      if (!isAlreadyInList) {
        const destHospital = selectedHospital || KERALA_HOSPITALS.find(
          (h) =>
            Math.abs(h.coords.lat - activeDestinationCoords.lat) < 0.0005 &&
            Math.abs(h.coords.lng - activeDestinationCoords.lng) < 0.0005,
        );

        const destName = destHospital?.name || selectedCorridor?.destination.name || 'Selected Destination';
        const destTown = destHospital?.town || selectedCorridor?.destination.town || '';

        let destDistKm: string | undefined;
        let destDistMetres: number | undefined;
        if (
          originCoords &&
          typeof originCoords.lat === 'number' &&
          typeof originCoords.lng === 'number' &&
          !isNaN(originCoords.lat) &&
          !isNaN(originCoords.lng)
        ) {
          const d = haversineDistance(originCoords, activeDestinationCoords);
          destDistMetres = d;
          destDistKm = `${(d / 1000).toFixed(1)} km`;
        }

        list.push({
          name: destName,
          town: destTown,
          coords: activeDestinationCoords,
          isDestination: true,
          distanceKm: destDistKm,
          distanceMetres: destDistMetres,
          alternateName: destHospital?.alternateName,
          category: destHospital?.category,
          address: destHospital?.address,
          verifiedOSM: destHospital?.verifiedOSM,
          onSelectDestination: destHospital ? () => setSelectedHospital(destHospital) : undefined,
          onGetDirections: destHospital ? () => handleGetHospitalDirections(destHospital) : undefined,
        });
      }
    }

    return list;
  }, [
    startingLocation?.coords?.lat,
    startingLocation?.coords?.lng,
    emergency?.origin?.lat,
    emergency?.origin?.lng,
    selectedHospital,
    selectedCorridor,
  ]);

  const elapsed = emergency?.createdAt
    ? Math.floor((Date.now() - emergency.createdAt) / 1000)
    : 0;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  // Active navigation coordinate to feed the map follower
  const navVehicleCoord = navMode === 'demo' ? sim.currentCoord : liveVehicleCoord;

  return (
    <div className="min-h-screen pt-20 pb-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-accent-teal/15 text-accent-teal border border-accent-teal/30">
                KERALA ROAD NETWORK
              </span>
              <span className="text-xs text-muted-text font-mono">
                THODUPUZHA HUB
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1">
              Emergency Command Centre
            </h1>
            <p className="text-muted-text text-sm">
              Nearest hospital auto-routing, actual road geometry, and Google Maps-style navigation
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isNavigating ? (
              <Badge variant="teal" pulse>
                <Navigation className="w-3 h-3" />
                Navigation Mode Active
              </Badge>
            ) : sim.isActive ? (
              <Badge variant="teal" pulse>
                <Play className="w-3 h-3" />
                Demo Journey Active
              </Badge>
            ) : isActive ? (
              <Badge variant="amber" pulse>
                <AlertTriangle className="w-3 h-3" />
                Emergency Active
              </Badge>
            ) : (
              <Badge variant="muted">Standing By</Badge>
            )}
            <Badge variant={connected ? 'teal' : 'red'}>
              {connected ? 'Network Online' : 'Offline'}
            </Badge>
          </div>
        </div>

        {/* Top Mode Switcher Tabs (Hidden during active full navigation for clutter-free HUD) */}
        {!isNavigating && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-deep-surface border border-petrol/60 rounded-2xl p-2.5 shadow-lg">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('corridors')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'corridors'
                    ? 'bg-petrol text-accent-teal shadow-md shadow-accent-teal/10'
                    : 'text-muted-text hover:text-primary-text'
                }`}
              >
                <Compass className="w-4 h-4" />
                Priority Corridors (6)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('hospitals')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'hospitals'
                    ? 'bg-petrol text-accent-teal shadow-md shadow-accent-teal/10'
                    : 'text-muted-text hover:text-primary-text'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Hospital Directory (13)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('simulation')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'simulation'
                    ? 'bg-accent-teal text-midnight shadow-md shadow-accent-teal/20 font-bold'
                    : 'text-muted-text hover:text-primary-text'
                }`}
              >
                <Play className="w-4 h-4" />
                Demo Journey Mode
              </button>
            </div>

            {isLoadingRoute && (
              <span className="text-xs text-accent-teal flex items-center gap-1.5 animate-pulse px-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Calculating OSRM Road Route...
              </span>
            )}
          </div>
        )}

        {/* Tab 1: Priority Corridors Selector Pills */}
        {!isNavigating && activeTab === 'corridors' && (
          <div className="bg-deep-surface border border-petrol/60 rounded-2xl p-3 shadow-lg animate-fade-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {KERALA_CORRIDORS.map((corridor) => {
                const isSelected = corridor.id === selectedCorridorId && !selectedHospital;
                const isKey =
                  corridor.id === 'thodupuzha-ernakulam' || corridor.id === 'thodupuzha-kottayam';

                return (
                  <button
                    key={corridor.id}
                    onClick={() => handleCorridorSelect(corridor.id)}
                    className={`text-left p-2.5 rounded-xl border transition-all text-xs relative ${
                      isSelected
                        ? 'bg-petrol/90 border-accent-teal text-primary-text shadow-md shadow-accent-teal/10'
                        : 'bg-petrol/20 border-petrol/40 text-muted-text hover:text-primary-text hover:bg-petrol/40'
                    }`}
                  >
                    {isKey && (
                      <span className="absolute -top-1.5 -right-1 px-1 py-0.2 rounded text-[9px] font-bold bg-accent-teal text-midnight">
                        KEY
                      </span>
                    )}
                    <div className="font-semibold truncate">{corridor.shortName}</div>
                    <div className="text-[10px] text-muted-text/80 truncate mt-0.5">
                      {corridor.destination.town}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Hospital Directory Inline Panel */}
        {!isNavigating && activeTab === 'hospitals' && (
          <Card className="animate-fade-in">
            <HospitalDirectory
              currentOrigin={startingLocation.coords}
              selectedHospitalId={selectedHospital?.id || null}
              onSelectHospital={handleSelectHospital}
              onGetDirections={handleGetHospitalDirections}
              onStartDemoJourney={handleStartDemoJourney}
              isLoadingRoute={isLoadingRoute}
            />
          </Card>
        )}

        {/* Tab 3: Demo Journey Simulation Controller */}
        {!isNavigating && activeTab === 'simulation' && (
          <Card className="bg-deep-surface border-accent-teal/60 shadow-lg shadow-accent-teal/5 animate-fade-in space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-petrol/50 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge variant="teal">DEMO JOURNEY SIMULATION</Badge>
                  <span className="text-[11px] text-muted-text font-mono">
                    Local Presentation Mode
                  </span>
                </div>
                <h3 className="font-bold text-sm sm:text-base text-primary-text flex items-center gap-1.5">
                  <span>Destination:</span>
                  <span className="text-accent-teal">{activeDestinationName}</span>
                </h3>
              </div>

              {/* Simulation Controls */}
              <div className="flex items-center gap-2">
                {!sim.isActive ? (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!currentActiveRoute}
                    onClick={sim.startSimulation}
                    className="text-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start Journey
                  </Button>
                ) : sim.isPaused ? (
                  <Button size="sm" variant="primary" onClick={sim.resumeSimulation} className="text-xs">
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={sim.pauseSimulation} className="text-xs">
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </Button>
                )}

                {sim.isActive && (
                  <Button size="sm" variant="danger" onClick={sim.stopSimulation} className="text-xs">
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </Button>
                )}

                {/* Voice Narration Toggle */}
                <button
                  type="button"
                  onClick={sim.toggleVoice}
                  title={sim.voiceEnabled ? 'Mute turn voice navigation' : 'Enable turn voice navigation'}
                  className={`p-2 rounded-xl border transition-all ${
                    sim.voiceEnabled
                      ? 'bg-accent-teal/15 border-accent-teal/40 text-accent-teal'
                      : 'bg-petrol/30 border-petrol/60 text-muted-text hover:text-primary-text'
                  }`}
                >
                  {sim.voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* Speed Multiplier */}
                <div className="flex items-center bg-midnight/80 border border-petrol/60 rounded-xl p-0.5 text-xs">
                  {[1, 2, 5].map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => sim.setSpeedMultiplier(spd)}
                      className={`px-2 py-1 rounded-lg font-mono font-bold transition-all ${
                        sim.speedMultiplier === spd
                          ? 'bg-accent-teal text-midnight'
                          : 'text-muted-text hover:text-primary-text'
                      }`}
                    >
                      {spd}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Simulation Telemetry Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-petrol/30 border border-petrol/60 rounded-xl p-2.5">
                <span className="text-[10px] text-muted-text uppercase font-semibold">
                  Distance Remaining
                </span>
                <div className="text-lg font-bold font-mono text-accent-teal mt-0.5">
                  {sim.distanceRemainingKm}
                </div>
              </div>

              <div className="bg-petrol/30 border border-petrol/60 rounded-xl p-2.5">
                <span className="text-[10px] text-muted-text uppercase font-semibold">
                  Simulated ETA
                </span>
                <div className="text-lg font-bold font-mono text-alert-amber mt-0.5">
                  ~{sim.etaMinutesRemaining} mins
                </div>
              </div>

              <div className="bg-petrol/30 border border-petrol/60 rounded-xl p-2.5 sm:col-span-2">
                <span className="text-[10px] text-muted-text uppercase font-semibold flex items-center gap-1">
                  <Navigation className="w-3 h-3 text-accent-teal" />
                  Upcoming Maneuver
                </span>
                <div className="text-xs font-semibold text-primary-text truncate mt-1">
                  {sim.currentManeuver || 'Proceed along highway route'}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-midnight/80 h-2 rounded-full overflow-hidden border border-petrol/60">
              <div
                className="bg-accent-teal h-full transition-all duration-300"
                style={{ width: `${Math.round(sim.progressPercent * 100)}%` }}
              />
            </div>
          </Card>
        )}

        {/* ── Main Grid: Map & Controls ── */}
        <div className={`grid ${isNavigating ? 'grid-cols-1' : 'lg:grid-cols-3'} gap-5`}>
          {/* Map Column */}
          <div className={`${isNavigating ? 'w-full' : 'lg:col-span-2'} animate-slide-up flex flex-col gap-3 relative`}>
            <Card className={`p-0 overflow-hidden relative ${isNavigating ? 'h-[75vh] sm:h-[82vh] rounded-3xl border-2 border-[#1E6B62]' : 'h-[520px] sm:h-[620px]'}`}>
              <EmergencyMap
                vehicles={vehicles}
                emergency={emergency}
                center={startingLocation.coords}
                routeResult={routeResult}
                onSelectRouteIndex={handleSelectRouteIndex}
                hospitalMarkers={hospitalMarkers}
                demoVehicleCoord={isNavigating ? navVehicleCoord : sim.isActive ? sim.currentCoord : null}
                isDemoJourneyActive={isNavigating || sim.isActive}
                isNavigationActive={isNavigating}
                traversedRouteCoordinates={isNavigating ? sim.traversedCoordinates : []}
                remainingRouteCoordinates={isNavigating ? sim.remainingCoordinates : []}
                startLocationCoord={startingLocation.coords}
                startLocationLabel={startingLocation.label}
                isPickingLocation={isPickingOnMap}
                onMapClick={handleMapClick}
              />

              {/* 3. GOOGLE MAPS NAVIGATION MODE OVERLAY */}
              {isNavigating && (
                <NavigationMode
                  destinationName={activeDestinationName}
                  destinationTown={activeDestinationTown}
                  isDemoMode={navMode === 'demo'}
                  isPaused={sim.isPaused}
                  distanceRemainingKm={sim.distanceRemainingKm}
                  etaMinutesRemaining={sim.etaMinutesRemaining}
                  formattedArrivalTime={sim.formattedArrivalTime}
                  currentManeuver={sim.currentManeuver}
                  distanceToNextManeuver={sim.distanceToNextManeuver}
                  nextStepPreview={sim.nextStepPreview}
                  simulatedSpeedKmH={sim.simulatedSpeedKmH}
                  voiceEnabled={sim.voiceEnabled}
                  speedMultiplier={sim.speedMultiplier}
                  onToggleVoice={sim.toggleVoice}
                  onPauseResume={() => (sim.isPaused ? sim.resumeSimulation() : sim.pauseSimulation())}
                  onSetSpeedMultiplier={sim.setSpeedMultiplier}
                  onEndNavigation={handleEndNavigation}
                  onRecenterCamera={() => {
                    // camera auto-recenters via NavigationCameraController
                  }}
                  onChangeDestination={() => setShowDestinationModal(true)}
                />
              )}
            </Card>

            {/* Route Status Strip (shown when not navigating) */}
            {!isNavigating && (
              <div className="bg-deep-surface border border-petrol/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-teal" />
                  <span className="text-muted-text">Active Destination:</span>
                  <span className="font-semibold text-primary-text">
                    {activeDestinationName}
                  </span>
                </div>

                {currentActiveRoute ? (
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-accent-teal font-bold">
                      {currentActiveRoute.distanceKm}
                    </span>
                    <span className="text-alert-amber font-bold">
                      ~{currentActiveRoute.durationMinutes}
                    </span>
                  </div>
                ) : routeError ? (
                  <div className="flex items-center gap-2 text-alert-amber">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Routing offline</span>
                    <button
                      onClick={() => {
                        if (selectedHospital) {
                          handleGetHospitalDirections(selectedHospital);
                        } else if (selectedCorridor) {
                          loadRoute(
                            selectedCorridor.origin.coords,
                            selectedCorridor.destination.coords,
                            {
                              corridorId: selectedCorridor.id,
                              originLabel: selectedCorridor.origin.town,
                              destinationLabel: selectedCorridor.destination.town,
                            },
                            true,
                          );
                        }
                      }}
                      className="underline text-accent-teal hover:text-primary-text ml-1"
                    >
                      Retry
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Sidebar (Hidden during active navigation mode) */}
          {!isNavigating && (
            <div className="space-y-5 animate-slide-in-right">
              {/* Starting Location Options (Phase 2 & 3) */}
              <StartingLocationSelector
                currentLocation={startingLocation}
                isPickingOnMap={isPickingOnMap}
                onTogglePickingOnMap={() => setIsPickingOnMap((prev) => !prev)}
                onSelectLocation={handleSelectStartingLocation}
                onResetToPreset={handleResetToPreset}
                isSearchingHospitals={isSearchingHospitals}
                gpsStatus={gpsStatus}
                gpsErrorMessage={gpsErrorMessage}
                onRefreshGPS={() => acquireLiveGPS()}
              />

              {/* Emergency controls */}
              <Card>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Radio className="w-5 h-5 text-accent-teal" />
                  Emergency Controls
                </h2>

                {!isActive ? (
                  <div className="space-y-4">
                    {/* Destination Facility Info */}
                    <div className="bg-petrol/30 border border-petrol/60 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-accent-teal uppercase tracking-wider flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Target Facility
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isManualHospitalSelection && (
                            <span className="text-[9px] bg-sky-500/15 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded font-bold uppercase">
                              Manual Pick
                            </span>
                          )}
                          {currentActiveRoute && (
                            <span className="text-[10px] bg-accent-teal/15 text-accent-teal px-1.5 py-0.5 rounded font-mono font-bold">
                              {currentActiveRoute.distanceKm}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="font-semibold text-sm text-primary-text">
                        {activeDestinationName}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-text">
                        <span>
                          {routeResult?.disclaimer ? (
                            <span className="text-alert-amber font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              Straight-line Fallback
                            </span>
                          ) : (
                            'Route geometry via OpenStreetMap OSRM'
                          )}
                        </span>
                        {currentActiveRoute?.durationMinutes && (
                          <span className="font-mono text-emerald-400 font-semibold">
                            ~{currentActiveRoute.durationMinutes}
                          </span>
                        )}
                      </div>
                      {routeResult?.disclaimer && (
                        <div className="text-[10px] text-alert-amber/90 bg-alert-amber/10 border border-alert-amber/25 rounded p-1.5 leading-tight">
                          {routeResult.disclaimer}
                        </div>
                      )}
                    </div>

                    {/* Route Error & Manual Selector prompt */}
                    {routeError && (
                      <div className="bg-alert-amber/10 border border-alert-amber/30 rounded-xl p-3 text-xs text-alert-amber flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <div>{routeError}</div>
                          <button
                            type="button"
                            onClick={() => setShowDestinationModal(true)}
                            className="px-2.5 py-1 bg-petrol text-accent-teal rounded text-xs font-semibold hover:bg-petrol/80 transition-colors"
                          >
                            Choose Hospital Manually
                          </button>
                        </div>
                      </div>
                    )}

                    {/* START NAVIGATION BUTTON (Requirement 2 & 3) */}
                    {currentActiveRoute && (
                      <div className="space-y-2 bg-emerald-950/20 border border-emerald-600/30 rounded-2xl p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                            <Navigation className="w-4 h-4 text-emerald-400" />
                            Turn-by-Turn Navigation
                          </span>
                          {/* Navigation Mode Choice Toggle */}
                          <div className="flex items-center bg-midnight/80 border border-petrol/60 rounded-lg p-0.5 text-[10px]">
                            <button
                              type="button"
                              onClick={() => setNavMode('demo')}
                              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                navMode === 'demo' ? 'bg-emerald-500 text-midnight' : 'text-muted-text'
                              }`}
                            >
                              Demo
                            </button>
                            <button
                              type="button"
                              onClick={() => setNavMode('live')}
                              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                navMode === 'live' ? 'bg-amber-500 text-midnight' : 'text-muted-text'
                              }`}
                            >
                              Live GPS
                            </button>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="primary"
                          className="w-full text-sm py-2.5 bg-emerald-500 text-midnight hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                          onClick={handleStartNavigation}
                        >
                          <Navigation className="w-4 h-4" />
                          Start Navigation Mode
                        </Button>
                      </div>
                    )}

                    <Button
                      variant="amber"
                      className="w-full text-base py-3"
                      onClick={handleStartEmergency}
                      disabled={!connected}
                    >
                      <AlertTriangle className="w-5 h-5" />
                      Activate Emergency Session
                    </Button>
                    <p className="text-xs text-muted-text text-center">
                      Alerts vehicles within 1 km radius and locks destination road route
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-alert-amber/10 border border-alert-amber/20 rounded-xl p-4">
                      <div className="flex items-center justify-between text-alert-amber font-semibold text-sm mb-3">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Emergency Active
                        </span>
                        <span className="font-mono text-xs bg-alert-amber/20 px-2 py-0.5 rounded">
                          {mins}:{secs.toString().padStart(2, '0')}
                        </span>
                      </div>

                      {emergency?.isStale && (
                        <div className="bg-alert-amber/20 border border-alert-amber/40 text-alert-amber px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 mb-2 animate-pulse">
                          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Telemetry delayed (&gt;45s) — Re-acquiring live GPS fix</span>
                        </div>
                      )}

                      <div className="space-y-2 text-xs border-t border-alert-amber/20 pt-2">
                        <div className="flex justify-between">
                          <span className="text-muted-text">Destination:</span>
                          <span className="font-semibold text-primary-text text-right truncate max-w-[170px]">
                            {activeDestinationName}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-text">Vehicles Alerted:</span>
                          <span className="font-bold text-accent-teal">
                            {alertedCount} vehicle{alertedCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Closer Hospital Recommendation Banner (Safety: requires explicit operator confirmation) */}
                    {closerRecommendation && (
                      <div className="bg-sky-950/40 border border-sky-400/40 rounded-xl p-3.5 text-xs space-y-2.5 animate-fade-in shadow-lg shadow-sky-950/30">
                        <div className="flex items-center gap-1.5 font-bold text-sky-400">
                          <Compass className="w-4 h-4 text-sky-300 animate-spin" />
                          <span>Closer Hospital Recommended</span>
                        </div>
                        <p className="text-primary-text leading-relaxed">
                          <strong>{closerRecommendation.hospital.name}</strong> is{' '}
                          <span className="text-emerald-400 font-bold">{closerRecommendation.savingsKm} closer</span>{' '}
                          (~{closerRecommendation.roadDurationMinutes} est. travel time).
                        </p>
                        <p className="text-[11px] text-muted-text">
                          Current locked destination is <strong>{selectedHospital?.name || activeDestinationName}</strong>.
                          Switching destinations mid-incident requires explicit operator confirmation.
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedHospital(closerRecommendation.hospital);
                              const curOrigin = liveVehicleCoord || startingLocation.coords;
                              loadRoute(curOrigin, closerRecommendation.hospital.coords, {
                                originLabel: 'Emergency Vehicle Location',
                                destinationLabel: closerRecommendation.hospital.name,
                              }, true);
                              setCloserRecommendation(null);
                            }}
                            className="flex-1 py-1.5 px-2 bg-emerald-500 text-midnight font-bold rounded-lg hover:bg-emerald-400 transition-colors text-center text-xs shadow-md shadow-emerald-500/20"
                          >
                            Switch Destination
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDismissedRecommendationHospitalId(closerRecommendation.hospital.id);
                              setCloserRecommendation(null);
                            }}
                            className="py-1.5 px-2.5 bg-petrol/60 hover:bg-petrol text-muted-text hover:text-primary-text font-semibold rounded-lg transition-colors text-xs border border-petrol"
                          >
                            Keep Current
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Start Navigation in Emergency Mode */}
                    {currentActiveRoute && (
                      <Button
                        type="button"
                        variant="primary"
                        className="w-full text-sm py-2.5 bg-emerald-500 text-midnight hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                        onClick={handleStartNavigation}
                      >
                        <Navigation className="w-4 h-4" />
                        Start Navigation Mode
                      </Button>
                    )}

                    <Button
                      variant="primary"
                      className="w-full"
                      onClick={onCompleteEmergency}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Complete — Patient Delivered
                    </Button>
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={onCancelEmergency}
                    >
                      <XCircle className="w-4 h-4" />
                      Cancel Emergency
                    </Button>
                  </div>
                )}
              </Card>

              {/* Live Stats */}
              <Card>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-petrol/30 rounded-xl">
                    <Users className="w-5 h-5 text-accent-teal mx-auto mb-1" />
                    <div className="text-2xl font-bold text-primary-text">
                      {driverCount}
                    </div>
                    <div className="text-xs text-muted-text">Active Drivers</div>
                  </div>
                  <div className="text-center p-3 bg-petrol/30 rounded-xl">
                    <Navigation className="w-5 h-5 text-accent-teal mx-auto mb-1" />
                    <div className="text-2xl font-bold text-accent-teal">
                      {alertedCount}
                    </div>
                    <div className="text-xs text-muted-text">Alerted (≤1km)</div>
                  </div>
                  <div className="text-center p-3 bg-petrol/30 rounded-xl">
                    <MapPin className="w-5 h-5 text-accent-teal mx-auto mb-1" />
                    <div className="text-2xl font-bold text-primary-text">1 km</div>
                    <div className="text-xs text-muted-text">Geofence Radius</div>
                  </div>
                  <div className="text-center p-3 bg-petrol/30 rounded-xl">
                    <Compass className="w-5 h-5 text-accent-teal mx-auto mb-1" />
                    <div className="text-2xl font-bold text-primary-text font-mono text-sm leading-8">
                      {currentActiveRoute ? currentActiveRoute.distanceKm : '--'}
                    </div>
                    <div className="text-xs text-muted-text">Road Route</div>
                  </div>
                </div>
              </Card>

              {/* Incident Timeline */}
              <Card className="max-h-[280px] overflow-y-auto">
                <h2 className="text-xs font-semibold mb-3 text-muted-text uppercase tracking-wider">
                  Live Incident Timeline
                </h2>
                <Timeline events={timeline} />
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* 4. MANUAL DESTINATION SELECTION MODAL */}
      {showDestinationModal && (
        <div className="fixed inset-0 z-50 bg-midnight/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-deep-surface border border-petrol/80 rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-petrol/40 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-accent-teal" />
                <h3 className="font-bold text-base text-primary-text">
                  Choose Destination Facility
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDestinationModal(false)}
                className="text-muted-text hover:text-primary-text p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-muted-text">
              Select any of the 13 verified healthcare facilities. The route will automatically recalculate.
            </p>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {KERALA_HOSPITALS.map((h) => {
                const isSelected = selectedHospital?.id === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      handleGetHospitalDirections(h);
                      setShowDestinationModal(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-petrol border-accent-teal text-primary-text'
                        : 'bg-midnight/60 border-petrol/50 text-muted-text hover:text-primary-text hover:border-petrol'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-primary-text">
                        {h.name}
                      </div>
                      <div className="text-[11px] text-muted-text">
                        {h.town}, {h.district} • {h.address}
                      </div>
                    </div>
                    <CornerUpRight className="w-4 h-4 text-accent-teal flex-shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="ghost" onClick={() => setShowDestinationModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

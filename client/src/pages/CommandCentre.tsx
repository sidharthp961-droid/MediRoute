// ─── Emergency Command Centre — Kerala Priority Corridors & Safe Journey Demo ───
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { EmergencyMap, HospitalMarkerInfo } from '@/components/EmergencyMap';
import { Timeline } from '@/components/Timeline';
import { HospitalDirectory } from '@/components/HospitalDirectory';
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
import { KERALA_HOSPITALS, HospitalDestination } from '@/lib/hospitals';
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

  const currentActiveRoute = routeResult?.routes[routeResult.selectedRouteIndex || 0] || null;

  // Safe Journey Simulation Engine (Local Presentation Only — No Socket Emissions)
  const sim = useJourneySimulation(currentActiveRoute, activeDestinationName);

  // Load road route between specified points
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
          err.message || 'Unable to connect to OSRM routing service. Please retry.',
        );
        setRouteResult(null);
      } finally {
        setIsLoadingRoute(false);
      }
    },
    [],
  );

  // Initial load for default corridor
  useEffect(() => {
    if (selectedCorridor && !selectedHospital) {
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
  }, [selectedCorridor, selectedHospital, loadRoute]);

  // Handle hospital selection from Directory
  const handleSelectHospital = (hospital: HospitalDestination) => {
    setSelectedHospital(hospital);
  };

  const handleGetHospitalDirections = (hospital: HospitalDestination) => {
    setSelectedHospital(hospital);
    loadRoute(DEMO_COORDS.emergency, hospital.coords, {
      originLabel: 'Thodupuzha Hub',
      destinationLabel: hospital.name,
    }, true);
  };

  const handleStartDemoJourney = (hospital: HospitalDestination) => {
    setSelectedHospital(hospital);
    setActiveTab('simulation');
    loadRoute(DEMO_COORDS.emergency, hospital.coords, {
      originLabel: 'Thodupuzha Hub',
      destinationLabel: hospital.name,
    }, true).then(() => {
      // Auto-trigger simulation once route is ready
      setTimeout(() => sim.startSimulation(), 400);
    });
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
    const originCoords = DEMO_COORDS.emergency;
    let destinationCoords: Coordinates | undefined;

    if (selectedHospital) {
      destinationCoords = selectedHospital.coords;
    } else if (selectedCorridor) {
      destinationCoords = selectedCorridor.destination.coords;
    }

    onStartEmergency(originCoords, destinationCoords);
  }

  // Compile all 13 verified hospital markers + origin hub for the map
  const hospitalMarkers = useMemo<HospitalMarkerInfo[]>(() => {
    const activeDestinationCoords = selectedHospital?.coords || selectedCorridor?.destination.coords;

    const list: HospitalMarkerInfo[] = [
      {
        name: 'District Hospital Thodupuzha (Emergency Hub)',
        town: 'Thodupuzha',
        coords: DEMO_COORDS.emergency,
        isDestination: false,
      },
    ];

    for (const h of KERALA_HOSPITALS) {
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
    }

    return list;
  }, [selectedHospital, selectedCorridor]);

  const elapsed = emergency?.createdAt
    ? Math.floor((Date.now() - emergency.createdAt) / 1000)
    : 0;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

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
              Hospital directory, actual road routing, and safe journey simulation
            </p>
          </div>
          <div className="flex items-center gap-3">
            {sim.isActive ? (
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

        {/* Top Control Mode Switcher Tabs */}
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

        {/* Tab 1: Priority Corridors Selector Pills */}
        {activeTab === 'corridors' && (
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
        {activeTab === 'hospitals' && (
          <Card className="animate-fade-in">
            <HospitalDirectory
              currentOrigin={DEMO_COORDS.emergency}
              selectedHospitalId={selectedHospital?.id || null}
              onSelectHospital={handleSelectHospital}
              onGetDirections={handleGetHospitalDirections}
              onStartDemoJourney={handleStartDemoJourney}
              isLoadingRoute={isLoadingRoute}
            />
          </Card>
        )}

        {/* Tab 3: Demo Journey Simulation Controller */}
        {activeTab === 'simulation' && (
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

            <div className="flex items-center gap-2 text-[10px] text-muted-text">
              <Info className="w-3.5 h-3.5 text-accent-teal flex-shrink-0" />
              <span>
                Safety Assurance: Simulated vehicle coordinates run in local client memory and are NEVER broadcast over Socket.IO to avoid triggering real proximity alerts.
              </span>
            </div>
          </Card>
        )}

        {/* Main Grid: Map & Controls */}
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Map — spans 2 columns */}
          <div className="lg:col-span-2 animate-slide-up flex flex-col gap-3">
            <Card className="p-0 overflow-hidden h-[520px] sm:h-[620px] relative">
              <EmergencyMap
                vehicles={vehicles}
                emergency={emergency}
                center={DEMO_COORDS.emergency}
                routeResult={routeResult}
                onSelectRouteIndex={handleSelectRouteIndex}
                hospitalMarkers={hospitalMarkers}
                demoVehicleCoord={sim.isActive ? sim.currentCoord : null}
                isDemoJourneyActive={sim.isActive}
              />
            </Card>

            {/* Route Status Strip */}
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
          </div>

          {/* Sidebar */}
          <div className="space-y-5 animate-slide-in-right">
            {/* Emergency controls */}
            <Card>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Radio className="w-5 h-5 text-accent-teal" />
                Emergency Controls
              </h2>

              {!isActive ? (
                <div className="space-y-4">
                  {/* Selected Destination Facility Info */}
                  <div className="bg-petrol/30 border border-petrol/60 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-accent-teal uppercase tracking-wider flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        Target Facility
                      </span>
                      {currentActiveRoute && (
                        <span className="text-[10px] bg-accent-teal/15 text-accent-teal px-1.5 py-0.5 rounded font-mono font-bold">
                          {currentActiveRoute.distanceKm}
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-sm text-primary-text">
                      {activeDestinationName}
                    </div>
                    <div className="text-xs text-muted-text">
                      Route geometry via OpenStreetMap OSRM
                    </div>
                  </div>

                  {/* Route Error & Retry */}
                  {routeError && (
                    <div className="bg-alert-amber/10 border border-alert-amber/30 rounded-xl p-3 text-xs text-alert-amber flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div>{routeError}</div>
                      </div>
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
        </div>
      </div>
    </div>
  );
}

// ─── Emergency Command Centre — Kerala Priority Corridors ───
import { useState, useEffect, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { EmergencyMap, HospitalMarkerInfo } from '@/components/EmergencyMap';
import { Timeline } from '@/components/Timeline';
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
  // Priority corridor selection (default: Thodupuzha → Ernakulam)
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('thodupuzha-ernakulam');
  const [customDestinationText, setCustomDestinationText] = useState<string>('');
  const [routeResult, setRouteResult] = useState<RoutingResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const selectedCorridor = useMemo<KeralaCorridor | undefined>(
    () => KERALA_CORRIDORS.find((c) => c.id === selectedCorridorId),
    [selectedCorridorId],
  );

  // Load road route for the selected corridor
  const loadRouteForCorridor = useCallback(
    async (corridor: KeralaCorridor, bypassCache = false) => {
      setIsLoadingRoute(true);
      setRouteError(null);
      try {
        const result = await fetchRoadRoute(
          corridor.origin.coords,
          corridor.destination.coords,
          {
            corridorId: corridor.id,
            originLabel: `${corridor.origin.town}`,
            destinationLabel: `${corridor.destination.town}`,
            bypassCache,
          },
        );
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

  // Initial load or corridor change
  useEffect(() => {
    if (selectedCorridor) {
      loadRouteForCorridor(selectedCorridor);
    }
  }, [selectedCorridor, loadRouteForCorridor]);

  // If an emergency is active with destination, keep route updated
  useEffect(() => {
    if (emergency?.status === 'active' && emergency.destination && !routeResult) {
      // Find matching corridor or load direct
      const matched = KERALA_CORRIDORS.find(
        (c) =>
          Math.abs(c.destination.coords.lat - emergency.destination!.lat) < 0.01 &&
          Math.abs(c.destination.coords.lng - emergency.destination!.lng) < 0.01,
      );
      if (matched) {
        setSelectedCorridorId(matched.id);
        loadRouteForCorridor(matched);
      } else {
        // Fetch custom destination route
        setIsLoadingRoute(true);
        fetchRoadRoute(emergency.origin, emergency.destination, {
          originLabel: 'Origin',
          destinationLabel: 'Emergency Destination',
        })
          .then((res) => {
            setRouteResult(res);
            setRouteError(null);
          })
          .catch((err) => {
            setRouteError(err.message || 'Routing failed');
          })
          .finally(() => setIsLoadingRoute(false));
      }
    }
  }, [emergency, routeResult, loadRouteForCorridor]);

  const isActive = emergency?.status === 'active';
  const alertedCount = emergency?.alertedVehicleIds?.length || 0;
  const driverCount = vehicles.filter((v) => v.role === 'driver').length;

  function handleStartEmergency() {
    const originCoords = DEMO_COORDS.emergency;
    let destinationCoords: Coordinates | undefined;

    if (selectedCorridor) {
      destinationCoords = selectedCorridor.destination.coords;
    } else if (customDestinationText.trim()) {
      // fallback offset
      destinationCoords = {
        lat: originCoords.lat + 0.02,
        lng: originCoords.lng + 0.02,
      };
    }

    onStartEmergency(originCoords, destinationCoords);
  }

  const handleSelectRouteIndex = (idx: number) => {
    if (routeResult) {
      setRouteResult({
        ...routeResult,
        selectedRouteIndex: idx,
      });
    }
  };

  // Compile hospital markers across Kerala priority corridors
  const hospitalMarkers = useMemo<HospitalMarkerInfo[]>(() => {
    const list: HospitalMarkerInfo[] = [
      {
        name: 'District Hospital Thodupuzha (Emergency Hub)',
        town: 'Thodupuzha',
        coords: DEMO_COORDS.emergency,
        isDestination: false,
      },
    ];

    for (const c of KERALA_CORRIDORS) {
      list.push({
        name: c.destination.name,
        town: c.destination.town,
        coords: c.destination.coords,
        isDestination: c.id === selectedCorridorId,
      });
    }
    return list;
  }, [selectedCorridorId]);

  const elapsed = emergency?.createdAt
    ? Math.floor((Date.now() - emergency.createdAt) / 1000)
    : 0;
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  const currentActiveRoute = routeResult?.routes[routeResult.selectedRouteIndex || 0];

  return (
    <div className="min-h-screen pt-20 pb-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 animate-fade-in">
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
              Live hospital routing and real-time 1 km proximity coordination
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isActive ? (
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

        {/* Priority Corridor Selector Pills */}
        <div className="mb-5 bg-deep-surface border border-petrol/60 rounded-2xl p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2 mb-2 px-1">
            <span className="text-xs font-semibold text-muted-text uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-accent-teal" />
              Priority Kerala Corridors (From Thodupuzha)
            </span>
            {isLoadingRoute && (
              <span className="text-xs text-accent-teal flex items-center gap-1 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Calculating OSRM Road Route...
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {KERALA_CORRIDORS.map((corridor) => {
              const isSelected = corridor.id === selectedCorridorId;
              const isPriorityCorridor =
                corridor.id === 'thodupuzha-ernakulam' || corridor.id === 'thodupuzha-kottayam';

              return (
                <button
                  key={corridor.id}
                  onClick={() => {
                    setSelectedCorridorId(corridor.id);
                  }}
                  className={`text-left p-2.5 rounded-xl border transition-all text-xs relative ${
                    isSelected
                      ? 'bg-petrol/90 border-accent-teal text-primary-text shadow-md shadow-accent-teal/10'
                      : 'bg-petrol/20 border-petrol/40 text-muted-text hover:text-primary-text hover:bg-petrol/40'
                  }`}
                >
                  {isPriorityCorridor && (
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

        {/* Main grid */}
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
              />
            </Card>

            {/* Route Status Strip */}
            {selectedCorridor && (
              <div className="bg-deep-surface border border-petrol/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent-teal" />
                  <span className="text-muted-text">Selected Corridor:</span>
                  <span className="font-semibold text-primary-text">
                    {selectedCorridor.name}
                  </span>
                  <span className="text-muted-text hidden md:inline">
                    ({selectedCorridor.highway})
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
                      onClick={() => loadRouteForCorridor(selectedCorridor, true)}
                      className="underline text-accent-teal hover:text-primary-text ml-1"
                    >
                      Retry
                    </button>
                  </div>
                ) : null}
              </div>
            )}
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
                  {/* Selected Corridor Info */}
                  {selectedCorridor && (
                    <div className="bg-petrol/30 border border-petrol/60 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-accent-teal uppercase tracking-wider flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          Destination Facility
                        </span>
                        {currentActiveRoute && (
                          <span className="text-[10px] bg-accent-teal/15 text-accent-teal px-1.5 py-0.5 rounded font-mono font-bold">
                            {currentActiveRoute.distanceKm}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-sm text-primary-text">
                        {selectedCorridor.destination.name}
                      </div>
                      <div className="text-xs text-muted-text">
                        Town: <span className="text-primary-text">{selectedCorridor.destination.town}</span>
                      </div>
                      <div className="text-[11px] text-muted-text/80">
                        Via: {selectedCorridor.highway}
                      </div>
                    </div>
                  )}

                  {/* Route Error & Retry */}
                  {routeError && (
                    <div className="bg-alert-amber/10 border border-alert-amber/30 rounded-xl p-3 text-xs text-alert-amber flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div>{routeError}</div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-2 text-xs py-1 h-auto"
                          onClick={() => selectedCorridor && loadRouteForCorridor(selectedCorridor, true)}
                        >
                          <RefreshCw className="w-3 h-3 mr-1" />
                          Retry Routing Service
                        </Button>
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
                          {selectedCorridor?.destination.name || 'Assigned Destination'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-text">Corridor:</span>
                        <span className="text-accent-teal font-medium">
                          {selectedCorridor?.highway || 'Direct Route'}
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

            {/* Timeline */}
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

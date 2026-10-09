// ─── Network Monitor / Demo Page with Kerala Road Routing ───
import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Monitor,
  Play,
  Square,
  Users,
  Radio,
  Activity,
  Wifi,
  MapPin,
  ArrowLeft,
  ArrowRight,
  Bot,
  Compass,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button, Card, Badge, StatusDot } from '@/components/ui';
import { EmergencyMap, HospitalMarkerInfo } from '@/components/EmergencyMap';
import { Timeline } from '@/components/Timeline';
import { DEMO_COORDS } from '@/types';
import type {
  Vehicle,
  EmergencySession,
  TimelineEvent,
  NetworkStatus,
  Coordinates,
} from '@/types';
import {
  KERALA_CORRIDORS,
  fetchRoadRoute,
  RoutingResult,
} from '@/lib/routing';

interface MonitorPageProps {
  vehicles: Vehicle[];
  emergency: EmergencySession | null;
  timeline: TimelineEvent[];
  networkStatus: NetworkStatus;
  connected: boolean;
  onCreateSimVehicle: (label: string, location: Coordinates) => void;
  onMoveSimVehicle: (vehicleId: string, location: Coordinates) => void;
  onStopSimulation: () => void;
  onStartEmergency: (origin: Coordinates, destination?: Coordinates) => void;
  onCancelEmergency: () => void;
  onCompleteEmergency: () => void;
}

export function MonitorPage({
  vehicles,
  emergency,
  timeline,
  networkStatus,
  connected,
  onCreateSimVehicle,
  onMoveSimVehicle,
  onStopSimulation,
  onStartEmergency,
  onCancelEmergency,
  onCompleteEmergency,
}: MonitorPageProps) {
  const [simStarted, setSimStarted] = useState(false);
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('thodupuzha-ernakulam');
  const [routeResult, setRouteResult] = useState<RoutingResult | null>(null);

  const selectedCorridor = useMemo(
    () => KERALA_CORRIDORS.find((c) => c.id === selectedCorridorId),
    [selectedCorridorId],
  );

  // Preload route for Kerala corridor
  useEffect(() => {
    if (selectedCorridor) {
      fetchRoadRoute(selectedCorridor.origin.coords, selectedCorridor.destination.coords, {
        corridorId: selectedCorridor.id,
        originLabel: selectedCorridor.origin.town,
        destinationLabel: selectedCorridor.destination.town,
      })
        .then((res) => setRouteResult(res))
        .catch((err) => console.warn('[Monitor] Route fetch failed:', err));
    }
  }, [selectedCorridor]);

  const simVehicles = vehicles.filter((v) => v.isSimulated);
  const isActive = emergency?.status === 'active';

  // ── Start full demo with Kerala Thodupuzha coordinates ──
  const handleStartDemo = useCallback(() => {
    onCreateSimVehicle('Ambulance 🚑 (Hub)', DEMO_COORDS.emergency);
    onCreateSimVehicle('Vehicle A (300m)', DEMO_COORDS.vehicleA);
    onCreateSimVehicle('Vehicle B (800m)', DEMO_COORDS.vehicleB);
    onCreateSimVehicle('Vehicle C (1300m)', DEMO_COORDS.vehicleC);
    setSimStarted(true);
  }, [onCreateSimVehicle]);

  const handleStopDemo = useCallback(() => {
    if (isActive) {
      onCancelEmergency();
    }
    onStopSimulation();
    setSimStarted(false);
  }, [onStopSimulation, onCancelEmergency, isActive]);

  const handleStartEmergency = useCallback(() => {
    const destinationCoords = selectedCorridor?.destination.coords;
    onStartEmergency(DEMO_COORDS.emergency, destinationCoords);
  }, [onStartEmergency, selectedCorridor]);

  // Move vehicle closer or further relative to emergency origin (Thodupuzha)
  const handleMoveVehicle = useCallback(
    (vehicle: Vehicle, direction: 'closer' | 'further') => {
      if (!vehicle.location) return;
      // Moving closer reduces lat & lng towards emergency (9.8959, 76.7184)
      // Moving further increases lat & lng away from emergency
      const deltaLat = direction === 'closer' ? -0.0035 : 0.0035;
      const deltaLng = direction === 'closer' ? -0.0030 : 0.0030;
      onMoveSimVehicle(vehicle.id, {
        lat: Number((vehicle.location.lat + deltaLat).toFixed(5)),
        lng: Number((vehicle.location.lng + deltaLng).toFixed(5)),
      });
    },
    [onMoveSimVehicle],
  );

  const hospitalMarkers = useMemo<HospitalMarkerInfo[]>(() => {
    const list: HospitalMarkerInfo[] = [
      {
        name: 'District Hospital Thodupuzha (Origin)',
        town: 'Thodupuzha',
        coords: DEMO_COORDS.emergency,
        isDestination: false,
      },
    ];
    if (selectedCorridor) {
      list.push({
        name: selectedCorridor.destination.name,
        town: selectedCorridor.destination.town,
        coords: selectedCorridor.destination.coords,
        isDestination: true,
      });
    }
    return list;
  }, [selectedCorridor]);

  return (
    <div className="min-h-screen pt-20 pb-6 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-accent-teal/15 text-accent-teal border border-accent-teal/30">
                KERALA SIMULATION BENCH
              </span>
              <span className="text-xs text-muted-text font-mono">
                CENTRAL KERALA
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <Monitor className="w-7 h-7 text-accent-teal" />
              Network Monitor & Route Simulator
            </h1>
            <p className="text-muted-text text-sm mt-0.5">
              Live proximity geofence testing (300m, 800m, 1300m) along Kerala road corridors
            </p>
          </div>
          <Badge
            variant={connected ? 'teal' : 'red'}
            pulse={connected}
          >
            {connected ? 'Network Online' : 'Offline'}
          </Badge>
        </div>

        {/* Status bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              icon: Wifi,
              label: 'Clients',
              value: networkStatus.connectedClients,
              color: 'text-accent-teal',
            },
            {
              icon: Users,
              label: 'Vehicles',
              value: networkStatus.vehicleCount,
              color: 'text-accent-teal',
            },
            {
              icon: Radio,
              label: 'Emergency',
              value: isActive ? 'Active' : 'None',
              color: isActive ? 'text-alert-amber' : 'text-muted-text',
            },
            {
              icon: Bot,
              label: 'Simulated',
              value: simVehicles.length,
              color: 'text-accent-teal',
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} className="p-4">
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div>
                  <div className={`text-lg font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-muted-text">{label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Corridor Quick Selector */}
        <div className="mb-5 bg-deep-surface border border-petrol/60 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent-teal" />
            <span className="font-semibold text-primary-text">Demo Highway Corridor:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KERALA_CORRIDORS.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCorridorId(c.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  c.id === selectedCorridorId
                    ? 'bg-accent-teal text-midnight font-bold shadow'
                    : 'bg-petrol text-muted-text hover:text-primary-text'
                }`}
              >
                {c.shortName}
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="p-0 overflow-hidden h-[480px] sm:h-[580px]">
              <EmergencyMap
                vehicles={vehicles}
                emergency={emergency}
                center={DEMO_COORDS.emergency}
                routeResult={routeResult}
                hospitalMarkers={hospitalMarkers}
              />
            </Card>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            {/* Simulation controls */}
            <Card>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-accent-teal" />
                Simulation Controls
              </h2>

              {!simStarted ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-text leading-relaxed">
                    Instantiates 4 deterministic test vehicles in Thodupuzha:
                    <br />
                    • Ambulance 🚑 at Hub (0m)
                    <br />
                    • Vehicle A at <span className="text-accent-teal font-semibold">~300m</span> (alert eligible)
                    <br />
                    • Vehicle B at <span className="text-accent-teal font-semibold">~800m</span> (alert eligible)
                    <br />
                    • Vehicle C at <span className="text-muted-text font-semibold">~1300m</span> (outside 1km geofence)
                  </p>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={handleStartDemo}
                    disabled={!connected}
                  >
                    <Play className="w-4 h-4" />
                    Start Demo Simulation
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!isActive ? (
                    <Button
                      variant="amber"
                      className="w-full"
                      onClick={handleStartEmergency}
                    >
                      <Radio className="w-4 h-4" />
                      Trigger Emergency
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={onCompleteEmergency}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Complete
                      </Button>
                      <Button
                        variant="danger"
                        className="flex-1"
                        onClick={onCancelEmergency}
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </Button>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleStopDemo}
                  >
                    <Square className="w-4 h-4" />
                    Stop & Clear Demo
                  </Button>
                </div>
              )}
            </Card>

            {/* Vehicle list with movement controls */}
            <Card className="max-h-[300px] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-muted-text uppercase tracking-wider">
                  Simulated Vehicles ({simVehicles.length})
                </h2>
                <span className="text-[10px] text-accent-teal font-mono">
                  1 km Geofence Check
                </span>
              </div>

              {simVehicles.length === 0 ? (
                <p className="text-sm text-muted-text text-center py-4">
                  Click 'Start Demo Simulation' to test
                </p>
              ) : (
                <div className="space-y-2">
                  {simVehicles.map((v) => {
                    const isAlerted = emergency?.alertedVehicleIds?.includes(
                      v.id,
                    );
                    const isAmbulance = v.label?.includes('Ambulance');

                    return (
                      <div
                        key={v.id}
                        className={`flex items-center justify-between p-3 rounded-xl border ${
                          isAlerted
                            ? 'bg-alert-amber/10 border-alert-amber/40'
                            : 'bg-petrol/30 border-petrol/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <StatusDot
                            status={isAlerted ? 'warning' : 'online'}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-primary-text truncate">
                              {v.label}
                            </div>
                            <div className="text-[11px] text-muted-text flex items-center gap-1 font-mono">
                              <MapPin className="w-3 h-3 text-muted-text/70" />
                              {v.location
                                ? `${v.location.lat.toFixed(4)}, ${v.location.lng.toFixed(4)}`
                                : 'No location'}
                              {isAlerted && (
                                <Badge variant="amber" className="ml-1 text-[10px] py-0 px-1">
                                  ALERTED
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isAmbulance && (
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => handleMoveVehicle(v, 'closer')}
                              className="p-1.5 rounded-lg bg-petrol hover:bg-accent-teal/20 transition-colors"
                              title="Move closer to emergency"
                            >
                              <ArrowLeft className="w-3.5 h-3.5 text-accent-teal" />
                            </button>
                            <button
                              onClick={() => handleMoveVehicle(v, 'further')}
                              className="p-1.5 rounded-lg bg-petrol hover:bg-accent-teal/20 transition-colors"
                              title="Move further away"
                            >
                              <ArrowRight className="w-3.5 h-3.5 text-accent-teal" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Timeline */}
            <Card className="max-h-[220px] overflow-y-auto">
              <h2 className="text-xs font-semibold mb-2 text-muted-text uppercase tracking-wider">
                Simulation Event Log
              </h2>
              <Timeline events={timeline} maxItems={15} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

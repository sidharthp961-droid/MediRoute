import 'leaflet/dist/leaflet.css';
// ─── Emergency Map component with Kerala Road Routing ───
import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Popup,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation2,
  Maximize2,
  Info,
  Clock,
  Compass,
  Layers,
  MapPin,
} from 'lucide-react';
import type { Vehicle, EmergencySession, Coordinates } from '@/types';
import type { RoutingResult } from '@/lib/routing';
import { KERALA_CENTER } from '@/lib/routing';

// Custom marker icons
function createIcon(color: string, pulse = false, symbol?: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        ${
          pulse
            ? `<div style="position:absolute;width:40px;height:40px;border-radius:50%;background:${color}33;animation:pulse-ring 2s ease-out infinite;"></div>`
            : ''
        }
        <div style="
          width:30px;height:30px;border-radius:50%;
          background:${color};
          border:3px solid #0B272D;
          box-shadow:0 3px 12px ${color}66;
          display:flex;align-items:center;justify-content:center;
          font-weight:bold;font-size:12px;color:#0B272D;
        ">
          ${symbol ? symbol : `<div style="width:8px;height:8px;border-radius:50%;background:#0B272D;"></div>`}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -22],
  });
}

function createHospitalIcon(
  isDestination = false,
  rank?: number,
  name?: string,
  distanceText?: string,
): L.DivIcon {
  const bg = isDestination ? '#5DE4D0' : '#0B272D';
  const text = isDestination ? '#071B20' : '#5DE4D0';
  const border = isDestination ? '#F0FAF8' : rank === 1 ? '#F0B85A' : rank === 2 ? '#5DE4D0' : '#38BDF8';
  const badgeBg = rank === 1 ? '#F0B85A' : rank === 2 ? '#5DE4D0' : '#38BDF8';
  const badgeText = '#071B20';

  const badgeHtml = rank != null ? `
    <span style="
      background:${badgeBg};
      color:${badgeText};
      font-size:10px;
      font-weight:900;
      padding:1px 5px;
      border-radius:4px;
      letter-spacing:0.5px;
      flex-shrink:0;
    ">#${rank}</span>
  ` : isDestination ? `
    <span style="
      background:#5DE4D0;
      color:#071B20;
      font-size:9px;
      font-weight:900;
      padding:1px 5px;
      border-radius:4px;
      letter-spacing:0.5px;
      flex-shrink:0;
    ">DEST</span>
  ` : '';

  const labelHtml = (name || distanceText) ? `
    <div style="
      position:absolute;
      bottom:100%;
      left:50%;
      transform:translateX(-50%);
      margin-bottom:6px;
      background:rgba(7, 27, 32, 0.96);
      border:1.5px solid ${border};
      color:#F0FAF8;
      padding:3px 8px;
      border-radius:8px;
      font-size:11px;
      font-weight:700;
      box-shadow:0 6px 20px rgba(0,0,0,0.85);
      white-space:nowrap;
      pointer-events:none;
      display:flex;
      align-items:center;
      gap:5px;
      z-index:999;
    ">
      ${badgeHtml}
      <span style="max-width:180px;overflow:hidden;text-overflow:ellipsis;">${name || ''}</span>
      ${distanceText ? `<span style="color:#5DE4D0;font-family:ui-monospace,monospace;font-size:10px;font-weight:800;">${distanceText}</span>` : ''}
    </div>
  ` : '';

  return L.divIcon({
    className: 'hospital-marker-icon',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:40px;height:40px;">
        ${labelHtml}
        ${
          isDestination
            ? '<div style="position:absolute;width:48px;height:48px;border-radius:14px;background:#5DE4D044;animation:pulse-ring 1.8s ease-out infinite;"></div>'
            : ''
        }
        <div style="
          width:36px;height:36px;border-radius:10px;
          background:${bg};
          border:2.5px solid ${border};
          box-shadow:0 4px 16px rgba(0,0,0,0.7), 0 0 10px ${border}66;
          display:flex;align-items:center;justify-content:center;
          font-weight:900;font-size:16px;color:${text};
          font-family:ui-sans-serif, system-ui, -apple-system, sans-serif;
          cursor:pointer;
        ">
          H
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -26],
  });
}

const emergencyIcon = createIcon('#F0B85A', true, '🚑');
const driverNearIcon = createIcon('#5DE4D0', false, '🚗');
const driverFarIcon = createIcon('#9AB9B5', false);

const demoVehicleIcon = L.divIcon({
  className: 'demo-vehicle-marker',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:#5DE4D044;animation:pulse-ring 1.5s ease-out infinite;"></div>
      <div style="
        width:34px;height:34px;border-radius:50%;
        background:#0B272D;
        border:3px solid #5DE4D0;
        box-shadow:0 0 15px #5DE4D0;
        display:flex;align-items:center;justify-content:center;
        font-size:16px;
      ">
        🚗
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

// Start Location Marker Icon (Emerald Green Pin)
const startLocationIcon = L.divIcon({
  className: 'start-location-marker',
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:#10B98144;animation:pulse-ring 1.8s ease-out infinite;"></div>
      <div style="
        width:34px;height:34px;border-radius:50%;
        background:#071B20;
        border:3px solid #10B981;
        box-shadow:0 0 16px rgba(16, 185, 129, 0.7);
        display:flex;align-items:center;justify-content:center;
        font-size:16px;
      ">
        📍
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

// Map click listener hook
function MapClickHandler({
  onMapClick,
  enabled,
}: {
  onMapClick?: (coords: Coordinates) => void;
  enabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (enabled && onMapClick) {
        onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

// Fit map bounds to route or re-center
function MapBoundsUpdater({
  routeCoordinates,
  center,
  disabled = false,
}: {
  routeCoordinates?: [number, number][];
  center?: Coordinates | null;
  disabled?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (disabled) return;
    if (routeCoordinates && routeCoordinates.length > 1) {
      try {
        const bounds = L.latLngBounds(routeCoordinates.map((c) => L.latLng(c[0], c[1])));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (err) {
        console.warn('[Map] Could not fit bounds:', err);
      }
    } else if (center && typeof center.lat === 'number' && typeof center.lng === 'number' && !isNaN(center.lat) && !isNaN(center.lng)) {
      map.setView([center.lat, center.lng], 14, { animate: true });
    }
  }, [routeCoordinates, center?.lat, center?.lng, disabled, map]);

  return null;
}

// Dedicated vehicle follower: keeps vehicle around lower-middle of viewport (~30% from bottom)
function NavigationCameraController({
  vehicleCoord,
  isNavigating,
  zoom = 16,
}: {
  vehicleCoord?: Coordinates | null;
  isNavigating?: boolean;
  zoom?: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!isNavigating || !vehicleCoord || typeof vehicleCoord.lat !== "number" || typeof vehicleCoord.lng !== "number" || isNaN(vehicleCoord.lat) || isNaN(vehicleCoord.lng)) return;

    // Offset camera slightly north/forward (~280m at zoom 16) so vehicle sits at lower-middle of viewport
    const offsetLat = vehicleCoord.lat + 0.0025;
    const offsetLng = vehicleCoord.lng;

    map.setView([offsetLat, offsetLng], zoom, {
      animate: true,
      duration: 0.5,
      easeLinearity: 0.25,
    });
  }, [vehicleCoord?.lat, vehicleCoord?.lng, isNavigating, zoom, map]);

  return null;
}

export interface HospitalMarkerInfo {
  name: string;
  town: string;
  coords: Coordinates;
  isDestination?: boolean;
  distanceKm?: string;
  distanceMetres?: number;
  rank?: number;
  isNearby?: boolean;
  alternateName?: string;
  category?: string;
  address?: string;
  verifiedOSM?: boolean;
  onSelectDestination?: (coords: Coordinates) => void;
  onGetDirections?: (coords: Coordinates) => void;
}

interface EmergencyMapProps {
  vehicles: Vehicle[];
  emergency: EmergencySession | null;
  center?: Coordinates;
  className?: string;
  routeResult?: RoutingResult | null;
  onSelectRouteIndex?: (index: number) => void;
  hospitalMarkers?: HospitalMarkerInfo[];
  showRouteControls?: boolean;
  demoVehicleCoord?: Coordinates | null;
  isDemoJourneyActive?: boolean;
  isNavigationActive?: boolean;
  traversedRouteCoordinates?: [number, number][];
  remainingRouteCoordinates?: [number, number][];
  startLocationCoord?: Coordinates | null;
  startLocationLabel?: string;
  isPickingLocation?: boolean;
  onMapClick?: (coords: Coordinates) => void;
}

export function EmergencyMap({
  vehicles,
  emergency,
  center,
  className = '',
  routeResult = null,
  onSelectRouteIndex,
  hospitalMarkers = [],
  showRouteControls = true,
  demoVehicleCoord = null,
  isDemoJourneyActive = false,
  isNavigationActive = false,
  traversedRouteCoordinates = [],
  remainingRouteCoordinates = [],
  startLocationCoord = null,
  startLocationLabel,
  isPickingLocation = false,
  onMapClick,
}: EmergencyMapProps) {
  const defaultCenter: Coordinates =
    center && typeof center.lat === 'number' && typeof center.lng === 'number' && !isNaN(center.lat) && !isNaN(center.lng)
      ? center
      : emergency?.origin && typeof emergency.origin.lat === 'number' && typeof emergency.origin.lng === 'number' && !isNaN(emergency.origin.lat) && !isNaN(emergency.origin.lng)
      ? emergency.origin
      : KERALA_CENTER;

  const [selectedRouteIdx, setSelectedRouteIdx] = useState(
    routeResult?.selectedRouteIndex || 0,
  );

  useEffect(() => {
    if (routeResult) {
      setSelectedRouteIdx(routeResult.selectedRouteIndex || 0);
    }
  }, [routeResult]);

  const handleRouteClick = (idx: number) => {
    setSelectedRouteIdx(idx);
    if (onSelectRouteIndex) {
      onSelectRouteIndex(idx);
    }
  };

  const alertedSet = useMemo(
    () => new Set(emergency?.alertedVehicleIds || []),
    [emergency?.alertedVehicleIds],
  );

  const activeRoute = routeResult?.routes?.[selectedRouteIdx];

  return (
    <div className={`relative w-full h-full ${className}`}>
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={14}
        className="w-full h-full rounded-2xl overflow-hidden"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          minZoom={5}
          className="osm-tiles"
          eventHandlers={{
            tileerror: (error) => {
              console.warn('[Map] OSM Tile load error:', error);
            },
          }}
        />

        {/* Map Click Handler for Starting Location Selection */}
        <MapClickHandler
          onMapClick={onMapClick}
          enabled={Boolean(isPickingLocation || onMapClick)}
        />

        {/* Dynamic Bounds / Center Updater (active when not in camera navigation mode) */}
        <MapBoundsUpdater
          routeCoordinates={activeRoute?.coordinates}
          center={emergency?.origin || defaultCenter}
          disabled={isNavigationActive}
        />

        {/* Dedicated Navigation Camera Follower (keeps vehicle at lower-middle of viewport) */}
        {isNavigationActive && (
          <NavigationCameraController
            vehicleCoord={demoVehicleCoord}
            isNavigating={isNavigationActive}
            zoom={16}
          />
        )}

        {/* Emergency 1 km proximity radius circle */}
        {emergency?.status === 'active' && emergency?.origin && typeof emergency.origin.lat === 'number' && typeof emergency.origin.lng === 'number' && !isNaN(emergency.origin.lat) && !isNaN(emergency.origin.lng) && (
          <Circle
            center={[emergency.origin.lat, emergency.origin.lng]}
            radius={emergency.radiusMetres}
            pathOptions={{
              color: '#5DE4D0',
              fillColor: '#5DE4D0',
              fillOpacity: 0.08,
              weight: 2,
              dashArray: '8 6',
            }}
          />
        )}

        {/* Alternative Routes (rendered underneath primary when not actively navigating) */}
        {!isNavigationActive &&
          routeResult?.routes?.map((route, idx) => {
            if (idx === selectedRouteIdx) return null; // rendered separately on top
            return (
              <Polyline
                key={route.id}
                positions={route.coordinates}
                pathOptions={{
                  color: '#9AB9B5',
                  weight: 4,
                  opacity: 0.6,
                  dashArray: '6 6',
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
                eventHandlers={{
                  click: () => handleRouteClick(idx),
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <div className="font-bold text-primary-text">Alternative Route {idx}</div>
                    <div className="text-muted-text text-xs mt-1">
                      Distance: {route.distanceKm} | Duration: ~{route.durationMinutes}
                    </div>
                    <button
                      onClick={() => handleRouteClick(idx)}
                      className="mt-2 px-2 py-1 bg-petrol text-accent-teal rounded text-xs font-semibold hover:bg-petrol/80"
                    >
                      Select this route
                    </button>
                  </div>
                </Popup>
              </Polyline>
            );
          })}

        {/* Google Maps Navigation Mode: Distinct Traversed vs Remaining Route Highlighting */}
        {isNavigationActive && remainingRouteCoordinates.length > 0 ? (
          <>
            {/* Traversed route segment (muted slate grey) */}
            {traversedRouteCoordinates.length > 1 && (
              <Polyline
                positions={traversedRouteCoordinates}
                pathOptions={{
                  color: '#42585E',
                  weight: 5,
                  opacity: 0.55,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            {/* Remaining route segment (glowing high-visibility cyan with dark casing) */}
            <Polyline
              positions={remainingRouteCoordinates}
              pathOptions={{
                color: '#071B20',
                weight: 9,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Polyline
              positions={remainingRouteCoordinates}
              pathOptions={{
                color: '#5DE4D0',
                weight: 6,
                opacity: 0.98,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        ) : (
          /* Standard Overview Primary Route */
          activeRoute && (
            <>
              {/* Dark casing/outline underneath for high contrast on dark tile map */}
              <Polyline
                positions={activeRoute.coordinates}
                pathOptions={{
                  color: '#071B20',
                  weight: 8,
                  opacity: 0.9,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Glowing teal emergency corridor */}
              <Polyline
                positions={activeRoute.coordinates}
                pathOptions={{
                  color: '#5DE4D0',
                  weight: 5,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              >
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <div className="font-bold text-accent-teal">
                      {routeResult.corridorId ? 'Kerala Priority Corridor' : 'Active Road Route'}
                    </div>
                    <div className="text-primary-text text-xs font-medium mt-1">
                      {activeRoute.summary || 'OpenStreetMap Verified Route'}
                    </div>
                    <div className="text-muted-text text-xs mt-1 space-y-0.5">
                      <div>Road distance: <span className="font-semibold text-primary-text">{activeRoute.distanceKm}</span></div>
                      <div>Est. travel time: <span className="font-semibold text-primary-text">{activeRoute.durationMinutes}</span></div>
                    </div>
                    <div className="text-[10px] text-muted-text/70 mt-2 border-t border-petrol pt-1">
                      Road geometry via OSRM / OpenStreetMap
                    </div>
                  </div>
                </Popup>
              </Polyline>
            </>
          )
        )}

        {/* Hospital Markers: Nearest 3 facilities and active destination */}
        {hospitalMarkers
          .filter(
            (hospital) =>
              hospital?.coords &&
              typeof hospital.coords.lat === 'number' &&
              typeof hospital.coords.lng === 'number' &&
              !isNaN(hospital.coords.lat) &&
              !isNaN(hospital.coords.lng) &&
              isFinite(hospital.coords.lat) &&
              isFinite(hospital.coords.lng) &&
              hospital.coords.lat >= -90 &&
              hospital.coords.lat <= 90 &&
              hospital.coords.lng >= -180 &&
              hospital.coords.lng <= 180,
          )
          .map((hospital, idx) => (
          <Marker
            key={`hosp-${hospital.name}-${hospital.coords.lat.toFixed(4)}-${hospital.coords.lng.toFixed(4)}`}
            position={[hospital.coords.lat, hospital.coords.lng]}
            icon={createHospitalIcon(hospital.isDestination, hospital.rank, hospital.name, hospital.distanceKm)}
            zIndexOffset={hospital.isDestination ? 1600 : 1500 - idx * 10}
          >
            <Popup>
              <div className="text-sm min-w-[210px]">
                <div className="flex items-center gap-1.5 text-accent-teal font-semibold text-xs uppercase tracking-wider">
                  <span>🏥 Healthcare Facility</span>
                  {hospital.isDestination && (
                    <span className="bg-accent-teal/20 text-accent-teal px-1.5 py-0.5 rounded text-[10px] font-bold">
                      Active Destination
                    </span>
                  )}
                  {hospital.rank != null && (
                    <span className="bg-alert-amber/20 text-alert-amber px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                      #{hospital.rank} Nearest
                    </span>
                  )}
                </div>
                <div className="font-bold text-primary-text mt-1 text-sm">
                  {hospital.name}
                </div>
                {hospital.distanceKm && (
                  <div className="text-accent-teal text-xs font-semibold mt-1 flex items-center gap-1 bg-accent-teal/10 px-2 py-0.5 rounded border border-accent-teal/30">
                    <span>📍</span> {hospital.distanceKm} straight-line distance
                  </div>
                )}
                {hospital.alternateName && (
                  <div className="text-muted-text text-xs italic mt-0.5">
                    {hospital.alternateName}
                  </div>
                )}
                <div className="text-muted-text text-xs mt-0.5">
                  Location: {hospital.town}, Kerala
                </div>
                {hospital.address && (
                  <div className="text-muted-text/80 text-[11px] mt-0.5">
                    {hospital.address}
                  </div>
                )}
                <div className="text-muted-text/70 text-[10px] font-mono mt-1">
                  {hospital.coords.lat.toFixed(4)}°N, {hospital.coords.lng.toFixed(4)}°E
                  {hospital.verifiedOSM && ' • OSM Verified'}
                </div>

                {/* Quick Actions */}
                {(hospital.onSelectDestination || hospital.onGetDirections) && (
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-petrol/60">
                    {hospital.onGetDirections && (
                      <button
                        type="button"
                        onClick={() => hospital.onGetDirections?.(hospital.coords)}
                        className="px-2.5 py-1 bg-petrol text-accent-teal rounded text-xs font-semibold hover:bg-petrol/80 transition-colors"
                      >
                        Directions
                      </button>
                    )}
                    {hospital.onSelectDestination && !hospital.isDestination && (
                      <button
                        type="button"
                        onClick={() => hospital.onSelectDestination?.(hospital.coords)}
                        className="px-2.5 py-1 bg-accent-teal text-midnight rounded text-xs font-semibold hover:bg-accent-teal/90 transition-colors"
                      >
                        Set Destination
                      </button>
                    )}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Demo Journey Simulated Vehicle Marker */}
        {demoVehicleCoord && (
          <Marker
            position={[demoVehicleCoord.lat, demoVehicleCoord.lng]}
            icon={demoVehicleIcon}
            zIndexOffset={1000}
          >
            <Popup>
              <div className="text-sm min-w-[160px]">
                <div className="flex items-center gap-1.5 text-accent-teal font-bold text-xs">
                  <span>🚗 DEMO SIMULATION VEHICLE</span>
                </div>
                <div className="text-primary-text text-xs font-medium mt-1">
                  Safe Journey Presentation Mode
                </div>
                <div className="text-[11px] text-muted-text mt-0.5">
                  Local client animation along verified OpenStreetMap road geometry.
                </div>
                <div className="text-[10px] text-muted-text/70 font-mono mt-1">
                  {demoVehicleCoord.lat.toFixed(5)}°N, {demoVehicleCoord.lng.toFixed(5)}°E
                </div>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Vehicle Markers */}
        {vehicles
          .filter(
            (v) =>
              v.location &&
              typeof v.location.lat === 'number' &&
              typeof v.location.lng === 'number' &&
              !isNaN(v.location.lat) &&
              !isNaN(v.location.lng),
          )
          .map((v) => {
            const isEmergencyVehicle =
              emergency?.vehicleId === v.id || v.role === 'emergency';
            const isAlerted = alertedSet.has(v.id);

            const icon = isEmergencyVehicle
              ? emergencyIcon
              : isAlerted
              ? driverNearIcon
              : driverFarIcon;

            return (
              <Marker
                key={v.id}
                position={[v.location!.lat, v.location!.lng]}
                icon={icon}
              >
                <Popup>
                  <div className="text-sm min-w-[150px]">
                    <div className="font-bold text-primary-text flex items-center justify-between">
                      <span>{v.label || v.id.slice(0, 8)}</span>
                      {isEmergencyVehicle && (
                        <span className="text-alert-amber text-xs font-semibold">
                          AMBULANCE
                        </span>
                      )}
                    </div>
                    <div className="text-muted-text text-xs mt-1">
                      Role: <span className="text-primary-text font-medium">{v.role}</span>
                      {v.isSimulated && ' (Simulated)'}
                    </div>
                    <div className="text-muted-text/70 text-[11px] font-mono mt-0.5">
                      {v.location!.lat.toFixed(4)}, {v.location!.lng.toFixed(4)}
                    </div>
                    {isAlerted && (
                      <div className="text-accent-teal text-xs mt-1.5 font-semibold flex items-center gap-1 bg-accent-teal/10 px-2 py-0.5 rounded border border-accent-teal/30">
                        <span>●</span> Within 1 km Alert Range
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* User-Selected Starting Location Marker */}
        {startLocationCoord &&
          typeof startLocationCoord.lat === 'number' &&
          typeof startLocationCoord.lng === 'number' &&
          !isNaN(startLocationCoord.lat) &&
          !isNaN(startLocationCoord.lng) && (
          <Marker
            position={[startLocationCoord.lat, startLocationCoord.lng]}
            icon={startLocationIcon}
            zIndexOffset={900}
          >
            <Popup>
              <div className="text-sm min-w-[170px]">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Selected Starting Point</span>
                </div>
                <div className="font-semibold text-primary-text text-sm mt-1">
                  {startLocationLabel || 'Custom Starting Location'}
                </div>
                <div className="text-[11px] text-muted-text/80 font-mono mt-0.5">
                  {startLocationCoord.lat.toFixed(5)}°N, {startLocationCoord.lng.toFixed(5)}°E
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-1.5 border-t border-petrol/60 pt-1">
                  Anchor for emergency dispatch & nearest hospital routing.
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

{/* Map Picking Crosshair Hint Banner */}
      {isPickingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="bg-emerald-600/95 backdrop-blur-md text-white font-bold text-xs px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-300/40 animate-pulse">
            <MapPin className="w-4 h-4 text-emerald-200" />
            <span>Click anywhere on the map to set starting point</span>
          </div>
        </div>
      )}

      {/* Floating Route Information & Quality Overlay */}
      {routeResult && showRouteControls && activeRoute && (
        <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-md z-[1000] pointer-events-auto">
          <div className="bg-deep-surface/95 backdrop-blur-md border border-petrol/80 rounded-xl p-3 shadow-2xl text-xs space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-petrol/60 pb-2">
              <div className="flex items-center gap-1.5 font-semibold text-primary-text">
                <Navigation2 className="w-3.5 h-3.5 text-accent-teal" />
                <span className="truncate">
                  {routeResult.originLabel || 'Thodupuzha'} → {routeResult.destinationLabel || 'Destination'}
                </span>
              </div>
              <span className="px-1.5 py-0.5 bg-accent-teal/15 text-accent-teal rounded text-[10px] font-mono font-bold whitespace-nowrap">
                OSRM ROAD
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-primary-text">
              <div className="flex items-center gap-1.5 bg-petrol/40 px-2 py-1.5 rounded-lg">
                <Compass className="w-3.5 h-3.5 text-accent-teal flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-text">Road Distance</div>
                  <div className="font-bold text-sm text-accent-teal">{activeRoute.distanceKm}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-petrol/40 px-2 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-alert-amber flex-shrink-0" />
                <div>
                  <div className="text-[10px] text-muted-text">Est. Travel Time</div>
                  <div className="font-bold text-sm text-alert-amber">~{activeRoute.durationMinutes}</div>
                </div>
              </div>
            </div>

            {/* Alternatives Selector if present */}
            {routeResult.routes.length > 1 && (
              <div className="flex items-center gap-1.5 pt-1">
                <Layers className="w-3 h-3 text-muted-text" />
                <span className="text-[11px] text-muted-text">Options:</span>
                {routeResult.routes.map((r, idx) => (
                  <button
                    key={r.id}
                    onClick={() => handleRouteClick(idx)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                      idx === selectedRouteIdx
                        ? 'bg-accent-teal text-midnight font-bold shadow'
                        : 'bg-petrol text-muted-text hover:text-primary-text'
                    }`}
                  >
                    Route {idx + 1} ({r.distanceKm})
                  </button>
                ))}
              </div>
            )}

            {/* Honest Disclaimer */}
            <div className="flex items-start gap-1 text-[10px] text-muted-text/80 pt-0.5 border-t border-petrol/40">
              <Info className="w-3 h-3 text-muted-text flex-shrink-0 mt-0.5" />
              <span>{routeResult.disclaimer}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Starting Location Selector Component ───
import React, { useState } from 'react';
import {
  MapPin,
  Crosshair,
  Search,
  Navigation,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  X,
  Compass,
} from 'lucide-react';
import type { Coordinates } from '@/types';
import { searchLocationOSM, GeocodingResult } from '@/lib/geocoding';

export interface StartingLocation {
  coords: Coordinates;
  label: string;
  source: 'gps' | 'map' | 'search' | 'preset';
  accuracy?: number;
}

export type GpsStatus = 'idle' | 'acquiring' | 'granted' | 'denied' | 'unavailable' | 'timeout';

interface StartingLocationSelectorProps {
  currentLocation: StartingLocation;
  isPickingOnMap: boolean;
  onTogglePickingOnMap: () => void;
  onSelectLocation: (location: StartingLocation) => void;
  onResetToPreset: () => void;
  isSearchingHospitals?: boolean;
  gpsStatus?: GpsStatus;
  gpsErrorMessage?: string | null;
  onRefreshGPS?: () => void;
}

export function StartingLocationSelector({
  currentLocation,
  isPickingOnMap,
  onTogglePickingOnMap,
  onSelectLocation,
  onResetToPreset,
  isSearchingHospitals = false,
  gpsStatus = 'idle',
  gpsErrorMessage = null,
  onRefreshGPS,
}: StartingLocationSelectorProps) {
  const [activeMode, setActiveMode] = useState<'options' | 'search'>('options');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearchingOSM, setIsSearchingOSM] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [localGpsError, setLocalGpsError] = useState<string | null>(null);

  const effectiveGpsError = gpsErrorMessage || localGpsError;
  const isAcquiringGPS = isLocatingGPS || gpsStatus === 'acquiring';

  // 1. USE / REFRESH CURRENT GPS
  const handleUseGPS = () => {
    setLocalGpsError(null);
    setSearchError(null);

    if (onRefreshGPS) {
      onRefreshGPS();
      return;
    }

    if (!navigator.geolocation) {
      setLocalGpsError('Geolocation is not supported by your browser. Please select a point on the map.');
      return;
    }

    setIsLocatingGPS(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocatingGPS(false);
        const { latitude, longitude, accuracy } = position.coords;
        onSelectLocation({
          coords: { lat: latitude, lng: longitude },
          label: `Current GPS Location (±${Math.round(accuracy)}m)`,
          source: 'gps',
          accuracy,
        });
      },
      (error) => {
        setIsLocatingGPS(false);
        let msg = 'Unable to determine GPS location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Geolocation permission denied. Please enable location permissions or click "Pick on Map".';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'GPS location is currently unavailable. Please pick a starting location on the map.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'GPS request timed out. Please retry or click "Pick on Map".';
        }
        // Safety Rule: Never silently substitute fake/demo coordinates for failed GPS
        setLocalGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      },
    );
  };

  // 3. SEARCH LOCATION VIA NOMINATIM / COORDINATES
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearchingOSM(true);
    setSearchError(null);
    setSearchResults([]);

    try {
      const results = await searchLocationOSM(query);
      if (results.length === 0) {
        setSearchError('No matching location found. Try searching for a nearby town (e.g. Muvattupuzha) or pick on the map.');
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Location search error. Please pick on the map instead.');
    } finally {
      setIsSearchingOSM(false);
    }
  };

  const handleSelectSearchResult = (result: GeocodingResult) => {
    onSelectLocation({
      coords: result.coords,
      label: result.displayName.split(',')[0] || result.displayName,
      source: 'search',
    });
    setSearchResults([]);
    setSearchQuery('');
    setActiveMode('options');
  };

  const getSourceBadge = () => {
    switch (currentLocation.source) {
      case 'gps':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <Crosshair className="w-3 h-3" />
            LIVE DEVICE GPS
          </span>
        );
      case 'map':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-teal/15 text-accent-teal border border-accent-teal/30 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            MAP SELECTION
          </span>
        );
      case 'search':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30 flex items-center gap-1">
            <Search className="w-3 h-3" />
            SEARCH RESULT
          </span>
        );
      case 'preset':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Compass className="w-3 h-3" />
            PRESET HUB
          </span>
        );
    }
  };

  return (
    <div className="bg-deep-surface border border-petrol/80 rounded-2xl p-4 shadow-xl space-y-3">
      {/* Title & Active Location Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-petrol/60 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent-teal uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Starting Location
            </span>
            {getSourceBadge()}
          </div>
          <div className="text-sm font-semibold text-primary-text truncate max-w-sm">
            {currentLocation.label}
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-muted-text bg-midnight/70 px-2.5 py-1 rounded-lg border border-petrol/40">
          <span>
            {currentLocation?.coords?.lat != null && currentLocation?.coords?.lng != null
              ? `${currentLocation.coords.lat.toFixed(5)}°N, ${currentLocation.coords.lng.toFixed(5)}°E`
              : '--'}
          </span>
        </div>
      </div>

      {/* Primary Action Buttons: 3 Options */}
      {activeMode === 'options' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Option 1: Use Current GPS */}
          <button
            type="button"
            onClick={handleUseGPS}
            disabled={isAcquiringGPS}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              currentLocation.source === 'gps'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/20'
                : 'bg-petrol/40 border-petrol/80 text-primary-text hover:bg-petrol/70 hover:border-emerald-500/60'
            }`}
          >
            {isAcquiringGPS ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                <span>Acquiring GPS...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. {currentLocation.source === 'gps' ? 'Refresh Live GPS' : 'Use Current GPS'}</span>
              </>
            )}
          </button>

          {/* Option 2: Select on Map */}
          <button
            type="button"
            onClick={onTogglePickingOnMap}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              isPickingOnMap
                ? 'bg-accent-teal text-midnight border-accent-teal shadow-md shadow-accent-teal/20 animate-pulse'
                : currentLocation.source === 'map'
                ? 'bg-petrol border-accent-teal text-accent-teal'
                : 'bg-petrol/40 border-petrol/80 text-primary-text hover:bg-petrol/70 hover:border-accent-teal/60'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-accent-teal" />
            <span>{isPickingOnMap ? 'Clicking on Map...' : '2. Pick on Map'}</span>
          </button>

          {/* Option 3: Search Location */}
          <button
            type="button"
            onClick={() => setActiveMode('search')}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
              currentLocation.source === 'search'
                ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/20'
                : 'bg-petrol/40 border-petrol/80 text-primary-text hover:bg-petrol/70 hover:border-sky-500/60'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-sky-400" />
            <span>3. Search Location</span>
          </button>
        </div>
      ) : (
        /* Search Mode Input & Suggestions */
        <div className="space-y-2 bg-midnight/60 border border-petrol/70 rounded-xl p-3 animate-fade-in">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Kerala town (e.g. Muvattupuzha) or coordinates (lat, lng)..."
                className="w-full bg-deep-surface border border-petrol rounded-xl pl-9 pr-3 py-2 text-xs text-primary-text placeholder:text-muted-text/60 focus:outline-none focus:border-accent-teal"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearchingOSM || !searchQuery.trim()}
              className="px-3 py-2 bg-accent-teal text-midnight rounded-xl text-xs font-bold hover:bg-accent-teal/90 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              {isSearchingOSM ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('options');
                setSearchError(null);
                setSearchResults([]);
              }}
              className="p-2 text-muted-text hover:text-primary-text rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </form>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto border-t border-petrol/50 pt-2">
              <div className="text-[11px] text-muted-text font-semibold uppercase">Matching Locations:</div>
              {searchResults.map((item, idx) => (
                <button
                  key={`res-${idx}`}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-2 rounded-lg bg-petrol/30 hover:bg-petrol/80 border border-petrol/40 text-xs text-primary-text transition-colors flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-accent-teal flex-shrink-0 mt-0.5" />
                  <div className="truncate">
                    <div className="font-semibold text-primary-text truncate">{item.displayName}</div>
                    <div className="text-[10px] text-muted-text font-mono">
                      {item?.coords?.lat != null && item?.coords?.lng != null
                        ? `${item.coords.lat.toFixed(4)}°N, ${item.coords.lng.toFixed(4)}°E`
                        : ''}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* GPS Status & Error Banners */}
      {effectiveGpsError && (
        <div className="bg-alert-amber/15 border border-alert-amber/30 text-alert-amber rounded-xl p-3 text-xs flex items-start gap-2.5 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-alert-amber" />
          <div className="flex-1 space-y-1.5">
            <div className="font-semibold text-alert-amber">
              GPS Location Unavailable
            </div>
            <div className="text-muted-text text-[11px] leading-relaxed">
              {effectiveGpsError}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleUseGPS}
                disabled={isAcquiringGPS}
                className="px-2.5 py-1 bg-petrol border border-emerald-500/40 text-emerald-300 rounded-lg font-semibold hover:bg-petrol/80 text-[11px] flex items-center gap-1 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isAcquiringGPS ? 'animate-spin' : ''}`} />
                Retry GPS Detection
              </button>
              <button
                type="button"
                onClick={onTogglePickingOnMap}
                className="px-2.5 py-1 bg-petrol border border-accent-teal/40 text-accent-teal rounded-lg font-semibold hover:bg-petrol/80 text-[11px] flex items-center gap-1 transition-all"
              >
                <MapPin className="w-3 h-3" />
                Pick Location on Map
              </button>
            </div>
          </div>
        </div>
      )}

      {searchError && (
        <div className="bg-alert-amber/15 border border-alert-amber/30 text-alert-amber rounded-xl p-2.5 text-xs flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{searchError}</div>
        </div>
      )}

      {/* Footer Status & Reset Shortcut */}
      <div className="flex items-center justify-between text-[11px] text-muted-text pt-1 border-t border-petrol/40">
        <div className="flex items-center gap-1.5">
          {isSearchingHospitals ? (
            <span className="text-accent-teal flex items-center gap-1 animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Comparing road routes to nearest hospital...
            </span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Nearest hospital automatically matched
            </span>
          )}
        </div>

        {currentLocation.source !== 'preset' && (
          <button
            type="button"
            onClick={onResetToPreset}
            className="text-muted-text hover:text-accent-teal underline transition-colors"
          >
            Reset to Thodupuzha Hub
          </button>
        )}
      </div>
    </div>
  );
}

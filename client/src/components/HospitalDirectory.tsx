// ─── Searchable Hospital Directory Component ───
import React, { useState, useMemo } from 'react';
import {
  Search,
  Building2,
  Navigation,
  Compass,
  CheckCircle2,
  Phone,
  Play,
  MapPin,
  ExternalLink,
  Info,
  X,
  Sparkles,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { KERALA_HOSPITALS, HospitalDestination, searchHospitals } from '@/lib/hospitals';
import { haversineDistance, formatDistance } from '@/lib/utils';
import type { Coordinates } from '@/types';

interface HospitalDirectoryProps {
  currentOrigin: Coordinates;
  selectedHospitalId: string | null;
  onSelectHospital: (hospital: HospitalDestination) => void;
  onGetDirections: (hospital: HospitalDestination) => void;
  onStartDemoJourney: (hospital: HospitalDestination) => void;
  isLoadingRoute?: boolean;
}

export function HospitalDirectory({
  currentOrigin,
  selectedHospitalId,
  onSelectHospital,
  onGetDirections,
  onStartDemoJourney,
  isLoadingRoute = false,
}: HospitalDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [townFilter, setTownFilter] = useState<string>('ALL');

  const filteredHospitals = useMemo(() => {
    let list = searchHospitals(searchQuery);
    if (townFilter !== 'ALL') {
      list = list.filter((h) => h.town.toLowerCase().includes(townFilter.toLowerCase()));
    }
    return list;
  }, [searchQuery, townFilter]);

  // Presets for hackathon demonstration
  const ernakulamGeneral = KERALA_HOSPITALS.find((h) => h.id === 'general-hospital-ernakulam');
  const rajagiriAluva = KERALA_HOSPITALS.find((h) => h.id === 'rajagiri-hospital-aluva');

  return (
    <div className="space-y-4">
      {/* Header and Search */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-accent-teal" />
            <h3 className="font-bold text-primary-text text-sm sm:text-base">
              Hospital Directory
            </h3>
          </div>
          <span className="text-[11px] text-muted-text font-mono">
            {filteredHospitals.length} Facilities
          </span>
        </div>

        {/* Quick Demo Presets */}
        <div className="bg-deep-surface border border-petrol/60 rounded-xl p-2.5 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-accent-teal font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Hackathon Presets (Thodupuzha → Ernakulam Area):</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ernakulamGeneral && (
              <button
                type="button"
                onClick={() => onStartDemoJourney(ernakulamGeneral)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-petrol/40 hover:bg-petrol text-left text-xs border border-petrol/70 text-primary-text transition-all group"
              >
                <div>
                  <div className="font-semibold text-accent-teal group-hover:underline">
                    General Hospital, Kochi
                  </div>
                  <div className="text-[10px] text-muted-text">~58 km via SH 8 / SH 41</div>
                </div>
                <Play className="w-3.5 h-3.5 text-accent-teal flex-shrink-0" />
              </button>
            )}
            {rajagiriAluva && (
              <button
                type="button"
                onClick={() => onStartDemoJourney(rajagiriAluva)}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-petrol/40 hover:bg-petrol text-left text-xs border border-petrol/70 text-primary-text transition-all group"
              >
                <div>
                  <div className="font-semibold text-accent-teal group-hover:underline">
                    Rajagiri Hospital, Aluva
                  </div>
                  <div className="text-[10px] text-muted-text">~54 km via Muvattupuzha</div>
                </div>
                <Play className="w-3.5 h-3.5 text-accent-teal flex-shrink-0" />
              </button>
            )}
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hospital by name, town, or specialty..."
            className="w-full bg-midnight/80 border border-petrol/60 rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm text-primary-text focus:outline-none focus:border-accent-teal transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-text hover:text-primary-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Region Filter Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {['ALL', 'Thodupuzha', 'Muvattupuzha', 'Perumbavoor', 'Aluva', 'Ernakulam'].map((town) => (
            <button
              key={town}
              type="button"
              onClick={() => setTownFilter(town)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                townFilter === town
                  ? 'bg-accent-teal text-midnight font-bold'
                  : 'bg-petrol/40 text-muted-text hover:bg-petrol/70 hover:text-primary-text'
              }`}
            >
              {town === 'ALL' ? 'All Areas (13)' : town}
            </button>
          ))}
        </div>
      </div>

      {/* Hospital List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {filteredHospitals.length === 0 ? (
          <div className="text-center py-8 text-muted-text text-xs">
            No healthcare facilities matching "{searchQuery}"
          </div>
        ) : (
          filteredHospitals.map((hospital) => {
            const isSelected = selectedHospitalId === hospital.id;
            const crowDistance = haversineDistance(currentOrigin, hospital.coords);

            return (
              <div
                key={hospital.id}
                className={`p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-petrol/60 border-accent-teal shadow-md shadow-accent-teal/10'
                    : 'bg-deep-surface/50 border-petrol/50 hover:border-petrol hover:bg-deep-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-xs sm:text-sm text-primary-text">
                        {hospital.name}
                      </span>
                      {hospital.verifiedOSM && (
                        <span
                          title={hospital.osmNotes}
                          className="inline-flex items-center gap-0.5 text-[9px] bg-accent-teal/15 text-accent-teal px-1.5 py-0.5 rounded font-mono font-semibold"
                        >
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          OSM Verified
                        </span>
                      )}
                    </div>

                    {hospital.alternateName && (
                      <p className="text-[11px] text-muted-text italic">
                        {hospital.alternateName}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-muted-text flex-wrap">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-accent-teal flex-shrink-0" />
                        {hospital.town}, {hospital.district}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-accent-teal/90">
                        ~{formatDistance(crowDistance)} direct
                      </span>
                      {hospital.phone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-muted-text" />
                            {hospital.phone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-petrol/40">
                  <button
                    type="button"
                    onClick={() => onSelectHospital(hospital)}
                    className="px-2.5 py-1 text-xs text-muted-text hover:text-primary-text transition-colors"
                  >
                    View on Map
                  </button>

                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLoadingRoute}
                    onClick={() => onGetDirections(hospital)}
                    className="text-xs py-1 px-3"
                  >
                    <Navigation className="w-3 h-3 text-accent-teal" />
                    Directions
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isLoadingRoute}
                    onClick={() => onStartDemoJourney(hospital)}
                    className="text-xs py-1 px-3 bg-accent-teal text-midnight"
                  >
                    <Play className="w-3 h-3" />
                    Demo Journey
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Verification Disclaimer */}
      <div className="bg-petrol/20 border border-petrol/40 rounded-xl p-2.5 text-[10px] text-muted-text flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-accent-teal flex-shrink-0 mt-0.5" />
        <p>
          Coordinates geocoded and verified via OpenStreetMap. "Directions" queries actual OSRM road geometry. "Demo Journey" runs entirely local simulation for hackathon presentation and does NOT broadcast simulated coordinates or trigger real alerts.
        </p>
      </div>
    </div>
  );
}

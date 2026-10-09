// ─── Google Maps-Style Dedicated Navigation Mode ───
import React, { useState } from 'react';
import {
  ArrowUp,
  CornerUpRight,
  CornerUpLeft,
  ArrowUpRight,
  ArrowUpLeft,
  RotateCcw,
  Navigation,
  Compass,
  Volume2,
  VolumeX,
  X,
  Play,
  Pause,
  RotateCw,
  Building2,
  ShieldAlert,
  AlertTriangle,
  LocateFixed,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@/components/ui';
import type { Coordinates } from '@/types';
import type { RouteOption, RouteStep } from '@/lib/routing';
import type { HospitalDestination } from '@/lib/hospitals';

interface NavigationModeProps {
  destinationName: string;
  destinationTown?: string;
  isDemoMode: boolean;
  isPaused: boolean;
  distanceRemainingKm: string;
  etaMinutesRemaining: number;
  formattedArrivalTime: string;
  currentManeuver: string | null;
  distanceToNextManeuver: string;
  nextStepPreview: string | null;
  simulatedSpeedKmH?: number;
  voiceEnabled: boolean;
  speedMultiplier: number;
  onToggleVoice: () => void;
  onPauseResume: () => void;
  onSetSpeedMultiplier: (speed: number) => void;
  onEndNavigation: () => void;
  onRecenterCamera: () => void;
  onChangeDestination: () => void;
}

/**
 * Returns an appropriate directional icon based on maneuver text/type
 */
function getManeuverIcon(maneuver: string | null) {
  if (!maneuver) return <ArrowUp className="w-8 h-8 text-white" />;
  const m = maneuver.toLowerCase();

  if (m.includes('slight right') || m.includes('fork right')) {
    return <ArrowUpRight className="w-8 h-8 text-white" />;
  }
  if (m.includes('slight left') || m.includes('fork left')) {
    return <ArrowUpLeft className="w-8 h-8 text-white" />;
  }
  if (m.includes('right')) {
    return <CornerUpRight className="w-8 h-8 text-white" />;
  }
  if (m.includes('left')) {
    return <CornerUpLeft className="w-8 h-8 text-white" />;
  }
  if (m.includes('u-turn') || m.includes('uturn')) {
    return <RotateCcw className="w-8 h-8 text-white" />;
  }
  if (m.includes('roundabout')) {
    return <RotateCw className="w-8 h-8 text-white" />;
  }
  return <ArrowUp className="w-8 h-8 text-white" />;
}

export function NavigationMode({
  destinationName,
  destinationTown,
  isDemoMode,
  isPaused,
  distanceRemainingKm,
  etaMinutesRemaining,
  formattedArrivalTime,
  currentManeuver,
  distanceToNextManeuver,
  nextStepPreview,
  simulatedSpeedKmH = 45,
  voiceEnabled,
  speedMultiplier,
  onToggleVoice,
  onPauseResume,
  onSetSpeedMultiplier,
  onEndNavigation,
  onRecenterCamera,
  onChangeDestination,
}: NavigationModeProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 flex flex-col justify-between p-3 sm:p-5">
      {/* ── TOP SECTION: Google Maps Turn-by-Turn Guidance Banner ── */}
      <div className="w-full max-w-lg pointer-events-auto space-y-2">
        {/* Main Turn Instruction Card (Emerald / Dark Slate high contrast) */}
        <div className="bg-[#0B3B36] border-2 border-[#1E6B62] text-white rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-slide-down">
          <div className="flex items-start gap-4">
            {/* Big Maneuver Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#12534C] border border-[#278277] flex items-center justify-center flex-shrink-0 shadow-inner">
              {getManeuverIcon(currentManeuver)}
            </div>

            {/* Turn Details */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#6FF4DE]">
                  {distanceToNextManeuver || 'Proceed'}
                </span>
                <span className="text-xs uppercase tracking-wider text-emerald-200/70 font-semibold font-mono">
                  {isDemoMode ? 'DEMO NAV' : 'LIVE GPS'}
                </span>
              </div>
              <div className="text-sm sm:text-base font-bold leading-snug line-clamp-2 text-white">
                {currentManeuver || `Continue toward ${destinationName}`}
              </div>
            </div>
          </div>

          {/* Sub-banner: Next Maneuver Preview */}
          {nextStepPreview && (
            <div className="mt-3 pt-2.5 border-t border-[#195950] flex items-center gap-2 text-xs text-emerald-200/90 font-medium">
              <span className="text-emerald-300 font-bold">Then:</span>
              <span className="truncate">{nextStepPreview}</span>
            </div>
          )}
        </div>

        {/* Floating Quick Action Row */}
        <div className="flex items-center gap-2">
          {/* Voice Narration Toggle */}
          <button
            type="button"
            onClick={onToggleVoice}
            title={voiceEnabled ? 'Mute turn voice navigation' : 'Unmute voice navigation'}
            className={`p-2.5 rounded-xl border shadow-lg backdrop-blur-md transition-all ${
              voiceEnabled
                ? 'bg-midnight/90 border-[#1E6B62] text-[#6FF4DE]'
                : 'bg-midnight/90 border-petrol/60 text-muted-text hover:text-primary-text'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Re-center Camera */}
          <button
            type="button"
            onClick={onRecenterCamera}
            title="Re-center vehicle view"
            className="p-2.5 rounded-xl bg-midnight/90 border border-petrol/60 text-primary-text hover:text-accent-teal shadow-lg backdrop-blur-md transition-all"
          >
            <LocateFixed className="w-4 h-4" />
          </button>

          {/* Change Destination / Reroute */}
          <button
            type="button"
            onClick={onChangeDestination}
            className="px-3 py-2 rounded-xl bg-midnight/90 border border-petrol/60 text-xs font-semibold text-primary-text hover:text-accent-teal shadow-lg backdrop-blur-md transition-all flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5 text-accent-teal" />
            <span className="hidden sm:inline">Change</span> Destination
          </button>

          {/* Demo Speed Multipliers */}
          {isDemoMode && (
            <div className="flex items-center bg-midnight/90 border border-petrol/60 rounded-xl p-0.5 shadow-lg backdrop-blur-md text-xs">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => onSetSpeedMultiplier(spd)}
                  className={`px-2 py-1 rounded-lg font-mono font-bold transition-all ${
                    speedMultiplier === spd
                      ? 'bg-accent-teal text-midnight'
                      : 'text-muted-text hover:text-primary-text'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM SECTION: Google Maps Navigation Dock ── */}
      <div className="w-full max-w-xl self-center pointer-events-auto animate-slide-up">
        <div className="bg-deep-surface/95 border-2 border-petrol/80 rounded-3xl p-4 sm:p-5 shadow-2xl backdrop-blur-xl">
          {/* Top Info Bar inside dock */}
          <div className="flex items-center justify-between gap-3 mb-3 pb-3 border-b border-petrol/40">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-teal flex-shrink-0 animate-ping" />
              <div className="truncate">
                <span className="text-xs text-muted-text">Destination: </span>
                <span className="text-xs sm:text-sm font-bold text-primary-text truncate">
                  {destinationName}
                </span>
                {destinationTown && (
                  <span className="text-[11px] text-muted-text ml-1 hidden sm:inline">
                    ({destinationTown})
                  </span>
                )}
              </div>
            </div>

            {/* Simulation / Live Badge */}
            {isDemoMode ? (
              <Badge variant="teal">DEMO SIMULATION</Badge>
            ) : (
              <Badge variant="amber">LIVE TELEMETRY</Badge>
            )}
          </div>

          {/* Main Navigation Telemetry Row */}
          <div className="flex items-center justify-between gap-4">
            {/* Travel Time & ETA */}
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  {etaMinutesRemaining}
                </span>
                <span className="text-sm font-bold text-emerald-400 uppercase">
                  min
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-text font-medium">
                <span className="font-semibold text-primary-text">
                  {distanceRemainingKm}
                </span>
                <span>•</span>
                <span>ETA: {formattedArrivalTime}</span>
                {simulatedSpeedKmH > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-accent-teal">
                      {simulatedSpeedKmH} km/h
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons: Pause/Resume and End Navigation */}
            <div className="flex items-center gap-2.5">
              {isDemoMode && (
                <button
                  type="button"
                  onClick={onPauseResume}
                  className="p-3 rounded-2xl bg-petrol/60 hover:bg-petrol text-primary-text border border-petrol transition-all shadow-md"
                  title={isPaused ? 'Resume journey' : 'Pause journey'}
                >
                  {isPaused ? <Play className="w-5 h-5 text-accent-teal" /> : <Pause className="w-5 h-5 text-muted-text" />}
                </button>
              )}

              {/* End Navigation (Red Exit Button) */}
              <button
                type="button"
                onClick={onEndNavigation}
                className="flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl bg-red-600/90 hover:bg-red-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
                <span>Exit</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

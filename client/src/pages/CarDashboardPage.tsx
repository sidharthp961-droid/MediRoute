import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Compass,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  Radio,
  Wifi,
  WifiOff,
  Navigation,
  ArrowUp,
  Building2,
  Activity,
  Car,
  ChevronRight,
  Info,
  Check,
  RefreshCw,
  Gauge,
  Play,
  Layers,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { useCarDashboard } from '@/hooks/useCarDashboard';
import { KERALA_CORRIDORS } from '@/lib/routing';
import { formatDistance } from '@/lib/utils';

export function CarDashboardPage() {
  const {
    connections,
    activeAlert,
    isAlertAcknowledged,
    acknowledgedTimestamp,
    activeJunctions,
    selectedCorridor,
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
  } = useCarDashboard();

  // Clock state
  const [currentTime, setCurrentTime] = useState<string>('');
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Modals
  const [showSettings, setShowSettings] = useState(false);
  const [showCarInfoModal, setShowCarInfoModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Settings form
  const [editCoreUrl, setEditCoreUrl] = useState(connections.coreUrl);
  const [editOfficerUrl, setEditOfficerUrl] = useState(connections.officerUrl);
  const [editPlate, setEditPlate] = useState(driverPlate);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrls(editCoreUrl, editOfficerUrl);
    updateDriverPlate(editPlate);
    setShowSettings(false);
  };

  // Simulated vehicle cruising speed
  const simulatedSpeed = 48; // km/h

  // Junction clearance stats
  const clearedJunctionsCount = activeJunctions.filter((j) => j.status === 'CLEARED').length;
  const totalJunctionsCount = activeJunctions.length;

  return (
    <div className="min-h-screen bg-[#071B20] text-[#F0FAF8] flex flex-col font-sans select-none antialiased">
      {/* ─── TOP STATUS BAR (Optimized for Quick Glance in Car) ─── */}
      <header className="h-16 bg-[#0B272D]/90 border-b border-[#12363A] px-4 lg:px-6 flex items-center justify-between z-40 backdrop-blur-md">
        {/* Brand & Plate */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#5DE4D0]/15 border border-[#5DE4D0]/30 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-[#5DE4D0]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-base lg:text-lg">
                MEDIROUTE <span className="text-[#5DE4D0] font-light">CAR HUD</span>
              </span>
              <span className="bg-[#12363A] text-[#9AB9B5] text-xs font-mono font-bold px-2 py-0.5 rounded border border-[#12363A]">
                {driverPlate}
              </span>
            </div>
            <p className="text-[10px] text-[#9AB9B5] tracking-wide hidden sm:block">
              In-Vehicle Emergency Mobility Display • Kerala Corridors
            </p>
          </div>
        </div>

        {/* Center: Live Clock & Cruising Speed */}
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="text-center">
            <div className="text-lg lg:text-xl font-mono font-bold text-[#F0FAF8] tracking-tight">
              {currentTime || '--:--'}
            </div>
            <div className="text-[10px] text-[#9AB9B5] uppercase font-semibold">IST</div>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-[#071B20] px-3 py-1.5 rounded-lg border border-[#12363A]">
            <Car className="w-4 h-4 text-[#5DE4D0]" />
            <div className="text-center">
              <span className="text-base font-mono font-bold text-[#5DE4D0]">{simulatedSpeed}</span>
              <span className="text-[10px] text-[#9AB9B5] ml-1">KM/H</span>
            </div>
          </div>
        </div>

        {/* Right: Dual Backend Connection Indicators & Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* MediRoute Core Status */}
          <div
            title={`MediRoute Core Server: ${connections.coreUrl}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              connections.coreConnected
                ? 'bg-[#5DE4D0]/10 border-[#5DE4D0]/30 text-[#5DE4D0]'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connections.coreConnected ? 'bg-[#5DE4D0]' : 'bg-red-400 animate-pulse'
              }`}
            />
            <span className="hidden xl:inline">Core (3001):</span>
            <span>{connections.coreConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* Officer Alert Server Status */}
          <div
            title={`Officer Alert Server: ${connections.officerUrl}`}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              connections.officerConnected
                ? 'bg-[#5DE4D0]/10 border-[#5DE4D0]/30 text-[#5DE4D0]'
                : 'bg-amber-500/10 border-amber-500/30 text-[#F0B85A]'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connections.officerConnected ? 'bg-[#5DE4D0]' : 'bg-[#F0B85A] animate-pulse'
              }`}
            />
            <span className="hidden xl:inline">Officer (3002):</span>
            <span>{connections.officerConnected ? 'ONLINE' : 'CONNECTING'}</span>
          </div>

          {/* Demo Mode Toggle */}
          <button
            onClick={toggleDemoMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              isDemoMode
                ? 'bg-[#F0B85A] text-[#071B20] border-[#F0B85A] shadow-md shadow-[#F0B85A]/20'
                : 'bg-[#12363A]/80 text-[#9AB9B5] hover:text-[#F0FAF8] border-[#12363A]'
            }`}
          >
            {isDemoMode ? 'DEMO ACTIVE' : 'DEMO MODE'}
          </button>

          {/* Audio Mute / Unmute */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute siren warning' : 'Mute siren warning'}
            className={`p-2 rounded-lg border transition-all ${
              isMuted
                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                : 'bg-[#12363A]/80 text-[#5DE4D0] border-[#12363A] hover:bg-[#12363A]'
            }`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={() => {
              setEditCoreUrl(connections.coreUrl);
              setEditOfficerUrl(connections.officerUrl);
              setEditPlate(driverPlate);
              setShowSettings(true);
            }}
            title="Configure Server Connections"
            className="p-2 rounded-lg bg-[#12363A]/80 text-[#9AB9B5] hover:text-[#F0FAF8] border border-[#12363A] transition-all"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Car Display / Android Auto Info */}
          <button
            onClick={() => setShowCarInfoModal(true)}
            title="Car Display & Compatibility Info"
            className="p-2 rounded-lg bg-[#12363A]/80 text-[#9AB9B5] hover:text-[#5DE4D0] border border-[#12363A] transition-all"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Landscape Fullscreen"
            className="hidden sm:flex p-2 rounded-lg bg-[#12363A]/80 text-[#9AB9B5] hover:text-[#F0FAF8] border border-[#12363A] transition-all"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ─── DEMO MODE BANNER (When active) ─── */}
      {isDemoMode && (
        <div className="bg-[#F0B85A]/15 border-b border-[#F0B85A]/40 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F0B85A] animate-ping" />
            <span className="font-bold text-[#F0B85A] uppercase tracking-wider">
              Offline Demo Simulation Active
            </span>
            <span className="text-[#9AB9B5] hidden md:inline">
              — Isolated test simulation for in-car evaluation. No real network emergencies.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => triggerDemoAlert(320)}
              className="px-2.5 py-1 bg-[#F0B85A] text-[#071B20] font-bold rounded hover:bg-[#F0B85A]/90 transition-colors"
            >
              Trigger 320m Alert
            </button>
            <button
              onClick={simulateApproachStep}
              className="px-2.5 py-1 bg-[#12363A] text-[#F0FAF8] font-medium rounded hover:bg-[#12363A]/80 transition-colors"
            >
              Step Distance Down
            </button>
            <button
              onClick={toggleDemoStale}
              className="px-2.5 py-1 bg-[#12363A] text-[#F0B85A] font-medium rounded hover:bg-[#12363A]/80 transition-colors"
            >
              Toggle Stale GPS
            </button>
            <button
              onClick={advanceDemoJunction}
              className="px-2.5 py-1 bg-[#5DE4D0]/20 text-[#5DE4D0] font-medium rounded hover:bg-[#5DE4D0]/30 transition-colors"
            >
              Advance Junction Status
            </button>
            <button
              onClick={clearDemoAlert}
              className="px-2.5 py-1 bg-red-500/20 text-red-300 font-medium rounded hover:bg-red-500/30 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      )}

      {/* ─── MAIN LANDSCAPE CAR DISPLAY GRID ─── */}
      <main className="flex-1 p-3 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 overflow-y-auto">
        {/* ─── LEFT PANE: EMERGENCY ALERT HERO OR STANDBY RADAR (Cols 1-7) ─── */}
        <section className="lg:col-span-7 flex flex-col gap-4">
          {activeAlert ? (
            /* ─── ACTIVE EMERGENCY ALERT CARD (High-Contrast, Safe Glance) ─── */
            <div className="flex-1 bg-[#0B272D] border-2 border-[#F0B85A] rounded-2xl lg:rounded-3xl p-5 lg:p-8 flex flex-col justify-between relative overflow-hidden shadow-2xl shadow-[#F0B85A]/10">
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#F0B85A]/10 rounded-full blur-3xl pointer-events-none" />

              <div>
                {/* Alert Header Row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 bg-[#F0B85A] text-[#071B20] text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {activeAlert.priority} PROXIMITY ALERT
                      </span>
                      <span className="text-xs text-[#9AB9B5] font-mono">
                        #{activeAlert.id}
                      </span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#F0FAF8] mt-2 tracking-tight">
                      EMERGENCY VEHICLE APPROACHING
                    </h1>
                    <p className="text-sm sm:text-base text-[#9AB9B5] font-medium mt-1">
                      {activeAlert.vehicleType} en route on{' '}
                      <span className="text-[#5DE4D0] font-semibold">
                        {activeAlert.corridorName || 'Kerala Transit Corridor'}
                      </span>
                    </p>
                  </div>

                  {/* Audio Status Pill */}
                  <div className="flex items-center gap-1.5 bg-[#071B20] px-3 py-1.5 rounded-xl border border-[#12363A]">
                    {isAlarmSounding ? (
                      <span className="flex items-center gap-1 text-xs text-[#F0B85A] font-semibold animate-pulse">
                        <Volume2 className="w-4 h-4" /> SIREN ACTIVE
                      </span>
                    ) : (
                      <span className="text-xs text-[#9AB9B5]">Audio Muted</span>
                    )}
                  </div>
                </div>

                {/* Stale Telemetry Warning Banner */}
                {activeAlert.isStale && (
                  <div className="mt-4 bg-[#F0B85A]/15 border border-[#F0B85A]/40 text-[#F0B85A] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>Telemetry Delayed (&gt;45s) — Position may be stale. Exercise caution.</span>
                  </div>
                )}

                {/* Massive Distance & Bearing Display (Optimized for Car Screen) */}
                <div className="my-6 grid grid-cols-2 gap-4 bg-[#071B20]/80 p-5 lg:p-6 rounded-2xl border border-[#12363A]">
                  {/* Distance Column */}
                  <div>
                    <span className="text-xs text-[#9AB9B5] uppercase font-bold tracking-wider">
                      Proximity Distance
                    </span>
                    <div className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono text-[#F0B85A] mt-1 tracking-tight">
                      {formatDistance(activeAlert.distanceMetres)}
                    </div>
                    <span className="text-xs text-[#9AB9B5] mt-1 block">
                      Server-Authoritative Geofence
                    </span>
                  </div>

                  {/* Relative Direction / Bearing Column */}
                  <div className="border-l border-[#12363A] pl-5 flex flex-col justify-center">
                    <span className="text-xs text-[#9AB9B5] uppercase font-bold tracking-wider">
                      Relative Position
                    </span>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-10 h-10 rounded-full bg-[#12363A] flex items-center justify-center text-[#5DE4D0]">
                        <Compass className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="text-lg lg:text-xl font-bold text-[#F0FAF8]">
                          BEHIND / REAR
                        </div>
                        <div className="text-xs text-[#5DE4D0] font-medium">
                          Clear Lane Ahead Safely
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Target Plate & Destination Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#071B20]/40 p-3 rounded-xl border border-[#12363A]/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[#9AB9B5]">Destination Facility:</span>
                    <span className="text-[#F0FAF8] font-semibold truncate">
                      {activeAlert.destinationHospital || 'General Hospital Muvattupuzha'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span className="text-[#9AB9B5]">Alerted Vehicle Plate:</span>
                    <span className="text-[#5DE4D0] font-mono font-bold">
                      {activeAlert.targetPlate || driverPlate}
                    </span>
                  </div>
                </div>
              </div>

              {/* Large Touch Actions (Driver Ergonomics) */}
              <div className="mt-6 pt-5 border-t border-[#12363A] flex flex-wrap items-center gap-3 lg:gap-4">
                {/* ACKNOWLEDGE BUTTON */}
                <button
                  onClick={acknowledgeAlert}
                  disabled={isAlertAcknowledged}
                  className={`flex-1 min-h-[56px] lg:min-h-[64px] px-6 rounded-2xl font-black text-base lg:text-xl tracking-wider uppercase transition-all flex items-center justify-center gap-3 ${
                    isAlertAcknowledged
                      ? 'bg-[#12363A] text-[#5DE4D0] border-2 border-[#5DE4D0]/50 cursor-default'
                      : 'bg-[#5DE4D0] text-[#071B20] hover:bg-[#5DE4D0]/90 active:scale-[0.98] shadow-lg shadow-[#5DE4D0]/20'
                  }`}
                >
                  {isAlertAcknowledged ? (
                    <>
                      <CheckCircle2 className="w-6 h-6 text-[#5DE4D0]" />
                      <span>ALERT ACKNOWLEDGED</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-6 h-6 stroke-[3]" />
                      <span>ACKNOWLEDGE ALERT</span>
                    </>
                  )}
                </button>

                {/* VIEW DETAILS TOGGLE */}
                <button
                  onClick={() => setShowDetailsModal(true)}
                  className="min-h-[56px] lg:min-h-[64px] px-5 rounded-2xl bg-[#12363A] text-[#F0FAF8] hover:bg-[#12363A]/80 font-bold text-sm lg:text-base border border-[#12363A] transition-all flex items-center gap-2"
                >
                  <Info className="w-5 h-5 text-[#9AB9B5]" />
                  <span>VIEW DETAILS</span>
                </button>
              </div>

              <p className="text-[10px] text-[#9AB9B5] mt-3 text-center">
                * Note: Acknowledging alerts notifies dispatch, but does not alter police road clearance status. Yield right of way only when safe to do so.
              </p>
            </div>
          ) : (
            /* ─── STANDBY RADAR & GEOFENCE MONITOR STATE ─── */
            <div className="flex-1 bg-[#0B272D] border border-[#12363A] rounded-2xl lg:rounded-3xl p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5DE4D0]" />
                    <span className="text-xs text-[#5DE4D0] font-bold tracking-wider uppercase">
                      1 KM Geofence Active
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F0FAF8] mt-1">
                    CORRIDOR CLEAR • STANDBY
                  </h2>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#9AB9B5] block">Emergency Priority Corridor</span>
                  <span className="text-sm font-bold text-[#5DE4D0]">
                    {selectedCorridor?.highway || 'SH 8 Highway'}
                  </span>
                </div>
              </div>

              {/* Radar Graphics in Center */}
              <div className="my-8 flex flex-col items-center justify-center relative">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-[#12363A] animate-ping opacity-25" />
                  <div className="absolute inset-6 rounded-full border border-[#12363A]" />
                  <div className="absolute inset-14 rounded-full border border-[#12363A]/60" />
                  <div className="absolute inset-24 rounded-full border border-[#5DE4D0]/30" />

                  <div className="absolute inset-y-0 w-px bg-[#12363A]/40" />
                  <div className="absolute inset-x-0 h-px bg-[#12363A]/40" />

                  <div className="w-12 h-12 rounded-full bg-[#5DE4D0]/20 border border-[#5DE4D0] flex items-center justify-center z-10">
                    <Car className="w-6 h-6 text-[#5DE4D0]" />
                  </div>
                </div>

                <div className="text-center mt-3">
                  <div className="text-sm font-semibold text-[#F0FAF8]">
                    No Active Emergencies in 1 km Radius
                  </div>
                  <p className="text-xs text-[#9AB9B5] mt-0.5">
                    Continuous monitoring on Thodupuzha mobility network
                  </p>
                </div>
              </div>

              {/* Standby Status Bar */}
              <div className="grid grid-cols-3 gap-3 bg-[#071B20]/60 p-4 rounded-xl border border-[#12363A] text-center">
                <div>
                  <span className="text-[10px] text-[#9AB9B5] uppercase font-bold block">
                    Telemetry Mode
                  </span>
                  <span className="text-xs font-semibold text-[#5DE4D0]">Server Push (Socket)</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#9AB9B5] uppercase font-bold block">
                    Police Link
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      connections.officerConnected ? 'text-[#5DE4D0]' : 'text-[#F0B85A]'
                    }`}
                  >
                    {connections.officerConnected ? 'Bridged (Port 3002)' : 'Connecting'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#9AB9B5] uppercase font-bold block">
                    Demo Simulation
                  </span>
                  <span className="text-xs font-semibold text-[#9AB9B5]">
                    {isDemoMode ? 'Active' : 'Standby'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ─── RIGHT PANE: NAVIGATION & POLICE CLEARANCE (Cols 8-12) ─── */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          {/* Destination Hospital & ETA Card */}
          <div className="bg-[#0B272D] border border-[#12363A] rounded-2xl lg:rounded-3xl p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] text-[#9AB9B5] uppercase font-bold tracking-wider flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#5DE4D0]" /> DESTINATION HEALTHCARE FACILITY
                </span>
                <h3 className="text-lg lg:text-xl font-bold text-[#F0FAF8] mt-1">
                  {selectedCorridor?.destination.name || 'General Hospital Muvattupuzha'}
                </h3>
                <p className="text-xs text-[#5DE4D0] font-medium mt-0.5">
                  via {selectedCorridor?.highway || 'SH 8 Highway'}
                </p>
              </div>

              <div className="bg-[#071B20] px-3 py-1.5 rounded-xl border border-[#12363A] text-right">
                <span className="text-[10px] text-[#9AB9B5] uppercase block font-semibold">ETA</span>
                <span className="text-lg lg:text-xl font-mono font-bold text-[#5DE4D0]">
                  19 MINS
                </span>
              </div>
            </div>

            {/* Next Turn Maneuver Box (Car Navigation Style) */}
            <div className="mt-4 bg-[#071B20] border border-[#12363A] rounded-xl p-3.5 flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#5DE4D0]/15 border border-[#5DE4D0]/30 flex items-center justify-center flex-shrink-0">
                <ArrowUp className="w-7 h-7 text-[#5DE4D0]" />
              </div>
              <div>
                <div className="text-xs text-[#5DE4D0] font-bold">NEXT MANEUVER • IN 400M</div>
                <div className="text-sm font-semibold text-[#F0FAF8] mt-0.5">
                  Proceed straight on SH 8 towards Muvattupuzha
                </div>
              </div>
            </div>
          </div>

          {/* Corridor Police Clearance Status Tracker */}
          <div className="flex-1 bg-[#0B272D] border border-[#12363A] rounded-2xl lg:rounded-3xl p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#12363A]">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#5DE4D0]" />
                  <span className="text-xs lg:text-sm font-bold uppercase tracking-wider text-[#F0FAF8]">
                    Police Junction Clearance
                  </span>
                </div>

                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#12363A] text-[#5DE4D0]">
                  {clearedJunctionsCount} / {totalJunctionsCount} CLEARED
                </span>
              </div>

              {/* Junction List */}
              <div className="mt-3 space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                {activeJunctions.length > 0 ? (
                  activeJunctions.map((j, idx) => {
                    const isCleared = j.status === 'CLEARED';
                    const isClearing = j.status === 'CLEARING';
                    const isAssigned = j.status === 'ASSIGNED';

                    return (
                      <div
                        key={j.id || idx}
                        className={`p-3 rounded-xl border transition-all ${
                          isCleared
                            ? 'bg-[#5DE4D0]/10 border-[#5DE4D0]/30 text-[#F0FAF8]'
                            : isClearing
                            ? 'bg-[#F0B85A]/10 border-[#F0B85A]/40 text-[#F0FAF8]'
                            : isAssigned
                            ? 'bg-[#12363A]/60 border-[#12363A] text-[#9AB9B5]'
                            : 'bg-[#071B20]/40 border-[#12363A]/40 text-[#9AB9B5]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs sm:text-sm font-bold truncate">
                            {idx + 1}. {j.name}
                          </span>

                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                              isCleared
                                ? 'bg-[#5DE4D0] text-[#071B20]'
                                : isClearing
                                ? 'bg-[#F0B85A] text-[#071B20]'
                                : isAssigned
                                ? 'bg-[#12363A] text-[#5DE4D0]'
                                : 'bg-[#12363A] text-[#9AB9B5]'
                            }`}
                          >
                            {j.status}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#9AB9B5] mt-1.5">
                          <span className="truncate">{j.landmark || 'Corridor waypoint'}</span>
                          {j.assignedOfficerName && (
                            <span className="text-[#5DE4D0] font-medium truncate ml-2">
                              {j.assignedOfficerName}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-[#9AB9B5]">
                    Corridor junctions will synchronize when emergency trip activates on Officer Server.
                  </div>
                )}
              </div>
            </div>

            {/* Quick Corridor Selection Bar */}
            <div className="mt-4 pt-3 border-t border-[#12363A]">
              <span className="text-[10px] text-[#9AB9B5] uppercase font-bold block mb-1.5">
                Switch Kerala Corridor:
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {KERALA_CORRIDORS.slice(0, 4).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCorridorId(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap font-medium transition-all ${
                      selectedCorridorId === c.id
                        ? 'bg-[#5DE4D0] text-[#071B20] font-bold'
                        : 'bg-[#12363A] text-[#9AB9B5] hover:text-[#F0FAF8]'
                    }`}
                  >
                    {c.shortName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── SETTINGS MODAL ─── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B272D] border border-[#12363A] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#12363A]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#5DE4D0]" />
                <h3 className="text-lg font-bold">Dashboard & Server Settings</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-[#9AB9B5] hover:text-[#F0FAF8] text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#9AB9B5] block mb-1">
                  MediRoute Core Server URL (Port 3001)
                </label>
                <input
                  type="text"
                  value={editCoreUrl}
                  onChange={(e) => setEditCoreUrl(e.target.value)}
                  className="w-full bg-[#071B20] border border-[#12363A] rounded-xl px-3 py-2 text-sm text-[#F0FAF8] font-mono focus:border-[#5DE4D0] outline-none"
                  placeholder="http://localhost:3001"
                  required
                />
                <span className="text-[11px] text-[#9AB9B5] mt-1 block">
                  Sends driver telemetry & receives 1 km server-authoritative geofence alerts.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#9AB9B5] block mb-1">
                  Officer Alert Server URL (Port 3002)
                </label>
                <input
                  type="text"
                  value={editOfficerUrl}
                  onChange={(e) => setEditOfficerUrl(e.target.value)}
                  className="w-full bg-[#071B20] border border-[#12363A] rounded-xl px-3 py-2 text-sm text-[#F0FAF8] font-mono focus:border-[#5DE4D0] outline-none"
                  placeholder="http://localhost:3002"
                  required
                />
                <span className="text-[11px] text-[#9AB9B5] mt-1 block">
                  Receives active corridor dispatch & police junction clearance updates.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#9AB9B5] block mb-1">
                  Car Vehicle Plate Registration
                </label>
                <input
                  type="text"
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value)}
                  className="w-full bg-[#071B20] border border-[#12363A] rounded-xl px-3 py-2 text-sm text-[#F0FAF8] font-mono uppercase focus:border-[#5DE4D0] outline-none"
                  placeholder="KL 07 CA 1234"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-[#9AB9B5]">Test Car Speaker Tone:</span>
                <button
                  type="button"
                  onClick={testSpeaker}
                  className="px-3 py-1.5 rounded-lg bg-[#12363A] text-[#5DE4D0] text-xs font-semibold hover:bg-[#12363A]/80 transition-colors"
                >
                  Play Test Beep
                </button>
              </div>

              <div className="pt-4 border-t border-[#12363A] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#9AB9B5] hover:text-[#F0FAF8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5DE4D0] text-[#071B20] font-bold text-xs hover:bg-[#5DE4D0]/90 transition-colors"
                >
                  Save & Reconnect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── CAR DISPLAY & ANDROID AUTO INFO MODAL ─── */}
      {showCarInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B272D] border border-[#12363A] rounded-2xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#12363A]">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-[#5DE4D0]" />
                <h3 className="text-lg font-bold">Car Display & Connectivity Guide</h3>
              </div>
              <button
                onClick={() => setShowCarInfoModal(false)}
                className="text-[#9AB9B5] hover:text-[#F0FAF8] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs text-[#9AB9B5] leading-relaxed">
              <div className="bg-[#071B20] p-4 rounded-xl border border-[#12363A]">
                <h4 className="font-bold text-[#F0FAF8] text-sm mb-1">
                  Web-App Only Architecture (No APK Required)
                </h4>
                <p>
                  This MediRoute Car Dashboard is designed as a standalone responsive web application.
                  It requires no APK installation or root permissions and runs on any standard browser.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#F0FAF8]">Why Web Application vs Android Auto APK?</h4>
                <p>
                  Google Android Auto requires native automotive projection protocols (AAOS / Android Auto Projection APK)
                  and strictly restricts custom apps unless approved through the Google Play Automotive distribution track.
                  A web page cannot automatically launch as an Android Auto companion app.
                </p>
                <p>
                  Instead, this dashboard is optimized for in-car tablets, dashboard phone mounts, or Chromium-capable Android car head units running full screen at <code className="text-[#5DE4D0]">http://&lt;IP&gt;:5173/car</code>.
                </p>
              </div>

              <div className="bg-[#071B20] p-3 rounded-xl border border-[#12363A]">
                <h4 className="font-bold text-[#5DE4D0] mb-1">Connecting from another in-car device:</h4>
                <p>
                  1. Connect both devices to the same Wi-Fi / hotspot.<br />
                  2. Use your laptop's Wi-Fi IPv4 address (e.g. <code className="text-[#F0FAF8]">http://192.168.1.X:5173/car</code>).<br />
                  3. In Settings, configure the backend URLs with that same IP address on ports 3001 and 3002.
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#12363A] flex justify-end">
              <button
                onClick={() => setShowCarInfoModal(false)}
                className="px-5 py-2 rounded-xl bg-[#5DE4D0] text-[#071B20] font-bold text-xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── ALERT DETAILS MODAL ─── */}
      {showDetailsModal && activeAlert && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B272D] border border-[#12363A] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#12363A]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#F0B85A]" />
                <h3 className="text-base font-bold text-[#F0FAF8]">Emergency Corridor Details</h3>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-[#9AB9B5] hover:text-[#F0FAF8]"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="bg-[#071B20] p-3 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#9AB9B5]">Alert ID:</span>
                  <span className="font-mono text-[#5DE4D0]">{activeAlert.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AB9B5]">Alert Source:</span>
                  <span className="text-[#F0FAF8] uppercase font-semibold">{activeAlert.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AB9B5]">Priority Level:</span>
                  <span className="text-[#F0B85A] font-bold">{activeAlert.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AB9B5]">Distance:</span>
                  <span className="text-[#F0B85A] font-mono font-bold">
                    {formatDistance(activeAlert.distanceMetres)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AB9B5]">Corridor:</span>
                  <span className="text-[#F0FAF8]">{activeAlert.corridorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AB9B5]">Hospital:</span>
                  <span className="text-[#5DE4D0] font-semibold">{activeAlert.destinationHospital}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#9AB9B5]">Acknowledgement:</span>
                  <span className={isAlertAcknowledged ? 'text-[#5DE4D0]' : 'text-amber-400'}>
                    {isAlertAcknowledged ? 'Acknowledged' : 'Pending Driver Action'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-[#9AB9B5] leading-relaxed">
                Emergency priority alerts are authoritative dispatches. Do not brake abruptly. Shift safely to the left edge of the road to allow unobstructed transit.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#12363A] flex justify-end">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-5 py-2 rounded-xl bg-[#12363A] text-[#F0FAF8] hover:bg-[#12363A]/80 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

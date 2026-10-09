// ─── Driver Dashboard with Private Vehicle Registration ───
import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Wifi,
  WifiOff,
  Navigation,
  Shield,
  Volume2,
  Car,
  Lock,
  Info,
  Check,
  Edit2,
} from 'lucide-react';
import { Button, Badge, StatusDot } from '@/components/ui';
import { formatDistance, getBearing } from '@/lib/utils';
import { isValidRegistration, formatRegistration } from '@/lib/validation';
import type { AlertData, Coordinates } from '@/types';

interface DriverDashboardProps {
  connected: boolean;
  alert: AlertData | null;
  onClearAlert: () => void;
  vehicleLocation?: Coordinates | null;
  registrationNumber?: string | null;
  shareConsent?: boolean;
  onSaveRegistration?: (reg: string | null, consent: boolean) => void;
}

export function DriverDashboard({
  connected,
  alert,
  onClearAlert,
  vehicleLocation,
  registrationNumber = null,
  shareConsent = false,
  onSaveRegistration,
}: DriverDashboardProps) {
  const [inputReg, setInputReg] = useState(registrationNumber || '');
  const [consent, setConsent] = useState(shareConsent);
  const [isEditing, setIsEditing] = useState(!registrationNumber);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (registrationNumber) {
      setInputReg(registrationNumber);
    }
  }, [registrationNumber]);

  useEffect(() => {
    setConsent(shareConsent);
  }, [shareConsent]);

  const bearing =
    alert && vehicleLocation
      ? getBearing(vehicleLocation, alert.emergencyOrigin)
      : null;

  const isFormatValid = isValidRegistration(inputReg);
  const hasInput = inputReg.trim().length > 0;

  const handleSave = () => {
    if (hasInput && !isFormatValid) return;

    const formatted = hasInput ? formatRegistration(inputReg) : null;
    if (onSaveRegistration) {
      onSaveRegistration(formatted, consent);
    }
    setIsEditing(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const activeTargetRegistration =
    alert?.targetVehicleRegistration || registrationNumber;

  return (
    <div className="min-h-screen pt-20 pb-6 px-4 sm:px-6 flex flex-col">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col gap-6">
        {/* Header */}
        <div className="text-center pt-6 animate-fade-in">
          <h1 className="text-2xl font-bold">Driver Dashboard</h1>
          <p className="text-muted-text text-sm mt-1">
            Receive emergency alerts from nearby vehicles
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            {connected ? (
              <>
                <StatusDot status="online" />
                <Wifi className="w-4 h-4 text-accent-teal" />
                <span className="text-sm text-accent-teal">
                  Connected to MediRoute Network
                </span>
              </>
            ) : (
              <>
                <StatusDot status="offline" />
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">
                  Disconnected — Reconnecting...
                </span>
              </>
            )}
          </div>
        </div>

        {/* Alert area */}
        <div className="flex-1 flex items-center justify-center">
          {alert ? (
            /* ── ACTIVE ALERT ── */
            <div className="w-full animate-slide-up">
              <div className="bg-alert-amber/10 border-2 border-alert-amber/40 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 opacity-5">
                  <div
                    className="absolute inset-0 alert-flash"
                    style={{ background: 'radial-gradient(circle, #F0B85A 0%, transparent 70%)' }}
                  />
                </div>

                <div className="relative z-10 space-y-6">
                  {/* Siren Icon */}
                  <div className="flex justify-center">
                    <div className="w-20 h-20 rounded-full bg-alert-amber/20 flex items-center justify-center alert-flash">
                      <AlertTriangle className="w-10 h-10 text-alert-amber" />
                    </div>
                  </div>

                  {/* Title & Telemetry Status */}
                  <div>
                    <Badge variant="amber" pulse className="mb-3">
                      <Volume2 className="w-3 h-3" />
                      1 KM EMERGENCY PROXIMITY ALERT
                    </Badge>
                    <h2 className="text-xl sm:text-2xl font-bold text-primary-text">
                      Emergency Vehicle Approaching
                    </h2>
                    {alert.isStale && (
                      <div className="mt-3 bg-alert-amber/20 border border-alert-amber/40 text-alert-amber px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Telemetry delayed (&gt;45s) — Position may be stale</span>
                      </div>
                    )}
                  </div>

                  {/* Distance & direction */}
                  <div className="flex items-center justify-center gap-8">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-alert-amber">
                        {formatDistance(alert.distance)}
                      </div>
                      <div className="text-xs text-muted-text mt-1">
                        Distance
                      </div>
                    </div>
                    {bearing && (
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Navigation className="w-6 h-6 text-alert-amber" />
                          <span className="text-3xl font-bold text-alert-amber">
                            {bearing}
                          </span>
                        </div>
                        <div className="text-xs text-muted-text mt-1">
                          Direction
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recipient Private Vehicle Card (Kept distinct from Emergency Identity) */}
                  <div className="bg-deep-surface/90 border border-petrol/80 rounded-2xl p-4 text-left space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-text uppercase tracking-wider flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-accent-teal" />
                        Your Vehicle Identification
                      </span>
                      {activeTargetRegistration && (
                        <span className="text-[10px] bg-petrol text-muted-text px-2 py-0.5 rounded font-mono">
                          User-Entered (Unverified)
                        </span>
                      )}
                    </div>

                    {activeTargetRegistration ? (
                      <div className="flex items-center justify-between pt-1">
                        <div className="font-mono text-lg font-bold text-accent-teal tracking-wider">
                          {activeTargetRegistration}
                        </div>
                        <span className="text-[11px] text-muted-text flex items-center gap-1">
                          <Lock className="w-3 h-3 text-accent-teal/70" />
                          Session Linked
                        </span>
                      </div>
                    ) : (
                      <div className="pt-1 text-xs text-muted-text/90">
                        <span>No registration linked. </span>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="text-accent-teal underline font-medium hover:text-primary-text"
                        >
                          Add vehicle plate below
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Message */}
                  <div className="bg-midnight/60 border border-petrol/40 rounded-2xl p-4">
                    <p className="text-primary-text font-medium text-sm leading-relaxed">
                      {alert.message}
                    </p>
                  </div>

                  {/* Actions */}
                  <Button variant="ghost" onClick={onClearAlert}>
                    <CheckCircle2 className="w-4 h-4" />
                    Acknowledged
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ── NO ALERT — STANDBY ── */
            <div className="text-center space-y-6 animate-fade-in py-4">
              <div className="flex justify-center">
                <div className="w-24 h-24 rounded-full bg-petrol/50 border border-petrol flex items-center justify-center">
                  <Shield className="w-12 h-12 text-accent-teal/40" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-primary-text">
                  All Clear
                </h2>
                <p className="text-muted-text mt-2 max-w-sm mx-auto text-sm">
                  You're connected to the MediRoute network. You'll be
                  notified if an emergency vehicle is nearby within 1 km.
                </p>
              </div>
              <Badge variant="teal">
                <Shield className="w-3 h-3" />
                Monitoring Active
              </Badge>
            </div>
          )}
        </div>

        {/* Private Vehicle Registration Card */}
        <div className="bg-deep-surface border border-petrol/80 rounded-2xl p-5 space-y-4 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="w-4 h-4 text-accent-teal" />
              <h3 className="font-semibold text-sm text-primary-text">
                Private Vehicle Registration
              </h3>
            </div>
            {!isEditing && registrationNumber && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-accent-teal hover:underline flex items-center gap-1 font-medium"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>

          {!isEditing && registrationNumber ? (
            /* Display Mode */
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-petrol/30 rounded-xl border border-petrol/50">
                <div>
                  <div className="text-[11px] text-muted-text uppercase tracking-wider">
                    Registered Plate
                  </div>
                  <div className="font-mono text-lg font-bold text-primary-text tracking-wider">
                    {registrationNumber}
                  </div>
                </div>
                <Badge variant="teal" className="text-[10px]">
                  <Check className="w-3 h-3" />
                  Active on Session
                </Badge>
              </div>

              <div className="flex items-start gap-2 text-[11px] text-muted-text/80 bg-petrol/20 p-2.5 rounded-xl border border-petrol/30">
                <Info className="w-3.5 h-3.5 text-muted-text flex-shrink-0 mt-0.5" />
                <span>
                  User-entered &amp; unverified. Does not prove legal vehicle ownership. Plate is kept strictly private to your alert session.
                </span>
              </div>
            </div>
          ) : (
            /* Input / Edit Mode */
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs text-muted-text mb-1.5 font-medium">
                  Vehicle Registration Number (Indian / Kerala format)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputReg}
                    onChange={(e) => setInputReg(e.target.value.toUpperCase())}
                    placeholder="e.g. KL 07 CA 1234"
                    maxLength={15}
                    className="w-full px-4 py-2.5 bg-petrol/50 border border-petrol rounded-xl text-primary-text font-mono placeholder:text-muted-text/40 text-sm focus:outline-none focus:ring-2 focus:ring-accent-teal/50 focus:border-accent-teal/50 transition-all uppercase"
                  />
                  {hasInput && (
                    <div className="absolute right-3 top-2.5">
                      {isFormatValid ? (
                        <span className="text-accent-teal text-xs flex items-center gap-1 font-sans font-semibold">
                          <Check className="w-3.5 h-3.5" /> Valid
                        </span>
                      ) : (
                        <span className="text-alert-amber text-[11px] font-sans">
                          Invalid
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {hasInput && !isFormatValid && (
                  <p className="text-[11px] text-alert-amber mt-1">
                    Standard format: 2 letters state + 1-2 digits RTO + series + 1-4 digits (e.g. KL 07 CA 1234)
                  </p>
                )}
              </div>

              {/* Explicit Consent Checkbox */}
              <div className="bg-petrol/20 border border-petrol/40 rounded-xl p-3 space-y-2">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 rounded border-petrol text-accent-teal focus:ring-accent-teal/40 bg-petrol/50 w-4 h-4"
                  />
                  <span className="text-xs text-primary-text leading-snug">
                    I consent to associating this vehicle number with my active emergency coordination session.
                  </span>
                </label>
                <div className="flex items-start gap-1.5 text-[10px] text-muted-text pl-6">
                  <Lock className="w-3 h-3 text-accent-teal/70 flex-shrink-0 mt-0.5" />
                  <span>
                    Privacy by Default: Registration numbers are delivered only to your personal device in targeted alerts. They are never broadcast to public vehicle lists or timeline logs.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1 text-xs py-2"
                  onClick={handleSave}
                  disabled={hasInput && !isFormatValid}
                >
                  <Check className="w-3.5 h-3.5" />
                  {hasInput ? 'Save Registration' : 'Clear / Use Anonymous'}
                </Button>
                {registrationNumber && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs py-2"
                    onClick={() => {
                      setInputReg(registrationNumber);
                      setIsEditing(false);
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>

              {savedNotice && (
                <div className="text-center text-xs text-accent-teal font-semibold animate-fade-in">
                  Registration settings updated successfully.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-muted-text/60 pb-4">
          MediRoute driver interface · Do not operate while driving
        </div>
      </div>
    </div>
  );
}

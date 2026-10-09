// ─── Community Emergency Report Submission Page ───
import React, { useState } from 'react';
import {
  AlertTriangle,
  MapPin,
  Camera,
  UploadCloud,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Info,
  Navigation,
  Check,
  X,
  HeartPulse,
  Car,
  Baby,
  Wind,
  Flame,
  Activity,
  HelpCircle,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import type { Coordinates, EmergencyCategory } from '@/types';

interface ReportEmergencyPageProps {
  connected: boolean;
  onSubmitReport: (data: {
    category: EmergencyCategory;
    description: string;
    location: Coordinates;
    locationAddress?: string;
    locationSource: 'gps' | 'manual';
    photoUrl?: string;
  }) => void;
  reportError?: string | null;
}

const CATEGORIES: Array<{
  id: EmergencyCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = [
  { id: 'cardiac', label: 'Cardiac / Heart Attack', icon: HeartPulse, description: 'Chest pain, cardiac arrest, collapse' },
  { id: 'accident', label: 'Road Accident / Collision', icon: Car, description: 'Vehicle crash, injured pedestrians' },
  { id: 'maternal', label: 'Maternal / Childbirth', icon: Baby, description: 'Labour emergency, pregnancy complication' },
  { id: 'respiratory', label: 'Respiratory Distress', icon: Wind, description: 'Severe breathing difficulty, asphyxiation' },
  { id: 'trauma', label: 'Severe Trauma / Bleeding', icon: Flame, description: 'Major wound, heavy bleeding, fall' },
  { id: 'stroke', label: 'Stroke / Neurological', icon: Activity, description: 'Sudden paralysis, loss of speech' },
  { id: 'other', label: 'Other Critical Incident', icon: HelpCircle, description: 'Other urgent medical situation' },
];

const KERALA_PRESETS = [
  { label: 'Thodupuzha Junction (Idukki)', coords: { lat: 9.8959, lng: 76.7184 } },
  { label: 'Ernakulam Medical Trust (Kochi)', coords: { lat: 9.9678, lng: 76.2995 } },
  { label: 'Muvattupuzha Bridge Junction', coords: { lat: 9.9812, lng: 76.5786 } },
  { label: 'Kottayam Medical College', coords: { lat: 9.6256, lng: 76.5385 } },
  { label: 'Aluva Flyover / Hospital Jn', coords: { lat: 10.1076, lng: 76.3516 } },
];

export function ReportEmergencyPage({
  connected,
  onSubmitReport,
  reportError,
}: ReportEmergencyPageProps) {
  const [category, setCategory] = useState<EmergencyCategory>('cardiac');
  const [description, setDescription] = useState('');
  const [locationSource, setLocationSource] = useState<'gps' | 'manual'>('manual');
  const [coords, setCoords] = useState<Coordinates>({ lat: 9.8959, lng: 76.7184 });
  const [locationAddress, setLocationAddress] = useState('Thodupuzha Town Junction, Idukki District, Kerala');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Photo
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  // Request browser geolocation
  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }
    setGpsLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        });
        setLocationSource('gps');
        setLocationAddress(`Current Device Location (±${Math.round(pos.coords.accuracy)}m)`);
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(`Unable to retrieve GPS: ${err.message}. Please select a landmark manually.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  // Photo file upload & client check
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Only JPEG, PNG, or WebP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image file is too large (maximum size is 5 MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoUrl(event.target?.result as string);
    };
    reader.onerror = () => {
      setPhotoError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      return;
    }

    setIsSubmitting(true);
    onSubmitReport({
      category,
      description: description.trim(),
      location: coords,
      locationAddress: locationAddress.trim() || undefined,
      locationSource,
      photoUrl: photoUrl || undefined,
    });

    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedId(`REP-${Date.now().toString().slice(-6)}`);
    }, 600);
  };

  const handleReset = () => {
    setSubmittedId(null);
    setDescription('');
    setPhotoUrl(null);
    setPhotoError(null);
    setGpsError(null);
  };

  return (
    <div className="pt-20 pb-16 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary-text">Report Medical Emergency</h1>
            <p className="text-xs text-muted-text">
              Community Emergency Notice • Kerala Corridor Triage System
            </p>
          </div>
        </div>

        {/* Unverified / Community Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-amber-200/90">
            <strong className="text-amber-300 block mb-0.5">
              COMMUNITY SUBMISSION — NOT AN OFFICIAL EMERGENCY CORRIDOR
            </strong>
            This form submits a notice to the regional moderation queue. To prevent malicious spoofing and traffic disruption,{' '}
            <strong>community reports do NOT trigger sirens, road clearance, or 1 km driver alerts</strong> until verified and escalated by authorized emergency coordinators.
          </div>
        </div>
      </div>

      {reportError && (
        <div className="mb-6 p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{reportError}</span>
        </div>
      )}

      {submittedId ? (
        /* Submission Success Card */
        <Card className="p-8 text-center space-y-5 animate-fade-in border-accent-teal/30">
          <div className="w-16 h-16 rounded-2xl bg-accent-teal/20 border border-accent-teal/40 flex items-center justify-center mx-auto text-accent-teal">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <Badge variant="amber" className="mb-2">STATUS: PENDING MODERATOR REVIEW</Badge>
            <h2 className="text-xl font-bold text-primary-text">Emergency Notice Submitted</h2>
            <p className="text-xs text-muted-text max-w-md mx-auto mt-1">
              Your report has been queued for real-time verification by MediRoute dispatchers.
            </p>
          </div>

          <div className="max-w-md mx-auto bg-midnight/60 rounded-xl p-4 border border-petrol/40 text-left text-xs space-y-2">
            <div className="flex justify-between text-muted-text">
              <span>Category:</span>
              <span className="text-primary-text font-semibold capitalize">{category}</span>
            </div>
            <div className="flex justify-between text-muted-text">
              <span>Location:</span>
              <span className="text-primary-text">{locationAddress}</span>
            </div>
            <div className="flex justify-between text-muted-text">
              <span>Coordinates:</span>
              <span className="text-accent-teal font-mono">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-muted-text">
              <span>Verification Status:</span>
              <span className="text-amber-400 font-medium">PENDING (Unverified)</span>
            </div>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Button variant="ghost" onClick={handleReset}>
              Submit Another Report
            </Button>
            <a href="/moderator">
              <Button variant="primary">
                View Moderation Queue
              </Button>
            </a>
          </div>
        </Card>
      ) : (
        /* Report Submission Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Emergency Category */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary-text">
              <span className="w-6 h-6 rounded-full bg-accent-teal/20 text-accent-teal flex items-center justify-center text-xs">1</span>
              <span>Emergency Category</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {CATEGORIES.map(({ id, label, icon: Icon, description: catDesc }) => {
                const isSelected = category === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCategory(id)}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-accent-teal/15 border-accent-teal text-primary-text shadow-sm'
                        : 'bg-midnight/40 border-petrol/30 text-muted-text hover:border-petrol/60 hover:text-primary-text'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-accent-teal' : 'text-muted-text'}`} />
                      <span className="text-xs font-semibold">{label}</span>
                    </div>
                    <p className="text-[10px] text-muted-text leading-tight">{catDesc}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Step 2: Description */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between text-sm font-semibold text-primary-text">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-teal/20 text-accent-teal flex items-center justify-center text-xs">2</span>
                <span>Incident Description</span>
              </div>
              <span className={`text-[10px] ${description.length < 5 ? 'text-amber-400' : 'text-muted-text'}`}>
                {description.length}/1000 characters (min 5)
              </span>
            </div>

            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe patient condition, number of injured individuals, visible hazards, or landmarks..."
              className="w-full bg-midnight/80 border border-petrol/40 rounded-xl p-3 text-xs text-primary-text placeholder-muted-text/50 focus:outline-none focus:border-accent-teal resize-none"
            />
          </Card>

          {/* Step 3: Location Selection */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold text-primary-text">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-teal/20 text-accent-teal flex items-center justify-center text-xs">3</span>
                <span>Incident Location</span>
              </div>
              <span className="text-[10px] text-muted-text">
                Source: <strong className="text-accent-teal uppercase">{locationSource}</strong>
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={locationSource === 'gps' ? 'primary' : 'ghost'}
                size="sm"
                onClick={handleGetGps}
                disabled={gpsLoading}
                className="flex items-center gap-2"
              >
                <Navigation className={`w-3.5 h-3.5 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>{gpsLoading ? 'Acquiring GPS...' : 'Use My Live GPS Location'}</span>
              </Button>
            </div>

            {gpsError && (
              <p className="text-[11px] text-amber-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {gpsError}
              </p>
            )}

            {/* Manual Presets Fallback */}
            <div className="pt-2 border-t border-petrol/30">
              <span className="text-[11px] text-muted-text block mb-2">Or select from Kerala Corridor Landmarks:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {KERALA_PRESETS.map((preset) => {
                  const isPresetActive =
                    coords.lat === preset.coords.lat && coords.lng === preset.coords.lng;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setCoords(preset.coords);
                        setLocationAddress(preset.label);
                        setLocationSource('manual');
                      }}
                      className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                        isPresetActive
                          ? 'bg-accent-teal/15 border-accent-teal text-primary-text'
                          : 'bg-midnight/40 border-petrol/30 text-muted-text hover:border-petrol/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-xs">{preset.label}</span>
                        {isPresetActive && <Check className="w-3.5 h-3.5 text-accent-teal" />}
                      </div>
                      <span className="text-[10px] text-muted-text font-mono">
                        {preset.coords.lat.toFixed(4)}, {preset.coords.lng.toFixed(4)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Address / Landmark detail */}
            <div>
              <label className="text-[11px] text-muted-text block mb-1">Location Details / Landmark Description:</label>
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="e.g. Near Petrol Pump, M.C. Road, Thodupuzha"
                className="w-full bg-midnight/80 border border-petrol/40 rounded-xl px-3 py-2 text-xs text-primary-text placeholder-muted-text/50 focus:outline-none focus:border-accent-teal"
              />
            </div>
          </Card>

          {/* Step 4: Optional Photo Upload */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between text-sm font-semibold text-primary-text">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent-teal/20 text-accent-teal flex items-center justify-center text-xs">4</span>
                <span>Supporting Photo (Optional)</span>
              </div>
              <span className="text-[10px] text-muted-text">Max 5MB • JPEG/PNG/WebP</span>
            </div>

            {photoUrl ? (
              <div className="relative rounded-xl overflow-hidden border border-petrol/50 max-w-sm">
                <img
                  src={photoUrl}
                  alt="Incident Preview"
                  className="w-full h-44 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-midnight/80 text-red-400 hover:text-red-300 border border-red-500/40"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-midnight/80 text-[10px] text-muted-text">
                  Photo Attached
                </div>
              </div>
            ) : (
              <label className="border-2 border-dashed border-petrol/40 hover:border-accent-teal/50 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all bg-midnight/30 hover:bg-midnight/50">
                <Camera className="w-8 h-8 text-muted-text mb-2" />
                <span className="text-xs text-primary-text font-medium">Click to upload scene photo</span>
                <span className="text-[10px] text-muted-text mt-0.5">JPEG, PNG, or WebP up to 5MB</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            )}

            {photoError && (
              <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {photoError}
              </p>
            )}
          </Card>

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-text flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Submission will be timestamped and routed to dispatcher review.
            </span>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || description.trim().length < 5 || !connected}
              className="px-6 py-2.5 font-semibold text-xs"
            >
              {isSubmitting ? 'Transmitting Notice...' : 'Submit Emergency Notice'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

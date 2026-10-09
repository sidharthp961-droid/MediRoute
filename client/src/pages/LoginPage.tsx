// ─── Role-Aware Login Page (Phase 1) ───
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  ShieldCheck,
  Key,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  LogOut,
  Info,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useAuth } from '@/lib/authContext';
import { isValidRegistration, formatRegistration } from '@/lib/validation';
import type { UserRole } from '@/types';

interface LoginPageProps {
  onDriverLogin?: (registrationNumber: string | null) => void;
}

export function LoginPage({ onDriverLogin }: LoginPageProps) {
  const { user, login, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [activeRole, setActiveRole] = useState<UserRole>('driver');
  const [driverName, setDriverName] = useState('Rahul Nair');
  const [driverPhone, setDriverPhone] = useState('9847012345');
  const [driverPlate, setDriverPlate] = useState('KL 07 CA 1234');

  const [adminName, setAdminName] = useState('Chief Dispatcher Mod-1');
  const [adminKey, setAdminKey] = useState('');
  const [showAdminKey, setShowAdminKey] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isPlateValid = !driverPlate || isValidRegistration(driverPlate);

  const handleDriverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (driverPlate.trim() && !isValidRegistration(driverPlate)) {
      setErrorMessage('Please enter a valid registration number (e.g., KL 07 CA 1234)');
      return;
    }

    const formatted = driverPlate.trim() ? formatRegistration(driverPlate) : undefined;
    const res = await login({
      role: 'driver',
      name: driverName.trim(),
      phone: driverPhone.trim() || undefined,
      registrationNumber: formatted,
    });

    if (res.success) {
      setSuccessMessage('Welcome! Redirecting to Driver Dashboard...');
      if (formatted && onDriverLogin) {
        onDriverLogin(formatted);
      }
      setTimeout(() => navigate('/driver'), 700);
    } else {
      setErrorMessage(res.error || 'Failed to authenticate driver');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!adminKey.trim()) {
      setErrorMessage('Administrator secret key is required');
      return;
    }

    const res = await login({
      role: 'admin',
      name: adminName.trim(),
      key: adminKey.trim(),
    });

    if (res.success) {
      setSuccessMessage('Administrator verified. Redirecting to Moderation Console...');
      setTimeout(() => navigate('/moderator'), 700);
    } else {
      setErrorMessage(res.error || 'Invalid administrator credentials');
    }
  };

  const fillDemoDriver = () => {
    setActiveRole('driver');
    setDriverName('Arun George');
    setDriverPhone('9846054321');
    setDriverPlate('KL 38 E 4567');
    setErrorMessage(null);
  };

  const fillDemoAdmin = () => {
    setActiveRole('admin');
    setAdminName('Chief Dispatcher Mod-1');
    setAdminKey('test-moderator-key-audit-suite');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] pt-20 pb-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="teal">ROLE-AWARE ACCESS</Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-text tracking-tight">
            MediRoute Authentication
          </h1>
          <p className="text-sm text-muted-text max-w-xs mx-auto">
            Sign in as a private driver to receive targeted alerts or as an authorized administrator.
          </p>
        </div>

        {/* Existing Session Banner */}
        {user && (
          <Card className="border-accent-teal/40 bg-accent-teal/5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-accent-teal" />
                  <span className="text-sm font-semibold text-accent-teal">Currently Signed In</span>
                </div>
                <p className="text-xs text-primary-text font-medium">
                  {user.name} ({user.role === 'admin' ? '🛡️ Administrator' : '🚗 Private Driver'})
                </p>
                {user.registrationNumber && (
                  <p className="text-xs font-mono text-muted-text">Plate: {user.registrationNumber}</p>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={logout} className="text-xs text-red-400">
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </Button>
            </div>
          </Card>
        )}

        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-deep-surface border border-petrol/60 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveRole('driver');
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeRole === 'driver'
                ? 'bg-petrol text-accent-teal shadow-md shadow-accent-teal/10'
                : 'text-muted-text hover:text-primary-text'
            }`}
          >
            <Car className="w-4 h-4" />
            Private Driver
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveRole('admin');
              setErrorMessage(null);
            }}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
              activeRole === 'admin'
                ? 'bg-petrol text-accent-teal shadow-md shadow-accent-teal/10'
                : 'text-muted-text hover:text-primary-text'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Administrator
          </button>
        </div>

        {/* Error / Success Feedback */}
        {errorMessage && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-400 p-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-accent-teal/15 border border-accent-teal/30 text-accent-teal p-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Card */}
        <Card>
          {activeRole === 'driver' ? (
            <form onSubmit={handleDriverSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-text flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-accent-teal" />
                  Driver Full Name
                </label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g. Rahul Nair"
                  className="w-full bg-midnight/80 border border-petrol/60 rounded-xl px-3.5 py-2.5 text-sm text-primary-text focus:outline-none focus:border-accent-teal transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-text flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-accent-teal" />
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="e.g. 9847012345"
                  className="w-full bg-midnight/80 border border-petrol/60 rounded-xl px-3.5 py-2.5 text-sm text-primary-text focus:outline-none focus:border-accent-teal transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-text flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-accent-teal" />
                    Vehicle Plate Number
                  </label>
                  {driverPlate && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                        isPlateValid ? 'bg-accent-teal/15 text-accent-teal' : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {isPlateValid ? 'Valid Format' : 'Invalid Plate'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={driverPlate}
                  onChange={(e) => setDriverPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. KL 07 CA 1234"
                  className="w-full font-mono uppercase bg-midnight/80 border border-petrol/60 rounded-xl px-3.5 py-2.5 text-sm text-primary-text focus:outline-none focus:border-accent-teal transition-colors"
                />
                <p className="text-[11px] text-muted-text flex items-center gap-1">
                  <Info className="w-3 h-3 text-accent-teal flex-shrink-0" />
                  Associates your vehicle with real-time 1 km proximity emergency warnings.
                </p>
              </div>

              <Button type="submit" disabled={loading || !isPlateValid} className="w-full mt-2">
                {loading ? 'Authenticating...' : 'Sign In as Driver'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-text flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-accent-teal" />
                  Administrator Identity
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Chief Dispatcher Mod-1"
                  className="w-full bg-midnight/80 border border-petrol/60 rounded-xl px-3.5 py-2.5 text-sm text-primary-text focus:outline-none focus:border-accent-teal transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-text flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-accent-teal" />
                  Administrator Authorization Secret Key
                </label>
                <div className="relative">
                  <input
                    type={showAdminKey ? 'text' : 'password'}
                    required
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="Enter process.env.MODERATOR_KEY"
                    className="w-full bg-midnight/80 border border-petrol/60 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-primary-text focus:outline-none focus:border-accent-teal transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminKey(!showAdminKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-text hover:text-primary-text"
                  >
                    {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-text flex items-center gap-1">
                  <Info className="w-3 h-3 text-accent-teal flex-shrink-0" />
                  Key is validated server-side. Grants emergency review & escalation permissions.
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? 'Verifying Key...' : 'Sign In as Administrator'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          )}

          {/* Quick Demo Pre-fill */}
          <div className="pt-4 mt-4 border-t border-petrol/40 flex items-center justify-between text-xs">
            <span className="text-muted-text">Demo Shortcuts:</span>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={fillDemoDriver}
                className="text-accent-teal hover:underline font-medium"
              >
                Fill Driver
              </button>
              <span className="text-petrol">•</span>
              <button
                type="button"
                onClick={fillDemoAdmin}
                className="text-accent-teal hover:underline font-medium"
              >
                Fill Admin
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

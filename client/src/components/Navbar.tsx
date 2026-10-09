// ─── Navbar component ───
import { Link, useLocation } from 'react-router-dom';
import {
  Activity,
  Radio,
  Car,
  Monitor,
  Wifi,
  WifiOff,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { StatusDot } from './ui';
import { useAuth } from '@/lib/authContext';
import { LogIn, LogOut, UserCheck } from 'lucide-react';

interface NavbarProps {
  connected: boolean;
}

export function Navbar({ connected }: NavbarProps) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const links = [
    { to: '/', label: 'Home', icon: Activity },
    { to: '/command', label: 'Command Centre', icon: Radio },
    { to: '/driver', label: 'Driver', icon: Car },
    { to: '/report', label: 'Report Emergency', icon: ShieldAlert },
    { to: '/moderator', label: 'Moderator', icon: ShieldCheck },
    { to: '/monitor', label: 'Monitor', icon: Monitor },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-midnight/80 backdrop-blur-xl border-b border-petrol/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-lg bg-accent-teal/20 flex items-center justify-center group-hover:bg-accent-teal/30 transition-colors">
              <Activity className="w-4 h-4 text-accent-teal" />
            </div>
            <span className="text-lg font-bold tracking-tight text-primary-text">
              Medi<span className="text-accent-teal">Route</span>
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(({ to, label, icon: Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-petrol text-accent-teal'
                      : 'text-muted-text hover:text-primary-text hover:bg-petrol/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Right side: Auth status & Connection status */}
          <div className="flex items-center gap-3 text-sm">
            {/* User session status */}
            {user ? (
              <div className="flex items-center gap-2 bg-petrol/60 border border-petrol/80 rounded-lg px-2.5 py-1">
                <span className="text-xs font-semibold text-accent-teal flex items-center gap-1">
                  {user.role === 'admin' ? (
                    <>🛡️ {user.name.split(' ')[0]}</>
                  ) : (
                    <>🚗 {user.registrationNumber || user.name.split(' ')[0]}</>
                  )}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  title="Sign Out"
                  className="text-muted-text hover:text-red-400 transition-colors ml-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  location.pathname === '/login'
                    ? 'bg-accent-teal text-midnight'
                    : 'text-accent-teal hover:bg-accent-teal/15 border border-accent-teal/30'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In</span>
              </Link>
            )}

            {/* Connection status */}
            <div className="flex items-center gap-1.5 text-xs">
              {connected ? (
                <>
                  <StatusDot status="online" />
                  <span className="hidden lg:inline text-muted-text">Connected</span>
                </>
              ) : (
                <>
                  <StatusDot status="offline" />
                  <span className="hidden lg:inline text-red-400">Offline</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden flex gap-1 pb-3 overflow-x-auto">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-petrol text-accent-teal'
                    : 'text-muted-text hover:bg-petrol/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

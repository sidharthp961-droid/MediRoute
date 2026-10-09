// ─── Landing Page ───
import { Link } from 'react-router-dom';
import {
  Activity,
  Radio,
  Shield,
  Zap,
  MapPin,
  Users,
  ArrowRight,
  Car,
  Monitor,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Button, Card, Badge, StatusDot } from '@/components/ui';
import type { NetworkStatus } from '@/types';

interface LandingPageProps {
  networkStatus: NetworkStatus;
  connected: boolean;
}

export function LandingPage({ networkStatus, connected }: LandingPageProps) {
  return (
    <div className="min-h-screen pt-20 pb-12">
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-4">
              <Badge variant="teal" pulse>
                Kerala Emergency Mobility Network · Thodupuzha Hub
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight">
                Every second{' '}
                <span className="text-accent-teal">counts</span> on the
                road
              </h1>
              <p className="text-lg sm:text-xl text-muted-text max-w-lg leading-relaxed">
                When an ambulance isn't available, MediRoute transforms any
                private vehicle into a visible emergency transport — alerting
                nearby drivers in real time within a 1 km radius.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/command">
                <Button size="lg" variant="primary">
                  <Radio className="w-5 h-5" />
                  Start Emergency
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/driver">
                <Button size="lg" variant="ghost">
                  <Car className="w-5 h-5" />
                  Driver Dashboard
                </Button>
              </Link>
            </div>

            {/* Network status */}
            <div className="flex items-center gap-6 text-sm text-muted-text">
              <div className="flex items-center gap-2">
                <StatusDot status={connected ? 'online' : 'offline'} />
                <span>
                  {connected ? 'Network Online' : 'Connecting...'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{networkStatus.vehicleCount} vehicles</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>
                  {networkStatus.activeEmergency
                    ? 'Emergency active'
                    : 'Standing by'}
                </span>
              </div>
            </div>
          </div>

          {/* Visual preview */}
          <div className="relative animate-slide-up">
            <div className="relative bg-deep-surface border border-petrol/60 rounded-3xl p-6 overflow-hidden">
              {/* Decorative map grid */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `
                    linear-gradient(rgba(93,228,208,0.3) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(93,228,208,0.3) 1px, transparent 1px)
                  `,
                  backgroundSize: '40px 40px',
                }} />
              </div>

              {/* Simulated emergency display */}
              <div className="relative z-10 flex flex-col items-center py-8">
                {/* Pulse ring */}
                <div className="relative mb-8">
                  <div className="absolute inset-0 w-32 h-32 rounded-full bg-accent-teal/10 animate-pulse-ring" />
                  <div className="absolute inset-4 w-24 h-24 rounded-full bg-accent-teal/5 animate-pulse-ring" style={{ animationDelay: '0.5s' }} />
                  <div className="w-32 h-32 rounded-full bg-petrol/80 border-2 border-accent-teal/30 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-accent-teal">1 km</div>
                      <div className="text-xs text-muted-text">Radius</div>
                    </div>
                  </div>
                </div>

                {/* Markers */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-alert-amber shadow-lg shadow-alert-amber/30" />
                    <span className="text-muted-text">Emergency</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent-teal shadow-lg shadow-accent-teal/30" />
                    <span className="text-muted-text">Alerted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-muted-text/50" />
                    <span className="text-muted-text">Out of range</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: Zap,
              title: 'Instant Alerts',
              description:
                'Nearby vehicles receive real-time notifications within milliseconds.',
            },
            {
              icon: MapPin,
              title: '1 km Geofence',
              description:
                'Server-authoritative proximity detection using Haversine formula.',
            },
            {
              icon: Shield,
              title: 'Privacy First',
              description:
                'No patient data transmitted. Only proximity and direction shared.',
            },
            {
              icon: Monitor,
              title: 'Live Monitoring',
              description:
                'Full network dashboard with real-time vehicle tracking and event timeline.',
            },
          ].map(({ icon: Icon, title, description }) => (
            <Card key={title} className="group hover:border-accent-teal/30 transition-colors duration-300">
              <div className="w-10 h-10 rounded-xl bg-petrol flex items-center justify-center mb-4 group-hover:bg-accent-teal/10 transition-colors">
                <Icon className="w-5 h-5 text-accent-teal" />
              </div>
              <h3 className="font-semibold text-primary-text mb-2">{title}</h3>
              <p className="text-sm text-muted-text leading-relaxed">
                {description}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 mt-16">
        <div className="grid sm:grid-cols-3 gap-4">
          <Link to="/command" className="group">
            <Card className="hover:border-accent-teal/40 transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Radio className="w-5 h-5 text-accent-teal" />
                  <div>
                    <div className="font-semibold text-primary-text">Command Centre</div>
                    <div className="text-xs text-muted-text">Manage emergencies</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-accent-teal transition-colors" />
              </div>
            </Card>
          </Link>
          <Link to="/driver" className="group">
            <Card className="hover:border-accent-teal/40 transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Car className="w-5 h-5 text-accent-teal" />
                  <div>
                    <div className="font-semibold text-primary-text">Driver View</div>
                    <div className="text-xs text-muted-text">Receive alerts</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-accent-teal transition-colors" />
              </div>
            </Card>
          </Link>
          <Link to="/report" className="group">
            <Card className="hover:border-amber-400/40 transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <div>
                    <div className="font-semibold text-primary-text">Report Emergency</div>
                    <div className="text-xs text-muted-text">Community incident notice</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-amber-400 transition-colors" />
              </div>
            </Card>
          </Link>
          <Link to="/moderator" className="group">
            <Card className="hover:border-accent-teal/40 transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-accent-teal" />
                  <div>
                    <div className="font-semibold text-primary-text">Moderation Queue</div>
                    <div className="text-xs text-muted-text">Verify & escalate notices</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-accent-teal transition-colors" />
              </div>
            </Card>
          </Link>
          <Link to="/monitor" className="group">
            <Card className="hover:border-accent-teal/40 transition-all duration-300 cursor-pointer">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-accent-teal" />
                  <div>
                    <div className="font-semibold text-primary-text">Network Monitor</div>
                    <div className="text-xs text-muted-text">Demo & simulation</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-accent-teal transition-colors" />
              </div>
            </Card>
          </Link>
        </div>
      </section>
    </div>
  );
}

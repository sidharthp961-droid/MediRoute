// ─── Timeline component ───
import { formatDistanceToNow } from '@/lib/utils';
import type { TimelineEvent } from '@/types';
import {
  AlertTriangle,
  Radio,
  CheckCircle2,
  XCircle,
  UserPlus,
  UserMinus,
  Move,
  Play,
  Square,
  Bell,
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  emergency_started: Radio,
  emergency_cancelled: XCircle,
  emergency_completed: CheckCircle2,
  vehicle_alerted: Bell,
  alert_expired: AlertTriangle,
  vehicle_connected: UserPlus,
  vehicle_disconnected: UserMinus,
  vehicle_moved: Move,
  simulation_started: Play,
  simulation_stopped: Square,
};

const colorMap: Record<string, string> = {
  emergency_started: 'text-alert-amber',
  emergency_cancelled: 'text-red-400',
  emergency_completed: 'text-accent-teal',
  vehicle_alerted: 'text-accent-teal',
  alert_expired: 'text-alert-amber',
  vehicle_connected: 'text-accent-teal',
  vehicle_disconnected: 'text-muted-text',
  vehicle_moved: 'text-muted-text',
  simulation_started: 'text-accent-teal',
  simulation_stopped: 'text-muted-text',
};

interface TimelineProps {
  events: TimelineEvent[];
  maxItems?: number;
}

export function Timeline({ events, maxItems = 20 }: TimelineProps) {
  const displayed = events.slice(-maxItems).reverse();

  if (displayed.length === 0) {
    return (
      <div className="text-center py-8 text-muted-text text-sm">
        No events yet. Start an emergency or connect vehicles.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {displayed.map((evt, i) => {
        const Icon = iconMap[evt.type] || Radio;
        const color = colorMap[evt.type] || 'text-muted-text';

        return (
          <div
            key={evt.id}
            className={`flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-petrol/30 transition-colors ${
              i === 0 ? 'animate-slide-up' : ''
            }`}
          >
            <div className={`mt-0.5 ${color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-primary-text leading-tight">
                {evt.message}
              </p>
              <p className="text-xs text-muted-text mt-0.5">
                {formatDistanceToNow(evt.timestamp)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

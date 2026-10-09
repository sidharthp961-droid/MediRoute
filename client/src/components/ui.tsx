// ─── Reusable UI Components ───
import React from 'react';

// ── Button ──
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'danger' | 'ghost' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-midnight disabled:opacity-40 disabled:cursor-not-allowed';

  const variants: Record<string, string> = {
    primary:
      'bg-accent-teal text-midnight hover:bg-accent-teal/90 focus:ring-accent-teal shadow-lg shadow-accent-teal/20',
    danger:
      'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 focus:ring-red-500',
    ghost:
      'bg-petrol/50 text-primary-text border border-petrol hover:bg-petrol focus:ring-petrol',
    amber:
      'bg-alert-amber text-midnight hover:bg-alert-amber/90 focus:ring-alert-amber shadow-lg shadow-alert-amber/20',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Card ──
interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export function Card({ children, className = '', glow = false }: CardProps) {
  return (
    <div
      className={`bg-deep-surface/70 backdrop-blur-xl border border-petrol/60 rounded-2xl p-5 ${
        glow ? 'shadow-lg shadow-accent-teal/5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ── Badge ──
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'teal' | 'amber' | 'red' | 'muted';
  pulse?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'teal',
  pulse = false,
  className = '',
}: BadgeProps) {
  const variants: Record<string, string> = {
    teal: 'bg-accent-teal/15 text-accent-teal border-accent-teal/30',
    amber: 'bg-alert-amber/15 text-alert-amber border-alert-amber/30',
    red: 'bg-red-500/15 text-red-400 border-red-500/30',
    muted: 'bg-petrol/50 text-muted-text border-petrol',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${variants[variant]} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              variant === 'amber'
                ? 'bg-alert-amber'
                : variant === 'red'
                ? 'bg-red-400'
                : 'bg-accent-teal'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              variant === 'amber'
                ? 'bg-alert-amber'
                : variant === 'red'
                ? 'bg-red-400'
                : 'bg-accent-teal'
            }`}
          />
        </span>
      )}
      {children}
    </span>
  );
}

// ── StatusDot ──
export function StatusDot({
  status,
  size = 'sm',
}: {
  status: 'online' | 'offline' | 'warning';
  size?: 'sm' | 'md';
}) {
  const colors: Record<string, string> = {
    online: 'bg-accent-teal',
    offline: 'bg-red-400',
    warning: 'bg-alert-amber',
  };

  const sizes: Record<string, string> = {
    sm: 'h-2 w-2',
    md: 'h-3 w-3',
  };

  return (
    <span className="relative flex">
      {status === 'online' && (
        <span
          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors[status]} opacity-75 ${sizes[size]}`}
        />
      )}
      <span
        className={`relative inline-flex rounded-full ${colors[status]} ${sizes[size]}`}
      />
    </span>
  );
}

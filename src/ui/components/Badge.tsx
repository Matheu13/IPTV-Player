import React from 'react';

export type BadgeVariant = 'live' | '4k' | '8k' | 'hdr' | 'fhd' | 'hevc' | 'source' | 'muted' | 'success' | 'warning' | 'error';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children?: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'muted',
  size = 'md',
  children,
  className = '',
  pulse = false,
}) => {
  const variantStyles = {
    live: 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold',
    '8k': 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-extrabold',
    '4k': 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-extrabold',
    hdr: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40 font-bold',
    fhd: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold',
    hevc: 'bg-purple-500/20 text-purple-300 border-purple-500/40 font-mono',
    source: 'bg-slate-800 text-slate-300 border-slate-700 font-medium',
    muted: 'bg-slate-800/80 text-slate-400 border-slate-700/60 font-medium',
    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-medium',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-medium',
    error: 'bg-rose-500/15 text-rose-300 border-rose-500/30 font-medium',
  }[variant];

  const sizeStyles = {
    sm: 'px-1.5 py-0.2 text-[10px] rounded',
    md: 'px-2 py-0.5 text-xs rounded-md',
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1 border uppercase tracking-wider whitespace-nowrap select-none ${variantStyles} ${sizeStyles} ${className}`}
    >
      {variant === 'live' && (
        <span
          className={`w-1.5 h-1.5 rounded-full bg-rose-500 ${
            pulse ? 'animate-ping' : ''
          }`}
        />
      )}
      {children || (variant === 'live' ? 'LIVE' : variant.toUpperCase())}
    </span>
  );
};

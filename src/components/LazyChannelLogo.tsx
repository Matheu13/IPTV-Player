import React, { useState } from 'react';
import { Tv } from 'lucide-react';

interface LazyChannelLogoProps {
  logoUrl: string | null;
  channelName: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LazyChannelLogo: React.FC<LazyChannelLogoProps> = ({
  logoUrl,
  channelName,
  className = '',
  size = 'md',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Extract initials (e.g. "Sky Sports F1" -> "SS")
  const words = channelName.trim().split(/\s+/);
  const initials = words.length >= 2
    ? `${words[0][0]}${words[1][0]}`.toUpperCase()
    : (channelName.slice(0, 2) || 'TV').toUpperCase();

  // Consistent color hash based on channel name
  const colorSchemes = [
    'from-blue-600 to-indigo-800 text-blue-100',
    'from-rose-600 to-red-800 text-rose-100',
    'from-amber-600 to-orange-800 text-amber-100',
    'from-emerald-600 to-teal-800 text-emerald-100',
    'from-purple-600 to-violet-800 text-purple-100',
    'from-cyan-600 to-blue-800 text-cyan-100',
    'from-fuchsia-600 to-pink-800 text-fuchsia-100',
  ];
  let hash = 0;
  for (let i = 0; i < channelName.length; i++) {
    hash = channelName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colorClass = colorSchemes[Math.abs(hash) % colorSchemes.length];

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-base font-bold',
  }[size];

  // Placeholder when logoUrl is missing or fails to load
  if (!logoUrl || hasError) {
    return (
      <div
        id={`logo-fallback-${channelName.replace(/\s+/g, '-').toLowerCase()}`}
        className={`relative flex items-center justify-center rounded-lg bg-gradient-to-br ${colorClass} font-semibold shrink-0 shadow-sm border border-slate-700/50 select-none ${sizeClasses} ${className}`}
        title={`${channelName} (Logo Placeholder)`}
      >
        <span>{initials}</span>
        <Tv className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 opacity-40" />
      </div>
    );
  }

  return (
    <div
      id={`logo-container-${channelName.replace(/\s+/g, '-').toLowerCase()}`}
      className={`relative flex items-center justify-center rounded-lg bg-slate-800 border border-slate-700/60 overflow-hidden shrink-0 ${sizeClasses} ${className}`}
    >
      {/* Background skeleton while loading */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center animate-pulse text-[10px] text-slate-500 font-mono">
          {initials}
        </div>
      )}

      {/* Lazy-loaded logo image */}
      <img
        src={logoUrl}
        alt={channelName}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-contain p-1 transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

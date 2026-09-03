import React, { useState, useEffect } from 'react';
import { Tv, Radio, Sparkles } from 'lucide-react';
import {
  resolveChannelLogoUrl,
  getChannelInitials,
  getCategoryPalette,
} from '../../lib/channelLogoResolver';

interface ChannelLogoProps {
  name: string;
  logoUrl?: string | null;
  overrideLogoUrl?: string | null;
  category?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadgeBorder?: boolean;
}

export const ChannelLogo: React.FC<ChannelLogoProps> = ({
  name,
  logoUrl,
  overrideLogoUrl,
  category,
  size = 'md',
  className = '',
  showBadgeBorder = true,
}) => {
  const resolvedUrl = resolveChannelLogoUrl(name, logoUrl, overrideLogoUrl);
  const [imgError, setImgError] = useState(false);

  // Reset error state when name or url changes
  useEffect(() => {
    setImgError(false);
  }, [name, logoUrl, overrideLogoUrl]);

  const initials = getChannelInitials(name);
  const palette = getCategoryPalette(category);

  // Sizing definitions
  const sizeClasses = {
    xs: 'w-6 h-6 text-[9px] rounded',
    sm: 'w-8 h-8 text-[10px] rounded-md',
    md: 'w-10 h-10 text-xs rounded-lg',
    lg: 'w-14 h-14 text-sm rounded-xl',
    xl: 'w-20 h-20 text-base rounded-2xl',
  }[size];

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  }[size];

  // If valid image URL exists and hasn't failed to load
  if (resolvedUrl && !imgError) {
    return (
      <div
        className={`relative shrink-0 flex items-center justify-center bg-[#090d16] p-1 overflow-hidden transition-transform duration-200 ${
          showBadgeBorder ? 'border border-white/10 shadow-sm' : ''
        } ${sizeClasses} ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={name}
          className="w-full h-full object-contain filter drop-shadow-sm select-none"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Deterministic SVG / Monogram Badge Fallback
  return (
    <div
      className={`relative shrink-0 flex flex-col items-center justify-center bg-gradient-to-br ${palette.bg} ${
        showBadgeBorder ? `border ${palette.border} shadow-sm` : ''
      } ${sizeClasses} ${className} select-none`}
      title={name}
    >
      <span className={`font-black tracking-wider uppercase ${palette.text} drop-shadow`}>
        {initials}
      </span>
      {size === 'lg' || size === 'xl' ? (
        <span className="text-[8px] font-mono text-slate-400 mt-0.5 opacity-80">HD</span>
      ) : null}
    </div>
  );
};

import React, { useState } from 'react';
import { Play, Star, Tv, Radio, Sparkles } from 'lucide-react';
import { Focusable } from './Focusable';
import { Badge } from './Badge';
import { SourceBadge } from './SourceBadge';
import { ChannelRowData } from './ChannelRow';
import { useDesignSystem, DensityMode } from '../context/DesignSystemContext';

interface ChannelCardProps {
  id?: string;
  channel: ChannelRowData;
  isActive?: boolean;
  isFocused?: boolean;
  disabled?: boolean;
  density?: DensityMode;
  aspectRatio?: '16:9' | '4:3' | 'poster';
  onSelect: (channel: ChannelRowData) => void;
  onToggleFavorite?: (channelId: string) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  id,
  channel,
  isActive = false,
  isFocused = false,
  disabled = false,
  density: densityProp,
  aspectRatio = '16:9',
  onSelect,
  onToggleFavorite,
}) => {
  const { density: contextDensity } = useDesignSystem();
  const density = densityProp || contextDensity || 'comfortable';
  const [imgError, setImgError] = useState(false);

  const ratioClass = {
    '16:9': 'aspect-video',
    '4:3': 'aspect-[4/3]',
    poster: 'aspect-[2/3]',
  }[aspectRatio];

  return (
    <Focusable
      id={id || `channel-card-${channel.id}`}
      isFocused={isFocused}
      disabled={disabled}
      onSelect={() => !disabled && onSelect(channel)}
      className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-200 select-none ${
        disabled
          ? 'opacity-40 cursor-not-allowed bg-slate-900/30 border-white/[0.04]'
          : isActive
          ? 'ring-2 ring-sky-400 bg-[#161e2c] border-sky-500/60 shadow-xl shadow-sky-950/40'
          : 'bg-[#111722] hover:bg-[#161e2c] border-white/[0.06] hover:border-white/[0.15] shadow-md shadow-black/40 hover:shadow-xl hover:shadow-black/60'
      }`}
    >
      {/* Media / Artwork Header */}
      <div className={`relative w-full ${ratioClass} bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center overflow-hidden p-4`}>
        {/* Subtle Backdrop Pattern */}
        <div className="absolute inset-0 bg-slate-900/60" />

        {/* Channel Logo */}
        {channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            onError={() => setImgError(true)}
            className="relative z-10 max-h-16 max-w-[80%] object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="relative z-10 flex flex-col items-center gap-1 text-slate-500">
            <Tv className="w-8 h-8 text-slate-600" />
            <span className="text-[10px] font-mono uppercase">{channel.name.slice(0, 10)}</span>
          </div>
        )}

        {/* Top Floating Badges */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-1">
            {isActive ? (
              <Badge variant="live" size="sm" pulse>PLAYING</Badge>
            ) : (
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-black/60 text-slate-300 rounded backdrop-blur-sm border border-white/10">
                CH {channel.channelNumber ?? '—'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {channel.is8k ? (
              <Badge variant="8k" size="sm" />
            ) : channel.is4k ? (
              <Badge variant="4k" size="sm" />
            ) : null}
            {channel.isHdr && <Badge variant="hdr" size="sm" />}
          </div>
        </div>

        {/* Hover / Focused Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 z-20">
          <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center shadow-lg shadow-sky-500/50 transform group-hover:scale-110 transition-transform">
            <Play className="w-5 h-5 fill-current ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Info Footer */}
      <div className="p-3 flex flex-col gap-1.5 flex-1 justify-between bg-[#111722]/90">
        <div>
          <div className="flex items-center justify-between gap-1">
            <h4 className="font-bold text-sm text-slate-100 group-hover:text-white truncate">
              {channel.name}
            </h4>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(channel.id);
                }}
                className={`p-1 rounded hover:bg-slate-800/80 transition-colors ${
                  channel.isFavorite ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
                }`}
                title={channel.isFavorite ? 'Favorited' : 'Favorite'}
              >
                <Star className={`w-3.5 h-3.5 ${channel.isFavorite ? 'fill-amber-400' : ''}`} />
              </button>
            )}
          </div>

          {channel.nowProgramme && (
            <p className="text-xs text-sky-300/90 truncate font-medium mt-0.5">
              {channel.nowProgramme.title}
            </p>
          )}
        </div>

        {channel.sourceName && (
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/[0.05]">
            <SourceBadge sourceName={channel.sourceName} sourceType={channel.sourceType} size="sm" />
            <span className="font-mono text-slate-500 text-[10px]">{channel.category || 'Live TV'}</span>
          </div>
        )}
      </div>
    </Focusable>
  );
};

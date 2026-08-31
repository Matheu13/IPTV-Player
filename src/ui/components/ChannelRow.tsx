import React, { useState } from 'react';
import { Play, Star, Tv, Radio } from 'lucide-react';
import { SourceBadge } from './SourceBadge';
import { Focusable } from './Focusable';
import { useDesignSystem, DensityMode } from '../context/DesignSystemContext';

export interface ChannelRowData {
  id: string;
  channelNumber?: number;
  name: string;
  logo?: string;
  category?: string;
  sourceId?: string;
  sourceName?: string;
  sourceType?: string;
  streamUrl: string;
  nowProgramme?: {
    title: string;
    start: string;
    stop: string;
    progressPercent?: number;
    description?: string;
  };
  nextProgramme?: {
    title: string;
    start: string;
    stop: string;
    description?: string;
  };
  resolution?: string;
  isHdr?: boolean;
  is8k?: boolean;
  is4k?: boolean;
  isFavorite?: boolean;
}

interface ChannelRowProps {
  id?: string;
  channel: ChannelRowData;
  isActive?: boolean;
  isFocused?: boolean;
  disabled?: boolean;
  density?: DensityMode;
  onSelect: (channel: ChannelRowData) => void;
  onToggleFavorite?: (channelId: string) => void;
  showEpgProgress?: boolean;
}

export const ChannelRow: React.FC<ChannelRowProps> = ({
  id,
  channel,
  isActive = false,
  isFocused = false,
  disabled = false,
  density: densityProp,
  onSelect,
  onToggleFavorite,
  showEpgProgress = true,
}) => {
  const { density: contextDensity } = useDesignSystem();
  const density = densityProp || contextDensity || 'comfortable';
  const [imgError, setImgError] = useState(false);

  const progress = channel.nowProgramme?.progressPercent ?? 42;

  // Density-specific style metrics
  const densityMetrics = {
    compact: {
      container: 'px-2 py-1.5 min-h-[38px] gap-2',
      logo: 'w-6 h-6 p-0.5 rounded',
      title: 'text-xs font-semibold',
      nowText: 'text-[11px] truncate',
      showNext: false,
      showSource: false,
      progressBarHeight: 'h-0.5',
    },
    comfortable: {
      container: 'px-3 py-2 min-h-[52px] gap-3',
      logo: 'w-9 h-9 p-1 rounded-md',
      title: 'text-sm font-bold',
      nowText: 'text-xs truncate',
      showNext: false,
      showSource: true,
      progressBarHeight: 'h-1',
    },
    spacious: {
      container: 'px-3.5 py-2.5 min-h-[68px] gap-3.5',
      logo: 'w-12 h-12 p-1.5 rounded-lg',
      title: 'text-base font-bold',
      nowText: 'text-xs truncate font-medium',
      showNext: true,
      showSource: true,
      progressBarHeight: 'h-1.5',
    },
  }[density];

  return (
    <Focusable
      id={id || `channel-row-${channel.id}`}
      isFocused={isFocused}
      disabled={disabled}
      onSelect={() => !disabled && onSelect(channel)}
      className={`group relative flex items-center rounded-lg border transition-all duration-150 select-none ${
        densityMetrics.container
      } ${
        disabled
          ? 'opacity-40 cursor-not-allowed bg-slate-900/30 border-white/[0.03] text-slate-500'
          : isActive
          ? 'bg-sky-950/40 border-sky-500/50 shadow-md shadow-sky-950/40 text-white'
          : 'bg-[#111722] hover:bg-[#161e2c] border-white/[0.06] hover:border-white/[0.12] text-slate-200'
      }`}
    >
      {/* Active Stream Indicator Strip */}
      {isActive && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-sky-400 rounded-r-full shadow-[0_0_8px_#38bdf8]" />
      )}

      {/* Channel Number */}
      <div className="w-7 shrink-0 text-center font-mono text-xs font-semibold text-slate-400 group-hover:text-slate-300">
        {channel.channelNumber ?? '—'}
      </div>

      {/* Channel Logo */}
      <div className={`${densityMetrics.logo} shrink-0 bg-slate-900/90 border border-slate-800 flex items-center justify-center overflow-hidden`}>
        {channel.logo && !imgError ? (
          <img
            src={channel.logo}
            alt={channel.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <Tv className="w-4 h-4 text-slate-500" />
        )}
      </div>

      {/* Main Channel & EPG Information */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`${densityMetrics.title} truncate tracking-tight text-slate-100 group-hover:text-white`}>
            {channel.name}
          </span>

          {/* Quality & HDR Badges */}
          {channel.is8k && (
            <span className="px-1.5 py-0.2 text-[9px] font-black tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/40 rounded">
              8K
            </span>
          )}
          {channel.is4k && !channel.is8k && (
            <span className="px-1.5 py-0.2 text-[9px] font-black tracking-wider text-sky-300 bg-sky-500/20 border border-sky-500/40 rounded">
              4K
            </span>
          )}
          {channel.isHdr && (
            <span className="px-1.5 py-0.2 text-[9px] font-black tracking-wider text-fuchsia-300 bg-fuchsia-500/20 border border-fuchsia-500/40 rounded">
              HDR
            </span>
          )}

          {/* Source Indicator (Comfortable and Spacious) */}
          {densityMetrics.showSource && channel.sourceName && (
            <SourceBadge
              sourceName={channel.sourceName}
              sourceType={channel.sourceType}
              size="sm"
              className="hidden md:inline-flex ml-auto shrink-0"
            />
          )}
        </div>

        {/* EPG Programme Information */}
        {channel.nowProgramme ? (
          <div className="flex flex-col gap-0.5 mt-0.5">
            <div className="flex items-center justify-between text-slate-300 gap-2">
              <span className={`${densityMetrics.nowText} text-sky-200/90 flex items-center gap-1.5`}>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <span className="truncate">{channel.nowProgramme.title}</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {channel.nowProgramme.start} - {channel.nowProgramme.stop}
              </span>
            </div>

            {/* EPG Live Progress Bar */}
            {showEpgProgress && (
              <div className={`w-full ${densityMetrics.progressBarHeight} bg-slate-800 rounded-full overflow-hidden`}>
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
              </div>
            )}

            {/* Next Programme (Spacious mode only) */}
            {densityMetrics.showNext && channel.nextProgramme && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <span className="truncate text-slate-400">
                  <span className="text-slate-500 mr-1">NEXT:</span>
                  {channel.nextProgramme.title}
                </span>
                <span className="font-mono text-[10px] text-slate-400 shrink-0">
                  {channel.nextProgramme.start}
                </span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 italic">Program guide unavailable</span>
        )}
      </div>

      {/* Action Buttons: Favorite & Play */}
      {!disabled && (
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {onToggleFavorite && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(channel.id);
              }}
              className={`p-1.5 rounded hover:bg-slate-800/80 transition-colors ${
                channel.isFavorite ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
              title={channel.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
            >
              <Star className={`w-3.5 h-3.5 ${channel.isFavorite ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          <div className="p-1.5 rounded bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors">
            <Play className="w-3.5 h-3.5 fill-current" />
          </div>
        </div>
      )}
    </Focusable>
  );
};

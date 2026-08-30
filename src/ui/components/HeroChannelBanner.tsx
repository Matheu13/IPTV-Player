import React from 'react';
import {
  Play,
  Star,
  Tv,
  Radio,
  Sliders,
  Volume2,
  Clock,
  Zap,
  Info,
  Flame,
} from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { SourceBadge } from './SourceBadge';
import { ChannelRowData } from './ChannelRow';

interface HeroChannelBannerProps {
  channel: ChannelRowData;
  onPlay: (channel: ChannelRowData) => void;
  onToggleFavorite?: (channelId: string) => void;
  onOpenSpecs?: (channel: ChannelRowData) => void;
  className?: string;
}

export const HeroChannelBanner: React.FC<HeroChannelBannerProps> = ({
  channel,
  onPlay,
  onToggleFavorite,
  onOpenSpecs,
  className = '',
}) => {
  const { nowProgramme, nextProgramme } = channel;

  return (
    <div
      id={`hero-banner-${channel.id}`}
      className={`relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0b0f17] select-none ${className}`}
    >
      {/* Cinematic Background Backdrop Image with Gradient Blends */}
      <div className="absolute inset-0 z-0">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover object-center filter blur-2xl opacity-20 scale-125"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-sky-950/40 via-indigo-950/20 to-slate-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-[#080b11]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080b11] via-[#080b11]/70 to-transparent" />
      </div>

      {/* Hero Content Body */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col justify-end min-h-[340px] sm:min-h-[380px] max-w-4xl space-y-4">
        {/* Top Channel Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="live" pulse>LIVE BROADCAST</Badge>
          {channel.is8k && <Badge variant="8k" />}
          {channel.is4k && <Badge variant="4k" />}
          {channel.isHdr && <Badge variant="hdr" />}
          <Badge variant="hevc" />
          <SourceBadge
            sourceName={channel.sourceName || 'Main Provider'}
            sourceType={channel.sourceType || 'xtream'}
          />
          {channel.category && (
            <span className="text-xs font-semibold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded border border-white/5">
              {channel.category}
            </span>
          )}
        </div>

        {/* Channel & Now Programme Title */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            {channel.channelNumber && (
              <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">
                CH {channel.channelNumber}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              {nowProgramme?.title || channel.name}
            </h1>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="font-semibold text-sky-300">{channel.name}</span>
            {nowProgramme && (
              <>
                <span className="text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {nowProgramme.start} - {nowProgramme.stop}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Live Broadcast Progress Bar */}
        {nowProgramme?.progressPercent !== undefined && (
          <div className="space-y-1.5 max-w-lg">
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
              <span>{nowProgramme.start}</span>
              <span className="text-sky-300 font-semibold">{nowProgramme.progressPercent}% elapsed</span>
              <span>{nowProgramme.stop}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, Math.max(0, nowProgramme.progressPercent))}%` }}
              />
            </div>
          </div>
        )}

        {/* Upcoming Next Preview */}
        {nextProgramme && (
          <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
            <span className="font-mono text-slate-500 uppercase tracking-wider text-[10px]">Up Next:</span>
            <span className="text-slate-300 font-medium">{nextProgramme.title}</span>
            <span className="font-mono text-slate-500 text-[11px]">({nextProgramme.start})</span>
          </div>
        )}

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            leftIcon={<Play className="w-5 h-5 fill-current" />}
            onClick={() => onPlay(channel)}
          >
            Watch Stream
          </Button>

          {onToggleFavorite && (
            <Button
              variant="secondary"
              size="lg"
              leftIcon={
                <Star
                  className={`w-4 h-4 ${
                    channel.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-400'
                  }`}
                />
              }
              onClick={() => onToggleFavorite(channel.id)}
            >
              {channel.isFavorite ? 'In Favorites' : 'Add to Favorites'}
            </Button>
          )}

          {onOpenSpecs && (
            <Button
              variant="ghost"
              size="lg"
              leftIcon={<Info className="w-4 h-4" />}
              onClick={() => onOpenSpecs(channel)}
            >
              Stream Telemetry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

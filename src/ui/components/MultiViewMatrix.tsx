import React, { useState } from 'react';
import {
  Grid,
  Maximize2,
  Volume2,
  VolumeX,
  Plus,
  Tv,
  X,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import { ChannelRowData } from './ChannelRow';
import { Badge } from './Badge';
import { Focusable } from './Focusable';

export type MultiViewLayout = '2x2' | '1+3' | '1+2' | '1x2';

interface MultiViewMatrixProps {
  id?: string;
  channels: ChannelRowData[];
  layout?: MultiViewLayout;
  onSelectMainChannel?: (channel: ChannelRowData) => void;
  className?: string;
}

export const MultiViewMatrix: React.FC<MultiViewMatrixProps> = ({
  id = 'multiview-matrix',
  channels,
  layout = '2x2',
  onSelectMainChannel,
  className = '',
}) => {
  const [activeLayout, setActiveLayout] = useState<MultiViewLayout>(layout);
  const [audioFocusIndex, setAudioFocusIndex] = useState<number>(0);

  // Take up to 4 streams
  const activeStreams = channels.slice(0, 4);

  const getGridClasses = () => {
    switch (activeLayout) {
      case '1x2':
        return 'grid grid-cols-1 md:grid-cols-2 gap-3';
      case '1+2':
        return 'grid grid-cols-1 md:grid-cols-3 gap-3';
      case '1+3':
        return 'grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-3';
      case '2x2':
      default:
        return 'grid grid-cols-1 sm:grid-cols-2 gap-3';
    }
  };

  return (
    <div id={id} className={`space-y-4 ${className}`}>
      {/* Matrix Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#111722] rounded-xl border border-white/10">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Multi-View Command Matrix
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            ({activeStreams.length} Active Feeds)
          </span>
        </div>

        {/* Layout Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(['2x2', '1+3', '1+2', '1x2'] as MultiViewLayout[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setActiveLayout(mode)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-colors ${
                activeLayout === mode
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Video Streams Grid */}
      <div className={getGridClasses()}>
        {activeStreams.map((ch, idx) => {
          const hasAudioFocus = audioFocusIndex === idx;
          const isPrimaryIn1Plus3 = activeLayout === '1+3' && idx === 0;

          return (
            <div
              key={`multiview-stream-${ch.id}-${idx}`}
              onClick={() => setAudioFocusIndex(idx)}
              className={`relative aspect-video rounded-xl overflow-hidden bg-slate-950 border transition-all cursor-pointer group select-none ${
                isPrimaryIn1Plus3 ? 'md:col-span-2 md:row-span-2' : ''
              } ${
                hasAudioFocus
                  ? 'border-sky-500 ring-2 ring-sky-500/30 shadow-xl'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              {/* Video Backdrop Simulation */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/40 flex items-center justify-center p-4">
                <div className="text-center space-y-2">
                  {ch.logo ? (
                    <img
                      src={ch.logo}
                      alt={ch.name}
                      className="max-h-10 max-w-[120px] object-contain drop-shadow-md mx-auto"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Tv className="w-8 h-8 text-sky-400 mx-auto" />
                  )}
                  <div className="text-xs font-bold text-white truncate max-w-[160px]">
                    {ch.name}
                  </div>
                  {ch.nowProgramme && (
                    <div className="text-[10px] text-slate-400 line-clamp-1">
                      {ch.nowProgramme.title}
                    </div>
                  )}
                </div>
              </div>

              {/* Stream Overlay HUD */}
              <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span className="text-[11px] font-mono font-bold text-white truncate">
                    CH {ch.channelNumber || idx + 1}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAudioFocusIndex(idx);
                    }}
                    className={`p-1 rounded transition-colors ${
                      hasAudioFocus
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'bg-black/60 text-slate-400 hover:text-white'
                    }`}
                    title={hasAudioFocus ? 'Audio Focused' : 'Mute / Switch Audio Focus'}
                  >
                    {hasAudioFocus ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>

                  {onSelectMainChannel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMainChannel(ch);
                      }}
                      className="p-1 rounded bg-black/60 text-slate-400 hover:text-white"
                      title="Fullscreen this feed"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom Stream Telemetry Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-[10px] font-mono z-20">
                <span className="text-sky-300">
                  {ch.is8k ? '8K UHD' : ch.is4k ? '4K 60FPS' : 'FHD 1080p'}
                </span>
                <span className="text-slate-400">
                  {hasAudioFocus ? 'Audio Active' : 'Muted'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

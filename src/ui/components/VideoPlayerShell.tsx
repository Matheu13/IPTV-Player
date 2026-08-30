import React, { useState, useEffect, useRef } from 'react';
import {
  Maximize2,
  Minimize2,
  X,
  Radio,
  Tv,
  Loader2,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { usePlayback, PlayerPresentationMode } from '../context/PlaybackContext';
import { PlayerControls } from './PlayerControls';
import { Badge } from './Badge';

interface VideoPlayerShellProps {
  id?: string;
  forceMode?: PlayerPresentationMode;
  className?: string;
  autoPlay?: boolean;
}

export const VideoPlayerShell: React.FC<VideoPlayerShellProps> = ({
  id = 'unified-video-player',
  forceMode,
  className = '',
}) => {
  const { state, stopPlayback, setPresentationMode, togglePlayPause } = usePlayback();
  const [isHovered, setIsHovered] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideControlsTimer = useRef<any>(null);

  const activeMode = forceMode || state.presentationMode;

  // Auto-hide controls during fullscreen/embedded playback
  const resetControlsTimer = () => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (state.isPlaying && !state.isBuffering) {
        setControlsVisible(false);
      }
    }, 3500);
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    };
  }, []);

  if (activeMode === 'hidden' || !state.currentChannel) {
    return null;
  }

  const { currentChannel } = state;

  // Mini-Player mode: Floating docked window in bottom right
  if (activeMode === 'mini_player') {
    return (
      <div
        id="mini-player-floating-dock"
        className="fixed bottom-6 right-6 w-80 sm:w-96 aspect-video bg-black/95 border-2 border-sky-500/80 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col group animate-in slide-in-from-bottom-5 duration-200"
      >
        {/* Top Mini Bar */}
        <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold text-white truncate">
              {currentChannel.name}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPresentationMode('fullscreen')}
              className="p-1 rounded bg-black/50 hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Expand to Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setPresentationMode('embedded')}
              className="p-1 rounded bg-black/50 hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Return to Live Screen"
            >
              <Tv className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={stopPlayback}
              className="p-1 rounded bg-black/50 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200"
              title="Stop Stream"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video Canvas Simulation */}
        <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/40" />

          {/* Channel Brand Animation Canvas */}
          <div className="relative z-10 flex flex-col items-center gap-2 text-center p-4">
            {currentChannel.logo ? (
              <img
                src={currentChannel.logo}
                alt={currentChannel.name}
                className="max-h-12 object-contain drop-shadow-md"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Tv className="w-8 h-8 text-sky-400" />
            )}
            <span className="text-xs text-sky-200/90 font-medium line-clamp-1">
              {currentChannel.nowProgramme?.title || 'Live Broadcast Stream'}
            </span>
          </div>

          {state.isBuffering && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
              <Loader2 className="w-6 h-6 text-sky-400 animate-spin" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fullscreen Mode
  if (activeMode === 'fullscreen') {
    return (
      <div
        id="fullscreen-video-shell"
        onMouseMove={resetControlsTimer}
        className="fixed inset-0 w-screen h-screen bg-black z-50 flex items-center justify-center select-none overflow-hidden"
      >
        {/* Fullscreen Video Element */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950" />

          <div className="relative z-10 flex flex-col items-center gap-4 text-center">
            {currentChannel.logo ? (
              <img
                src={currentChannel.logo}
                alt={currentChannel.name}
                className="max-h-24 max-w-xs object-contain drop-shadow-2xl"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Tv className="w-16 h-16 text-sky-400" />
            )}
            <h2 className="text-2xl font-black tracking-tight text-white">{currentChannel.name}</h2>
            <div className="flex items-center gap-2">
              <Badge variant="live" pulse />
              <Badge variant="4k" />
              <Badge variant="hdr" />
            </div>
          </div>

          {/* OSD Controls */}
          <PlayerControls
            showControls={controlsVisible}
            isFullscreen
            onToggleFullscreen={() => setPresentationMode('embedded')}
          />
        </div>
      </div>
    );
  }

  // Embedded Standard Mode
  return (
    <div
      id={id}
      onMouseEnter={() => {
        setIsHovered(true);
        resetControlsTimer();
      }}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={resetControlsTimer}
      className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl group select-none ${className}`}
    >
      {/* Video Content Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="relative z-10 flex flex-col items-center gap-2 text-center p-6">
          {currentChannel.logo ? (
            <img
              src={currentChannel.logo}
              alt={currentChannel.name}
              className="max-h-16 max-w-[200px] object-contain drop-shadow-xl"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Tv className="w-12 h-12 text-sky-400" />
          )}
          <h3 className="text-base font-extrabold text-white tracking-tight">{currentChannel.name}</h3>
          {currentChannel.nowProgramme && (
            <p className="text-xs text-sky-300 font-medium max-w-sm line-clamp-1">
              {currentChannel.nowProgramme.title}
            </p>
          )}
        </div>

        {/* Buffering Indicator */}
        {state.isBuffering && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 z-20 backdrop-blur-xs">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <span className="text-xs font-mono text-slate-300">Synchronizing Hardware Pipeline...</span>
          </div>
        )}
      </div>

      {/* Interactive OSD Controls */}
      <PlayerControls
        showControls={isHovered || controlsVisible || !state.isPlaying}
        isFullscreen={false}
        onToggleFullscreen={() => setPresentationMode('fullscreen')}
      />
    </div>
  );
};

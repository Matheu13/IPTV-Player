import React, { useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings,
  Tv,
  Subtitles,
  AudioLines,
  Info,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';
import { usePlayback } from '../context/PlaybackContext';
import { Badge } from './Badge';
import { Button } from './Button';

interface PlayerControlsProps {
  showControls: boolean;
  isLive?: boolean;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  showControls,
  isLive = true,
  onToggleFullscreen,
  isFullscreen = false,
}) => {
  const {
    state,
    togglePlayPause,
    setVolume,
    toggleMute,
    setQuality,
    setAudioTrack,
    setSubtitleTrack,
    setPresentationMode,
  } = usePlayback();

  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showStatsOsd, setShowStatsOsd] = useState(false);

  if (!showControls && !showSettingsMenu && !showStatsOsd) {
    return null;
  }

  const { currentChannel } = state;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-30 transition-opacity duration-200">
      {/* Top Header OSD */}
      <div className="pointer-events-auto flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent p-3 -m-4 mb-0 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-xs font-black tracking-widest text-rose-400 uppercase font-mono">LIVE</span>
          </div>

          <div className="h-4 w-[1px] bg-white/20" />

          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              {currentChannel?.name || 'Live Transmission'}
              {currentChannel?.is8k && <Badge variant="8k" size="sm" />}
              {currentChannel?.is4k && !currentChannel?.is8k && <Badge variant="4k" size="sm" />}
              {currentChannel?.isHdr && <Badge variant="hdr" size="sm" />}
            </h3>
            {currentChannel?.nowProgramme && (
              <p className="text-xs text-sky-300 font-medium">
                {currentChannel.nowProgramme.title} ({currentChannel.nowProgramme.start} - {currentChannel.nowProgramme.stop})
              </p>
            )}
          </div>
        </div>

        {/* Top Actions: Stats Toggle & Mini-Player Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowStatsOsd(!showStatsOsd)}
            className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
              showStatsOsd
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
            title="Toggle Stream Telemetry"
          >
            <Info className="w-3.5 h-3.5 inline mr-1" />
            <span>STATS</span>
          </button>

          {!isFullscreen && (
            <button
              type="button"
              onClick={() => setPresentationMode('mini_player')}
              className="px-2.5 py-1 text-xs font-medium rounded bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
              title="Switch to Mini-Player (Keep audio/video active while browsing)"
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Mini-Player</span>
            </button>
          )}
        </div>
      </div>

      {/* Stream Stats Overlay (On Demand) */}
      {showStatsOsd && (
        <div className="pointer-events-auto self-start bg-slate-950/90 border border-sky-500/30 rounded-lg p-3 text-[11px] font-mono text-slate-300 backdrop-blur-md shadow-2xl space-y-1 max-w-sm">
          <div className="text-sky-400 font-bold border-b border-white/10 pb-1 flex justify-between">
            <span>PIPELINE TELEMETRY</span>
            <span className="text-emerald-400">HARDWARE SYNC</span>
          </div>
          <div className="flex justify-between"><span className="text-slate-400">Resolution:</span> <span className="text-white">{state.stats.resolution} @ {state.stats.fps}fps</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Stream Bitrate:</span> <span className="text-white">{state.stats.bitrateMbps} Mbps</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Buffer Health:</span> <span className="text-emerald-400">{state.stats.bufferHealthSec}s (Stable)</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Decoder Pipeline:</span> <span className="text-white">{state.stats.activeDecoder}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Dropped Frames:</span> <span className="text-slate-400">{state.stats.droppedFrames} (0.00%)</span></div>
        </div>
      )}

      {/* Bottom Controls Bar */}
      <div className="pointer-events-auto bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 -m-4 mt-0 rounded-b-xl flex flex-col gap-2">
        {/* Live Progress / Buffer Health Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-800/90 rounded-full overflow-hidden relative cursor-pointer group">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-400 rounded-full"
              style={{ width: `${currentChannel?.nowProgramme?.progressPercent ?? 45}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            LIVE BROADCAST
          </span>
        </div>

        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Play/Pause, Volume */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayPause}
              className="w-9 h-9 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center justify-center transition-colors shadow-md shadow-sky-500/20"
              title={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <div className="flex items-center gap-1 bg-slate-900/80 border border-slate-700/80 rounded-lg p-1">
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 rounded text-slate-300 hover:text-white"
                title={state.isMuted ? 'Unmute' : 'Mute'}
              >
                {state.isMuted || state.volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={state.isMuted ? 0 : state.volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-16 h-1 accent-sky-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Right: Audio Tracks, Subtitles, Quality, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Audio Track Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                className="px-2 py-1 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono flex items-center gap-1"
                title="Audio Tracks & Quality"
              >
                <AudioLines className="w-3.5 h-3.5 text-sky-400" />
                <span>{state.quality.toUpperCase()}</span>
              </button>

              {/* Quick Settings Dropdown */}
              {showSettingsMenu && (
                <div className="absolute right-0 bottom-full mb-2 w-56 bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md z-40 text-xs flex flex-col gap-2">
                  <div className="font-bold text-sky-300 pb-1 border-b border-white/10">STREAM CONFIG</div>
                  
                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Quality Profile</label>
                    <div className="grid grid-cols-3 gap-1">
                      {(['auto', '4k', '1080p', '720p'] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => setQuality(q)}
                          className={`py-1 text-[11px] font-mono rounded border ${
                            state.quality === q
                              ? 'bg-sky-500 text-slate-950 font-bold border-sky-400'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {q.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Audio Track</label>
                    <select
                      value={state.activeAudioTrack}
                      onChange={(e) => setAudioTrack(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200 text-xs"
                    >
                      {state.audioTracks.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-mono text-slate-400 block mb-1">Subtitles</label>
                    <select
                      value={state.activeSubtitleTrack}
                      onChange={(e) => setSubtitleTrack(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-slate-200 text-xs"
                    >
                      {state.subtitleTracks.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Button */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-colors"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

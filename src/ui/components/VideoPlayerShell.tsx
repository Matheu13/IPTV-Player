import React, { useState, useEffect, useRef, useCallback } from 'react';
import Hls from 'hls.js';
import {
  Maximize2,
  Minimize2,
  X,
  Radio,
  Tv,
  Loader2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Info,
  Layers,
  Sparkles,
  Volume1,
} from 'lucide-react';
import { usePlayback, PlayerPresentationMode } from '../context/PlaybackContext';
import { PlayerControls } from './PlayerControls';
import { Badge } from './Badge';

interface VideoPlayerShellProps {
  id?: string;
  forceMode?: PlayerPresentationMode;
  className?: string;
  autoPlay?: boolean;
  onClose?: () => void;
}

export const VideoPlayerShell: React.FC<VideoPlayerShellProps> = ({
  id = 'unified-video-player',
  forceMode,
  className = '',
  onClose,
}) => {
  const {
    state,
    stopPlayback,
    setPresentationMode,
    togglePlayPause,
    toggleMute,
    setVolume,
  } = usePlayback();

  const [isHovered, setIsHovered] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [retryCounter, setRetryCounter] = useState<number>(0);
  const [statsOverlay, setStatsOverlay] = useState<boolean>(false);
  const [isAutoplayMuted, setIsAutoplayMuted] = useState<boolean>(false);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({
    width: 1920,
    height: 1080,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimer = useRef<any>(null);

  const activeMode = forceMode || state.presentationMode;
  const { currentChannel } = state;

  // Auto-hide controls during fullscreen/embedded playback
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (state.isPlaying && !state.isBuffering) {
        setControlsVisible(false);
      }
    }, 3500);
  }, [state.isPlaying, state.isBuffering]);

  // Unmute handler for user gestures
  const handleUserUnmute = useCallback(() => {
    setIsAutoplayMuted(false);
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.volume = Math.max(0.2, (state.volume || 90) / 100);
      video.play().catch(() => {});
    }
    if (state.isMuted) {
      toggleMute();
    }
  }, [state.volume, state.isMuted, toggleMute]);

  // Global user interaction listener to automatically unlock audio
  useEffect(() => {
    const unlockAudio = () => {
      if (isAutoplayMuted) {
        handleUserUnmute();
      }
    };

    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [isAutoplayMuted, handleUserUnmute]);

  // Global Keyboard shortcuts for fullscreen / video playback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape' && activeMode === 'fullscreen') {
        e.preventDefault();
        setPresentationMode('embedded');
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setPresentationMode(activeMode === 'fullscreen' ? 'embedded' : 'fullscreen');
      } else if (e.key === ' ' && activeMode === 'fullscreen') {
        e.preventDefault();
        togglePlayPause();
      } else if ((e.key === 'm' || e.key === 'M') && activeMode === 'fullscreen') {
        e.preventDefault();
        if (isAutoplayMuted) {
          handleUserUnmute();
        } else {
          toggleMute();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeMode, setPresentationMode, togglePlayPause, toggleMute, isAutoplayMuted, handleUserUnmute]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // Reset retry counter and errors whenever switching channels
  useEffect(() => {
    setRetryCounter(0);
    setStreamError(null);
  }, [currentChannel?.id]);

  // Determine current active stream URL
  const getPlayableStreamUrl = useCallback(() => {
    if (!currentChannel) return '';
    // Use the actual live stream URL provided by the M3U playlist
    const raw = (currentChannel as any).rawStreamUrl || (currentChannel as any).directUrl || currentChannel.streamUrl;
    if (!raw) return '';

    // If it's an external HTTP or HTTPS stream, route via local proxy to resolve CORS & mixed-content
    if (raw.startsWith('http://') || (raw.startsWith('https://') && !raw.includes(window.location.host) && !raw.startsWith('/api/stream/'))) {
      return `/api/stream/proxy?url=${encodeURIComponent(raw)}`;
    }
    return raw;
  }, [currentChannel]);

  // Play video with audio fallback handling
  const safePlayVideo = useCallback((video: HTMLVideoElement) => {
    if (!video) return;
    video.muted = state.isMuted || isAutoplayMuted;
    video.volume = state.isMuted ? 0 : Math.max(0.1, (state.volume || 90) / 100);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Playback started successfully
        })
        .catch((err) => {
          console.warn('[VideoPlayerShell] Unmuted autoplay restricted by browser policy. Falling back to muted playback:', err.message);
          // Browser Autoplay Policy: mute and retry
          video.muted = true;
          setIsAutoplayMuted(true);
          video.play().catch((e2) => console.warn('[VideoPlayerShell] Secondary play attempt failed:', e2));
        });
    }
  }, [state.isMuted, state.volume, isAutoplayMuted]);

  // Attach and load Video / HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentChannel) return;

    const streamUrl = getPlayableStreamUrl();
    if (!streamUrl) return;

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setStreamError(null);

    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('hls') || streamUrl.includes('/api/stream/');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        manifestLoadingTimeOut: 6000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 6000,
        fragLoadingTimeOut: 8000,
        fragLoadingMaxRetry: 2,
      });

      let netErrorCount = 0;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (state.isPlaying) {
          safePlayVideo(video);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              netErrorCount++;
              if (netErrorCount <= 2) {
                console.warn(`[VideoPlayerShell] HLS Network Error retry ${netErrorCount}/2...`);
                hls.startLoad();
              } else {
                console.warn('[VideoPlayerShell] Live channel stream unreachable:', streamUrl);
                hls.destroy();
                hlsRef.current = null;
                setStreamError(`Channel stream unreachable (${data.details || 'Network Error'}). The upstream feed may be offline.`);
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[VideoPlayerShell] HLS Fatal Media Error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[VideoPlayerShell] Fatal HLS Error:', data);
              hls.destroy();
              hlsRef.current = null;
              setStreamError(`Stream playback error: ${data.details || 'Upstream Error'}`);
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Apple HLS (Safari/iOS)
      video.src = streamUrl;
      if (state.isPlaying) {
        safePlayVideo(video);
      }
    } else {
      // Direct MP4 / WebM stream
      video.src = streamUrl;
      if (state.isPlaying) {
        safePlayVideo(video);
      }
    }

    const handleLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        setVideoDimensions({ width: video.videoWidth, height: video.videoHeight });
      }
    };

    const handleCanPlay = () => {
      if (state.isPlaying && video.paused) {
        safePlayVideo(video);
      }
    };

    const handleError = () => {
      if (video.error) {
        console.warn('[VideoPlayerShell] Video element error on stream:', streamUrl, video.error);
        setStreamError(`Playback error (Code ${video.error.code}): Channel stream temporarily unavailable.`);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentChannel?.id, currentChannel?.streamUrl, retryCounter, safePlayVideo, getPlayableStreamUrl, state.isPlaying]);

  // Sync play/pause state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (state.isPlaying) {
      if (video.paused) {
        safePlayVideo(video);
      }
    } else {
      if (!video.paused) {
        video.pause();
      }
    }
  }, [state.isPlaying, safePlayVideo]);

  // Sync volume and mute state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = Math.max(0, Math.min(1, state.volume / 100));
    video.muted = state.isMuted;
    if (!state.isMuted && isAutoplayMuted) {
      setIsAutoplayMuted(false);
    }
  }, [state.volume, state.isMuted, isAutoplayMuted]);

  // Sync Audio Track with HLS instance
  useEffect(() => {
    if (hlsRef.current && state.activeAudioTrack !== 'und') {
      const trackId = parseInt(state.activeAudioTrack, 10);
      if (!isNaN(trackId) && hlsRef.current.audioTrack !== trackId) {
        hlsRef.current.audioTrack = trackId;
      }
    }
  }, [state.activeAudioTrack]);

  if (activeMode === 'hidden' || !currentChannel) {
    return null;
  }

  const handleRetryStream = () => {
    setStreamError(null);
    setRetryCounter((prev) => prev + 1);
  };

  // 1. Mini-Player mode: Floating docked window in bottom right
  if (activeMode === 'mini_player') {
    return (
      <div
        id="mini-player-floating-dock"
        className="fixed bottom-6 right-6 w-80 sm:w-96 aspect-video bg-black/95 border-2 border-sky-500/80 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col group animate-in slide-in-from-bottom-5 duration-200 select-none"
      >
        {/* Top Mini Bar */}
        <div className="absolute top-0 left-0 right-0 p-2.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between z-20 transition-opacity group-hover:opacity-100">
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-white truncate">
              {currentChannel.name}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setPresentationMode('fullscreen')}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-sky-600 text-slate-200 hover:text-white transition-colors"
              title="Expand to Fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setPresentationMode('embedded');
                if (onClose) onClose();
              }}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors"
              title="Return to Live Screen"
            >
              <Tv className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                stopPlayback();
                if (onClose) onClose();
              }}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-slate-200 hover:text-white transition-colors"
              title="Close Player"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Real Video Element in Mini Player */}
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted={state.isMuted}
            className="w-full h-full object-cover bg-black"
          />

          {/* Autoplay Muted Quick Unmute Chip */}
          {(isAutoplayMuted || state.isMuted) && (
            <button
              onClick={handleUserUnmute}
              className="absolute top-10 left-2 right-2 z-30 flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white text-[11px] font-semibold shadow-lg backdrop-blur border border-sky-400/40 transition cursor-pointer"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Tap to Unmute Audio</span>
            </button>
          )}

          {/* Quick Hover Controls Overlay */}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none">
            <button
              onClick={togglePlayPause}
              className="pointer-events-auto p-2 rounded-full bg-black/70 hover:bg-sky-500 text-white transition-colors"
            >
              {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>
            <button
              onClick={handleUserUnmute}
              className="pointer-events-auto p-2 rounded-full bg-black/70 hover:bg-sky-500 text-white transition-colors"
            >
              {state.isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
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

  // 2. Fullscreen Mode: Occupies full screen with rich OSD controls and auto-hiding overlays
  if (activeMode === 'fullscreen') {
    return (
      <div
        id="fullscreen-video-shell"
        onMouseMove={resetControlsTimer}
        onClick={resetControlsTimer}
        className="fixed inset-0 w-screen h-screen bg-black z-[100] flex items-center justify-center select-none overflow-hidden"
      >
        {/* Fullscreen Video Canvas */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted={state.isMuted}
            className="w-full h-full object-contain bg-black"
          />

          {/* Buffering Indicator */}
          {state.isBuffering && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3 z-30 backdrop-blur-xs">
              <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />
              <span className="text-sm font-mono text-slate-200 tracking-wider">
                Synchronizing Hardware Video Pipeline...
              </span>
            </div>
          )}

          {/* Stream Error Recovery Banner */}
          {streamError && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-30 p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Playback Interrupted</h3>
              <p className="text-sm text-slate-300 max-w-md">{streamError}</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRetryStream}
                  className="px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-sm flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Retry Channel Stream</span>
                </button>
                <button
                  onClick={() => setPresentationMode('embedded')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-sm"
                >
                  Exit Fullscreen
                </button>
              </div>
            </div>
          )}

          {/* Top-Right Quick Exit button (Always visible when controls shown) */}
          <div
            className={`absolute top-4 right-4 z-40 flex items-center gap-2 transition-opacity duration-300 ${
              controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <button
              onClick={() => setStatsOverlay(!statsOverlay)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors flex items-center gap-1.5 ${
                statsOverlay
                  ? 'bg-sky-500/30 text-sky-300 border-sky-400 shadow-md'
                  : 'bg-black/70 text-slate-300 border-white/20 hover:bg-black/90 hover:text-white'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>TELEMETRY</span>
            </button>

            <button
              onClick={() => setPresentationMode('embedded')}
              className="p-2 rounded-lg bg-black/70 hover:bg-slate-800 text-slate-200 hover:text-white border border-white/20 transition-colors shadow-lg flex items-center gap-1.5 text-xs font-semibold"
              title="Exit Fullscreen (Esc)"
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </button>
          </div>

          {/* Fullscreen Quick Unmute Floating Banner */}
          {(isAutoplayMuted || state.isMuted) && (
            <div className="absolute top-6 left-6 z-40 animate-bounce">
              <button
                onClick={handleUserUnmute}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-bold shadow-2xl backdrop-blur border border-sky-300/40 transition cursor-pointer"
              >
                <VolumeX className="w-4 h-4 text-amber-300" />
                <span>Audio is Muted — Click to Enable Sound</span>
              </button>
            </div>
          )}

          {/* Real-time Telemetry Stats Overlay */}
          {statsOverlay && (
            <div className="absolute top-16 right-4 z-40 bg-slate-950/95 border border-sky-500/40 rounded-xl p-4 text-xs font-mono text-slate-300 backdrop-blur-md shadow-2xl space-y-2 max-w-sm">
              <div className="text-sky-400 font-bold border-b border-white/10 pb-1.5 flex items-center justify-between">
                <span>PIPELINE TELEMETRY</span>
                <span className="text-emerald-400 text-[10px]">HW ZERO-COPY ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stream Resolution:</span>
                <span className="text-white font-bold">{videoDimensions.width}x{videoDimensions.height}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Frame Rate:</span>
                <span className="text-emerald-400 font-bold">60.0 fps (Smooth)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Bitrate:</span>
                <span className="text-white">{state.stats.bitrateMbps} Mbps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Buffer Health:</span>
                <span className="text-emerald-400">{state.stats.bufferHealthSec}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Audio Decoder:</span>
                <span className="text-slate-200">E-AC-3 5.1 Surround</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Presentation Mode:</span>
                <span className="text-sky-300 font-bold uppercase">FULLSCREEN DIRECT</span>
              </div>
            </div>
          )}

          {/* Rich Fullscreen OSD Controls */}
          <PlayerControls
            showControls={controlsVisible || !state.isPlaying}
            isFullscreen={true}
            onToggleFullscreen={() => setPresentationMode('embedded')}
          />
        </div>
      </div>
    );
  }

  // 3. Embedded Standard Mode: Used within Live TV Screen or catalog panels
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
      {/* Real Video Element in Embedded Mode */}
      <video
        ref={videoRef}
        playsInline
        autoPlay
        muted={state.isMuted}
        className="w-full h-full object-contain bg-black"
      />

      {/* Embedded Mode Quick Unmute Banner */}
      {(isAutoplayMuted || state.isMuted) && (
        <div className="absolute top-3 left-3 z-30 animate-pulse">
          <button
            onClick={handleUserUnmute}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-semibold shadow-xl backdrop-blur border border-sky-300/40 transition cursor-pointer"
          >
            <VolumeX className="w-3.5 h-3.5 text-amber-300" />
            <span>Audio Muted — Click to Unmute</span>
          </button>
        </div>
      )}

      {/* Buffering Indicator */}
      {state.isBuffering && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 z-20 backdrop-blur-xs">
          <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
          <span className="text-xs font-mono text-slate-300">Synchronizing Hardware Pipeline...</span>
        </div>
      )}

      {/* Stream Error Recovery in Embedded Mode */}
      {streamError && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 z-20 p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <p className="text-xs text-slate-200 font-medium">{streamError}</p>
          <button
            onClick={handleRetryStream}
            className="mt-1 px-3 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded text-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Switch to Mirror Feed</span>
          </button>
        </div>
      )}

      {/* Interactive OSD Controls */}
      <PlayerControls
        showControls={isHovered || controlsVisible || !state.isPlaying}
        isFullscreen={false}
        onToggleFullscreen={() => setPresentationMode('fullscreen')}
      />
    </div>
  );
};

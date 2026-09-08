import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Maximize2,
  Sliders,
  AlertCircle,
  Loader2,
  X,
  Radio,
  Tv,
} from 'lucide-react';
import Hls from 'hls.js';

export interface M3uLivePreviewProps {
  streamUrl: string;
  channelName?: string;
  onInspect?: () => void;
  onClose?: () => void;
  className?: string;
}

export const M3uLivePreview: React.FC<M3uLivePreviewProps> = ({
  streamUrl,
  channelName = 'Selected M3U Stream',
  onInspect,
  onClose,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  // Compute proxied URL to avoid CORS and mixed-content issues
  const getPlayableUrl = useCallback((url: string) => {
    if (!url) return '';
    if (url.startsWith('/api/stream/')) return url;
    return `/api/stream/proxy?url=${encodeURIComponent(url)}`;
  }, []);

  const safePlay = useCallback((video: HTMLVideoElement) => {
    if (!video) return;
    video.muted = isMuted;
    const p = video.play();
    if (p !== undefined) {
      p.then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      }).catch((err: any) => {
        if (err?.name === 'AbortError' || String(err?.message || '').includes('interrupted')) {
          return;
        }
        if (err?.name === 'NotAllowedError') {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
          return;
        }
        console.warn('[M3uLivePreview] Play caught:', err?.message);
      });
    }
  }, [isMuted]);

  const safePlayRef = useRef(safePlay);
  safePlayRef.current = safePlay;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setIsLoading(true);
    setStreamError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const playable = getPlayableUrl(streamUrl);
    const isHls = playable.includes('.m3u8') || playable.includes('/api/stream/');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingTimeOut: 6000,
        levelLoadingTimeOut: 6000,
      });

      hls.loadSource(playable);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        safePlayRef.current(video);
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_e, data) => {
        const details = data.details;
        if (video.videoWidth && video.videoHeight) {
          setResolution(`${video.videoWidth}x${video.videoHeight}`);
        } else if (details.totalduration) {
          setResolution('1080p Live');
        }
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) {
          console.warn('[M3uLivePreview] HLS error:', data.type);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setStreamError('Network error connecting to stream source');
          } else {
            setStreamError('Stream format parsing failed');
          }
          setIsLoading(false);
        }
      });

      hlsRef.current = hls;
    } else {
      video.src = playable;
      safePlayRef.current(video);
    }

    const handleLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        setResolution(`${video.videoWidth}x${video.videoHeight}`);
      }
      setIsLoading(false);
    };

    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, retryKey, getPlayableUrl]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      safePlay(video);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleRetry = () => {
    setRetryKey((k) => k + 1);
  };

  return (
    <div
      id="m3u-live-preview-container"
      className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col ${className}`}
    >
      {/* Header bar */}
      <div className="bg-slate-950 px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 truncate">{channelName}</span>
          <span className="text-[10px] font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 px-1.5 py-0.2 rounded font-bold shrink-0">
            M3U PREVIEW
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onInspect && (
            <button
              onClick={onInspect}
              className="flex items-center gap-1 px-2 py-1 bg-indigo-600/80 hover:bg-indigo-500 text-white rounded text-[11px] font-medium transition cursor-pointer"
              title="Inspect Codec & Frame Grab"
            >
              <Sliders className="w-3 h-3" />
              <span>Inspect</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Video Viewport / 16:9 Container */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group">
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted={isMuted}
          className="w-full h-full object-contain bg-black"
        />

        {/* Top Badges */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 pointer-events-none">
          <span className="flex items-center gap-1 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            LIVE
          </span>
          {resolution && (
            <span className="bg-black/70 border border-white/10 text-cyan-300 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded">
              {resolution}
            </span>
          )}
        </div>

        {/* Loading Spinner State */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 z-20 backdrop-blur-xs">
            <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
            <span className="text-[11px] font-mono text-slate-300 tracking-wide">
              Connecting to M3U Stream Pipeline...
            </span>
          </div>
        )}

        {/* Stream Error Overlay */}
        {streamError && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center gap-2.5 z-30 p-4 text-center">
            <AlertCircle className="w-7 h-7 text-amber-400" />
            <span className="text-xs text-slate-200 font-medium">{streamError}</span>
            <button
              onClick={handleRetry}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry Stream</span>
            </button>
          </div>
        )}

        {/* Quick Unmute Chip if muted */}
        {isMuted && !isLoading && !streamError && (
          <button
            onClick={toggleMute}
            className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded bg-black/75 hover:bg-cyan-600 text-slate-200 hover:text-white text-[10px] font-medium border border-white/15 backdrop-blur transition cursor-pointer"
          >
            <VolumeX className="w-3 h-3 text-amber-400" />
            <span>Unmute</span>
          </button>
        )}

        {/* Controls Overlay Bar */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 pt-6 flex items-center justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlayPause}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            </button>
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-amber-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleRetry}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              title="Reload Stream"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">
              {isPlaying ? 'Streaming active' : 'Paused'}
            </span>
          </div>
        </div>
      </div>

      {/* Stream URL footer label */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span className="truncate max-w-[280px]" title={streamUrl}>
          {streamUrl}
        </span>
        <span className="text-emerald-400 font-bold shrink-0">HLS/HTTP PROXIED</span>
      </div>
    </div>
  );
};

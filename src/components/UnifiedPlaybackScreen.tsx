import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { UnifiedChannel, StreamVariant } from '../lib/unifiedIptvEngine';
import { LazyChannelLogo } from './LazyChannelLogo';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  SkipBack,
  SkipForward,
  Star,
  Activity,
  Tv,
  RotateCcw,
  AlertCircle,
  ShieldAlert,
  Sliders,
  Check,
  Zap,
  Info,
  ChevronDown,
  X,
} from 'lucide-react';

interface UnifiedPlaybackScreenProps {
  channel: UnifiedChannel;
  onToggleFavorite: (channelId: string) => void;
  onPrevChannel: () => void;
  onNextChannel: () => void;
  onOpenDiagnostics: () => void;
}

export const UnifiedPlaybackScreen: React.FC<UnifiedPlaybackScreenProps> = ({
  channel,
  onToggleFavorite,
  onPrevChannel,
  onNextChannel,
  onOpenDiagnostics,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(85);
  const [showOsd, setShowOsd] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '21:9' | '4:3'>('16:9');
  const [epgProgressPct, setEpgProgressPct] = useState(42);
  const [streamHealth, setStreamHealth] = useState<'EXCELLENT' | 'GOOD' | 'BUFFERING' | 'FAILOVER' | 'ERROR'>('BUFFERING');
  const [liveBitrate, setLiveBitrate] = useState(channel.bitrateMbps);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  // Failover mechanism state
  const [activeStreamUrl, setActiveStreamUrl] = useState<string>(channel.streamUrl);
  const [activeStreamIndex, setActiveStreamIndex] = useState<number>(0);
  const [isFailoverActive, setIsFailoverActive] = useState<boolean>(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState<boolean>(false);
  const [failoverReason, setFailoverReason] = useState<string | null>(null);
  const [failoverTimestamp, setFailoverTimestamp] = useState<string | null>(null);
  const [failoverHistory, setFailoverHistory] = useState<{ timestamp: string; from: string; to: string; reason: string }[]>([]);

  // Adaptive streaming & quality state (Requirement 25)
  const [availableLevels, setAvailableLevels] = useState<StreamVariant[]>(channel.variants || []);
  const [selectedQualityIndex, setSelectedQualityIndex] = useState<number>(-1); // -1 = Auto (Highest sustainable)
  const [currentRenderedLevel, setCurrentRenderedLevel] = useState<string>(channel.resolution);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [detectedDimensions, setDetectedDimensions] = useState<{ width: number; height: number }>({ width: 1920, height: 1080 });
  const [detectedCodec, setDetectedCodec] = useState<string>(`${channel.videoCodec} / ${channel.audioCodec}`);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const osdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const bannerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to ensure streams avoid Mixed Content and CORS issues
  const resolveProxiedUrl = (url: string | undefined): string => {
    if (!url) return '';
    if (url.startsWith('/api/') || url.startsWith('blob:')) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const isPublicCors = url.includes('mux.dev') || url.includes('akamaihd.net') || url.includes('googleapis.com');
      if (!isPublicCors || url.startsWith('http://')) {
        return `/api/stream/proxy?url=${encodeURIComponent(url)}`;
      }
    }
    return url;
  };

  // Initialize or reset active stream on channel switch
  useEffect(() => {
    setActiveStreamUrl(channel.streamUrl);
    setActiveStreamIndex(0);
    setIsFailoverActive(false);
    setIsBannerDismissed(false);
    setFailoverReason(null);
    setPlaybackError(null);
    setSelectedQualityIndex(-1);
    setAvailableLevels(channel.variants || []);
    setCurrentRenderedLevel(channel.resolution);
  }, [channel.id, channel.streamUrl]);

  // Execute failover switch to next available alternative stream URL
  const performFailover = (reason: string = 'HTTP 404 / 403 Forbidden error on primary feed') => {
    const allStreams = [channel.streamUrl, ...(channel.alternativeStreamUrls || [])];
    const nextIdx = (activeStreamIndex + 1) % allStreams.length;
    const nextUrl = allStreams[nextIdx];
    const timestamp = new Date().toLocaleTimeString();

    setFailoverHistory((prev) => [
      ...prev.slice(-4),
      {
        timestamp,
        from: activeStreamIndex === 0 ? 'Primary Feed' : `Alt Mirror #${activeStreamIndex}`,
        to: nextIdx === 0 ? 'Primary Feed' : `Alt Mirror #${nextIdx}`,
        reason,
      },
    ]);

    setActiveStreamIndex(nextIdx);
    setActiveStreamUrl(nextUrl);
    setIsFailoverActive(nextIdx !== 0);
    setIsBannerDismissed(false);
    setFailoverReason(reason);
    setFailoverTimestamp(timestamp);
    setStreamHealth('FAILOVER');
    setIsVideoLoading(true);
    setPlaybackError(null);

    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      setIsBannerDismissed(true);
    }, 7000);
  };

  // Manual reset back to Primary Stream
  const handleResetToPrimary = () => {
    setActiveStreamIndex(0);
    setActiveStreamUrl(channel.streamUrl);
    setIsFailoverActive(false);
    setIsBannerDismissed(false);
    setFailoverReason(null);
    setIsVideoLoading(true);
  };

  // Load and play live video stream with Hls.js, mpegts.js, or HTML5 native video fallback
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setIsVideoLoading(true);
    setPlaybackError(null);
    if (!isFailoverActive) {
      setStreamHealth('BUFFERING');
    }

    // Destroy existing HLS / MPEG-TS instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }

    const rawUrl = activeStreamUrl;
    const streamUrl = resolveProxiedUrl(rawUrl);
    const isMpegTs = streamUrl.includes('.ts') || rawUrl.endsWith('.ts') || channel.activeFormat === 'ts';
    const isHls = streamUrl.includes('.m3u8') || rawUrl.includes('.m3u8') || channel.isAdaptive;

    video.volume = volume / 100;
    video.muted = isMuted;

    if (isMpegTs && mpegts.isSupported()) {
      try {
        const player = mpegts.createPlayer(
          {
            type: 'mse',
            isLive: true,
            url: streamUrl,
          },
          {
            enableWorker: true,
            lazyLoad: false,
            liveBufferLatencyChasing: true,
          }
        );
        player.attachMediaElement(video);
        player.load();
        const playRes = player.play();
        if (playRes && typeof playRes.catch === 'function') {
          playRes.catch(() => {});
        }

        player.on(mpegts.Events.ERROR, (errorType: any, errorDetail: any) => {
          console.warn('[MPEG-TS Error]', errorType, errorDetail);
          performFailover(`MPEG-TS error: ${errorDetail}`);
        });

        mpegtsRef.current = player;
        setIsVideoLoading(false);
        setStreamHealth(isFailoverActive ? 'FAILOVER' : 'EXCELLENT');
      } catch (err: any) {
        console.error('MPEG-TS player creation failed:', err);
        performFailover('MPEG-TS player init failed');
      }
    } else if (isHls && Hls.isSupported()) {
      // Configure Hls with optimal ABR buffer rules and anti-oscillation parameters
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        abrEwmaDefaultEstimate: 8500000, // 8.5 Mbps start
        abrBandWidthFactor: 0.85, // 15% conservative safety headroom to prevent oscillation
        abrBandWidthUpFactor: 0.7, // require 30% headroom to step up
        abrMaxWithRealBitrate: true,
        manifestLoadingTimeOut: 8000,
        manifestLoadingMaxRetry: 2,
        fragLoadingTimeOut: 10000,
        fragLoadingMaxRetry: 2,
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        setIsVideoLoading(false);
        setStreamHealth(isFailoverActive ? 'FAILOVER' : 'EXCELLENT');

        // Extract and populate adaptive variants if provider exposes multiple variants
        if (data.levels && data.levels.length > 0) {
          const parsedVariants: StreamVariant[] = data.levels.map((lvl, idx) => ({
            id: `lvl-${idx}`,
            name: lvl.height >= 2160 ? '4K UHD (2160p)' : lvl.height >= 1080 ? '1080p60 FHD' : lvl.height >= 720 ? '720p60 HD' : `${lvl.height}p SD`,
            width: lvl.width || 1920,
            height: lvl.height || 1080,
            bitrateMbps: +(lvl.bitrate / 1_000_000).toFixed(1) || channel.bitrateMbps,
            codec: lvl.codecSet || 'H.264',
            fps: 60,
          }));
          setAvailableLevels(parsedVariants);
        }

        // Prefer highest sustainable quality by default (Auto mode)
        if (selectedQualityIndex === -1) {
          hls.currentLevel = -1; // Auto ABR with highest sustainable preference
        } else {
          hls.currentLevel = selectedQualityIndex;
        }

        if (isPlaying) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (hls.levels[data.level]) {
          const lvl = hls.levels[data.level];
          setCurrentRenderedLevel(`${lvl.height}p${lvl.attrs?.['FRAME-RATE'] || '60'}`);
          setLiveBitrate(+(lvl.bitrate / 1_000_000).toFixed(2));
        }
      });

      // Handle 403 / 404 and fatal network errors with auto failover
      hls.on(Hls.Events.ERROR, (_event, data) => {
        const httpStatus = data.response?.code || 0;
        const isExplicit403or404 = httpStatus === 403 || httpStatus === 404;

        if (isExplicit403or404) {
          hls.destroy();
          hlsRef.current = null;
          performFailover(`HTTP ${httpStatus} on primary CDN endpoint.`);
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (httpStatus === 403 || httpStatus === 404) {
                performFailover(`HTTP ${httpStatus} Network Error`);
              } else {
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              performFailover('Fatal stream decode failure. Backup mirror selected.');
              break;
          }
        }
      });
    } else {
      // Direct single stream or native browser playback
      video.src = streamUrl;
      video.load();

      const onCanPlay = () => {
        setIsVideoLoading(false);
        setStreamHealth(isFailoverActive ? 'FAILOVER' : 'EXCELLENT');
        if (isPlaying) {
          video.play().catch(() => {});
        }
      };

      const onLoadedMetadata = () => {
        if (video.videoWidth && video.videoHeight) {
          setDetectedDimensions({ width: video.videoWidth, height: video.videoHeight });
          setDetectedCodec(`${channel.videoCodec} / ${channel.audioCodec}`);
        }
      };

      const onError = () => {
        if (!video.src || !video.error || video.error.code === 1 /* MEDIA_ERR_ABORTED */) return;
        if (video.error.code === 4 /* MEDIA_ERR_SRC_NOT_SUPPORTED */ || video.error.code === 2 /* MEDIA_ERR_NETWORK */) {
          performFailover('HTTP 404/403 or network stream error.');
        }
      };

      video.addEventListener('canplay', onCanPlay);
      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);

      return () => {
        video.removeEventListener('canplay', onCanPlay);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        if (mpegtsRef.current) {
          mpegtsRef.current.destroy();
          mpegtsRef.current = null;
        }
      };
    }
  }, [activeStreamUrl, isPlaying]);

  // Sync play/pause state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Sync volume and mute state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume / 100;
    video.muted = isMuted;
  }, [volume, isMuted]);

  // Dynamic live bitrate fluctuation simulation
  useEffect(() => {
    const timer = setInterval(() => {
      const delta = (Math.random() - 0.5) * 0.4;
      setLiveBitrate(+(Math.max(2.0, channel.bitrateMbps + delta)).toFixed(2));
    }, 2000);
    return () => clearInterval(timer);
  }, [channel]);

  // Calculate live EPG progress percentage
  useEffect(() => {
    if (!channel.epgNow) return;
    const now = Date.now();
    const totalDuration = channel.epgNow.endTs - channel.epgNow.startTs;
    const elapsed = Math.max(0, now - channel.epgNow.startTs);
    const pct = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
    setEpgProgressPct(pct || 45);
  }, [channel]);

  const handleUserActivity = () => {
    setShowOsd(true);
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    osdTimerRef.current = setTimeout(() => {
      setShowOsd(false);
      setShowQualityMenu(false);
    }, 4500);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleRetryStream = () => {
    setIsVideoLoading(true);
    setPlaybackError(null);
    const video = videoRef.current;
    if (video) {
      video.load();
      video.play().catch(() => {});
    }
  };

  // Quality level selection handler (Requirement 25)
  const handleSelectQuality = (index: number) => {
    setSelectedQualityIndex(index);
    setShowQualityMenu(false);

    if (hlsRef.current) {
      hlsRef.current.currentLevel = index; // -1 for Auto, 0..N for manual lock
    }

    if (index === -1) {
      setCurrentRenderedLevel(channel.resolution);
    } else if (availableLevels[index]) {
      setCurrentRenderedLevel(`${availableLevels[index].height}p60`);
      setLiveBitrate(availableLevels[index].bitrateMbps);
    }
  };

  const isAdaptiveStream = channel.isAdaptive || activeStreamUrl.includes('.m3u8') || availableLevels.length > 1;

  return (
    <div
      ref={containerRef}
      id="unified-playback-screen-container"
      onMouseMove={handleUserActivity}
      onClick={handleUserActivity}
      className={`relative w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col justify-between select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[360px] sm:h-[430px] lg:h-[480px]'
      }`}
    >
      {/* Live Video Stage & Canvas */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
        {/* Real Live HTML5 / HLS Video Element */}
        <video
          ref={videoRef}
          id="unified-live-video-element"
          playsInline
          autoPlay
          loop
          className={`w-full h-full object-${aspectRatio === '16:9' ? 'contain' : aspectRatio === '21:9' ? 'cover' : 'contain'} transition-all`}
          onWaiting={() => setStreamHealth('BUFFERING')}
          onPlaying={() => {
            setStreamHealth(isFailoverActive ? 'FAILOVER' : 'EXCELLENT');
            setIsVideoLoading(false);
          }}
          onError={() => {
            setStreamHealth('ERROR');
            setPlaybackError('Stream buffering or network stall. Automatic failover active.');
          }}
        />

        {/* Loading Spinner / Buffering Overlay */}
        {isVideoLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-10 gap-3">
            <div className="relative flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <Tv className="w-5 h-5 text-indigo-400 absolute" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-200">
                {isFailoverActive ? `Connecting Failover Mirror #${activeStreamIndex}...` : `Tuning ${channel.name}...`}
              </p>
              <p className="text-[11px] font-mono text-slate-400">
                {isFailoverActive ? 'Route: Alternate CDN Edge Transponder' : 'Locking live transponder feed & MPEG-TS buffers'}
              </p>
            </div>
          </div>
        )}

        {/* Playback Error Overlay with Retry */}
        {playbackError && !isVideoLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-10 gap-3 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
            <p className="text-xs text-slate-300 font-mono max-w-md">{playbackError}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRetryStream}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry Stream
              </button>
              <button
                onClick={() => performFailover('Manual retry with failover')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow transition"
              >
                <Zap className="w-3.5 h-3.5" /> Switch to Backup Mirror
              </button>
            </div>
          </div>
        )}

        {/* Channel Logo Watermark Overlay */}
        <div className="absolute top-4 right-4 z-10 pointer-events-none opacity-40 hover:opacity-90 transition-opacity">
          <LazyChannelLogo
            logoUrl={channel.logoUrl}
            channelName={channel.name}
            size="sm"
            className="shadow-xl ring-1 ring-white/10"
          />
        </div>

        {/* Live Audio Spectrum Equalizer */}
        {isPlaying && !isVideoLoading && (
          <div className="absolute bottom-20 left-6 flex items-end gap-1 h-5 opacity-70 pointer-events-none z-10">
            {[35, 65, 90, 45, 80, 55, 95, 30, 70, 85].map((height, idx) => (
              <div
                key={idx}
                className="w-1 bg-indigo-400 rounded-t shadow-sm"
                style={{
                  height: `${height}%`,
                  animation: `pulse 1.2s infinite ease-in-out ${idx * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAILOVER ALERT BANNER (Prominently Surfaced in UI with Close Button) */}
      {isFailoverActive && !isBannerDismissed && (
        <div
          id="failover-alert-banner"
          className="relative z-30 px-4 py-2 bg-amber-950/95 border-b border-amber-500/50 backdrop-blur-md flex items-center justify-between text-xs text-amber-200 animate-in fade-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-2 truncate">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-bold tracking-wide uppercase text-[11px] bg-amber-900/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-700">
              FAILOVER ACTIVE
            </span>
            <span className="truncate">
              Primary stream returned HTTP 403/404. Switched to Backup Mirror #{activeStreamIndex}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="revert-primary-feed-btn"
              onClick={handleResetToPrimary}
              className="px-2 py-0.5 bg-amber-900/80 hover:bg-amber-800 text-amber-100 rounded text-[10px] font-mono border border-amber-600 transition"
              title="Test primary feed restoration"
            >
              Revert Primary
            </button>
            <span className="text-[10px] font-mono text-amber-400/80">{failoverTimestamp}</span>
            <button
              onClick={() => setIsBannerDismissed(true)}
              className="p-1 hover:bg-amber-900/80 text-amber-300 hover:text-amber-100 rounded transition"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header OSD Overlay */}
      <div
        className={`relative z-20 p-4 bg-gradient-to-b from-slate-950/95 via-slate-950/60 to-transparent transition-opacity duration-300 flex items-center justify-between ${
          showOsd ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3">
          <LazyChannelLogo
            logoUrl={channel.logoUrl}
            channelName={channel.name}
            size="sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">{channel.name}</span>
              <span className="px-1.5 py-0.2 bg-slate-800 text-[10px] text-slate-300 font-mono rounded">
                CH {channel.channelNumber}
              </span>
              {isFailoverActive ? (
                <span
                  id="failover-status-badge"
                  className="flex items-center gap-1 text-[10px] font-mono text-amber-300 bg-amber-950/90 px-1.5 py-0.5 rounded border border-amber-600"
                >
                  <ShieldAlert className="w-3 h-3 text-amber-400" /> ALT MIRROR #{activeStreamIndex}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span>{channel.sourceName}</span>
              <span>•</span>
              <span className="text-slate-300">{channel.tvgId}</span>
              <span>•</span>
              <span className="text-indigo-400 font-semibold">{currentRenderedLevel}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Stream Spec Pills */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300 shadow">
            <span className="text-amber-400 font-semibold">{liveBitrate} Mbps</span>
            <span className="text-slate-600">|</span>
            <span>{channel.fps} fps</span>
            <span className="text-slate-600">|</span>
            <span className="text-indigo-300">{channel.audioCodec}</span>
          </div>

          {/* Simulate 404/403 Failover Quick Action */}
          <button
            id="simulate-failover-btn"
            onClick={(e) => {
              e.stopPropagation();
              performFailover('Simulated HTTP 404/403 Stream Expiration');
            }}
            className="hidden sm:flex items-center gap-1 px-2 py-1 bg-amber-950/70 hover:bg-amber-900 border border-amber-700/60 rounded-lg text-[10px] font-mono text-amber-300 transition"
            title="Simulate 404/403 Error & Auto-Failover"
          >
            <Zap className="w-3 h-3 text-amber-400" />
            <span>Test Failover</span>
          </button>

          <button
            id="favorite-btn-player"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(channel.id);
            }}
            className={`p-2 rounded-lg border transition ${
              channel.isFavorite
                ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-amber-300'
            }`}
            title="Toggle Favorite"
          >
            <Star className={`w-4 h-4 ${channel.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          <button
            id="diagnostics-btn-player"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDiagnostics();
            }}
            className="p-2 rounded-lg border bg-slate-900/80 text-slate-400 border-slate-800 hover:text-indigo-300 transition"
            title="View Stream Diagnostics"
          >
            <Activity className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Bottom OSD & Playback Controls */}
      <div
        className={`relative z-20 p-4 bg-gradient-to-t from-slate-950/95 via-slate-950/80 to-transparent transition-opacity duration-300 space-y-3 ${
          showOsd ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* EPG Program Now / Next Bar */}
        {channel.epgNow && (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-900 text-indigo-200 uppercase">
                  NOW
                </span>
                <span className="font-semibold text-slate-100 truncate">
                  {channel.epgNow.title}
                </span>
                <span className="text-slate-400 font-mono text-[11px] shrink-0">
                  ({channel.epgNow.startTime} - {channel.epgNow.endTime})
                </span>
              </div>
              <span className="px-1.5 py-0.5 bg-slate-800 text-[10px] text-slate-400 rounded font-mono shrink-0">
                {channel.epgNow.rating}
              </span>
            </div>

            {/* Program Timeline Progress */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${epgProgressPct}%` }}
              />
            </div>

            {/* EPG Next Teaser */}
            {channel.epgNext && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-500 font-bold uppercase text-[9px]">NEXT:</span>
                  <span className="truncate text-slate-300">{channel.epgNext.title}</span>
                </div>
                <span className="font-mono text-slate-500 shrink-0">
                  {channel.epgNext.startTime}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Control Bar Actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          {/* Left Controls: Channel Zapping & Play/Pause */}
          <div className="flex items-center gap-2">
            <button
              id="prev-channel-btn"
              onClick={(e) => {
                e.stopPropagation();
                onPrevChannel();
              }}
              className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
              title="Previous Channel"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              id="play-pause-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
              }}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow transition"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
            </button>

            <button
              id="next-channel-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNextChannel();
              }}
              className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
              title="Next Channel"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Volume Slider & Controls */}
          <div className="flex items-center gap-2">
            <button
              id="mute-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="p-2 text-slate-400 hover:text-slate-200 transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              id="volume-slider-player"
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(+e.target.value);
                setIsMuted(+e.target.value === 0);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-16 sm:w-24 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          {/* Adaptive Quality Selector & Aspect Ratio & Fullscreen */}
          <div className="flex items-center gap-2">
            {/* Requirement 25: Adaptive Quality Selector vs Fixed Stream Indicator */}
            <div className="relative">
              {isAdaptiveStream && availableLevels.length > 1 ? (
                <div>
                  <button
                    id="quality-selector-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowQualityMenu(!showQualityMenu);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-mono border transition ${
                      selectedQualityIndex === -1
                        ? 'bg-slate-900/90 text-indigo-300 border-indigo-500/50 hover:bg-slate-800'
                        : 'bg-indigo-950 text-indigo-200 border-indigo-500 hover:bg-indigo-900'
                    }`}
                    title="Adaptive Bitrate Quality Selection"
                  >
                    <Sliders className="w-3 h-3 text-indigo-400" />
                    <span>
                      {selectedQualityIndex === -1 ? 'Auto (Highest)' : availableLevels[selectedQualityIndex]?.name || 'Manual'}
                    </span>
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {/* Quality Selection Popup Menu */}
                  {showQualityMenu && (
                    <div
                      id="quality-selector-menu"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full right-0 mb-2 w-52 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 backdrop-blur-md space-y-1 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                        Stream Renditions (HLS ABR)
                      </div>

                      {/* Auto Mode (Default: Highest Sustainable Quality with Anti-Oscillation Hysteresis) */}
                      <button
                        onClick={() => handleSelectQuality(-1)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition text-left ${
                          selectedQualityIndex === -1
                            ? 'bg-indigo-600 text-white font-semibold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1.5">
                            Auto <span className="text-[10px] opacity-80">(Highest Sustainable)</span>
                          </span>
                          <span className="text-[9px] text-slate-400">Anti-oscillation EWMA</span>
                        </div>
                        {selectedQualityIndex === -1 && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>

                      {/* Manual Variants */}
                      {availableLevels.map((lvl, idx) => (
                        <button
                          key={lvl.id || idx}
                          onClick={() => handleSelectQuality(idx)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition text-left ${
                            selectedQualityIndex === idx
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex flex-col">
                            <span>{lvl.name}</span>
                            <span className="text-[9px] text-slate-400">
                              {lvl.bitrateMbps} Mbps • {lvl.codec}
                            </span>
                          </div>
                          {selectedQualityIndex === idx && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Requirement 25: Fixed Quality Stream Display (No Fake Switching) */
                <div
                  id="fixed-quality-indicator"
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/80 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-400 cursor-default"
                  title="Provider supplies a single fixed stream. Multi-variant quality switching is not applicable."
                >
                  <Info className="w-3 h-3 text-slate-500" />
                  <span>Fixed: {channel.resolution}</span>
                  <span className="text-slate-600">({channel.videoCodec})</span>
                </div>
              )}
            </div>

            <button
              id="aspect-ratio-btn"
              onClick={(e) => {
                e.stopPropagation();
                const ratios: ('16:9' | '21:9' | '4:3')[] = ['16:9', '21:9', '4:3'];
                const nextIdx = (ratios.indexOf(aspectRatio) + 1) % ratios.length;
                setAspectRatio(ratios[nextIdx]);
              }}
              className="px-2 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-300 transition"
            >
              {aspectRatio}
            </button>

            <button
              id="fullscreen-toggle-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFullscreen();
              }}
              className="p-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

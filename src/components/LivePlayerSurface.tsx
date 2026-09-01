import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import {
  Play,
  Square,
  Volume,
  Volume1,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Radio,
  Sliders,
  Tv,
  Layers,
  Activity,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Lock,
  Gauge,
  Monitor,
  Clock,
  Film,
} from 'lucide-react';
import { globalPlayerEngine, PlayerEngineState } from '../lib/playerEngine';
import { globalMpvBridge, MpvPlaybackStats, MpvVideoParams, AspectRatioOverride } from '../lib/mpvBridge';
import { redact } from '../lib/redact';
import { Focusable } from '../ui/components/Focusable';

const SAMPLE_CHANNELS = [
  {
    id: 101,
    streamId: 10452,
    name: 'US: ESPN HD (60FPS Live)',
    category: 'US | SPORTS',
    format: 'm3u8' as const,
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    tvgId: 'ESPN.us',
    currentShow: 'SportsCenter Live: Prime Time Analysis',
    nextShow: 'NBA Tonight (Live Countdown)',
    epgProgress: 68,
    hasEpgData: true,
  },
  {
    id: 102,
    streamId: 10453,
    name: 'US: CNN International HD',
    category: 'US | NEWS',
    format: 'm3u8' as const,
    streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
    tvgId: 'CNN.us',
    currentShow: 'World News Headlines & Financial Markets',
    nextShow: 'Anderson Cooper 360',
    epgProgress: 42,
    hasEpgData: true,
  },
  {
    id: 103,
    streamId: 10454,
    name: 'UK: BBC One London HD',
    category: 'UK | ENTERTAINMENT',
    format: 'm3u8' as const,
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    tvgId: 'BBCOne.uk',
    currentShow: 'Planet Earth: Nature Special',
    nextShow: 'BBC News at Ten',
    epgProgress: 85,
    hasEpgData: true,
  },
  {
    id: 104,
    streamId: 10455,
    name: 'US: HBO East HD',
    category: 'US | MOVIES',
    format: 'm3u8' as const,
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    tvgId: 'HBO.us',
    currentShow: 'House of the Dragon',
    nextShow: 'The Last of Us',
    epgProgress: 45,
    hasEpgData: true,
  },
  {
    id: 105,
    streamId: 10456,
    name: 'UK: Sky Sports F1 UHD',
    category: 'UK | SPORTS',
    format: 'm3u8' as const,
    streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    tvgId: 'SkySportsF1.uk',
    currentShow: 'Formula 1: Qualifying Session LIVE',
    nextShow: 'Ted\'s Qualifying Notebook',
    epgProgress: 60,
    hasEpgData: true,
  },
  {
    id: 999,
    streamId: 99999,
    name: 'Local Independent Cable 99',
    category: 'LOCAL | UNCATEGORIZED',
    format: 'ts' as const,
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    currentShow: 'No EPG Guide Data Available',
    nextShow: 'Channel active & streamable',
    epgProgress: 0,
    hasEpgData: false,
  },
];

export const LivePlayerSurface: React.FC = () => {
  const [channelMode, setChannelMode] = useState<'provider' | 'sample'>('provider');
  const [channels, setChannels] = useState<any[]>(SAMPLE_CHANNELS);
  const [liveChannels, setLiveChannels] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; channelCount: number }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalLiveCount, setTotalLiveCount] = useState<number>(0);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);
  const [isSyncingSource, setIsSyncingSource] = useState<boolean>(false);

  const [engineState, setEngineState] = useState<PlayerEngineState>(globalPlayerEngine.getState());
  const [mpvStats, setMpvStats] = useState<MpvPlaybackStats>(globalMpvBridge.getStats());
  const [mpvParams, setMpvParams] = useState<MpvVideoParams>(globalMpvBridge.getVideoParams());
  const [showStatsHud, setShowStatsHud] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showOsd, setShowOsd] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<any>(SAMPLE_CHANNELS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [osdTimeout, setOsdTimeout] = useState<any>(null);
  const [activeFormat, setActiveFormat] = useState<'m3u8' | 'ts'>('m3u8');
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Real-time Buffer Diagnostics & OSD Metrics
  const [bufferedAheadSec, setBufferedAheadSec] = useState<number>(0);
  const [bufferHealthStatus, setBufferHealthStatus] = useState<'healthy' | 'adequate' | 'starved'>('healthy');
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number; fps: number; label: string }>({
    width: 1920,
    height: 1080,
    fps: 60,
    label: '1080p FHD',
  });
  const [volumeOsdVisible, setVolumeOsdVisible] = useState<boolean>(false);
  const [volumeOsdTimer, setVolumeOsdTimer] = useState<any>(null);
  const [displayModeOsdVisible, setDisplayModeOsdVisible] = useState<boolean>(false);
  const [displayModeOsdTimer, setDisplayModeOsdTimer] = useState<any>(null);
  const [showBufferDetails, setShowBufferDetails] = useState<boolean>(false);

  // Fetch Live Categories on mount
  useEffect(() => {
    fetch('/api/m1/sources/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.categories && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      })
      .catch((err) => console.error('Failed to load categories:', err));
  }, []);

  // Fetch Live Channels when category, search, or page changes
  useEffect(() => {
    if (channelMode !== 'provider') return;

    setIsLoadingLive(true);
    const params = new URLSearchParams();
    if (selectedCategory !== 'all') params.append('category', selectedCategory);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    params.append('page', String(page));
    params.append('limit', '50');

    fetch(`/api/m1/channels/live?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channels && Array.isArray(data.channels)) {
          const mappedChannels = data.channels.map((c: any) => ({
            id: c.streamId || c.stream_id,
            streamId: c.streamId || c.stream_id,
            name: c.name,
            category: c.categoryName || c.category_name || 'General',
            format: c.format || 'm3u8',
            streamUrl: c.streamUrl || `/api/stream/live/${c.streamId || c.stream_id}.m3u8`,
            tsStreamUrl: c.tsStreamUrl || `/api/stream/live/${c.streamId || c.stream_id}.ts`,
            rawStreamUrl: c.rawStreamUrl || c.resolved_stream_url,
            tvgId: c.epgChannelId || c.epg_channel_id || '',
            currentShow: 'Live Broadcast',
            nextShow: 'Upcoming Broadcast',
            epgProgress: 50,
            hasEpgData: true,
          }));

          setLiveChannels(mappedChannels);
          setTotalPages(data.totalPages || 1);
          setTotalLiveCount(data.total || 0);

          if (mappedChannels.length > 0 && selectedChannel.id === SAMPLE_CHANNELS[0].id) {
            setSelectedChannel(mappedChannels[0]);
          }
        }
      })
      .catch((err) => console.error('Failed to load live channels:', err))
      .finally(() => setIsLoadingLive(false));
  }, [channelMode, selectedCategory, searchQuery, page]);

  // Sync Provider Source
  const handleSyncSource = async () => {
    setIsSyncingSource(true);
    try {
      const res = await fetch('/api/m1/sources/load-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'http://dnsjibre.xyz:80',
          username: 'B3GC9NESBU82M3W',
          password: '2pFz3E7P3d',
          sourceName: 'Ultra Xtream Platinum (dnsjibre.xyz)',
          targetCount: 14917,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Refresh categories
        const catRes = await fetch('/api/m1/sources/categories');
        const catData = await catRes.json();
        if (catData.categories) setCategories(catData.categories);
        setPage(1);
      }
    } catch (err) {
      console.error('Failed to sync provider source:', err);
    } finally {
      setIsSyncingSource(false);
    }
  };

  // Fetch real-time Now/Next EPG info from SQLite for demo channels
  useEffect(() => {
    if (channelMode !== 'sample') return;
    const fetchNowNext = async () => {
      try {
        const res = await fetch('/api/m4/epg/now-next', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channels: SAMPLE_CHANNELS.map((c) => ({
              id: c.id,
              name: c.name,
              tvgId: c.tvgId,
            })),
          }),
        });
        const data = await res.json();
        if (data.nowNext && Array.isArray(data.nowNext)) {
          setChannels((prev) =>
            prev.map((ch) => {
              const matched = data.nowNext.find((n: any) => String(n.channelId) === String(ch.id));
              if (matched) {
                return {
                  ...ch,
                  currentShow: matched.now ? matched.now.title : 'No Guide Data Available',
                  nextShow: matched.next ? matched.next.title : 'No Upcoming Guide Data',
                  epgProgress: matched.now ? matched.now.progressPercent : 0,
                  hasEpgData: matched.hasEpgData,
                };
              }
              return ch;
            })
          );
        }
      } catch (err) {
        console.error('Failed to sync live Now/Next EPG:', err);
      }
    };

    fetchNowNext();
    const interval = setInterval(fetchNowNext, 30000);
    return () => clearInterval(interval);
  }, [channelMode]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Sync engine updates
  useEffect(() => {
    const unsub = globalPlayerEngine.subscribe((s) => {
      setEngineState(s);
      setMpvStats(globalMpvBridge.getStats());
      setMpvParams(globalMpvBridge.getVideoParams());
    });
    return () => unsub();
  }, []);

  // Attach HTML5 Media Element to PlayerEngine
  useEffect(() => {
    if (videoRef.current) {
      globalPlayerEngine.attachMediaElement(videoRef.current);
    }
    return () => {
      globalPlayerEngine.attachMediaElement(null);
    };
  }, []);

  // Listen to fullscreen changes across all browser engines
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentFs = document.fullscreenElement === playerContainerRef.current;
      setIsFullscreen(isCurrentFs);
      globalPlayerEngine.syncFullscreenTransition(isCurrentFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Sync volume and mute with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, engineState.volume / 100));
      videoRef.current.muted = engineState.muted || engineState.isAutoplayMuted;
    }
  }, [engineState.volume, engineState.muted, engineState.isAutoplayMuted]);

  // Handle HLS / MPEG-TS / Video Attachment
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

  useEffect(() => {
    if (!videoRef.current) return;

    // Attach to engine
    globalPlayerEngine.attachMediaElement(videoRef.current);

    // Destroy existing instances
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }

    if (engineState.isPlaying && selectedChannel) {
      setPlaybackError(null);
      const rawUrl =
        activeFormat === 'ts' && selectedChannel.tsStreamUrl
          ? selectedChannel.tsStreamUrl
          : selectedChannel.streamUrl;
      const urlToPlay = resolveProxiedUrl(rawUrl);

      const isMpegTs = urlToPlay.endsWith('.ts') || rawUrl.endsWith('.ts') || activeFormat === 'ts';
      const isHls = urlToPlay.includes('.m3u8') || rawUrl.includes('.m3u8') || activeFormat === 'm3u8';

      const safePlayVideo = () => {
        if (!videoRef.current) return;
        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise
            .then(() => {
              // Unmuted playback active
            })
            .catch((err) => {
              console.warn('[LivePlayerSurface] Autoplay restricted. Fallback to muted audio:', err);
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.play().catch(() => {});
              }
            });
        }
      };

      if (isMpegTs && mpegts.isSupported()) {
        try {
          const player = mpegts.createPlayer(
            {
              type: 'mse',
              isLive: true,
              url: urlToPlay,
            },
            {
              enableWorker: true,
              lazyLoad: false,
              liveBufferLatencyChasing: true,
            }
          );
          player.attachMediaElement(videoRef.current);
          player.load();
          try {
            const playPromise = player.play();
            if (playPromise && typeof (playPromise as any).catch === 'function') {
              (playPromise as Promise<void>).catch((err: any) => {
                console.warn('MPEG-TS play promise error, retrying muted:', err);
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  try {
                    const retry = player.play();
                    if (retry && typeof (retry as any).catch === 'function') {
                      (retry as Promise<void>).catch(() => {});
                    }
                  } catch {}
                }
              });
            }
          } catch (e) {
            console.warn('MPEG-TS play error:', e);
          }
          player.on(mpegts.Events.ERROR, (errorType: any, errorDetail: any) => {
            console.warn('[MPEG-TS Player Error]', errorType, errorDetail);
            setPlaybackError(`MPEG-TS Error: ${errorDetail}`);
          });
          mpegtsRef.current = player;
        } catch (err: any) {
          console.error('MPEG-TS init failed:', err);
          setPlaybackError(`Failed to initialize MPEG-TS player: ${err.message}`);
        }
      } else if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          manifestLoadingTimeOut: 12000,
          manifestLoadingMaxRetry: 3,
          levelLoadingTimeOut: 12000,
          fragLoadingTimeOut: 15000,
          fragLoadingMaxRetry: 3,
        });

        hls.loadSource(urlToPlay);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setPlaybackError(null);
          safePlayVideo();
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.warn('[HLS Fatal Error]', data.type, data.details);
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.warn('Fatal network error encountered, reloading stream...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn('Fatal media error encountered, recovering...');
                hls.recoverMediaError();
                break;
              default:
                console.error('Unrecoverable HLS error encountered:', data.details);
                setPlaybackError(`Stream connection issue: ${data.details}. Try switching to TS mode.`);
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls;
      } else {
        // Native fallback (Safari HLS or MP4)
        videoRef.current.src = urlToPlay;
        safePlayVideo();
      }
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (mpegtsRef.current) {
        mpegtsRef.current.destroy();
        mpegtsRef.current = null;
      }
    };
  }, [engineState.isPlaying, selectedChannel, activeFormat]);

  // Trigger OSD visibility on mouse move or channel switch
  const triggerOsd = () => {
    setShowOsd(true);
    if (osdTimeout) clearTimeout(osdTimeout);
    const t = setTimeout(() => setShowOsd(false), 4500);
    setOsdTimeout(t);
  };

  // Trigger Center Volume OSD popup
  const triggerVolumeOsd = () => {
    setVolumeOsdVisible(true);
    triggerOsd();
    if (volumeOsdTimer) clearTimeout(volumeOsdTimer);
    const t = setTimeout(() => setVolumeOsdVisible(false), 2000);
    setVolumeOsdTimer(t);
  };

  // Trigger Center Display Mode OSD popup
  const triggerDisplayModeOsd = () => {
    setDisplayModeOsdVisible(true);
    triggerOsd();
    if (displayModeOsdTimer) clearTimeout(displayModeOsdTimer);
    const t = setTimeout(() => setDisplayModeOsdVisible(false), 2000);
    setDisplayModeOsdTimer(t);
  };

  // Cycle Display Mode: Auto -> 16:9 -> 4:3 -> Auto
  const handleCycleDisplayMode = () => {
    const current = engineState.filters.aspectRatio;
    let next: AspectRatioOverride = '16:9';
    if (current === '16:9') {
      next = '4:3';
    } else if (current === '4:3') {
      next = 'auto';
    } else {
      next = '16:9';
    }
    globalPlayerEngine.setAspectRatio(next);
    triggerDisplayModeOsd();
  };

  const handleVolumeChange = (newVol: number) => {
    const clamped = Math.max(0, Math.min(100, newVol));
    globalPlayerEngine.setVolume(clamped);
    if (engineState.muted && clamped > 0) {
      globalPlayerEngine.setMuted(false);
    }
    triggerVolumeOsd();
  };

  const handleToggleMute = () => {
    globalPlayerEngine.toggleMute();
    triggerVolumeOsd();
  };

  // Real-time Buffer & Stream Resolution Monitor
  useEffect(() => {
    const updateBufferMetrics = () => {
      const video = videoRef.current;
      if (!video) return;

      // Extract real-time stream resolution
      if (video.videoWidth && video.videoHeight) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        let label = 'SD';
        if (h >= 2160 || w >= 3840) label = '4K UHD';
        else if (h >= 1440) label = '2K QHD';
        else if (h >= 1080 || w >= 1920) label = '1080p FHD';
        else if (h >= 720 || w >= 1280) label = '720p HD';

        setStreamResolution((prev) => {
          if (prev.width === w && prev.height === h && prev.label === label) return prev;
          return {
            width: w,
            height: h,
            fps: mpvParams.fps || 60,
            label,
          };
        });
      }

      // Calculate buffer ahead of current playhead
      let bufferAhead = 0;
      const cur = video.currentTime || 0;
      if (video.buffered && video.buffered.length > 0) {
        for (let i = 0; i < video.buffered.length; i++) {
          const start = video.buffered.start(i);
          const end = video.buffered.end(i);
          if (cur >= start && cur <= end) {
            bufferAhead = Math.max(0, end - cur);
          } else if (end > cur && start - cur < 1.5) {
            bufferAhead = Math.max(bufferAhead, end - cur);
          }
        }
      }

      const effectiveAhead = bufferAhead > 0 ? bufferAhead : (engineState.bufferHealthSec || 0);
      setBufferedAheadSec(effectiveAhead);

      if (effectiveAhead >= 5.0) {
        setBufferHealthStatus('healthy');
      } else if (effectiveAhead >= 2.0) {
        setBufferHealthStatus('adequate');
      } else {
        setBufferHealthStatus('starved');
      }
    };

    const interval = setInterval(updateBufferMetrics, 400);
    const video = videoRef.current;
    if (video) {
      video.addEventListener('timeupdate', updateBufferMetrics);
      video.addEventListener('progress', updateBufferMetrics);
      video.addEventListener('loadedmetadata', updateBufferMetrics);
      video.addEventListener('playing', updateBufferMetrics);
      video.addEventListener('waiting', updateBufferMetrics);
    }

    return () => {
      clearInterval(interval);
      if (video) {
        video.removeEventListener('timeupdate', updateBufferMetrics);
        video.removeEventListener('progress', updateBufferMetrics);
        video.removeEventListener('loadedmetadata', updateBufferMetrics);
        video.removeEventListener('playing', updateBufferMetrics);
        video.removeEventListener('waiting', updateBufferMetrics);
      }
    };
  }, [engineState.isPlaying, engineState.bufferHealthSec, mpvParams.fps]);

  // Global Keyboard Shortcuts for Volume, Mute, Display Mode, and Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(100, engineState.volume + 5));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, engineState.volume - 5));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        handleCycleDisplayMode();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [engineState.volume, engineState.muted, engineState.filters.aspectRatio]);

  const handlePlayChannel = (ch: any) => {
    setSelectedChannel(ch);
    const targetStreamUrl =
      activeFormat === 'ts' && ch.tsStreamUrl ? ch.tsStreamUrl : ch.streamUrl;

    globalPlayerEngine.loadChannel({
      id: ch.id,
      name: ch.name,
      streamUrl: targetStreamUrl,
      format: activeFormat,
    });
    triggerOsd();
  };

  const handleStop = () => {
    globalPlayerEngine.stop('User stopped stream');
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current
        .requestFullscreen()
        .then(() => {
          setIsFullscreen(true);
          globalPlayerEngine.syncFullscreenTransition(true);
        })
        .catch(() => {});
    } else {
      document
        .exitFullscreen()
        .then(() => {
          setIsFullscreen(false);
          globalPlayerEngine.syncFullscreenTransition(false);
        })
        .catch(() => {});
    }
  };

  // Video Filter CSS Styles & Presentation Geometry Calculation
  const getVideoFilterStyle = (): React.CSSProperties => {
    const { brightness, contrast, saturation, sharpen, aspectRatio } = engineState.filters;
    const filters = [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      sharpen ? 'contrast(125%) drop-shadow(0 0 1px rgba(0,0,0,0.8))' : '',
    ].filter(Boolean).join(' ');

    let objectFit: React.CSSProperties['objectFit'] = 'contain';
    let aspectRatioStyle: string | undefined = undefined;
    let width = '100%';
    let height = '100%';

    if (aspectRatio === 'fill') {
      objectFit = 'fill';
      aspectRatioStyle = 'auto';
    } else if (aspectRatio === 'zoom') {
      objectFit = 'cover';
      aspectRatioStyle = 'auto';
    } else if (aspectRatio === '16:9') {
      objectFit = 'contain';
      aspectRatioStyle = '16 / 9';
    } else if (aspectRatio === '4:3') {
      objectFit = 'contain';
      aspectRatioStyle = '4 / 3';
      width = 'auto';
    } else if (aspectRatio === '21:9') {
      objectFit = 'contain';
      aspectRatioStyle = '21 / 9';
      height = 'auto';
    } else {
      // 'auto' - Preserves native stream geometry
      objectFit = 'contain';
      aspectRatioStyle = 'auto';
    }

    return {
      filter: filters,
      objectFit,
      aspectRatio: aspectRatioStyle,
      width,
      height,
      maxWidth: '100%',
      maxHeight: '100%',
      margin: 'auto',
    };
  };

  const filteredChannels = channels.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="live-player-surface-container" className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Milestone 2 Video Surface &amp; Playback Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time HLS.js video rendering with Yadif/Bwdif deinterlacing shader simulation, hardware acceleration controls, multi-track audio switching, and zero-overlap connection guarantees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatsHud(!showStatsHud)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-mono flex items-center gap-1.5 transition cursor-pointer ${
              showStatsHud
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Stats HUD (Shift+I)
          </button>

          <button
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              showFilterPanel
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Video Shaders
          </button>
        </div>
      </div>

      {/* Main Grid: Player Video Area + Channel Quick-Switcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player Surface */}
        <div
          ref={playerContainerRef}
          onMouseMove={triggerOsd}
          id="video-player-container"
          className={`relative bg-black flex items-center justify-center group select-none shadow-2xl transition-all ${
            isFullscreen
              ? 'fixed inset-0 z-50 w-screen h-screen max-w-none max-h-none rounded-none border-0 aspect-auto overflow-hidden'
              : 'lg:col-span-2 rounded-xl overflow-hidden border border-slate-800 aspect-video'
          }`}
        >
          {/* HTML5 Video / HLS Stream Element */}
          <video
            ref={videoRef}
            playsInline
            muted={engineState.muted || engineState.isAutoplayMuted}
            style={getVideoFilterStyle()}
            className="w-full h-full max-w-full max-h-full object-contain transition-all duration-200 bg-black block"
          />

          {/* Autoplay Muted Unmute Action Banner */}
          {engineState.isAutoplayMuted && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-bounce">
              <button
                onClick={() => globalPlayerEngine.ensureAudioUnmuted(videoRef.current || undefined)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/95 hover:bg-indigo-500 text-white text-xs font-bold shadow-2xl backdrop-blur border border-indigo-400/60 transition cursor-pointer"
              >
                <VolumeX className="w-4 h-4 text-amber-300" />
                <span>Audio Muted (Browser Policy) — Click to Enable Sound</span>
              </button>
            </div>
          )}

          {/* Fallback Display if Not Playing */}
          {!engineState.isPlaying && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400">
                <Radio className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="text-base font-semibold text-slate-200">
                  Player Idle — No Active Stream
                </div>
                <p className="text-xs text-slate-500 max-w-sm">
                  Select a channel from the guide to establish an exclusive playback connection.
                </p>
              </div>
              <button
                id="btn-play-current-channel"
                onClick={() => handlePlayChannel(selectedChannel)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" /> Tune In: {selectedChannel.name}
              </button>
            </div>
          )}

          {/* Buffering / Stalling Overlay */}
          {engineState.isBuffering && engineState.isPlaying && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 z-30">
              <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              <div className="text-xs font-mono text-indigo-300 font-semibold bg-black/80 px-3 py-1 rounded border border-indigo-900">
                {engineState.isStalled ? 'Buffer Starvation — Auto-Recovering...' : 'Buffering Stream...'}
              </div>
            </div>
          )}

          {/* Playback Error Banner with Format Switch Helper */}
          {playbackError && engineState.isPlaying && (
            <div className="absolute inset-x-4 top-20 bg-rose-950/90 border border-rose-700/80 backdrop-blur rounded-lg p-3 text-xs text-rose-200 z-30 shadow-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="truncate">{playbackError}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {activeFormat === 'm3u8' ? (
                  <button
                    onClick={() => setActiveFormat('ts')}
                    className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-mono text-[11px] font-semibold transition cursor-pointer"
                  >
                    Switch to MPEG-TS (.ts)
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveFormat('m3u8')}
                    className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-mono text-[11px] font-semibold transition cursor-pointer"
                  >
                    Switch to HLS (.m3u8)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Stats HUD Overlay (Top Right) */}
          {showStatsHud && (
            <div className="absolute top-4 right-4 bg-black/85 backdrop-blur border border-indigo-500/40 rounded-lg p-3 text-[11px] font-mono text-slate-300 space-y-1 z-30 shadow-2xl max-w-xs">
              <div className="text-indigo-400 font-bold border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>Video Stats HUD</span>
                <span className="text-[9px] bg-indigo-950 px-1.5 py-0.5 rounded text-indigo-300">
                  {engineState.activeRenderer}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Codec:</span>
                <span className="text-slate-200">{mpvParams.codec}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Resolution:</span>
                <span className="text-slate-200">{mpvParams.width}x{mpvParams.height} ({mpvParams.fps} fps)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">HW Acceleration:</span>
                <span className="text-emerald-400 font-semibold">{engineState.hwdec} (Active)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Deinterlace:</span>
                <span className="text-cyan-300">{engineState.filters.deinterlace} (Double Rate)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Buffer Health:</span>
                <span className="text-emerald-400">{engineState.bufferHealthSec.toFixed(1)}s buffered</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bitrate:</span>
                <span className="text-slate-200">{(mpvStats.bitrateKbps / 1000).toFixed(2)} Mbps</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Dropped Frames:</span>
                <span className="text-slate-200">{mpvStats.droppedFrames}</span>
              </div>
            </div>
          )}

          {/* Centered Floating Volume OSD Pop-up */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-black/90 backdrop-blur-md border border-indigo-500/50 rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-3 transition-all duration-300 ease-in-out pointer-events-none select-none ${
              volumeOsdVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shadow-inner">
              {engineState.muted || engineState.volume === 0 ? (
                <VolumeX className="w-7 h-7 text-rose-400" />
              ) : engineState.volume < 50 ? (
                <Volume1 className="w-7 h-7 text-indigo-300" />
              ) : (
                <Volume2 className="w-7 h-7 text-indigo-300" />
              )}
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Master Volume</div>
              <div className="text-2xl font-bold font-mono text-white mt-0.5">
                {engineState.muted ? (
                  <span className="text-rose-400">MUTED</span>
                ) : (
                  <span>{engineState.volume}%</span>
                )}
              </div>
            </div>
            {/* 10-segment LED Volume Level Meter */}
            <div className="flex items-center gap-1">
              {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((step) => {
                const isActive = !engineState.muted && engineState.volume >= step;
                return (
                  <div
                    key={step}
                    className={`w-2 h-4 rounded-sm transition-all duration-150 ${
                      isActive
                        ? step > 80
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                          : 'bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.7)]'
                        : 'bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Centered Floating Display Mode OSD Pop-up */}
          <div
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-black/90 backdrop-blur-md border border-cyan-500/50 rounded-2xl p-5 shadow-2xl flex flex-col items-center gap-3 transition-all duration-300 ease-in-out pointer-events-none select-none ${
              displayModeOsdVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <Tv className="w-7 h-7 text-cyan-300" />
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Display Mode</div>
              <div className="text-2xl font-bold font-mono text-white mt-0.5 uppercase tracking-wide">
                {['16:9', '4:3'].includes(engineState.filters.aspectRatio)
                  ? engineState.filters.aspectRatio
                  : 'Auto'}
              </div>
            </div>
            {/* 3-segment Display Mode Indicator */}
            <div className="flex items-center gap-1.5 pt-1">
              {(['auto', '16:9', '4:3'] as const).map((mode) => {
                const isActive =
                  engineState.filters.aspectRatio === mode ||
                  (mode === 'auto' && !['16:9', '4:3'].includes(engineState.filters.aspectRatio));
                return (
                  <span
                    key={mode}
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase transition-all duration-150 ${
                      isActive
                        ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.8)]'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {mode}
                  </span>
                );
              })}
            </div>
          </div>

          {/* On-Screen Display (OSD) Channel Banner (Top Left) */}
          <div
            className={`absolute top-4 left-4 right-4 sm:right-auto sm:max-w-md bg-black/85 backdrop-blur border border-slate-800 rounded-xl p-3.5 text-xs transition-all duration-300 ease-in-out z-20 space-y-2.5 shadow-2xl ${
              showOsd && engineState.isPlaying
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded shrink-0 shadow-sm">
                  CH {selectedChannel.id}
                </span>
                <span className="font-bold text-slate-100 truncate text-sm">{selectedChannel.name}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 uppercase">
                  {selectedChannel.category || 'LIVE'}
                </span>
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                  .{engineState.currentFormat}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="truncate flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-semibold text-slate-200">NOW:</span> {selectedChannel.currentShow}
                </span>
                <span className="text-slate-400 font-mono shrink-0 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  {selectedChannel.epgProgress}%
                </span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${selectedChannel.epgProgress}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                <span className="text-slate-500 font-semibold">NEXT:</span>
                <span>{selectedChannel.nextShow}</span>
              </div>
            </div>
          </div>

          {/* On-Screen Display (OSD) Stream Resolution & Diagnostic Card (Top Right) */}
          <div
            className={`absolute top-4 right-4 bg-black/85 backdrop-blur border border-slate-800 rounded-xl p-3 text-xs transition-all duration-300 ease-in-out z-20 space-y-2 shadow-2xl max-w-xs hidden sm:block ${
              showOsd && engineState.isPlaying
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-1.5">
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[11px] font-mono">
                <Monitor className="w-3.5 h-3.5" />
                <span>STREAM SPECS</span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {streamResolution.label}
              </span>
            </div>

            <div className="space-y-1 text-[11px] font-mono text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400 flex items-center gap-1">
                  <Film className="w-3 h-3 text-slate-500" /> Resolution:
                </span>
                <span className="text-slate-100 font-semibold">
                  {streamResolution.width}×{streamResolution.height} ({streamResolution.fps} fps)
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400 flex items-center gap-1">
                  <Tv className="w-3 h-3 text-cyan-400" /> Display Mode:
                </span>
                <span className="text-cyan-300 font-semibold uppercase">
                  {['16:9', '4:3'].includes(engineState.filters.aspectRatio)
                    ? engineState.filters.aspectRatio
                    : 'Auto'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-slate-500" /> Buffer Health:
                </span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    bufferHealthStatus === 'healthy'
                      ? 'text-emerald-400'
                      : bufferHealthStatus === 'adequate'
                      ? 'text-amber-400'
                      : 'text-rose-400 animate-pulse'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      bufferHealthStatus === 'healthy'
                        ? 'bg-emerald-400'
                        : bufferHealthStatus === 'adequate'
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                    }`}
                  />
                  {bufferedAheadSec.toFixed(1)}s buffered
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400 flex items-center gap-1">
                  <Volume2 className="w-3 h-3 text-slate-500" /> Audio:
                </span>
                <span className="text-slate-200">
                  {engineState.muted ? (
                    <span className="text-rose-400 font-semibold">Muted (0%)</span>
                  ) : (
                    <span>Unmuted ({engineState.volume}%)</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Player Overlay: Buffer Progress Bar + Interactive Controls */}
          <div
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/80 to-transparent pt-6 pb-3 px-4 z-20 transition-all duration-300 ease-in-out space-y-2.5 ${
              showOsd && engineState.isPlaying
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 translate-y-2 pointer-events-none'
            } group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto`}
          >
            
            {/* Visual Buffer Progress Indicator & Scrub Track */}
            {engineState.isPlaying && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-0.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-rose-400 font-bold text-[10px] bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> LIVE STREAM
                    </span>
                    <span className="text-slate-400 text-xs hidden sm:inline truncate max-w-[200px]">
                      {selectedChannel.name}
                    </span>
                  </div>

                  {/* Buffer Status Metric Badge with Diagnostic Tooltip */}
                  <div className="relative group/buf flex items-center gap-2">
                    <button
                      onClick={() => setShowBufferDetails(!showBufferDetails)}
                      className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold transition cursor-pointer border ${
                        bufferHealthStatus === 'healthy'
                          ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
                          : bufferHealthStatus === 'adequate'
                          ? 'bg-amber-950/90 text-amber-300 border-amber-800'
                          : 'bg-rose-950/90 text-rose-300 border-rose-800 animate-pulse'
                      }`}
                      title="Click for Diagnostic Buffer Analysis"
                    >
                      <Gauge className="w-3 h-3" />
                      <span>Buffer: {bufferedAheadSec.toFixed(1)}s</span>
                      <span className="hidden sm:inline">
                        ({bufferHealthStatus === 'healthy' ? 'Healthy' : bufferHealthStatus === 'adequate' ? 'Nominal' : 'Starvation Risk'})
                      </span>
                    </button>

                    {/* Diagnostic Buffer Hover Card */}
                    <div className="absolute right-0 bottom-full mb-2 hidden group-hover/buf:block bg-slate-950/95 backdrop-blur border border-slate-700 rounded-xl p-3 text-[11px] font-mono text-slate-300 shadow-2xl w-64 z-40 space-y-1.5">
                      <div className="text-indigo-300 font-bold text-xs border-b border-slate-800 pb-1 flex items-center justify-between">
                        <span>Buffer Diagnostics</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                          {engineState.activeRenderer}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Buffered Ahead:</span>
                        <span className="text-emerald-400 font-bold">{bufferedAheadSec.toFixed(2)} sec</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Target Live Window:</span>
                        <span className="text-slate-200">15.00 sec</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Stall Threshold:</span>
                        <span className="text-rose-400 font-semibold">&lt; 1.50 sec</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recovery Stage:</span>
                        <span className="text-cyan-300">{engineState.isStalled ? 'Active Flushing' : 'Nominal Playing'}</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full transition-all duration-300 ${
                            bufferHealthStatus === 'healthy'
                              ? 'bg-emerald-500'
                              : bufferHealthStatus === 'adequate'
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, (bufferedAheadSec / 15) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress & Buffer Bar Track */}
                <div
                  className="relative w-full h-2.5 bg-slate-800/90 rounded-full overflow-hidden cursor-pointer shadow-inner border border-slate-700/60"
                  title={`Buffered Media Ahead: ${bufferedAheadSec.toFixed(1)}s (Capacity 15s)`}
                >
                  {/* Dynamic Buffered Media Progress Bar */}
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      bufferHealthStatus === 'healthy'
                        ? 'bg-gradient-to-r from-indigo-600 via-cyan-500 to-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                        : bufferHealthStatus === 'adequate'
                        ? 'bg-gradient-to-r from-indigo-600 via-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]'
                        : 'bg-gradient-to-r from-rose-700 via-rose-600 to-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.8)]'
                    }`}
                    style={{
                      width: `${Math.max(4, Math.min(100, (bufferedAheadSec / 15) * 100))}%`,
                    }}
                  />

                  {/* Pulsing Live Head Beacon */}
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_6px_white]" />
                </div>
              </div>
            )}

            {/* Bottom Controls Toolbar */}
            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="flex items-center flex-wrap gap-2.5 sm:gap-3">
                {/* Play / Stop Button */}
                {engineState.isPlaying ? (
                  <button
                    id="btn-stop-playback"
                    onClick={handleStop}
                    className="p-2 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white transition cursor-pointer shadow-md hover:scale-105 active:scale-95"
                    title="Stop Stream (Instant Network Disconnect)"
                  >
                    <Square className="w-4 h-4 fill-white" />
                  </button>
                ) : (
                  <button
                    id="btn-start-playback"
                    onClick={() => handlePlayChannel(selectedChannel)}
                    className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer shadow-md hover:scale-105 active:scale-95"
                    title="Play Stream"
                  >
                    <Play className="w-4 h-4 fill-white" />
                  </button>
                )}

                {/* Dedicated Volume Control & Mute Cluster */}
                <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 rounded-xl px-2.5 py-1 shadow-inner">
                  {/* Mute Toggle Button */}
                  <button
                    id="btn-toggle-mute"
                    onClick={handleToggleMute}
                    className={`p-1 rounded-lg transition cursor-pointer hover:scale-110 ${
                      engineState.muted || engineState.volume === 0
                        ? 'text-rose-400 bg-rose-950/80 hover:bg-rose-900/80'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                    title={engineState.muted ? 'Unmute Audio (Press M)' : 'Mute Audio (Press M)'}
                  >
                    {engineState.muted || engineState.volume === 0 ? (
                      <VolumeX className="w-4 h-4" />
                    ) : engineState.volume < 50 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  {/* Volume Slider with dynamic background gradient */}
                  <input
                    id="input-volume-slider"
                    type="range"
                    min={0}
                    max={100}
                    value={engineState.muted ? 0 : engineState.volume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                    style={{
                      background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${
                        engineState.muted ? 0 : engineState.volume
                      }%, #334155 ${engineState.muted ? 0 : engineState.volume}%, #334155 100%)`,
                    }}
                    className="w-16 sm:w-24 h-1.5 rounded-lg appearance-none cursor-pointer accent-indigo-400"
                    title={`Volume: ${engineState.muted ? '0% (Muted)' : `${engineState.volume}%`}`}
                  />

                  {/* Numeric Volume Percentage Readout / Preset Toggle Button */}
                  <button
                    onClick={() => {
                      if (engineState.muted) {
                        handleVolumeChange(100);
                      } else if (engineState.volume >= 100) {
                        handleVolumeChange(50);
                      } else if (engineState.volume > 0) {
                        handleVolumeChange(0);
                      } else {
                        handleVolumeChange(100);
                      }
                    }}
                    className="text-[11px] font-mono font-bold text-slate-300 hover:text-indigo-400 transition cursor-pointer min-w-[32px] text-right"
                    title="Click to cycle volume presets (100% -> 50% -> 0%)"
                  >
                    {engineState.muted ? '0%' : `${engineState.volume}%`}
                  </button>
                </div>

                {/* Display Mode (Aspect Ratio) Cycle Button */}
                <Focusable
                  id="btn-display-mode-control"
                  onSelect={handleCycleDisplayMode}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-mono text-slate-300 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Cycle Display Mode: Auto → 16:9 → 4:3 (Press A)"
                >
                  <Tv className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="text-slate-400 hidden sm:inline">Display Mode:</span>
                  <span className="font-bold text-cyan-300 uppercase">
                    {['16:9', '4:3'].includes(engineState.filters.aspectRatio)
                      ? engineState.filters.aspectRatio
                      : 'Auto'}
                  </span>
                </Focusable>

                {/* Live Protocol Format Switcher */}
                <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono shadow-inner">
                  <button
                    onClick={() => setActiveFormat('m3u8')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      activeFormat === 'm3u8'
                        ? 'bg-indigo-600 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Play HLS (Adaptive Segmented Stream)"
                  >
                    HLS
                  </button>
                  <button
                    onClick={() => setActiveFormat('ts')}
                    className={`px-2 py-0.5 rounded transition cursor-pointer ${
                      activeFormat === 'ts'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Play MPEG-TS (Continuous Demuxed Stream)"
                  >
                    TS
                  </button>
                </div>
              </div>

              {/* Right Utility Buttons: Stall Simulator & Fullscreen */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => globalPlayerEngine.triggerSimulatedStall(3000)}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-[11px] font-mono text-amber-300 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="Trigger Simulated Buffer Underrun to Test Auto-Recovery"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Stall Test</span>
                </button>

                <button
                  id="btn-toggle-fullscreen"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shadow-sm hover:scale-105 active:scale-95"
                  title={isFullscreen ? 'Exit Fullscreen (Press F)' : 'Enter Fullscreen (Press F)'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Channel Quick-Switcher Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tv className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-100">Live Channel Switcher</h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-bold">
                {channelMode === 'provider' ? `${totalLiveCount.toLocaleString()} Streams` : `${channels.length} Demo Streams`}
              </span>
              <button
                onClick={handleSyncSource}
                disabled={isSyncingSource}
                title="Sync / Reload Channels from Provider"
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSource ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => {
                setChannelMode('provider');
                setPage(1);
              }}
              className={`py-1 rounded font-semibold transition text-center ${
                channelMode === 'provider'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Provider Lineup ({totalLiveCount > 0 ? `${(totalLiveCount / 1000).toFixed(1)}k` : '26.8k'})
            </button>
            <button
              onClick={() => setChannelMode('sample')}
              className={`py-1 rounded font-semibold transition text-center ${
                channelMode === 'sample'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sample Demo (5)
            </button>
          </div>

          {/* Category Dropdown & Search (When in Provider Mode) */}
          {channelMode === 'provider' && (
            <div className="space-y-2">
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 truncate"
              >
                <option value="all">📁 All Categories (376 Categories)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.channelCount || 0})
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search 26k+ live channels..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {channelMode === 'sample' && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search demo channels..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Channels List */}
          <div className="space-y-2 overflow-y-auto max-h-[320px] pr-1 scrollbar-thin">
            {isLoadingLive ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span className="text-xs">Loading live channels...</span>
              </div>
            ) : (channelMode === 'provider' ? liveChannels : channels.filter((c) =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.category.toLowerCase().includes(searchQuery.toLowerCase())
              )).length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                No channels found matching the filter.
              </div>
            ) : (
              (channelMode === 'provider'
                ? liveChannels
                : channels.filter((c) =>
                    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    c.category.toLowerCase().includes(searchQuery.toLowerCase())
                  )
              ).map((ch) => {
                const isSelected = selectedChannel.id === ch.id;
                const isLivePlaying = isSelected && engineState.isPlaying;

                return (
                  <button
                    key={ch.id}
                    onClick={() => handlePlayChannel(ch)}
                    className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                      isLivePlaying
                        ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-950/50'
                        : isSelected
                        ? 'bg-slate-800/80 border-slate-700 text-slate-200'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <div className="space-y-1 truncate pr-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                          #{ch.id}
                        </span>
                        <span className="text-xs font-semibold truncate text-slate-100">{ch.name}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1.5">
                        <span className="text-slate-500 font-mono text-[9px]">CAT:</span>
                        <span className="truncate">{ch.category}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium truncate flex items-center gap-1.5">
                        <span className="text-indigo-400 font-bold text-[9px] font-mono">NOW:</span>
                        <span className="truncate">{ch.currentShow || 'Live Broadcast'}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1.5 pl-2">
                      <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                        .{ch.format || 'm3u8'}
                      </span>
                      {isLivePlaying && (
                        <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 font-mono bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.5 rounded">
                          <Activity className="w-3 h-3 animate-pulse" /> ON AIR
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination Controls for Provider Mode */}
          {channelMode === 'provider' && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer"
              >
                Previous
              </button>
              <span className="text-slate-400 font-mono text-[11px]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Video Filter & Shader Controls Panel */}
      {showFilterPanel && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-100">
                Video Shaders, Deinterlacing &amp; Aspect Ratio Controls
              </h3>
            </div>
            <button
              onClick={() => {
                globalPlayerEngine.setFilterAdjustment('brightness', 100);
                globalPlayerEngine.setFilterAdjustment('contrast', 100);
                globalPlayerEngine.setFilterAdjustment('saturation', 100);
                globalPlayerEngine.setDeinterlace('bwdif');
                globalPlayerEngine.setAspectRatio('auto');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline cursor-pointer"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Deinterlace Selector */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <label className="text-slate-300 font-semibold block">Deinterlacer Filter:</label>
              <select
                value={engineState.filters.deinterlace}
                onChange={(e) => globalPlayerEngine.setDeinterlace(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono text-xs focus:outline-none"
              >
                <option value="bwdif">Bwdif (Bob Weaver Motion-Adaptive 2x)</option>
                <option value="yadif">Yadif (Yet Another Deinterlacing Filter)</option>
                <option value="off">Off (Progressive Streams)</option>
              </select>
              <p className="text-[10px] text-slate-500">
                Doubles 29.97i/25i broadcast fields into smooth 59.94p/50p output.
              </p>
            </div>

            {/* Aspect Ratio Override */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <label className="text-slate-300 font-semibold block">Aspect Ratio Override:</label>
              <select
                value={engineState.filters.aspectRatio}
                onChange={(e) => globalPlayerEngine.setAspectRatio(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono text-xs focus:outline-none"
              >
                <option value="auto">Auto (Source Aspect 16:9)</option>
                <option value="16:9">16:9 Widescreen</option>
                <option value="4:3">4:3 Legacy CRT Box</option>
                <option value="21:9">21:9 Ultrawide Cinema</option>
                <option value="zoom">Zoom (Crop Edges)</option>
                <option value="fill">Fill (Stretch to Edge)</option>
              </select>
            </div>

            {/* Brightness / Contrast Sliders */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-300 font-semibold">Brightness:</span>
                <span className="font-mono text-indigo-300">{engineState.filters.brightness}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={150}
                value={engineState.filters.brightness}
                onChange={(e) => globalPlayerEngine.setFilterAdjustment('brightness', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />

              <div className="flex justify-between pt-1">
                <span className="text-slate-300 font-semibold">Contrast:</span>
                <span className="font-mono text-indigo-300">{engineState.filters.contrast}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={150}
                value={engineState.filters.contrast}
                onChange={(e) => globalPlayerEngine.setFilterAdjustment('contrast', parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Hardware Acceleration Profile */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <label className="text-slate-300 font-semibold block">HW Acceleration API:</label>
              <select
                value={engineState.hwdec}
                onChange={(e) => globalPlayerEngine.setHwdec(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-slate-200 font-mono text-xs focus:outline-none"
              >
                <option value="d3d11va">Direct3D 11 Video (Windows Default)</option>
                <option value="nvdec">NVDEC (Nvidia PureVideo GPU)</option>
                <option value="vaapi">VA-API (Intel/AMD Linux)</option>
                <option value="auto-safe">Auto Safe Fallback</option>
                <option value="disabled">Disabled (Software CPU Decode)</option>
              </select>
              <p className="text-[10px] text-slate-500">
                Zero-copy GPU VRAM surface decode for 4K 60FPS HEVC/H.264 streams.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

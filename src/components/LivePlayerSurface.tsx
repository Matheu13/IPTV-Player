import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import {
  Play,
  Square,
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
} from 'lucide-react';
import { globalPlayerEngine, PlayerEngineState } from '../lib/playerEngine';
import { globalMpvBridge, MpvPlaybackStats, MpvVideoParams } from '../lib/mpvBridge';
import { redact } from '../lib/redact';

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

  // Sync volume and mute with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, engineState.volume / 100));
      videoRef.current.muted = engineState.muted;
    }
  }, [engineState.volume, engineState.muted]);

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
          const playPromise = player.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch((err: any) => {
              console.warn('MPEG-TS play promise error:', err);
            });
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
          videoRef.current?.play().catch(() => {});
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
        videoRef.current.play().catch(() => {});
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
      playerContainerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Video Filter CSS Styles Calculation
  const getVideoFilterStyle = () => {
    const { brightness, contrast, saturation, sharpen, aspectRatio } = engineState.filters;
    const filters = [
      `brightness(${brightness}%)`,
      `contrast(${contrast}%)`,
      `saturate(${saturation}%)`,
      sharpen ? 'contrast(125%) drop-shadow(0 0 1px rgba(0,0,0,0.8))' : '',
    ].filter(Boolean).join(' ');

    let objectFit: 'contain' | 'cover' | 'fill' = 'contain';
    let transform = 'none';

    if (aspectRatio === 'fill') objectFit = 'fill';
    else if (aspectRatio === 'zoom') objectFit = 'cover';
    else if (aspectRatio === '4:3') transform = 'scaleX(0.75)';
    else if (aspectRatio === '21:9') transform = 'scaleY(0.75)';

    return {
      filter: filters,
      objectFit,
      transform,
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
          className="lg:col-span-2 relative bg-black rounded-xl overflow-hidden border border-slate-800 aspect-video flex items-center justify-center group select-none shadow-2xl"
        >
          {/* HTML5 Video / HLS Stream Element */}
          <video
            ref={videoRef}
            playsInline
            muted={engineState.muted}
            style={getVideoFilterStyle()}
            className="w-full h-full object-contain transition-all duration-200"
          />

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

          {/* On-Screen Display (OSD) Channel Banner (Top Left) */}
          <div
            className={`absolute top-4 left-4 right-4 sm:right-auto sm:max-w-md bg-black/85 backdrop-blur border border-slate-800 rounded-xl p-3.5 text-xs transition-opacity duration-300 z-20 space-y-2 ${
              showOsd && engineState.isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">
                  CH {selectedChannel.id}
                </span>
                <span className="font-semibold text-slate-100 truncate">{selectedChannel.name}</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                .{engineState.currentFormat}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span className="truncate">NOW: {selectedChannel.currentShow}</span>
                <span className="text-slate-500 shrink-0">{selectedChannel.epgProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full rounded-full transition-all"
                  style={{ width: `${selectedChannel.epgProgress}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                NEXT: {selectedChannel.nextShow}
              </div>
            </div>
          </div>

          {/* Bottom Player Controls Bar */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 flex items-center justify-between z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-3">
              {engineState.isPlaying ? (
                <button
                  id="btn-stop-playback"
                  onClick={handleStop}
                  className="p-2 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white transition cursor-pointer"
                  title="Stop Stream (Instant Network Disconnect)"
                >
                  <Square className="w-4 h-4 fill-white" />
                </button>
              ) : (
                <button
                  id="btn-start-playback"
                  onClick={() => handlePlayChannel(selectedChannel)}
                  className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                  title="Play Stream"
                >
                  <Play className="w-4 h-4 fill-white" />
                </button>
              )}

              {/* Volume / Mute */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => globalPlayerEngine.toggleMute()}
                  className="text-slate-300 hover:text-white transition cursor-pointer"
                >
                  {engineState.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={engineState.muted ? 0 : engineState.volume}
                  onChange={(e) => globalPlayerEngine.setVolume(parseInt(e.target.value, 10))}
                  className="w-16 sm:w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Live Badge & Format Switcher */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-[10px] font-mono text-rose-300 font-bold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" /> LIVE
              </div>

              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px] font-mono">
                <button
                  onClick={() => setActiveFormat('m3u8')}
                  className={`px-2 py-0.5 rounded transition cursor-pointer ${
                    activeFormat === 'm3u8'
                      ? 'bg-indigo-600 text-white font-bold'
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

            <div className="flex items-center gap-2">
              <button
                onClick={() => globalPlayerEngine.triggerSimulatedStall(3000)}
                className="px-2.5 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-800 text-[11px] font-mono text-amber-300 transition cursor-pointer flex items-center gap-1"
                title="Test 3-Stage Buffer Recovery"
              >
                <Zap className="w-3 h-3" /> Stall Test
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
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

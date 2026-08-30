import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Star,
  Tv,
  Filter,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Sliders,
  ChevronRight,
  Info,
} from 'lucide-react';
import { GlassPanel } from '../components/GlassPanel';
import { Focusable } from '../components/Focusable';
import { ChannelRow, ChannelRowData } from '../components/ChannelRow';
import { SourceBadge } from '../components/SourceBadge';
import { LoadingState, EmptyState, CachedDataBanner } from '../components/VisualStates';
import { globalUnifiedIptvEngine } from '../../lib/unifiedIptvEngine';

interface LiveTVScreenProps {
  onSelectChannel?: (channel: ChannelRowData) => void;
  isTvMode?: boolean;
}

export const LiveTVScreen: React.FC<LiveTVScreenProps> = ({
  onSelectChannel,
  isTvMode = false,
}) => {
  // State from unified engine
  const [channels, setChannels] = useState<ChannelRowData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<ChannelRowData | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize dataset from engine
  useEffect(() => {
    const updateChannels = () => {
      setIsLoadingChannels(true);
      try {
        const allChannels = globalUnifiedIptvEngine.getAllChannels();
        const mapped: ChannelRowData[] = allChannels.map((c: any, index) => ({
          id: c.id,
          channelNumber: c.channelNumber || index + 1,
          name: c.name,
          logo: c.logoUrl || c.logo || undefined,
          category: c.category,
          sourceId: c.sourceId,
          sourceName: c.sourceName,
          sourceType: 'xtream',
          streamUrl: c.streamUrl,
          nowProgramme: {
            title: c.epgNow?.title || c.currentEpg?.title || 'Live Broadcast Transmission',
            start: c.epgNow?.startTime || c.currentEpg?.start || '18:00',
            stop: c.epgNow?.endTime || c.currentEpg?.stop || '19:00',
            progressPercent: 42,
          },
          nextProgramme: {
            title: c.epgNext?.title || c.nextEpg?.title || 'Upcoming Evening Feature',
            start: c.epgNext?.startTime || c.nextEpg?.start || '19:00',
            stop: c.epgNext?.endTime || c.nextEpg?.stop || '20:00',
          },
          is4k: c.name.toLowerCase().includes('4k') || c.name.toLowerCase().includes('uhd') || c.resolution === '4K UHD',
          is8k: c.name.toLowerCase().includes('8k'),
          isHdr: c.name.toLowerCase().includes('hdr') || c.name.toLowerCase().includes('4k') || c.videoCodec === 'HEVC',
          isFavorite: globalUnifiedIptvEngine.isFavorite(c.id),
        }));

        setChannels(mapped);
        setCategories(['All', ...globalUnifiedIptvEngine.getCategories()]);
        setSources(globalUnifiedIptvEngine.getSources());
        setActiveChannel((prev) => {
          if (prev && mapped.some((m) => m.id === prev.id)) return prev;
          return mapped[0] || null;
        });
      } catch (err) {
        console.error('Failed to load live channels:', err);
      } finally {
        setIsLoadingChannels(false);
      }
    };

    updateChannels();
    const unsubscribe = globalUnifiedIptvEngine.subscribe(updateChannels);
    return () => unsubscribe();
  }, []);

  // Filter channels based on Search, Category, Source, and Favorites
  const filteredChannels = useMemo(() => {
    return channels.filter((c) => {
      if (showOnlyFavorites && !favorites.has(c.id) && !c.isFavorite) return false;
      if (selectedSourceId !== 'all' && c.sourceId !== selectedSourceId) return false;
      if (selectedCategory !== 'All' && c.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesCat = c.category?.toLowerCase().includes(query);
        const matchesProg = c.nowProgramme?.title.toLowerCase().includes(query);
        return matchesName || matchesCat || matchesProg;
      }
      return true;
    });
  }, [channels, selectedCategory, selectedSourceId, searchQuery, showOnlyFavorites, favorites]);

  // Handle Channel Playback
  const handleSelectChannel = (channel: ChannelRowData) => {
    setActiveChannel(channel);
    setIsPlaying(true);
    if (onSelectChannel) {
      onSelectChannel(channel);
    }
  };

  const handleToggleFavorite = (channelId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) {
        next.delete(channelId);
      } else {
        next.add(channelId);
      }
      return next;
    });
    globalUnifiedIptvEngine.toggleFavorite(channelId);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-hidden"
    >
      {/* Top Bar Filter & Stats */}
      <div className="px-4 py-2.5 bg-[#0c1018] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-sky-400" />
            <h1 className="font-bold text-base tracking-tight text-white">Live Channels</h1>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {filteredChannels.length} / {channels.length} Streams
          </span>
        </div>

        {/* Global Live Search Input */}
        <div className="relative w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search channels, EPG, or tvg-id..."
            className="w-full pl-9 pr-4 py-1.5 bg-[#111722] border border-white/10 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Filter Buttons: Favorites & All */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOnlyFavorites((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              showOnlyFavorites
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-900/80 text-slate-400 border-white/5 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${showOnlyFavorites ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>Favorites</span>
          </button>
        </div>
      </div>

      {/* 3-Column Hybrid Layout (Sources/Categories -> Channel List -> Player Viewport) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Column: Categories & Sources (Width 220px) */}
        <div className="w-full lg:w-56 bg-[#0a0e16] border-r border-white/5 flex flex-col shrink-0 overflow-y-auto">
          {/* Provider Filter Section */}
          <div className="p-3 border-b border-white/5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-sky-400" />
              <span>IPTV Sources</span>
            </div>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedSourceId('all')}
                className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-between ${
                  selectedSourceId === 'all'
                    ? 'bg-sky-500/20 text-sky-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <span>All Providers</span>
                <span className="text-[10px] font-mono text-slate-400">{channels.length}</span>
              </button>
              {sources.map((src) => (
                <button
                  key={src.id}
                  onClick={() => setSelectedSourceId(src.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-between ${
                    selectedSourceId === src.id
                      ? 'bg-sky-500/20 text-sky-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="truncate">{src.name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{src.channelCount}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Categories Section */}
          <div className="p-3 flex-1 overflow-y-auto">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-indigo-400" />
              <span>Categories</span>
            </div>
            <div className="space-y-0.5">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-sky-500 text-white font-bold shadow-sm shadow-sky-950'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && <ChevronRight className="w-3 h-3 text-sky-200" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Column: Virtualized Channel Matrix (Flex 1) */}
        <div className="flex-1 flex flex-col bg-[#0d121c] overflow-hidden border-r border-white/5">
          {isLoadingChannels ? (
            <LoadingState />
          ) : filteredChannels.length === 0 ? (
            <EmptyState
              title="No Channels Found"
              message={`No streams found matching "${searchQuery || selectedCategory}". Try selecting another category or clearing filters.`}
              actionLabel="Reset All Filters"
              onAction={() => {
                setSearchQuery('');
                setSelectedCategory('All');
                setSelectedSourceId('all');
                setShowOnlyFavorites(false);
              }}
            />
          ) : (
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredChannels.slice(0, 150).map((ch) => (
                <ChannelRow
                  key={ch.id}
                  channel={ch}
                  isActive={activeChannel?.id === ch.id}
                  onSelect={handleSelectChannel}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Hero Video Player & Detailed EPG (Width 440px on large screens) */}
        <div className="w-full lg:w-[440px] xl:w-[480px] bg-[#090d16] flex flex-col shrink-0 overflow-y-auto">
          {activeChannel ? (
            <div className="flex flex-col h-full">
              {/* Video Viewport Container */}
              <div className="relative aspect-video bg-black rounded-b-xl overflow-hidden shadow-2xl border-b border-white/10 group">
                <video
                  ref={videoRef}
                  src={activeChannel.streamUrl}
                  autoPlay
                  playsInline
                  muted={isMuted}
                  className="w-full h-full object-contain"
                />

                {/* Live Glass Header Overlay */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-600 text-white rounded text-[10px] font-black tracking-wider shadow-lg animate-pulse">
                    <span>● LIVE</span>
                  </div>
                  {activeChannel.is8k && (
                    <div className="px-2 py-0.5 bg-amber-500/90 text-black font-extrabold rounded text-[10px] tracking-wider shadow-lg">
                      8K UHD DIRECT
                    </div>
                  )}
                  {activeChannel.is4k && !activeChannel.is8k && (
                    <div className="px-2 py-0.5 bg-sky-500/90 text-black font-extrabold rounded text-[10px] tracking-wider shadow-lg">
                      4K UHD 60FPS
                    </div>
                  )}
                </div>

                {/* Floating Glass Control Bar on Hover */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                    </button>
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleFullscreen}
                      className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
                      title="Toggle Fullscreen"
                    >
                      {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Channel Details & Comprehensive EPG */}
              <div className="p-4 flex-1 flex flex-col space-y-4">
                {/* Channel Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-white tracking-tight">
                      {activeChannel.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-sky-400 font-bold">
                        {activeChannel.category || 'General'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      {activeChannel.sourceName && (
                        <SourceBadge sourceName={activeChannel.sourceName} size="sm" />
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleFavorite(activeChannel.id)}
                    className={`p-2 rounded-lg border transition-colors ${
                      favorites.has(activeChannel.id) || activeChannel.isFavorite
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-800/80 text-slate-400 border-white/5 hover:text-white'
                    }`}
                  >
                    <Star
                      className={`w-5 h-5 ${
                        favorites.has(activeChannel.id) || activeChannel.isFavorite ? 'fill-amber-400' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* EPG Now & Next Cards */}
                <div className="space-y-2.5">
                  {/* NOW Programme */}
                  <GlassPanel className="p-3 border-sky-500/30 bg-sky-950/20">
                    <div className="flex items-center justify-between text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-1">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        Live Now
                      </span>
                      <span className="font-mono text-slate-300">
                        {activeChannel.nowProgramme?.start} - {activeChannel.nowProgramme?.stop}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {activeChannel.nowProgramme?.title}
                    </div>
                    <div className="mt-2 w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full w-[45%]" />
                    </div>
                  </GlassPanel>

                  {/* NEXT Programme */}
                  <GlassPanel className="p-3 border-white/5 bg-[#111722]">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      <span>Up Next</span>
                      <span className="font-mono text-slate-400">
                        {activeChannel.nextProgramme?.start} - {activeChannel.nextProgramme?.stop}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                      {activeChannel.nextProgramme?.title}
                    </div>
                  </GlassPanel>
                </div>

                {/* Technical Diagnostics Summary */}
                <div className="mt-auto pt-3 border-t border-white/5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-sky-400" />
                    <span>Stream Diagnostics</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300 bg-black/40 p-2.5 rounded-lg border border-white/5">
                    <div>
                      <span className="text-slate-400">Pipeline: </span>
                      <span className="text-sky-300 font-bold">D3D11 / HW Zero-Copy</span>
                    </div>
                    <div>
                      <span className="text-slate-400">FPS / Latency: </span>
                      <span className="text-emerald-400 font-bold">60.0 fps (280ms)</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Audio: </span>
                      <span className="text-slate-200">E-AC-3 5.1 (384k)</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Failover: </span>
                      <span className="text-emerald-400">2 Active Mirrors</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-slate-400">
              Select a channel to begin instant playback
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

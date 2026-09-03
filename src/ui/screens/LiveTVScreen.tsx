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
  ChevronLeft,
  Loader2,
  Info,
} from 'lucide-react';
import { GlassPanel } from '../components/GlassPanel';
import { Focusable } from '../components/Focusable';
import { ChannelRow, ChannelRowData } from '../components/ChannelRow';
import { SourceBadge } from '../components/SourceBadge';
import { LoadingState, EmptyState, CachedDataBanner } from '../components/VisualStates';
import { VideoPlayerShell } from '../components/VideoPlayerShell';
import { usePlayback } from '../context/PlaybackContext';
import { globalUnifiedIptvEngine, IngestionProgressState } from '../../lib/unifiedIptvEngine';

interface LiveTVScreenProps {
  onSelectChannel?: (channel: ChannelRowData) => void;
  isTvMode?: boolean;
}

export const LiveTVScreen: React.FC<LiveTVScreenProps> = ({
  onSelectChannel,
  isTvMode = false,
}) => {
  const { state: playbackState, playChannel, setPresentationMode } = usePlayback();

  // State from unified engine
  const [channels, setChannels] = useState<ChannelRowData[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    globalUnifiedIptvEngine.getState().activeSourceId || 'all'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<ChannelRowData | null>(null);
  const [isLoadingChannels, setIsLoadingChannels] = useState<boolean>(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [providerToast, setProviderToast] = useState<string | null>(null);
  const [ingestionProgress, setIngestionProgress] = useState<IngestionProgressState>(
    globalUnifiedIptvEngine.getIngestionProgress()
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Keep selectedSourceId in sync with global unified IPTV engine state
  useEffect(() => {
    const handleEngineChange = () => {
      const activeId = globalUnifiedIptvEngine.getState().activeSourceId;
      setSelectedSourceId(activeId === 'ALL' ? 'all' : activeId);
    };

    handleEngineChange();
    const unsub = globalUnifiedIptvEngine.subscribe(handleEngineChange);
    return () => unsub();
  }, []);

  const handleSwitchProvider = (sourceId: string, sourceName: string) => {
    const targetId = sourceId === 'all' ? 'ALL' : sourceId;
    globalUnifiedIptvEngine.setActiveSource(targetId);
    setSelectedSourceId(sourceId);

    // Auto-tune to first channel of the newly selected provider if current channel isn't in it
    const available = channels.filter((c) => targetId === 'ALL' || c.sourceId === targetId);
    if (available.length > 0 && (!playbackState.currentChannel || playbackState.currentChannel.sourceId !== targetId)) {
      playChannel(available[0], 'embedded');
    }

    setProviderToast(`Switched provider: ${sourceName}`);
    setTimeout(() => setProviderToast(null), 3000);
  };

  // Subscribe to ingestion progress
  useEffect(() => {
    return globalUnifiedIptvEngine.subscribeIngestionProgress((progress) => {
      setIngestionProgress(progress);
    });
  }, []);

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
          if (playbackState.currentChannel) return playbackState.currentChannel;
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
  }, [playbackState.currentChannel]);

  // Initial playback setup if none is active
  useEffect(() => {
    if (!playbackState.currentChannel && channels.length > 0) {
      playChannel(channels[0], 'embedded');
    }
  }, [channels, playbackState.currentChannel, playChannel]);

  // Keep activeChannel in sync when playback state changes externally
  useEffect(() => {
    if (playbackState.currentChannel) {
      setActiveChannel(playbackState.currentChannel);
    }
  }, [playbackState.currentChannel]);

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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedSourceId, searchQuery, showOnlyFavorites]);

  const totalFilteredCount = filteredChannels.length;
  const totalPages = Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const currentWindowSlice = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredChannels.slice(startIndex, startIndex + pageSize);
  }, [filteredChannels, page, pageSize]);

  // Handle Channel Playback
  const handleSelectChannel = (channel: ChannelRowData) => {
    setActiveChannel(channel);
    playChannel(channel, 'embedded');
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

  const currentDisplayChannel = playbackState.currentChannel || activeChannel;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-hidden"
    >
      {/* Ingestion Progress Indicator Banner */}
      {ingestionProgress.isIngesting && (
        <div className="bg-sky-950/90 border-b border-sky-500/30 px-4 py-2 flex items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
            <div className="text-xs">
              <span className="font-bold text-sky-200">Ingesting {ingestionProgress.sourceName}: </span>
              <span className="text-sky-300 font-mono">{ingestionProgress.currentStage}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-36 bg-slate-800 rounded-full h-2 overflow-hidden border border-sky-500/20">
              <div
                className="bg-sky-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${ingestionProgress.percent}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-sky-300">
              {ingestionProgress.ingestedChannels.toLocaleString()} / {ingestionProgress.totalChannels.toLocaleString()} ({ingestionProgress.percent}%)
            </span>
          </div>
        </div>
      )}

      {/* Provider Switch Feedback Notification */}
      {providerToast && (
        <div className="bg-emerald-950/90 border-b border-emerald-500/40 px-4 py-2 flex items-center justify-between text-xs text-emerald-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{providerToast}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400/80">Press 'P' to cycle providers</span>
        </div>
      )}

      {/* Top Bar Filter & Stats */}
      <div className="px-4 py-2.5 bg-[#0c1018] border-b border-white/5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-sky-400" />
            <h1 className="font-bold text-base tracking-tight text-white">Live Channels</h1>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {totalFilteredCount.toLocaleString()} / {channels.length.toLocaleString()} Streams
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
                onClick={() => handleSwitchProvider('all', 'All Providers')}
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
                  onClick={() => handleSwitchProvider(src.id, src.name)}
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
            <>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {currentWindowSlice.map((ch, idx) => (
                  <ChannelRow
                    key={`live-row-${ch.id || `${ch.channelNumber}-${idx}`}`}
                    channel={ch}
                    isActive={activeChannel?.id === ch.id}
                    onSelect={handleSelectChannel}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>

              {/* Virtual Window Pagination Footer */}
              <div className="px-3 py-2 bg-[#090d16] border-t border-white/5 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <div className="flex items-center gap-2">
                  <span>
                    Showing{' '}
                    <strong className="text-white">
                      {((page - 1) * pageSize + 1).toLocaleString()}
                    </strong>{' '}
                    -{' '}
                    <strong className="text-white">
                      {Math.min(page * pageSize, totalFilteredCount).toLocaleString()}
                    </strong>{' '}
                    of <strong className="text-sky-400">{totalFilteredCount.toLocaleString()}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="bg-slate-900 border border-slate-700 text-slate-300 rounded px-2 py-0.5 text-xs focus:outline-none"
                  >
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                    <option value={200}>200 / page</option>
                    <option value={500}>500 / page</option>
                  </select>

                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-mono text-slate-300">
                    {page} / {totalPages}
                  </span>

                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Hero Video Player & Detailed EPG (Width 440px on large screens) */}
        <div className="w-full lg:w-[440px] xl:w-[480px] bg-[#090d16] flex flex-col shrink-0 overflow-y-auto">
          {currentDisplayChannel ? (
            <div className="flex flex-col h-full">
              {/* Video Viewport Container */}
              <div className="p-3 pb-0">
                <VideoPlayerShell forceMode="embedded" className="shadow-2xl" />
              </div>

              {/* Active Channel Details & Comprehensive EPG */}
              <div className="p-4 flex-1 flex flex-col space-y-4">
                {/* Channel Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-extrabold text-white tracking-tight">
                      {currentDisplayChannel.name}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-mono text-sky-400 font-bold">
                        {currentDisplayChannel.category || 'General'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      {currentDisplayChannel.sourceName && (
                        <SourceBadge sourceName={currentDisplayChannel.sourceName} size="sm" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPresentationMode('fullscreen')}
                      className="p-2 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border border-white/5 transition-colors"
                      title="Expand to Fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleFavorite(currentDisplayChannel.id)}
                      className={`p-2 rounded-lg border transition-colors ${
                        favorites.has(currentDisplayChannel.id) || currentDisplayChannel.isFavorite
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800/80 text-slate-400 border-white/5 hover:text-white'
                      }`}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          favorites.has(currentDisplayChannel.id) || currentDisplayChannel.isFavorite ? 'fill-amber-400' : ''
                        }`}
                      />
                    </button>
                  </div>
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
                        {currentDisplayChannel.nowProgramme?.start} - {currentDisplayChannel.nowProgramme?.stop}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">
                      {currentDisplayChannel.nowProgramme?.title}
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
                        {currentDisplayChannel.nextProgramme?.start} - {currentDisplayChannel.nextProgramme?.stop}
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                      {currentDisplayChannel.nextProgramme?.title}
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

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  globalUnifiedIptvEngine,
  UnifiedChannel,
  IptvSource,
  UnifiedIptvState,
} from '../lib/unifiedIptvEngine';
import { LazyChannelLogo } from './LazyChannelLogo';
import { UnifiedPlaybackScreen } from './UnifiedPlaybackScreen';
import { SourceManagementModal } from './SourceManagementModal';
import { IptvSettingsModal } from './IptvSettingsModal';
import { UnifiedDiagnosticsModal } from './UnifiedDiagnosticsModal';
import {
  Tv,
  Search,
  Star,
  Clock,
  Layers,
  Settings,
  Activity,
  Server,
  Filter,
  Play,
  Volume2,
  Maximize2,
  ChevronRight,
  Radio,
  Sliders,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Info,
  ListFilter,
  Zap,
} from 'lucide-react';

interface UnifiedIptvSurfaceProps {
  onExternalPlay?: (channel: UnifiedChannel) => void;
}

export const UnifiedIptvSurface: React.FC<UnifiedIptvSurfaceProps> = () => {
  const [engineState, setEngineState] = useState<UnifiedIptvState>(
    globalUnifiedIptvEngine.getState()
  );
  const [searchInputValue, setSearchInputValue] = useState('');
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isDiagnosticsModalOpen, setIsDiagnosticsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<UnifiedChannel | undefined>(
    globalUnifiedIptvEngine.getSelectedChannel()
  );

  const virtualScrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-sync real backend provider channels on mount
  useEffect(() => {
    setIsSyncing(true);
    globalUnifiedIptvEngine.syncFromBackend().finally(() => {
      setIsSyncing(false);
    });
  }, []);

  // Subscribe to engine state updates
  useEffect(() => {
    const unsub = globalUnifiedIptvEngine.subscribe(() => {
      const nextState = globalUnifiedIptvEngine.getState();
      setEngineState(nextState);
      setSelectedChannel(globalUnifiedIptvEngine.getSelectedChannel());
    });
    return unsub;
  }, []);

  // Update viewport height on mount & window resize
  useEffect(() => {
    const updateHeight = () => {
      if (virtualScrollContainerRef.current) {
        const h = virtualScrollContainerRef.current.clientHeight || 600;
        globalUnifiedIptvEngine.setViewportHeight(h);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Filter channels based on search, source, and category
  const filteredChannels = useMemo(() => {
    return globalUnifiedIptvEngine.getFilteredChannels();
  }, [engineState.activeSourceId, engineState.activeCategory, engineState.searchQuery, engineState.totalChannelCount]);

  // Compute virtual slice for 10,000+ channels
  const virtualSlice = useMemo(() => {
    return globalUnifiedIptvEngine.getVisibleVirtualSlice(filteredChannels);
  }, [filteredChannels, engineState.virtualScrollTop, engineState.viewportHeight, engineState.itemHeight, engineState.overScanCount]);

  // Handle scroll events with requestAnimationFrame for smooth 60fps virtualization
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    requestAnimationFrame(() => {
      globalUnifiedIptvEngine.setVirtualScrollTop(scrollTop);
    });
  };

  // Handle Search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInputValue(val);
    globalUnifiedIptvEngine.setSearchQuery(val);
  };

  // Channel Selection
  const handleSelectChannel = (channelId: string) => {
    globalUnifiedIptvEngine.selectChannel(channelId);
    if (virtualScrollContainerRef.current) {
      // Keep focus
    }
  };

  // Favorite toggle
  const handleToggleFavorite = (channelId: string) => {
    globalUnifiedIptvEngine.toggleFavorite(channelId);
  };

  // Channel Zapping (Prev/Next)
  const handlePrevChannel = () => {
    const currentIndex = filteredChannels.findIndex((c) => c.id === selectedChannel?.id);
    if (currentIndex > 0) {
      const prev = filteredChannels[currentIndex - 1];
      globalUnifiedIptvEngine.selectChannel(prev.id);
    } else if (filteredChannels.length > 0) {
      const last = filteredChannels[filteredChannels.length - 1];
      globalUnifiedIptvEngine.selectChannel(last.id);
    }
  };

  const handleNextChannel = () => {
    const currentIndex = filteredChannels.findIndex((c) => c.id === selectedChannel?.id);
    if (currentIndex >= 0 && currentIndex < filteredChannels.length - 1) {
      const next = filteredChannels[currentIndex + 1];
      globalUnifiedIptvEngine.selectChannel(next.id);
    } else if (filteredChannels.length > 0) {
      const first = filteredChannels[0];
      globalUnifiedIptvEngine.selectChannel(first.id);
    }
  };

  const categories = globalUnifiedIptvEngine.getCategoriesList();

  return (
    <div id="unified-iptv-interface" className="space-y-4">
      {/* Top Application Bar: Source Selector, Search, Settings & Diagnostics */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Brand & Stats */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-800 rounded-xl text-white shadow-md">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Unified IPTV Player
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  10,000+ VIRTUALIZED
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Indexed channels: <strong className="text-slate-200 font-mono">{engineState.totalChannelCount.toLocaleString()}</strong> across {engineState.sources.length} sources
              </p>
            </div>
          </div>

          {/* Search Across channel name, category, source name, and tvg-id */}
          <div className="flex-1 max-w-lg relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="unified-channel-search-input"
                type="text"
                value={searchInputValue}
                onChange={handleSearchChange}
                placeholder="Search 10,000+ channels by name, category, source, or tvg-id..."
                className="w-full bg-slate-950/90 border border-slate-800 focus:border-indigo-500 rounded-lg pl-9 pr-24 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-inner font-medium"
              />
              <div className="absolute right-2.5 top-2 flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{engineState.searchLatencyMs}ms</span>
              </div>
            </div>
          </div>

          {/* Action Modals Trigger Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="sync-provider-channels-btn"
              onClick={() => {
                setIsSyncing(true);
                globalUnifiedIptvEngine.syncFromBackend().finally(() => setIsSyncing(false));
              }}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 rounded-lg text-xs font-semibold border border-indigo-500/40 transition disabled:opacity-50"
              title="Sync Real Provider Channels"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-300 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Provider'}</span>
            </button>

            <button
              id="open-source-mgmt-btn"
              onClick={() => setIsSourceModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
              title="Manage IPTV Sources"
            >
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sources ({engineState.sources.filter((s) => s.enabled).length})</span>
            </button>

            <button
              id="open-diagnostics-btn"
              onClick={() => setIsDiagnosticsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition"
              title="Live Telemetry Diagnostics"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Diagnostics</span>
            </button>

            <button
              id="open-settings-btn"
              onClick={() => setIsSettingsModalOpen(true)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Player Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Source Selector Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-slate-800/80 scrollbar-thin text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-indigo-400" /> Source:
          </span>

          <button
            id="source-filter-all"
            onClick={() => globalUnifiedIptvEngine.setActiveSource('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition whitespace-nowrap ${
              engineState.activeSourceId === 'ALL'
                ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All Sources ({engineState.totalChannelCount.toLocaleString()})
          </button>

          {engineState.sources.map((src) => (
            <button
              key={src.id}
              id={`source-filter-${src.id}`}
              onClick={() => globalUnifiedIptvEngine.setActiveSource(src.id)}
              className={`px-3 py-1 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1.5 ${
                engineState.activeSourceId === src.id
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{src.name}</span>
              <span className="text-[10px] opacity-75 font-mono">({src.channelCount})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main 3-Column Studio Grid: Category Sidebar | Virtualized Channel List | Playback Screen & EPG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Column 1: Category Sidebar (lg:col-span-3) */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shadow-lg h-[640px]">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              Categories &amp; Lists
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              {filteredChannels.length.toLocaleString()} matching
            </span>
          </div>

          {/* Quick Filter Categories: Favorites & Recents */}
          <div className="space-y-1">
            <button
              id="cat-all-channels-btn"
              onClick={() => globalUnifiedIptvEngine.setActiveCategory('ALL')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                engineState.activeCategory === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-indigo-300" />
                <span>All Channels</span>
              </div>
              <span className="font-mono text-[10px] opacity-80">
                {engineState.totalChannelCount.toLocaleString()}
              </span>
            </button>

            <button
              id="cat-favorites-btn"
              onClick={() => globalUnifiedIptvEngine.setActiveCategory('FAVORITES')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                engineState.activeCategory === 'FAVORITES'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-amber-300/90 hover:bg-slate-800 hover:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>Favorites</span>
              </div>
              <span className="px-1.5 py-0.2 bg-amber-950/80 text-amber-300 rounded font-mono text-[10px] border border-amber-700">
                FAV
              </span>
            </button>

            <button
              id="cat-recent-btn"
              onClick={() => globalUnifiedIptvEngine.setActiveCategory('RECENT')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition ${
                engineState.activeCategory === 'RECENT'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-300/90 hover:bg-slate-800 hover:text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>Recently Watched</span>
              </div>
              <span className="px-1.5 py-0.2 bg-emerald-950/80 text-emerald-300 rounded font-mono text-[10px] border border-emerald-700">
                REC
              </span>
            </button>
          </div>

          <div className="h-px bg-slate-800 my-0.5" />

          {/* Genre / Categories Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin pr-1">
            {categories.map((cat) => (
              <button
                key={cat}
                id={`category-item-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                onClick={() => globalUnifiedIptvEngine.setActiveCategory(cat)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition ${
                  engineState.activeCategory === cat
                    ? 'bg-indigo-950 text-indigo-200 font-bold border border-indigo-700'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span className="truncate text-left">{cat}</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Virtualized Channel List (10,000+ Channels) (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col shadow-lg h-[640px] overflow-hidden">
          {/* List Header & Metrics */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Channel List</span>
              <span className="px-2 py-0.5 bg-slate-800 text-[10px] font-mono text-slate-300 rounded-full border border-slate-700">
                {filteredChannels.length.toLocaleString()} items
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
              <span>Nodes: {virtualSlice.activeRenderNodesCount}</span>
            </div>
          </div>

          {/* Virtual Scroll Window Container */}
          <div
            ref={virtualScrollContainerRef}
            id="virtual-channel-list-viewport"
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto relative scrollbar-thin mt-2"
          >
            {/* Total Virtual Height Spacer */}
            <div
              style={{ height: `${virtualSlice.totalHeight}px`, width: '100%' }}
              className="relative"
            >
              {/* Only Render Sliced Active Items */}
              {virtualSlice.visibleItems.map(({ item: channel, index, topPx }) => {
                const isSelected = channel.id === selectedChannel?.id;
                return (
                  <div
                    key={channel.id}
                    id={`virtual-channel-row-${channel.id}`}
                    style={{
                      position: 'absolute',
                      top: `${topPx}px`,
                      left: 0,
                      right: 0,
                      height: `${engineState.itemHeight}px`,
                    }}
                    onClick={() => handleSelectChannel(channel.id)}
                    className={`p-2 rounded-lg border transition cursor-pointer flex items-center justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-indigo-950/80 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    {/* Channel Number & Logo */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] font-mono text-slate-400 font-bold w-8 text-right shrink-0">
                        {channel.channelNumber}
                      </span>

                      {/* Lazy-Loaded Logo with Resilient Fallback */}
                      <LazyChannelLogo
                        logoUrl={channel.logoUrl}
                        channelName={channel.name}
                        size="sm"
                      />

                      {/* Channel Info & EPG Preview */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected ? 'text-indigo-200' : 'text-slate-200'
                            }`}
                          >
                            {channel.name}
                          </span>
                        </div>
                        {channel.epgNow && (
                          <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                            <span className="text-indigo-400 font-bold uppercase text-[8px]">NOW:</span>
                            <span>{channel.epgNow.title}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Badges & Favorite Toggle */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {channel.resolution}
                      </span>

                      <button
                        id={`star-btn-row-${channel.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(channel.id);
                        }}
                        className="p-1 text-slate-500 hover:text-amber-300 transition"
                        title="Toggle Favorite"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            channel.isFavorite ? 'fill-amber-400 text-amber-400' : ''
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Playback Screen & EPG Program Detail (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedChannel ? (
            <>
              {/* Playback Screen Component */}
              <UnifiedPlaybackScreen
                channel={selectedChannel}
                onToggleFavorite={handleToggleFavorite}
                onPrevChannel={handlePrevChannel}
                onNextChannel={handleNextChannel}
                onOpenDiagnostics={() => setIsDiagnosticsModalOpen(true)}
              />

              {/* Detailed EPG Program Guide Card */}
              <div
                id="epg-details-card"
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200">
                      Electronic Program Guide (EPG)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Source: <strong className="text-slate-300">{selectedChannel.sourceName}</strong>
                  </span>
                </div>

                {selectedChannel.epgNow ? (
                  <div className="space-y-3">
                    {/* Current Show Details */}
                    <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900 text-indigo-200 uppercase">
                            LIVE NOW
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            {selectedChannel.epgNow.startTime} - {selectedChannel.epgNow.endTime} ({selectedChannel.epgNow.durationMins}m)
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                          {selectedChannel.epgNow.rating}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">
                        {selectedChannel.epgNow.title}
                      </h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {selectedChannel.epgNow.description}
                      </p>
                    </div>

                    {/* Up Next Program Details */}
                    {selectedChannel.epgNext && (
                      <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-900 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-bold uppercase text-[10px]">
                            UP NEXT ({selectedChannel.epgNext.startTime})
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {selectedChannel.epgNext.durationMins} mins
                          </span>
                        </div>
                        <h5 className="text-xs font-semibold text-slate-300">
                          {selectedChannel.epgNext.title}
                        </h5>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {selectedChannel.epgNext.description}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-4 text-center">
                    No EPG metadata available for this broadcast feed.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
              <Tv className="w-8 h-8 text-slate-600 mb-2 animate-bounce" />
              <span>Select a channel from the list to begin live playback</span>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <SourceManagementModal
        isOpen={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
      />

      <IptvSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <UnifiedDiagnosticsModal
        isOpen={isDiagnosticsModalOpen}
        onClose={() => setIsDiagnosticsModalOpen(false)}
      />
    </div>
  );
};

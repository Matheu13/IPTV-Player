import React, { useState, useMemo } from 'react';
import {
  Tv,
  Film,
  Radio,
  Search,
  Sparkles,
  ChevronRight,
  Star,
  Clock,
  CheckCircle2,
  Calendar,
  Layers,
  SlidersHorizontal,
  Folder,
  Trophy,
} from 'lucide-react';
import { ChannelRowData } from './ChannelRow';
import { VideoPlayerShell } from './VideoPlayerShell';
import { isSportsChannel } from './TvLokLiveInterface';

/**
 * =======================================================================
 * Props Interface for Consuming Existing Channel Data
 * =======================================================================
 */
export interface ThreePanelLiveTvLayoutProps {
  /** Ingested channel list from unified IPTV storage or parent screen */
  channels: ChannelRowData[];
  /** Currently selected channel for playback and detailed metadata inspection */
  selectedChannel?: ChannelRowData | null;
  /** Active category ID or 'all' */
  selectedCategoryId?: string;
  /** Callback when user selects a channel from the guide/browser list */
  onSelectChannel: (channel: ChannelRowData) => void;
  /** Callback when user switches categories */
  onSelectCategory?: (categoryId: string) => void;
  /** Optional favorite toggle callback */
  onToggleFavorite?: (channelId: string) => void;
  /** Set of favorite channel IDs for quick lookup */
  favoriteIds?: Set<string>;
  /** Optional active IPTV provider name or list */
  activeProviderName?: string;
  /** TV mode / directional D-Pad flag */
  isTvMode?: boolean;
}

/**
 * ThreePanelLiveTvLayout
 * Implements the 3-Panel structure:
 * - Panel 1 (Left / App Navigation): Primary sections, active source indicator, quick filters
 * - Panel 2 (Middle-Left / Category Panel): Dynamic group titles extracted from M3U/Xtream providers
 * - Panel 3 (Center-Right / Preview & Guide Panel): Live video preview player, EPG timeline/guide, and channel list
 */
export const ThreePanelLiveTvLayout: React.FC<ThreePanelLiveTvLayoutProps> = ({
  channels = [],
  selectedChannel,
  selectedCategoryId = 'all',
  onSelectChannel,
  onSelectCategory,
  onToggleFavorite,
  favoriteIds = new Set(),
  activeProviderName = 'All Unified Providers',
  isTvMode = false,
}) => {
  const [internalCategory, setInternalCategory] = useState<string>(selectedCategoryId);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeSection, setActiveSection] = useState<'live' | 'movies' | 'series' | 'radio'>('live');

  // Active Category State
  const activeCategoryId = onSelectCategory ? selectedCategoryId : internalCategory;
  const handleCategoryClick = (catId: string) => {
    setInternalCategory(catId);
    if (onSelectCategory) {
      onSelectCategory(catId);
    }
  };

  // Extract Dynamic Categories from Channel Data
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    channels.forEach((ch) => {
      const cat = ch.category?.trim() || 'General';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });

    const list = Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({
        id: name,
        name,
        count,
      }));

    return list;
  }, [channels]);

  // Count sports channels
  const sportsChannelsCount = useMemo(() => {
    return channels.filter(isSportsChannel).length;
  }, [channels]);

  // Filter Channels based on Category and Search Query
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      if (activeCategoryId !== 'all') {
        if (activeCategoryId === 'sports') {
          if (!isSportsChannel(ch)) return false;
        } else if (ch.category !== activeCategoryId) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ch.name?.toLowerCase().includes(q);
        const matchNumber = String(ch.channelNumber).includes(q);
        const matchEpg = ch.nowProgramme?.title?.toLowerCase().includes(q);
        if (!matchName && !matchNumber && !matchEpg) return false;
      }
      return true;
    });
  }, [channels, activeCategoryId, searchQuery]);

  const activeChannel = selectedChannel || filteredChannels[0] || null;

  return (
    <div
      id="three-panel-live-tv-container"
      className="flex h-full w-full bg-[#080b11] text-slate-100 overflow-hidden select-none font-sans"
    >
      {/* =======================================================================
          PANEL 1: APP NAVIGATION (Left Sidebar - ~220px)
          ======================================================================= */}
      <aside
        id="panel-1-app-navigation"
        aria-label="App Navigation"
        className="w-56 shrink-0 bg-[#0c1018] border-r border-white/5 flex flex-col justify-between p-3.5 z-20"
      >
        <div className="space-y-4">
          {/* Brand & Provider Info */}
          <div className="px-2 py-1.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-950">
              <Tv className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="font-bold text-sm text-white tracking-wide block truncate">Live Stream</span>
              <span className="text-[10px] text-sky-400 font-medium block truncate flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {activeProviderName}
              </span>
            </div>
          </div>

          {/* Primary Navigation Sections */}
          <nav className="space-y-1">
            <button
              id="nav-section-live-tv"
              onClick={() => setActiveSection('live')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeSection === 'live'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Live TV</span>
              <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400">
                {channels.length}
              </span>
            </button>

            <button
              id="nav-section-movies"
              onClick={() => setActiveSection('movies')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeSection === 'movies'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Movies (VOD)</span>
            </button>

            <button
              id="nav-section-series"
              onClick={() => setActiveSection('series')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeSection === 'series'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>TV Series</span>
            </button>

            <button
              id="nav-section-radio"
              onClick={() => setActiveSection('radio')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeSection === 'radio'
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Audio Streams</span>
            </button>
          </nav>
        </div>

        {/* Bottom Status / Mode */}
        <div className="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <span>Guide Status</span>
            <span className="text-emerald-400 font-mono font-bold">ACTIVE</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Preserving real-time stream ingestion</p>
        </div>
      </aside>

      {/* =======================================================================
          PANEL 2: CATEGORY PANEL (Middle Sidebar - ~260px)
          ======================================================================= */}
      <nav
        id="panel-2-category-panel"
        aria-label="Category Browser"
        className="w-64 shrink-0 bg-[#0a0e14] border-r border-white/5 flex flex-col p-3 overflow-hidden"
      >
        <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Folder className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Categories ({categories.length + 1})
            </span>
          </div>
        </div>

        {/* Scrollable Category List */}
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin pr-1">
          {/* All Channels Option */}
          <button
            id="cat-item-all"
            onClick={() => handleCategoryClick('all')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeCategoryId === 'all'
                ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-950'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <span className="truncate">All Channels</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeCategoryId === 'all' ? 'bg-sky-700/80 text-white' : 'bg-slate-900 text-slate-400'
              }`}
            >
              {channels.length}
            </span>
          </button>

          {/* Dedicated Sports Category */}
          <button
            id="cat-item-sports"
            onClick={() => handleCategoryClick('sports')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeCategoryId === 'sports'
                ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-950'
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Sports</span>
            </div>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeCategoryId === 'sports' ? 'bg-sky-700/80 text-white' : 'bg-slate-900 text-slate-400'
              }`}
            >
              {sportsChannelsCount}
            </span>
          </button>

          {/* Dynamic Provider Categories */}
          {categories.map((cat) => {
            const isSelected = activeCategoryId === cat.name;
            return (
              <button
                key={cat.id}
                id={`cat-item-${cat.id}`}
                onClick={() => handleCategoryClick(cat.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition cursor-pointer ${
                  isSelected
                    ? 'bg-sky-600 text-white font-bold shadow-md shadow-sky-950'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-sky-700/80 text-white' : 'bg-slate-900 text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* =======================================================================
          PANEL 3: PREVIEW & GUIDE PANEL (Right Main Area - Remaining Width)
          ======================================================================= */}
      <main
        id="panel-3-preview-guide-panel"
        aria-label="Preview and Guide"
        className="flex-1 flex flex-col min-w-0 bg-[#080b11] overflow-hidden"
      >
        {/* Search & Channel Header */}
        <header className="px-5 py-3 border-b border-white/5 bg-[#0c1018]/90 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="three-panel-search-input"
              type="text"
              placeholder="Search channels, numbers, or programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-medium"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Showing:</span>
            <strong className="text-white font-mono">{filteredChannels.length}</strong>
            <span>channels</span>
          </div>
        </header>

        {/* Main Content Area: Split between Player Preview and Channel Guide */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          {/* Channel Guide List (Left half of Panel 3) */}
          <section
            id="guide-channel-column"
            className="w-full lg:w-7/12 border-b lg:border-b-0 lg:border-r border-white/5 overflow-y-auto p-3 space-y-1.5 scrollbar-thin"
          >
            {filteredChannels.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No channels found for the selected category or search filter.
              </div>
            ) : (
              filteredChannels.map((ch, idx) => {
                const isSelected = activeChannel?.id === ch.id;
                const isFav = favoriteIds.has(ch.id);

                return (
                  <div
                    key={ch.id}
                    id={`channel-card-${ch.id}`}
                    onClick={() => onSelectChannel(ch)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500/60 shadow-lg shadow-sky-950/50'
                        : 'bg-slate-950/60 border-slate-850 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Channel Number & Logo */}
                      <span className="w-8 text-right font-mono text-xs text-slate-400 shrink-0">
                        {ch.channelNumber || idx + 1}
                      </span>

                      {ch.logo ? (
                        <img
                          src={ch.logo}
                          alt={ch.name}
                          className="w-9 h-9 object-contain rounded bg-black/40 p-0.5 shrink-0 border border-white/5"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0">
                          {ch.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      {/* Name & Now Program */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-200 truncate">{ch.name}</span>
                          {ch.is4k && (
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                              4K
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {ch.nowProgramme?.title || 'Live Transmission'}
                        </p>
                      </div>
                    </div>

                    {/* Channel Controls / Indicator */}
                    <div className="flex items-center gap-2 shrink-0">
                      {onToggleFavorite && (
                        <button
                          type="button"
                          id={`fav-btn-${ch.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(ch.id);
                          }}
                          className={`p-1.5 rounded-lg transition ${
                            isFav ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-400'
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-amber-400' : ''}`} />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-600" />
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Live Video Preview & Synopsis (Right half of Panel 3) */}
          <section
            id="guide-preview-column"
            className="flex-1 flex flex-col bg-[#070a0f] p-4 overflow-y-auto space-y-4"
          >
            {activeChannel ? (
              <>
                {/* Embedded Video Player */}
                <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl bg-black aspect-video relative">
                  <VideoPlayerShell
                    channel={activeChannel}
                    mode="embedded"
                    autoPlay
                    showControls
                  />
                </div>

                {/* Now Playing Detailed Meta */}
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/70 border border-white/5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-white">{activeChannel.name}</h3>
                      <p className="text-xs text-sky-400 font-medium mt-0.5">
                        {activeChannel.nowProgramme?.title || 'Live Satellite Broadcast'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {activeChannel.nowProgramme?.description ||
                      'Continuous digital transmission. EPG electronic programme guide automatically synced from IPTV broadcast metadata.'}
                  </p>

                  <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>
                      <span className="text-slate-500">Category:</span>{' '}
                      <strong className="text-slate-300">{activeChannel.category || 'General'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Source:</span>{' '}
                      <strong className="text-slate-300">{activeChannel.sourceName || 'IPTV Server'}</strong>
                    </div>
                  </div>
                </div>

                {/* Next Programme Info */}
                {activeChannel.nextProgramme && (
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-900 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Up Next
                    </span>
                    <p className="font-semibold text-slate-200">{activeChannel.nextProgramme.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{activeChannel.nextProgramme.description}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select a channel from the list to preview
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

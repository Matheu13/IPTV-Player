import React, { useState, useMemo, useEffect } from 'react';
import {
  Star,
  Tv,
  Film,
  Clapperboard,
  Play,
  Heart,
  Trash2,
  Download,
  Plus,
  Tag,
  Sparkles,
  Search,
  SlidersHorizontal,
  Clock,
  MoreVertical,
} from 'lucide-react';
import { usePlayback } from '../context/PlaybackContext';
import { globalUnifiedIptvEngine, UnifiedChannel } from '../../lib/unifiedIptvEngine';
import { ChannelLogo } from '../components/ChannelLogo';
import { ChannelActionModal } from '../components/ChannelActionModal';

type FavoriteFilter = 'all' | 'live' | 'movies' | 'series';

interface SavedItem {
  id: string;
  type: 'live' | 'movie' | 'series';
  title: string;
  category: string;
  image?: string;
  logoUrl?: string;
  streamUrl: string;
  rating?: string;
  duration?: string;
  badge?: string;
  tags: string[];
}

export const FavoritesScreen: React.FC = () => {
  const { playChannel } = usePlayback();
  const [activeFilter, setActiveFilter] = useState<FavoriteFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [channelActionTarget, setChannelActionTarget] = useState<UnifiedChannel | null>(null);
  const [liveFavorites, setLiveFavorites] = useState<UnifiedChannel[]>([]);
  const [vodFavorites, setVodFavorites] = useState<SavedItem[]>([
    {
      id: 'fav-vod-1',
      type: 'movie',
      title: 'Dune: Part Two (4K HDR)',
      category: 'Sci-Fi Master',
      image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400',
      streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      rating: '8.8',
      duration: '2h 46m',
      badge: 'ATMOS',
      tags: ['Sci-Fi', 'Movies', 'Weekend'],
    },
    {
      id: 'fav-vod-2',
      type: 'series',
      title: 'Shōgun: Complete Season 1',
      category: 'Historical Epic',
      image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400',
      streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      rating: '9.2',
      duration: '10 Episodes',
      badge: 'BINGE',
      tags: ['Drama', 'Series', 'Epic'],
    },
    {
      id: 'fav-vod-3',
      type: 'movie',
      title: 'Blade Runner 2049 (Atmos)',
      category: 'Sci-Fi Master',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
      streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      rating: '8.7',
      duration: '2h 44m',
      badge: '4K HDR',
      tags: ['Sci-Fi', 'Movies'],
    },
  ]);

  // Sync live favorites from unified engine
  useEffect(() => {
    const update = () => {
      const all = globalUnifiedIptvEngine.getAllChannels();
      const favChannels = all.filter((c) => globalUnifiedIptvEngine.isFavorite(c.id) || c.isFavorite);
      setLiveFavorites(favChannels);
    };
    update();
    const unsub = globalUnifiedIptvEngine.subscribe(update);
    return () => unsub();
  }, []);

  // Combined list
  const combinedItems: SavedItem[] = useMemo(() => {
    const liveItems: SavedItem[] = liveFavorites.map((ch) => ({
      id: ch.id,
      type: 'live',
      title: ch.name,
      category: ch.category,
      logoUrl: ch.logoUrl || undefined,
      streamUrl: ch.streamUrl,
      badge: ch.resolution || '1080p',
      tags: [ch.category, ch.sourceName, 'Live TV'],
    }));
    return [...liveItems, ...vodFavorites];
  }, [liveFavorites, vodFavorites]);

  const allTags = useMemo(() => {
    const set = new Set<string>(['All']);
    combinedItems.forEach((f) => f.tags.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [combinedItems]);

  const filteredFavorites = useMemo(() => {
    return combinedItems.filter((item) => {
      const matchType = activeFilter === 'all' || item.type === activeFilter;
      const matchTag = selectedTag === 'All' || item.tags.includes(selectedTag);
      const matchSearch =
        searchQuery.trim() === '' ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchType && matchTag && matchSearch;
    });
  }, [combinedItems, activeFilter, selectedTag, searchQuery]);

  const handlePlay = (item: SavedItem) => {
    playChannel(
      {
        id: item.id,
        channelNumber: 1,
        name: item.title,
        streamUrl: item.streamUrl,
        category: item.category,
        is4k: item.badge?.includes('4K') || false,
        isHdr: true,
        isFavorite: true,
        nowProgramme: {
          title: item.title,
          start: '00:00',
          stop: item.duration || '02:00',
        },
      },
      'fullscreen'
    );
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setVodFavorites((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExportM3u = () => {
    let m3u = '#EXTM3U\n';
    combinedItems.forEach((item) => {
      m3u += `#EXTINF:-1 tvg-name="${item.title}" group-title="${item.category}",${item.title}\n${item.streamUrl}\n`;
    });
    const blob = new Blob([m3u], { type: 'audio/x-mpegurl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'favorites_playlist.m3u';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-y-auto">
      {/* Header */}
      <header className="px-6 sm:px-10 py-6 bg-[#0c1018] border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-amber-950">
            <Star className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Favorites &amp; Watchlist Vault</span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold">
                {combinedItems.length} Items
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Personalized quick-access library for Live TV, Movies, and TV Series
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleExportM3u}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#111722] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-400" />
            <span>Export M3U</span>
          </button>
        </div>
      </header>

      {/* Filter and Tag Rails */}
      <section className="sticky top-0 z-20 bg-[#080b11]/95 backdrop-blur-md border-b border-white/5 px-6 sm:px-10 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Type Tabs */}
          <div className="flex items-center gap-1 bg-[#111722] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeFilter === 'all' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setActiveFilter('live')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeFilter === 'live' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Live TV</span>
            </button>
            <button
              onClick={() => setActiveFilter('movies')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeFilter === 'movies' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movies</span>
            </button>
            <button
              onClick={() => setActiveFilter('series')}
              className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                activeFilter === 'series' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5" />
              <span>Series</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in favorites..."
              className="w-full pl-10 pr-4 py-1.5 rounded-xl bg-[#111722] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          <Tag className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                selectedTag === tag
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-[#111722] text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      {/* Grid Content */}
      <section className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-6 flex-1">
        {filteredFavorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Star className="w-12 h-12 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-300">No favorites found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              Click the star or heart icon on any Live Channel, Movie, or TV Series to bookmark it here for fast access.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredFavorites.map((item, idx) => {
              const isLive = item.type === 'live';
              const liveChan = isLive ? liveFavorites.find((c) => c.id === item.id) : null;

              return (
                <div
                  key={`fav-card-${item.type}-${item.id}-${idx}`}
                  onClick={() => handlePlay(item)}
                  onContextMenu={(e) => {
                    if (liveChan) {
                      e.preventDefault();
                      setChannelActionTarget(liveChan);
                    }
                  }}
                  className="group relative bg-[#111722] rounded-xl overflow-hidden border border-slate-800/80 hover:border-sky-500/60 shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-900 flex items-center justify-center p-4">
                    {isLive ? (
                      <div className="w-full h-full flex items-center justify-center bg-slate-950/60 rounded-lg p-2">
                        <ChannelLogo
                          name={item.title}
                          logoUrl={item.logoUrl}
                          category={item.category}
                          size="lg"
                          showBadgeBorder={true}
                        />
                      </div>
                    ) : (
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-3">
                      <div className="flex justify-between items-center">
                        <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-mono text-amber-300 font-bold border border-white/10">
                          {item.badge}
                        </span>
                        <div className="flex items-center gap-1">
                          {liveChan && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setChannelActionTarget(liveChan);
                              }}
                              className="p-1.5 rounded-full bg-black/60 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                              title="Options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              if (isLive) {
                                e.stopPropagation();
                                globalUnifiedIptvEngine.toggleFavorite(item.id);
                              } else {
                                handleRemove(item.id, e);
                              }
                            }}
                            className="p-1.5 rounded-full bg-black/60 hover:bg-rose-600 text-slate-300 hover:text-white transition"
                            title="Remove from favorites"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center self-center shadow-lg shadow-sky-500/40 transform scale-90 group-hover:scale-100 transition-all">
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-300 font-mono">
                        <span>{item.category}</span>
                        {item.duration && <span>{item.duration}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 flex flex-col justify-between space-y-2">
                    <h3 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map((t) => (
                        <span
                          key={t}
                          className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Channel Interaction Modal */}
      <ChannelActionModal
        channel={channelActionTarget}
        isOpen={Boolean(channelActionTarget)}
        onClose={() => setChannelActionTarget(null)}
        onPlayFullscreen={() => {
          if (channelActionTarget) {
            playChannel({
              id: channelActionTarget.id,
              channelNumber: channelActionTarget.channelNumber,
              name: channelActionTarget.name,
              category: channelActionTarget.category,
              sourceName: channelActionTarget.sourceName,
              sourceId: channelActionTarget.sourceId,
              streamUrl: channelActionTarget.streamUrl,
              is4k: channelActionTarget.resolution?.includes('4K'),
            }, 'fullscreen');
            setChannelActionTarget(null);
          }
        }}
        onPlayPreview={() => {
          if (channelActionTarget) {
            playChannel({
              id: channelActionTarget.id,
              channelNumber: channelActionTarget.channelNumber,
              name: channelActionTarget.name,
              category: channelActionTarget.category,
              sourceName: channelActionTarget.sourceName,
              sourceId: channelActionTarget.sourceId,
              streamUrl: channelActionTarget.streamUrl,
              is4k: channelActionTarget.resolution?.includes('4K'),
            }, 'embedded');
            setChannelActionTarget(null);
          }
        }}
      />
    </div>
  );
};

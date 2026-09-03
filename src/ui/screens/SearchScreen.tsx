import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Tv,
  Film,
  Clapperboard,
  Calendar,
  Play,
  Star,
  Clock,
  Sparkles,
  X,
  SlidersHorizontal,
  Flame,
  History,
  CheckCircle2,
} from 'lucide-react';
import { usePlayback } from '../context/PlaybackContext';
import { globalUnifiedIptvEngine, UnifiedChannel } from '../../lib/unifiedIptvEngine';

const POPULAR_SEARCHES = [
  'Premier League 4K',
  'ESPN Sports',
  'Dune Part Two',
  'BBC One HD',
  'Shōgun',
  'Formula 1',
  'HBO Cinema',
  'Planet Earth',
];

interface SearchResultItem {
  id: string;
  type: 'live' | 'movie' | 'series';
  title: string;
  subtitle: string;
  category: string;
  image?: string;
  streamUrl: string;
  quality: '4K' | '1080p' | '720p';
  rating?: string;
}

export const SearchScreen: React.FC = () => {
  const { playChannel } = usePlayback();
  const [query, setQuery] = useState<string>('');
  const [activeType, setActiveType] = useState<'all' | 'live' | 'movie' | 'series'>('all');
  const [selectedQuality, setSelectedQuality] = useState<string>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([
    'ESPN 4K',
    'Blade Runner',
    'BBC One',
  ]);
  const [channels, setChannels] = useState<UnifiedChannel[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const load = () => {
      setChannels(globalUnifiedIptvEngine.getChannels());
    };
    load();
    const unsub = globalUnifiedIptvEngine.subscribe(load);
    return () => unsub();
  }, []);

  // Aggregate searchable corpus
  const corpus: SearchResultItem[] = useMemo(() => {
    const results: SearchResultItem[] = [];

    // Live Channels
    channels.forEach((ch) => {
      results.push({
        id: `live-${ch.id}`,
        type: 'live',
        title: ch.name,
        subtitle: ch.nowProgramme?.title || 'Live Stream Broadcast',
        category: ch.category,
        image: ch.logoUrl,
        streamUrl: ch.streamUrl,
        quality: ch.is4k ? '4K' : ch.isHdr ? '1080p' : '720p',
      });
    });

    // Movies
    results.push(
      {
        id: 'mov-1',
        type: 'movie',
        title: 'Dune: Part Two (4K HDR)',
        subtitle: 'Sci-Fi • 2h 46m • Dir. Denis Villeneuve',
        category: 'Movies & Cinema',
        image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400',
        streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        quality: '4K',
        rating: '8.8',
      },
      {
        id: 'mov-2',
        type: 'movie',
        title: 'Blade Runner 2049',
        subtitle: 'Sci-Fi • 2h 44m • Ryan Gosling',
        category: 'Movies & Cinema',
        image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
        streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        quality: '4K',
        rating: '8.7',
      },
      {
        id: 'mov-3',
        type: 'movie',
        title: 'Oppenheimer',
        subtitle: 'Drama • 3h 00m • Christopher Nolan',
        category: 'Movies & Cinema',
        image: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400',
        streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        quality: '4K',
        rating: '8.9',
      }
    );

    // Series
    results.push(
      {
        id: 'ser-1',
        type: 'series',
        title: 'Shōgun (Complete Season 1)',
        subtitle: 'Historical Drama • 10 Episodes',
        category: 'TV Series',
        image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400',
        streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        quality: '4K',
        rating: '9.2',
      },
      {
        id: 'ser-2',
        type: 'series',
        title: 'House of the Dragon',
        subtitle: 'Fantasy Drama • 18 Episodes',
        category: 'TV Series',
        image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400',
        streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        quality: '4K',
        rating: '8.8',
      }
    );

    return results;
  }, [channels]);

  // Filtered Results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const lower = query.toLowerCase().trim();
    return corpus.filter((item) => {
      const matchType = activeType === 'all' || item.type === activeType;
      const matchQuality = selectedQuality === 'all' || item.quality === selectedQuality;
      const matchQuery =
        item.title.toLowerCase().includes(lower) ||
        item.subtitle.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower);

      return matchType && matchQuality && matchQuery;
    });
  }, [corpus, query, activeType, selectedQuality]);

  const handleSelectQuery = (q: string) => {
    setQuery(q);
    if (!recentSearches.includes(q)) {
      setRecentSearches((prev) => [q, ...prev.slice(0, 5)]);
    }
  };

  const handlePlayResult = (item: SearchResultItem) => {
    playChannel(
      {
        id: item.id,
        channelNumber: 1,
        name: item.title,
        streamUrl: item.streamUrl,
        category: item.category,
        is4k: item.quality === '4K',
        isHdr: true,
        isFavorite: false,
        nowProgramme: {
          title: item.title,
          start: '00:00',
          stop: '02:00',
          description: item.subtitle,
        },
      },
      'fullscreen'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-y-auto">
      {/* Search Input Bar */}
      <section className="px-6 sm:px-10 pt-8 pb-4 bg-[#0c1018] border-b border-white/5 space-y-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 10,000+ Live Channels, Movies, TV Series, and EPG Guides..."
              className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-[#111722] border-2 border-slate-700/80 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 shadow-xl transition"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type and Quality Facets */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1 bg-[#111722] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveType('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                  activeType === 'all' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveType('live')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                  activeType === 'live' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Tv className="w-3 h-3" />
                <span>Live TV</span>
              </button>
              <button
                onClick={() => setActiveType('movie')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                  activeType === 'movie' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3 h-3" />
                <span>Movies</span>
              </button>
              <button
                onClick={() => setActiveType('series')}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition ${
                  activeType === 'series' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clapperboard className="w-3 h-3" />
                <span>Series</span>
              </button>
            </div>

            {/* Quality Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 text-[11px] font-mono">Quality:</span>
              {['all', '4K', '1080p', '720p'].map((q) => (
                <button
                  key={q}
                  onClick={() => setSelectedQuality(q)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition ${
                    selectedQuality === q
                      ? 'bg-sky-500/30 border border-sky-400 text-sky-300'
                      : 'bg-[#111722] text-slate-400 border border-slate-800 hover:text-white'
                  }`}
                >
                  {q.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Results / Suggestions Area */}
      <section className="max-w-4xl mx-auto w-full px-6 sm:px-10 py-6 flex-1">
        {!query.trim() ? (
          <div className="space-y-8 py-4">
            {/* Popular Searches */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>Trending Searches</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSelectQuery(term)}
                    className="px-3.5 py-2 rounded-xl bg-[#111722] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-400" />
                  <span>Recent Searches</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => handleSelectQuery(term)}
                      className="px-3.5 py-2 rounded-xl bg-[#111722] hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>{term}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Found {searchResults.length} matches</span>
              <span>Query: "{query}"</span>
            </div>

            {searchResults.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Search className="w-10 h-10 text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-300">No results found</div>
                <div className="text-xs text-slate-500">
                  Try checking for typos or searching for a different channel or show.
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {searchResults.map((item, idx) => (
                  <div
                    key={`search-res-${item.type}-${item.id}-${idx}`}
                    onClick={() => handlePlayResult(item)}
                    className="group bg-[#111722] border border-slate-800/80 hover:border-sky-500/60 rounded-xl p-3 flex items-center justify-between gap-4 transition-all hover:bg-slate-800/40 cursor-pointer"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        ) : item.type === 'live' ? (
                          <Tv className="w-5 h-5 text-sky-400" />
                        ) : item.type === 'movie' ? (
                          <Film className="w-5 h-5 text-amber-400" />
                        ) : (
                          <Clapperboard className="w-5 h-5 text-purple-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors truncate">
                            {item.title}
                          </h4>
                          <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 text-[10px] font-mono font-bold">
                            {item.quality}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {item.subtitle} • <span className="text-slate-500">{item.category}</span>
                        </p>
                      </div>
                    </div>

                    <button className="px-3.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-sky-500/20 transition">
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Play</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

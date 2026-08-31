import React, { useState, useMemo } from 'react';
import {
  Clapperboard,
  Tv,
  Play,
  Star,
  Clock,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Search,
  Filter,
  Info,
  Calendar,
  Layers,
  Heart,
  X,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { UnifiedSeries, UnifiedSeason, UnifiedEpisode } from '../../types';
import {
  FIXTURE_SERIES_CATALOG,
  FIXTURE_SERIES_INFO_SHOGUN,
} from '../../lib/fixturesM3';
import { normalizeSeries } from '../../lib/vodEngine';
import { usePlayback } from '../context/PlaybackContext';

interface SeriesScreenProps {
  onSelectSeries?: (series: UnifiedSeries) => void;
}

const SERIES_GENRES = [
  'All Series',
  'Drama',
  'Historical Epic',
  'Sci-Fi',
  'Crime & Thriller',
  'Animation',
  'Comedy',
];

const EXTENDED_SERIES: UnifiedSeries[] = [
  normalizeSeries(FIXTURE_SERIES_CATALOG[0], FIXTURE_SERIES_INFO_SHOGUN),
  {
    id: 502,
    seriesId: 502,
    name: 'House of the Dragon',
    categoryName: 'Drama',
    categoryId: '1',
    rating: '8.8',
    rating5: 4.4,
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600',
    plot: 'An internal succession war within House Targaryen at the height of its power, 172 years before the birth of Daenerys Targaryen.',
    director: 'Ryan J. Condal, George R.R. Martin',
    cast: 'Matt Smith, Emma D\'Arcy, Olivia Cooke, Rhys Ifans',
    genre: 'Fantasy, Drama, Action',
    releaseDate: '2022',
    episodeCount: 18,
    seasonCount: 2,
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        overview: 'The seeds of civil war are planted across Westeros as King Viserys names his daughter heir.',
        episodeCount: 10,
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
        episodes: [
          {
            id: '502_s1_e1',
            streamId: 9001,
            seasonNumber: 1,
            episodeNumber: 1,
            title: 'The Heirs of the Dragon',
            containerExtension: 'mp4',
            durationSec: 3960,
            durationFormatted: '1h 06m',
            plot: 'Viserys hosts a tournament to celebrate the birth of his second child. Rhaenyra welcomes her uncle Daemon back to the Red Keep.',
            rating: 8.9,
            thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
          },
          {
            id: '502_s1_e2',
            streamId: 9002,
            seasonNumber: 1,
            episodeNumber: 2,
            title: 'The Rogue Prince',
            containerExtension: 'mp4',
            durationSec: 3240,
            durationFormatted: '54m',
            plot: 'Rhaenyra oversteps at the Small Council. Viserys is urged to secure the succession through a new marriage.',
            rating: 8.6,
            thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600',
          },
        ],
      },
      {
        seasonNumber: 2,
        name: 'Season 2',
        overview: 'The Dance of the Dragons begins in full scale.',
        episodeCount: 8,
        coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600',
        episodes: [
          {
            id: '502_s2_e1',
            streamId: 9003,
            seasonNumber: 2,
            episodeNumber: 1,
            title: 'A Son for a Son',
            containerExtension: 'mp4',
            durationSec: 3660,
            durationFormatted: '1h 01m',
            plot: 'Rhaenyra searches for answers while Daemon seeks revenge in King\'s Landing.',
            rating: 9.1,
            thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
          },
        ],
      },
    ],
  },
  {
    id: 503,
    seriesId: 503,
    name: 'Severance: Season 2 Master',
    categoryName: 'Sci-Fi',
    categoryId: '2',
    rating: '8.9',
    rating5: 4.5,
    coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600',
    backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600',
    plot: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.',
    director: 'Ben Stiller, Dan Erickson',
    cast: 'Adam Scott, Zach Cherry, Britt Lower, Patricia Arquette, John Turturro',
    genre: 'Sci-Fi, Mystery, Thriller',
    releaseDate: '2022-2026',
    episodeCount: 19,
    seasonCount: 2,
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        overview: 'The Macrodata Refinement division begins unraveling Lumon secret experiments.',
        episodeCount: 9,
        coverUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600',
        episodes: [
          {
            id: '503_s1_e1',
            streamId: 9004,
            seasonNumber: 1,
            episodeNumber: 1,
            title: 'Good News About Hell',
            containerExtension: 'mp4',
            durationSec: 3420,
            durationFormatted: '57m',
            plot: 'Mark Scout leads a team at Lumon Industries, whose employees have undergone a severance procedure.',
            rating: 8.8,
            thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600',
          },
        ],
      },
    ],
  },
  {
    id: 504,
    seriesId: 504,
    name: 'Arcane: League of Legends',
    categoryName: 'Animation',
    categoryId: '3',
    rating: '9.0',
    rating5: 4.5,
    coverUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600',
    plot: 'Set in the utopian region of Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions-and the power that will tear them apart.',
    director: 'Christian Linke, Alex Yee',
    cast: 'Hailee Steinfeld, Ella Purnell, Kevin Alejandro, Katie Leung',
    genre: 'Animation, Action, Sci-Fi',
    releaseDate: '2021-2024',
    episodeCount: 18,
    seasonCount: 2,
    seasons: [
      {
        seasonNumber: 1,
        name: 'Season 1',
        overview: 'Sisters Vi and Powder face insurmountable odds as hextech emerges in Piltover.',
        episodeCount: 9,
        coverUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600',
        episodes: [
          {
            id: '504_s1_e1',
            streamId: 9005,
            seasonNumber: 1,
            episodeNumber: 1,
            title: 'Welcome to the Playground',
            containerExtension: 'mp4',
            durationSec: 2580,
            durationFormatted: '43m',
            plot: 'Orphaned sisters Vi and Powder lead a crew on a heist in the posh upper city of Piltover.',
            rating: 9.3,
            thumbnail: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600',
          },
        ],
      },
    ],
  },
];

export const SeriesScreen: React.FC<SeriesScreenProps> = () => {
  const { playChannel } = usePlayback();
  const [selectedGenre, setSelectedGenre] = useState<string>('All Series');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSeries, setSelectedSeries] = useState<UnifiedSeries | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [watchlist, setWatchlist] = useState<number[]>([501, 503]);

  // Featured Spotlight Series
  const featuredSeries = EXTENDED_SERIES[0];

  const filteredSeries = useMemo(() => {
    return EXTENDED_SERIES.filter((s) => {
      const matchGenre =
        selectedGenre === 'All Series' ||
        s.categoryName.toLowerCase() === selectedGenre.toLowerCase() ||
        s.genre?.toLowerCase().includes(selectedGenre.toLowerCase());

      const matchSearch =
        searchQuery.trim() === '' ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.cast?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchGenre && matchSearch;
    });
  }, [selectedGenre, searchQuery]);

  // Active Season of Selected Series
  const activeSeason = useMemo(() => {
    if (!selectedSeries?.seasons) return null;
    return (
      selectedSeries.seasons.find((s) => s.seasonNumber === selectedSeasonNumber) ||
      selectedSeries.seasons[0] ||
      null
    );
  }, [selectedSeries, selectedSeasonNumber]);

  const handlePlayEpisode = (series: UnifiedSeries, ep: UnifiedEpisode) => {
    playChannel(
      {
        id: `ep-${ep.id}`,
        channelNumber: typeof ep.streamId === 'number' ? ep.streamId : 101,
        name: `${series.name} - S${ep.seasonNumber}E${ep.episodeNumber}: ${ep.title}`,
        streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        category: series.categoryName,
        is4k: true,
        isHdr: true,
        isFavorite: watchlist.includes(series.seriesId),
        nowProgramme: {
          title: ep.title,
          start: '00:00',
          stop: ep.durationFormatted,
          description: ep.plot,
        },
      },
      'fullscreen'
    );
  };

  const toggleWatchlist = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setWatchlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-y-auto">
      {/* 1. Hero Spotlight Carousel */}
      <section className="relative w-full h-[420px] shrink-0 overflow-hidden">
        <img
          src={featuredSeries.backdropUrl || featuredSeries.coverUrl}
          alt={featuredSeries.name}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080b11] via-[#080b11]/85 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-transparent to-black/40" />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-end pb-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-extrabold tracking-wider uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> TRENDING SERIES
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[11px] font-mono font-bold">
              {featuredSeries.seasonCount || 1} SEASONS • {featuredSeries.episodeCount || 10} EPISODES
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md max-w-2xl">
            {featuredSeries.name}
          </h1>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-amber-400" /> {featuredSeries.rating} / 10
            </span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-200 border border-slate-700">
              {featuredSeries.categoryName}
            </span>
            <span>•</span>
            <span>{featuredSeries.releaseDate || '2024-2026'}</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl line-clamp-2 leading-relaxed">
            {featuredSeries.plot}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => {
                setSelectedSeries(featuredSeries);
                setSelectedSeasonNumber(1);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-xl shadow-sky-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Browse Episodes</span>
            </button>
            <button
              onClick={(e) => toggleWatchlist(featuredSeries.seriesId, e)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                watchlist.includes(featuredSeries.seriesId)
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Add to Watchlist"
            >
              <Heart
                className={`w-4 h-4 ${watchlist.includes(featuredSeries.seriesId) ? 'fill-rose-400' : ''}`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Filter & Search Rail */}
      <section className="sticky top-0 z-20 bg-[#080b11]/95 backdrop-blur-md border-b border-white/5 px-6 sm:px-10 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search TV series, creators, cast..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#111722] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400 font-mono font-semibold self-end sm:self-auto">
            {filteredSeries.length} Series Cataloged
          </span>
        </div>

        {/* Genre Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {SERIES_GENRES.map((genre) => {
            const isSelected = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                    : 'bg-[#111722] text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {genre}
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. Series Catalog Grid */}
      <section className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {filteredSeries.map((series) => {
            const inWatchlist = watchlist.includes(series.seriesId);
            return (
              <div
                key={series.id}
                onClick={() => {
                  setSelectedSeries(series);
                  setSelectedSeasonNumber(1);
                }}
                className="group relative bg-[#111722] rounded-xl overflow-hidden border border-slate-800/80 hover:border-sky-500/60 shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                  <img
                    src={series.coverUrl}
                    alt={series.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                    <div className="flex justify-between items-center">
                      <span className="px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-emerald-300 font-bold border border-white/10">
                        {series.seasonCount || 1} SEASONS
                      </span>
                      <button
                        onClick={(e) => toggleWatchlist(series.seriesId, e)}
                        className={`p-1.5 rounded-full backdrop-blur-md transition ${
                          inWatchlist
                            ? 'bg-rose-500 text-white'
                            : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-white' : ''}`} />
                      </button>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center self-center shadow-lg shadow-sky-500/40 transform scale-90 group-hover:scale-100 transition-all hover:bg-sky-400">
                      <Play className="w-5 h-5 fill-white ml-0.5" />
                    </div>

                    <div className="text-[11px] text-slate-300 font-mono">
                      {series.episodeCount || 10} Total Episodes
                    </div>
                  </div>

                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {series.rating}
                  </div>
                </div>

                <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                  <h3 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                    {series.name}
                  </h3>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{series.categoryName}</span>
                    <span>{series.releaseDate?.split('-')[0] || '2026'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Multi-Season Episode Explorer Modal */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-4xl bg-[#111722] border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="relative p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/60">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-bold">
                    SERIES DIRECTORY
                  </span>
                  <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                    <Star className="w-3 h-3 fill-amber-400" /> {selectedSeries.rating} / 10
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">{selectedSeries.name}</h2>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {selectedSeries.plot}
                </p>
              </div>

              <button
                onClick={() => setSelectedSeries(null)}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Season Selector Tabs */}
            {selectedSeries.seasons && selectedSeries.seasons.length > 0 && (
              <div className="flex items-center gap-2 px-6 py-3 bg-[#0d121c] border-b border-slate-800 overflow-x-auto no-scrollbar">
                {selectedSeries.seasons.map((s) => {
                  const isActive = s.seasonNumber === selectedSeasonNumber;
                  return (
                    <button
                      key={s.seasonNumber}
                      onClick={() => setSelectedSeasonNumber(s.seasonNumber)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                        isActive
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                          : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s.name || `Season ${s.seasonNumber}`} ({s.episodeCount} eps)
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episodes List Grid */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3">
              {activeSeason && activeSeason.episodes && activeSeason.episodes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {activeSeason.episodes.map((ep) => (
                    <div
                      key={ep.id}
                      onClick={() => {
                        handlePlayEpisode(selectedSeries, ep);
                        setSelectedSeries(null);
                      }}
                      className="group bg-[#0d121c] border border-slate-800/80 hover:border-sky-500/60 rounded-xl p-3 flex gap-3 transition-all hover:bg-slate-800/40 cursor-pointer"
                    >
                      {/* Thumbnail with Play Icon */}
                      <div className="relative w-28 h-20 rounded-lg overflow-hidden bg-slate-900 shrink-0">
                        <img
                          src={ep.thumbnail || selectedSeries.coverUrl}
                          alt={ep.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-6 h-6 fill-white text-white" />
                        </div>
                        <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/80 text-[9px] font-mono text-slate-300">
                          {ep.durationFormatted}
                        </span>
                      </div>

                      {/* Episode Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-mono font-bold text-sky-400">
                            EPISODE {ep.episodeNumber}
                          </div>
                          <h4 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                            {ep.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug">
                            {ep.plot || 'No episode synopsis available.'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                          {ep.rating && <span>★ {ep.rating}</span>}
                          <span>•</span>
                          <span>{ep.containerExtension.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No episodes available for this season.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

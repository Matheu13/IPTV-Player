import React, { useState, useMemo } from 'react';
import {
  Film,
  Play,
  Star,
  Clock,
  Plus,
  Check,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
  Layers,
  Heart,
  Volume2,
  Tv,
  X,
  RotateCcw,
} from 'lucide-react';
import { UnifiedVodMovie } from '../../types';
import {
  FIXTURE_VOD_MOVIES,
  FIXTURE_VOD_INFO_DUNE,
} from '../../lib/fixturesM3';
import { normalizeVodMovie, WatchProgressManager } from '../../lib/vodEngine';
import { usePlayback } from '../context/PlaybackContext';

interface MoviesScreenProps {
  onSelectMovie?: (movie: UnifiedVodMovie) => void;
}

const GENRES = [
  'All Genres',
  '4K UHD Master',
  'Sci-Fi',
  'Action',
  'Drama',
  'Thriller',
  'Animation',
  'Crime',
  'Adventure',
];

const EXTENDED_MOVIES: UnifiedVodMovie[] = [
  ...FIXTURE_VOD_MOVIES.map(normalizeVodMovie),
  {
    id: 104,
    streamId: 104,
    name: 'Blade Runner 2049 (4K HDR)',
    categoryName: 'Sci-Fi',
    categoryId: '1',
    rating: '8.7',
    rating5: 4.4,
    durationSec: 9840,
    durationFormatted: '2h 44m',
    streamIcon: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
    backdropUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600',
    containerExtension: 'mp4',
    addedDate: '2026-08-20',
    plot: 'Thirty years after the events of the first film, a new Blade Runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what is left of society into chaos.',
    director: 'Denis Villeneuve',
    cast: 'Ryan Gosling, Harrison Ford, Ana de Armas, Sylvia Hoeks',
  },
  {
    id: 105,
    streamId: 105,
    name: 'Oppenheimer: Director Cut',
    categoryName: 'Drama',
    categoryId: '2',
    rating: '8.9',
    rating5: 4.5,
    durationSec: 10800,
    durationFormatted: '3h 00m',
    streamIcon: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600',
    backdropUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600',
    containerExtension: 'mkv',
    addedDate: '2026-08-22',
    plot: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.',
    director: 'Christopher Nolan',
    cast: 'Cillian Murphy, Emily Blunt, Matt Damon, Robert Downey Jr.',
  },
  {
    id: 106,
    streamId: 106,
    name: 'Spider-Man: Across the Spider-Verse',
    categoryName: 'Animation',
    categoryId: '3',
    rating: '8.8',
    rating5: 4.4,
    durationSec: 8400,
    durationFormatted: '2h 20m',
    streamIcon: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?w=600',
    backdropUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600',
    containerExtension: 'mp4',
    addedDate: '2026-08-24',
    plot: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence.',
    director: 'Joaquim Dos Santos, Kemp Powers',
    cast: 'Shameik Moore, Hailee Steinfeld, Oscar Isaac, Daniel Kaluuya',
  },
  {
    id: 107,
    streamId: 107,
    name: 'Top Gun: Maverick (IMAX Audio)',
    categoryName: 'Action',
    categoryId: '4',
    rating: '8.6',
    rating5: 4.3,
    durationSec: 7800,
    durationFormatted: '2h 10m',
    streamIcon: 'https://images.unsplash.com/photo-1519074069444-1ba4ea16e6f4?w=600',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600',
    containerExtension: 'mp4',
    addedDate: '2026-08-25',
    plot: 'After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOP GUN graduates on an impossible mission.',
    director: 'Joseph Kosinski',
    cast: 'Tom Cruise, Miles Teller, Jennifer Connelly, Jon Hamm',
  },
  {
    id: 108,
    streamId: 108,
    name: 'The Batman: Extended Atmos',
    categoryName: 'Crime',
    categoryId: '5',
    rating: '8.3',
    rating5: 4.2,
    durationSec: 10560,
    durationFormatted: '2h 56m',
    streamIcon: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600',
    backdropUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1600',
    containerExtension: 'mkv',
    addedDate: '2026-08-26',
    plot: 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city hidden corruption.',
    director: 'Matt Reeves',
    cast: 'Robert Pattinson, Zoë Kravitz, Paul Dano, Jeffrey Wright',
  },
];

export const MoviesScreen: React.FC<MoviesScreenProps> = () => {
  const { playChannel } = usePlayback();
  const [selectedGenre, setSelectedGenre] = useState<string>('All Genres');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'rating' | 'recent' | 'name'>('rating');
  const [selectedMovie, setSelectedMovie] = useState<UnifiedVodMovie | null>(null);
  const [watchlist, setWatchlist] = useState<number[]>([101, 104]);

  // Featured spotlight movie
  const featuredMovie = EXTENDED_MOVIES[0];

  // Filter & Sort
  const filteredMovies = useMemo(() => {
    return EXTENDED_MOVIES.filter((m) => {
      const matchGenre =
        selectedGenre === 'All Genres' ||
        (selectedGenre === '4K UHD Master' && m.name.includes('4K')) ||
        m.categoryName.toLowerCase() === selectedGenre.toLowerCase();

      const matchSearch =
        searchQuery.trim() === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.director?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.cast?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchGenre && matchSearch;
    }).sort((a, b) => {
      if (sortBy === 'rating') return parseFloat(b.rating) - parseFloat(a.rating);
      if (sortBy === 'recent') return (b.addedDate || '').localeCompare(a.addedDate || '');
      return a.name.localeCompare(b.name);
    });
  }, [selectedGenre, searchQuery, sortBy]);

  const handlePlayMovie = (movie: UnifiedVodMovie) => {
    playChannel(
      {
        id: `vod-${movie.streamId}`,
        channelNumber: movie.streamId,
        name: movie.name,
        streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        category: movie.categoryName,
        is4k: true,
        isHdr: true,
        isFavorite: watchlist.includes(movie.streamId),
        nowProgramme: {
          title: movie.name,
          start: '00:00',
          stop: movie.durationFormatted,
          description: movie.plot,
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
          src={featuredMovie.backdropUrl || featuredMovie.streamIcon}
          alt={featuredMovie.name}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080b11] via-[#080b11]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-transparent to-black/30" />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-end pb-10 space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold tracking-wider uppercase flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> FEATURED PREMIERE
            </span>
            <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-500/30 text-sky-300 text-[11px] font-mono font-bold">
              4K DOLBY VISION
            </span>
            <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-mono font-bold">
              DOLBY ATMOS
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md max-w-2xl">
            {featuredMovie.name}
          </h1>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-4 h-4 fill-amber-400" /> {featuredMovie.rating} / 10
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {featuredMovie.durationFormatted}
            </span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-200 border border-slate-700">
              {featuredMovie.categoryName}
            </span>
            <span>•</span>
            <span>Dir. {featuredMovie.director}</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl line-clamp-2 leading-relaxed">
            {featuredMovie.plot}
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => handlePlayMovie(featuredMovie)}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shadow-xl shadow-sky-500/25 transition-all transform active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Watch Now</span>
            </button>
            <button
              onClick={() => setSelectedMovie(featuredMovie)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition cursor-pointer"
            >
              <Info className="w-4 h-4 text-slate-300" />
              <span>Details</span>
            </button>
            <button
              onClick={(e) => toggleWatchlist(featuredMovie.streamId, e)}
              className={`p-3 rounded-xl border transition cursor-pointer ${
                watchlist.includes(featuredMovie.streamId)
                  ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Add to Watchlist"
            >
              <Heart className={`w-4 h-4 ${watchlist.includes(featuredMovie.streamId) ? 'fill-rose-400' : ''}`} />
            </button>
          </div>
        </div>
      </section>

      {/* 2. Search, Filter Bar & Genre Rail */}
      <section className="sticky top-0 z-20 bg-[#080b11]/95 backdrop-blur-md border-b border-white/5 px-6 sm:px-10 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies, cast, directors..."
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

          {/* Sort Selector & Stats */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs text-slate-400 font-mono font-semibold">
              {filteredMovies.length} {filteredMovies.length === 1 ? 'Title' : 'Titles'} Available
            </span>
            <div className="flex items-center gap-2 bg-[#111722] border border-slate-800 rounded-xl p-1 text-xs">
              <span className="text-slate-400 pl-2">Sort:</span>
              <button
                onClick={() => setSortBy('rating')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  sortBy === 'rating' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Rating
              </button>
              <button
                onClick={() => setSortBy('recent')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  sortBy === 'recent' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setSortBy('name')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  sortBy === 'name' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                A-Z
              </button>
            </div>
          </div>
        </div>

        {/* Genre Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
          {GENRES.map((genre) => {
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

      {/* 3. Movies Catalog Grid */}
      <section className="max-w-7xl mx-auto w-full px-6 sm:px-10 py-6">
        {filteredMovies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
            <Film className="w-12 h-12 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-300">No movies found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              We could not find any titles matching "{searchQuery}" in {selectedGenre}.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('All Genres');
              }}
              className="px-4 py-2 bg-sky-500/20 border border-sky-500/40 text-sky-400 rounded-lg text-xs font-bold hover:bg-sky-500/30 transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {filteredMovies.map((movie) => {
              const inWatchlist = watchlist.includes(movie.streamId);
              return (
                <div
                  key={movie.id}
                  onClick={() => setSelectedMovie(movie)}
                  className="group relative bg-[#111722] rounded-xl overflow-hidden border border-slate-800/80 hover:border-sky-500/60 shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col"
                >
                  {/* Poster Thumbnail */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900">
                    <img
                      src={movie.streamIcon}
                      alt={movie.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                      {/* Top Action Badge */}
                      <div className="flex justify-between items-center">
                        <span className="px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-sky-300 font-bold border border-white/10">
                          {movie.containerExtension.toUpperCase()}
                        </span>
                        <button
                          onClick={(e) => toggleWatchlist(movie.streamId, e)}
                          className={`p-1.5 rounded-full backdrop-blur-md transition ${
                            inWatchlist
                              ? 'bg-rose-500 text-white'
                              : 'bg-black/60 text-slate-300 hover:text-white hover:bg-black/80'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${inWatchlist ? 'fill-white' : ''}`} />
                        </button>
                      </div>

                      {/* Play Button Overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayMovie(movie);
                        }}
                        className="w-10 h-10 rounded-full bg-sky-500 text-white flex items-center justify-center self-center shadow-lg shadow-sky-500/40 transform scale-90 group-hover:scale-100 transition-all hover:bg-sky-400"
                      >
                        <Play className="w-5 h-5 fill-white ml-0.5" />
                      </button>

                      {/* Duration info */}
                      <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {movie.durationFormatted}
                      </div>
                    </div>

                    {/* Rating Pill */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/10 flex items-center gap-1 text-[11px] font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-amber-400" />
                      {movie.rating}
                    </div>
                  </div>

                  {/* Metadata Content */}
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-1">
                    <h3 className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                      {movie.name}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{movie.categoryName}</span>
                      <span>{movie.addedDate?.split('-')[0] || '2026'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Movie Detail Modal Dialog */}
      {selectedMovie && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-[#111722] border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            {/* Close Button */}
            <button
              onClick={() => setSelectedMovie(null)}
              className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Poster column */}
            <div className="md:w-1/3 relative bg-slate-950 aspect-[2/3] md:aspect-auto">
              <img
                src={selectedMovie.streamIcon}
                alt={selectedMovie.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#111722] md:hidden" />
            </div>

            {/* Information column */}
            <div className="md:w-2/3 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] font-bold font-mono">
                    {selectedMovie.containerExtension.toUpperCase()} MASTER
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400" /> {selectedMovie.rating} / 10
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {selectedMovie.durationFormatted}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-white leading-snug">
                  {selectedMovie.name}
                </h2>

                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedMovie.plot || 'No synopsis provided by content provider.'}
                </p>

                {/* Director and Cast */}
                <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                  {selectedMovie.director && (
                    <div className="flex gap-2">
                      <span className="text-slate-500 font-semibold w-16">Director:</span>
                      <span className="text-slate-200">{selectedMovie.director}</span>
                    </div>
                  )}
                  {selectedMovie.cast && (
                    <div className="flex gap-2">
                      <span className="text-slate-500 font-semibold w-16">Starring:</span>
                      <span className="text-slate-200 line-clamp-2">{selectedMovie.cast}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-slate-500 font-semibold w-16">Category:</span>
                    <span className="text-slate-200">{selectedMovie.categoryName}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => {
                    handlePlayMovie(selectedMovie);
                    setSelectedMovie(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Movie</span>
                </button>
                <button
                  onClick={() => toggleWatchlist(selectedMovie.streamId)}
                  className={`px-4 py-3 rounded-xl border font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    watchlist.includes(selectedMovie.streamId)
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${watchlist.includes(selectedMovie.streamId) ? 'fill-rose-400' : ''}`}
                  />
                  <span>{watchlist.includes(selectedMovie.streamId) ? 'Saved' : 'Watchlist'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

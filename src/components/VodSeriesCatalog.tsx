import React, { useState, useEffect } from 'react';
import {
  Film,
  Tv,
  Star,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Info,
  Calendar,
  CheckCircle2,
  Heart,
  Database,
  Trash2,
  X,
  RefreshCw,
  SlidersHorizontal,
  BookmarkCheck,
} from 'lucide-react';
import {
  UnifiedVodMovie,
  UnifiedSeries,
  UnifiedSeason,
  UnifiedEpisode,
  WatchProgressRecord,
} from '../types';
import {
  normalizeVodMovie,
  normalizeSeries,
  WatchProgressManager,
  buildVodMovieStreamUrl,
  buildSeriesEpisodeStreamUrl,
} from '../lib/vodEngine';
import {
  FIXTURE_VOD_MOVIES,
  FIXTURE_VOD_INFO_DUNE,
  FIXTURE_SERIES_CATALOG,
  FIXTURE_SERIES_INFO_SHOGUN,
} from '../lib/fixturesM3';
import { ChannelManager } from '../lib/channelManager';

interface VodSeriesCatalogProps {
  onPlayMedia?: (url: string, title: string, metadata?: any) => void;
}

function formatTime(seconds: number): string {
  const sec = Math.max(0, Math.floor(seconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}h ${m}m ${s > 0 ? `${s}s` : ''}`.trim();
  }
  return `${m}m ${s > 0 ? `${s}s` : ''}`.trim() || '0s';
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

export const VodSeriesCatalog: React.FC<VodSeriesCatalogProps> = ({ onPlayMedia }) => {
  const [activeTab, setActiveTab] = useState<'MOVIES' | 'SERIES'>('MOVIES');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMovie, setSelectedMovie] = useState<UnifiedVodMovie | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<UnifiedSeries | null>(null);
  const [selectedSeasonNumber, setSelectedSeasonNumber] = useState<number>(1);
  const [continueWatchingList, setContinueWatchingList] = useState<WatchProgressRecord[]>([]);
  const [playbackToast, setPlaybackToast] = useState<string | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState<boolean>(false);
  const [showProgressSimulator, setShowProgressSimulator] = useState<boolean>(false);
  const [simulatedTimeMinutes, setSimulatedTimeMinutes] = useState<number>(45);
  const [selectedSimMedia, setSelectedSimMedia] = useState<string>('movie_8801');
  const [dbStats, setDbStats] = useState<{ totalRecords: number; continueWatchingCount: number; dbPath: string } | null>(null);

  // Initialize movie & series data
  const movies: UnifiedVodMovie[] = FIXTURE_VOD_MOVIES.map(normalizeVodMovie);
  const shogun = normalizeSeries(FIXTURE_SERIES_CATALOG[0], FIXTURE_SERIES_INFO_SHOGUN);
  const severance = normalizeSeries(FIXTURE_SERIES_CATALOG[1]);
  const seriesList: UnifiedSeries[] = [shogun, severance];

  // Fetch progress from SQLite API
  const reloadProgressFromDb = async () => {
    setIsLoadingProgress(true);
    try {
      const res = await fetch('/api/m3/vod/progress');
      if (res.ok) {
        const data = await res.json();
        setContinueWatchingList(data.continueWatching || []);
        if (data.stats) {
          setDbStats(data.stats);
        }
      } else {
        // Fallback to local
        setContinueWatchingList(WatchProgressManager.getContinueWatchingList());
      }
    } catch {
      setContinueWatchingList(WatchProgressManager.getContinueWatchingList());
    } finally {
      setIsLoadingProgress(false);
    }
  };

  useEffect(() => {
    reloadProgressFromDb();
  }, []);

  const filteredMovies = movies.filter((m) => {
    const matchCat = selectedCategory === 'all' || m.categoryId === selectedCategory;
    const matchSearch = !searchQuery || m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredSeries = seriesList.filter((s) => {
    const matchSearch = !searchQuery || s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const handlePlayMovie = async (movie: UnifiedVodMovie, startSec: number = 0) => {
    const streamUrl = buildVodMovieStreamUrl(
      'http://provider.panel-stream.net:8080',
      'user1',
      'pass1',
      movie.streamId,
      movie.containerExtension
    );

    const currentTimeSec = startSec > 0 ? startSec : 120; // Default simulated starting progress if brand new

    // Save to SQLite database
    await WatchProgressManager.saveProgressToApi({
      mediaId: movie.streamId,
      mediaType: 'movie',
      title: movie.name,
      currentTimeSec,
      durationSec: movie.durationSec,
      streamUrl,
      streamIcon: movie.streamIcon,
    });
    await reloadProgressFromDb();

    if (onPlayMedia) {
      onPlayMedia(streamUrl, movie.name, { ...movie, initialTime: currentTimeSec });
    }
    setPlaybackToast(`Playing Movie: ${movie.name} (Resuming at ${formatTime(currentTimeSec)})`);
    setTimeout(() => setPlaybackToast(null), 3500);
  };

  const handlePlayEpisode = async (series: UnifiedSeries, ep: UnifiedEpisode, startSec: number = 0) => {
    const streamUrl = buildSeriesEpisodeStreamUrl(
      'http://provider.panel-stream.net:8080',
      'user1',
      'pass1',
      ep.streamId,
      ep.containerExtension
    );

    const currentTimeSec = startSec > 0 ? startSec : 60;

    // Save to SQLite database
    await WatchProgressManager.saveProgressToApi({
      mediaId: ep.id,
      mediaType: 'episode',
      title: `${series.name} - S${ep.seasonNumber}E${ep.episodeNumber}: ${ep.title}`,
      seasonNumber: ep.seasonNumber,
      episodeNumber: ep.episodeNumber,
      currentTimeSec,
      durationSec: ep.durationSec,
      streamUrl,
      streamIcon: series.coverUrl,
    });
    await reloadProgressFromDb();

    if (onPlayMedia) {
      onPlayMedia(streamUrl, `${series.name} S${ep.seasonNumber}E${ep.episodeNumber}: ${ep.title}`, { ...ep, initialTime: currentTimeSec });
    }
    setPlaybackToast(`Playing Episode: S${ep.seasonNumber}E${ep.episodeNumber} - ${ep.title} (at ${formatTime(currentTimeSec)})`);
    setTimeout(() => setPlaybackToast(null), 3500);
  };

  const handleResume = (item: WatchProgressRecord) => {
    if (onPlayMedia) {
      onPlayMedia(item.streamUrl, item.title, { initialTime: item.currentTimeSec });
    }
    setPlaybackToast(`Resuming "${item.title}" at ${formatTime(item.currentTimeSec)} (${item.progressPercent}%)`);
    setTimeout(() => setPlaybackToast(null), 3500);
  };

  const handleDeleteProgress = async (e: React.MouseEvent, item: WatchProgressRecord) => {
    e.stopPropagation();
    await WatchProgressManager.deleteProgressFromApi(item.mediaType, item.mediaId);
    await reloadProgressFromDb();
    setPlaybackToast(`Removed "${item.title}" from Continue Watching.`);
    setTimeout(() => setPlaybackToast(null), 3000);
  };

  const handleClearAllProgress = async () => {
    try {
      await fetch('/api/m3/vod/progress', { method: 'DELETE' });
      WatchProgressManager.clearAll();
      await reloadProgressFromDb();
      setPlaybackToast('Cleared all watch history from SQLite database.');
      setTimeout(() => setPlaybackToast(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateCustomProgress = async () => {
    const targetSeconds = simulatedTimeMinutes * 60;
    if (selectedSimMedia === 'movie_8801') {
      const movie = movies[0];
      await WatchProgressManager.saveProgressToApi({
        mediaId: movie.streamId,
        mediaType: 'movie',
        title: movie.name,
        currentTimeSec: targetSeconds,
        durationSec: movie.durationSec,
        streamUrl: buildVodMovieStreamUrl('http://provider.panel-stream.net:8080', 'user1', 'pass1', movie.streamId, 'mp4'),
        streamIcon: movie.streamIcon,
      });
    } else if (selectedSimMedia === 'movie_8802') {
      const movie = movies[1];
      await WatchProgressManager.saveProgressToApi({
        mediaId: movie.streamId,
        mediaType: 'movie',
        title: movie.name,
        currentTimeSec: targetSeconds,
        durationSec: movie.durationSec,
        streamUrl: buildVodMovieStreamUrl('http://provider.panel-stream.net:8080', 'user1', 'pass1', movie.streamId, 'mp4'),
        streamIcon: movie.streamIcon,
      });
    } else if (selectedSimMedia === 'episode_shogun_s1e3') {
      await WatchProgressManager.saveProgressToApi({
        mediaId: '9101_s1_e3',
        mediaType: 'episode',
        title: 'Shōgun - S1E3: Tomorrow is Tomorrow',
        seasonNumber: 1,
        episodeNumber: 3,
        currentTimeSec: targetSeconds,
        durationSec: 3600,
        streamUrl: buildSeriesEpisodeStreamUrl('http://provider.panel-stream.net:8080', 'user1', 'pass1', 91013, 'mp4'),
        streamIcon: shogun.coverUrl,
      });
    }
    await reloadProgressFromDb();
    setPlaybackToast(`Saved ${simulatedTimeMinutes}m progress to SQLite DB for ${selectedSimMedia}`);
    setTimeout(() => setPlaybackToast(null), 3000);
  };

  return (
    <div className="space-y-6" id="vod-series-catalog">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
            <Film className="w-4 h-4" />
            <span>Milestone 3b • VOD Movies, Series &amp; SQLite Progress Engine</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">On-Demand Catalog &amp; Continue Watching</h2>
          <p className="text-slate-400 text-xs mt-1">
            SQLite database persistent playback tracking with exact timestamps, auto-completion thresholds, and instantaneous resume.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* SQLite DB Status Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            <span>SQLite: data/iptv_player.db</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              id="btn-tab-movies"
              onClick={() => {
                setActiveTab('MOVIES');
                setSelectedSeries(null);
              }}
              className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'MOVIES'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Film className="w-3.5 h-3.5" /> Movies ({movies.length})
            </button>
            <button
              id="btn-tab-series"
              onClick={() => {
                setActiveTab('SERIES');
                setSelectedMovie(null);
              }}
              className={`px-4 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'SERIES'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tv className="w-3.5 h-3.5" /> Series ({seriesList.length})
            </button>
          </div>
        </div>
      </div>

      {playbackToast && (
        <div className="bg-indigo-950/90 border border-indigo-700 text-indigo-200 px-4 py-3 rounded-lg text-xs flex items-center gap-2 animate-fadeIn shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-medium">{playbackToast}</span>
        </div>
      )}

      {/* TOP SHELF: CONTINUE WATCHING (SQLite Persistent) */}
      <section id="continue-watching-shelf" className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-indigo-900/60 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  Continue Watching
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                  SQLite Synced
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Playback progress and timestamps stored in SQLite table <code className="text-cyan-400">watch_progress</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowProgressSimulator(!showProgressSimulator)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1.5 border border-slate-700 transition"
              title="Test updating progress timestamps in SQLite"
            >
              <SlidersHorizontal className="w-3 h-3 text-cyan-400" />
              <span>Simulate Progress</span>
            </button>

            <button
              onClick={reloadProgressFromDb}
              disabled={isLoadingProgress}
              className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition disabled:opacity-50"
              title="Refresh from SQLite database"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingProgress ? 'animate-spin text-indigo-400' : ''}`} />
            </button>

            {continueWatchingList.length > 0 && (
              <button
                onClick={handleClearAllProgress}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-300 text-[11px] font-medium border border-slate-800 hover:border-red-900/60 transition flex items-center gap-1"
                title="Clear all saved progress records"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Simulation Drawer */}
        {showProgressSimulator && (
          <div className="bg-slate-950 border border-indigo-800/60 rounded-lg p-4 space-y-3 animate-fadeIn text-xs">
            <div className="flex items-center justify-between font-bold text-slate-200">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Database className="w-3.5 h-3.5" /> SQLite Progress Tester
              </span>
              <button onClick={() => setShowProgressSimulator(false)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Select a title and simulate watch timestamps to verify real-time persistence and auto-completion threshold (&gt;90%).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Target Media</label>
                <select
                  value={selectedSimMedia}
                  onChange={(e) => setSelectedSimMedia(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="movie_8801">Dune: Part Two (Movie, 2h 46m)</option>
                  <option value="movie_8802">Oppenheimer (Movie, 3h 00m)</option>
                  <option value="episode_shogun_s1e3">Shōgun - S1E3 (Series, 60m)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Watched Position: <span className="text-indigo-300 font-mono font-bold">{simulatedTimeMinutes} min</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={170}
                  value={simulatedTimeMinutes}
                  onChange={(e) => setSimulatedTimeMinutes(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSimulateCustomProgress}
                  className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow"
                >
                  <BookmarkCheck className="w-3.5 h-3.5" /> Save Timestamp to SQLite
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Carousel / Grid */}
        {continueWatchingList.length === 0 ? (
          <div className="bg-slate-950/60 border border-dashed border-slate-800 rounded-lg p-6 text-center space-y-2">
            <RotateCcw className="w-6 h-6 text-slate-600 mx-auto" />
            <div className="text-xs font-semibold text-slate-300">No In-Progress Videos in SQLite Database</div>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Start watching any movie or TV series episode below. Playback timestamps are automatically saved to SQLite for instant resumption.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {continueWatchingList.map((item) => {
              const remainingSec = Math.max(0, item.durationSec - item.currentTimeSec);
              return (
                <div
                  key={`${item.mediaType}_${item.mediaId}`}
                  id={`resume-card-${item.mediaId}`}
                  onClick={() => handleResume(item)}
                  className="bg-slate-950 border border-slate-800 hover:border-indigo-500 rounded-xl p-3.5 cursor-pointer group transition-all relative overflow-hidden shadow-md flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    {/* Media Thumbnail with hover play overlay */}
                    <div className="relative w-16 h-22 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                      <img
                        src={item.streamIcon || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.mediaType === 'episode'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                            : 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/80'
                        }`}>
                          {item.mediaType === 'episode'
                            ? `S${item.seasonNumber || 1}:E${item.episodeNumber || 1}`
                            : 'Movie'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatRelativeTime(item.lastWatchedTimestamp)}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-white truncate group-hover:text-indigo-400 transition-colors leading-tight">
                        {item.title}
                      </h4>

                      <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between">
                        <span>{formatTime(item.currentTimeSec)} / {formatTime(item.durationSec)}</span>
                        <span className="text-indigo-400 font-bold">{item.progressPercent}%</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800/80">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>

                      <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5">
                        <span>{formatTime(remainingSec)} left</span>
                        <span className="text-indigo-300 font-medium group-hover:underline flex items-center gap-0.5">
                          Resume <ChevronRight className="w-2.5 h-2.5" />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dismiss / Delete button */}
                  <button
                    onClick={(e) => handleDeleteProgress(e, item)}
                    className="absolute top-2 right-2 p-1 rounded-full bg-slate-900/80 hover:bg-red-900 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700"
                    title="Remove from Continue Watching"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="vod-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab === 'MOVIES' ? 'movies' : 'series'} by title, genre, director...`}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {activeTab === 'MOVIES' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition-all w-full sm:w-auto"
            >
              <option value="all">All Genres</option>
              <option value="10">Sci-Fi &amp; Fantasy</option>
              <option value="11">Drama &amp; Biography</option>
              <option value="12">Animation &amp; Action</option>
            </select>
          </div>
        )}
      </div>

      {/* Catalog Grid */}
      {activeTab === 'MOVIES' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
          {filteredMovies.map((movie) => (
            <div
              key={movie.id}
              id={`movie-card-${movie.streamId}`}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/70 rounded-xl overflow-hidden shadow-sm flex flex-col group transition-all"
            >
              <div className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer" onClick={() => setSelectedMovie(movie)}>
                <img
                  src={movie.streamIcon}
                  alt={movie.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent" />
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 backdrop-blur-sm">
                    {movie.categoryName}
                  </span>
                </div>
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      ChannelManager.toggleFavorite(movie.streamId);
                    }}
                    className="p-1.5 rounded-full bg-slate-950/70 hover:bg-slate-900 text-slate-300 hover:text-red-400 backdrop-blur-sm transition-colors"
                  >
                    <Heart className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs text-white">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" /> {movie.rating}
                  </span>
                  <span className="flex items-center gap-1 text-slate-300 font-mono text-[11px]">
                    <Clock className="w-3 h-3" /> {movie.durationFormatted}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors line-clamp-1">
                    {movie.name}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {movie.plot || 'Epic cinematic presentation with high-bitrate surround sound.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    id={`btn-play-movie-${movie.streamId}`}
                    onClick={() => handlePlayMovie(movie)}
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Watch Movie
                  </button>
                  <button
                    onClick={() => setSelectedMovie(movie)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
                  >
                    Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Series List with Seasons & Episodes */
        <div className="space-y-6">
          {filteredSeries.map((series) => (
            <div
              key={series.id}
              id={`series-card-${series.seriesId}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col md:flex-row gap-5">
                <img
                  src={series.coverUrl}
                  alt={series.name}
                  className="w-full md:w-44 aspect-[2/3] object-cover rounded-lg bg-slate-950 shrink-0"
                  referrerPolicy="no-referrer"
                />

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {series.categoryName}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current" /> {series.rating}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{series.releaseDate}</span>
                  </div>

                  <h3 className="text-xl font-bold text-white">{series.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">{series.plot}</p>

                  <div className="text-xs text-slate-500 pt-1">
                    <span className="text-slate-400 font-medium">Cast:</span> {series.cast} •{' '}
                    <span className="text-slate-400 font-medium">Director:</span> {series.director}
                  </div>

                  {/* Season Selector */}
                  <div className="flex items-center gap-2 pt-3">
                    <span className="text-xs font-semibold text-slate-300">Seasons:</span>
                    {series.seasons.map((season) => (
                      <button
                        key={season.seasonNumber}
                        onClick={() => setSelectedSeasonNumber(season.seasonNumber)}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                          selectedSeasonNumber === season.seasonNumber
                            ? 'bg-indigo-600 text-white shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {season.name} ({season.episodeCount} Episodes)
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Episodes Row */}
              {series.seasons.length > 0 && (
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Season {selectedSeasonNumber} Episodes
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {series.seasons
                      .find((s) => s.seasonNumber === selectedSeasonNumber)
                      ?.episodes.map((ep) => (
                        <div
                          key={ep.id}
                          id={`episode-card-${ep.id}`}
                          onClick={() => handlePlayEpisode(series, ep)}
                          className="bg-slate-950 border border-slate-800/80 hover:border-indigo-500 rounded-lg p-3 cursor-pointer group transition-all space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-400">
                              Episode {ep.episodeNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{ep.durationFormatted}</span>
                          </div>
                          <div className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors">
                            {ep.title}
                          </div>
                          {ep.plot && <p className="text-[11px] text-slate-400 line-clamp-2">{ep.plot}</p>}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-amber-400 flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" /> {ep.rating || 9.0}
                            </span>
                            <span className="text-[10px] text-indigo-400 flex items-center gap-1 font-bold group-hover:underline">
                              <Play className="w-3 h-3 fill-current" /> Play Episode
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Movie Details Modal */}
      {selectedMovie && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row gap-6 animate-fadeIn">
          <img
            src={selectedMovie.streamIcon}
            alt={selectedMovie.name}
            className="w-full md:w-48 aspect-[2/3] object-cover rounded-lg bg-slate-950 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                {selectedMovie.categoryName}
              </span>
              <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-current" /> {selectedMovie.rating}
              </span>
              <span className="text-xs text-slate-400 font-mono">{selectedMovie.durationFormatted}</span>
            </div>

            <h3 className="text-xl font-bold text-white">{selectedMovie.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{selectedMovie.plot || FIXTURE_VOD_INFO_DUNE.info.plot}</p>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800">
              <div>
                <span className="text-slate-500 font-medium">Director:</span> {FIXTURE_VOD_INFO_DUNE.info.director}
              </div>
              <div>
                <span className="text-slate-500 font-medium">Release Date:</span> {FIXTURE_VOD_INFO_DUNE.info.release_date}
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 font-medium">Cast:</span> {FIXTURE_VOD_INFO_DUNE.info.actors}
              </div>
              <div>
                <span className="text-slate-500 font-medium">Video Codec:</span> 4K HEVC / 24 FPS
              </div>
              <div>
                <span className="text-slate-500 font-medium">Audio:</span> E-AC-3 5.1 Surround
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={() => handlePlayMovie(selectedMovie)}
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow"
              >
                <Play className="w-4 h-4 fill-current" /> Watch Movie Now
              </button>
              <button
                onClick={() => setSelectedMovie(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

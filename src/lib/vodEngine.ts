/**
 * Milestone 3b: VOD (Video on Demand) Movies & Multi-Season Series Engine + Watch Progress Tracker
 */

import {
  UnifiedVodMovie,
  UnifiedSeries,
  UnifiedSeason,
  UnifiedEpisode,
  WatchProgressRecord,
} from './models';

const WATCH_PROGRESS_KEY = 'iptv_player_watch_progress_v1';

/**
 * Normalizes raw VOD stream item from Xtream `get_vod_streams` into UnifiedVodMovie
 */
export function normalizeVodMovie(raw: any): UnifiedVodMovie {
  const durationSec = parseInt(raw.duration_secs || raw.duration || '0', 10);
  const hours = Math.floor(durationSec / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const durationFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  const ratingStr = String(raw.rating || raw.rating_5based || '0.0');
  const ratingNum = parseFloat(ratingStr) || 0;
  const rating5 = raw.rating_5based ? parseFloat(raw.rating_5based) : parseFloat((ratingNum / 2).toFixed(1));

  return {
    id: raw.stream_id || raw.id,
    streamId: parseInt(raw.stream_id || raw.id, 10),
    name: raw.name || 'Untitled Movie',
    categoryName: raw.category_name || 'VOD Movies',
    categoryId: String(raw.category_id || '0'),
    rating: ratingStr,
    rating5,
    durationSec,
    durationFormatted,
    streamIcon: raw.stream_icon || raw.cover_big || 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500',
    containerExtension: raw.container_extension || 'mp4',
    addedDate: raw.added ? new Date(parseInt(raw.added, 10) * 1000).toISOString().split('T')[0] : undefined,
    backdropUrl: raw.backdrop_path && raw.backdrop_path[0] ? raw.backdrop_path[0] : undefined,
    plot: raw.plot || raw.description,
    director: raw.director,
    cast: raw.cast || raw.actors,
  };
}

/**
 * Normalizes raw series item & detailed `get_series_info` payload into UnifiedSeries
 */
export function normalizeSeries(rawSeries: any, detailedInfo?: any): UnifiedSeries {
  const seriesId = parseInt(rawSeries.series_id || rawSeries.id, 10);
  const ratingStr = String(rawSeries.rating || '0.0');
  const ratingNum = parseFloat(ratingStr) || 0;
  const rating5 = rawSeries.rating_5based ? parseFloat(rawSeries.rating_5based) : parseFloat((ratingNum / 2).toFixed(1));

  const seasons: UnifiedSeason[] = [];

  if (detailedInfo && detailedInfo.seasons && detailedInfo.episodes) {
    const rawSeasons: any[] = Array.isArray(detailedInfo.seasons) ? detailedInfo.seasons : [];
    const rawEpisodesMap: Record<string, any[]> = detailedInfo.episodes || {};

    for (const s of rawSeasons) {
      const sNum = parseInt(s.season_number || s.season || '1', 10);
      const epsForSeason = rawEpisodesMap[String(sNum)] || rawEpisodesMap[sNum] || [];

      const episodes: UnifiedEpisode[] = epsForSeason.map((ep: any) => {
        const durSec = parseInt(ep.info?.duration_secs || '0', 10);
        const mins = Math.floor(durSec / 60);
        const formatted = mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;

        return {
          id: String(ep.id || `${seriesId}_s${sNum}_e${ep.episode_num}`),
          streamId: ep.id,
          seasonNumber: sNum,
          episodeNumber: parseInt(ep.episode_num || '1', 10),
          title: ep.title || `Episode ${ep.episode_num}`,
          containerExtension: ep.container_extension || 'mp4',
          durationSec: durSec,
          durationFormatted: formatted,
          plot: ep.info?.plot,
          rating: ep.info?.rating ? parseFloat(ep.info.rating) : undefined,
          releaseDate: ep.info?.releasedate,
          thumbnail: ep.info?.movie_image,
        };
      });

      seasons.push({
        seasonNumber: sNum,
        name: s.name || `Season ${sNum}`,
        overview: s.overview,
        episodeCount: episodes.length,
        coverUrl: s.cover,
        episodes,
      });
    }
  }

  return {
    id: seriesId,
    seriesId,
    name: rawSeries.name || 'Untitled Series',
    categoryId: String(rawSeries.category_id || '0'),
    categoryName: rawSeries.category_name || 'TV Series',
    coverUrl: rawSeries.cover || rawSeries.stream_icon || 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500',
    plot: rawSeries.plot || detailedInfo?.info?.plot || '',
    cast: rawSeries.cast || detailedInfo?.info?.cast || '',
    director: rawSeries.director || detailedInfo?.info?.director || '',
    genre: rawSeries.genre || detailedInfo?.info?.genre || 'Drama',
    releaseDate: rawSeries.releaseDate || detailedInfo?.info?.releaseDate || '',
    rating: ratingStr,
    rating5,
    seasons,
  };
}

/**
 * Builds direct stream URL for a VOD Movie: /movie/USER/PASS/STREAM_ID.CONTAINER
 */
export function buildVodMovieStreamUrl(
  serverUrl: string,
  username: string,
  password: string,
  streamId: number | string,
  container: string = 'mp4'
): string {
  const base = serverUrl.replace(/\/+$/, '');
  return `${base}/movie/${username}/${password}/${streamId}.${container}`;
}

/**
 * Builds direct stream URL for a Series Episode: /series/USER/PASS/EPISODE_ID.CONTAINER
 */
export function buildSeriesEpisodeStreamUrl(
  serverUrl: string,
  username: string,
  password: string,
  episodeId: number | string,
  container: string = 'mp4'
): string {
  const base = serverUrl.replace(/\/+$/, '');
  return `${base}/series/${username}/${password}/${episodeId}.${container}`;
}

/**
 * In-memory fallback if localStorage is unavailable
 */
let inMemoryWatchProgress: Record<string, WatchProgressRecord> = {};

/**
 * Watch Progress & Resume Manager
 */
export class WatchProgressManager {
  private static loadAll(): Record<string, WatchProgressRecord> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(WATCH_PROGRESS_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }
    return inMemoryWatchProgress;
  }

  private static saveAll(records: Record<string, WatchProgressRecord>): void {
    inMemoryWatchProgress = records;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(records));
      }
    } catch {
      // Ignored
    }
  }

  public static saveProgress(record: {
    mediaId: string | number;
    mediaType: 'movie' | 'episode' | 'live';
    title: string;
    seasonNumber?: number;
    episodeNumber?: number;
    currentTimeSec: number;
    durationSec: number;
    streamUrl: string;
    streamIcon?: string;
  }): WatchProgressRecord {
    const all = this.loadAll();
    const duration = Math.max(1, record.durationSec);
    const current = Math.max(0, record.currentTimeSec);
    const progressPercent = Math.min(100, Math.round((current / duration) * 100));
    const completed = progressPercent >= 90; // If watched >= 90%, mark completed

    const key = `${record.mediaType}_${record.mediaId}`;
    const fullRecord: WatchProgressRecord = {
      ...record,
      progressPercent,
      completed,
      lastWatchedTimestamp: Date.now(),
    };

    all[key] = fullRecord;
    this.saveAll(all);
    return fullRecord;
  }

  public static getProgress(mediaType: 'movie' | 'episode' | 'live', mediaId: string | number): WatchProgressRecord | null {
    const all = this.loadAll();
    const key = `${mediaType}_${mediaId}`;
    return all[key] || null;
  }

  public static getContinueWatchingList(): WatchProgressRecord[] {
    const all = this.loadAll();
    return Object.values(all)
      .filter((r) => !r.completed && r.progressPercent > 2) // Unfinished and watched at least 2%
      .sort((a, b) => b.lastWatchedTimestamp - a.lastWatchedTimestamp);
  }

  public static deleteProgress(mediaType: 'movie' | 'episode' | 'live', mediaId: string | number): void {
    const all = this.loadAll();
    const key = `${mediaType}_${mediaId}`;
    if (all[key]) {
      delete all[key];
      this.saveAll(all);
    }
  }

  public static clearAll(): void {
    inMemoryWatchProgress = {};
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(WATCH_PROGRESS_KEY);
      }
    } catch {
      // Ignored
    }
  }

  /**
   * Fetches the current Continue Watching list from the server's SQLite database
   */
  public static async fetchContinueWatchingFromApi(): Promise<WatchProgressRecord[]> {
    try {
      const res = await fetch('/api/m3/vod/progress');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.continueWatching)) {
          // Sync into local cache
          const all = this.loadAll();
          data.continueWatching.forEach((r: WatchProgressRecord) => {
            all[`${r.mediaType}_${r.mediaId}`] = r;
          });
          this.saveAll(all);
          return data.continueWatching;
        }
      }
    } catch {
      // Fall back to local
    }
    return this.getContinueWatchingList();
  }

  /**
   * Persists watch progress directly to server's SQLite database
   */
  public static async saveProgressToApi(record: {
    mediaId: string | number;
    mediaType: 'movie' | 'episode' | 'live';
    title: string;
    seasonNumber?: number;
    episodeNumber?: number;
    currentTimeSec: number;
    durationSec: number;
    streamUrl: string;
    streamIcon?: string;
  }): Promise<WatchProgressRecord> {
    const localSaved = this.saveProgress(record);
    try {
      const res = await fetch('/api/m3/vod/watch-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        const serverSaved = await res.json();
        return serverSaved;
      }
    } catch {
      // Fall back to locally saved
    }
    return localSaved;
  }

  /**
   * Deletes a progress record from the server's SQLite database
   */
  public static async deleteProgressFromApi(mediaType: 'movie' | 'episode' | 'live', mediaId: string | number): Promise<boolean> {
    this.deleteProgress(mediaType, mediaId);
    try {
      const id = `${mediaType}_${mediaId}`;
      const res = await fetch(`/api/m3/vod/progress/${id}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

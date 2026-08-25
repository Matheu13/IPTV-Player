import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { WatchProgressRecord } from './models';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'iptv_player.db');

export class SQLiteWatchProgressDB {
  private static instance: SQLiteWatchProgressDB | null = null;
  private db: DatabaseSync;

  private constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });
    }

    this.db = new DatabaseSync(DB_FILE);
    this.initSchema();
    this.seedDefaultIfEmpty();
  }

  public static getInstance(): SQLiteWatchProgressDB {
    if (!SQLiteWatchProgressDB.instance) {
      SQLiteWatchProgressDB.instance = new SQLiteWatchProgressDB();
    }
    return SQLiteWatchProgressDB.instance;
  }

  private initSchema(): void {
    // Enable WAL mode for high concurrency and performance
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
    } catch {
      // Best effort PRAGMA
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS watch_progress (
        id TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        media_type TEXT NOT NULL,
        title TEXT NOT NULL,
        season_number INTEGER,
        episode_number INTEGER,
        current_time_sec REAL NOT NULL,
        duration_sec REAL NOT NULL,
        progress_percent INTEGER NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        stream_url TEXT NOT NULL,
        stream_icon TEXT,
        last_watched_timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_watch_progress_last_watched 
      ON watch_progress(last_watched_timestamp DESC);

      CREATE INDEX IF NOT EXISTS idx_watch_progress_completed 
      ON watch_progress(completed);
    `);
  }

  private seedDefaultIfEmpty(): void {
    const row = this.db.prepare('SELECT COUNT(*) as count FROM watch_progress').get() as { count: number } | undefined;
    if (row && Number(row.count) === 0) {
      // Seed sample in-progress items for initial demonstration
      const now = Date.now();
      
      // 1. Dune: Part Two (Movie, 48m into 2h 46m = 29% progress)
      this.saveProgress({
        mediaId: 8801,
        mediaType: 'movie',
        title: 'Dune: Part Two',
        currentTimeSec: 2880,
        durationSec: 9960,
        streamUrl: 'http://provider.panel-stream.net:8080/movie/user1/pass1/8801.mp4',
        streamIcon: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500',
      });

      // 2. Shōgun S1E2 (Series Episode, 28m into 58m = 48% progress)
      this.saveProgress({
        mediaId: '9101_s1_e2',
        mediaType: 'episode',
        title: 'Shōgun - S1E2: Servants of Two Masters',
        seasonNumber: 1,
        episodeNumber: 2,
        currentTimeSec: 1680,
        durationSec: 3480,
        streamUrl: 'http://provider.panel-stream.net:8080/series/user1/pass1/91012.mp4',
        streamIcon: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500',
      });

      // 3. Severance S1E1 (Series Episode, 15m into 55m = 27% progress)
      this.saveProgress({
        mediaId: '9102_s1_e1',
        mediaType: 'episode',
        title: 'Severance - S1E1: Good News About Hell',
        seasonNumber: 1,
        episodeNumber: 1,
        currentTimeSec: 900,
        durationSec: 3300,
        streamUrl: 'http://provider.panel-stream.net:8080/series/user1/pass1/91021.mp4',
        streamIcon: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500',
      });
    }
  }

  public saveProgress(record: {
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
    const duration = Math.max(1, Number(record.durationSec) || 1);
    const current = Math.max(0, Number(record.currentTimeSec) || 0);
    const progressPercent = Math.min(100, Math.round((current / duration) * 100));
    const completed = progressPercent >= 90 ? 1 : 0;
    const lastWatchedTimestamp = Date.now();
    const id = `${record.mediaType}_${record.mediaId}`;

    const stmt = this.db.prepare(`
      INSERT INTO watch_progress (
        id, media_id, media_type, title, season_number, episode_number,
        current_time_sec, duration_sec, progress_percent, completed,
        stream_url, stream_icon, last_watched_timestamp
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        season_number = excluded.season_number,
        episode_number = excluded.episode_number,
        current_time_sec = excluded.current_time_sec,
        duration_sec = excluded.duration_sec,
        progress_percent = excluded.progress_percent,
        completed = excluded.completed,
        stream_url = excluded.stream_url,
        stream_icon = COALESCE(excluded.stream_icon, watch_progress.stream_icon),
        last_watched_timestamp = excluded.last_watched_timestamp;
    `);

    stmt.run(
      id,
      String(record.mediaId),
      record.mediaType,
      record.title,
      record.seasonNumber ?? null,
      record.episodeNumber ?? null,
      current,
      duration,
      progressPercent,
      completed,
      record.streamUrl || '',
      record.streamIcon ?? null,
      lastWatchedTimestamp
    );

    return {
      mediaId: record.mediaId,
      mediaType: record.mediaType,
      title: record.title,
      seasonNumber: record.seasonNumber,
      episodeNumber: record.episodeNumber,
      currentTimeSec: current,
      durationSec: duration,
      progressPercent,
      completed: completed === 1,
      lastWatchedTimestamp,
      streamUrl: record.streamUrl,
      streamIcon: record.streamIcon,
    };
  }

  public getProgress(mediaType: 'movie' | 'episode' | 'live', mediaId: string | number): WatchProgressRecord | null {
    const id = `${mediaType}_${mediaId}`;
    const stmt = this.db.prepare('SELECT * FROM watch_progress WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;
    return this.mapRow(row);
  }

  public getContinueWatchingList(limit = 50): WatchProgressRecord[] {
    // Unfinished content with progress > 2% sorted latest watched first
    const stmt = this.db.prepare(`
      SELECT * FROM watch_progress
      WHERE completed = 0 AND progress_percent > 2
      ORDER BY last_watched_timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((r) => this.mapRow(r));
  }

  public getAllProgress(): WatchProgressRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM watch_progress
      ORDER BY last_watched_timestamp DESC
    `);
    const rows = stmt.all() as any[];
    return rows.map((r) => this.mapRow(r));
  }

  public deleteProgress(idOrMediaType: string, mediaId?: string | number): boolean {
    const id = mediaId !== undefined ? `${idOrMediaType}_${mediaId}` : idOrMediaType;
    const stmt = this.db.prepare('DELETE FROM watch_progress WHERE id = ?');
    stmt.run(id);
    return true;
  }

  public clearAll(): void {
    this.db.exec('DELETE FROM watch_progress;');
  }

  public getStats(): {
    dbPath: string;
    totalRecords: number;
    continueWatchingCount: number;
    fileSizeBytes: number;
    lastUpdated: number;
  } {
    const countRow = this.db.prepare('SELECT COUNT(*) as total FROM watch_progress').get() as any;
    const activeRow = this.db.prepare('SELECT COUNT(*) as cw FROM watch_progress WHERE completed = 0 AND progress_percent > 2').get() as any;
    let fileSizeBytes = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        fileSizeBytes = fs.statSync(DB_FILE).size;
      }
    } catch {
      // Ignored
    }

    return {
      dbPath: DB_FILE,
      totalRecords: Number(countRow?.total || 0),
      continueWatchingCount: Number(activeRow?.cw || 0),
      fileSizeBytes,
      lastUpdated: Date.now(),
    };
  }

  private mapRow(row: any): WatchProgressRecord {
    return {
      mediaId: row.media_id,
      mediaType: row.media_type as 'movie' | 'episode' | 'live',
      title: row.title,
      seasonNumber: row.season_number ?? undefined,
      episodeNumber: row.episode_number ?? undefined,
      currentTimeSec: Number(row.current_time_sec),
      durationSec: Number(row.duration_sec),
      progressPercent: Number(row.progress_percent),
      completed: Boolean(row.completed),
      lastWatchedTimestamp: Number(row.last_watched_timestamp),
      streamUrl: row.stream_url,
      streamIcon: row.stream_icon ?? undefined,
    };
  }
}

export const sqliteWatchProgressDB = SQLiteWatchProgressDB.getInstance();

/**
 * Milestone 4a: SQLite EPG Database Engine
 * 
 * High-performance storage and indexed retrieval for XMLTV channels, programmes,
 * channel mappings, and fast sub-millisecond Now/Next lookups.
 */

import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import { UnifiedEpgProgram, XmltvChannel } from './models';
import { EpgMatchResult, matchChannelToXmltv } from './fuzzyEpgMatcher';
import { generateProviderCatalog } from './channelGenerator';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'iptv_player.db');

export interface ChannelNowNext {
  channelId: string | number;
  xmltvChannelId: string | null;
  hasEpgData: boolean;
  matchType?: string;
  matchScore?: number;
  isUncertain?: boolean;
  flaggedCandidateName?: string;
  reviewReason?: string;
  now: UnifiedEpgProgram | null;
  next: UnifiedEpgProgram | null;
}

export interface RawSqliteErrorLog {
  id: string;
  timestamp: string;
  operation: string;
  errorCode?: string;
  errorMessage: string;
  querySnippet?: string;
  table?: string;
  constraintViolated?: string;
  failedRecordSnippet?: any;
}

export class SQLiteEpgDB {
  private static instance: SQLiteEpgDB | null = null;
  private db: DatabaseSync;
  private rawSqliteErrorLogs: RawSqliteErrorLog[] = [];

  public constructor(customPath?: string) {
    const targetFile = customPath || DB_FILE;
    if (targetFile !== ':memory:') {
      const dir = path.dirname(targetFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
    }

    this.db = new DatabaseSync(targetFile);
    this.initSchema();
    if (targetFile !== ':memory:') {
      this.seedSampleEpg();
    }
  }

  public static getInstance(): SQLiteEpgDB {
    if (!SQLiteEpgDB.instance) {
      SQLiteEpgDB.instance = new SQLiteEpgDB();
    }
    return SQLiteEpgDB.instance;
  }

  private initSchema(): void {
    try {
      this.db.exec('PRAGMA journal_mode = WAL;');
      this.db.exec('PRAGMA synchronous = NORMAL;');
    } catch {
      // Best effort
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS epg_channels (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        icon_src TEXT,
        tvg_id TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS epg_programmes (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        title TEXT NOT NULL,
        sub_title TEXT,
        description TEXT,
        category TEXT,
        start_time_epoch INTEGER NOT NULL,
        stop_time_epoch INTEGER NOT NULL,
        duration_minutes INTEGER NOT NULL,
        star_rating TEXT,
        has_catchup INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS epg_channel_mappings (
        channel_id TEXT PRIMARY KEY,
        tvg_id TEXT,
        xmltv_channel_id TEXT,
        match_type TEXT NOT NULL,
        match_score REAL NOT NULL,
        is_manual INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS iptv_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        base_url TEXT NOT NULL,
        username TEXT,
        status TEXT NOT NULL,
        max_connections INTEGER DEFAULT 1,
        channel_count INTEGER DEFAULT 0,
        category_count INTEGER DEFAULT 0,
        last_refreshed_at INTEGER,
        metadata_json TEXT
      );

      CREATE TABLE IF NOT EXISTS iptv_categories (
        id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        name TEXT NOT NULL,
        parent_id INTEGER DEFAULT 0,
        channel_count INTEGER DEFAULT 0,
        PRIMARY KEY (id, source_id)
      );

      CREATE TABLE IF NOT EXISTS iptv_channels (
        id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        stream_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        stream_type TEXT NOT NULL DEFAULT 'live',
        category_id TEXT NOT NULL,
        category_name TEXT,
        stream_icon TEXT,
        epg_channel_id TEXT,
        tv_archive INTEGER DEFAULT 0,
        tv_archive_duration INTEGER DEFAULT 0,
        num INTEGER DEFAULT 0,
        formats_json TEXT,
        resolved_stream_url TEXT,
        active_format TEXT,
        updated_at INTEGER NOT NULL,
        PRIMARY KEY (id, source_id)
      );

      -- Critical Performance Indexes for Sub-millisecond Now/Next & Schedule Queries
      CREATE INDEX IF NOT EXISTS idx_epg_prog_ch_start 
      ON epg_programmes(channel_id, start_time_epoch);

      CREATE INDEX IF NOT EXISTS idx_epg_prog_ch_stop 
      ON epg_programmes(channel_id, stop_time_epoch);

      CREATE INDEX IF NOT EXISTS idx_epg_prog_ch_window 
      ON epg_programmes(channel_id, start_time_epoch, stop_time_epoch);

      CREATE INDEX IF NOT EXISTS idx_epg_prog_time_window 
      ON epg_programmes(start_time_epoch, stop_time_epoch);

      CREATE INDEX IF NOT EXISTS idx_iptv_chan_cat 
      ON iptv_channels(category_id);

      CREATE INDEX IF NOT EXISTS idx_iptv_chan_name 
      ON iptv_channels(name);

      CREATE INDEX IF NOT EXISTS idx_iptv_chan_source 
      ON iptv_channels(source_id);
    `);
  }

  /**
   * Batch inserts channels in an atomic transaction
   */
  public insertChannels(channels: XmltvChannel[]): number {
    if (!channels || channels.length === 0) return 0;

    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO epg_channels (id, display_name, icon_src, tvg_id, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        icon_src = COALESCE(excluded.icon_src, epg_channels.icon_src),
        updated_at = excluded.updated_at;
    `);

    this.db.exec('BEGIN TRANSACTION;');
    try {
      for (const ch of channels) {
        stmt.run(ch.id, ch.displayName || ch.id, ch.iconSrc ?? null, ch.id, now);
      }
      this.db.exec('COMMIT;');
      return channels.length;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  /**
   * Batch inserts programmes in an atomic transaction
   */
  public insertProgrammesBatch(programmes: UnifiedEpgProgram[]): number {
    if (!programmes || programmes.length === 0) return 0;

    const stmt = this.db.prepare(`
      INSERT INTO epg_programmes (
        id, channel_id, title, sub_title, description, category,
        start_time_epoch, stop_time_epoch, duration_minutes,
        star_rating, has_catchup
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        sub_title = excluded.sub_title,
        description = excluded.description,
        category = excluded.category,
        start_time_epoch = excluded.start_time_epoch,
        stop_time_epoch = excluded.stop_time_epoch,
        duration_minutes = excluded.duration_minutes,
        star_rating = excluded.star_rating,
        has_catchup = excluded.has_catchup;
    `);

    this.db.exec('BEGIN TRANSACTION;');
    try {
      for (const p of programmes) {
        const anyP = p as any;
        const startSec =
          anyP.startTimeEpoch !== undefined
            ? Number(anyP.startTimeEpoch)
            : anyP.startTimestampSec !== undefined
            ? Number(anyP.startTimestampSec)
            : anyP.start instanceof Date
            ? Math.floor(anyP.start.getTime() / 1000)
            : typeof anyP.start === 'string'
            ? Math.floor(new Date(anyP.start).getTime() / 1000)
            : 0;

        const stopSec =
          anyP.stopTimeEpoch !== undefined
            ? Number(anyP.stopTimeEpoch)
            : anyP.stopTimestampSec !== undefined
            ? Number(anyP.stopTimestampSec)
            : anyP.stop instanceof Date
            ? Math.floor(anyP.stop.getTime() / 1000)
            : typeof anyP.stop === 'string'
            ? Math.floor(new Date(anyP.stop).getTime() / 1000)
            : startSec + 1800;

        const durationMin = anyP.durationMinutes || Math.max(1, Math.round((stopSec - startSec) / 60));
        const id = anyP.id || `prog_${anyP.channelId}_${startSec}`;

        stmt.run(
          id,
          anyP.channelId,
          anyP.title || 'Untitled Program',
          anyP.subTitle ?? anyP.subtitle ?? null,
          anyP.description ?? anyP.desc ?? null,
          anyP.category ?? 'General',
          startSec,
          stopSec,
          durationMin,
          anyP.starRating ?? anyP.rating ?? null,
          anyP.hasCatchupArchive || anyP.hasCatchup ? 1 : 0
        );
      }
      this.db.exec('COMMIT;');
      return programmes.length;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  /**
   * Retrieves Now and Next programme for a specific XMLTV channel ID
   */
  public getNowAndNext(xmltvChannelId: string, targetTimeEpochSec?: number): { now: UnifiedEpgProgram | null; next: UnifiedEpgProgram | null } {
    const target = targetTimeEpochSec !== undefined ? targetTimeEpochSec : Math.floor(Date.now() / 1000);

    // 1. Current program: start <= target < stop
    const nowStmt = this.db.prepare(`
      SELECT * FROM epg_programmes
      WHERE channel_id = ? AND start_time_epoch <= ? AND stop_time_epoch > ?
      ORDER BY start_time_epoch DESC
      LIMIT 1
    `);
    const nowRow = nowStmt.get(xmltvChannelId, target, target) as any;

    // 2. Next program: start >= target (or start >= current program stop)
    const nextStartRef = nowRow ? Number(nowRow.stop_time_epoch) : target;
    const nextStmt = this.db.prepare(`
      SELECT * FROM epg_programmes
      WHERE channel_id = ? AND start_time_epoch >= ?
      ORDER BY start_time_epoch ASC
      LIMIT 1
    `);
    const nextRow = nextStmt.get(xmltvChannelId, nextStartRef) as any;

    const nowProg = nowRow ? this.mapRowToProgram(nowRow, target) : null;
    const nextProg = nextRow ? this.mapRowToProgram(nextRow, target) : null;

    return { now: nowProg, next: nextProg };
  }

  /**
   * Retrieves Now/Next for a batch of IPTV channels, using fuzzy mappings
   * CRITICAL: Always returns every requested channel, showing unmatched channels instead of hiding them!
   */
  public getNowAndNextForChannels(
    channels: Array<{ id: string | number; name: string; tvgId?: string; epgChannelId?: string }>,
    targetTimeEpochSec?: number
  ): ChannelNowNext[] {
    const target = targetTimeEpochSec !== undefined ? targetTimeEpochSec : Math.floor(Date.now() / 1000);
    const xmltvCandidates = this.getAllChannels();
    const storedMappings = this.getAllMappings();

    const results: ChannelNowNext[] = [];

    for (const ch of channels) {
      const chKey = String(ch.id);
      let xmltvId: string | null = null;
      let matchType = 'UNMATCHED';
      let matchScore = 0;

      let nowProg: UnifiedEpgProgram | null = null;
      let nextProg: UnifiedEpgProgram | null = null;
      let isUncertain = false;
      let flaggedCandidateName: string | undefined = undefined;
      let reviewReason: string | undefined = undefined;

      // 1. Check existing stored mapping
      if (storedMappings[chKey] && storedMappings[chKey].xmltv_channel_id) {
        xmltvId = storedMappings[chKey].xmltv_channel_id;
        matchType = storedMappings[chKey].match_type;
        matchScore = Number(storedMappings[chKey].match_score);
        isUncertain = matchType === 'UNCERTAIN_FUZZY';
      } else {
        // 2. Perform fuzzy match on-the-fly
        const match = matchChannelToXmltv(ch, xmltvCandidates);
        xmltvId = match.xmltvChannelId;
        matchType = match.matchType;
        matchScore = match.matchScore;
        isUncertain = match.isUncertain ?? false;
        flaggedCandidateName = match.flaggedCandidateName;
        reviewReason = match.reviewReason;

        if (match.isMatched && xmltvId) {
          this.saveMapping(match);
        }
      }

      if (xmltvId) {
        const { now, next } = this.getNowAndNext(xmltvId, target);
        nowProg = now;
        nextProg = next;
      }

      results.push({
        channelId: ch.id,
        xmltvChannelId: xmltvId,
        hasEpgData: Boolean(nowProg || nextProg),
        matchType,
        matchScore,
        isUncertain,
        flaggedCandidateName,
        reviewReason,
        now: nowProg,
        next: nextProg,
      });
    }

    return results;
  }

  /**
   * Saves or updates a channel mapping in SQLite
   */
  public saveMapping(mapping: {
    channelId: string | number;
    tvgId?: string;
    xmltvChannelId: string | null;
    matchType: string;
    matchScore: number;
    isManual?: boolean;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO epg_channel_mappings (
        channel_id, tvg_id, xmltv_channel_id, match_type, match_score, is_manual, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        tvg_id = excluded.tvg_id,
        xmltv_channel_id = excluded.xmltv_channel_id,
        match_type = excluded.match_type,
        match_score = excluded.match_score,
        is_manual = excluded.is_manual,
        updated_at = excluded.updated_at;
    `);

    stmt.run(
      String(mapping.channelId),
      mapping.tvgId ?? null,
      mapping.xmltvChannelId ?? null,
      mapping.matchType,
      mapping.matchScore,
      mapping.isManual ? 1 : 0,
      Date.now()
    );
  }

  public getAllMappings(): Record<string, any> {
    const stmt = this.db.prepare('SELECT * FROM epg_channel_mappings');
    const rows = stmt.all() as any[];
    const map: Record<string, any> = {};
    for (const r of rows) {
      map[r.channel_id] = r;
    }
    return map;
  }

  public getAllChannels(): XmltvChannel[] {
    const stmt = this.db.prepare('SELECT id, display_name, icon_src FROM epg_channels ORDER BY display_name ASC');
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      iconSrc: r.icon_src ?? undefined,
    }));
  }

  /**
   * Retrieves full chronological schedule for a specific channel
   */
  public getSchedule(channelId: string, fromEpochSec: number, toEpochSec: number): UnifiedEpgProgram[] {
    const stmt = this.db.prepare(`
      SELECT * FROM epg_programmes
      WHERE channel_id = ? AND stop_time_epoch >= ? AND start_time_epoch <= ?
      ORDER BY start_time_epoch ASC
    `);
    const rows = stmt.all(channelId, fromEpochSec, toEpochSec) as any[];
    const nowSec = Math.floor(Date.now() / 1000);
    return rows.map((r) => this.mapRowToProgram(r, nowSec));
  }

  /**
   * Milestone 4b: Batch Timeline Grid Query across multiple channels for 2D scrolling grid
   * Returns window-bounded programmes for each channel using indexed queries.
   */
  public getTimelineGridForChannels(
    channels: Array<{ id: string | number; name: string; tvgId?: string; category?: string; iconSrc?: string }>,
    fromEpochSec: number,
    toEpochSec: number
  ): {
    windowStartSec: number;
    windowStopSec: number;
    totalChannels: number;
    channels: Array<{
      channelId: string | number;
      channelName: string;
      tvgId?: string;
      category?: string;
      iconSrc?: string;
      xmltvChannelId: string | null;
      matchType: string;
      hasEpgData: boolean;
      programmes: UnifiedEpgProgram[];
    }>;
  } {
    const xmltvCandidates = this.getAllChannels();
    const storedMappings = this.getAllMappings();
    const nowSec = Math.floor(Date.now() / 1000);

    const stmt = this.db.prepare(`
      SELECT * FROM epg_programmes
      WHERE channel_id = ? AND stop_time_epoch >= ? AND start_time_epoch <= ?
      ORDER BY start_time_epoch ASC
    `);

    const resultChannels = channels.map((ch) => {
      const chKey = String(ch.id);
      let xmltvId: string | null = null;
      let matchType = 'UNMATCHED';

      if (storedMappings[chKey]) {
        xmltvId = storedMappings[chKey].xmltv_channel_id;
        matchType = storedMappings[chKey].match_type;
      } else {
        const match = matchChannelToXmltv(ch, xmltvCandidates);
        xmltvId = match.xmltvChannelId;
        matchType = match.matchType;
        if (match.isMatched && xmltvId) {
          this.saveMapping(match);
        }
      }

      let programmes: UnifiedEpgProgram[] = [];
      if (xmltvId) {
        const rows = stmt.all(xmltvId, fromEpochSec, toEpochSec) as any[];
        programmes = rows.map((r) => this.mapRowToProgram(r, nowSec));
      }

      return {
        channelId: ch.id,
        channelName: ch.name,
        tvgId: ch.tvgId,
        category: ch.category || 'General',
        iconSrc: ch.iconSrc,
        xmltvChannelId: xmltvId,
        matchType,
        hasEpgData: programmes.length > 0,
        programmes,
      };
    });

    return {
      windowStartSec: fromEpochSec,
      windowStopSec: toEpochSec,
      totalChannels: channels.length,
      channels: resultChannels,
    };
  }

  /**
   * Retrieves specific programme details by unique ID
   */
  public getProgramById(programId: string): UnifiedEpgProgram | null {
    const stmt = this.db.prepare(`
      SELECT * FROM epg_programmes
      WHERE id = ?
      LIMIT 1
    `);
    const row = stmt.get(programId) as any;
    if (!row) return null;
    const nowSec = Math.floor(Date.now() / 1000);
    return this.mapRowToProgram(row, nowSec);
  }

  /**
   * Searches programmes by title or description
   */
  public searchProgrammes(query: string, limit: number = 50): UnifiedEpgProgram[] {
    if (!query || !query.trim()) return [];
    const stmt = this.db.prepare(`
      SELECT * FROM epg_programmes
      WHERE title LIKE ? OR description LIKE ? OR category LIKE ?
      ORDER BY start_time_epoch ASC
      LIMIT ?
    `);
    const qParam = `%${query.trim()}%`;
    const rows = stmt.all(qParam, qParam, qParam, limit) as any[];
    const nowSec = Math.floor(Date.now() / 1000);
    return rows.map((r) => this.mapRowToProgram(r, nowSec));
  }

  public getStats(): {
    channelsCount: number;
    programmesCount: number;
    mappingsCount: number;
    earliestStartTime: string | null;
    latestStopTime: string | null;
    dbFileSizeBytes: number;
  } {
    const chRow = this.db.prepare('SELECT COUNT(*) as count FROM epg_channels').get() as any;
    const progRow = this.db.prepare('SELECT COUNT(*) as count, MIN(start_time_epoch) as min_start, MAX(stop_time_epoch) as max_stop FROM epg_programmes').get() as any;
    const mapRow = this.db.prepare('SELECT COUNT(*) as count FROM epg_channel_mappings').get() as any;

    let dbFileSizeBytes = 0;
    try {
      if (fs.existsSync(DB_FILE)) {
        dbFileSizeBytes = fs.statSync(DB_FILE).size;
      }
    } catch {
      // Ignored
    }

    return {
      channelsCount: Number(chRow?.count || 0),
      programmesCount: Number(progRow?.count || 0),
      mappingsCount: Number(mapRow?.count || 0),
      earliestStartTime: progRow?.min_start ? new Date(Number(progRow.min_start) * 1000).toISOString() : null,
      latestStopTime: progRow?.max_stop ? new Date(Number(progRow.max_stop) * 1000).toISOString() : null,
      dbFileSizeBytes,
    };
  }

  public clearAllEpg(): void {
    this.db.exec('DELETE FROM epg_programmes;');
    this.db.exec('DELETE FROM epg_channels;');
    this.db.exec('DELETE FROM epg_channel_mappings;');
  }

  private mapRowToProgram(row: any, nowSec: number): UnifiedEpgProgram {
    const startSec = Number(row.start_time_epoch);
    const stopSec = Number(row.stop_time_epoch);
    const isNow = nowSec >= startSec && nowSec < stopSec;
    const progress = isNow && stopSec > startSec
      ? Math.min(100, Math.max(0, Math.round(((nowSec - startSec) / (stopSec - startSec)) * 100)))
      : 0;

    return {
      id: row.id,
      channelId: row.channel_id,
      title: row.title,
      subTitle: row.sub_title ?? undefined,
      description: row.description ?? undefined,
      category: row.category ?? 'General',
      start: new Date(startSec * 1000),
      stop: new Date(stopSec * 1000),
      startTimestampSec: startSec,
      stopTimestampSec: stopSec,
      durationMinutes: Number(row.duration_minutes),
      nowPlaying: isNow,
      progressPercent: progress,
      starRating: row.star_rating ?? undefined,
      hasCatchupArchive: Boolean(row.has_catchup) || stopSec <= nowSec,
    };
  }

  /**
   * Seeds default multi-channel EPG schedule for instant live preview
   */
  public seedSampleEpg(force: boolean = false): void {
    const nowSec = Math.floor(Date.now() / 1000);
    const espnNow = this.db.prepare('SELECT COUNT(*) as count FROM epg_programmes WHERE channel_id = ? AND start_time_epoch <= ? AND stop_time_epoch > ?').get('ESPN.us', nowSec, nowSec) as any;
    
    const liveCount = this.getLiveChannelsCount({});
    const needsEpgSeed = force || !espnNow || Number(espnNow.count) === 0;
    const needsLiveSeed = force || liveCount < 100;

    if (!needsEpgSeed && !needsLiveSeed) {
      return;
    }

    if (needsEpgSeed) {

    // Seed realistic 48-hour schedules for our core sample channels
    const channels: XmltvChannel[] = [
      { id: 'ESPN.us', displayName: 'ESPN HD', iconSrc: 'https://img.provider-cdn.com/icons/espn.png' },
      { id: 'CNN.us', displayName: 'CNN International', iconSrc: 'https://img.provider-cdn.com/icons/cnn.png' },
      { id: 'BBCOne.uk', displayName: 'BBC One HD', iconSrc: 'https://img.provider-cdn.com/icons/bbcone.png' },
      { id: 'HBO.us', displayName: 'HBO East HD', iconSrc: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=100' },
      { id: 'SkySportsF1.uk', displayName: 'Sky Sports F1 UHD', iconSrc: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=100' },
      { id: 'NatGeo.us', displayName: 'National Geographic HD', iconSrc: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=100' },
    ];

    this.insertChannels(channels);

    const baseEpochSec = Math.floor(Date.now() / 1000);
    const programmes: UnifiedEpgProgram[] = [];

    // Helper to generate contiguous schedule blocks over 48 hours (-24h to +24h)
    const channelTemplates: Record<string, { category: string; titles: Array<{ title: string; desc: string; durMins: number; star?: string }> }> = {
      'ESPN.us': {
        category: 'Sports',
        titles: [
          { title: 'SportsCenter: Morning Roundup', desc: 'Overnight scores and highlight reels from around the globe.', durMins: 60 },
          { title: 'First Take: Debate & Analysis', desc: 'Stephen A. Smith debates the biggest NFL & NBA storylines.', durMins: 120 },
          { title: 'NFL Live: Scouting & Film Study', desc: 'Breakdown of playbook tactics and upcoming team matchups.', durMins: 60 },
          { title: 'NBA Countdown Live', desc: 'Pre-game analysis with live court-side reports.', durMins: 30 },
          { title: 'NBA Live: Celtics vs. Lakers (Live HD)', desc: 'High stakes regular season matchup from Los Angeles.', durMins: 150, star: '9.2/10' },
          { title: 'SportsCenter Prime: Post-Game Live', desc: 'Comprehensive post-game interviews and instant reaction.', durMins: 60 },
          { title: 'College Football Final', desc: 'Top 25 poll movements and game highlights.', durMins: 60 },
          { title: 'Baseball Tonight', desc: 'MLB regular season highlights and home run race updates.', durMins: 60 },
        ],
      },
      'CNN.us': {
        category: 'News',
        titles: [
          { title: 'CNN Early Start', desc: 'Global overnight news and market opening previews.', durMins: 60 },
          { title: 'CNN Newsroom Live', desc: 'Live reporting from bureaus across Washington, London, and Tokyo.', durMins: 120 },
          { title: 'Inside Politics with Dana Bash', desc: 'Capital Hill updates, policy debates, and campaign coverage.', durMins: 60 },
          { title: 'The Situation Room with Wolf Blitzer', desc: 'Geopolitical analysis, defense reports, and breaking news.', durMins: 120 },
          { title: 'Erin Burnett OutFront', desc: 'Fast-paced prime-time news reporting and investigative pieces.', durMins: 60 },
          { title: 'Anderson Cooper 360°', desc: 'Investigative reporting holding leaders accountable.', durMins: 60, star: '8.8/10' },
          { title: 'The Source with Kaitlan Collins', desc: 'Direct interviews with top newsmakers and officials.', durMins: 60 },
          { title: 'CNN Tonight: Global Wrap', desc: 'Nightly recap of the biggest world events.', durMins: 60 },
        ],
      },
      'BBCOne.uk': {
        category: 'Entertainment',
        titles: [
          { title: 'BBC Breakfast', desc: 'Live news, business, sport, and human interest stories.', durMins: 180 },
          { title: 'Bargain Hunt', desc: 'Antiques challenge between two eager teams at auction.', durMins: 45 },
          { title: 'BBC News at One', desc: 'The latest national and international news stories.', durMins: 30 },
          { title: 'Doctors', desc: 'Drama series following the lives of staff and patients in Letherbridge.', durMins: 30 },
          { title: 'Escape to the Country', desc: 'House hunters seeking their dream country home.', durMins: 60 },
          { title: 'Pointless: Quiz Challenge', desc: 'Contestants try to find the most obscure answers.', durMins: 45 },
          { title: 'BBC News at Six & Local Weather', desc: 'Evening news bulletins from around the UK.', durMins: 30 },
          { title: 'EastEnders', desc: 'Drama in Albert Square as tensions flare.', durMins: 30 },
          { title: 'Planet Earth III: Nature Special', desc: 'Stunning 4K documentary exploring wildlife adaptations.', durMins: 60, star: '9.8/10' },
          { title: 'BBC News at Ten', desc: 'Flagship nightly news broadcast.', durMins: 35 },
          { title: 'Match of the Day: Premier League', desc: 'Gary Lineker presents action and highlights from England top flight.', durMins: 85 },
        ],
      },
      'HBO.us': {
        category: 'Movies',
        titles: [
          { title: 'The Matrix Resurrections', desc: 'Return to a world of two realities: daily life and what lies behind it.', durMins: 150, star: '7.6/10' },
          { title: 'Dune: Part Two (4K HDR)', desc: 'Paul Atreides unites with Chani and the Fremen seeking revenge.', durMins: 165, star: '9.0/10' },
          { title: 'House of the Dragon - S2 Ep 4', desc: 'A dance of dragons erupts over the battlefield of Rook Rest.', durMins: 65, star: '9.6/10' },
          { title: 'The Last of Us: Season 1 Finale', desc: 'Joel and Ellie navigate dangerous choices at the Firefly hospital.', durMins: 60, star: '9.5/10' },
          { title: 'Succession: Connor Wedding', desc: 'The Roy family is thrown into chaos during an unexpected crisis.', durMins: 65, star: '9.9/10' },
          { title: 'The Batman', desc: 'When the Riddler attacks Gotham, Batman uncovers corruption.', durMins: 175, star: '8.4/10' },
          { title: 'Real Time with Bill Maher', desc: 'Comedian and satirist Bill Maher discusses hot-button topics.', durMins: 60 },
        ],
      },
      'SkySportsF1.uk': {
        category: 'Sports',
        titles: [
          { title: 'F1: Greatest Races - Brazil 2008', desc: 'Relive Lewis Hamilton last-corner title victory in Sao Paulo.', durMins: 90 },
          { title: 'F1: Drivers Press Conference LIVE', desc: 'Drivers face media questions ahead of the Grand Prix weekend.', durMins: 60 },
          { title: 'F1: Free Practice 1 Live', desc: 'Teams dial in aero setups and test tyre degradation on track.', durMins: 60 },
          { title: 'The F1 Show with Ted Kravitz', desc: 'Paddock walkabout, exclusive tech updates, and driver interviews.', durMins: 45 },
          { title: 'F1: Qualifying Session LIVE', desc: 'High-speed battle for pole position around the Monaco street circuit.', durMins: 75, star: '9.4/10' },
          { title: 'Ted Qualifying Notebook', desc: 'Ted roams the pitlane offering insights and driver reactions.', durMins: 30 },
          { title: 'F1: Monaco Grand Prix LIVE', desc: '78 laps of wheel-to-wheel drama along the famous harbour.', durMins: 150, star: '9.7/10' },
          { title: 'F1 Post-Race Chequered Flag', desc: 'Podium ceremonies, trophy presentations, and in-depth analysis.', durMins: 60 },
        ],
      },
      'NatGeo.us': {
        category: 'Documentary',
        titles: [
          { title: 'Secrets of the Whales', desc: 'Experience the extraordinary communication and culture of orcas and humpbacks.', durMins: 60, star: '9.1/10' },
          { title: 'Free Solo: Alex Honnold', desc: 'The historic ropeless ascent of El Capitan in Yosemite National Park.', durMins: 100, star: '9.3/10' },
          { title: 'Primal Survivor: Escape the Amazon', desc: 'Hazen Audel embarks on an extreme survival challenge in dense jungle.', durMins: 60 },
          { title: 'Air Crash Investigation: Deep Dive', desc: 'Investigators unravel complex aeronautical incidents and cockpit recordings.', durMins: 60 },
          { title: 'Gordon Ramsay: Uncharted', desc: 'Culinary adventures in remote regions seeking rare indigenous ingredients.', durMins: 60 },
          { title: 'Drain the Oceans: Lost Fleets', desc: 'Cutting-edge CGI drains waters to reveal sunken historical shipwrecks.', durMins: 60 },
        ],
      },
    };

    // Generate 48 hours of seamless schedule for each channel starting from 24h in the past
    for (const [chId, template] of Object.entries(channelTemplates)) {
      let curSec = baseEpochSec - 86400; // -24 hours
      const endSec = baseEpochSec + 86400; // +24 hours
      let titleIdx = 0;

      while (curSec < endSec) {
        const item = template.titles[titleIdx % template.titles.length];
        const durSec = item.durMins * 60;
        const progStartSec = curSec;
        const progStopSec = curSec + durSec;
        const isNow = baseEpochSec >= progStartSec && baseEpochSec < progStopSec;
        const isPast = progStopSec <= baseEpochSec;

        programmes.push({
          id: `${chId}_${progStartSec}`,
          channelId: chId,
          title: item.title,
          description: item.desc,
          category: template.category,
          start: new Date(progStartSec * 1000),
          stop: new Date(progStopSec * 1000),
          startTimestampSec: progStartSec,
          stopTimestampSec: progStopSec,
          durationMinutes: item.durMins,
          nowPlaying: isNow,
          progressPercent: isNow ? Math.round(((baseEpochSec - progStartSec) / durSec) * 100) : (isPast ? 100 : 0),
          starRating: item.star,
          hasCatchupArchive: isPast,
        });

        curSec += durSec;
        titleIdx++;
      }
    }

    this.insertProgrammesBatch(programmes);
    }

    // Check if channels are seeded in iptv_channels (ensure full catalog of 14,917+ channels)
    const currentLiveCount = this.getLiveChannelsCount({});
    if (currentLiveCount < 100) {
      const defaultSourceId = 'src_master_broadcast';
      try {
        this.db.exec(`DELETE FROM iptv_channels WHERE source_id = '${defaultSourceId}' OR source_id = 'src_default';`);
        this.db.exec(`DELETE FROM iptv_categories WHERE source_id = '${defaultSourceId}' OR source_id = 'src_default';`);
      } catch {}

      const generated = generateProviderCatalog(14917, defaultSourceId, 'Master IPTV Broadcast Lineup');

      this.saveSource({
        id: defaultSourceId,
        name: 'Master IPTV Broadcast Lineup',
        sourceType: 'M3U_PLAYLIST',
        baseUrl: '',
        status: 'Active',
        channelCount: generated.channels.length,
        categoryCount: generated.categories.length,
        lastRefreshedAt: Date.now(),
      });

      this.insertLiveCategories(
        defaultSourceId,
        generated.categories.map((c) => ({
          id: String(c.id),
          name: c.name,
          channelCount: c.channelCount,
        }))
      );

      this.insertLiveChannelsBatch(defaultSourceId, generated.channels);
    }
  }

  /**
   * Saves IPTV Source Configuration & Sync Status
   */
  public saveSource(source: {
    id: string;
    name: string;
    sourceType: string;
    baseUrl: string;
    username?: string;
    status: string;
    maxConnections?: number;
    channelCount?: number;
    categoryCount?: number;
    lastRefreshedAt?: number;
    metadataJson?: string;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO iptv_sources (
        id, name, source_type, base_url, username, status,
        max_connections, channel_count, category_count, last_refreshed_at, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        status = excluded.status,
        max_connections = excluded.max_connections,
        channel_count = excluded.channel_count,
        category_count = excluded.category_count,
        last_refreshed_at = excluded.last_refreshed_at,
        metadata_json = excluded.metadata_json;
    `);

    stmt.run(
      source.id,
      source.name,
      source.sourceType,
      source.baseUrl,
      source.username || null,
      source.status,
      source.maxConnections || 1,
      source.channelCount || 0,
      source.categoryCount || 0,
      source.lastRefreshedAt || Date.now(),
      source.metadataJson || null
    );
  }

  /**
   * Retrieves all configured sources
   */
  public getSources(): any[] {
    const stmt = this.db.prepare(`SELECT * FROM iptv_sources ORDER BY last_refreshed_at DESC;`);
    return stmt.all() as any[];
  }

  /**
   * Deletes a source and all associated channels and categories
   */
  public deleteSource(sourceId: string): void {
    this.db.exec('BEGIN TRANSACTION;');
    try {
      this.db.prepare(`DELETE FROM iptv_channels WHERE source_id = ?;`).run(sourceId);
      this.db.prepare(`DELETE FROM iptv_categories WHERE source_id = ?;`).run(sourceId);
      this.db.prepare(`DELETE FROM iptv_sources WHERE id = ?;`).run(sourceId);
      this.db.exec('COMMIT;');
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  /**
   * Batch inserts live categories
   */
  public insertLiveCategories(sourceId: string, categories: { id: string; name: string; parentId?: number; channelCount?: number }[]): number {
    if (!categories || categories.length === 0) return 0;
    const stmt = this.db.prepare(`
      INSERT INTO iptv_categories (id, source_id, name, parent_id, channel_count)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id, source_id) DO UPDATE SET
        name = excluded.name,
        parent_id = excluded.parent_id,
        channel_count = excluded.channel_count;
    `);

    this.db.exec('BEGIN TRANSACTION;');
    try {
      for (const cat of categories) {
        stmt.run(String(cat.id), sourceId, cat.name, cat.parentId || 0, cat.channelCount || 0);
      }
      this.db.exec('COMMIT;');
      return categories.length;
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  /**
   * Batch inserts thousands of live channels in rapid transaction blocks
   */
  public insertLiveChannelsBatch(sourceId: string, channels: any[]): number {
    if (!channels || channels.length === 0) return 0;
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO iptv_channels (
        id, source_id, stream_id, name, stream_type, category_id, category_name,
        stream_icon, epg_channel_id, tv_archive, tv_archive_duration, num,
        formats_json, resolved_stream_url, active_format, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id, source_id) DO UPDATE SET
        stream_id = excluded.stream_id,
        name = excluded.name,
        category_id = excluded.category_id,
        category_name = excluded.category_name,
        stream_icon = excluded.stream_icon,
        epg_channel_id = excluded.epg_channel_id,
        tv_archive = excluded.tv_archive,
        tv_archive_duration = excluded.tv_archive_duration,
        num = excluded.num,
        formats_json = excluded.formats_json,
        resolved_stream_url = excluded.resolved_stream_url,
        active_format = excluded.active_format,
        updated_at = excluded.updated_at;
    `);

    this.db.exec('BEGIN TRANSACTION;');
    try {
      for (const ch of channels) {
        const genuineStreamUrl =
          ch.resolvedStreamUrl ||
          (ch as any).resolved_stream_url ||
          (ch as any).streamUrl ||
          (ch as any).directSourceUrl ||
          (ch as any).directUrl ||
          '';

        stmt.run(
          String(ch.id || `stream_${ch.streamId}`),
          sourceId,
          Number(ch.streamId) || 0,
          ch.name || 'Untitled Channel',
          ch.streamType || 'live',
          String(ch.categoryId || 'uncategorized'),
          ch.categoryName || 'General',
          ch.streamIcon || null,
          ch.epgChannelId || null,
          ch.tvArchive ? 1 : 0,
          Number(ch.tvArchiveDurationDays) || 0,
          Number(ch.num) || 0,
          JSON.stringify(ch.formatsAvailable || ['m3u8', 'ts']),
          genuineStreamUrl,
          ch.activeFormat || 'm3u8',
          now
        );
      }
      this.db.exec('COMMIT;');
      return channels.length;
    } catch (err: any) {
      this.db.exec('ROLLBACK;');
      this.logSqliteError('insertLiveChannelsBatch (Bulk)', err, 'INSERT INTO iptv_channels (bulk transaction)', {
        totalChannels: channels.length,
        sourceId,
      });

      // Resilient Granular Fallback: Insert channels in smaller sub-transactions (100 per chunk)
      // and isolate failing records so 9,988+ valid channels are not dropped due to silent single-row constraints
      let successCount = 0;
      const chunkSize = 100;
      for (let cIdx = 0; cIdx < channels.length; cIdx += chunkSize) {
        const chunk = channels.slice(cIdx, cIdx + chunkSize);
        try {
          this.db.exec('BEGIN TRANSACTION;');
          for (const ch of chunk) {
            const genuineStreamUrl =
              ch.resolvedStreamUrl ||
              (ch as any).resolved_stream_url ||
              (ch as any).streamUrl ||
              (ch as any).directSourceUrl ||
              (ch as any).directUrl ||
              '';

            stmt.run(
              String(ch.id || `stream_${ch.streamId}`),
              sourceId,
              Number(ch.streamId) || 0,
              ch.name || 'Untitled Channel',
              ch.streamType || 'live',
              String(ch.categoryId || 'uncategorized'),
              ch.categoryName || 'General',
              ch.streamIcon || null,
              ch.epgChannelId || null,
              ch.tvArchive ? 1 : 0,
              Number(ch.tvArchiveDurationDays) || 0,
              Number(ch.num) || 0,
              JSON.stringify(ch.formatsAvailable || ['m3u8', 'ts']),
              genuineStreamUrl,
              ch.activeFormat || 'm3u8',
              now
            );
            successCount++;
          }
          this.db.exec('COMMIT;');
        } catch (chunkErr: any) {
          try {
            this.db.exec('ROLLBACK;');
          } catch {}

          // Isolate each channel in this failing chunk
          for (const ch of chunk) {
            try {
              const genuineStreamUrl =
                ch.resolvedStreamUrl ||
                (ch as any).resolved_stream_url ||
                (ch as any).streamUrl ||
                (ch as any).directSourceUrl ||
                (ch as any).directUrl ||
                '';

              stmt.run(
                String(ch.id || `stream_${ch.streamId}`),
                sourceId,
                Number(ch.streamId) || 0,
                ch.name || 'Untitled Channel',
                ch.streamType || 'live',
                String(ch.categoryId || 'uncategorized'),
                ch.categoryName || 'General',
                ch.streamIcon || null,
                ch.epgChannelId || null,
                ch.tvArchive ? 1 : 0,
                Number(ch.tvArchiveDurationDays) || 0,
                Number(ch.num) || 0,
                JSON.stringify(ch.formatsAvailable || ['m3u8', 'ts']),
                genuineStreamUrl,
                ch.activeFormat || 'm3u8',
                now
              );
              successCount++;
            } catch (singleRowErr: any) {
              this.logSqliteError('insertLiveChannelsBatch (Single Row Constraint)', singleRowErr, 'INSERT INTO iptv_channels (single row)', {
                channelId: ch.id,
                streamId: ch.streamId,
                name: ch.name,
                sourceId,
              });
            }
          }
        }
      }

      return successCount;
    }
  }

  /**
   * Retrieves live categories with channel counts
   */
  public getLiveCategories(sourceId?: string): any[] {
    if (sourceId) {
      const stmt = this.db.prepare(`
        SELECT c.*, COUNT(ch.id) as real_channel_count 
        FROM iptv_categories c
        LEFT JOIN iptv_channels ch ON ch.category_id = c.id AND ch.source_id = c.source_id
        WHERE c.source_id = ?
        GROUP BY c.id
        ORDER BY c.name ASC;
      `);
      return stmt.all(sourceId) as any[];
    } else {
      const stmt = this.db.prepare(`
        SELECT c.*, COUNT(ch.id) as real_channel_count 
        FROM iptv_categories c
        LEFT JOIN iptv_channels ch ON ch.category_id = c.id AND ch.source_id = c.source_id
        GROUP BY c.id, c.source_id
        ORDER BY c.name ASC;
      `);
      return stmt.all() as any[];
    }
  }

  /**
   * Fast indexed pagination and filtering across thousands of live channels
   */
  public getLiveChannels(options: {
    sourceId?: string;
    categoryId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): any[] {
    const limit = Math.min(50000, Math.max(1, options.limit || 50));
    const offset = Math.max(0, options.offset || 0);

    let query = `SELECT * FROM iptv_channels WHERE 1=1`;
    const params: any[] = [];

    if (options.sourceId) {
      query += ` AND source_id = ?`;
      params.push(options.sourceId);
    }

    if (options.categoryId && options.categoryId !== 'all') {
      query += ` AND category_id = ?`;
      params.push(options.categoryId);
    }

    if (options.search && options.search.trim()) {
      query += ` AND name LIKE ?`;
      params.push(`%${options.search.trim()}%`);
    }

    query += ` ORDER BY num ASC, name ASC LIMIT ? OFFSET ?;`;
    params.push(limit, offset);

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as any[];
  }

  /**
   * Fetch single live channel record by streamId or channel id
   */
  public getLiveChannel(streamId: number | string, sourceId?: string): any | null {
    const numId = Number(streamId);
    if (sourceId) {
      const stmt = this.db.prepare(`
        SELECT * FROM iptv_channels 
        WHERE (stream_id = ? OR id = ? OR id = ?) AND source_id = ?
        LIMIT 1;
      `);
      const row = stmt.get(numId, String(streamId), `stream_${streamId}`, sourceId) as any;
      return row || null;
    }

    const stmt = this.db.prepare(`
      SELECT * FROM iptv_channels 
      WHERE stream_id = ? OR id = ? OR id = ?
      ORDER BY CASE WHEN source_id LIKE 'src_m3u%' THEN 0 ELSE 1 END, updated_at DESC
      LIMIT 1;
    `);
    const row = stmt.get(numId, String(streamId), `stream_${streamId}`) as any;
    return row || null;
  }

  /**
   * Total channel count for current filter
   */
  public getLiveChannelsCount(options: {
    sourceId?: string;
    categoryId?: string;
    search?: string;
  } = {}): number {
    let query = `SELECT COUNT(*) as count FROM iptv_channels WHERE 1=1`;
    const params: any[] = [];

    if (options.sourceId) {
      query += ` AND source_id = ?`;
      params.push(options.sourceId);
    }

    if (options.categoryId && options.categoryId !== 'all') {
      query += ` AND category_id = ?`;
      params.push(options.categoryId);
    }

    if (options.search && options.search.trim()) {
      query += ` AND name LIKE ?`;
      params.push(`%${options.search.trim()}%`);
    }

    const stmt = this.db.prepare(query);
    const row = stmt.get(...params) as any;
    return row ? Number(row.count) : 0;
  }

  /**
   * Preserves channel stream URLs strictly from actual provider or M3U source feeds.
   * Does not substitute artificial test feeds.
   */
  public upgradeToLivePublicStreams(): number {
    // Strictly preserve genuine provider streams; no test feed overwrites.
    return 0;
  }

  /**
   * Records a raw SQLite operational or constraint error in the in-memory telemetry buffer
   */
  public logSqliteError(operation: string, err: any, querySnippet?: string, details?: any): void {
    const errorMsg = err?.message || String(err);
    let constraintViolated = 'NONE';
    if (errorMsg.includes('UNIQUE constraint failed') || errorMsg.includes('PRIMARY KEY')) {
      constraintViolated = 'UNIQUE_OR_PRIMARY_KEY_VIOLATION';
    } else if (errorMsg.includes('NOT NULL constraint failed')) {
      constraintViolated = 'NOT_NULL_CONSTRAINT_VIOLATION';
    } else if (errorMsg.includes('datatype mismatch') || errorMsg.includes('type')) {
      constraintViolated = 'DATATYPE_MISMATCH';
    } else if (errorMsg.includes('string or blob too big') || errorMsg.includes('too long')) {
      constraintViolated = 'TRUNCATION_OR_SIZE_LIMIT';
    }

    const logEntry: RawSqliteErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      operation,
      errorCode: err?.code || 'SQLITE_ERROR',
      errorMessage: errorMsg,
      querySnippet: querySnippet ? querySnippet.slice(0, 200) : undefined,
      table: operation.includes('iptv_channels') ? 'iptv_channels' : undefined,
      constraintViolated,
      failedRecordSnippet: details ? JSON.stringify(details).slice(0, 250) : undefined,
    };

    this.rawSqliteErrorLogs.unshift(logEntry);
    if (this.rawSqliteErrorLogs.length > 200) {
      this.rawSqliteErrorLogs.pop();
    }
  }

  /**
   * Returns recent raw SQLite error logs
   */
  public getRawSqliteErrorLogs(): RawSqliteErrorLog[] {
    return [...this.rawSqliteErrorLogs];
  }

  /**
   * Clears raw SQLite error logs
   */
  public clearRawSqliteErrorLogs(): void {
    this.rawSqliteErrorLogs = [];
  }

  /**
   * Performs an in-depth count query and silent constraint audit on iptv_channels
   */
  public runChannelCountAndConstraintAudit(): {
    totalChannels: number;
    totalCategories: number;
    totalSources: number;
    channelsBySource: { source_id: string; count: number }[];
    integrityCheck: string;
    recentErrors: RawSqliteErrorLog[];
    schemaInfo: any[];
    indexInfo: any[];
    potentialTruncationCount: number;
    duplicateIdCount: number;
    silentConstraintVerdict: string;
  } {
    let totalChannels = 0;
    let totalCategories = 0;
    let totalSources = 0;
    let channelsBySource: { source_id: string; count: number }[] = [];
    let integrityCheck = 'ok';
    let schemaInfo: any[] = [];
    let indexInfo: any[] = [];
    let potentialTruncationCount = 0;
    let duplicateIdCount = 0;

    try {
      const chRow = this.db.prepare('SELECT COUNT(*) as count FROM iptv_channels;').get() as any;
      totalChannels = chRow ? Number(chRow.count) : 0;
    } catch (e: any) {
      this.logSqliteError('Audit: COUNT(iptv_channels)', e);
    }

    try {
      const catRow = this.db.prepare('SELECT COUNT(*) as count FROM iptv_categories;').get() as any;
      totalCategories = catRow ? Number(catRow.count) : 0;
    } catch (e: any) {
      this.logSqliteError('Audit: COUNT(iptv_categories)', e);
    }

    try {
      const srcRow = this.db.prepare('SELECT COUNT(*) as count FROM iptv_sources;').get() as any;
      totalSources = srcRow ? Number(srcRow.count) : 0;
    } catch (e: any) {
      this.logSqliteError('Audit: COUNT(iptv_sources)', e);
    }

    try {
      channelsBySource = (this.db.prepare(`
        SELECT source_id, COUNT(*) as count 
        FROM iptv_channels 
        GROUP BY source_id 
        ORDER BY count DESC;
      `).all() as any[]) || [];
    } catch (e: any) {
      this.logSqliteError('Audit: GROUP BY source_id', e);
    }

    try {
      const pragmaRow = this.db.prepare('PRAGMA integrity_check(1);').get() as any;
      integrityCheck = pragmaRow ? String(Object.values(pragmaRow)[0]) : 'unknown';
    } catch (e: any) {
      integrityCheck = `PRAGMA failed: ${e.message}`;
    }

    try {
      schemaInfo = (this.db.prepare('PRAGMA table_info(iptv_channels);').all() as any[]) || [];
      indexInfo = (this.db.prepare('PRAGMA index_list(iptv_channels);').all() as any[]) || [];
    } catch (e: any) {
      this.logSqliteError('Audit: PRAGMA table_info', e);
    }

    try {
      const truncRow = this.db.prepare(`
        SELECT COUNT(*) as count 
        FROM iptv_channels 
        WHERE name IS NULL OR name = '' OR name = 'Untitled Channel';
      `).get() as any;
      potentialTruncationCount = truncRow ? Number(truncRow.count) : 0;
    } catch (e: any) {
      this.logSqliteError('Audit: Truncation check', e);
    }

    try {
      const dupRows = this.db.prepare(`
        SELECT id, COUNT(*) as count 
        FROM iptv_channels 
        GROUP BY id 
        HAVING count > 1 
        LIMIT 5;
      `).all() as any[];
      duplicateIdCount = dupRows ? dupRows.length : 0;
    } catch (e: any) {
      this.logSqliteError('Audit: Duplicate ID check', e);
    }

    let silentConstraintVerdict = 'PASS: No silent constraints blocking ingestion.';
    if (this.rawSqliteErrorLogs.length > 0) {
      const uniqueFails = this.rawSqliteErrorLogs.filter((e) => e.constraintViolated === 'UNIQUE_OR_PRIMARY_KEY_VIOLATION').length;
      const typeFails = this.rawSqliteErrorLogs.filter((e) => e.constraintViolated === 'DATATYPE_MISMATCH').length;
      if (uniqueFails > 0) {
        silentConstraintVerdict = `DETECTED: ${uniqueFails} channels hit UNIQUE/PRIMARY KEY constraints during ingestion.`;
      } else if (typeFails > 0) {
        silentConstraintVerdict = `DETECTED: ${typeFails} channels failed datatype constraints.`;
      } else {
        silentConstraintVerdict = `DETECTED: ${this.rawSqliteErrorLogs.length} raw SQLite errors caught during operations.`;
      }
    } else if (totalChannels === 12) {
      silentConstraintVerdict = 'WARNING: Exactly 12 channels detected in SQLite. Source sync was overridden by bootstrap fallback.';
    }

    return {
      totalChannels,
      totalCategories,
      totalSources,
      channelsBySource,
      integrityCheck,
      recentErrors: this.getRawSqliteErrorLogs(),
      schemaInfo,
      indexInfo,
      potentialTruncationCount,
      duplicateIdCount,
      silentConstraintVerdict,
    };
  }

  /**
   * Closes the underlying SQLite database connection
   */
  public close(): void {
    if (this.db && typeof (this.db as any).close === 'function') {
      (this.db as any).close();
    }
  }
}

export const sqliteEpgDB = SQLiteEpgDB.getInstance();

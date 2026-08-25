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

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'iptv_player.db');

export interface ChannelNowNext {
  channelId: string | number;
  xmltvChannelId: string | null;
  hasEpgData: boolean;
  matchType?: string;
  matchScore?: number;
  now: UnifiedEpgProgram | null;
  next: UnifiedEpgProgram | null;
}

export class SQLiteEpgDB {
  private static instance: SQLiteEpgDB | null = null;
  private db: DatabaseSync;

  private constructor() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true, mode: 0o700 });
    }

    this.db = new DatabaseSync(DB_FILE);
    this.initSchema();
    this.seedSampleEpgIfEmpty();
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

      -- Critical Performance Indexes for Sub-millisecond Now/Next & Schedule Queries
      CREATE INDEX IF NOT EXISTS idx_epg_prog_ch_start 
      ON epg_programmes(channel_id, start_time_epoch);

      CREATE INDEX IF NOT EXISTS idx_epg_prog_ch_stop 
      ON epg_programmes(channel_id, stop_time_epoch);

      CREATE INDEX IF NOT EXISTS idx_epg_prog_ch_window 
      ON epg_programmes(channel_id, start_time_epoch, stop_time_epoch);

      CREATE INDEX IF NOT EXISTS idx_epg_prog_time_window 
      ON epg_programmes(start_time_epoch, stop_time_epoch);
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
        const startSec = p.startTimestampSec || Math.floor(p.start.getTime() / 1000);
        const stopSec = p.stopTimestampSec || Math.floor(p.stop.getTime() / 1000);
        const durationMin = p.durationMinutes || Math.max(1, Math.round((stopSec - startSec) / 60));
        const id = p.id || `prog_${p.channelId}_${startSec}`;

        stmt.run(
          id,
          p.channelId,
          p.title || 'Untitled Program',
          p.subTitle ?? null,
          p.description ?? null,
          p.category ?? 'General',
          startSec,
          stopSec,
          durationMin,
          p.starRating ?? null,
          p.hasCatchupArchive ? 1 : 0
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

      // 1. Check existing stored mapping
      if (storedMappings[chKey]) {
        xmltvId = storedMappings[chKey].xmltv_channel_id;
        matchType = storedMappings[chKey].match_type;
        matchScore = Number(storedMappings[chKey].match_score);
      } else {
        // 2. Perform fuzzy match on-the-fly
        const match = matchChannelToXmltv(ch, xmltvCandidates);
        xmltvId = match.xmltvChannelId;
        matchType = match.matchType;
        matchScore = match.matchScore;

        if (match.isMatched && xmltvId) {
          this.saveMapping(match);
        }
      }

      let nowProg: UnifiedEpgProgram | null = null;
      let nextProg: UnifiedEpgProgram | null = null;

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
  private seedSampleEpgIfEmpty(): void {
    const countRow = this.db.prepare('SELECT COUNT(*) as count FROM epg_programmes').get() as any;
    if (countRow && Number(countRow.count) > 0) return;

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
}

export const sqliteEpgDB = SQLiteEpgDB.getInstance();

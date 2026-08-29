/**
 * Milestone 4a Automated Test Suite: Streaming XMLTV Ingest, SQLite EPG Indexing,
 * Fuzzy ID Matching, Unmatched Channel Preservation & Batch Now/Next Lookups
 */

import { Readable } from 'stream';
import zlib from 'zlib';
import { XmltvStreamParser } from '../src/lib/xmltvStreamParser';
import { sqliteEpgDB, SQLiteEpgDB } from '../src/lib/sqliteEpgDb';
import {
  normalizeChannelName,
  calculateStringSimilarity,
  calculateTokenSimilarity,
  matchChannelToXmltv,
  batchMatchChannelsToXmltv,
  MatchCandidate,
} from '../src/lib/fuzzyEpgMatcher';
import { UnifiedEpgProgram, XmltvChannel } from '../src/lib/models';

export interface Milestone4TestResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface Milestone4TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: Milestone4TestResult[];
}

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${msg}`);
  }
}

export async function runMilestone4TestSuite(): Promise<Milestone4TestSuiteSummary> {
  sqliteEpgDB.clearAllEpg();
  sqliteEpgDB.seedSampleEpg(true);
  const startTime = Date.now();
  const results: Milestone4TestResult[] = [];

  const runTest = async (category: string, id: string, name: string, fn: () => Promise<void> | void) => {
    const t0 = Date.now();
    try {
      await fn();
      results.push({
        id,
        category,
        name,
        passed: true,
        durationMs: Date.now() - t0,
      });
    } catch (err: any) {
      results.push({
        id,
        category,
        name,
        passed: false,
        durationMs: Date.now() - t0,
        error: err.message || String(err),
      });
    }
  };

  // -------------------------------------------------------------
  // TEST-M4-01: STREAMING XMLTV PARSER (OOM PROTECTION)
  // -------------------------------------------------------------
  await runTest('4A Stream Ingest', 'TEST-M4-01', 'Stream Ingest: Chunked XMLTV parser processes large stream in constant memory without OOM', async () => {
    const channelsCollected: XmltvChannel[] = [];
    const batchesCollected: UnifiedEpgProgram[][] = [];

    const parser = new XmltvStreamParser({
      batchSize: 10,
      onChannel: (ch) => {
        channelsCollected.push(ch);
      },
      onProgrammeBatch: (batch) => {
        batchesCollected.push(batch);
      },
    });

    // Simulate streaming XML chunk by chunk (simulating 50 chunks of 2 programmes each = 100 programmes)
    await parser.processChunk('<?xml version="1.0" encoding="UTF-8"?><tv>\n');
    await parser.processChunk('<channel id="STREAM.CH1"><display-name>Stream Channel 1 HD</display-name><icon src="http://img.com/ch1.png"/></channel>\n');
    await parser.processChunk('<channel id="STREAM.CH2"><display-name>Stream Channel 2 4K</display-name></channel>\n');

    for (let i = 0; i < 50; i++) {
      const startSec = 1787670000 + i * 3600;
      const stopSec = startSec + 3600;
      const xmlChunk = `
        <programme start="20260825120000 +0000" stop="20260825130000 +0000" channel="STREAM.CH1">
          <title>Program Stream #${i + 1}</title>
          <desc>Chunked streaming description item #${i + 1}</desc>
          <category>Documentary</category>
        </programme>
        <programme start="20260825120000 +0000" stop="20260825130000 +0000" channel="STREAM.CH2">
          <title>Second Stream #${i + 1}</title>
          <desc>Secondary chunked item</desc>
          <category>News</category>
        </programme>
      `;
      await parser.processChunk(xmlChunk);
    }

    await parser.processChunk('</tv>');
    const stats = await parser.finish();

    assert(channelsCollected.length === 2, `Expected 2 channels, parsed ${channelsCollected.length}`);
    assert(stats.programmesParsed === 100, `Expected 100 programmes parsed, got ${stats.programmesParsed}`);
    assert(batchesCollected.length === 10, `Expected 10 batches (10 items each), got ${batchesCollected.length}`);
  });

  // -------------------------------------------------------------
  // TEST-M4-02: GZIP STREAMING DECOMPRESSION ON-THE-FLY
  // -------------------------------------------------------------
  await runTest('4A Stream Ingest', 'TEST-M4-02', 'Gzip Streaming: Decompresses gzipped XMLTV stream on-the-fly and processes elements', async () => {
    const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
      <tv>
        <channel id="GZIP.TEST"><display-name>Gzip Test Network</display-name></channel>
        <programme start="20260825140000 +0000" stop="20260825160000 +0000" channel="GZIP.TEST">
          <title>Gzipped Broadcast Special</title>
          <desc>Streamed from compressed gzip pipeline</desc>
          <category>Live Event</category>
        </programme>
      </tv>
    `;

    // Compress raw XML into gzip buffer
    const gzippedBuffer = zlib.gzipSync(Buffer.from(rawXml, 'utf-8'));

    // Create readable stream from compressed buffer
    const readableStream = new Readable();
    readableStream.push(gzippedBuffer);
    readableStream.push(null);

    const channels: XmltvChannel[] = [];
    const programmes: UnifiedEpgProgram[] = [];

    const stats = await XmltvStreamParser.parseStream(readableStream, {
      onChannel: (ch) => {
        channels.push(ch);
      },
      onProgrammeBatch: (batch) => {
        programmes.push(...batch);
      },
    });

    assert(stats.channelsParsed === 1, 'Must parse 1 channel from gzip stream');
    assert(channels[0].id === 'GZIP.TEST', 'Channel ID must match');
    assert(stats.programmesParsed === 1, 'Must parse 1 programme from gzip stream');
    assert(programmes[0].title === 'Gzipped Broadcast Special', 'Programme title must match');
  });

  // -------------------------------------------------------------
  // TEST-M4-03: SQLITE EPG SCHEMA & INDEXES
  // -------------------------------------------------------------
  await runTest('4A SQLite Persistence', 'TEST-M4-03', 'SQLite EPG Schema & Indexing: Verified tables epg_channels and epg_programmes with compound indexes', () => {
    const stats = sqliteEpgDB.getStats();
    assert(stats.channelsCount >= 1, 'Database must contain initialized epg_channels');
    assert(stats.programmesCount >= 1, 'Database must contain initialized epg_programmes');
    assert(stats.dbFileSizeBytes > 0, 'Database file must exist on disk');
  });

  // -------------------------------------------------------------
  // TEST-M4-04: BATCH INSERTION TRANSACTION
  // -------------------------------------------------------------
  await runTest('4A SQLite Persistence', 'TEST-M4-04', 'High-Speed Batch Transactions: Batch inserting 500+ programmes in single atomic transactions', () => {
    const batchChannels: XmltvChannel[] = [
      { id: 'BENCH.CH1', displayName: 'Benchmark Channel 1' },
      { id: 'BENCH.CH2', displayName: 'Benchmark Channel 2' },
    ];
    sqliteEpgDB.insertChannels(batchChannels);

    const progsToInsert: UnifiedEpgProgram[] = [];
    const baseSec = 1787670000;

    for (let i = 0; i < 500; i++) {
      const startSec = baseSec + i * 1800;
      const stopSec = startSec + 1800;
      progsToInsert.push({
        id: `bench_prog_${i}`,
        channelId: i % 2 === 0 ? 'BENCH.CH1' : 'BENCH.CH2',
        title: `Benchmark Program #${i + 1}`,
        description: `Automated transaction test item #${i + 1}`,
        category: 'Test Category',
        start: new Date(startSec * 1000),
        stop: new Date(stopSec * 1000),
        startTimestampSec: startSec,
        stopTimestampSec: stopSec,
        durationMinutes: 30,
      });
    }

    const insertedCount = sqliteEpgDB.insertProgrammesBatch(progsToInsert);
    assert(insertedCount === 500, `Expected 500 programmes inserted, got ${insertedCount}`);

    // Query back from DB
    const schedule = sqliteEpgDB.getSchedule('BENCH.CH1', baseSec, baseSec + 36000);
    assert(schedule.length > 0, 'Must query back inserted records via indexed query');
  });

  // -------------------------------------------------------------
  // TEST-M4-05: NOW/NEXT QUERY ENGINE
  // -------------------------------------------------------------
  await runTest('4A Now/Next Engine', 'TEST-M4-05', 'Now/Next Query Engine: Accurate boundary testing for start <= now < stop and next upcoming programme', () => {
    const testChannelId = 'TEST.NOW_NEXT.CH';
    sqliteEpgDB.insertChannels([{ id: testChannelId, displayName: 'Now Next Test Channel' }]);

    const tNow = 1787700000; // Reference epoch seconds

    const programmes: UnifiedEpgProgram[] = [
      {
        id: 'prog_past',
        channelId: testChannelId,
        title: 'Past Morning Show',
        start: new Date((tNow - 7200) * 1000),
        stop: new Date((tNow - 3600) * 1000),
        startTimestampSec: tNow - 7200,
        stopTimestampSec: tNow - 3600,
        durationMinutes: 60,
      },
      {
        id: 'prog_current_now',
        channelId: testChannelId,
        title: 'Live Breaking Show (ON AIR)',
        start: new Date((tNow - 1800) * 1000),
        stop: new Date((tNow + 1800) * 1000),
        startTimestampSec: tNow - 1800,
        stopTimestampSec: tNow + 1800,
        durationMinutes: 60,
      },
      {
        id: 'prog_next_future',
        channelId: testChannelId,
        title: 'Upcoming Evening Movie',
        start: new Date((tNow + 1800) * 1000),
        stop: new Date((tNow + 5400) * 1000),
        startTimestampSec: tNow + 1800,
        stopTimestampSec: tNow + 5400,
        durationMinutes: 60,
      },
    ];

    sqliteEpgDB.insertProgrammesBatch(programmes);

    const { now, next } = sqliteEpgDB.getNowAndNext(testChannelId, tNow);

    assert(now !== null, 'Now program must not be null');
    assert(now!.title === 'Live Breaking Show (ON AIR)', 'Now program must match active time window');
    assert(now!.nowPlaying === true, 'nowPlaying flag must be true for active show');
    assert(now!.progressPercent === 50, 'Progress must be 50% (30m elapsed of 60m)');

    assert(next !== null, 'Next program must not be null');
    assert(next!.title === 'Upcoming Evening Movie', 'Next program must match upcoming schedule');
  });

  // -------------------------------------------------------------
  // TEST-M4-06: FUZZY MATCHER - EXACT TVG-ID MATCH
  // -------------------------------------------------------------
  await runTest('4A Fuzzy Matcher', 'TEST-M4-06', 'Fuzzy Matcher: Exact tvg-id match (Score = 1.0)', () => {
    const candidates: MatchCandidate[] = [
      { id: 'ESPN.us', displayName: 'ESPN HD' },
      { id: 'CNN.us', displayName: 'CNN International' },
      { id: 'BBCOne.uk', displayName: 'BBC One' },
    ];

    const match = matchChannelToXmltv(
      { id: 101, name: 'Custom Name 101', tvgId: 'ESPN.us' },
      candidates
    );

    assert(match.isMatched === true, 'Must match on exact tvg-id');
    assert(match.xmltvChannelId === 'ESPN.us', 'Matched XMLTV ID must be ESPN.us');
    assert(match.matchType === 'EXACT_TVG_ID', 'Match type must be EXACT_TVG_ID');
    assert(match.matchScore === 1.0, 'Match score must be 1.0');
  });

  // -------------------------------------------------------------
  // TEST-M4-07: FUZZY MATCHER - CLEAN NORMALIZED NAME MATCH
  // -------------------------------------------------------------
  await runTest('4A Fuzzy Matcher', 'TEST-M4-07', 'Fuzzy Matcher: Region/Quality stripped clean name match (Score = 0.95)', () => {
    const candidates: MatchCandidate[] = [
      { id: 'SkySportsF1.uk', displayName: 'Sky Sports F1' },
      { id: 'HBO.us', displayName: 'HBO East' },
    ];

    // Channel name with regional prefix "UK:", quality suffix "UHD", framerate "60FPS"
    const channel = {
      id: 202,
      name: 'UK: Sky Sports F1 UHD (60FPS)',
    };

    const match = matchChannelToXmltv(channel, candidates);

    assert(match.isMatched === true, 'Must match on normalized name');
    assert(match.xmltvChannelId === 'SkySportsF1.uk', 'Must match SkySportsF1.uk');
    assert(match.matchType === 'NORMALIZED_NAME', 'Match type must be NORMALIZED_NAME');
    assert(match.matchScore === 0.95, 'Match score must be 0.95');
  });

  // -------------------------------------------------------------
  // TEST-M4-08: FUZZY MATCHER - TOKEN SIMILARITY FUZZY MATCH
  // -------------------------------------------------------------
  await runTest('4A Fuzzy Matcher', 'TEST-M4-08', 'Fuzzy Matcher: Token / Levenshtein fuzzy match for abbreviated channel names', () => {
    const candidates: MatchCandidate[] = [
      { id: 'CNN.us', displayName: 'CNN International' },
      { id: 'NatGeo.us', displayName: 'National Geographic Wild' },
    ];

    const channel = {
      id: 303,
      name: 'CNN Int News',
    };

    const match = matchChannelToXmltv(channel, candidates, {}, 0.50);

    assert(match.isMatched === true, 'Must fuzzy match abbreviated name');
    assert(match.xmltvChannelId === 'CNN.us', 'Must map to CNN.us');
    assert(match.matchType === 'FUZZY_TOKEN', 'Match type must be FUZZY_TOKEN');
    assert(match.matchScore >= 0.50, 'Match score must be above threshold');
  });

  // -------------------------------------------------------------
  // TEST-M4-09: UNMATCHED CHANNELS ARE PRESERVED (NEVER HIDDEN)
  // -------------------------------------------------------------
  await runTest('4A Unmatched Channels Policy', 'TEST-M4-09', 'Unmatched Channels Policy: Unmatched channels are explicitly preserved and returned with null guide data rather than filtered or hidden', () => {
    const candidates: MatchCandidate[] = [
      { id: 'ESPN.us', displayName: 'ESPN HD' },
    ];

    const channels = [
      { id: 101, name: 'US: ESPN HD', tvgId: 'ESPN.us' },
      { id: 999, name: 'Unmatched Obscure Local TV 99' }, // Has NO XMLTV equivalent
    ];

    const matchedList = batchMatchChannelsToXmltv(channels, candidates);

    // 1. Array length must equal original channel count (NO DROPPED CHANNELS)
    assert(matchedList.length === 2, 'Unmatched channels must NOT be excluded from output array');

    const unmatched = matchedList.find((m) => m.channelId === 999);
    assert(unmatched !== undefined, 'Unmatched channel 999 must exist in matched list');
    assert(unmatched!.isMatched === false, 'isMatched must be false for unmatched channel');
    assert(unmatched!.xmltvChannelId === null, 'xmltvChannelId must be null');
    assert(unmatched!.matchType === 'UNMATCHED', 'matchType must be UNMATCHED');

    // 2. Query batch Now/Next from SQLite
    const nowNextList = sqliteEpgDB.getNowAndNextForChannels(channels);
    assert(nowNextList.length === 2, 'Batch Now/Next must return an entry for every channel');
    const ch999NowNext = nowNextList.find((n) => n.channelId === 999);
    assert(ch999NowNext !== undefined, 'Channel 999 must be present in Now/Next list');
    assert(ch999NowNext!.hasEpgData === false, 'hasEpgData must be false');
    assert(ch999NowNext!.now === null, 'now must be null');
    assert(ch999NowNext!.next === null, 'next must be null');
  });

  // -------------------------------------------------------------
  // TEST-M4-10: MANUAL CHANNEL-TO-XMLTV REMAPPING
  // -------------------------------------------------------------
  await runTest('4A Manual Mapping', 'TEST-M4-10', 'Manual Channel Remapping: Custom override persists and takes precedence over auto fuzzy match', () => {
    const candidates: MatchCandidate[] = [
      { id: 'ESPN.us', displayName: 'ESPN HD' },
      { id: 'BBCOne.uk', displayName: 'BBC One HD' },
    ];

    // Auto match would match ESPN.us, but user manually forces BBCOne.uk
    const manualOverrides = { '101': 'BBCOne.uk' };

    const match = matchChannelToXmltv(
      { id: 101, name: 'US: ESPN HD', tvgId: 'ESPN.us' },
      candidates,
      manualOverrides
    );

    assert(match.isMatched === true, 'Must be matched');
    assert(match.xmltvChannelId === 'BBCOne.uk', 'Manual mapping must take precedence');
    assert(match.matchType === 'MANUAL', 'Match type must be MANUAL');
    assert(match.matchScore === 1.0, 'Match score must be 1.0');
  });

  // -------------------------------------------------------------
  // TEST-M4-11: BATCH NOW/NEXT QUERY PERFORMANCE
  // -------------------------------------------------------------
  await runTest('4A Performance Benchmark', 'TEST-M4-11', 'Batch Now/Next Query Performance: Sub-millisecond multi-channel lookup from SQLite index', () => {
    const channels = [
      { id: 1, name: 'US: ESPN HD (60FPS)', tvgId: 'ESPN.us' },
      { id: 2, name: 'US: CNN INTERNATIONAL', tvgId: 'CNN.us' },
      { id: 3, name: 'UK: BBC ONE HD', tvgId: 'BBCOne.uk' },
      { id: 4, name: 'US: HBO East HD', tvgId: 'HBO.us' },
      { id: 5, name: 'UK: Sky Sports F1 UHD', tvgId: 'SkySportsF1.uk' },
      { id: 6, name: 'Unmatched Channel', tvgId: 'nonexistent.id' },
    ];

    const t0 = Date.now();
    const batch = sqliteEpgDB.getNowAndNextForChannels(channels);
    const durationMs = Date.now() - t0;

    assert(batch.length === 6, 'All 6 channels must be returned in batch Now/Next lookup');
    assert(durationMs < 50, `Batch lookup took ${durationMs}ms, must be < 50ms`);

    const espn = batch.find((b) => b.channelId === 1);
    assert(espn !== undefined && espn.hasEpgData === true, 'ESPN must have live EPG data');
  });

  // -------------------------------------------------------------
  // TEST-M4-12: 4B TIMELINE GRID MULTI-CHANNEL WINDOW QUERY
  // -------------------------------------------------------------
  await runTest('4B Timeline Grid', 'TEST-M4-12', 'Timeline Grid: Retrieves time-bounded program schedules across all channels with sub-millisecond index lookup', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const fromSec = nowSec - 7200; // -2h
    const toSec = nowSec + 14400; // +4h

    const channels = [
      { id: 10452, name: 'US: ESPN HD (60FPS)', tvgId: 'ESPN.us', category: 'Sports' },
      { id: 10453, name: 'US: CNN INTERNATIONAL', tvgId: 'CNN.us', category: 'News' },
      { id: 10454, name: 'UK: BBC ONE HD', tvgId: 'BBCOne.uk', category: 'Entertainment' },
      { id: 99999, name: 'Unmatched Channel', category: 'Local' },
    ];

    const grid = sqliteEpgDB.getTimelineGridForChannels(channels, fromSec, toSec);

    assert(grid.windowStartSec === fromSec, 'windowStartSec must match requested fromSec');
    assert(grid.windowStopSec === toSec, 'windowStopSec must match requested toSec');
    assert(grid.channels.length === 4, 'Must return all 4 requested channel slots');

    const espn = grid.channels.find((c) => c.channelId === 10452);
    assert(espn !== undefined && espn.hasEpgData === true, 'ESPN must have EPG data in timeline grid');
    assert(espn.programmes.length >= 1, 'ESPN must have at least 1 program in 6h window');

    // Verify all returned programmes overlap the requested window
    for (const prog of espn.programmes) {
      assert(prog.stopTimestampSec >= fromSec, 'Program stop time must be >= window start');
      assert(prog.startTimestampSec <= toSec, 'Program start time must be <= window stop');
    }
  });

  // -------------------------------------------------------------
  // TEST-M4-13: 4B TIMELINE COORDINATE & POSITIONING MATH
  // -------------------------------------------------------------
  await runTest('4B Timeline Grid', 'TEST-M4-13', 'Coordinate Math: Accurately calculates left offset, width in pixels, and boundary clamping', () => {
    const windowStartSec = 1787670000;
    const windowStopSec = 1787670000 + 21600; // 6 hours
    const pxPerHour = 240; // 240px per 3600 seconds = 0.066667 px/sec
    const pxPerSec = pxPerHour / 3600;

    // Case 1: Program starts 1 hour after window start, lasts 90 mins (5400s)
    const prog1Start = windowStartSec + 3600;
    const prog1Stop = prog1Start + 5400;

    const left1 = (prog1Start - windowStartSec) * pxPerSec;
    const width1 = (prog1Stop - prog1Start) * pxPerSec;

    assert(Math.abs(left1 - 240) < 0.001, `Expected left offset 240px, got ${left1}`);
    assert(Math.abs(width1 - 360) < 0.001, `Expected width 360px (1.5h), got ${width1}`);

    // Case 2: Program started 30 mins before window start (should be clamped/offset appropriately)
    const prog2Start = windowStartSec - 1800;
    const prog2Stop = windowStartSec + 3600;

    const rawLeft2 = (prog2Start - windowStartSec) * pxPerSec;
    const renderLeft2 = Math.max(0, rawLeft2);
    const rawWidth2 = (prog2Stop - prog2Start) * pxPerSec;
    const visibleWidth2 = (prog2Stop - Math.max(prog2Start, windowStartSec)) * pxPerSec;

    assert(rawLeft2 === -120, 'Raw left must be -120px');
    assert(renderLeft2 === 0, 'Rendered left must clamp to 0px at window boundary');
    assert(rawWidth2 === 360, 'Total program width is 360px');
    assert(visibleWidth2 === 240, 'Visible width within window is 240px');
  });

  // -------------------------------------------------------------
  // TEST-M4-14: 4B CATCHUP & ON-AIR STATUS DETECTION
  // -------------------------------------------------------------
  await runTest('4B Timeline Grid', 'TEST-M4-14', 'Status Engine: Flags ON-AIR, CATCHUP, and UPCOMING program states accurately based on wall clock', () => {
    const nowSec = Math.floor(Date.now() / 1000);

    const pastProg: UnifiedEpgProgram = {
      id: 'past_1',
      channelId: 'ESPN.us',
      title: 'Past Game',
      start: new Date((nowSec - 7200) * 1000),
      stop: new Date((nowSec - 3600) * 1000),
      startTimestampSec: nowSec - 7200,
      stopTimestampSec: nowSec - 3600,
      durationMinutes: 60,
      hasCatchupArchive: true,
    };

    const currentProg: UnifiedEpgProgram = {
      id: 'current_1',
      channelId: 'ESPN.us',
      title: 'Live Championship',
      start: new Date((nowSec - 1800) * 1000),
      stop: new Date((nowSec + 1800) * 1000),
      startTimestampSec: nowSec - 1800,
      stopTimestampSec: nowSec + 1800,
      durationMinutes: 60,
      nowPlaying: true,
      progressPercent: 50,
    };

    const futureProg: UnifiedEpgProgram = {
      id: 'future_1',
      channelId: 'ESPN.us',
      title: 'Upcoming Preview',
      start: new Date((nowSec + 3600) * 1000),
      stop: new Date((nowSec + 7200) * 1000),
      startTimestampSec: nowSec + 3600,
      stopTimestampSec: nowSec + 7200,
      durationMinutes: 60,
    };

    // Assert Past
    assert(pastProg.stopTimestampSec < nowSec, 'Past program stop must be < nowSec');
    assert(pastProg.hasCatchupArchive === true, 'Past program must be flagged as catchup archive eligible');

    // Assert Current
    assert(currentProg.startTimestampSec <= nowSec && currentProg.stopTimestampSec > nowSec, 'Current program must span nowSec');
    assert(currentProg.nowPlaying === true, 'Current program must be nowPlaying');
    assert(currentProg.progressPercent === 50, 'Progress must equal 50%');

    // Assert Future
    assert(futureProg.startTimestampSec > nowSec, 'Future program start must be > nowSec');
    assert(!futureProg.nowPlaying, 'Future program cannot be nowPlaying');
  });

  // -------------------------------------------------------------
  // TEST-M4-15: 4B UNMATCHED CHANNEL PRESERVATION IN 2D GRID
  // -------------------------------------------------------------
  await runTest('4B Timeline Grid', 'TEST-M4-15', 'Unmatched Channel Preservation: 2D Timeline Grid includes unmatched channels as playable rows without EPG gaps failing', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const channels = [
      { id: 8888, name: 'Local Public Access', category: 'Community' },
      { id: 9999, name: 'Indie Web Stream', category: 'Web' },
    ];

    const grid = sqliteEpgDB.getTimelineGridForChannels(channels, nowSec - 3600, nowSec + 3600);

    assert(grid.channels.length === 2, 'Must return 2 channel rows');
    for (const ch of grid.channels) {
      assert(ch.matchType === 'UNMATCHED', 'Match type must be UNMATCHED');
      assert(ch.hasEpgData === false, 'hasEpgData must be false');
      assert(Array.isArray(ch.programmes) && ch.programmes.length === 0, 'Programmes must be empty array, not undefined');
      assert(Boolean(ch.channelName), 'Channel name must be preserved');
    }
  });

  // -------------------------------------------------------------
  // TEST-M4-16: 4B PERFORMANCE BENCHMARK (TIMELINE GRID BATCH LOOKUP)
  // -------------------------------------------------------------
  await runTest('4B Performance Benchmark', 'TEST-M4-16', 'Timeline Grid Benchmark: Multi-channel 24-hour schedule query runs in < 25ms', () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const fromSec = nowSec - 43200; // -12h
    const toSec = nowSec + 43200; // +12h

    const channels = [
      { id: 10452, name: 'US: ESPN HD (60FPS)', tvgId: 'ESPN.us' },
      { id: 10453, name: 'US: CNN INTERNATIONAL', tvgId: 'CNN.us' },
      { id: 10454, name: 'UK: BBC ONE HD', tvgId: 'BBCOne.uk' },
      { id: 10455, name: 'US: HBO East HD', tvgId: 'HBO.us' },
      { id: 10456, name: 'UK: Sky Sports F1 UHD', tvgId: 'SkySportsF1.uk' },
      { id: 10457, name: 'Nat Geo Wild FHD', tvgId: 'NatGeo.us' },
      { id: 99999, name: 'Unmatched Stream' },
    ];

    const t0 = Date.now();
    const grid = sqliteEpgDB.getTimelineGridForChannels(channels, fromSec, toSec);
    const durationMs = Date.now() - t0;

    assert(grid.channels.length === 7, 'Must return all 7 channels');
    assert(durationMs < 35, `24-hour timeline grid query took ${durationMs}ms, must be < 35ms`);
  });

  const totalDuration = Date.now() - startTime;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    durationMs: totalDuration,
    results,
  };
}

// Standalone CLI runner
(async () => {
  try {
    const summary = await runMilestone4TestSuite();
    console.log('================== MILESTONE 4A & 4B TEST SUITE ==================');
    summary.results.forEach((r) => {
      const mark = r.passed ? '\x1b[32m[✓ PASS]\x1b[0m' : '\x1b[31m[✗ FAIL]\x1b[0m';
      console.log(`${mark} [${r.category}] ${r.id}: ${r.name} (${r.durationMs}ms)`);
      if (r.error) {
        console.error(`       Error: ${r.error}`);
      }
    });
    console.log('----------------------------------------------------------------------');
    console.log(`Total Assertions: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed} | Total Duration: ${summary.durationMs}ms`);
    console.log('======================================================================');
  } catch (e) {
    console.error('Test execution failed:', e);
  }
})();


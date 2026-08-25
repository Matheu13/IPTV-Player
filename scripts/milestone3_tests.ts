/**
 * Automated Test Suite for Milestone 3 (3a, 3b, 3c)
 * Run with: npm run test:m3 (or tsx scripts/milestone3_tests.ts)
 */

import {
  parseXmltv,
  parseXmltvDate,
  safeBase64Decode,
  normalizeXtreamEpg,
  buildCatchupStreamUrl,
  formatXtreamTimeshiftDate,
} from '../src/lib/epgEngine';

import {
  normalizeVodMovie,
  normalizeSeries,
  buildVodMovieStreamUrl,
  buildSeriesEpisodeStreamUrl,
  WatchProgressManager,
} from '../src/lib/vodEngine';

import {
  ChannelManager,
  RemoteZapperController,
} from '../src/lib/channelManager';

import { sqliteWatchProgressDB } from '../src/lib/sqliteDbServer';

import {
  FIXTURE_XMLTV_RAW,
  FIXTURE_XTREAM_EPG_TABLE,
  FIXTURE_VOD_MOVIES,
  FIXTURE_VOD_INFO_DUNE,
  FIXTURE_SERIES_CATALOG,
  FIXTURE_SERIES_INFO_SHOGUN,
} from '../src/lib/fixturesM3';

import { UnifiedChannel } from '../src/lib/models';

interface TestResult {
  suite: string;
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(suite: string, testId: string, name: string, fn: () => void | Promise<void>) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, testId, name, passed: true, durationMs });
    console.log(`[✓ PASS] [${suite}] ${testId}: ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, testId, name, passed: false, durationMs, error: err.message });
    console.error(`[✗ FAIL] [${suite}] ${testId}: ${name} (${durationMs}ms) -> ${err.message}`);
  }
}

export async function runMilestone3TestSuite(): Promise<{ total: number; passed: number; failed: number; results: TestResult[] }> {
  console.log('\n================== MILESTONE 3 AUTOMATED TEST SUITE ==================');

  // -------------------------------------------------------------
  // MILESTONE 3A: EPG & CATCHUP TIMESHIFT
  // -------------------------------------------------------------

  await runTest('3A EPG & Catchup', 'TEST-M3-01', 'XMLTV Parser: Channel metadata extraction (id, displayName, icon)', () => {
    const parsed = parseXmltv(FIXTURE_XMLTV_RAW);
    assert(parsed.channelsCount === 3, `Expected 3 channels, got ${parsed.channelsCount}`);
    const espn = parsed.channels.find((c) => c.id === 'ESPN.us');
    assert(espn !== undefined, 'ESPN.us channel not found');
    assert(espn!.displayName === 'ESPN HD US', `Expected "ESPN HD US", got "${espn!.displayName}"`);
    assert(espn!.iconSrc?.includes('espn.png') === true, 'Icon src missing or incorrect');
  });

  await runTest('3A EPG & Catchup', 'TEST-M3-02', 'XMLTV Parser: Timestamp parsing with UTC timezone offsets', () => {
    const dateUtc = parseXmltvDate('20260825160000 +0000');
    assert(dateUtc.getUTCFullYear() === 2026, 'Year must be 2026');
    assert(dateUtc.getUTCHours() === 16, `Expected UTC hour 16, got ${dateUtc.getUTCHours()}`);

    // Test with -0400 offset (EDT) -> 16:00 -0400 equals 20:00 UTC
    const dateEdt = parseXmltvDate('20260825160000 -0400');
    assert(dateEdt.getUTCHours() === 20, `Expected UTC hour 20 for 16:00-0400, got ${dateEdt.getUTCHours()}`);
  });

  await runTest('3A EPG & Catchup', 'TEST-M3-03', 'XMLTV Parser: Real-time nowPlaying detection and progress percentage', () => {
    // Reference time: 2026-08-25 17:00:00 UTC (Middle of SportsCenter 16:00 - 18:00)
    const refNow = new Date('2026-08-25T17:00:00Z');
    const parsed = parseXmltv(FIXTURE_XMLTV_RAW, refNow);
    const espnProgs = parsed.programmesByChannel['ESPN.us'];
    assert(espnProgs && espnProgs.length === 3, 'Expected 3 programs for ESPN');

    const activeProg = espnProgs.find((p) => p.nowPlaying);
    assert(activeProg !== undefined, 'Active program must be detected');
    assert(activeProg!.title.includes('SportsCenter Live'), `Expected SportsCenter, got ${activeProg!.title}`);
    assert(activeProg!.progressPercent === 50, `Expected 50% progress at 17:00 for 16:00-18:00 show, got ${activeProg!.progressPercent}%`);
  });

  await runTest('3A EPG & Catchup', 'TEST-M3-04', 'Xtream EPG: Base64 decode title and synopsis from get_simple_data_table', () => {
    const refNow = new Date('2026-08-25T17:00:00Z');
    const progs = normalizeXtreamEpg(FIXTURE_XTREAM_EPG_TABLE, 10452, refNow);
    assert(progs.length === 2, `Expected 2 programs, got ${progs.length}`);
    assert(
      progs[0].title === 'SportsCenter Live: Prime Time Analysis',
      `Expected decoded title "SportsCenter Live: Prime Time Analysis", got "${progs[0].title}"`
    );
    assert(
      progs[0].description === 'Comprehensive highlights and expert breakdown.',
      `Expected decoded description, got "${progs[0].description}"`
    );
    assert(progs[0].nowPlaying === true, 'First program should be nowPlaying');
  });

  await runTest('3A EPG & Catchup', 'TEST-M3-05', 'Catchup URL Builder: Xtream format timeshift URL synthesis', () => {
    const startTime = new Date('2026-08-25T16:00:00Z');
    const formattedDate = formatXtreamTimeshiftDate(startTime);
    assert(formattedDate === '2026-08-25:16-00', `Expected "2026-08-25:16-00", got "${formattedDate}"`);

    const url = buildCatchupStreamUrl({
      channelId: '10452',
      streamId: 10452,
      programTitle: 'SportsCenter Live',
      startTime,
      durationMinutes: 120,
      serverUrl: 'http://provider.panel-stream.net:8080',
      username: 'user1',
      password: 'pass1',
      archiveType: 'xtream_timeshift',
    });

    assert(
      url === 'http://provider.panel-stream.net:8080/timeshift/user1/pass1/120/2026-08-25:16-00/10452.ts',
      `Generated unexpected catchup URL: ${url}`
    );
  });

  await runTest('3A EPG & Catchup', 'TEST-M3-06', 'Catchup URL Builder: Flussonic & query-parameter fallback', () => {
    const startTime = new Date('2026-08-25T16:00:00Z');
    const flussonicUrl = buildCatchupStreamUrl({
      channelId: '10452',
      streamId: 10452,
      programTitle: 'SportsCenter Live',
      startTime,
      durationMinutes: 60,
      serverUrl: 'http://provider.panel-stream.net:8080',
      username: 'user1',
      password: 'pass1',
      archiveType: 'flussonic',
    });

    assert(
      flussonicUrl.includes('/live/user1/pass1/10452.m3u8?utc=1787673600&lutc=1787677200'),
      `Flussonic catchup URL unexpected: ${flussonicUrl}`
    );
  });

  // -------------------------------------------------------------
  // MILESTONE 3B: VOD & TV SERIES ENGINE
  // -------------------------------------------------------------

  await runTest('3B VOD & Series', 'TEST-M3-07', 'VOD Normalizer: Movie metadata, runtime formatting & 5-star rating conversion', () => {
    const raw = FIXTURE_VOD_MOVIES[0];
    const movie = normalizeVodMovie(raw);
    assert(movie.streamId === 8801, `Expected streamId 8801, got ${movie.streamId}`);
    assert(movie.durationFormatted === '2h 46m', `Expected duration formatted "2h 46m", got "${movie.durationFormatted}"`);
    assert(movie.rating5 === 4.3, `Expected rating5 4.3, got ${movie.rating5}`);
    assert(movie.containerExtension === 'mp4', `Expected container extension mp4, got ${movie.containerExtension}`);
  });

  await runTest('3B VOD & Series', 'TEST-M3-08', 'Series Normalizer: Multi-season & episode hierarchy mapping', () => {
    const series = normalizeSeries(FIXTURE_SERIES_CATALOG[0], FIXTURE_SERIES_INFO_SHOGUN);
    assert(series.seriesId === 9101, 'Expected seriesId 9101');
    assert(series.seasons.length === 1, `Expected 1 season, got ${series.seasons.length}`);
    const s1 = series.seasons[0];
    assert(s1.episodes.length === 3, `Expected 3 episodes in Season 1, got ${s1.episodes.length}`);
    assert(s1.episodes[0].title === 'Chapter One: Anjin', `Expected episode title "Chapter One: Anjin", got "${s1.episodes[0].title}"`);
    assert(s1.episodes[0].durationFormatted === '1h 10m', `Expected "1h 10m", got "${s1.episodes[0].durationFormatted}"`);
  });

  await runTest('3B VOD & Series', 'TEST-M3-09', 'VOD Stream URL Generator: Synthesize clean /movie and /series endpoints', () => {
    const movieUrl = buildVodMovieStreamUrl('http://provider.net:8080', 'demouser', 'demopass', 8801, 'mp4');
    assert(
      movieUrl === 'http://provider.net:8080/movie/demouser/demopass/8801.mp4',
      `Unexpected movie URL: ${movieUrl}`
    );

    const seriesUrl = buildSeriesEpisodeStreamUrl('http://provider.net:8080', 'demouser', 'demopass', 91011, 'mp4');
    assert(
      seriesUrl === 'http://provider.net:8080/series/demouser/demopass/91011.mp4',
      `Unexpected series URL: ${seriesUrl}`
    );
  });

  await runTest('3B VOD & Series', 'TEST-M3-10', 'Watch Progress Manager: Resume state persistence and percentage calculation', () => {
    WatchProgressManager.clearAll();
    const saved = WatchProgressManager.saveProgress({
      mediaId: 8801,
      mediaType: 'movie',
      title: 'Dune: Part Two',
      currentTimeSec: 4980,
      durationSec: 9960, // 50%
      streamUrl: 'http://provider.net:8080/movie/user/pass/8801.mp4',
    });

    assert(saved.progressPercent === 50, `Expected 50% progress, got ${saved.progressPercent}%`);
    assert(saved.completed === false, 'Progress of 50% must not be completed');

    const retrieved = WatchProgressManager.getProgress('movie', 8801);
    assert(retrieved !== null, 'Progress record must be retrievable');
    assert(retrieved!.currentTimeSec === 4980, 'Current time must match saved time');
  });

  await runTest('3B VOD & Series', 'TEST-M3-11', 'Watch Progress Manager: Auto-completion threshold (>90%) & Continue Watching', () => {
    // 1. Unfinished movie
    WatchProgressManager.saveProgress({
      mediaId: 8802,
      mediaType: 'movie',
      title: 'Oppenheimer',
      currentTimeSec: 3600,
      durationSec: 10800, // 33%
      streamUrl: 'http://provider.net:8080/movie/user/pass/8802.mp4',
    });

    // 2. Finished movie (>90%)
    WatchProgressManager.saveProgress({
      mediaId: 8803,
      mediaType: 'movie',
      title: 'Spider-Man',
      currentTimeSec: 8000,
      durationSec: 8400, // 95% -> completed
      streamUrl: 'http://provider.net:8080/movie/user/pass/8803.mp4',
    });

    const continueList = WatchProgressManager.getContinueWatchingList();
    assert(continueList.some((item) => item.mediaId === 8802), 'Oppenheimer (33%) must appear in Continue Watching');
    assert(!continueList.some((item) => item.mediaId === 8803), 'Spider-Man (95%) must NOT appear in Continue Watching');
  });

  await runTest('3B VOD & Series', 'TEST-M3-11B', 'SQLite Watch Progress DB: Native SQL persistence, queries and Continue Watching shelf', () => {
    // 1. Insert into SQLite DB
    sqliteWatchProgressDB.saveProgress({
      mediaId: 'test_movie_99',
      mediaType: 'movie',
      title: 'Blade Runner 2049',
      currentTimeSec: 3600,
      durationSec: 9600, // 38%
      streamUrl: 'http://provider.net:8080/movie/user/pass/99.mp4',
    });

    // 2. Query single item from SQLite
    const retrieved = sqliteWatchProgressDB.getProgress('movie', 'test_movie_99');
    assert(retrieved !== null, 'Record must exist in SQLite database');
    assert(retrieved!.title === 'Blade Runner 2049', 'Title must match');
    assert(retrieved!.progressPercent === 38, 'Progress percent must match');
    assert(retrieved!.completed === false, 'Must be incomplete');

    // 3. Continue Watching list from SQLite
    const cwList = sqliteWatchProgressDB.getContinueWatchingList();
    assert(cwList.some((r) => r.mediaId === 'test_movie_99'), 'Must appear in SQLite Continue Watching list');

    // 4. Update progress to >90% (completed)
    sqliteWatchProgressDB.saveProgress({
      mediaId: 'test_movie_99',
      mediaType: 'movie',
      title: 'Blade Runner 2049',
      currentTimeSec: 9200,
      durationSec: 9600, // 96%
      streamUrl: 'http://provider.net:8080/movie/user/pass/99.mp4',
    });

    const updated = sqliteWatchProgressDB.getProgress('movie', 'test_movie_99');
    assert(updated !== null && updated.completed === true, 'Progress >90% must mark completed = true in SQLite');

    const cwListAfter = sqliteWatchProgressDB.getContinueWatchingList();
    assert(!cwListAfter.some((r) => r.mediaId === 'test_movie_99'), 'Completed movie must be excluded from Continue Watching shelf');

    // 5. Clean up test record
    sqliteWatchProgressDB.deleteProgress('movie', 'test_movie_99');
  });

  // -------------------------------------------------------------
  // MILESTONE 3C: CHANNEL MANAGEMENT & FAST ZAPPING
  // -------------------------------------------------------------

  await runTest('3C Channel Management', 'TEST-M3-12', 'Channel Manager: Toggle favorites and persist state', () => {
    const isInitiallyFav = ChannelManager.isFavorite(10452);
    const toggledResult = ChannelManager.toggleFavorite(10452);
    assert(toggledResult !== isInitiallyFav, 'Favorite toggle must flip boolean');
    // Restore
    ChannelManager.toggleFavorite(10452);
  });

  await runTest('3C Channel Management', 'TEST-M3-13', 'Custom Bouquets: Create bouquet, add/remove channels, delete bouquet', () => {
    const bouquet = ChannelManager.createBouquet('Live European Football', 'Premier League and Champions League', [10454]);
    assert(bouquet.name === 'Live European Football', 'Bouquet name mismatch');
    assert(bouquet.channelIds.length === 1, 'Expected 1 channel initially');

    ChannelManager.addChannelToBouquet(bouquet.id, 10452);
    const bouquets = ChannelManager.getBouquets();
    const updated = bouquets.find((b) => b.id === bouquet.id);
    assert(updated && updated.channelIds.length === 2, 'Channel was not added to bouquet');

    ChannelManager.removeChannelFromBouquet(bouquet.id, 10454);
    const updated2 = ChannelManager.getBouquets().find((b) => b.id === bouquet.id);
    assert(updated2 && updated2.channelIds.length === 1, 'Channel was not removed from bouquet');

    ChannelManager.deleteBouquet(bouquet.id);
    assert(!ChannelManager.getBouquets().some((b) => b.id === bouquet.id), 'Bouquet was not deleted');
  });

  await runTest('3C Channel Management', 'TEST-M3-14', 'Channel Overrides: Hide channels and apply custom numbering', () => {
    const dummyChannels: UnifiedChannel[] = [
      {
        id: '10452',
        streamId: 10452,
        name: 'ESPN HD',
        streamType: 'live',
        categoryId: '3',
        tvArchive: true,
        formatsAvailable: ['m3u8', 'ts'],
        sourceType: 'XTREAM',
        num: 1,
      },
    ];

    ChannelManager.setChannelHidden(10452, true);
    ChannelManager.setChannelCustomNumber(10452, 999);

    const transformed = ChannelManager.applyOverrides(dummyChannels);
    assert(transformed[0].isHidden === true, 'Channel isHidden must be true');
    assert(transformed[0].num === 999, `Expected custom number 999, got ${transformed[0].num}`);

    // Clean up
    ChannelManager.setChannelHidden(10452, false);
  });

  await runTest('3C Channel Management', 'TEST-M3-15', 'Remote Controller: Numeric keypad multi-digit buffering (1 + 0 + 4 -> CH 104)', () => {
    let committedNumber: number | null = null;
    const controller = new RemoteZapperController({
      onDigitCommitted: (num) => {
        committedNumber = num;
      },
      onZappedChannel: () => {},
    });

    controller.inputDigit('1');
    controller.inputDigit('0');
    controller.inputDigit('4');
    assert(controller.getPendingDigits() === '104', `Expected pending digits "104", got "${controller.getPendingDigits()}"`);

    const result = controller.commitDigits();
    assert(result === 104, `Expected commit result 104, got ${result}`);
    assert(committedNumber === 104, `Callback received unexpected number: ${committedNumber}`);
    assert(controller.getPendingDigits() === '', 'Pending digits must be cleared after commit');
    controller.destroy();
  });

  await runTest('3C Channel Management', 'TEST-M3-16', 'Remote Controller: Zapping debouncer prevents rapid stream churn', async () => {
    let zapCount = 0;
    let stepSum = 0;

    const controller = new RemoteZapperController({
      onDigitCommitted: () => {},
      onZappedChannel: (step) => {
        zapCount++;
        stepSum += step;
      },
    });

    // Rapidly press Ch+ 5 times in 50ms
    controller.stepChannel(1);
    controller.stepChannel(1);
    controller.stepChannel(1);
    controller.stepChannel(1);
    controller.stepChannel(1);

    // Immediate check -> zapCount should still be 0 because of 250ms debounce
    assert(zapCount === 0, 'Debouncer must not trigger immediately');

    // Wait 300ms for debounce timer to fire
    await new Promise((r) => setTimeout(r, 300));
    assert(zapCount === 1, `Expected exactly 1 debounced trigger, got ${zapCount}`);
    controller.destroy();
  });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('----------------------------------------------------------------------');
  console.log(`Total Assertions: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================================\n');

  if (failed > 0) {
    throw new Error(`${failed} tests failed in Milestone 3 Test Suite`);
  }

  return { total, passed, failed, results };
}

// Direct CLI execution
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1]?.endsWith('milestone3_tests.ts')) {
  runMilestone3TestSuite().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

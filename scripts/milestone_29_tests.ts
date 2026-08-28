/**
 * Standalone Automated Test Runner for Milestone 29
 *
 * M29: Favorites and Watch History
 * - Allow users to favorite channels regardless of source.
 * - Favorites must preserve the source ID.
 * - If two providers have channels with the same name, they must remain distinct internally.
 * - Remember: last watched channel, last watched source, recent channels, playback position where applicable.
 * - Do not restore playback automatically if the provider/source is unavailable.
 *
 * Execution: npx tsx scripts/milestone_29_tests.ts
 */

import { FavoritesHistoryEngine, SourceInfo } from '../src/lib/favoritesHistoryEngine';

export async function runMilestone29TestSuite() {
  console.log('================== MILESTONE 29 AUTOMATED TEST SUITE ==================');
  let passedCount = 0;
  let failedCount = 0;
  const testResults: Array<{ id: string; desc: string; passed: boolean; details?: string }> = [];

  const assert = (condition: boolean, testId: string, desc: string, details?: string) => {
    if (condition) {
      console.log(`\x1b[32m[PASS]\x1b[0m [${testId}] ${desc} ${details ? `(${details})` : ''}`);
      passedCount++;
      testResults.push({ id: testId, desc, passed: true, details });
    } else {
      console.error(`\x1b[31m[FAIL]\x1b[0m [${testId}] ${desc} ${details ? `(${details})` : ''}`);
      failedCount++;
      testResults.push({ id: testId, desc, passed: false, details });
    }
  };

  const engine = FavoritesHistoryEngine.getInstance();

  // Register distinct sources
  const srcXtream: SourceInfo = {
    id: 'prov-xtream-alpha',
    name: 'Provider Alpha (Xtream)',
    type: 'XTREAM',
    status: 'ACTIVE',
    baseUrl: 'http://alpha.stream-cdn.net:8080',
  };
  const srcM3u: SourceInfo = {
    id: 'prov-m3u-beta',
    name: 'Provider Beta (M3U)',
    type: 'M3U',
    status: 'ACTIVE',
    baseUrl: 'https://beta.tv-sports.org/playlist.m3u',
  };
  const srcOffline: SourceInfo = {
    id: 'prov-offline-gamma',
    name: 'Provider Gamma (Offline Feed)',
    type: 'RF_TUNER',
    status: 'OFFLINE',
  };
  const srcExpired: SourceInfo = {
    id: 'prov-expired-delta',
    name: 'Provider Delta (Expired Pass)',
    type: 'XTREAM',
    status: 'AUTH_EXPIRED',
  };

  engine.registerSource(srcXtream);
  engine.registerSource(srcM3u);
  engine.registerSource(srcOffline);
  engine.registerSource(srcExpired);

  // TEST-M29-01: Multi-Source Favoriting & Source Preservation
  {
    const fav1 = engine.addFavorite({
      channelId: '101',
      sourceId: srcXtream.id,
      sourceName: srcXtream.name,
      sourceType: srcXtream.type,
      channelName: 'Sky Sports Main Event FHD',
      category: 'Sports',
      streamUrl: 'http://alpha.stream-cdn.net:8080/live/u/p/101.m3u8',
      tvgId: 'sky.sports.me',
    });

    const isFav = engine.isFavorite(srcXtream.id, '101');
    const favsList = engine.getFavorites(srcXtream.id);

    assert(
      isFav &&
      fav1.sourceId === srcXtream.id &&
      fav1.sourceName === 'Provider Alpha (Xtream)' &&
      favsList.some((f) => f.compositeKey === 'prov-xtream-alpha:::101'),
      'Milestone 29',
      'TEST-M29-01: Multi-Source Favoriting & Source ID Preservation',
      `Composite: ${fav1.compositeKey}, Source: ${fav1.sourceId}`
    );
  }

  // TEST-M29-02: Same-Name Channel Disambiguation Across Multiple Providers
  // Requirement: "If two providers have channels with the same name, they must remain distinct internally."
  {
    // Channel with the EXACT same name "Sky Sports Main Event FHD" on Provider Beta
    const fav2 = engine.addFavorite({
      channelId: '772',
      sourceId: srcM3u.id,
      sourceName: srcM3u.name,
      sourceType: srcM3u.type,
      channelName: 'Sky Sports Main Event FHD', // Identical name!
      category: 'Sports',
      streamUrl: 'https://beta.tv-sports.org/hls/live/772.m3u8',
      tvgId: 'sky.sports.me.beta',
    });

    const isFav1 = engine.isFavorite(srcXtream.id, '101');
    const isFav2 = engine.isFavorite(srcM3u.id, '772');
    const allFavs = engine.getFavorites();

    const alphaItem = allFavs.find((f) => f.compositeKey === 'prov-xtream-alpha:::101');
    const betaItem = allFavs.find((f) => f.compositeKey === 'prov-m3u-beta:::772');

    assert(
      isFav1 &&
      isFav2 &&
      alphaItem !== undefined &&
      betaItem !== undefined &&
      alphaItem.channelName === betaItem.channelName &&
      alphaItem.sourceId !== betaItem.sourceId &&
      alphaItem.compositeKey !== betaItem.compositeKey,
      'Milestone 29',
      'TEST-M29-02: Same-Name Channel Disambiguation & Cross-Provider Collision Isolation',
      `Identical Name: "${alphaItem?.channelName}" maintained as distinct keys: [${alphaItem?.compositeKey}] and [${betaItem?.compositeKey}]`
    );
  }

  // TEST-M29-03: Last Watched Channel & Source State
  {
    engine.recordChannelWatch({
      channelId: '101',
      sourceId: srcXtream.id,
      sourceName: srcXtream.name,
      channelName: 'Sky Sports Main Event FHD',
      category: 'Sports',
      streamUrl: 'http://alpha.stream-cdn.net:8080/live/u/p/101.m3u8',
      durationSeconds: 180,
    });

    const lastCh = engine.getLastWatchedChannel();
    const lastSrc = engine.getLastWatchedSourceId();

    assert(
      lastCh !== null &&
      lastCh.channelId === '101' &&
      lastCh.sourceId === srcXtream.id &&
      lastSrc === srcXtream.id &&
      lastCh.channelName === 'Sky Sports Main Event FHD',
      'Milestone 29',
      'TEST-M29-03: Last Watched Channel & Source ID Persistence',
      `Channel: ${lastCh?.channelName}, Source: ${lastSrc}`
    );
  }

  // TEST-M29-04: Ordered & Deduplicated Recent Channels Watch History
  {
    engine.recordChannelWatch({
      channelId: '202',
      sourceId: srcXtream.id,
      sourceName: srcXtream.name,
      channelName: 'HBO Max Cinema 4K',
      category: 'Movies',
      streamUrl: 'http://alpha.stream-cdn.net:8080/live/u/p/202.m3u8',
      durationSeconds: 45,
    });

    engine.recordChannelWatch({
      channelId: '303',
      sourceId: srcM3u.id,
      sourceName: srcM3u.name,
      channelName: 'Discovery Science HD',
      category: 'Documentary',
      streamUrl: 'https://beta.tv-sports.org/hls/live/303.m3u8',
      durationSeconds: 60,
    });

    // Re-tune to 202 to verify deduplication and order bumping to front
    engine.recordChannelWatch({
      channelId: '202',
      sourceId: srcXtream.id,
      sourceName: srcXtream.name,
      channelName: 'HBO Max Cinema 4K',
      durationSeconds: 30,
    });

    const recents = engine.getRecentChannels();
    const topRecent = recents[0];
    const item202 = recents.find((r) => r.compositeKey === `${srcXtream.id}:::202`);

    assert(
      recents.length >= 3 &&
      topRecent.channelId === '202' &&
      item202 !== undefined &&
      item202.tuneCount >= 2 &&
      item202.totalWatchDurationSeconds >= 75,
      'Milestone 29',
      'TEST-M29-04: Ordered Recent Channels History with Deduplication & Cumulative Duration',
      `Top Channel: ${topRecent.channelName}, Total Watched: ${item202?.totalWatchDurationSeconds}s (Tunes: ${item202?.tuneCount})`
    );
  }

  // TEST-M29-05: Playback Position Memory & Offset Resumption
  {
    const savedPos = engine.savePlaybackPosition({
      mediaId: 'vod-dune-2',
      sourceId: srcXtream.id,
      title: 'Dune: Part Two (2024)',
      positionSeconds: 3600, // 1 hour into movie
      durationSeconds: 9960, // 2h 46m
    });

    const retrieved = engine.getPlaybackPosition(srcXtream.id, 'vod-dune-2');

    assert(
      retrieved !== null &&
      retrieved.positionSeconds === 3600 &&
      retrieved.durationSeconds === 9960 &&
      retrieved.percentage === 36 &&
      retrieved.sourceId === srcXtream.id,
      'Milestone 29',
      'TEST-M29-05: Playback Position Memory for VOD/Catchup Media Resumption',
      `Position: ${retrieved?.positionSeconds}s / ${retrieved?.durationSeconds}s (${retrieved?.percentage}%)`
    );
  }

  // TEST-M29-06: Playback Auto-Restoration Safety Guard
  // Requirement: "Do not restore playback automatically if the provider/source is unavailable."
  {
    // 1. Valid Active Source: Restoration should be APPROVED
    const activeResult = engine.evaluatePlaybackRestoration();
    const canRestoreActive = activeResult.canRestore;

    // 2. Tune to a channel on OFFLINE source
    engine.recordChannelWatch({
      channelId: '901',
      sourceId: srcOffline.id,
      sourceName: srcOffline.name,
      channelName: 'Satellite Feed Gamma',
      streamUrl: 'rtp://239.255.0.1:5000',
    });

    const offlineResult = engine.evaluatePlaybackRestoration();

    // 3. Tune to a channel on AUTH_EXPIRED source
    engine.recordChannelWatch({
      channelId: '902',
      sourceId: srcExpired.id,
      sourceName: srcExpired.name,
      channelName: 'Premium Pass VIP',
      streamUrl: 'http://delta.tv:8080/live/user/pass/902.ts',
    });

    const expiredResult = engine.evaluatePlaybackRestoration();

    assert(
      canRestoreActive &&
      !offlineResult.canRestore &&
      offlineResult.reason?.includes('unavailable') &&
      !expiredResult.canRestore &&
      expiredResult.reason?.includes('AUTH_EXPIRED'),
      'Milestone 29',
      'TEST-M29-06: Playback Auto-Restoration Safety Guard (Blocks Offline/Expired Sources)',
      `Active: ${canRestoreActive ? 'Allowed' : 'Blocked'} | Offline: ${offlineResult.canRestore ? 'Allowed' : 'Blocked'} | Expired: ${expiredResult.canRestore ? 'Allowed' : 'Blocked'}`
    );
  }

  console.log('=======================================================================');
  console.log(`Total Assertions: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);

  return {
    milestone: 'Milestone 29 - Favorites & Watch History',
    total: passedCount + failedCount,
    passed: passedCount,
    failed: failedCount,
    results: testResults,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMilestone29TestSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

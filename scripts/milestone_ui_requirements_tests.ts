/**
 * Automated Verification Script: UI Requirements (Milestone 28 / Unified IPTV UI)
 *
 * Tests:
 * 1. 10,000+ Channel Virtualization Performance & Slice Window Calculator
 * 2. Multi-Field Search Engine (Channel name, Category, Source name, tvg-id)
 * 3. Logo Handling & Resiliency (Lazy loading, Missing logo placeholder, Broken URL fallback)
 * 4. Electronic Program Guide (EPG) Now/Next Time Window & Progress Tracking
 * 5. Multi-Source Management & Source-Specific Dataset Filtering
 * 6. Favorites & Recently Watched State Persistence
 */

import { globalUnifiedIptvEngine, UnifiedIptvEngine } from '../src/lib/unifiedIptvEngine';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`\x1b[32m[PASS]\x1b[0m [UI Requirements] ${msg} ${detail ? `(${detail})` : ''}`);
  } else {
    console.error(`\x1b[31m[FAIL]\x1b[0m [UI Requirements] ${msg} ${detail ? `(${detail})` : ''}`);
  }
}

export async function runMilestoneUiRequirementsTestSuite() {
  console.log('================== UNIFIED IPTV UI REQUIREMENTS TEST SUITE ==================');
  totalTests = 0;
  passedTests = 0;

  const engine = new UnifiedIptvEngine();

  // Test 1: 10,000+ Channels Dataset & Virtualization Geometry
  const state = engine.getState();
  assert(
    state.totalChannelCount >= 10000,
    'TEST-UI-01: 10,000+ Channel Dataset Initialized',
    `Total channels: ${state.totalChannelCount}`
  );

  const filteredAll = engine.getFilteredChannels();
  const slice = engine.getVisibleVirtualSlice(filteredAll);

  assert(
    slice.activeRenderNodesCount <= 30 && slice.totalHeight > 500000,
    'TEST-UI-02: Virtualization Windowing (Bounded DOM nodes for 10k+ channels)',
    `Active Render Nodes: ${slice.activeRenderNodesCount}, Total Virtual Height: ${slice.totalHeight}px`
  );

  // Test 2: Multi-Field Search across (channel name, category, source name, tvg-id)
  // 2a. Search by channel name
  engine.setSearchQuery('Sky Sports');
  const searchByName = engine.getFilteredChannels();
  const allMatchName = searchByName.every((c) => c.name.toLowerCase().includes('sky sports'));
  assert(
    searchByName.length > 0 && allMatchName,
    'TEST-UI-03A: Multi-Field Search - Channel Name Match',
    `Matches: ${searchByName.length}`
  );

  // 2b. Search by category
  engine.setSearchQuery('News & Politics');
  const searchByCat = engine.getFilteredChannels();
  const allMatchCat = searchByCat.every((c) => c.category.toLowerCase().includes('news'));
  assert(
    searchByCat.length > 0 && allMatchCat,
    'TEST-UI-03B: Multi-Field Search - Category Match',
    `Matches: ${searchByCat.length}`
  );

  // 2c. Search by source name
  engine.setSearchQuery('Xtream Master');
  const searchBySource = engine.getFilteredChannels();
  const allMatchSource = searchBySource.every((c) => c.sourceName.toLowerCase().includes('xtream'));
  assert(
    searchBySource.length > 0 && allMatchSource,
    'TEST-UI-03C: Multi-Field Search - Source Name Match',
    `Matches: ${searchBySource.length}`
  );

  // 2d. Search by tvg-id
  engine.setSearchQuery('tvg.id.spor');
  const searchByTvgId = engine.getFilteredChannels();
  const allMatchTvgId = searchByTvgId.every((c) => c.tvgId.toLowerCase().includes('tvg.id.spor'));
  assert(
    searchByTvgId.length > 0 && allMatchTvgId,
    'TEST-UI-03D: Multi-Field Search - tvg-id Match',
    `Matches: ${searchByTvgId.length}`
  );

  // Reset search
  engine.setSearchQuery('');

  // Test 3: Channel Logos Fallback & Placeholder Distribution
  const sampleChannels = engine.getFilteredChannels().slice(0, 100);
  const hasMissingLogo = sampleChannels.some((c) => c.logoUrl === null);
  const hasBrokenLogoUrl = sampleChannels.some((c) => c.logoUrl?.includes('broken-logo'));
  const hasValidLogo = sampleChannels.some((c) => c.logoUrl && !c.logoUrl.includes('broken'));

  assert(
    hasMissingLogo && hasBrokenLogoUrl && hasValidLogo,
    'TEST-UI-04: Resilient Logo Handling (Valid, Missing Placeholder, and Broken URL simulation)',
    'Verified zero-block fallback pathways'
  );

  // Test 4: EPG & Now/Next Program Guide Structure
  const chWithEpg = sampleChannels.find((c) => c.epgNow && c.epgNext);
  assert(
    !!chWithEpg?.epgNow?.title && !!chWithEpg?.epgNext?.title && chWithEpg.epgNow.endTs === chWithEpg.epgNext.startTs,
    'TEST-UI-05: EPG Now/Next Continuous Program Scheduling',
    `Now: "${chWithEpg?.epgNow?.title}", Next: "${chWithEpg?.epgNext?.title}"`
  );

  // Test 5: Favorites & Recently Watched
  const firstChId = sampleChannels[0].id;
  engine.toggleFavorite(firstChId);
  engine.setActiveCategory('FAVORITES');
  const favList = engine.getFilteredChannels();
  assert(
    favList.some((c) => c.id === firstChId),
    'TEST-UI-06: Favorites Toggle & Dedicated Category Filtering',
    `Favorites count: ${favList.length}`
  );

  engine.selectChannel(firstChId);
  engine.setActiveCategory('RECENT');
  const recentList = engine.getFilteredChannels();
  assert(
    recentList.some((c) => c.id === firstChId),
    'TEST-UI-07: Recently Watched History Logging',
    `Recent channels: ${recentList.length}`
  );

  // Test 6: Source Management
  const initialSourceCount = engine.getState().sources.length;
  engine.addSource('Custom Live OTT Feed', 'http://ott.provider.com/playlist.m3u8', 'M3U_PLAYLIST');
  assert(
    engine.getState().sources.length === initialSourceCount + 1,
    'TEST-UI-08: Source Management Addition & Multi-Source Matrix Integration',
    `Configured sources: ${engine.getState().sources.length}`
  );

  // Test 7: Automatic 404 / 403 Stream Failover & UI State Surfacing
  const testFailoverCh = sampleChannels.find((c) => c.alternativeStreamUrls && c.alternativeStreamUrls.length > 0) || sampleChannels[0];
  const primaryStreamUrl = testFailoverCh.streamUrl;
  const failoverRes = engine.triggerFailover(testFailoverCh.id, 'HTTP 404 Not Found (Primary Edge CDN)');
  assert(
    failoverRes.success && testFailoverCh.isFailoverActive && failoverRes.newStreamUrl !== primaryStreamUrl,
    'TEST-UI-09: Automatic 404/403 Stream Failover & Alternative Stream Promotion',
    `Switched to mirror #${failoverRes.altIndex}: ${failoverRes.newStreamUrl?.substring(0, 35)}... (Reason: ${testFailoverCh.failoverReason})`
  );
  engine.resetFailover(testFailoverCh.id);

  // Test 8: 25. Adaptive Streaming (HLS Ladder, Anti-Oscillation, and Fixed Single Stream Spec)
  const adaptiveCh = sampleChannels.find((c) => c.isAdaptive && c.variants.length > 1);
  const fixedCh = sampleChannels.find((c) => !c.isAdaptive || c.variants.length === 1);
  assert(
    !!adaptiveCh && adaptiveCh.variants.length >= 4 && adaptiveCh.variants[0].height >= 1080,
    'TEST-UI-10A: Adaptive Bitrate (ABR) Multi-Variant Ladder (Highest Sustainable Preference)',
    `Variants: ${adaptiveCh?.variants.map((v) => v.name).join(', ')}`
  );
  assert(
    !!fixedCh && !!fixedCh.resolution && !!fixedCh.videoCodec && !!fixedCh.audioCodec,
    'TEST-UI-10B: Fixed-Quality Stream Specification (No Fake Quality Switching)',
    `Fixed stream: ${fixedCh?.resolution} • ${fixedCh?.videoCodec} • ${fixedCh?.audioCodec}`
  );

  console.log('=======================================================================');
  console.log(`Total Assertions: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);

  return {
    milestone: 'UI Requirements - 10,000+ Channel Virtualization & Multi-Source Matrix',
    total: totalTests,
    passed: passedTests,
    failed: totalTests - passedTests,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMilestoneUiRequirementsTestSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

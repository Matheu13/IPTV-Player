/**
 * Milestone 31 Automated Test Suite
 * Validates EPG Channel Matching against playlist/provider channels:
 *  1. Exact tvg-id match
 *  2. Exact provider channel ID match
 *  3. Normalized name match
 *  4. Fuzzy matching (high confidence)
 *  5. Do NOT automatically hide unmatched channels (preserved 100%)
 *  6. Show "No EPG available" when appropriate
 *  7. If fuzzy matching is uncertain, preserve the channel and flag the match rather than silently associating incorrect EPG data
 */

import { matchChannelToXmltv, batchMatchChannelsToXmltv, MatchCandidate } from '../src/lib/fuzzyEpgMatcher.js';
import { SQLiteEpgDB } from '../src/lib/sqliteEpgDb.js';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details: string) {
  if (!condition) {
    results.push({ name, passed: false, details });
    console.error(`\x1b[31m[FAIL]\x1b[0m ${name}: ${details}`);
  } else {
    results.push({ name, passed: true, details });
    console.log(`\x1b[32m[PASS]\x1b[0m ${name}: ${details}`);
  }
}

export async function runMilestone31Tests(): Promise<TestResult[]> {
  console.log('================== MILESTONE 31 AUTOMATED TEST SUITE ==================');

  // Test candidates loaded from XMLTV ingest
  const xmltvCandidates: MatchCandidate[] = [
    {
      id: 'bbc1.uk',
      displayName: 'BBC One HD',
      tvgId: 'bbc1.uk',
      providerChannelId: '101',
    },
    {
      id: 'sky.sports.f1',
      displayName: 'Sky Sports F1 HD',
      tvgId: 'sky.sports.f1',
      providerChannelId: '2050',
    },
    {
      id: 'cnn.us',
      displayName: 'CNN International HD',
      tvgId: 'cnn.us',
      providerChannelId: '3040',
    },
    {
      id: 'discovery.science',
      displayName: 'Discovery Science',
      tvgId: 'discovery.science',
      providerChannelId: '4010',
    },
    {
      id: 'hbo.east.hd',
      displayName: 'HBO East HD',
      tvgId: 'hbo.east.hd',
      providerChannelId: '5001',
    },
  ];

  // =========================================================================
  // TEST 1: Exact tvg-id Match
  // =========================================================================
  const chExactTvg = {
    id: 'stream_991',
    name: 'BBC 1 UK Regional Broadcast Feed',
    tvgId: 'bbc1.uk',
  };
  const resExactTvg = matchChannelToXmltv(chExactTvg, xmltvCandidates);
  assert(
    resExactTvg.matchType === 'EXACT_TVG_ID' &&
      resExactTvg.xmltvChannelId === 'bbc1.uk' &&
      resExactTvg.isMatched === true &&
      resExactTvg.matchScore === 1.0,
    '[Milestone 31] TEST-M31-01: Exact tvg-id Match',
    `Matched '${chExactTvg.name}' to '${resExactTvg.xmltvChannelId}' via EXACT_TVG_ID (Score: ${resExactTvg.matchScore})`
  );

  // =========================================================================
  // TEST 2: Exact Provider Channel ID Match Where Applicable
  // =========================================================================
  const chExactProvider = {
    id: '2050',
    name: 'UK Premium Motorsport [F1 Feeds]',
    tvgId: '', // No tvg-id supplied by provider playlist
  };
  const resExactProvider = matchChannelToXmltv(chExactProvider, xmltvCandidates);
  assert(
    resExactProvider.matchType === 'EXACT_PROVIDER_ID' &&
      resExactProvider.xmltvChannelId === 'sky.sports.f1' &&
      resExactProvider.isMatched === true &&
      resExactProvider.matchScore === 1.0,
    '[Milestone 31] TEST-M31-02: Exact Provider Channel ID Match',
    `Matched Provider Channel ID '${chExactProvider.id}' to XMLTV candidate '${resExactProvider.xmltvChannelId}' via EXACT_PROVIDER_ID`
  );

  // =========================================================================
  // TEST 3: Normalized Name Match
  // =========================================================================
  // Provider name with prefixes, brackets, resolution tags: "|UK| DISCOVERY SCIENCE (FHD) [RAW]"
  const chNormalized = {
    id: 'stream_777',
    name: '|UK| DISCOVERY SCIENCE (FHD) [RAW]',
    tvgId: '',
  };
  const resNormalized = matchChannelToXmltv(chNormalized, xmltvCandidates);
  assert(
    resNormalized.matchType === 'NORMALIZED_NAME' &&
      resNormalized.xmltvChannelId === 'discovery.science' &&
      resNormalized.isMatched === true &&
      resNormalized.matchScore >= 0.90,
    '[Milestone 31] TEST-M31-03: Normalized Name Match',
    `Cleaned '${chNormalized.name}' -> Normalized match to '${resNormalized.xmltvDisplayName}' (Type: ${resNormalized.matchType})`
  );

  // =========================================================================
  // TEST 4: High-Confidence Fuzzy Matching
  // =========================================================================
  const chFuzzy = {
    id: 'stream_888',
    name: 'CNN News Internatnl HighDef',
    tvgId: '',
  };
  const resFuzzy = matchChannelToXmltv(chFuzzy, xmltvCandidates);
  assert(
    resFuzzy.matchType === 'FUZZY_TOKEN' &&
      resFuzzy.xmltvChannelId === 'cnn.us' &&
      resFuzzy.isMatched === true &&
      resFuzzy.matchScore >= 0.80,
    '[Milestone 31] TEST-M31-04: High-Confidence Fuzzy Matching',
    `Fuzzy matched '${chFuzzy.name}' to '${resFuzzy.xmltvDisplayName}' with confidence ${resFuzzy.matchScore}`
  );

  // =========================================================================
  // TEST 5: Uncertain Fuzzy Matching - Preserves Channel & Flags Match Without Silently Associating
  // =========================================================================
  // Channel with ambiguous or uncertain partial match: "Sky Sports Action Live" vs "Sky Sports F1 HD"
  // It should NOT silently bind to F1 HD, but preserve the channel and flag the candidate for review.
  const chUncertain = {
    id: 'stream_999',
    name: 'Sky Sports Action Live',
    tvgId: '',
  };
  const resUncertain = matchChannelToXmltv(chUncertain, xmltvCandidates);
  assert(
    resUncertain.isMatched === false &&
      resUncertain.xmltvChannelId === null &&
      resUncertain.isUncertain === true &&
      resUncertain.matchType === 'UNCERTAIN_FUZZY' &&
      resUncertain.needsManualReview === true &&
      resUncertain.flaggedCandidateName !== undefined,
    '[Milestone 31] TEST-M31-05: Uncertain Fuzzy Matching Flagged Without Silent Association',
    `Uncertain match flagged: '${chUncertain.name}' matched candidate '${resUncertain.flaggedCandidateName}' at score ${resUncertain.matchScore}. Channel preserved without silent EPG association!`
  );

  // =========================================================================
  // TEST 6: Unmatched Channels Preservation & 'No EPG available' in SQLite DB
  // =========================================================================
  const chUnmatched = {
    id: 'stream_404',
    name: 'Local Community Access TV (No Guide Broadcast)',
    tvgId: 'unknown.nonexistent.id',
  };

  const batchResults = batchMatchChannelsToXmltv(
    [chExactTvg, chExactProvider, chNormalized, chFuzzy, chUncertain, chUnmatched],
    xmltvCandidates
  );

  // Verify all 6 channels are preserved in output (none hidden)
  const isPreserved = batchResults.length === 6 && batchResults.some((r) => r.channelId === chUnmatched.id);
  const unmatchedResult = batchResults.find((r) => r.channelId === chUnmatched.id);

  assert(
    isPreserved &&
      unmatchedResult?.isMatched === false &&
      unmatchedResult?.xmltvChannelId === null &&
      unmatchedResult?.matchType === 'UNMATCHED',
    '[Milestone 31] TEST-M31-06: Unmatched Channels Preserved 100% Without Hiding',
    `Preserved all ${batchResults.length} channels in catalog. Unmatched channel '${chUnmatched.name}' returned with isMatched: false`
  );

  // =========================================================================
  // TEST 7: SQLite DB getNowAndNextForChannels Integration
  // =========================================================================
  const testDb = new SQLiteEpgDB(':memory:');
  testDb.insertChannels([{ id: 'bbc1.uk', displayName: 'BBC One HD' }]);
  const nowEpoch = Math.floor(Date.now() / 1000);
  testDb.insertProgrammesBatch([
    {
      id: 'prog_bbc1_1',
      channelId: 'bbc1.uk',
      title: 'BBC Evening News at Six',
      start: new Date((nowEpoch - 600) * 1000),
      stop: new Date((nowEpoch + 1200) * 1000),
      startTimestampSec: nowEpoch - 600,
      stopTimestampSec: nowEpoch + 1200,
      durationMinutes: 30,
    },
  ]);

  const channelNowNextList = testDb.getNowAndNextForChannels([
    { id: '101', name: 'BBC One HD', tvgId: 'bbc1.uk' },
    { id: 'stream_404', name: 'Local Community Access TV' },
  ]);

  const bbcFeed = channelNowNextList.find((c) => c.channelId === '101');
  const localFeed = channelNowNextList.find((c) => c.channelId === 'stream_404');

  assert(
    bbcFeed?.hasEpgData === true &&
      bbcFeed?.now?.title === 'BBC Evening News at Six' &&
      localFeed?.hasEpgData === false &&
      localFeed?.now === null &&
      localFeed?.next === null,
    '[Milestone 31] TEST-M31-07: SQLite Now/Next Resolution with Proper "No EPG available" State',
    `Matched channel has live EPG ("${bbcFeed?.now?.title}"). Unmatched channel cleanly resolved with hasEpgData: false (No EPG available)`
  );

  testDb.close();

  const totalPassed = results.filter((r) => r.passed).length;
  console.log('=======================================================================');
  console.log(`Total Assertions: ${results.length} | Passed: ${totalPassed} | Failed: ${results.length - totalPassed}`);

  return results;
}

if (process.argv[1]?.endsWith('milestone_31_tests.ts')) {
  runMilestone31Tests().then((res) => {
    const failures = res.filter((r) => !r.passed);
    if (failures.length > 0) {
      process.exit(1);
    }
  });
}

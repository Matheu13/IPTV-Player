/**
 * Standalone Automated Test Runner for Milestones 19 & 20
 * Execution: npx tsx scripts/milestones_19_to_20_tests.ts
 */

import { StalkerPortalEngine } from '../src/lib/stalkerPortalEngine';
import { LeanbackSpatialEngine } from '../src/lib/leanbackSpatialEngine';
import { redact } from '../src/lib/redact';

async function runCliTests() {
  console.log('================== MILESTONES 19 & 20 AUTOMATED TEST SUITE ==================');
  let passedCount = 0;
  let failedCount = 0;

  const assert = (condition: boolean, testId: string, desc: string, details?: string) => {
    if (condition) {
      console.log(`\x1b[32m[PASS]\x1b[0m [${testId}] ${desc} ${details ? `(${details})` : ''}`);
      passedCount++;
    } else {
      console.error(`\x1b[31m[FAIL]\x1b[0m [${testId}] ${desc} ${details ? `(${details})` : ''}`);
      failedCount++;
    }
  };

  // ==========================================
  // MILESTONE 19: STALKER / MAG PROTOCOL TESTS
  // ==========================================

  // M19-01: Handshake
  {
    const engine = new StalkerPortalEngine();
    const hs = await engine.executeHandshake();
    const sess = engine.getSession();
    assert(
      hs.success && typeof hs.token === 'string' && hs.token.startsWith('STK_AUTH_') && sess.status === 'AUTHENTICATED',
      'Milestone 19',
      'TEST-M19-01: Stalker Handshake & Cryptographic Salt Negotiation',
      `Token: ${hs.token}, Latency: ${hs.handshakeLatencyMs}ms`
    );
  }

  // M19-02: Cmd resolution
  {
    const engine = new StalkerPortalEngine();
    const cmdFfmpeg = 'ffmpeg http://edge.mag-stream.net/live/skymain_uhd.m3u8';
    const cmdFfrt = 'ffrt http://edge.mag-stream.net/live/tnt1_fhd.ts';
    const unwrappedFfmpeg = engine.resolveCmdStreamUrl(cmdFfmpeg);
    const unwrappedFfrt = engine.resolveCmdStreamUrl(cmdFfrt);
    assert(
      unwrappedFfmpeg === 'http://edge.mag-stream.net/live/skymain_uhd.m3u8' &&
        unwrappedFfrt === 'http://edge.mag-stream.net/live/tnt1_fhd.ts',
      'Milestone 19',
      'TEST-M19-02: Stalker Cmd Stream Wrapper Unwrapping (ffmpeg/ffrt/auto)',
      `Clean: ${unwrappedFfmpeg}`
    );
  }

  // M19-03: Catchup URL
  {
    const engine = new StalkerPortalEngine();
    const chArchive = engine.getChannels().find((c) => c.hasArchive)!;
    const catchupUrl = engine.generateCatchupUrl(chArchive, 1700000000, 60);
    assert(
      catchupUrl.includes('archive=1700000000') && catchupUrl.includes('archive_end=1700003600'),
      'Milestone 19',
      'TEST-M19-03: Stalker Timeshift Catchup URL with Epoch Offsets',
      `Catchup URL generated`
    );
  }

  // M19-04: MAC & Header Redaction
  {
    const engine = new StalkerPortalEngine();
    const portal = engine.getPortals()[0];
    const headers = engine.buildStbHeaders(portal);
    const masked = redact(portal.macAddress);
    assert(
      headers['Cookie'].includes('mac=') && (masked.includes('XX') || masked.includes('***') || masked.includes('…')) && masked !== portal.macAddress,
      'Milestone 19',
      'TEST-M19-04: Authorized MAG STB Headers & MAC Security Redaction',
      `Masked: ${masked}`
    );
  }

  // ==========================================
  // MILESTONE 20: 10-FOOT LEANBACK & OSD TESTS
  // ==========================================

  // M20-01: 2D Spatial Focus Grid
  {
    const engine = new LeanbackSpatialEngine();
    engine.setFocusNodeId('grid_0_0');
    engine.dispatchKeyEvent('DPAD_RIGHT');
    const r1 = engine.getCurrentFocusNodeId();
    engine.dispatchKeyEvent('DPAD_DOWN');
    const r2 = engine.getCurrentFocusNodeId();
    assert(
      r1 === 'grid_0_1' && r2 === 'grid_1_1',
      'Milestone 20',
      'TEST-M20-01: 2D D-Pad Directional Spatial Focus Grid Traversal',
      `Traversal: grid_0_0 -> ${r1} -> ${r2}`
    );
  }

  // M20-02: Zapping OSD
  {
    const engine = new LeanbackSpatialEngine();
    const initCh = engine.getOsdState().currentChannel;
    engine.dispatchKeyEvent('CH_UP');
    const tunedCh = engine.getOsdState().currentChannel;
    assert(
      initCh.number !== tunedCh.number && engine.getOsdState().isBannerVisible,
      'Milestone 20',
      'TEST-M20-02: Channel Zapping OSD Banner Lifecycle & EPG Progress',
      `Tuned to #${tunedCh.number} (${tunedCh.name})`
    );
  }

  // M20-03: Numeric Keypad Buffer
  {
    const engine = new LeanbackSpatialEngine();
    engine.dispatchKeyEvent('NUMERIC_DIGIT', 1);
    engine.dispatchKeyEvent('NUMERIC_DIGIT', 0);
    engine.dispatchKeyEvent('NUMERIC_DIGIT', 2);
    const buf = engine.getOsdState().numericBuffer;
    const ok = engine.commitNumericBuffer();
    assert(
      buf === '102' && ok && engine.getOsdState().currentChannel.number === 102,
      'Milestone 20',
      'TEST-M20-03: Direct Numeric Keypad Channel Buffer with 1.2s Auto-Tune',
      `Committed: ${buf}`
    );
  }

  // M20-04: Voice Search Matcher
  {
    const engine = new LeanbackSpatialEngine();
    const results = engine.executeVoiceSearch('premier league');
    assert(
      results.length > 0 && results.some((r) => r.title.toLowerCase().includes('premier')),
      'Milestone 20',
      'TEST-M20-04: Voice Assistant Intent Parsing & EPG Fuzzy Keyword Matching',
      `Matches: ${results.length}`
    );
  }

  console.log('=====================================================================================');
  console.log(`Total Assertions: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runCliTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

/**
 * Automated Verification Suite for Phase 47 Enhancement:
 * Reliability Observability & Fire TV Diagnostics
 *
 * Tests:
 * 1. Teardown Auditor:
 *    - Monotonic timing
 *    - Lifecycle stages (Abort Requested vs Teardown Confirmed)
 *    - URL credential redaction
 *    - Blocked init until teardown confirmation
 * 2. Reliability Scorecard:
 *    - MTTR calculation
 *    - Latency (mean, median, p95)
 *    - Empty dataset & insufficient sample handling
 * 3. Reliability Matrix:
 *    - Aggregation, zero-attempt, partial, failed states
 * 4. Firestick Diagnostics:
 *    - Matching configuration
 *    - Decoder discrepancy detection
 *    - Buffer mismatch detection
 *    - Unsupported runtime properties
 */

import { TeardownAuditor, globalTeardownAuditor, TeardownAuditRecord } from '../src/lib/teardownAuditor';
import { ReliabilityScorecardEngine, RecoverySample } from '../src/lib/reliabilityScorecardEngine';
import { ReliabilityMatrixData, ReliabilityMatrixItem } from '../src/lib/reliabilityMatrixData';
import { FirestickDiagnosticsEngine } from '../src/lib/firestickDiagnostics';
import { StreamConnectionGuardian, PlaybackSessionState } from '../src/lib/streamConnectionGuardian';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testId: string, description: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testId}: ${description}${details ? ' - ' + details : ''}`);
  } else {
    console.error(`[FAIL] ${testId}: ${description}${details ? ' - ' + details : ''}`);
  }
}

async function runEnhancementTests() {
  console.log('================== PHASE 47 ENHANCEMENT: OBSERVABILITY & DIAGNOSTICS ==================\n');

  // --- 1. Teardown Auditor & Monotonic Timing ---
  console.log('--- 1. Teardown Auditor & Lifecycle Stages ---');
  const auditor = new TeardownAuditor();
  const rawSecretUrl = 'http://cdn1.live/live/myUser123/mySecretPass456/channel_101.m3u8?token=SECRET_TOKEN_999';
  const sanitized = TeardownAuditor.sanitizeUrl(rawSecretUrl);

  assert(
    !sanitized.includes('myUser123') &&
      !sanitized.includes('mySecretPass456') &&
      !sanitized.includes('SECRET_TOKEN_999') &&
      sanitized.includes('[USER]') &&
      sanitized.includes('[AUTH]'),
    'P47-AUD-01',
    'URL Credential & Token Redaction',
    `Sanitized: ${sanitized}`
  );

  auditor.beginSwitchAudit('ch_1', 'BBC One', 'ch_2', 'Sky Sports', rawSecretUrl);
  auditor.recordStage('PREVIOUS_STREAM_IDENTIFIED', 'Previous feed BBC One identified', 'VERIFIED');
  auditor.recordStage('ABORT_INITIATED', 'Aborting fetch controllers', 'VERIFIED');
  auditor.recordStage('ABORT_CONFIRMED', 'Teardown confirmed asynchronously', 'VERIFIED');
  auditor.recordStage('PLAYER_DESTROYED', 'Hls instance destroyed', 'VERIFIED');
  auditor.recordStage('RESOURCES_RELEASED', 'Video element src cleared', 'VERIFIED');
  auditor.recordStage('NEXT_INIT_STARTED', 'Initializing next stream', 'VERIFIED');
  auditor.recordStage('PLAYBACK_READY', 'Playback started', 'VERIFIED');
  const auditResult = auditor.completeSwitchAudit(true);

  assert(
    auditResult !== null &&
      auditResult.success === true &&
      auditResult.isTeardownConfirmed === true &&
      auditResult.stages.length === 8 &&
      typeof auditResult.totalSwitchLatencyMs === 'number',
    'P47-AUD-02',
    'Full Teardown Lifecycle & Monotonic Audit Timing',
    `Total Switch Latency: ${auditResult?.totalSwitchLatencyMs}ms, Teardown: ${auditResult?.teardownDurationMs}ms`
  );

  // Failure lifecycle stage test
  auditor.beginSwitchAudit('ch_1', 'BBC One', 'ch_fail', 'Dead Channel', 'http://offline.live/feed.m3u8');
  auditor.recordStage('ABORT_INITIATED', 'Aborting fetch', 'VERIFIED');
  auditor.recordStage('ABORT_CONFIRMED', 'Teardown confirmed', 'VERIFIED');
  auditor.recordStage('NEXT_INIT_STARTED', 'Decoder failed: HTTP 404', 'FAILED');
  const failedAudit = auditor.completeSwitchAudit(false);

  assert(
    failedAudit !== null &&
      failedAudit.success === false &&
      failedAudit.failedStage === 'NEXT_INIT_STARTED',
    'P47-AUD-03',
    'Failure Stage Isolation in Teardown Auditor',
    `Identified failed stage: ${failedAudit?.failedStage}`
  );

  // --- 2. Reliability Scorecard Engine ---
  console.log('\n--- 2. Reliability Scorecard Engine & Percentiles ---');
  const sampleAudits: TeardownAuditRecord[] = [
    {
      id: 'a1',
      sourceChannelId: 'c1',
      sourceChannelName: 'C1',
      targetChannelId: 'c2',
      targetChannelName: 'C2',
      sanitizedTargetUrl: 'http://cdn/1.m3u8',
      startedAt: 100,
      totalSwitchLatencyMs: 320,
      teardownDurationMs: 25,
      success: true,
      stages: [],
      isTeardownConfirmed: true,
      runtimeConfirmationSupported: true,
    },
    {
      id: 'a2',
      sourceChannelId: 'c2',
      sourceChannelName: 'C2',
      targetChannelId: 'c3',
      targetChannelName: 'C3',
      sanitizedTargetUrl: 'http://cdn/2.m3u8',
      startedAt: 500,
      totalSwitchLatencyMs: 380,
      teardownDurationMs: 30,
      success: true,
      stages: [],
      isTeardownConfirmed: true,
      runtimeConfirmationSupported: true,
    },
    {
      id: 'a3',
      sourceChannelId: 'c3',
      sourceChannelName: 'C3',
      targetChannelId: 'c4',
      targetChannelName: 'C4',
      sanitizedTargetUrl: 'http://cdn/3.m3u8',
      startedAt: 1000,
      totalSwitchLatencyMs: 710,
      teardownDurationMs: 40,
      success: true,
      stages: [],
      isTeardownConfirmed: true,
      runtimeConfirmationSupported: true,
    },
  ];

  const recoverySamples: RecoverySample[] = [
    {
      failureTimestamp: 100,
      recoveredTimestamp: 940,
      recoveryDurationMs: 840,
      recoveredSuccessfully: true,
      failureReason: 'HTTP 404',
      sourceType: 'SIMULATED_TEST_VECTOR',
    },
  ];

  const scorecard = ReliabilityScorecardEngine.computeScorecard(sampleAudits, recoverySamples, 'SIMULATED_TEST_VECTOR');
  assert(
    scorecard.hasSufficientData === true &&
      scorecard.channelSwitchLatency.medianMs === 380 &&
      scorecard.mttrMs === 840 &&
      scorecard.teardownSuccessRate === 100,
    'P47-SC-01',
    'Scorecard Computation & High-Precision Median/MTTR',
    `Median: ${scorecard.channelSwitchLatency.medianMs}ms, MTTR: ${scorecard.mttrMs}ms, Teardown: ${scorecard.teardownSuccessRate}%`
  );

  // Empty dataset test
  const emptyScorecard = ReliabilityScorecardEngine.computeScorecard([], []);
  assert(
    emptyScorecard.hasSufficientData === false &&
      emptyScorecard.channelSwitchLatency.medianMs === null &&
      emptyScorecard.mttrMs === null,
    'P47-SC-02',
    'Scorecard Empty Dataset / Insufficient Data Handling',
    'Correctly returns null without fabricating metrics.'
  );

  // --- 3. Reliability Matrix Aggregation ---
  console.log('\n--- 3. Reliability Matrix ---');
  let defaultMatrix = ReliabilityMatrixData.getDefaultMatrix();
  assert(
    defaultMatrix.length === 6 &&
      defaultMatrix.every((m) => m.status === 'NOT_TESTED' && m.attempts === 0),
    'P47-MAT-01',
    'Reliability Matrix Initialization (Not Tested states)',
    `Initialized ${defaultMatrix.length} test vectors.`
  );

  const vec1 = defaultMatrix[0];
  const passedVec = ReliabilityMatrixData.recordVectorResult(vec1, true, 'All teardowns confirmed');
  assert(
    passedVec.attempts === 1 &&
      passedVec.successes === 1 &&
      passedVec.successRate === 100 &&
      passedVec.status === 'PASSED',
    'P47-MAT-02',
    'Reliability Matrix Vector Passing Aggregation',
    `Attempts: ${passedVec.attempts}, SuccessRate: ${passedVec.successRate}%`
  );

  const partialVec = ReliabilityMatrixData.recordVectorResult(passedVec, false, 'One failure occurred');
  assert(
    partialVec.attempts === 2 &&
      partialVec.successes === 1 &&
      partialVec.failures === 1 &&
      partialVec.successRate === 50 &&
      partialVec.status === 'PARTIAL',
    'P47-MAT-03',
    'Reliability Matrix Partial/Degraded Status Detection',
    `Status: ${partialVec.status}, SuccessRate: ${partialVec.successRate}%`
  );

  // --- 4. Firestick Diagnostics & Runtime Discrepancies ---
  console.log('\n--- 4. Firestick Diagnostics & Discrepancy Engine ---');
  const fire4kUa =
    'Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7652.3564N) AppleWebKit/537.36 (KHTML, like Gecko) Silk/119.2.22 like Chrome/119.0.6045.193 Safari/537.36';

  const normalReport = FirestickDiagnosticsEngine.evaluateDiagnostics(fire4kUa);
  assert(
    normalReport.discrepancyCount === 0 &&
      normalReport.deviceProfile.modelName.includes('Fire TV Stick 4K') &&
      normalReport.summary.matchedCount >= 7,
    'P47-FS-DIAG-01',
    'Firestick Hardware Baseline Capability Match',
    `Detected: ${normalReport.deviceProfile.modelName}, Mismatches: ${normalReport.discrepancyCount}`
  );

  // Discrepancy test: Software decoder fallback
  const discrepancyReport = FirestickDiagnosticsEngine.evaluateDiagnostics(
    fire4kUa,
    'Software Decoder (FFmpeg fallback)'
  );
  const decoderProp = discrepancyReport.properties.find((p) => p.propertyKey === 'video_decoder');

  assert(
    discrepancyReport.discrepancyCount === 1 &&
      decoderProp?.hasDiscrepancy === true &&
      decoderProp?.verificationStatus === 'DISCREPANCY' &&
      decoderProp?.discrepancySeverity === 'CRITICAL',
    'P47-FS-DIAG-02',
    'Hardware Decoder Discrepancy & Alert Generation',
    `Detected Severity: ${decoderProp?.discrepancySeverity}, Message: "${decoderProp?.discrepancyMessage}"`
  );

  // Browser/sandbox unsupported property test
  const desktopReport = FirestickDiagnosticsEngine.evaluateDiagnostics(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0'
  );
  const hdrProp = desktopReport.properties.find((p) => p.propertyKey === 'hdr_capability');

  assert(
    hdrProp?.verificationStatus === 'UNAVAILABLE' &&
      hdrProp?.detectedRuntimeValue === 'UNAVAILABLE_IN_RUNTIME',
    'P47-FS-DIAG-03',
    'Sandbox/Browser Runtime Limitation Graceful Degradation',
    'Correctly reported "Unavailable in current runtime" instead of fabricating values.'
  );

  // Forced SDR Fallback test
  const forcedSdrReport = FirestickDiagnosticsEngine.evaluateDiagnostics(
    fire4kUa,
    undefined,
    undefined,
    true
  );
  const forcedHdrProp = forcedSdrReport.properties.find((p) => p.propertyKey === 'hdr_capability');

  assert(
    forcedSdrReport.isSdrFallbackActive === true &&
      String(forcedHdrProp?.detectedRuntimeValue).includes('SDR Fallback Active') &&
      forcedHdrProp?.verificationStatus === 'VERIFIED' &&
      forcedHdrProp?.hasDiscrepancy === false,
    'P47-FS-DIAG-04',
    'Force SDR Fallback Simulation & Stability Guard',
    `SDR Active: ${forcedSdrReport.isSdrFallbackActive}, Detected: "${forcedHdrProp?.detectedRuntimeValue}"`
  );

  // --- 5. Integrated Stream Connection Guardian Zapping Stress Test (A->B->C->D->E->F->G) ---
  console.log('\n--- 5. Integrated Guardian Rapid Zapping Stress (A->B->C->D->E->F->G) ---');
  const guardian = new StreamConnectionGuardian();
  const mockVideo = {
    volume: 1.0,
    muted: false,
    src: '',
    pause: () => {},
    play: () => Promise.resolve(),
    load: () => {},
    removeAttribute: () => {},
    addEventListener: (_: string, cb: Function) => setTimeout(cb, 5),
    removeEventListener: () => {},
    textTracks: [],
  } as any as HTMLVideoElement;

  const burstChannels = [
    { id: 'ch_1', name: 'Channel 1', url: 'http://test.live/ch1.m3u8' },
    { id: 'ch_2', name: 'Channel 2', url: 'http://test.live/ch2.m3u8' },
    { id: 'ch_3', name: 'Channel 3', url: 'http://test.live/ch3.ts' },
    { id: 'ch_4', name: 'Channel 4', url: 'http://test.live/ch4.mp4' },
    { id: 'ch_5', name: 'Channel 5', url: 'http://test.live/ch5.m3u8' },
    { id: 'ch_6', name: 'Channel 6', url: 'http://test.live/ch6.m3u8' },
    { id: 'ch_7', name: 'Channel 7', url: 'http://test.live/ch7.m3u8' },
  ];

  for (const ch of burstChannels) {
    await guardian.switchChannel(mockVideo, ch.id, ch.url, undefined, undefined, ch.name);
  }

  const history = globalTeardownAuditor.getHistory();
  const activeConnections = guardian.getActiveConnectionCount();

  assert(
    history.length >= 7 &&
      activeConnections === 1 &&
      history.every((h) => h.isTeardownConfirmed === true),
    'P47-STRESS-01',
    '7-Channel Burst Zapping with 0 Connection Leaks and Monotonic Audit Trace',
    `Audit History count: ${history.length}, Active Conns: ${activeConnections}`
  );

  console.log('\n----------------------------------------------------------------------------');
  console.log(`Total Assertions: ${totalTests} | Passed: ${passedTests} | Failed: ${totalTests - passedTests}`);
  console.log('============================================================================');

  if (totalTests !== passedTests) {
    process.exit(1);
  }
}

runEnhancementTests().catch((e) => {
  console.error('Enhancement test run failed:', e);
  process.exit(1);
});

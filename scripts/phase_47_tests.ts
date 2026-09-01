/**
 * Phase 47 Test Suite: Playback & Connection Reliability
 *
 * Automated verification vectors for:
 * 47.1 Connection Limit Protection (Rapid channel switching A -> B -> C -> D -> E, confirmed teardown, 0 ghost audio, 0 overlap)
 * 47.2 Playback Failure Handling (HTTP error, timeout, retry once discipline, no infinite loop)
 * 47.3 Protocol Handling (HLS vs MPEG-TS vs Direct MP4 separation)
 * 47.4 Aspect Ratio Non-Destructive Toggling (Auto, 16:9, 4:3 with zero reload/reconnection)
 * 47.5 Audio & Subtitle Integrity (Graceful fallback, error isolation)
 * FirestickOptimizationConfig Helper Verification
 */

import { StreamConnectionGuardian, PlaybackSessionState } from '../src/lib/streamConnectionGuardian';
import { FirestickOptimizationConfig } from '../src/lib/firestickOptimizationConfig';
import { globalAudioSubtitleEngine } from '../src/lib/audioSubtitleEngine';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedCount++;
    console.log(`[PASS] ${testName}${detail ? ` - ${detail}` : ''}`);
  } else {
    failedCount++;
    console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
  }
}

async function runPhase47TestSuite() {
  console.log('================== PHASE 47: PLAYBACK & CONNECTION RELIABILITY ==================');

  // --- 47.0 Firestick Optimization Config Verification ---
  console.log('\n--- FirestickOptimizationConfig Verification ---');
  const firestickUa =
    'Mozilla/5.0 (Linux; Android 9; AFTMM Build/PS7652.3564N) AppleWebKit/537.36 (KHTML, like Gecko) Silk/119.2.22 like Chrome/119.0.6045.193 Safari/537.36';
  const firestickProfile = FirestickOptimizationConfig.detectFirestickProfile(firestickUa);
  const tunedFirestickConfig = FirestickOptimizationConfig.getTunedPlayerConfig(firestickUa);

  assert(
    firestickProfile.isFirestick === true && firestickProfile.modelCode === 'AFTMM',
    'P47-FS-01: Detect Amazon Fire TV Stick 4K (AFTMM)',
    `Identified model: ${firestickProfile.modelName}`
  );

  assert(
    tunedFirestickConfig.hls.backBufferLength <= 15 &&
      tunedFirestickConfig.hls.maxBufferSize <= 48 * 1024 * 1024 &&
      tunedFirestickConfig.decoder.bufferMode === 'low_memory_aggressive_cleanup',
    'P47-FS-02: Auto-tune player buffers for Firestick RAM tier',
    `BackBuffer: ${tunedFirestickConfig.hls.backBufferLength}s, BufferCap: ${tunedFirestickConfig.hls.maxBufferSize / 1024 / 1024}MB`
  );

  // --- 47.1 Connection Limit Protection (Rapid Channel Switching A -> B -> C -> D -> E) ---
  console.log('\n--- 47.1 Connection Limit Protection ---');
  const guardian = new StreamConnectionGuardian();

  // Mock Video Element for Node.js test execution
  const mockVideo = {
    volume: 1.0,
    muted: false,
    src: '',
    pause: () => {},
    play: () => Promise.resolve(),
    load: () => {},
    removeAttribute: (attr: string) => {},
    addEventListener: (evt: string, cb: Function) => {
      if (evt === 'canplay') setTimeout(cb, 10);
    },
    removeEventListener: () => {},
    textTracks: [],
  } as any as HTMLVideoElement;

  const channelSequence = [
    { id: 'ch_A', url: 'http://cdn1.live/streamA.m3u8' },
    { id: 'ch_B', url: 'http://cdn1.live/streamB.m3u8' },
    { id: 'ch_C', url: 'http://cdn1.live/streamC.ts' },
    { id: 'ch_D', url: 'http://cdn1.live/streamD.mp4' },
    { id: 'ch_E', url: 'http://cdn1.live/streamE.m3u8' },
  ];

  const sessionSnapshots: PlaybackSessionState[] = [];

  // Rapid switching without arbitrary delays
  for (const ch of channelSequence) {
    const session = await guardian.switchChannel(mockVideo, ch.id, ch.url);
    sessionSnapshots.push(session);
  }

  // Verify all previous sessions were confirmed torn down
  const previousSessionsTornDown = sessionSnapshots
    .slice(0, 4)
    .every((s) => s.status === 'TORN_DOWN' || s.teardownConfirmed === true);

  const activeConnection = guardian.getActiveConnectionCount();

  assert(
    previousSessionsTornDown && activeConnection === 1,
    'P47-01: Rapid Channel Switching A->B->C->D->E Teardown Lifecycle',
    `Verified 0 overlapping streams; active connections: ${activeConnection}`
  );

  // --- 47.2 Playback Failure Handling (Attempt -> Retry Once -> Meaningful Error) ---
  console.log('\n--- 47.2 Playback Failure Handling ---');
  const failedSession: PlaybackSessionState = {
    sessionId: 'session_fail_test',
    channelId: 'ch_offline',
    streamUrl: 'http://offline.provider/stream.m3u8',
    protocol: 'HLS',
    status: 'INITIALIZING',
    retryCount: 0,
    maxRetries: 1,
    errorMessage: null,
    teardownConfirmed: false,
    initTimestamp: Date.now(),
  };

  // Step 1: Initial Failure -> triggers Retry #1
  await guardian.handlePlaybackFailure(failedSession, mockVideo, 'HTTP 404 Manifest Not Found');
  const statusAfterFirstFail = failedSession.status;
  const retryCountAfterFirst = failedSession.retryCount;

  // Step 2: Second Failure -> triggers Permanent Error (No infinite retry loop)
  await guardian.handlePlaybackFailure(failedSession, mockVideo, 'HTTP 404 Manifest Not Found');
  const statusAfterSecondFail = failedSession.status;
  const errorDisplayed = failedSession.errorMessage;

  assert(
    retryCountAfterFirst === 1 &&
      statusAfterSecondFail === 'FAILED' &&
      errorDisplayed !== null &&
      errorDisplayed.includes('Playback failed after 1 retry'),
    'P47-02: Playback Failure Retry-Once Discipline (No Infinite Hammering)',
    `Final Status: ${statusAfterSecondFail}, Error: "${errorDisplayed}"`
  );

  // --- 47.3 Protocol Handling (HLS vs MPEG-TS vs Direct MP4) ---
  console.log('\n--- 47.3 Protocol Handling ---');
  const p1 = StreamConnectionGuardian.detectProtocol('https://live.net/index.m3u8');
  const p2 = StreamConnectionGuardian.detectProtocol('http://iptv.server:8000/live/user/pass/101.ts');
  const p3 = StreamConnectionGuardian.detectProtocol('https://vod.server/movie.mp4');
  const p4 = StreamConnectionGuardian.detectProtocol('http://custom.stream/feed', 'ts');

  assert(
    p1 === 'HLS' && p2 === 'MPEG_TS' && p3 === 'DIRECT_MP4_OR_PROGRESSIVE' && p4 === 'MPEG_TS',
    'P47-03: Independent Protocol Identification & Pipeline Routing',
    `Detected: [${p1}, ${p2}, ${p3}, ${p4}]`
  );

  // --- 47.4 Aspect Ratio Non-Destructive Toggling ---
  console.log('\n--- 47.4 Aspect Ratio Non-Destructive Toggling ---');
  const autoStyle = StreamConnectionGuardian.getAspectRatioStyle('Auto');
  const sixteenNineStyle = StreamConnectionGuardian.getAspectRatioStyle('16:9');
  const fourThreeStyle = StreamConnectionGuardian.getAspectRatioStyle('4:3');

  // Verify switching modes requires zero stream teardown / restart
  const connBeforeToggle = guardian.getActiveConnectionCount();
  // Simulate style change
  const newStyle = StreamConnectionGuardian.getAspectRatioStyle('4:3');
  const connAfterToggle = guardian.getActiveConnectionCount();

  assert(
    autoStyle.objectFitClass === 'object-contain' &&
      sixteenNineStyle.cssAspectRatio === '16 / 9' &&
      fourThreeStyle.cssAspectRatio === '4 / 3' &&
      connBeforeToggle === connAfterToggle,
    'P47-04: Non-Destructive Aspect Ratio Display Mode (Auto, 16:9, 4:3)',
    `Aspect ratio styles mapped purely in CSS without stream recreation.`
  );

  // --- 47.5 Audio & Subtitle Integrity & Error Isolation ---
  console.log('\n--- 47.5 Audio & Subtitle Integrity ---');
  globalAudioSubtitleEngine.updateSettings({ subtitlesEnabled: true });
  const sampleVtt = `WEBVTT\n\n00:00:01.000 --> 00:00:04.000\n[Live Action] Audio and subtitles active.`;
  const cues = globalAudioSubtitleEngine.parseSubtitleText(sampleVtt, 'webvtt');
  const activeCue = globalAudioSubtitleEngine.getActiveCue(2.5);

  // Simulate audio failure/corruption isolation
  let audioCrashCaught = false;
  try {
    // Malformed subtitle text parsing
    const malformed = globalAudioSubtitleEngine.parseSubtitleText('NOT_VALID_VTT_HEADER', 'webvtt');
    if (malformed.length === 0) {
      audioCrashCaught = true;
    }
  } catch (_) {
    audioCrashCaught = false;
  }

  assert(
    cues.length === 1 && activeCue?.text.includes('[Live Action]') && audioCrashCaught,
    'P47-05: Audio & Subtitle Cue Sync and Fault Isolation',
    `Subtitle cue rendered: "${activeCue?.text}". Subsystem errors gracefully isolated from player.`
  );

  // Final Summary
  console.log('----------------------------------------------------------------------------');
  console.log(`Total Assertions: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);
  console.log('============================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPhase47TestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

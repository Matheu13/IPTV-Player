/**
 * Automated Test Suite for Adaptive Resolution Manager
 * 
 * Verifies:
 * - Defaulting to highest supported resolution (up to 4K UHD 3840x2160@60fps) when hardware acceleration is available.
 * - Hardware acceleration matrix & decoder API detection (DirectX 11, MediaCodec, VideoToolbox).
 * - Automatic resolution capping (1080p safe ceiling) when hardware acceleration is disabled.
 * - Dynamic bandwidth-based ladder adaptation (4K -> 2K -> 1080p -> 720p -> 480p).
 * - Emergency buffer starvation step-down & smooth recovery back to 4K.
 * - Display multi-scale / HiDPI / HDR10 BT.2020 capability mapping.
 * - Subscriber state notifications & policy controls.
 */

import {
  AdaptiveResolutionManager,
  STANDARD_RESOLUTION_TIERS,
  AdaptiveDecisionState,
} from '../src/lib/adaptiveResolutionManager';

export interface AdaptiveResolutionTestResult {
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
  error?: string;
}

const results: AdaptiveResolutionTestResult[] = [];

function assert(condition: boolean, testId: string, message: string) {
  if (!condition) {
    throw new Error(`[${testId}] ${message}`);
  }
}

async function runTest(testId: string, name: string, fn: () => Promise<string> | string) {
  const start = Date.now();
  try {
    const details = await fn();
    const durationMs = Date.now() - start;
    results.push({
      testId,
      name,
      passed: true,
      durationMs,
      details,
    });
    console.log(`\x1b[32m[PASS]\x1b[0m ${testId}: ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      testId,
      name,
      passed: false,
      durationMs,
      error: err.message,
    });
    console.error(`\x1b[31m[FAIL]\x1b[0m ${testId}: ${name} (${durationMs}ms) - ${err.message}`);
  }
}

export async function runAdaptiveResolutionManagerTestSuite() {
  results.length = 0;
  console.log('================== ADAPTIVE RESOLUTION MANAGER TEST SUITE ==================');

  // TEST 1: Default to 4K Ultra HD when Hardware Acceleration is Available & Bandwidth is High
  await runTest(
    'TEST-ARM-01',
    'Defaults to 4K Ultra HD (3840x2160@60fps) with Hardware Acceleration',
    () => {
      const arm = new AdaptiveResolutionManager();
      arm.setHardwareAccelerationOverride(true);
      arm.updateBandwidthMetrics(50.0, 15.0); // 50 Mbps bandwidth, 15s buffer

      const state = arm.getState();
      assert(state.currentTier.id === '2160p_4k', 'TEST-ARM-01', `Expected 2160p_4k, got ${state.currentTier.id}`);
      assert(state.currentTier.width === 3840 && state.currentTier.height === 2160, 'TEST-ARM-01', 'Resolution must be 3840x2160');
      assert(state.currentTier.fps === 60, 'TEST-ARM-01', 'FPS must be 60');
      assert(state.lastDecision.hardwareAccelerated === true, 'TEST-ARM-01', 'Hardware acceleration must be true');
      assert(state.lastDecision.isCappedByHardware === false, 'TEST-ARM-01', 'Must not be capped by hardware');

      return `Successfully defaulted to highest supported resolution: ${state.currentTier.label} (${state.currentTier.width}x${state.currentTier.height} @ ${state.currentTier.fps}fps) with HW acceleration.`;
    }
  );

  // TEST 2: Hardware Acceleration Verification & Decoder API Detection
  await runTest(
    'TEST-ARM-02',
    'Hardware Acceleration Decoder API & Codec Support Matrix',
    () => {
      const arm = new AdaptiveResolutionManager();
      const state = arm.getState();
      
      assert(state.hardware.isAvailable === true, 'TEST-ARM-02', 'Hardware acceleration should be available by default');
      assert(state.hardware.hevcHardwareSupported === true, 'TEST-ARM-02', 'HEVC hardware support expected');
      assert(state.hardware.av1HardwareSupported === true, 'TEST-ARM-02', 'AV1 hardware support expected');
      assert(state.hardware.zeroCopySurfaceActive === true, 'TEST-ARM-02', 'Zero-copy surface active expected');
      assert(state.hardware.api.length > 0, 'TEST-ARM-02', 'Decoder API name must be populated');

      return `Validated hardware decoder pipeline: ${state.hardware.api}, Zero-Copy Surface: Active, Supported Codecs: HEVC/AV1/VP9/H.264.`;
    }
  );

  // TEST 3: Safe Resolution Capping when Hardware Acceleration is Disabled
  await runTest(
    'TEST-ARM-03',
    'Resolution Capping (1080p Safe Ceiling) when Hardware Acceleration is Disabled',
    () => {
      const arm = new AdaptiveResolutionManager();
      // Even with massive bandwidth (100 Mbps), disabling hardware acceleration should prevent 4K/2K CPU burn
      arm.setHardwareAccelerationOverride(false);
      arm.updateBandwidthMetrics(100.0, 15.0);

      const state = arm.getState();
      assert(state.currentTier.id === '1080p_fhd', 'TEST-ARM-03', `Expected 1080p_fhd cap without HW acceleration, got ${state.currentTier.id}`);
      assert(state.lastDecision.isCappedByHardware === true, 'TEST-ARM-03', 'isCappedByHardware flag must be true');
      assert(state.lastDecision.hardwareAccelerated === false, 'TEST-ARM-03', 'Hardware acceleration must be false');

      return `Successfully protected CPU: Capped resolution to ${state.currentTier.label} (1080p) when hardware acceleration is disabled.`;
    }
  );

  // TEST 4: Bandwidth Adaptive Scaling across Resolution Tiers
  await runTest(
    'TEST-ARM-04',
    'Bandwidth-Aware Resolution Adaptation Ladder (4K -> 2K -> 1080p -> 720p -> 480p)',
    () => {
      const arm = new AdaptiveResolutionManager();
      arm.setHardwareAccelerationOverride(true);

      // Step 1: 30 Mbps -> 4K
      arm.setBandwidthDirect(30.0, 12.0);
      assert(arm.getState().currentTier.id === '2160p_4k', 'TEST-ARM-04', '30 Mbps should yield 2160p_4k');

      // Step 2: 18 Mbps -> 2K (1440p)
      arm.setBandwidthDirect(18.0, 12.0);
      assert(arm.getState().currentTier.id === '1440p_2k', 'TEST-ARM-04', '18 Mbps should yield 1440p_2k');

      // Step 3: 10 Mbps -> 1080p (Full HD)
      arm.setBandwidthDirect(10.0, 10.0);
      assert(arm.getState().currentTier.id === '1080p_fhd', 'TEST-ARM-04', '10 Mbps should yield 1080p_fhd');

      // Step 4: 5 Mbps -> 720p (HD)
      arm.setBandwidthDirect(5.0, 8.0);
      assert(arm.getState().currentTier.id === '720p_hd', 'TEST-ARM-04', '5 Mbps should yield 720p_hd');

      // Step 5: 2 Mbps -> 480p (SD)
      arm.setBandwidthDirect(2.0, 6.0);
      assert(arm.getState().currentTier.id === '480p_sd', 'TEST-ARM-04', '2 Mbps should yield 480p_sd');

      return 'Bandwidth ladder dynamically adjusted through all resolution tiers based on real-time Mbps thresholds.';
    }
  );

  // TEST 5: Buffer Depletion Emergency Protection & Recovery to 4K
  await runTest(
    'TEST-ARM-05',
    'Buffer Depletion Emergency Step-Down & Re-escalation to 4K upon Recovery',
    () => {
      const arm = new AdaptiveResolutionManager();
      arm.setHardwareAccelerationOverride(true);
      arm.setBandwidthDirect(45.0, 14.0);
      assert(arm.getState().currentTier.id === '2160p_4k', 'TEST-ARM-05', 'Should start at 4K');

      // Buffer plummets to 1.2s (< 2.0s critical threshold)
      arm.setBandwidthDirect(45.0, 1.2);
      const starvedState = arm.getState();
      assert(starvedState.currentTier.id === '1080p_fhd', 'TEST-ARM-05', 'Must emergency step-down to 1080p when buffer < 2s');

      // Buffer recovers to 15s
      arm.setBandwidthDirect(45.0, 15.0);
      const recoveredState = arm.getState();
      assert(recoveredState.currentTier.id === '2160p_4k', 'TEST-ARM-05', 'Must recover back to 4K when buffer restores');

      return `Buffer starvation emergency drop triggered at 1.2s buffer, then seamlessly recovered back to 4K Ultra HD when buffer restored to 15.0s.`;
    }
  );

  // TEST 6: Display Capability Detection (HDR10, BT.2020, High DPI)
  await runTest(
    'TEST-ARM-06',
    'Display Capabilities & HDR10 / BT.2020 Wide Color Gamut Detection',
    () => {
      const arm = new AdaptiveResolutionManager();
      arm.setDisplayDimensions(3840, 2160, 2.0, true);
      const state = arm.getState();

      assert(state.display.displayWidth === 3840, 'TEST-ARM-06', 'Display width mismatch');
      assert(state.display.displayHeight === 2160, 'TEST-ARM-06', 'Display height mismatch');
      assert(state.display.is4kCapable === true, 'TEST-ARM-06', 'is4kCapable must be true');
      assert(state.display.hdrSupported === true, 'TEST-ARM-06', 'hdrSupported must be true');

      return `Display dimensions verified: 3840x2160 (Effective: ${state.display.effectiveWidth}x${state.display.effectiveHeight}, DPR: 2.0, HDR10: Supported).`;
    }
  );

  // TEST 7: Policy Selection & State Subscription Reactivity
  await runTest(
    'TEST-ARM-07',
    'Adaptive Resolution Policies & Real-time Subscriber State Notifications',
    () => {
      const arm = new AdaptiveResolutionManager();
      let notifiedCount = 0;
      let lastReceivedTierId = '';

      const unsubscribe = arm.subscribe((s) => {
        notifiedCount++;
        lastReceivedTierId = s.currentTier.id;
      });

      arm.setPolicy('balanced');
      assert(arm.getState().currentTier.id === '1080p_fhd', 'TEST-ARM-07', 'Balanced policy should cap at 1080p');

      arm.setPolicy('bandwidth_saver');
      assert(arm.getState().currentTier.id === '480p_sd', 'TEST-ARM-07', 'Bandwidth saver should cap at 480p');

      arm.setPolicy('force_4k');
      assert(arm.getState().currentTier.id === '2160p_4k', 'TEST-ARM-07', 'Force 4K should lock to 4K');

      arm.selectTierManual('720p_hd');
      assert(arm.getState().currentTier.id === '720p_hd', 'TEST-ARM-07', 'Manual selection should be 720p');

      unsubscribe();
      assert(notifiedCount >= 4, 'TEST-ARM-07', 'Subscriber should receive multiple state change notifications');

      return `Verified all policy transitions (balanced, bandwidth_saver, force_4k, manual) and subscriber callbacks (${notifiedCount} events).`;
    }
  );

  console.log('=======================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Total Assertions: ${results.length} | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);
  console.log('=======================================================================');

  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
  };
}

// Auto-run if executed directly via CLI
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('adaptive_resolution_manager_tests')) {
  runAdaptiveResolutionManagerTestSuite().then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}

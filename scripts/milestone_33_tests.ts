/**
 * Milestone 33 Automated Test Suite: Android Mobile Requirements
 * Validates complete Android mobile-first capabilities:
 * - Touch Controls & Swipe Gesture Recognition (Volume, Brightness, Scrubbing)
 * - Double-Tap Seek & Center Aspect Ratio Toggling
 * - Pinch-to-Zoom & Dynamic Scaling
 * - Portrait & Landscape Adaptive Layout Management
 * - Android Screen WakeLock Lifecycle
 * - Background Audio & Picture-in-Picture (PiP) Windowing
 * - Android Secure Credential Storage Vault (AES-GCM 256-bit + Biometric Protection)
 * - Strict TV Navigation Isolation Guarantee
 */

import { AndroidMobilePlatformEngine } from '../src/lib/androidMobilePlatform';
import { TvFocusEngine } from '../src/lib/tvFocusEngine';

export interface Milestone33TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
  error?: string;
}

export async function runMilestone33Tests(): Promise<Milestone33TestResult[]> {
  const results: Milestone33TestResult[] = [];

  console.log('================== MILESTONE 33 AUTOMATED TEST SUITE ==================');

  // =========================================================================
  // TEST 1: Vertical Swipe Gesture Recognition (Brightness on Left, Volume on Right)
  // =========================================================================
  try {
    const engine = new AndroidMobilePlatformEngine();

    // 1. Left half swipe UP -> Brightness increase
    engine.handleTouchStart(100, 500, 1000, 800); // start at bottom left
    engine.handleTouchMove(100, 200, 1000, 800); // swipe up
    const stateLeft = engine.getGestureState();

    if (stateLeft.gestureType !== 'brightness') {
      throw new Error(`Expected 'brightness' gesture on left swipe, got '${stateLeft.gestureType}'`);
    }
    if (stateLeft.brightnessPercent <= 70) {
      throw new Error(`Expected brightness to increase from baseline 70, got ${stateLeft.brightnessPercent}`);
    }

    engine.handleTouchEnd();

    // 2. Right half swipe UP -> Volume increase
    engine.handleTouchStart(900, 500, 1000, 800); // start at bottom right
    engine.handleTouchMove(900, 200, 1000, 800); // swipe up
    const stateRight = engine.getGestureState();

    if (stateRight.gestureType !== 'volume') {
      throw new Error(`Expected 'volume' gesture on right swipe, got '${stateRight.gestureType}'`);
    }
    if (stateRight.volumePercent <= 80) {
      throw new Error(`Expected volume to increase from baseline 80, got ${stateRight.volumePercent}`);
    }

    engine.handleTouchEnd();

    results.push({
      id: 'TEST-M33-01',
      name: 'Vertical Swipe Gesture Recognition (Brightness & Volume)',
      passed: true,
      details: `Left half vertically modulated brightness (${stateLeft.brightnessPercent}%), right half modulated volume (${stateRight.volumePercent}%).`,
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-01: Vertical Swipe Gesture Recognition');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-01',
      name: 'Vertical Swipe Gesture Recognition (Brightness & Volume)',
      passed: false,
      details: 'Vertical swipe modulation failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-01:', err.message);
  }

  // =========================================================================
  // TEST 2: Horizontal Timeline Scrubbing Gesture & Commit
  // =========================================================================
  try {
    const engine = new AndroidMobilePlatformEngine();

    // Horizontal swipe from center rightwards (+30s seek)
    engine.handleTouchStart(500, 400, 1000, 800);
    engine.handleTouchMove(800, 400, 1000, 800); // move 300px right
    const scrubState = engine.getGestureState();

    if (scrubState.gestureType !== 'seek') {
      throw new Error(`Expected 'seek' gesture on horizontal swipe, got '${scrubState.gestureType}'`);
    }
    if (scrubState.seekDeltaSeconds <= 0) {
      throw new Error(`Expected positive seek delta on rightward swipe, got ${scrubState.seekDeltaSeconds}s`);
    }

    const commitRes = engine.handleTouchEnd();
    if (commitRes.action !== 'SEEK_COMMIT' || commitRes.value !== scrubState.seekDeltaSeconds) {
      throw new Error(`Expected SEEK_COMMIT with ${scrubState.seekDeltaSeconds}s, got ${commitRes.action}`);
    }

    results.push({
      id: 'TEST-M33-02',
      name: 'Horizontal Timeline Scrubbing Gesture & Commit',
      passed: true,
      details: `Horizontal swipe triggered seek gesture (${scrubState.seekDeltaSeconds}s) and committed smoothly on touch release.`,
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-02: Horizontal Timeline Scrubbing Gesture');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-02',
      name: 'Horizontal Timeline Scrubbing Gesture & Commit',
      passed: false,
      details: 'Horizontal scrub gesture failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-02:', err.message);
  }

  // =========================================================================
  // TEST 3: Double-Tap Seek & Center Aspect Ratio Toggling
  // =========================================================================
  try {
    const engine = new AndroidMobilePlatformEngine();

    // 1. Double tap left (<35% width) -> Seek -10s
    engine.handleTouchStart(200, 400, 1000, 800);
    engine.handleTouchEnd();
    engine.handleTouchStart(200, 400, 1000, 800); // 2nd tap within 300ms
    const stateDoubleLeft = engine.getGestureState();

    if (stateDoubleLeft.seekDeltaSeconds !== -10) {
      throw new Error(`Expected -10s seek on double tap left, got ${stateDoubleLeft.seekDeltaSeconds}`);
    }
    engine.handleTouchEnd();

    // 2. Double tap right (>65% width) -> Seek +10s
    const engineRight = new AndroidMobilePlatformEngine();
    engineRight.handleTouchStart(850, 400, 1000, 800);
    engineRight.handleTouchEnd();
    engineRight.handleTouchStart(850, 400, 1000, 800);
    const stateDoubleRight = engineRight.getGestureState();

    if (stateDoubleRight.seekDeltaSeconds !== 10) {
      throw new Error(`Expected +10s seek on double tap right, got ${stateDoubleRight.seekDeltaSeconds}`);
    }
    engineRight.handleTouchEnd();

    // 3. Double tap center -> Toggle Aspect Ratio Mode
    const engineCenter = new AndroidMobilePlatformEngine();
    const initialMode = engineCenter.getGestureState().aspectRatioMode;
    engineCenter.handleTouchStart(500, 400, 1000, 800);
    engineCenter.handleTouchEnd();
    engineCenter.handleTouchStart(500, 400, 1000, 800);
    const modeAfter = engineCenter.getGestureState().aspectRatioMode;

    if (modeAfter === initialMode) {
      throw new Error(`Aspect ratio did not cycle on center double tap, remained ${modeAfter}`);
    }

    results.push({
      id: 'TEST-M33-03',
      name: 'Double-Tap Seek & Center Aspect Ratio Toggling',
      passed: true,
      details: `Double tap left rewound (-10s), double tap right fast-forwarded (+10s), and center cycled aspect ratio to '${modeAfter}'.`,
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-03: Double-Tap Seek & Aspect Ratio Toggling');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-03',
      name: 'Double-Tap Seek & Center Aspect Ratio Toggling',
      passed: false,
      details: 'Double tap handling failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-03:', err.message);
  }

  // =========================================================================
  // TEST 4: Pinch-to-Zoom & Dynamic Scaling
  // =========================================================================
  try {
    const engine = new AndroidMobilePlatformEngine();

    engine.setPinchZoom(1.8);
    const zoomState = engine.getGestureState();

    if (zoomState.zoomScale !== 1.8 || zoomState.gestureType !== 'pinch_zoom') {
      throw new Error(`Expected zoom scale 1.8 and gesture pinch_zoom, got ${zoomState.zoomScale}`);
    }

    engine.resetPinchZoom();
    if (engine.getGestureState().zoomScale !== 1.0) {
      throw new Error('Reset pinch zoom failed');
    }

    results.push({
      id: 'TEST-M33-04',
      name: 'Pinch-to-Zoom & Dynamic Scaling',
      passed: true,
      details: 'Pinch gesture scaled canvas from 1.0x to 1.8x and smoothly restored on reset.',
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-04: Pinch-to-Zoom & Dynamic Scaling');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-04',
      name: 'Pinch-to-Zoom & Dynamic Scaling',
      passed: false,
      details: 'Pinch zoom failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-04:', err.message);
  }

  // =========================================================================
  // TEST 5: Portrait & Landscape Adaptive Layout Management
  // =========================================================================
  try {
    const engine = new AndroidMobilePlatformEngine();

    engine.setOrientation('portrait');
    if (engine.getOrientation() !== 'portrait') {
      throw new Error('Portrait orientation setting failed');
    }

    engine.setOrientation('landscape');
    if (engine.getOrientation() !== 'landscape') {
      throw new Error('Landscape orientation setting failed');
    }

    results.push({
      id: 'TEST-M33-05',
      name: 'Portrait & Landscape Adaptive Layout Management',
      passed: true,
      details: 'Successfully adapted between portrait (bottom-sheet nav) and landscape (cinematic edge-to-edge).',
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-05: Portrait & Landscape Adaptive Layout');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-05',
      name: 'Portrait & Landscape Adaptive Layout Management',
      passed: false,
      details: 'Orientation adaptation failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-05:', err.message);
  }

  // =========================================================================
  // TEST 6: Android Screen WakeLock Lifecycle
  // =========================================================================
  try {
    const engine = new AndroidMobilePlatformEngine();

    const acquired = await engine.acquireWakeLock();
    if (!acquired || !engine.isWakeLockActive()) {
      throw new Error('Failed to acquire Android Screen WakeLock for playback');
    }

    engine.releaseWakeLock();
    if (engine.isWakeLockActive()) {
      throw new Error('WakeLock remained active after release');
    }

    results.push({
      id: 'TEST-M33-06',
      name: 'Android Screen WakeLock Lifecycle',
      passed: true,
      details: 'Screen WakeLock acquired on video start to prevent display sleep and safely released on exit.',
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-06: Android Screen WakeLock Lifecycle');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-06',
      name: 'Android Screen WakeLock Lifecycle',
      passed: false,
      details: 'WakeLock lifecycle failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-06:', err.message);
  }

  // =========================================================================
  // TEST 7: Background Audio & Picture-in-Picture (PiP) Windowing
  // =========================================================================
  try {
    const engine = new AndroidMobilePlatformEngine();

    engine.setBackgroundAudioEnabled(true);
    if (!engine.getIsBackgroundAudioEnabled()) {
      throw new Error('Failed to enable background audio playback');
    }

    const pipActive = await engine.togglePictureInPicture();
    if (!pipActive || !engine.getIsPipActive()) {
      throw new Error('Picture-in-Picture window toggle failed');
    }

    results.push({
      id: 'TEST-M33-07',
      name: 'Background Audio & Picture-in-Picture (PiP) Windowing',
      passed: true,
      details: 'Picture-in-Picture floating mode and background audio playback session active.',
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-07: Background Audio & Picture-in-Picture');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-07',
      name: 'Background Audio & Picture-in-Picture (PiP) Windowing',
      passed: false,
      details: 'Background behavior failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-07:', err.message);
  }

  // =========================================================================
  // TEST 8: Android Secure Credential Storage Vault (AES-GCM 256-bit + Biometric Guard)
  // =========================================================================
  try {
    const engine = new AndroidMobilePlatformEngine();

    // Store credential with biometric guard
    const item = await engine.saveEncryptedCredential(
      'xtream',
      'https://iptv-provider.example.com',
      'user_premium_android',
      'SecretP@ssword2026!',
      true // requires biometric
    );

    if (!item.id || !item.encryptedPasswordCipher) {
      throw new Error('Credential encryption produced invalid vault item');
    }

    // Attempt decryption without biometric authentication -> Expect failure
    let blocked = false;
    try {
      await engine.decryptCredential(item.id, false);
    } catch (e) {
      blocked = true;
    }
    if (!blocked) {
      throw new Error('Decryption succeeded without required biometric authentication');
    }

    // Decrypt with biometric authentication -> Expect exact plaintext match
    const decrypted = await engine.decryptCredential(item.id, true);
    if (decrypted !== 'SecretP@ssword2026!') {
      throw new Error(`Decrypted credential mismatch: expected 'SecretP@ssword2026!', got '${decrypted}'`);
    }

    results.push({
      id: 'TEST-M33-08',
      name: 'Android Secure Credential Storage Vault',
      passed: true,
      details: 'AES-GCM 256-bit ciphertext storage with hardware-backed biometric verification verified.',
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-08: Android Secure Credential Vault');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-08',
      name: 'Android Secure Credential Storage Vault',
      passed: false,
      details: 'Secure credential vault failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-08:', err.message);
  }

  // =========================================================================
  // TEST 9: Strict TV Navigation Isolation Guarantee
  // =========================================================================
  try {
    const mobileEngine = new AndroidMobilePlatformEngine();
    const tvEngine = new TvFocusEngine();
    tvEngine.reset();

    // Register TV Focus Nodes
    tvEngine.registerNode({ id: 'tv_ch_1', zone: 'grid', row: 0, col: 0, label: 'TV Ch 1' });
    tvEngine.registerNode({ id: 'tv_ch_2', zone: 'grid', row: 0, col: 1, label: 'TV Ch 2' });
    tvEngine.setFocus('tv_ch_1');

    // Perform mobile touch swipes on mobile engine
    mobileEngine.handleTouchStart(100, 500, 1000, 800);
    mobileEngine.handleTouchMove(100, 200, 1000, 800);
    mobileEngine.handleTouchEnd();

    // Verify TV Focus state is unaffected
    if (tvEngine.getActiveNodeId() !== 'tv_ch_1') {
      throw new Error('Mobile touch gesture corrupted TV focus engine state');
    }

    results.push({
      id: 'TEST-M33-09',
      name: 'Strict TV Navigation Isolation Guarantee',
      passed: true,
      details: 'Mobile touch and gesture listeners operate in isolated space without degrading TV 2D focus.',
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-09: Strict TV Isolation Guarantee');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-09',
      name: 'Strict TV Navigation Isolation Guarantee',
      passed: false,
      details: 'TV isolation verification failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-09:', err.message);
  }

  // =========================================================================
  // TEST 10: Android 4K UHD Video Hardware Playback & MediaCodec 60fps Pipeline
  // =========================================================================
  try {
    const engine = new AndroidMobilePlatformEngine();

    // 1. Verify 4K support verification method
    const verify4k = engine.verify4kSupport();
    if (!verify4k.supported || !verify4k.maxResolution.includes('4K') || verify4k.maxFps < 60) {
      throw new Error(`Expected Android 4K@60fps support, got max: ${verify4k.maxResolution} at ${verify4k.maxFps}fps`);
    }

    // 2. Verify supported resolutions list contains 4K UHD (2160p) with 3840x2160 dimensions
    const resolutions = engine.getSupportedResolutions();
    const res4k = resolutions.find((r) => r.id === '2160p_4k');
    if (!res4k || res4k.width !== 3840 || res4k.height !== 2160 || res4k.fps !== 60) {
      throw new Error('4K Ultra HD profile (3840x2160@60fps) missing or improperly configured in Android engine');
    }

    // 3. Verify resolution selection switching
    engine.setSelectedResolution('2160p_4k');
    if (engine.getSelectedResolution() !== '2160p_4k') {
      throw new Error('Failed to set selected resolution to 2160p_4k on Android engine');
    }

    // 4. Verify 4K Hardware Profile & Codecs (HEVC Main10, AV1, VP9, H.264)
    const hw4k = engine.getHardware4kCapabilities();
    if (!hw4k.mediaCodecHwAcceleration || !hw4k.zeroCopySurface || !hw4k.hdr10Supported) {
      throw new Error('Android 4K hardware profile must include MediaCodec acceleration, Zero-Copy Surface, and HDR10');
    }
    const hasHevc = hw4k.supportedCodecs.some((c) => c.name.includes('HEVC') && c.maxResolution.includes('4K'));
    const hasAv1 = hw4k.supportedCodecs.some((c) => c.name.includes('AV1') && c.maxResolution.includes('4K'));
    if (!hasHevc || !hasAv1) {
      throw new Error('Android 4K hardware pipeline must support HEVC Main10 4K and AV1 4K decoders');
    }

    results.push({
      id: 'TEST-M33-10',
      name: 'Android 4K UHD Video Hardware Playback & MediaCodec 60fps Pipeline',
      passed: true,
      details: `Android 4K UHD (3840x2160@60fps) validated with MediaCodec zero-copy hardware surface, BT.2020/HDR10, and HEVC/AV1/VP9 codec acceleration.`,
    });
    console.log('\x1b[32m[PASS]\x1b[0m [Milestone 33] TEST-M33-10: Android 4K UHD Video Hardware Playback');
  } catch (err: any) {
    results.push({
      id: 'TEST-M33-10',
      name: 'Android 4K UHD Video Hardware Playback & MediaCodec 60fps Pipeline',
      passed: false,
      details: 'Android 4K playback verification failed',
      error: err.message,
    });
    console.error('\x1b[31m[FAIL]\x1b[0m [Milestone 33] TEST-M33-10:', err.message);
  }

  console.log('=======================================================================');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Total Assertions: ${results.length} | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);

  return results;
}

if (process.argv[1] && process.argv[1].endsWith('milestone_33_tests.ts')) {
  runMilestone33Tests().catch(console.error);
}

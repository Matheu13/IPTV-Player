/**
 * Standalone Automated Test Runner for Milestone 28
 *
 * M28: Spatial Audio & MPEG-H / Dolby Atmos 3D Object Sound Renderer
 *
 * Execution: npx tsx scripts/milestone_28_tests.ts
 */

import { SpatialAudioEngine } from '../src/lib/spatialAudioEngine';

export async function runMilestone28TestSuite() {
  console.log('================== MILESTONE 28 AUTOMATED TEST SUITE ==================');
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

  // TEST-M28-01: MPEG-H 3D Audio Object Bed & ADM Metadata Parser
  {
    const engine = new SpatialAudioEngine();
    const tele = engine.getTelemetry();
    assert(
      tele.objects.length >= 5 &&
      tele.activeBedFormat.includes('MPEG-H') &&
      tele.totalActiveRenderObjects >= 4,
      'Milestone 28',
      'TEST-M28-01: MPEG-H 3D Audio Object Bed & ADM Metadata Parser (7.1.4 Bed + Dynamic Objects)',
      `Format: ${tele.activeBedFormat}, Objects: ${tele.objects.length}`
    );
    engine.destroy();
  }

  // TEST-M28-02: Binaural HRTF Virtualizer & Gyro Head Tracking Simulation
  {
    const engine = new SpatialAudioEngine();
    engine.setHeadTrackingOrientation(45, 10, -5);
    const tele = engine.getTelemetry();
    assert(
      tele.profile.headTrackingYawDeg === 45 &&
      tele.profile.headTrackingPitchDeg === 10 &&
      tele.profile.headTrackingRollDeg === -5 &&
      tele.binauralProcessingLatencyMs <= 5.0,
      'Milestone 28',
      'TEST-M28-02: Binaural HRTF Virtualizer & Gyro Head Tracking Simulation (Yaw/Pitch/Roll)',
      `Yaw: ${tele.profile.headTrackingYawDeg}°, Latency: ${tele.binauralProcessingLatencyMs}ms`
    );
    engine.destroy();
  }

  // TEST-M28-03: ClearVoice Dialogue Isolation & Interactive Speech Boost Gain
  {
    const engine = new SpatialAudioEngine();
    engine.setDialogueClarityBoost(8.0);
    const tele = engine.getTelemetry();
    const diagObj = tele.objects.find((o) => o.category === 'DIALOGUE');
    assert(
      tele.profile.dialogueClarityBoostDb === 8.0 &&
      diagObj !== undefined &&
      diagObj.gainDb >= 4.0 &&
      tele.dialogueIsolationRatioPct >= 85,
      'Milestone 28',
      'TEST-M28-03: ClearVoice Dialogue Isolation & Interactive Speech Boost Gain (+0dB to +12dB)',
      `Boost: +${tele.profile.dialogueClarityBoostDb}dB, Isolation: ${tele.dialogueIsolationRatioPct}%`
    );
    engine.destroy();
  }

  // TEST-M28-04: Interactive Audio Stream Personalization & Broadcast Presets Switching
  {
    const engine = new SpatialAudioEngine();
    engine.applyPreset('PURE_ATMOSPHERE');
    const tele = engine.getTelemetry();
    const diagObj = tele.objects.find((o) => o.id === 'OBJ-BED-C');
    assert(
      tele.selectedAudioPreset === 'PURE_ATMOSPHERE' &&
      diagObj !== undefined &&
      diagObj.isMuted,
      'Milestone 28',
      'TEST-M28-04: Interactive Audio Stream Personalization & Broadcast Presets Switching',
      `Preset: ${tele.selectedAudioPreset}, Dialogue Muted: ${diagObj?.isMuted}`
    );
    engine.destroy();
  }

  console.log('=======================================================================');
  console.log(`Total Assertions: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);

  return {
    milestone: 'Milestone 28 - Spatial Audio & MPEG-H 3D Object Sound Renderer',
    total: passedCount + failedCount,
    passed: passedCount,
    failed: failedCount,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMilestone28TestSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

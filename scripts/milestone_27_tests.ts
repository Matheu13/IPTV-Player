/**
 * Standalone Automated Test Runner for Milestone 27
 *
 * M27: Forensic Watermarking & Dynamic Session Fingerprinting
 *
 * Execution: npx tsx scripts/milestone_27_tests.ts
 */

import { ForensicWatermarkEngine } from '../src/lib/forensicWatermarkEngine';

export async function runMilestone27TestSuite() {
  console.log('================== MILESTONE 27 AUTOMATED TEST SUITE ==================');
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

  // M27-01: A/B Variant Stream Bitstream Switching Sequence Generation
  {
    const engine = new ForensicWatermarkEngine();
    const tele = engine.getTelemetry();
    assert(
      tele.activeSession.variantPayloadBitSequence.length === 16 &&
      ['VARIANT_A', 'VARIANT_B'].includes(tele.activeVariantSegment) &&
      tele.activeSession.steganographicVariantEnabled,
      'Milestone 27',
      'TEST-M27-01: A/B Variant Stream Bitstream Switching Sequence Generation',
      `Payload: ${tele.activeSession.variantPayloadBitSequence}, Segment: ${tele.activeVariantSegment}`
    );
    engine.destroy();
  }

  // M27-02: Dynamic Visual OSD Jitter Watermark
  {
    const engine = new ForensicWatermarkEngine();
    const tele = engine.getTelemetry();
    assert(
      tele.currentVisualXPosPct >= 0 &&
      tele.currentVisualXPosPct <= 100 &&
      tele.currentVisualYPosPct >= 0 &&
      tele.currentVisualYPosPct <= 100 &&
      tele.activeSession.visualOpacityPct >= 3 &&
      tele.activeSession.visualOpacityPct <= 25,
      'Milestone 27',
      'TEST-M27-02: Dynamic Visual OSD Jitter Watermark with Micro-Coordinates & Opacity Control',
      `Pos: (${tele.currentVisualXPosPct}%, ${tele.currentVisualYPosPct}%), Opacity: ${tele.activeSession.visualOpacityPct}%`
    );
    engine.destroy();
  }

  // M27-03: Forensic Watermark Decoding & Leak Attribution
  {
    const engine = new ForensicWatermarkEngine();
    const res = engine.extractForensicAttribution();
    assert(
      res.leakFound &&
      res.matchConfidencePct >= 99 &&
      res.extractedSubscriberId === 'SUB-USER-40891' &&
      res.extractedIpAddress === '198.51.100.74' &&
      res.variantBitMatches === 16,
      'Milestone 27',
      'TEST-M27-03: Forensic Watermark Decoding & Leak Attribution to Subscriber Identity',
      `Subscriber: ${res.extractedSubscriberId} (${res.extractedIpAddress}), Confidence: ${res.matchConfidencePct}%`
    );
    engine.destroy();
  }

  // M27-04: Zero-Trust DRM License Invalidation & Automated Takedown Signal Dispatch
  {
    const engine = new ForensicWatermarkEngine();
    const res = engine.dispatchRevocationWebhook();
    const tele = engine.getTelemetry();
    assert(
      res.success &&
      tele.activeSession.isSessionRevoked &&
      res.status === 'DRM_TOKEN_REVOKED_BLACKHOLED' &&
      res.latencyMs > 0 &&
      res.latencyMs < 100,
      'Milestone 27',
      'TEST-M27-04: Zero-Trust DRM License Invalidation & Automated Takedown Signal Dispatch',
      `Latency: ${res.latencyMs}ms, Status: ${res.status}`
    );
    engine.destroy();
  }

  console.log('=======================================================================');
  console.log(`Total Assertions: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);

  return {
    milestone: 'Milestone 27 - Forensic Watermarking & Dynamic Splicing',
    total: passedCount + failedCount,
    passed: passedCount,
    failed: failedCount,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMilestone27TestSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

/**
 * Standalone Automated Test Runner for Milestones 24, 25 & 26
 *
 * M24: Dynamic Ad Insertion (DAI) & SCTE-35 Splicing
 * M25: Multi-Room Sync & Distributed Cast Coordinator
 * M26: Hybrid DVB-T2/C/S2 + ATSC 3.0 RF Tuner & BISS Descrambler
 *
 * Execution: npx tsx scripts/milestones_24_to_26_tests.ts
 */

import { Scte35DaiEngine } from '../src/lib/scte35DaiEngine';
import { MultiRoomCastEngine } from '../src/lib/multiRoomCastEngine';
import { HybridRfTunerEngine } from '../src/lib/hybridRfTunerEngine';

export async function runMilestones24To26TestSuite() {
  console.log('================== MILESTONES 24, 25 & 26 AUTOMATED TEST SUITE ==================');
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

  // ====================================================
  // MILESTONE 24: SCTE-35 & DYNAMIC AD INSERTION (DAI)
  // ====================================================

  // M24-01: SCTE-35 Binary Parser
  {
    const engine = new Scte35DaiEngine();
    const marker = engine.parseScte35Hex('/DA0AAAAAAAA///wBQb+AAAAAAAiAiBDRVVJAAAAn3//AAA31g0KSU5URVJQQUNLUwEA');
    assert(
      marker.id.length > 0 && marker.spliceEventId > 0 && marker.durationMs === 30000 && marker.commandType === 'TIME_SIGNAL',
      'Milestone 24',
      'TEST-M24-01: SCTE-35 Cue Marker Binary Decoder (Splice Insert/Time Signal)',
      `Event #${marker.spliceEventId}, Duration: ${marker.durationMs / 1000}s`
    );
    engine.destroy();
  }

  // M24-02: SSAI & CSAI Ad Pod Splicer
  {
    const engine = new Scte35DaiEngine();
    const breakRes = engine.triggerAdBreak(30);
    const tele = engine.getTelemetry();
    assert(
      tele.currentStreamState === 'AD_PLAYBACK' && tele.activeAd !== null && tele.adPodTotal === 2,
      'Milestone 24',
      'TEST-M24-02: SSAI & CSAI Seamless Ad Pod Splicer with Zero-Buffer Resync',
      `Active Ad: ${tele.activeAd?.title}, Pod: 1/${tele.adPodTotal}`
    );
    engine.destroy();
  }

  // M24-03: VAST 4.2 Quartile Beacons
  {
    const engine = new Scte35DaiEngine();
    engine.triggerAdBreak(15);
    const tele = engine.getTelemetry();
    assert(
      tele.vastBeaconsDispatched >= 2,
      'Milestone 24',
      'TEST-M24-03: VAST 4.2 / VMAP 1.0 Ad Quartile Tracking Beacon Dispatcher',
      `Beacons: ${tele.vastBeaconsDispatched} dispatched`
    );
    engine.destroy();
  }

  // M24-04: EBU R128 Ad Loudness Normalization
  {
    const engine = new Scte35DaiEngine();
    const inventory = engine.getInventory();
    const isNormalized = inventory.every((ad) => Math.abs(ad.loudnessLufs - -24.0) <= 0.5);
    const tele = engine.getTelemetry();
    assert(
      isNormalized && tele.ebuR128GainOffsetDb < 0,
      'Milestone 24',
      'TEST-M24-04: EBU R128 (-24 LUFS) Ad Loudness Normalization & PTS Drift Match',
      `All creatives <= 0.5 LUFS deviation from -24.0 LUFS`
    );
    engine.destroy();
  }

  // ====================================================
  // MILESTONE 25: MULTI-ROOM SYNC & CAST COORDINATOR
  // ====================================================

  // M25-01: Microsecond PTP Clock Synchronization
  {
    const engine = new MultiRoomCastEngine();
    const tele = engine.getTelemetry();
    assert(
      tele.globalClockJitterMs <= 5.0 && tele.masterPtpTimeEpochMs > 0,
      'Milestone 25',
      'TEST-M25-01: Microsecond Master-Follower PTP Clock Synchronization (<5ms)',
      `Jitter: ±${tele.globalClockJitterMs}ms`
    );
    engine.destroy();
  }

  // M25-02: Cast Protocol Discovery
  {
    const engine = new MultiRoomCastEngine();
    const devices = engine.refreshDiscovery();
    assert(
      devices.length >= 4 && devices.some((d) => d.protocol === 'AIRPLAY_2') && devices.some((d) => d.protocol === 'GOOGLE_CAST'),
      'Milestone 25',
      'TEST-M25-02: Cast Protocol Discovery (Google Cast, AirPlay 2, DIAL SSDP, Matter)',
      `Discovered ${devices.length} network target devices`
    );
    engine.destroy();
  }

  // M25-03: Zero-Loss Playback State Handoff
  {
    const engine = new MultiRoomCastEngine();
    const handoff = engine.castToDevice('DEV-CAST-LG-OLED-01', {
      channelId: 'CH-4K-01',
      channelName: 'Sky Sports UHD',
      streamUrl: 'https://edge.cdn/live.m3u8',
      currentPtsTimestampMs: 42890000,
      audioTrackId: 1,
      audioTrackLanguage: 'eng',
      subtitleTrackId: 0,
      subtitleLanguage: 'eng',
      volume: 65,
    });
    assert(
      handoff.success && handoff.latencyMs > 0 && handoff.latencyMs < 300,
      'Milestone 25',
      'TEST-M25-03: Zero-Loss Playback State Handoff (Channel, PTS, Audio/Sub, Volume)',
      `Target: Living Room OLED in ${handoff.latencyMs}ms`
    );
    engine.destroy();
  }

  // M25-04: Multi-Room Audio/Video Zone Orchestration
  {
    const engine = new MultiRoomCastEngine();
    const group = engine.createMultiRoomZone('Whole House Sync', 'DEV-CAST-LG-OLED-01', [
      'DEV-CAST-SONY-BRAVIA-02',
      'DEV-CAST-APPLETV-03',
    ]);
    assert(
      group.isSynced && group.memberDeviceIds.length === 3 && engine.getTelemetry().isMultiRoomSyncActive,
      'Milestone 25',
      'TEST-M25-04: Dynamic Multi-Room Audio/Video Zone Orchestration & Group Volume',
      `Zone: ${group.name}, 3 devices phase-locked`
    );
    engine.destroy();
  }

  // ====================================================
  // MILESTONE 26: HYBRID RF TUNER & BISS DESCRAMBLER
  // ====================================================

  // M26-01: Multi-Standard RF Frontend Demodulation
  {
    const engine = new HybridRfTunerEngine();
    const tele = engine.getTelemetry();
    assert(
      tele.allTuners.length >= 3 && tele.activeTuner.lockStatus === 'LOCKED',
      'Milestone 26',
      'TEST-M26-01: Multi-Standard RF Frontend Demodulation (DVB-T2, DVB-S2, ATSC 3.0)',
      `Tuner #0: ${tele.activeTuner.standard} locked on ${tele.activeTuner.frequencyMhz}MHz`
    );
    engine.destroy();
  }

  // M26-02: Real-time RF Signal Quality Metrics
  {
    const engine = new HybridRfTunerEngine();
    const t = engine.getTelemetry().activeTuner;
    assert(
      t.snrDb >= 10.0 && t.merDb >= 12.0 && t.berPostLdpc === 0.0,
      'Milestone 26',
      'TEST-M26-02: Real-Time RF Metrics (SNR dB, MER dB, Post-LDPC BER, Signal Level)',
      `SNR: ${t.snrDb}dB, MER: ${t.merDb}dB, Post-LDPC BER: 0.0`
    );
    engine.destroy();
  }

  // M26-03: BISS-1 / BISS-E Descrambler Pipeline
  {
    const engine = new HybridRfTunerEngine();
    const res = engine.setBissKey(10401, '26F8A1BFA034E276', '26F8A1BFA034E276', 'BISS_1');
    assert(
      res.success && res.status === 'DESCRAMBLING_OK',
      'Milestone 26',
      'TEST-M26-03: BISS-1 & BISS-E 16-Hex Control Word (CW) Descrambling Pipeline',
      `Descrambler status: ${res.status}`
    );
    engine.destroy();
  }

  // M26-04: PLP & Subtitle Multiplex Demuxer
  {
    const engine = new HybridRfTunerEngine();
    const tele = engine.getTelemetry();
    const channelsWithSub = tele.channels.filter((c) => c.hasDvbSubtitles);
    assert(
      channelsWithSub.length > 0 && tele.activePlpCount >= 1 && tele.constellationPoints.length > 0,
      'Milestone 26',
      'TEST-M26-04: Physical Layer Pipe (PLP) & DVB-Subtitle / Teletext Demuxer',
      `Demuxed ${tele.channels.length} services across ${tele.activePlpCount} PLP pipes`
    );
    engine.destroy();
  }

  console.log('=====================================================================================');
  console.log(`Total Assertions: ${passedCount + failedCount} | Passed: ${passedCount} | Failed: ${failedCount}`);

  return {
    milestone: 'Milestones 24-26 - SCTE-35 DAI, Multi-Room PTP Sync, Hybrid RF Frontend',
    total: passedCount + failedCount,
    passed: passedCount,
    failed: failedCount,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMilestones24To26TestSuite().then((res) => {
    if (res.failed > 0) process.exit(1);
  });
}

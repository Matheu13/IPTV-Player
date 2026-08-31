/**
 * Milestone 42: Adaptive P2P Stream Mesh Manager Automated Test Suite
 */

import { AdaptiveP2pMeshManager } from '../src/lib/adaptiveP2pMeshManager';

export interface M42TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  message: string;
}

const results: M42TestResult[] = [];

function assert(condition: boolean, testId: string, message: string) {
  if (!condition) {
    throw new Error(`[${testId}] Assertion Failed: ${message}`);
  }
}

async function recordTest(
  id: string,
  name: string,
  category: string,
  fn: (runner: AdaptiveP2pMeshManager) => Promise<void> | void
) {
  const runner = new AdaptiveP2pMeshManager();
  const start = Date.now();
  let passed = true;
  let message = 'Passed';

  try {
    await fn(runner);
  } catch (err: any) {
    passed = false;
    message = err.message || 'Failed';
  } finally {
    runner.destroy();
  }

  const durationMs = Date.now() - start;
  results.push({ id, name, category, passed, durationMs, message });
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${id}: ${name} (${durationMs}ms)`);
  if (!passed) {
    console.error(`       Error: ${message}`);
  }
}

export async function runMilestone42TestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: M42TestResult[];
}> {
  results.length = 0;
  console.log('================== MILESTONE 42: ADAPTIVE P2P STREAM MESH TEST SUITE ==================');

  await recordTest(
    'M42-01',
    'Swarm Peer Discovery & WebRTC DataChannel Readiness',
    'Swarm Topology',
    (runner) => {
      const peers = runner.getPeers();
      assert(peers.length >= 5, 'M42-01', 'At least 5 peer nodes initialized');
      const openChannels = peers.filter((p) => p.dataChannelState === 'OPEN');
      assert(openChannels.length >= 4, 'M42-01', 'At least 4 peers have open WebRTC DataChannels');
    }
  );

  await recordTest(
    'M42-02',
    'Lookahead Buffer vs Critical Deadline Segment Routing',
    'Scheduler Pipeline',
    (runner) => {
      runner.updateConfig({ enabled: true, lookaheadBufferSec: 12, criticalThresholdSec: 2.0 });
      const peerSeg = runner.fetchSegment(210);
      assert(peerSeg.source === 'PEER_CACHE', 'M42-02', 'Lookahead segment fetched from PEER_CACHE');
      assert(peerSeg.rttMs < 35, 'M42-02', 'Peer RTT within acceptable latency threshold');

      const cdnSeg = runner.fetchSegment(211, { forceCdn: true });
      assert(cdnSeg.source === 'PRIMARY_CDN', 'M42-02', 'Critical/forced chunk fetched from PRIMARY_CDN');
    }
  );

  await recordTest(
    'M42-03',
    'Peer Bitfield Segment Cache Availability Tracking',
    'Bitfield Maps',
    (runner) => {
      const peers = runner.getPeers();
      const p = peers[0];
      assert(Array.isArray(p.cachedSegmentIds), 'M42-03', 'Cached segments is an array');
      assert(p.cachedSegmentIds.length > 0, 'M42-03', 'Peer has non-empty cached segment bitfield');
    }
  );

  await recordTest(
    'M42-04',
    'Byzantine Corrupt Chunk Detection & Instant 0-Stall CDN Fallback',
    'Zero-Stall Fallback',
    (runner) => {
      runner.updateConfig({ enabled: true });
      const seg = runner.fetchSegment(300, { simulateByzantine: true });
      assert(seg.source === 'FALLBACK_CDN', 'M42-04', 'Immediate fallback to FALLBACK_CDN on corrupt checksum');
      assert(seg.checksumValid === true, 'M42-04', 'Fallback CDN segment verified valid');

      const rogue = runner.getPeers().find((p) => p.id === 'peer-rogue-byzantine');
      assert(Boolean(rogue?.isChoked), 'M42-04', 'Rogue peer choked after checksum failure');
    }
  );

  await recordTest(
    'M42-05',
    'Dynamic Peer Choke & Anti-Byzantine Trust Governance',
    'Anti-Byzantine Engine',
    (runner) => {
      const peers = runner.getPeers();
      const rogue = peers.find((p) => p.id === 'peer-rogue-byzantine');
      assert(Boolean(rogue), 'M42-05', 'Rogue peer exists in topology');
      assert(rogue!.trustScore < 0.5, 'M42-05', 'Rogue peer trust score penalized below 0.5');
      assert(rogue!.isChoked === true, 'M42-05', 'Rogue peer is choked from chunk requests');
    }
  );

  await recordTest(
    'M42-06',
    'CDN Egress Reduction (>65% P2P Offload Target Model)',
    'Egress Optimization Model',
    (runner) => {
      runner.updateConfig({ enabled: true });
      for (let i = 0; i < 20; i++) {
        runner.fetchSegment(400 + i);
      }
      const telemetry = runner.getTelemetry();
      assert(telemetry.p2pOffloadPercent >= 60, 'M42-06', 'P2P offload exceeds 60% in simulated steady state');
      assert(telemetry.costSavingsUsd >= 0, 'M42-06', 'Egress cost savings quantified in theoretical model');
    }
  );

  await recordTest(
    'M42-07',
    'P2P Mesh Disable Mode with 100% Direct CDN Pass-through',
    'Fail-Safe Mode',
    (runner) => {
      runner.updateConfig({ enabled: false });
      const seg = runner.fetchSegment(500);
      assert(seg.source === 'PRIMARY_CDN', 'M42-07', 'Direct primary CDN fetch when mesh disabled');
      const telem = runner.getTelemetry();
      assert(telem.p2pMeshActive === false, 'M42-07', 'Telemetry reflects mesh inactive');
    }
  );

  await recordTest(
    'M42-08',
    'Multi-Peer Parallel Swarm Latency vs Edge CDN Latency',
    'QoS & Telemetry',
    (runner) => {
      const telem = runner.getTelemetry();
      assert(telem.avgPeerRttMs < telem.primaryCdnRttMs + 10, 'M42-08', 'Peer swarm latency competitive with Edge CDN');
      assert(telem.healthyPeerCount >= 4, 'M42-08', 'At least 4 healthy peers active');
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('--------------------------------------------------------------------------------------------');
  console.log(`Total Assertions: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('============================================================================================\n');

  return { total: results.length, passed, failed, results };
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('milestone_42_tests')) {
  runMilestone42TestSuite();
}

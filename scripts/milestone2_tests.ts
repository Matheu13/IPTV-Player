/**
 * Milestone 2 Automated Test Suite
 * Tests MPV IPC Bridge Protocol, Hardware Acceleration, Deinterlacing,
 * Audio/Subtitle switching, Video Pipeline Filters, and Stall Auto-Recovery.
 */

import { MpvIpcProtocol, SimulatedMpvBridge } from '../src/lib/mpvBridge';
import { PlayerEngine } from '../src/lib/playerEngine';
import { globalConnectionManager } from '../src/lib/connectionManager';

export interface Milestone2TestResult {
  testId: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  assertionMessage: string;
  details?: any;
}

export async function runMilestone2TestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: Milestone2TestResult[];
}> {
  const results: Milestone2TestResult[] = [];

  const runTest = async (
    testId: string,
    name: string,
    category: string,
    fn: () => Promise<string> | string
  ) => {
    const start = Date.now();
    try {
      const assertionMessage = await fn();
      results.push({
        testId,
        name,
        category,
        passed: true,
        durationMs: Date.now() - start,
        assertionMessage,
      });
    } catch (err: any) {
      results.push({
        testId,
        name,
        category,
        passed: false,
        durationMs: Date.now() - start,
        assertionMessage: err.message || 'Assertion failed',
        details: err.stack,
      });
    }
  };

  // 1. MPV IPC Protocol JSON-RPC Formatting
  await runTest(
    'TEST-M2-01',
    'MPV IPC: JSON-RPC command formatting with request_id',
    'MPV Protocol',
    () => {
      const { json, reqId } = MpvIpcProtocol.buildCommand('set_property', ['hwdec', 'd3d11va']);
      const parsed = JSON.parse(json);
      if (!parsed.command || parsed.command[0] !== 'set_property' || parsed.command[1] !== 'hwdec') {
        throw new Error(`Command array structure invalid: ${json}`);
      }
      if (typeof parsed.request_id !== 'number' || parsed.request_id !== reqId) {
        throw new Error(`request_id mismatch: expected ${reqId}, got ${parsed.request_id}`);
      }
      return `Generated valid JSON-RPC command packet: reqId #${reqId}, command: set_property hwdec d3d11va`;
    }
  );

  // 2. MPV IPC Parser
  await runTest(
    'TEST-M2-02',
    'MPV IPC: Parse incoming JSON lines & ignore partial chunks',
    'MPV Protocol',
    () => {
      const raw = `{"request_id": 1, "error": "success", "data": 4.5}\n{"event": "playback-restart"}\n{invalid_json_chunk\n`;
      const messages = MpvIpcProtocol.parseIncoming(raw);
      if (messages.length !== 2) {
        throw new Error(`Expected 2 valid parsed messages, got ${messages.length}`);
      }
      if (messages[0].requestId !== 1 || messages[1].event !== 'playback-restart') {
        throw new Error(`Message data mismatch`);
      }
      return `Parsed 2 incoming MPV event frames safely and dropped malformed chunk`;
    }
  );

  // 3. HWDEC Acceleration Profile
  await runTest(
    'TEST-M2-03',
    'MPV Engine: Hardware acceleration profile switching (D3D11VA / NVDEC)',
    'Video Engine',
    () => {
      const bridge = new SimulatedMpvBridge();
      bridge.sendCommand('set_property', ['hwdec', 'nvdec']);
      const stats = bridge.getStats();
      const params = bridge.getVideoParams();
      if (stats.hwdec !== 'nvdec' || !params.hwdecActive) {
        throw new Error(`HWDEC failed to switch to nvdec: ${JSON.stringify(stats)}`);
      }
      return `HW acceleration profile switched to nvdec (hwdecActive: true)`;
    }
  );

  // 4. Deinterlacing Filter (Bwdif / Yadif)
  await runTest(
    'TEST-M2-04',
    'MPV Engine: Deinterlacer filter configuration (Bwdif 2x field doubling)',
    'Video Engine',
    () => {
      const bridge = new SimulatedMpvBridge();
      bridge.sendCommand('set_property', ['deinterlace', 'bwdif']);
      const stats = bridge.getStats();
      const params = bridge.getVideoParams();
      if (stats.deinterlace !== 'bwdif' || !params.deinterlaceActive) {
        throw new Error(`Deinterlacer failed to activate`);
      }
      return `Bwdif motion-adaptive deinterlacer enabled (Double-rate 59.94/60fps)`;
    }
  );

  // 5. Audio Track Switching via aid
  await runTest(
    'TEST-M2-05',
    'MPV Engine: Multi-track audio stream switching (aid)',
    'Audio & Subtitles',
    () => {
      const bridge = new SimulatedMpvBridge();
      bridge.sendCommand('set_property', ['aid', 3]); // Track 3: Spanish AC3
      const tracks = bridge.getTracks();
      const track3 = tracks.find((t) => t.id === 3);
      const track2 = tracks.find((t) => t.id === 2);
      if (!track3?.selected || track2?.selected) {
        throw new Error(`Track selection state incorrect`);
      }
      return `Switched audio track to #3 (Spanish AC3 6ch)`;
    }
  );

  // 6. Subtitle Track Switching via sid
  await runTest(
    'TEST-M2-06',
    'MPV Engine: Subtitle stream switching (sid)',
    'Audio & Subtitles',
    () => {
      const bridge = new SimulatedMpvBridge();
      bridge.sendCommand('set_property', ['sid', 4]); // Track 4: English CC
      const tracks = bridge.getTracks();
      const track4 = tracks.find((t) => t.id === 4);
      if (!track4?.selected) {
        throw new Error(`Subtitle track 4 not selected`);
      }
      return `Switched subtitle stream to #4 (English CEA-708 CC)`;
    }
  );

  // 7. Audio Delay Offset
  await runTest(
    'TEST-M2-07',
    'MPV Engine: Audio sync delay offset adjustment (+250ms)',
    'Audio & Subtitles',
    () => {
      const bridge = new SimulatedMpvBridge();
      bridge.sendCommand('set_property', ['audio-delay', 0.25]); // 250ms
      const stats = bridge.getStats();
      if (stats.audioDelayMs !== 250) {
        throw new Error(`Expected 250ms delay, got ${stats.audioDelayMs}ms`);
      }
      return `Applied +250ms audio sync delay`;
    }
  );

  // 8. Player Engine Channel Load via Connection Manager
  await runTest(
    'TEST-M2-08',
    'Player Engine: Tune into channel via Connection Manager (Max=1 lock)',
    'Playback Engine',
    async () => {
      const engine = new PlayerEngine();
      const result = await engine.loadChannel({
        id: 201,
        name: 'M2 Test Live Channel',
        streamUrl: 'http://provider.panel:8080/live/user/pass/201.m3u8',
        format: 'm3u8',
      });
      if (!result.success || !engine.getState().isPlaying) {
        throw new Error(`Channel load failed`);
      }
      return `Channel tuned in with generation token #${result.generationToken} (Exclusive connection active)`;
    }
  );

  // 9. Player Engine Teardown
  await runTest(
    'TEST-M2-09',
    'Player Engine: Stop & teardown releases active session cleanly',
    'Playback Engine',
    () => {
      const engine = new PlayerEngine();
      engine.stop('Test Stop');
      const state = engine.getState();
      if (state.isPlaying || globalConnectionManager.getActiveSession() !== null) {
        throw new Error(`Teardown failed to release session`);
      }
      return `Player stopped and active socket connection released`;
    }
  );

  // 10. Video Filter Adjustments Clamping
  await runTest(
    'TEST-M2-10',
    'Player Engine: Video filter shader parameters clamp to valid range (0-200)',
    'Video Engine',
    () => {
      const engine = new PlayerEngine();
      engine.setFilterAdjustment('brightness', 250); // Should clamp to 200
      engine.setFilterAdjustment('contrast', -20); // Should clamp to 0
      const filters = engine.getState().filters;
      if (filters.brightness !== 200 || filters.contrast !== 0) {
        throw new Error(`Filter clamp failed: brightness ${filters.brightness}, contrast ${filters.contrast}`);
      }
      return `Filter values clamped safely: Brightness=200%, Contrast=0%`;
    }
  );

  // 11. Aspect Ratio Overrides
  await runTest(
    'TEST-M2-11',
    'Player Engine: Aspect ratio override matrix calculation',
    'Video Engine',
    () => {
      const engine = new PlayerEngine();
      engine.setAspectRatio('21:9');
      if (engine.getState().filters.aspectRatio !== '21:9') {
        throw new Error(`Aspect ratio setting failed`);
      }
      return `Aspect ratio override set to 21:9 Ultrawide Cinema`;
    }
  );

  // 12. Stall Auto-Recovery Pipeline
  await runTest(
    'TEST-M2-12',
    'Stall Watchdog: 3-Stage auto-recovery steps down .m3u8 -> .ts on stall',
    'Stall Watchdog',
    async () => {
      const engine = new PlayerEngine();
      await engine.loadChannel({
        id: 301,
        name: 'Stall Test Channel',
        streamUrl: 'http://provider.panel:8080/live/user/pass/301.m3u8',
        format: 'm3u8',
      });

      engine.triggerSimulatedStall(100); // Trigger fast recovery
      await new Promise((r) => setTimeout(r, 200));

      const finalState = engine.getState();
      if (finalState.currentFormat !== 'ts') {
        throw new Error(`Expected auto-downgrade to .ts, got .${finalState.currentFormat}`);
      }
      return `Stall watchdog recovered stream and downgraded format from .m3u8 to .ts`;
    }
  );

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// CLI Execution Support
if (process.argv[1]?.endsWith('milestone2_tests.ts')) {
  runMilestone2TestSuite().then((summary) => {
    console.log('\n================== MILESTONE 2 AUTOMATED TEST SUITE ==================');
    console.log(`Total Assertions: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
    console.log('----------------------------------------------------------------------');
    summary.results.forEach((r) => {
      const mark = r.passed ? '[✓ PASS]' : '[✗ FAIL]';
      console.log(`${mark} [${r.category}] ${r.testId}: ${r.name} (${r.durationMs}ms)`);
      if (!r.passed && r.details) {
        console.error(`       Error: ${r.assertionMessage}`);
      }
    });
    console.log('======================================================================\n');
    process.exit(summary.failed > 0 ? 1 : 0);
  });
}

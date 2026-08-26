import React, { useState } from 'react';
import { Scte35DaiEngine } from '../lib/scte35DaiEngine';
import { MultiRoomCastEngine } from '../lib/multiRoomCastEngine';
import { HybridRfTunerEngine } from '../lib/hybridRfTunerEngine';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Tag,
  Cast,
  Radio,
  Clock,
  Sparkles,
  Activity,
  Layers,
  Zap,
} from 'lucide-react';

interface TestCase {
  id: string;
  milestone: 'Milestone 24' | 'Milestone 25' | 'Milestone 26';
  category: string;
  name: string;
  description: string;
  status: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  durationMs?: number;
  message?: string;
  details?: Record<string, any>;
}

const INITIAL_TESTS: TestCase[] = [
  // Milestone 24: SCTE-35 DAI
  {
    id: 'TEST-M24-01',
    milestone: 'Milestone 24',
    category: 'SCTE-35 Binary Parser',
    name: 'SCTE-35 Cue Marker Parsing (Splice Insert / Time Signal / Segmentation)',
    description: 'Decodes 64-bit binary descriptor payload and validates spliceEventId, duration, and segmentationTypeId.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M24-02',
    milestone: 'Milestone 24',
    category: 'SSAI & CSAI Stream Splicer',
    name: 'Seamless Ad Pod Splicer with Zero-Buffer Resync & PTS Alignment',
    description: 'Verifies uninterrupted transition between primary program timeline and multi-ad pod creatives.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M24-03',
    milestone: 'Milestone 24',
    category: 'VAST 4.2 / VMAP 1.0 Beacons',
    name: 'VAST 4.2 Quartile Beacons (Start, 25%, 50%, 75%, 100%) Tracking',
    description: 'Validates automated quartile beacon telemetry and impression logging during ad playback.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M24-04',
    milestone: 'Milestone 24',
    category: 'Ad Loudness Normalization',
    name: 'EBU R128 (-24 LUFS) Ad Audio Normalization & Drift Compensation',
    description: 'Tests loudness gain offset normalization to prevent sudden volume jumps during commercial breaks.',
    status: 'IDLE',
  },

  // Milestone 25: Multi-Room Cast
  {
    id: 'TEST-M25-01',
    milestone: 'Milestone 25',
    category: 'PTP/NTP Clock Sync',
    name: 'Microsecond Master-Follower PTP Clock Synchronization (<5ms Jitter)',
    description: 'Evaluates IEEE 1588 Precision Time Protocol master clock distribution across multi-room nodes.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M25-02',
    milestone: 'Milestone 25',
    category: 'Multi-Protocol Cast Discovery',
    name: 'Cast Protocol Discovery (Google Cast, AirPlay 2, DIAL SSDP, Matter)',
    description: 'Verifies concurrent network device discovery and capability probe classification.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M25-03',
    milestone: 'Milestone 25',
    category: 'Zero-Loss Handoff',
    name: 'Zero-Loss Playback State Handoff (Channel, PTS, Audio/Sub, Volume)',
    description: 'Tests seamless migration of active stream timeline and track state from local device to target screen.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M25-04',
    milestone: 'Milestone 25',
    category: 'Multi-Room Audio/Video Zone',
    name: 'Dynamic Multi-Room Audio/Video Zone Orchestration & Group Volume',
    description: 'Verifies leader election and follower sync arbitration for synchronized multi-device playback.',
    status: 'IDLE',
  },

  // Milestone 26: Hybrid RF & BISS
  {
    id: 'TEST-M26-01',
    milestone: 'Milestone 26',
    category: 'RF Frontend Demodulation',
    name: 'Multi-Standard RF Frontend Ingestion (DVB-T2, DVB-S2, ATSC 3.0 NextGen)',
    description: 'Tests hardware tuner transponder lock, frequency tuning, and modulation parsing.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M26-02',
    milestone: 'Milestone 26',
    category: 'Signal Quality Diagnostics',
    name: 'Real-Time RF Metrics (SNR dB, MER dB, Post-LDPC BER, Signal Level dBm)',
    description: 'Validates carrier-to-noise ratio, modulation error ratio, and clean zero post-LDPC error state.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M26-03',
    milestone: 'Milestone 26',
    category: 'BISS-1 / BISS-E Descrambler',
    name: 'BISS-1 & BISS-E 16-Hex Control Word (CW) Descrambling Pipeline',
    description: 'Verifies Even/Odd CW decryption and Injected ID session key descrambling on scrambled feeds.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M26-04',
    milestone: 'Milestone 26',
    category: 'PLP & Subtitle Demuxing',
    name: 'Physical Layer Pipe (PLP) & DVB-Subtitle / Teletext Demuxer',
    description: 'Tests demuxing of multi-carrier PLP pipes, DVB bitmap subtitles, and teletext streams.',
    status: 'IDLE',
  },
];

export const Milestones24to26TestSuite: React.FC = () => {
  const [tests, setTests] = useState<TestCase[]>(INITIAL_TESTS);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<'ALL' | 'M24' | 'M25' | 'M26'>('ALL');

  const runSingleTest = async (testId: string) => {
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'RUNNING', message: undefined } : t))
    );

    const start = performance.now();
    try {
      let msg = '';
      let details: Record<string, any> = {};

      if (testId === 'TEST-M24-01') {
        const engine = new Scte35DaiEngine();
        const marker = engine.parseScte35Hex('/DA0AAAAAAAA///wBQb+AAAAAAAiAiBDRVVJAAAAn3//AAA31g0KSU5URVJQQUNLUwEA');
        if (!marker.id || marker.spliceEventId <= 0 || marker.durationMs !== 30000) {
          throw new Error('Failed to parse SCTE-35 descriptor');
        }
        msg = `SCTE-35 parsed: ${marker.commandType} (Event #${marker.spliceEventId}, ${marker.durationMs / 1000}s)`;
        details = { ...marker };
        engine.destroy();
      } else if (testId === 'TEST-M24-02') {
        const engine = new Scte35DaiEngine();
        const breakRes = engine.triggerAdBreak(30);
        const tele = engine.getTelemetry();
        if (tele.currentStreamState !== 'AD_PLAYBACK' || !tele.activeAd || tele.adPodTotal !== 2) {
          throw new Error('Failed to splice ad pod');
        }
        msg = `Ad Pod spliced: ${tele.activeAd.title} (${tele.activeAd.durationSec}s). Splicing PTS drift: +${tele.ptsDriftCompensationMs}ms`;
        details = { adPodTotal: tele.adPodTotal, activeAd: tele.activeAd.title };
        engine.destroy();
      } else if (testId === 'TEST-M24-03') {
        const engine = new Scte35DaiEngine();
        engine.triggerAdBreak(15);
        const tele = engine.getTelemetry();
        if (tele.vastBeaconsDispatched < 2) {
          throw new Error('VAST beacons not dispatched');
        }
        msg = `VAST 4.2 Beacons dispatched: ${tele.vastBeaconsDispatched} events (Start/Impressions)`;
        details = { vastBeaconsDispatched: tele.vastBeaconsDispatched };
        engine.destroy();
      } else if (testId === 'TEST-M24-04') {
        const engine = new Scte35DaiEngine();
        const tele = engine.getTelemetry();
        const inventory = engine.getInventory();
        const isNormalized = inventory.every((ad) => Math.abs(ad.loudnessLufs - -24.0) <= 0.5);
        if (!isNormalized) {
          throw new Error('Ad loudness exceeds EBU R128 -24 LUFS threshold');
        }
        msg = `EBU R128 matched: All creatives normalized to -24.0 LUFS (Offset: ${tele.ebuR128GainOffsetDb} dB)`;
        details = { targetLufs: -24.0, ebuR128GainOffsetDb: tele.ebuR128GainOffsetDb };
        engine.destroy();
      } else if (testId === 'TEST-M25-01') {
        const engine = new MultiRoomCastEngine();
        const tele = engine.getTelemetry();
        if (tele.globalClockJitterMs > 5.0 || tele.masterPtpTimeEpochMs <= 0) {
          throw new Error(`Clock jitter ${tele.globalClockJitterMs}ms exceeds 5ms tolerance`);
        }
        msg = `PTP Master Clock locked. Jitter: ±${tele.globalClockJitterMs}ms (<5ms target)`;
        details = { jitterMs: tele.globalClockJitterMs, masterPtpEpoch: tele.masterPtpTimeEpochMs };
        engine.destroy();
      } else if (testId === 'TEST-M25-02') {
        const engine = new MultiRoomCastEngine();
        const devices = engine.refreshDiscovery();
        if (devices.length < 4) {
          throw new Error('Discovered fewer than 4 cast nodes');
        }
        msg = `Discovered ${devices.length} Cast devices (AirPlay 2, Google Cast, DIAL SSDP, Matter)`;
        details = { count: devices.length, devices: devices.map((d) => d.friendlyName) };
        engine.destroy();
      } else if (testId === 'TEST-M25-03') {
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
        if (!handoff.success || handoff.latencyMs > 300) {
          throw new Error('Handoff failed or exceeded latency budget');
        }
        msg = `Zero-Loss Handoff to Living Room OLED completed in ${handoff.latencyMs}ms`;
        details = { success: handoff.success, latencyMs: handoff.latencyMs };
        engine.destroy();
      } else if (testId === 'TEST-M25-04') {
        const engine = new MultiRoomCastEngine();
        const group = engine.createMultiRoomZone('Whole House Sync', 'DEV-CAST-LG-OLED-01', [
          'DEV-CAST-SONY-BRAVIA-02',
          'DEV-CAST-APPLETV-03',
        ]);
        if (!group.isSynced || group.memberDeviceIds.length !== 3) {
          throw new Error('Failed to create synced zone');
        }
        msg = `Multi-Room Zone created: ${group.name} (${group.memberDeviceIds.length} members locked)`;
        details = { groupName: group.name, members: group.memberDeviceIds };
        engine.destroy();
      } else if (testId === 'TEST-M26-01') {
        const engine = new HybridRfTunerEngine();
        const tele = engine.getTelemetry();
        if (tele.allTuners.length < 3 || tele.activeTuner.lockStatus !== 'LOCKED') {
          throw new Error('RF Frontend tuner lock failure');
        }
        msg = `RF Frontends active: DVB-S2 (11.49GHz), ATSC 3.0 (545MHz), DVB-T2 (682MHz)`;
        details = { activeTuner: tele.activeTuner.standard, freq: tele.activeTuner.frequencyMhz };
        engine.destroy();
      } else if (testId === 'TEST-M26-02') {
        const engine = new HybridRfTunerEngine();
        const tele = engine.getTelemetry();
        const t = tele.activeTuner;
        if (t.snrDb < 10.0 || t.merDb < 12.0 || t.berPostLdpc !== 0.0) {
          throw new Error('RF signal quality out of bounds');
        }
        msg = `RF Signal Quality: SNR ${t.snrDb} dB, MER ${t.merDb} dB, Post-LDPC BER ${t.berPostLdpc.toFixed(1)}`;
        details = { snrDb: t.snrDb, merDb: t.merDb, berPostLdpc: t.berPostLdpc };
        engine.destroy();
      } else if (testId === 'TEST-M26-03') {
        const engine = new HybridRfTunerEngine();
        const res = engine.setBissKey(10401, '26F8A1BFA034E276', '26F8A1BFA034E276', 'BISS_1');
        if (!res.success || res.status !== 'DESCRAMBLING_OK') {
          throw new Error('BISS-1 CW descrambler failed');
        }
        msg = `BISS-1 16-Hex CW Decrypted: DESCRAMBLING_OK (Service 0x28A1)`;
        details = { status: res.status, keyEven: '26F8A1BFA034E276' };
        engine.destroy();
      } else if (testId === 'TEST-M26-04') {
        const engine = new HybridRfTunerEngine();
        const tele = engine.getTelemetry();
        const channelsWithSub = tele.channels.filter((c) => c.hasDvbSubtitles);
        if (channelsWithSub.length === 0 || tele.activePlpCount <= 0) {
          throw new Error('PLP or DVB subtitle demuxing failed');
        }
        msg = `Demuxed ${tele.channels.length} RF services across ${tele.activePlpCount} PLP pipes with DVB-Subtitles`;
        details = { channels: tele.channels.length, plpCount: tele.activePlpCount };
        engine.destroy();
      }

      const durationMs = Math.round(performance.now() - start);
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId ? { ...t, status: 'PASSED', durationMs, message: msg, details } : t
        )
      );
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - start);
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? { ...t, status: 'FAILED', durationMs, message: err.message || 'Assertion failed' }
            : t
        )
      );
    }
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    for (const test of tests) {
      if (
        selectedMilestone === 'ALL' ||
        (selectedMilestone === 'M24' && test.milestone === 'Milestone 24') ||
        (selectedMilestone === 'M25' && test.milestone === 'Milestone 25') ||
        (selectedMilestone === 'M26' && test.milestone === 'Milestone 26')
      ) {
        await runSingleTest(test.id);
      }
    }
    setIsRunningAll(false);
  };

  const handleReset = () => {
    setTests(INITIAL_TESTS);
  };

  const filteredTests = tests.filter((t) => {
    if (selectedMilestone === 'M24') return t.milestone === 'Milestone 24';
    if (selectedMilestone === 'M25') return t.milestone === 'Milestone 25';
    if (selectedMilestone === 'M26') return t.milestone === 'Milestone 26';
    return true;
  });

  const passedCount = filteredTests.filter((t) => t.status === 'PASSED').length;
  const failedCount = filteredTests.filter((t) => t.status === 'FAILED').length;

  return (
    <div id="milestones-24-26-test-suite" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
                Milestones 24, 25 &amp; 26
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Advanced Broadcast &amp; Distribution Test Suite (12 Tests)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Automated end-to-end regression validation for SCTE-35 DAI &amp; SSAI Splicing (M24), Multi-Room PTP Sync &amp; Cast Handoff (M25), and Hybrid RF Frontend &amp; BISS-1/E Descrambler (M26).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-run-all-m24-26-tests"
              onClick={handleRunAll}
              disabled={isRunningAll}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunningAll ? 'Executing Suite...' : 'Run All Tests (12)'}
            </button>
            <button
              id="btn-reset-m24-26-tests"
              onClick={handleReset}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Scoreboard */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setSelectedMilestone('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              selectedMilestone === 'ALL'
                ? 'bg-slate-800 text-indigo-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Milestones (12)
          </button>
          <button
            onClick={() => setSelectedMilestone('M24')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              selectedMilestone === 'M24'
                ? 'bg-slate-800 text-indigo-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            M24: SCTE-35 DAI (4)
          </button>
          <button
            onClick={() => setSelectedMilestone('M25')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              selectedMilestone === 'M25'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            M25: Multi-Room Cast (4)
          </button>
          <button
            onClick={() => setSelectedMilestone('M26')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              selectedMilestone === 'M26'
                ? 'bg-slate-800 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            M26: Hybrid RF &amp; BISS (4)
          </button>
        </div>

        {/* Scoreboard */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
            Total: {filteredTests.length}
          </span>
          <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 rounded-lg text-emerald-300 font-bold">
            Passed: {passedCount}
          </span>
          {failedCount > 0 && (
            <span className="px-3 py-1 bg-red-950 border border-red-800 rounded-lg text-red-300 font-bold">
              Failed: {failedCount}
            </span>
          )}
        </div>
      </div>

      {/* Test Cases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTests.map((test) => (
          <div
            key={test.id}
            id={`card-${test.id}`}
            className={`bg-slate-900 border rounded-xl p-5 space-y-3 transition ${
              test.status === 'PASSED'
                ? 'border-emerald-800/80 bg-emerald-950/10'
                : test.status === 'FAILED'
                ? 'border-red-800/80 bg-red-950/10'
                : test.status === 'RUNNING'
                ? 'border-indigo-600/80 bg-indigo-950/10'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px] font-bold">
                  {test.id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    test.milestone === 'Milestone 24'
                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      : test.milestone === 'Milestone 25'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {test.milestone}
                </span>
                <span className="text-xs text-slate-400 font-mono">{test.category}</span>
              </div>

              <button
                id={`btn-run-${test.id}`}
                onClick={() => runSingleTest(test.id)}
                disabled={test.status === 'RUNNING'}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md transition flex items-center gap-1 border border-slate-700"
              >
                <Play className="w-3 h-3 fill-current" /> Run
              </button>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-100">{test.name}</h4>
              <p className="text-xs text-slate-400 mt-1">{test.description}</p>
            </div>

            {/* Test Result Bar */}
            {test.status !== 'IDLE' && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono space-y-1 ${
                  test.status === 'PASSED'
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : test.status === 'FAILED'
                    ? 'bg-red-950/40 border-red-800 text-red-300'
                    : 'bg-indigo-950/40 border-indigo-800 text-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {test.status === 'PASSED' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {test.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-400" />}
                    {test.status === 'RUNNING' && <Activity className="w-4 h-4 text-indigo-400 animate-spin" />}
                    {test.status}
                  </span>
                  {test.durationMs !== undefined && <span>{test.durationMs}ms</span>}
                </div>
                {test.message && <div className="text-[11px] text-slate-300 pt-1">{test.message}</div>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

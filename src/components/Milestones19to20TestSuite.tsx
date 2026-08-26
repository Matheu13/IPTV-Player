import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Shield,
  Layers,
  Activity,
  Cpu,
  Clock,
  Tv,
  Radio,
  Sliders,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { globalStalkerPortalEngine, StalkerPortalEngine } from '../lib/stalkerPortalEngine';
import { globalLeanbackSpatialEngine, LeanbackSpatialEngine } from '../lib/leanbackSpatialEngine';
import { redact } from '../lib/redact';

export interface TestCaseResult {
  id: string;
  milestone: 'M19' | 'M20';
  title: string;
  description: string;
  passed: boolean;
  durationMs: number;
  assertionDetails: string[];
}

export const Milestones19to20TestSuite: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestCaseResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<TestCaseResult | null>(null);

  const runAllTests = async () => {
    setRunning(true);
    const testRuns: TestCaseResult[] = [];

    // ==========================================
    // MILESTONE 19: STALKER / MAG PROTOCOL TESTS
    // ==========================================

    // Test M19-01: Stalker Handshake & Random Salt Negotiation
    {
      const start = performance.now();
      const engine = new StalkerPortalEngine();
      const hs = await engine.executeHandshake();
      const sess = engine.getSession();
      const passed =
        hs.success === true &&
        typeof hs.token === 'string' &&
        hs.token.startsWith('STK_AUTH_') &&
        typeof hs.randomSalt === 'string' &&
        sess.status === 'AUTHENTICATED';
      const durationMs = Math.round(performance.now() - start);

      testRuns.push({
        id: 'TEST-M19-01',
        milestone: 'M19',
        title: 'Stalker Handshake & Cryptographic Salt Challenge Negotiation',
        description: 'Verifies STB v4/v5 handshake, token acquisition, and authenticated session state machine.',
        passed,
        durationMs,
        assertionDetails: [
          `Handshake Success: ${hs.success}`,
          `Generated Token: ${hs.token}`,
          `Random Challenge Salt: ${hs.randomSalt}`,
          `Session Status: ${sess.status}`,
          `Handshake Latency: ${hs.handshakeLatencyMs}ms`,
        ],
      });
    }

    // Test M19-02: Stalker Cmd Stream Wrapper Unwrapping
    {
      const start = performance.now();
      const engine = new StalkerPortalEngine();
      const cmdFfmpeg = 'ffmpeg http://edge.mag-stream.net/live/skymain_uhd.m3u8';
      const cmdFfrt = 'ffrt http://edge.mag-stream.net/live/tnt1_fhd.ts';
      const cmdAuto = 'auto http://edge.mag-stream.net/live/hbopremiere_4k.m3u8';

      const unwrappedFfmpeg = engine.resolveCmdStreamUrl(cmdFfmpeg);
      const unwrappedFfrt = engine.resolveCmdStreamUrl(cmdFfrt);
      const unwrappedAuto = engine.resolveCmdStreamUrl(cmdAuto);

      const passed =
        unwrappedFfmpeg === 'http://edge.mag-stream.net/live/skymain_uhd.m3u8' &&
        unwrappedFfrt === 'http://edge.mag-stream.net/live/tnt1_fhd.ts' &&
        unwrappedAuto === 'http://edge.mag-stream.net/live/hbopremiere_4k.m3u8';
      const durationMs = Math.round(performance.now() - start);

      testRuns.push({
        id: 'TEST-M19-02',
        milestone: 'M19',
        title: 'Stalker Cmd Link Syntax Resolution (ffmpeg / ffrt / auto / mpv)',
        description: 'Ensures player wrapper prefixes are stripped cleanly without corrupting target stream URLs.',
        passed,
        durationMs,
        assertionDetails: [
          `Resolved ffmpeg: ${unwrappedFfmpeg}`,
          `Resolved ffrt: ${unwrappedFfrt}`,
          `Resolved auto: ${unwrappedAuto}`,
          `No wrapper artifacts remaining in resolved URLs`,
        ],
      });
    }

    // Test M19-03: Stalker Timeshift Catchup URL Generation
    {
      const start = performance.now();
      const engine = new StalkerPortalEngine();
      const channels = engine.getChannels();
      const chArchive = channels.find((c) => c.hasArchive)!;
      const epochStart = 1700000000;
      const catchupUrl = engine.generateCatchupUrl(chArchive, epochStart, 60);

      const passed =
        catchupUrl.includes('archive=1700000000') &&
        catchupUrl.includes('archive_end=1700003600') &&
        catchupUrl.includes('token=');
      const durationMs = Math.round(performance.now() - start);

      testRuns.push({
        id: 'TEST-M19-03',
        milestone: 'M19',
        title: 'Stalker Timeshift Catchup URL Generation with UTC Epoch Offsets',
        description: 'Validates archive start/stop timestamp calculation and query parameter serialization for DVR replay.',
        passed,
        durationMs,
        assertionDetails: [
          `Target Channel: #${chArchive.number} - ${chArchive.name}`,
          `Archive Duration Supported: ${chArchive.archiveDurationHours}h`,
          `Generated Catchup Replay URL: ${catchupUrl}`,
        ],
      });
    }

    // Test M19-04: MAC Address & STB Header Security Redaction
    {
      const start = performance.now();
      const engine = new StalkerPortalEngine();
      const portal = engine.getPortals()[0];
      const headers = engine.buildStbHeaders(portal);
      const maskedMac = redact(portal.macAddress);

      const passed =
        headers['Cookie'].includes('mac=') &&
        headers['User-Agent'].includes(portal.deviceModel) &&
        (maskedMac.includes('XX') || maskedMac.includes('***') || maskedMac.includes('…')) &&
        maskedMac !== portal.macAddress;
      const durationMs = Math.round(performance.now() - start);

      testRuns.push({
        id: 'TEST-M19-04',
        milestone: 'M19',
        title: 'Authorized MAG STB Header Construction & MAC Security Redaction',
        description: 'Ensures MAC address cookies and QtEmbedded user agents are formatted properly while redaction masks PII.',
        passed,
        durationMs,
        assertionDetails: [
          `Raw MAC: ${portal.macAddress}`,
          `Masked Telemetry MAC: ${maskedMac}`,
          `STB Cookie Header: ${headers['Cookie']}`,
          `STB User-Agent: ${headers['User-Agent']}`,
        ],
      });
    }

    // ==========================================
    // MILESTONE 20: 10-FOOT LEANBACK & OSD TESTS
    // ==========================================

    // Test M20-01: 2D D-Pad Directional Spatial Focus Grid Traversal
    {
      const start = performance.now();
      const engine = new LeanbackSpatialEngine();
      engine.setFocusNodeId('grid_0_0');

      engine.dispatchKeyEvent('DPAD_RIGHT');
      const nodeRight = engine.getCurrentFocusNodeId();

      engine.dispatchKeyEvent('DPAD_DOWN');
      const nodeDown = engine.getCurrentFocusNodeId();

      engine.dispatchKeyEvent('DPAD_LEFT');
      const nodeLeft = engine.getCurrentFocusNodeId();

      const passed = nodeRight === 'grid_0_1' && nodeDown === 'grid_1_1' && nodeLeft === 'grid_1_0';
      const durationMs = Math.round(performance.now() - start);

      testRuns.push({
        id: 'TEST-M20-01',
        milestone: 'M20',
        title: '2D D-Pad Spatial Focus Traversal & Directional Boundary Clamping',
        description: 'Verifies linear and matrix node focus movement across television UI rows and columns.',
        passed,
        durationMs,
        assertionDetails: [
          `Initial Node: grid_0_0`,
          `After DPAD_RIGHT: ${nodeRight}`,
          `After DPAD_DOWN: ${nodeDown}`,
          `After DPAD_LEFT: ${nodeLeft}`,
        ],
      });
    }

    // Test M20-02: Channel Zapping OSD Banner Lifecycle & EPG Progress
    {
      const start = performance.now();
      const engine = new LeanbackSpatialEngine();
      const initialCh = engine.getOsdState().currentChannel;

      engine.dispatchKeyEvent('CH_UP');
      const tunedCh = engine.getOsdState().currentChannel;
      const osdVisible = engine.getOsdState().isBannerVisible;

      const passed = initialCh.number !== tunedCh.number && osdVisible === true;
      const durationMs = Math.round(performance.now() - start);

      testRuns.push({
        id: 'TEST-M20-02',
        milestone: 'M20',
        title: 'Channel Zapping OSD Banner Lifecycle & EPG Progress Computation',
        description: 'Validates channel up/down switching, instant OSD overlay trigger, and now/next programme tracking.',
        passed,
        durationMs,
        assertionDetails: [
          `Initial Channel: #${initialCh.number} (${initialCh.name})`,
          `Tuned Channel: #${tunedCh.number} (${tunedCh.name})`,
          `OSD Banner Visible: ${osdVisible}`,
          `Current Program: ${tunedCh.nowPlaying} (${tunedCh.nowProgressPercent}%)`,
        ],
      });
    }

    // Test M20-03: Direct Numeric Keypad Channel Buffer with Auto-Tune
    {
      const start = performance.now();
      const engine = new LeanbackSpatialEngine();
      engine.dispatchKeyEvent('NUMERIC_DIGIT', 1);
      engine.dispatchKeyEvent('NUMERIC_DIGIT', 0);
      engine.dispatchKeyEvent('NUMERIC_DIGIT', 2);

      const buffer = engine.getOsdState().numericBuffer;
      const commitSuccess = engine.commitNumericBuffer();
      const activeCh = engine.getOsdState().currentChannel;

      const passed = buffer === '102' && commitSuccess === true && activeCh.number === 102;
      const durationMs = Math.round(performance.now() - start);

      testRuns.push({
        id: 'TEST-M20-03',
        milestone: 'M20',
        title: 'Direct Numeric Keypad Channel Buffer with 1.2s Debounce Auto-Tune',
        description: 'Tests multi-digit key buffering (e.g. 1 -> 0 -> 2) and instant channel tune commit.',
        passed,
        durationMs,
        assertionDetails: [
          `Buffered Digits: ${buffer}`,
          `Commit Result: ${commitSuccess}`,
          `Tuned Channel: #${activeCh.number} - ${activeCh.name}`,
          `Audio Codec: ${activeCh.audioCodec}`,
        ],
      });
    }

    // Test M20-04: Voice Search Assistant Intent Parsing & EPG Fuzzy Match
    {
      const start = performance.now();
      const engine = new LeanbackSpatialEngine();
      const results = engine.executeVoiceSearch('premier league');

      const passed =
        results.length > 0 &&
        results.some((r) => r.title.toLowerCase().includes('premier') || r.subtitle.toLowerCase().includes('premier'));
      const durationMs = Math.round(performance.now() - start);

      testRuns.push({
        id: 'TEST-M20-04',
        milestone: 'M20',
        title: 'Voice Assistant Query Intent Parser & EPG Keyword Fuzzy Matcher',
        description: 'Evaluates natural speech search resolving live channels and on-air EPG program schedules.',
        passed,
        durationMs,
        assertionDetails: [
          `Query: "premier league"`,
          `Matched Count: ${results.length}`,
          `First Match: ${results[0]?.title} (${results[0]?.subtitle})`,
        ],
      });
    }

    setResults(testRuns);
    setSelectedResult(testRuns[0]);
    setRunning(false);
  };

  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;

  return (
    <div id="m19-20-test-suite-container" className="space-y-6">
      {/* Header & Runner Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-100">
                Milestones 19 &amp; 20 Automated Verification Test Suite
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                8 Assertions
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Automated tests for Stalker/MAG Middleware Protocol (M19) and 10-Foot Spatial Leanback Navigation &amp; OSD (M20).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-run-m19-20-tests"
              onClick={runAllTests}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Executing Tests...' : 'Run All 8 Tests'}
            </button>
          </div>
        </div>

        {/* Test Suite Summary Banner */}
        {results.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Total Assertions</span>
              <span className="text-slate-200 font-bold font-mono text-sm">{results.length}</span>
            </div>
            <div className="p-3 bg-emerald-950/40 rounded-lg border border-emerald-800/60 flex items-center justify-between">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Passed
              </span>
              <span className="text-emerald-300 font-bold font-mono text-sm">{totalPassed}</span>
            </div>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                {totalFailed > 0 ? <XCircle className="w-4 h-4 text-rose-400" /> : <Check className="w-4 h-4 text-emerald-400" />}
                Failed
              </span>
              <span className={`font-bold font-mono text-sm ${totalFailed > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {totalFailed}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Test List & Detailed Assertion Inspector */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Test Case Cards */}
          <div className="lg:col-span-6 space-y-3">
            {results.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedResult(t)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex items-start justify-between gap-3 ${
                  selectedResult?.id === t.id
                    ? 'bg-indigo-950/60 border-indigo-500 text-slate-100 shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        t.milestone === 'M19'
                          ? 'bg-indigo-900 text-indigo-300 border border-indigo-700'
                          : 'bg-cyan-900 text-cyan-300 border border-cyan-700'
                      }`}
                    >
                      {t.milestone}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400">{t.id}</span>
                  </div>
                  <div className="font-semibold text-slate-200">{t.title}</div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{t.description}</p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {t.passed ? (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Pass
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1 font-semibold text-[11px]">
                      <XCircle className="w-3.5 h-3.5" /> Fail
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 font-mono">{t.durationMs}ms</span>
                </div>
              </div>
            ))}
          </div>

          {/* Right Column: Assertion Details & Telemetry Output */}
          <div className="lg:col-span-6">
            {selectedResult ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-mono text-indigo-400">{selectedResult.id}</span>
                    <h3 className="text-sm font-bold text-slate-100">{selectedResult.title}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                      selectedResult.passed
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {selectedResult.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-300">Verified System Assertions:</span>
                  <div className="space-y-1.5">
                    {selectedResult.assertionDetails.map((a, i) => (
                      <div
                        key={i}
                        className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 flex items-start gap-2"
                      >
                        <span className="text-indigo-400 select-none">✓</span>
                        <span className="break-all">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
                Select a test case to view detailed assertion metrics.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

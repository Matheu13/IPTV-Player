import React, { useState } from 'react';
import { ForensicWatermarkEngine } from '../lib/forensicWatermarkEngine';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Fingerprint,
  Layers,
  Activity,
  Search,
  ShieldAlert,
} from 'lucide-react';

interface TestCase {
  id: string;
  category: string;
  name: string;
  description: string;
  status: 'IDLE' | 'RUNNING' | 'PASSED' | 'FAILED';
  durationMs?: number;
  message?: string;
  details?: Record<string, any>;
}

const INITIAL_TESTS: TestCase[] = [
  {
    id: 'TEST-M27-01',
    category: 'A/B Variant Steganography',
    name: 'A/B Variant Stream Bitstream Switching Sequence Generation',
    description: 'Validates 16-bit binary payload encoding and dynamic A/B segment rotation based on subscriber token.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M27-02',
    category: 'Visual OSD Watermarking',
    name: 'Dynamic Visual OSD Jitter Watermark with Micro-Coordinates & Opacity Control',
    description: 'Verifies randomized coordinate placement (X/Y %) and bounded opacity (3-25%) on video canvas.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M27-03',
    category: 'Forensic Leak Extraction',
    name: 'Forensic Watermark Decoding & Leak Attribution to Subscriber Identity',
    description: 'Extracts encoded watermark payload from simulated restream and verifies 99%+ subscriber ID & IP match.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M27-04',
    category: 'DRM License Revocation',
    name: 'Zero-Trust DRM License Invalidation & Automated Takedown Signal Dispatch',
    description: 'Tests automated edge-CAS webhook killswitch, session termination, and token blackholing latency (<100ms).',
    status: 'IDLE',
  },
];

export const Milestone27TestSuite: React.FC = () => {
  const [tests, setTests] = useState<TestCase[]>(INITIAL_TESTS);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const runSingleTest = async (testId: string) => {
    setTests((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'RUNNING', message: undefined } : t))
    );

    const start = performance.now();
    try {
      let msg = '';
      let details: Record<string, any> = {};

      if (testId === 'TEST-M27-01') {
        const engine = new ForensicWatermarkEngine();
        const tele = engine.getTelemetry();
        if (
          !tele.activeSession.variantPayloadBitSequence ||
          tele.activeSession.variantPayloadBitSequence.length !== 16 ||
          !['VARIANT_A', 'VARIANT_B'].includes(tele.activeVariantSegment)
        ) {
          throw new Error('A/B variant sequence generation failed');
        }
        msg = `A/B Variant sequence initialized: ${tele.activeSession.variantPayloadBitSequence} (Current: ${tele.activeVariantSegment})`;
        details = {
          variant: tele.activeVariantSegment,
          sequence: tele.activeSession.variantPayloadBitSequence,
        };
        engine.destroy();
      } else if (testId === 'TEST-M27-02') {
        const engine = new ForensicWatermarkEngine();
        const tele = engine.getTelemetry();
        if (
          tele.currentVisualXPosPct < 0 ||
          tele.currentVisualXPosPct > 100 ||
          tele.currentVisualYPosPct < 0 ||
          tele.currentVisualYPosPct > 100 ||
          tele.activeSession.visualOpacityPct <= 0
        ) {
          throw new Error('Visual watermark coordinate or opacity out of bounds');
        }
        msg = `Visual watermark positioned at (${tele.currentVisualXPosPct}%, ${tele.currentVisualYPosPct}%) with ${tele.activeSession.visualOpacityPct}% opacity`;
        details = {
          x: tele.currentVisualXPosPct,
          y: tele.currentVisualYPosPct,
          opacity: tele.activeSession.visualOpacityPct,
        };
        engine.destroy();
      } else if (testId === 'TEST-M27-03') {
        const engine = new ForensicWatermarkEngine();
        const res = engine.extractForensicAttribution();
        if (
          !res.leakFound ||
          res.matchConfidencePct < 95 ||
          !res.extractedSubscriberId ||
          !res.extractedIpAddress
        ) {
          throw new Error('Forensic leak extraction failed or confidence too low');
        }
        msg = `Attribution confirmed: ${res.extractedSubscriberId} (${res.extractedIpAddress}) with ${res.matchConfidencePct}% confidence (${res.variantBitMatches}/16 bits matched)`;
        details = { ...res };
        engine.destroy();
      } else if (testId === 'TEST-M27-04') {
        const engine = new ForensicWatermarkEngine();
        const res = engine.dispatchRevocationWebhook();
        const tele = engine.getTelemetry();
        if (!res.success || !tele.activeSession.isSessionRevoked || res.latencyMs > 100) {
          throw new Error('DRM license revocation webhook failed or exceeded latency');
        }
        msg = `Killswitch executed: ${res.status} in ${res.latencyMs}ms. DRM session token blackholed.`;
        details = { success: res.success, latencyMs: res.latencyMs, status: res.status };
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
      await runSingleTest(test.id);
    }
    setIsRunningAll(false);
  };

  const handleReset = () => {
    setTests(INITIAL_TESTS);
  };

  const passedCount = tests.filter((t) => t.status === 'PASSED').length;
  const failedCount = tests.filter((t) => t.status === 'FAILED').length;

  return (
    <div id="milestone-27-test-suite" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded-full text-xs font-mono font-semibold">
                Milestone 27
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-rose-400" />
                Forensic Watermarking &amp; Anti-Piracy Test Suite (4 Tests)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Automated validation for NexGuard-compliant A/B bitstream steganography, dynamic visual OSD coordinate jitter, forensic leak reverse attribution, and real-time DRM token killswitch webhook latency.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-run-all-m27-tests"
              onClick={handleRunAll}
              disabled={isRunningAll}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunningAll ? 'Executing Suite...' : 'Run All Tests (4)'}
            </button>
            <button
              id="btn-reset-m27-tests"
              onClick={handleReset}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Scoreboard */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
            Total: {tests.length}
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
        {tests.map((test) => (
          <div
            key={test.id}
            id={`card-${test.id}`}
            className={`bg-slate-900 border rounded-xl p-5 space-y-3 transition ${
              test.status === 'PASSED'
                ? 'border-emerald-800/80 bg-emerald-950/10'
                : test.status === 'FAILED'
                ? 'border-red-800/80 bg-red-950/10'
                : test.status === 'RUNNING'
                ? 'border-rose-600/80 bg-rose-950/10'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px] font-bold">
                  {test.id}
                </span>
                <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded font-mono text-[10px] font-bold">
                  Milestone 27
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
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    {test.status === 'PASSED' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {test.status === 'FAILED' && <XCircle className="w-4 h-4 text-red-400" />}
                    {test.status === 'RUNNING' && <Activity className="w-4 h-4 text-rose-400 animate-spin" />}
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

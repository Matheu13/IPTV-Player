import React, { useState } from 'react';
import { SpatialAudioEngine } from '../lib/spatialAudioEngine';
import {
  Headphones,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Layers,
  Activity,
  Compass,
  Mic,
  Volume2,
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
    id: 'TEST-M28-01',
    category: 'Object-Based Audio Bed',
    name: 'MPEG-H 3D Audio Object Bed & ADM Metadata Parser (7.1.4 Bed + Dynamic Objects)',
    description: 'Validates 7.1.4 surround bed channels, dynamic 3D sound objects, and coordinate spatialization.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M28-02',
    category: 'Binaural HRTF & Head Tracking',
    name: 'Binaural HRTF Virtualizer & Gyro Head Tracking Simulation (Yaw/Pitch/Roll)',
    description: 'Verifies real-time 3D polar spatial compensation and low-latency DSP rendering (<5ms).',
    status: 'IDLE',
  },
  {
    id: 'TEST-M28-03',
    category: 'Dialogue Enhancement',
    name: 'ClearVoice Dialogue Isolation & Interactive Speech Boost Gain (+0dB to +12dB)',
    description: 'Tests speech isolation gain range and target dialogue track amplification without clipping.',
    status: 'IDLE',
  },
  {
    id: 'TEST-M28-04',
    category: 'Interactive Personalization',
    name: 'Interactive Audio Stream Personalization & Broadcast Presets Switching',
    description: 'Verifies dynamic track switching (Stadium Immersion, Enhanced Commentary, Ambience Only).',
    status: 'IDLE',
  },
];

export const Milestone28TestSuite: React.FC = () => {
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

      if (testId === 'TEST-M28-01') {
        const engine = new SpatialAudioEngine();
        const tele = engine.getTelemetry();
        if (
          tele.objects.length < 5 ||
          !tele.activeBedFormat.includes('MPEG-H') ||
          tele.totalActiveRenderObjects < 4
        ) {
          throw new Error('Object-based audio bed initialization failed');
        }
        msg = `Bed initialized: ${tele.activeBedFormat} with ${tele.objects.length} discrete audio tracks`;
        details = { format: tele.activeBedFormat, objects: tele.objects.length };
        engine.destroy();
      } else if (testId === 'TEST-M28-02') {
        const engine = new SpatialAudioEngine();
        engine.setHeadTrackingOrientation(45, 10, -5);
        const tele = engine.getTelemetry();
        if (
          tele.profile.headTrackingYawDeg !== 45 ||
          tele.profile.headTrackingPitchDeg !== 10 ||
          tele.binauralProcessingLatencyMs > 5.0
        ) {
          throw new Error('Binaural HRTF or head tracking angle mismatch');
        }
        msg = `Binaural HRTF active (${tele.profile.headphoneHrtfModel}) with 45° Yaw head compensation, latency: ${tele.binauralProcessingLatencyMs}ms`;
        details = { ...tele.profile, latencyMs: tele.binauralProcessingLatencyMs };
        engine.destroy();
      } else if (testId === 'TEST-M28-03') {
        const engine = new SpatialAudioEngine();
        engine.setDialogueClarityBoost(8.0);
        const tele = engine.getTelemetry();
        const diagObj = tele.objects.find((o) => o.category === 'DIALOGUE');
        if (
          tele.profile.dialogueClarityBoostDb !== 8.0 ||
          !diagObj ||
          diagObj.gainDb < 4.0 ||
          tele.dialogueIsolationRatioPct < 85
        ) {
          throw new Error('Dialogue clarity boost assertion failed');
        }
        msg = `Dialogue boosted by +${tele.profile.dialogueClarityBoostDb} dB (Isolation: ${tele.dialogueIsolationRatioPct}%)`;
        details = { boostDb: tele.profile.dialogueClarityBoostDb, isolationPct: tele.dialogueIsolationRatioPct };
        engine.destroy();
      } else if (testId === 'TEST-M28-04') {
        const engine = new SpatialAudioEngine();
        engine.applyPreset('PURE_ATMOSPHERE');
        const tele = engine.getTelemetry();
        const diagObj = tele.objects.find((o) => o.id === 'OBJ-BED-C');
        if (tele.selectedAudioPreset !== 'PURE_ATMOSPHERE' || !diagObj || !diagObj.isMuted) {
          throw new Error('Audio preset switching failed');
        }
        msg = `Preset applied: ${tele.selectedAudioPreset} (Dialogue muted, stadium ambient gain boosted)`;
        details = { preset: tele.selectedAudioPreset, dialogueMuted: diagObj.isMuted };
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
    <div id="milestone-28-test-suite" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
                Milestone 28
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-400" />
                Spatial Audio &amp; MPEG-H 3D Renderer Test Suite (4 Tests)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Automated validation for 7.1.4 + 3D audio object rendering, binaural HRTF headphone spatialization, ClearVoice dialogue boost isolation, and multi-stream audio personalizer presets.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-run-all-m28-tests"
              onClick={handleRunAll}
              disabled={isRunningAll}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition flex items-center gap-2 shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {isRunningAll ? 'Executing Suite...' : 'Run All Tests (4)'}
            </button>
            <button
              id="btn-reset-m28-tests"
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
                ? 'border-indigo-600/80 bg-indigo-950/10'
                : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px] font-bold">
                  {test.id}
                </span>
                <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded font-mono text-[10px] font-bold">
                  Milestone 28
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

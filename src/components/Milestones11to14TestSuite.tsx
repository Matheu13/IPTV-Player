import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Shield,
  Layers,
  Tv,
  Activity,
  Database,
  Terminal,
  Cpu,
  Volume2,
  HardDrive,
  Lock,
} from 'lucide-react';
import { Milestone11to14TestResult } from '../../scripts/milestones_11_to_14_tests';

export const Milestones11to14TestSuite: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: Milestone11to14TestResult[];
  } | null>(null);

  const executeTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/m11-14/test-suite');
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      }
    } catch (err: any) {
      console.error('Error running milestones 11-14 test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    executeTests();
  }, []);

  return (
    <div id="milestones-11-14-test-suite" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              Automated Test Runner: Milestones 11, 12, 13 &amp; 14
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              End-to-end integration &amp; unit validation covering Audio/Subtitles (M11), DVR/Timeshift (M12), ABR/QoS (M13), and Parental Vault (M14).
            </p>
          </div>
          <div className="flex items-center gap-3">
            {testResults && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-semibold">
                  {testResults.passed} / {testResults.total} PASSED
                </span>
                {testResults.failed > 0 && (
                  <span className="px-3 py-1 bg-rose-950 text-rose-300 border border-rose-800 rounded-full font-semibold">
                    {testResults.failed} FAILED
                  </span>
                )}
              </div>
            )}
            <button
              onClick={executeTests}
              disabled={running}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? 'Executing Tests...' : 'Run All Test Assertions'}
            </button>
          </div>
        </div>
      </div>

      {/* Test Milestone Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-sans">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-indigo-400">
            <Volume2 className="w-4 h-4" />
            <span>Milestone 11</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Dolby Atmos passthrough, WebVTT subtitle sync &amp; ±5000ms delay calibration.
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-cyan-400">
            <HardDrive className="w-4 h-4" />
            <span>Milestone 12</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Single-connection DVR conflict detection, 2-hour circular timeshift &amp; LRU pruning.
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-emerald-400">
            <Activity className="w-4 h-4" />
            <span>Milestone 13</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            EWMA bandwidth estimator, ABR hysteresis ladder, and Low-Latency chunk drift.
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-purple-400">
            <Lock className="w-4 h-4" />
            <span>Milestone 14</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Salted PIN vault, 60s rate-limited lockout, age-rating limits &amp; profile curfews.
          </p>
        </div>
      </div>

      {/* Test Execution Output */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            Detailed Test Assertions &amp; Output Log
          </span>
          {testResults && (
            <span className="text-xs text-slate-400 font-mono">
              Total Assertions: {testResults.total}
            </span>
          )}
        </h3>

        <div className="space-y-2">
          {running ? (
            <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span>Executing test runner across Milestones 11 through 14...</span>
            </div>
          ) : testResults?.results.map((res) => (
            <div
              key={res.testId}
              className={`p-3.5 rounded-lg border text-xs transition-all ${
                res.passed
                  ? 'bg-slate-950 border-slate-800 text-slate-200'
                  : 'bg-rose-950/60 border-rose-800 text-rose-200'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  {res.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-mono text-indigo-300 font-bold">{res.testId}</span>
                  <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400">
                    {res.milestone}
                  </span>
                  <span className="font-semibold text-slate-200">{res.name}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">{res.durationMs}ms</span>
              </div>

              {res.assertionMessage && (
                <div className="mt-2 text-[11px] text-emerald-400/90 font-mono pl-6">
                  ↳ {res.assertionMessage}
                </div>
              )}

              {res.error && (
                <div className="mt-2 text-[11px] text-rose-400 font-mono pl-6">
                  ↳ ERROR: {res.error}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

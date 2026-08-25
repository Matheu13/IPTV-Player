import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Sparkles,
  Calendar,
  Film,
  Tv,
  Gamepad2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface TestResult {
  suite: string;
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

export const Milestone3TestSuite: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [summary, setSummary] = useState<TestSuiteSummary | null>(null);
  const [selectedSuiteFilter, setSelectedSuiteFilter] = useState<string>('ALL');

  const runSuite = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/m3/test-suite');
      const data = await res.json();
      setSummary(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runSuite();
  }, []);

  const results = summary?.results || [];
  const filteredResults =
    selectedSuiteFilter === 'ALL'
      ? results
      : results.filter((r) => r.suite.includes(selectedSuiteFilter));

  return (
    <div className="space-y-6" id="milestone-3-test-suite">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Milestone 3 Automated Test Engine (3a • 3b • 3c)</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">16 Real-Time Assertion Validators</h2>
          <p className="text-slate-400 text-xs mt-1">
            EPG Grid, XMLTV Timezone Parsers, Xtream Base64 Decoders, Catchup Timeshift, VOD Hierarchy & Remote Debouncers.
          </p>
        </div>

        <button
          id="btn-run-m3-tests"
          onClick={runSuite}
          disabled={isRunning}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow"
        >
          {isRunning ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          {isRunning ? 'Executing Suite...' : 'Re-Run Milestone 3 Tests'}
        </button>
      </div>

      {/* Summary Scorecard */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Assertions</div>
              <div className="text-2xl font-bold text-white mt-0.5">{summary.total}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-mono text-sm font-bold">
              16/16
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Passed Assertions</div>
              <div className="text-2xl font-bold text-emerald-400 mt-0.5">{summary.passed}</div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Failed Assertions</div>
              <div className={`text-2xl font-bold mt-0.5 ${summary.failed > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                {summary.failed}
              </div>
            </div>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                summary.failed > 0
                  ? 'bg-rose-950/80 border border-rose-800 text-rose-400'
                  : 'bg-slate-800/60 text-slate-500'
              }`}
            >
              <XCircle className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {['ALL', '3A', '3B', '3C'].map((f) => (
          <button
            key={f}
            onClick={() => setSelectedSuiteFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedSuiteFilter === f
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {f === 'ALL'
              ? 'All Modules (16)'
              : f === '3A'
              ? '3a: EPG & Catchup'
              : f === '3B'
              ? '3b: VOD & Series'
              : '3c: Channel & Remote'}
          </button>
        ))}
      </div>

      {/* Test List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800/80 overflow-hidden shadow-sm">
        {filteredResults.map((test) => (
          <div
            key={test.testId}
            className={`p-4 flex items-start justify-between gap-4 transition-colors ${
              test.passed ? 'hover:bg-slate-850' : 'bg-rose-950/20'
            }`}
          >
            <div className="flex items-start gap-3">
              {test.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                    {test.testId}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">[{test.suite}]</span>
                </div>
                <div className="text-sm font-semibold text-white">{test.name}</div>
                {test.error && <div className="text-xs text-red-400 font-mono mt-1">{test.error}</div>}
              </div>
            </div>

            <div className="text-xs font-mono text-slate-500 shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{test.durationMs}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

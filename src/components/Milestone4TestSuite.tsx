import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles,
  Clock,
  ShieldCheck,
  AlertCircle,
  Database,
  Zap,
} from 'lucide-react';

interface TestResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  error?: string;
}

interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResult[];
}

export const Milestone4TestSuite: React.FC = () => {
  const [summary, setSummary] = useState<TestSuiteSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/m4/test-suite');
      const data = await res.json();
      setSummary(data);
      if (data.results && data.results.length > 0) {
        setSelectedTest(data.results[0]);
      }
    } catch (err: any) {
      console.error('Failed to run M4 test suite:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div id="m4-test-suite-container" className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Milestone 4a: Automated Verification Test Suite (11 Assertions)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            End-to-end verification of streaming XMLTV ingest (OOM prevention), on-the-fly Gzip streaming, compound SQLite indexing, atomic transactions, exact &amp; fuzzy <code className="text-indigo-300 font-mono">tvg-id</code> matching, unmatched channel preservation, and sub-millisecond Now/Next batch queries.
          </p>
        </div>

        <button
          id="btn-run-m4-suite"
          disabled={isRunning}
          onClick={runTests}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer shrink-0"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running Verification Suite...
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" /> Run Test Suite (11 Tests)
            </>
          )}
        </button>
      </div>

      {/* Summary Scoreboard */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Total Assertions</span>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{summary.total}</div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Passed</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-5 h-5" /> {summary.passed}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Failed</span>
            <div
              className={`text-2xl font-bold font-mono mt-1 flex items-center gap-1.5 ${
                summary.failed > 0 ? 'text-rose-400' : 'text-slate-500'
              }`}
            >
              {summary.failed > 0 ? <XCircle className="w-5 h-5" /> : null} {summary.failed}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <span className="text-xs text-slate-400">Suite Duration</span>
            <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">{summary.durationMs} ms</div>
          </div>
        </div>
      )}

      {/* Test List & Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Test Cases List */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Test Execution Results</h3>
            <span className="text-[10px] font-mono text-slate-400">
              {summary ? `${summary.passed}/${summary.total} Passing` : 'Pending execution'}
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[520px] overflow-y-auto scrollbar-thin">
            {summary?.results.map((test) => {
              const isSelected = selectedTest?.id === test.id;
              return (
                <button
                  key={test.id}
                  onClick={() => setSelectedTest(test)}
                  className={`w-full p-3.5 text-left transition flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-950/40 border-l-2 border-indigo-500'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded">
                        {test.id}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
                        {test.category}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-200 line-clamp-1">{test.name}</div>
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1 font-mono text-[10px]">
                    {test.passed ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1 font-semibold">
                        <XCircle className="w-3.5 h-3.5" /> FAIL
                      </span>
                    )}
                    <span className="text-slate-500">{test.durationMs}ms</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Test Detail Inspector */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Assertion Inspector</h3>
            {selectedTest && (
              <span className="font-mono text-xs font-bold text-indigo-400">{selectedTest.id}</span>
            )}
          </div>

          {selectedTest ? (
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Test Description:</span>
                <p className="text-slate-200 font-semibold leading-relaxed">{selectedTest.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Category</span>
                  <span className="text-slate-300 font-bold">{selectedTest.category}</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 text-[10px] block">Duration</span>
                  <span className="text-indigo-300 font-bold">{selectedTest.durationMs} ms</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Execution Status:</span>
                <div
                  className={`p-3 rounded-lg border font-mono text-xs ${
                    selectedTest.passed
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                  }`}
                >
                  {selectedTest.passed ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Verified: All assertion bounds satisfied.</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-bold">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>Assertion Failed</span>
                      </div>
                      <p className="text-rose-300/90 text-[11px]">{selectedTest.error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 text-xs text-center py-8">Select a test to inspect details</div>
          )}
        </div>
      </div>
    </div>
  );
};

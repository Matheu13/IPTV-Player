import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Tv,
  Focus,
  Sliders,
  Keyboard,
  ShieldCheck,
  AlertCircle,
  Zap,
} from 'lucide-react';

interface TestResult {
  testId: string;
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  assertionMessage?: string;
  error?: string;
}

interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}

export const Milestone5TestSuite: React.FC = () => {
  const [summary, setSummary] = useState<TestSuiteSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestResult | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/m5/test-suite');
      const data = await res.json();
      setSummary(data);
      if (data.results && data.results.length > 0) {
        setSelectedTest(data.results[0]);
      }
    } catch (err: any) {
      console.error('Failed to run M5 test suite:', err);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div id="m5-test-suite-container" className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Tv className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-100">
                  Milestone 5 Test Suite (Android TV & Fire TV UX)
                </h2>
                <p className="text-sm text-slate-400">
                  Spatial 2D Focus Engine, D-Pad Remote Traversal, Overscan Safety & Leanback Layouts
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              id="m5-run-tests-btn"
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg font-medium transition-colors text-sm shadow-sm"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-200" />
                  <span>Running Suite...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Re-run Suite</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Aggregate Stats */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                Total Assertions
              </span>
              <span className="text-2xl font-bold text-slate-200">{summary.total}</span>
            </div>
            <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-3">
              <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider block">
                Passed Tests
              </span>
              <span className="text-2xl font-bold text-emerald-400">{summary.passed}</span>
            </div>
            <div className="bg-rose-950/20 border border-rose-800/30 rounded-lg p-3">
              <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider block">
                Failed Tests
              </span>
              <span className="text-2xl font-bold text-rose-400">{summary.failed}</span>
            </div>
            <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block">
                Pass Rate
              </span>
              <span className="text-2xl font-bold text-indigo-300">
                {summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tests Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Test List */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Automated Verification Matrix</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono">12 Targeted Specs</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[580px] overflow-y-auto">
            {summary?.results.map((test) => {
              const isSelected = selectedTest?.testId === test.testId;
              return (
                <button
                  key={test.testId}
                  onClick={() => setSelectedTest(test)}
                  className={`w-full text-left p-3.5 transition-colors flex items-start space-x-3 hover:bg-slate-800/50 ${
                    isSelected ? 'bg-indigo-950/30 border-l-2 border-indigo-500' : ''
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {test.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">
                        {test.testId}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {test.durationMs}ms
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-200 truncate mt-0.5">
                      {test.name}
                    </p>
                    <span className="inline-block px-1.5 py-0.5 mt-1 text-[10px] rounded bg-slate-800 text-slate-400 font-mono">
                      {test.category}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Test Detail Inspector */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
          {selectedTest ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-indigo-400 font-bold">
                    {selectedTest.testId}
                  </span>
                  <h3 className="text-lg font-bold text-slate-100 mt-0.5">
                    {selectedTest.name}
                  </h3>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 ${
                    selectedTest.passed
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/50'
                      : 'bg-rose-950/60 text-rose-300 border border-rose-700/50'
                  }`}
                >
                  {selectedTest.passed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>PASSED</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>FAILED</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Category Subsystem
                  </label>
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-sm text-slate-300 font-medium">
                    {selectedTest.category}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Assertion Outcome & Execution Message
                  </label>
                  <div
                    className={`p-4 rounded-lg border font-mono text-xs leading-relaxed ${
                      selectedTest.passed
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                        : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                    }`}
                  >
                    {selectedTest.assertionMessage || selectedTest.error || 'Test passed successfully'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Execution Metrics
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <span className="text-xs text-slate-500 block">Duration</span>
                      <span className="text-sm font-mono font-semibold text-slate-300">
                        {selectedTest.durationMs} ms
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                      <span className="text-xs text-slate-500 block">Platform Target</span>
                      <span className="text-sm font-mono font-semibold text-indigo-400">
                        Android TV / Fire OS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">
              Select a test from the left panel to inspect assertion telemetry.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

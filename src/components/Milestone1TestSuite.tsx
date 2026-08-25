import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Play, RefreshCw, AlertTriangle, ShieldCheck, Database, Layers } from 'lucide-react';

interface TestResult {
  testId: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  assertionMessage: string;
  details?: any;
}

export const Milestone1TestSuite: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testSummary, setTestSummary] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: TestResult[];
  } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const runTests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/m1/test-suite');
      const data = await res.json();
      setTestSummary(data);
    } catch (err) {
      console.error('Failed to run test suite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const categories = testSummary
    ? ['ALL', ...Array.from(new Set(testSummary.results.map((r) => r.category)))]
    : ['ALL'];

  const filteredResults = testSummary?.results.filter(
    (r) => selectedCategory === 'ALL' || r.category === selectedCategory
  );

  return (
    <div id="m1-test-suite-container" className="space-y-6">
      {/* Header & Runner Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-slate-100">
              Milestone 1 Automated Test Suite
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Running 13 rigorous assertions against the 12 scrubbed Milestone 0 fixtures (Error Taxonomy, URL Policy, M3U Asymmetry, Empty-Overwrite Guard, Connection Limit).
          </p>
        </div>

        <button
          id="btn-run-m1-tests"
          onClick={runTests}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/60 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer self-start md:self-auto"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {loading ? 'Executing Suite...' : 'Re-Run All Assertions'}
        </button>
      </div>

      {/* Summary Scorecards */}
      {testSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium">Total Assertions</div>
              <div className="text-2xl font-bold font-mono text-slate-100 mt-0.5">{testSummary.total}</div>
            </div>
            <Layers className="w-7 h-7 text-indigo-400/60" />
          </div>

          <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs text-emerald-300 font-medium">Passed</div>
              <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">{testSummary.passed}</div>
            </div>
            <CheckCircle2 className="w-7 h-7 text-emerald-400/60" />
          </div>

          <div className={`p-4 border rounded-xl flex items-center justify-between ${
            testSummary.failed > 0
              ? 'bg-rose-950/40 border-rose-800/60 text-rose-400'
              : 'bg-slate-900/80 border-slate-800 text-slate-400'
          }`}>
            <div>
              <div className="text-xs font-medium">Failed</div>
              <div className="text-2xl font-bold font-mono mt-0.5">{testSummary.failed}</div>
            </div>
            <XCircle className="w-7 h-7 opacity-60" />
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium whitespace-nowrap">Filter Domain:</span>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-lg transition whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs font-medium text-slate-400">
          <span>Test Assertion Name &amp; Failure Mode Tested</span>
          <span>Status &amp; Timing</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {filteredResults?.map((r) => (
            <div key={r.testId} className="p-4 hover:bg-slate-800/30 transition space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded border border-slate-700 font-semibold">
                      {r.testId}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">{r.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-400 border border-slate-700">
                      {r.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{r.assertionMessage}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] font-mono text-slate-400">{r.durationMs}ms</span>
                  {r.passed ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2.5 py-1 rounded-lg">
                      <XCircle className="w-3.5 h-3.5" /> FAIL
                    </span>
                  )}
                </div>
              </div>

              {r.details && (
                <pre className="p-2.5 bg-slate-950 border border-rose-900/50 rounded text-[11px] font-mono text-rose-300 overflow-x-auto">
                  {r.details}
                </pre>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

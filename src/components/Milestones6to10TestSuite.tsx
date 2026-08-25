import React, { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, RefreshCw, Shield, Layers, Tv, Activity, Database, Terminal, Cpu } from 'lucide-react';

export const Milestones6to10TestSuite: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<string>('ALL');

  const executeTests = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/m6-10/test-suite');
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      }
    } catch (err: any) {
      console.error('Error running test suite:', err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    executeTests();
  }, []);

  const filteredResults = testResults?.results?.filter((r: any) => {
    if (selectedMilestone === 'ALL') return true;
    return r.milestone.toLowerCase().includes(selectedMilestone.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
                Milestones 6, 7, 8, 9 &amp; 10
              </span>
              <h2 className="text-xl font-bold text-slate-100">Verification &amp; Architecture Test Suite</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Automated unit &amp; integration testing covering Streaming XMLTV, Stalker/MAG Protocol, 8K/HDR Decoders, VPN Diagnostics &amp; Multi-Source Matrix.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={executeTests}
              disabled={running}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-all shadow-md active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${running ? 'animate-spin' : ''}`} />
              {running ? 'Executing Tests...' : 'Re-run All Tests'}
            </button>
          </div>
        </div>

        {/* Milestone Selector Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 border-t border-slate-800 pt-4">
          {[
            { id: 'ALL', label: 'All Milestones (6 - 10)', icon: Layers },
            { id: 'Milestone 6', label: 'M6: Streaming XMLTV & SQLite', icon: Database },
            { id: 'Milestone 7', label: 'M7: Stalker / MAG Adapter', icon: Tv },
            { id: 'Milestone 8', label: 'M8: Decoders, 8K/HDR & VPN', icon: Activity },
            { id: 'Milestone 9', label: 'M9: Multi-Source Matrix', icon: Cpu },
            { id: 'Milestone 10', label: 'M10: Hardening & Redaction', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = selectedMilestone === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedMilestone(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-slate-700 text-cyan-300 border border-cyan-500/30'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border border-slate-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metrics Summary */}
      {testResults && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium">Total Assertions</div>
            <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{testResults.total}</div>
          </div>
          <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-4">
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Passed
            </div>
            <div className="text-2xl font-bold text-emerald-300 font-mono mt-1">{testResults.passed}</div>
          </div>
          <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-4">
            <div className="text-xs text-rose-400 font-medium flex items-center gap-1.5">
              <XCircle className="w-4 h-4" /> Failed
            </div>
            <div className="text-2xl font-bold text-rose-300 font-mono mt-1">{testResults.failed}</div>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-medium">Pass Rate</div>
            <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
              {Math.round((testResults.passed / (testResults.total || 1)) * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-200">Execution Log</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredResults?.length || 0} assertions
          </span>
        </div>

        <div className="divide-y divide-slate-800/70 max-h-[500px] overflow-y-auto font-sans">
          {filteredResults?.map((r: any) => (
            <div key={r.testId} className="p-4 hover:bg-slate-800/40 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  {r.passed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                        {r.testId}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                        {r.milestone}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">• {r.category}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-200 mt-1">{r.name}</div>
                    {r.assertionMessage && (
                      <div className="text-xs text-emerald-400/90 font-mono mt-1 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30">
                        {r.assertionMessage}
                      </div>
                    )}
                    {r.error && (
                      <div className="text-xs text-rose-400 font-mono mt-1 bg-rose-950/30 px-2 py-1 rounded border border-rose-900/50">
                        {r.error}
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-xs font-mono text-slate-400 shrink-0">{r.durationMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

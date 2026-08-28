import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Link2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Play,
  RotateCcw,
  Search,
  Sliders,
  Tv,
  Layers,
  Database,
  Info,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { EpgMatchResult } from '../lib/fuzzyEpgMatcher';

export const Milestone31TestSuite: React.FC = () => {
  const [testSuiteData, setTestSuiteData] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'simulator' | 'tests'>('overview');

  // Interactive Match Simulator State
  const [simChannelName, setSimChannelName] = useState('|UK| Sky Sports F1 (FHD) [RAW]');
  const [simChannelTvgId, setSimChannelTvgId] = useState('');
  const [simChannelId, setSimChannelId] = useState('2050');
  const [simThreshold, setSimThreshold] = useState(0.45);
  const [simResult, setSimResult] = useState<EpgMatchResult | null>(null);

  const sampleChannels = [
    {
      label: 'Exact tvg-id Match',
      name: 'BBC 1 UK Regional Broadcast Feed',
      tvgId: 'bbc1.uk',
      id: 'stream_991',
      type: 'EXACT_TVG_ID',
    },
    {
      label: 'Exact Provider Channel ID',
      name: 'UK Premium Motorsport [F1 Feeds]',
      tvgId: '',
      id: '2050',
      type: 'EXACT_PROVIDER_ID',
    },
    {
      label: 'Normalized Name Match',
      name: '|UK| DISCOVERY SCIENCE (FHD) [RAW]',
      tvgId: '',
      id: 'stream_777',
      type: 'NORMALIZED_NAME',
    },
    {
      label: 'High-Confidence Fuzzy Match',
      name: 'CNN News Internatnl HighDef',
      tvgId: '',
      id: 'stream_888',
      type: 'FUZZY_TOKEN',
    },
    {
      label: 'Uncertain Fuzzy Match (Flagged)',
      name: 'Sky Sports Action Live',
      tvgId: '',
      id: 'stream_999',
      type: 'UNCERTAIN_FUZZY',
    },
    {
      label: 'Unmatched Channel (Preserved)',
      name: 'Local Community Access TV (No Guide)',
      tvgId: 'unknown.id.404',
      id: 'stream_404',
      type: 'UNMATCHED',
    },
  ];

  const runSimulator = async () => {
    try {
      const res = await fetch('/api/m31/batch-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels: [
            {
              id: simChannelId,
              name: simChannelName,
              tvgId: simChannelTvgId || undefined,
            },
          ],
          threshold: simThreshold,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.mappings && data.mappings.length > 0) {
          setSimResult(data.mappings[0]);
        }
      }
    } catch (err) {
      console.error('Failed to simulate match:', err);
    }
  };

  const runAutomatedTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/m31/test-suite');
      if (res.ok) {
        const data = await res.json();
        setTestSuiteData(data);
      }
    } catch (err) {
      console.error('Failed to run M31 test suite:', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  useEffect(() => {
    runSimulator();
    runAutomatedTests();
  }, []);

  return (
    <div id="milestone-31-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600/20 border border-indigo-500/40 rounded-xl text-indigo-400 shadow-inner">
              <Link2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Milestone 31: Intelligent EPG Channel Matching &amp; Uncertainty Guard
                </h1>
                <span className="text-[10px] font-mono font-semibold uppercase bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 px-2 py-0.5 rounded-full">
                  Requirement 31
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Multi-stage matching pipeline: Exact tvg-id &bull; Exact provider ID &bull; Normalized name &bull; High-confidence fuzzy &bull; Uncertainty flagging &bull; Unmatched preservation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runAutomatedTests}
              disabled={isRunningTests}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRunningTests ? 'animate-spin' : ''}`} />
              {isRunningTests ? 'Executing M31 Test Assertions...' : 'Run Automated Tests'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Matching Rules Overview
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'simulator'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Interactive Match Simulator
          </button>
          <button
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'tests'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Automated Assertions {testSuiteData ? `(${testSuiteData.totalPassed}/${testSuiteData.results?.length || 7} Passed)` : ''}
          </button>
        </div>
      </div>

      {/* TAB 1: OVERVIEW & ARCHITECTURAL SPECS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" /> 1. Exact Matching Stages
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Prioritizes deterministic, zero-collision lookups:
            </p>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Exact tvg-id:</strong> Matches channel tvg-id against XMLTV channel descriptors (Score: 1.0).
              </li>
              <li>
                <strong className="text-slate-200">Exact Provider ID:</strong> Matches provider numeric stream/channel IDs when present (Score: 1.0).
              </li>
              <li>
                <strong className="text-slate-200">Normalized Name:</strong> Strips country prefixes, resolution tags (4K, FHD), brackets, and noise (Score: 0.95).
              </li>
            </ul>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" /> 2. Uncertainty Guard
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Prevents silent corruption of EPG schedules on weak or ambiguous matches:
            </p>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-slate-200">No Silent Binding:</strong> If fuzzy match confidence is below 82% or multiple candidates tie, guide binding is blocked.
              </li>
              <li>
                <strong className="text-slate-200">Preserve &amp; Flag:</strong> Channel is preserved in catalog and marked with an amber warning badge.
              </li>
              <li>
                <strong className="text-slate-200">Candidate Stored:</strong> Suggested candidate and confidence are recorded for manual operator review.
              </li>
            </ul>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-4 h-4" /> 3. Unmatched Preservation
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unmatched channels are 100% playable and never filtered out:
            </p>
            <ul className="text-xs text-slate-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-slate-200">Never Hidden:</strong> All provider channels remain in the live catalog, search, and infinite feed.
              </li>
              <li>
                <strong className="text-slate-200">"No EPG available":</strong> Explicitly displays &ldquo;No EPG available&rdquo; fallback card with active live player button.
              </li>
              <li>
                <strong className="text-slate-200">Sub-millisecond:</strong> Evaluated in memory and indexed SQLite tables.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Preset Buttons & Input Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span>Channel Matching Inputs</span>
              <span className="text-[11px] text-slate-500 font-normal">Test against XMLTV guide database</span>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Test Preset Cases</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sampleChannels.map((sample, sIdx) => (
                  <button
                    key={sIdx}
                    onClick={() => {
                      setSimChannelName(sample.name);
                      setSimChannelTvgId(sample.tvgId);
                      setSimChannelId(sample.id);
                      setTimeout(() => runSimulator(), 50);
                    }}
                    className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition cursor-pointer space-y-1"
                  >
                    <div className="text-xs font-semibold text-indigo-300">{sample.label}</div>
                    <div className="text-[10px] text-slate-400 truncate">{sample.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-800/80">
              <div>
                <label className="text-[11px] font-semibold text-slate-400">Channel Name (from playlist)</label>
                <input
                  type="text"
                  value={simChannelName}
                  onChange={(e) => setSimChannelName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">tvg-id (optional)</label>
                  <input
                    type="text"
                    value={simChannelTvgId}
                    placeholder="e.g. bbc1.uk"
                    onChange={(e) => setSimChannelTvgId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">Provider Channel ID / stream_id</label>
                  <input
                    type="text"
                    value={simChannelId}
                    onChange={(e) => setSimChannelId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={runSimulator}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Evaluate Channel Match
              </button>
            </div>
          </div>

          {/* Match Outcome Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span>Matching Pipeline Outcome</span>
              {simResult && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                    simResult.isMatched
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                      : simResult.isUncertain
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {simResult.matchType}
                </span>
              )}
            </div>

            {simResult ? (
              <div className="space-y-4">
                {/* Visual Status Banner */}
                <div
                  className={`p-4 rounded-xl border flex items-start gap-3 ${
                    simResult.isMatched
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                      : simResult.isUncertain
                      ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300'
                  }`}
                >
                  {simResult.isMatched ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : simResult.isUncertain ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1">
                    <div className="text-xs font-bold">
                      {simResult.isMatched
                        ? `Confident Guide Match Binding (${Math.round(simResult.matchScore * 100)}%)`
                        : simResult.isUncertain
                        ? `Uncertain Match Flagged — Protected from False Binding`
                        : `No XMLTV Guide Available — Channel Preserved`}
                    </div>
                    <p className="text-[11px] opacity-80 leading-relaxed">
                      {simResult.reviewReason ||
                        (simResult.isMatched
                          ? `EPG broadcast data from '${simResult.xmltvDisplayName}' successfully bound to live channel.`
                          : `Channel remains 100% playable with 'No EPG available' fallback banner.`)}
                    </p>
                  </div>
                </div>

                {/* Details Breakdown */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-500 font-medium">Input Channel:</span>
                    <span className="text-slate-200 font-mono">{simResult.channelName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-500 font-medium">Resolved Match Type:</span>
                    <span className="text-indigo-400 font-mono font-bold">{simResult.matchType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-500 font-medium">Confidence Score:</span>
                    <span className="text-slate-200 font-mono">{Math.round(simResult.matchScore * 100)}%</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-500 font-medium">Bound XMLTV Channel ID:</span>
                    <span className="text-slate-200 font-mono">{simResult.xmltvChannelId || 'null (unbound)'}</span>
                  </div>
                  {simResult.flaggedCandidateName && (
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-amber-400 font-medium">Flagged Candidate:</span>
                      <span className="text-amber-200 font-mono">{simResult.flaggedCandidateName}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Channel Visibility:</span>
                    <span className="text-emerald-400 font-semibold">100% Preserved (Never Hidden)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Evaluating matching rules...
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATED TEST SUITE REPORT */}
      {activeTab === 'tests' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-slate-200">
              Milestone 31 Automated Test Suite Execution Log
            </div>
            {testSuiteData && (
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {testSuiteData.totalPassed} Passed
                </span>
                {testSuiteData.totalFailed > 0 && (
                  <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                    {testSuiteData.totalFailed} Failed
                  </span>
                )}
              </div>
            )}
          </div>

          {testSuiteData?.results ? (
            <div className="space-y-2">
              {testSuiteData.results.map((r: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                    r.passed ? 'bg-slate-950/60 border-slate-800/80' : 'bg-red-950/40 border-red-800'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {r.passed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5">
                      <div className="font-semibold text-slate-200">{r.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono leading-relaxed">{r.details}</div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                      r.passed ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                    }`}
                  >
                    {r.passed ? 'PASS' : 'FAIL'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No test report loaded yet. Click &ldquo;Run Automated Tests&rdquo; to execute.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

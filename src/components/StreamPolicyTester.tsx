import React, { useState, useEffect } from 'react';
import { Radio, ArrowDownRight, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, Play } from 'lucide-react';
import { ResolvedStreamPlan, DowngradeEvent } from '../lib/streamUrlPolicy';

export const StreamPolicyTester: React.FC = () => {
  const [streamId, setStreamId] = useState<number>(10452);
  const [allowedFormats, setAllowedFormats] = useState<string>('m3u8, ts, rtmp');
  const [currentFormat, setCurrentFormat] = useState<string>('m3u8');
  const [streamPlan, setStreamPlan] = useState<ResolvedStreamPlan | null>(null);
  const [downgrades, setDowngrades] = useState<DowngradeEvent[]>([]);
  const [downgradeReason, setDowngradeReason] = useState<string>('Video decoder stall / 404 segment failure');

  const fetchPlan = async () => {
    const formats = allowedFormats.split(',').map((f) => f.trim()).filter(Boolean);
    try {
      const res = await fetch('/api/m1/stream-url-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'http://provider.panel-stream.net:8080',
          username: 'demo_user',
          password: 'demo_password',
          streamId,
          allowedOutputFormats: formats,
        }),
      });
      const data = await res.json();
      setStreamPlan(data.plan);
      setCurrentFormat(data.plan.preferredFormat);
      setDowngrades(data.downgrades || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSimulateDowngrade = async () => {
    if (!streamPlan) return;
    try {
      const res = await fetch('/api/m1/simulate-downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentFormat,
          plan: streamPlan,
          streamId,
          reason: downgradeReason,
        }),
      });
      const data = await res.json();
      if (data.nextFormat) {
        setCurrentFormat(data.nextFormat);
      }
      if (data.event) {
        setDowngrades((prev) => [data.event, ...prev]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [streamId, allowedFormats]);

  return (
    <div id="stream-policy-tester-container" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-slate-100">
            Milestone 1 Stream URL Policy &amp; Playback Downgrade Engine
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Stream URLs are dynamically computed from panel permissions without hardcoded extensions. HLS (<code className="text-indigo-300">.m3u8</code>) is preferred for fast seeking and recovery, automatically stepping down to <code className="text-amber-300">.ts</code> on playback failures.
        </p>
      </div>

      {/* Inputs & Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 text-xs">
        <div>
          <label className="text-slate-400 block mb-1">Target Stream ID:</label>
          <input
            type="number"
            value={streamId}
            onChange={(e) => setStreamId(parseInt(e.target.value, 10) || 1)}
            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="text-slate-400 block mb-1">Panel Allowed Formats (from Auth):</label>
          <input
            type="text"
            value={allowedFormats}
            onChange={(e) => setAllowedFormats(e.target.value)}
            placeholder="e.g. m3u8, ts, rtmp"
            className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={fetchPlan}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Recompute URL Plan
          </button>
        </div>
      </div>

      {/* Stream Plan & Downgrade Simulation */}
      {streamPlan && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Plan Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Dynamic Stream URL Plan
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
                <div className="text-slate-400 font-mono text-[11px]">Preferred Primary Format:</div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono font-bold text-xs">
                    .{streamPlan.preferredFormat}
                  </span>
                  <span className="text-[11px] text-slate-300">{streamPlan.policyReason}</span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400 text-xs">Primary Stream URL:</div>
                <div className="p-2.5 bg-slate-950 border border-indigo-900/60 rounded font-mono text-[11px] text-indigo-300 break-all select-all">
                  {streamPlan.primaryUrl}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400 text-xs">Configured Fallback Chain:</div>
                <div className="space-y-1.5">
                  {streamPlan.fallbackUrls.map((f, i) => (
                    <div key={i} className="p-2 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-slate-400 flex items-center justify-between">
                      <span className="text-amber-300 font-semibold">Priority #{i + 2}: .{f.format}</span>
                      <span className="truncate max-w-[280px] text-slate-500">{f.url}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Downgrade Simulator Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
                Playback Failure &amp; Downgrade Simulator
              </h3>
              <span className="text-[11px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                Active: <strong className="text-emerald-400">.{currentFormat}</strong>
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              When the active stream stalls or returns decode errors, the player steps down the priority chain automatically and logs the downgrade event.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Simulate Failure Cause:</label>
                <input
                  type="text"
                  value={downgradeReason}
                  onChange={(e) => setDowngradeReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <button
                id="btn-simulate-downgrade"
                onClick={handleSimulateDowngrade}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold transition cursor-pointer"
              >
                <ArrowDownRight className="w-4 h-4" />
                Trigger Playback Downgrade (.{currentFormat} &rarr; Fallback)
              </button>
            </div>

            {/* Downgrade Audit Log */}
            <div className="space-y-1.5 pt-2">
              <div className="text-xs font-medium text-slate-400">Downgrade Audit Trail:</div>
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 max-h-[140px] overflow-y-auto space-y-2 text-[11px] font-mono">
                {downgrades.length > 0 ? (
                  downgrades.map((d, i) => (
                    <div key={i} className="p-1.5 bg-slate-900 rounded border border-slate-800 space-y-0.5">
                      <div className="flex items-center justify-between text-slate-400 text-[10px]">
                        <span>Stream #{d.streamId}</span>
                        <span>{new Date(d.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-amber-400 font-semibold">
                        Downgraded: .{d.failedFormat} &rarr; .{d.downgradedToFormat}
                      </div>
                      <div className="text-slate-500 truncate">{d.reason}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-500 italic">No downgrade events logged yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

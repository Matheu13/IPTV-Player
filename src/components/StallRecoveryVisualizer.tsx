import React, { useState } from 'react';
import { ShieldAlert, Zap, ArrowDownRight, RefreshCw, CheckCircle2, AlertTriangle, Activity, Play } from 'lucide-react';
import { globalPlayerEngine, PlayerEngineState } from '../lib/playerEngine';

export const StallRecoveryVisualizer: React.FC = () => {
  const [engineState, setEngineState] = useState<PlayerEngineState>(globalPlayerEngine.getState());
  const [simulatedStallTime, setSimulatedStallTime] = useState<number>(3500);
  const [logs, setLogs] = useState<string[]>([]);

  React.useEffect(() => {
    const unsub = globalPlayerEngine.subscribe((s) => {
      setEngineState(s);
    });
    return () => unsub();
  }, []);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  const handleTriggerStall = () => {
    addLog(`Buffer underrun triggered! Buffer health dropped to 0.1s.`);
    addLog(`Stall Watchdog armed (threshold: 3.5s).`);
    globalPlayerEngine.triggerSimulatedStall(simulatedStallTime);

    setTimeout(() => {
      addLog(`Watchdog threshold reached! Stage 1: Live edge seek failed.`);
      addLog(`Stage 2: Automatic playback downgrade triggered (.m3u8 -> .ts).`);
      addLog(`Playback stabilized: 4.0s buffer restored.`);
    }, 3600);
  };

  return (
    <div id="stall-recovery-visualizer-container" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-slate-100">
            Live Stream Stall Watchdog &amp; 3-Stage Auto-Recovery Pipeline
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Detects buffer starvation, frame decoding freezes, and network stalls without user intervention. Automatically steps down from HLS to MPEG-TS on persistent segment failures.
        </p>
      </div>

      {/* 3-Stage Pipeline Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className={`p-4 rounded-xl border transition ${
          engineState.isStalled
            ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
            : 'bg-slate-900 border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded">Stage 1</span>
            <span className="text-[10px] font-mono">0.0s – 2.0s</span>
          </div>
          <div className="font-semibold text-slate-200 text-sm mt-2">Buffer Re-Sync</div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Attempts soft live edge catchup seek and demuxer queue flush to clear corrupted frames.
          </p>
        </div>

        <div className={`p-4 rounded-xl border transition ${
          engineState.currentFormat === 'ts'
            ? 'bg-emerald-950/40 border-emerald-500/80 text-emerald-200'
            : 'bg-slate-900 border-slate-800 text-slate-400'
        }`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded">Stage 2</span>
            <span className="text-[10px] font-mono">2.0s – 3.5s</span>
          </div>
          <div className="font-semibold text-slate-200 text-sm mt-2">URL Policy Step-Down</div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Steps down from HLS (<code className="text-indigo-300">.m3u8</code>) to raw MPEG-TS (<code className="text-amber-300">.ts</code>) stream endpoint.
          </p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] bg-slate-800 px-2 py-0.5 rounded">Stage 3</span>
            <span className="text-[10px] font-mono">&gt; 5.0s</span>
          </div>
          <div className="font-semibold text-slate-200 text-sm mt-2">Exponential Backoff</div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            If provider server is completely down, display taxonomy notification and wait for retry timer.
          </p>
        </div>
      </div>

      {/* Simulator Control & Event Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Interactive Stall Injection
          </h3>

          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Stream Format:</span>
              <span className="font-mono text-indigo-300 font-bold">.{engineState.currentFormat}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Buffer Health:</span>
              <span className="font-mono text-emerald-400">{engineState.bufferHealthSec.toFixed(1)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Stall Incidents:</span>
              <span className="font-mono text-amber-400">{engineState.stallCount}</span>
            </div>

            <button
              id="btn-trigger-stall-recovery"
              onClick={handleTriggerStall}
              disabled={engineState.isStalled}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 text-white rounded-lg font-semibold transition cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              {engineState.isStalled ? 'Stall Active — Watchdog Recovering...' : 'Inject 3.5s Live Stream Stall'}
            </button>
          </div>
        </div>

        {/* Live Recovery Action Trail */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Watchdog Action Log
          </h3>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-[220px] overflow-y-auto space-y-1.5 font-mono text-[11px]">
            {logs.length > 0 ? (
              logs.map((l, i) => (
                <div key={i} className="text-slate-300">
                  {l}
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic">No stall events recorded yet. Click "Inject Stall" to test.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

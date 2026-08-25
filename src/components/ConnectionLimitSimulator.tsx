import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, CheckCircle2, RefreshCw, Zap, XOctagon, Play, Square, Activity } from 'lucide-react';
import { PlaybackState } from '../lib/connectionManager';

const DEMO_CHANNELS = [
  { id: 101, name: 'US: ESPN HD (60FPS)', format: 'm3u8' },
  { id: 102, name: 'US: CNN INTERNATIONAL', format: 'ts' },
  { id: 103, name: 'UK: BBC ONE HD', format: 'm3u8' },
  { id: 104, name: 'CA: TSN 1 HD', format: 'm3u8' },
  { id: 105, name: 'FR: CANAL+ CINEMA', format: 'ts' },
];

export const ConnectionLimitSimulator: React.FC = () => {
  const [currentState, setCurrentState] = useState<PlaybackState>('IDLE');
  const [generationToken, setGenerationToken] = useState<number>(1);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [zapActive, setZapActive] = useState(false);

  const fetchState = async () => {
    try {
      const res = await fetch('/api/m1/connection/state');
      const data = await res.json();
      setCurrentState(data.currentState);
      setGenerationToken(data.generationToken);
      setActiveSession(data.activeSession);
      setHistory(data.history || []);
    } catch (err) {
      console.error(err);
    }
  };

  const switchChannel = async (ch: { id: number; name: string; format: string }, debounceMs: number = 300) => {
    try {
      await fetch('/api/m1/connection/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ch.id,
          name: ch.name,
          streamUrl: `http://provider.panel:8080/live/user/pass/${ch.id}.${ch.format}`,
          format: ch.format,
          debounceMs,
        }),
      });
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTeardown = async () => {
    try {
      await fetch('/api/m1/connection/teardown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'User clicked Stop' }),
      });
      fetchState();
    } catch (err) {
      console.error(err);
    }
  };

  // Channel Zap Burst Simulator (simulate rapid 5 channel clicks within 200ms)
  const handleRapidZapping = async () => {
    setZapActive(true);
    for (let i = 0; i < DEMO_CHANNELS.length; i++) {
      switchChannel(DEMO_CHANNELS[i], 300);
      await new Promise((r) => setTimeout(r, 60)); // 60ms apart, well within 300ms debounce
    }
    setTimeout(() => {
      setZapActive(false);
      fetchState();
    }, 450);
  };

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="connection-limit-simulator-container" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-semibold text-slate-100">
            Strict Single Connection (Max = 1) State Machine Simulator
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Guarantees zero overlapping stream connections. Prevents provider 30–60s lock-outs via monotonic generation tokens, 300ms channel switch debounce, and instant AbortController network cancellations.
        </p>
      </div>

      {/* State Machine Status HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[10px] uppercase font-mono text-slate-400">Current State</div>
          <div className="text-xl font-bold font-mono mt-1 flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${
              currentState === 'STREAMING'
                ? 'bg-emerald-400 animate-pulse'
                : currentState === 'DEBOUNCING'
                ? 'bg-amber-400 animate-pulse'
                : currentState === 'CONNECTING'
                ? 'bg-cyan-400 animate-pulse'
                : 'bg-slate-500'
            }`} />
            <span className={currentState === 'STREAMING' ? 'text-emerald-400' : 'text-slate-200'}>
              {currentState}
            </span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[10px] uppercase font-mono text-slate-400">Active Connections</div>
          <div className="text-xl font-bold font-mono mt-1">
            <span className={activeSession ? 'text-emerald-400' : 'text-slate-400'}>
              {activeSession ? '1' : '0'}
            </span>
            <span className="text-slate-500 text-sm"> / 1 (Max)</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[10px] uppercase font-mono text-slate-400">Generation Token</div>
          <div className="text-xl font-bold font-mono text-indigo-300 mt-1">
            #{generationToken}
          </div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-mono text-slate-400">Teardown Safety</div>
            <div className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 4-Stage Abort OK
            </div>
          </div>
          <button
            onClick={handleTeardown}
            disabled={currentState === 'IDLE'}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded text-xs font-semibold transition cursor-pointer flex items-center gap-1"
          >
            <Square className="w-3 h-3" /> Stop
          </button>
        </div>
      </div>

      {/* Channel Switch Controls & Rapid Zapping Test */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Interactive Channel Switcher</h3>
            <button
              id="btn-rapid-zap-test"
              onClick={handleRapidZapping}
              disabled={zapActive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/60 text-white rounded text-xs font-semibold shadow-md transition cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              {zapActive ? 'Rapid Zapping (Holding Debounce)...' : 'Test Rapid Zapping (5 clicks/200ms)'}
            </button>
          </div>

          <div className="space-y-2">
            {DEMO_CHANNELS.map((ch) => {
              const isActive = activeSession?.streamId === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => switchChannel(ch, 300)}
                  className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between cursor-pointer ${
                    isActive
                      ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-slate-800 text-indigo-300 flex items-center justify-center font-mono text-xs font-semibold">
                      {ch.id}
                    </span>
                    <span className="text-xs font-medium">{ch.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                      .{ch.format}
                    </span>
                    {isActive && (
                      <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 animate-pulse" /> STREAMING
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* State Machine Transition Log */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Live State Transition &amp; Generation Token Audit Log
          </h3>

          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-[300px] overflow-y-auto space-y-2 text-[11px] font-mono">
            {history.length > 0 ? (
              history.map((h, idx) => (
                <div key={idx} className="p-2 bg-slate-900/80 rounded border border-slate-800/80 space-y-0.5">
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span>Token #{h.generationToken}</span>
                    <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-200">
                    <span className="text-slate-400">{h.fromState}</span> &rarr;{' '}
                    <span className={
                      h.toState === 'STREAMING'
                        ? 'text-emerald-400 font-bold'
                        : h.toState === 'DEBOUNCING'
                        ? 'text-amber-300 font-bold'
                        : h.toState === 'TEARING_DOWN'
                        ? 'text-rose-400 font-bold'
                        : 'text-cyan-300 font-bold'
                    }>
                      {h.toState}
                    </span>{' '}
                    <span className="text-slate-400 font-sans text-xs font-semibold">({h.channelName})</span>
                  </div>
                  <div className="text-slate-400 text-[10px] font-sans">{h.message}</div>
                </div>
              ))
            ) : (
              <div className="text-slate-500 italic">No state transitions recorded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

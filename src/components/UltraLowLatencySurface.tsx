import React, { useState, useEffect } from 'react';
import {
  Zap,
  Activity,
  Gauge,
  Radio,
  Sliders,
  RefreshCw,
  Play,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  TrendingDown,
  Cpu,
} from 'lucide-react';
import { globalUllEngine, UllTelemetry, CmafChunkTelemetry } from '../lib/ultraLowLatencyEngine';

export const UltraLowLatencySurface: React.FC = () => {
  const [telemetry, setTelemetry] = useState<UllTelemetry>(globalUllEngine.getTelemetry());
  const [chunks, setChunks] = useState<CmafChunkTelemetry[]>(globalUllEngine.getRecentChunks());
  const [selectedProtocol, setSelectedProtocol] = useState<'LL_CMAF' | 'LL_HLS' | 'WEBRTC'>('LL_CMAF');
  const [targetLatency, setTargetLatency] = useState<number>(750);

  useEffect(() => {
    const update = () => {
      setTelemetry(globalUllEngine.getTelemetry());
      setChunks(globalUllEngine.getRecentChunks());
    };
    update();
    const unsub = globalUllEngine.subscribe(update);
    return () => unsub();
  }, []);

  const handleProtocolChange = (proto: 'LL_CMAF' | 'LL_HLS' | 'WEBRTC') => {
    setSelectedProtocol(proto);
    globalUllEngine.setProtocol(proto);
  };

  const handleTargetLatencyChange = (ms: number) => {
    setTargetLatency(ms);
    globalUllEngine.setTargetLatency(ms);
  };

  const handleForceResync = () => {
    globalUllEngine.forceDriftResync();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
              Milestone 21
            </span>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Ultra-Low-Latency (ULL) &amp; CMAF Chunked-Transfer Engine
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Sub-second Glass-to-Glass broadcast latency (&lt;800ms) with CMAF 200ms chunk parser, LL-HLS delta updates, and WSOLA micro-skew clock synchronization (1.04x / 0.96x).
          </p>
        </div>

        {/* Protocol Switcher */}
        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
          <button
            onClick={() => handleProtocolChange('WEBRTC')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition ${
              selectedProtocol === 'WEBRTC'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            WebRTC (450ms)
          </button>
          <button
            onClick={() => handleProtocolChange('LL_CMAF')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition ${
              selectedProtocol === 'LL_CMAF'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            LL-CMAF (750ms)
          </button>
          <button
            onClick={() => handleProtocolChange('LL_HLS')}
            className={`px-3 py-1.5 rounded text-xs font-bold transition ${
              selectedProtocol === 'LL_HLS'
                ? 'bg-cyan-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            LL-HLS (1.2s)
          </button>
        </div>
      </div>

      {/* Primary Telemetry Gauge Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">Glass-to-Glass Latency</div>
          <div className="text-lg font-bold text-cyan-400 flex items-center gap-1 mt-0.5">
            <Gauge className="w-4 h-4" /> {telemetry.glassToGlassLatencyMs} ms
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Target: {telemetry.targetLatencyMs} ms</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">Sync Status</div>
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> {telemetry.syncState}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">Drift: {telemetry.clockDriftMs > 0 ? `+${telemetry.clockDriftMs}` : telemetry.clockDriftMs} ms</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">WSOLA Clock Skew</div>
          <div className="text-base font-bold text-indigo-300 mt-0.5">
            {telemetry.playbackSpeed}x Rate
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Time-Stretching Active</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">Buffer Health</div>
          <div className="text-base font-bold text-emerald-400 mt-0.5">
            {telemetry.bufferHealthMs} ms
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Zero Underruns</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">Delta Playlists</div>
          <div className="text-base font-bold text-slate-200 mt-0.5">
            {telemetry.deltaPlaylistsApplied} Applied
          </div>
          <div className="text-[10px] text-slate-500 font-mono">HTTP/2 Push Enabled</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">CMAF Bitrate</div>
          <div className="text-base font-bold text-cyan-300 mt-0.5">
            6.4 Mbps
          </div>
          <div className="text-[10px] text-slate-500 font-mono">1080p 60fps ULL</div>
        </div>
      </div>

      {/* Interactive Controls & Latency Slider */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Target Broadcast Latency:</span>
          </div>
          <input
            type="range"
            min="400"
            max="2500"
            step="50"
            value={targetLatency}
            onChange={(e) => handleTargetLatencyChange(Number(e.target.value))}
            className="w-48 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-xs font-mono font-bold text-cyan-400 min-w-[50px]">{targetLatency} ms</span>
        </div>

        <button
          onClick={handleForceResync}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          Force Instant Resync (Zero Clock Drift)
        </button>
      </div>

      {/* Live CMAF Chunk Ingestion Stream Pipeline */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Live CMAF 200ms Chunk Pipeline &amp; Decoded PTS Stream
            </h3>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Real-time Chunk Streaming (200ms)
          </span>
        </div>

        {/* Chunk visualization strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {chunks.slice(-8).map((chunk) => (
            <div
              key={chunk.chunkIndex}
              className={`p-2.5 rounded-lg border text-xs font-mono space-y-1 transition ${
                chunk.isKeyframe
                  ? 'bg-cyan-950/40 border-cyan-600/80 shadow-sm'
                  : 'bg-slate-900/90 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold text-slate-300">#{chunk.chunkIndex}</span>
                {chunk.isKeyframe && (
                  <span className="px-1 py-0.2 bg-cyan-600 text-white rounded text-[8px] font-bold">IDR</span>
                )}
              </div>
              <div className="text-cyan-400 font-bold text-[11px]">{chunk.glassToGlassLatencyMs}ms lat</div>
              <div className="text-[10px] text-slate-500">{chunk.transferTimeMs}ms xfer</div>
              <div className="text-[9px] text-emerald-400 flex items-center gap-1 pt-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" /> {chunk.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

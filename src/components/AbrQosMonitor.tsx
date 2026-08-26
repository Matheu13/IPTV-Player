import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  Radio,
  Sliders,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  BarChart3,
  Wifi,
  Gauge,
  Clock,
} from 'lucide-react';
import {
  globalAbrQosEngine,
  QosMetricsSnapshot,
  StreamRendition,
  AbrPolicyMode,
} from '../lib/abrQosEngine';

export const AbrQosMonitor: React.FC = () => {
  const [snapshot, setSnapshot] = useState<QosMetricsSnapshot>(globalAbrQosEngine.getSnapshot());
  const [simChunkSizeKB, setSimChunkSizeKB] = useState(2500); // 2.5 MB chunk
  const [simDurationMs, setSimDurationMs] = useState(1800); // 1.8s download
  const [simBufferFillSec, setSimBufferFillSec] = useState(14.0);

  const refreshSnapshot = () => {
    setSnapshot(globalAbrQosEngine.getSnapshot());
  };

  useEffect(() => {
    refreshSnapshot();
    const interval = setInterval(() => {
      // Simulate micro jitter variation
      const jitterDelta = (Math.random() - 0.5) * 2;
      const rttDelta = (Math.random() - 0.5) * 4;
      globalAbrQosEngine.updateNetworkQos(
        Math.max(10, snapshot.rttLatencyMs + rttDelta),
        Math.max(1, snapshot.jitterMs + jitterDelta),
        0.05
      );
      refreshSnapshot();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePolicyChange = (policy: AbrPolicyMode) => {
    globalAbrQosEngine.setPolicy(policy);
    refreshSnapshot();
  };

  const handleManualSelectRendition = (id: string) => {
    globalAbrQosEngine.setPolicy('manual');
    globalAbrQosEngine.selectRendition(id, 'User manual profile override');
    refreshSnapshot();
  };

  const handleSimulateChunkDownload = () => {
    globalAbrQosEngine.recordChunkDownload(
      simChunkSizeKB * 1024,
      simDurationMs,
      simBufferFillSec
    );
    refreshSnapshot();
  };

  const handleToggleLowLatency = () => {
    const next = !snapshot.lowLatencyMode;
    globalAbrQosEngine.setLowLatencyMode(next);
    refreshSnapshot();
  };

  return (
    <div id="abr-qos-monitor-surface" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Milestone 13: Adaptive Bitrate (ABR) Stream Shaper &amp; Real-Time QoS Telemetry
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              EWMA throughput estimation, multi-rendition ladder switching with hysteresis, buffer starvation protection, and Low-Latency HLS chunk tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleLowLatency}
              className={`px-3 py-1 text-xs font-semibold rounded-full border transition-colors ${
                snapshot.lowLatencyMode
                  ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              LL-HLS Chunk Transfer: {snapshot.lowLatencyMode ? 'ENABLED (<1.2s)' : 'STANDARD (6.0s)'}
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated Throughput */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>EWMA Throughput</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {(snapshot.estimatedThroughputKbps / 1000).toFixed(2)} Mbps
          </div>
          <div className="text-[10px] text-slate-400">
            Harmonic Mean smoothed with α=0.35
          </div>
        </div>

        {/* Current Active Rendition */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Active Bitrate Profile</span>
            <Gauge className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-slate-100 truncate">
            {snapshot.currentRendition.name}
          </div>
          <div className="text-[11px] text-indigo-300 font-mono">
            {snapshot.currentBitrateKbps} kbps @ {snapshot.currentRendition.frameRate} fps
          </div>
        </div>

        {/* Buffer Health */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Buffer Occupancy</span>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                snapshot.bufferState === 'optimal'
                  ? 'bg-emerald-950 text-emerald-300'
                  : snapshot.bufferState === 'healthy'
                  ? 'bg-indigo-950 text-indigo-300'
                  : snapshot.bufferState === 'low'
                  ? 'bg-amber-950 text-amber-300'
                  : 'bg-rose-950 text-rose-300 animate-pulse'
              }`}
            >
              {snapshot.bufferState}
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono">
            {snapshot.bufferOccupancySec.toFixed(1)}s
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all ${
                snapshot.bufferOccupancySec > 8 ? 'bg-emerald-500' : snapshot.bufferOccupancySec > 3 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, (snapshot.bufferOccupancySec / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* Network QoS (RTT & Jitter) */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>RTT &amp; Jitter</span>
            <Wifi className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {snapshot.rttLatencyMs} ms
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Jitter: {snapshot.jitterMs} ms</span>
            <span>Loss: {snapshot.packetLossPercent}%</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Renditions Ladder + Policy Controller + Switch Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Renditions Ladder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                Adaptive Bitrate Rendition Ladder ({snapshot.availableRenditions.length} Profiles)
              </h3>
              <div className="flex items-center gap-1">
                {(['auto', 'max_quality', 'eco_saver', 'lowest_latency'] as AbrPolicyMode[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePolicyChange(p)}
                    className={`px-2.5 py-1 rounded text-xs capitalize transition-colors ${
                      snapshot.policy === p
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {p.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {snapshot.availableRenditions.map((rend) => (
                <div
                  key={rend.id}
                  onClick={() => handleManualSelectRendition(rend.id)}
                  className={`p-3.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    rend.isCurrent
                      ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {rend.isCurrent && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                      <span className="font-semibold text-sm">{rend.name}</span>
                    </div>
                    <span className="font-mono text-xs text-indigo-300 font-bold">
                      {(rend.bandwidthBps / 1000000).toFixed(2)} Mbps
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                    <span>Res: {rend.resolution.width}x{rend.resolution.height} @ {rend.frameRate}fps</span>
                    <span>Codec: {rend.codecs}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Switch History Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              ABR Ladder Quality Transition Log ({snapshot.switchHistory.length})
            </h3>

            <div className="space-y-2">
              {snapshot.switchHistory.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No quality switches recorded yet. Channel operating stably at baseline rendition.
                </div>
              ) : (
                snapshot.switchHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1 font-mono"
                  >
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-cyan-400 font-bold">
                        {item.fromRenditionId} ➔ {item.toRenditionId}
                      </span>
                      <span className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans">
                      {item.reason}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Throughput at switch: {item.estimatedThroughputKbps} kbps • Buffer: {item.bufferOccupancySec}s
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Network & Chunk Simulator */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Network Chunk &amp; Starvation Simulator
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Inject custom segment download durations and buffer levels to test emergency step-down (<code className="text-rose-300">&lt;2.5s</code>) and 2-window step-up hysteresis.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">
                  Segment Size (KB): <span className="text-slate-200 font-mono">{simChunkSizeKB} KB</span>
                </label>
                <input
                  type="range"
                  min="200"
                  max="10000"
                  step="100"
                  value={simChunkSizeKB}
                  onChange={(e) => setSimChunkSizeKB(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Download Time (ms): <span className="text-slate-200 font-mono">{simDurationMs} ms</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="50"
                  value={simDurationMs}
                  onChange={(e) => setSimDurationMs(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Buffer Occupancy (sec): <span className="text-slate-200 font-mono">{simBufferFillSec}s</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="25"
                  step="0.5"
                  value={simBufferFillSec}
                  onChange={(e) => setSimBufferFillSec(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleSimulateChunkDownload}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded font-medium transition-colors"
                >
                  Inject Segment Chunk Download
                </button>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <button
                    onClick={() => {
                      setSimDurationMs(3500);
                      setSimBufferFillSec(1.5);
                      globalAbrQosEngine.recordChunkDownload(400 * 1024, 3500, 1.5);
                      refreshSnapshot();
                    }}
                    className="py-1.5 bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 rounded text-center"
                  >
                    Simulate Starve (&lt;2s)
                  </button>
                  <button
                    onClick={() => {
                      setSimDurationMs(600);
                      setSimBufferFillSec(18.0);
                      globalAbrQosEngine.recordChunkDownload(5000 * 1024, 600, 18.0);
                      refreshSnapshot();
                    }}
                    className="py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 rounded text-center"
                  >
                    Simulate High Gig
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

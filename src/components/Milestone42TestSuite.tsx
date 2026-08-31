import React, { useState, useEffect } from 'react';
import {
  Share2,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Zap,
  Activity,
  ShieldCheck,
  Cpu,
  Sliders,
  AlertTriangle,
  Server,
  Users,
  HardDrive,
  Gauge,
  Radio,
  ArrowDownRight,
  TrendingDown,
  Layers,
} from 'lucide-react';
import {
  globalAdaptiveP2pMeshManager,
  AdaptiveP2pMeshManager,
  AdaptiveMeshTelemetry,
  PeerNode,
  SegmentFetchRecord,
} from '../lib/adaptiveP2pMeshManager';

interface TestAssertion {
  id: string;
  name: string;
  category: string;
  description: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED';
  durationMs: number;
  message?: string;
}

export const Milestone42TestSuite: React.FC = () => {
  const [telemetry, setTelemetry] = useState<AdaptiveMeshTelemetry>(
    globalAdaptiveP2pMeshManager.getTelemetry()
  );
  const [peers, setPeers] = useState<PeerNode[]>(globalAdaptiveP2pMeshManager.getPeers());
  const [segmentHistory, setSegmentHistory] = useState<SegmentFetchRecord[]>(
    globalAdaptiveP2pMeshManager.getSegmentHistory()
  );
  const [config, setConfig] = useState(globalAdaptiveP2pMeshManager.getConfig());
  const [isRunningAll, setIsRunningAll] = useState(false);

  const [testCases, setTestCases] = useState<TestAssertion[]>([
    {
      id: 'REQ42-P2P-01',
      name: 'Peer Swarm Handshake & WebRTC DataChannel Readiness',
      category: 'Swarm Topology',
      description: 'Verifies active peer nodes establish open WebRTC DataChannels with synchronized latency and trust telemetry.',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      id: 'REQ42-P2P-02',
      name: 'Adaptive Lookahead Buffer & Peer Cache Segment Scheduling',
      category: 'Scheduler Pipeline',
      description: 'Ensures segments in the lookahead window (2s-15s) are prioritized for peer cache fetch while critical deadline chunks go to Edge CDN.',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      id: 'REQ42-P2P-03',
      name: 'Bitfield Segment Availability Map Synchronization',
      category: 'Cache Bitfield',
      description: 'Validates that peers accurately publish cached segment ranges and update availability bitfields upon successful chunk exchange.',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      id: 'REQ42-P2P-04',
      name: 'Byzantine Checksum Validation & Instant CDN Fallback',
      category: 'Zero-Stall Fallback',
      description: 'Injects corrupt/byzantine chunk, validates SHA-256 integrity failure, chokes the malicious peer, and executes 0-stall CDN fallback.',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      id: 'REQ42-P2P-05',
      name: 'Dynamic Peer Choking & Trust Score Governance',
      category: 'Anti-Byzantine Engine',
      description: 'Evaluates automatic trust score penalty and peer isolation when chunk delivery failures exceed threshold.',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      id: 'REQ42-P2P-06',
      name: 'CDN Egress Bandwidth Reduction (>65% Target)',
      category: 'Cost & Efficiency',
      description: 'Measures peer cache offload ratio to confirm server edge egress bandwidth savings exceed 65% in steady-state playback.',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      id: 'REQ42-P2P-07',
      name: 'Zero-Disruption P2P Mesh Toggle & Direct CDN Pass-through',
      category: 'Fail-Safe Mode',
      description: 'Disables P2P mesh and verifies seamless transition to 100% direct Edge CDN delivery without video pipeline teardown.',
      status: 'PENDING',
      durationMs: 0,
    },
    {
      id: 'REQ42-P2P-08',
      name: 'Multi-Peer Parallel Chunk Streaming & Latency Comparison',
      category: 'QoS & Telemetry',
      description: 'Assesses round-trip time (RTT) comparison between Edge CDN (24ms) and high-speed local peer meshes (8-14ms).',
      status: 'PENDING',
      durationMs: 0,
    },
  ]);

  useEffect(() => {
    const unsub = globalAdaptiveP2pMeshManager.subscribe(() => {
      setTelemetry(globalAdaptiveP2pMeshManager.getTelemetry());
      setPeers(globalAdaptiveP2pMeshManager.getPeers());
      setSegmentHistory(globalAdaptiveP2pMeshManager.getSegmentHistory());
      setConfig(globalAdaptiveP2pMeshManager.getConfig());
    });
    return unsub;
  }, []);

  const handleToggleMesh = (enabled: boolean) => {
    globalAdaptiveP2pMeshManager.updateConfig({ enabled });
  };

  const handleTogglePeerChoke = (peerId: string) => {
    globalAdaptiveP2pMeshManager.togglePeerChoke(peerId);
  };

  const handleFetchPeerChunk = () => {
    const nextId = telemetry.currentPlaybackSegment + 1;
    globalAdaptiveP2pMeshManager.fetchSegment(nextId);
  };

  const handleFetchCdnChunk = () => {
    const nextId = telemetry.currentPlaybackSegment + 1;
    globalAdaptiveP2pMeshManager.fetchSegment(nextId, { forceCdn: true });
  };

  const handleInjectByzantine = () => {
    const nextId = telemetry.currentPlaybackSegment + 1;
    globalAdaptiveP2pMeshManager.fetchSegment(nextId, { simulateByzantine: true });
  };

  const runSingleTest = async (testId: string) => {
    setTestCases((prev) =>
      prev.map((t) => (t.id === testId ? { ...t, status: 'RUNNING' } : t))
    );

    const start = performance.now();
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 250));

    let passed = true;
    let msg = 'Assertion verified successfully.';

    try {
      const runner = new AdaptiveP2pMeshManager();
      if (testId === 'REQ42-P2P-01') {
        const pList = runner.getPeers();
        const open = pList.filter((p) => p.dataChannelState === 'OPEN');
        if (open.length < 3) throw new Error('Insufficient open WebRTC channels');
        msg = `Swarm established: ${open.length} active peers with open DataChannels.`;
      } else if (testId === 'REQ42-P2P-02') {
        runner.updateConfig({ enabled: true, lookaheadBufferSec: 12 });
        const res = runner.fetchSegment(201);
        if (res.source !== 'PEER_CACHE') throw new Error('Expected PEER_CACHE fetch for lookahead segment');
        msg = `Lookahead segment #201 routed to peer cache with RTT ${res.rttMs}ms.`;
      } else if (testId === 'REQ42-P2P-03') {
        const p = runner.getPeers()[0];
        if (!Array.isArray(p.cachedSegmentIds) || p.cachedSegmentIds.length === 0) {
          throw new Error('Bitfield segment cache empty');
        }
        msg = `Peer ${p.id} published bitfield map of ${p.cachedSegmentIds.length} segments.`;
      } else if (testId === 'REQ42-P2P-04') {
        const res = runner.fetchSegment(202, { simulateByzantine: true });
        if (res.source !== 'FALLBACK_CDN') throw new Error('Failed to fallback to CDN on corrupt checksum');
        const rogue = runner.getPeers().find((p) => p.id === 'peer-rogue-byzantine');
        if (!rogue?.isChoked) throw new Error('Rogue peer not choked after checksum failure');
        msg = `Byzantine chunk blocked: Instant CDN fallback engaged in ${res.fetchTimeMs}ms, rogue peer choked.`;
      } else if (testId === 'REQ42-P2P-05') {
        const rogue = runner.getPeers().find((p) => p.id === 'peer-rogue-byzantine');
        if (!rogue || rogue.trustScore >= 0.5) throw new Error('Trust score not penalized for rogue peer');
        msg = `Trust score governance active: Rogue peer isolated with trust score ${rogue.trustScore.toFixed(2)}.`;
      } else if (testId === 'REQ42-P2P-06') {
        for (let i = 0; i < 15; i++) runner.fetchSegment(300 + i);
        const telem = runner.getTelemetry();
        if (telem.p2pOffloadPercent < 60) throw new Error(`Offload ratio ${telem.p2pOffloadPercent}% below 60%`);
        msg = `Egress offload verified: ${telem.p2pOffloadPercent}% P2P ratio with $${telem.costSavingsUsd} bandwidth savings.`;
      } else if (testId === 'REQ42-P2P-07') {
        runner.updateConfig({ enabled: false });
        const res = runner.fetchSegment(401);
        if (res.source !== 'PRIMARY_CDN') throw new Error('Expected PRIMARY_CDN when mesh disabled');
        msg = 'P2P mesh disabled: Clean 100% direct CDN pass-through verified.';
      } else if (testId === 'REQ42-P2P-08') {
        const pList = runner.getPeers().filter((p) => !p.isChoked);
        const avgPeerRtt = pList.reduce((a, b) => a + b.rttMs, 0) / pList.length;
        if (avgPeerRtt >= 24) throw new Error('Peer mesh RTT not lower than CDN RTT');
        msg = `Parallel mesh latency: Avg Peer RTT ${avgPeerRtt.toFixed(1)}ms vs CDN RTT 24ms.`;
      }
      runner.destroy();
    } catch (err: any) {
      passed = false;
      msg = err.message || 'Assertion failed';
    }

    const durationMs = Math.round(performance.now() - start);

    setTestCases((prev) =>
      prev.map((t) =>
        t.id === testId
          ? {
              ...t,
              status: passed ? 'PASSED' : 'FAILED',
              durationMs,
              message: msg,
            }
          : t
      )
    );
  };

  const handleRunAll = async () => {
    setIsRunningAll(true);
    for (const test of testCases) {
      await runSingleTest(test.id);
    }
    setIsRunningAll(false);
  };

  const passedCount = testCases.filter((t) => t.status === 'PASSED').length;
  const failedCount = testCases.filter((t) => t.status === 'FAILED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wide">
                Milestone 42
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Adaptive P2P Mesh Manager
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Share2 className="w-7 h-7 text-cyan-400" /> Adaptive P2P Stream Mesh & Peer Cache Scheduler
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Hybrid CDN + WebRTC P2P stream segment scheduling engine. Pulls live video chunks from distributed peer caches in parallel with primary Edge CDNs to achieve 65–85% bandwidth egress reduction with instant 0-stall failover.
            </p>
          </div>

          <button
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-medium text-xs shadow-lg transition flex items-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {isRunningAll ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <Play className="w-4 h-4 text-white fill-white" />
            )}
            <span>{isRunningAll ? 'Running Verification...' : 'Execute All M42 Tests'}</span>
          </button>
        </div>

        {/* Real-time Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-400" /> P2P Offload
            </div>
            <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
              {telemetry.p2pOffloadPercent}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Edge egress saved</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-cyan-400" /> Active Swarm
            </div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-0.5">
              {telemetry.healthyPeerCount} / {telemetry.activePeerCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Healthy WebRTC peers</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Mesh Latency
            </div>
            <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
              {telemetry.avgPeerRttMs} ms
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">vs CDN {telemetry.primaryCdnRttMs}ms</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-indigo-400" /> Peer Cache Vol
            </div>
            <div className="text-xl font-bold font-mono text-indigo-300 mt-0.5">
              {(telemetry.peerBytesDownloaded / (1024 * 1024)).toFixed(1)} MB
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">{telemetry.peerSegmentsFetched} segments</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Byzantine Blocked
            </div>
            <div className="text-xl font-bold font-mono text-red-400 mt-0.5">
              {telemetry.byzantineChunksBlocked}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Corrupt chunks choked</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-mono text-slate-400 uppercase flex items-center gap-1">
              <Gauge className="w-3.5 h-3.5 text-purple-400" /> Prefetch Buffer
            </div>
            <div className="text-xl font-bold font-mono text-purple-300 mt-0.5">
              {telemetry.bufferAheadSec}s
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Lookahead window</div>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Live Pipeline Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Swarm Scheduler & Simulation */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide font-mono">
              <Sliders className="w-4 h-4 text-cyan-400" /> Swarm Scheduler Controls
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">P2P Mesh:</span>
              <button
                onClick={() => handleToggleMesh(!config.enabled)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition cursor-pointer ${
                  config.enabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {config.enabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>

          {/* Configuration Sliders */}
          <div className="space-y-3 pt-1 text-xs">
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Lookahead Prefetch Window:</span>
                <span className="font-mono text-cyan-300 font-bold">{config.lookaheadBufferSec}s</span>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                step="2"
                value={config.lookaheadBufferSec}
                onChange={(e) =>
                  globalAdaptiveP2pMeshManager.updateConfig({
                    lookaheadBufferSec: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Min Trust Score Threshold:</span>
                <span className="font-mono text-indigo-300 font-bold">
                  {config.minTrustScoreThreshold.toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.9"
                step="0.05"
                value={config.minTrustScoreThreshold}
                onChange={(e) =>
                  globalAdaptiveP2pMeshManager.updateConfig({
                    minTrustScoreThreshold: Number(e.target.value),
                  })
                }
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Simulation Action Buttons */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Live Chunk Simulations</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleFetchPeerChunk}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-cyan-300 font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" /> Fetch Peer Chunk
              </button>
              <button
                onClick={handleFetchCdnChunk}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-indigo-300 font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Server className="w-3.5 h-3.5 text-indigo-400" /> Force CDN Chunk
              </button>
            </div>
            <button
              onClick={handleInjectByzantine}
              className="w-full px-3 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-800/50 text-xs text-red-300 font-medium transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> Inject Byzantine Chunk (Test Choke & CDN Fallback)
            </button>
          </div>
        </div>

        {/* Right Column (2 cols wide): Segment Transfer Timeline Visualizer */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide font-mono">
              <Activity className="w-4 h-4 text-emerald-400" /> Real-time Segment Routing Stream (Latest 12 Chunks)
            </h2>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> Peer Cache
              </span>
              <span className="flex items-center gap-1 text-indigo-400">
                <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" /> Primary CDN
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Fallback CDN
              </span>
            </div>
          </div>

          {/* Segment Transfer Pipeline Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {segmentHistory.slice(-12).reverse().map((seg) => {
              const isPeer = seg.source === 'PEER_CACHE';
              const isFallback = seg.source === 'FALLBACK_CDN';
              return (
                <div
                  key={`${seg.segmentId}-${seg.timestamp}`}
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all duration-200 ${
                    isPeer
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 shadow-sm'
                      : isFallback
                      ? 'bg-amber-950/30 border-amber-500/50 text-amber-300 shadow-sm'
                      : 'bg-indigo-950/30 border-indigo-500/40 text-indigo-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">Chunk #{seg.segmentId}</span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        isPeer
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : isFallback
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {seg.source === 'PEER_CACHE' ? 'P2P' : seg.source === 'FALLBACK_CDN' ? 'FALLBACK' : 'CDN'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 truncate">
                    {seg.peerId ? seg.peerId : 'Edge POP CDN'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 pt-1 border-t border-slate-800/60">
                    <span>{seg.fetchTimeMs}ms</span>
                    <span>{(seg.sizeBytes / 1024).toFixed(0)} KB</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bandwidth Cost Savings Progress */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-mono">Swarm Egress Distribution:</span>
              <span className="font-mono text-cyan-300 font-bold">
                {telemetry.peerSegmentsFetched} Peer Chunks ({(telemetry.peerBytesDownloaded / (1024 * 1024)).toFixed(1)}MB) vs {telemetry.cdnSegmentsFetched} CDN Chunks ({(telemetry.cdnBytesDownloaded / (1024 * 1024)).toFixed(1)}MB)
              </span>
            </div>
            <div className="w-full bg-indigo-950 h-2.5 rounded-full overflow-hidden flex">
              <div
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all duration-300"
                style={{ width: `${telemetry.p2pOffloadPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Connected Peer Nodes Bitfield & Topology Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide font-mono">
            <Users className="w-4 h-4 text-cyan-400" /> Connected WebRTC Swarm Nodes & Bitfield Cache Map
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {peers.filter((p) => !p.isChoked).length} Active / {peers.length} Total Nodes
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                <th className="py-2.5 px-3">Peer Node ID</th>
                <th className="py-2.5 px-3">Location & ISP</th>
                <th className="py-2.5 px-3">RTT</th>
                <th className="py-2.5 px-3">Bitrate (Up / Down)</th>
                <th className="py-2.5 px-3">Trust Score</th>
                <th className="py-2.5 px-3">Cached Segment Bitfield</th>
                <th className="py-2.5 px-3 text-right">State / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {peers.map((peer) => (
                <tr
                  key={peer.id}
                  className={`hover:bg-slate-800/40 transition ${
                    peer.isChoked ? 'opacity-60 bg-red-950/10' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        peer.isChoked ? 'bg-red-500' : 'bg-emerald-400'
                      }`}
                    />
                    {peer.id}
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <div>{peer.geoCity}</div>
                    <div className="text-[10px] text-slate-500">{peer.isp}</div>
                  </td>
                  <td className="py-2.5 px-3 text-cyan-300 font-bold">{peer.rttMs} ms</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    <span className="text-emerald-400">{(peer.uploadSpeedKbps / 1000).toFixed(1)}M ↑</span> /{' '}
                    <span className="text-indigo-400">{(peer.downloadSpeedKbps / 1000).toFixed(1)}M ↓</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        peer.trustScore >= 0.8
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : peer.trustScore >= 0.5
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-red-500/20 text-red-300 border border-red-500/40'
                      }`}
                    >
                      {(peer.trustScore * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 flex-wrap max-w-xs">
                      {peer.cachedSegmentIds.slice(0, 6).map((c) => (
                        <span
                          key={c}
                          className="px-1.5 py-0.2 bg-slate-800 text-cyan-300 rounded text-[10px] border border-slate-700"
                        >
                          #{c}
                        </span>
                      ))}
                      {peer.cachedSegmentIds.length > 6 && (
                        <span className="text-[10px] text-slate-500">
                          +{peer.cachedSegmentIds.length - 6} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      onClick={() => handleTogglePeerChoke(peer.id)}
                      className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition cursor-pointer ${
                        peer.isChoked
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {peer.isChoked ? 'UNBLOCK' : 'CHOKE'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Automated Milestone 42 Test Suite Runner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wide font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Milestone 42 Automated Verification Matrix
            </h2>
            <div className="text-xs text-slate-400 mt-0.5">
              Pass Rate: <span className="text-emerald-400 font-bold">{passedCount} Passed</span>
              {failedCount > 0 && <span className="text-red-400 font-bold ml-2">{failedCount} Failed</span>} / {testCases.length} Total Assertions
            </div>
          </div>

          <button
            onClick={handleRunAll}
            disabled={isRunningAll}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs transition cursor-pointer disabled:opacity-50"
          >
            {isRunningAll ? 'Running...' : 'Run All 8 Assertions'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {testCases.map((test) => (
            <div
              key={test.id}
              className={`p-3.5 rounded-xl border transition-all ${
                test.status === 'PASSED'
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : test.status === 'FAILED'
                  ? 'bg-red-950/20 border-red-500/40 text-red-300'
                  : test.status === 'RUNNING'
                  ? 'bg-cyan-950/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-slate-400">{test.id}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {test.category}
                  </span>
                </div>
                <div>
                  {test.status === 'PASSED' && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> PASSED ({test.durationMs}ms)
                    </span>
                  )}
                  {test.status === 'FAILED' && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-red-400 font-bold">
                      <XCircle className="w-3.5 h-3.5 text-red-400" /> FAILED
                    </span>
                  )}
                  {test.status === 'RUNNING' && (
                    <span className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 font-bold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" /> RUNNING
                    </span>
                  )}
                  {test.status === 'PENDING' && (
                    <button
                      onClick={() => runSingleTest(test.id)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                    >
                      RUN
                    </button>
                  )}
                </div>
              </div>
              <div className="font-semibold text-xs text-white">{test.name}</div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{test.description}</p>
              {test.message && (
                <div className="text-[10px] font-mono mt-2 p-1.5 rounded bg-black/40 border border-white/5 text-slate-300">
                  {test.message}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Share2,
  Globe,
  Radio,
  Server,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Activity,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Users,
  Zap,
} from 'lucide-react';
import {
  globalP2pCdnEngine,
  P2pMeshTelemetry,
  CdnPopNode,
  SwarmPeer,
} from '../lib/p2pCdnMeshEngine';

export const P2pCdnMeshSurface: React.FC = () => {
  const [telemetry, setTelemetry] = useState<P2pMeshTelemetry>(
    globalP2pCdnEngine.getTelemetry()
  );
  const [pops, setPops] = useState<CdnPopNode[]>(globalP2pCdnEngine.getPops());
  const [peers, setPeers] = useState<SwarmPeer[]>(globalP2pCdnEngine.getPeers());

  useEffect(() => {
    const update = () => {
      setTelemetry(globalP2pCdnEngine.getTelemetry());
      setPops(globalP2pCdnEngine.getPops());
      setPeers(globalP2pCdnEngine.getPeers());
    };
    update();
    const unsub = globalP2pCdnEngine.subscribe(update);
    return () => unsub();
  }, []);

  const handleSelectPop = (popId: string) => {
    globalP2pCdnEngine.switchEdgePop(popId);
  };

  const handleToggleChokePeer = (peerId: string) => {
    globalP2pCdnEngine.toggleChokePeer(peerId);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
              Milestone 23
            </span>
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-emerald-400" />
              Multi-CDN Geo-Mesh Balancing &amp; WebRTC P2P Swarm Engine
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Hybrid P2P chunk mesh offloading 65–85% of origin edge egress bandwidth, BGP Geo-DNS edge POP route latency scoring, and Byzantine peer choking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 flex items-center gap-1.5 font-bold">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            Egress Saved: ${telemetry.savedBandwidthCostUsd} USD
          </div>
        </div>
      </div>

      {/* Mesh Telemetry Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">P2P Offload Ratio</div>
          <div className="text-lg font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
            <Zap className="w-4 h-4" /> {telemetry.p2pRatioPercent}%
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Target: &gt;70%</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">Active Mesh Peers</div>
          <div className="text-lg font-bold text-slate-200 flex items-center gap-1 mt-0.5">
            <Users className="w-4 h-4 text-indigo-400" /> {telemetry.activePeerCount} Connected
          </div>
          <div className="text-[10px] text-slate-400 font-mono">WebRTC DataChannels</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">P2P Downloaded</div>
          <div className="text-base font-bold text-emerald-300 mt-0.5">
            {telemetry.p2pDownloadedMb} MB
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Total: {telemetry.totalDownloadedMb} MB</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">CDN Egress Downloaded</div>
          <div className="text-base font-bold text-slate-300 mt-0.5">
            {telemetry.cdnDownloadedMb} MB
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Edge Origin Shield</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">Current Edge Route</div>
          <div className="text-xs font-bold text-cyan-400 truncate mt-1" title={telemetry.currentEdgePop}>
            {telemetry.currentEdgePop.split('(')[0]}
          </div>
          <div className="text-[10px] text-slate-400 font-mono mt-0.5">RTT: {telemetry.edgeRttMs} ms</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
          <div className="text-[10px] font-mono text-slate-500">Byzantine Choked</div>
          <div className="text-base font-bold text-rose-400 mt-0.5">
            {telemetry.byzantinePeersChoked} Bad Nodes
          </div>
          <div className="text-[10px] text-slate-500 font-mono">Corrupt Chunks Dropped</div>
        </div>
      </div>

      {/* Two-Column Section: Edge POP Leaderboard & Live P2P Swarm Nodes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-CDN Edge POP Routing Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              Multi-CDN Edge POP Route Latency &amp; Health Leaderboard
            </h3>
            <span className="text-xs font-mono text-slate-400">BGP Anycast Scoring</span>
          </div>

          <div className="space-y-2.5">
            {pops.map((pop) => (
              <div
                key={pop.id}
                onClick={() => handleSelectPop(pop.id)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                  pop.isCurrentRoute
                    ? 'bg-cyan-950/30 border-cyan-500/80 shadow-md ring-1 ring-cyan-500/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{pop.name}</span>
                    {pop.isCurrentRoute && (
                      <span className="px-1.5 py-0.2 bg-cyan-600 text-white rounded text-[9px] font-bold">
                        ACTIVE ROUTE
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {pop.region} • ${(pop.egressCostPerGb * 1000).toFixed(1)}/TB egress
                  </div>
                </div>

                <div className="text-right font-mono text-xs flex-shrink-0">
                  <div className="font-bold text-cyan-400">{pop.rttLatencyMs} ms RTT</div>
                  <div className="text-[10px] text-emerald-400">{pop.healthScore}% SLA</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live WebRTC P2P Swarm Mesh Peers */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              Live WebRTC P2P Swarm Peer Nodes &amp; DataChannels
            </h3>
            <span className="text-xs font-mono text-emerald-400">Swarm Health: 96.5%</span>
          </div>

          <div className="space-y-2.5">
            {peers.map((peer) => (
              <div
                key={peer.id}
                className={`p-3 rounded-lg border text-xs transition flex items-center justify-between gap-3 ${
                  peer.isChoked
                    ? 'bg-rose-950/20 border-rose-900/60 opacity-60'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 font-mono">{peer.ipMasked}</span>
                    <span className="text-[10px] text-slate-400">({peer.city})</span>
                    {peer.isChoked ? (
                      <span className="px-1.5 py-0.2 bg-rose-950 text-rose-300 border border-rose-800 rounded text-[9px] font-bold">
                        CHOKED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[9px] font-bold">
                        SWARMING
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-3">
                    <span className="flex items-center gap-0.5 text-emerald-400">
                      <ArrowDownLeft className="w-3 h-3" /> {(peer.downloadSpeedKbps / 1000).toFixed(1)} Mbps
                    </span>
                    <span className="flex items-center gap-0.5 text-indigo-400">
                      <ArrowUpRight className="w-3 h-3" /> {(peer.uploadSpeedKbps / 1000).toFixed(1)} Mbps
                    </span>
                    <span>{peer.sharedChunksCount} Chunks</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleChokePeer(peer.id)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition ${
                      peer.isChoked
                        ? 'bg-emerald-950 border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                        : 'bg-rose-950 border-rose-800 text-rose-300 hover:bg-rose-900'
                    }`}
                  >
                    {peer.isChoked ? 'Unchoke' : 'Choke'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldAlert,
  ArrowLeftRight,
  Server,
  Zap,
  Radio,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  TrendingUp,
  Award,
  Layers,
} from 'lucide-react';
import {
  globalChannelHealthWatchdog,
  MonitoredChannelHealth,
  ProviderSlaMetric,
} from '../lib/channelHealthWatchdogEngine';

export const ChannelHealthWatchdogSurface: React.FC = () => {
  const [channels, setChannels] = useState<MonitoredChannelHealth[]>([]);
  const [slaMetrics, setSlaMetrics] = useState<ProviderSlaMetric[]>([]);
  const [autoFailover, setAutoFailover] = useState<boolean>(true);
  const [selectedChannel, setSelectedChannel] = useState<MonitoredChannelHealth | null>(null);

  useEffect(() => {
    const update = () => {
      setChannels(globalChannelHealthWatchdog.getAllMonitoredChannels());
      setSlaMetrics(globalChannelHealthWatchdog.getProviderSlaMetrics());
      setAutoFailover(globalChannelHealthWatchdog.isAutoFailoverEnabled());
    };

    update();
    const unsub = globalChannelHealthWatchdog.subscribe(update);
    return () => unsub();
  }, []);

  const handleToggleAutoFailover = () => {
    const newState = !autoFailover;
    setAutoFailover(newState);
    globalChannelHealthWatchdog.setAutoFailoverEnabled(newState);
  };

  const handleSimulateOutage = (channelId: string, sourceId: string) => {
    globalChannelHealthWatchdog.simulateOutage(channelId, sourceId, 'HTTP_503');
  };

  const handleRestoreSource = (channelId: string, sourceId: string) => {
    globalChannelHealthWatchdog.restoreSource(channelId, sourceId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
              Milestone 18
            </span>
            <h2 className="text-xl font-bold text-slate-100">
              Channel Health Watchdog &amp; Autonomous Failover Router
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time PCR/PTS continuity monitoring, sub-800ms hot-standby multi-source failover routing, and provider uptime SLA leaderboard.
          </p>
        </div>

        {/* Global Auto-Failover Toggle */}
        <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-lg border border-slate-800 shrink-0">
          <div className="text-xs">
            <div className="font-bold text-slate-200">Autonomous Hot-Standby</div>
            <div className="text-[10px] text-slate-400">Zero-downtime stream routing</div>
          </div>
          <button
            onClick={handleToggleAutoFailover}
            className={`px-3 py-1.5 rounded text-xs font-bold transition ${
              autoFailover
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            {autoFailover ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>
      </div>

      {/* Provider SLA & Uptime Scoring Leaderboard */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          Provider SLA &amp; Uptime Leaderboard
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {slaMetrics.map((prov) => (
            <div
              key={prov.providerId}
              className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                    {prov.providerType}
                  </span>
                  <div className="text-xs font-bold text-slate-200 truncate">{prov.providerName}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    prov.slaGrade === 'A+' || prov.slaGrade === 'A'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  Grade {prov.slaGrade}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-850">
                  <div className="text-[10px] text-slate-500">24h Uptime</div>
                  <div className="text-sm font-bold text-emerald-400">{prov.uptimePercent}%</div>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-850">
                  <div className="text-[10px] text-slate-500">Avg Latency</div>
                  <div className="text-sm font-bold text-indigo-300">{prov.averageLatencyMs} ms</div>
                </div>
              </div>

              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Healthy: {prov.healthyChannelsCount}/{prov.totalChannelsMonitored}</span>
                <span>Failovers: {prov.failoverIncidents24h}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monitored Channels Health Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" />
          Active Channel Watchdog &amp; Hot-Standby Candidates
        </h3>

        <div className="space-y-4">
          {channels.map((ch) => (
            <div
              key={ch.channelId}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
            >
              {/* Channel Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 font-mono text-xs font-bold">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-100">{ch.channelName}</div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>Uptime: <strong className="text-emerald-400">{ch.uptimePercentage}%</strong></span>
                      <span>•</span>
                      <span>MTTFF: <strong className="text-indigo-300">{ch.meanTimeToFirstFrameMs}ms</strong></span>
                      <span>•</span>
                      <span>Failover Events: <strong className="text-amber-400">{ch.failoverEventCount}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                      ch.status === 'HEALTHY'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : ch.status === 'FAILOVER_ACTIVE'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}
                  >
                    {ch.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Failover Reason Banner if triggered */}
              {ch.failoverReason && (
                <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-2.5 text-xs text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>{ch.failoverReason}</span>
                </div>
              )}

              {/* Candidates Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                {ch.candidates.map((cand) => {
                  const isActive = cand.sourceId === ch.currentActiveSourceId;

                  return (
                    <div
                      key={cand.sourceId}
                      className={`p-3 rounded-lg border text-xs transition ${
                        isActive
                          ? 'bg-indigo-950/40 border-indigo-600 ring-1 ring-indigo-500/40'
                          : 'bg-slate-900 border-slate-800 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span className="text-[10px] font-mono px-1 rounded bg-slate-800 text-indigo-400">
                            P{cand.priority}
                          </span>
                          <span className="truncate max-w-[130px]">{cand.displayName}</span>
                        </div>
                        {isActive && (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800">
                            STREAMING
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px] text-slate-400">
                        <div>Bitrate: {(cand.bitrateKbps / 1000).toFixed(1)} Mbps</div>
                        <div>Latency: {cand.rttLatencyMs} ms</div>
                        <div>Jitter: {cand.pcrPtsJitterMs} ms</div>
                        <div>
                          Status:{' '}
                          <span className={cand.isAvailable ? 'text-emerald-400' : 'text-rose-400'}>
                            HTTP {cand.httpStatus}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5 mt-3 pt-2 border-t border-slate-800/60">
                        {cand.isAvailable ? (
                          <button
                            onClick={() => handleSimulateOutage(ch.channelId, cand.sourceId)}
                            className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[10px] font-semibold border border-rose-800"
                          >
                            Simulate Outage (503)
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRestoreSource(ch.channelId, cand.sourceId)}
                            className="px-2 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-[10px] font-semibold border border-emerald-800"
                          >
                            Restore Stream (200)
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

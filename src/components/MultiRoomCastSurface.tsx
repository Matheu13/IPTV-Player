import React, { useState, useEffect, useMemo } from 'react';
import {
  MultiRoomCastEngine,
  CastDeviceNode,
  SyncZoneGroup,
  MultiRoomCastTelemetry,
} from '../lib/multiRoomCastEngine';
import {
  Tv,
  Cast,
  Layers,
  Radio,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  RefreshCw,
  Sliders,
  Share2,
  Wifi,
  Laptop,
} from 'lucide-react';

interface MultiRoomCastSurfaceProps {
  onPlayStream?: (url: string, name: string) => void;
}

export const MultiRoomCastSurface: React.FC<MultiRoomCastSurfaceProps> = () => {
  const engine = useMemo(() => new MultiRoomCastEngine(), []);
  const [telemetry, setTelemetry] = useState<MultiRoomCastTelemetry>(engine.getTelemetry());
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([
    'DEV-CAST-SONY-BRAVIA-02',
    'DEV-CAST-APPLETV-03',
  ]);
  const [groupName, setGroupName] = useState('Whole House Audio & Video');

  useEffect(() => {
    const unsub = engine.subscribe(() => {
      setTelemetry(engine.getTelemetry());
    });
    return () => {
      unsub();
      engine.destroy();
    };
  }, [engine]);

  const handleCastToDevice = (devId: string) => {
    engine.castToDevice(devId, {
      channelId: 'CH-4K-UHD-01',
      channelName: 'Sky Sports Main Event 4K UHD',
      streamUrl: 'https://edge.cdn.iptv-matrix.net/live/skymain_4k.m3u8',
      currentPtsTimestampMs: 42890000,
      audioTrackId: 1,
      audioTrackLanguage: 'eng (Dolby Atmos)',
      subtitleTrackId: 0,
      subtitleLanguage: 'eng',
      volume: 65,
    });
  };

  const handleDisconnect = () => {
    engine.disconnectActiveCast();
  };

  const handleCreateZone = () => {
    engine.createMultiRoomZone(groupName, 'DEV-CAST-LG-OLED-01', selectedGroupMembers);
  };

  const handleDissolveZone = () => {
    engine.dissolveMultiRoomZone();
  };

  const handleToggleMember = (devId: string) => {
    if (selectedGroupMembers.includes(devId)) {
      setSelectedGroupMembers(selectedGroupMembers.filter((id) => id !== devId));
    } else {
      setSelectedGroupMembers([...selectedGroupMembers, devId]);
    }
  };

  return (
    <div id="multi-room-cast-surface" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full text-xs font-mono font-semibold">
                Milestone 25
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Cast className="w-5 h-5 text-cyan-400" />
                Multi-Room Sync &amp; Distributed Cast Coordinator
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Microsecond Precision PTP / NTP Clock Synchronization (&lt;5ms Jitter), Multi-Protocol Device Discovery (Google Cast / Apple AirPlay 2 / DIAL SSDP / Matter Cast), and Zero-Loss Active Stream Session Handoff.
            </p>
          </div>

          <button
            id="btn-refresh-cast-discovery"
            onClick={() => engine.refreshDiscovery()}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 border border-slate-700"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" /> Scan Network Devices
          </button>
        </div>
      </div>

      {/* Real-Time Sync Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>PTP Master Clock</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 font-mono">
            {new Date(telemetry.masterPtpTimeEpochMs).toLocaleTimeString()}.{String(telemetry.masterPtpTimeEpochMs % 1000).padStart(3, '0')}
          </div>
          <div className="text-[11px] text-cyan-400 font-mono">
            Jitter: ±{telemetry.globalClockJitterMs}ms
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Active Session</span>
            <Tv className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 truncate">
            {telemetry.activeCastDevice ? telemetry.activeCastDevice.friendlyName : 'Local Display (Handheld)'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {telemetry.activeCastDevice ? `Handoff: ${telemetry.lastHandoffLatencyMs}ms` : 'Ready to Cast'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Multi-Room Sync</span>
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry.isMultiRoomSyncActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {telemetry.isMultiRoomSyncActive ? 'Active Group Synced' : 'Independent Zones'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {telemetry.activeZoneGroup ? `${telemetry.activeZoneGroup.memberDeviceIds.length} Devices Locked` : '0 Synced'}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Discovered Nodes</span>
            <Wifi className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base font-bold text-slate-100 font-mono">
            {telemetry.discoveredDevices.length} Online Nodes
          </div>
          <div className="text-[11px] text-purple-300 font-mono">
            {telemetry.totalHandoffsCompleted} Handoffs Completed
          </div>
        </div>
      </div>

      {/* Main Grid: Device Discovery Shelf & Zone Coordinator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Discovered Devices & 1-Click Handoff (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Cast className="w-4 h-4 text-cyan-400" />
              Network Cast Devices (mDNS / SSDP / AirPlay / Cast)
            </h3>
            {telemetry.activeCastDevice && (
              <button
                id="btn-disconnect-cast"
                onClick={handleDisconnect}
                className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700 text-xs font-semibold rounded-md transition"
              >
                Disconnect Active Cast
              </button>
            )}
          </div>

          <div className="space-y-3">
            {telemetry.discoveredDevices.map((dev) => {
              const isCurrentCast = telemetry.activeCastDevice?.id === dev.id;
              return (
                <div
                  key={dev.id}
                  className={`p-4 rounded-xl border transition space-y-3 ${
                    isCurrentCast
                      ? 'bg-cyan-950/40 border-cyan-500/80 shadow-md'
                      : dev.status === 'SYNC_LEADER' || dev.status === 'SYNC_FOLLOWER'
                      ? 'bg-emerald-950/30 border-emerald-600/50'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 text-sm">{dev.friendlyName}</span>
                        <span className="px-2 py-0.5 bg-slate-800 text-cyan-300 border border-slate-700 rounded text-[10px] font-mono">
                          {dev.protocol.replace('_', ' ')}
                        </span>
                        {isCurrentCast && (
                          <span className="px-2 py-0.5 bg-cyan-500 text-slate-950 font-bold rounded text-[10px] animate-pulse">
                            ACTIVE CAST
                          </span>
                        )}
                        {dev.status === 'SYNC_LEADER' && (
                          <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 font-bold rounded text-[10px]">
                            SYNC LEADER
                          </span>
                        )}
                        {dev.status === 'SYNC_FOLLOWER' && (
                          <span className="px-2 py-0.5 bg-emerald-900 text-emerald-200 border border-emerald-700 rounded text-[10px]">
                            SYNC FOLLOWER
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {dev.roomLocation} • {dev.model} • IP: {dev.ipAddress}
                      </div>
                    </div>

                    <button
                      id={`btn-cast-to-${dev.id}`}
                      onClick={() => handleCastToDevice(dev.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                        isCurrentCast
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      }`}
                    >
                      <Cast className="w-3.5 h-3.5" />
                      {isCurrentCast ? 'Casting Now' : 'Handoff Stream'}
                    </button>
                  </div>

                  {/* Device Sync & Volume Telemetry */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                    <div>PTP Skew: <span className="text-cyan-400">{dev.ptpClockOffsetMs > 0 ? `+${dev.ptpClockOffsetMs}` : dev.ptpClockOffsetMs}ms</span></div>
                    <div>RTT: <span className="text-slate-300">{dev.measuredRttMs}ms</span></div>
                    <div>Buffer: <span className="text-emerald-400">{dev.bufferHealthMs}ms</span></div>
                  </div>

                  {/* Volume Slider */}
                  <div className="flex items-center gap-3 pt-1">
                    <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={dev.volume}
                      onChange={(e) => engine.setDeviceVolume(dev.id, parseInt(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-300 w-8 text-right">{dev.volume}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Multi-Room Zone Synchronizer (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Multi-Room Zone Orchestrator
              </span>
              {telemetry.isMultiRoomSyncActive && (
                <span className="text-xs font-mono text-emerald-400">SYNCHRONIZED</span>
              )}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300">Zone Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">
                  Select Room Zone Members (Master: Living Room OLED)
                </label>
                <div className="space-y-2 mt-2">
                  {telemetry.discoveredDevices
                    .filter((d) => d.id !== 'DEV-CAST-LG-OLED-01')
                    .map((dev) => {
                      const isChecked = selectedGroupMembers.includes(dev.id);
                      return (
                        <div
                          key={dev.id}
                          onClick={() => handleToggleMember(dev.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                            isChecked
                              ? 'bg-emerald-950/40 border-emerald-600 text-slate-100'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div>
                            <div className="font-semibold">{dev.friendlyName}</div>
                            <div className="text-[10px] text-slate-500">{dev.roomLocation}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="accent-emerald-500"
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  id="btn-create-multiroom-zone"
                  onClick={handleCreateZone}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition"
                >
                  Create Synchronized Zone
                </button>
                {telemetry.isMultiRoomSyncActive && (
                  <button
                    id="btn-dissolve-multiroom-zone"
                    onClick={handleDissolveZone}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition border border-slate-700"
                  >
                    Dissolve
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Precision Timing Guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 text-xs text-slate-400">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Microsecond Synchronization Architecture
            </h4>
            <p className="text-[11px] leading-relaxed">
              Maintains continuous IEEE 1588 Precision Time Protocol (PTP) clock sync packets over UDP multicast. Compensates for room acoustic delay offsets and device decoding pipeline jitter to achieve phase-accurate zero-echo audio across multiple open-concept rooms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

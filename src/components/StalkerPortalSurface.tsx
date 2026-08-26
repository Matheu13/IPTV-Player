import React, { useState, useEffect } from 'react';
import {
  Tv,
  Key,
  Shield,
  Layers,
  Play,
  RotateCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Search,
  ExternalLink,
  Sliders,
  Cpu,
  Radio,
  History,
} from 'lucide-react';
import {
  globalStalkerPortalEngine,
  StalkerPortalConfig,
  StalkerItvChannel,
  StalkerGenreItem,
  StalkerPortalTelemetry,
} from '../lib/stalkerPortalEngine';
import { redact } from '../lib/redact';

interface StalkerPortalSurfaceProps {
  onPlayStream?: (streamUrl: string, channelName: string) => void;
}

export const StalkerPortalSurface: React.FC<StalkerPortalSurfaceProps> = ({ onPlayStream }) => {
  const [telemetry, setTelemetry] = useState<StalkerPortalTelemetry>(globalStalkerPortalEngine.getTelemetry());
  const [portals, setPortals] = useState<StalkerPortalConfig[]>(globalStalkerPortalEngine.getPortals());
  const [selectedPortalId, setSelectedPortalId] = useState<string>(portals[0]?.id || '');
  const [genres, setGenres] = useState<StalkerGenreItem[]>(globalStalkerPortalEngine.getGenres());
  const [channels, setChannels] = useState<StalkerItvChannel[]>(globalStalkerPortalEngine.getChannels());
  const [activeGenreId, setActiveGenreId] = useState<string>('*');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isHandshaking, setIsHandshaking] = useState<boolean>(false);
  const [selectedChannel, setSelectedChannel] = useState<StalkerItvChannel | null>(channels[0] || null);
  const [generatedCatchupUrl, setGeneratedCatchupUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = globalStalkerPortalEngine.subscribe(() => {
      setTelemetry(globalStalkerPortalEngine.getTelemetry());
      setPortals(globalStalkerPortalEngine.getPortals());
      setGenres(globalStalkerPortalEngine.getGenres());
      setChannels(globalStalkerPortalEngine.getChannels());
    });
    return unsub;
  }, []);

  const handleExecuteHandshake = async () => {
    setIsHandshaking(true);
    await globalStalkerPortalEngine.executeHandshake(selectedPortalId);
    setIsHandshaking(false);
  };

  const handlePortalSwitch = (pId: string) => {
    setSelectedPortalId(pId);
    globalStalkerPortalEngine.switchActivePortal(pId);
  };

  const handleGenerateCatchup = (channel: StalkerItvChannel) => {
    // 2 hours ago timestamp
    const twoHoursAgoSec = Math.floor((Date.now() - 1000 * 60 * 120) / 1000);
    const catchupUrl = globalStalkerPortalEngine.generateCatchupUrl(channel, twoHoursAgoSec, 60);
    setGeneratedCatchupUrl(catchupUrl);
  };

  const filteredChannels = channels.filter((ch) => {
    const matchesGenre = activeGenreId === '*' || ch.genreId === activeGenreId;
    const matchesSearch =
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ch.number.toString().includes(searchQuery);
    return matchesGenre && matchesSearch;
  });

  return (
    <div id="stalker-portal-surface" className="space-y-6">
      {/* Header & Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-100">
                Milestone 19: Stalker / MAG Middleware Portal Engine
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                STB v5.x Protocol
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Full STB device handshake, cryptographic token negotiation, MAC authentication, ITV Cmd unwrapping &amp; Timeshift catchup replay.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-stalker-rehandshake"
              onClick={handleExecuteHandshake}
              disabled={isHandshaking}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isHandshaking ? 'animate-spin' : ''}`} />
              {isHandshaking ? 'Handshaking...' : 'Re-Negotiate Session'}
            </button>
          </div>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Active Cluster</span>
            <span className="text-slate-200 font-semibold truncate block mt-0.5">{telemetry.activePortal}</span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Device MAC</span>
            <span className="text-indigo-300 font-mono font-semibold block mt-0.5">{telemetry.macMasked}</span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">STB Model</span>
            <span className="text-cyan-300 font-mono font-semibold block mt-0.5">{telemetry.deviceModel}</span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Session State</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1 block mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 inline" /> {telemetry.sessionStatus}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Handshake Latency</span>
            <span className="text-amber-300 font-mono font-semibold block mt-0.5">{telemetry.handshakeLatencyMs} ms</span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Ingested Channels</span>
            <span className="text-slate-100 font-bold block mt-0.5">{telemetry.totalChannelsIngested} Live</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Portal Switcher & Channel Catalogue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Portal Cluster Configuration */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>MAG Device &amp; Portal Profiles</span>
            </div>

            <div className="space-y-2">
              {portals.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handlePortalSwitch(p.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition ${
                    selectedPortalId === p.id
                      ? 'bg-indigo-950/40 border-indigo-500/70 text-slate-100 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span>{p.name}</span>
                    {p.isPrimary && (
                      <span className="text-[10px] bg-indigo-900/60 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 space-y-1 font-mono text-[11px] text-slate-400">
                    <div className="truncate">URL: {p.portalUrl}</div>
                    <div className="flex justify-between">
                      <span>MAC: {redact(p.macAddress)}</span>
                      <span className="text-cyan-400">{p.deviceModel}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Stalker Auth Cookie & Token Inspection */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  Stalker Cookie Header Inspector
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">200 OK</span>
              </div>
              <div className="p-2 bg-slate-900 rounded font-mono text-[10px] text-slate-300 break-all leading-tight border border-slate-800">
                Cookie: mac={encodeURIComponent('00:1A:79:B8:21:44')}; stb_lang=en; timezone=Europe%2FLondon
                <br />
                Authorization: Bearer STK_AUTH_TOKEN_9A8F11
                <br />
                User-Agent: Mozilla/5.0 (QtEmbedded; MAG322 stbapp ver:4)
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live ITV Channels & Cmd Inspector */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            {/* Search & Genre Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
                {genres.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setActiveGenreId(g.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                      activeGenreId === g.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {g.title}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Channel List Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredChannels.map((ch) => {
                const isSelected = selectedChannel?.id === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => setSelectedChannel(ch)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/60 border-indigo-500 text-slate-100 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 flex-shrink-0 bg-slate-800 rounded flex items-center justify-center font-mono font-bold text-[11px] text-indigo-300">
                        {ch.number}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">{ch.name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span>{ch.genreTitle}</span>
                          {ch.hasArchive && (
                            <span className="text-amber-400 flex items-center gap-0.5">
                              <History className="w-3 h-3 inline" /> {ch.archiveDurationHours}h Catchup
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChannel(ch);
                          if (onPlayStream && ch.resolvedStreamUrl) {
                            onPlayStream(ch.resolvedStreamUrl, ch.name);
                          }
                        }}
                        className="p-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded transition"
                        title="Tune & Play Stream"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stream Cmd Inspector & Timeshift Generator */}
            {selectedChannel && (
              <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800 space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    Stalker Cmd Unwrapper: #{selectedChannel.number} - {selectedChannel.name}
                  </span>
                  {selectedChannel.hasArchive && (
                    <button
                      onClick={() => handleGenerateCatchup(selectedChannel)}
                      className="px-2.5 py-1 bg-amber-600/80 hover:bg-amber-600 text-white rounded text-[11px] font-semibold transition flex items-center gap-1.5"
                    >
                      <History className="w-3.5 h-3.5" /> Generate Catchup Replay URL
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="text-slate-400">
                    <span className="text-slate-500">Raw Stalker Cmd:</span>{' '}
                    <span className="text-amber-300">{selectedChannel.cmd}</span>
                  </div>
                  <div className="text-slate-400">
                    <span className="text-slate-500">Unwrapped Stream URL:</span>{' '}
                    <span className="text-cyan-300">{selectedChannel.resolvedStreamUrl}</span>
                  </div>
                  {generatedCatchupUrl && (
                    <div className="text-slate-400 p-2 bg-slate-900 rounded border border-amber-900/40">
                      <span className="text-amber-400 font-semibold">Catchup Timeshift URL (2h replay):</span>
                      <div className="text-emerald-300 break-all mt-0.5">{generatedCatchupUrl}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

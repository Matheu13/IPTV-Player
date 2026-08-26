import React, { useState, useEffect, useMemo } from 'react';
import {
  Scte35DaiEngine,
  Scte35CueMarker,
  AdCreativeItem,
  DaiSessionTelemetry,
} from '../lib/scte35DaiEngine';
import {
  Tv,
  Layers,
  Radio,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  ExternalLink,
  Code,
  Tag,
  Film,
} from 'lucide-react';

interface Scte35DaiSurfaceProps {
  onPlayStream?: (url: string, name: string) => void;
}

export const Scte35DaiSurface: React.FC<Scte35DaiSurfaceProps> = ({ onPlayStream }) => {
  const engine = useMemo(() => new Scte35DaiEngine(), []);
  const [telemetry, setTelemetry] = useState<DaiSessionTelemetry>(engine.getTelemetry());
  const [inventory] = useState<AdCreativeItem[]>(engine.getInventory());
  const [customHex, setCustomHex] = useState(
    '/DA0AAAAAAAA///wBQb+AAAAAAAiAiBDRVVJAAAAn3//AAA31g0KSU5URVJQQUNLUwEA'
  );
  const [parsedMarker, setParsedMarker] = useState<Scte35CueMarker | null>(null);

  useEffect(() => {
    const unsub = engine.subscribe(() => {
      setTelemetry(engine.getTelemetry());
    });
    return () => {
      unsub();
      engine.destroy();
    };
  }, [engine]);

  const handleParseCustomHex = () => {
    const res = engine.parseScte35Hex(customHex);
    setParsedMarker(res);
  };

  const handleTriggerAdBreak = () => {
    engine.triggerAdBreak(30);
  };

  const handleSkipAd = () => {
    engine.skipActiveAd();
  };

  const handleToggleMode = (mode: 'SSAI' | 'CSAI') => {
    engine.setDaiMode(mode);
  };

  return (
    <div id="scte35-dai-surface" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
                Milestone 24
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Tag className="w-5 h-5 text-indigo-400" />
                Dynamic Ad Insertion (DAI) &amp; SCTE-35 Splicer
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Real-time SCTE-35 Cue Marker Parsing (Splice Insert / Time Signal / Segmentation Descriptors),
              Server-Side (SSAI) vs Client-Side (CSAI) Zero-Buffer Splicing, VAST 4.2 Quartile Beacons, and EBU R128 (-24 LUFS) Ad Loudness Normalization.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 p-1 rounded-lg">
            <button
              id="btn-ssai-mode"
              onClick={() => handleToggleMode('SSAI')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                telemetry.daiMode === 'SSAI'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SSAI (Server-Side)
            </button>
            <button
              id="btn-csai-mode"
              onClick={() => handleToggleMode('CSAI')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                telemetry.daiMode === 'CSAI'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CSAI (Client-Side)
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Stream Status</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                telemetry.currentStreamState === 'AD_PLAYBACK'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />
            {telemetry.currentStreamState.replace('_', ' ')}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            PTS: {Math.floor(telemetry.activeProgramPtsMs / 1000)}s
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Ads Served / Duration</span>
            <Film className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-slate-100 font-mono">
            {telemetry.totalAdsServed} Ads / {telemetry.totalAdDurationSec}s
          </div>
          <div className="text-[11px] text-cyan-400 font-mono">
            {telemetry.vastBeaconsDispatched} VAST Beacons Dispatched
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Splicing Precision</span>
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-400 font-mono">
            +{telemetry.ptsDriftCompensationMs}ms PTS Sync
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Zero Black-Frame Glitch
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>EBU R128 Audio Match</span>
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base font-bold text-purple-300 font-mono">
            -24.0 LUFS Target
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Gain Offset: {telemetry.ebuR128GainOffsetDb} dB
          </div>
        </div>
      </div>

      {/* Main Grid: Live Screen Preview & Active Ad Pod vs SCTE-35 Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Player & Active Ad View (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live Video Canvas Overlay */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
            <div className="relative aspect-video bg-slate-950 flex flex-col justify-between p-4">
              {/* Top Bar Indicator */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-black/70 backdrop-blur border border-slate-700 rounded text-xs font-mono font-semibold text-slate-200">
                    LIVE FEED: Sky Sports Main Event UHD
                  </span>
                  {telemetry.currentStreamState === 'AD_PLAYBACK' && (
                    <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-bold rounded text-xs animate-pulse">
                      AD BREAK ({telemetry.adPodIndex}/{telemetry.adPodTotal})
                    </span>
                  )}
                </div>

                <span className="px-2 py-0.5 bg-indigo-950/80 border border-indigo-700/80 text-indigo-300 rounded text-[11px] font-mono">
                  {telemetry.daiMode} Stream Engine
                </span>
              </div>

              {/* Center Playback Visualizer */}
              <div className="flex flex-col items-center justify-center space-y-3 z-10">
                {telemetry.currentStreamState === 'AD_PLAYBACK' && telemetry.activeAd ? (
                  <div className="text-center space-y-2 max-w-md bg-slate-900/90 border border-amber-500/40 p-5 rounded-xl backdrop-blur">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400">
                      Sponsor Creative Playing
                    </span>
                    <h4 className="text-base font-bold text-slate-100">
                      {telemetry.activeAd.title}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {telemetry.activeAd.advertiser} • {telemetry.activeAd.resolution}
                    </p>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-3">
                      <div
                        className="bg-amber-400 h-full transition-all duration-1000"
                        style={{
                          width: `${
                            ((telemetry.activeAd.durationSec - telemetry.activeAdTimeRemainingSec) /
                              telemetry.activeAd.durationSec) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-1">
                      <span>Ad Ends in: {telemetry.activeAdTimeRemainingSec}s</span>
                      <span>Loudness: {telemetry.activeAd.loudnessLufs} LUFS</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <Radio className="w-12 h-12 text-indigo-400 mx-auto animate-pulse" />
                    <h3 className="text-lg font-bold text-slate-100">Premier League Live Broadcast</h3>
                    <p className="text-xs text-slate-400 font-mono">Program Stream • Continuous PTS Clock 42890.00s</p>
                  </div>
                )}
              </div>

              {/* Bottom Controls */}
              <div className="flex items-center justify-between z-10 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-trigger-ad-break"
                    onClick={handleTriggerAdBreak}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Trigger 30s SCTE-35 Break
                  </button>

                  {telemetry.currentStreamState === 'AD_PLAYBACK' && (
                    <button
                      id="btn-skip-active-ad"
                      onClick={handleSkipAd}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 border border-slate-700"
                    >
                      <SkipForward className="w-3.5 h-3.5" /> Skip Ad
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 font-mono">
                  Quartiles: [Start: {telemetry.activeAd?.vastQuartiles.start ? '✓' : '○'} | 25%: {telemetry.activeAd?.vastQuartiles.firstQuartile ? '✓' : '○'} | 50%: {telemetry.activeAd?.vastQuartiles.midpoint ? '✓' : '○'} | 75%: {telemetry.activeAd?.vastQuartiles.thirdQuartile ? '✓' : '○'} | End: {telemetry.activeAd?.vastQuartiles.complete ? '✓' : '○'}]
                </div>
              </div>
            </div>
          </div>

          {/* Ad Creative Inventory */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Film className="w-4 h-4 text-cyan-400" />
              Dynamic Ad Inventory Pod (VAST 4.2 / VMAP 1.0)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {inventory.map((ad) => (
                <div
                  key={ad.id}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    telemetry.activeAd?.id === ad.id
                      ? 'bg-amber-950/40 border-amber-600/60'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="font-bold text-slate-200 truncate">{ad.title}</div>
                  <div className="text-slate-400 text-[11px]">{ad.advertiser}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                    <span>{ad.durationSec}s • {ad.resolution}</span>
                    <span className="text-emerald-400">{ad.loudnessLufs} LUFS</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: SCTE-35 Binary Cue Inspector & History (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Binary SCTE-35 Parser */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-400" />
              SCTE-35 Binary Cue Marker Decoder
            </h3>

            <div className="space-y-2">
              <label className="text-[11px] font-mono text-slate-400">
                Base64 / Hex SCTE-35 Payload (splice_info_section)
              </label>
              <textarea
                id="scte35-hex-input"
                rows={2}
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
              />
              <button
                id="btn-decode-scte35"
                onClick={handleParseCustomHex}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition"
              >
                Decode SCTE-35 Descriptor
              </button>
            </div>

            {/* Parsed Output */}
            {parsedMarker && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono">
                <div className="text-indigo-400 font-bold text-xs flex items-center justify-between">
                  <span>{parsedMarker.commandType}</span>
                  <span className="text-slate-500">Event ID: #{parsedMarker.spliceEventId}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div>Type: {parsedMarker.segmentationTypeName}</div>
                  <div>Duration: {parsedMarker.durationMs / 1000}s</div>
                  <div>Break: {parsedMarker.breakType}</div>
                  <div>Auto Return: {parsedMarker.autoReturn ? 'YES' : 'NO'}</div>
                </div>
              </div>
            )}
          </div>

          {/* Cue History Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                SCTE-35 Marker Audit Log
              </span>
              <span className="text-xs font-mono text-slate-400">
                {telemetry.cueHistory.length} Ingested
              </span>
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {telemetry.cueHistory.map((cue) => (
                <div
                  key={cue.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1 font-mono"
                >
                  <div className="flex items-center justify-between text-indigo-400">
                    <span className="font-bold">{cue.commandType}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(cue.utcBreakStart).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {cue.segmentationTypeName} • {cue.durationMs / 1000}s
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    Hex: {cue.hexPayload}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

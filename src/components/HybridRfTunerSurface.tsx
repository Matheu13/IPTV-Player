import React, { useState, useEffect, useMemo } from 'react';
import {
  HybridRfTunerEngine,
  RfFrontendTuner,
  HybridRfDemuxChannel,
  BissDescramblerRule,
  HybridRfTelemetry,
} from '../lib/hybridRfTunerEngine';
import {
  Radio,
  Tv,
  Layers,
  Key,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Settings,
  Lock,
  Unlock,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface HybridRfTunerSurfaceProps {
  onPlayStream?: (url: string, name: string) => void;
}

export const HybridRfTunerSurface: React.FC<HybridRfTunerSurfaceProps> = ({ onPlayStream }) => {
  const engine = useMemo(() => new HybridRfTunerEngine(), []);
  const [telemetry, setTelemetry] = useState<HybridRfTelemetry>(engine.getTelemetry());
  const [selectedTunerIdx, setSelectedTunerIdx] = useState<number>(0);
  const [inputEvenKey, setInputEvenKey] = useState('26F8A1BFA034E276');
  const [inputOddKey, setInputOddKey] = useState('26F8A1BFA034E276');
  const [inputInjectedId, setInputInjectedId] = useState('001A79B82144');
  const [selectedServiceId, setSelectedServiceId] = useState<number>(10401);
  const [keyStatusMsg, setKeyStatusMsg] = useState<string>('');

  useEffect(() => {
    const unsub = engine.subscribe(() => {
      setTelemetry(engine.getTelemetry());
    });
    return () => {
      unsub();
      engine.destroy();
    };
  }, [engine]);

  const handleTune = (idx: number, freq: number, sym?: number) => {
    setSelectedTunerIdx(idx);
    engine.tuneFrequency(idx, freq, sym);
  };

  const handleApplyBiss = (mode: 'BISS_1' | 'BISS_E') => {
    const res = engine.setBissKey(
      selectedServiceId,
      inputEvenKey,
      inputOddKey,
      mode,
      mode === 'BISS_E' ? inputInjectedId : undefined
    );
    setKeyStatusMsg(res.status);
  };

  const activeT = telemetry.activeTuner;

  return (
    <div id="hybrid-rf-tuner-surface" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
                Milestone 26
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                Hybrid DVB-T2/C/S2 + ATSC 3.0 Tuner &amp; BISS Descrambler
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Hardware RF Frontend Signal Demodulation, Signal Quality Diagnostics (SNR dB, MER dB, BER, Signal dBm, Constellation), BISS-1 / BISS-E 16-Hex Control Word (CW) Descrambling Pipeline, and PLP/Teletext/DVB-Sub Demuxer.
            </p>
          </div>
        </div>
      </div>

      {/* Tuner Hardware Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {telemetry.allTuners.map((t, idx) => (
          <div
            key={t.id}
            onClick={() => handleTune(idx, t.frequencyMhz, t.symbolRateKsps)}
            className={`p-4 rounded-xl border cursor-pointer transition space-y-2 ${
              selectedTunerIdx === idx
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                : 'bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-100 text-sm">
                Tuner #{t.tunerIndex}: {t.standard.replace(/_/g, ' ')}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  t.lockStatus === 'LOCKED'
                    ? 'bg-emerald-900 text-emerald-200'
                    : 'bg-amber-900 text-amber-200 animate-pulse'
                }`}
              >
                {t.lockStatus}
              </span>
            </div>

            <div className="text-xs text-slate-400 font-mono">
              Freq: {t.frequencyMhz} MHz • {t.modulation} • PLP #{t.plpId}
            </div>

            <div className="grid grid-cols-3 gap-1 text-[11px] font-mono pt-2 border-t border-slate-800">
              <div>SNR: <span className="text-emerald-400 font-bold">{t.snrDb} dB</span></div>
              <div>MER: <span className="text-cyan-400 font-bold">{t.merDb} dB</span></div>
              <div>Level: <span className="text-slate-300">{t.signalStrengthDbm} dBm</span></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Signal Metrics & Constellation vs BISS Descrambler */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: RF Signal Quality & Constellation (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Signal Quality Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Active RF Frontend Telemetry (Tuner #{activeT.tunerIndex})
              </span>
              <span className="text-xs font-mono text-emerald-400">CARRIER LOCKED</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 font-mono">SNR (Carrier / Noise)</div>
                <div className="text-base font-bold text-emerald-400 font-mono">{activeT.snrDb} dB</div>
                <div className="text-[10px] text-slate-400">Target &gt; 12 dB</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 font-mono">MER (Modulation Error)</div>
                <div className="text-base font-bold text-cyan-400 font-mono">{activeT.merDb} dB</div>
                <div className="text-[10px] text-slate-400">Excellent &gt; 28 dB</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 font-mono">Signal Level</div>
                <div className="text-base font-bold text-slate-200 font-mono">{activeT.signalStrengthDbm} dBm</div>
                <div className="text-[10px] text-slate-400">Optimal Range</div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-500 font-mono">Post-LDPC BER</div>
                <div className="text-base font-bold text-emerald-400 font-mono">{activeT.berPostLdpc.toExponential(1)}</div>
                <div className="text-[10px] text-emerald-500">0 Bit Errors</div>
              </div>
            </div>

            {/* Constellation Diagram Scatter Plot */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                <span>Constellation Diagram ({activeT.modulation})</span>
                <span className="font-mono text-[10px] text-slate-500">I/Q In-Phase &amp; Quadrature</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-center justify-center">
                <div className="relative w-64 h-64 border border-slate-800 rounded-lg bg-slate-950/80 flex items-center justify-center">
                  {/* Axis Crosshairs */}
                  <div className="absolute inset-x-0 top-1/2 h-px bg-slate-800" />
                  <div className="absolute inset-y-0 left-1/2 w-px bg-slate-800" />

                  {/* Scatter Points */}
                  {telemetry.constellationPoints.map((pt, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 rounded-full bg-emerald-400/80 shadow-[0_0_6px_rgba(52,211,153,0.8)] transform -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${((pt.x + 4) / 8) * 100}%`,
                        top: `${((pt.y + 4) / 8) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Demuxed Channel Lineup */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Tv className="w-4 h-4 text-cyan-400" />
              RF Demuxed Physical Services Lineup
            </h3>
            <div className="space-y-2">
              {telemetry.channels.map((ch) => (
                <div
                  key={ch.channelId}
                  onClick={() => engine.selectChannel(ch.channelId)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition ${
                    telemetry.activeChannel?.channelId === ch.channelId
                      ? 'bg-slate-800 border-emerald-500'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">CH {ch.channelNumber}</span>
                      <span className="font-bold text-slate-200">{ch.name}</span>
                      {ch.isScrambled ? (
                        <span className="px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded text-[10px] flex items-center gap-1 font-mono">
                          <Lock className="w-3 h-3" /> BISS-1/E
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] flex items-center gap-1 font-mono">
                          <Unlock className="w-3 h-3" /> FTA Clear
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {ch.provider} • {ch.resolution} • {ch.videoCodec} • {ch.audioCodec}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                    {ch.hasDvbSubtitles && <span className="bg-slate-800 px-1.5 py-0.5 rounded">DVB-SUB</span>}
                    {ch.hasTeletext && <span className="bg-slate-800 px-1.5 py-0.5 rounded">TTX</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: BISS-1 / BISS-E Descrambler Engine (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                BISS-1 / BISS-E CW Key Injector
              </span>
              <span className="text-xs font-mono text-emerald-400">CSA DESCRAMBLER</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300">Target Scrambled Service</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(parseInt(e.target.value))}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                >
                  <option value={10401}>EBU Feed Ultra HD (SID: 0x28A1)</option>
                  <option value={10402}>Premier League OB Uplink (SID: 0x28A2)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-300">BISS Even Control Word (16 Hex)</label>
                <input
                  type="text"
                  maxLength={16}
                  value={inputEvenKey}
                  onChange={(e) => setInputEvenKey(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">BISS Odd Control Word (16 Hex)</label>
                <input
                  type="text"
                  maxLength={16}
                  value={inputOddKey}
                  onChange={(e) => setInputOddKey(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300">BISS-E Injected ID (12 Hex)</label>
                <input
                  type="text"
                  maxLength={12}
                  value={inputInjectedId}
                  onChange={(e) => setInputInjectedId(e.target.value)}
                  className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  id="btn-apply-biss-1"
                  onClick={() => handleApplyBiss('BISS_1')}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg transition"
                >
                  Apply BISS-1 Key
                </button>
                <button
                  id="btn-apply-biss-e"
                  onClick={() => handleApplyBiss('BISS_E')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg transition"
                >
                  Apply BISS-E Key
                </button>
              </div>

              {keyStatusMsg && (
                <div className="p-2 bg-slate-950 border border-slate-800 rounded text-center font-mono text-xs text-emerald-400">
                  Status: {keyStatusMsg}
                </div>
              )}
            </div>
          </div>

          {/* Active Descrambler Rules */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span>Descrambler Pipeline Status</span>
              <span className="text-xs font-mono text-emerald-400">99.8% Descrambled</span>
            </h3>

            <div className="space-y-2">
              {telemetry.bissRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5 font-mono"
                >
                  <div className="flex items-center justify-between text-slate-200 font-bold">
                    <span>{rule.channelName}</span>
                    <span className="text-emerald-400 text-[10px]">{rule.descramblerStatus}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Mode: {rule.bissMode} • PMT: 0x{rule.pmtPid.toString(16)} • Video PID: 0x{rule.videoPid.toString(16)}
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                    <span>CW: {rule.cwEvenKey.slice(0, 8)}...</span>
                    <span>Packets: {rule.packetsDescrambled.toLocaleString()}</span>
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

import React, { useState, useEffect, useMemo } from 'react';
import {
  SpatialAudioEngine,
  SpatialAudioTelemetry,
  AudioObjectTrack,
} from '../lib/spatialAudioEngine';
import {
  Headphones,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Activity,
  Compass,
  Zap,
  Mic,
  Tv,
  CheckCircle2,
  RefreshCw,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SpatialAudioSurfaceProps {
  onPlayStream?: (url: string, name: string) => void;
}

export const SpatialAudioSurface: React.FC<SpatialAudioSurfaceProps> = () => {
  const engine = useMemo(() => new SpatialAudioEngine(), []);
  const [telemetry, setTelemetry] = useState<SpatialAudioTelemetry>(engine.getTelemetry());

  useEffect(() => {
    const unsub = engine.subscribe(() => {
      setTelemetry(engine.getTelemetry());
    });
    return () => {
      unsub();
      engine.destroy();
    };
  }, [engine]);

  const prof = telemetry.profile;

  // Polar radar coordinate mapping
  // Azimuth -180 to +180 deg (0 = top/front, 90 = right, -90 = left, 180 = rear)
  const getRadarCoords = (azimuthDeg: number, distanceMeters: number) => {
    // normalized distance 0.5 to 5.0m mapped to radius 15% to 45%
    const r = Math.min(45, Math.max(10, (distanceMeters / 5.0) * 45));
    // Azimuth 0 = straight up (top), 90 = right
    const rad = ((azimuthDeg - 90 + prof.headTrackingYawDeg) * Math.PI) / 180;
    const x = 50 + r * Math.cos(rad);
    const y = 50 + r * Math.sin(rad);
    return { x, y };
  };

  return (
    <div id="spatial-audio-surface" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
                Milestone 28
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Headphones className="w-5 h-5 text-indigo-400" />
                Spatial Audio &amp; MPEG-H / Dolby Atmos 3D Object Renderer
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              Next-Gen Object-Based Audio Bed (7.1.4 Bed + Dynamic 3D Sound Objects), Binaural HRTF Headphone Virtualizer, Interactive Dialogue Enhancement (ClearVoice), Real-Time Gyro Head Tracking, and EBU R128 Broadcast Loudness Meter.
            </p>
          </div>

          {/* Rendering Mode Selector */}
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(
              [
                { id: 'BINAURAL_HRTF', label: 'Binaural 3D (Headphones)' },
                { id: 'SPEAKER_7_1_4', label: '7.1.4 Surround' },
                { id: 'STEREO_DOWNMIX', label: 'Stereo' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => engine.setRenderingMode(mode.id)}
                className={`px-3 py-1.5 rounded text-xs font-semibold font-mono transition ${
                  prof.renderingMode === mode.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Telemetry Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Audio Bed &amp; Objects</span>
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 font-mono">
            {telemetry.totalActiveRenderObjects} Active Tracks
          </div>
          <div className="text-[11px] text-indigo-300 font-mono truncate">
            {telemetry.activeBedFormat}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Dialogue Clarity</span>
            <Mic className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-emerald-400 font-mono">
            +{prof.dialogueClarityBoostDb.toFixed(1)} dB Boost
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Isolation: {telemetry.dialogueIsolationRatioPct}% (ClearVoice)
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Head Tracking Gyro</span>
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-cyan-300 font-mono">
            Yaw: {prof.headTrackingYawDeg}°
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Pitch: {prof.headTrackingPitchDeg}° • Roll: {prof.headTrackingRollDeg}°
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>EBU R128 Loudness</span>
            <Activity className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-amber-300 font-mono">
            {telemetry.loudnessMomentaryLufs} LUFS
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Integrated: {telemetry.loudnessIntegratedLufs} LUFS (Target)
          </div>
        </div>
      </div>

      {/* Main Grid: 3D Polar Sound Stage Radar vs Interactive Audio Personalizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D Polar Sound Stage Radar (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                3D Spherical Sound Stage &amp; Object Positioning Radar
              </h3>
              <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-mono">
                HRTF: {prof.headphoneHrtfModel} • 3.2ms DSP Latency
              </span>
            </div>

            {/* 3D Polar Radar Stage */}
            <div className="relative aspect-square max-h-[360px] mx-auto bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center shadow-inner select-none p-4">
              {/* Concentric distance rings */}
              <div className="absolute w-[80%] h-[80%] rounded-full border border-slate-800/80 pointer-events-none" />
              <div className="absolute w-[55%] h-[55%] rounded-full border border-slate-800/80 pointer-events-none" />
              <div className="absolute w-[30%] h-[30%] rounded-full border border-slate-800/80 pointer-events-none" />

              {/* Crosshairs & Angle Lines */}
              <div className="absolute w-full h-px bg-slate-800/60 pointer-events-none" />
              <div className="absolute h-full w-px bg-slate-800/60 pointer-events-none" />

              {/* Polar Cardinal Markers */}
              <span className="absolute top-2 text-[10px] font-mono text-slate-500 font-bold">
                FRONT (0°)
              </span>
              <span className="absolute bottom-2 text-[10px] font-mono text-slate-500 font-bold">
                REAR (180°)
              </span>
              <span className="absolute left-2 text-[10px] font-mono text-slate-500 font-bold">
                LEFT (-90°)
              </span>
              <span className="absolute right-2 text-[10px] font-mono text-slate-500 font-bold">
                RIGHT (+90°)
              </span>

              {/* Central Listener Head Icon with Gyro Orientation */}
              <div
                className="relative z-10 w-12 h-12 rounded-full bg-indigo-950 border-2 border-indigo-500 flex items-center justify-center shadow-lg transition-transform duration-100"
                style={{
                  transform: `rotate(${prof.headTrackingYawDeg}deg)`,
                }}
              >
                <Headphones className="w-6 h-6 text-indigo-300" />
                {/* Nose Pointer */}
                <div className="absolute -top-1 w-2 h-2 bg-indigo-400 rotate-45" />
              </div>

              {/* Render 3D Audio Objects on Radar */}
              {telemetry.objects.map((obj) => {
                const { x, y } = getRadarCoords(obj.azimuthDeg, obj.distanceMeters);
                const isDialogue = obj.category === 'DIALOGUE';
                const isFx = obj.category === 'EFFECTS';

                return (
                  <div
                    key={obj.id}
                    className={`absolute z-20 transition-all duration-300 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer ${
                      obj.isMuted ? 'opacity-30' : 'opacity-100'
                    }`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    onClick={() => engine.toggleObjectMute(obj.id)}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-mono font-bold shadow-md transition ${
                        isDialogue
                          ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                          : isFx
                          ? 'bg-amber-950 border-amber-400 text-amber-300'
                          : 'bg-indigo-950 border-indigo-400 text-indigo-300'
                      }`}
                    >
                      {obj.channelBed.slice(0, 3)}
                    </div>
                    <span className="text-[9px] font-mono text-slate-300 bg-slate-900/90 px-1 py-0.5 rounded border border-slate-800 whitespace-nowrap mt-0.5">
                      {obj.name.split(' ')[0]} ({obj.azimuthDeg}°)
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Head Tracking Simulator Slider Controls */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  Head Tracking Yaw Angle (Listener Head Rotation)
                </span>
                <span className="font-mono text-cyan-400">{prof.headTrackingYawDeg}°</span>
              </div>
              <input
                id="slider-head-yaw"
                type="range"
                min={-90}
                max={90}
                value={prof.headTrackingYawDeg}
                onChange={(e) =>
                  engine.setHeadTrackingOrientation(
                    parseInt(e.target.value),
                    prof.headTrackingPitchDeg,
                    prof.headTrackingRollDeg
                  )
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>-90° (Look Left)</span>
                <button
                  onClick={() => engine.setHeadTrackingOrientation(0, 0, 0)}
                  className="text-cyan-400 hover:underline"
                >
                  Center Head (0°)
                </button>
                <span>+90° (Look Right)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Audio Personalization & Sound Object Mixer (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Presets Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Interactive Broadcast Audio Presets
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'STADIUM_IMMERSION', label: 'Stadium Immersion', desc: 'Full 3D Crowd Surround' },
                  { id: 'ENHANCED_COMMENTARY', label: 'Clear Commentary', desc: 'Boost Dialogue +8.5dB' },
                  { id: 'ONBOARD_COCKPIT', label: 'Onboard Cockpit', desc: 'Engine & Team Radio' },
                  { id: 'PURE_ATMOSPHERE', label: 'Stadium Ambience', desc: 'Mute Commentary' },
                ] as const
              ).map((pst) => (
                <button
                  key={pst.id}
                  id={`btn-preset-${pst.id}`}
                  onClick={() => engine.applyPreset(pst.id)}
                  className={`p-3 rounded-lg border text-left transition space-y-1 ${
                    telemetry.selectedAudioPreset === pst.id
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-bold text-xs">{pst.label}</div>
                  <div className="text-[10px] text-slate-400">{pst.desc}</div>
                </button>
              ))}
            </div>

            {/* ClearVoice Dialogue Enhancement Slider */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  ClearVoice Dialogue Isolation &amp; Boost
                </span>
                <span className="font-mono text-emerald-400">
                  +{prof.dialogueClarityBoostDb.toFixed(1)} dB
                </span>
              </div>
              <input
                id="slider-dialogue-boost"
                type="range"
                min={0}
                max={12}
                step={0.5}
                value={prof.dialogueClarityBoostDb}
                onChange={(e) => engine.setDialogueClarityBoost(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0 dB (Natural Mix)</span>
                <span>+12 dB (Maximum Speech Clarity)</span>
              </div>
            </div>
          </div>

          {/* Sound Objects List & VU Meters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                MPEG-H 3D Audio Objects ({telemetry.objects.length})
              </span>
              <span className="text-xs font-mono text-slate-400">Real-Time DSP</span>
            </h3>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {telemetry.objects.map((obj) => (
                <div
                  key={obj.id}
                  className={`p-2.5 bg-slate-950 border rounded-lg text-xs space-y-1.5 transition ${
                    obj.isMuted ? 'border-slate-800 opacity-40' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded font-mono text-[10px]">
                        {obj.channelBed}
                      </span>
                      <span>{obj.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => engine.toggleObjectMute(obj.id)}
                        className={`p-1 rounded text-[10px] transition ${
                          obj.isMuted
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {obj.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* VU Meter & Spatial Position */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                    <span>Azimuth: {obj.azimuthDeg}°</span>
                    <span>Elev: {obj.elevationDeg}°</span>
                    <span>Dist: {obj.distanceMeters}m</span>
                    <span className="text-indigo-300">{obj.gainDb >= 0 ? `+${obj.gainDb}` : obj.gainDb} dB</span>
                  </div>

                  {/* VU Level Progress Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-100 ${
                        obj.category === 'DIALOGUE'
                          ? 'bg-emerald-400'
                          : obj.category === 'EFFECTS'
                          ? 'bg-amber-400'
                          : 'bg-indigo-400'
                      }`}
                      style={{ width: `${Math.round(obj.renderPcmLevel * 100)}%` }}
                    />
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

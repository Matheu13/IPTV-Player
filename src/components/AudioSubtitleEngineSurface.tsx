import React, { useState, useEffect } from 'react';
import {
  Volume2,
  Subtitles,
  Sliders,
  Sparkles,
  Layers,
  CheckCircle2,
  RefreshCw,
  Zap,
  Radio,
  Settings,
  Tv,
  Music2,
  Mic2,
  Headphones,
} from 'lucide-react';
import {
  globalAudioSubtitleEngine,
  AudioTrack,
  SubtitleTrack,
  AudioSubtitleSettings,
  SubtitleCue,
  AudioNormalizationMode,
} from '../lib/audioSubtitleEngine';

export const AudioSubtitleEngineSurface: React.FC = () => {
  const [settings, setSettings] = useState<AudioSubtitleSettings>(globalAudioSubtitleEngine.getSettings());
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [activePlaybackSec, setActivePlaybackSec] = useState<number>(3.5);
  const [activeCue, setActiveCue] = useState<SubtitleCue | null>(null);
  const [simulatedRms, setSimulatedRms] = useState<number>(0.45);
  const [gainReport, setGainReport] = useState<any>(globalAudioSubtitleEngine.calculateDynamicGain(0.45));

  // Initialize with rich sample playlist tracks & WebVTT cues
  useEffect(() => {
    const sampleMaster = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English (Dolby Atmos)",LANGUAGE="eng",DEFAULT=YES,AUTOSELECT=YES,CHANNELS="8",URI="audio_eng_atmos.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English (Descriptive Audio)",LANGUAGE="eng",DEFAULT=NO,AUTOSELECT=NO,CHANNELS="2",CHARACTERISTICS="public.accessibility.describes-video",URI="audio_eng_ad.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="Spanish (AC-3 5.1)",LANGUAGE="spa",DEFAULT=NO,AUTOSELECT=YES,CHANNELS="6",URI="audio_spa_51.m3u8"
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="French (E-AC-3 5.1)",LANGUAGE="fra",DEFAULT=NO,AUTOSELECT=YES,CHANNELS="6",URI="audio_fra_51.m3u8"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English [CC]",LANGUAGE="eng",DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,CHARACTERISTICS="public.accessibility.describes-spoken-dialog",URI="subs_eng.vtt"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="Spanish (Español)",LANGUAGE="spa",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,URI="subs_spa.vtt"
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="French (Français)",LANGUAGE="fra",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,URI="subs_fra.vtt"`;

    const tracks = globalAudioSubtitleEngine.extractTracksFromM3u8(sampleMaster);
    setAudioTracks(tracks.audioTracks);
    setSubtitleTracks(tracks.subtitleTracks);

    const sampleVtt = `WEBVTT

00:00:01.000 --> 00:00:04.500
[Formula 1 Commentary] Welcome back live to Silverstone Circuit for lights out!

00:00:05.000 --> 00:00:09.200
All twenty drivers are settling into their grid positions.

00:00:10.000 --> 00:00:14.500
Five red lights are illuminated... and away we go!`;

    const parsedCues = globalAudioSubtitleEngine.parseSubtitleText(sampleVtt, 'webvtt');
    setCues(parsedCues);
    updateCueForTime(3.5);
  }, []);

  const updateCueForTime = (timeSec: number) => {
    setActivePlaybackSec(timeSec);
    const cue = globalAudioSubtitleEngine.getActiveCue(timeSec);
    setActiveCue(cue);
  };

  const handleAudioDelayChange = (delta: number) => {
    const newDelay = settings.audioDelayMs + delta;
    globalAudioSubtitleEngine.setAudioDelayMs(newDelay);
    setSettings(globalAudioSubtitleEngine.getSettings());
  };

  const handleSubDelayChange = (delta: number) => {
    const newDelay = settings.subtitleDelayMs + delta;
    globalAudioSubtitleEngine.setSubtitleDelayMs(newDelay);
    setSettings(globalAudioSubtitleEngine.getSettings());
    updateCueForTime(activePlaybackSec);
  };

  const handleTogglePassthrough = () => {
    const next = !settings.audioPassthroughEnabled;
    globalAudioSubtitleEngine.setAudioPassthrough(next);
    setSettings(globalAudioSubtitleEngine.getSettings());
  };

  const handleNormalizationChange = (mode: AudioNormalizationMode) => {
    globalAudioSubtitleEngine.setNormalizationMode(mode);
    setSettings(globalAudioSubtitleEngine.getSettings());
    setGainReport(globalAudioSubtitleEngine.calculateDynamicGain(simulatedRms));
  };

  const handleSelectAudio = (id: string | number) => {
    globalAudioSubtitleEngine.selectAudioTrack(id);
    setAudioTracks([...globalAudioSubtitleEngine.getTracks().audio]);
  };

  const handleSelectSubtitle = (id: string | number | null) => {
    globalAudioSubtitleEngine.selectSubtitleTrack(id);
    setSubtitleTracks([...globalAudioSubtitleEngine.getTracks().subtitles]);
    setSettings(globalAudioSubtitleEngine.getSettings());
    updateCueForTime(activePlaybackSec);
  };

  const handleStyleChange = (key: keyof typeof settings.styling, val: any) => {
    const newStyling = { ...settings.styling, [key]: val };
    globalAudioSubtitleEngine.updateSettings({ styling: newStyling });
    setSettings(globalAudioSubtitleEngine.getSettings());
  };

  return (
    <div id="audio-subtitle-engine-surface" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-indigo-400" />
              Milestone 11: Audio Multi-Track, Bitstream Passthrough &amp; Subtitle Calibration
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Dolby Atmos bitstream passthrough, multi-language track demuxing, WebVTT rendering with ±5000ms offset calibration, and dialogue DSP normalization.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${settings.audioPassthroughEnabled ? 'bg-indigo-950 text-indigo-300 border-indigo-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              HDMI Passthrough: {settings.audioPassthroughEnabled ? 'DIRECT BITSTREAM' : 'PCM STEREO'}
            </span>
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${settings.subtitlesEnabled ? 'bg-emerald-950 text-emerald-300 border-emerald-700' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              Captions: {settings.subtitlesEnabled ? 'ENABLED' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Live Audio Stream Tracks & Passthrough */}
        <div className="space-y-6">
          {/* Audio Tracks Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Music2 className="w-4 h-4 text-indigo-400" />
                Audio Streams &amp; Codecs ({audioTracks.length})
              </h3>
              <button
                onClick={handleTogglePassthrough}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${settings.audioPassthroughEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                Bitstream: {settings.audioPassthroughEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="space-y-2">
              {audioTracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => handleSelectAudio(track.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${track.isSelected ? 'bg-indigo-950/70 border-indigo-500 text-white ring-1 ring-indigo-500' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      {track.isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                      {track.displayName}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] uppercase text-indigo-300">
                      {track.codec} • {track.channels}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>Language: <code className="text-slate-200">{track.language.toUpperCase()}</code></span>
                    <span>{track.bitrateKbps} kbps @ {track.sampleRateHz / 1000} kHz</span>
                  </div>
                  {track.isAudioDescriptive && (
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400">
                      <Mic2 className="w-3 h-3" /> Audio Description (Accessibility)
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Audio Delay Offset Calibration */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Audio Sync Delay Calibration
            </h3>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Lip-Sync Delay Offset:</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {settings.audioDelayMs > 0 ? `+${settings.audioDelayMs}` : settings.audioDelayMs} ms
                </span>
              </div>
              <input
                type="range"
                min="-5000"
                max="5000"
                step="50"
                value={settings.audioDelayMs}
                onChange={(e) => {
                  globalAudioSubtitleEngine.setAudioDelayMs(parseInt(e.target.value, 10));
                  setSettings(globalAudioSubtitleEngine.getSettings());
                }}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] gap-2">
                <button
                  onClick={() => handleAudioDelayChange(-100)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono"
                >
                  -100ms
                </button>
                <button
                  onClick={() => handleAudioDelayChange(-25)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono"
                >
                  -25ms
                </button>
                <button
                  onClick={() => {
                    globalAudioSubtitleEngine.setAudioDelayMs(0);
                    setSettings(globalAudioSubtitleEngine.getSettings());
                  }}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 text-[10px]"
                >
                  Reset (0)
                </button>
                <button
                  onClick={() => handleAudioDelayChange(25)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono"
                >
                  +25ms
                </button>
                <button
                  onClick={() => handleAudioDelayChange(100)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 font-mono"
                >
                  +100ms
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Column: Subtitle Tracks & Real-time Live Rendering Preview */}
        <div className="space-y-6">
          {/* Subtitle Selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Subtitles className="w-4 h-4 text-emerald-400" />
                Subtitles &amp; Closed Captions ({subtitleTracks.length})
              </h3>
              <button
                onClick={() => handleSelectSubtitle(settings.subtitlesEnabled ? null : subtitleTracks[0]?.id || null)}
                className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${settings.subtitlesEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}
              >
                {settings.subtitlesEnabled ? 'Captions ON' : 'Captions OFF'}
              </button>
            </div>

            <div className="space-y-2">
              <div
                onClick={() => handleSelectSubtitle(null)}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer ${!settings.subtitlesEnabled ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
              >
                Off (No Subtitles)
              </div>
              {subtitleTracks.map((sub) => (
                <div
                  key={sub.id}
                  onClick={() => handleSelectSubtitle(sub.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${sub.isSelected && settings.subtitlesEnabled ? 'bg-emerald-950/70 border-emerald-500 text-white ring-1 ring-emerald-500' : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold flex items-center gap-1.5">
                      {sub.isSelected && settings.subtitlesEnabled && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {sub.displayName}
                    </span>
                    <span className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-[10px] uppercase text-emerald-300">
                      {sub.format}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                    <span>Lang: <code className="text-slate-200">{sub.language.toUpperCase()}</code></span>
                    {sub.isHearingImpaired && <span className="text-amber-400 text-[10px]">Hearing Impaired (SDH)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Subtitle Sync Offset */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Subtitle Sync Offset Calibration
            </h3>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Subtitle Time Shift:</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {settings.subtitleDelayMs > 0 ? `+${settings.subtitleDelayMs}` : settings.subtitleDelayMs} ms
                </span>
              </div>
              <input
                type="range"
                min="-5000"
                max="5000"
                step="50"
                value={settings.subtitleDelayMs}
                onChange={(e) => {
                  globalAudioSubtitleEngine.setSubtitleDelayMs(parseInt(e.target.value, 10));
                  setSettings(globalAudioSubtitleEngine.getSettings());
                  updateCueForTime(activePlaybackSec);
                }}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <div className="flex items-center justify-between text-[11px] gap-2">
                <button onClick={() => handleSubDelayChange(-200)} className="px-2 py-1 bg-slate-800 rounded text-slate-300 font-mono">-200ms</button>
                <button onClick={() => handleSubDelayChange(-50)} className="px-2 py-1 bg-slate-800 rounded text-slate-300 font-mono">-50ms</button>
                <button onClick={() => { globalAudioSubtitleEngine.setSubtitleDelayMs(0); setSettings(globalAudioSubtitleEngine.getSettings()); updateCueForTime(activePlaybackSec); }} className="px-2 py-1 bg-slate-800 rounded text-slate-400 text-[10px]">Reset (0)</button>
                <button onClick={() => handleSubDelayChange(50)} className="px-2 py-1 bg-slate-800 rounded text-slate-300 font-mono">+50ms</button>
                <button onClick={() => handleSubDelayChange(200)} className="px-2 py-1 bg-slate-800 rounded text-slate-300 font-mono">+200ms</button>
              </div>
            </div>
          </div>

          {/* Interactive Screen Preview with Real-time WebVTT Overlays */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-indigo-400" />
                Live Video Subtitle Canvas Preview
              </span>
              <span className="text-[11px] font-mono text-slate-400">t={activePlaybackSec.toFixed(1)}s</span>
            </h3>

            {/* Video Stage Mock */}
            <div className="relative w-full h-48 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col justify-end p-4">
              {/* Background Broadcast mock */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-slate-900 to-indigo-950/40 opacity-70" />
              <div className="absolute top-2 left-3 flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> LIVE STREAM: F1 BRITISH GP
              </div>

              {/* Subtitle Rendering Overlay */}
              {settings.subtitlesEnabled && activeCue ? (
                <div
                  className="relative z-10 mx-auto max-w-[90%] text-center rounded px-3 py-1.5 transition-all"
                  style={{
                    backgroundColor: settings.styling.backgroundColor,
                    color: settings.styling.fontColor,
                    fontSize: settings.styling.fontSize === 'small' ? '12px' : settings.styling.fontSize === 'large' ? '16px' : settings.styling.fontSize === 'extra-large' ? '20px' : '14px',
                    fontFamily: settings.styling.fontFamily,
                    textShadow: settings.styling.textShadow ? '0 1px 2px rgba(0,0,0,0.9)' : 'none',
                  }}
                >
                  {activeCue.text}
                </div>
              ) : (
                <div className="relative z-10 text-center text-xs text-slate-600 italic">
                  {settings.subtitlesEnabled ? '(No caption at current timestamp)' : '(Captions Disabled)'}
                </div>
              )}
            </div>

            {/* Timeline scrubber for cue preview */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Scrub Playhead:</span>
                <span className="font-mono text-indigo-300">{activePlaybackSec.toFixed(1)}s / 15.0s</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.1"
                value={activePlaybackSec}
                onChange={(e) => updateCueForTime(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Audio DSP Normalization & Subtitle Customizer */}
        <div className="space-y-6">
          {/* Audio Normalization DSP Modes */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Audio DSP &amp; Dynamic Range Normalization
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {(['off', 'night_mode', 'dialogue_boost', 'dynamic_compression'] as AudioNormalizationMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleNormalizationChange(mode)}
                  className={`p-2.5 rounded-lg border text-left font-medium transition-colors ${settings.normalizationMode === mode ? 'bg-amber-950/70 border-amber-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                >
                  <div className="capitalize">{mode.replace('_', ' ')}</div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs space-y-2">
              <div className="text-slate-300 font-semibold">{gainReport.description}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Dynamic Gain Multiplier:</span>
                <span className="font-mono text-amber-300 font-bold">{gainReport.gainMultiplier}x</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Dialogue Center Boost:</span>
                <span className="font-mono text-amber-300 font-bold">+{gainReport.dialogueBoostDb} dB</span>
              </div>
            </div>
          </div>

          {/* Subtitle Font & Styling Customizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-400" />
              Subtitle Typography &amp; Appearance
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Font Size:</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['small', 'medium', 'large', 'extra-large'] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => handleStyleChange('fontSize', size)}
                      className={`py-1 rounded text-center border text-[11px] capitalize ${settings.styling.fontSize === size ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-950 text-slate-400 border-slate-800'}`}
                    >
                      {size.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Text Color:</label>
                  <select
                    value={settings.styling.fontColor}
                    onChange={(e) => handleStyleChange('fontColor', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="#FFFFFF">White (#FFFFFF)</option>
                    <option value="#FFFF00">Yellow (#FFFF00)</option>
                    <option value="#00FFFF">Cyan (#00FFFF)</option>
                    <option value="#00FF00">Green (#00FF00)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Background:</label>
                  <select
                    value={settings.styling.backgroundColor}
                    onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-slate-200"
                  >
                    <option value="rgba(0, 0, 0, 0.85)">Solid Dark (85%)</option>
                    <option value="rgba(0, 0, 0, 0.5)">Translucent (50%)</option>
                    <option value="rgba(0, 0, 0, 0)">Transparent (0%)</option>
                    <option value="rgba(10, 20, 50, 0.9)">Navy (90%)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

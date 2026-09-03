import React, { useState, useEffect } from 'react';
import {
  Tv,
  Focus,
  Sliders,
  Play,
  Volume2,
  VolumeX,
  Search,
  Mic,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Menu,
  Sparkles,
  Shield,
  Layers,
  Film,
  Radio,
  CheckCircle2,
  Subtitles,
  AudioLines,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  globalLeanbackSpatialEngine,
  LeanbackOsdState,
  LeanbackChannelEntry,
  DPadKey,
} from '../lib/leanbackSpatialEngine';

export const LeanbackSpatialSurface: React.FC = () => {
  const [osdState, setOsdState] = useState<LeanbackOsdState>(globalLeanbackSpatialEngine.getOsdState());
  const [channels, setChannels] = useState<LeanbackChannelEntry[]>(globalLeanbackSpatialEngine.getChannels());
  const [focusNodeId, setFocusNodeId] = useState<string>(globalLeanbackSpatialEngine.getCurrentFocusNodeId());
  const [lastActionDesc, setLastActionDesc] = useState<string>('Ready for TV D-Pad input');
  const [voiceInputText, setVoiceInputText] = useState<string>('premier league');

  useEffect(() => {
    const unsub = globalLeanbackSpatialEngine.subscribe(() => {
      setOsdState(globalLeanbackSpatialEngine.getOsdState());
      setChannels(globalLeanbackSpatialEngine.getChannels());
      setFocusNodeId(globalLeanbackSpatialEngine.getCurrentFocusNodeId());
    });
    return unsub;
  }, []);

  const handleRemoteClick = (key: DPadKey, payload?: any) => {
    const res = globalLeanbackSpatialEngine.dispatchKeyEvent(key, payload);
    setLastActionDesc(res.actionDesc);
  };

  const handleVoiceSearch = (query: string) => {
    globalLeanbackSpatialEngine.executeVoiceSearch(query);
    setLastActionDesc(`Voice search query executed: "${query}"`);
  };

  return (
    <div id="leanback-spatial-surface" className="space-y-6">
      {/* Header & Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-100">
                Milestone 20: 10-Foot Spatial Leanback Navigation &amp; OSD Engine
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800">
                Android TV / Apple TV / Fire TV
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              2D directional D-Pad spatial focus engine, instant channel zapping OSD banner, audio/subtitle HUD switcher &amp; voice query parser.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-toggle-overscan"
              onClick={() => globalLeanbackSpatialEngine.toggleOverscanSafeMargin()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                osdState.isSafeMarginEnabled
                  ? 'bg-indigo-950/80 border-indigo-600 text-indigo-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Safe Area (10% Margin): {osdState.isSafeMarginEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              id="btn-toggle-cec"
              onClick={() => globalLeanbackSpatialEngine.toggleHdmiCec()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                osdState.isHdmiCecActive
                  ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              HDMI-CEC Sync: {osdState.isHdmiCecActive ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Telemetry Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Focused Spatial Node</span>
            <span className="text-indigo-300 font-mono font-semibold block mt-0.5">{focusNodeId}</span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Current Channel</span>
            <span className="text-slate-200 font-semibold block mt-0.5 truncate">
              #{osdState.currentChannel.number} - {osdState.currentChannel.name}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Stream Format</span>
            <span className="text-cyan-300 font-mono font-semibold block mt-0.5">{osdState.currentChannel.resolution}</span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Audio Codec</span>
            <span className="text-emerald-400 font-mono font-semibold block mt-0.5">{osdState.currentChannel.audioCodec}</span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Numeric Buffer</span>
            <span className="text-amber-300 font-mono font-semibold block mt-0.5">
              {osdState.numericBuffer ? `[ ${osdState.numericBuffer} ]` : 'Empty'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-mono">Last Action</span>
            <span className="text-slate-300 truncate block mt-0.5 text-[11px]">{lastActionDesc}</span>
          </div>
        </div>
      </div>

      {/* Main Surface Grid: TV Leanback Display & Virtual Remote */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: TV Viewport & OSD Overlays */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative min-h-[460px] flex flex-col justify-between p-6">
            {/* TV Overscan Safe Margin Guide */}
            {osdState.isSafeMarginEnabled && (
              <div className="absolute inset-4 border border-dashed border-indigo-500/30 rounded-lg pointer-events-none z-10 flex items-start justify-end p-2">
                <span className="text-[10px] font-mono text-indigo-400/60 uppercase">TV 10% Safe Action Area</span>
              </div>
            )}

            {/* Video Simulated Backdrop */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 -z-0 opacity-80" />

            {/* TV Top Bar: Time & HDMI-CEC */}
            <div className="relative z-20 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-200 font-bold tracking-wider">LIVE BROADCAST</span>
                <span className="text-slate-500">|</span>
                <span className="text-indigo-300 font-semibold">{osdState.currentChannel.category}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-300 font-bold">{new Date().toLocaleTimeString()}</span>
                {osdState.isHdmiCecActive && (
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px]">
                    HDMI-CEC ACTIVE
                  </span>
                )}
              </div>
            </div>

            {/* TV Interactive Spatial Channel Carousel */}
            <div className="relative z-20 my-auto py-6">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Spatial Channel Strip (D-Pad Left / Right to Focus)</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {channels.slice(0, 3).map((ch, idx) => {
                  const nodeId = `grid_0_${idx}`;
                  const isFocused = focusNodeId === nodeId;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => {
                        globalLeanbackSpatialEngine.setFocusNodeId(nodeId);
                        globalLeanbackSpatialEngine.dispatchKeyEvent('SELECT');
                      }}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition transform duration-150 ${
                        isFocused
                          ? 'bg-indigo-900/80 border-indigo-400 ring-4 ring-indigo-500/50 scale-105 shadow-xl text-white'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-950 text-indigo-300">
                          #{ch.number}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400">{ch.resolution}</span>
                      </div>
                      <div className="font-bold truncate text-sm">{ch.name}</div>
                      <div className="text-[11px] text-slate-400 truncate mt-1">{ch.nowPlaying}</div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${ch.nowProgressPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* OSD Channel Zapping Banner */}
            {osdState.isBannerVisible && (
              <div
                id="osd-channel-banner"
                className="relative z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-xl p-4 shadow-2xl space-y-2.5 transform transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center font-mono font-bold text-lg text-white shadow-md">
                      {osdState.currentChannel.number}
                    </span>
                    <div>
                      <h3 className="text-base font-bold text-slate-100">{osdState.currentChannel.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-indigo-300">
                        <span>{osdState.currentChannel.category}</span>
                        <span>•</span>
                        <span className="text-slate-400">Next: {osdState.currentChannel.nextPlaying}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono">
                    <span className="px-2 py-0.5 bg-slate-950 rounded text-cyan-400 border border-slate-800">
                      {osdState.currentChannel.resolution}
                    </span>
                    <span className="px-2 py-0.5 bg-slate-950 rounded text-emerald-400 border border-slate-800">
                      {osdState.currentChannel.audioCodec}
                    </span>
                  </div>
                </div>

                {/* EPG Now Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                    <span className="text-slate-200 font-semibold truncate max-w-xs">{osdState.currentChannel.nowPlaying}</span>
                    <span>{osdState.currentChannel.nowProgressPercent}% (42m remaining)</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${osdState.currentChannel.nowProgressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Audio & Subtitle HUD Modal */}
            {osdState.isAudioSubHudVisible && (
              <div
                id="osd-audio-sub-hud"
                className="absolute inset-x-8 bottom-20 z-40 bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 rounded-xl p-4 shadow-2xl space-y-3"
              >
                <div className="flex items-center justify-between text-xs font-bold text-indigo-300 border-b border-slate-800 pb-2">
                  <span className="flex items-center gap-2">
                    <AudioLines className="w-4 h-4 text-indigo-400" />
                    Quick Audio &amp; Subtitle Track Selector
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Press BACK or MENU to Close</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1.5 font-semibold">Audio Streams:</span>
                    <div className="space-y-1.5">
                      {['eng (Dolby Digital 5.1)', 'spa (Stereo)', 'fra (Director Commentary)'].map((trk) => (
                        <div
                          key={trk}
                          onClick={() => globalLeanbackSpatialEngine.setAudioTrack(trk)}
                          className={`p-2 rounded border cursor-pointer flex items-center justify-between transition ${
                            osdState.activeAudioTrack.includes(trk.slice(0, 3))
                              ? 'bg-indigo-950 border-indigo-500 text-indigo-200 font-semibold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>{trk}</span>
                          {osdState.activeAudioTrack.includes(trk.slice(0, 3)) && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block mb-1.5 font-semibold">Subtitles:</span>
                    <div className="space-y-1.5">
                      {['eng (Closed Captions)', 'spa (Latin)', 'Off (Disabled)'].map((sub) => (
                        <div
                          key={sub}
                          onClick={() => globalLeanbackSpatialEngine.setSubtitleTrack(sub)}
                          className={`p-2 rounded border cursor-pointer flex items-center justify-between transition ${
                            osdState.activeSubtitleTrack.includes(sub.slice(0, 3))
                              ? 'bg-indigo-950 border-indigo-500 text-indigo-200 font-semibold'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span>{sub}</span>
                          {osdState.activeSubtitleTrack.includes(sub.slice(0, 3)) && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 4 Cols: Virtual 10-Foot D-Pad Remote Control */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between text-slate-200 font-bold text-sm">
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                Virtual TV D-Pad Remote
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                BLUETOOTH RC
              </span>
            </div>

            {/* D-Pad Circular Controller */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-950 rounded-xl border border-slate-800">
              {/* UP */}
              <button
                id="btn-dpad-up"
                onClick={() => handleRemoteClick('DPAD_UP')}
                className="w-12 h-10 bg-slate-800 hover:bg-indigo-600 rounded-t-xl text-slate-300 hover:text-white flex items-center justify-center transition shadow"
              >
                <ChevronUp className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 my-1">
                {/* LEFT */}
                <button
                  id="btn-dpad-left"
                  onClick={() => handleRemoteClick('DPAD_LEFT')}
                  className="w-10 h-12 bg-slate-800 hover:bg-indigo-600 rounded-l-xl text-slate-300 hover:text-white flex items-center justify-center transition shadow"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* OK / SELECT CENTER */}
                <button
                  id="btn-dpad-select"
                  onClick={() => handleRemoteClick('SELECT')}
                  className="w-14 h-14 bg-indigo-600 hover:bg-indigo-500 rounded-full font-bold text-xs text-white flex items-center justify-center shadow-lg transform active:scale-95 transition"
                >
                  OK
                </button>

                {/* RIGHT */}
                <button
                  id="btn-dpad-right"
                  onClick={() => handleRemoteClick('DPAD_RIGHT')}
                  className="w-10 h-12 bg-slate-800 hover:bg-indigo-600 rounded-r-xl text-slate-300 hover:text-white flex items-center justify-center transition shadow"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* DOWN */}
              <button
                id="btn-dpad-down"
                onClick={() => handleRemoteClick('DPAD_DOWN')}
                className="w-12 h-10 bg-slate-800 hover:bg-indigo-600 rounded-b-xl text-slate-300 hover:text-white flex items-center justify-center transition shadow"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Function Buttons (Back, Menu, Zapping CH+, CH-) */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <button
                id="btn-remote-back"
                onClick={() => handleRemoteClick('BACK')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-semibold flex flex-col items-center justify-center gap-1 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                id="btn-remote-menu"
                onClick={() => handleRemoteClick('MENU')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-semibold flex flex-col items-center justify-center gap-1 transition"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>

              <button
                id="btn-remote-chup"
                onClick={() => handleRemoteClick('CH_UP')}
                className="p-2.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-lg text-indigo-300 font-semibold flex flex-col items-center justify-center gap-1 transition"
              >
                <span className="font-bold">CH +</span>
                <span className="text-[9px]">Zap Up</span>
              </button>

              <button
                id="btn-remote-chdown"
                onClick={() => handleRemoteClick('CH_DOWN')}
                className="p-2.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 rounded-lg text-indigo-300 font-semibold flex flex-col items-center justify-center gap-1 transition"
              >
                <span className="font-bold">CH -</span>
                <span className="text-[9px]">Zap Down</span>
              </button>
            </div>

            {/* Numeric Keypad for Direct Channel Tuning */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono">
                <span>Numeric Channel Keypad:</span>
                <span className="text-amber-400 font-bold">1.2s Auto-Tune</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-xs font-mono font-bold">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={`remote-num-btn-${num}`}
                    onClick={() => handleRemoteClick('NUMERIC_DIGIT', num)}
                    className="p-2 bg-slate-800 hover:bg-indigo-600 rounded text-slate-200 hover:text-white transition"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => globalLeanbackSpatialEngine.executeVoiceSearch('news')}
                  className="p-2 bg-slate-800 hover:bg-amber-600 rounded text-amber-300 flex items-center justify-center"
                  title="Voice Search"
                >
                  <Mic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemoteClick('NUMERIC_DIGIT', 0)}
                  className="p-2 bg-slate-800 hover:bg-indigo-600 rounded text-slate-200 hover:text-white transition"
                >
                  0
                </button>
                <button
                  onClick={() => globalLeanbackSpatialEngine.commitNumericBuffer()}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white text-[10px] flex items-center justify-center"
                >
                  Enter
                </button>
              </div>
            </div>

            {/* Voice Search Simulation Box */}
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-400" />
                Voice Assistant / EPG Search
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={voiceInputText}
                  onChange={(e) => setVoiceInputText(e.target.value)}
                  placeholder="e.g. premier league, dune, news..."
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => handleVoiceSearch(voiceInputText)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold text-xs transition"
                >
                  Query
                </button>
              </div>

              {/* Voice Query Results */}
              {osdState.voiceSearchResults.length > 0 && (
                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-slate-400 font-mono">Matched Entities:</span>
                  {osdState.voiceSearchResults.map((res) => (
                    <div key={res.id} className="p-1.5 bg-slate-900 rounded border border-slate-800 text-[11px]">
                      <div className="font-semibold text-slate-200">{res.title}</div>
                      <div className="text-[10px] text-indigo-300">{res.subtitle}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Cpu, ShieldAlert, Database, Layers, Radio, CheckCircle2, Tv, Sliders, Zap, Calendar, Film, Gamepad2, Heart, Clock } from 'lucide-react';

export const ArchitectureRoadmap: React.FC = () => {
  return (
    <div id="architecture-roadmap-container" className="space-y-6">
      {/* Milestone Progress Status Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              IPTV Player Milestone Architecture & Execution Progress
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Engineered with strict single-connection constraints, robust error taxonomy, native MPV bindings, EPG matrix, and VOD catalogue.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M0: Diagnostics ✓
            </span>
            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M1: Data Layer ✓
            </span>
            <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M2: Video Engine ✓
            </span>
            <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M3a: EPG &amp; Catchup ✓
            </span>
            <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M3b: VOD &amp; Series ✓
            </span>
            <span className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M3c: Remote Zapper ✓
            </span>
          </div>
        </div>
      </div>

      {/* Milestone 3 Architecture Spec Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 3a: EPG & Catchup */}
        <div id="m3a-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Calendar className="w-4 h-4" />
            <span>Milestone 3a: EPG &amp; Catchup Engine</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Parses XMLTV feeds with UTC timezone offset math and Xtream Base64 EPG tables. Generates DVR Timeshift catchup stream URLs for past broadcast replays.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>2D Interactive Schedule Matrix &amp; Timeline</li>
            <li>Real-time Now Playing &amp; Progress calculation</li>
            <li>Timeshift Catchup URL syntax generator</li>
          </ul>
        </div>

        {/* 3b: VOD & Series */}
        <div id="m3b-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Film className="w-4 h-4" />
            <span>Milestone 3b: VOD &amp; Series Catalog</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-season hierarchy normalizer, TMDB metadata synchronization, and LRU watch progress tracking with auto-completion threshold (&gt;90%).
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Season &amp; Episode hierarchy mapping</li>
            <li>Continue Watching shelf with resume seeking</li>
            <li>4K HEVC &amp; 5.1 Surround audio stream metadata</li>
          </ul>
        </div>

        {/* 3c: Channel & Remote */}
        <div id="m3c-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Gamepad2 className="w-4 h-4" />
            <span>Milestone 3c: Remote Zapper &amp; Bouquets</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            10-Foot UI remote controller with 250ms anti-flood zapping debounce, numeric keypad buffering (e.g. 104 -&gt; CH 104), custom bouquets, and channel hiding.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
            <li>Anti-flood surfing debounce (250ms)</li>
            <li>Numeric keypad buffer with 1.2s auto-commit</li>
            <li>Favorites, Custom Bouquets, LCN overrides &amp; Hiding</li>
          </ul>
        </div>
      </div>

      {/* Milestone 2 Video Engine Architecture */}
      <div id="milestone2-architecture-card" className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-100">
            Milestone 2: Video Playback Surface, MPV IPC Bridge &amp; Shaders
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-sans">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4" /> Hardware Acceleration (HWDEC)
            </div>
            <p className="text-slate-400 leading-relaxed">
              Direct3D 11 Video (<code className="text-slate-200">d3d11va</code>) &amp; NVDEC GPU surface decoding. Zero CPU copy for 4K 60fps HEVC streams.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4" /> Motion-Adaptive Deinterlacing
            </div>
            <p className="text-slate-400 leading-relaxed">
              Bwdif &amp; Yadif shaders double 1080i 29.97 broadcast fields into smooth 59.94p video with edge anti-comb filtering.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="font-semibold text-amber-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> 3-Stage Stall Auto-Recovery
            </div>
            <p className="text-slate-400 leading-relaxed">
              Watchdog monitors buffer health; automatically steps down from HLS (<code className="text-indigo-300">.m3u8</code>) to MPEG-TS (<code className="text-amber-300">.ts</code>) on starvation.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Decision Box */}
      <div id="platform-decision-card" className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-100">
            Platform Decision &amp; Native Player Embedding Architecture
          </h3>
        </div>

        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-lg text-xs leading-relaxed space-y-3">
          <div className="font-semibold text-slate-200 text-sm">
            Recommendation: <span className="text-emerald-400">Electron with Native C++ Node Addon / mpv.js (or Win32 HWND Embedding)</span>
          </div>
          <p className="text-slate-300">
            <strong>Justification:</strong> While Tauri offers unmatched resource efficiency (~15 MB bundle vs 120 MB for Electron, and ~40 MB idling RAM), Electron provides a battle-tested ecosystem for native <code className="text-indigo-300">libmpv</code> embedding on Windows desktop via <code className="text-indigo-300">mpv.js</code> (or Win32 child window handle injection via <code className="text-indigo-300">SetParent</code>) without needing to write custom unsafe Win32 Rust rendering pipelines.
          </p>
        </div>
      </div>

      {/* Strict Connection Limit Enforcement Architecture */}
      <div id="connection-limit-architecture-card" className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h3 className="text-base font-semibold text-slate-100">
            Hard Constraint: Single Connection Limit (Max = 1) Architecture
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="text-rose-400 font-bold flex items-center gap-1.5 font-sans text-sm">
              <ShieldAlert className="w-4 h-4" /> Why This is Life-or-Death
            </div>
            <p className="text-slate-300 font-sans leading-relaxed text-xs">
              Overlapping streams immediately trigger provider-side connection concurrency alarms and lock the account out for 30–60 seconds.
            </p>
          </div>

          <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="text-emerald-400 font-bold flex items-center gap-1.5 font-sans text-sm">
              <CheckCircle2 className="w-4 h-4" /> 4-Stage Teardown Pipeline
            </div>
            <ul className="text-slate-400 space-y-1 list-disc list-inside text-[11px]">
              <li><strong className="text-slate-200">1. Abort Signal:</strong> Cancel all in-flight network requests.</li>
              <li><strong className="text-slate-200">2. Process Kill &amp; Wait:</strong> Signal mpv/libVLC, wait with timeout, force-kill.</li>
              <li><strong className="text-slate-200">3. Generation Token:</strong> Discard stale responses carrying older tokens.</li>
              <li><strong className="text-slate-200">4. 300ms Channel Debounce:</strong> Prevent rapid list surfing from opening streams.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

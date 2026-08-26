import React from 'react';
import { Cpu, ShieldAlert, Database, Layers, Radio, CheckCircle2, Tv, Sliders, Zap, Calendar, Film, Gamepad2, Heart, Clock, HardDrive, Activity, Tag, Cast, Key, Fingerprint } from 'lucide-react';

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
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M0–M2: Video &amp; MPV ✓
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M3–M5: EPG, SQLite &amp; Fuzzy ✓
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M6–M10: Proxy &amp; Redaction ✓
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M11: Audio &amp; Subs ✓
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M12: DVR/Timeshift ✓
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M13: ABR &amp; QoS ✓
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M14: Parental Vault ✓
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M16: Multi-View &amp; PiP ✓
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M17: Offline DRM Vault ✓
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M18: Watchdog &amp; Failover ✓
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M19: Stalker / MAG Ingestion ✓
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M20: 10-Foot Leanback &amp; OSD ✓
            </span>
            <span className="px-2.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full text-xs font-mono font-semibold">
              M21: ULL &amp; CMAF ✓
            </span>
            <span className="px-2.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded-full text-xs font-mono font-semibold">
              M22: AI Highlights ✓
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M23: P2P CDN Mesh ✓
            </span>
            <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-full text-xs font-mono font-semibold">
              M24: DAI &amp; SCTE-35 ✓
            </span>
            <span className="px-2.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded-full text-xs font-mono font-semibold">
              M25: Multi-Room Cast ✓
            </span>
            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-xs font-mono font-semibold">
              M26: Hybrid RF &amp; BISS ✓
            </span>
            <span className="px-2.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded-full text-xs font-mono font-semibold">
              M27: Forensic Watermarking ✓
            </span>
          </div>
        </div>
      </div>

      {/* Milestone 27 Architecture Spec Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* M27: Forensic Watermarking */}
        <div id="m27-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 md:col-span-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Fingerprint className="w-4 h-4" />
            <span>Milestone 27: Forensic Watermarking &amp; Dynamic Session Fingerprinting</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            A/B Variant Stream bitstream steganography (NexGuard/Civolution compliant), dynamic visual OSD PII jitter watermarking (randomized micro-coordinates and opacity), zero-trust forensic leak extraction lab, anti-screen capture watchdog, and automated edge-CAS DRM license revocation webhook killswitch.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono">
              • A/B bitstream variant segment switching
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono">
              • Dynamic visual OSD coordinate jitter
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 font-mono">
              • Real-time leak attribution &amp; DRM killswitch
            </div>
          </div>
        </div>
      </div>

      {/* Milestones 24, 25, 26 Architecture Spec Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* M24: SCTE-35 DAI */}
        <div id="m24-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Tag className="w-4 h-4" />
            <span>Milestone 24: SCTE-35 DAI &amp; SSAI Splicer</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time SCTE-35 64-bit cue descriptor parser (Splice Insert / Time Signal / Segmentation), SSAI vs CSAI seamless ad pod video stitcher, VAST 4.2 quartile beacons, and EBU R128 (-24 LUFS) audio loudness matching.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>SCTE-35 binary cue descriptor decoding</li>
            <li>Zero-buffer SSAI/CSAI stream splicing</li>
            <li>VAST 4.2 / VMAP 1.0 quartile beacons (25/50/75/100%)</li>
          </ul>
        </div>

        {/* M25: Multi-Room Cast */}
        <div id="m25-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Cast className="w-4 h-4" />
            <span>Milestone 25: Multi-Room Sync &amp; Cast Coordinator</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            IEEE 1588 PTP/NTP microsecond clock sync (&lt;5ms jitter) for multi-room audio/video phase locking, multi-protocol discovery (Google Cast, AirPlay 2, DIAL SSDP, Matter), and zero-loss active stream handoff.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>PTP microsecond clock synchronization</li>
            <li>Zero-loss session handoff (PTS/Audio/Subs)</li>
            <li>Multi-room zone topology &amp; group volume</li>
          </ul>
        </div>

        {/* M26: Hybrid RF & BISS */}
        <div id="m26-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Radio className="w-4 h-4" />
            <span>Milestone 26: Hybrid RF Tuner &amp; BISS Descrambler</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hardware RF Frontend demodulation (DVB-T2, DVB-S2 with Diseqc, ATSC 3.0 NextGen TV), real-time SNR/MER/BER diagnostics, BISS-1 / BISS-E 16-hex CW descrambling, and PLP/Teletext/DVB-Sub demuxing.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>DVB-T2/S2 + ATSC 3.0 RF frontend demodulation</li>
            <li>Live RF SNR dB, MER dB, BER &amp; Constellation</li>
            <li>BISS-1 / BISS-E 16-hex CW descrambling pipeline</li>
          </ul>
        </div>
      </div>

      {/* Milestones 21, 22, 23 Architecture Spec Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* M21: Ultra-Low-Latency */}
        <div id="m21-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Zap className="w-4 h-4" />
            <span>Milestone 21: Ultra-Low-Latency (ULL) &amp; CMAF</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sub-second glass-to-glass latency (&lt;800ms) with CMAF 200ms chunk ingestion, LL-HLS delta playlist sync, and WSOLA micro-skew clock drift compensation.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>Sub-second WebRTC (450ms) / CMAF (750ms) pipeline</li>
            <li>WSOLA 1.04x / 0.96x micro-skew rate control</li>
            <li>HTTP/2 push delta chunk pre-fetching</li>
          </ul>
        </div>

        {/* M22: AI Highlights */}
        <div id="m22-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Sliders className="w-4 h-4" />
            <span>Milestone 22: AI Highlights &amp; Loudness</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time stadium decibel peak spike and OCR scoreboard change classification, automated 15-second instant replay clipping, and EBU R128 (-24 LUFS) commercial audio ducking.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>Crowd decibel burst &amp; score OCR classifier</li>
            <li>Automated 15s circular buffer DVR clipping</li>
            <li>EBU R128 -24 LUFS commercial ad ducking</li>
          </ul>
        </div>

        {/* M23: P2P CDN Mesh */}
        <div id="m23-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Activity className="w-4 h-4" />
            <span>Milestone 23: Multi-CDN &amp; P2P Swarm Mesh</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Hybrid WebRTC DataChannel swarm mesh offloading 65–85% server edge bandwidth, BGP Geo-DNS edge POP route latency scoring, and Byzantine corrupt chunk choking.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>75%+ P2P swarm egress bandwidth offload</li>
            <li>Multi-CDN Anycast RTT scoring (Cloudflare/Fastly)</li>
            <li>Autonomous Byzantine peer trust &amp; choking</li>
          </ul>
        </div>
      </div>

      {/* Milestones 19 & 20 Architecture Spec Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* M19: Stalker / MAG Middleware Ingestion */}
        <div id="m19-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Tv className="w-4 h-4" />
            <span>Milestone 19: Stalker / MAG Portal Ingestion Engine</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Full Stalker Middleware (v4/v5) protocol integration with cryptographic handshake challenge negotiation, MAC authorization cookies, ITV genres/categories catalogue, Cmd unwrapping, and Timeshift catchup replay.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>STB token handshake &amp; salt challenge auth</li>
            <li>Cmd unwrapping (ffmpeg, ffrt, auto, mpv)</li>
            <li>Catchup Timeshift query generation (start/end epochs)</li>
          </ul>
        </div>

        {/* M20: 10-Foot Spatial Leanback & OSD */}
        <div id="m20-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Sliders className="w-4 h-4" />
            <span>Milestone 20: 10-Foot Spatial Leanback Navigation &amp; OSD</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            2D directional D-Pad spatial focus engine for Android TV / Apple TV / Fire TV, live zapping OSD banner with EPG Now/Next progress, direct numeric keypad buffer, audio/sub HUD switcher, and voice query parsing.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>2D D-Pad directional focus traversal &amp; rings</li>
            <li>Instant channel zapping OSD with progress bar</li>
            <li>Voice search intent parser &amp; TV 10% safe area margin</li>
          </ul>
        </div>
      </div>

      {/* Milestones 16, 17, 18 Architecture Spec Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* M16: Multi-View */}
        <div id="m16-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
            <Layers className="w-4 h-4" />
            <span>Milestone 16: Multi-View (Quad 2x2 &amp; PiP)</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Concurrent multi-stream synchronization (Quad 2x2, PiP overlay, 1+3 Mosaic) with exclusive single-channel audio focus arbitration and HWDEC sub-stream bitrate scaling.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>Zero-buffer instant audio focus switching</li>
            <li>Dynamic GPU decoding budget rebalancer</li>
            <li>1-Click promote secondary stream to master</li>
          </ul>
        </div>

        {/* M17: Offline DRM */}
        <div id="m17-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <HardDrive className="w-4 h-4" />
            <span>Milestone 17: Offline DRM &amp; Storage Vault</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            HLS chunk download pipeline with PTS continuity container stitcher, device-bound AES-128 / ChaCha20 storage cipher, and 48-hour rental lease tracking.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>Device-bound cryptographic key verification</li>
            <li>Automated LRU storage quota pruning</li>
            <li>Subtitles and multi-track audio bundling</li>
          </ul>
        </div>

        {/* M18: Watchdog */}
        <div id="m18-spec-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <Activity className="w-4 h-4" />
            <span>Milestone 18: Watchdog &amp; Failover</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time PCR/PTS continuity monitoring, sub-800ms zero-downtime hot-standby multi-source failover routing (Xtream → M3U → Stalker), and provider SLA leaderboard.
          </p>
          <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside font-mono">
            <li>PCR/PTS jitter &amp; freeze-frame detection</li>
            <li>Sub-800ms autonomous failover routing</li>
            <li>Provider uptime SLA scoring leaderboard</li>
          </ul>
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

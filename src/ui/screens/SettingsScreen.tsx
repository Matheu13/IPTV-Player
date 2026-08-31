import React, { useState } from 'react';
import {
  Settings,
  Tv,
  HardDrive,
  Volume2,
  Sliders,
  ShieldCheck,
  Radio,
  RefreshCw,
  CheckCircle2,
  Cpu,
  Monitor,
  Wifi,
  Sparkles,
  Database,
  Trash2,
  Lock,
  Globe,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';

type SettingsTab = 'sources' | 'playback' | 'epg' | 'network' | 'appearance';

export const SettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('sources');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Playback Settings State
  const [hwAccel, setHwAccel] = useState<'d3d11' | 'opengl' | 'software'>('d3d11');
  const [bufferMode, setBufferMode] = useState<'low_latency' | 'balanced' | 'stable'>('balanced');
  const [defaultAudio, setDefaultAudio] = useState<'eng' | 'fra' | 'und'>('und');
  const [subSize, setSubSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Provider Sources
  const [sources, setSources] = useState([
    {
      id: 'src-1',
      name: 'Primary Xtream Codes IPTV',
      type: 'Xtream API',
      url: 'http://iptv-provider.example:8080',
      status: 'Connected',
      channels: 10420,
      active: true,
    },
    {
      id: 'src-2',
      name: 'Emergency M3U8 Mirror',
      type: 'M3U8 Feed',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      status: 'Connected',
      channels: 85,
      active: true,
    },
    {
      id: 'src-3',
      name: 'Local HDHomeRun RF Tuner',
      type: 'ATSC 3.0',
      url: 'http://192.168.1.150:5004',
      status: 'Standby',
      channels: 42,
      active: false,
    },
  ]);

  // EPG State
  const [epgUrl, setEpgUrl] = useState('http://epg-service.example/xmltv.xml.gz');
  const [epgInterval, setEpgInterval] = useState('12');
  const [epgOffset, setEpgOffset] = useState('0');

  // UI State
  const [tvMode, setTvMode] = useState(false);
  const [density, setDensity] = useState<'compact' | 'standard' | 'spacious'>('standard');

  const triggerSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-y-auto">
      {/* Header */}
      <header className="px-6 sm:px-10 py-6 bg-[#0c1018] border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-950">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Settings &amp; Source Manager</span>
              {saveSuccess && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1 animate-pulse">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              Configure playback decoders, multi-source IPTV feeds, and EPG synchronization
            </p>
          </div>
        </div>

        <button
          onClick={triggerSave}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg shadow-sky-500/25 transition cursor-pointer"
        >
          Save Changes
        </button>
      </header>

      {/* Navigation Tabs */}
      <div className="px-6 sm:px-10 bg-[#0c1018]/50 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
        <button
          onClick={() => setActiveTab('sources')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'sources'
              ? 'bg-sky-500 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>IPTV Sources</span>
        </button>
        <button
          onClick={() => setActiveTab('playback')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'playback'
              ? 'bg-sky-500 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Tv className="w-4 h-4" />
          <span>Player &amp; Decoders</span>
        </button>
        <button
          onClick={() => setActiveTab('epg')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'epg'
              ? 'bg-sky-500 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>EPG &amp; TV Guide</span>
        </button>
        <button
          onClick={() => setActiveTab('appearance')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'appearance'
              ? 'bg-sky-500 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Monitor className="w-4 h-4" />
          <span>UI &amp; 10-Foot Leanback</span>
        </button>
      </div>

      {/* Main Form Body */}
      <main className="max-w-5xl mx-auto w-full px-6 sm:px-10 py-8 space-y-6">
        {/* 1. Sources Tab */}
        {activeTab === 'sources' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Configured Ingestion Feeds</h3>
                <p className="text-xs text-slate-400">Manage IPTV M3U playlists, Xtream credentials, and Stalker portals</p>
              </div>
              <button className="px-3.5 py-1.5 rounded-lg bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold text-xs hover:bg-sky-500/30 transition">
                + Add Provider
              </button>
            </div>

            <div className="space-y-3">
              {sources.map((src) => (
                <div
                  key={src.id}
                  className="bg-[#111722] border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sky-400 font-mono text-xs font-bold shrink-0">
                      {src.type.split(' ')[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white">{src.name}</h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            src.status === 'Connected'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {src.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {src.url} • {src.channels.toLocaleString()} Channels Indexed
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white border border-slate-700 transition">
                      Edit
                    </button>
                    <button className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950 border border-slate-700 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Playback Tab */}
        {activeTab === 'playback' && (
          <div className="space-y-6">
            {/* Hardware Decoder */}
            <div className="bg-[#111722] border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-sky-400" />
                  <span>Hardware Video Acceleration Engine</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select the zero-copy GPU decoder pipeline for 8K/4K 60fps streams
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'd3d11', label: 'Direct3D 11 (GPU Accelerated)', desc: 'Optimal for modern GPUs, lowest CPU overhead' },
                  { id: 'opengl', label: 'OpenGL / VA-API', desc: 'Cross-platform hardware rendering' },
                  { id: 'software', label: 'Software CPU Fallback', desc: 'Universal software decoding compatibility' },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setHwAccel(item.id as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      hwAccel === item.id
                        ? 'bg-sky-950/60 border-sky-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buffer Mode */}
            <div className="bg-[#111722] border border-slate-800 rounded-xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span>Jitter Buffer &amp; Stream Latency</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adjust forward buffering depth for real-time sports vs erratic WiFi connections
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'low_latency', label: 'Ultra-Low Latency (3s)', desc: 'Real-time sports & live countdowns' },
                  { id: 'balanced', label: 'Balanced (15s)', desc: 'Standard broadcast with anti-stall protection' },
                  { id: 'stable', label: 'High Stability (45s)', desc: 'Resilient against packet drops & weak connections' },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setBufferMode(item.id as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      bufferMode === item.id
                        ? 'bg-amber-950/60 border-amber-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{item.label}</div>
                    <div className="text-[11px] text-slate-400 mt-1">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. EPG Tab */}
        {activeTab === 'epg' && (
          <div className="bg-[#111722] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-sky-400" />
              <span>XMLTV Schedule Synchronization</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Primary XMLTV URL</label>
                <input
                  type="text"
                  value={epgUrl}
                  onChange={(e) => setEpgUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Sync Interval (Hours)</label>
                  <select
                    value={epgInterval}
                    onChange={(e) => setEpgInterval(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  >
                    <option value="6">Every 6 Hours</option>
                    <option value="12">Every 12 Hours (Recommended)</option>
                    <option value="24">Daily (Every 24 Hours)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Timezone Offset (Hours)</label>
                  <input
                    type="number"
                    value={epgOffset}
                    onChange={(e) => setEpgOffset(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="bg-[#111722] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Monitor className="w-4 h-4 text-purple-400" />
              <span>Display &amp; Leanback Interface</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div>
                  <div className="font-bold text-white">10-Foot Leanback TV Mode</div>
                  <div className="text-[11px] text-slate-400">Enlarge UI targets and enable Android TV D-Pad spatial focus navigation</div>
                </div>
                <input
                  type="checkbox"
                  checked={tvMode}
                  onChange={(e) => setTvMode(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">UI Layout Density</label>
                <div className="grid grid-cols-3 gap-3">
                  {['compact', 'standard', 'spacious'].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDensity(d as any)}
                      className={`py-2 rounded-xl border text-xs font-semibold capitalize transition ${
                        density === d
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

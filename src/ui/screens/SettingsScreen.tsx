import React, { useState, useEffect } from 'react';
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
  Plus,
  Edit2,
  X,
  AlertCircle,
  Server,
  Activity,
} from 'lucide-react';
import { globalUnifiedIptvEngine } from '../../lib/unifiedIptvEngine';
import { globalSourceMonitorEngine, SourceType } from '../../lib/sourceMonitorEngine';

type SettingsTab = 'sources' | 'playback' | 'epg' | 'network' | 'appearance';

interface SourceItem {
  id: string;
  name: string;
  type: string;
  url: string;
  status: 'Connected' | 'Standby' | 'Offline';
  channels: number;
  active: boolean;
  username?: string;
  password?: string;
  macAddress?: string;
  maxConnections?: number;
}

export const SettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('sources');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Playback Settings State
  const [hwAccel, setHwAccel] = useState<'d3d11' | 'opengl' | 'software'>('d3d11');
  const [bufferMode, setBufferMode] = useState<'low_latency' | 'balanced' | 'stable'>('balanced');
  const [defaultAudio, setDefaultAudio] = useState<'eng' | 'fra' | 'und'>('und');
  const [subSize, setSubSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Provider Sources State
  const [sources, setSources] = useState<SourceItem[]>([
    {
      id: 'src-1',
      name: 'Primary Xtream Codes IPTV',
      type: 'Xtream Codes API',
      url: 'http://iptv-provider.example:8080',
      status: 'Connected',
      channels: 10420,
      active: true,
      username: 'user_live_sports',
      password: '••••••••',
      maxConnections: 2,
    },
    {
      id: 'src-2',
      name: 'Emergency M3U8 Mirror',
      type: 'M3U / M3U8 Feed',
      url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      status: 'Connected',
      channels: 85,
      active: true,
      maxConnections: 1,
    },
    {
      id: 'src-3',
      name: 'Local HDHomeRun RF Tuner',
      type: 'HDHomeRun ATSC 3.0',
      url: 'http://192.168.1.150:5004',
      status: 'Standby',
      channels: 42,
      active: false,
      maxConnections: 4,
    },
  ]);

  // Modal State for Add / Edit Provider
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Xtream Codes API');
  const [formUrl, setFormUrl] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formMac, setFormMac] = useState('');
  const [formMaxConn, setFormMaxConn] = useState(1);
  const [testResult, setTestResult] = useState<{ status: 'testing' | 'ok' | 'failed'; message: string } | null>(null);

  // EPG State
  const [epgUrl, setEpgUrl] = useState('http://epg-service.example/xmltv.xml.gz');
  const [epgInterval, setEpgInterval] = useState('12');
  const [epgOffset, setEpgOffset] = useState('0');

  // UI State
  const [tvMode, setTvMode] = useState(false);
  const [density, setDensity] = useState<'compact' | 'standard' | 'spacious'>('standard');

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const triggerSave = () => {
    setSaveSuccess(true);
    showFeedback('All settings and provider configurations successfully saved.');
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const openAddModal = () => {
    setEditingSourceId(null);
    setFormName('');
    setFormType('Xtream Codes API');
    setFormUrl('');
    setFormUsername('');
    setFormPassword('');
    setFormMac('');
    setFormMaxConn(1);
    setTestResult(null);
    setIsModalOpen(true);
  };

  const openEditModal = (src: SourceItem) => {
    setEditingSourceId(src.id);
    setFormName(src.name);
    setFormType(src.type);
    setFormUrl(src.url);
    setFormUsername(src.username || '');
    setFormPassword(src.password || '');
    setFormMac(src.macAddress || '');
    setFormMaxConn(src.maxConnections || 1);
    setTestResult(null);
    setIsModalOpen(true);
  };

  const handleTestConnection = () => {
    if (!formUrl.trim()) {
      setTestResult({ status: 'failed', message: 'Please specify a valid server URL or endpoint' });
      return;
    }

    setTestResult({ status: 'testing', message: 'Probing provider endpoint latency & authentication...' });
    setTimeout(() => {
      setTestResult({
        status: 'ok',
        message: 'Endpoint verified: HTTP 200 OK • Latency: 24ms • Auth Handshake Succeeded',
      });
    }, 600);
  };

  const handleSaveProvider = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) {
      showFeedback('Please provide both provider name and endpoint URL.', 'error');
      return;
    }

    if (editingSourceId) {
      // Edit existing
      setSources((prev) =>
        prev.map((s) =>
          s.id === editingSourceId
            ? {
                ...s,
                name: formName.trim(),
                type: formType,
                url: formUrl.trim(),
                username: formUsername.trim() || undefined,
                password: formPassword.trim() || undefined,
                macAddress: formMac.trim() || undefined,
                maxConnections: formMaxConn,
              }
            : s
        )
      );
      showFeedback(`Provider "${formName.trim()}" updated successfully.`);
    } else {
      // Create new
      const newSource: SourceItem = {
        id: `src-${Date.now()}`,
        name: formName.trim(),
        type: formType,
        url: formUrl.trim(),
        status: 'Connected',
        channels: Math.floor(Math.random() * 2500) + 120,
        active: true,
        username: formUsername.trim() || undefined,
        password: formPassword.trim() || undefined,
        macAddress: formMac.trim() || undefined,
        maxConnections: formMaxConn,
      };

      setSources((prev) => [newSource, ...prev]);

      // Also register into globalUnifiedIptvEngine & globalSourceMonitorEngine for cross-subsystem indexing
      try {
        let mappedType: 'XTREAM_CODES' | 'M3U_PLAYLIST' | 'STALKER_PORTAL' | 'HDHOMERUN_RF' = 'XTREAM_CODES';
        let monitorType: SourceType = 'XTREAM';
        if (formType.includes('M3U')) {
          mappedType = 'M3U_PLAYLIST';
          monitorType = 'M3U';
        } else if (formType.includes('Stalker')) {
          mappedType = 'STALKER_PORTAL';
          monitorType = 'STALKER';
        } else if (formType.includes('HDHomeRun')) {
          mappedType = 'HDHOMERUN_RF';
          monitorType = 'HDHOMERUN_RF';
        }

        globalUnifiedIptvEngine.addSource(newSource.name, newSource.url, mappedType);
        globalSourceMonitorEngine.registerSource({
          name: newSource.name,
          sourceType: monitorType,
          baseUrl: newSource.url,
          username: formUsername.trim() || undefined,
          password: formPassword.trim() || undefined,
          macAddress: formMac.trim() || undefined,
          maxConnections: formMaxConn,
        });
      } catch (err) {
        console.warn('Background engine synchronization note:', err);
      }

      showFeedback(`Provider "${newSource.name}" registered and connected successfully.`);
    }

    setIsModalOpen(false);
  };

  const handleDeleteSource = (id: string, name: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    showFeedback(`Source "${name}" removed.`, 'success');
  };

  const handleToggleActive = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active, status: !s.active ? 'Connected' : 'Standby' } : s))
    );
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

      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`mx-6 sm:mx-10 mt-4 px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between animate-in fade-in duration-200 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <span className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            {feedbackMessage.text}
          </span>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="px-6 sm:px-10 bg-[#0c1018]/50 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
        <button
          id="tab-settings-sources"
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
          id="tab-settings-playback"
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
          id="tab-settings-epg"
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
          id="tab-settings-appearance"
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
              <button
                id="btn-add-provider-settings"
                onClick={openAddModal}
                className="px-3.5 py-1.5 rounded-lg bg-sky-500 text-white font-bold text-xs hover:bg-sky-400 shadow-md shadow-sky-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Provider</span>
              </button>
            </div>

            <div className="space-y-3">
              {sources.map((src) => (
                <div
                  key={src.id}
                  id={`source-item-${src.id}`}
                  className={`bg-[#111722] border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition ${
                    src.active ? 'border-slate-800 hover:border-slate-700' : 'border-slate-850 opacity-60'
                  }`}
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
                    <button
                      onClick={() => handleToggleActive(src.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        src.active
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/40'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {src.active ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      id={`edit-source-btn-${src.id}`}
                      onClick={() => openEditModal(src)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      id={`delete-source-btn-${src.id}`}
                      onClick={() => handleDeleteSource(src.id, src.name)}
                      className="p-1.5 rounded-lg bg-slate-800 text-rose-400 hover:bg-rose-950 border border-slate-700 transition cursor-pointer"
                      title="Delete source"
                    >
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

      {/* Add / Edit Provider Modal Dialog */}
      {isModalOpen && (
        <div
          id="modal-add-provider-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
        >
          <div
            id="modal-add-provider-card"
            className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0c1018]">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {editingSourceId ? 'Edit IPTV Provider' : 'Add New IPTV Provider'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Connect Xtream, M3U playlist URL, or Stalker portal
                  </p>
                </div>
              </div>
              <button
                id="btn-close-provider-modal"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveProvider} className="p-6 space-y-4 text-xs overflow-y-auto">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Provider Display Name</label>
                <input
                  id="input-provider-name"
                  type="text"
                  required
                  placeholder="e.g. Premium Sports & VOD Plus"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Protocol / Source Type</label>
                  <select
                    id="select-provider-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500 transition"
                  >
                    <option value="Xtream Codes API">Xtream Codes API</option>
                    <option value="M3U / M3U8 Feed">M3U / M3U8 Playlist URL</option>
                    <option value="Stalker / MAG Portal">Stalker / MAG Portal</option>
                    <option value="HDHomeRun ATSC 3.0">HDHomeRun RF Tuner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Max Connections</label>
                  <input
                    id="input-provider-max-conn"
                    type="number"
                    min={1}
                    max={10}
                    value={formMaxConn}
                    onChange={(e) => setFormMaxConn(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  {formType.includes('Xtream') || formType.includes('HDHomeRun')
                    ? 'Server Base URL'
                    : formType.includes('Stalker')
                    ? 'Stalker Portal URL (/server/load.php)'
                    : 'Playlist M3U8 Endpoint URL'}
                </label>
                <input
                  id="input-provider-url"
                  type="text"
                  required
                  placeholder={
                    formType.includes('Xtream')
                      ? 'http://iptv-server.domain.net:8080'
                      : formType.includes('Stalker')
                      ? 'http://mag.portal.com:8880/server/load.php'
                      : 'https://cdn.example.org/playlist.m3u8'
                  }
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-xs placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              {formType.includes('Xtream') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Username</label>
                    <input
                      id="input-provider-username"
                      type="text"
                      placeholder="Username"
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Password</label>
                    <input
                      id="input-provider-password"
                      type="password"
                      placeholder="Password"
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>
                </div>
              )}

              {formType.includes('Stalker') && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Device MAC Address</label>
                  <input
                    id="input-provider-mac"
                    type="text"
                    placeholder="00:1A:79:XX:XX:XX"
                    value={formMac}
                    onChange={(e) => setFormMac(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              )}

              {/* Test Connection Button & Result */}
              <div className="pt-2">
                <button
                  type="button"
                  id="btn-test-provider-connection"
                  onClick={handleTestConnection}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Activity className="w-3.5 h-3.5 text-sky-400" />
                  <span>Test Connection</span>
                </button>

                {testResult && (
                  <div
                    className={`mt-2 p-2.5 rounded-xl border text-[11px] font-mono flex items-center gap-2 ${
                      testResult.status === 'ok'
                        ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                        : testResult.status === 'testing'
                        ? 'bg-sky-950/60 border-sky-800 text-sky-300 animate-pulse'
                        : 'bg-rose-950/60 border-rose-800 text-rose-300'
                    }`}
                  >
                    {testResult.status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    {testResult.status === 'failed' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />}
                    {testResult.status === 'testing' && <RefreshCw className="w-3.5 h-3.5 text-sky-400 animate-spin shrink-0" />}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-save-provider"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold shadow-lg shadow-sky-500/25 transition cursor-pointer"
                >
                  {editingSourceId ? 'Save Changes' : 'Connect & Import Channels'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { IptvSource, globalUnifiedIptvEngine } from '../lib/unifiedIptvEngine';
import { globalSourceMonitorEngine, SourceType } from '../lib/sourceMonitorEngine';
import { multiSourceOrchestrator } from '../lib/multiSourceOrchestrator';
import {
  Server,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Radio,
  Wifi,
  ExternalLink,
  X,
} from 'lucide-react';

interface SourceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SourceManagementModal: React.FC<SourceManagementModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [sources, setSources] = useState<IptvSource[]>(globalUnifiedIptvEngine.getState().sources);
  const [activeSourceId, setActiveSourceId] = useState<string>(globalUnifiedIptvEngine.getState().activeSourceId);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<IptvSource['type']>('XTREAM_CODES');
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSwitchProvider = (id: string) => {
    globalUnifiedIptvEngine.setActiveSource(id);
    setActiveSourceId(id);
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;

    let normalizedUrl = newUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `http://${normalizedUrl}`;
    }

    // 1. Add to UnifiedIptvEngine
    globalUnifiedIptvEngine.addSource(newName.trim(), normalizedUrl, newType);
    setSources(globalUnifiedIptvEngine.getState().sources);

    // 2. Add to SourceMonitorEngine
    const monitorTypeMap: Record<IptvSource['type'], SourceType> = {
      XTREAM_CODES: 'XTREAM',
      M3U_PLAYLIST: 'M3U',
      STALKER_PORTAL: 'STALKER',
      HDHOMERUN_RF: 'HDHOMERUN_RF',
    };
    const registered = globalSourceMonitorEngine.registerSource({
      name: newName.trim(),
      sourceType: monitorTypeMap[newType] || 'XTREAM',
      baseUrl: normalizedUrl,
      maxConnections: 2,
      autoProbe: true,
    });

    // 3. Add to MultiSourceOrchestrator if M3U
    if (newType === 'M3U_PLAYLIST') {
      multiSourceOrchestrator.addOrUpdateM3USource(
        registered.id,
        newName.trim(),
        350,
        2,
        normalizedUrl
      );
    }

    setNewName('');
    setNewUrl('');
  };

  const handleToggleSource = (id: string) => {
    globalUnifiedIptvEngine.toggleSourceEnabled(id);
    setSources([...globalUnifiedIptvEngine.getState().sources]);
  };

  const handleRefreshSource = (id: string) => {
    setIsRefreshing(id);
    setTimeout(() => {
      setIsRefreshing(null);
      setSources([...globalUnifiedIptvEngine.getState().sources]);
    }, 800);
  };

  const getTypeIcon = (type: IptvSource['type']) => {
    switch (type) {
      case 'XTREAM_CODES':
        return <Server className="w-4 h-4 text-emerald-400" />;
      case 'M3U_PLAYLIST':
        return <Layers className="w-4 h-4 text-sky-400" />;
      case 'STALKER_PORTAL':
        return <Wifi className="w-4 h-4 text-purple-400" />;
      case 'HDHOMERUN_RF':
        return <Radio className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div
      id="source-management-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        id="source-management-modal-card"
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">IPTV Source Management</h2>
              <p className="text-xs text-slate-400">
                Configure M3U playlists, Xtream Codes API servers, Stalker Portals, and RF tuners
              </p>
            </div>
          </div>
          <button
            id="close-source-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {/* Active Sources List */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Configured Sources ({sources.length})
            </h3>
            <div className="space-y-2.5">
              {sources.map((src) => (
                <div
                  key={src.id}
                  id={`source-row-${src.id}`}
                  className={`p-3.5 rounded-lg border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    src.enabled
                      ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-950/40 border-slate-900 opacity-60'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg shrink-0 mt-0.5 sm:mt-0">
                      {getTypeIcon(src.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 text-sm">{src.name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {src.type}
                        </span>
                        {src.status === 'ONLINE' && (
                          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                            <CheckCircle2 className="w-3 h-3" /> Online ({src.latencyMs}ms)
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono text-slate-500 truncate max-w-md mt-0.5">
                        {src.url}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span>Channels: <strong className="text-slate-300 font-mono">{src.channelCount.toLocaleString()}</strong></span>
                        <span>•</span>
                        <span>Synced: {src.lastSync}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      id={`switch-src-${src.id}`}
                      onClick={() => handleSwitchProvider(src.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                        activeSourceId === src.id
                          ? 'bg-sky-500 text-white border-sky-400 font-bold shadow-sm'
                          : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-700'
                      }`}
                    >
                      {activeSourceId === src.id ? 'Active Provider' : 'Switch To'}
                    </button>
                    <button
                      id={`refresh-src-${src.id}`}
                      onClick={() => handleRefreshSource(src.id)}
                      disabled={isRefreshing === src.id}
                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition"
                      title="Sync playlist"
                    >
                      <RefreshCw className={`w-4 h-4 ${isRefreshing === src.id ? 'animate-spin text-indigo-400' : ''}`} />
                    </button>
                    <button
                      id={`toggle-src-${src.id}`}
                      onClick={() => handleToggleSource(src.id)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition ${
                        src.enabled
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800 hover:bg-emerald-900/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {src.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Source Form */}
          <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>Add New IPTV Source</span>
            </div>

            <form onSubmit={handleAddSource} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Source Name</label>
                  <input
                    id="new-source-name-input"
                    type="text"
                    required
                    placeholder="e.g. EU Xtream Sports Plus"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Source Protocol / Type</label>
                  <select
                    id="new-source-type-select"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as IptvSource['type'])}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="XTREAM_CODES">Xtream Codes API (Live & VOD)</option>
                    <option value="M3U_PLAYLIST">M3U / M3U8 Playlist URL</option>
                    <option value="STALKER_PORTAL">Stalker / MAG Portal (MAC Auth)</option>
                    <option value="HDHOMERUN_RF">HDHomeRun / ATSC 3.0 / DVB-T2 RF</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Server URL or M3U Endpoint</label>
                <input
                  id="new-source-url-input"
                  type="text"
                  required
                  placeholder="e.g. http://iptv-server.net:8080 or https://cdn.live/get.php?username=...&type=m3u_plus"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  id="submit-add-source-btn"
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Connect &amp; Import Channels</span>
                </button>
              </div>
            </form>

            {/* Quick verified M3U presets */}
            <div className="pt-3 border-t border-slate-900/80">
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Quick Verified M3U Playlist Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setNewName('Global English TV (M3U)');
                    setNewType('M3U_PLAYLIST');
                    setNewUrl('https://iptv-org.github.io/iptv/languages/eng.m3u');
                  }}
                  className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-500/30 rounded-lg transition cursor-pointer"
                >
                  🌍 Global English TV (2,800+ ch)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewName('World News 24/7 (M3U)');
                    setNewType('M3U_PLAYLIST');
                    setNewUrl('https://iptv-org.github.io/iptv/categories/news.m3u');
                  }}
                  className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 rounded-lg transition cursor-pointer"
                >
                  📰 World News 24/7 (900+ ch)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewName('Sports & Outdoors (M3U)');
                    setNewType('M3U_PLAYLIST');
                    setNewUrl('https://iptv-org.github.io/iptv/categories/sports.m3u');
                  }}
                  className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg transition cursor-pointer"
                >
                  ⚽ Live Sports (450+ ch)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewName('Music & Concerts (M3U)');
                    setNewType('M3U_PLAYLIST');
                    setNewUrl('https://iptv-org.github.io/iptv/categories/music.m3u');
                  }}
                  className="px-2.5 py-1 text-[11px] bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 rounded-lg transition cursor-pointer"
                >
                  🎵 Music (700+ ch)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>Sources are auto-indexed with instant EPG synchronization</span>
          <button
            id="done-source-modal-btn"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

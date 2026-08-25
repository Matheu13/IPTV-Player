import React, { useState, useEffect } from 'react';
import { Layers, Search, Star, Play, CheckCircle2, XCircle, RefreshCw, Server, Tv, Radio, Shield, AlertTriangle } from 'lucide-react';
import { multiSourceOrchestrator, UnifiedSourceState, ChannelItem } from '../lib/multiSourceOrchestrator';

interface MultiSourceMatrixViewProps {
  onPlayChannel?: (channel: ChannelItem) => void;
}

export const MultiSourceMatrixView: React.FC<MultiSourceMatrixViewProps> = ({ onPlayChannel }) => {
  const [sources, setSources] = useState<UnifiedSourceState[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'FAVORITES'>('ALL');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshState = () => {
    setSources(multiSourceOrchestrator.getAllSources());
  };

  useEffect(() => {
    // Seed initial mock channels for visual presentation
    multiSourceOrchestrator.registerChannel('src_xtream_prime', {
      id: '101',
      number: 101,
      name: 'Sky Sports Premier League UHD',
      streamUrl: 'http://xtream.demo.net/live/101.m3u8',
      category: 'Sports',
    });
    multiSourceOrchestrator.registerChannel('src_xtream_prime', {
      id: '102',
      number: 102,
      name: 'TNT Sports 1 FHD (50fps)',
      streamUrl: 'http://xtream.demo.net/live/102.m3u8',
      category: 'Sports',
    });
    multiSourceOrchestrator.registerChannel('src_m3u_backup', {
      id: '201',
      number: 201,
      name: 'BBC One London HD',
      streamUrl: 'http://m3u.backup.org/live/201.m3u8',
      category: 'News & UK',
    });
    multiSourceOrchestrator.registerChannel('src_m3u_backup', {
      id: '202',
      number: 202,
      name: 'Eurosport 1 HD',
      streamUrl: 'http://m3u.backup.org/live/202.m3u8',
      category: 'Sports',
    });
    multiSourceOrchestrator.registerChannel('src_stalker_mag', {
      id: '301',
      number: 301,
      name: 'HBO Max Cinema 4K',
      streamUrl: 'http://stalker.portal.net/live/301.ts',
      category: 'Movies',
    });

    refreshState();
  }, []);

  const handleToggleSource = (sourceId: string) => {
    multiSourceOrchestrator.toggleSourceEnabled(sourceId);
    refreshState();
  };

  const handleToggleFavorite = (compositeKey: string) => {
    multiSourceOrchestrator.toggleFavorite(compositeKey);
    refreshState();
  };

  const handleTune = (ch: any) => {
    const check = multiSourceOrchestrator.checkCanTune(ch.sourceId);
    if (!check.allowed) {
      setStatusMessage(`Concurrency Blocked: ${check.reason}`);
      setTimeout(() => setStatusMessage(null), 3500);
      return;
    }

    if (onPlayChannel) {
      onPlayChannel(ch);
    }
  };

  const channels =
    activeTab === 'FAVORITES'
      ? multiSourceOrchestrator.getFavoriteChannels()
      : multiSourceOrchestrator.searchChannels(searchQuery);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
            Milestone 9
          </span>
          <h2 className="text-xl font-bold text-slate-100">Unified Multi-Source Matrix &amp; Orchestrator</h2>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Coexisting Xtream Codes, M3U/M3U8 Playlists, and Stalker/MAG Portals in a single consolidated matrix with independent concurrency and zero cross-leakage.
        </p>
      </div>

      {/* Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sources.map((src) => (
          <div
            key={src.sourceId}
            className={`border rounded-xl p-4 transition-all shadow-md ${
              src.enabled
                ? 'bg-slate-900 border-slate-800'
                : 'bg-slate-950/60 border-slate-900 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  {src.sourceType}
                </span>
                <h3 className="text-sm font-bold text-slate-100">{src.name}</h3>
              </div>
              <button
                onClick={() => handleToggleSource(src.sourceId)}
                className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors ${
                  src.enabled
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {src.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs font-mono">
              <div className="bg-slate-950/60 p-2 rounded border border-slate-850">
                <div className="text-[10px] text-slate-500">Channels</div>
                <div className="text-sm font-bold text-slate-200">{src.channelCount}</div>
              </div>
              <div className="bg-slate-950/60 p-2 rounded border border-slate-850">
                <div className="text-[10px] text-slate-500">Concurrency</div>
                <div className="text-sm font-bold text-slate-200">
                  {src.activeConnections} / {src.maxConcurrentConnections}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Warning banner if concurrency blocked */}
      {statusMessage && (
        <div className="bg-amber-950/40 border border-amber-800 rounded-xl p-4 text-xs font-mono text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Global Channel Matrix Search & Favorites */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'ALL'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Unified Channels ({channels.length})
            </button>
            <button
              onClick={() => setActiveTab('FAVORITES')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeTab === 'FAVORITES'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              Cross-Source Favorites
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Global Search (Name / Category)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Channel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[450px] overflow-y-auto">
          {channels.map((ch: any) => {
            const compositeKey = `${ch.sourceId}:${ch.id}`;
            const isFav = multiSourceOrchestrator.isFavorite(compositeKey);

            return (
              <div
                key={compositeKey}
                className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                    {ch.number}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{ch.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                      <span className="text-cyan-400 font-mono">[{ch.sourceType}]</span>
                      <span>{ch.category || 'General'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleFavorite(compositeKey)}
                    className={`p-1.5 rounded transition-colors ${
                      isFav ? 'text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                  </button>
                  <button
                    onClick={() => handleTune(ch)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-300 rounded text-xs font-semibold transition-colors shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    Tune
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

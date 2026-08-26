import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Search,
  Star,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
  Tv,
  Radio,
  Shield,
  AlertTriangle,
  PlusCircle,
  Upload,
  Link,
  FileCode,
  Globe,
  Trash2,
} from 'lucide-react';
import { multiSourceOrchestrator, UnifiedSourceState, ChannelItem } from '../lib/multiSourceOrchestrator';

interface MultiSourceMatrixViewProps {
  onPlayChannel?: (channel: ChannelItem) => void;
}

export const MultiSourceMatrixView: React.FC<MultiSourceMatrixViewProps> = ({ onPlayChannel }) => {
  const [sources, setSources] = useState<UnifiedSourceState[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'FAVORITES'>('ALL');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Ingest External M3U state
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [ingestMode, setIngestMode] = useState<'URL' | 'FILE' | 'TEXT'>('URL');
  const [m3uUrl, setM3uUrl] = useState('');
  const [m3uText, setM3uText] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [maxConnections, setMaxConnections] = useState(1);
  const [userAgent, setUserAgent] = useState('IPTVSmartersPro/3.1.5.1');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestFeedback, setIngestFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    details?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleRemoveSource = (sourceId: string) => {
    multiSourceOrchestrator.removeSource(sourceId);
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!sourceName) {
      setSourceName(file.name.replace(/\.[^/.]+$/, ''));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setM3uText(content);
      setIngestMode('TEXT');
    };
    reader.readAsText(file);
  };

  const handleIngestM3U = async () => {
    setIsIngesting(true);
    setIngestFeedback(null);

    try {
      const payload: any = {
        sourceName: sourceName.trim() || 'External M3U Source',
        userAgent,
      };

      if (ingestMode === 'URL') {
        if (!m3uUrl.trim()) {
          setIngestFeedback({ type: 'error', message: 'Please enter a valid M3U URL' });
          setIsIngesting(false);
          return;
        }
        payload.url = m3uUrl.trim();
      } else {
        if (!m3uText.trim()) {
          setIngestFeedback({ type: 'error', message: 'Please provide M3U playlist text or upload a file' });
          setIsIngesting(false);
          return;
        }
        payload.playlistText = m3uText;
      }

      const res = await fetch('/api/m3u/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setIngestFeedback({
          type: 'error',
          message: data.error || 'Failed to ingest M3U playlist',
          details: data.recommendation,
        });
        setIsIngesting(false);
        return;
      }

      // Successfully parsed on server! Now register into multiSourceOrchestrator
      const newSourceId = data.sourceId || `src_m3u_${Date.now()}`;
      const srcDisplayName = data.sourceName || sourceName.trim() || 'External M3U';

      multiSourceOrchestrator.addOrUpdateM3USource(
        newSourceId,
        srcDisplayName,
        data.totalChannels,
        maxConnections,
        m3uUrl
      );

      // Convert and ingest channels
      const channelItems: ChannelItem[] = (data.channels || []).map((ch: any, idx: number) => ({
        id: ch.id || `${newSourceId}_${idx + 1}`,
        number: ch.num || idx + 1,
        name: ch.name || `Channel ${idx + 1}`,
        streamUrl: ch.resolvedStreamUrl || ch.directSourceUrl,
        category: ch.categoryName || 'General',
        logoUrl: ch.streamIcon,
      }));

      multiSourceOrchestrator.ingestChannelsBatch(newSourceId, channelItems);
      refreshState();

      setIngestFeedback({
        type: 'success',
        message: `Successfully ingested ${data.totalChannels} channels across ${data.categoriesCount} categories into Matrix!`,
      });

      // Clear inputs after brief delay
      setTimeout(() => {
        setShowIngestModal(false);
        setM3uUrl('');
        setM3uText('');
        setSourceName('');
        setIngestFeedback(null);
      }, 1800);
    } catch (err: any) {
      setIngestFeedback({
        type: 'error',
        message: `Ingestion network error: ${err.message}`,
      });
    } finally {
      setIsIngesting(false);
    }
  };

  const loadSampleM3U = (sampleType: 'SPORTS' | 'NEWS') => {
    if (sampleType === 'SPORTS') {
      setSourceName('Global Live Sports Feed');
      setM3uText(`#EXTM3U url-tvg="http://epg.iptv-hub.net/sports.xml"
#EXTINF:-1 tvg-id="SkySportsPL.uk" tvg-name="Sky Sports PL" tvg-logo="https://raw.githubusercontent.com/iptv-org/logos/master/sky-sports-pl.png" group-title="Sports | UK", Sky Sports Premier League FHD
http://provider.panel-stream.net:8080/live/user/pass/201.m3u8
#EXTINF:-1 tvg-id="TNTSports1.uk" tvg-name="TNT Sports 1" tvg-logo="https://raw.githubusercontent.com/iptv-org/logos/master/tnt-sports.png" group-title="Sports | UK" catchup="default" catchup-days="3", TNT Sports 1 HD (50fps)
http://provider.panel-stream.net:8080/live/user/pass/202.m3u8
#EXTINF:-1 tvg-id="ESPN.us" tvg-name="ESPN HD" tvg-logo="https://raw.githubusercontent.com/iptv-org/logos/master/espn.png" group-title="Sports | USA", US: ESPN HD (60FPS)
http://provider.panel-stream.net:8080/live/user/pass/203.m3u8
#EXTINF:-1 tvg-id="BeIN1.fr" tvg-name="beIN Sports 1" group-title="Sports | International", beIN Sports 1 France HD
http://provider.panel-stream.net:8080/live/user/pass/204.ts`);
      setIngestMode('TEXT');
    } else {
      setSourceName('Global 24/7 News Network');
      setM3uText(`#EXTM3U
#EXTINF:-1 tvg-id="BBCNews.uk" tvg-name="BBC News" tvg-logo="https://raw.githubusercontent.com/iptv-org/logos/master/bbc-news.png" group-title="News | Global", BBC News 24/7 HD
http://provider.panel-stream.net:8080/live/user/pass/301.m3u8
#EXTINF:-1 tvg-id="CNN.us" tvg-name="CNN International" group-title="News | Global", CNN International Live
http://provider.panel-stream.net:8080/live/user/pass/302.m3u8
#EXTINF:-1 tvg-id="SkyNews.uk" tvg-name="Sky News UK" group-title="News | UK", Sky News HD Live
http://provider.panel-stream.net:8080/live/user/pass/303.m3u8`);
      setIngestMode('TEXT');
    }
  };

  const channels =
    activeTab === 'FAVORITES'
      ? multiSourceOrchestrator.getFavoriteChannels()
      : multiSourceOrchestrator.searchChannels(searchQuery);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
              Milestone 9 &amp; Ingestion Engine
            </span>
            <h2 className="text-xl font-bold text-slate-100">Unified Multi-Source Matrix &amp; External M3U Ingest</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Coexisting Xtream Codes, M3U/M3U8 Playlists, and Stalker/MAG Portals in a single consolidated matrix with independent concurrency and zero cross-leakage.
          </p>
        </div>

        <button
          id="btn-ingest-external-m3u"
          onClick={() => setShowIngestModal(!showIngestModal)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-950/50 transition-all shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          Ingest External M3U
        </button>
      </div>

      {/* Ingest External M3U Drawer/Card */}
      {showIngestModal && (
        <div className="bg-slate-900/90 border border-cyan-800/60 rounded-xl p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">Ingest Channels from External M3U Playlist</h3>
            </div>
            <button
              onClick={() => setShowIngestModal(false)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-800 rounded"
            >
              Close
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIngestMode('URL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
                ingestMode === 'URL'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Link className="w-3.5 h-3.5" /> Remote M3U URL
            </button>
            <button
              onClick={() => {
                setIngestMode('FILE');
                fileInputRef.current?.click();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
                ingestMode === 'FILE'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload File (.m3u / .m3u8)
            </button>
            <button
              onClick={() => setIngestMode('TEXT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition ${
                ingestMode === 'TEXT'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" /> Paste Raw M3U Content
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".m3u,.m3u8,.txt"
            className="hidden"
          />

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Source Name</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g. My External Provider"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Max Concurrency Limit</label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxConnections}
                onChange={(e) => setMaxConnections(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">HTTP User-Agent Spoofing</label>
              <select
                value={userAgent}
                onChange={(e) => setUserAgent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="IPTVSmartersPro/3.1.5.1">IPTV Smarters Pro 3.1.5 (Bypasses blocks)</option>
                <option value="VLC/3.0.18 LibVLC/3.0.18">VLC Media Player 3.0.18</option>
                <option value="TiviMate/4.7.0">TiviMate IPTV Player 4.7.0</option>
                <option value="Mozilla/5.0 Chrome/122.0">Standard Web Browser (Chrome)</option>
              </select>
            </div>
          </div>

          {ingestMode === 'URL' ? (
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">External M3U / M3U8 Playlist URL</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={m3uUrl}
                  onChange={(e) => setM3uUrl(e.target.value)}
                  placeholder="http://provider.panel.net:8080/get.php?username=...&password=...&type=m3u_plus"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-slate-400">M3U Content / Raw Text</label>
                <div className="flex gap-2 text-[10px]">
                  <button
                    onClick={() => loadSampleM3U('SPORTS')}
                    className="text-cyan-400 hover:underline"
                  >
                    + Load Sports Sample
                  </button>
                  <button
                    onClick={() => loadSampleM3U('NEWS')}
                    className="text-indigo-400 hover:underline"
                  >
                    + Load News Sample
                  </button>
                </div>
              </div>
              <textarea
                value={m3uText}
                onChange={(e) => setM3uText(e.target.value)}
                rows={5}
                placeholder={`#EXTM3U\n#EXTINF:-1 tvg-id="ESPN.us" group-title="Sports", ESPN HD\nhttp://provider.com/live/101.m3u8`}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Feedback message */}
          {ingestFeedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-start gap-2 ${
                ingestFeedback.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-800 text-rose-300'
              }`}
            >
              {ingestFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">{ingestFeedback.message}</div>
                {ingestFeedback.details && (
                  <div className="text-[11px] opacity-80 mt-0.5">{ingestFeedback.details}</div>
                )}
              </div>
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowIngestModal(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              id="btn-execute-ingest"
              onClick={handleIngestM3U}
              disabled={isIngesting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-xs font-bold transition shadow"
            >
              {isIngesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting &amp; Normalizing...
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" /> Ingest Channels
                </>
              )}
            </button>
          </div>
        </div>
      )}

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
                <h3 className="text-sm font-bold text-slate-100 truncate max-w-[140px]">{src.name}</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleSource(src.sourceId)}
                  className={`text-xs px-2.5 py-1 rounded font-semibold transition-colors ${
                    src.enabled
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {src.enabled ? 'Enabled' : 'Disabled'}
                </button>
                {src.sourceId.startsWith('src_m3u_') && src.sourceId !== 'src_m3u_backup' && (
                  <button
                    onClick={() => handleRemoveSource(src.sourceId)}
                    title="Remove Source"
                    className="p-1 rounded bg-rose-950/50 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
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
                <div className="flex items-center gap-3 min-w-0">
                  {ch.logoUrl ? (
                    <img
                      src={ch.logoUrl}
                      alt={ch.name}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded bg-slate-900 object-contain border border-slate-800 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="w-8 h-8 rounded bg-slate-900 border border-slate-800 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {ch.number}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-200 truncate">{ch.name}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 truncate">
                      <span className="text-cyan-400 font-mono">[{ch.sourceType}]</span>
                      <span className="truncate">{ch.category || 'General'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
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


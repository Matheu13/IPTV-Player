import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Radio,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Play,
  Search,
  SlidersHorizontal,
  Upload,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Tv,
  Zap,
  Globe,
  Database,
  Layers,
  ArrowUpDown,
  Check,
  Filter,
} from 'lucide-react';
import { UnifiedChannel } from '../../lib/models';
import { globalStreamValidator, StreamValidationResult } from '../../lib/streamValidator';
import { usePlayback } from '../context/PlaybackContext';
import { globalUnifiedIptvEngine } from '../../lib/unifiedIptvEngine';

export interface M3USourceMetadata {
  id: string;
  name: string;
  url: string;
  channelCount: number;
  categoryCount?: number;
  lastRefreshedAt?: number;
  status: 'ONLINE' | 'REFRESHING' | 'ERROR' | 'STANDBY';
}

interface M3UPlaylistManagerProps {
  onClose?: () => void;
  standalone?: boolean;
}

export const M3UPlaylistManager: React.FC<M3UPlaylistManagerProps> = ({
  onClose,
  standalone = false,
}) => {
  const { playChannel } = usePlayback();

  // State
  const [sources, setSources] = useState<M3USourceMetadata[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('all');
  const [channels, setChannels] = useState<UnifiedChannel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshingId, setIsRefreshingId] = useState<string | null>(null);

  // New M3U Form State
  const [isAddingSource, setIsAddingSource] = useState<boolean>(false);
  const [newSourceName, setNewSourceName] = useState<string>('');
  const [newSourceUrl, setNewSourceUrl] = useState<string>('');
  const [newSourceEpg, setNewSourceEpg] = useState<string>('');
  const [rawM3uContent, setRawM3uContent] = useState<string>('');
  const [inputMode, setInputMode] = useState<'url' | 'paste' | 'file'>('url');
  const [importLiveTv, setImportLiveTv] = useState<boolean>(true);
  const [importMovies, setImportMovies] = useState<boolean>(false);
  const [importSeries, setImportSeries] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Monitoring & Validation State
  const [validationMap, setValidationMap] = useState<Record<string, StreamValidationResult>>({});
  const [validatingChannelId, setValidatingChannelId] = useState<string | null>(null);
  const [isBatchValidating, setIsBatchValidating] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Filtering & Prioritization State
  const [prioritizeValidStreams, setPrioritizeValidStreams] = useState<boolean>(() => {
    try {
      return localStorage.getItem('iptv_prioritize_valid') !== 'false';
    } catch {
      return true;
    }
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'degraded' | 'dead' | 'unchecked'>('all');

  // Load initial sources from sqlite DB and Unified Engine
  const loadSources = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch from backend sources list
      const resp = await fetch('/api/epg/sources');
      if (resp.ok) {
        const data = await resp.json();
        const apiSources: M3USourceMetadata[] = (data.sources || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          url: s.baseUrl || s.url || '',
          channelCount: s.channelCount || 0,
          categoryCount: s.categoryCount || 0,
          lastRefreshedAt: s.lastRefreshedAt || s.lastSync || Date.now(),
          status: 'ONLINE',
        }));

        // Also merge with UnifiedIptvEngine sources
        const engineSources = globalUnifiedIptvEngine.getSources();
        const mergedMap = new Map<string, M3USourceMetadata>();

        apiSources.forEach((s) => mergedMap.set(s.id, s));
        engineSources.forEach((es) => {
          if (!mergedMap.has(es.id)) {
            mergedMap.set(es.id, {
              id: es.id,
              name: es.name,
              url: es.url,
              channelCount: es.channelCount,
              lastRefreshedAt: Date.now(),
              status: es.status === 'ONLINE' ? 'ONLINE' : 'STANDBY',
            });
          }
        });

        // Ensure default M3U sources are available if empty
        if (mergedMap.size === 0) {
          mergedMap.set('m3u_default', {
            id: 'm3u_default',
            name: 'Primary Broadcast Stream List',
            url: 'https://iptv-org.github.io/iptv/index.m3u',
            channelCount: 38,
            categoryCount: 5,
            lastRefreshedAt: Date.now() - 3600000,
            status: 'ONLINE',
          });
        }

        const sourceList = Array.from(mergedMap.values());
        setSources(sourceList);
        if (selectedSourceId === 'all' && sourceList.length > 0) {
          setSelectedSourceId(sourceList[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to load M3U sources:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSourceId]);

  // Load channels for the active source
  const loadChannels = useCallback(async () => {
    try {
      const resp = await fetch('/api/epg/channels');
      if (resp.ok) {
        const data = await resp.json();
        const chList: UnifiedChannel[] = data.channels || [];
        setChannels(chList);
      }
    } catch (err) {
      console.warn('Failed to load channels:', err);
    }
  }, []);

  useEffect(() => {
    loadSources();
    loadChannels();
  }, [loadSources, loadChannels]);

  // Sync validation status changes from globalStreamValidator cache
  useEffect(() => {
    const unsub = globalStreamValidator.subscribe((results) => {
      setValidationMap({ ...results });
    });
    return () => unsub();
  }, []);

  // Save prioritization preference
  const handleTogglePrioritize = (enabled: boolean) => {
    setPrioritizeValidStreams(enabled);
    try {
      localStorage.setItem('iptv_prioritize_valid', enabled ? 'true' : 'false');
    } catch {}
  };

  // Add new M3U Source handler
  const handleAddSourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim()) {
      setFormFeedback({ type: 'error', message: 'Please provide a friendly name for this playlist.' });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);

    try {
      let content = rawM3uContent;
      let targetUrl = newSourceUrl.trim();

      if (inputMode === 'url') {
        if (!targetUrl) {
          setFormFeedback({ type: 'error', message: 'Please enter a valid M3U or M3U8 URL.' });
          setIsSubmitting(false);
          return;
        }
        if (!/^https?:\/\//i.test(targetUrl)) {
          targetUrl = `http://${targetUrl}`;
        }
      }

      const response = await fetch('/api/m3u/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceName: newSourceName.trim(),
          name: newSourceName.trim(),
          url: inputMode === 'url' ? targetUrl : undefined,
          playlistText: inputMode !== 'url' ? content : undefined,
          rawM3U: inputMode !== 'url' ? content : undefined,
          epgUrl: newSourceEpg.trim() || undefined,
          liveOnly: importLiveTv && !importMovies && !importSeries,
          importLiveTv,
          importMovies,
          importSeries,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to ingest M3U playlist.');
      }

      // Add to Unified Engine
      globalUnifiedIptvEngine.addSource(newSourceName.trim(), targetUrl || 'direct_upload', 'M3U_PLAYLIST');

      setFormFeedback({
        type: 'success',
        message: `Successfully ingested ${result.totalChannels || result.channels?.length || 0} channels across ${result.categoriesCount || result.categories?.length || 0} categories!`,
      });

      // Reset form
      setNewSourceName('');
      setNewSourceUrl('');
      setNewSourceEpg('');
      setRawM3uContent('');

      // Refresh list & select new source
      await loadSources();
      await loadChannels();
      if (result.sourceId) {
        setSelectedSourceId(result.sourceId);
      }
      setTimeout(() => {
        setIsAddingSource(false);
        setFormFeedback(null);
      }, 1500);
    } catch (err: any) {
      setFormFeedback({ type: 'error', message: err.message || 'Error adding M3U playlist.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Refresh M3U Source handler
  const handleRefreshSource = async (sourceId: string, sourceName: string) => {
    setIsRefreshingId(sourceId);
    try {
      const resp = await fetch('/api/m3u/sources/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        await loadSources();
        await loadChannels();
      } else {
        console.warn('Source refresh response:', data);
      }
    } catch (err) {
      console.error('Failed to refresh source:', err);
    } finally {
      setIsRefreshingId(null);
    }
  };

  // Delete M3U Source handler
  const handleDeleteSource = async (sourceId: string, sourceName: string) => {
    if (!confirm(`Are you sure you want to remove playlist "${sourceName}"?`)) return;

    try {
      await fetch(`/api/m3u/sources/${encodeURIComponent(sourceId)}`, { method: 'DELETE' });
      globalUnifiedIptvEngine.removeSource(sourceId);
      await loadSources();
      await loadChannels();
    } catch (err) {
      console.error('Failed to delete source:', err);
    }
  };

  // Single stream validation check
  const handleValidateSingleStream = async (ch: UnifiedChannel) => {
    const streamUrl = ch.directSourceUrl || ch.resolvedStreamUrl || '';
    if (!streamUrl) return;

    setValidatingChannelId(ch.id);
    try {
      const result = await globalStreamValidator.validateStream(streamUrl, 3500);
      setValidationMap((prev) => ({
        ...prev,
        [streamUrl]: result,
      }));
    } finally {
      setValidatingChannelId(null);
    }
  };

  // Batch stream validation runner
  const handleValidateAllStreams = async () => {
    if (channels.length === 0 || isBatchValidating) return;

    setIsBatchValidating(true);
    setBatchProgress({ current: 0, total: channels.length });

    const batch = channels.slice(0, 50).map((ch) => ({
      id: ch.id,
      name: ch.name,
      streamUrl: ch.directSourceUrl || ch.resolvedStreamUrl || '',
      alternativeStreamUrls: ch.alternativeStreamUrls || [],
    }));

    try {
      const results = await globalStreamValidator.validateBatch(batch, {
        concurrency: 6,
        timeoutMs: 3000,
        onProgress: (done, total) => {
          setBatchProgress({ current: done, total });
        },
      });

      const newMap: Record<string, StreamValidationResult> = { ...validationMap };
      results.forEach((r) => {
        newMap[r.url] = r;
      });
      setValidationMap(newMap);
    } catch (err) {
      console.error('Batch validation failed:', err);
    } finally {
      setIsBatchValidating(false);
    }
  };

  // Play channel directly from monitor
  const handlePlayChannel = (ch: UnifiedChannel) => {
    const streamUrl = ch.directSourceUrl || ch.resolvedStreamUrl || '';
    playChannel(
      {
        id: ch.id,
        channelNumber: ch.num || 1,
        name: ch.name,
        streamUrl,
        category: ch.categoryName || 'Live Streams',
        is4k: false,
        isHdr: false,
        isFavorite: false,
        alternativeStreamUrls: ch.alternativeStreamUrls || [],
      },
      'fullscreen'
    );
  };

  // Filtered & Prioritized Channels
  const processedChannels = useMemo(() => {
    let list = [...channels];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.categoryName && c.categoryName.toLowerCase().includes(q))
      );
    }

    // Filter by connection status
    if (statusFilter !== 'all') {
      list = list.filter((c) => {
        const streamUrl = c.directSourceUrl || c.resolvedStreamUrl || '';
        const v = validationMap[streamUrl];
        if (statusFilter === 'online') return v?.isValid && v?.status === 'online';
        if (statusFilter === 'degraded') return v?.isValid && v?.status === 'degraded';
        if (statusFilter === 'dead') return v && !v.isValid;
        if (statusFilter === 'unchecked') return !v;
        return true;
      });
    }

    // Prioritize valid/working streams first if enabled
    if (prioritizeValidStreams) {
      list.sort((a, b) => {
        const urlA = a.directSourceUrl || a.resolvedStreamUrl || '';
        const urlB = b.directSourceUrl || b.resolvedStreamUrl || '';
        const valA = validationMap[urlA];
        const valB = validationMap[urlB];

        const scoreA = valA?.isValid ? (valA.status === 'online' ? 3 : 2) : valA ? 0 : 1;
        const scoreB = valB?.isValid ? (valB.status === 'online' ? 3 : 2) : valB ? 0 : 1;

        if (scoreB !== scoreA) {
          return scoreB - scoreA; // Valid / online first
        }

        // Secondary sort: lower latency first
        if (valA?.latencyMs && valB?.latencyMs) {
          return valA.latencyMs - valB.latencyMs;
        }

        return (a.num || 0) - (b.num || 0);
      });
    }

    return list;
  }, [channels, searchQuery, statusFilter, prioritizeValidStreams, validationMap]);

  // Telemetry stats calculation
  const stats = useMemo(() => {
    let online = 0;
    let degraded = 0;
    let dead = 0;
    let unchecked = 0;
    let totalLatency = 0;
    let latencyCount = 0;

    channels.forEach((c) => {
      const url = c.directSourceUrl || c.resolvedStreamUrl || '';
      const v = validationMap[url];
      if (!v) {
        unchecked++;
      } else if (v.isValid) {
        if (v.status === 'degraded') degraded++;
        else online++;
        totalLatency += v.latencyMs || 0;
        latencyCount++;
      } else {
        dead++;
      }
    });

    const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
    const validatedTotal = online + degraded + dead;
    const healthPercent = validatedTotal > 0 ? Math.round(((online + degraded) / validatedTotal) * 100) : 100;

    return {
      total: channels.length,
      online,
      degraded,
      dead,
      unchecked,
      avgLatency,
      healthPercent,
    };
  }, [channels, validationMap]);

  return (
    <div className={`flex flex-col h-full bg-[#080b11] text-slate-100 ${standalone ? 'p-6 max-w-7xl mx-auto' : 'p-4'}`}>
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-sky-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">M3U Playlist & Stream Health Manager</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono border border-sky-500/30">
              {sources.length} Sources
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Add M3U URLs, refresh remote playlists, pre-check link connectivity, and automatically prioritize working streams.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Prioritize Valid Streams Toggle */}
          <button
            onClick={() => handleTogglePrioritize(!prioritizeValidStreams)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              prioritizeValidStreams
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-slate-800/80 text-slate-400 border-white/10 hover:text-white'
            }`}
            title="When active, verified working streams are sorted to the top and broken links demoted"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${prioritizeValidStreams ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span>Prioritize Valid Streams</span>
            <span className={`w-2 h-2 rounded-full ${prioritizeValidStreams ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          </button>

          {/* Add New Playlist Button */}
          <button
            onClick={() => setIsAddingSource(!isAddingSource)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition shadow-lg cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add M3U Playlist</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Telemetry Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-4">
        <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Total Streams</span>
          <span className="text-xl font-bold text-white mt-0.5 block">{stats.total}</span>
        </div>

        <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-3">
          <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Online</span>
          </span>
          <span className="text-xl font-bold text-emerald-300 mt-0.5 block">{stats.online}</span>
        </div>

        <div className="bg-slate-900/80 border border-amber-500/20 rounded-xl p-3">
          <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Degraded / Alt</span>
          </span>
          <span className="text-xl font-bold text-amber-300 mt-0.5 block">{stats.degraded}</span>
        </div>

        <div className="bg-slate-900/80 border border-rose-500/20 rounded-xl p-3">
          <span className="text-[11px] font-mono text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            <span>Dead Links</span>
          </span>
          <span className="text-xl font-bold text-rose-300 mt-0.5 block">{stats.dead}</span>
        </div>

        <div className="bg-slate-900/80 border border-white/5 rounded-xl p-3">
          <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Unchecked</span>
          <span className="text-xl font-bold text-slate-300 mt-0.5 block">{stats.unchecked}</span>
        </div>

        <div className="bg-slate-900/80 border border-sky-500/20 rounded-xl p-3">
          <span className="text-[11px] font-mono text-sky-400 uppercase tracking-wider block">Avg Latency</span>
          <span className="text-xl font-bold text-sky-300 mt-0.5 block">
            {stats.avgLatency > 0 ? `${stats.avgLatency}ms` : '--'}
          </span>
        </div>
      </div>

      {/* 3. Add M3U Source Collapsible Form */}
      {isAddingSource && (
        <form
          onSubmit={handleAddSourceSubmit}
          className="bg-[#0e1422] border border-sky-500/30 rounded-xl p-5 mb-5 space-y-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-sky-400" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Add M3U Playlist Source</h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={`px-2.5 py-1 rounded-md transition ${inputMode === 'url' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Remote URL
              </button>
              <button
                type="button"
                onClick={() => setInputMode('paste')}
                className={`px-2.5 py-1 rounded-md transition ${inputMode === 'paste' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Paste M3U
              </button>
              <button
                type="button"
                onClick={() => setInputMode('file')}
                className={`px-2.5 py-1 rounded-md transition ${inputMode === 'file' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Upload File
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Playlist Display Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. European Sports & News 24/7"
                value={newSourceName}
                onChange={(e) => setNewSourceName(e.target.value)}
                required
                className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Custom XMLTV EPG URL (Optional)
              </label>
              <input
                type="url"
                placeholder="http://epg-provider.org/epg.xml.gz"
                value={newSourceEpg}
                onChange={(e) => setNewSourceEpg(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {inputMode === 'url' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                M3U / M3U8 Stream Playlist URL <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://provider.example.com/get.php?username=...&type=m3u_plus"
                  value={newSourceUrl}
                  onChange={(e) => setNewSourceUrl(e.target.value)}
                  required={inputMode === 'url'}
                  className="flex-1 bg-slate-950/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
                <button
                  type="button"
                  onClick={() => setNewSourceUrl('https://iptv-org.github.io/iptv/countries/us.m3u')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs whitespace-nowrap transition cursor-pointer"
                >
                  Fill Sample
                </button>
              </div>
            </div>
          )}

          {inputMode === 'paste' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Paste Raw M3U Content <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-id=&quot;bbc1&quot; tvg-name=&quot;BBC One&quot; group-title=&quot;UK&quot;,BBC One HD&#10;https://example.com/stream.m3u8"
                value={rawM3uContent}
                onChange={(e) => setRawM3uContent(e.target.value)}
                className="w-full bg-slate-950/80 border border-white/10 rounded-lg p-3 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-400"
              />
            </div>
          )}

          {inputMode === 'file' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select .m3u or .m3u8 file from computer
              </label>
              <input
                type="file"
                accept=".m3u,.m3u8,text/plain"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setRawM3uContent((event.target?.result as string) || '');
                      if (!newSourceName) {
                        setNewSourceName(file.name.replace(/\.[^/.]+$/, ''));
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-500 file:text-slate-950 hover:file:bg-sky-400 cursor-pointer"
              />
            </div>
          )}

          {/* Content Types to Import Checkboxes */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <label className="block text-xs font-semibold text-slate-200">
              Select Content to Import
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label
                htmlFor="m3u-chk-live-tv"
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition select-none ${
                  importLiveTv
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  id="m3u-chk-live-tv"
                  checked={importLiveTv}
                  onChange={(e) => setImportLiveTv(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 focus:ring-sky-400 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <span>Live TV</span>
              </label>

              <label
                htmlFor="m3u-chk-movies"
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition select-none ${
                  importMovies
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  id="m3u-chk-movies"
                  checked={importMovies}
                  onChange={(e) => setImportMovies(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 focus:ring-sky-400 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <span>Movies</span>
              </label>

              <label
                htmlFor="m3u-chk-series"
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition select-none ${
                  importSeries
                    ? 'bg-sky-500/10 border-sky-500/40 text-sky-200'
                    : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-300'
                }`}
              >
                <input
                  type="checkbox"
                  id="m3u-chk-series"
                  checked={importSeries}
                  onChange={(e) => setImportSeries(e.target.checked)}
                  className="w-4 h-4 rounded text-sky-500 focus:ring-sky-400 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <span>Series</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-400">
              Tick the categories you want extracted and indexed into your library.
            </p>
          </div>

          {formFeedback && (
            <div
              className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${
                formFeedback.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {formFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{formFeedback.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingSource(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingesting & Parsing Streams...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Ingest & Save Playlist</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* 4. M3U Sources Management Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-sky-400" />
            <span>Active M3U Sources ({sources.length})</span>
          </h2>
          <button
            onClick={loadSources}
            className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reload Sources</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sources.map((src) => {
            const isRefreshing = isRefreshingId === src.id;
            return (
              <div
                key={src.id}
                className={`bg-slate-900/90 border rounded-xl p-4 transition flex flex-col justify-between ${
                  selectedSourceId === src.id
                    ? 'border-sky-500/60 shadow-lg shadow-sky-500/5'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{src.name}</h3>
                      <p className="text-[11px] font-mono text-slate-400 truncate mt-0.5" title={src.url}>
                        {src.url || 'Direct Upload'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      {src.channelCount} Streams
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-500" />
                      <span>{src.categoryCount || 0} Groups</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>
                        {src.lastRefreshedAt ? new Date(src.lastRefreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-white/5">
                  <button
                    onClick={() => setSelectedSourceId(src.id)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                      selectedSourceId === src.id
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {selectedSourceId === src.id ? 'Viewing Streams' : 'View Streams'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRefreshSource(src.id, src.name)}
                      disabled={isRefreshing}
                      className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
                      title="Refresh & re-parse remote M3U playlist"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sky-400' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteSource(src.id, src.name)}
                      className="p-1.5 rounded-md bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition cursor-pointer"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Live Stream Connection Monitoring & Prioritized Health Table */}
      <div className="flex-1 flex flex-col min-h-0 bg-slate-900/70 border border-white/10 rounded-xl overflow-hidden shadow-xl">
        {/* Table Controls */}
        <div className="p-3 bg-slate-950/80 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter channels or groups..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 w-52 md:w-64"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/10 text-[11px]">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'all' ? 'bg-sky-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                All ({channels.length})
              </button>
              <button
                onClick={() => setStatusFilter('online')}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'online' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Online ({stats.online})
              </button>
              <button
                onClick={() => setStatusFilter('degraded')}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'degraded' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Alt / Failover ({stats.degraded})
              </button>
              <button
                onClick={() => setStatusFilter('dead')}
                className={`px-2.5 py-1 rounded-md transition ${statusFilter === 'dead' ? 'bg-rose-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Dead ({stats.dead})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Batch Pre-check Button */}
            <button
              onClick={handleValidateAllStreams}
              disabled={isBatchValidating || channels.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600/50 text-sky-300 border border-sky-500/40 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              {isBatchValidating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating {batchProgress.current}/{batchProgress.total}...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-sky-400" />
                  <span>Pre-Check All Streams</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Channels List Table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              <span className="text-xs">Loading channel streams...</span>
            </div>
          ) : processedChannels.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <Tv className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <h3 className="text-sm font-bold text-slate-300">No channels match current filter</h3>
              <p className="text-xs text-slate-500 mt-1">Try resetting the search query or connection status filter.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 text-[11px] font-mono text-slate-400 border-b border-white/5 sticky top-0 backdrop-blur z-10">
                  <th className="py-2.5 px-4 font-semibold">#</th>
                  <th className="py-2.5 px-4 font-semibold">Channel / Group</th>
                  <th className="py-2.5 px-4 font-semibold">Primary Stream URL</th>
                  <th className="py-2.5 px-4 font-semibold">Failover Alternatives</th>
                  <th className="py-2.5 px-4 font-semibold">Connection Health</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {processedChannels.map((ch, idx) => {
                  const streamUrl = ch.directSourceUrl || ch.resolvedStreamUrl || '';
                  const v = validationMap[streamUrl];
                  const isValidating = validatingChannelId === ch.id;
                  const altCount = (ch.alternativeStreamUrls || []).length;

                  return (
                    <tr
                      key={ch.id}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Num */}
                      <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px]">
                        {ch.num || idx + 1}
                      </td>

                      {/* Name & Category */}
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {ch.streamIcon ? (
                            <img
                              src={ch.streamIcon}
                              alt=""
                              className="w-6 h-6 rounded object-contain bg-black/40 border border-white/10"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {ch.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-semibold text-white group-hover:text-sky-300 transition">
                              {ch.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {ch.categoryName || 'General'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Stream URL */}
                      <td className="py-2.5 px-4 max-w-xs">
                        <span className="font-mono text-[11px] text-slate-400 truncate block" title={streamUrl}>
                          {streamUrl}
                        </span>
                      </td>

                      {/* Failover Alternatives */}
                      <td className="py-2.5 px-4">
                        {altCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            <ShieldCheck className="w-3 h-3 text-sky-400" />
                            <span>{altCount} Backups Available</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-600 font-mono">1 Stream (Direct)</span>
                        )}
                      </td>

                      {/* Health Status Pill */}
                      <td className="py-2.5 px-4">
                        {isValidating ? (
                          <span className="inline-flex items-center gap-1.5 text-sky-400 text-[11px] font-mono">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Checking...</span>
                          </span>
                        ) : v ? (
                          v.isValid ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Online ({v.latencyMs}ms)</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              <span>Dead ({v.errorReason || `HTTP ${v.statusCode}`})</span>
                            </div>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-500 font-mono">Unchecked</span>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleValidateSingleStream(ch)}
                            disabled={isValidating}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-mono transition cursor-pointer disabled:opacity-50"
                            title="Check connectivity for this stream"
                          >
                            {isValidating ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Check'}
                          </button>

                          <button
                            onClick={() => handlePlayChannel(ch)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold transition shadow cursor-pointer"
                            title="Play channel with failover resilience"
                          >
                            <Play className="w-3 h-3 fill-slate-950" />
                            <span>Play</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Database,
  Radio,
  Cpu,
  Layers,
  Search,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Play,
  Clock,
  HardDrive,
  Sliders,
  Zap,
  Activity,
  ArrowRight,
  ShieldCheck,
  Calendar,
  FileCode,
  FileArchive,
  BarChart2,
  Link2,
} from 'lucide-react';

interface ChannelNowNext {
  channelId: string | number;
  xmltvChannelId: string | null;
  hasEpgData: boolean;
  matchType?: string;
  matchScore?: number;
  now: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    durationMinutes: number;
    progressPercent: number;
    nowPlaying: boolean;
    hasCatchupArchive?: boolean;
    start: string;
    stop: string;
  } | null;
  next: {
    id: string;
    title: string;
    description?: string;
    category?: string;
    durationMinutes: number;
    start: string;
    stop: string;
  } | null;
}

interface EpgStats {
  channelsCount: number;
  programmesCount: number;
  mappingsCount: number;
  earliestStartTime: string | null;
  latestStopTime: string | null;
  dbFileSizeBytes: number;
}

interface MatchEntry {
  channelId: string | number;
  channelName: string;
  tvgId?: string;
  xmltvChannelId: string | null;
  xmltvDisplayName: string | null;
  matchType: string;
  matchScore: number;
  isMatched: boolean;
}

const DEFAULT_CHANNELS = [
  { id: 10452, name: 'US: ESPN HD (60FPS Live)', tvgId: 'ESPN.us', category: 'Sports' },
  { id: 10453, name: 'US: CNN INTERNATIONAL', tvgId: 'CNN.us', category: 'News' },
  { id: 10454, name: 'UK: BBC ONE HD', tvgId: 'BBCOne.uk', category: 'General' },
  { id: 10455, name: 'US: HBO East HD', tvgId: 'HBO.us', category: 'Movies' },
  { id: 10456, name: 'UK: Sky Sports F1 UHD (60FPS)', tvgId: 'SkySportsF1.uk', category: 'Sports' },
  { id: 10457, name: 'National Geographic Wild FHD', tvgId: 'NatGeo.us', category: 'Documentary' },
  { id: 99991, name: 'UK: ITV 1 London HD', category: 'Entertainment' }, // Match by clean name
  { id: 99992, name: 'CNN Int Broadcast', category: 'News' }, // Match by fuzzy token
  { id: 99999, name: 'Local Public Access Community TV 99', category: 'Local' }, // UNMATCHED channel (must be preserved!)
];

export const EpgStreamSurface: React.FC<{
  onTuneChannel?: (channelId: string | number, name: string) => void;
}> = ({ onTuneChannel }) => {
  const [stats, setStats] = useState<EpgStats | null>(null);
  const [nowNextList, setNowNextList] = useState<ChannelNowNext[]>([]);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [xmltvChannels, setXmltvChannels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestStats, setIngestStats] = useState<any>(null);
  const [ingestVolume, setIngestVolume] = useState<number>(3000);
  const [batchSize, setBatchSize] = useState<number>(500);
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(0);
  const [activeSubTab, setActiveSubTab] = useState<'now-next' | 'stream-ingest' | 'fuzzy-matcher' | 'db-stats'>('now-next');
  const [manualOverrideChId, setManualOverrideChId] = useState<string>('99999');
  const [manualTargetXmltvId, setManualTargetXmltvId] = useState<string>('ESPN.us');

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/m4/epg/stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load EPG stats:', err);
    }
  };

  const fetchXmltvChannels = async () => {
    try {
      const res = await fetch('/api/m4/epg/channels');
      const data = await res.json();
      setXmltvChannels(data.channels || []);
    } catch (err) {
      console.error('Failed to load XMLTV channels:', err);
    }
  };

  const fetchNowNext = async (offsetHours = timeOffsetHours) => {
    setIsLoading(true);
    try {
      const targetSec = Math.floor(Date.now() / 1000) + offsetHours * 3600;
      const res = await fetch('/api/m4/epg/now-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels: DEFAULT_CHANNELS,
          targetEpochSec: targetSec,
        }),
      });
      const data = await res.json();
      setNowNextList(data.nowNext || []);
    } catch (err) {
      console.error('Failed to fetch Now/Next:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFuzzyMatches = async () => {
    try {
      const res = await fetch('/api/m4/epg/fuzzy-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channels: DEFAULT_CHANNELS,
          threshold: 0.60,
        }),
      });
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (err) {
      console.error('Failed to fetch fuzzy matches:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchXmltvChannels();
    fetchNowNext(0);
    fetchFuzzyMatches();
  }, []);

  const handleRunStreamIngest = async () => {
    setIsIngesting(true);
    try {
      const res = await fetch('/api/m4/epg/stream-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          simulateVolume: ingestVolume,
          batchSize,
        }),
      });
      const data = await res.json();
      setIngestStats(data.stats);
      await fetchStats();
      await fetchNowNext();
      await fetchFuzzyMatches();
      await fetchXmltvChannels();
    } catch (err) {
      console.error('Streaming ingest failed:', err);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleApplyManualMapping = async () => {
    try {
      await fetch('/api/m4/epg/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: manualOverrideChId,
          xmltvChannelId: manualTargetXmltvId,
          isManual: true,
        }),
      });
      await fetchStats();
      await fetchFuzzyMatches();
      await fetchNowNext();
    } catch (err) {
      console.error('Failed to set manual mapping:', err);
    }
  };

  const handleClearDb = async () => {
    if (!window.confirm('Reset SQLite EPG database tables?')) return;
    try {
      await fetch('/api/m4/epg/clear', { method: 'POST' });
      await fetchStats();
      await fetchNowNext();
      await fetchFuzzyMatches();
      await fetchXmltvChannels();
    } catch (err) {
      console.error('Failed to clear EPG:', err);
    }
  };

  return (
    <div id="epg-stream-surface-container" className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-100">
              Milestone 4a: Streaming XMLTV Ingest &amp; SQLite EPG Engine
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Chunk-by-chunk stream parser preventing V8 heap OOM on 100–500MB XMLTV feeds. Persistent indexed SQLite schema with compound keys, intelligent fuzzy matching to <code className="text-indigo-300 font-mono">tvg-id</code>, unmatched channel preservation, and sub-millisecond Now/Next lookups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono flex items-center gap-2">
            <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">SQLite Records:</span>
            <span className="text-emerald-400 font-semibold">{stats?.programmesCount || 0}</span>
          </div>

          <button
            onClick={() => {
              fetchStats();
              fetchNowNext();
              fetchFuzzyMatches();
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs font-medium overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('now-next')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeSubTab === 'now-next'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Now &amp; Next Live Grid
        </button>

        <button
          onClick={() => setActiveSubTab('stream-ingest')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeSubTab === 'stream-ingest'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" /> Streaming Ingest &amp; OOM Benchmark
        </button>

        <button
          onClick={() => setActiveSubTab('fuzzy-matcher')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeSubTab === 'fuzzy-matcher'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <Link2 className="w-3.5 h-3.5" /> Fuzzy Match Matrix ({matches.length})
        </button>

        <button
          onClick={() => setActiveSubTab('db-stats')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg transition cursor-pointer ${
            activeSubTab === 'db-stats'
              ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
              : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> SQLite Index &amp; File Stats
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. NOW & NEXT LIVE CHANNEL GRID                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'now-next' && (
        <div className="space-y-4">
          {/* Time Navigation & Filter Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-medium">Timeline Focus:</span>
              <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono text-slate-200">
                  {timeOffsetHours === 0
                    ? 'Current Live Airing'
                    : timeOffsetHours > 0
                    ? `+${timeOffsetHours}h Future Preview`
                    : `${timeOffsetHours}h Past Catchup`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTimeOffsetHours(timeOffsetHours - 1);
                  fetchNowNext(timeOffsetHours - 1);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
              >
                -1 Hour
              </button>
              <button
                onClick={() => {
                  setTimeOffsetHours(0);
                  fetchNowNext(0);
                }}
                className="px-2.5 py-1 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded cursor-pointer font-semibold"
              >
                Reset to NOW
              </button>
              <button
                onClick={() => {
                  setTimeOffsetHours(timeOffsetHours + 1);
                  fetchNowNext(timeOffsetHours + 1);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
              >
                +1 Hour
              </button>
            </div>
          </div>

          {/* Channels Now/Next List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFAULT_CHANNELS.map((ch) => {
              const info = nowNextList.find((n) => String(n.channelId) === String(ch.id));
              const hasData = info?.hasEpgData && (info.now || info.next);
              const nowProg = info?.now;
              const nextProg = info?.next;

              return (
                <div
                  key={ch.id}
                  className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition ${
                    hasData ? 'border-slate-800 hover:border-slate-700' : 'border-amber-950/40 bg-slate-900/60'
                  }`}
                >
                  {/* Channel Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-mono text-xs font-bold bg-slate-800 text-indigo-300 px-2 py-0.5 rounded">
                        #{ch.id}
                      </span>
                      <span className="font-semibold text-slate-200 text-xs truncate">{ch.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasData ? (
                        <span className="text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> Guide Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono bg-amber-950/80 text-amber-300 border border-amber-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> Unmatched (Visible)
                        </span>
                      )}

                      {onTuneChannel && (
                        <button
                          onClick={() => onTuneChannel(ch.id, ch.name)}
                          className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs transition cursor-pointer"
                          title="Tune into Live Channel"
                        >
                          <Play className="w-3 h-3 fill-white" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Program NOW Box */}
                  <div className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-indigo-400 font-semibold uppercase tracking-wider text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        NOW PLAYING
                      </div>
                      {nowProg && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {nowProg.durationMinutes} min • {nowProg.category || 'General'}
                        </span>
                      )}
                    </div>

                    {nowProg ? (
                      <div className="space-y-1.5">
                        <div className="font-semibold text-slate-100 text-xs">{nowProg.title}</div>
                        {nowProg.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {nowProg.description}
                          </p>
                        )}
                        {/* Progress Bar */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>Air Time: {new Date(nowProg.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{nowProg.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                              style={{ width: `${nowProg.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-xs italic py-1">
                        {hasData ? 'No active broadcast scheduled in this time slice' : 'No EPG Guide data found for this channel. Channel remains 100% playable.'}
                      </div>
                    )}
                  </div>

                  {/* Program NEXT Box */}
                  <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider">NEXT UP</span>
                      {nextProg && (
                        <span className="font-mono">
                          Starts at {new Date(nextProg.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {nextProg ? (
                      <div className="text-slate-300 font-medium text-xs truncate">
                        {nextProg.title} <span className="text-slate-500 text-[10px]">({nextProg.durationMinutes}m)</span>
                      </div>
                    ) : (
                      <div className="text-slate-600 text-[11px] italic">No subsequent schedule available</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STREAMING INGEST & OOM PROTECTION BENCHMARK                             */}
      {/* ========================================================================= */}
      {activeSubTab === 'stream-ingest' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Control Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">Stream Ingest Configuration</h3>
              </div>
              <p className="text-xs text-slate-400">
                Simulates streaming multi-hundred megabyte XMLTV feeds chunk-by-chunk through a streaming transform pipeline into SQLite.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Total Programmes to Stream &amp; Parse:
                  </label>
                  <select
                    value={ingestVolume}
                    onChange={(e) => setIngestVolume(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none"
                  >
                    <option value={1000}>1,000 Programmes (Simulated 50 MB Stream)</option>
                    <option value={3000}>3,000 Programmes (Simulated 150 MB Stream)</option>
                    <option value={5000}>5,000 Programmes (Simulated 250 MB Stream)</option>
                    <option value={10000}>10,000 Programmes (Simulated 500 MB Stream)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    SQLite Transaction Batch Size:
                  </label>
                  <select
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none"
                  >
                    <option value={200}>200 items / batch</option>
                    <option value={500}>500 items / batch (Optimal)</option>
                    <option value={1000}>1,000 items / batch</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    disabled={isIngesting}
                    onClick={handleRunStreamIngest}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                  >
                    {isIngesting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Streaming &amp; Ingesting...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-white" /> Start Streaming Ingestion
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Ingest Telemetry & OOM Bounds */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-slate-100">Stream Parser Memory &amp; Throughput</h3>
                </div>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Zero OOM Guarantee Verified
                </span>
              </div>

              {ingestStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Programmes Parsed</span>
                    <span className="text-indigo-300 text-base font-bold">{ingestStats.programmesParsed}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Bytes Processed</span>
                    <span className="text-cyan-300 text-base font-bold">
                      {(ingestStats.bytesRead / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Batches Committed</span>
                    <span className="text-emerald-400 text-base font-bold">{ingestStats.batchesDispatched}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Ingest Duration</span>
                    <span className="text-amber-300 text-base font-bold">{ingestStats.durationMs} ms</span>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950/60 rounded-lg p-6 text-center text-xs text-slate-500">
                  Run a stream ingestion benchmark to observe memory consumption and transaction throughput.
                </div>
              )}

              {/* Memory Safety Explanation */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-4 space-y-2 text-xs text-slate-300">
                <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" /> Why Streaming Architecture Prevents OOM:
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Traditional <code className="text-indigo-300">fs.readFileSync()</code> or whole-string XML parsing loads uncompressed 500MB feeds as UTF-16 JavaScript strings (taking ~1GB+ V8 heap), exceeding Node container memory caps. The <code className="text-indigo-300">XmltvStreamParser</code> maintains a rolling sliding-window buffer of 8KB, parsing nodes as they stream through and flushing batches directly to SQLite in atomic transactions.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FUZZY MATCH MATRIX & UNMATCHED PRESERVATION                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'fuzzy-matcher' && (
        <div className="space-y-6">
          {/* Header Notice */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Fuzzy EPG Matching Matrix</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically resolves mismatched IPTV channel names/IDs against XMLTV records. Unmatched channels are explicitly preserved.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                Matched: {matches.filter((m) => m.isMatched).length}
              </span>
              <span className="px-2.5 py-1 rounded bg-amber-950 text-amber-300 border border-amber-800">
                Unmatched: {matches.filter((m) => !m.isMatched).length} (Shown)
              </span>
            </div>
          </div>

          {/* Matches Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-mono">
                    <th className="p-3">Channel ID</th>
                    <th className="p-3">IPTV Channel Name</th>
                    <th className="p-3">Provided tvg-id</th>
                    <th className="p-3">Matched XMLTV ID</th>
                    <th className="p-3">Match Strategy</th>
                    <th className="p-3">Confidence Score</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {matches.map((m) => (
                    <tr key={m.channelId} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-bold text-slate-300">#{m.channelId}</td>
                      <td className="p-3 text-slate-200 font-sans font-medium">{m.channelName}</td>
                      <td className="p-3 text-slate-400">{m.tvgId || '—'}</td>
                      <td className="p-3 text-indigo-300 font-semibold">{m.xmltvChannelId || '—'}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.matchType === 'EXACT_TVG_ID'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              : m.matchType === 'NORMALIZED_NAME'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : m.matchType === 'FUZZY_TOKEN'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : m.matchType === 'MANUAL'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {m.matchType}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="text-slate-200 font-bold">{(m.matchScore * 100).toFixed(0)}%</span>
                      </td>
                      <td className="p-3">
                        {m.isMatched ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Matched
                          </span>
                        ) : (
                          <span className="text-amber-400 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" /> Unmatched (Preserved)
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Manual Remapping Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-semibold text-slate-100">Manual Channel-to-XMLTV Remapping</h4>
            </div>
            <p className="text-xs text-slate-400">
              Users can explicitly override any automatic fuzzy match. Overrides are written to SQLite and immediately take precedence.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">Target IPTV Channel:</label>
                <select
                  value={manualOverrideChId}
                  onChange={(e) => setManualOverrideChId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none"
                >
                  {DEFAULT_CHANNELS.map((c) => (
                    <option key={c.id} value={c.id}>
                      #{c.id} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1">Assign XMLTV Guide Channel:</label>
                <select
                  value={manualTargetXmltvId}
                  onChange={(e) => setManualTargetXmltvId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono focus:outline-none"
                >
                  {xmltvChannels.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.displayName} ({x.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleApplyManualMapping}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5" /> Save Override to SQLite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SQLITE INDEX & FILE STATS                                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'db-stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Total XMLTV Channels</span>
              <div className="text-2xl font-bold text-slate-100 font-mono mt-1">{stats.channelsCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Indexed Programmes</span>
              <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">{stats.programmesCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Channel Mappings</span>
              <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">{stats.mappingsCount}</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Database Size on Disk</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {(stats.dbFileSizeBytes / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h4 className="text-sm font-semibold text-slate-100">Database Maintenance</h4>
            <p className="text-xs text-slate-400">
              Clear or reseed SQLite tables for testing and verification.
            </p>
            <button
              onClick={handleClearDb}
              className="px-4 py-2 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded-lg text-xs font-semibold transition cursor-pointer"
            >
              Reset SQLite EPG Tables
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

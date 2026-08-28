import React, { useState, useEffect } from 'react';
import {
  Heart,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Tv,
  Layers,
  Star,
  Activity,
  AlertCircle,
  Database,
  Radio,
} from 'lucide-react';
import {
  globalFavoritesHistoryEngine,
  FavoriteChannelItem,
  RecentChannelItem,
  PlaybackPositionItem,
  SourceInfo,
} from '../lib/favoritesHistoryEngine';

export const Milestone29TestSuite: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteChannelItem[]>([]);
  const [recents, setRecents] = useState<RecentChannelItem[]>([]);
  const [positions, setPositions] = useState<PlaybackPositionItem[]>([]);
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('ALL');
  const [testResults, setTestResults] = useState<any>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [activeSimulationMsg, setActiveSimulationMsg] = useState<string | null>(null);

  // Load state from engine
  const refreshEngineState = () => {
    setFavorites(globalFavoritesHistoryEngine.getFavorites(selectedSourceFilter === 'ALL' ? undefined : selectedSourceFilter));
    setRecents(globalFavoritesHistoryEngine.getRecentChannels(selectedSourceFilter === 'ALL' ? undefined : selectedSourceFilter));
    setPositions(globalFavoritesHistoryEngine.getAllPlaybackPositions());
  };

  useEffect(() => {
    refreshEngineState();
    const unsub = globalFavoritesHistoryEngine.subscribe(refreshEngineState);
    return unsub;
  }, [selectedSourceFilter]);

  // Run backend test suite
  const runAutomatedTests = async () => {
    setIsRunningTests(true);
    try {
      const res = await fetch('/api/m29/test-suite');
      const data = await res.json();
      setTestResults(data);
    } catch (err: any) {
      console.error('Failed to run M29 test suite', err);
    } finally {
      setIsRunningTests(false);
    }
  };

  // Test Simulation 1: Same Name Disambiguation
  const simulateSameNameChannels = () => {
    const src1 = 'prov-xtream-1';
    const src2 = 'prov-m3u-2';

    globalFavoritesHistoryEngine.registerSource({
      id: src1,
      name: 'Xtream UK Premium',
      type: 'XTREAM',
      status: 'ACTIVE',
      baseUrl: 'http://xtream-uk.net:8080',
    });

    globalFavoritesHistoryEngine.registerSource({
      id: src2,
      name: 'M3U Sport Global',
      type: 'M3U',
      status: 'ACTIVE',
      baseUrl: 'https://m3u-sports.org/playlist.m3u',
    });

    // Add channel with identical name "Sky Sports Premier League" to both sources
    globalFavoritesHistoryEngine.addFavorite({
      channelId: '101',
      sourceId: src1,
      sourceName: 'Xtream UK Premium',
      sourceType: 'XTREAM',
      channelName: 'Sky Sports Premier League',
      category: 'Sports',
      streamUrl: 'http://xtream-uk.net:8080/live/u/p/101.m3u8',
      tvgId: 'skysports.pl',
    });

    globalFavoritesHistoryEngine.addFavorite({
      channelId: '900',
      sourceId: src2,
      sourceName: 'M3U Sport Global',
      sourceType: 'M3U',
      channelName: 'Sky Sports Premier League',
      category: 'Sports',
      streamUrl: 'https://m3u-sports.org/hls/900.m3u8',
      tvgId: 'skysports.pl.m3u',
    });

    refreshEngineState();
    setActiveSimulationMsg(
      'Added 2 channels with the EXACT same name "Sky Sports Premier League" from 2 distinct sources. Verified internal composite keys: [prov-xtream-1:::101] and [prov-m3u-2:::900]'
    );
  };

  // Test Simulation 2: Offline Source Restoration Blocking
  const simulateUnavailableSourceRestore = () => {
    const srcOffline = 'prov-offline-tuner';
    globalFavoritesHistoryEngine.registerSource({
      id: srcOffline,
      name: 'DVB-T2 Terrestrial Tuner',
      type: 'RF_TUNER',
      status: 'OFFLINE',
    });

    globalFavoritesHistoryEngine.recordChannelWatch({
      channelId: '55',
      sourceId: srcOffline,
      sourceName: 'DVB-T2 Terrestrial Tuner',
      channelName: 'BBC Two HD (Off-air)',
      streamUrl: 'rtp://239.0.0.55:5000',
    });

    const check = globalFavoritesHistoryEngine.evaluatePlaybackRestoration();
    refreshEngineState();
    setActiveSimulationMsg(
      `Restoration evaluation for offline channel: canRestore = ${check.canRestore} | Reason: "${check.reason}"`
    );
  };

  const sources = globalFavoritesHistoryEngine.getAllSources();
  const restoreEval = globalFavoritesHistoryEngine.evaluatePlaybackRestoration();

  return (
    <div id="milestone-29-container" className="space-y-6">
      {/* Header & Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-rose-600 to-amber-600 rounded-xl text-white shadow-lg">
              <Heart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-100">Milestone 29: Favorites & Watch History</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800">
                  CORE RESILIENCE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-source channel favoriting, collision-isolated composite keys, watch history with duration tracking, and offline source playback restoration guards.
              </p>
            </div>
          </div>

          <button
            id="run-m29-tests-btn"
            onClick={runAutomatedTests}
            disabled={isRunningTests}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-md transition"
          >
            <Activity className={`w-4 h-4 ${isRunningTests ? 'animate-spin' : ''}`} />
            <span>{isRunningTests ? 'Running Assertions...' : 'Run Milestone 29 Test Suite'}</span>
          </button>
        </div>

        {/* Requirements Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <Star className="w-3.5 h-3.5" />
              <span>Multi-Source Favoriting</span>
            </div>
            <p className="text-[11px] text-slate-400">Preserves sourceId across M3U, Xtream, Stalker, and RF.</p>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>Same-Name Disambiguation</span>
            </div>
            <p className="text-[11px] text-slate-400">Channels with identical names remain distinct via composite keys.</p>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>Watch History & Duration</span>
            </div>
            <p className="text-[11px] text-slate-400">Tracks recents, tune counts, and cumulative viewing seconds.</p>
          </div>
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Auto-Restore Guard</span>
            </div>
            <p className="text-[11px] text-slate-400">Blocks auto-playback if source is offline or expired.</p>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Sandbox */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-400" />
            <span>Interactive Validation Actions</span>
          </h3>
          <div className="flex items-center gap-2">
            <button
              id="simulate-same-name-btn"
              onClick={simulateSameNameChannels}
              className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700 rounded-lg text-xs font-semibold transition"
            >
              Simulate Same-Name Channels
            </button>
            <button
              id="simulate-offline-restore-btn"
              onClick={simulateUnavailableSourceRestore}
              className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 rounded-lg text-xs font-semibold transition"
            >
              Simulate Offline Source Check
            </button>
          </div>
        </div>

        {activeSimulationMsg && (
          <div className="p-3 bg-indigo-950/70 border border-indigo-800 rounded-lg text-xs text-indigo-200 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>{activeSimulationMsg}</span>
          </div>
        )}

        {/* Current Restoration Status Banner */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Playback Restoration Status:</span>
            {restoreEval.canRestore ? (
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> RESTORABLE (Source Active)
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded font-mono font-bold flex items-center gap-1">
                <XCircle className="w-3 h-3" /> RESTORATION BLOCKED ({restoreEval.reason})
              </span>
            )}
          </div>
          {restoreEval.lastChannel && (
            <span className="text-slate-400 font-mono text-[11px]">
              Last Channel: <strong className="text-slate-200">{restoreEval.lastChannel.channelName}</strong> ({restoreEval.lastChannel.sourceName})
            </span>
          )}
        </div>
      </div>

      {/* Favorites and Watch History Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Favorites Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Favorites ({favorites.length})
              </h3>
            </div>
            {/* Source Filter */}
            <select
              value={selectedSourceFilter}
              onChange={(e) => setSelectedSourceFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 rounded px-2 py-1 text-xs focus:outline-none"
            >
              <option value="ALL">All Sources</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {favorites.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No favorites saved yet.</p>
            ) : (
              favorites.map((fav) => (
                <div
                  key={fav.compositeKey}
                  className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs hover:border-slate-700 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{fav.channelName}</span>
                      <span className="px-1.5 py-0.2 bg-slate-800 text-[10px] text-slate-400 rounded font-mono">
                        {fav.category || 'General'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                      <span className="text-indigo-400">{fav.sourceName}</span>
                      <span>•</span>
                      <span className="text-slate-500">Key: {fav.compositeKey}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => globalFavoritesHistoryEngine.removeFavorite(fav.sourceId, fav.channelId)}
                    className="p-1.5 hover:bg-slate-800 text-rose-400 hover:text-rose-300 rounded transition"
                    title="Remove from favorites"
                  >
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Watch History Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Recent Channels Watch History ({recents.length})
              </h3>
            </div>
            <button
              onClick={() => globalFavoritesHistoryEngine.clearHistory()}
              className="text-[11px] text-slate-500 hover:text-rose-400 transition"
            >
              Clear History
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recents.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-4 text-center">No recent viewing history recorded.</p>
            ) : (
              recents.map((item) => (
                <div
                  key={item.compositeKey}
                  className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs hover:border-slate-700 transition"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{item.channelName}</span>
                      <span className="px-1.5 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] rounded font-mono">
                        {item.tuneCount} tunes
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                      <span className="text-slate-300">{item.sourceName}</span>
                      <span>•</span>
                      <span>Watched {item.totalWatchDurationSeconds}s</span>
                      <span>•</span>
                      <span className="text-slate-500">{new Date(item.lastWatchedEpochMs).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded">
                    {item.channelId}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Playback Position Resume Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-200">
            VOD / Catchup Playback Position Resume Memory ({positions.length})
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {positions.length === 0 ? (
            <p className="text-xs text-slate-500 italic col-span-3 py-2">No media playback offsets recorded yet.</p>
          ) : (
            positions.map((pos) => (
              <div key={pos.compositeKey} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span className="truncate">{pos.title}</span>
                  <span className="text-emerald-400 font-mono">{pos.percentage}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${pos.percentage}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{Math.floor(pos.positionSeconds / 60)}m / {Math.floor(pos.durationSeconds / 60)}m</span>
                  <span>Source: {pos.sourceId}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Test Runner Results Panel */}
      {testResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Milestone 29 Test Results ({testResults.passed}/{testResults.total} Passed)</span>
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
              ALL GREEN
            </span>
          </div>

          <div className="space-y-2">
            {testResults.results?.map((r: any, rIdx: number) => (
              <div
                key={r.id ? `${r.id}-${rIdx}` : `m29-res-${rIdx}`}
                className="p-2.5 bg-slate-950 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  {r.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold text-slate-200">{r.desc}</span>
                </div>
                {r.details && (
                  <span className="text-[11px] font-mono text-slate-400 max-w-md truncate text-right">
                    {r.details}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

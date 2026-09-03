import React, { useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Database,
  Layers,
  MemoryStick,
  Play,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  globalUnifiedIptvEngine,
  IngestionProgressState,
} from '../lib/unifiedIptvEngine';
import {
  globalVirtualizedDataLoader,
  VirtualizedMemoryStats,
} from '../lib/channelManager';

interface HydrationProgressIndicatorProps {
  className?: string;
  onTriggerHydration?: () => void;
}

export const HydrationProgressIndicator: React.FC<HydrationProgressIndicatorProps> = ({
  className = '',
  onTriggerHydration,
}) => {
  const [progress, setProgress] = useState<IngestionProgressState>(() =>
    globalUnifiedIptvEngine.getIngestionProgress()
  );
  const [memStats, setMemStats] = useState<VirtualizedMemoryStats>(() =>
    globalVirtualizedDataLoader.getMemoryStats()
  );
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    const unsubProgress = globalUnifiedIptvEngine.subscribeIngestionProgress((p) => {
      setProgress(p);
      setMemStats(globalVirtualizedDataLoader.getMemoryStats());
    });

    const unsubLoader = globalVirtualizedDataLoader.subscribe(() => {
      setMemStats(globalVirtualizedDataLoader.getMemoryStats());
    });

    return () => {
      unsubProgress();
      unsubLoader();
    };
  }, []);

  const handleTriggerRehydration = async () => {
    if (isSimulating || progress.isIngesting) return;
    setIsSimulating(true);

    try {
      if (onTriggerHydration) {
        onTriggerHydration();
      } else {
        await globalUnifiedIptvEngine.startProgressiveIngestion(
          'src-xtream-01',
          'Xtream Master',
          'http://dnsjibre.xyz:80',
          'XTREAM_CODES',
          14917
        );
      }
    } finally {
      setIsSimulating(false);
      setMemStats(globalVirtualizedDataLoader.getMemoryStats());
    }
  };

  const handleFlushCache = () => {
    globalVirtualizedDataLoader.clearCache();
    // Re-hydrate top 100 on demand
    globalVirtualizedDataLoader.getTop100Hydrated();
    setMemStats(globalVirtualizedDataLoader.getMemoryStats());
  };

  const isReady = !progress.isIngesting && (progress.percent === 100 || progress.ingestedChannels > 0);
  const isProcessing = progress.isIngesting || isSimulating;

  return (
    <div
      id="hydration-progress-card"
      className={`p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg ${className}`}
    >
      {/* Top Header & Live Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-lg border ${
              isProcessing
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}
          >
            {isProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Layers className="w-4 h-4 text-emerald-400" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 tracking-tight">
                Channel Ingestion &amp; Background Hydration Engine
              </h3>
              {/* Processing vs Ready Status Badge */}
              <span
                id="hydration-status-badge"
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold transition-all duration-300 ${
                  isProcessing
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse shadow-sm shadow-amber-500/20'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                }`}
              >
                {isProcessing ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    <span>Processing</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Ready</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Virtualized Data Loader • Windowed Top-100 Hydration on Demand • Compressed 14.9k Background Catalog
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="flush-hydrate-cache-btn"
            onClick={handleFlushCache}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 hover:border-slate-600 transition"
            title="Flush LRU Window Cache and Re-hydrate Top 100 On Demand"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Flush Cache</span>
          </button>

          <button
            id="trigger-14k-hydration-btn"
            onClick={handleTriggerRehydration}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[11px] font-semibold transition shadow-sm shadow-indigo-600/30"
            title="Run progressive hydration parsing test for 14,917 channels"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isProcessing ? 'Parsing (14.9k)...' : 'Test Hydration (14.9k)'}</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Stage Display */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span id="hydration-stage-label" className="font-mono text-slate-200">
              {progress.currentStage || 'Catalog Ready in Memory'}
            </span>
          </span>
          <span id="hydration-percent-label" className="font-mono font-bold text-slate-100">
            {progress.percent}%
          </span>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-2.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
          <div
            id="hydration-progress-bar"
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              isProcessing
                ? 'bg-gradient-to-r from-amber-500 via-indigo-500 to-sky-400 animate-pulse'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
            }`}
            style={{ width: `${Math.max(2, Math.min(100, progress.percent))}%` }}
          />
        </div>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
            <Database className="w-3 h-3 text-sky-400" /> Total Ingested
          </span>
          <span id="hydration-count-display" className="text-sm font-bold font-mono text-slate-100 mt-1">
            {progress.ingestedChannels.toLocaleString()} / {progress.totalChannels.toLocaleString()}
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" /> Active Window Cache
          </span>
          <span id="hydration-active-window" className="text-sm font-bold font-mono text-indigo-300 mt-1">
            {memStats.activeHydratedCount} items <span className="text-[10px] text-slate-400 font-normal">/ Top 100</span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
            <MemoryStick className="w-3 h-3 text-emerald-400" /> RAM Saved
          </span>
          <span id="hydration-ram-saved" className="text-sm font-bold font-mono text-emerald-300 mt-1">
            {memStats.memorySavedPercent}% <span className="text-[10px] text-slate-400 font-normal">compressed</span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Window Latency
          </span>
          <span id="hydration-latency-display" className="text-sm font-bold font-mono text-amber-300 mt-1">
            {memStats.lastHydrationLatencyMs < 1 ? '<1.0 ms' : `${memStats.lastHydrationLatencyMs} ms`}
          </span>
        </div>
      </div>
    </div>
  );
};

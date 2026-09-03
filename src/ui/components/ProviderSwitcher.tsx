import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  ChevronDown,
  Check,
  Server,
  Radio,
  Wifi,
  Plus,
  Settings,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { IptvSource, globalUnifiedIptvEngine } from '../../lib/unifiedIptvEngine';

interface ProviderSwitcherProps {
  variant?: 'pill' | 'compact' | 'full' | 'tabs';
  className?: string;
  onOpenSourceManager?: () => void;
  onProviderSwitched?: (sourceId: string, sourceName: string) => void;
}

export const ProviderSwitcher: React.FC<ProviderSwitcherProps> = ({
  variant = 'pill',
  className = '',
  onOpenSourceManager,
  onProviderSwitched,
}) => {
  const [sources, setSources] = useState<IptvSource[]>(globalUnifiedIptvEngine.getSources());
  const [activeSourceId, setActiveSourceId] = useState<string>(
    globalUnifiedIptvEngine.getState().activeSourceId
  );
  const [isOpen, setIsOpen] = useState(false);
  const [switchFeedback, setSwitchFeedback] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Sync state from unified IPTV engine
  useEffect(() => {
    const handleEngineUpdate = () => {
      const state = globalUnifiedIptvEngine.getState();
      setSources(state.sources);
      setActiveSourceId(state.activeSourceId);
    };

    handleEngineUpdate();
    const unsub = globalUnifiedIptvEngine.subscribe(handleEngineUpdate);
    return () => unsub();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activeSource = sources.find((s) => s.id === activeSourceId);
  const activeLabel =
    activeSourceId === 'ALL' || activeSourceId === 'all'
      ? 'All Providers (Unified)'
      : activeSource?.name || 'Selected Provider';

  const handleSelectProvider = (sourceId: string, sourceName: string) => {
    globalUnifiedIptvEngine.setActiveSource(sourceId);
    setActiveSourceId(sourceId);
    setIsOpen(false);

    setSwitchFeedback(`Switched to ${sourceName}`);
    setTimeout(() => setSwitchFeedback(null), 2500);

    if (onProviderSwitched) {
      onProviderSwitched(sourceId, sourceName);
    }
  };

  const getTypeIcon = (type: IptvSource['type']) => {
    switch (type) {
      case 'XTREAM_CODES':
        return <Server className="w-3.5 h-3.5 text-emerald-400" />;
      case 'M3U_PLAYLIST':
        return <Layers className="w-3.5 h-3.5 text-sky-400" />;
      case 'STALKER_PORTAL':
        return <Wifi className="w-3.5 h-3.5 text-purple-400" />;
      case 'HDHOMERUN_RF':
        return <Radio className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Horizontal Tabs Variant (for top bars / screen headers)
  if (variant === 'tabs') {
    return (
      <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}>
        <button
          onClick={() => handleSelectProvider('ALL', 'All Providers')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeSourceId === 'ALL' || activeSourceId === 'all'
              ? 'bg-sky-500 text-white shadow-sm shadow-sky-950 font-bold'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All Sources</span>
        </button>

        {sources.map((src) => {
          const isSelected = activeSourceId === src.id;
          return (
            <button
              key={src.id}
              onClick={() => handleSelectProvider(src.id, src.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border-white/5'
              }`}
            >
              {getTypeIcon(src.type)}
              <span className="truncate max-w-[140px]">{src.name}</span>
              <span className="text-[10px] font-mono opacity-60">({src.channelCount})</span>
            </button>
          );
        })}

        {onOpenSourceManager && (
          <button
            onClick={onOpenSourceManager}
            className="px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-sky-300 hover:bg-slate-800/80 border border-dashed border-white/10 transition-colors flex items-center gap-1"
            title="Manage or Add IPTV Providers"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="text-[11px]">Manage</span>
          </button>
        )}
      </div>
    );
  }

  // Pill / Dropdown Variant
  return (
    <div ref={menuRef} className={`relative inline-block ${className}`}>
      {/* Switcher Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#0f1523] hover:bg-[#151c2e] border border-white/10 hover:border-sky-500/40 rounded-xl text-xs text-slate-200 transition-all shadow-md group cursor-pointer"
        title="Switch active IPTV provider"
      >
        <div className="flex items-center gap-1.5">
          {activeSource ? (
            getTypeIcon(activeSource.type)
          ) : (
            <Layers className="w-3.5 h-3.5 text-sky-400" />
          )}
          <div className="flex flex-col text-left">
            <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 leading-tight">
              Provider
            </span>
            <span className="font-semibold text-white truncate max-w-[150px] leading-tight">
              {activeLabel}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-400' : ''
          }`}
        />
      </button>

      {/* Switch Feedback Toast */}
      {switchFeedback && (
        <div className="absolute top-full left-0 mt-2 z-50 px-3 py-1.5 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold shadow-xl flex items-center gap-1.5 whitespace-nowrap animate-in fade-in slide-in-from-top-1">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span>{switchFeedback}</span>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 sm:left-0 top-full mt-2 w-72 bg-[#0c111c] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          {/* Menu Header */}
          <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Switch IPTV Provider
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
              {sources.length} Available
            </span>
          </div>

          {/* Sources List */}
          <div className="p-2 space-y-1 max-h-72 overflow-y-auto scrollbar-thin">
            {/* All Providers Option */}
            <button
              onClick={() => handleSelectProvider('ALL', 'All Providers (Unified Matrix)')}
              className={`w-full px-3 py-2.5 rounded-xl text-xs text-left transition-all flex items-center justify-between ${
                activeSourceId === 'ALL' || activeSourceId === 'all'
                  ? 'bg-sky-500/20 text-sky-200 font-bold border border-sky-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold">All Providers (Unified Matrix)</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Aggregated streams across all configured sources
                  </div>
                </div>
              </div>
              {(activeSourceId === 'ALL' || activeSourceId === 'all') && (
                <Check className="w-4 h-4 text-sky-400 shrink-0" />
              )}
            </button>

            <div className="my-1 border-t border-white/5" />

            {/* Individual Configured Sources */}
            {sources.map((src) => {
              const isSelected = activeSourceId === src.id;
              return (
                <button
                  key={src.id}
                  onClick={() => handleSelectProvider(src.id, src.name)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs text-left transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-200 font-bold border border-sky-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                      {getTypeIcon(src.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{src.name}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                        <span>{src.type}</span>
                        <span>•</span>
                        <span>{src.channelCount.toLocaleString()} ch</span>
                        {src.latencyMs && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-400">{src.latencyMs}ms</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-sky-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Actions */}
          {onOpenSourceManager && (
            <div className="p-2 bg-slate-950/90 border-t border-white/5 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenSourceManager();
                }}
                className="w-full py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 border border-white/5"
              >
                <Plus className="w-3.5 h-3.5 text-sky-400" />
                <span>Add / Manage Sources</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

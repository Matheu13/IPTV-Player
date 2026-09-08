import React, { useState, useEffect } from 'react';
import {
  Tv,
  Search,
  Settings,
  Wifi,
  Clock,
  User,
  X,
  Star,
  Film,
  Calendar,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { useProfile } from '../context/ProfileContext';

interface TvLokTopBarProps {
  onOpenSearch?: () => void;
  onOpenSettings?: () => void;
  onOpenEpg?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showSearchBar?: boolean;
}

export const TvLokTopBar: React.FC<TvLokTopBarProps> = ({
  onOpenSearch,
  onOpenSettings,
  onOpenEpg,
  searchQuery = '',
  onSearchChange,
  showSearchBar = true,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const { currentProfile, isKidsMode, openWhoIsWatching } = useProfile();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-14 bg-[#111827] border-b border-white/10 px-4 md:px-6 flex items-center justify-between shrink-0 z-30 shadow-md">
      {/* 1. Left: TVLok Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/25">
            <Tv className="w-5 h-5 stroke-[2.5px] text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white tracking-tight">
              Tv<span className="text-emerald-400">Lok</span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              Live
            </span>
          </div>
        </div>

        {/* Live Status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#22c55e]" />
          <span>Live Engine</span>
        </div>
      </div>

      {/* 2. Middle: Integrated Search Bar */}
      {showSearchBar && onSearchChange && (
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search channels, sports, movies, countries..."
              className="w-full bg-[#1b2330] border border-white/10 focus:border-emerald-500 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 3. Right: EPG shortcut, Live Clock, Network status & Profile/Settings */}
      <div className="flex items-center gap-3 md:gap-4">
        {onOpenEpg && (
          <button
            onClick={onOpenEpg}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1b2330] hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/40 text-xs font-semibold text-slate-200 hover:text-emerald-400 transition-colors cursor-pointer"
            title="Open Electronic Program Guide"
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>EPG Guide</span>
          </button>
        )}

        {/* Network status */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono">24ms</span>
        </div>

        {/* Live Clock: 20:45 */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#1b2330] border border-white/10 text-xs text-slate-200">
          <Clock className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono font-bold">{currentTime || '20:45:00'}</span>
          <span className="hidden xl:inline text-slate-400 text-[10px] ml-1">
            {currentDate}
          </span>
        </div>

        {/* Profile Avatar / Kids badge */}
        <button
          onClick={openWhoIsWatching}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1b2330] hover:bg-white/10 border border-white/10 text-xs text-slate-200 transition-colors cursor-pointer"
          title="Switch User Profile"
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shadow-sm"
            style={{ backgroundColor: currentProfile?.avatarBg || '#059669' }}
          >
            {currentProfile?.name ? currentProfile.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="hidden md:inline font-semibold">{currentProfile?.name || 'Owner'}</span>
        </button>

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-[#1b2330] hover:bg-white/10 border border-white/10 text-slate-300 hover:text-emerald-400 transition-colors cursor-pointer"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};

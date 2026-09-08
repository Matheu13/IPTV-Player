import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ArrowLeft,
  Tv,
  Layers,
  Sparkles,
  Search,
  Trophy,
  Film,
  Clapperboard,
  Play,
  Globe,
  Radio,
  Baby,
  Columns,
} from 'lucide-react';
import { CountryGroup, ContentTypeGroup } from '../../lib/countryCategoryParser';
import { ProviderSwitcher } from './ProviderSwitcher';

interface LiveTvTypeStepProps {
  country: CountryGroup;
  activeSourceName: string;
  isKidsMode: boolean;
  onBackToCountries: () => void;
  onSelectType: (typeName: string) => void;
  onSelectAllCountryChannels: () => void;
  onSwitchToColumnsMode?: () => void;
}

export const LiveTvTypeStep: React.FC<LiveTvTypeStepProps> = ({
  country,
  activeSourceName,
  isKidsMode,
  onBackToCountries,
  onSelectType,
  onSelectAllCountryChannels,
  onSwitchToColumnsMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return country.types;
    const q = searchQuery.toLowerCase().trim();
    return country.types.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.rawBouquets.some((rb) => rb.toLowerCase().includes(q))
    );
  }, [country.types, searchQuery]);

  const getTypeIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('sport') || lower.includes('event') || lower.includes('allsvenskan')) {
      return <Trophy className="w-5 h-5 text-amber-400" />;
    }
    if (lower.includes('movie') || lower.includes('cinema') || lower.includes('disney')) {
      return <Film className="w-5 h-5 text-sky-400" />;
    }
    if (lower.includes('series') || lower.includes('tv4') || lower.includes('play')) {
      return <Clapperboard className="w-5 h-5 text-purple-400" />;
    }
    if (lower.includes('news') || lower.includes('expressen')) {
      return <Radio className="w-5 h-5 text-rose-400" />;
    }
    return <Tv className="w-5 h-5 text-emerald-400" />;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-y-auto custom-scrollbar">
      {/* 1. Header Bar: Breadcrumb + Step Indicator */}
      <header className="px-6 py-4 bg-[#0a0f1a]/95 backdrop-blur-md border-b border-white/5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCountries}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Countries</span>
          </button>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Step 2 of 3
              </span>
              <span className="text-xs font-bold text-slate-400">Content Type</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-white">
              <button
                onClick={onBackToCountries}
                className="text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
              >
                Live TV
              </button>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <span className="text-sky-400 flex items-center gap-1">
                <span>{country.flag}</span>
                <span>{country.name}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <span className="text-slate-300">Select Type</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Kids Mode Warning */}
          {isKidsMode && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Baby className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kids Mode</span>
            </div>
          )}

          <ProviderSwitcher variant="pill" />

          {onSwitchToColumnsMode && (
            <button
              onClick={onSwitchToColumnsMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1f293d] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Columns className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">3-Column View</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Hero for Selected Country */}
      <div className="px-6 pt-6 pb-2">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-blue-950/60 via-[#0d1424] to-[#0a0e17] border border-white/10 p-6 md:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-4xl shadow-inner shrink-0">
                {country.flag}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {country.name} BOUQUETS
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {country.totalCount} Streams Available
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {country.name} — Select Content Type
                </h1>
                <p className="text-sm text-slate-300">
                  Select a category or bouquet below to open the channels list and start streaming.
                </p>
              </div>
            </div>

            {/* Quick Action: All Channels in this Country */}
            <div className="shrink-0 flex gap-3">
              <button
                onClick={onSelectAllCountryChannels}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-950/50 transition-all cursor-pointer border border-sky-400/30"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>All {country.name} Channels ({country.totalCount})</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${country.name} types (e.g. TeliaPlay, ViaPlay, sports, events)...`}
                className="w-full bg-[#070a12]/80 border border-white/10 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Grid of Content Types */}
      <div className="px-6 py-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
              Content Categories & Bouquets
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              ({filteredTypes.length} types)
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Click a bouquet to view channels
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
          {/* Card for All Country Channels */}
          <div
            onClick={onSelectAllCountryChannels}
            className="group relative rounded-2xl bg-gradient-to-br from-sky-950/40 to-[#0c101a] hover:from-sky-900/50 hover:to-[#111726] border border-sky-500/30 hover:border-sky-400 p-5 transition-all duration-200 cursor-pointer shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-inner group-hover:scale-105 transition-transform">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {country.totalCount} Streams
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                All {country.name} Channels
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Browse complete live guide across all {country.name} categories.
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-sky-400 font-semibold">
              <span>View All Channels</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Individual Content Types */}
          {filteredTypes.map((type) => (
            <div
              key={type.name}
              onClick={() => onSelectType(type.name)}
              className="group relative rounded-2xl bg-[#0c101a] hover:bg-[#111726] border border-white/10 hover:border-sky-500/50 p-5 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-sky-950/30 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-transform">
                    {getTypeIcon(type.name)}
                  </div>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-white/[0.06] text-slate-200 border border-white/10 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                    {type.count} Channels
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                  {type.name}
                </h3>

                {type.rawBouquets.length > 1 && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {type.rawBouquets.length} sub-bouquets merged
                  </p>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 group-hover:text-sky-400 font-semibold transition-colors">
                <span>View Channels</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

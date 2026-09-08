import React, { useState, useMemo } from 'react';
import {
  Globe,
  Search,
  ChevronRight,
  Tv,
  Layers,
  Sparkles,
  Server,
  Baby,
  ShieldCheck,
  Columns,
  ListFilter,
  CheckCircle2,
} from 'lucide-react';
import { CountryGroup } from '../../lib/countryCategoryParser';
import { ProviderSwitcher } from './ProviderSwitcher';

interface LiveTvCountryStepProps {
  countries: CountryGroup[];
  totalChannelsCount: number;
  activeSourceName: string;
  isKidsMode: boolean;
  currentProfileName: string;
  onSelectCountry: (countryId: string) => void;
  onSelectAllChannels: () => void;
  onSwitchToColumnsMode?: () => void;
}

export const LiveTvCountryStep: React.FC<LiveTvCountryStepProps> = ({
  countries,
  totalChannelsCount,
  activeSourceName,
  isKidsMode,
  currentProfileName,
  onSelectCountry,
  onSelectAllChannels,
  onSwitchToColumnsMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = useMemo(() => {
    if (!searchQuery.trim()) return countries;
    const q = searchQuery.toLowerCase().trim();
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.types.some((t) => t.name.toLowerCase().includes(q))
    );
  }, [countries, searchQuery]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-y-auto custom-scrollbar">
      {/* 1. Header Bar: Breadcrumb + Mode Toggle + Provider & Profile */}
      <header className="px-6 py-4 bg-[#0a0f1a]/95 backdrop-blur-md border-b border-white/5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-sm">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Step 1 of 3
              </span>
              <span className="text-xs font-bold text-slate-400">Navigation</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-extrabold text-white">
              <span className="text-sky-400">Live TV</span>
              <ChevronRight className="w-4 h-4 text-slate-600" />
              <span className="text-slate-300">Select Country</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Kids Mode Warning / Safety Badge */}
          {isKidsMode && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
              <Baby className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kids Profile (PG Streams Only)</span>
            </div>
          )}

          {/* Provider Switcher */}
          <ProviderSwitcher variant="pill" />

          {/* Optional Toggle to 3-Column Leanback Mode */}
          {onSwitchToColumnsMode && (
            <button
              onClick={onSwitchToColumnsMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#111827] hover:bg-[#1f293d] border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Switch to 3-Column TV Leanback Guide"
            >
              <Columns className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">3-Column View</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Hero Section: Direct "Channels from different countries" banner */}
      <div className="px-6 pt-6 pb-2">
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-sky-950/70 via-[#0d1424] to-[#0a0e17] border border-white/10 p-6 md:p-8 shadow-xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest text-white bg-rose-600 shadow-lg shadow-rose-950/50">
                  LIVE TV REGIONS
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {countries.length} Countries & Regions Available
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                Live TV Channels by Country
              </h1>
              <p className="text-sm text-slate-300">
                Start by selecting a country below. You will then choose the content type (bouquets, sports, events) to view live channels.
              </p>
            </div>

            {/* Quick Action: All Channels Button */}
            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={onSelectAllChannels}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-950/50 transition-all cursor-pointer border border-sky-400/30"
              >
                <Globe className="w-4 h-4" />
                <span>Browse All Channels ({totalChannelsCount})</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Quick Filter Chips */}
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search country (Sweden, Belgium, Canada, UK, USA, Africa, Asia)..."
                className="w-full bg-[#070a12]/80 border border-white/10 focus:border-sky-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 transition-all"
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

            {/* Quick Country Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 shrink-0">
              {countries.slice(0, 7).map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectCountry(c.id)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span>{c.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({c.totalCount})</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Grid of Countries */}
      <div className="px-6 py-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-300">
              Select a Country
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              ({filteredCountries.length} available)
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Click any country to view its bouquets & content types
          </span>
        </div>

        {filteredCountries.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-[#0d121d] rounded-2xl border border-white/5">
            <Globe className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-bold">No countries found</p>
            <p className="text-slate-500 text-xs">
              No regional channels matching "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              Show All Countries
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-12">
            {filteredCountries.map((country) => (
              <div
                key={country.id}
                onClick={() => onSelectCountry(country.id)}
                className="group relative rounded-2xl bg-[#0c101a] hover:bg-[#111726] border border-white/10 hover:border-sky-500/50 p-5 transition-all duration-200 cursor-pointer shadow-lg hover:shadow-sky-950/30 flex flex-col justify-between"
              >
                {/* Top: Flag + Title + Count Badge */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
                      {country.flag}
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-sky-500/10 text-sky-300 border border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                        {country.totalCount} Channels
                      </span>
                      <p className="text-[11px] text-slate-500 mt-1 font-medium">
                        {country.types.length} {country.types.length === 1 ? 'Bouquet' : 'Bouquets'}
                      </p>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                    {country.name}
                  </h3>

                  {/* Sample content types in this country */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {country.types.slice(0, 3).map((t) => (
                      <span
                        key={t.name}
                        className="px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-semibold text-slate-400 group-hover:text-slate-300 transition-colors"
                      >
                        {t.name}
                      </span>
                    ))}
                    {country.types.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-white/[0.02] text-[10px] font-semibold text-slate-500">
                        +{country.types.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom action trigger */}
                <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 group-hover:text-sky-400 font-semibold transition-colors">
                  <span>Explore Types & Channels</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

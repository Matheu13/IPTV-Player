import React, { useState, useEffect } from 'react';
import {
  Play,
  Tv,
  Film,
  Clapperboard,
  Star,
  Clock,
  Radio,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Server,
  CheckCircle2,
} from 'lucide-react';
import { ChannelRowData } from '../components/ChannelRow';
import { ProviderSwitcher } from '../components/ProviderSwitcher';
import { globalUnifiedIptvEngine } from '../../lib/unifiedIptvEngine';
import { TvLokTopBar } from '../components/TvLokTopBar';

interface HomeScreenProps {
  onNavigateToLive: () => void;
  onNavigateToMovies: () => void;
  onNavigateToSeries: () => void;
  onSelectChannel: (channel: ChannelRowData) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToLive,
  onNavigateToMovies,
  onNavigateToSeries,
  onSelectChannel,
}) => {
  const [channels, setChannels] = useState<ChannelRowData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const updateData = () => {
      const allChannels = globalUnifiedIptvEngine.getAllChannels();
      const mapped: ChannelRowData[] = allChannels.map((c: any, i) => ({
        id: c.id,
        channelNumber: c.channelNumber || i + 1,
        name: c.name,
        logo: c.logoUrl || c.logo || undefined,
        category: c.category,
        sourceId: c.sourceId,
        sourceName: c.sourceName,
        streamUrl: c.streamUrl,
        nowProgramme: {
          title: c.epgNow?.title || c.currentEpg?.title || 'Premier League Live',
          start: '20:00',
          stop: '22:00',
          progressPercent: 55,
        },
        is4k: c.name.toLowerCase().includes('4k') || c.name.toLowerCase().includes('uhd'),
        isFavorite: globalUnifiedIptvEngine.isFavorite(c.id),
      }));

      setChannels(mapped);
    };

    updateData();
    const unsub = globalUnifiedIptvEngine.subscribe(updateData);
    return () => unsub();
  }, []);

  // Featured Spotlight Channel
  const heroChannel: ChannelRowData = channels[0] || {
    id: 'hero-ch',
    channelNumber: 1,
    name: 'SuperSport Premier HD',
    category: 'Sports',
    sourceName: 'Broadcast Master CDN',
    nowProgramme: {
      title: 'Arsenal vs Liverpool - Premier League Live',
      start: '20:00',
      stop: '22:00',
      progressPercent: 55,
    },
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    is4k: true,
  };

  const iptvFavorites = [
    { name: '★ SuperSport Premier', category: 'Sports', isLive: true },
    { name: '★ ESPN HD', category: 'Sports', isLive: true },
    { name: '★ BBC News', category: 'News', isLive: false },
    { name: '★ Sky Cinema Action', category: 'Movies', isLive: false },
  ];

  const iptvRecentlyWatched = [
    'Sky Sports',
    'Canal+ Sport',
    'CNN',
    'Cartoon Network',
    'beIN Sports 1',
    'TNT Sports',
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-y-auto custom-scrollbar select-none font-sans">
      {/* 1. Top Bar with Brand, Live Clock (20:45) & Search */}
      <TvLokTopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenEpg={onNavigateToLive}
      />

      <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* 2. Primary Navigation Modules */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-emerald-400">
              Entertainment Hub
            </h2>
            <span className="text-xs text-slate-400">Select with remote or click</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 1. Live TV */}
            <button
              onClick={onNavigateToLive}
              className="group relative flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl bg-[#141d2c] hover:bg-[#1a2538] border-2 border-emerald-500 shadow-[0_0_28px_rgba(34,197,94,0.3)] transition-all cursor-pointer transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:shadow-[0_0_24px_rgba(34,197,94,0.5)] focus:scale-[1.02]"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-md shadow-emerald-500/25 group-hover:scale-110 transition-transform">
                <Tv className="w-8 h-8 stroke-[2.5px] text-emerald-400" />
              </div>
              <h3 className="text-lg font-black text-emerald-400 tracking-tight">
                Live TV
              </h3>
              <p className="text-xs text-slate-400 mt-1">Live Global Feeds</p>
              <span className="mt-3 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30">
                PRIMARY
              </span>
            </button>

            {/* 2. Movies */}
            <button
              onClick={onNavigateToMovies}
              className="group flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl bg-[#141d2c] hover:bg-[#1a2538] border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:shadow-[0_0_24px_rgba(34,197,94,0.5)] focus:scale-[1.02]"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 mb-4 group-hover:text-emerald-400 group-hover:scale-110 transition-all">
                <Film className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Movies
              </h3>
              <p className="text-xs text-slate-400 mt-1">3,800+ VOD Titles</p>
            </button>

            {/* 3. Series */}
            <button
              onClick={onNavigateToSeries}
              className="group flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl bg-[#141d2c] hover:bg-[#1a2538] border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:shadow-[0_0_24px_rgba(34,197,94,0.5)] focus:scale-[1.02]"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 mb-4 group-hover:text-emerald-400 group-hover:scale-110 transition-all">
                <Clapperboard className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Series
              </h3>
              <p className="text-xs text-slate-400 mt-1">1,200+ Box Sets</p>
            </button>

            {/* 4. Catch Up */}
            <button
              onClick={onNavigateToLive}
              className="group flex flex-col items-center justify-center p-6 md:p-8 rounded-2xl bg-[#141d2c] hover:bg-[#1a2538] border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:shadow-[0_0_24px_rgba(34,197,94,0.5)] focus:scale-[1.02]"
            >
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 mb-4 group-hover:text-emerald-400 group-hover:scale-110 transition-all">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Catch Up
              </h3>
              <p className="text-xs text-slate-400 mt-1">7-Day EPG Archive</p>
            </button>
          </div>
        </section>

        {/* 3. Live Spotlight Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-emerald-500/30 bg-gradient-to-r from-[#141e2b] via-[#101724] to-[#080d17] p-6 md:p-8 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest text-slate-950 bg-emerald-400 shadow-md shadow-emerald-500/30">
                  LIVE MATCH OF THE DAY
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-white border border-white/10">
                  20:00 – 22:00
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {heroChannel.name}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {heroChannel.nowProgramme?.title}
              </h1>

              <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                Live from Anfield. High-definition transmission with immersive audio, instant tactical telemetry, and zero buffering.
              </p>

              {/* Progress Timeline (55%) */}
              <div className="space-y-1 pt-1 max-w-md">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Progress (55%)</span>
                  <span className="font-mono">20:45 / 22:00</span>
                </div>
                <div className="w-full bg-[#1e293b] rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-400 h-2 rounded-full w-[55%] shadow-[0_0_8px_#22c55e]" />
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  onSelectChannel(heroChannel);
                  onNavigateToLive();
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Watch Live Now</span>
              </button>

              <button
                onClick={onNavigateToLive}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1b2330] hover:bg-[#243040] border border-white/10 text-slate-200 hover:text-white text-sm font-semibold transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <Tv className="w-4 h-4 text-emerald-400" />
                <span>Open Channel Browser</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Favorites & Recently Watched */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Favorites Card */}
          <div className="bg-[#141d2c] rounded-2xl border border-white/10 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-[#FFD700] text-[#FFD700]" />
                <h3 className="text-sm font-extrabold text-emerald-400 uppercase tracking-wider">
                  Favorites
                </h3>
              </div>
              <button
                onClick={onNavigateToLive}
                className="text-xs text-slate-400 hover:text-emerald-400 transition-colors"
              >
                View all
              </button>
            </div>

            <div className="space-y-2">
              {iptvFavorites.map((fav, i) => (
                <div
                  key={i}
                  onClick={onNavigateToLive}
                  className="flex items-center justify-between p-3 rounded-xl bg-[#1b2330] hover:bg-[#243040] border border-white/5 hover:border-emerald-500/30 transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-emerald-400"
                >
                  <span className="text-xs font-bold text-white">{fav.name}</span>
                  {fav.isLive ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20">
                      LIVE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-400 border border-white/10">
                      {fav.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recently Watched Card */}
          <div className="bg-[#141d2c] rounded-2xl border border-white/10 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Recently Watched
                </h3>
              </div>
              <span className="text-xs text-slate-400">Quick Resume</span>
            </div>

            <div className="flex flex-wrap gap-2.5">
              {iptvRecentlyWatched.map((ch, i) => (
                <button
                  key={i}
                  onClick={onNavigateToLive}
                  className="px-3 py-2 rounded-xl bg-[#1b2330] hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-white/10 text-xs font-semibold text-slate-200 hover:text-emerald-300 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {ch}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
              <span>Fast Zapping Enabled</span>
              <span className="text-emerald-400 font-mono">0.3s switch</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Play,
  Tv,
  Film,
  Clapperboard,
  Star,
  Clock,
  Sparkles,
  Server,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { GlassPanel } from '../components/GlassPanel';
import { Focusable } from '../components/Focusable';
import { SourceBadge } from '../components/SourceBadge';
import { ChannelRowData } from '../components/ChannelRow';
import { ProviderSwitcher } from '../components/ProviderSwitcher';
import { ChannelLogo } from '../components/ChannelLogo';
import { globalUnifiedIptvEngine } from '../../lib/unifiedIptvEngine';

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
  const [sources, setSources] = useState<any[]>([]);
  const [recentChannels, setRecentChannels] = useState<ChannelRowData[]>([]);
  const [favoriteChannels, setFavoriteChannels] = useState<ChannelRowData[]>([]);

  useEffect(() => {
    const updateData = () => {
      try {
        const activeSourceId = globalUnifiedIptvEngine.getState().activeSourceId;
        const allChannels = globalUnifiedIptvEngine.getAllChannels();
        const filtered = activeSourceId === 'ALL' || activeSourceId === 'all'
          ? allChannels
          : allChannels.filter((c: any) => c.sourceId === activeSourceId);

        const all: ChannelRowData[] = filtered.map((c: any, i) => ({
          id: c.id,
          channelNumber: c.channelNumber || i + 1,
          name: c.name,
          logo: c.logoUrl || c.logo || undefined,
          category: c.category,
          sourceId: c.sourceId,
          sourceName: c.sourceName,
          streamUrl: c.streamUrl,
          nowProgramme: {
            title: c.epgNow?.title || c.currentEpg?.title || 'Live Transmission',
            start: c.epgNow?.startTime || c.currentEpg?.start || '18:00',
            stop: c.epgNow?.endTime || c.currentEpg?.stop || '19:00',
            progressPercent: 35,
          },
          is4k: c.name.toLowerCase().includes('4k') || c.resolution === '4K UHD',
          is8k: c.name.toLowerCase().includes('8k'),
          isFavorite: globalUnifiedIptvEngine.isFavorite(c.id),
        }));

        setChannels(all);
        setRecentChannels(all.slice(0, 6));
        setFavoriteChannels(all.filter((c) => c.isFavorite).slice(0, 6));
        setSources(globalUnifiedIptvEngine.getSources());
      } catch (err) {
        console.error('Failed to init home screen:', err);
      }
    };

    updateData();
    const unsubscribe = globalUnifiedIptvEngine.subscribe(updateData);
    return () => unsubscribe();
  }, []);

  const heroChannel = channels[0] || {
    id: 'hero-1',
    name: 'Sky Sports Premier League UHD',
    category: 'Sports',
    sourceName: 'Primary Sports CDN',
    nowProgramme: {
      title: 'Arsenal vs Manchester City - Match of the Season [4K UHD]',
      start: '18:30',
      stop: '20:30',
      progressPercent: 65,
    },
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    is4k: true,
  };

  const categories = [
    { name: 'Sports', icon: Radio, count: '1,420 Streams', color: 'from-amber-500/20 to-orange-500/20' },
    { name: 'Cinema & Movies', icon: Film, count: '3,850 Titles', color: 'from-sky-500/20 to-blue-500/20' },
    { name: 'TV Series', icon: Clapperboard, count: '1,200 Shows', color: 'from-indigo-500/20 to-purple-500/20' },
    { name: 'News & Live', icon: Tv, count: '890 Channels', color: 'from-rose-500/20 to-red-500/20' },
    { name: 'Documentary', icon: Sparkles, count: '640 Titles', color: 'from-emerald-500/20 to-teal-500/20' },
  ];

  return (
    <div className="flex-1 bg-[#080b11] text-slate-100 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Provider Quick Switcher Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d121c] p-3 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            Active IPTV Provider
          </span>
        </div>
        <ProviderSwitcher variant="tabs" />
      </div>

      {/* Hero Spotlight Banner (Cinematic Command OS) */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-r from-sky-950/80 via-[#111722] to-[#0c1018] shadow-2xl p-6 md:p-10 flex flex-col justify-between min-h-[260px]">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 z-10 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest text-white bg-rose-600 shadow-lg shadow-rose-950/50 animate-pulse">
              ● LIVE SPOTLIGHT
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider text-amber-300 bg-amber-500/20 border border-amber-500/40">
              4K UHD 60FPS
            </span>
            <SourceBadge sourceName={heroChannel.sourceName || 'Xtream CDN'} size="sm" />
          </div>

          <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {heroChannel.nowProgramme?.title}
          </h1>

          <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
            Live multi-camera broadcast direct from the stadium. Ultra-low latency CMAF pipeline active with zero-copy Direct3D 11 hardware decoding.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onSelectChannel(heroChannel)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-slate-900 bg-white hover:bg-slate-200 transition-all shadow-xl shadow-white/10 hover:scale-105 active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Watch Live Now</span>
            </button>

            <button
              onClick={onNavigateToLive}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-white/10 transition-colors"
            >
              <Tv className="w-4 h-4 text-sky-400" />
              <span>Browse All Channels</span>
            </button>
          </div>
        </div>
      </div>

      {/* Provider Status Summary Strip */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <Server className="w-4 h-4 text-sky-400" />
            <span>Configured IPTV Sources</span>
          </div>
          <span className="text-xs font-mono text-slate-400">{sources.length} Active Providers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {sources.map((src) => (
            <GlassPanel key={src.id} className="p-3.5 flex items-center justify-between border-white/5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-slate-800/90 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0">
                  <Server className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-xs text-white truncate">{src.name}</div>
                  <div className="text-[10px] font-mono text-slate-400">{src.channelCount} Channels</div>
                </div>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Connected</span>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>

      {/* Continue Watching / Recent Channels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-white">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Continue Watching &amp; Recents</span>
          </div>
          <button
            onClick={onNavigateToLive}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recentChannels.map((ch, idx) => (
            <Focusable
              key={`home-recent-${ch.id}-${idx}`}
              id={`home-recent-${ch.id}-${idx}`}
              onSelect={() => onSelectChannel(ch)}
              className="p-3.5 rounded-xl bg-[#111722]/80 hover:bg-[#161e2c] border border-white/5 hover:border-sky-500/40 transition-all flex items-center gap-3 group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                <ChannelLogo
                  name={ch.name}
                  logoUrl={ch.logo}
                  category={ch.category}
                  size="md"
                  showBadgeBorder={true}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white truncate group-hover:text-sky-300">
                  {ch.name}
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  {ch.nowProgramme?.title}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-colors shrink-0">
                <Play className="w-3.5 h-3.5 fill-current" />
              </div>
            </Focusable>
          ))}
        </div>
      </div>

      {/* Popular Categories Grid */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-white">
          <TrendingUp className="w-4 h-4 text-indigo-400" />
          <span>Explore by Category</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.name}
                onClick={onNavigateToLive}
                className={`p-4 rounded-xl bg-gradient-to-b ${cat.color} border border-white/10 hover:border-sky-400/50 transition-all text-left group hover:scale-[1.02]`}
              >
                <Icon className="w-6 h-6 text-white mb-2 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-sm text-white">{cat.name}</div>
                <div className="text-xs font-mono text-slate-400 mt-1">{cat.count}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

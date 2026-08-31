import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Play,
  RotateCcw,
  Film,
  Tv,
  Star,
  Info,
  ChevronRight,
  ChevronLeft,
  Filter,
  CheckCircle2,
  Sparkles,
  Search,
  Maximize2,
  RefreshCw,
  Sliders,
  Bookmark,
  Radio,
  X,
  Volume2,
} from 'lucide-react';
import { UnifiedEpgProgram } from '../../types';
import { globalUnifiedIptvEngine, UnifiedChannel } from '../../lib/unifiedIptvEngine';
import { usePlayback } from '../context/PlaybackContext';

const EPG_CATEGORIES = [
  'ALL',
  'SPORTS',
  'NEWS',
  'ENTERTAINMENT',
  'CINEMA',
  'DOCUMENTARY',
  'KIDS',
];

interface EpgScheduleItem {
  id: string;
  channelId: string;
  channelName: string;
  channelLogo: string;
  category: string;
  streamUrl: string;
  programs: {
    id: string;
    title: string;
    category: string;
    start: string;
    stop: string;
    startTime: number;
    stopTime: number;
    desc: string;
    rating?: string;
    hasCatchup?: boolean;
  }[];
}

export const EpgScreen: React.FC = () => {
  const { playChannel } = usePlayback();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<{
    prog: EpgScheduleItem['programs'][0];
    channel: EpgScheduleItem;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<'compact' | 'normal' | 'wide'>('normal');
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(Date.now());
  const [channels, setChannels] = useState<UnifiedChannel[]>([]);
  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Load channels from unified IPTV engine
  useEffect(() => {
    const load = () => {
      const live = globalUnifiedIptvEngine.getChannels();
      setChannels(live.slice(0, 40));
    };
    load();
    const unsub = globalUnifiedIptvEngine.subscribe(load);
    return () => unsub();
  }, []);

  // Update real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeMs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Base schedule generator for today
  const timeSlots = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const slots = [];
    for (let h = 0; h < 24; h++) {
      const slotTime = new Date(startOfDay.getTime() + h * 3600000);
      const timeLabel = slotTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      slots.push({ hour: h, label: timeLabel, timestamp: slotTime.getTime() });
    }
    return slots;
  }, []);

  // Build simulated EPG matrix for loaded channels
  const epgMatrix: EpgScheduleItem[] = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();

    return channels.map((ch, chIdx) => {
      const programs = [];
      const showThemes = [
        ['Morning Live News', 'World Briefing', 'Market Open', 'Midday Report', 'Prime Time Special', 'Late Night Edition'],
        ['Matchday Countdown', 'Premier League LIVE', 'Half-Time Studio', 'Post Match Wrap', 'SportsCenter 4K', 'Champions Recap'],
        ['Planet Earth 4K', 'Deep Sea Mysteries', 'Cosmos & Beyond', 'Wildlife Safari', 'Nature Documentaries', 'Science Frontiers'],
        ['Blockbuster Premiere', 'Action Cinema', 'Director Cut Special', 'Classic Hollywood', 'Late Thriller', 'Midnight Noir'],
      ];
      const theme = showThemes[chIdx % showThemes.length];

      let runningStart = startOfDay;
      for (let i = 0; i < 8; i++) {
        const durationHours = (i % 2 === 0 ? 3 : 2) + ((chIdx + i) % 2);
        const durationMs = durationHours * 3600000;
        const runningEnd = runningStart + durationMs;
        const progTitle = theme[i % theme.length];

        programs.push({
          id: `epg-${ch.id}-${i}`,
          title: progTitle,
          category: ch.category,
          start: new Date(runningStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          stop: new Date(runningEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          startTime: runningStart,
          stopTime: runningEnd,
          desc: `Full broadcast coverage of ${progTitle} with multi-camera angles, studio commentary, and pristine 4K HDR stream master.`,
          rating: '4.8',
          hasCatchup: runningEnd < currentTimeMs,
        });

        runningStart = runningEnd;
      }

      return {
        id: String(ch.id),
        channelId: String(ch.id),
        channelName: ch.name,
        channelLogo: ch.logoUrl || '',
        category: ch.category,
        streamUrl: ch.streamUrl,
        programs,
      };
    });
  }, [channels, currentTimeMs]);

  // Filter channels
  const filteredSchedule = useMemo(() => {
    return epgMatrix.filter((item) => {
      const matchCategory =
        selectedCategory === 'ALL' ||
        item.category.toUpperCase().includes(selectedCategory);

      const matchSearch =
        searchQuery.trim() === '' ||
        item.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.programs.some((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchCategory && matchSearch;
    });
  }, [epgMatrix, selectedCategory, searchQuery]);

  const pxPerHour = zoomLevel === 'compact' ? 140 : zoomLevel === 'normal' ? 220 : 320;

  const handleTuneChannel = (item: EpgScheduleItem) => {
    playChannel(
      {
        id: item.channelId,
        channelNumber: parseInt(item.channelId, 10) || 1,
        name: item.channelName,
        streamUrl: item.streamUrl,
        category: item.category,
        is4k: true,
        isHdr: true,
        isFavorite: false,
        nowProgramme: item.programs[0]
          ? {
              title: item.programs[0].title,
              start: item.programs[0].start,
              stop: item.programs[0].stop,
              description: item.programs[0].desc,
            }
          : undefined,
      },
      'embedded'
    );
  };

  const handlePlayCatchup = (item: EpgScheduleItem, prog: EpgScheduleItem['programs'][0]) => {
    playChannel(
      {
        id: `catchup-${prog.id}`,
        channelNumber: parseInt(item.channelId, 10) || 1,
        name: `${item.channelName} • ${prog.title} (Replay)`,
        streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
        category: item.category,
        is4k: true,
        isHdr: true,
        isFavorite: false,
        nowProgramme: {
          title: `[Replay] ${prog.title}`,
          start: prog.start,
          stop: prog.stop,
          description: prog.desc,
        },
      },
      'fullscreen'
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080b11] text-slate-100 overflow-hidden">
      {/* 1. Header Toolbar */}
      <header className="px-6 py-4 bg-[#0c1018] border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-950">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <span>Electronic Program Guide</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 text-[10px] font-mono font-bold">
                LIVE 24H
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              Synchronized with DVB-SI & XMLTV Feeds
            </p>
          </div>
        </div>

        {/* Search & Zoom Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="relative w-48 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter channels or shows..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#111722] border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#111722] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setZoomLevel('compact')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                zoomLevel === 'compact' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => setZoomLevel('normal')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                zoomLevel === 'normal' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setZoomLevel('wide')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                zoomLevel === 'wide' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Wide
            </button>
          </div>
        </div>
      </header>

      {/* 2. Category Filter Bar */}
      <div className="px-6 py-2.5 bg-[#080b11] border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        {EPG_CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                isSelected
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-[#111722] text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 3. Main Timeline Grid Surface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Channel Sidebar */}
        <div className="w-48 sm:w-56 bg-[#0c1018] border-r border-white/5 flex flex-col shrink-0 z-10">
          <div className="h-11 border-b border-white/5 flex items-center px-4 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
            Channels ({filteredSchedule.length})
          </div>
          <div className="flex-1 overflow-y-hidden divide-y divide-white/5">
            {filteredSchedule.map((item) => (
              <div
                key={item.id}
                onClick={() => handleTuneChannel(item)}
                className="h-16 px-4 flex items-center gap-3 hover:bg-slate-800/60 transition cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                  {item.channelLogo ? (
                    <img src={item.channelLogo} alt={item.channelName} className="w-full h-full object-contain" />
                  ) : (
                    <Tv className="w-4 h-4 text-sky-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                    {item.channelName}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono line-clamp-1">
                    {item.category}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Timeline Grid */}
        <div ref={timelineScrollRef} className="flex-1 overflow-auto bg-[#080b11] relative">
          {/* Timeline Header (Hours) */}
          <div
            className="h-11 border-b border-white/5 flex sticky top-0 bg-[#0c1018]/95 backdrop-blur z-20"
            style={{ width: `${24 * pxPerHour}px` }}
          >
            {timeSlots.map((slot) => (
              <div
                key={slot.hour}
                className="border-r border-white/5 px-3 flex items-center text-xs font-mono font-semibold text-slate-400 shrink-0"
                style={{ width: `${pxPerHour}px` }}
              >
                <Clock className="w-3 h-3 mr-1.5 text-slate-500" />
                {slot.label}
              </div>
            ))}
          </div>

          {/* Channel Program Rows */}
          <div style={{ width: `${24 * pxPerHour}px` }} className="divide-y divide-white/5">
            {filteredSchedule.map((item) => (
              <div key={item.id} className="h-16 relative flex items-center p-1">
                {item.programs.map((prog) => {
                  const now = new Date();
                  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
                  const startOffsetHours = (prog.startTime - startOfDay) / 3600000;
                  const durationHours = (prog.stopTime - prog.startTime) / 3600000;
                  const leftPx = startOffsetHours * pxPerHour;
                  const widthPx = Math.max(80, durationHours * pxPerHour - 4);
                  const isCurrent = currentTimeMs >= prog.startTime && currentTimeMs < prog.stopTime;

                  return (
                    <div
                      key={prog.id}
                      onClick={() => setSelectedProgram({ prog, channel: item })}
                      style={{
                        position: 'absolute',
                        left: `${leftPx}px`,
                        width: `${widthPx}px`,
                      }}
                      className={`h-14 rounded-lg p-2 flex flex-col justify-between border transition-all cursor-pointer select-none overflow-hidden ${
                        isCurrent
                          ? 'bg-sky-950/70 border-sky-500/60 shadow-md shadow-sky-500/10'
                          : 'bg-[#111722] border-slate-800/80 hover:border-slate-600 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs font-bold truncate ${
                            isCurrent ? 'text-sky-300' : 'text-slate-200'
                          }`}
                        >
                          {prog.title}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500 text-white text-[9px] font-extrabold uppercase shrink-0">
                            ON AIR
                          </span>
                        )}
                        {prog.hasCatchup && (
                          <span className="p-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] shrink-0" title="Catch-up available">
                            <RotateCcw className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>
                          {prog.start} - {prog.stop}
                        </span>
                        <span className="truncate max-w-[80px]">{prog.category}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Program Details Modal Drawer */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111722] border border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-mono font-bold">
                  {selectedProgram.channel.channelName}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {selectedProgram.prog.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProgram(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-sky-400" />
                {selectedProgram.prog.start} – {selectedProgram.prog.stop}
              </span>
              <span>•</span>
              <span>{selectedProgram.prog.category}</span>
              {selectedProgram.prog.rating && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" /> {selectedProgram.prog.rating}
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              {selectedProgram.prog.desc}
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleTuneChannel(selectedProgram.channel);
                  setSelectedProgram(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs shadow-lg transition"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Tune Live Channel</span>
              </button>
              {selectedProgram.prog.hasCatchup && (
                <button
                  onClick={() => {
                    handlePlayCatchup(selectedProgram.channel, selectedProgram.prog);
                    setSelectedProgram(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Replay</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

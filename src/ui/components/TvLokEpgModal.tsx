import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Play,
  Info,
  Tv,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { ChannelRowData } from './ChannelRow';

interface TvLokEpgModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: ChannelRowData[];
  onSelectChannel: (channel: ChannelRowData) => void;
}

interface EpgProgramItem {
  id: string;
  title: string;
  start: string;
  stop: string;
  durationMinutes: number;
  offsetMinutes: number; // minutes from 18:00
  isLive: boolean;
  category: string;
  synopsis: string;
}

export const TvLokEpgModal: React.FC<TvLokEpgModalProps> = ({
  isOpen,
  onClose,
  channels,
  onSelectChannel,
}) => {
  const [selectedProgram, setSelectedProgram] = useState<{
    channel: ChannelRowData;
    program: EpgProgramItem;
  } | null>(null);

  // Time slots from 18:00 to 24:00 (every 30 mins)
  const timeSlots = [
    '18:00',
    '18:30',
    '19:00',
    '19:30',
    '20:00',
    '20:30',
    '21:00',
    '21:30',
    '22:00',
    '22:30',
    '23:00',
    '23:30',
  ];

  // Generate realistic schedule blocks for each channel
  const channelsWithPrograms = useMemo(() => {
    return channels.slice(0, 16).map((ch, idx) => {
      const isSports = ch.category?.toLowerCase().includes('sport') || ch.name.toLowerCase().includes('sport');
      const isMovie = ch.category?.toLowerCase().includes('movie') || ch.category?.toLowerCase().includes('film');

      const prog1Title = isSports
        ? 'Premier League: Pre-Match Live'
        : isMovie
        ? 'Action Thriller: The Sentinel'
        : 'Evening World Edition';
      const prog2Title = isSports
        ? ch.nowProgramme?.title || 'SuperSport Live: Arsenal vs Liverpool'
        : isMovie
        ? 'Cinema Showcase: Blockbuster Premiere'
        : 'Global Prime Time Investigation';
      const prog3Title = isSports
        ? 'Post-Match Highlights & Analysis'
        : isMovie
        ? 'Late Night Indie Feature'
        : 'Late Night Digest';

      const programs: EpgProgramItem[] = [
        {
          id: `p1-${ch.id}`,
          title: prog1Title,
          start: '18:00',
          stop: '20:00',
          durationMinutes: 120,
          offsetMinutes: 0,
          isLive: false,
          category: ch.category || 'General',
          synopsis: `Studio analysis, lineup confirmation, and tactical breakdown with former champions and commentators.`,
        },
        {
          id: `p2-${ch.id}`,
          title: prog2Title,
          start: '20:00',
          stop: '22:00',
          durationMinutes: 120,
          offsetMinutes: 120,
          isLive: true,
          category: ch.category || 'Sports',
          synopsis: `Live high-definition transmission from Anfield with exclusive multi-camera tactical telemetry and zero latency.`,
        },
        {
          id: `p3-${ch.id}`,
          title: prog3Title,
          start: '22:00',
          stop: '24:00',
          durationMinutes: 120,
          offsetMinutes: 240,
          isLive: false,
          category: ch.category || 'Analysis',
          synopsis: `Complete match recap, press conference interviews, tactical replay, and upcoming fixture forecasts.`,
        },
      ];

      return {
        channel: ch,
        programs,
      };
    });
  }, [channels]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 select-none animate-fadeIn">
      <div className="relative w-full max-w-7xl h-[88vh] bg-[#111827] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-16 px-6 bg-[#16202e] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>Electronic Program Guide</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                  TvLok EPG
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Timeline across the top • Current broadcast schedule
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 shadow-[0_0_6px_#22c55e]" />
                <span className="text-slate-200 font-bold">Live Now</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#1e293b]" />
                <span>Upcoming</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#111827]" />
                <span>Later</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* EPG Timeline Grid Surface */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {/* Top Timeline Bar */}
          <div className="h-10 bg-[#121a26] border-b border-white/10 flex shrink-0 sticky top-0 z-20">
            {/* Channel column header */}
            <div className="w-56 shrink-0 px-4 flex items-center border-r border-white/10 text-xs font-black text-emerald-400 uppercase tracking-wider">
              Channels
            </div>
            {/* Horizontal Timeline slots */}
            <div className="flex-1 flex overflow-x-auto relative">
              {timeSlots.map((slot) => (
                <div
                  key={slot}
                  className="w-36 shrink-0 px-3 flex items-center text-xs font-mono font-semibold text-slate-400 border-r border-white/5"
                >
                  {slot}
                </div>
              ))}
              {/* Current Time Vertical Line at 20:45 */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 z-30 shadow-[0_0_12px_#22c55e]"
                style={{ left: '620px' }}
              >
                <div className="absolute -top-1 -left-3 px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 text-[10px] font-black">
                  20:45
                </div>
              </div>
            </div>
          </div>

          {/* Channels & Program Schedule Rows */}
          <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar relative">
            {/* Current Time Line passing through rows */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-emerald-400/80 pointer-events-none z-10"
              style={{ left: '844px' }} // 224px (w-56) + 620px
            />

            {channelsWithPrograms.map(({ channel, programs }) => (
              <div
                key={channel.id}
                className="flex border-b border-white/5 hover:bg-white/[0.02] transition-colors group h-16"
              >
                {/* Channel Header (Left) */}
                <div
                  onClick={() => {
                    onSelectChannel(channel);
                    onClose();
                  }}
                  className="w-56 shrink-0 px-4 py-2 border-r border-white/10 flex items-center gap-3 cursor-pointer bg-[#141c28]/90 group-hover:bg-[#1a2536] transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#0c121c] border border-white/10 flex items-center justify-center text-xs font-bold text-emerald-400 shrink-0">
                    {channel.logo ? (
                      <img src={channel.logo} alt={channel.name} className="w-7 h-7 object-contain" />
                    ) : (
                      'IPTV'
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                      {channel.name}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {channel.category || 'Live TV'}
                    </div>
                  </div>
                </div>

                {/* Programs Horizontal Blocks (Right) */}
                <div className="flex-1 flex items-center px-2 gap-2 relative">
                  {programs.map((prog) => {
                    const isNow = prog.isLive;
                    return (
                      <div
                        key={prog.id}
                        onClick={() => setSelectedProgram({ channel, program: prog })}
                        style={{ width: `${(prog.durationMinutes / 30) * 144}px` }}
                        className={`h-11 shrink-0 rounded-xl p-2 flex flex-col justify-between cursor-pointer transition-all ${
                          isNow
                            ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/25 border border-emerald-400 hover:brightness-110'
                            : prog.offsetMinutes < 120
                            ? 'bg-[#1b2636] text-white border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-[#223146]'
                            : 'bg-[#141b24] text-slate-200 border border-white/5 hover:bg-[#1e2836]'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] leading-tight font-bold truncate">
                          <span className="truncate">{prog.title}</span>
                          {isNow && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-950 text-emerald-400 font-black uppercase shrink-0 ml-1">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] opacity-85 font-mono">
                          <span>
                            {prog.start} – {prog.stop}
                          </span>
                          <span>{prog.durationMinutes}m</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Program Information Panel */}
        {selectedProgram && (
          <div className="h-44 bg-[#0a0e16] border-t border-white/10 p-4 px-6 flex items-center justify-between gap-6 shrink-0">
            <div className="flex items-start gap-4 max-w-3xl">
              <div className="w-16 h-16 rounded-xl bg-[#141c28] border border-white/10 flex items-center justify-center text-emerald-400 text-xs font-bold shrink-0">
                {selectedProgram.channel.logo ? (
                  <img
                    src={selectedProgram.channel.logo}
                    alt={selectedProgram.channel.name}
                    className="w-12 h-12 object-contain"
                  />
                ) : (
                  'IPTV'
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {selectedProgram.program.title}
                  </h3>
                  {selectedProgram.program.isLive ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black uppercase shadow-sm shadow-emerald-500/30">
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-white/10 text-white text-[10px] font-bold">
                      UPCOMING
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-emerald-400">
                  {selectedProgram.channel.name}
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">
                  {selectedProgram.program.synopsis}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-300 border border-white/10">
                    {selectedProgram.program.category}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-300 border border-white/10">
                    1080p HD
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-slate-300 border border-white/10">
                    English
                  </span>
                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-slate-300 border border-white/10">
                    {selectedProgram.program.start}–{selectedProgram.program.stop}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <button
                onClick={() => {
                  onSelectChannel(selectedProgram.channel);
                  onClose();
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Tune Channel</span>
              </button>
              <button
                onClick={() => setSelectedProgram(null)}
                className="p-2.5 rounded-xl bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

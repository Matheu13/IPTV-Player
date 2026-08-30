import React from 'react';
import { Clock, Radio, Info, Play, Star } from 'lucide-react';
import { Focusable } from './Focusable';
import { Badge } from './Badge';

export interface EpgProgramItem {
  id: string;
  title: string;
  category?: string;
  start: string; // e.g. "18:00"
  stop: string;  // e.g. "19:00"
  isLive?: boolean;
  progressPercent?: number;
  description?: string;
  rating?: string;
  is4k?: boolean;
}

interface EpgTimelineRowProps {
  channelName: string;
  channelLogo?: string;
  channelNumber?: number;
  programs: EpgProgramItem[];
  onSelectProgram?: (program: EpgProgramItem) => void;
  className?: string;
}

export const EpgTimelineRow: React.FC<EpgTimelineRowProps> = ({
  channelName,
  channelLogo,
  channelNumber,
  programs,
  onSelectProgram,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row md:items-stretch bg-[#111722] border border-white/10 rounded-xl overflow-hidden shadow-md ${className}`}
    >
      {/* Channel Header Cell */}
      <div className="w-full md:w-56 p-3.5 bg-[#0e141e] border-b md:border-b-0 md:border-r border-white/10 flex items-center gap-3 shrink-0">
        {channelNumber && (
          <span className="text-xs font-mono font-bold text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
            {channelNumber}
          </span>
        )}
        <div className="w-8 h-8 rounded bg-slate-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          {channelLogo ? (
            <img
              src={channelLogo}
              alt=""
              className="max-h-7 max-w-7 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-[10px] font-bold text-slate-400">TV</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-bold text-white truncate">{channelName}</h4>
          <span className="text-[10px] font-mono text-slate-400">Live Stream</span>
        </div>
      </div>

      {/* Program Blocks Row */}
      <div className="flex-1 flex items-stretch gap-2 p-2 overflow-x-auto no-scrollbar">
        {programs.map((prog) => {
          const isCurrent = prog.isLive || (prog.progressPercent !== undefined && prog.progressPercent > 0);

          return (
            <Focusable
              key={prog.id}
              id={`epg-block-${prog.id}`}
              onClick={() => onSelectProgram && onSelectProgram(prog)}
              className={`flex-1 min-w-[200px] max-w-[280px] p-3 rounded-lg flex flex-col justify-between transition-all select-none cursor-pointer ${
                isCurrent
                  ? 'bg-sky-950/40 border border-sky-500/40 hover:bg-sky-950/60 shadow-sm'
                  : 'bg-[#161e2c] border border-white/5 hover:bg-[#1a2436]'
              }`}
            >
              {/* Program Top Header */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-mono font-semibold text-slate-300 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {prog.start} - {prog.stop}
                  </span>
                  {isCurrent && <Badge variant="live" pulse />}
                  {prog.is4k && <Badge variant="4k" />}
                </div>

                <h5 className="text-xs font-bold text-white line-clamp-1 group-hover:text-sky-300">
                  {prog.title}
                </h5>

                {prog.category && (
                  <span className="text-[10px] text-slate-400 block line-clamp-1">
                    {prog.category}
                  </span>
                )}
              </div>

              {/* Progress Bar for Current Show */}
              {isCurrent && prog.progressPercent !== undefined && (
                <div className="mt-2 space-y-1">
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 rounded-full"
                      style={{ width: `${prog.progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>{prog.progressPercent}% live</span>
                    <span>Remaining</span>
                  </div>
                </div>
              )}
            </Focusable>
          );
        })}
      </div>
    </div>
  );
};

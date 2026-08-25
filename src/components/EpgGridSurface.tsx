import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Filter,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  Zap,
  Search,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Maximize2,
  RefreshCw,
  Sliders,
  AlertCircle,
  Database,
  Layers,
} from 'lucide-react';
import { UnifiedEpgProgram } from '../types';
import { buildCatchupStreamUrl } from '../lib/epgEngine';

interface TimelineChannel {
  channelId: string | number;
  channelName: string;
  tvgId?: string;
  category?: string;
  iconSrc?: string;
  xmltvChannelId: string | null;
  matchType: string;
  hasEpgData: boolean;
  programmes: UnifiedEpgProgram[];
}

interface EpgGridSurfaceProps {
  onTuneChannel?: (channelId: string | number, name: string) => void;
  onPlayCatchup?: (url: string, title: string) => void;
}

const ZOOM_LEVELS = {
  compact: { label: 'Compact', pxPerHour: 160, stepMins: 60 },
  standard: { label: 'Standard', pxPerHour: 240, stepMins: 30 },
  expanded: { label: 'Expanded', pxPerHour: 360, stepMins: 30 },
};

export const EpgGridSurface: React.FC<EpgGridSurfaceProps> = ({ onTuneChannel, onPlayCatchup }) => {
  const [zoomKey, setZoomKey] = useState<'compact' | 'standard' | 'expanded'>('standard');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProgram, setSelectedProgram] = useState<{ prog: UnifiedEpgProgram; channel: TimelineChannel } | null>(null);
  const [focusedChannelIndex, setFocusedChannelIndex] = useState<number>(0);
  const [focusedProgramIndex, setFocusedProgramIndex] = useState<number>(0);

  // Time window state (defaults to 12-hour window centered around now: -3h to +9h)
  const [windowOffsetHours, setWindowOffsetHours] = useState<number>(-3);
  const windowDurationHours = 12; // 12 hours timeline window
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(Math.floor(Date.now() / 1000));
  const [timelineChannels, setTimelineChannels] = useState<TimelineChannel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [catchupNotice, setCatchupNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineContentRef = useRef<HTMLDivElement>(null);

  // Base epoch for current day at 00:00 UTC
  const currentBaseSec = useMemo(() => {
    return currentTimeSec + windowOffsetHours * 3600;
  }, [currentTimeSec, windowOffsetHours]);

  const windowStartSec = currentBaseSec;
  const windowStopSec = windowStartSec + windowDurationHours * 3600;

  const currentZoom = ZOOM_LEVELS[zoomKey];
  const pxPerSec = currentZoom.pxPerHour / 3600;
  const totalTimelineWidth = windowDurationHours * currentZoom.pxPerHour;

  // Live wall clock timer (ticks every 15s to keep "Now" indicator real-time)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeSec(Math.floor(Date.now() / 1000));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Timeline Grid Data from SQLite Server API
  const fetchTimelineData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/m4/epg/timeline-grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromEpochSec: windowStartSec,
          toEpochSec: windowStopSec,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to load timeline grid`);
      }

      const data = await res.json();
      if (data && Array.isArray(data.channels)) {
        setTimelineChannels(data.channels);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to fetch timeline grid data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimelineData();
  }, [windowStartSec, windowStopSec]);

  // Extract distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    set.add('ALL');
    timelineChannels.forEach((c) => {
      if (c.category) set.add(c.category.toUpperCase());
    });
    set.add('UNMATCHED');
    return Array.from(set);
  }, [timelineChannels]);

  // Filter channels by category and search
  const filteredChannels = useMemo(() => {
    return timelineChannels.filter((ch) => {
      const matchesCat =
        selectedCategory === 'ALL' ||
        (selectedCategory === 'UNMATCHED' ? !ch.hasEpgData : ch.category?.toUpperCase() === selectedCategory);
      const matchesSearch =
        !searchQuery.trim() ||
        ch.channelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ch.tvgId && ch.tvgId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        ch.programmes.some((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [timelineChannels, selectedCategory, searchQuery]);

  // Scroll to "NOW" position
  const scrollToNow = () => {
    if (!scrollContainerRef.current) return;
    const nowOffsetSec = currentTimeSec - windowStartSec;
    if (nowOffsetSec >= 0 && nowOffsetSec <= windowDurationHours * 3600) {
      const nowPx = nowOffsetSec * pxPerSec;
      const containerWidth = scrollContainerRef.current.clientWidth - 240; // subtract channel column width
      const targetScroll = Math.max(0, nowPx - containerWidth / 3);
      scrollContainerRef.current.scrollTo({ left: targetScroll, behavior: 'smooth' });
    } else {
      // If current time is outside window, reset window to center on now
      setWindowOffsetHours(-3);
    }
  };

  // Initial scroll to now once data loads
  useEffect(() => {
    if (timelineChannels.length > 0) {
      setTimeout(() => scrollToNow(), 150);
    }
  }, [timelineChannels.length, zoomKey]);

  // Generate Time Ruler Slots (every 30 mins or 60 mins)
  const timeSlots = useMemo(() => {
    const slots: Array<{ sec: number; label: string; dateLabel: string; isHour: boolean }> = [];
    const stepSec = currentZoom.stepMins * 60;
    const startAligned = Math.floor(windowStartSec / stepSec) * stepSec;

    for (let sec = startAligned; sec <= windowStopSec; sec += stepSec) {
      const date = new Date(sec * 1000);
      const hours = date.getHours().toString().padStart(2, '0');
      const mins = date.getMinutes().toString().padStart(2, '0');
      const isHour = date.getMinutes() === 0;
      const dateLabel = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

      slots.push({
        sec,
        label: `${hours}:${mins}`,
        dateLabel,
        isHour,
      });
    }
    return slots;
  }, [windowStartSec, windowStopSec, currentZoom]);

  // Handle Tuning / Catchup
  const handlePlayProgram = (prog: UnifiedEpgProgram, channel: TimelineChannel) => {
    const isNow = currentTimeSec >= prog.startTimestampSec && currentTimeSec < prog.stopTimestampSec;
    const isPast = prog.stopTimestampSec <= currentTimeSec;

    if (isNow || prog.nowPlaying) {
      if (onTuneChannel) {
        onTuneChannel(channel.channelId, channel.channelName);
      }
      setCatchupNotice(`Tuned Live: ${channel.channelName} • "${prog.title}"`);
    } else if (isPast || prog.hasCatchupArchive) {
      const url = buildCatchupStreamUrl({
        channelId: String(channel.channelId),
        streamId: Number(channel.channelId) || 10452,
        programTitle: prog.title,
        startTime: new Date(prog.startTimestampSec * 1000),
        durationMinutes: prog.durationMinutes || 60,
        serverUrl: 'http://provider.panel-stream.net:8080',
        username: 'user1',
        password: 'pass1',
        archiveType: 'xtream_timeshift',
      });

      if (onPlayCatchup) {
        onPlayCatchup(url, `[Catchup] ${channel.channelName}: ${prog.title}`);
      }
      setCatchupNotice(`Catchup Timeshift launched: "${prog.title}" (${prog.durationMinutes}m)`);
    } else {
      setCatchupNotice(`"${prog.title}" is scheduled for future broadcast (${new Date(prog.startTimestampSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
    }
    setTimeout(() => setCatchupNotice(null), 4500);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (filteredChannels.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedChannelIndex((prev) => Math.min(filteredChannels.length - 1, prev + 1));
      setFocusedProgramIndex(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedChannelIndex((prev) => Math.max(0, prev - 1));
      setFocusedProgramIndex(0);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const currentCh = filteredChannels[focusedChannelIndex];
      if (currentCh && currentCh.programmes.length > 0) {
        setFocusedProgramIndex((prev) => Math.min(currentCh.programmes.length - 1, prev + 1));
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setFocusedProgramIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentCh = filteredChannels[focusedChannelIndex];
      if (currentCh) {
        const prog = currentCh.programmes[focusedProgramIndex];
        if (prog) {
          handlePlayProgram(prog, currentCh);
        } else if (onTuneChannel) {
          onTuneChannel(currentCh.channelId, currentCh.channelName);
        }
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      const currentCh = filteredChannels[focusedChannelIndex];
      if (currentCh && currentCh.programmes[focusedProgramIndex]) {
        setSelectedProgram({ prog: currentCh.programmes[focusedProgramIndex], channel: currentCh });
      }
    }
  };

  // Compute Now Line pixel position
  const nowLineLeftPx = (currentTimeSec - windowStartSec) * pxPerSec;
  const isNowInWindow = nowLineLeftPx >= 0 && nowLineLeftPx <= totalTimelineWidth;

  return (
    <div
      className="space-y-4 outline-none"
      id="epg-grid-surface"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Header & Controls Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-1">
              <Calendar className="w-4 h-4" />
              <span>Milestone 4b • Interactive 2D EPG Timeline Grid</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <span>Broadcast Timeline Matrix</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-medium">
                Live SQLite Backed
              </span>
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Continuous 2D matrix with synchronized time ruler, Catchup Timeshift triggers, and instant channel zapping.
            </p>
          </div>

          {/* Quick Actions & Navigation Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Time Jump Controls */}
            <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800 text-xs">
              <button
                id="btn-epg-jump-back-6h"
                onClick={() => setWindowOffsetHours((prev) => prev - 6)}
                title="Jump back 6 hours"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                id="btn-epg-jump-back-2h"
                onClick={() => setWindowOffsetHours((prev) => prev - 2)}
                title="Jump back 2 hours"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                id="btn-epg-jump-now"
                onClick={scrollToNow}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded flex items-center gap-1.5 shadow transition"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>NOW</span>
              </button>

              <button
                id="btn-epg-jump-fwd-2h"
                onClick={() => setWindowOffsetHours((prev) => prev + 2)}
                title="Jump forward 2 hours"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                id="btn-epg-jump-fwd-6h"
                onClick={() => setWindowOffsetHours((prev) => prev + 6)}
                title="Jump forward 6 hours"
                className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-slate-950 rounded-lg p-1 border border-slate-800 text-xs">
              {(['compact', 'standard', 'expanded'] as const).map((key) => (
                <button
                  key={key}
                  id={`btn-zoom-${key}`}
                  onClick={() => setZoomKey(key)}
                  className={`px-2.5 py-1 rounded font-medium transition ${
                    zoomKey === key
                      ? 'bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ZOOM_LEVELS[key].label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <button
              id="btn-epg-refresh"
              onClick={fetchTimelineData}
              disabled={isLoading}
              className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition disabled:opacity-50"
              title="Refresh Guide from SQLite"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Bar: Categories + Search Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
            <span className="text-slate-500 font-medium text-[11px] uppercase mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Genre:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                id={`btn-cat-${cat.toLowerCase()}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800/80'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              id="input-epg-search"
              type="text"
              placeholder="Search channels or shows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Catchup / Tuning Notification */}
      {catchupNotice && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-4 py-2.5 rounded-lg text-xs flex items-center justify-between gap-2 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-medium">{catchupNotice}</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">Stream Active</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-950/70 border border-red-800 text-red-300 px-4 py-2.5 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 2D TIMELINE MATRIX CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
        {/* Synchronized Scrolling Viewport */}
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-auto max-h-[580px] scrollbar-thin select-none relative"
        >
          <div
            ref={timelineContentRef}
            className="min-w-max relative"
            style={{ width: `${240 + totalTimelineWidth}px` }}
          >
            {/* Sticky Top Time Ruler */}
            <div className="sticky top-0 z-30 flex bg-slate-950 border-b border-slate-800 shadow-md">
              {/* Top-Left Channel Header Label */}
              <div className="sticky left-0 z-40 w-[240px] shrink-0 bg-slate-950 border-r border-slate-800 p-3 flex items-center justify-between font-bold text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Tv className="w-4 h-4 text-indigo-400" />
                  <span>Channels ({filteredChannels.length})</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">UTC</span>
              </div>

              {/* Time Slots Ruler */}
              <div className="relative h-11 flex items-center" style={{ width: `${totalTimelineWidth}px` }}>
                {timeSlots.map((slot, idx) => {
                  const leftPx = (slot.sec - windowStartSec) * pxPerSec;
                  return (
                    <div
                      key={slot.sec}
                      className={`absolute top-0 bottom-0 border-l flex flex-col justify-center pl-2 ${
                        slot.isHour ? 'border-slate-700/80 bg-slate-900/30' : 'border-slate-800/40'
                      }`}
                      style={{ left: `${leftPx}px`, width: `${(currentZoom.stepMins * 60) * pxPerSec}px` }}
                    >
                      <div className="text-[11px] font-bold font-mono text-slate-200">{slot.label}</div>
                      {slot.isHour && <div className="text-[9px] text-slate-500 truncate">{slot.dateLabel}</div>}
                    </div>
                  );
                })}

                {/* Top "Now" Line Indicator Badge */}
                {isNowInWindow && (
                  <div
                    className="absolute top-0 z-30 transform -translate-x-1/2 pointer-events-none"
                    style={{ left: `${nowLineLeftPx}px` }}
                  >
                    <div className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-b shadow-lg font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      <span>{new Date(currentTimeSec * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Vertical "Now Line" across all channel tracks */}
            {isNowInWindow && (
              <div
                className="absolute top-11 bottom-0 z-20 w-[2px] bg-red-500/90 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
                style={{ left: `${240 + nowLineLeftPx}px` }}
              />
            )}

            {/* Channel Rows Matrix */}
            <div className="divide-y divide-slate-800/80">
              {filteredChannels.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  No channels match your current search or category filter.
                </div>
              ) : (
                filteredChannels.map((channel, chIdx) => {
                  const isChannelFocused = focusedChannelIndex === chIdx;

                  return (
                    <div
                      key={channel.channelId}
                      className={`flex group transition-colors ${
                        isChannelFocused ? 'bg-slate-800/40' : 'hover:bg-slate-800/20'
                      }`}
                    >
                      {/* Sticky Left Channel Info Column */}
                      <div
                        id={`timeline-ch-header-${channel.channelId}`}
                        onClick={() => onTuneChannel && onTuneChannel(channel.channelId, channel.channelName)}
                        className={`sticky left-0 z-20 w-[240px] shrink-0 p-3 bg-slate-900 border-r border-slate-800 flex items-center justify-between gap-2.5 cursor-pointer select-none transition-colors ${
                          isChannelFocused ? 'bg-slate-850 ring-1 ring-inset ring-indigo-500/50' : 'group-hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {channel.iconSrc ? (
                            <img
                              src={channel.iconSrc}
                              alt={channel.channelName}
                              className="w-8 h-8 rounded object-contain bg-slate-950 p-0.5 shrink-0 border border-slate-800"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                              <Tv className="w-4 h-4 text-slate-400" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white truncate leading-tight group-hover:text-indigo-300 transition">
                              {channel.channelName}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-slate-500 font-mono">#{channel.channelId}</span>
                              {channel.category && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                  {channel.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center">
                          {channel.hasEpgData ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-400" title="EPG Active" />
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-800/80 font-medium">
                              No EPG
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Timeline Programs Track */}
                      <div
                        className="relative h-18 py-1.5 flex items-center"
                        style={{ width: `${totalTimelineWidth}px` }}
                      >
                        {/* Background Time Grid Guidelines */}
                        {timeSlots.map((slot) => {
                          const leftPx = (slot.sec - windowStartSec) * pxPerSec;
                          return (
                            <div
                              key={slot.sec}
                              className={`absolute top-0 bottom-0 border-l pointer-events-none ${
                                slot.isHour ? 'border-slate-800/60' : 'border-slate-800/20'
                              }`}
                              style={{ left: `${leftPx}px` }}
                            />
                          );
                        })}

                        {/* If Channel Has No EPG / Unmatched, render friendly fallback banner */}
                        {!channel.hasEpgData || channel.programmes.length === 0 ? (
                          <div
                            onClick={() => onTuneChannel && onTuneChannel(channel.channelId, channel.channelName)}
                            className="absolute inset-y-2 left-2 right-2 rounded-lg border border-dashed border-slate-700/80 bg-slate-950/40 hover:bg-slate-900/60 transition flex items-center justify-between px-4 cursor-pointer text-xs"
                          >
                            <span className="text-slate-400 flex items-center gap-2">
                              <Info className="w-3.5 h-3.5 text-slate-500" />
                              <span>No schedule guide broadcast for this channel • Active live stream</span>
                            </span>
                            <span className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                              <Play className="w-3 h-3 fill-current" /> Watch Live
                            </span>
                          </div>
                        ) : (
                          // Render Programme Cards positioned mathematically
                          channel.programmes.map((prog, pIdx) => {
                            const progStartSec = prog.startTimestampSec;
                            const progStopSec = prog.stopTimestampSec;

                            // Pixel calculations
                            const rawLeftPx = (progStartSec - windowStartSec) * pxPerSec;
                            const rawWidthPx = (progStopSec - progStartSec) * pxPerSec;

                            // Clamping calculations for programs straddling window edges
                            const visibleStartSec = Math.max(progStartSec, windowStartSec);
                            const visibleStopSec = Math.min(progStopSec, windowStopSec);
                            const renderLeftPx = Math.max(0, rawLeftPx);
                            const renderWidthPx = Math.max(24, (visibleStopSec - visibleStartSec) * pxPerSec - 2);

                            const isPast = progStopSec <= currentTimeSec;
                            const isNow = currentTimeSec >= progStartSec && currentTimeSec < progStopSec;
                            const isFuture = progStartSec > currentTimeSec;
                            const isProgramFocused = isChannelFocused && focusedProgramIndex === pIdx;

                            const startTimeStr = new Date(progStartSec * 1000).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });
                            const stopTimeStr = new Date(progStopSec * 1000).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            });

                            return (
                              <div
                                key={prog.id}
                                id={`prog-card-${prog.id}`}
                                onClick={() => setSelectedProgram({ prog, channel })}
                                onDoubleClick={() => handlePlayProgram(prog, channel)}
                                className={`absolute top-1.5 bottom-1.5 rounded-lg border transition-all cursor-pointer overflow-hidden p-2 flex flex-col justify-between select-none ${
                                  isNow
                                    ? 'bg-slate-800/95 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40 z-10'
                                    : isPast
                                    ? 'bg-slate-950/70 border-slate-800/90 hover:bg-slate-800/80 hover:border-purple-500/60'
                                    : 'bg-slate-950/90 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                                } ${isProgramFocused ? 'ring-2 ring-indigo-400' : ''}`}
                                style={{
                                  left: `${renderLeftPx}px`,
                                  width: `${renderWidthPx}px`,
                                }}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 text-[10px] leading-tight mb-0.5">
                                    <span className="font-mono text-slate-400 font-medium">
                                      {startTimeStr} - {stopTimeStr}
                                    </span>
                                    {isNow && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500 text-slate-950 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" /> LIVE
                                      </span>
                                    )}
                                    {isPast && prog.hasCatchupArchive && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-purple-950 text-purple-300 border border-purple-800">
                                        Replay
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-xs font-bold text-white truncate leading-tight">
                                    {prog.title}
                                  </div>

                                  {renderWidthPx > 180 && prog.description && (
                                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                      {prog.description}
                                    </div>
                                  )}
                                </div>

                                {/* Bottom Airtime Progress Bar for Live Show */}
                                {isNow && (
                                  <div className="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden shrink-0">
                                    <div
                                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${Math.min(
                                          100,
                                          Math.max(
                                            0,
                                            Math.round(
                                              ((currentTimeSec - progStartSec) / (progStopSec - progStartSec)) * 100
                                            )
                                          )
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Timeline Footer Legend & Keyboard Hints */}
        <div className="bg-slate-950 border-t border-slate-800 px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-300">Live On Air</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-purple-500" />
              <span className="text-slate-300">Catchup Timeshift Ready</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-700" />
              <span className="text-slate-300">Upcoming Broadcast</span>
            </span>
          </div>

          <div className="text-[11px] text-slate-500 flex items-center gap-2">
            <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">↑↓ Channels</span>
            <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">←→ Shows</span>
            <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">Enter to Play</span>
            <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-mono">Space Details</span>
          </div>
        </div>
      </div>

      {/* PROGRAM DETAILS MODAL / DRAWER */}
      {selectedProgram && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl animate-fadeIn space-y-4">
          <div className="flex flex-col md:flex-row items-start justify-between gap-6">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                  {selectedProgram.prog.category || 'General'}
                </span>
                <span className="text-xs text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  {new Date(selectedProgram.prog.startTimestampSec * 1000).toLocaleTimeString()} -{' '}
                  {new Date(selectedProgram.prog.stopTimestampSec * 1000).toLocaleTimeString()} (
                  {selectedProgram.prog.durationMinutes}m)
                </span>
                {selectedProgram.prog.starRating && (
                  <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/60">
                    <Star className="w-3.5 h-3.5 fill-current" /> {selectedProgram.prog.starRating}
                  </span>
                )}
                {currentTimeSec >= selectedProgram.prog.startTimestampSec &&
                  currentTimeSec < selectedProgram.prog.stopTimestampSec && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ON AIR NOW
                    </span>
                  )}
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">{selectedProgram.prog.title}</h3>
                {selectedProgram.prog.subTitle && (
                  <div className="text-xs text-indigo-300 font-medium">{selectedProgram.prog.subTitle}</div>
                )}
                <div className="text-xs text-slate-400 mt-0.5">
                  Airing on <strong className="text-slate-200">{selectedProgram.channel.channelName}</strong>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                {selectedProgram.prog.description || 'No detailed synopsis provided in XMLTV broadcast schedule.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 shrink-0 w-full md:w-auto">
              <button
                id="btn-modal-play-action"
                onClick={() => {
                  handlePlayProgram(selectedProgram.prog, selectedProgram.channel);
                  setSelectedProgram(null);
                }}
                className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg"
              >
                {currentTimeSec >= selectedProgram.prog.startTimestampSec &&
                currentTimeSec < selectedProgram.prog.stopTimestampSec ? (
                  <>
                    <Play className="w-4 h-4 fill-current" /> Watch Live Now
                  </>
                ) : selectedProgram.prog.stopTimestampSec <= currentTimeSec ? (
                  <>
                    <RotateCcw className="w-4 h-4" /> Replay with Catchup
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4" /> Tune to Channel
                  </>
                )}
              </button>

              <button
                onClick={() => setSelectedProgram(null)}
                className="px-5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition text-center"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


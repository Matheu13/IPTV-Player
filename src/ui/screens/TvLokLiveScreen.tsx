import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Tv,
  Star,
  Film,
  Radio,
  Baby,
  Music,
  Globe,
  Trophy,
  Search,
  Maximize2,
  Volume2,
  VolumeX,
  Play,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Filter,
  X,
  Info,
  Layers,
  History,
  Folder,
  SlidersHorizontal,
} from 'lucide-react';
import { ChannelRowData } from '../components/ChannelRow';
import { isSportsChannel } from '../components/TvLokLiveInterface';
import { usePlayback } from '../context/PlaybackContext';
import { useProfile } from '../context/ProfileContext';
import { globalUnifiedIptvEngine, UnifiedChannel } from '../../lib/unifiedIptvEngine';
import { VideoPlayerShell } from '../components/VideoPlayerShell';

// ==========================================
// EPG Timeline Geometry & Constants
// ==========================================
const BASE_HOUR = 18; // 18:00
const TOTAL_HOURS = 8; // 18:00 to 02:00
const SLOT_DURATION_MINUTES = 30;
const SLOT_WIDTH_PX = 144; // 144px per 30 minutes = 4.8px per minute
const PIXELS_PER_MINUTE = SLOT_WIDTH_PX / SLOT_DURATION_MINUTES; // 4.8
const CHANNEL_COL_WIDTH = 270; // 270px fixed channel column

// Fixed 30-minute time slots from 18:00 to 02:00
const TIME_SLOTS = [
  '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
  '00:00', '00:30', '01:00', '01:30',
];

// Current virtual broadcast time for timeline alignment: 20:45 (165 minutes from 18:00)
const CURRENT_TIME_MINUTES = 165;

export interface EpgBlock {
  id: string;
  channelId: string;
  title: string;
  description: string;
  start: string;
  stop: string;
  startMinute: number; // minutes from 18:00
  durationMinutes: number;
  isLive: boolean;
  progressPercent?: number;
  remainingMinutes?: number;
  category?: string;
  hasRealEpg: boolean;
}

export interface ChannelWithSchedule {
  channel: ChannelRowData;
  programmes: EpgBlock[];
  hasRealEpg: boolean;
}

const ROW_HEIGHT = 56;
const OVERSCAN = 10;

// High-performance single channel schedule synthesizer (only invoked for visible DOM slice)
function buildScheduleForChannel(ch: ChannelRowData): ChannelWithSchedule {
  const hasRealEpg = Boolean(ch.nowProgramme && ch.nowProgramme.title);
  const isSports = ch.category?.toLowerCase().includes('sport') || ch.name.toLowerCase().includes('sport');
  const isNews = ch.category?.toLowerCase().includes('news') || ch.name.toLowerCase().includes('news');
  const isMovie = ch.category?.toLowerCase().includes('movie') || ch.name.toLowerCase().includes('film');

  let programmes: EpgBlock[] = [];

  if (hasRealEpg) {
    const prog1Title = isSports
      ? 'Pre-Match Studio & Tactical Preview'
      : isNews
      ? 'Evening Global News Edition'
      : isMovie
      ? 'Early Evening Feature Showcase'
      : 'Afternoon Entertainment Live';

    const prog2Title = ch.nowProgramme?.title || (isSports ? 'Live Match Broadcast' : 'Prime Time Feature');

    const prog3Title =
      ch.nextProgramme?.title ||
      (isSports
        ? 'Post-Match Analysis & Reaction'
        : isNews
        ? 'Nightly World In-Depth Report'
        : 'Late Night Cinema Feature');

    const prog4Title = isSports
      ? 'Sports Highlights & Replay'
      : isNews
      ? 'Overnight News Feed'
      : 'Late Broadcast Programming';

    programmes = [
      {
        id: `epg-${ch.id}-p1`,
        channelId: ch.id,
        title: prog1Title,
        description: 'Comprehensive lead-in coverage with expert panel and background analysis.',
        start: '18:00',
        stop: '20:00',
        startMinute: 0,
        durationMinutes: 120,
        isLive: false,
        hasRealEpg: true,
      },
      {
        id: `epg-${ch.id}-p2`,
        channelId: ch.id,
        title: prog2Title,
        description: ch.nowProgramme?.description || 'Main prime-time broadcast transmission live from the venue.',
        start: '20:00',
        stop: '22:00',
        startMinute: 120,
        durationMinutes: 120,
        isLive: true,
        progressPercent: 55,
        remainingMinutes: 45,
        hasRealEpg: true,
      },
      {
        id: `epg-${ch.id}-p3`,
        channelId: ch.id,
        title: prog3Title,
        description: ch.nextProgramme?.description || 'Scheduled continuation following the prime broadcast window.',
        start: '22:00',
        stop: '23:30',
        startMinute: 240,
        durationMinutes: 90,
        isLive: false,
        hasRealEpg: true,
      },
      {
        id: `epg-${ch.id}-p4`,
        channelId: ch.id,
        title: prog4Title,
        description: 'Extended coverage, night bulletins, and network round-up.',
        start: '23:30',
        stop: '02:00',
        startMinute: 330,
        durationMinutes: 150,
        isLive: false,
        hasRealEpg: true,
      },
    ];
  } else {
    programmes = [
      {
        id: `epg-${ch.id}-fallback-1`,
        channelId: ch.id,
        title: `${ch.name} Live Transmission`,
        description: 'Live scheduled programming from provider feed.',
        start: '18:00',
        stop: '21:00',
        startMinute: 0,
        durationMinutes: 180,
        isLive: true,
        progressPercent: 50,
        remainingMinutes: 90,
        hasRealEpg: false,
      },
      {
        id: `epg-${ch.id}-fallback-2`,
        channelId: ch.id,
        title: `${ch.name} Continuous Programming`,
        description: 'High-definition continuous network stream.',
        start: '21:00',
        stop: '02:00',
        startMinute: 180,
        durationMinutes: 300,
        isLive: false,
        hasRealEpg: false,
      },
    ];
  }

  return {
    channel: ch,
    programmes,
    hasRealEpg,
  };
}

// Persistent session cache so returning from playback restores the exact channel, category, programme, and scroll state
interface PersistentLiveTvState {
  selectedCategoryId: string;
  searchQuery: string;
  focusedChannelId: string | null;
  focusedProgramId: string | null;
  timelineFocusMinute: number;
  scrollLeft: number;
  scrollTop: number;
  activeFocusArea: 'categories' | 'grid' | 'search';
}

const persistentState: PersistentLiveTvState = {
  selectedCategoryId: 'all',
  searchQuery: '',
  focusedChannelId: null,
  focusedProgramId: null,
  timelineFocusMinute: CURRENT_TIME_MINUTES,
  scrollLeft: 0,
  scrollTop: 0,
  activeFocusArea: 'categories',
};

export interface TvLokLiveScreenProps {
  onSelectChannel?: (channel: ChannelRowData) => void;
  isTvMode?: boolean;
}

export const TvLokLiveScreen: React.FC<TvLokLiveScreenProps> = ({ onSelectChannel, isTvMode }) => {
  const { state: playbackState, playChannel, setPresentationMode } = usePlayback();
  const { isKidsMode, filterChannelsForProfile } = useProfile();

  // Navigation & Focus Area: 'search' | 'categories' | 'grid'
  const [activeFocusArea, setActiveFocusArea] = useState<'categories' | 'grid' | 'search'>(
    persistentState.activeFocusArea
  );

  // Ingested Channel Data from existing engine
  const [rawChannels, setRawChannels] = useState<ChannelRowData[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentChannelIds, setRecentChannelIds] = useState<string[]>([]);
  const [sourcesList, setSourcesList] = useState<{ id: string; name: string }[]>([]);

  // Category & Filter States initialized from persistentState
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(persistentState.selectedCategoryId);
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>(persistentState.searchQuery);
  const [focusedChannelIndex, setFocusedChannelIndex] = useState<number>(0);
  const [focusedProgramId, setFocusedProgramId] = useState<string | null>(persistentState.focusedProgramId);
  const [timelineFocusMinute, setTimelineFocusMinute] = useState<number>(persistentState.timelineFocusMinute);

  // Live Local Date & Time
  const [currentDateTime, setCurrentDateTime] = useState<Date>(() => new Date());

  // Virtual Windowing State for 60fps scrolling with 10k+ channels
  const [gridScrollTop, setGridScrollTop] = useState<number>(persistentState.scrollTop || 0);
  const [viewportHeight, setViewportHeight] = useState<number>(600);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef<boolean>(true);

  // Debounced channel tuning handler
  const handleTuneChannel = useCallback(
    (channel: ChannelRowData) => {
      persistentState.focusedChannelId = channel.id;
      if (onSelectChannel) {
        onSelectChannel(channel);
      } else {
        playChannel(channel, 'embedded');
      }
    },
    [onSelectChannel, playChannel]
  );

  // 1. INGESTION: Synchronize from existing application store without modifying ingestion pipeline
  useEffect(() => {
    const syncData = () => {
      const allUnified = globalUnifiedIptvEngine.getAllChannels();
      const favs = new Set(globalUnifiedIptvEngine.getFavorites());
      const recents = globalUnifiedIptvEngine.getRecentChannels().map((c) => c.id);
      const sources = globalUnifiedIptvEngine.getSources().map((s) => ({ id: s.id, name: s.name }));

      setFavorites(favs);
      setRecentChannelIds(recents);
      setSourcesList(sources);

      const mapped: ChannelRowData[] = allUnified.map((c: any, idx) => ({
        id: c.id,
        channelNumber: c.channelNumber || idx + 1,
        name: c.name,
        logo: c.logoUrl || c.logo || undefined,
        category: c.category || 'General',
        sourceId: c.sourceId,
        sourceName: c.sourceName,
        sourceType: c.sourceType,
        streamUrl: c.streamUrl,
        nowProgramme: c.epgNow
          ? {
              title: c.epgNow.title,
              start: c.epgNow.startTime || '20:00',
              stop: c.epgNow.endTime || '22:00',
              progressPercent: 55,
              description: c.epgNow.description,
            }
          : undefined,
        nextProgramme: c.epgNext
          ? {
              title: c.epgNext.title,
              start: c.epgNext.startTime || '22:00',
              stop: c.epgNext.endTime || '23:30',
              description: c.epgNext.description,
            }
          : undefined,
        is4k: Boolean(c.resolution?.includes('4K')),
        isFavorite: favs.has(c.id),
      }));

      setRawChannels(mapped);
    };

    syncData();
    const unsubscribe = globalUnifiedIptvEngine.subscribe(syncData);
    return () => unsubscribe();
  }, []);

  // Timer for system local date/time in guide header
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Format date/time e.g. "Sat, Sep 5, 15:36" using local system time
  const formattedDateTime = useMemo(() => {
    const weekday = currentDateTime.toLocaleDateString(undefined, { weekday: 'short' });
    const month = currentDateTime.toLocaleDateString(undefined, { month: 'short' });
    const day = currentDateTime.getDate();
    const time = currentDateTime.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${weekday}, ${month} ${day}, ${time}`;
  }, [currentDateTime]);

  // 2. EXTRACT ALL DYNAMIC PROVIDER CATEGORIES WITHOUT TRUNCATION
  const dynamicCategories = useMemo(() => {
    const categoryCountMap = new Map<string, number>();

    rawChannels.forEach((ch) => {
      const cat = ch.category?.trim();
      if (cat) {
        categoryCountMap.set(cat, (categoryCountMap.get(cat) || 0) + 1);
      }
    });

    const sorted = Array.from(categoryCountMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return sorted.map(([name, count]) => ({
      id: `cat:${name}`,
      label: name,
      count,
      isProviderCategory: true,
    }));
  }, [rawChannels]);

  // Combined full list of categories for Panel 2
  const allCategoryEntries = useMemo(() => {
    const sportsCount = rawChannels.filter(isSportsChannel).length;

    const items: Array<{
      id: string;
      label: string;
      count?: number;
      type: 'system' | 'header' | 'provider';
      icon?: any;
    }> = [
      { id: 'header:playlists', label: 'All Playlists', type: 'header' },
      { id: 'all', label: 'All Channels', count: rawChannels.length, type: 'system', icon: Tv },
      { id: 'sports', label: 'Sports', count: sportsCount, type: 'system', icon: Trophy },
      { id: 'favorites', label: 'Favorites', count: favorites.size, type: 'system', icon: Star },
      { id: 'history', label: 'History', count: recentChannelIds.length, type: 'system', icon: History },
    ];

    // Source / Provider groupings if multiple sources exist
    if (sourcesList.length > 0) {
      sourcesList.forEach((src) => {
        const count = rawChannels.filter((c) => c.sourceId === src.id).length;
        if (count > 0) {
          items.push({
            id: `source:${src.id}`,
            label: src.name || 'IPTV Provider',
            count,
            type: 'system',
            icon: Folder,
          });
        }
      });
    }

    if (dynamicCategories.length > 0) {
      items.push({ id: 'header:categories', label: 'Live Categories', type: 'header' });
      dynamicCategories.forEach((cat) => {
        items.push({
          id: cat.id,
          label: cat.label,
          count: cat.count,
          type: 'provider',
          icon: Layers,
        });
      });
    }

    return items;
  }, [favorites.size, recentChannelIds.length, rawChannels, sourcesList, dynamicCategories]);

  // Filterable selectable categories (skipping section headers)
  const selectableCategoryEntries = useMemo(() => {
    return allCategoryEntries.filter((c) => c.type !== 'header');
  }, [allCategoryEntries]);

  // Keep focusedCategoryIndex valid
  useEffect(() => {
    const idx = selectableCategoryEntries.findIndex((c) => c.id === selectedCategoryId);
    if (idx >= 0) {
      setFocusedCategoryIndex(idx);
    }
  }, [selectedCategoryId, selectableCategoryEntries]);

  // 3. FILTER CHANNELS BASED ON SELECTED CATEGORY & SEARCH
  const filteredChannels = useMemo(() => {
    let list = rawChannels;

    if (isKidsMode) {
      list = filterChannelsForProfile(list);
    }

    if (selectedCategoryId === 'favorites') {
      list = list.filter((c) => favorites.has(c.id));
    } else if (selectedCategoryId === 'history') {
      const historySet = new Set(recentChannelIds);
      list = list.filter((c) => historySet.has(c.id));
    } else if (selectedCategoryId === 'sports') {
      list = list.filter(isSportsChannel);
    } else if (selectedCategoryId.startsWith('source:')) {
      const srcId = selectedCategoryId.replace('source:', '');
      list = list.filter((c) => c.sourceId === srcId);
    } else if (selectedCategoryId.startsWith('cat:')) {
      const catName = selectedCategoryId.replace('cat:', '');
      list = list.filter((c) => c.category?.trim() === catName);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          c.nowProgramme?.title?.toLowerCase().includes(q) ||
          String(c.channelNumber).includes(q)
      );
    }

    return list;
  }, [rawChannels, selectedCategoryId, searchQuery, isKidsMode, favorites, recentChannelIds, filterChannelsForProfile]);

  // Update viewport height on mount and resize for accurate virtualization
  useEffect(() => {
    const updateViewportHeight = () => {
      if (gridContainerRef.current) {
        setViewportHeight(gridContainerRef.current.clientHeight || 600);
      }
    };
    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    return () => window.removeEventListener('resize', updateViewportHeight);
  }, []);

  // Safe index within bounds
  const safeChannelIndex = Math.max(
    0,
    Math.min(focusedChannelIndex, Math.max(0, filteredChannels.length - 1))
  );
  const currentChannel = filteredChannels[safeChannelIndex] || null;
  const currentChannelSchedule = useMemo(() => {
    return currentChannel ? buildScheduleForChannel(currentChannel) : null;
  }, [currentChannel]);
  const isChannelPlaying = playbackState.currentChannel?.id === currentChannel?.id && playbackState.isPlaying;

  // Virtualized rows slice computation
  const totalRows = filteredChannels.length;
  const startIndex = Math.max(0, Math.floor(gridScrollTop / ROW_HEIGHT) - OVERSCAN);
  const endIndex = Math.min(totalRows, Math.ceil((gridScrollTop + viewportHeight) / ROW_HEIGHT) + OVERSCAN);

  const visibleRows = useMemo(() => {
    return filteredChannels.slice(startIndex, endIndex).map((ch, idx) => ({
      rowIdx: startIndex + idx,
      scheduleItem: buildScheduleForChannel(ch),
    }));
  }, [filteredChannels, startIndex, endIndex]);

  const topSpacerHeight = startIndex * ROW_HEIGHT;
  const bottomSpacerHeight = Math.max(0, (totalRows - endIndex) * ROW_HEIGHT);

  // Find active program on current channel matching timelineFocusMinute
  const focusedProgram = useMemo(() => {
    if (!currentChannelSchedule) return null;
    const progs = currentChannelSchedule.programmes;
    if (focusedProgramId) {
      const match = progs.find((p) => p.id === focusedProgramId);
      if (match) return match;
    }
    const matchByTime = progs.find(
      (p) =>
        timelineFocusMinute >= p.startMinute &&
        timelineFocusMinute < p.startMinute + p.durationMinutes
    );
    return matchByTime || progs[0] || null;
  }, [currentChannelSchedule, focusedProgramId, timelineFocusMinute]);

  // Synchronize persistentState
  useEffect(() => {
    persistentState.selectedCategoryId = selectedCategoryId;
    persistentState.searchQuery = searchQuery;
    persistentState.focusedChannelId = currentChannel?.id || null;
    persistentState.focusedProgramId = focusedProgram?.id || null;
    persistentState.timelineFocusMinute = timelineFocusMinute;
    persistentState.activeFocusArea = activeFocusArea;
  }, [selectedCategoryId, searchQuery, currentChannel, focusedProgram, timelineFocusMinute, activeFocusArea]);

  // Scroll category item into view when navigating
  useEffect(() => {
    if (activeFocusArea === 'categories') {
      const activeEl = document.getElementById(`cat-item-${selectedCategoryId}`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedCategoryId, activeFocusArea]);

  // Scroll channel row and program into view when navigating
  useEffect(() => {
    if (activeFocusArea === 'grid' && currentChannel) {
      const rowEl = document.getElementById(`channel-row-${currentChannel.id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (gridContainerRef.current) {
        const targetTop = safeChannelIndex * ROW_HEIGHT;
        gridContainerRef.current.scrollTop = Math.max(0, targetTop - viewportHeight / 3);
      }
    }
  }, [safeChannelIndex, activeFocusArea, currentChannel, viewportHeight]);

  // Restore scroll coordinates on mount
  useEffect(() => {
    if (isInitialMount.current && gridContainerRef.current) {
      gridContainerRef.current.scrollLeft = persistentState.scrollLeft;
      gridContainerRef.current.scrollTop = persistentState.scrollTop;
      setGridScrollTop(persistentState.scrollTop || 0);
      isInitialMount.current = false;
    }
  }, []);

  const handleGridScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const st = e.currentTarget.scrollTop;
    setGridScrollTop(st);
    persistentState.scrollLeft = e.currentTarget.scrollLeft;
    persistentState.scrollTop = st;
  };

  const handleToggleFavorite = (channelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    globalUnifiedIptvEngine.toggleFavorite(channelId);
  };

  // =========================================================================
  // KEYBOARD & D-PAD REMOTE NAVIGATION
  // =========================================================================
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // If typing inside search input, allow normal typing
      if (document.activeElement === searchInputRef.current) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          searchInputRef.current?.blur();
          setActiveFocusArea('categories');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          searchInputRef.current?.blur();
          setActiveFocusArea('grid');
        }
        return;
      }

      // 1. NAVIGATION IN PANEL 2 (CATEGORIES COLUMN)
      if (activeFocusArea === 'categories') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (focusedCategoryIndex > 0) {
            const nextIdx = focusedCategoryIndex - 1;
            setFocusedCategoryIndex(nextIdx);
            setSelectedCategoryId(selectableCategoryEntries[nextIdx].id);
            setFocusedChannelIndex(0);
          } else {
            setActiveFocusArea('search');
            searchInputRef.current?.focus();
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (focusedCategoryIndex < selectableCategoryEntries.length - 1) {
            const nextIdx = focusedCategoryIndex + 1;
            setFocusedCategoryIndex(nextIdx);
            setSelectedCategoryId(selectableCategoryEntries[nextIdx].id);
            setFocusedChannelIndex(0);
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          setActiveFocusArea('grid');
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (selectableCategoryEntries[focusedCategoryIndex]) {
            setSelectedCategoryId(selectableCategoryEntries[focusedCategoryIndex].id);
            setActiveFocusArea('grid');
          }
        }
        return;
      }

      // 2. NAVIGATION IN PANEL 3 (CHANNEL / EPG GRID)
      if (activeFocusArea === 'grid') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (safeChannelIndex > 0) {
            const nextIdx = safeChannelIndex - 1;
            setFocusedChannelIndex(nextIdx);
            const nextChannel = filteredChannels[nextIdx];
            if (nextChannel) {
              const nextSchedule = buildScheduleForChannel(nextChannel);
              const matchingProg = nextSchedule.programmes.find(
                (p) =>
                  timelineFocusMinute >= p.startMinute &&
                  timelineFocusMinute < p.startMinute + p.durationMinutes
              );
              if (matchingProg) {
                setFocusedProgramId(matchingProg.id);
              }
            }
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (safeChannelIndex < filteredChannels.length - 1) {
            const nextIdx = safeChannelIndex + 1;
            setFocusedChannelIndex(nextIdx);
            const nextChannel = filteredChannels[nextIdx];
            if (nextChannel) {
              const nextSchedule = buildScheduleForChannel(nextChannel);
              const matchingProg = nextSchedule.programmes.find(
                (p) =>
                  timelineFocusMinute >= p.startMinute &&
                  timelineFocusMinute < p.startMinute + p.durationMinutes
              );
              if (matchingProg) {
                setFocusedProgramId(matchingProg.id);
              }
            }
          }
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (currentChannelSchedule && focusedProgram) {
            const progs = currentChannelSchedule.programmes;
            const currentProgIdx = progs.findIndex((p) => p.id === focusedProgram.id);
            if (currentProgIdx > 0) {
              const prevProg = progs[currentProgIdx - 1];
              setFocusedProgramId(prevProg.id);
              setTimelineFocusMinute(prevProg.startMinute);
            } else {
              // Left boundary reached: return to Category Panel (Panel 2)
              setActiveFocusArea('categories');
            }
          } else {
            setActiveFocusArea('categories');
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (currentChannelSchedule && focusedProgram) {
            const progs = currentChannelSchedule.programmes;
            const currentProgIdx = progs.findIndex((p) => p.id === focusedProgram.id);
            if (currentProgIdx < progs.length - 1) {
              const nextProg = progs[currentProgIdx + 1];
              setFocusedProgramId(nextProg.id);
              setTimelineFocusMinute(nextProg.startMinute);
            }
          }
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (currentChannelSchedule) {
            handleTuneChannel(currentChannelSchedule.channel);
          }
        }
      }
    },
    [
      activeFocusArea,
      focusedCategoryIndex,
      selectableCategoryEntries,
      filteredChannels,
      safeChannelIndex,
      currentChannelSchedule,
      focusedProgram,
      timelineFocusMinute,
      handleTuneChannel,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex-1 flex h-full bg-[#080b11] text-slate-100 select-none overflow-hidden font-sans">
      {/* ========================================================================= */}
      {/* PANEL 2: LIVE TV CATEGORY COLUMN                                          */}
      {/* Exposes every single provider category dynamically without truncation     */}
      {/* ========================================================================= */}
      <aside className="w-64 md:w-72 bg-[#090d16] border-r border-white/10 flex flex-col shrink-0 z-30 shadow-2xl">
        {/* Search Header */}
        <div className="p-3.5 border-b border-white/10">
          <div
            className={`relative flex items-center bg-[#121824] rounded-xl px-3 py-2 border transition-all ${
              activeFocusArea === 'search'
                ? 'border-cyan-400 ring-2 ring-cyan-500/30 bg-[#162032]'
                : 'border-white/10 hover:border-white/20'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setActiveFocusArea('search')}
              placeholder="Search live channels..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 outline-none font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-white p-0.5"
                title="Clear Search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Categories List (Full vertical scroll without truncation) */}
        <div
          ref={categoryListRef}
          className="flex-1 overflow-y-auto px-2 py-2.5 space-y-1 custom-scrollbar focus:outline-none"
        >
          {allCategoryEntries.map((item) => {
            if (item.type === 'header') {
              return (
                <div
                  key={item.id}
                  className="px-3 pt-3 pb-1 text-[11px] font-black tracking-wider uppercase text-slate-400 select-none"
                >
                  {item.label}
                </div>
              );
            }

            const isSelected = selectedCategoryId === item.id;
            const isCategoryFocused = activeFocusArea === 'categories' && isSelected;
            const IconComponent = item.icon || Layers;

            return (
              <button
                key={item.id}
                id={`cat-item-${item.id}`}
                onClick={() => {
                  setSelectedCategoryId(item.id);
                  setActiveFocusArea('grid');
                  setFocusedChannelIndex(0);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all cursor-pointer ${
                  isCategoryFocused
                    ? 'bg-cyan-500/20 text-white border-l-4 border-l-cyan-400 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : isSelected
                    ? 'bg-[#151f30] text-cyan-300 border-l-4 border-l-cyan-500/50'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <IconComponent
                    className={`w-4 h-4 shrink-0 ${
                      isSelected ? 'text-cyan-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md shrink-0 font-bold ${
                      isSelected
                        ? 'bg-cyan-500/30 text-cyan-200'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* PANEL 3: LIVE PREVIEW + CHANNEL / EPG GUIDE                               */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-[#080b11] overflow-hidden">
        {/* ======================================================================= */}
        {/* TOP SECTION: LIVE PREVIEW + PROGRAM INFORMATION                          */}
        {/* ======================================================================= */}
        <section className="bg-[#0c111e] border-b border-white/10 p-4 shrink-0 shadow-2xl z-20">
          <div className="flex flex-col lg:flex-row items-stretch gap-5">
            {/* 1. Live Preview Video Player (Television 16:9 Aspect Ratio) */}
            <div className="w-full lg:w-84 xl:w-96 aspect-video bg-black rounded-xl overflow-hidden border border-white/10 relative shadow-2xl shrink-0 group">
              {currentChannel ? (
                <div className="w-full h-full relative">
                  <VideoPlayerShell
                    channel={currentChannel}
                    forceMode="embedded"
                    autoPlay={true}
                    isLivePreview={!isChannelPlaying}
                    showControls={isChannelPlaying}
                    className="w-full h-full"
                  />
                  {isChannelPlaying ? (
                    <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-600/90 text-white font-black text-[10px] tracking-wider uppercase shadow pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      LIVE
                    </div>
                  ) : (
                    <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-600/90 text-white font-black text-[10px] tracking-wider uppercase shadow border border-cyan-400/40 pointer-events-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-200 animate-pulse" />
                      LIVE PREVIEW
                    </div>
                  )}

                  {/* Quick Action Overlay on Preview */}
                  <div className="absolute bottom-2.5 inset-x-2.5 z-30 flex items-center justify-between pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isChannelPlaying && (
                      <button
                        onClick={() => handleTuneChannel(currentChannel)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] shadow-lg transition cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>TUNE [OK]</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        handleTuneChannel(currentChannel);
                        setPresentationMode('fullscreen');
                      }}
                      className="ml-auto flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 hover:bg-cyan-600 text-slate-200 hover:text-white text-[10px] font-semibold border border-white/20 shadow-md backdrop-blur transition cursor-pointer"
                      title="Open Fullscreen Player"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>FULLSCREEN</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-full h-full relative flex flex-col items-center justify-center bg-gradient-to-br from-[#111928] to-[#070b13] p-4 text-center">
                  <Tv className="w-14 h-14 text-cyan-400/80" />
                  <span className="text-xs text-slate-400 mt-2">Select a channel to preview</span>
                </div>
              )}
            </div>

            {/* 2. Program Information to the right of the preview */}
            <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
              <div className="space-y-1.5">
                {/* Channel & Category Hierarchy */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-cyan-400 font-mono font-black text-xs border border-cyan-500/30">
                    CH {currentChannel?.channelNumber || safeChannelIndex + 1}
                  </span>

                  <span className="text-sm font-black text-white truncate">
                    {currentChannel?.name || 'Select a Channel'}
                  </span>

                  <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 text-[10px] font-medium">
                    {currentChannel?.category || 'General Broadcast'}
                  </span>

                  {focusedProgram?.isLive && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-black tracking-wide uppercase animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      LIVE
                    </span>
                  )}
                </div>

                {/* Programme Title */}
                <h1 className="text-lg md:text-xl font-black text-white tracking-tight truncate">
                  {focusedProgram?.title || 'No program information'}
                </h1>

                {/* Programme Synopsis */}
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {focusedProgram?.description || 'No program information available for this time slot.'}
                </p>

                {/* Time Range & Progress Bar */}
                <div className="flex items-center gap-3 text-xs text-slate-300 font-medium pt-1 flex-wrap">
                  <div className="flex items-center gap-1.5 font-mono text-cyan-300 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      {focusedProgram ? `${focusedProgram.start} – ${focusedProgram.stop}` : '--:--'}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span>{focusedProgram?.durationMinutes || 0} mins</span>
                  </div>

                  {focusedProgram?.isLive && focusedProgram.progressPercent !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-white/10">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                          style={{ width: `${focusedProgram.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {focusedProgram.remainingMinutes} min left
                      </span>
                    </div>
                  )}
                </div>

                {/* Up Next Preview */}
                {currentChannel?.nextProgramme && (
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-0.5">
                    <span className="text-cyan-400 font-semibold uppercase tracking-wider text-[10px]">
                      Up Next:
                    </span>
                    <span className="font-bold text-slate-200">
                      {currentChannel.nextProgramme.title}
                    </span>
                    <span>({currentChannel.nextProgramme.start})</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 pt-1">
                {currentChannel && (
                  <button
                    onClick={() => handleTuneChannel(currentChannel)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs tracking-wide transition-all shadow-lg cursor-pointer ${
                      isChannelPlaying
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30 ring-2 ring-emerald-400'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/30 hover:scale-105'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isChannelPlaying ? 'NOW PLAYING' : 'TUNE CHANNEL [OK]'}</span>
                  </button>
                )}

                {isChannelPlaying && (
                  <button
                    onClick={() => setPresentationMode('fullscreen')}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition cursor-pointer text-xs font-bold"
                    title="Fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>FULLSCREEN</span>
                  </button>
                )}

                {currentChannel && (
                  <button
                    onClick={(e) => handleToggleFavorite(currentChannel.id, e)}
                    className={`p-2 rounded-xl border border-white/10 transition cursor-pointer ${
                      favorites.has(currentChannel.id)
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                        : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                    }`}
                    title="Toggle Favorite"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        favorites.has(currentChannel.id) ? 'fill-current' : ''
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ======================================================================= */}
        {/* DATE / TIME HEADER BAR & EPG TIME SLOTS                                 */}
        {/* ======================================================================= */}
        <div className="bg-[#0e1422] border-b border-white/10 flex items-center text-xs shrink-0 select-none z-10">
          {/* Top-Left Date / Time Label (Aligned with Channel Column) */}
          <div
            style={{ width: `${CHANNEL_COL_WIDTH}px` }}
            className="shrink-0 px-4 py-2 border-r border-white/10 flex items-center justify-between font-bold text-white bg-[#090e18]"
          >
            <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-xs">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formattedDateTime}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              GUIDE
            </span>
          </div>

          {/* Time Slots along horizontal timeline */}
          <div className="flex-1 overflow-hidden">
            <div
              className="flex items-center"
              style={{
                transform: gridContainerRef.current
                  ? `translateX(-${gridContainerRef.current.scrollLeft}px)`
                  : 'none',
              }}
            >
              {TIME_SLOTS.map((slot) => (
                <div
                  key={slot}
                  style={{ width: `${SLOT_WIDTH_PX}px` }}
                  className="shrink-0 text-center py-2 font-mono text-xs font-bold text-slate-400 border-r border-white/5"
                >
                  {slot}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CHANNEL LIST + EPG GRID (Synchronized vertical & horizontal scrolling)  */}
        {/* ======================================================================= */}
        <div
          ref={gridContainerRef}
          onScroll={handleGridScroll}
          className="flex-1 overflow-auto relative custom-scrollbar focus:outline-none"
        >
          {/* Vertical Current Time Indicator Line */}
          <div
            style={{
              left: `${CHANNEL_COL_WIDTH + CURRENT_TIME_MINUTES * PIXELS_PER_MINUTE}px`,
            }}
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-30 pointer-events-none shadow-[0_0_12px_rgba(6,182,212,0.8)]"
          >
            <div className="sticky top-0 -ml-5 px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono font-black text-[9px] shadow-lg">
              NOW
            </div>
          </div>

          {/* Channel Rows (Virtualized 60fps slice with top/bottom dynamic spacers) */}
          {filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8 space-y-3">
              <Tv className="w-12 h-12 text-slate-600" />
              <div className="text-sm font-bold text-slate-400">No channels in this category</div>
              <p className="text-xs text-slate-500 max-w-sm">
                Try selecting "All Channels" or clearing your search filter.
              </p>
            </div>
          ) : (
            <>
              {topSpacerHeight > 0 && (
                <div style={{ height: `${topSpacerHeight}px`, width: '100%', flexShrink: 0 }} />
              )}
              {visibleRows.map(({ scheduleItem, rowIdx }) => {
                const { channel, programmes } = scheduleItem;
                const isChannelFocused = safeChannelIndex === rowIdx && activeFocusArea === 'grid';
                const isPlayingThis = playbackState.currentChannel?.id === channel.id;

                return (
                  <div
                    key={channel.id}
                    id={`channel-row-${channel.id}`}
                    style={{ height: `${ROW_HEIGHT}px` }}
                    className={`flex items-stretch border-b border-white/5 transition-colors ${
                      isChannelFocused ? 'bg-[#152033]' : 'hover:bg-[#0c121e]'
                    }`}
                  >
                  {/* Fixed Channel Column (Sticky Left) */}
                  <div
                    style={{ width: `${CHANNEL_COL_WIDTH}px` }}
                    onClick={() => {
                      setFocusedChannelIndex(rowIdx);
                      setActiveFocusArea('grid');
                      handleTuneChannel(channel);
                    }}
                    className={`sticky left-0 z-20 shrink-0 px-3 py-2 border-r border-white/10 flex items-center justify-between cursor-pointer transition-all ${
                      isChannelFocused
                        ? 'bg-[#152030] text-white border-l-4 border-l-cyan-400 shadow-md shadow-cyan-500/20'
                        : 'bg-[#0d1320] hover:bg-[#121927] text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Channel Number */}
                      <span className="font-mono text-xs text-slate-400 font-bold shrink-0 w-7">
                        {channel.channelNumber || rowIdx + 1}
                      </span>

                      {/* Channel Logo */}
                      <div className="w-8 h-8 rounded-lg bg-[#080b11] border border-white/10 flex items-center justify-center text-xs font-bold text-cyan-400 shrink-0 overflow-hidden">
                        {channel.logo ? (
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="w-6 h-6 object-contain"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Tv className="w-4 h-4 text-cyan-400" />
                        )}
                      </div>

                      {/* Channel Name */}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                          <span className="truncate">{channel.name}</span>
                          {isPlayingThis && (
                            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-ping" />
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {channel.category || 'Live Channel'}
                        </div>
                      </div>
                    </div>

                    {/* Favorite Star */}
                    <button
                      onClick={(e) => handleToggleFavorite(channel.id, e)}
                      className={`p-1 rounded text-slate-500 hover:text-amber-400 transition shrink-0 ${
                        favorites.has(channel.id) ? 'text-amber-400' : ''
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          favorites.has(channel.id) ? 'fill-current' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Horizontally Scrolling Programmes Blocks */}
                  <div className="flex items-center px-1 py-1 gap-1">
                    {programmes.map((prog) => {
                      const isProgFocused =
                        isChannelFocused && focusedProgram?.id === prog.id;
                      const blockWidth =
                        (prog.durationMinutes / SLOT_DURATION_MINUTES) * SLOT_WIDTH_PX;

                      return (
                        <div
                          key={prog.id}
                          id={`prog-cell-${prog.id}`}
                          onClick={() => {
                            setFocusedChannelIndex(rowIdx);
                            setFocusedProgramId(prog.id);
                            setTimelineFocusMinute(prog.startMinute);
                            setActiveFocusArea('grid');
                          }}
                          onDoubleClick={() => {
                            setFocusedChannelIndex(rowIdx);
                            setActiveFocusArea('grid');
                            handleTuneChannel(channel);
                          }}
                          style={{ width: `${blockWidth}px` }}
                          className={`h-12 shrink-0 rounded-xl px-3 py-1.5 flex flex-col justify-between cursor-pointer transition-all ${
                            isProgFocused
                              ? 'ring-2 ring-cyan-400 bg-cyan-500/30 border-cyan-400 text-white font-bold shadow-[0_0_22px_rgba(6,182,212,0.55)] scale-[1.01]'
                              : prog.isLive
                              ? 'bg-cyan-950/40 text-cyan-200 border border-cyan-500/30 hover:bg-cyan-950/60'
                              : 'bg-[#121927] text-slate-300 border border-white/5 hover:bg-[#1a2538]'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-bold truncate leading-tight">
                            <span className="truncate">{prog.title}</span>
                            {prog.isLive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 ml-1 animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
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
              );
            })}
            {bottomSpacerHeight > 0 && (
              <div style={{ height: `${bottomSpacerHeight}px`, width: '100%', flexShrink: 0 }} />
            )}
          </>
        )}
        </div>
      </main>
    </div>
  );
};

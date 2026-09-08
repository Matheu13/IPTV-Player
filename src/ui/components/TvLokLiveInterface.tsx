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
  ChevronLeft,
  ChevronDown,
  Filter,
  X,
  Info,
  Layers,
  History,
  Folder,
  SlidersHorizontal,
  HardDrive,
  Home,
  Clapperboard,
  Settings,
  Activity,
  Palette,
} from 'lucide-react';
import { ChannelRowData } from './ChannelRow';
import { usePlayback } from '../context/PlaybackContext';
import { useProfile } from '../context/ProfileContext';
import { globalUnifiedIptvEngine, UnifiedChannel } from '../../lib/unifiedIptvEngine';
import { VideoPlayerShell } from './VideoPlayerShell';
import { NavigationRail, NavTabId } from './NavigationRail';
import {
  buildHierarchicalCategoryTree,
  flattenHierarchyTree,
  filterChannelsByHierarchySelection,
  Panel2TreeRow,
  NormalizedHierarchyTree,
} from '../../lib/categoryHierarchy';

// ============================================================================
// EPG TIMELINE GEOMETRY & CONSTANTS
// ============================================================================
const BASE_HOUR = 18; // 18:00 virtual timeline baseline
const TOTAL_HOURS = 8; // 18:00 to 02:00
const SLOT_DURATION_MINUTES = 30;
const SLOT_WIDTH_PX = 144; // 144px per 30 minutes = 4.8px per minute
const PIXELS_PER_MINUTE = SLOT_WIDTH_PX / SLOT_DURATION_MINUTES; // 4.8
const CHANNEL_COL_WIDTH = 270; // 270px fixed channel column
const ROW_HEIGHT = 56; // 56px fixed channel row height for virtualization
const OVERSCAN = 10; // Number of buffer rows above and below viewport

// Fixed 30-minute time intervals from 18:00 to 02:00
const TIME_SLOTS = [
  '18:00', '18:30', '19:00', '19:30',
  '20:00', '20:30', '21:00', '21:30',
  '22:00', '22:30', '23:00', '23:30',
  '00:00', '00:30', '01:00', '01:30',
];

// Current virtual broadcast reference time: 20:45 (165 minutes from 18:00)
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

// ============================================================================
// HIERARCHICAL TREE ROW INTERFACES (PANEL 2)
// ============================================================================
export type Panel2CategoryRow = Panel2TreeRow;

// Persistent session cache across navigation and playback returns
interface PersistentLiveInterfaceState {
  selectedCategoryId: string;
  searchQuery: string;
  focusedChannelId: string | null;
  focusedProgramId: string | null;
  timelineFocusMinute: number;
  scrollLeft: number;
  scrollTop: number;
  activeFocusArea: 'rail' | 'categories' | 'grid' | 'search';
}

const persistentState: PersistentLiveInterfaceState = {
  selectedCategoryId: 'all',
  searchQuery: '',
  focusedChannelId: null,
  focusedProgramId: null,
  timelineFocusMinute: CURRENT_TIME_MINUTES,
  scrollLeft: 0,
  scrollTop: 0,
  activeFocusArea: 'categories',
};

// Import and re-export robust sports channel detection from channelManager
import { isSportsChannel } from '../../lib/channelManager';
export { isSportsChannel };

const SYSTEM_CATEGORIES_COUNT = 4;

// High-performance single-channel EPG synthesizer (invoked only on visible DOM slice)
function buildScheduleForChannel(ch: ChannelRowData): ChannelWithSchedule {
  const hasRealEpg = Boolean(ch.nowProgramme && ch.nowProgramme.title);
  const isSports = isSportsChannel(ch);
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
    // Fallback for channels without provider XMLTV EPG (channel remains visible and playable)
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

export interface TvLokLiveInterfaceProps {
  onSelectChannel?: (channel: ChannelRowData) => void;
  isTvMode?: boolean;
  withNavRail?: boolean;
  activeNavTab?: NavTabId;
  onSelectNavTab?: (tab: NavTabId) => void;
  onOpenSourceManager?: () => void;
}

export const TvLokLiveInterface: React.FC<TvLokLiveInterfaceProps> = ({
  onSelectChannel,
  isTvMode = false,
  withNavRail = true,
  activeNavTab = 'live',
  onSelectNavTab,
  onOpenSourceManager,
}) => {
  const { state: playbackState, playChannel, setPresentationMode } = usePlayback();
  const { isKidsMode, filterChannelsForProfile } = useProfile();

  // Navigation & Focus Area: 'rail' | 'categories' | 'grid' | 'search'
  const [activeFocusArea, setActiveFocusArea] = useState<'rail' | 'categories' | 'grid' | 'search'>(
    persistentState.activeFocusArea
  );

  // Ingested Channel Data directly from existing IPTV engine
  const [rawChannels, setRawChannels] = useState<ChannelRowData[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentChannelIds, setRecentChannelIds] = useState<string[]>([]);
  const [sourcesList, setSourcesList] = useState<{ id: string; name: string }[]>([]);

  // Category & Filter States initialized from persistentState
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(persistentState.selectedCategoryId);
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState<number>(0);
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({
    country_sweden: true,
    country_uk: false,
    country_canada: false,
    country_norway: false,
    group_other: false,
  });
  const [searchQuery, setSearchQuery] = useState<string>(persistentState.searchQuery);
  const [focusedChannelIndex, setFocusedChannelIndex] = useState<number>(0);
  const [focusedProgramId, setFocusedProgramId] = useState<string | null>(persistentState.focusedProgramId);
  const [timelineFocusMinute, setTimelineFocusMinute] = useState<number>(persistentState.timelineFocusMinute);

  // Live Local Date & Time for top header display
  const [currentDateTime, setCurrentDateTime] = useState<Date>(() => new Date());

  // Virtual Windowing State for 60fps scrolling with large channel lists
  const [gridScrollTop, setGridScrollTop] = useState<number>(persistentState.scrollTop || 0);
  const [viewportHeight, setViewportHeight] = useState<number>(600);

  const gridContainerRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef<boolean>(true);

  // Debounced channel tuning handler to prevent stream thrashing
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

  // Live Local Clock Tick
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Viewport resize tracking for accurate row virtualization
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

  // 1. INGESTION DATA SUBSCRIPTION (STRICTLY FROM EXISTING ENGINE)
  useEffect(() => {
    const syncFromEngine = () => {
      const channels = globalUnifiedIptvEngine.getAllChannels();
      const favs = new Set(globalUnifiedIptvEngine.getFavorites());
      const recents = globalUnifiedIptvEngine.getRecentChannels().map((c) => c.id);
      const sources = globalUnifiedIptvEngine.getSources();

      setSourcesList(sources.map((s) => ({ id: s.id, name: s.name })));
      setFavorites(favs);
      setRecentChannelIds(recents);

      // Map normalized UnifiedChannel directly into UI ChannelRowData
      const mappedChannels: ChannelRowData[] = channels.map((ch: UnifiedChannel, idx: number) => ({
        id: ch.id,
        name: ch.name,
        channelNumber: ch.channelNumber || idx + 1,
        category: ch.category || 'General',
        streamUrl: ch.streamUrl,
        logo: ch.logoUrl || undefined,
        groupTitle: ch.category,
        tvgId: ch.tvgId,
        sourceId: ch.sourceId,
        isFavorite: favs.has(ch.id),
        nowProgramme: ch.epgNow
          ? {
              title: ch.epgNow.title,
              description: ch.epgNow.description,
              start: ch.epgNow.startTime,
              stop: ch.epgNow.endTime,
              progress: 50,
            }
          : undefined,
        nextProgramme: ch.epgNext
          ? {
              title: ch.epgNext.title,
              description: ch.epgNext.description,
              start: ch.epgNext.startTime,
              stop: ch.epgNext.endTime,
            }
          : undefined,
      }));

      setRawChannels(mappedChannels);
    };

    syncFromEngine();
    const unsubscribe = globalUnifiedIptvEngine.subscribe(syncFromEngine);
    return () => unsubscribe();
  }, []);

  // 2. EXTRACT DYNAMIC CATEGORIES & NORMALIZE INTO HIERARCHICAL TREE
  const hierarchyTree = useMemo(() => {
    return buildHierarchicalCategoryTree(rawChannels, {
      favoritesCount: favorites.size,
      historyCount: recentChannelIds.length,
    });
  }, [rawChannels, favorites.size, recentChannelIds.length]);

  // 3. FILTER CHANNELS BASED ON ACTIVE CATEGORY, SEARCH, AND PROFILE
  const filteredChannels = useMemo(() => {
    let list = rawChannels;

    // Apply Profile Restrictions (e.g., Kids PG filter)
    if (isKidsMode) {
      list = filterChannelsForProfile(list);
    }

    // Apply Category Filter using normalized hierarchy selection
    if (selectedCategoryId === 'favorites') {
      list = list.filter((ch) => favorites.has(ch.id));
    } else if (selectedCategoryId === 'recent') {
      const recentSet = new Set(recentChannelIds);
      list = list.filter((ch) => recentSet.has(ch.id));
    } else {
      list = filterChannelsByHierarchySelection(list, selectedCategoryId, hierarchyTree);
    }

    // Apply Live Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (ch) =>
          ch.name.toLowerCase().includes(q) ||
          ch.category?.toLowerCase().includes(q) ||
          String(ch.channelNumber).includes(q)
      );
    }

    return list;
  }, [
    rawChannels,
    selectedCategoryId,
    searchQuery,
    isKidsMode,
    favorites,
    recentChannelIds,
    filterChannelsForProfile,
    hierarchyTree,
  ]);

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

  // Virtualized row slice computation (only mounts visible rows in viewport)
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

  // Active program on focused channel matching timeline position
  const focusedProgram = useMemo(() => {
    if (!currentChannelSchedule) return null;
    const progs = currentChannelSchedule.programmes;
    if (focusedProgramId) {
      const match = progs.find((p) => p.id === focusedProgramId);
      if (match) return match;
    }
    const liveProg = progs.find((p) => p.isLive);
    return liveProg || progs[0] || null;
  }, [currentChannelSchedule, focusedProgramId]);

  // Debounced preview playback when scrolling quickly across channels
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentChannelRef = useRef(currentChannel);
  currentChannelRef.current = currentChannel;
  const playChannelRef = useRef(playChannel);
  playChannelRef.current = playChannel;

  useEffect(() => {
    const ch = currentChannelRef.current;
    if (ch && activeFocusArea === 'grid') {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      previewTimerRef.current = setTimeout(() => {
        if (playbackState.currentChannel?.id !== ch.id) {
          playChannelRef.current(ch, 'embedded');
        }
      }, 400); // 400ms debounce
    }
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    };
  }, [currentChannel?.id, activeFocusArea, playbackState.currentChannel?.id]);

  // Scroll active channel into view
  useEffect(() => {
    if (activeFocusArea === 'grid' && currentChannel?.id) {
      const rowEl = document.getElementById(`tvlok-row-${currentChannel.id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else if (gridContainerRef.current) {
        const targetTop = safeChannelIndex * ROW_HEIGHT;
        gridContainerRef.current.scrollTop = Math.max(0, targetTop - viewportHeight / 3);
      }
    }
  }, [safeChannelIndex, activeFocusArea, currentChannel?.id, viewportHeight]);

  // Restore scroll positions on mount
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

  // Flattened hierarchical tree items with accordion expansion for Panel 2
  const panel2Items = useMemo<Panel2CategoryRow[]>(() => {
    return flattenHierarchyTree(hierarchyTree, expandedCountries);
  }, [hierarchyTree, expandedCountries]);

  // =========================================================================
  // KEYBOARD & D-PAD REMOTE NAVIGATION (PANEL 1 ↔ PANEL 2 ↔ PANEL 3)
  // =========================================================================
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (document.activeElement === searchInputRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveFocusArea('categories');
          searchInputRef.current?.blur();
        } else if (e.key === 'Enter') {
          setActiveFocusArea('categories');
          searchInputRef.current?.blur();
        }
        return;
      }

      // 1. NAVIGATION IN PANEL 2 (COLLAPSIBLE / EXPANDABLE HIERARCHICAL TREE)
      if (activeFocusArea === 'categories') {
        const currentItem = panel2Items[focusedCategoryIndex];

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          let prevIdx = focusedCategoryIndex - 1;
          while (prevIdx >= 0 && panel2Items[prevIdx]?.type === 'header') {
            prevIdx--;
          }
          if (prevIdx < 0) {
            setActiveFocusArea('search');
            searchInputRef.current?.focus();
          } else {
            setFocusedCategoryIndex(prevIdx);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          let nextIdx = focusedCategoryIndex + 1;
          while (nextIdx < panel2Items.length && panel2Items[nextIdx]?.type === 'header') {
            nextIdx++;
          }
          if (nextIdx < panel2Items.length) {
            setFocusedCategoryIndex(nextIdx);
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (!currentItem) return;

          if (currentItem.type === 'country_group' || currentItem.type === 'other_group') {
            if (!currentItem.isExpanded) {
              // Expand country group in-place
              setExpandedCountries((prev) => ({ ...prev, [currentItem.id]: true }));
              setSelectedCategoryId(currentItem.id);
              persistentState.selectedCategoryId = currentItem.id;
            } else {
              // Already expanded: move focus down to first child subcategory
              const firstChildIdx = panel2Items.findIndex(
                (r, i) => i > focusedCategoryIndex && r.depth > 0 && r.countryId === currentItem.id
              );
              if (firstChildIdx > 0) {
                setFocusedCategoryIndex(firstChildIdx);
              } else {
                // Transition seamlessly to Panel 3 (channels grid)
                setActiveFocusArea('grid');
              }
            }
          } else if (currentItem.type === 'sub_category' || currentItem.type === 'system') {
            // Select subcategory or system category and transition seamlessly to Panel 3
            setSelectedCategoryId(currentItem.rawCategory || currentItem.id);
            persistentState.selectedCategoryId = currentItem.rawCategory || currentItem.id;
            setActiveFocusArea('grid');
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'Escape') {
          e.preventDefault();
          if (!currentItem) {
            if (withNavRail) setActiveFocusArea('rail');
            return;
          }

          if (currentItem.depth > 0 && currentItem.countryId) {
            // Nested subcategory: move focus up to its parent country header
            const parentIdx = panel2Items.findIndex((r) => r.id === currentItem.countryId);
            if (parentIdx >= 0) {
              setFocusedCategoryIndex(parentIdx);
            } else {
              if (withNavRail) setActiveFocusArea('rail');
            }
          } else if ((currentItem.type === 'country_group' || currentItem.type === 'other_group') && currentItem.isExpanded) {
            // Expanded country header: collapse it
            setExpandedCountries((prev) => ({ ...prev, [currentItem.id]: false }));
          } else {
            // Collapsed header or system item: move to Panel 1 (navigation rail)
            if (withNavRail) {
              setActiveFocusArea('rail');
            }
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (!currentItem) return;

          if (currentItem.type === 'country_group' || currentItem.type === 'other_group') {
            // Toggle collapsed/expanded state
            const nextExpanded = !currentItem.isExpanded;
            setExpandedCountries((prev) => ({ ...prev, [currentItem.id]: nextExpanded }));
            setSelectedCategoryId(currentItem.id);
            persistentState.selectedCategoryId = currentItem.id;
          } else if (currentItem.type === 'sub_category' || currentItem.type === 'system') {
            // Select subcategory or system category and transition seamlessly to Panel 3
            setSelectedCategoryId(currentItem.rawCategory || currentItem.id);
            persistentState.selectedCategoryId = currentItem.rawCategory || currentItem.id;
            setActiveFocusArea('grid');
          }
        }
        return;
      }

      // 2. NAVIGATION IN PANEL 1 (MAIN APP NAVIGATION RAIL)
      if (activeFocusArea === 'rail') {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setActiveFocusArea('categories');
        }
        return;
      }

      // 3. NAVIGATION IN PANEL 3 (CHANNEL / EPG GRID)
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
          if (!currentChannelSchedule) return;
          const progs = currentChannelSchedule.programmes;
          const curProgIdx = progs.findIndex((p) => p.id === focusedProgram?.id);

          if (curProgIdx > 0) {
            const prevProg = progs[curProgIdx - 1];
            setFocusedProgramId(prevProg.id);
            setTimelineFocusMinute(prevProg.startMinute + prevProg.durationMinutes / 2);
          } else {
            // Far-left edge: return focus to category column
            setActiveFocusArea('categories');
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (!currentChannelSchedule) return;
          const progs = currentChannelSchedule.programmes;
          const curProgIdx = progs.findIndex((p) => p.id === focusedProgram?.id);

          if (curProgIdx >= 0 && curProgIdx < progs.length - 1) {
            const nextProg = progs[curProgIdx + 1];
            setFocusedProgramId(nextProg.id);
            setTimelineFocusMinute(nextProg.startMinute + nextProg.durationMinutes / 2);
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (currentChannel) {
            handleTuneChannel(currentChannel);
            setPresentationMode('fullscreen');
          }
        }
      }
    },
    [
      activeFocusArea,
      focusedCategoryIndex,
      panel2Items,
      expandedCountries,
      filteredChannels,
      safeChannelIndex,
      currentChannelSchedule,
      focusedProgram,
      timelineFocusMinute,
      handleTuneChannel,
      setPresentationMode,
      withNavRail,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Scroll focused category into view in Panel 2
  useEffect(() => {
    if (activeFocusArea === 'categories') {
      const el = document.getElementById(`category-item-${focusedCategoryIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedCategoryIndex, activeFocusArea]);

  // Format date header: e.g. "Sat, Sep 5, 20:45"
  const formattedDateTime = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = days[currentDateTime.getDay()];
    const month = months[currentDateTime.getMonth()];
    const date = currentDateTime.getDate();
    const hours = String(currentDateTime.getHours()).padStart(2, '0');
    const minutes = String(currentDateTime.getMinutes()).padStart(2, '0');
    return `${day}, ${month} ${date}, ${hours}:${minutes}`;
  }, [currentDateTime]);

  return (
    <div className="flex h-screen w-screen bg-[#070a0f] text-slate-100 font-sans select-none overflow-hidden">
      {/* ===================================================================== */}
      {/* PANEL 1: MAIN APPLICATION NAVIGATION (PRESERVED APPLICATION RAIL)      */}
      {/* ===================================================================== */}
      {withNavRail && (
        <aside
          className={`shrink-0 z-30 transition-all ${
            activeFocusArea === 'rail' ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#070a0f]' : ''
          }`}
        >
          <NavigationRail
            activeTab={activeNavTab}
            onSelectTab={(tab) => {
              if (onSelectNavTab) onSelectNavTab(tab);
            }}
            variant={isTvMode ? 'tv_top' : 'desktop'}
          />
        </aside>
      )}

      {/* ===================================================================== */}
      {/* PANEL 2: LIVE TV CATEGORIES / PLAYLIST GROUPS (DYNAMIC PROVIDER DATA) */}
      {/* ===================================================================== */}
      <nav
        id="panel-2-categories"
        className={`w-64 md:w-72 lg:w-80 shrink-0 bg-[#090d16] border-r border-white/10 flex flex-col z-20 transition-all ${
          activeFocusArea === 'categories' ? 'ring-1 ring-cyan-400/50 shadow-2xl shadow-cyan-500/10' : ''
        }`}
      >
        {/* Search live channels input */}
        <div className="p-3 border-b border-white/10 bg-[#0c121e]/80 shrink-0">
          <div
            onClick={() => {
              setActiveFocusArea('search');
              searchInputRef.current?.focus();
            }}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#06080e] border transition-all cursor-text ${
              activeFocusArea === 'search'
                ? 'border-cyan-400 ring-2 ring-cyan-400/30 text-white shadow-md shadow-cyan-500/20'
                : 'border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            <Search className={`w-4 h-4 ${activeFocusArea === 'search' ? 'text-cyan-400' : 'text-slate-500'}`} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live channels..."
              className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-full"
            />
            {searchQuery && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQuery('');
                }}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Hierarchical Category List (Organized by Country with Collapsible Sub-Categories) */}
        <div
          ref={categoryListRef}
          className="flex-1 overflow-y-auto divide-y divide-white/[0.04] scrollbar-thin scrollbar-thumb-slate-800"
        >
          {panel2Items.map((row, idx) => {
            const isSelected =
              selectedCategoryId === row.id ||
              (row.rawCategory && selectedCategoryId === row.rawCategory) ||
              (row.countryId && selectedCategoryId === row.countryId);
            const isFocused = activeFocusArea === 'categories' && focusedCategoryIndex === idx;

            // Section Header (e.g. "Categorized by COuntry")
            if (row.type === 'header') {
              return (
                <div
                  key={row.key}
                  id={`category-item-${idx}`}
                  className="px-3.5 py-2.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#0a0f1c]/90 border-t border-b border-white/5 select-none"
                >
                  {row.displayLabel}
                </div>
              );
            }

            // Top-Level Country / Group Row (Collapsible / Expandable)
            if (row.type === 'country_group' || row.type === 'other_group') {
              return (
                <div
                  key={row.key}
                  id={`category-item-${idx}`}
                  onClick={() => {
                    const nextExpanded = !row.isExpanded;
                    setExpandedCountries((prev) => ({ ...prev, [row.id]: nextExpanded }));
                    setSelectedCategoryId(row.id);
                    setFocusedCategoryIndex(idx);
                    persistentState.selectedCategoryId = row.id;
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer text-xs font-semibold transition-all select-none ${
                    isFocused
                      ? 'bg-[#182338] text-white border-l-4 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : isSelected
                      ? 'bg-[#0f1a2e] text-cyan-300 font-bold border-l-2 border-cyan-500/70'
                      : 'text-slate-200 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-slate-400 shrink-0">
                      {row.isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </span>
                    {row.type === 'other_group' ? (
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    ) : (
                      <Globe className="w-3.5 h-3.5 text-cyan-400/80 shrink-0" />
                    )}
                    <span className="truncate tracking-wide">{row.displayLabel}</span>
                  </div>

                  {row.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full shrink-0 font-medium ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {row.count}
                    </span>
                  )}
                </div>
              );
            }

            // Sub-category (Indented child bouquet under expanded country)
            if (row.type === 'sub_category') {
              return (
                <div
                  key={row.key}
                  id={`category-item-${idx}`}
                  onClick={() => {
                    setSelectedCategoryId(row.rawCategory || row.id);
                    setFocusedCategoryIndex(idx);
                    setActiveFocusArea('grid');
                    persistentState.selectedCategoryId = row.rawCategory || row.id;
                  }}
                  className={`flex items-center justify-between pl-8 pr-3.5 py-2 cursor-pointer text-xs transition-all relative select-none ${
                    isFocused
                      ? 'bg-[#152033] text-white border-l-4 border-cyan-400 shadow-md shadow-cyan-500/20 font-semibold'
                      : isSelected
                      ? 'bg-[#0d1626] text-cyan-300 font-semibold border-l-2 border-cyan-500/60'
                      : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isSelected ? 'bg-cyan-400' : 'bg-slate-600'
                      }`}
                    />
                    <span className="truncate">{row.displayLabel}</span>
                  </div>

                  {row.count !== undefined && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 font-medium ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {row.count}
                    </span>
                  )}
                </div>
              );
            }

            // System Category Items (ALL CHANNELS, Sports, Favorites, History)
            return (
              <div
                key={row.key}
                id={`category-item-${idx}`}
                onClick={() => {
                  setSelectedCategoryId(row.id);
                  setFocusedCategoryIndex(idx);
                  setActiveFocusArea('grid');
                  persistentState.selectedCategoryId = row.id;
                }}
                className={`flex items-center justify-between px-3.5 py-2 cursor-pointer text-xs font-semibold transition-all relative select-none ${
                  isFocused
                    ? 'bg-[#152033] text-white border-l-4 border-cyan-400 shadow-md shadow-cyan-500/20'
                    : isSelected
                    ? 'bg-[#0d1626] text-cyan-300 font-bold border-l-2 border-cyan-500/60'
                    : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {row.id === 'favorites' ? (
                    <Star className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400" />
                  ) : row.id === 'recent' ? (
                    <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : row.id === 'sports' ? (
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <Tv className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  )}
                  <span className="truncate">{row.displayLabel}</span>
                </div>

                {row.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 font-medium ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {row.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ===================================================================== */}
      {/* PANEL 3: PREVIEW + PROGRAM INFORMATION + EPG GUIDE                    */}
      {/* ===================================================================== */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#070a0f] overflow-hidden relative">
        {/* Top Split View: [Live Preview] + [Program / Channel Info] */}
        <div className="h-56 md:h-64 lg:h-72 border-b border-white/10 bg-[#0a0f1a] flex shrink-0 divide-x divide-white/10">
          {/* Top-Left: Embedded Live Video Preview */}
          <div className="w-80 md:w-96 lg:w-[440px] shrink-0 bg-black relative flex flex-col justify-center overflow-hidden">
            {currentChannel ? (
              <VideoPlayerShell
                channel={currentChannel}
                isLive={true}
                presentationMode="embedded"
                onToggleFullscreen={() => setPresentationMode('fullscreen')}
                className="w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
                <Tv className="w-10 h-10 text-slate-700" />
                <span className="text-xs font-mono">No channel selected</span>
              </div>
            )}

            {/* Live Signal Badge */}
            {isChannelPlaying && (
              <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-[10px] font-mono font-bold text-emerald-400 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>LIVE</span>
              </div>
            )}
          </div>

          {/* Top-Right: Program & Channel Metadata Card */}
          <div className="flex-1 p-4 md:p-5 flex flex-col justify-between overflow-y-auto bg-gradient-to-br from-[#0c1322] to-[#080d17]">
            {currentChannel ? (
              <>
                <div className="space-y-1.5">
                  {/* Category / Provider Breadcrumb */}
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    <span>{currentChannel.groupTitle || currentChannel.category || 'General'}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400 font-normal">CH {currentChannel.channelNumber}</span>
                  </div>

                  {/* Channel Name */}
                  <h2 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2.5">
                    <span>{currentChannel.name}</span>
                    <button
                      onClick={(e) => handleToggleFavorite(currentChannel.id, e)}
                      className="text-slate-500 hover:text-amber-400 transition-colors"
                      title={favorites.has(currentChannel.id) ? 'Remove Favorite' : 'Mark as Favorite'}
                    >
                      <Star
                        className={`w-4 h-4 ${
                          favorites.has(currentChannel.id) ? 'text-amber-400 fill-amber-400' : ''
                        }`}
                      />
                    </button>
                  </h2>

                  {/* Program Title */}
                  <div className="text-sm md:text-base font-bold text-slate-200">
                    {focusedProgram ? focusedProgram.title : 'No program information available'}
                  </div>

                  {/* Program Synopsis */}
                  <p className="text-xs text-slate-400 line-clamp-2 md:line-clamp-3 leading-relaxed">
                    {focusedProgram?.description ||
                      'Continuous live scheduled television transmission streamed from provider feed.'}
                  </p>
                </div>

                {/* Progress Bar & Timing Details */}
                {focusedProgram && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="font-semibold text-slate-300">
                        {focusedProgram.start} – {focusedProgram.stop}
                      </span>
                      {focusedProgram.remainingMinutes !== undefined && (
                        <span className="text-cyan-400 font-bold">
                          {focusedProgram.remainingMinutes}m remaining
                        </span>
                      )}
                    </div>

                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${focusedProgram.progressPercent || 50}%` }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                Select a channel from the guide to view broadcast information.
              </div>
            )}
          </div>
        </div>

        {/* Date / Time Header & Horizontal Timeline Bar */}
        <div className="h-10 bg-[#0d1424] border-b border-white/10 flex items-center shrink-0 z-10">
          {/* Pinned Left: Local Date & Current Time Clock */}
          <div
            style={{ width: `${CHANNEL_COL_WIDTH}px` }}
            className="shrink-0 px-4 h-full flex items-center justify-between border-r border-white/10 bg-[#090e1a] text-xs font-mono font-bold text-cyan-300 shadow-sm"
          >
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formattedDateTime}</span>
            </div>
          </div>

          {/* Horizontally Scrolling Timeline Header */}
          <div className="flex-1 overflow-hidden relative h-full flex items-center">
            <div
              className="flex items-center h-full"
              style={{
                transform: `translateX(-${persistentState.scrollLeft}px)`,
                width: `${TIME_SLOTS.length * SLOT_WIDTH_PX}px`,
              }}
            >
              {TIME_SLOTS.map((slot, idx) => (
                <div
                  key={slot}
                  style={{ width: `${SLOT_WIDTH_PX}px` }}
                  className="shrink-0 text-center text-xs font-mono font-semibold text-slate-400 border-r border-white/5 py-1"
                >
                  {slot}
                </div>
              ))}
            </div>

            {/* Current Virtual Time Marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none shadow-[0_0_8px_rgba(239,68,68,0.8)]"
              style={{
                left: `${CURRENT_TIME_MINUTES * PIXELS_PER_MINUTE - persistentState.scrollLeft}px`,
              }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 -translate-x-[3px] -translate-y-0.5" />
            </div>
          </div>
        </div>

        {/* Channel Rows & EPG Matrix (Virtualized for 10,000+ Channels) */}
        <div
          ref={gridContainerRef}
          onScroll={handleGridScroll}
          className="flex-1 overflow-auto relative bg-[#070a0f] scrollbar-thin scrollbar-thumb-slate-800"
        >
          {filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-8 space-y-3">
              <Tv className="w-12 h-12 text-slate-600" />
              <div className="text-sm font-bold text-slate-400">No channels found</div>
              <p className="text-xs text-slate-500 max-w-sm">
                Try selecting "All Playlists" or clearing your search query.
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
                    id={`tvlok-row-${channel.id}`}
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

                        {/* Channel Logo with Clean Fallback */}
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
                            {channel.groupTitle || channel.category || 'General'}
                          </div>
                        </div>
                      </div>

                      {/* Favorite Star Button */}
                      <button
                        onClick={(e) => handleToggleFavorite(channel.id, e)}
                        className="p-1 hover:bg-white/10 rounded text-slate-500 hover:text-amber-400 shrink-0"
                      >
                        <Star
                          className={`w-3.5 h-3.5 ${
                            favorites.has(channel.id) ? 'text-amber-400 fill-amber-400' : ''
                          }`}
                        />
                      </button>
                    </div>

                    {/* Horizontal EPG Program Cells */}
                    <div
                      className="flex items-center px-1 py-1 gap-1 h-full"
                      style={{ width: `${TIME_SLOTS.length * SLOT_WIDTH_PX}px` }}
                    >
                      {programmes.map((prog) => {
                        const widthPx = Math.max(80, prog.durationMinutes * PIXELS_PER_MINUTE - 4);
                        const isProgFocused = isChannelFocused && focusedProgram?.id === prog.id;

                        return (
                          <div
                            key={prog.id}
                            style={{ width: `${widthPx}px` }}
                            onClick={() => {
                              setFocusedChannelIndex(rowIdx);
                              setFocusedProgramId(prog.id);
                              setActiveFocusArea('grid');
                              handleTuneChannel(channel);
                            }}
                            className={`h-12 shrink-0 px-2.5 py-1.5 rounded-md border flex flex-col justify-between cursor-pointer transition-all ${
                              isProgFocused
                                ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400'
                                : prog.isLive
                                ? 'bg-[#0f172a] border-white/10 hover:border-white/30 text-slate-200'
                                : 'bg-[#090d16] border-white/5 hover:border-white/20 text-slate-400'
                            }`}
                          >
                            <div className="text-xs font-semibold truncate flex items-center gap-1">
                              {prog.isLive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                              )}
                              <span className="truncate">{prog.title}</span>
                            </div>

                            <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between">
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

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
  AlertCircle,
  LogOut,
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
  activeFocusArea: 'categories' | 'channels' | 'player' | 'search';
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
  onExit?: () => void;
}

export const TvLokLiveInterface: React.FC<TvLokLiveInterfaceProps> = ({
  onSelectChannel,
  isTvMode = false,
  withNavRail = true,
  activeNavTab = 'live',
  onSelectNavTab,
  onOpenSourceManager,
  onExit,
}) => {
  const { state: playbackState, playChannel, setPresentationMode } = usePlayback();
  const { isKidsMode, filterChannelsForProfile } = useProfile();

  // Navigation & Focus Area: 'categories' | 'channels' | 'player' | 'search'
  const [activeFocusArea, setActiveFocusArea] = useState<'categories' | 'channels' | 'player' | 'search'>(
    persistentState.activeFocusArea
  );

  // Exit Confirmation Dialog State (Triggers on 'Back' at root category panel)
  const [showExitDialog, setShowExitDialog] = useState<boolean>(false);
  const [focusedExitButton, setFocusedExitButton] = useState<'cancel' | 'exit'>('cancel');

  // Ingested Channel Data directly from existing IPTV engine
  const [rawChannels, setRawChannels] = useState<ChannelRowData[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentChannelIds, setRecentChannelIds] = useState<string[]>([]);
  const [sourcesList, setSourcesList] = useState<{ id: string; name: string }[]>([]);

  // Category & Filter States initialized from persistentState
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(persistentState.selectedCategoryId);
  const [focusedCategoryIndex, setFocusedCategoryIndex] = useState<number>(0);
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({});
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
  const channelListRef = useRef<HTMLDivElement>(null);
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
      let channels = globalUnifiedIptvEngine.getAllChannels();
      if (!channels || channels.length === 0) {
        globalUnifiedIptvEngine.ensureChannelsLoaded();
        channels = globalUnifiedIptvEngine.getAllChannels();
      }
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

  // Dynamically expand the first category group whenever hierarchy changes if nothing is expanded
  useEffect(() => {
    if (hierarchyTree.countryGroups.length > 0) {
      setExpandedCountries((prev) => {
        const hasAnyExpanded = hierarchyTree.countryGroups.some((g) => Boolean(prev[g.id] || prev[g.label]));
        if (hasAnyExpanded) return prev;
        return { ...prev, [hierarchyTree.countryGroups[0].id]: true };
      });
    }
  }, [hierarchyTree.countryGroups]);

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
    if (ch && (activeFocusArea === 'channels' || activeFocusArea === 'player')) {
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

  // Scroll active channel into view in Panel 2
  useEffect(() => {
    if (activeFocusArea === 'channels' && currentChannel?.id) {
      const rowEl = document.getElementById(`tvlok-channel-${currentChannel.id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [safeChannelIndex, activeFocusArea, currentChannel?.id]);

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
      // 0. EXIT CONFIRMATION DIALOG (MODAL ACTIVE)
      if (showExitDialog) {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          setFocusedExitButton((prev) => (prev === 'cancel' ? 'exit' : 'cancel'));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (focusedExitButton === 'cancel') {
            setShowExitDialog(false);
          } else {
            setShowExitDialog(false);
            if (onExit) {
              onExit();
            }
          }
        } else if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          setShowExitDialog(false);
        }
        return;
      }

      // 1. LIVE CHANNEL SEARCH INPUT
      if (document.activeElement === searchInputRef.current) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveFocusArea('categories');
          searchInputRef.current?.blur();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          setActiveFocusArea('channels');
          searchInputRef.current?.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setActiveFocusArea('categories');
          searchInputRef.current?.blur();
        }
        return;
      }

      // 2. PANEL 1: CATEGORIES HIERARCHICAL TREE
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
          if (!currentItem) {
            setActiveFocusArea('channels');
            return;
          }

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
                setActiveFocusArea('channels');
              }
            }
          } else if (currentItem.type === 'sub_category' || currentItem.type === 'system') {
            // Select subcategory or system category and transition to Panel 2 (Channels)
            setSelectedCategoryId(currentItem.rawCategory || currentItem.id);
            persistentState.selectedCategoryId = currentItem.rawCategory || currentItem.id;
            setFocusedChannelIndex(0);
            setActiveFocusArea('channels');
          } else {
            setActiveFocusArea('channels');
          }
        } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'Escape') {
          e.preventDefault();
          if (!currentItem) {
            setShowExitDialog(true);
            setFocusedExitButton('cancel');
            return;
          }

          if (currentItem.depth > 0 && currentItem.countryId) {
            // Nested subcategory: move focus up to its parent country header
            const parentIdx = panel2Items.findIndex((r) => r.id === currentItem.countryId);
            if (parentIdx >= 0) {
              setFocusedCategoryIndex(parentIdx);
              return;
            }
          } else if (
            (currentItem.type === 'country_group' || currentItem.type === 'other_group') &&
            currentItem.isExpanded
          ) {
            // Expanded country header: collapse it
            setExpandedCountries((prev) => ({ ...prev, [currentItem.id]: false }));
            return;
          }

          // User is at root Category panel: trigger exit confirmation dialog!
          setShowExitDialog(true);
          setFocusedExitButton('cancel');
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
            // Select category and shift focus to Panel 2 (Channels)
            setSelectedCategoryId(currentItem.rawCategory || currentItem.id);
            persistentState.selectedCategoryId = currentItem.rawCategory || currentItem.id;
            setFocusedChannelIndex(0);
            setActiveFocusArea('channels');
          }
        }
        return;
      }

      // 3. PANEL 2: CHANNELS LIST
      if (activeFocusArea === 'channels') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (safeChannelIndex > 0) {
            setFocusedChannelIndex(safeChannelIndex - 1);
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (safeChannelIndex < filteredChannels.length - 1) {
            setFocusedChannelIndex(safeChannelIndex + 1);
          }
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          // Shift focus to Panel 3: Player & Guide
          setActiveFocusArea('player');
        } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'Escape') {
          e.preventDefault();
          // Reverse focus back to Panel 1: Categories
          setActiveFocusArea('categories');
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (currentChannel) {
            handleTuneChannel(currentChannel);
            // Shift focus to Player
            setActiveFocusArea('player');
          }
        }
        return;
      }

      // 4. PANEL 3: PLAYER & GUIDE
      if (activeFocusArea === 'player') {
        if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'Escape') {
          e.preventDefault();
          if (playbackState.presentationMode === 'fullscreen') {
            // Exit fullscreen first
            setPresentationMode('embedded');
          } else {
            // Reverse focus back to Panel 2: Channels
            setActiveFocusArea('channels');
          }
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (currentChannelSchedule && currentChannelSchedule.programmes.length > 0) {
            const progs = currentChannelSchedule.programmes;
            const curProgIdx = progs.findIndex((p) => p.id === focusedProgram?.id);
            if (curProgIdx > 0) {
              setFocusedProgramId(progs[curProgIdx - 1].id);
            }
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (currentChannelSchedule && currentChannelSchedule.programmes.length > 0) {
            const progs = currentChannelSchedule.programmes;
            const curProgIdx = progs.findIndex((p) => p.id === focusedProgram?.id);
            if (curProgIdx >= 0 && curProgIdx < progs.length - 1) {
              setFocusedProgramId(progs[curProgIdx + 1].id);
            }
          }
        } else if (e.key === 'Enter') {
          e.preventDefault();
          // Toggle fullscreen playback
          setPresentationMode(
            playbackState.presentationMode === 'fullscreen' ? 'embedded' : 'fullscreen'
          );
        }
        return;
      }
    },
    [
      showExitDialog,
      focusedExitButton,
      onExit,
      activeFocusArea,
      focusedCategoryIndex,
      panel2Items,
      expandedCountries,
      filteredChannels,
      safeChannelIndex,
      currentChannel,
      currentChannelSchedule,
      focusedProgram,
      handleTuneChannel,
      setPresentationMode,
      playbackState.presentationMode,
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
    <div
      id="livetv-root-container"
      className="flex h-screen w-screen bg-[#070a0f] text-slate-100 font-sans select-none overflow-hidden relative"
    >
      {/* ===================================================================== */}
      {/* OPTIONAL APPLICATION NAVIGATION RAIL                                  */}
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
      {/* THREE-PANEL RESPONSIVE CSS GRID: 18% 27% 55%                          */}
      {/* ===================================================================== */}
      <div
        id="livetv-three-panel-grid"
        className="flex-1 h-full w-full overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(180px, 18%) minmax(240px, 27%) minmax(380px, 55%)',
          gridTemplateRows: '100%',
          height: '100%',
          width: '100%',
        }}
      >
        {/* ===================================================================== */}
        {/* PANEL 1: CATEGORIES HIERARCHICAL TREE (18%)                           */}
        {/* ===================================================================== */}
        <nav
          id="panel-categories"
          className={`h-full flex flex-col min-w-0 bg-[#090d16] border-r border-white/10 overflow-hidden relative transition-all ${
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
                    {row.flag ? (
                      <span className="text-sm shrink-0 leading-none">{row.flag}</span>
                    ) : row.type === 'other_group' ? (
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
      {/* PANEL 2: CHANNELS LIST (27%)                                          */}
      {/* ===================================================================== */}
      <section
        id="panel-channels"
        className={`h-full flex flex-col min-w-0 bg-[#080c15] border-r border-white/10 overflow-hidden relative transition-all ${
          activeFocusArea === 'channels'
            ? 'ring-1 ring-cyan-400/50 shadow-2xl shadow-cyan-500/10'
            : ''
        }`}
      >
        {/* Panel 2 Header */}
        <div className="p-3.5 border-b border-white/10 bg-[#0c121e]/90 shrink-0 flex items-center justify-between">
          <div className="min-w-0 flex items-center gap-2">
            <Tv className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2 className="text-xs font-bold text-white uppercase tracking-wider truncate">
              {panel2Items.find((r) => r.id === selectedCategoryId || r.rawCategory === selectedCategoryId)
                ?.displayLabel || 'Channels'}
            </h2>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 font-semibold shrink-0">
            {filteredChannels.length}
          </span>
        </div>

        {/* Channels Scrollable List */}
        <div
          ref={channelListRef}
          className="flex-1 overflow-y-auto divide-y divide-white/[0.04] scrollbar-thin scrollbar-thumb-slate-800"
        >
          {filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-slate-500 space-y-2">
              <Tv className="w-8 h-8 text-slate-600" />
              <span className="text-xs">No channels in this category</span>
            </div>
          ) : (
            filteredChannels.map((channel, idx) => {
              const isFocused = activeFocusArea === 'channels' && safeChannelIndex === idx;
              const isSelected = safeChannelIndex === idx;
              const isPlaying = playbackState.currentChannel?.id === channel.id;
              const isFav = favorites.has(channel.id);

              return (
                <div
                  key={channel.id}
                  id={`tvlok-channel-${channel.id}`}
                  onClick={() => {
                    setFocusedChannelIndex(idx);
                    setActiveFocusArea('channels');
                    handleTuneChannel(channel);
                  }}
                  onDoubleClick={() => {
                    setFocusedChannelIndex(idx);
                    setActiveFocusArea('player');
                    setPresentationMode('fullscreen');
                  }}
                  className={`px-3 py-2.5 flex items-center justify-between cursor-pointer transition-all ${
                    isFocused
                      ? 'bg-[#15233c] text-white border-l-4 border-cyan-400 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-500/20'
                      : isSelected
                      ? 'bg-[#0d1626] text-cyan-200 border-l-2 border-cyan-500/60'
                      : 'border-l-2 border-transparent text-slate-300 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Channel Number */}
                    <span className="font-mono text-[11px] text-slate-400 font-bold shrink-0 w-6">
                      {channel.channelNumber || idx + 1}
                    </span>

                    {/* Logo or Icon */}
                    <div className="w-7 h-7 rounded-lg bg-[#06080e] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {channel.logo ? (
                        <img
                          src={channel.logo}
                          alt={channel.name}
                          className="w-5 h-5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <Tv className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                    </div>

                    {/* Channel Name & Category */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold truncate text-slate-100">
                          {channel.name}
                        </span>
                        {isPlaying && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {channel.groupTitle || channel.category || 'Live Stream'}
                      </div>
                    </div>
                  </div>

                  {/* Favorite Toggle Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFavorite(channel.id, e)}
                    className="ml-2 p-1 text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                    title={isFav ? 'Remove Favorite' : 'Mark Favorite'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        isFav ? 'text-amber-400 fill-amber-400' : ''
                      }`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* PANEL 3: PLAYER & GUIDE (55%)                                         */}
      {/* ===================================================================== */}
      <main
        id="panel-player"
        className={`h-full flex flex-col min-w-0 bg-[#070a0f] overflow-hidden relative transition-all ${
          activeFocusArea === 'player'
            ? 'ring-1 ring-cyan-400/40 shadow-2xl shadow-cyan-500/10'
            : ''
        }`}
      >
        {/* Top: Video Player */}
        <div className="h-60 md:h-64 lg:h-72 shrink-0 bg-black relative flex flex-col justify-center overflow-hidden border-b border-white/10">
          {currentChannel ? (
            <VideoPlayerShell
              id="live-tv-player"
              channel={currentChannel}
              forceMode="embedded"
              mode="embedded"
              autoPlay={true}
              showControls={true}
              isLivePreview={true}
              className="w-full h-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600 space-y-2">
              <Tv className="w-10 h-10 text-slate-700" />
              <span className="text-xs font-mono">Select a channel to play</span>
            </div>
          )}

          {/* Live Indicator Overlay */}
          {isChannelPlaying && (
            <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/60 text-[10px] font-mono font-bold text-emerald-400 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>LIVE</span>
            </div>
          )}
        </div>

        {/* Middle: Channel & Program Info Card */}
        <div className="p-4 border-b border-white/10 bg-gradient-to-r from-[#0c1322] to-[#080d17] shrink-0 space-y-2">
          {currentChannel ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  <span>{currentChannel.groupTitle || currentChannel.category || 'General'}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400 font-normal">
                    CH {currentChannel.channelNumber || safeChannelIndex + 1}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleToggleFavorite(currentChannel.id, e)}
                  className="text-slate-500 hover:text-amber-400 transition-colors"
                >
                  <Star
                    className={`w-4 h-4 ${
                      favorites.has(currentChannel.id) ? 'text-amber-400 fill-amber-400' : ''
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4">
                <h2 className="text-base md:text-lg font-black text-white tracking-tight truncate">
                  {currentChannel.name}
                </h2>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPresentationMode('fullscreen')}
                    className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Fullscreen</span>
                  </button>
                </div>
              </div>

              <div className="text-xs md:text-sm font-semibold text-slate-200">
                {focusedProgram ? focusedProgram.title : 'Live Television Broadcast'}
              </div>

              {focusedProgram && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>
                      {focusedProgram.start} – {focusedProgram.stop}
                    </span>
                    {focusedProgram.remainingMinutes !== undefined && (
                      <span className="text-cyan-400 font-bold">
                        {focusedProgram.remainingMinutes}m remaining
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${focusedProgram.progressPercent || 50}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-slate-500">No channel active</div>
          )}
        </div>

        {/* Bottom: Channel Schedule / EPG Guide */}
        <div className="flex-1 flex flex-col min-h-0 bg-[#070a0f]">
          <div className="px-4 py-2 border-b border-white/10 bg-[#0a0f1c] flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Today's Schedule</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">{formattedDateTime}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
            {currentChannelSchedule && currentChannelSchedule.programmes.length > 0 ? (
              currentChannelSchedule.programmes.map((prog) => {
                const isCurrent = prog.isLive;
                const isProgFocused = focusedProgram?.id === prog.id;

                return (
                  <div
                    key={prog.id}
                    onClick={() => setFocusedProgramId(prog.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isProgFocused && activeFocusArea === 'player'
                        ? 'bg-cyan-950/70 border-cyan-400 text-white ring-1 ring-cyan-400 shadow-md shadow-cyan-500/20'
                        : isCurrent
                        ? 'bg-[#10192b] border-cyan-500/40 text-slate-200'
                        : 'bg-[#090e18] border-white/5 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-[10px] font-mono font-bold">
                            NOW
                          </span>
                        )}
                        <span className="text-xs font-bold text-white truncate">
                          {prog.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {prog.start} – {prog.stop} ({prog.durationMinutes}m)
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">
                      {prog.description || 'Program guide details provided by television source.'}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-center h-32 text-xs text-slate-500">
                No upcoming program guide available for this channel
              </div>
            )}
          </div>
        </div>
      </main>
    </div>

    {/* EXIT CONFIRMATION DIALOG (MODAL OVERLAY) */}
    {showExitDialog && (
      <div
        id="exit-dialog-overlay"
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setShowExitDialog(false)}
      >
        <div
          id="exit-dialog-card"
          className="bg-[#0e1626] border border-white/15 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
            <LogOut className="w-6 h-6" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">Exit Live TV?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to leave Live TV and return to the main dashboard? Your active broadcast stream will stop.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              id="exit-dialog-cancel-btn"
              type="button"
              onClick={() => setShowExitDialog(false)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                focusedExitButton === 'cancel'
                  ? 'bg-slate-700 text-white ring-2 ring-cyan-400 shadow-lg shadow-cyan-500/20 scale-105'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              id="exit-dialog-exit-btn"
              type="button"
              onClick={() => {
                setShowExitDialog(false);
                if (onExit) onExit();
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                focusedExitButton === 'exit'
                  ? 'bg-rose-600 text-white ring-2 ring-rose-400 shadow-lg shadow-rose-500/30 scale-105'
                  : 'bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900'
              }`}
            >
              Exit
            </button>
          </div>

          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-2 pt-2 border-t border-white/5">
            <span>[ ◀ / ▶ ] Choose</span>
            <span>•</span>
            <span>[ Enter ] Confirm</span>
            <span>•</span>
            <span>[ Back ] Cancel</span>
          </div>
        </div>
      </div>
    )}
  </div>
);
};

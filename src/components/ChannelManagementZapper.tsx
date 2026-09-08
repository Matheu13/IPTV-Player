import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Heart,
  FolderPlus,
  Trash2,
  Eye,
  EyeOff,
  Hash,
  Tv,
  Radio,
  Gamepad2,
  Volume2,
  VolumeX,
  Maximize2,
  Activity,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  Plus,
  Trophy,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Filter,
  Check,
  Flame,
  Play,
} from 'lucide-react';
import { CustomBouquet, ChannelOverrideMapping, UnifiedChannel } from '../types';
import { ChannelManager, RemoteZapperController, isSportsChannel } from '../lib/channelManager';
import { globalUnifiedIptvEngine } from '../lib/unifiedIptvEngine';
import {
  normalizeCategoryHierarchy,
  NormalizedCountryGroup,
  NormalizedChildCategory,
  NormalizedCategoryHierarchy,
} from '../lib/categoryNormalizer';

interface ChannelManagementZapperProps {
  onTuneChannel?: (channelId: string | number, name: string) => void;
}

export const ChannelManagementZapper: React.FC<ChannelManagementZapperProps> = ({ onTuneChannel }) => {
  const [activeSubTab, setActiveSubTab] = useState<'REMOTE_ZAPPER' | 'SPORTS_MANAGER' | 'FAVORITES' | 'BOUQUETS' | 'OVERRIDES'>('REMOTE_ZAPPER');
  const [favorites, setFavorites] = useState<(string | number)[]>([]);
  const [bouquets, setBouquets] = useState<CustomBouquet[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ChannelOverrideMapping>>({});
  const [newBouquetName, setNewBouquetName] = useState<string>('');
  const [newBouquetDesc, setNewBouquetDesc] = useState<string>('');
  const [selectedBouquetId, setSelectedBouquetId] = useState<string | null>(null);
  const [zapperNotice, setZapperNotice] = useState<string | null>(null);
  const [zapperSearch, setZapperSearch] = useState<string>('');
  const [windowOffset, setWindowOffset] = useState<number>(0);

  // Smart Sport Filtering & Country Taxonomy State
  const [isSportsFilterActive, setIsSportsFilterActive] = useState<boolean>(false);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<string | null>(null);
  const [expandedCountries, setExpandedCountries] = useState<Record<string, boolean>>({
    sweden: true,
    Sweden: true,
    uk: false,
    UK: false,
    canada: false,
    Canada: false,
    norway: false,
    Norway: false,
    other: false,
    Other: false,
  });
  const [showRemote, setShowRemote] = useState<boolean>(true);

  // 10-Foot UI Remote & D-pad Navigation State
  const [focusZone, setFocusZone] = useState<'sidebar' | 'channels'>('sidebar');
  const [focusedSidebarIndex, setFocusedSidebarIndex] = useState<number>(0);

  // Remote & Keypad State
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');
  const [currentChannelIndex, setCurrentChannelIndex] = useState<number>(0);

  // Dynamic normalized hierarchy (Country -> Child Category)
  const normalizedHierarchy: NormalizedCategoryHierarchy = useMemo(() => {
    const allEngineChannels = globalUnifiedIptvEngine.getAllChannels();
    const catalog =
      allEngineChannels && allEngineChannels.length > 0
        ? allEngineChannels
        : (ChannelManager.getHydratedWindow(0, 1000).channels as any);

    const baseList = isSportsFilterActive
      ? catalog.filter((c: any) =>
          isSportsChannel({ name: c.name, categoryName: c.category || c.categoryName || c.categoryId })
        )
      : catalog;

    return normalizeCategoryHierarchy(
      baseList.map((c: any) => ({
        id: c.id || c.streamId,
        name: c.name,
        category: c.category || c.categoryName || c.categoryId || 'General',
      }))
    );
  }, [isSportsFilterActive]);

  // Flattened visible rows for 10-foot D-pad navigation
  const visibleSidebarRows = useMemo<
    Array<{
      id: string;
      type: 'all' | 'sports' | 'country' | 'subcategory';
      country?: NormalizedCountryGroup;
      subCategory?: NormalizedChildCategory;
      isExpanded?: boolean;
    }>
  >(() => {
    const rows: Array<{
      id: string;
      type: 'all' | 'sports' | 'country' | 'subcategory';
      country?: NormalizedCountryGroup;
      subCategory?: NormalizedChildCategory;
      isExpanded?: boolean;
    }> = [
      { id: 'btn-category-all-channels', type: 'all' },
      { id: 'btn-category-sports-filter', type: 'sports' },
    ];

    for (const country of normalizedHierarchy.countries) {
      const isExpanded = !!(expandedCountries[country.id] || expandedCountries[country.name]);
      rows.push({
        id: `country-header-${country.id.toLowerCase()}`,
        type: 'country',
        country,
        isExpanded,
      });

      if (isExpanded) {
        for (const sub of country.subCategories) {
          rows.push({
            id: `subcat-${country.id.toLowerCase()}-${sub.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
            type: 'subcategory',
            country,
            subCategory: sub,
          });
        }
      }
    }

    return rows;
  }, [normalizedHierarchy.countries, expandedCountries]);

  // Toggle Country Group Expansion while maintaining focus and selecting country
  const toggleCountryGroup = (country: NormalizedCountryGroup, e?: React.SyntheticEvent) => {
    const isExpanded = !!(expandedCountries[country.id] || expandedCountries[country.name]);
    const nextExpanded = !isExpanded;
    setExpandedCountries((prev) => ({
      ...prev,
      [country.id]: nextExpanded,
      [country.name]: nextExpanded,
    }));
    setSelectedCountry(country.name);
    setSelectedSubCategory(null);
    setWindowOffset(0);
    setFocusZone('sidebar');
    const headerId = `country-header-${country.id.toLowerCase()}`;
    const idx = visibleSidebarRows.findIndex((r) => r.id === headerId);
    if (idx >= 0) {
      setFocusedSidebarIndex(idx);
    }
    if (e && 'currentTarget' in e && e.currentTarget) {
      (e.currentTarget as HTMLElement).focus();
    }
  };

  // Synchronize sports filter state when tab switches to SPORTS_MANAGER
  const handleSelectSubTab = (tab: 'REMOTE_ZAPPER' | 'SPORTS_MANAGER' | 'FAVORITES' | 'BOUQUETS' | 'OVERRIDES') => {
    setActiveSubTab(tab);
    if (tab === 'SPORTS_MANAGER') {
      setIsSportsFilterActive(true);
      setWindowOffset(0);
    }
  };

  // Virtualized Data Loader hydration with Smart Sports & Country filters
  const windowResult = ChannelManager.getHydratedWindow(windowOffset, 100, {
    searchQuery: zapperSearch,
    isSportsOnly: isSportsFilterActive,
    country: selectedCountry || undefined,
    subCategory: selectedSubCategory || undefined,
  });

  const rawChannels: UnifiedChannel[] =
    windowResult.channels.length > 0
      ? windowResult.channels
      : (globalUnifiedIptvEngine.getAllChannels().slice(0, 100).map((ch) => ({
          id: ch.id,
          num: ch.channelNumber,
          name: ch.name,
          streamType: 'live',
          streamId: ch.id,
          streamIcon: ch.logoUrl || undefined,
          epgChannelId: ch.tvgId || undefined,
          categoryId: ch.category || 'General',
          categoryName: ch.category || 'General',
          tvArchive: false,
          directSourceUrl: ch.streamUrl,
          sourceType: 'M3U' as const,
          formatsAvailable: ['hls', 'ts'],
          isFavorite: ch.isFavorite,
        })) as UnifiedChannel[]);

  const transformedChannels = ChannelManager.applyOverrides(rawChannels);
  const memStats = ChannelManager.getMemoryStats();
  const categoryTreeCounts = ChannelManager.getCategoryTreeCounts(isSportsFilterActive);

  const reloadData = () => {
    setFavorites(ChannelManager.getFavorites());
    setBouquets(ChannelManager.getBouquets());
    setOverrides(ChannelManager.getOverrides());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Remote Zapper Controller instance
  const [controller] = useState(() => {
    return new RemoteZapperController({
      onDigitCommitted: (num) => {
        setKeypadBuffer('');
        const found = transformedChannels.find((c) => c.num === num || String(c.streamId) === String(num));
        if (found) {
          if (onTuneChannel) onTuneChannel(found.streamId, found.name);
          setZapperNotice(`Tuned directly to CH ${num}: ${found.name}`);
        } else {
          setZapperNotice(`Channel #${num} not found in channel map`);
        }
        setTimeout(() => setZapperNotice(null), 3000);
      },
      onZappedChannel: (delta) => {
        setCurrentChannelIndex((prev) => {
          const total = transformedChannels.length;
          if (total === 0) return 0;
          const next = (prev + delta + total) % total;
          const target = transformedChannels[next];
          if (onTuneChannel && target) {
            onTuneChannel(target.streamId, target.name);
          }
          setZapperNotice(`Zapped to CH ${target.num}: ${target.name}`);
          setTimeout(() => setZapperNotice(null), 2500);
          return next;
        });
      },
    });
  });

  const handleDigit = (digit: string | number) => {
    const buf = controller.inputDigit(digit);
    setKeypadBuffer(buf);
  };

  const handleStepChannel = (delta: number) => {
    controller.stepChannel(delta);
  };

  const handleToggleFavorite = (id: string | number) => {
    ChannelManager.toggleFavorite(id);
    reloadData();
  };

  const handleToggleHide = (id: string | number, currentHidden: boolean) => {
    ChannelManager.setChannelHidden(id, !currentHidden);
    reloadData();
  };

  const handleSetCustomNumber = (id: string | number, numStr: string) => {
    const num = parseInt(numStr, 10);
    if (!isNaN(num)) {
      ChannelManager.setChannelCustomNumber(id, num);
      reloadData();
    }
  };

  const handleCreateBouquet = () => {
    if (!newBouquetName.trim()) return;
    ChannelManager.createBouquet(newBouquetName, newBouquetDesc, ['10452']);
    setNewBouquetName('');
    setNewBouquetDesc('');
    reloadData();
  };

  const handleDeleteBouquet = (id: string) => {
    ChannelManager.deleteBouquet(id);
    if (selectedBouquetId === id) setSelectedBouquetId(null);
    reloadData();
  };

  const handleAddChannelToBouquet = (bouquetId: string, channelId: string | number) => {
    const bouquet = bouquets.find((b) => b.id === bouquetId);
    if (!bouquet) return;
    const strId = String(channelId);
    const existing = new Set(bouquet.channelIds.map(String));
    if (existing.has(strId)) {
      setZapperNotice(`Channel already in ${bouquet.name}`);
    } else {
      ChannelManager.addChannelToBouquet(bouquetId, channelId);
      setZapperNotice(`Added to bouquet "${bouquet.name}"`);
      reloadData();
    }
    setTimeout(() => setZapperNotice(null), 2500);
  };

  const handleAddAllToSportsBouquet = () => {
    const sportsBouquetName = '🏆 Live Sports Feeds';
    let target = bouquets.find((b) => b.name === sportsBouquetName);
    if (!target) {
      target = ChannelManager.createBouquet(sportsBouquetName, 'Curated sports channels and live event broadcasts', []);
    }
    const idsToAdd = transformedChannels.map((c) => c.streamId);
    idsToAdd.forEach((id) => ChannelManager.addChannelToBouquet(target!.id, id));
    setZapperNotice(`Saved ${idsToAdd.length} channels into "${sportsBouquetName}" bouquet!`);
    reloadData();
    setTimeout(() => setZapperNotice(null), 3000);
  };

  const handleFavoriteAllInView = () => {
    transformedChannels.forEach((c) => {
      if (!ChannelManager.isFavorite(c.streamId)) {
        ChannelManager.toggleFavorite(c.streamId);
      }
    });
    setZapperNotice(`Favorited all ${transformedChannels.length} channels in view`);
    reloadData();
    setTimeout(() => setZapperNotice(null), 2500);
  };

  const handleClearFilters = () => {
    setSelectedCountry(null);
    setSelectedSubCategory(null);
    setIsSportsFilterActive(false);
    setZapperSearch('');
    setWindowOffset(0);
  };

  // 10-foot UI Keyboard & Remote Event Listeners for 10-foot D-pad navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not intercept when user is actively typing in text inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key;

      // 10-foot TV Remote Number Dialing (0-9)
      if (/^[0-9]$/.test(key)) {
        handleDigit(key);
        return;
      }
      if (key === 'Backspace' && keypadBuffer) {
        setKeypadBuffer((prev) => prev.slice(0, -1));
        return;
      }

      if (focusZone === 'sidebar') {
        const currentRow = visibleSidebarRows[focusedSidebarIndex];

        // D-pad UP
        if (key === 'ArrowUp' || key === 'Up') {
          e.preventDefault();
          if (focusedSidebarIndex > 0) {
            const nextIdx = focusedSidebarIndex - 1;
            setFocusedSidebarIndex(nextIdx);
            const el = document.getElementById(visibleSidebarRows[nextIdx]?.id);
            el?.focus();
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          return;
        }

        // D-pad DOWN
        if (key === 'ArrowDown' || key === 'Down') {
          e.preventDefault();
          if (focusedSidebarIndex < visibleSidebarRows.length - 1) {
            const nextIdx = focusedSidebarIndex + 1;
            setFocusedSidebarIndex(nextIdx);
            const el = document.getElementById(visibleSidebarRows[nextIdx]?.id);
            el?.focus();
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          return;
        }

        // D-pad LEFT: "LEFT should collapse an expanded group"
        if (key === 'ArrowLeft' || key === 'Left') {
          e.preventDefault();
          if (currentRow?.type === 'country') {
            const isExpanded = !!(
              expandedCountries[currentRow.country!.id] ||
              expandedCountries[currentRow.country!.name]
            );
            if (isExpanded) {
              setExpandedCountries((prev) => ({
                ...prev,
                [currentRow.country!.id]: false,
                [currentRow.country!.name]: false,
              }));
              // Maintain focus on this parent group header
              const el = document.getElementById(currentRow.id);
              el?.focus();
            }
          } else if (currentRow?.type === 'subcategory') {
            // Move focus back up to its parent country header
            const parentIdx = visibleSidebarRows.findIndex(
              (r) => r.type === 'country' && r.country?.id === currentRow.country?.id
            );
            if (parentIdx >= 0) {
              setFocusedSidebarIndex(parentIdx);
              const el = document.getElementById(visibleSidebarRows[parentIdx].id);
              el?.focus();
              el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
          return;
        }

        // D-pad RIGHT: "RIGHT/OK should expand a collapsed group or select a channel"
        if (key === 'ArrowRight' || key === 'Right') {
          e.preventDefault();
          if (currentRow?.type === 'country') {
            const isExpanded = !!(
              expandedCountries[currentRow.country!.id] ||
              expandedCountries[currentRow.country!.name]
            );
            if (!isExpanded) {
              // Expand collapsed country group
              setExpandedCountries((prev) => ({
                ...prev,
                [currentRow.country!.id]: true,
                [currentRow.country!.name]: true,
              }));
              setSelectedCountry(currentRow.country!.name);
              setSelectedSubCategory(null);
              setWindowOffset(0);
              // Maintain focus on this parent header
              const el = document.getElementById(currentRow.id);
              el?.focus();
            } else {
              // Already expanded: move focus into child category or to channel list
              if (currentRow.country?.subCategories && currentRow.country.subCategories.length > 0) {
                const nextIdx = focusedSidebarIndex + 1;
                setFocusedSidebarIndex(nextIdx);
                const el = document.getElementById(visibleSidebarRows[nextIdx]?.id);
                el?.focus();
                el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
              } else {
                setFocusZone('channels');
                const chEl = document.getElementById(`surf-ch-${transformedChannels[0]?.streamId}`);
                chEl?.focus();
              }
            }
          } else if (currentRow?.type === 'subcategory') {
            // Select subcategory and move focus to channel list
            setSelectedCountry(currentRow.country!.name);
            setSelectedSubCategory(currentRow.subCategory!.name);
            setWindowOffset(0);
            setFocusZone('channels');
            const chEl = document.getElementById(`surf-ch-${transformedChannels[0]?.streamId}`);
            chEl?.focus();
          } else {
            // ALL CHANNELS or SPORTS FILTER: shift focus into channel list
            setFocusZone('channels');
            const chEl = document.getElementById(`surf-ch-${transformedChannels[currentChannelIndex]?.streamId}`);
            chEl?.focus();
          }
          return;
        }

        // D-pad ENTER / OK / SELECT
        if (key === 'Enter' || key === ' ' || key === 'Select') {
          e.preventDefault();
          if (currentRow?.type === 'country') {
            toggleCountryGroup(currentRow.country!);
          } else if (currentRow?.type === 'subcategory') {
            setSelectedCountry(currentRow.country!.name);
            setSelectedSubCategory(currentRow.subCategory!.name);
            setWindowOffset(0);
            setFocusZone('channels');
            const chEl = document.getElementById(`surf-ch-${transformedChannels[0]?.streamId}`);
            chEl?.focus();
          } else if (currentRow?.type === 'all') {
            handleClearFilters();
            document.getElementById('btn-category-all-channels')?.focus();
          } else if (currentRow?.type === 'sports') {
            setIsSportsFilterActive((prev) => !prev);
            setWindowOffset(0);
            document.getElementById('btn-category-sports-filter')?.focus();
          }
          return;
        }
      } else if (focusZone === 'channels') {
        // Navigating live channel list
        if (key === 'ArrowUp' || key === 'Up') {
          e.preventDefault();
          if (currentChannelIndex > 0) {
            const nextIdx = currentChannelIndex - 1;
            setCurrentChannelIndex(nextIdx);
            const el = document.getElementById(`surf-ch-${transformedChannels[nextIdx]?.streamId}`);
            el?.focus();
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          return;
        }

        if (key === 'ArrowDown' || key === 'Down') {
          e.preventDefault();
          if (currentChannelIndex < transformedChannels.length - 1) {
            const nextIdx = currentChannelIndex + 1;
            setCurrentChannelIndex(nextIdx);
            const el = document.getElementById(`surf-ch-${transformedChannels[nextIdx]?.streamId}`);
            el?.focus();
            el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          return;
        }

        // LEFT moves back to category sidebar
        if (key === 'ArrowLeft' || key === 'Left') {
          e.preventDefault();
          setFocusZone('sidebar');
          const sidebarEl = document.getElementById(visibleSidebarRows[focusedSidebarIndex]?.id);
          sidebarEl?.focus();
          sidebarEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return;
        }

        // OK / ENTER tunes the focused channel
        if (key === 'Enter' || key === ' ' || key === 'Select') {
          e.preventDefault();
          const target = transformedChannels[currentChannelIndex];
          if (target) {
            if (onTuneChannel) {
              onTuneChannel(target.streamId, target.name);
            }
            setZapperNotice(`Tuned directly to CH ${target.num}: ${target.name}`);
            setTimeout(() => setZapperNotice(null), 3000);
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    focusZone,
    focusedSidebarIndex,
    visibleSidebarRows,
    expandedCountries,
    currentChannelIndex,
    transformedChannels,
    keypadBuffer,
    onTuneChannel,
  ]);

  // Render Category & Country Taxonomy Navigation Sidebar (Normalized Country -> Child Category Hierarchy)
  const renderCategoryCountrySidebar = () => (
    <div className="w-full lg:w-72 shrink-0 bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 font-sans select-none shadow-sm">
      {/* Search live channels... */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          id="input-category-search"
          type="text"
          placeholder="Search live channels..."
          value={zapperSearch}
          onChange={(e) => {
            setZapperSearch(e.target.value);
            setWindowOffset(0);
          }}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-7 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {zapperSearch && (
          <button
            onClick={() => {
              setZapperSearch('');
              setWindowOffset(0);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Primary Category Buttons: ALL CHANNELS & SMART SPORTS FILTER */}
      <div className="space-y-1.5 pt-0.5">
        <button
          id="btn-category-all-channels"
          tabIndex={0}
          onFocus={() => {
            setFocusZone('sidebar');
            setFocusedSidebarIndex(0);
          }}
          onClick={(e) => {
            handleClearFilters();
            setFocusZone('sidebar');
            setFocusedSidebarIndex(0);
            e.currentTarget.focus();
          }}
          className={`w-full px-3 py-2 rounded-lg font-bold flex items-center justify-between text-left text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            !selectedCountry && !selectedSubCategory && !isSportsFilterActive
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
          }`}
        >
          <span className="tracking-wide">ALL CHANNELS</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/30 font-normal">
            {normalizedHierarchy.allCount.toLocaleString()}
          </span>
        </button>

        {/* Dedicated Sports Category Filter */}
        <button
          id="btn-category-sports-filter"
          tabIndex={0}
          onFocus={() => {
            setFocusZone('sidebar');
            setFocusedSidebarIndex(1);
          }}
          onClick={(e) => {
            setIsSportsFilterActive(!isSportsFilterActive);
            setWindowOffset(0);
            setFocusZone('sidebar');
            setFocusedSidebarIndex(1);
            e.currentTarget.focus();
          }}
          className={`w-full px-3 py-2 rounded-lg font-bold flex items-center justify-between text-left text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            isSportsFilterActive
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md ring-1 ring-emerald-400/40'
              : 'bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/40'
          }`}
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="tracking-wide">SPORTS FILTER</span>
          </div>
          <div className="flex items-center gap-1">
            {isSportsFilterActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping mr-1" />
            )}
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 font-normal">
              {categoryTreeCounts.sportsCount.toLocaleString()}
            </span>
          </div>
        </button>
      </div>

      {/* Categorized by Country Section Header */}
      <div className="pt-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-2 flex items-center justify-between border-b border-slate-800/70">
          <span>Categorized by Country</span>
          {isSportsFilterActive && (
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/60 font-semibold">
              Sports Only
            </span>
          )}
        </div>

        {/* Tree Accordion of Normalized Countries & Subcategories */}
        <div className="mt-2 space-y-1">
          {normalizedHierarchy.countries.map((country) => {
            const isExpanded = !!(expandedCountries[country.id] || expandedCountries[country.name]);
            const isSelectedCountry = selectedCountry === country.name && !selectedSubCategory;
            const countryElemId = `country-header-${country.id.toLowerCase()}`;

            return (
              <div key={country.id} className="space-y-1">
                {/* Country Header Button */}
                <button
                  type="button"
                  id={countryElemId}
                  tabIndex={0}
                  onFocus={() => {
                    setFocusZone('sidebar');
                    const idx = visibleSidebarRows.findIndex((r) => r.id === countryElemId);
                    if (idx >= 0) setFocusedSidebarIndex(idx);
                  }}
                  onClick={(e) => {
                    toggleCountryGroup(country, e);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                    isSelectedCountry
                      ? 'bg-slate-800 text-white font-bold ring-1 ring-slate-700'
                      : 'hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold">
                    {isExpanded ? (
                      <span className="text-slate-400 text-xs">▾</span>
                    ) : (
                      <span className="text-slate-500 text-xs">▸</span>
                    )}
                    <span>{country.name}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {country.count}
                  </span>
                </button>

                {/* Subcategories (Child categories under this country) */}
                {isExpanded && (
                  <div className="pl-4 pr-1 space-y-0.5 border-l border-slate-800/80 ml-2.5 my-1">
                    {country.subCategories.map((sub) => {
                      const isSelectedSub = selectedCountry === country.name && selectedSubCategory === sub.name;
                      const isZeroInSports = isSportsFilterActive && sub.count === 0;
                      const subElemId = `subcat-${country.id.toLowerCase()}-${sub.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

                      return (
                        <button
                          key={sub.id}
                          id={subElemId}
                          tabIndex={0}
                          onFocus={() => {
                            setFocusZone('sidebar');
                            const idx = visibleSidebarRows.findIndex((r) => r.id === subElemId);
                            if (idx >= 0) setFocusedSidebarIndex(idx);
                          }}
                          onClick={(e) => {
                            setSelectedCountry(country.name);
                            setSelectedSubCategory(sub.name);
                            setWindowOffset(0);
                            setFocusZone('sidebar');
                            e.currentTarget.focus();
                          }}
                          className={`w-full px-2.5 py-1.5 rounded text-left flex items-center justify-between text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            isSelectedSub
                              ? 'bg-indigo-600/90 text-white font-bold shadow-xs'
                              : isZeroInSports
                              ? 'text-slate-600 hover:text-slate-500 hover:bg-slate-900/40'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
                          }`}
                        >
                          <span className="truncate">{sub.name}</span>
                          <span
                            className={`text-[10px] font-mono ml-1 ${
                              isZeroInSports ? 'text-slate-700' : 'text-slate-500'
                            }`}
                          >
                            {sub.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6" id="channel-management-zapper">
      {/* Header & Sub-Tabs Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
            <Gamepad2 className="w-4 h-4" />
            <span>Milestone 3c • Channel Management, Bouquets & 10-Foot Remote Zapper</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Custom Bouquets, Channel Overrides & Remote Navigation</h2>
          <p className="text-slate-400 text-xs mt-1">
            Fast zapping debouncing (250ms), numeric channel dialing, bouquet curation, and smart sport category filtering.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
          <button
            id="btn-subtab-remote"
            onClick={() => handleSelectSubTab('REMOTE_ZAPPER')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'REMOTE_ZAPPER'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" /> 10-Foot Remote
          </button>
          <button
            id="btn-subtab-sports"
            onClick={() => handleSelectSubTab('SPORTS_MANAGER')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'SPORTS_MANAGER'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-emerald-400 hover:text-emerald-300'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" /> Sports Manager
          </button>
          <button
            id="btn-subtab-favs"
            onClick={() => handleSelectSubTab('FAVORITES')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'FAVORITES'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" /> Favorites ({favorites.length})
          </button>
          <button
            id="btn-subtab-bouquets"
            onClick={() => handleSelectSubTab('BOUQUETS')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'BOUQUETS'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Bouquets ({bouquets.length})
          </button>
          <button
            id="btn-subtab-overrides"
            onClick={() => handleSelectSubTab('OVERRIDES')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'OVERRIDES'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> Overrides & Hiding
          </button>
        </div>
      </div>

      {zapperNotice && (
        <div className="bg-indigo-950/90 border border-indigo-700 text-indigo-300 px-4 py-3 rounded-lg text-xs flex items-center gap-2 animate-fadeIn">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{zapperNotice}</span>
        </div>
      )}

      {/* Active Sports Filter Notice Banner */}
      {isSportsFilterActive && (
        <div className="bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border border-emerald-700/80 text-emerald-200 px-4 py-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Smart Sports Filter Active: </span>
              <span className="text-emerald-300">
                Isolating live sports channels, football events, stadium streams, and PPV feeds across all countries.
              </span>
            </div>
          </div>
          <button
            onClick={handleClearFilters}
            className="self-start sm:self-auto px-3 py-1 rounded bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 text-xs font-medium border border-emerald-600/60 transition-colors"
          >
            Show All Channels
          </button>
        </div>
      )}

      {/* Tab: REMOTE ZAPPER (Includes Remote + Country Category Sidebar + Channel Surfing Map) */}
      {activeSubTab === 'REMOTE_ZAPPER' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Browse by Country, toggle the Smart Sports Filter, or use the 10-foot remote to dial channels.
            </div>
            <button
              onClick={() => setShowRemote(!showRemote)}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>{showRemote ? 'Hide Remote' : 'Show Remote'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Virtual Remote Control UI (Collapsible) */}
            {showRemote && (
              <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col items-center space-y-4 shadow-2xl">
                <div className="w-full flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-indigo-400" /> Remote Controller
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                {/* Keypad Display Buffer */}
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                  <div className="text-[10px] text-slate-500 font-mono">DIAL BUFFER</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 tracking-widest min-h-[32px]">
                    {keypadBuffer ? `CH ${keypadBuffer}_` : `CH ${transformedChannels[currentChannelIndex]?.num || '---'}`}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {transformedChannels[currentChannelIndex]?.name || 'No Channel'}
                  </div>
                </div>

                {/* Ch +/- and Vol +/- D-Pad Area */}
                <div className="grid grid-cols-2 gap-3 w-full">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">CHANNEL</span>
                    <button
                      id="btn-remote-ch-up"
                      onClick={() => handleStepChannel(1)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95"
                    >
                      CH ▲
                    </button>
                    <button
                      id="btn-remote-ch-down"
                      onClick={() => handleStepChannel(-1)}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95"
                    >
                      CH ▼
                    </button>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex flex-col items-center space-y-2">
                    <span className="text-[10px] font-bold text-slate-400">VOLUME</span>
                    <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all active:scale-95">
                      VOL +
                    </button>
                    <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all active:scale-95">
                      VOL -
                    </button>
                  </div>
                </div>

                {/* 10-Key Numeric Keypad (0-9) */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Fav', '0', 'OK'].map((btn) => (
                    <button
                      key={btn}
                      id={`btn-keypad-${btn}`}
                      onClick={() => {
                        if (/^\d$/.test(btn)) {
                          handleDigit(btn);
                        } else if (btn === 'OK') {
                          controller.commitDigits();
                        } else if (btn === 'Fav') {
                          const activeCh = transformedChannels[currentChannelIndex];
                          if (activeCh) handleToggleFavorite(activeCh.streamId);
                        }
                      }}
                      className={`py-2.5 rounded-xl font-bold font-mono text-sm transition-all active:scale-90 ${
                        btn === 'OK'
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : btn === 'Fav'
                          ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                      }`}
                    >
                      {btn}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category & Country Navigation Tree and Channel Surfing Area */}
            <div className={`${showRemote ? 'lg:col-span-8' : 'lg:col-span-12'} grid grid-cols-1 md:grid-cols-12 gap-4`}>
              {/* Country & Category Taxonomy Panel */}
              <div className="md:col-span-5 lg:col-span-4">
                {renderCategoryCountrySidebar()}
              </div>

              {/* Channel Surfing Guide & Quick Management */}
              <div className="md:col-span-7 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 border-b border-slate-800 gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Live Channel Surfing Map</span>
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                        {transformedChannels.length} / {windowResult.totalMatching.toLocaleString()} channels
                      </span>
                    </h3>
                    {selectedCountry || selectedSubCategory ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-slate-400">Filtering:</span>
                        <span className="text-[11px] font-semibold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/60">
                          {selectedCountry} {selectedSubCategory ? `> ${selectedSubCategory}` : ''}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedCountry(null);
                            setSelectedSubCategory(null);
                            setWindowOffset(0);
                          }}
                          className="text-[10px] text-slate-400 hover:text-white underline ml-1"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Click any channel to tune directly or use the remote.</p>
                    )}
                  </div>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 self-start sm:self-auto">
                    250ms Anti-Flood Guard
                  </span>
                </div>

                {/* Batch Action Helpers */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button
                    onClick={handleFavoriteAllInView}
                    className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-rose-300 border border-rose-900/60 flex items-center gap-1 text-[11px] font-medium transition-colors"
                  >
                    <Heart className="w-3 h-3 text-rose-500 fill-current" /> Favorite All in View
                  </button>
                  <button
                    onClick={handleAddAllToSportsBouquet}
                    className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-900/60 flex items-center gap-1 text-[11px] font-medium transition-colors"
                  >
                    <Trophy className="w-3 h-3 text-amber-400" /> Save as Sports Bouquet
                  </button>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between gap-2 bg-slate-950/70 p-2 rounded-lg border border-slate-800/80">
                  <button
                    id="zapper-prev-page-btn"
                    onClick={() => setWindowOffset((prev) => Math.max(0, prev - 100))}
                    disabled={windowOffset <= 0}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 text-[11px] font-mono"
                  >
                    ◀ Prev 100
                  </button>
                  <span className="text-[11px] font-mono text-slate-400 px-1">
                    {windowResult.totalMatching > 0 ? windowOffset + 1 : 0}–
                    {Math.min(windowOffset + 100, windowResult.totalMatching)} of {windowResult.totalMatching}
                  </span>
                  <button
                    id="zapper-next-page-btn"
                    onClick={() => setWindowOffset((prev) => prev + 100)}
                    disabled={windowOffset + 100 >= windowResult.totalMatching}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 text-[11px] font-mono"
                  >
                    Next 100 ▶
                  </button>
                </div>

                {/* Channel List */}
                <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
                  {transformedChannels.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs">
                      No channels match the current sports or country filter.
                    </div>
                  ) : (
                    transformedChannels.map((ch, idx) => {
                      const isCurrent = idx === currentChannelIndex;
                      const isFav = ChannelManager.isFavorite(ch.streamId);
                      const isSports = isSportsChannel({ name: ch.name, categoryName: ch.categoryId });

                      return (
                        <div
                          key={ch.id}
                          id={`surf-ch-${ch.streamId}`}
                          tabIndex={0}
                          onFocus={() => {
                            setFocusZone('channels');
                            setCurrentChannelIndex(idx);
                          }}
                          onClick={() => {
                            setFocusZone('channels');
                            setCurrentChannelIndex(idx);
                            if (onTuneChannel) onTuneChannel(ch.streamId, ch.name);
                            setZapperNotice(`Tuned directly to CH ${ch.num}: ${ch.name}`);
                            setTimeout(() => setZapperNotice(null), 3000);
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                            isCurrent
                              ? 'bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                              : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-8 text-center text-xs font-mono font-bold text-amber-400 bg-slate-900 px-1.5 py-1 rounded border border-slate-800 shrink-0">
                              {ch.num}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
                                <span className="truncate">{ch.name}</span>
                                {isSports && (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/90 px-1.5 py-0.2 rounded border border-emerald-700/60 flex items-center gap-1 shrink-0">
                                    <Trophy className="w-2.5 h-2.5" /> SPORTS
                                  </span>
                                )}
                                {isFav && <Heart className="w-3.5 h-3.5 text-rose-500 fill-current shrink-0" />}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono truncate">
                                Stream ID: {ch.streamId}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Tune Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentChannelIndex(idx);
                                if (onTuneChannel) onTuneChannel(ch.streamId, ch.name);
                              }}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all active:scale-95"
                            >
                              Tune
                            </button>

                            {/* Favorite Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleFavorite(ch.streamId);
                              }}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isFav
                                  ? 'bg-rose-950 border-rose-800 text-rose-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400'
                              }`}
                            >
                              <Heart className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Dedicated SPORTS MANAGER (Full-Width Sports Isolation & Channel Operations) */}
      {activeSubTab === 'SPORTS_MANAGER' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>Sports Channel Manager & Isolation Engine</span>
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    {categoryTreeCounts.sportsCount.toLocaleString()} Sports Channels
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Isolate sports feeds by country, assign channels to custom sports bouquets, reorder LCN numbers, and star favorites.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddAllToSportsBouquet}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> Bouquet "Live Sports"
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
              {/* Country Navigation Sidebar */}
              <div className="md:col-span-4 lg:col-span-3">
                {renderCategoryCountrySidebar()}
              </div>

              {/* Sports Channels List & Management Controls */}
              <div className="md:col-span-8 lg:col-span-9 space-y-4">
                {/* Active Filter & Pagination Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Sports Category:</span>
                    <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-lg border border-emerald-800">
                      {selectedCountry ? `${selectedCountry} ${selectedSubCategory ? `• ${selectedSubCategory}` : ''}` : 'All Sports Channels'}
                    </span>
                    {(selectedCountry || selectedSubCategory) && (
                      <button
                        onClick={() => {
                          setSelectedCountry(null);
                          setSelectedSubCategory(null);
                          setWindowOffset(0);
                        }}
                        className="text-xs text-slate-400 hover:text-white underline"
                      >
                        Reset Country
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setWindowOffset((prev) => Math.max(0, prev - 100))}
                      disabled={windowOffset <= 0}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 text-xs font-mono"
                    >
                      ◀ Prev 100
                    </button>
                    <span className="text-xs font-mono text-slate-400">
                      {windowResult.totalMatching > 0 ? windowOffset + 1 : 0}–
                      {Math.min(windowOffset + 100, windowResult.totalMatching)} of {windowResult.totalMatching}
                    </span>
                    <button
                      onClick={() => setWindowOffset((prev) => prev + 100)}
                      disabled={windowOffset + 100 >= windowResult.totalMatching}
                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 border border-slate-800 text-xs font-mono"
                    >
                      Next 100 ▶
                    </button>
                  </div>
                </div>

                {/* Sports Channels Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {transformedChannels.map((ch) => {
                    const isFav = ChannelManager.isFavorite(ch.streamId);
                    const ovr = overrides[String(ch.streamId)];
                    const isHidden = ovr?.hidden || false;
                    const currentNum = ovr?.customNumber !== undefined ? ovr.customNumber : ch.num;

                    return (
                      <div
                        key={ch.id}
                        className={`bg-slate-950 border rounded-xl p-3.5 space-y-2 transition-all ${
                          isHidden ? 'border-slate-800/40 opacity-60' : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                CH {currentNum}
                              </span>
                              <span className="text-xs font-bold text-white truncate">{ch.name}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              ID: {ch.streamId} • {ch.categoryId || 'Sports'}
                            </div>
                          </div>

                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 shrink-0">
                            LIVE EVENT
                          </span>
                        </div>

                        {/* Quick Channel Operations: Tune, Star, Hide, LCN */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-900">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (onTuneChannel) onTuneChannel(ch.streamId, ch.name);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1 transition-all"
                            >
                              <Play className="w-3 h-3 fill-current" /> Tune
                            </button>
                            <button
                              onClick={() => handleToggleFavorite(ch.streamId)}
                              className={`p-1.5 rounded border transition-colors ${
                                isFav
                                  ? 'bg-rose-950 border-rose-800 text-rose-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400'
                              }`}
                            >
                              <Heart className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              onClick={() => handleToggleHide(ch.streamId, isHidden)}
                              className={`p-1.5 rounded border transition-colors ${
                                isHidden
                                  ? 'bg-amber-950 border-amber-800 text-amber-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* LCN Override Input */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-mono">LCN:</span>
                            <input
                              type="number"
                              defaultValue={currentNum}
                              onBlur={(e) => handleSetCustomNumber(ch.streamId, e.target.value)}
                              className="w-14 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-amber-400 font-mono text-center focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Favorites */}
      {activeSubTab === 'FAVORITES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Your Starred Channels & Content</h3>
              <p className="text-xs text-slate-400">Quick-access favorite items saved with instant local persistence.</p>
            </div>
            <span className="text-xs text-rose-400 font-bold bg-rose-950 px-2.5 py-1 rounded-full border border-rose-800">
              {favorites.length} Starred
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {transformedChannels
              .filter((c) => ChannelManager.isFavorite(c.streamId))
              .map((ch) => (
                <div
                  key={ch.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-amber-400">CH {ch.num}</span>
                    <span className="text-sm font-semibold text-white">{ch.name}</span>
                  </div>
                  <button
                    onClick={() => handleToggleFavorite(ch.streamId)}
                    className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-400 hover:bg-rose-900 transition-all"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Tab: Bouquets */}
      {activeSubTab === 'BOUQUETS' && (
        <div className="space-y-6">
          {/* Create Bouquet Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Create Custom Bouquet</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newBouquetName}
                onChange={(e) => setNewBouquetName(e.target.value)}
                placeholder="Bouquet Name (e.g. Weekend Sports)"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={newBouquetDesc}
                onChange={(e) => setNewBouquetDesc(e.target.value)}
                placeholder="Description (optional)"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                id="btn-create-bouquet"
                onClick={handleCreateBouquet}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Save Bouquet
              </button>
            </div>
          </div>

          {/* Bouquets List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bouquets.map((b) => (
              <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{b.name}</h4>
                    {b.description && <p className="text-xs text-slate-400">{b.description}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteBouquet(b.id)}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs text-slate-500">Channels in bouquet: {b.channelIds.length}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Overrides & Hiding */}
      {activeSubTab === 'OVERRIDES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Channel Numbering Overrides & Visibility</h3>
            <p className="text-xs text-slate-400">Reassign custom LCN channel numbers and hide unwanted channels from surfing loops.</p>
          </div>

          <div className="space-y-3">
            {rawChannels.map((ch) => {
              const ovr = overrides[String(ch.streamId)];
              const isHidden = ovr?.hidden || false;
              const currentNum = ovr?.customNumber !== undefined ? ovr.customNumber : ch.num;

              return (
                <div
                  key={ch.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    isHidden ? 'bg-slate-950/40 border-slate-800/40 opacity-60' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">ID: {ch.streamId}</span>
                    <span className="text-sm font-bold text-white">{ch.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">LCN:</span>
                      <input
                        type="number"
                        defaultValue={currentNum}
                        onBlur={(e) => handleSetCustomNumber(ch.streamId, e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-amber-400 font-mono text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      onClick={() => handleToggleHide(ch.streamId, isHidden)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                        isHidden
                          ? 'bg-rose-950/70 text-rose-300 border-rose-800'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                      }`}
                    >
                      {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {isHidden ? 'Hidden' : 'Visible'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

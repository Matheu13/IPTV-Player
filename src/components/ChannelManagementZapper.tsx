import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  BarChart2,
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

/**
 * Presentation-Layer Sports Keyword Parser
 *
 * Scans channel names and category metadata for sports terms (e.g. 'Sport', 'DAZN', 'EPL', 'ESPN', 'F1')
 * strictly residing in the presentation layer without altering or mutating underlying provider data.
 */
export const PRESENTATION_SPORTS_KEYWORDS: string[] = [
  'sport',
  'dazn',
  'epl',
  'premier league',
  'espn',
  'football',
  'soccer',
  'fotboll',
  'f1',
  'formula',
  'motogp',
  'racing',
  'tennis',
  'golf',
  'nfl',
  'nba',
  'nhl',
  'mlb',
  'ufc',
  'wwe',
  'fight',
  'boxing',
  'cricket',
  'rugby',
  'bein',
  'supersport',
  'sky sport',
  'bt sport',
  'tnt sport',
  'eurosport',
  'fox sport',
  'allsvenskan',
  'shl',
  'hockey',
  'viaplay',
  'teliaplay',
  'max sports',
  'tv4 play events',
];

export function isPresentationSportsChannel(channel: {
  name?: string;
  category?: string;
  categoryName?: string;
  categoryId?: string;
  groupTitle?: string;
}): boolean {
  const text = [
    channel.name || '',
    channel.category || '',
    channel.categoryName || '',
    channel.categoryId || '',
    channel.groupTitle || '',
  ]
    .join(' ')
    .toLowerCase();

  return PRESENTATION_SPORTS_KEYWORDS.some((kw) => text.includes(kw));
}

// ---------------------------------------------------------------------------
// TEST SUITE: Transformation Logic & Grouped Hierarchy Reachability Verifier
// ---------------------------------------------------------------------------

export interface HierarchyIntegrityTestCase {
  id: string;
  name: string;
  category: 'COUNTS' | 'REACHABILITY' | 'DATA_LOSS' | 'STRUCTURAL';
  passed: boolean;
  expected: any;
  actual: any;
  description: string;
}

export interface HierarchyIntegritySuiteReport {
  passed: boolean;
  timestamp: string;
  rawChannelCount: number;
  hierarchyTotalChannels: number;
  aggregatedLeafCount: number;
  uniqueReachableStreamIds: number;
  missingStreamIds: (string | number)[];
  totalCountries: number;
  totalSubCategories: number;
  testCases: HierarchyIntegrityTestCase[];
  log: string[];
}

/**
 * In-file Test Suite that verifies the category normalizer transformation logic
 * by comparing the count of raw channels versus the count of channels in the grouped hierarchy,
 * confirming no data is lost during grouping and all original streams remain reachable.
 */
export function runHierarchyIntegrityTestSuite(
  rawChannels: Array<{
    id?: string | number;
    streamId?: string | number;
    name?: string;
    category?: string;
    categoryName?: string;
    categoryId?: string;
    streamUrl?: string;
  }>,
  hierarchy: NormalizedCategoryHierarchy
): HierarchyIntegritySuiteReport {
  const log: string[] = [];
  const testCases: HierarchyIntegrityTestCase[] = [];

  // 1. Total Raw Channels vs Hierarchy Total Count
  const rawCount = rawChannels.length;
  const hierCount = hierarchy.totalChannels;
  const countMatch = rawCount === hierCount;
  log.push(
    `[Check 1] Raw Channels Count (${rawCount}) vs Normalized Hierarchy totalChannels (${hierCount}): ${
      countMatch ? 'MATCH (PASS)' : 'MISMATCH (FAIL)'
    }`
  );
  testCases.push({
    id: 'count-raw-vs-hierarchy',
    name: 'Total Channel Count Preservation',
    category: 'COUNTS',
    passed: countMatch,
    expected: rawCount,
    actual: hierCount,
    description:
      'Verifies the total channel count in the normalized hierarchy matches the raw channel count exactly with 0 dropped entries.',
  });

  // 2. Aggregated Leaf Counts across all Country and Child Groups
  let leafSum = 0;
  const reachableIds = new Set<string | number>();
  for (const country of hierarchy.countries) {
    for (const sub of country.subCategories) {
      leafSum += sub.count;
      if (sub.channelIds && sub.channelIds.length > 0) {
        sub.channelIds.forEach((id) => reachableIds.add(String(id)));
      }
    }
  }
  const leafSumMatch = leafSum === rawCount;
  log.push(
    `[Check 2] Aggregated Leaf Subcategory Counts (${leafSum}) vs Raw Input Channels (${rawCount}): ${
      leafSumMatch ? 'MATCH (PASS)' : 'MISMATCH (FAIL)'
    }`
  );
  testCases.push({
    id: 'count-leaf-aggregation',
    name: 'Leaf Subcategory Sum Validation',
    category: 'COUNTS',
    passed: leafSumMatch,
    expected: rawCount,
    actual: leafSum,
    description:
      'Ensures the sum of channel counts across all country and child groups equals raw input channels with zero duplicate drops.',
  });

  // 3. Zero Data Loss & 100% Stream Reachability
  const missingStreamIds: (string | number)[] = [];
  for (const ch of rawChannels) {
    const streamKey = String(ch.id ?? ch.streamId ?? '');
    if (!streamKey || !reachableIds.has(streamKey)) {
      missingStreamIds.push(ch.id ?? ch.streamId ?? 'unknown');
    }
  }
  const zeroLoss = missingStreamIds.length === 0;
  log.push(
    `[Check 3] Stream Reachability: ${reachableIds.size} unique reachable streams. Missing/unreachable: ${missingStreamIds.length}`
  );
  testCases.push({
    id: 'reachability-zero-loss',
    name: '100% Stream Reachability (Zero Data Loss)',
    category: 'REACHABILITY',
    passed: zeroLoss,
    expected: 0,
    actual: missingStreamIds.length,
    description:
      'Confirms that every single raw channel stream ID remains mapped and reachable within at least one normalized leaf category.',
  });

  // 4. Structural Tree Group Invariants
  const invalidCountries = hierarchy.countries.filter(
    (c) => !c.id || !c.name || c.count < 0 || !Array.isArray(c.subCategories)
  );
  const structureValid = invalidCountries.length === 0 && hierarchy.countries.length > 0;
  log.push(
    `[Check 4] Hierarchy Structure: ${hierarchy.countries.length} country groups, ${invalidCountries.length} invalid.`
  );
  testCases.push({
    id: 'structural-validity',
    name: 'Tree Group Structure Invariants',
    category: 'STRUCTURAL',
    passed: structureValid,
    expected: 'All countries formatted with valid names and child arrays',
    actual: structureValid ? 'Valid' : `${invalidCountries.length} malformed groups`,
    description:
      'Validates that every country in the hierarchy has formatted title names, normalized IDs, and non-empty child arrays.',
  });

  // 5. Sports Presentation Layer Non-Destructive Invariance
  let sportsCheckPassed = true;
  for (let i = 0; i < Math.min(rawChannels.length, 50); i++) {
    const ch = rawChannels[i];
    const beforeStr = JSON.stringify(ch);
    isPresentationSportsChannel(ch as any);
    const afterStr = JSON.stringify(ch);
    if (beforeStr !== afterStr) {
      sportsCheckPassed = false;
      break;
    }
  }
  testCases.push({
    id: 'sports-filter-non-destructive',
    name: 'Sports Presentation Layer Non-Destructive Invariance',
    category: 'DATA_LOSS',
    passed: sportsCheckPassed,
    expected: 'Underlying channel objects strictly unmodified',
    actual: sportsCheckPassed ? 'Pristine' : 'Modified',
    description:
      'Confirms that the presentation-layer sports metadata parser leaves underlying provider data and streaming properties 100% intact.',
  });

  const totalSubCategories = hierarchy.countries.reduce((acc, c) => acc + c.subCategories.length, 0);
  const allPassed = testCases.every((t) => t.passed);

  return {
    passed: allPassed,
    timestamp: new Date().toISOString(),
    rawChannelCount: rawCount,
    hierarchyTotalChannels: hierCount,
    aggregatedLeafCount: leafSum,
    uniqueReachableStreamIds: reachableIds.size,
    missingStreamIds,
    totalCountries: hierarchy.countries.length,
    totalSubCategories,
    testCases,
    log,
  };
}

interface MemoizedCategoryTreeProps {
  countries: NormalizedCountryGroup[];
  expandedCountries: Record<string, boolean>;
  expandedSubCategories: Record<string, boolean>;
  selectedCountry: string | null;
  selectedSubCategory: string | null;
  isSportsFilterActive: boolean;
  visibleSidebarRows: any[];
  onToggleCountry: (country: NormalizedCountryGroup, e?: React.SyntheticEvent) => void;
  onToggleSubCategory: (subId: string, e?: React.SyntheticEvent) => void;
  onSelectSubCategory: (countryName: string, subName: string) => void;
  onTuneChannel?: (streamId: string | number, channelName?: string) => void;
  onSetZapperNotice: (msg: string) => void;
  onSetFocusZone: (zone: 'sidebar' | 'channels') => void;
  onSetFocusedSidebarIndex: (index: number) => void;
}

export const MemoizedCategoryTree: React.FC<MemoizedCategoryTreeProps> = React.memo(
  function MemoizedCategoryTree({
    countries,
    expandedCountries,
    expandedSubCategories,
    selectedCountry,
    selectedSubCategory,
    isSportsFilterActive,
    visibleSidebarRows,
    onToggleCountry,
    onToggleSubCategory,
    onSelectSubCategory,
    onTuneChannel,
    onSetZapperNotice,
    onSetFocusZone,
    onSetFocusedSidebarIndex,
  }) {
    return (
      <div className="mt-2 space-y-1">
        {countries.map((country) => {
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
                  onSetFocusZone('sidebar');
                  const idx = visibleSidebarRows.findIndex((r) => r.id === countryElemId);
                  if (idx >= 0) onSetFocusedSidebarIndex(idx);
                }}
                onClick={(e) => onToggleCountry(country, e)}
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
                  <span>{country.flag || '🌐'}</span>
                  <span>{country.name}</span>
                </div>
                {/* Count of nested channels next to each country group name */}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                  {country.count} channels
                </span>
              </button>

              {/* Subcategories and Channels: Shown only when the group is in an expanded state */}
              {isExpanded && (
                <div className="pl-4 pr-1 space-y-1 border-l border-slate-800/80 ml-2.5 my-1">
                  {country.subCategories.map((sub) => {
                    const isSelectedSub = selectedCountry === country.name && selectedSubCategory === sub.name;
                    const isZeroInSports = isSportsFilterActive && sub.count === 0;
                    const subElemId = `subcat-${country.id.toLowerCase()}-${sub.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
                    const isSubExpanded = !!expandedSubCategories[sub.id];

                    return (
                      <div key={sub.id} className="space-y-0.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            id={subElemId}
                            tabIndex={0}
                            onFocus={() => {
                              onSetFocusZone('sidebar');
                              const idx = visibleSidebarRows.findIndex((r) => r.id === subElemId);
                              if (idx >= 0) onSetFocusedSidebarIndex(idx);
                            }}
                            onClick={() => onSelectSubCategory(country.name, sub.name)}
                            className={`flex-1 px-2 py-1.5 rounded text-left flex items-center justify-between text-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                              isSelectedSub
                                ? 'bg-indigo-600/90 text-white font-bold shadow-xs'
                                : isZeroInSports
                                ? 'text-slate-600 hover:text-slate-500 hover:bg-slate-900/40'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/70'
                            }`}
                          >
                            <span className="truncate">{sub.name}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 ml-1 border border-slate-700/40 ${
                                isZeroInSports ? 'text-slate-700' : 'text-slate-400'
                              }`}
                            >
                              {sub.count} channels
                            </span>
                          </button>
                          {sub.channels && sub.channels.length > 0 && (
                            <button
                              type="button"
                              id={`toggle-channels-${sub.id}`}
                              onClick={(e) => onToggleSubCategory(sub.id, e)}
                              className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors text-[10px]"
                              title={isSubExpanded ? 'Hide nested channels' : 'Show nested channels'}
                            >
                              {isSubExpanded ? '▾' : '▸'}
                            </button>
                          )}
                        </div>

                        {/* Nested member channels rendered when subcategory is in an expanded state */}
                        {isSubExpanded && sub.channels && sub.channels.length > 0 && (
                          <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-indigo-900/60 ml-1.5 my-0.5 max-h-48 overflow-y-auto">
                            {sub.channels.map((chItem: any, idx: number) => {
                              const chId = chItem.id || chItem.streamId || idx;
                              const chName = chItem.name || chItem.title || `Channel ${chId}`;
                              return (
                                <button
                                  key={chId}
                                  type="button"
                                  id={`tree-ch-${chId}`}
                                  onClick={() => {
                                    if (onTuneChannel) {
                                      onTuneChannel(chId, chName);
                                    }
                                    onSetZapperNotice(`Tuned to ${chName}`);
                                  }}
                                  className="w-full px-2 py-1 rounded text-left flex items-center justify-between text-[11px] text-slate-400 hover:text-white hover:bg-slate-800/90 transition-colors group cursor-pointer"
                                >
                                  <span className="truncate flex items-center gap-1.5">
                                    <span className="text-[9px] font-mono text-indigo-400 group-hover:text-indigo-300">
                                      #{idx + 1}
                                    </span>
                                    <span className="truncate">{chName}</span>
                                  </span>
                                  <span className="text-[9px] text-emerald-400 font-mono shrink-0 ml-1">LIVE</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

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
  const [sportsTopicKeyword, setSportsTopicKeyword] = useState<string>('ALL');
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
  const [expandedSubCategories, setExpandedSubCategories] = useState<Record<string, boolean>>({});
  const [showRemote, setShowRemote] = useState<boolean>(true);

  // Test Suite Inspection Modal State
  const [showTestSuiteModal, setShowTestSuiteModal] = useState<boolean>(false);
  const [testSuiteRunCount, setTestSuiteRunCount] = useState<number>(0);

  // 10-Foot UI Remote & D-pad Navigation State
  const [focusZone, setFocusZone] = useState<'sidebar' | 'channels'>('sidebar');
  const [focusedSidebarIndex, setFocusedSidebarIndex] = useState<number>(0);

  // Remote & Keypad State
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');
  const [currentChannelIndex, setCurrentChannelIndex] = useState<number>(0);
  const [engineUpdateTick, setEngineUpdateTick] = useState<number>(0);

  // Subscribe to engine state mutations (source addition, removal, channel sync)
  useEffect(() => {
    return globalUnifiedIptvEngine.subscribe(() => {
      setEngineUpdateTick((v) => v + 1);
    });
  }, []);

  // Raw channel catalog sourced from Unified Engine or compressed catalog
  const allCatalogChannels = useMemo(() => {
    const allEngineChannels = globalUnifiedIptvEngine.getAllChannels(true);
    if (allEngineChannels && allEngineChannels.length > 0) {
      return allEngineChannels.map((c) => ({
        id: c.id,
        streamId: c.id,
        name: c.name,
        category: c.category || 'General',
        categoryName: c.category || 'General',
        categoryId: c.category || 'General',
        streamUrl: c.streamUrl || c.directSourceUrl || c.rawStreamUrl,
      }));
    }
    const compressed = ChannelManager.getCompressedCatalog();
    if (compressed && compressed.length > 0) {
      return compressed.map((c) => ({
        id: c.id,
        streamId: c.streamId,
        name: c.name,
        category: c.categoryName || 'General',
        categoryName: c.categoryName || 'General',
        categoryId: c.categoryId || 'General',
        streamUrl: c.streamUrl,
      }));
    }
    const windowChannels = ChannelManager.getHydratedWindow(0, 1000).channels;
    return windowChannels.map((c) => ({
      id: c.id,
      streamId: c.streamId,
      name: c.name,
      category: c.categoryName || 'General',
      categoryName: c.categoryName || 'General',
      categoryId: c.categoryId || 'General',
      streamUrl: c.resolvedStreamUrl,
    }));
  }, [engineUpdateTick]);

  // Full Unfiltered Normalized Hierarchy across complete provider data
  const fullNormalizedHierarchy: NormalizedCategoryHierarchy = useMemo(() => {
    return normalizeCategoryHierarchy(
      allCatalogChannels.map((c) => ({
        id: c.id || c.streamId,
        name: c.name,
        category: c.category || c.categoryName || c.categoryId || 'General',
      }))
    );
  }, [allCatalogChannels]);

  // Execute Test Suite comparing raw channel counts vs grouped hierarchy counts
  const testSuiteResult: HierarchyIntegritySuiteReport = useMemo(() => {
    return runHierarchyIntegrityTestSuite(allCatalogChannels, fullNormalizedHierarchy);
  }, [allCatalogChannels, fullNormalizedHierarchy, testSuiteRunCount]);

  // Dynamic normalized hierarchy (Country -> Child Category) for Panel 2
  const normalizedHierarchy: NormalizedCategoryHierarchy = useMemo(() => {
    const baseList = isSportsFilterActive
      ? allCatalogChannels.filter((c) =>
          isPresentationSportsChannel({
            name: c.name,
            category: c.category,
            categoryName: c.categoryName,
            categoryId: c.categoryId,
          })
        )
      : allCatalogChannels;

    return normalizeCategoryHierarchy(
      baseList.map((c) => ({
        id: c.id || c.streamId,
        name: c.name,
        category: c.category || c.categoryName || c.categoryId || 'General',
      }))
    );
  }, [allCatalogChannels, isSportsFilterActive]);

  // Dynamic calculation of all sports channels via presentation layer
  const dynamicSportsCount = useMemo(() => {
    return allCatalogChannels.filter((c) =>
      isPresentationSportsChannel({
        name: c.name,
        category: c.category,
        categoryName: c.categoryName,
        categoryId: c.categoryId,
      })
    ).length;
  }, [allCatalogChannels]);

  // Diagnostic View toggle for displaying country group channel counts
  const [showDiagnosticView, setShowDiagnosticView] = useState<boolean>(false);

  // Computed country channel statistics for diagnostics
  const countryDiagnosticStats = useMemo(() => {
    const totalGroupedChannels = normalizedHierarchy.countries.reduce((sum, c) => sum + c.count, 0);
    const europeanTargets = [
      { name: 'Denmark', code: 'DK', flag: '🇩🇰' },
      { name: 'Poland', code: 'PL', flag: '🇵🇱' },
      { name: 'France', code: 'FR', flag: '🇫🇷' },
      { name: 'Switzerland', code: 'CH', flag: '🇨🇭' },
      { name: 'Sweden', code: 'SE', flag: '🇸🇪' },
      { name: 'Norway', code: 'NO', flag: '🇳🇴' },
      { name: 'United Kingdom', code: 'UK', flag: '🇬🇧' },
      { name: 'Germany', code: 'DE', flag: '🇩🇪' },
      { name: 'Spain', code: 'ES', flag: '🇪🇸' },
      { name: 'Italy', code: 'IT', flag: '🇮🇹' },
    ];

    const targetStatus = europeanTargets.map((target) => {
      const found = normalizedHierarchy.countries.find(
        (c) =>
          c.name.toLowerCase() === target.name.toLowerCase() ||
          c.code.toUpperCase() === target.code.toUpperCase() ||
          c.id.toLowerCase() === target.name.toLowerCase()
      );
      return {
        ...target,
        count: found?.count || 0,
        subCategoriesCount: found?.subCategories.length || 0,
        isPopulated: (found?.count || 0) > 0,
      };
    });

    return {
      totalGroupedChannels,
      totalCountryGroups: normalizedHierarchy.countries.length,
      targetStatus,
      allGroups: normalizedHierarchy.countries.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        flag: c.flag,
        count: c.count,
        subCategoriesCount: c.subCategories.length,
        isOther: c.isOther,
      })),
    };
  }, [normalizedHierarchy.countries]);

  // Tree expansion helpers for Panel 2
  const handleExpandAll = () => {
    const next: Record<string, boolean> = {};
    normalizedHierarchy.countries.forEach((c) => {
      next[c.id] = true;
      next[c.name] = true;
    });
    setExpandedCountries(next);
  };

  const handleCollapseAll = () => {
    setExpandedCountries({});
    setExpandedSubCategories({});
  };

  const toggleSubCategory = useCallback((subId: string, e?: React.SyntheticEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setExpandedSubCategories((prev) => ({
      ...prev,
      [subId]: !prev[subId],
    }));
  }, []);

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

  // Presentation-layer filtered list for active sports keywords
  const filteredTransformedChannels = useMemo(() => {
    let list = transformedChannels;
    if (isSportsFilterActive && sportsTopicKeyword !== 'ALL') {
      list = list.filter((ch) => {
        const text = `${ch.name} ${ch.categoryName || ''} ${ch.categoryId || ''}`.toLowerCase();
        if (sportsTopicKeyword === 'EPL') {
          return text.includes('epl') || text.includes('premier league');
        }
        if (sportsTopicKeyword === 'DAZN') {
          return text.includes('dazn');
        }
        if (sportsTopicKeyword === 'SOCCER') {
          return text.includes('football') || text.includes('fotboll') || text.includes('soccer');
        }
        if (sportsTopicKeyword === 'F1') {
          return text.includes('f1') || text.includes('formula') || text.includes('motogp') || text.includes('racing');
        }
        if (sportsTopicKeyword === 'UFC') {
          return text.includes('ufc') || text.includes('wwe') || text.includes('fight') || text.includes('boxing');
        }
        if (sportsTopicKeyword === 'US_SPORTS') {
          return text.includes('espn') || text.includes('nfl') || text.includes('nba') || text.includes('nhl') || text.includes('mlb');
        }
        return true;
      });
    }
    return list;
  }, [transformedChannels, isSportsFilterActive, sportsTopicKeyword]);

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
        const found =
          filteredTransformedChannels.find((c) => c.num === num || String(c.streamId) === String(num)) ||
          transformedChannels.find((c) => c.num === num || String(c.streamId) === String(num));
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
          const total = filteredTransformedChannels.length;
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
          if (currentRow?.type === 'country' && currentRow.country) {
            const countryId = currentRow.country.id;
            const countryName = currentRow.country.name;
            const isExpanded = !!(
              expandedCountries[countryId] ||
              expandedCountries[countryName]
            );
            if (isExpanded) {
              setExpandedCountries((prev) => ({
                ...prev,
                [countryId]: false,
                [countryName]: false,
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
          if (currentRow?.type === 'country' && currentRow.country) {
            const countryId = currentRow.country.id;
            const countryName = currentRow.country.name;
            const isExpanded = !!(
              expandedCountries[countryId] ||
              expandedCountries[countryName]
            );
            if (!isExpanded) {
              // Expand collapsed country group
              setExpandedCountries((prev) => ({
                ...prev,
                [countryId]: true,
                [countryName]: true,
              }));
              setSelectedCountry(countryName);
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
          } else if (currentRow?.type === 'subcategory' && currentRow.country && currentRow.subCategory) {
            // Select subcategory and move focus to channel list
            setSelectedCountry(currentRow.country.name);
            setSelectedSubCategory(currentRow.subCategory.name);
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
          if (currentRow?.type === 'country' && currentRow.country) {
            toggleCountryGroup(currentRow.country);
          } else if (currentRow?.type === 'subcategory' && currentRow.country && currentRow.subCategory) {
            setSelectedCountry(currentRow.country.name);
            setSelectedSubCategory(currentRow.subCategory.name);
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
              {dynamicSportsCount.toLocaleString()}
            </span>
          </div>
        </button>
      </div>

      {/* Categorized by Country Section Header with Tree Controls */}
      <div className="pt-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-2 flex items-center justify-between border-b border-slate-800/70">
          <div className="flex items-center gap-1.5">
            <span>By Country</span>
            {isSportsFilterActive && (
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded border border-emerald-800/60 font-semibold lowercase">
                sports
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 lowercase font-normal text-[10px]">
            <button
              type="button"
              id="btn-tree-expand-all"
              onClick={handleExpandAll}
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
              title="Expand all country groups"
            >
              expand all
            </button>
            <span className="text-slate-600">/</span>
            <button
              type="button"
              id="btn-tree-collapse-all"
              onClick={handleCollapseAll}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Collapse all country groups"
            >
              collapse
            </button>
          </div>
        </div>

        {/* Memoized Tree Accordion of Normalized Countries, Subcategories & Nested Channels */}
        <MemoizedCategoryTree
          countries={normalizedHierarchy.countries}
          expandedCountries={expandedCountries}
          expandedSubCategories={expandedSubCategories}
          selectedCountry={selectedCountry}
          selectedSubCategory={selectedSubCategory}
          isSportsFilterActive={isSportsFilterActive}
          visibleSidebarRows={visibleSidebarRows}
          onToggleCountry={toggleCountryGroup}
          onToggleSubCategory={toggleSubCategory}
          onSelectSubCategory={(countryName, subName) => {
            setSelectedCountry(countryName);
            setSelectedSubCategory(subName);
            setWindowOffset(0);
            setFocusZone('sidebar');
          }}
          onTuneChannel={onTuneChannel}
          onSetZapperNotice={(msg) => {
            setZapperNotice(msg);
            setTimeout(() => setZapperNotice(null), 2500);
          }}
          onSetFocusZone={setFocusZone}
          onSetFocusedSidebarIndex={setFocusedSidebarIndex}
        />
      </div>

      {/* Country Group Diagnostics Quick Trigger & Telemetry */}
      <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
        <button
          type="button"
          id="btn-panel2-diagnostics"
          onClick={() => setShowDiagnosticView(!showDiagnosticView)}
          className={`w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between transition-colors ${
            showDiagnosticView
              ? 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60 shadow-sm shadow-cyan-900/30'
              : 'bg-slate-900/80 hover:bg-slate-800 text-cyan-400 border-cyan-900/40'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Country Diagnostics</span>
          </span>
          <span className="font-mono text-[10px] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/60 text-cyan-300">
            {countryDiagnosticStats.totalCountryGroups} Groups • {countryDiagnosticStats.totalGroupedChannels} Ch
          </span>
        </button>

        {/* Diagnostic Panel View */}
        {showDiagnosticView && (
          <div
            id="panel2-country-diagnostics-view"
            className="p-2.5 bg-slate-950/90 rounded-lg border border-cyan-900/50 space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 text-xs"
          >
            {/* European Core Target Verification */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>European Target Groups</span>
                <span className="text-emerald-400 font-mono">
                  {countryDiagnosticStats.targetStatus.filter((t) => t.isPopulated).length}/
                  {countryDiagnosticStats.targetStatus.length} Populated
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {countryDiagnosticStats.targetStatus.map((target) => (
                  <div
                    key={target.code}
                    onClick={() => {
                      setSelectedCountry(target.name);
                      setExpandedCountries((prev) => ({ ...prev, [target.name]: true }));
                    }}
                    className={`px-2 py-1 rounded border text-[10px] flex items-center justify-between cursor-pointer transition-colors ${
                      target.isPopulated
                        ? 'bg-slate-900/90 border-emerald-800/50 text-slate-200 hover:bg-slate-800'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500'
                    }`}
                    title={`Click to filter ${target.name}`}
                  >
                    <span className="flex items-center gap-1 truncate">
                      <span>{target.flag}</span>
                      <span className="font-semibold">{target.code}</span>
                    </span>
                    <span
                      className={`font-mono px-1 rounded text-[9px] ${
                        target.isPopulated ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' : 'text-slate-600'
                      }`}
                    >
                      {target.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Complete Discovered Country Group Breakdown */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>All Country Groups ({countryDiagnosticStats.allGroups.length})</span>
                <span className="text-[9px] text-slate-500 font-mono">Channels</span>
              </div>
              <div className="space-y-1">
                {countryDiagnosticStats.allGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => {
                      setSelectedCountry(group.name);
                      setExpandedCountries((prev) => ({ ...prev, [group.id]: true, [group.name]: true }));
                    }}
                    className="px-2 py-1 rounded bg-slate-900/60 hover:bg-slate-800/90 border border-slate-800/60 flex items-center justify-between text-[11px] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span>{group.flag || '🌐'}</span>
                      <span className="text-slate-200 truncate font-medium">{group.name}</span>
                      {group.code && (
                        <span className="text-[9px] font-mono text-slate-500 uppercase">[{group.code}]</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                      <span className="text-slate-500 text-[9px]">{group.subCategoriesCount} subs</span>
                      <span className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300 font-semibold">
                        {group.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Test Suite Quick Trigger */}
        <button
          type="button"
          id="btn-panel2-test-suite"
          onClick={() => setShowTestSuiteModal(true)}
          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-emerald-400 border border-emerald-900/50 text-[11px] font-semibold flex items-center justify-between transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hierarchy Test Suite</span>
          </span>
          <span className="font-mono text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-800/60">
            {testSuiteResult.passed ? '5/5 PASS' : 'FAIL'}
          </span>
        </button>
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
          <button
            id="btn-subtab-test-suite"
            onClick={() => setShowTestSuiteModal(true)}
            className="px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Suite ({testSuiteResult.passed ? '5/5 PASS' : 'FAIL'})</span>
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
                        {filteredTransformedChannels.length} in view / {windowResult.totalMatching.toLocaleString()} total
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

                {/* Dedicated Isolated Sports Section in Presentation Layer */}
                {isSportsFilterActive && (
                  <div id="isolated-sports-section" className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/80 border border-emerald-700/60 rounded-xl p-3.5 space-y-2.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center shrink-0">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">Isolated Sports Section</span>
                            <span className="text-[9px] font-mono text-emerald-300 bg-emerald-900/60 px-1.5 py-0.2 rounded border border-emerald-700">
                              Presentation Layer Only
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">
                            Keywords scanned: <span className="text-emerald-300 font-semibold">Sport, DAZN, EPL, ESPN, F1, UFC</span>. Underlying raw provider channels remain pristine.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsSportsFilterActive(false);
                          setSportsTopicKeyword('ALL');
                          setWindowOffset(0);
                        }}
                        className="text-[11px] text-slate-400 hover:text-white underline self-start sm:self-auto"
                      >
                        Exit Sports Isolation
                      </button>
                    </div>

                    {/* Topic-specific sports filters */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-emerald-900/50">
                      <span className="text-[10px] text-slate-400 font-medium mr-1">Topic:</span>
                      {[
                        { id: 'ALL', label: 'All Sports' },
                        { id: 'EPL', label: 'EPL / Premier League' },
                        { id: 'DAZN', label: 'DAZN Events' },
                        { id: 'SOCCER', label: 'Football / Soccer' },
                        { id: 'F1', label: 'F1 / Racing' },
                        { id: 'UFC', label: 'UFC & Combat' },
                        { id: 'US_SPORTS', label: 'ESPN & US Sports' },
                      ].map((pill) => (
                        <button
                          key={pill.id}
                          onClick={() => {
                            setSportsTopicKeyword(pill.id);
                            setWindowOffset(0);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                            sportsTopicKeyword === pill.id
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
                  {filteredTransformedChannels.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs space-y-2">
                      <p>No channels match the current sports or country filter.</p>
                      {sportsTopicKeyword !== 'ALL' && (
                        <button
                          onClick={() => setSportsTopicKeyword('ALL')}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-indigo-300 border border-slate-700 font-medium"
                        >
                          Reset Sports Topic Keyword
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredTransformedChannels.map((ch, idx) => {
                      const isCurrent = idx === currentChannelIndex;
                      const isFav = ChannelManager.isFavorite(ch.streamId);
                      const isSports = isPresentationSportsChannel({
                        name: ch.name,
                        category: ch.categoryName,
                        categoryName: ch.categoryName,
                        categoryId: ch.categoryId,
                      });

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

      {/* Hierarchy Transformation Integrity Test Suite Inspection Modal */}
      {showTestSuiteModal && (
        <div
          id="hierarchy-test-suite-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowTestSuiteModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-700/80 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Hierarchy Integrity Test Suite</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        testSuiteResult.passed
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-rose-950 text-rose-300 border border-rose-700'
                      }`}
                    >
                      {testSuiteResult.passed ? '5/5 Passed' : 'Fail'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Compares raw provider channels against grouped hierarchy to confirm zero data loss and 100% stream reachability.
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-test-suite-modal"
                onClick={() => setShowTestSuiteModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Metric Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Raw Channels</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">
                    {testSuiteResult.rawChannelCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Input provider count</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Grouped Total</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {testSuiteResult.hierarchyTotalChannels.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Across all tree leaves</div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Reachable Streams</div>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    {testSuiteResult.rawChannelCount > 0
                      ? `${Math.round(
                          (testSuiteResult.uniqueReachableStreamIds / testSuiteResult.rawChannelCount) * 100
                        )}%`
                      : '100%'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {testSuiteResult.uniqueReachableStreamIds} / {testSuiteResult.rawChannelCount} unique IDs
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3">
                  <div className="text-[11px] text-slate-400">Sports Detected</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                    {dynamicSportsCount.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">Metadata keywords</div>
                </div>
              </div>

              {/* Individual Test Cases Verification */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Transformation Verification Matrix</span>
                  <span className="text-[11px] font-mono text-slate-500 lowercase">
                    {testSuiteResult.testCases.filter((t) => t.passed).length} / {testSuiteResult.testCases.length} assertions passed
                  </span>
                </div>

                <div className="space-y-2">
                  {testSuiteResult.testCases.map((tc) => (
                    <div
                      key={tc.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-3"
                    >
                      {tc.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">{tc.name}</span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                              tc.passed
                                ? 'text-emerald-400 bg-emerald-950 border border-emerald-800/60'
                                : 'text-rose-400 bg-rose-950 border border-rose-800/60'
                            }`}
                          >
                            {tc.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{tc.description}</p>
                        <div className="text-[10px] font-mono text-slate-500 mt-1 flex items-center gap-3">
                          <span>Expected: {String(tc.expected)}</span>
                          <span>•</span>
                          <span>Actual: {String(tc.actual)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discovered Country Groups Breakdown */}
              {normalizedHierarchy.countries.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Discovered Hierarchy Taxonomy Sample ({normalizedHierarchy.countries.length} Countries)
                  </div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {normalizedHierarchy.countries.slice(0, 8).map((grp) => (
                      <div
                        key={grp.id}
                        className="bg-slate-950 p-2.5 rounded-lg border border-slate-800/70 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-200">{grp.name}</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {grp.subCategories.slice(0, 5).map((s) => (
                              <span
                                key={s.id}
                                className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono"
                              >
                                {s.name} ({s.count})
                              </span>
                            ))}
                            {grp.subCategories.length > 5 && (
                              <span className="text-[10px] text-slate-500 font-mono self-center">
                                +{grp.subCategories.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-cyan-400 font-semibold shrink-0 ml-2">
                          {grp.count} channels
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <button
                type="button"
                id="btn-rerun-test-suite"
                onClick={() => setTestSuiteRunCount((prev) => prev + 1)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-run Integrity Verification
              </button>

              <button
                type="button"
                id="btn-close-test-suite"
                onClick={() => setShowTestSuiteModal(false)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

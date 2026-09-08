/**
 * Category Normalization and Hierarchical Tree Builder for Live TV Panel 2
 *
 * Normalizes raw provider category strings (e.g. 'Sweden | Expressen Play', 'UK | Sky Sports')
 * into a structured Country -> Child Category hierarchy.
 * Guarantees zero channel loss by routing unmapped or composite tags into 'Other'.
 */

import { isSportsChannel } from './channelManager';

export interface NormalizedCategoryResult {
  country: string; // e.g. "Sweden", "UK", "Canada", "Norway", "Other"
  countryId: string; // e.g. "country_sweden", "country_uk", "group_other"
  childCategory: string; // e.g. "Expressen Play", "Disney+", "Max Sports", "General"
  rawCategory: string; // original raw string
  isOther: boolean;
}

export interface HierarchyChildCategory {
  id: string; // Unique id for navigation e.g. "country_sweden_expressen_play"
  label: string; // Clean display label e.g. "Expressen Play"
  rawCategory: string; // Canonical raw category representation
  rawCategories: string[]; // All raw category strings that map into this child
  count: number; // Channel count in this child
}

export interface HierarchyCountryGroup {
  id: string; // e.g. "country_sweden"
  label: string; // e.g. "Sweden"
  countryCode?: string;
  count: number; // Total channels in this country
  isOther: boolean;
  rawCategories: Set<string>;
  children: HierarchyChildCategory[];
}

export interface Panel2TreeRow {
  key: string;
  id: string;
  displayLabel: string;
  count?: number;
  type: 'system' | 'header' | 'country_group' | 'sub_category' | 'other_group';
  countryId?: string;
  rawCategory?: string;
  rawCategories?: string[];
  isExpanded?: boolean;
  depth: number; // 0 for top-level, 1 for nested subcategories
}

export interface NormalizedHierarchyTree {
  systemItems: {
    id: string;
    label: string;
    count: number;
    type: 'all' | 'sports' | 'favorites' | 'history';
  }[];
  countryGroups: HierarchyCountryGroup[];
  otherGroup: HierarchyCountryGroup;
  totalChannelsCount: number;
  totalCategoriesCount: number;
}

export const NON_COUNTRY_PREFIXES = new Set([
  'LIVE',
  'VOD',
  'MOVIES',
  'SERIES',
  '4K',
  'UHD',
  'FHD',
  'HD',
  'HEVC',
  'VIP',
  'PPV',
  'CINEMA',
  'KIDS',
  'XXX',
  'ADULT',
  'RADIO',
  'GENERAL',
  'MUSIC',
  'NEWS',
  'DOCUMENTARY',
  'DOCUMENTARIES',
  'SPORTS',
  'ENTERTAINMENT',
  'EVENTS',
  'ANIMATION',
  'AUTO',
]);

const KNOWN_COUNTRIES: Record<string, { label: string; code: string }> = {
  sweden: { label: 'Sweden', code: 'SE' },
  se: { label: 'Sweden', code: 'SE' },
  swe: { label: 'Sweden', code: 'SE' },
  sverige: { label: 'Sweden', code: 'SE' },
  uk: { label: 'UK', code: 'GB' },
  gb: { label: 'UK', code: 'GB' },
  gbr: { label: 'UK', code: 'GB' },
  'united kingdom': { label: 'UK', code: 'GB' },
  canada: { label: 'Canada', code: 'CA' },
  ca: { label: 'Canada', code: 'CA' },
  can: { label: 'Canada', code: 'CA' },
  norway: { label: 'Norway', code: 'NO' },
  no: { label: 'Norway', code: 'NO' },
  nor: { label: 'Norway', code: 'NO' },
  norge: { label: 'Norway', code: 'NO' },
  us: { label: 'USA', code: 'US' },
  usa: { label: 'USA', code: 'US' },
  'united states': { label: 'USA', code: 'US' },
  finland: { label: 'Finland', code: 'FI' },
  fi: { label: 'Finland', code: 'FI' },
  denmark: { label: 'Denmark', code: 'DK' },
  dk: { label: 'Denmark', code: 'DK' },
  germany: { label: 'Germany', code: 'DE' },
  de: { label: 'Germany', code: 'DE' },
  france: { label: 'France', code: 'FR' },
  fr: { label: 'France', code: 'FR' },
  spain: { label: 'Spain', code: 'ES' },
  es: { label: 'Spain', code: 'ES' },
  italy: { label: 'Italy', code: 'IT' },
  it: { label: 'Italy', code: 'IT' },
  netherlands: { label: 'Netherlands', code: 'NL' },
  nl: { label: 'Netherlands', code: 'NL' },
  belgium: { label: 'Belgium', code: 'BE' },
  be: { label: 'Belgium', code: 'BE' },
  ireland: { label: 'Ireland', code: 'IE' },
  ie: { label: 'Ireland', code: 'IE' },
  australia: { label: 'Australia', code: 'AU' },
  au: { label: 'Australia', code: 'AU' },
};

/**
 * Cleanly format any region prefix into Title Case or standardized abbreviation
 */
export function formatRegionLabel(raw: string): string {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  if (KNOWN_COUNTRIES[lower]) {
    return KNOWN_COUNTRIES[lower].label;
  }
  if (trimmed.length <= 3) {
    return trimmed.toUpperCase();
  }
  return trimmed
    .split(' ')
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

/**
 * Normalizes Sweden subcategory names according to the user specification:
 * - Expressen Play
 * - Disney+
 * - Max Sports
 * - TeliaPlay Events
 * - ViaPlay Events
 */
export function normalizeSwedenSubCategory(rawSuffix: string, rawFull: string): string {
  const low = `${rawSuffix} ${rawFull}`.toLowerCase();
  if (low.includes('expressen')) return 'Expressen Play';
  if (low.includes('disney')) return 'Disney+';
  if (low.includes('max sport') || low.includes('max-sport') || low.includes('maxsports')) return 'Max Sports';
  if (low.includes('teliaplay') || low.includes('telia play') || low.includes('telia')) return 'TeliaPlay Events';
  if (low.includes('viaplay') || low.includes('via play') || low.includes('viasat')) return 'ViaPlay Events';
  if (low.includes('c more') || low.includes('cmore')) return 'C More / TV4 Play';
  if (low.includes('svt')) return 'SVT Broadcast';
  if (low.includes('sport')) return 'Swedish Sports';
  if (rawSuffix.trim().length > 0) return rawSuffix.trim();
  return 'General';
}

/**
 * Normalizes UK subcategory names:
 * - Sky & TNT Sports
 * - BBC & ITV Broadcast
 * - UK Entertainment
 */
export function normalizeUkSubCategory(rawSuffix: string, rawFull: string): string {
  const low = `${rawSuffix} ${rawFull}`.toLowerCase();
  if (low.includes('sport') || low.includes('sky sport') || low.includes('tnt') || low.includes('premier')) {
    return 'Sky & TNT Sports';
  }
  if (low.includes('bbc') || low.includes('itv') || low.includes('general') || low.includes('news')) {
    return 'BBC & ITV Broadcast';
  }
  if (low.includes('movie') || low.includes('cinema') || low.includes('entertainment') || low.includes('film')) {
    return 'UK Entertainment';
  }
  if (rawSuffix.trim().length > 0) return rawSuffix.trim();
  return 'General';
}

/**
 * Normalizes Canada subcategory names:
 * - Sports (TSN & Sportsnet)
 * - CBC & Local Feeds
 * - Canada Entertainment
 */
export function normalizeCanadaSubCategory(rawSuffix: string, rawFull: string): string {
  const low = `${rawSuffix} ${rawFull}`.toLowerCase();
  if (low.includes('sport') || low.includes('tsn') || low.includes('sportsnet')) {
    return 'Sports (TSN & Sportsnet)';
  }
  if (low.includes('cbc') || low.includes('local') || low.includes('news')) {
    return 'CBC & Local Feeds';
  }
  if (low.includes('crave') || low.includes('entertainment') || low.includes('movie')) {
    return 'Entertainment & Crave';
  }
  if (rawSuffix.trim().length > 0) return rawSuffix.trim();
  return 'General';
}

/**
 * Normalizes Norway subcategory names:
 * - TV2 Sport & Events
 * - NRK & Allment
 */
export function normalizeNorwaySubCategory(rawSuffix: string, rawFull: string): string {
  const low = `${rawSuffix} ${rawFull}`.toLowerCase();
  if (low.includes('sport') || low.includes('tv2') || low.includes('direkte')) {
    return 'TV2 Sport & Events';
  }
  if (low.includes('nrk') || low.includes('allment') || low.includes('general')) {
    return 'NRK & Allment';
  }
  if (rawSuffix.trim().length > 0) return rawSuffix.trim();
  return 'General';
}

/**
 * Normalizes raw provider category strings into structured (Country -> Child Category) format.
 * Unmapped or composite strings default into the 'Other' group.
 */
export function normalizeCategoryString(rawCategory: string): NormalizedCategoryResult {
  const rawTrimmed = (rawCategory || '').trim();

  // 1. Uncategorized or Empty
  if (!rawTrimmed) {
    return {
      country: 'Other',
      countryId: 'group_other',
      childCategory: 'Uncategorized',
      rawCategory: '',
      isOther: true,
    };
  }

  // 2. Semicolon-delimited composite metadata tags (e.g. "Animation;Family;Kids")
  if (rawTrimmed.includes(';')) {
    return {
      country: 'Other',
      countryId: 'group_other',
      childCategory: rawTrimmed,
      rawCategory: rawTrimmed,
      isOther: true,
    };
  }

  // 3. Pipe-delimited strings (e.g. "Sweden | Expressen Play", "UK | Sports", "Canada | TSN")
  if (rawTrimmed.includes('|') || rawTrimmed.includes('::')) {
    const delimiter = rawTrimmed.includes('|') ? '|' : '::';
    const parts = rawTrimmed.split(delimiter);
    const prefix = parts[0].trim();
    const suffix = parts.slice(1).join(delimiter).trim();
    const prefixUpper = prefix.toUpperCase();

    // If prefix is a generic media descriptor (e.g. LIVE, 4K, MOVIES)
    if (!suffix || NON_COUNTRY_PREFIXES.has(prefixUpper)) {
      return {
        country: 'Other',
        countryId: 'group_other',
        childCategory: suffix ? `${prefix} - ${suffix}` : prefix,
        rawCategory: rawTrimmed,
        isOther: true,
      };
    }

    const countryLabel = formatRegionLabel(prefix);
    const countryId = `country_${prefix.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    let child = suffix;
    if (countryLabel === 'Sweden') {
      child = normalizeSwedenSubCategory(suffix, rawTrimmed);
    } else if (countryLabel === 'UK') {
      child = normalizeUkSubCategory(suffix, rawTrimmed);
    } else if (countryLabel === 'Canada') {
      child = normalizeCanadaSubCategory(suffix, rawTrimmed);
    } else if (countryLabel === 'Norway') {
      child = normalizeNorwaySubCategory(suffix, rawTrimmed);
    }

    return {
      country: countryLabel,
      countryId,
      childCategory: child,
      rawCategory: rawTrimmed,
      isOther: false,
    };
  }

  // 4. Categories without delimiters (e.g. "Sweden", "UK", "Canada", "Norway", "Documentary & Science")
  const rawUpper = rawTrimmed.toUpperCase();
  const rawLower = rawTrimmed.toLowerCase();

  if (KNOWN_COUNTRIES[rawLower] || (!NON_COUNTRY_PREFIXES.has(rawUpper) && /^[a-zA-Z\s]{3,20}$/.test(rawTrimmed))) {
    const countryLabel = formatRegionLabel(rawTrimmed);
    const countryId = `country_${rawLower.replace(/[^a-z0-9]/g, '_')}`;
    return {
      country: countryLabel,
      countryId,
      childCategory: 'General',
      rawCategory: rawTrimmed,
      isOther: false,
    };
  }

  // 5. Unmapped general category -> falls into Other
  return {
    country: 'Other',
    countryId: 'group_other',
    childCategory: rawTrimmed,
    rawCategory: rawTrimmed,
    isOther: true,
  };
}

/**
 * Builds the hierarchical Country -> Child Category structure from channels,
 * guaranteeing all original channels are retained and properly mapped.
 */
export function buildHierarchicalCategoryTree(
  channels: { id: string | number; category?: string; name?: string }[],
  options?: {
    isSportsOnly?: boolean;
    favoritesCount?: number;
    historyCount?: number;
  }
): NormalizedHierarchyTree {
  const isSports = options?.isSportsOnly ?? false;

  // Filter if sports-only mode is active
  const candidateChannels = isSports
    ? channels.filter((c) => isSportsChannel({ name: c.name || '', categoryName: c.category || '' }))
    : channels;

  // Count channels per raw category string
  const categoryCounts: Record<string, number> = {};
  let sportsTotal = 0;

  for (const ch of channels) {
    if (isSportsChannel({ name: ch.name || '', categoryName: ch.category || '' })) {
      sportsTotal++;
    }
  }

  for (const ch of candidateChannels) {
    const cat = ch.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const groupsMap = new Map<string, HierarchyCountryGroup>();
  const otherChildrenMap = new Map<string, HierarchyChildCategory>();
  const otherRawCategories = new Set<string>();
  let otherTotalCount = 0;

  // Pre-seed Sweden, UK, Canada, Norway to match user's explicit UX ordering
  const orderedInitialCountries = ['Sweden', 'UK', 'Canada', 'Norway'];
  for (const cName of orderedInitialCountries) {
    const grpId = `country_${cName.toLowerCase()}`;
    groupsMap.set(grpId, {
      id: grpId,
      label: cName,
      countryCode: KNOWN_COUNTRIES[cName.toLowerCase()]?.code,
      count: 0,
      isOther: false,
      rawCategories: new Set(),
      children: [],
    });
  }

  // Pre-populate Sweden default subcategories as requested in prompt diagram
  const swedenGroup = groupsMap.get('country_sweden')!;
  const defaultSwedenSubs = ['Expressen Play', 'Disney+', 'Max Sports', 'TeliaPlay Events', 'ViaPlay Events'];
  for (const sub of defaultSwedenSubs) {
    swedenGroup.children.push({
      id: `country_sweden_${sub.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      label: sub,
      rawCategory: `Sweden | ${sub}`,
      rawCategories: [],
      count: 0,
    });
  }

  // Process all raw categories and map channels into hierarchy
  for (const [rawCat, count] of Object.entries(categoryCounts)) {
    const normalized = normalizeCategoryString(rawCat);

    if (normalized.isOther) {
      otherRawCategories.add(rawCat);
      otherTotalCount += count;
      const childKey = normalized.childCategory;
      let existingChild = otherChildrenMap.get(childKey);
      if (!existingChild) {
        existingChild = {
          id: `other_${childKey.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          label: childKey,
          rawCategory: rawCat,
          rawCategories: [rawCat],
          count: 0,
        };
        otherChildrenMap.set(childKey, existingChild);
      } else {
        existingChild.rawCategories.push(rawCat);
      }
      existingChild.count += count;
      continue;
    }

    let group = groupsMap.get(normalized.countryId);
    if (!group) {
      group = {
        id: normalized.countryId,
        label: normalized.country,
        countryCode: KNOWN_COUNTRIES[normalized.country.toLowerCase()]?.code,
        count: 0,
        isOther: false,
        rawCategories: new Set(),
        children: [],
      };
      groupsMap.set(normalized.countryId, group);
    }

    group.count += count;
    group.rawCategories.add(rawCat);

    let child = group.children.find((c) => c.label === normalized.childCategory);
    if (!child) {
      child = {
        id: `${group.id}_${normalized.childCategory.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        label: normalized.childCategory,
        rawCategory: rawCat,
        rawCategories: [rawCat],
        count: 0,
      };
      group.children.push(child);
    } else {
      if (!child.rawCategories.includes(rawCat)) {
        child.rawCategories.push(rawCat);
      }
    }
    child.count += count;
  }

  // Distribute any Swedish channels that match Swedish subcategories by channel name/metadata
  for (const ch of candidateChannels) {
    const catLow = (ch.category || '').toLowerCase();
    const nameLow = (ch.name || '').toLowerCase();
    if (catLow.startsWith('sweden') || nameLow.includes('sverige')) {
      for (const child of swedenGroup.children) {
        const subLow = child.label.toLowerCase();
        let matches = false;
        if (subLow.includes('expressen') && (catLow.includes('expressen') || nameLow.includes('expressen'))) matches = true;
        else if (subLow.includes('disney') && (catLow.includes('disney') || nameLow.includes('disney'))) matches = true;
        else if (subLow.includes('max sport') && (catLow.includes('max sport') || nameLow.includes('max sport'))) matches = true;
        else if (subLow.includes('teliaplay') && (catLow.includes('teliaplay') || nameLow.includes('teliaplay'))) matches = true;
        else if (subLow.includes('viaplay') && (catLow.includes('viaplay') || nameLow.includes('viaplay'))) matches = true;

        if (matches && !child.rawCategories.includes(ch.category || '')) {
          if (ch.category) child.rawCategories.push(ch.category);
        }
      }
    }
  }

  // Recalculate group counts
  for (const group of groupsMap.values()) {
    const childrenSum = group.children.reduce((acc, c) => acc + c.count, 0);
    if (childrenSum > group.count) {
      group.count = childrenSum;
    }
  }

  // Sort countries: Keep prioritized order (Sweden, UK, Canada, Norway) first, then alphabetical
  const prioritizedSet = new Set(orderedInitialCountries);
  const prioritizedGroups: HierarchyCountryGroup[] = [];
  const otherCountryGroups: HierarchyCountryGroup[] = [];

  for (const name of orderedInitialCountries) {
    const g = groupsMap.get(`country_${name.toLowerCase()}`);
    if (g) prioritizedGroups.push(g);
  }

  for (const g of groupsMap.values()) {
    if (!prioritizedSet.has(g.label)) {
      otherCountryGroups.push(g);
    }
  }
  otherCountryGroups.sort((a, b) => a.label.localeCompare(b.label));

  const sortedCountries = [...prioritizedGroups, ...otherCountryGroups];

  // Other Group with all unmapped items
  const otherGroup: HierarchyCountryGroup = {
    id: 'group_other',
    label: 'Other',
    count: otherTotalCount,
    isOther: true,
    rawCategories: otherRawCategories,
    children: Array.from(otherChildrenMap.values()).sort((a, b) => a.label.localeCompare(b.label)),
  };

  const systemItems: NormalizedHierarchyTree['systemItems'] = [
    { id: 'all', label: 'ALL CHANNELS', count: isSports ? sportsTotal : channels.length, type: 'all' },
    { id: 'sports', label: 'Sports', count: sportsTotal, type: 'sports' },
    { id: 'favorites', label: 'Favorites', count: options?.favoritesCount || 0, type: 'favorites' },
    { id: 'recent', label: 'History', count: options?.historyCount || 0, type: 'history' },
  ];

  return {
    systemItems,
    countryGroups: sortedCountries,
    otherGroup,
    totalChannelsCount: candidateChannels.length,
    totalCategoriesCount: Object.keys(categoryCounts).length,
  };
}

/**
 * Flattens the hierarchical country tree into linear rows for Panel 2 navigation.
 * Expanded countries will insert their child subcategories directly beneath them.
 */
export function flattenHierarchyTree(
  tree: NormalizedHierarchyTree,
  expandedCountries: Set<string> | Record<string, boolean>
): Panel2TreeRow[] {
  const rows: Panel2TreeRow[] = [];

  const isExpanded = (countryNameOrId: string) => {
    if (expandedCountries instanceof Set) {
      return (
        expandedCountries.has(countryNameOrId) ||
        expandedCountries.has(countryNameOrId.replace('country_', '')) ||
        expandedCountries.has(`country_${countryNameOrId.toLowerCase()}`)
      );
    }
    return (
      Boolean(expandedCountries[countryNameOrId]) ||
      Boolean(expandedCountries[countryNameOrId.replace('country_', '')]) ||
      Boolean(expandedCountries[`country_${countryNameOrId.toLowerCase()}`])
    );
  };

  // 1. System Navigation Items (ALL CHANNELS, Sports, Favorites, History)
  for (const sys of tree.systemItems) {
    rows.push({
      key: `sys_${sys.id}`,
      id: sys.id,
      displayLabel: sys.label,
      count: sys.count,
      type: 'system',
      depth: 0,
    });
  }

  // 2. Section Header: "Categorized by COuntry"
  rows.push({
    key: 'header_categorized_by_country',
    id: 'header_categorized_by_country',
    displayLabel: 'Categorized by COuntry',
    type: 'header',
    depth: 0,
  });

  // 3. Country Category Groups (Sweden, UK, Canada, Norway, etc.)
  for (const country of tree.countryGroups) {
    const expanded = isExpanded(country.label) || isExpanded(country.id);

    rows.push({
      key: country.id,
      id: country.id,
      displayLabel: country.label,
      count: country.count,
      type: 'country_group',
      countryId: country.id,
      rawCategories: Array.from(country.rawCategories),
      isExpanded: expanded,
      depth: 0,
    });

    // If expanded, insert child subcategories indented under this country
    if (expanded && country.children.length > 0) {
      for (const child of country.children) {
        rows.push({
          key: child.id,
          id: child.id,
          displayLabel: child.label,
          count: child.count,
          type: 'sub_category',
          countryId: country.id,
          rawCategory: child.rawCategory,
          rawCategories: child.rawCategories,
          depth: 1,
        });
      }
    }
  }

  // 4. Other Group (for any unmapped categories)
  if (tree.otherGroup.children.length > 0 || tree.otherGroup.count > 0) {
    const otherExpanded = isExpanded('Other') || isExpanded('group_other');
    rows.push({
      key: tree.otherGroup.id,
      id: tree.otherGroup.id,
      displayLabel: tree.otherGroup.label,
      count: tree.otherGroup.count,
      type: 'other_group',
      countryId: tree.otherGroup.id,
      rawCategories: Array.from(tree.otherGroup.rawCategories),
      isExpanded: otherExpanded,
      depth: 0,
    });

    if (otherExpanded && tree.otherGroup.children.length > 0) {
      for (const child of tree.otherGroup.children) {
        rows.push({
          key: child.id,
          id: child.id,
          displayLabel: child.label,
          count: child.count,
          type: 'sub_category',
          countryId: tree.otherGroup.id,
          rawCategory: child.rawCategory,
          rawCategories: child.rawCategories,
          depth: 1,
        });
      }
    }
  }

  return rows;
}

/**
 * Filter channels based on hierarchical category selection:
 * - 'all': all channels
 * - 'sports': sports channels only
 * - 'country_*': all channels belonging to that country group
 * - child category id / rawCategory: channels matching the subcategory
 */
export function filterChannelsByHierarchySelection<T extends { category?: string; name: string; id?: string | number }>(
  channels: T[],
  selectedCategoryId: string,
  tree: NormalizedHierarchyTree
): T[] {
  if (!selectedCategoryId || selectedCategoryId === 'all') {
    return channels;
  }

  if (selectedCategoryId === 'sports') {
    return channels.filter((ch) => isSportsChannel({ name: ch.name, categoryName: ch.category || '' }));
  }

  // Country group selected
  if (selectedCategoryId.startsWith('country_') || selectedCategoryId === 'group_other') {
    const countryGroup =
      selectedCategoryId === 'group_other'
        ? tree.otherGroup
        : tree.countryGroups.find((g) => g.id === selectedCategoryId);

    if (countryGroup) {
      return channels.filter((ch) => {
        const cat = ch.category || 'General';
        if (countryGroup.rawCategories.has(cat)) return true;
        // Also match country name in category or channel name
        if (countryGroup.label === 'Sweden') {
          const catLow = cat.toLowerCase();
          const nameLow = ch.name.toLowerCase();
          return catLow.includes('sweden') || catLow.includes('sverige') || nameLow.includes('sverige') || catLow.startsWith('se ');
        }
        if (countryGroup.label === 'UK') {
          const catLow = cat.toLowerCase();
          return catLow.includes('uk') || catLow.includes('united kingdom') || catLow.includes('british');
        }
        if (countryGroup.label === 'Canada') {
          const catLow = cat.toLowerCase();
          return catLow.includes('canada') || catLow.includes('ca ');
        }
        if (countryGroup.label === 'Norway') {
          const catLow = cat.toLowerCase();
          return catLow.includes('norway') || catLow.includes('norge') || catLow.includes('no ');
        }
        return false;
      });
    }
  }

  // Subcategory selected: search in all country groups and otherGroup
  let targetChild: HierarchyChildCategory | undefined;
  for (const group of tree.countryGroups) {
    const found = group.children.find((c) => c.id === selectedCategoryId || c.rawCategory === selectedCategoryId);
    if (found) {
      targetChild = found;
      break;
    }
  }
  if (!targetChild) {
    targetChild = tree.otherGroup.children.find(
      (c) => c.id === selectedCategoryId || c.rawCategory === selectedCategoryId
    );
  }

  if (targetChild) {
    const rawSet = new Set(targetChild.rawCategories);
    const subLabelLow = targetChild.label.toLowerCase();

    return channels.filter((ch) => {
      const cat = ch.category || 'General';
      if (rawSet.has(cat) || cat === targetChild!.rawCategory) return true;

      const catLow = cat.toLowerCase();
      const nameLow = ch.name.toLowerCase();

      if (subLabelLow.includes('expressen')) {
        return catLow.includes('expressen') || nameLow.includes('expressen');
      }
      if (subLabelLow.includes('disney')) {
        return catLow.includes('disney') || nameLow.includes('disney');
      }
      if (subLabelLow.includes('max sport')) {
        return catLow.includes('max sport') || nameLow.includes('max sport') || catLow.includes('maxsport');
      }
      if (subLabelLow.includes('teliaplay')) {
        return catLow.includes('teliaplay') || catLow.includes('telia') || nameLow.includes('teliaplay');
      }
      if (subLabelLow.includes('viaplay')) {
        return catLow.includes('viaplay') || catLow.includes('viasat') || nameLow.includes('viaplay');
      }
      return false;
    });
  }

  // Fallback: match category directly
  return channels.filter((ch) => (ch.category || 'General') === selectedCategoryId);
}


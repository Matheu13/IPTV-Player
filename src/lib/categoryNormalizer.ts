/**
 * Category Normalizer Utility
 *
 * Transforms raw provider category arrays into a clean hierarchical structure:
 * Country -> Child Category
 *
 * Requirements:
 * 1. Handles the pipe separator 'Country | Group' dynamically.
 * 2. Dynamically extracts and formats country names WITHOUT hardcoding country lists.
 * 3. Places uncategorized, empty, and semicolon-mixed items (e.g. 'Kids;Family;Animation')
 *    into an 'Other' group.
 * 4. Retains counts, original rawCategory mappings, and channel references.
 */

export interface NormalizedChildCategory {
  id: string;
  name: string;
  rawCategory: string;
  count: number;
  channelIds?: (string | number)[];
}

export interface NormalizedCountryGroup {
  id: string;
  name: string;
  count: number;
  isOther: boolean;
  subCategories: NormalizedChildCategory[];
  childCategories: NormalizedChildCategory[]; // Alias for compatibility
  rawCategories: Set<string>;
}

export interface NormalizedCategoryHierarchy {
  countries: NormalizedCountryGroup[];
  otherGroup: NormalizedCountryGroup | null;
  totalCategories: number;
  totalChannels: number;
  allCount: number;
}

export interface ParsedCategory {
  country: string;
  countryId: string;
  childCategory: string;
  rawCategory: string;
  isOther: boolean;
}

/**
 * Formats a raw country string into standard title case or clean uppercase acronym.
 * Does NOT hardcode country names, working dynamically for any country prefix.
 */
export function formatCountryName(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 'Other';

  // Short 2-3 letter acronyms (e.g. UK, USA, CAN, SWE, NO, DE, FR)
  if (trimmed.length <= 3) {
    return trimmed.toUpperCase();
  }

  // Capitalize each word properly without hardcoding specific country names
  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Parses a single raw category string according to the specification:
 * - 'Country | Group' -> Country & Child Category
 * - Semicolon-mixed items (e.g. 'Kids;Family;Animation') -> 'Other' group
 * - Uncategorized or empty items -> 'Other' group ('Uncategorized')
 * - Items without a pipe separator -> 'Other' group
 */
export function parseCategoryString(rawCategory: string | undefined | null): ParsedCategory {
  const raw = (rawCategory ?? '').trim();

  // 1. Uncategorized or empty string
  if (!raw || raw.toLowerCase() === 'uncategorized') {
    return {
      country: 'Other',
      countryId: 'other',
      childCategory: 'Uncategorized',
      rawCategory: raw || 'Uncategorized',
      isOther: true,
    };
  }

  // 2. Semicolon-mixed items (composite metadata tags)
  if (raw.includes(';')) {
    return {
      country: 'Other',
      countryId: 'other',
      childCategory: raw,
      rawCategory: raw,
      isOther: true,
    };
  }

  // 3. Pipe separator: 'Country | Group'
  if (raw.includes('|')) {
    const parts = raw.split('|');
    const rawCountry = parts[0].trim();
    const rawGroup = parts.slice(1).join('|').trim();

    if (!rawCountry) {
      return {
        country: 'Other',
        countryId: 'other',
        childCategory: rawGroup || 'General',
        rawCategory: raw,
        isOther: true,
      };
    }

    const formattedCountry = formatCountryName(rawCountry);
    const countryId = formattedCountry.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const childCategory = rawGroup || 'General';

    return {
      country: formattedCountry,
      countryId,
      childCategory,
      rawCategory: raw,
      isOther: false,
    };
  }

  // 4. Standalone string without pipe separator -> placed into 'Other'
  return {
    country: 'Other',
    countryId: 'other',
    childCategory: raw,
    rawCategory: raw,
    isOther: true,
  };
}

/**
 * Type-flexible input for raw categories.
 * Can be an array of string categories or channel-like objects with a category field.
 */
export type CategoryInputItem =
  | string
  | {
      id?: string | number;
      category?: string;
      categoryName?: string;
      categoryId?: string;
      name?: string;
    };

/**
 * Transforms raw provider category arrays (or channel objects) into a hierarchical structure:
 * Country -> Child Category
 *
 * Ensures pipe separator 'Country | Group' is handled correctly and uncategorized /
 * semicolon-mixed items are grouped into 'Other' without hardcoded country names.
 */
export function normalizeCategoryHierarchy(items: CategoryInputItem[]): NormalizedCategoryHierarchy {
  const countryMap = new Map<
    string,
    {
      id: string;
      name: string;
      isOther: boolean;
      count: number;
      rawCategories: Set<string>;
      childrenMap: Map<
        string,
        {
          id: string;
          name: string;
          rawCategory: string;
          count: number;
          channelIds: (string | number)[];
        }
      >;
    }
  >();

  let totalChannels = 0;
  const uniqueCategories = new Set<string>();

  for (const item of items) {
    totalChannels++;
    let rawCategory = '';
    let channelId: string | number | undefined;

    if (typeof item === 'string') {
      rawCategory = item;
    } else if (item && typeof item === 'object') {
      rawCategory = item.category || item.categoryName || item.categoryId || '';
      channelId = item.id;
    }

    uniqueCategories.add(rawCategory);
    const parsed = parseCategoryString(rawCategory);

    let countryEntry = countryMap.get(parsed.countryId);
    if (!countryEntry) {
      countryEntry = {
        id: parsed.countryId,
        name: parsed.country,
        isOther: parsed.isOther,
        count: 0,
        rawCategories: new Set<string>(),
        childrenMap: new Map(),
      };
      countryMap.set(parsed.countryId, countryEntry);
    }

    countryEntry.count++;
    countryEntry.rawCategories.add(parsed.rawCategory);

    // Group children by childCategory name
    const childKey = parsed.childCategory.toLowerCase();
    let childEntry = countryEntry.childrenMap.get(childKey);
    if (!childEntry) {
      childEntry = {
        id: `${parsed.countryId}_${childKey.replace(/[^a-z0-9]/g, '_')}`,
        name: parsed.childCategory,
        rawCategory: parsed.rawCategory,
        count: 0,
        channelIds: [],
      };
      countryEntry.childrenMap.set(childKey, childEntry);
    }

    childEntry.count++;
    if (channelId !== undefined) {
      childEntry.channelIds.push(channelId);
    }
  }

  // Convert map to sorted array of NormalizedCountryGroup
  const countryList: NormalizedCountryGroup[] = [];
  let otherGroup: NormalizedCountryGroup | null = null;

  for (const entry of countryMap.values()) {
    const subCategories: NormalizedChildCategory[] = Array.from(entry.childrenMap.values())
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((c) => ({
        id: c.id,
        name: c.name,
        rawCategory: c.rawCategory,
        count: c.count,
        channelIds: c.channelIds,
      }));

    const group: NormalizedCountryGroup = {
      id: entry.id,
      name: entry.name,
      count: entry.count,
      isOther: entry.isOther,
      subCategories,
      childCategories: subCategories,
      rawCategories: entry.rawCategories,
    };

    if (entry.isOther || entry.id === 'other') {
      otherGroup = group;
    } else {
      countryList.push(group);
    }
  }

  // Sort countries alphabetically
  countryList.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  // Append 'Other' group at the end if it exists and has items
  if (otherGroup && otherGroup.count > 0) {
    countryList.push(otherGroup);
  }

  return {
    countries: countryList,
    otherGroup,
    totalCategories: uniqueCategories.size,
    totalChannels,
    allCount: totalChannels,
  };
}

/**
 * Convenient alias function for normalizeCategoryHierarchy
 */
export const normalizeProviderCategories = normalizeCategoryHierarchy;

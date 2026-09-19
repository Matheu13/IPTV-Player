/**
 * Category Normalizer Utility
 *
 * Transforms raw provider category arrays and M3U channel stream lists into a clean hierarchical structure:
 * Country -> Child Category -> Member Channels
 *
 * Requirements:
 * 1. Handles pipe separators 'Country | Group' dynamically across all European region formats.
 * 2. Explicitly supports a broad set of European country codes (e.g., DK, PL, FR, CH, SE, NO, UK, DE, ES, IT, NL, BE, etc.).
 * 3. Inspects M3U stream metadata ('tvg-name', 'tvg-id', 'tvg-country', 'group-title') and extracts country assignments via regex.
 * 4. Outputs comprehensive debug logging to verify stream mapping, 'tvg-name' parsing results, and identify channels
 *    failing to match target European categories ('Denmark', 'Poland', 'France', 'Switzerland').
 * 5. Guarantees zero channel loss by routing unmapped or composite tags into 'Other'.
 * 6. Ensures each category node contains an array of its member channels and channelIds.
 */

export interface NormalizedChildCategory {
  id: string;
  name: string;
  rawCategory: string;
  count: number;
  channelIds: (string | number)[];
  channels?: any[]; // Member channel stream objects
}

export interface NormalizedCountryGroup {
  id: string;
  name: string;
  code?: string;
  flag?: string;
  count: number;
  isOther: boolean;
  subCategories: NormalizedChildCategory[];
  childCategories: NormalizedChildCategory[]; // Alias for backwards compatibility
  rawCategories: Set<string>;
  channelIds: (string | number)[];
  channels?: any[]; // Member channel stream objects
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
  countryCode?: string;
  flag?: string;
  childCategory: string;
  rawCategory: string;
  isOther: boolean;
  matchSource?: 'pipe' | 'tvg-country' | 'tvg-name-prefix' | 'tvg-id-tld' | 'fallback';
}

export interface CountryMetadata {
  name: string;
  code: string;
  flag: string;
  aliases: string[];
}

/**
 * Broad European & Regional Country Definition Table
 * Includes ISO-2, ISO-3 codes, native language variations, and flag emojis.
 */
export const EUROPEAN_COUNTRIES: Record<string, CountryMetadata> = {
  denmark: { name: 'Denmark', code: 'DK', flag: '🇩🇰', aliases: ['dk', 'dnk', 'danmark', 'danish'] },
  poland: { name: 'Poland', code: 'PL', flag: '🇵🇱', aliases: ['pl', 'pol', 'polska', 'polish'] },
  france: { name: 'France', code: 'FR', flag: '🇫🇷', aliases: ['fr', 'fra', 'french', 'francais', 'française'] },
  switzerland: { name: 'Switzerland', code: 'CH', flag: '🇨🇭', aliases: ['ch', 'che', 'schweiz', 'suisse', 'svizzera', 'swiss'] },
  sweden: { name: 'Sweden', code: 'SE', flag: '🇸🇪', aliases: ['se', 'swe', 'sverige', 'svenska', 'swedish'] },
  norway: { name: 'Norway', code: 'NO', flag: '🇳🇴', aliases: ['no', 'nor', 'norge', 'norsk', 'norwegian'] },
  uk: { name: 'UK', code: 'GB', flag: '🇬🇧', aliases: ['uk', 'gb', 'gbr', 'united kingdom', 'great britain', 'england', 'scotland', 'wales', 'british'] },
  germany: { name: 'Germany', code: 'DE', flag: '🇩🇪', aliases: ['de', 'deu', 'deutschland', 'german'] },
  spain: { name: 'Spain', code: 'ES', flag: '🇪🇸', aliases: ['es', 'esp', 'españa', 'espana', 'spanish'] },
  italy: { name: 'Italy', code: 'IT', flag: '🇮🇹', aliases: ['it', 'ita', 'italia', 'italian'] },
  netherlands: { name: 'Netherlands', code: 'NL', flag: '🇳🇱', aliases: ['nl', 'nld', 'nederland', 'holland', 'dutch'] },
  belgium: { name: 'Belgium', code: 'BE', flag: '🇧🇪', aliases: ['be', 'bel', 'belgique', 'belgië', 'belgie', 'belgian'] },
  austria: { name: 'Austria', code: 'AT', flag: '🇦🇹', aliases: ['at', 'aut', 'österreich', 'oesterreich', 'austrian'] },
  portugal: { name: 'Portugal', code: 'PT', flag: '🇵🇹', aliases: ['pt', 'prt', 'portuguese'] },
  ireland: { name: 'Ireland', code: 'IE', flag: '🇮🇪', aliases: ['ie', 'irl', 'irish', 'eire'] },
  finland: { name: 'Finland', code: 'FI', flag: '🇫🇮', aliases: ['fi', 'fin', 'suomi', 'finnish'] },
  greece: { name: 'Greece', code: 'GR', flag: '🇬🇷', aliases: ['gr', 'grc', 'hellas', 'greek'] },
  czechia: { name: 'Czech Republic', code: 'CZ', flag: '🇨🇿', aliases: ['cz', 'cze', 'czech republic', 'czechia', 'cesko', 'czech'] },
  hungary: { name: 'Hungary', code: 'HU', flag: '🇭🇺', aliases: ['hu', 'hun', 'magyar', 'hungarian'] },
  romania: { name: 'Romania', code: 'RO', flag: '🇷🇴', aliases: ['ro', 'rou', 'romanian'] },
  croatia: { name: 'Croatia', code: 'HR', flag: '🇭🇷', aliases: ['hr', 'hrv', 'hrvatska', 'croatian'] },
  serbia: { name: 'Serbia', code: 'RS', flag: '🇷🇸', aliases: ['rs', 'srb', 'srbija', 'serbian'] },
  turkey: { name: 'Turkey', code: 'TR', flag: '🇹🇷', aliases: ['tr', 'tur', 'türkiye', 'turkiye', 'turkish'] },
  ukraine: { name: 'Ukraine', code: 'UA', flag: '🇺🇦', aliases: ['ua', 'ukr', 'ukrainian'] },
  slovakia: { name: 'Slovakia', code: 'SK', flag: '🇸🇰', aliases: ['sk', 'svk', 'slovensko', 'slovak'] },
  slovenia: { name: 'Slovenia', code: 'SI', flag: '🇸🇮', aliases: ['si', 'svn', 'slovenija', 'slovenian'] },
  iceland: { name: 'Iceland', code: 'IS', flag: '🇮🇸', aliases: ['is', 'isl', 'icelandic'] },
  bulgaria: { name: 'Bulgaria', code: 'BG', flag: '🇧🇬', aliases: ['bg', 'bgr', 'bulgarian'] },
  estonia: { name: 'Estonia', code: 'EE', flag: '🇪🇪', aliases: ['ee', 'est', 'estonian'] },
  latvia: { name: 'Latvia', code: 'LV', flag: '🇱🇻', aliases: ['lv', 'lva', 'latvian'] },
  lithuania: { name: 'Lithuania', code: 'LT', flag: '🇱🇹', aliases: ['lt', 'ltu', 'lithuanian'] },
  luxembourg: { name: 'Luxembourg', code: 'LU', flag: '🇱🇺', aliases: ['lu', 'lux', 'luxembourgish'] },
  canada: { name: 'Canada', code: 'CA', flag: '🇨🇦', aliases: ['ca', 'can', 'canadian'] },
  usa: { name: 'USA', code: 'US', flag: '🇺🇸', aliases: ['us', 'usa', 'united states', 'american'] },
};

// Fast lookup map mapping any lowercase alias/code to CountryMetadata
const COUNTRY_LOOKUP = new Map<string, CountryMetadata>();
for (const info of Object.values(EUROPEAN_COUNTRIES)) {
  COUNTRY_LOOKUP.set(info.name.toLowerCase(), info);
  COUNTRY_LOOKUP.set(info.code.toLowerCase(), info);
  for (const alias of info.aliases) {
    COUNTRY_LOOKUP.set(alias.toLowerCase(), info);
  }
}

// Target European focus countries requested by user for explicit verification logging
export const TARGET_EUROPEAN_CORE = new Set(['Denmark', 'Poland', 'France', 'Switzerland']);

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

/**
 * Formats a raw country string into standard title case or standard acronym.
 * Checks the rich European country table first, then formats cleanly.
 */
export function formatCountryName(raw: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed) return 'Other';

  const lookup = COUNTRY_LOOKUP.get(trimmed.toLowerCase());
  if (lookup) {
    return lookup.name;
  }

  // Short 2-3 letter acronyms (e.g. UK, USA, CAN, SWE, NO, DE, FR)
  if (trimmed.length <= 3) {
    return trimmed.toUpperCase();
  }

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
 * Returns flag emoji for a country name or code
 */
export function getCountryFlag(countryNameOrCode: string): string {
  const found = COUNTRY_LOOKUP.get((countryNameOrCode || '').toLowerCase());
  return found?.flag || '🌐';
}

/**
 * Parses a single raw category string according to specification:
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
      flag: '🌐',
      childCategory: 'Uncategorized',
      rawCategory: raw || 'Uncategorized',
      isOther: true,
      matchSource: 'fallback',
    };
  }

  // 2. Semicolon-mixed items (composite metadata tags)
  if (raw.includes(';')) {
    return {
      country: 'Other',
      countryId: 'other',
      flag: '🌐',
      childCategory: raw,
      rawCategory: raw,
      isOther: true,
      matchSource: 'fallback',
    };
  }

  // 3. Pipe separator: 'Country | Group' or 'Country :: Group'
  if (raw.includes('|') || raw.includes('::')) {
    const delimiter = raw.includes('|') ? '|' : '::';
    const parts = raw.split(delimiter);
    const rawPrefix = parts[0].trim();
    const rawSuffix = parts.slice(1).join(delimiter).trim();
    const prefixUpper = rawPrefix.toUpperCase();

    if (!rawPrefix || NON_COUNTRY_PREFIXES.has(prefixUpper)) {
      return {
        country: 'Other',
        countryId: 'other',
        flag: '🌐',
        childCategory: rawSuffix ? `${rawPrefix} - ${rawSuffix}` : rawPrefix || 'General',
        rawCategory: raw,
        isOther: true,
        matchSource: 'pipe',
      };
    }

    const matchedCountry = COUNTRY_LOOKUP.get(rawPrefix.toLowerCase());
    const countryName = matchedCountry ? matchedCountry.name : formatCountryName(rawPrefix);
    const countryCode = matchedCountry ? matchedCountry.code : rawPrefix.length <= 3 ? rawPrefix.toUpperCase() : undefined;
    const flag = matchedCountry?.flag || getCountryFlag(countryName);
    const countryId = countryName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const childCategory = rawSuffix || 'General';

    return {
      country: countryName,
      countryId,
      countryCode,
      flag,
      childCategory,
      rawCategory: raw,
      isOther: false,
      matchSource: 'pipe',
    };
  }

  // 4. Standalone string without pipe separator -> placed into 'Other'
  // Check if standalone string matches a known country directly (e.g. 'Sweden', 'Denmark', 'Poland')
  const directMatch = COUNTRY_LOOKUP.get(raw.toLowerCase());
  if (directMatch) {
    return {
      country: directMatch.name,
      countryId: directMatch.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
      countryCode: directMatch.code,
      flag: directMatch.flag,
      childCategory: 'General',
      rawCategory: raw,
      isOther: false,
      matchSource: 'fallback',
    };
  }

  return {
    country: 'Other',
    countryId: 'other',
    flag: '🌐',
    childCategory: raw,
    rawCategory: raw,
    isOther: true,
    matchSource: 'fallback',
  };
}

/**
 * Type-flexible input for raw channels or category items.
 * Accommodates M3U streams with full metadata ('tvg-name', 'tvg-id', 'tvg-country', etc.).
 */
export type CategoryInputItem =
  | string
  | {
      id?: string | number;
      streamId?: string | number;
      name?: string;
      title?: string;
      category?: string;
      categoryName?: string;
      categoryId?: string;
      groupTitle?: string;
      'group-title'?: string;
      tvgName?: string;
      'tvg-name'?: string;
      tvgId?: string;
      'tvg-id'?: string;
      tvgCountry?: string;
      'tvg-country'?: string;
      country?: string;
      countryCode?: string;
      streamUrl?: string;
      resolvedStreamUrl?: string;
      streamIcon?: string;
      logoUrl?: string | null;
      [key: string]: any;
    };

/**
 * Parses channel stream metadata (specifically 'tvg-name', 'group-title', and 'tvg-country')
 * using regex and token delimiters to identify European countries and categories.
 */
export function extractChannelMetadata(item: CategoryInputItem): {
  parsed: ParsedCategory;
  channelId: string | number;
  channelName: string;
  tvgName: string;
  groupTitle?: string;
  detectedCode?: string;
} {
  let rawCategory = '';
  let channelName = '';
  let tvgName = '';
  let tvgId = '';
  let tvgCountry = '';
  let channelId: string | number = '';
  let groupTitle = '';

  if (typeof item === 'string') {
    rawCategory = item;
    channelName = item;
    channelId = item;
    groupTitle = item;
  } else if (item && typeof item === 'object') {
    channelId = item.id !== undefined ? item.id : item.streamId !== undefined ? item.streamId : Math.random().toString(36).slice(2);
    channelName = item.name || item.title || `Channel ${channelId}`;
    tvgName = item.tvgName || item['tvg-name'] || item.name || '';
    tvgId = item.epgChannelId || item.tvgId || item['tvg-id'] || '';
    tvgCountry = item.countryCode || item.country || item.tvgCountry || item['tvg-country'] || '';
    groupTitle = item['group-title'] || item.groupTitle || item.category || item.categoryName || '';
    rawCategory = groupTitle || item.categoryId || '';
  }

  // 1. If rawCategory has a pipe delimiter, that is the primary category mapping
  if (rawCategory.includes('|') || rawCategory.includes('::')) {
    const parsed = parseCategoryString(rawCategory);
    return {
      parsed,
      channelId,
      channelName,
      tvgName,
      groupTitle,
      detectedCode: parsed.countryCode,
    };
  }

  // 2. Check explicit country attribute (e.g. tvg-country="DK", "PL", "FR", "CH")
  if (tvgCountry) {
    const matched = COUNTRY_LOOKUP.get(tvgCountry.trim().toLowerCase());
    if (matched) {
      const child = rawCategory && rawCategory.toLowerCase() !== 'uncategorized' ? rawCategory : 'General';
      return {
        parsed: {
          country: matched.name,
          countryId: matched.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          countryCode: matched.code,
          flag: matched.flag,
          childCategory: child,
          rawCategory: rawCategory || matched.name,
          isOther: false,
          matchSource: 'tvg-country',
        },
        channelId,
        channelName,
        tvgName,
        groupTitle,
        detectedCode: matched.code,
      };
    }
  }

  // 3. Regex inspection on 'tvg-name' and 'name' for European region prefixes
  // Patterns handled:
  // - Bracket format: "[DK] DR1 HD", "[PL] TVP1", "[FR] TF1", "[CH] RTS Un"
  // - Colon / Pipe / Hyphen prefix format: "DK: DR1", "PL: Polsat", "FR - Canal+", "CH | SRF 1"
  const candidateTexts = [tvgName, channelName, rawCategory].filter(Boolean);
  for (const text of candidateTexts) {
    // Regex 1: [DK], [PL], [FR], [CH], [SE], [UK], [NO], etc.
    const bracketMatch = text.match(/^\[([A-Za-z0-9_ -]{2,15})\]\s*(.*)$/);
    if (bracketMatch) {
      const prefixCandidate = bracketMatch[1].trim();
      const matched = COUNTRY_LOOKUP.get(prefixCandidate.toLowerCase());
      if (matched) {
        const subName = bracketMatch[2].trim() || 'General';
        return {
          parsed: {
            country: matched.name,
            countryId: matched.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            countryCode: matched.code,
            flag: matched.flag,
            childCategory: subName,
            rawCategory: rawCategory || `${matched.name} | ${subName}`,
            isOther: false,
            matchSource: 'tvg-name-prefix',
          },
          channelId,
          channelName,
          tvgName,
          groupTitle,
          detectedCode: matched.code,
        };
      }
    }

    // Regex 2: Prefix delimiter "DK: ...", "PL: ...", "FR: ...", "CH: ..." or "Denmark: ..."
    const colonMatch = text.match(/^([A-Za-z]{2,15})[:\-\|]\s*(.*)$/);
    if (colonMatch) {
      const prefixCandidate = colonMatch[1].trim();
      const matched = COUNTRY_LOOKUP.get(prefixCandidate.toLowerCase());
      if (matched) {
        const subName = colonMatch[2].trim() || 'General';
        return {
          parsed: {
            country: matched.name,
            countryId: matched.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            countryCode: matched.code,
            flag: matched.flag,
            childCategory: subName,
            rawCategory: rawCategory || `${matched.name} | ${subName}`,
            isOther: false,
            matchSource: 'tvg-name-prefix',
          },
          channelId,
          channelName,
          tvgName,
          groupTitle,
          detectedCode: matched.code,
        };
      }
    }
  }

  // 4. Regex inspection on 'tvg-id' for country top-level domain e.g. "dr1.dk", "tvp1.pl", "tf1.fr", "srf1.ch"
  if (tvgId) {
    const tldMatch = tvgId.match(/\.([a-zA-Z]{2,3})$/);
    if (tldMatch) {
      const tld = tldMatch[1].toLowerCase();
      const matched = COUNTRY_LOOKUP.get(tld);
      if (matched) {
        const child = rawCategory || 'General';
        return {
          parsed: {
            country: matched.name,
            countryId: matched.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
            countryCode: matched.code,
            flag: matched.flag,
            childCategory: child,
            rawCategory: rawCategory || `${matched.name} | ${child}`,
            isOther: false,
            matchSource: 'tvg-id-tld',
          },
          channelId,
          channelName,
          tvgName,
          groupTitle,
          detectedCode: matched.code,
        };
      }
    }
  }

  // 5. Fallback parsing using standard rawCategory logic
  const parsed = parseCategoryString(rawCategory);
  return {
    parsed,
    channelId,
    channelName,
    tvgName,
    groupTitle,
    detectedCode: parsed.countryCode,
  };
}

/**
 * Transforms raw provider category arrays or M3U channel stream lists into a hierarchical structure:
 * Country -> Child Category -> Member Channels
 *
 * Guarantees:
 * - Dynamic pipe delimiter parsing for all European formats.
 * - Explicit recognition of European country codes ('DK', 'PL', 'FR', 'CH', etc.).
 * - Detailed console logging for European metadata inspection and target tracking.
 * - Retains full member channel arrays on both country and subcategory nodes.
 */
export function normalizeCategoryHierarchy(items: CategoryInputItem[]): NormalizedCategoryHierarchy {
  const countryMap = new Map<
    string,
    {
      id: string;
      name: string;
      code?: string;
      flag?: string;
      isOther: boolean;
      count: number;
      rawCategories: Set<string>;
      channels: any[];
      childrenMap: Map<
        string,
        {
          id: string;
          name: string;
          rawCategory: string;
          count: number;
          channelIds: (string | number)[];
          channels: any[];
        }
      >;
    }
  >();

  let totalChannels = 0;
  const uniqueCategories = new Set<string>();

  // Diagnostic tracking for logging
  const countryIdentifiedCounts: Record<string, number> = {};
  let loggedStreamCount = 0;

  for (const item of items) {
    totalChannels++;
    const { parsed, channelId, channelName, tvgName, groupTitle, detectedCode } = extractChannelMetadata(item);
    uniqueCategories.add(parsed.rawCategory);

    // 1. Structured logging: displays the 'group-title' attribute vs normalized 'category' for each channel
    if (loggedStreamCount < 60 || TARGET_EUROPEAN_CORE.has(parsed.country)) {
      console.log('[CategoryNormalizer] Channel metadata verification:', {
        channelId,
        channelName,
        'group-title': groupTitle || 'N/A',
        'normalized-category': parsed.rawCategory,
        country: parsed.country,
        countryCode: detectedCode || parsed.countryCode || 'N/A',
        childCategory: parsed.childCategory,
        isTargetEuropean: TARGET_EUROPEAN_CORE.has(parsed.country),
      });

      console.log(
        `[CategoryNormalizer] Ingestion stream check: id="${channelId}", name="${channelName}", group-title="${
          groupTitle || 'N/A'
        }", normalized-category="${parsed.rawCategory}", country="${parsed.country}" (code: ${detectedCode || 'N/A'})`
      );

      if (tvgName) {
        console.log(
          `[CategoryNormalizer] 'tvg-name' parsing result for "${tvgName}": identifiedCountry="${parsed.country}", childCategory="${parsed.childCategory}" [source: ${parsed.matchSource || 'pipe'}]`
        );
      }

      // Track whether this stream successfully matched target European categories
      if (TARGET_EUROPEAN_CORE.has(parsed.country)) {
        console.log(
          `[CategoryNormalizer] Target European channel matched successfully: "${channelName}" -> ${parsed.country} (code: ${
            detectedCode || parsed.countryCode || 'N/A'
          }) | Category: ${parsed.childCategory}`
        );
      } else if (!parsed.isOther) {
        console.log(
          `[CategoryNormalizer] European / Regional country identified: "${parsed.country}" [Code: ${
            detectedCode || 'N/A'
          }] for stream "${channelName}"`
        );
      } else {
        // Channel failed to match target 'Denmark', 'Poland', 'France', or 'Switzerland' categories
        console.warn(
          `[CategoryNormalizer] Channel "${channelName}" [tvg-name: "${
            tvgName || 'N/A'
          }"] did not match target categories (Denmark, Poland, France, Switzerland); assigned to "${parsed.country}" [child: "${
            parsed.childCategory
          }"]`
        );
      }
      loggedStreamCount++;
    }

    countryIdentifiedCounts[parsed.country] = (countryIdentifiedCounts[parsed.country] || 0) + 1;

    // 2. Fetch or create Country entry
    let countryEntry = countryMap.get(parsed.countryId);
    if (!countryEntry) {
      countryEntry = {
        id: parsed.countryId,
        name: parsed.country,
        code: parsed.countryCode || detectedCode,
        flag: parsed.flag || getCountryFlag(parsed.country),
        isOther: parsed.isOther,
        count: 0,
        rawCategories: new Set<string>(),
        channels: [],
        childrenMap: new Map(),
      };
      countryMap.set(parsed.countryId, countryEntry);
    }

    countryEntry.count++;
    countryEntry.rawCategories.add(parsed.rawCategory);
    countryEntry.channels.push(item);

    // 3. Fetch or create SubCategory entry
    const childKey = parsed.childCategory.toLowerCase();
    let childEntry = countryEntry.childrenMap.get(childKey);
    if (!childEntry) {
      childEntry = {
        id: `${parsed.countryId}_${childKey.replace(/[^a-z0-9]/g, '_')}`,
        name: parsed.childCategory,
        rawCategory: parsed.rawCategory,
        count: 0,
        channelIds: [],
        channels: [],
      };
      countryEntry.childrenMap.set(childKey, childEntry);
    }

    childEntry.count++;
    childEntry.channels.push(item);
    if (channelId !== undefined && channelId !== '') {
      childEntry.channelIds.push(channelId);
    }
  }

  // Summary debug log of identified countries
  console.log(
    `[CategoryNormalizer] Channel ingestion completed. Processed ${totalChannels} channels across ${
      countryMap.size
    } country groups:`,
    countryIdentifiedCounts
  );

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
        channels: c.channels,
      }));

    const groupChannelIds = subCategories.flatMap((c) => c.channelIds || []);

    const group: NormalizedCountryGroup = {
      id: entry.id,
      name: entry.name,
      code: entry.code,
      flag: entry.flag,
      count: entry.count,
      isOther: entry.isOther,
      subCategories,
      childCategories: subCategories,
      rawCategories: entry.rawCategories,
      channelIds: groupChannelIds,
      channels: entry.channels,
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

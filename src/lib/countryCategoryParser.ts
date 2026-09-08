/**
 * Utility to parse IPTV categories and bouquets into Country > Type hierarchy.
 * Handles standard IPTV conventions such as:
 * - "Country | Content Type" (e.g. "Sweden | TeliaPlay Events", "Canada | Local")
 * - "Country: Content Type" (e.g. "Sweden: ViaPlay Events")
 * - "Country - Content Type" (e.g. "Belgium - Entertainment")
 * - Single Country Names (e.g. "Sweden", "Belgium", "Canada")
 * - Specialty Genres (e.g. "MOVIES | CINEMA", "KIDS | ANIMATION", "DOCUMENTARY")
 */

export interface ParsedCategory {
  countryId: string;
  countryName: string;
  countryFlag: string;
  contentTypeName: string;
  rawCategory: string;
}

export interface ContentTypeGroup {
  name: string;
  count: number;
  rawBouquets: string[];
}

export interface CountryGroup {
  id: string;
  name: string;
  flag: string;
  totalCount: number;
  types: ContentTypeGroup[];
}

interface CountryMeta {
  name: string;
  flag: string;
}

const KNOWN_COUNTRIES: Record<string, CountryMeta> = {
  SWEDEN: { name: 'Sweden', flag: '🇸🇪' },
  SE: { name: 'Sweden', flag: '🇸🇪' },
  SVERIGE: { name: 'Sweden', flag: '🇸🇪' },

  BELGIUM: { name: 'Belgium', flag: '🇧🇪' },
  BE: { name: 'Belgium', flag: '🇧🇪' },
  BELGIQUE: { name: 'Belgium', flag: '🇧🇪' },

  CANADA: { name: 'Canada', flag: '🇨🇦' },
  CA: { name: 'Canada', flag: '🇨🇦' },

  UK: { name: 'United Kingdom', flag: '🇬🇧' },
  GB: { name: 'United Kingdom', flag: '🇬🇧' },
  UNITEDKINGDOM: { name: 'United Kingdom', flag: '🇬🇧' },

  US: { name: 'United States', flag: '🇺🇸' },
  USA: { name: 'United States', flag: '🇺🇸' },
  UNITEDSTATES: { name: 'United States', flag: '🇺🇸' },

  IRL: { name: 'Ireland', flag: '🇮🇪' },
  IRELAND: { name: 'Ireland', flag: '🇮🇪' },

  FRANCE: { name: 'France', flag: '🇫🇷' },
  FR: { name: 'France', flag: '🇫🇷' },

  GERMANY: { name: 'Germany', flag: '🇩🇪' },
  DE: { name: 'Germany', flag: '🇩🇪' },
  DEUTSCHLAND: { name: 'Germany', flag: '🇩🇪' },

  SPAIN: { name: 'Spain', flag: '🇪🇸' },
  ES: { name: 'Spain', flag: '🇪🇸' },
  ESPANA: { name: 'Spain', flag: '🇪🇸' },

  ITALY: { name: 'Italy', flag: '🇮🇹' },
  IT: { name: 'Italy', flag: '🇮🇹' },
  ITALIA: { name: 'Italy', flag: '🇮🇹' },

  NETHERLANDS: { name: 'Netherlands', flag: '🇳🇱' },
  NL: { name: 'Netherlands', flag: '🇳🇱' },

  DENMARK: { name: 'Denmark', flag: '🇩🇰' },
  DK: { name: 'Denmark', flag: '🇩🇰' },

  NORWAY: { name: 'Norway', flag: '🇳🇴' },
  NO: { name: 'Norway', flag: '🇳🇴' },

  FINLAND: { name: 'Finland', flag: '🇫🇮' },
  FI: { name: 'Finland', flag: '🇫🇮' },

  PORTUGAL: { name: 'Portugal', flag: '🇵🇹' },
  PT: { name: 'Portugal', flag: '🇵🇹' },

  TURKEY: { name: 'Turkey', flag: '🇹🇷' },
  TR: { name: 'Turkey', flag: '🇹🇷' },

  POLAND: { name: 'Poland', flag: '🇵🇱' },
  PL: { name: 'Poland', flag: '🇵🇱' },

  AFRICA: { name: 'Pan-Africa', flag: '🌍' },
  NIGERIA: { name: 'Nigeria', flag: '🇳🇬' },
  SOUTHAFRICA: { name: 'South Africa', flag: '🇿🇦' },
  KENYA: { name: 'Kenya', flag: '🇰🇪' },
  GHANA: { name: 'Ghana', flag: '🇬🇭' },

  ASIA: { name: 'Asia', flag: '🌏' },
  JAPAN: { name: 'Japan', flag: '🇯🇵' },
  JP: { name: 'Japan', flag: '🇯🇵' },
  KOREA: { name: 'Korea', flag: '🇰🇷' },
  KR: { name: 'Korea', flag: '🇰🇷' },
  INDIA: { name: 'India', flag: '🇮🇳' },
  IN: { name: 'India', flag: '🇮🇳' },
  CHINA: { name: 'China', flag: '🇨🇳' },
  CN: { name: 'China', flag: '🇨🇳' },

  AUSTRALIA: { name: 'Australia', flag: '🇦🇺' },
  AU: { name: 'Australia', flag: '🇦🇺' },

  EUROPE: { name: 'Europe', flag: '🇪🇺' },
  MOVIES: { name: 'Cinema & Movies', flag: '🎬' },
  KIDS: { name: 'Kids & Family', flag: '🧸' },
  DOCUMENTARY: { name: 'Documentaries', flag: '🦁' },
  MUSIC: { name: 'Music & Concerts', flag: '🎵' },
  SPORTS: { name: 'Global Sports', flag: '⚽' },
  NEWS: { name: 'Global News', flag: '📰' },
  '4K': { name: '4K Ultra HD', flag: '✨' },
};

function normalizeKey(str: string): string {
  return str.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Parses any raw IPTV category string into Country and Type components.
 */
export function parseCategoryString(rawCategory: string | undefined): ParsedCategory {
  const raw = (rawCategory || 'General Broadcast').trim();

  // Pattern 1: Check for delimiter like "|" or ":" or " - "
  let countryPart = '';
  let typePart = '';

  if (raw.includes('|')) {
    const parts = raw.split('|');
    countryPart = parts[0].trim();
    typePart = parts.slice(1).join('|').trim();
  } else if (raw.includes(' - ')) {
    const parts = raw.split(' - ');
    countryPart = parts[0].trim();
    typePart = parts.slice(1).join(' - ').trim();
  } else if (raw.includes(':') && !raw.startsWith('http')) {
    const parts = raw.split(':');
    countryPart = parts[0].trim();
    typePart = parts.slice(1).join(':').trim();
  } else {
    // Check if bracketed e.g. "[UK] Sports" or "[US] Entertainment"
    const bracketMatch = raw.match(/^\[([A-Za-z0-9\s]+)\]\s*(.*)$/);
    if (bracketMatch) {
      countryPart = bracketMatch[1].trim();
      typePart = bracketMatch[2].trim() || 'General';
    } else {
      countryPart = raw;
      typePart = 'General';
    }
  }

  // Check if countryPart matches a known country
  const normalizedCountryKey = normalizeKey(countryPart);
  const foundMeta = KNOWN_COUNTRIES[normalizedCountryKey];

  if (foundMeta) {
    return {
      countryId: normalizedCountryKey.toLowerCase(),
      countryName: foundMeta.name,
      countryFlag: foundMeta.flag,
      contentTypeName: typePart || 'General',
      rawCategory: raw,
    };
  }

  // If no direct country match, check if raw matches known countries directly (e.g. "Sweden", "Belgium")
  const directKey = normalizeKey(raw);
  if (KNOWN_COUNTRIES[directKey]) {
    const meta = KNOWN_COUNTRIES[directKey];
    return {
      countryId: directKey.toLowerCase(),
      countryName: meta.name,
      countryFlag: meta.flag,
      contentTypeName: 'All Channels',
      rawCategory: raw,
    };
  }

  // Fallback for custom provider bouquets
  return {
    countryId: countryPart ? normalizeKey(countryPart).toLowerCase() || 'intl' : 'intl',
    countryName: countryPart || 'International',
    countryFlag: '🌐',
    contentTypeName: typePart || 'General',
    rawCategory: raw,
  };
}

/**
 * Builds the complete Country > Type hierarchy with accurate counts from a list of channels.
 */
export function buildCountryTypeHierarchy(
  channels: Array<{ category?: string }>
): {
  countries: CountryGroup[];
  flatBouquets: { name: string; count: number; countryName: string; flag: string; typeName: string }[];
} {
  const countryMap = new Map<string, CountryGroup>();
  const bouquetCounts = new Map<string, number>();

  channels.forEach((ch) => {
    const raw = (ch.category || 'General Broadcast').trim();
    bouquetCounts.set(raw, (bouquetCounts.get(raw) || 0) + 1);

    const parsed = parseCategoryString(raw);
    const countryKey = parsed.countryId;

    if (!countryMap.has(countryKey)) {
      countryMap.set(countryKey, {
        id: countryKey,
        name: parsed.countryName,
        flag: parsed.countryFlag,
        totalCount: 0,
        types: [],
      });
    }

    const countryGroup = countryMap.get(countryKey)!;
    countryGroup.totalCount += 1;

    let typeItem = countryGroup.types.find((t) => t.name.toLowerCase() === parsed.contentTypeName.toLowerCase());
    if (!typeItem) {
      typeItem = {
        name: parsed.contentTypeName,
        count: 0,
        rawBouquets: [],
      };
      countryGroup.types.push(typeItem);
    }
    typeItem.count += 1;
    if (!typeItem.rawBouquets.includes(raw)) {
      typeItem.rawBouquets.push(raw);
    }
  });

  // Sort countries: Sweden, Canada, Belgium, UK, US, etc. or by total count
  const countries = Array.from(countryMap.values()).sort((a, b) => {
    // Keep high-count and prominent countries near top
    return b.totalCount - a.totalCount;
  });

  // Sort content types in each country
  countries.forEach((c) => {
    c.types.sort((a, b) => b.count - a.count);
  });

  // Build flat bouquets list (matching the TV screenshot display)
  const flatBouquets = Array.from(bouquetCounts.entries()).map(([name, count]) => {
    const parsed = parseCategoryString(name);
    return {
      name,
      count,
      countryName: parsed.countryName,
      flag: parsed.countryFlag,
      typeName: parsed.contentTypeName,
    };
  });

  // Sort flat bouquets descending by count or preserve screenshot ordering
  flatBouquets.sort((a, b) => {
    // Keep Sweden items together, then Belgium, then Canada, then others
    const aIsSweden = a.name.toLowerCase().startsWith('sweden');
    const bIsSweden = b.name.toLowerCase().startsWith('sweden');
    if (aIsSweden && !bIsSweden) return -1;
    if (!aIsSweden && bIsSweden) return 1;
    return b.count - a.count;
  });

  return { countries, flatBouquets };
}

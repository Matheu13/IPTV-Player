/**
 * High-performance channel generator for large IPTV catalogs (14,917+ channels)
 * Provides realistic categories, channel names, EPG now/next, resolutions, and stream endpoints.
 */

export interface GeneratedCatalog {
  sourceId: string;
  sourceName: string;
  totalChannels: number;
  totalCategories: number;
  categories: {
    id: string;
    name: string;
    parentId?: number;
    channelCount: number;
    sourceType: 'XTREAM' | 'M3U';
  }[];
  channels: {
    id: string;
    streamId: number;
    name: string;
    streamType: 'live' | 'movie' | 'series';
    categoryId: string;
    categoryName: string;
    streamIcon?: string;
    epgChannelId?: string;
    tvArchive: boolean;
    tvArchiveDurationDays: number;
    num: number;
    sourceType: 'XTREAM' | 'M3U';
    formatsAvailable: string[];
    resolvedStreamUrl?: string;
    activeFormat: string;
    streamUrl: string;
    tsStreamUrl: string;
  }[];
}

const CATEGORY_DISTRIBUTION = [
  { id: 'cat_sports', name: 'Sports & Live Events', baseCount: 3500, ratio: 0.235 },
  { id: 'cat_movies', name: 'Cinema & Premium Movies', baseCount: 2800, ratio: 0.188 },
  { id: 'cat_usa_ca', name: 'USA & Canada Live', baseCount: 1800, ratio: 0.121 },
  { id: 'cat_uk_ie', name: 'UK & Ireland Broadcast', baseCount: 1600, ratio: 0.107 },
  { id: 'cat_eu_intl', name: 'Europe & International', baseCount: 1800, ratio: 0.121 },
  { id: 'cat_news', name: 'News 24/7 Global', baseCount: 1200, ratio: 0.080 },
  { id: 'cat_docs', name: 'Documentaries & Science', baseCount: 1200, ratio: 0.080 },
  { id: 'cat_kids', name: 'Kids & Animation', baseCount: 1100, ratio: 0.074 },
  { id: 'cat_music', name: 'Music & Concerts', baseCount: 900, ratio: 0.060 },
  { id: 'cat_4k', name: '4K UHD Ultra Feeds', baseCount: 817, ratio: 0.055 },
];

const SPORTS_PREFIXES = [
  'Sky Sports Main Event', 'Sky Sports Premier League', 'Sky Sports F1 4K', 'Sky Sports Cricket',
  'TNT Sports 1 UHD', 'TNT Sports 2 HD', 'TNT Sports Ultimate 4K', 'beIN Sports 1 Premium',
  'beIN Sports 2 Global', 'ESPN USA HD', 'ESPN 2 Live', 'SuperSport Grandstand 4K',
  'SuperSport Premier League', 'DAZN 1 Bar HD', 'DAZN Combat Live', 'Eurosport 1 4K',
  'Eurosport 2 Gold', 'NBC Sports Golf', 'Fox Sports 1 USA', 'Canal+ Foot 4K',
  'Movistar LaLiga HD', 'RMC Sport 1 HD', 'Optus Sport 1', 'Stan Sport UHD', 'CBS Sports Network'
];

const MOVIE_PREFIXES = [
  'HBO East HD', 'HBO 2 Premiere', 'HBO Signature', 'HBO Max Hits', 'Cinemax Action',
  'Sky Cinema Premiere 4K', 'Sky Cinema Action HD', 'Sky Cinema Sci-Fi', 'Canal+ Cinema UHD',
  'Film4 HD UK', 'Paramount Network HD', 'Starz Live HD', 'Showtime East 4K', 'AMC Premiere HD',
  'TCM Classic Movies', 'Sony Movies Gold', 'MGM Channel HD', 'Studio Canal UHD', 'Cineworld Live'
];

const NEWS_PREFIXES = [
  'BBC News 24 HD', 'CNN International', 'Sky News UK 4K', 'Al Jazeera English HD',
  'Bloomberg TV Markets', 'CNBC Global Fast', 'France 24 HD', 'DW News Germany',
  'Euronews Direct', 'Fox News Live HD', 'MSNBC Live', 'ABC News Live 24/7',
  'CBS News Global', 'NHK World Japan 4K', 'CCTV 4 News HD', 'i24 News English'
];

const GENERAL_PREFIXES = [
  'BBC One HD', 'BBC Two HD', 'ITV 1 London HD', 'Channel 4 UK HD', 'Channel 5 HD',
  'ABC East USA', 'NBC New York HD', 'CBS Live HD', 'FOX Prime HD', 'The CW Network',
  'TF1 France 4K', 'RTL Germany HD', 'RAI 1 HD Italy', 'Antena 3 Spain', 'ProSieben HD',
  'Discovery Channel 4K', 'National Geographic HD', 'Nat Geo Wild 4K', 'History Channel HD',
  'Disney Channel HD', 'Cartoon Network UK', 'Nickelodeon HD', 'MTV Live HD', 'Clubland TV HD'
];

const SAMPLE_LOGOS = [
  'https://raw.githubusercontent.com/iptv-org/epg/master/sites/logos/sports.png',
  'https://raw.githubusercontent.com/iptv-org/epg/master/sites/logos/news.png',
  'https://raw.githubusercontent.com/iptv-org/epg/master/sites/logos/movies.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/BBC_News_2022.svg/320px-BBC_News_2022.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/CNN_logo.svg/320px-CNN_logo.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sky_Sports_logo_2020.svg/320px-Sky_Sports_logo_2020.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/320px-HBO_logo.svg.png',
];

export function generateProviderCatalog(
  targetTotal = 14917,
  sourceId = 'src_xtream_prime',
  sourceName = 'Ultra Xtream Platinum'
): GeneratedCatalog {
  const channels: GeneratedCatalog['channels'] = [];
  const categories: GeneratedCatalog['categories'] = [];

  let assignedCount = 0;
  const catPlan = CATEGORY_DISTRIBUTION.map((cat, idx) => {
    let count: number;
    if (idx === CATEGORY_DISTRIBUTION.length - 1) {
      count = Math.max(1, targetTotal - assignedCount);
    } else {
      count = Math.round(targetTotal * cat.ratio);
      assignedCount += count;
    }
    return { ...cat, count };
  });

  let currentStreamId = 1;

  for (const cat of catPlan) {
    categories.push({
      id: cat.id,
      name: cat.name,
      channelCount: cat.count,
      sourceType: 'XTREAM',
    });

    let prefixPool = GENERAL_PREFIXES;
    if (cat.id.includes('sports')) prefixPool = SPORTS_PREFIXES;
    else if (cat.id.includes('movies') || cat.id.includes('4k')) prefixPool = MOVIE_PREFIXES;
    else if (cat.id.includes('news')) prefixPool = NEWS_PREFIXES;

    for (let i = 1; i <= cat.count; i++) {
      const streamId = currentStreamId++;
      const baseName = prefixPool[(i - 1) % prefixPool.length];
      const feedNumber = Math.floor((i - 1) / prefixPool.length) + 1;
      const channelName = feedNumber === 1 ? `${baseName} HD` : `${baseName} Feed ${feedNumber}`;
      const logoUrl = SAMPLE_LOGOS[(streamId - 1) % SAMPLE_LOGOS.length];

      channels.push({
        id: `stream_${streamId}`,
        streamId,
        name: channelName,
        streamType: 'live',
        categoryId: cat.id,
        categoryName: cat.name,
        streamIcon: logoUrl,
        epgChannelId: `tvg.${cat.id}.${streamId.toString().padStart(5, '0')}`,
        tvArchive: streamId % 3 === 0,
        tvArchiveDurationDays: 7,
        num: streamId,
        sourceType: 'XTREAM',
        formatsAvailable: ['m3u8', 'ts'],
        resolvedStreamUrl: '',
        activeFormat: 'm3u8',
        streamUrl: `/api/stream/live/${streamId}.m3u8`,
        tsStreamUrl: `/api/stream/live/${streamId}.ts`,
      });
    }
  }

  return {
    sourceId,
    sourceName,
    totalChannels: channels.length,
    totalCategories: categories.length,
    categories,
    channels,
  };
}

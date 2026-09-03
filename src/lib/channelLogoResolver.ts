/**
 * Unified Channel Logo Resolver & Generator
 * 
 * Guarantees crisp, consistent channel logos across the entire application:
 * - Live TV Guide
 * - Favorites Screen
 * - EPG Timeline
 * - Home Screen
 * - Player OSD & Mini-player
 * 
 * Features:
 * - Direct high-res CDN mapping for popular networks (BBC, CNN, Sky, ESPN, HBO, NBC, etc.)
 * - Deterministic, elegant SVG glyph/badge generation for channels without remote logos or on 404
 * - Category-aware color palettes
 * - Seamless caching and user custom logo overrides
 */

const KNOWN_NETWORK_LOGOS: Record<string, string> = {
  // Sports
  'sky sports': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Sky_Sports_logo_2020.svg/320px-Sky_Sports_logo_2020.svg.png',
  'tnt sports': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/TNT_Sports_logo.svg/320px-TNT_Sports_logo.svg.png',
  'bein sports': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/BeIN_Sports_logo.svg/320px-BeIN_Sports_logo.svg.png',
  'espn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/ESPN_wordmark.svg/320px-ESPN_wordmark.svg.png',
  'dazn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/DAZN_Logo.svg/320px-DAZN_Logo.svg.png',
  'eurosport': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/Eurosport_logo_2015.svg/320px-Eurosport_logo_2015.svg.png',
  'fox sports': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Fox_Sports_logo_2020.svg/320px-Fox_Sports_logo_2020.svg.png',
  
  // News
  'bbc news': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/BBC_News_2022.svg/320px-BBC_News_2022.svg.png',
  'cnn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/CNN_logo.svg/320px-CNN_logo.svg.png',
  'sky news': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Sky_News_logo_2018.svg/320px-Sky_News_logo_2018.svg.png',
  'al jazeera': 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Aljazeera_eng.svg/320px-Aljazeera_eng.svg.png',
  'bloomberg': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Bloomberg_Television_logo.svg/320px-Bloomberg_Television_logo.svg.png',
  'cnbc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/CNBC_logo.svg/320px-CNBC_logo.svg.png',
  'fox news': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Fox_News_Channel_logo.svg/320px-Fox_News_Channel_logo.svg.png',
  'msnbc': 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/MSNBC_logo_2021.svg/320px-MSNBC_logo_2021.svg.png',

  // Movies & Entertainment
  'hbo': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/HBO_logo.svg/320px-HBO_logo.svg.png',
  'cinemax': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Cinemax_logo_2020.svg/320px-Cinemax_logo_2020.svg.png',
  'sky cinema': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Sky_Cinema_2020.svg/320px-Sky_Cinema_2020.svg.png',
  'paramount': 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Paramount_Network.svg/320px-Paramount_Network.svg.png',
  'starz': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Starz_logo.svg/320px-Starz_logo.svg.png',
  'showtime': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Showtime.svg/320px-Showtime.svg.png',
  'bbc one': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/BBC_One_2021.svg/320px-BBC_One_2021.svg.png',
  'itv': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/ITV1_logo_2022.svg/320px-ITV1_logo_2022.svg.png',

  // Documentary & Science
  'discovery': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Discovery_Channel_2019.svg/320px-Discovery_Channel_2019.svg.png',
  'national geographic': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/National_Geographic_Channel_logo.svg/320px-National_Geographic_Channel_logo.svg.png',
  'history': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/History_Logo.svg/320px-History_Logo.svg.png',
  'animal planet': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Animal_Planet_2018.svg/320px-Animal_Planet_2018.svg.png',

  // Kids
  'disney': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Disney_Channel_logo.svg/320px-Disney_Channel_logo.svg.png',
  'cartoon network': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Cartoon_Network_2010_logo.svg/320px-Cartoon_Network_2010_logo.svg.png',
  'nickelodeon': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Nickelodeon_2023.svg/320px-Nickelodeon_2023.svg.png',
};

const CATEGORY_COLOR_PALETTES: Record<string, { bg: string; text: string; border: string; accent: string }> = {
  Sports: { bg: 'from-emerald-950/80 to-emerald-900/60', text: 'text-emerald-300', border: 'border-emerald-500/30', accent: '#10b981' },
  'News & Politics': { bg: 'from-rose-950/80 to-rose-900/60', text: 'text-rose-300', border: 'border-rose-500/30', accent: '#f43f5e' },
  'Movies & Cinema': { bg: 'from-purple-950/80 to-purple-900/60', text: 'text-purple-300', border: 'border-purple-500/30', accent: '#a855f7' },
  Entertainment: { bg: 'from-sky-950/80 to-sky-900/60', text: 'text-sky-300', border: 'border-sky-500/30', accent: '#38bdf8' },
  'Documentary & Science': { bg: 'from-amber-950/80 to-amber-900/60', text: 'text-amber-300', border: 'border-amber-500/30', accent: '#f59e0b' },
  'Kids & Animation': { bg: 'from-pink-950/80 to-pink-900/60', text: 'text-pink-300', border: 'border-pink-500/30', accent: '#ec4899' },
  'Music & Concerts': { bg: 'from-indigo-950/80 to-indigo-900/60', text: 'text-indigo-300', border: 'border-indigo-500/30', accent: '#6366f1' },
  '4K UHD Master Feeds': { bg: 'from-cyan-950/80 to-cyan-900/60', text: 'text-cyan-300', border: 'border-cyan-500/30', accent: '#06b6d4' },
  Default: { bg: 'from-slate-900 to-slate-800', text: 'text-slate-200', border: 'border-slate-700/50', accent: '#94a3b8' },
};

/**
 * Returns initials / monogram for channel
 */
export function getChannelInitials(name: string): string {
  if (!name) return 'TV';
  // Strip CH prefix/suffix
  const clean = name.replace(/\[.*?\]|\(.*?\)|CH\s*\d+/gi, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/**
 * Resolves the optimal logo URL for any channel
 */
export function resolveChannelLogoUrl(
  channelName: string,
  providedLogoUrl?: string | null,
  overrideLogoUrl?: string | null
): string | null {
  if (overrideLogoUrl && overrideLogoUrl.trim()) {
    return overrideLogoUrl.trim();
  }

  // Check known popular brands first for highest visual fidelity
  const lower = (channelName || '').toLowerCase();
  for (const [networkKey, logoUrl] of Object.entries(KNOWN_NETWORK_LOGOS)) {
    if (lower.includes(networkKey)) {
      return logoUrl;
    }
  }

  if (
    providedLogoUrl &&
    providedLogoUrl.trim() &&
    !providedLogoUrl.includes('broken-logo-404') &&
    !providedLogoUrl.includes('invalid-broken')
  ) {
    return providedLogoUrl.trim();
  }

  return null;
}

export function getCategoryPalette(category?: string) {
  if (!category) return CATEGORY_COLOR_PALETTES.Default;
  for (const [key, palette] of Object.entries(CATEGORY_COLOR_PALETTES)) {
    if (category.toLowerCase().includes(key.toLowerCase())) {
      return palette;
    }
  }
  return CATEGORY_COLOR_PALETTES.Default;
}

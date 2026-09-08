/**
 * Milestone 1 & 9 M3U Playlist Parser & Asymmetry Normalizer
 * Robustly extracts #EXTINF attributes, group titles, VLC options, and formats into the unified data layer.
 * Resilient against commas inside quotes, unquoted attributes, UTF-8 BOM, pipe headers, and #EXTGRP tags.
 * Enhancements:
 * - Fetches, sanitizes, and extracts legitimate stream URLs from user-provided M3U sources.
 * - Resolves relative stream URLs against base URL.
 * - Aggregates duplicate/mirror streams into alternativeStreamUrls.
 * - Filters out invalid dummy/placeholder URLs.
 */

import { SourceCapabilities, UnifiedCategory, UnifiedChannel } from './models';

export interface ParsedM3UResult {
  categories: UnifiedCategory[];
  channels: UnifiedChannel[];
  capabilities: SourceCapabilities;
  totalParsed: number;
  unassignedCount: number;
  epgUrl?: string;
  playlistName?: string;
  warnings?: string[];
}

/**
 * Sanitizes and validates a stream URL.
 * Resolves relative URLs if baseUrl is provided.
 * Strips pipe headers, trailing whitespaces, and invalid schemes.
 */
export function sanitizeStreamUrl(rawUrl: string, baseUrl?: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;

  let clean = rawUrl.trim();

  // Strip pipe parameters e.g. "http://example.com/live.m3u8|User-Agent=..."
  if (clean.includes('|')) {
    clean = clean.split('|')[0].trim();
  }

  // Remove surrounding quotes or control chars
  clean = clean.replace(/^["']|["']$/g, '').trim();

  // Disallow javascript:, data:, or mailto:
  if (/^(javascript|data|blob|mailto|file):/i.test(clean)) {
    return null;
  }

  // Filter out known dummy/placeholder domains or empty targets
  if (
    clean === '' ||
    clean.includes('example.com') ||
    clean.includes('placeholder.stream') ||
    clean.includes('dummy-url')
  ) {
    return null;
  }

  // Resolve relative URLs against baseUrl if provided
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(clean)) {
    if (baseUrl && /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//i.test(baseUrl)) {
      try {
        const resolved = new URL(clean, baseUrl);
        return resolved.toString();
      } catch {
        return null;
      }
    } else if (!clean.startsWith('http')) {
      // Cannot resolve relative URL without valid base URL
      return null;
    }
  }

  try {
    const parsed = new URL(clean);
    if (!['http:', 'https:', 'rtmp:', 'rtmps:', 'rtsp:', 'udp:', 'srt:'].includes(parsed.protocol.toLowerCase())) {
      return null;
    }
    return parsed.toString();
  } catch {
    // If not standard URL but starts with http
    if (clean.startsWith('http://') || clean.startsWith('https://')) {
      return clean;
    }
    return null;
  }
}

/**
 * Extracts legitimate playable channels, filtering out dead placeholders or malformed links.
 */
export function extractLegitimateStreams(channels: UnifiedChannel[]): UnifiedChannel[] {
  return channels.filter((ch) => {
    const url = ch.resolvedStreamUrl || ch.directSourceUrl;
    if (!url) return false;
    const sanitized = sanitizeStreamUrl(url);
    return sanitized !== null;
  });
}

/**
 * Detects whether a stream is likely a VOD Movie or TV Series rather than a Live TV broadcast.
 */
export function isLikelyVodStream(
  url: string,
  groupTitle?: string,
  duration?: number,
  title?: string
): boolean {
  const lowerUrl = (url || '').toLowerCase();
  const lowerGroup = (groupTitle || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();

  // 1. Standard IPTV / Xtream route paths for VOD movies and series
  if (
    lowerUrl.includes('/movie/') ||
    lowerUrl.includes('/movies/') ||
    lowerUrl.includes('/series/') ||
    lowerUrl.includes('/vod/')
  ) {
    return true;
  }

  // 2. Clear VOD / Movie / Series category markers
  const vodCategoryRegex = /\b(vod|movies?|films?|series|tv\s*shows?|box\s*sets?|season\s*\d+|cinema)\b/i;
  if (
    lowerGroup.startsWith('vod') ||
    lowerGroup.startsWith('[vod]') ||
    lowerGroup.includes('| vod') ||
    lowerGroup.includes('vod |') ||
    lowerGroup.includes('vod:') ||
    vodCategoryRegex.test(lowerGroup)
  ) {
    return true;
  }

  // 3. Static video containers with positive durations or release years in group/title
  const isStaticVideoFile =
    lowerUrl.endsWith('.mp4') || lowerUrl.endsWith('.mkv') || lowerUrl.endsWith('.avi');
  if (isStaticVideoFile && ((duration && duration > 0) || /\(\d{4}\)/.test(lowerTitle))) {
    return true;
  }

  // 4. Typical TV series episode naming, e.g. "S01 E02" or "S01E02"
  if (/\bs\d{1,2}\s*e\d{1,3}\b/i.test(lowerTitle)) {
    return true;
  }

  return false;
}

/**
 * Splits an #EXTINF line into the raw attributes section and channel title
 * while properly ignoring commas contained inside double or single quotes.
 */
function splitExtInfLine(line: string): { attributesStr: string; title: string } {
  const clean = line.replace(/^#EXTINF:\s*/i, '');
  let inDoubleQuote = false;
  let inSingleQuote = false;
  let splitIndex = -1;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const prevChar = i > 0 ? clean[i - 1] : '';

    if (char === '"' && prevChar !== '\\' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
    } else if (char === "'" && prevChar !== '\\' && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
    } else if (char === ',' && !inDoubleQuote && !inSingleQuote) {
      splitIndex = i;
      break;
    }
  }

  if (splitIndex !== -1) {
    return {
      attributesStr: clean.substring(0, splitIndex).trim(),
      title: clean.substring(splitIndex + 1).trim(),
    };
  }

  return {
    attributesStr: clean.trim(),
    title: '',
  };
}

/**
 * Extracts key-value attributes from the attribute string.
 * Handles both key="quoted value" and key=unquoted_value.
 */
function parseAttributes(attributesStr: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  if (!attributesStr) return attrs;

  // Regex matching: key="val", key='val', or key=val
  const attrRegex = /([a-zA-Z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s,]+))/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(attributesStr)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[key] = value.trim();
  }

  return attrs;
}

export function parseM3UPlaylist(
  content: string,
  baseUrl?: string,
  options?: { liveOnly?: boolean }
): ParsedM3UResult {
  if (!content) {
    return {
      categories: [],
      channels: [],
      capabilities: {
        sourceType: 'M3U',
        supportsServerConnectionAccounting: false,
        supportsCatchupArchive: false,
        supportsPerEndpointCaching: false,
        supportsPagedStreams: false,
        epgMechanism: 'XMLTV_EXTERNAL',
        degradationWarnings: ['Empty playlist content provided'],
      },
      totalParsed: 0,
      unassignedCount: 0,
    };
  }

  // Strip UTF-8 BOM if present
  let cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

  const lines = cleanContent.split(/\r?\n/);
  const categoriesMap = new Map<string, UnifiedCategory>();
  const channels: UnifiedChannel[] = [];
  const channelNameMap = new Map<string, UnifiedChannel>();
  const warnings: string[] = [];

  let epgUrl: string | undefined;
  let channelIndex = 1;

  let currentExtInf: {
    duration: number;
    tvgId?: string;
    tvgName?: string;
    tvgLogo?: string;
    groupTitle?: string;
    catchup?: boolean;
    catchupDays?: number;
    catchupSource?: string;
    tvgChNo?: number;
    title: string;
    headers?: Record<string, string>;
  } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Check for #EXTM3U header with url-tvg / x-tvg-url
    if (rawLine.startsWith('#EXTM3U')) {
      const headerAttrs = parseAttributes(rawLine);
      epgUrl = headerAttrs['url-tvg'] || headerAttrs['x-tvg-url'] || headerAttrs['tvg-url'];
      continue;
    }

    if (rawLine.startsWith('#EXTINF:')) {
      const { attributesStr, title } = splitExtInfLine(rawLine);
      const attrs = parseAttributes(attributesStr);

      // Duration: usually the first number in attributesStr (e.g. "-1", "0", "120")
      const durationMatch = attributesStr.match(/^(-?\d+(?:\.\d+)?)/);
      const duration = durationMatch ? parseFloat(durationMatch[1]) : -1;

      const groupTitle =
        attrs['group-title'] ||
        attrs['group_title'] ||
        attrs['group'] ||
        undefined;

      const tvgId = attrs['tvg-id'] || attrs['tvg_id'] || attrs['id'] || undefined;
      const tvgName = attrs['tvg-name'] || attrs['tvg_name'] || attrs['name'] || title || undefined;
      const tvgLogo = attrs['tvg-logo'] || attrs['tvg_logo'] || attrs['logo'] || attrs['tvg-logo-small'] || undefined;

      const catchup =
        attrs['catchup'] !== undefined ||
        attrs['tvg-rec'] === '1' ||
        attrs['timeshift'] !== undefined;

      const catchupDays =
        parseInt(attrs['catchup-days'] || attrs['timeshift'] || '0', 10) || (catchup ? 3 : 0);

      const catchupSource = attrs['catchup-source'] || undefined;

      const tvgChNo = attrs['tvg-chno'] || attrs['tvg-num'] || attrs['channel-id']
        ? parseInt(attrs['tvg-chno'] || attrs['tvg-num'] || attrs['channel-id'], 10)
        : undefined;

      const channelTitle = title || tvgName || `Channel ${channelIndex}`;

      currentExtInf = {
        duration,
        tvgId: tvgId || tvgName,
        tvgName,
        tvgLogo,
        groupTitle,
        catchup,
        catchupDays,
        catchupSource,
        tvgChNo,
        title: channelTitle,
        headers: {},
      };
    } else if (rawLine.startsWith('#EXTGRP:')) {
      // Group override tag on following line
      const grp = rawLine.replace(/^#EXTGRP:\s*/i, '').trim();
      if (grp && currentExtInf) {
        currentExtInf.groupTitle = grp;
      }
    } else if (rawLine.startsWith('#EXTVLCOPT:')) {
      // VLC option (e.g. #EXTVLCOPT:http-user-agent=Mozilla/5.0)
      const opt = rawLine.replace(/^#EXTVLCOPT:\s*/i, '').trim();
      const eqIdx = opt.indexOf('=');
      if (eqIdx !== -1 && currentExtInf) {
        const optKey = opt.substring(0, eqIdx).trim().toLowerCase();
        const optVal = opt.substring(eqIdx + 1).trim();
        if (!currentExtInf.headers) currentExtInf.headers = {};
        if (optKey === 'http-user-agent') currentExtInf.headers['User-Agent'] = optVal;
        else if (optKey === 'http-referrer') currentExtInf.headers['Referer'] = optVal;
      }
    } else if (rawLine.startsWith('#EXTHTTP:')) {
      // JSON header tag (e.g. #EXTHTTP:{"User-Agent":"..."})
      const jsonStr = rawLine.replace(/^#EXTHTTP:\s*/i, '').trim();
      try {
        const parsedHeaders = JSON.parse(jsonStr);
        if (currentExtInf && typeof parsedHeaders === 'object') {
          currentExtInf.headers = { ...(currentExtInf.headers || {}), ...parsedHeaders };
        }
      } catch {}
    } else if (rawLine.startsWith('#')) {
      // Other comments or Kodi properties (#KODIPROP, #EXT-X-STREAM-INF, etc) - preserve currentExtInf
      continue;
    } else {
      // This is a stream URL (or bare URL)
      let streamUrl = rawLine;

      // Check for VLC pipe syntax: URL|User-Agent=...&Referer=...
      if (streamUrl.includes('|')) {
        const pipeIdx = streamUrl.indexOf('|');
        const pipeParams = streamUrl.substring(pipeIdx + 1);
        streamUrl = streamUrl.substring(0, pipeIdx).trim();

        if (currentExtInf) {
          const params = new URLSearchParams(pipeParams);
          if (params.get('User-Agent')) {
            currentExtInf.headers = currentExtInf.headers || {};
            currentExtInf.headers['User-Agent'] = params.get('User-Agent')!;
          }
          if (params.get('Referer')) {
            currentExtInf.headers = currentExtInf.headers || {};
            currentExtInf.headers['Referer'] = params.get('Referer')!;
          }
        }
      }

      // Sanitize stream URL against baseUrl
      const sanitizedUrl = sanitizeStreamUrl(streamUrl, baseUrl);
      if (!sanitizedUrl) {
        currentExtInf = null;
        continue;
      }

      // If liveOnly is requested, filter out VOD movies and TV series
      if (
        options?.liveOnly &&
        isLikelyVodStream(
          sanitizedUrl,
          currentExtInf?.groupTitle,
          currentExtInf?.duration,
          currentExtInf?.title
        )
      ) {
        currentExtInf = null;
        continue;
      }

      // If no #EXTINF preceded this URL, create a synthetic channel item
      const extInf = currentExtInf || {
        duration: -1,
        title: `Stream ${channelIndex}`,
        groupTitle: 'Direct Streams',
        headers: {},
      };

      const groupName = extInf.groupTitle || 'Uncategorized';
      const categoryId = groupName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'uncategorized';

      if (!categoriesMap.has(categoryId)) {
        categoriesMap.set(categoryId, {
          id: categoryId,
          name: groupName,
          sourceType: 'M3U',
          channelCount: 0,
        });
      }

      // Detect format from stream URL
      let detectedFormat = 'ts';
      const lowerUrl = sanitizedUrl.toLowerCase();
      if (lowerUrl.includes('.m3u8') || lowerUrl.includes('/hls') || lowerUrl.includes('m3u8_plus')) {
        detectedFormat = 'm3u8';
      } else if (lowerUrl.includes('.mpd')) {
        detectedFormat = 'mpd';
      } else if (lowerUrl.includes('.ts')) {
        detectedFormat = 'ts';
      } else if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mkv')) {
        detectedFormat = 'mp4';
      }

      // Check if channel already exists (deduplication & alternative stream aggregation)
      const normKey = extInf.tvgId
        ? `tvg_${extInf.tvgId.toLowerCase()}`
        : `name_${extInf.title.trim().toLowerCase()}`;

      const existingChannel = channelNameMap.get(normKey);

      if (existingChannel) {
        // Attach as alternative mirror URL
        if (!existingChannel.alternativeStreamUrls) {
          existingChannel.alternativeStreamUrls = [];
        }
        if (
          !existingChannel.alternativeStreamUrls.includes(sanitizedUrl) &&
          existingChannel.resolvedStreamUrl !== sanitizedUrl
        ) {
          existingChannel.alternativeStreamUrls.push(sanitizedUrl);
        }
        if (!existingChannel.formatsAvailable.includes(detectedFormat)) {
          existingChannel.formatsAvailable.push(detectedFormat);
        }
      } else {
        const cat = categoriesMap.get(categoryId)!;
        cat.channelCount = (cat.channelCount || 0) + 1;

        const newChannel: UnifiedChannel = {
          id: `m3u_${channelIndex}`,
          streamId: channelIndex,
          name: extInf.title,
          streamType: 'live',
          categoryId,
          categoryName: groupName,
          streamIcon: extInf.tvgLogo,
          epgChannelId: extInf.tvgId,
          tvArchive: Boolean(extInf.catchup),
          tvArchiveDurationDays: extInf.catchupDays || (extInf.catchup ? 3 : 0),
          num: extInf.tvgChNo ?? channelIndex,
          sourceType: 'M3U',
          directSourceUrl: sanitizedUrl,
          formatsAvailable: [detectedFormat],
          resolvedStreamUrl: sanitizedUrl,
          activeFormat: detectedFormat,
          alternativeStreamUrls: [],
          validationStatus: 'unchecked',
        };

        channels.push(newChannel);
        channelNameMap.set(normKey, newChannel);
        channelIndex++;
      }

      currentExtInf = null;
    }
  }

  const capabilities: SourceCapabilities = {
    sourceType: 'M3U',
    supportsServerConnectionAccounting: false,
    supportsCatchupArchive: channels.some((c) => c.tvArchive),
    supportsPerEndpointCaching: false,
    supportsPagedStreams: false,
    epgMechanism: epgUrl ? 'XMLTV_EXTERNAL' : 'NONE',
    degradationWarnings: [
      'Server Connection Accounting: None (Flying blind). Enforcing client-side token mutex.',
      'Refresh Strategy: Monolithic file download only. Background refresh >= 6h.',
      'Paged Queries: Unsupported. Full list loaded into local SQLite cache.',
      ...(warnings.length > 0 ? warnings : []),
    ],
  };

  return {
    categories: Array.from(categoriesMap.values()),
    channels,
    capabilities,
    totalParsed: channels.length,
    unassignedCount: channels.filter((c) => c.categoryId === 'uncategorized').length,
    epgUrl,
  };
}

/**
 * Fetches, sanitizes, and extracts legitimate stream URLs from user-provided M3U sources.
 * Supports both remote URL fetch and direct string text content.
 */
export async function fetchAndParseM3U(
  urlOrContent: string,
  options?: {
    baseUrl?: string;
    sourceName?: string;
    customHeaders?: Record<string, string>;
    timeoutMs?: number;
    liveOnly?: boolean;
  }
): Promise<ParsedM3UResult> {
  const isHttp = /^https?:\/\//i.test(urlOrContent.trim());

  if (!isHttp) {
    // Treat as raw text
    return parseM3UPlaylist(urlOrContent, options?.baseUrl, { liveOnly: options?.liveOnly });
  }

  const sourceUrl = urlOrContent.trim();
  const timeoutMs = options?.timeoutMs || 15000;

  // If in browser, use the backend proxy endpoint to avoid CORS issues
  const endpoint = typeof window !== 'undefined'
    ? '/api/m3u/fetch-remote'
    : sourceUrl;

  try {
    let content: string;
    if (typeof window !== 'undefined') {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: sourceUrl,
          userAgent: options?.customHeaders?.['User-Agent'],
          timeoutMs,
        }),
      });

      if (!resp.ok) {
        throw new Error(`Failed to fetch playlist (HTTP ${resp.status})`);
      }

      const data = await resp.json();
      content = data.playlistText || '';
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const resp = await fetch(sourceUrl, {
        headers: {
          'User-Agent': options?.customHeaders?.['User-Agent'] || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          Accept: '*/*',
          ...(options?.customHeaders || {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) {
        throw new Error(`Upstream returned HTTP ${resp.status}`);
      }
      content = await resp.text();
    }

    return parseM3UPlaylist(content, sourceUrl, { liveOnly: options?.liveOnly });
  } catch (err: any) {
    console.error('[fetchAndParseM3U] Error loading playlist:', err);
    throw err;
  }
}



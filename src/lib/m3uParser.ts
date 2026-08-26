/**
 * Milestone 1 & 9 M3U Playlist Parser & Asymmetry Normalizer
 * Robustly extracts #EXTINF attributes, group titles, VLC options, and formats into the unified data layer.
 * Resilient against commas inside quotes, unquoted attributes, UTF-8 BOM, pipe headers, and #EXTGRP tags.
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

export function parseM3UPlaylist(content: string): ParsedM3UResult {
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

      const cat = categoriesMap.get(categoryId)!;
      cat.channelCount = (cat.channelCount || 0) + 1;

      // Detect format from stream URL
      let detectedFormat = 'ts';
      const lowerUrl = streamUrl.toLowerCase();
      if (lowerUrl.includes('.m3u8') || lowerUrl.includes('/hls') || lowerUrl.includes('m3u8_plus')) {
        detectedFormat = 'm3u8';
      } else if (lowerUrl.includes('.mpd')) {
        detectedFormat = 'mpd';
      } else if (lowerUrl.includes('.ts')) {
        detectedFormat = 'ts';
      } else if (lowerUrl.includes('.mp4') || lowerUrl.includes('.mkv')) {
        detectedFormat = 'mp4';
      }

      channels.push({
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
        directSourceUrl: streamUrl,
        formatsAvailable: [detectedFormat],
        resolvedStreamUrl: streamUrl,
        activeFormat: detectedFormat,
      });

      channelIndex++;
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


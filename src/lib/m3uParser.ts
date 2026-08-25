/**
 * Milestone 1 M3U Playlist Parser & Normalizer
 * Extracts #EXTINF attributes, group titles, and formats into the unified data layer.
 * Marks M3U asymmetry constraints and visible degradation tags.
 */

import { SourceCapabilities, UnifiedCategory, UnifiedChannel } from './models';

export interface ParsedM3UResult {
  categories: UnifiedCategory[];
  channels: UnifiedChannel[];
  capabilities: SourceCapabilities;
  totalParsed: number;
  unassignedCount: number;
}

export function parseM3UPlaylist(content: string): ParsedM3UResult {
  const lines = content.split(/\r?\n/);
  const categoriesMap = new Map<string, UnifiedCategory>();
  const channels: UnifiedChannel[] = [];

  let currentExtInf: {
    duration: number;
    tvgId?: string;
    tvgName?: string;
    tvgLogo?: string;
    groupTitle?: string;
    catchup?: boolean;
    catchupDays?: number;
    title: string;
  } | null = null;

  let channelIndex = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // Parse #EXTINF:-1 tvg-id="ESPN.us" tvg-name="ESPN HD" tvg-logo="https://..." group-title="US | SPORTS", ESPN HD
      const commaIdx = line.indexOf(',');
      const rawAttributes = commaIdx !== -1 ? line.substring(8, commaIdx) : line.substring(8);
      const title = commaIdx !== -1 ? line.substring(commaIdx + 1).trim() : `Channel ${channelIndex}`;

      const getAttr = (key: string): string | undefined => {
        const match = rawAttributes.match(new RegExp(`${key}="([^"]*)"`, 'i')) ||
          rawAttributes.match(new RegExp(`${key}=([^\\s,]+)`, 'i'));
        return match ? match[1] : undefined;
      };

      const groupTitle = getAttr('group-title') || 'Uncategorized';
      const tvgId = getAttr('tvg-id') || getAttr('tvg-name') || undefined;
      const tvgName = getAttr('tvg-name') || title;
      const tvgLogo = getAttr('tvg-logo');
      const catchup = getAttr('catchup') !== undefined || getAttr('tvg-rec') === '1';
      const catchupDays = parseInt(getAttr('catchup-days') || '0', 10) || (catchup ? 3 : 0);

      currentExtInf = {
        duration: -1,
        tvgId,
        tvgName,
        tvgLogo,
        groupTitle,
        catchup,
        catchupDays,
        title: title || tvgName || `Channel ${channelIndex}`,
      };
    } else if (!line.startsWith('#') && currentExtInf) {
      // It's a stream URL
      const streamUrl = line;
      const groupName = currentExtInf.groupTitle || 'Uncategorized';
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

      // Extract format from extension if present
      let detectedFormat = 'ts';
      if (streamUrl.includes('.m3u8')) detectedFormat = 'm3u8';
      else if (streamUrl.includes('.mpd')) detectedFormat = 'mpd';
      else if (streamUrl.includes('.ts')) detectedFormat = 'ts';

      channels.push({
        id: `m3u_${channelIndex}`,
        streamId: channelIndex,
        name: currentExtInf.title,
        streamType: 'live',
        categoryId,
        categoryName: groupName,
        streamIcon: currentExtInf.tvgLogo,
        epgChannelId: currentExtInf.tvgId,
        tvArchive: currentExtInf.catchup,
        tvArchiveDurationDays: currentExtInf.catchupDays,
        num: channelIndex,
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
    epgMechanism: 'XMLTV_EXTERNAL',
    degradationWarnings: [
      'Server Connection Accounting: None (Flying blind). Enforcing client-side token mutex.',
      'Refresh Strategy: Monolithic file download only. Background refresh >= 6h.',
      'Paged Queries: Unsupported. Full list loaded into local SQLite cache.',
    ],
  };

  return {
    categories: Array.from(categoriesMap.values()),
    channels,
    capabilities,
    totalParsed: channels.length,
    unassignedCount: channels.filter((c) => c.categoryId === 'uncategorized').length,
  };
}

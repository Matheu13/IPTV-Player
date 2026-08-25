/**
 * Milestone 3a: EPG & Schedule Engine + XMLTV Parser + Catchup / Timeshift URL Generator
 */

import { UnifiedEpgProgram, XmltvChannel, XmltvParseResult, CatchupTimeshiftSpec } from './models';

/**
 * Safely decodes base64 strings commonly returned by Xtream Codes panels
 * without throwing on plain UTF-8 text.
 */
export function safeBase64Decode(val: string | undefined | null): string {
  if (!val) return '';
  const trimmed = val.trim();
  // Quick heuristic: if it looks like base64 and has no spaces
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  if (base64Regex.test(trimmed) && trimmed.length % 4 === 0 && trimmed.length >= 4) {
    try {
      if (typeof window !== 'undefined' && typeof window.atob === 'function') {
        const decoded = window.atob(trimmed);
        // Ensure decoded string looks like readable ascii/utf8 (no non-printable control chars except newlines)
        if (!/[\x00-\x08\x0E-\x1F]/.test(decoded)) {
          return decodeURIComponent(escape(decoded));
        }
      } else if (typeof Buffer !== 'undefined') {
        const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
        if (!/[\x00-\x08\x0E-\x1F]/.test(decoded)) {
          return decoded;
        }
      }
    } catch {
      // Fall through to original value
    }
  }
  return trimmed;
}

/**
 * Parses XMLTV timestamp string: e.g. "20260825160000 +0000" or "20260825160000 -0400"
 */
export function parseXmltvDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const cleaned = dateStr.trim();
  // Regex for YYYYMMDDHHmmss [+/-HHMM]
  const match = cleaned.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/);
  if (!match) {
    const fallback = new Date(cleaned);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  }

  const [_, y, m, d, h, min, s, tz] = match;
  const year = parseInt(y, 10);
  const month = parseInt(m, 10) - 1;
  const day = parseInt(d, 10);
  const hour = parseInt(h, 10);
  const minute = parseInt(min, 10);
  const second = parseInt(s, 10);

  let utcMillis = Date.UTC(year, month, day, hour, minute, second);

  if (tz) {
    const tzSign = tz[0] === '-' ? -1 : 1;
    const tzHours = parseInt(tz.substring(1, 3), 10);
    const tzMins = parseInt(tz.substring(3, 5), 10);
    const tzOffsetMillis = tzSign * (tzHours * 60 + tzMins) * 60 * 1000;
    // Subtract timezone offset from local timestamp to get true UTC
    utcMillis -= tzOffsetMillis;
  }

  return new Date(utcMillis);
}

/**
 * Pure Regex-based XMLTV Parser (environment independent: works seamlessly in Node & Browser)
 */
export function parseXmltv(xmlContent: string, nowRef: Date = new Date()): XmltvParseResult {
  const channels: XmltvChannel[] = [];
  const programmesByChannel: Record<string, UnifiedEpgProgram[]> = {};

  if (!xmlContent || typeof xmlContent !== 'string') {
    return { channelsCount: 0, programmesCount: 0, channels: [], programmesByChannel: {} };
  }

  // 1. Extract <channel id="..."> blocks
  const channelBlockRegex = /<channel\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/gi;
  let chMatch;
  while ((chMatch = channelBlockRegex.exec(xmlContent)) !== null) {
    const id = chMatch[1];
    const body = chMatch[2];

    const displayMatch = /<display-name[^>]*>([^<]+)<\/display-name>/i.exec(body);
    const iconMatch = /<icon\s+src="([^"]+)"/i.exec(body);

    const displayName = displayMatch ? displayMatch[1].trim() : id;
    const iconSrc = iconMatch ? iconMatch[1] : undefined;

    channels.push({
      id,
      displayName,
      iconSrc,
    });
    programmesByChannel[id] = [];
  }

  // 2. Extract <programme start="..." stop="..." channel="..."> blocks
  const programmeBlockRegex = /<programme\s+([^>]+)>([\s\S]*?)<\/programme>/gi;
  let prMatch;
  let progCount = 0;
  const nowMs = nowRef.getTime();

  while ((prMatch = programmeBlockRegex.exec(xmlContent)) !== null) {
    const attrs = prMatch[1];
    const body = prMatch[2];

    const startMatch = /start="([^"]+)"/i.exec(attrs);
    const stopMatch = /stop="([^"]+)"/i.exec(attrs);
    const chIdMatch = /channel="([^"]+)"/i.exec(attrs);

    if (!startMatch || !stopMatch || !chIdMatch) continue;

    const channelId = chIdMatch[1];
    const startDate = parseXmltvDate(startMatch[1]);
    const stopDate = parseXmltvDate(stopMatch[1]);

    const titleMatch = /<title[^>]*>([^<]+)<\/title>/i.exec(body);
    const subTitleMatch = /<sub-title[^>]*>([^<]+)<\/sub-title>/i.exec(body);
    const descMatch = /<desc[^>]*>([^<]+)<\/desc>/i.exec(body);
    const catMatch = /<category[^>]*>([^<]+)<\/category>/i.exec(body);
    const starMatch = /<star-rating[^>]*>[\s\S]*?<value>([^<]+)<\/value>[\s\S]*?<\/star-rating>/i.exec(body);

    const startMs = startDate.getTime();
    const stopMs = stopDate.getTime();
    const durationMin = Math.max(1, Math.round((stopMs - startMs) / 60000));

    const isNow = nowMs >= startMs && nowMs < stopMs;
    let progress = 0;
    if (isNow && stopMs > startMs) {
      progress = Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (stopMs - startMs)) * 100)));
    }

    const progId = `xmltv_${channelId}_${startDate.getTime()}`;
    const program: UnifiedEpgProgram = {
      id: progId,
      channelId,
      title: titleMatch ? titleMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim() : 'Program',
      subTitle: subTitleMatch ? subTitleMatch[1].replace(/&amp;/g, '&').trim() : undefined,
      description: descMatch ? descMatch[1].replace(/&amp;/g, '&').trim() : undefined,
      category: catMatch ? catMatch[1].trim() : 'General',
      start: startDate,
      stop: stopDate,
      startTimestampSec: Math.floor(startMs / 1000),
      stopTimestampSec: Math.floor(stopMs / 1000),
      durationMinutes: durationMin,
      nowPlaying: isNow,
      progressPercent: progress,
      starRating: starMatch ? starMatch[1].trim() : undefined,
      hasCatchupArchive: stopMs <= nowMs, // Finished programs support catchup if provider permits
    };

    if (!programmesByChannel[channelId]) {
      programmesByChannel[channelId] = [];
    }
    programmesByChannel[channelId].push(program);
    progCount++;
  }

  // Sort each channel's programmes chronologically
  for (const chId in programmesByChannel) {
    programmesByChannel[chId].sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  return {
    channelsCount: channels.length,
    programmesCount: progCount,
    channels,
    programmesByChannel,
  };
}

/**
 * Normalizes Xtream `get_simple_data_table` or `get_short_epg` response into UnifiedEpgProgram[]
 */
export function normalizeXtreamEpg(
  rawTable: any,
  streamId: string | number,
  nowRef: Date = new Date()
): UnifiedEpgProgram[] {
  if (!rawTable) return [];
  const listings: any[] = Array.isArray(rawTable)
    ? rawTable
    : Array.isArray(rawTable.epg_listings)
    ? rawTable.epg_listings
    : [];

  const nowMs = nowRef.getTime();

  return listings.map((item, idx) => {
    const rawTitle = item.title || item.name || 'Unknown Program';
    const decodedTitle = safeBase64Decode(rawTitle);
    const decodedDesc = safeBase64Decode(item.description || item.descr);

    let start: Date;
    let stop: Date;

    if (item.start_timestamp) {
      start = new Date(parseInt(item.start_timestamp, 10) * 1000);
    } else if (item.start) {
      start = new Date(item.start.replace(' ', 'T') + 'Z');
    } else {
      start = new Date(nowMs + idx * 3600000);
    }

    if (item.stop_timestamp) {
      stop = new Date(parseInt(item.stop_timestamp, 10) * 1000);
    } else if (item.end) {
      stop = new Date(item.end.replace(' ', 'T') + 'Z');
    } else {
      stop = new Date(start.getTime() + 3600000);
    }

    const startMs = start.getTime();
    const stopMs = stop.getTime();
    const durationMin = Math.max(1, Math.round((stopMs - startMs) / 60000));
    const isNow = nowMs >= startMs && nowMs < stopMs;
    const progress = isNow ? Math.min(100, Math.max(0, Math.round(((nowMs - startMs) / (stopMs - startMs)) * 100))) : 0;

    return {
      id: item.id || `xtream_${streamId}_${idx}`,
      channelId: String(item.channel_id || streamId),
      title: decodedTitle,
      description: decodedDesc,
      category: item.category || 'General',
      start,
      stop,
      startTimestampSec: Math.floor(startMs / 1000),
      stopTimestampSec: Math.floor(stopMs / 1000),
      durationMinutes: durationMin,
      nowPlaying: isNow,
      progressPercent: progress,
      hasCatchupArchive: item.has_archive === 1 || Boolean(item.tv_archive),
    };
  }).sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Formats a Date object to Xtream Timeshift timestamp: YYYY-MM-DD:HH-mm
 */
export function formatXtreamTimeshiftDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const mins = pad(d.getUTCMinutes());
  return `${year}-${month}-${day}:${hours}-${mins}`;
}

/**
 * Builds the exact Catchup / Timeshift stream URL depending on provider syntax
 */
export function buildCatchupStreamUrl(spec: CatchupTimeshiftSpec): string {
  const { serverUrl, username, password, streamId, startTime, durationMinutes, archiveType } = spec;
  const baseUrl = serverUrl.replace(/\/+$/, '');

  if (archiveType === 'xtream_timeshift') {
    // Standard Xtream Timeshift format: /timeshift/USER/PASS/DURATION_MIN/YYYY-MM-DD:HH-mm/STREAM_ID.ts
    const timeFormatted = formatXtreamTimeshiftDate(startTime);
    return `${baseUrl}/timeshift/${username}/${password}/${durationMinutes}/${timeFormatted}/${streamId}.ts`;
  }

  if (archiveType === 'flussonic') {
    // Flussonic timeshift: /live/USER/PASS/STREAM_ID.m3u8?utc=START_UTC&lutc=END_UTC
    const startUtc = Math.floor(startTime.getTime() / 1000);
    const endUtc = startUtc + durationMinutes * 60;
    return `${baseUrl}/live/${username}/${password}/${streamId}.m3u8?utc=${startUtc}&lutc=${endUtc}`;
  }

  // Query parameter fallback
  const startSec = Math.floor(startTime.getTime() / 1000);
  return `${baseUrl}/live/${username}/${password}/${streamId}.ts?timeshift=${startSec}&duration=${durationMinutes * 60}`;
}

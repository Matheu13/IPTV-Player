/**
 * Milestone 1, 2 & 3 Data Layer: Unified Models & System Definitions
 */

export type SourceType = 'XTREAM' | 'M3U';

export interface SourceCapabilities {
  sourceType: SourceType;
  supportsServerConnectionAccounting: boolean;
  supportsCatchupArchive: boolean;
  supportsPerEndpointCaching: boolean;
  supportsPagedStreams: boolean;
  epgMechanism: 'XTREAM_API' | 'XMLTV_EXTERNAL' | 'NONE';
  degradationWarnings: string[];
}

export interface UnifiedCategory {
  id: string;
  name: string;
  parentId?: string | number;
  sourceType: SourceType;
  channelCount?: number;
  isSyntheticFallback?: boolean;
}

export interface UnifiedChannel {
  id: string;
  streamId: number | string;
  name: string;
  streamType: 'live' | 'movie' | 'series';
  categoryId: string;
  categoryName?: string;
  streamIcon?: string;
  epgChannelId?: string;
  tvArchive: boolean;
  tvArchiveDurationDays?: number;
  num?: number;
  sourceType: SourceType;
  directSourceUrl?: string;
  formatsAvailable: string[];
  resolvedStreamUrl?: string;
  activeFormat?: string;
  alternativeStreamUrls?: string[];
  validationStatus?: 'online' | 'degraded' | 'dead' | 'unchecked';
  validationLatencyMs?: number;
  lastValidatedAt?: number;
  isFavorite?: boolean;
  isHidden?: boolean;
  customOrder?: number;
}

export interface UnifiedAccountInfo {
  sourceType: SourceType;
  username: string;
  authStatus: 'Active' | 'Expired' | 'Banned' | 'Disabled' | 'InvalidCredentials' | 'Unmetered';
  expirationDate: Date | null;
  maxConnections: number;
  activeConnections: number;
  isConnectionLimitStrict: boolean;
  allowedOutputFormats: string[];
  serverInfo?: {
    url: string;
    port: string;
    protocol: string;
    timezone: string;
    serverTime?: string;
  };
  rawMessage?: string;
}

export interface CacheMetadata {
  key: string;
  sourceType: SourceType;
  lastFetchedAt: string;
  ttlSeconds: number;
  itemCount: number;
  isStale: boolean;
  emptyOverwritePrevented?: boolean;
}

// ==========================================
// MILESTONE 3A: EPG & CATCHUP TIMESHIFT
// ==========================================

export interface XmltvChannel {
  id: string;
  displayName: string;
  iconSrc?: string;
}

export interface UnifiedEpgProgram {
  id: string;
  channelId: string;
  title: string;
  subTitle?: string;
  description?: string;
  category?: string;
  start: Date;
  stop: Date;
  startTimestampSec: number;
  stopTimestampSec: number;
  durationMinutes: number;
  nowPlaying?: boolean;
  progressPercent?: number;
  starRating?: string;
  hasCatchupArchive?: boolean;
}

export interface XmltvParseResult {
  channelsCount: number;
  programmesCount: number;
  channels: XmltvChannel[];
  programmesByChannel: Record<string, UnifiedEpgProgram[]>;
  generatedAt?: string;
}

export interface CatchupTimeshiftSpec {
  channelId: string | number;
  streamId: number | string;
  programTitle: string;
  startTime: Date;
  durationMinutes: number;
  serverUrl: string;
  username: string;
  password: string;
  archiveType: 'xtream_timeshift' | 'flussonic' | 'query_utc';
}

// ==========================================
// MILESTONE 3B: VOD & TV SERIES ENGINE
// ==========================================

export interface UnifiedVodMovie {
  id: string | number;
  streamId: number;
  name: string;
  categoryName: string;
  categoryId: string;
  rating: string;
  rating5: number;
  durationSec: number;
  durationFormatted: string;
  streamIcon: string;
  containerExtension: string;
  addedDate?: string;
  backdropUrl?: string;
  plot?: string;
  director?: string;
  cast?: string;
  isFavorite?: boolean;
}

export interface UnifiedEpisode {
  id: string;
  streamId: string | number;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  containerExtension: string;
  durationSec: number;
  durationFormatted: string;
  plot?: string;
  rating?: number;
  releaseDate?: string;
  thumbnail?: string;
}

export interface UnifiedSeason {
  seasonNumber: number;
  name: string;
  overview?: string;
  episodeCount: number;
  coverUrl?: string;
  episodes: UnifiedEpisode[];
}

export interface UnifiedSeries {
  id: string | number;
  seriesId: number;
  name: string;
  categoryId: string;
  categoryName: string;
  coverUrl: string;
  backdropUrl?: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  rating: string;
  rating5: number;
  seasons: UnifiedSeason[];
  seasonCount?: number;
  episodeCount?: number;
  isFavorite?: boolean;
}

export interface WatchProgressRecord {
  mediaId: string | number;
  mediaType: 'movie' | 'episode' | 'live';
  title: string;
  seasonNumber?: number;
  episodeNumber?: number;
  currentTimeSec: number;
  durationSec: number;
  progressPercent: number;
  completed: boolean;
  lastWatchedTimestamp: number;
  streamUrl: string;
  streamIcon?: string;
}

// ==========================================
// MILESTONE 3C: CHANNEL MANAGEMENT & REMOTE
// ==========================================

export interface CustomBouquet {
  id: string;
  name: string;
  description?: string;
  channelIds: (string | number)[];
  createdAt: number;
  isDefault?: boolean;
}

export interface ChannelOverrideMapping {
  channelId: string | number;
  customName?: string;
  customNumber?: number;
  customCategory?: string;
  hidden: boolean;
  favorite: boolean;
  sortWeight?: number;
}

export type RemoteActionKey =
  | 'CHANNEL_UP'
  | 'CHANNEL_DOWN'
  | 'VOLUME_UP'
  | 'VOLUME_DOWN'
  | 'MUTE_TOGGLE'
  | 'PLAY_PAUSE'
  | 'TOGGLE_FULLSCREEN'
  | 'TOGGLE_STATS_HUD'
  | 'TOGGLE_OSD'
  | 'DIGIT_INPUT'
  | 'QUICK_EPG'
  | 'FAVORITE_TOGGLE';

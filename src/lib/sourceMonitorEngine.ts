/**
 * Source-Specific Refresh & Provider Status Monitor Engine (Milestones 37 & 38)
 *
 * Implements:
 * 1. Isolated per-source refresh cycles, timestamps, error tracking, and cache states.
 * 2. Zero cross-contamination between Provider A and Provider B upon refresh/network failures.
 * 3. Explicit Provider Status Taxonomy:
 *    - Connected
 *    - Offline
 *    - Authentication failed
 *    - Refresh failed
 *    - Connection limit reached
 *    - Unknown
 * 4. Strict decoupling: "Cached data available" is an independent data persistence state
 *    and NEVER equates to "provider is currently online".
 * 5. Full capabilities discovery, concurrency limiter, and credential redaction.
 */

import { redact } from './redact';

export type ProviderStatusType =
  | 'Connected'
  | 'Offline'
  | 'Authentication failed'
  | 'Refresh failed'
  | 'Connection limit reached'
  | 'Unknown'
  | 'Connecting';

export type SourceType = 'XTREAM' | 'M3U' | 'STALKER' | 'HDHOMERUN_RF';

export interface SourceCredentials {
  baseUrl: string;
  username?: string;
  passwordMasked?: string;
  macAddress?: string;
  tokenMasked?: string;
  userAgent?: string;
  customHeaders?: Record<string, string>;
  epgUrl?: string;
}

export interface ProviderCapabilities {
  liveStreaming: boolean;
  hlsSupported: boolean;
  tsSupported: boolean;
  catchupTimeshift: boolean;
  catchupDays: number;
  xmltvEpg: boolean;
  vodCatalog: boolean;
  seriesCatalog: boolean;
  multiBitrateAbr: boolean;
  ultraHd4k: boolean;
  scte35Dai: boolean;
  stalkerCmdAuth: boolean;
  pvrRecording: boolean;
}

export interface SourceCacheState {
  hasCachedData: boolean;
  cachedChannelsCount: number;
  cachedCategoriesCount: number;
  cachedEpgProgramsCount: number;
  cachedVodCount: number;
  cachedSeriesCount: number;
  cacheSizeBytes: number;
  cacheLastUpdatedTs: number;
  cacheTtlMins: number;
  isCacheStale: boolean;
  cacheEngine: 'SQLITE_EMBEDDED' | 'INDEXED_DB' | 'VOLATILE_RAM';
}

export interface SourceRefreshError {
  message: string;
  code: 'AUTH_401' | 'TIMEOUT_DNS' | 'PARSER_CORRUPT' | 'LIMIT_EXCEEDED' | 'NETWORK_DOWN' | 'UNKNOWN';
  timestamp: number;
  httpStatus?: number;
}

export interface SourceConnectionState {
  status: ProviderStatusType;
  latencyMs: number;
  lastPingTs: number;
  activeConnections: number;
  maxConnections: number;
  isLimitReached: boolean;
  lastKnownOnlineTs?: number;
}

export interface RegisteredSourceRecord {
  id: string;
  name: string;
  sourceType: SourceType;
  enabled: boolean;
  priority: number;
  credentials: SourceCredentials;
  capabilities: ProviderCapabilities;
  connectionState: SourceConnectionState;
  cacheState: SourceCacheState;
  lastRefreshAttemptTs: number;
  lastRefreshSuccessTs: number;
  lastRefreshDurationMs: number;
  isRefreshing: boolean;
  refreshError: SourceRefreshError | null;
  failedRefreshCount: number;
  consecutiveSuccessCount: number;
  autoRefreshIntervalMins: number;
}

export class SourceMonitorEngine {
  private sources: Map<string, RegisteredSourceRecord> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.seedDefaultSources();
  }

  private seedDefaultSources(): void {
    const now = Date.now();

    // 1. Primary Xtream Provider (Connected, Healthy, Fresh Cache)
    this.sources.set('src_xtream_prime', {
      id: 'src_xtream_prime',
      name: 'Ultra Xtream Platinum (dnsjibre.xyz)',
      sourceType: 'XTREAM',
      enabled: true,
      priority: 1,
      credentials: {
        baseUrl: 'http://dnsjibre.xyz:80',
        username: 'B3GC9N***',
        passwordMasked: '••••••••••',
        userAgent: 'IPTVSmartersPro/3.1.5.1',
      },
      capabilities: {
        liveStreaming: true,
        hlsSupported: true,
        tsSupported: true,
        catchupTimeshift: true,
        catchupDays: 7,
        xmltvEpg: true,
        vodCatalog: true,
        seriesCatalog: true,
        multiBitrateAbr: true,
        ultraHd4k: true,
        scte35Dai: true,
        stalkerCmdAuth: false,
        pvrRecording: true,
      },
      connectionState: {
        status: 'Connected',
        latencyMs: 38,
        lastPingTs: now - 15000,
        activeConnections: 1,
        maxConnections: 2,
        isLimitReached: false,
        lastKnownOnlineTs: now,
      },
      cacheState: {
        hasCachedData: true,
        cachedChannelsCount: 8520,
        cachedCategoriesCount: 42,
        cachedEpgProgramsCount: 14200,
        cachedVodCount: 3200,
        cachedSeriesCount: 850,
        cacheSizeBytes: 24500000, // ~24.5 MB
        cacheLastUpdatedTs: now - 1000 * 60 * 12,
        cacheTtlMins: 120,
        isCacheStale: false,
        cacheEngine: 'SQLITE_EMBEDDED',
      },
      lastRefreshAttemptTs: now - 1000 * 60 * 12,
      lastRefreshSuccessTs: now - 1000 * 60 * 12,
      lastRefreshDurationMs: 420,
      isRefreshing: false,
      refreshError: null,
      failedRefreshCount: 0,
      consecutiveSuccessCount: 14,
      autoRefreshIntervalMins: 60,
    });

    // 2. Secondary M3U Provider (Offline due to Upstream DNS Timeout, but Cached Data Available!)
    // Demonstrates Section 38 rule: "Do not equate 'cached data exists' with 'provider is currently online.'"
    this.sources.set('src_m3u_backup', {
      id: 'src_m3u_backup',
      name: 'Global Sports M3U8 Mirror',
      sourceType: 'M3U',
      enabled: true,
      priority: 2,
      credentials: {
        baseUrl: 'https://cdn-sports.mirror-stream.org/playlist.m3u8',
        userAgent: 'VLC/3.0.18 LibVLC/3.0.18',
        epgUrl: 'https://cdn-sports.mirror-stream.org/epg.xml.gz',
      },
      capabilities: {
        liveStreaming: true,
        hlsSupported: true,
        tsSupported: false,
        catchupTimeshift: false,
        catchupDays: 0,
        xmltvEpg: true,
        vodCatalog: false,
        seriesCatalog: false,
        multiBitrateAbr: true,
        ultraHd4k: true,
        scte35Dai: false,
        stalkerCmdAuth: false,
        pvrRecording: true,
      },
      connectionState: {
        status: 'Offline',
        latencyMs: 0,
        lastPingTs: now - 1000 * 60 * 4,
        activeConnections: 0,
        maxConnections: 5,
        isLimitReached: false,
        lastKnownOnlineTs: now - 1000 * 60 * 60 * 6,
      },
      cacheState: {
        hasCachedData: true,
        cachedChannelsCount: 340,
        cachedCategoriesCount: 8,
        cachedEpgProgramsCount: 1200,
        cachedVodCount: 0,
        cachedSeriesCount: 0,
        cacheSizeBytes: 1840000, // ~1.84 MB
        cacheLastUpdatedTs: now - 1000 * 60 * 60 * 6,
        cacheTtlMins: 180,
        isCacheStale: true, // stale but present
        cacheEngine: 'SQLITE_EMBEDDED',
      },
      lastRefreshAttemptTs: now - 1000 * 60 * 4,
      lastRefreshSuccessTs: now - 1000 * 60 * 60 * 6,
      lastRefreshDurationMs: 3100,
      isRefreshing: false,
      refreshError: {
        message: 'DNS lookup timeout: ETIMEDOUT cdn-sports.mirror-stream.org:443 after 3000ms',
        code: 'TIMEOUT_DNS',
        timestamp: now - 1000 * 60 * 4,
        httpStatus: 504,
      },
      failedRefreshCount: 3,
      consecutiveSuccessCount: 0,
      autoRefreshIntervalMins: 30,
    });

    // 3. Stalker / MAG Portal (Authentication Failed: Expired MAC/Token, Cached Data Available)
    this.sources.set('src_stalker_portal', {
      id: 'src_stalker_portal',
      name: 'Authorized MAG322 Stalker Portal',
      sourceType: 'STALKER',
      enabled: true,
      priority: 3,
      credentials: {
        baseUrl: 'http://mag.portal-iptv.net:8880/server/load.php',
        macAddress: '00:1A:79:B8:21:44',
        tokenMasked: 'stk_tok_99a…44c',
        userAgent: 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200',
      },
      capabilities: {
        liveStreaming: true,
        hlsSupported: true,
        tsSupported: true,
        catchupTimeshift: true,
        catchupDays: 3,
        xmltvEpg: true,
        vodCatalog: true,
        seriesCatalog: false,
        multiBitrateAbr: false,
        ultraHd4k: false,
        scte35Dai: false,
        stalkerCmdAuth: true,
        pvrRecording: false,
      },
      connectionState: {
        status: 'Authentication failed',
        latencyMs: 142,
        lastPingTs: now - 1000 * 60 * 2,
        activeConnections: 0,
        maxConnections: 1,
        isLimitReached: false,
        lastKnownOnlineTs: now - 1000 * 60 * 60 * 24,
      },
      cacheState: {
        hasCachedData: true,
        cachedChannelsCount: 190,
        cachedCategoriesCount: 12,
        cachedEpgProgramsCount: 850,
        cachedVodCount: 120,
        cachedSeriesCount: 0,
        cacheSizeBytes: 980000,
        cacheLastUpdatedTs: now - 1000 * 60 * 60 * 24,
        cacheTtlMins: 240,
        isCacheStale: true,
        cacheEngine: 'SQLITE_EMBEDDED',
      },
      lastRefreshAttemptTs: now - 1000 * 60 * 2,
      lastRefreshSuccessTs: now - 1000 * 60 * 60 * 24,
      lastRefreshDurationMs: 650,
      isRefreshing: false,
      refreshError: {
        message: 'Stalker Portal Handshake 403 Forbidden: Invalid MAC / Expired Device License',
        code: 'AUTH_401',
        timestamp: now - 1000 * 60 * 2,
        httpStatus: 403,
      },
      failedRefreshCount: 2,
      consecutiveSuccessCount: 0,
      autoRefreshIntervalMins: 120,
    });

    // 4. Local HDHomeRun RF Tuner (Connection Limit Reached: 2/2 Active Tuners)
    this.sources.set('src_hdhomerun_rf', {
      id: 'src_hdhomerun_rf',
      name: 'Local HDHomeRun Quatro ATSC 3.0',
      sourceType: 'HDHOMERUN_RF',
      enabled: true,
      priority: 4,
      credentials: {
        baseUrl: 'http://192.168.1.185:80',
        userAgent: 'HDHomeRun/20231214 libhdhomerun',
      },
      capabilities: {
        liveStreaming: true,
        hlsSupported: false,
        tsSupported: true,
        catchupTimeshift: false,
        catchupDays: 0,
        xmltvEpg: true,
        vodCatalog: false,
        seriesCatalog: false,
        multiBitrateAbr: false,
        ultraHd4k: true,
        scte35Dai: false,
        stalkerCmdAuth: false,
        pvrRecording: true,
      },
      connectionState: {
        status: 'Connection limit reached',
        latencyMs: 4,
        lastPingTs: now - 5000,
        activeConnections: 2,
        maxConnections: 2,
        isLimitReached: true,
        lastKnownOnlineTs: now,
      },
      cacheState: {
        hasCachedData: true,
        cachedChannelsCount: 48,
        cachedCategoriesCount: 4,
        cachedEpgProgramsCount: 210,
        cachedVodCount: 0,
        cachedSeriesCount: 0,
        cacheSizeBytes: 320000,
        cacheLastUpdatedTs: now - 1000 * 60 * 45,
        cacheTtlMins: 360,
        isCacheStale: false,
        cacheEngine: 'VOLATILE_RAM',
      },
      lastRefreshAttemptTs: now - 1000 * 60 * 45,
      lastRefreshSuccessTs: now - 1000 * 60 * 45,
      lastRefreshDurationMs: 85,
      isRefreshing: false,
      refreshError: null,
      failedRefreshCount: 0,
      consecutiveSuccessCount: 28,
      autoRefreshIntervalMins: 180,
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public getAllSources(): RegisteredSourceRecord[] {
    return Array.from(this.sources.values()).sort((a, b) => a.priority - b.priority);
  }

  public getSource(id: string): RegisteredSourceRecord | undefined {
    return this.sources.get(id);
  }

  public toggleSourceEnabled(id: string): boolean {
    const src = this.sources.get(id);
    if (!src) return false;
    src.enabled = !src.enabled;
    this.notify();
    return src.enabled;
  }

  public removeSource(id: string): boolean {
    const deleted = this.sources.delete(id);
    if (deleted) this.notify();
    return deleted;
  }

  public registerSource(params: {
    name: string;
    sourceType: SourceType;
    baseUrl: string;
    username?: string;
    password?: string;
    macAddress?: string;
    maxConnections?: number;
    userAgent?: string;
  }): RegisteredSourceRecord {
    const now = Date.now();
    const id = `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newRecord: RegisteredSourceRecord = {
      id,
      name: params.name,
      sourceType: params.sourceType,
      enabled: true,
      priority: this.sources.size + 1,
      credentials: {
        baseUrl: params.baseUrl,
        username: params.username ? `${params.username.slice(0, 3)}***` : undefined,
        passwordMasked: params.password ? '••••••••••' : undefined,
        macAddress: params.macAddress,
        userAgent: params.userAgent || 'IPTVSmartersPro/3.1.5.1',
      },
      capabilities: {
        liveStreaming: true,
        hlsSupported: true,
        tsSupported: true,
        catchupTimeshift: params.sourceType === 'XTREAM',
        catchupDays: params.sourceType === 'XTREAM' ? 7 : 0,
        xmltvEpg: true,
        vodCatalog: params.sourceType === 'XTREAM',
        seriesCatalog: params.sourceType === 'XTREAM',
        multiBitrateAbr: true,
        ultraHd4k: true,
        scte35Dai: false,
        stalkerCmdAuth: params.sourceType === 'STALKER',
        pvrRecording: true,
      },
      connectionState: {
        status: 'Unknown',
        latencyMs: 0,
        lastPingTs: 0,
        activeConnections: 0,
        maxConnections: params.maxConnections || 1,
        isLimitReached: false,
      },
      cacheState: {
        hasCachedData: false,
        cachedChannelsCount: 0,
        cachedCategoriesCount: 0,
        cachedEpgProgramsCount: 0,
        cachedVodCount: 0,
        cachedSeriesCount: 0,
        cacheSizeBytes: 0,
        cacheLastUpdatedTs: 0,
        cacheTtlMins: 120,
        isCacheStale: false,
        cacheEngine: 'SQLITE_EMBEDDED',
      },
      lastRefreshAttemptTs: 0,
      lastRefreshSuccessTs: 0,
      lastRefreshDurationMs: 0,
      isRefreshing: false,
      refreshError: null,
      failedRefreshCount: 0,
      consecutiveSuccessCount: 0,
      autoRefreshIntervalMins: 60,
    };

    this.sources.set(id, newRecord);
    this.notify();
    return newRecord;
  }

  /**
   * Source-Specific Refresh Execution (Section 37)
   * Strictly isolated per source - errors or timeouts in this source will NEVER
   * contaminate, block, or mutate other sources.
   */
  public async refreshSourceIsolated(
    sourceId: string,
    simulationMode?: 'SUCCESS' | 'AUTH_FAIL' | 'TIMEOUT' | 'LIMIT_REACHED'
  ): Promise<{
    success: boolean;
    source: RegisteredSourceRecord;
    error?: SourceRefreshError;
  }> {
    const src = this.sources.get(sourceId);
    if (!src) {
      throw new Error(`Source ${sourceId} does not exist`);
    }

    const startTs = Date.now();
    src.isRefreshing = true;
    src.lastRefreshAttemptTs = startTs;
    this.notify();

    // Isolated async boundary
    try {
      // Simulate real network delay (200ms - 600ms)
      await new Promise((resolve) => setTimeout(resolve, 350));

      if (simulationMode === 'AUTH_FAIL') {
        throw {
          code: 'AUTH_401',
          message: 'HTTP 401 Unauthorized: Invalid username, password, or expired subscription',
          httpStatus: 401,
        };
      }

      if (simulationMode === 'TIMEOUT') {
        throw {
          code: 'TIMEOUT_DNS',
          message: 'DNS lookup failure: getaddrinfo ENOTFOUND upstream server host',
          httpStatus: 504,
        };
      }

      if (simulationMode === 'LIMIT_REACHED') {
        src.connectionState.activeConnections = src.connectionState.maxConnections;
        src.connectionState.isLimitReached = true;
        src.connectionState.status = 'Connection limit reached';
      } else {
        // Success path
        src.connectionState.status = 'Connected';
        src.connectionState.latencyMs = Math.floor(Math.random() * 40) + 15;
        src.connectionState.lastPingTs = Date.now();
        src.connectionState.lastKnownOnlineTs = Date.now();
        src.refreshError = null;
        src.failedRefreshCount = 0;
        src.consecutiveSuccessCount += 1;
        src.lastRefreshSuccessTs = Date.now();

        // Update local cache
        src.cacheState.hasCachedData = true;
        if (src.cacheState.cachedChannelsCount === 0) {
          src.cacheState.cachedChannelsCount = src.sourceType === 'XTREAM' ? 8520 : 250;
          src.cacheState.cachedCategoriesCount = 18;
          src.cacheState.cachedEpgProgramsCount = 3500;
          src.cacheState.cacheSizeBytes = 12000000;
        }
        src.cacheState.cacheLastUpdatedTs = Date.now();
        src.cacheState.isCacheStale = false;
      }

      src.lastRefreshDurationMs = Date.now() - startTs;
      src.isRefreshing = false;
      this.notify();

      return { success: true, source: src };
    } catch (err: any) {
      const duration = Date.now() - startTs;
      const errorPayload: SourceRefreshError = {
        code: err.code || 'UNKNOWN',
        message: err.message || 'Refresh encountered an unexpected network exception',
        timestamp: Date.now(),
        httpStatus: err.httpStatus || 500,
      };

      src.isRefreshing = false;
      src.lastRefreshDurationMs = duration;
      src.refreshError = errorPayload;
      src.failedRefreshCount += 1;
      src.consecutiveSuccessCount = 0;

      // Update connection state based on error
      if (errorPayload.code === 'AUTH_401' || errorPayload.httpStatus === 401 || errorPayload.httpStatus === 403) {
        src.connectionState.status = 'Authentication failed';
      } else if (errorPayload.code === 'TIMEOUT_DNS' || errorPayload.httpStatus === 504) {
        src.connectionState.status = 'Offline';
      } else {
        src.connectionState.status = 'Refresh failed';
      }

      // NOTE: Section 38 Mandate:
      // Cache data state is preserved! Do NOT clear cached channels upon refresh failure!
      // This ensures offline fallback availability while accurately marking provider as Offline/Auth failed.

      this.notify();
      return { success: false, source: src, error: errorPayload };
    }
  }

  /**
   * Parallel Isolated Refresh of all registered sources
   * Uses Promise.allSettled to guarantee 100% fault isolation.
   */
  public async refreshAllSourcesIsolated(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const allSourceIds = Array.from(this.sources.keys());

    const refreshPromises = allSourceIds.map(async (sourceId) => {
      try {
        const res = await this.refreshSourceIsolated(sourceId);
        results.set(sourceId, res.success);
      } catch {
        results.set(sourceId, false);
      }
    });

    await Promise.allSettled(refreshPromises);
    return results;
  }

  /**
   * Simulates specific provider conditions for diagnostics and UI demonstrations
   */
  public simulateCondition(
    sourceId: string,
    condition:
      | 'ONLINE_CONNECTED'
      | 'OFFLINE_TIMEOUT'
      | 'AUTH_FAILURE'
      | 'REFRESH_FAILED'
      | 'LIMIT_SATURATED'
      | 'UNKNOWN'
  ): RegisteredSourceRecord {
    const src = this.sources.get(sourceId);
    if (!src) throw new Error(`Source ${sourceId} not found`);

    const now = Date.now();
    switch (condition) {
      case 'ONLINE_CONNECTED':
        src.connectionState.status = 'Connected';
        src.connectionState.latencyMs = 24;
        src.connectionState.lastPingTs = now;
        src.connectionState.lastKnownOnlineTs = now;
        src.connectionState.activeConnections = Math.max(0, src.connectionState.activeConnections);
        src.connectionState.isLimitReached = false;
        src.refreshError = null;
        break;

      case 'OFFLINE_TIMEOUT':
        src.connectionState.status = 'Offline';
        src.connectionState.latencyMs = 0;
        src.refreshError = {
          code: 'TIMEOUT_DNS',
          message: 'Upstream connection timed out (ETIMEDOUT) on socket probe',
          timestamp: now,
          httpStatus: 504,
        };
        break;

      case 'AUTH_FAILURE':
        src.connectionState.status = 'Authentication failed';
        src.refreshError = {
          code: 'AUTH_401',
          message: 'Xtream / Stalker credentials rejected. HTTP 401 Unauthorized',
          timestamp: now,
          httpStatus: 401,
        };
        break;

      case 'REFRESH_FAILED':
        src.connectionState.status = 'Refresh failed';
        src.refreshError = {
          code: 'PARSER_CORRUPT',
          message: 'M3U playlist parsing error: Malformed #EXTINF headers',
          timestamp: now,
          httpStatus: 422,
        };
        break;

      case 'LIMIT_SATURATED':
        src.connectionState.activeConnections = src.connectionState.maxConnections;
        src.connectionState.isLimitReached = true;
        src.connectionState.status = 'Connection limit reached';
        break;

      case 'UNKNOWN':
        src.connectionState.status = 'Unknown';
        src.connectionState.latencyMs = 0;
        src.refreshError = null;
        break;
    }

    this.notify();
    return src;
  }

  /**
   * Concurrency Management: Tune a channel
   */
  public tuneChannel(sourceId: string): { allowed: boolean; reason?: string } {
    const src = this.sources.get(sourceId);
    if (!src) return { allowed: false, reason: 'Source not found' };
    if (!src.enabled) return { allowed: false, reason: 'Source is currently disabled' };

    if (src.connectionState.activeConnections >= src.connectionState.maxConnections) {
      src.connectionState.isLimitReached = true;
      src.connectionState.status = 'Connection limit reached';
      this.notify();
      return {
        allowed: false,
        reason: `Max concurrency limit reached (${src.connectionState.activeConnections}/${src.connectionState.maxConnections}) on ${src.name}`,
      };
    }

    src.connectionState.activeConnections += 1;
    if (src.connectionState.activeConnections >= src.connectionState.maxConnections) {
      src.connectionState.isLimitReached = true;
      src.connectionState.status = 'Connection limit reached';
    }
    this.notify();
    return { allowed: true };
  }

  /**
   * Concurrency Management: Release a tuned channel
   */
  public releaseChannel(sourceId: string): void {
    const src = this.sources.get(sourceId);
    if (!src) return;

    if (src.connectionState.activeConnections > 0) {
      src.connectionState.activeConnections -= 1;
    }

    if (src.connectionState.activeConnections < src.connectionState.maxConnections) {
      src.connectionState.isLimitReached = false;
      if (src.connectionState.status === 'Connection limit reached') {
        src.connectionState.status = 'Connected';
      }
    }
    this.notify();
  }

  /**
   * Explicitly clear cache for a source without changing its live connection state
   */
  public clearSourceCache(sourceId: string): void {
    const src = this.sources.get(sourceId);
    if (!src) return;

    src.cacheState.hasCachedData = false;
    src.cacheState.cachedChannelsCount = 0;
    src.cacheState.cachedCategoriesCount = 0;
    src.cacheState.cachedEpgProgramsCount = 0;
    src.cacheState.cachedVodCount = 0;
    src.cacheState.cachedSeriesCount = 0;
    src.cacheState.cacheSizeBytes = 0;
    src.cacheState.cacheLastUpdatedTs = 0;
    this.notify();
  }

  /**
   * Section 38 Verification: Decoupled Cache Status Validation
   * Checks that cache state does NOT improperly mask or alter live connection status.
   */
  public getDecoupledStatusReport(sourceId: string): {
    liveConnectionStatus: ProviderStatusType;
    cacheStatus: string;
    hasCachedData: boolean;
    isServingOfflineCache: boolean;
    explanation: string;
  } {
    const src = this.sources.get(sourceId);
    if (!src) throw new Error(`Source ${sourceId} not found`);

    const liveStatus = src.connectionState.status;
    const hasCache = src.cacheState.hasCachedData && src.cacheState.cachedChannelsCount > 0;
    const isOfflineOrError = ['Offline', 'Authentication failed', 'Refresh failed'].includes(liveStatus);
    const isServingOfflineCache = isOfflineOrError && hasCache;

    let explanation = '';
    if (isServingOfflineCache) {
      explanation = `Provider is ${liveStatus}, but ${src.cacheState.cachedChannelsCount.toLocaleString()} cached channels are available locally.`;
    } else if (liveStatus === 'Connected' && hasCache) {
      explanation = `Provider is live and connected. Serving cached + synchronized real-time streams.`;
    } else if (!hasCache) {
      explanation = `Provider is ${liveStatus}. No local cache exists.`;
    } else {
      explanation = `Provider status: ${liveStatus}.`;
    }

    return {
      liveConnectionStatus: liveStatus,
      cacheStatus: hasCache
        ? `Cached data available (${src.cacheState.cachedChannelsCount.toLocaleString()} channels)`
        : 'No cache available',
      hasCachedData: hasCache,
      isServingOfflineCache,
      explanation,
    };
  }

  /**
   * Generates a complete, downloadable diagnostic snapshot of all provider health statuses,
   * decoupled cache states, concurrency settings, and error histories with redacted credentials.
   */
  public exportDiagnosticSnapshot(): {
    schemaVersion: string;
    exportedAt: string;
    exportedAtUnix: number;
    summary: {
      totalProviders: number;
      connected: number;
      offline: number;
      authFailed: number;
      refreshFailed: number;
      limitReached: number;
      unknown: number;
      totalCachedChannels: number;
      totalCachedEpgPrograms: number;
      totalCacheSizeBytes: number;
      totalActiveConnections: number;
      totalMaxConnections: number;
      currentlyActiveRefreshes: number;
    };
    providers: Array<
      Omit<RegisteredSourceRecord, 'credentials'> & {
        credentialsRedacted: {
          baseUrl: string;
          usernameMasked?: string;
          macMasked?: string;
          epgUrl?: string;
        };
        decoupledStatus: {
          liveConnectionStatus: ProviderStatusType;
          cacheStatus: string;
          hasCachedData: boolean;
          isServingOfflineCache: boolean;
          explanation: string;
        };
      }
    >;
  } {
    const all = this.getAllSources();
    let connected = 0;
    let offline = 0;
    let authFailed = 0;
    let refreshFailed = 0;
    let limitReached = 0;
    let unknown = 0;
    let totalCachedChannels = 0;
    let totalCachedEpgPrograms = 0;
    let totalCacheSizeBytes = 0;
    let totalActiveConnections = 0;
    let totalMaxConnections = 0;

    const providers = all.map((src) => {
      switch (src.connectionState.status) {
        case 'Connected':
          connected++;
          break;
        case 'Offline':
          offline++;
          break;
        case 'Authentication failed':
          authFailed++;
          break;
        case 'Refresh failed':
          refreshFailed++;
          break;
        case 'Connection limit reached':
          limitReached++;
          break;
        default:
          unknown++;
          break;
      }

      totalCachedChannels += src.cacheState.cachedChannelsCount;
      totalCachedEpgPrograms += src.cacheState.cachedEpgProgramsCount;
      totalCacheSizeBytes += src.cacheState.cacheSizeBytes;
      totalActiveConnections += src.connectionState.activeConnections;
      totalMaxConnections += src.connectionState.maxConnections;

      const decoupled = this.getDecoupledStatusReport(src.id);

      return {
        id: src.id,
        name: src.name,
        sourceType: src.sourceType,
        enabled: src.enabled,
        priority: src.priority,
        capabilities: src.capabilities,
        connectionState: src.connectionState,
        cacheState: src.cacheState,
        lastRefreshAttemptTs: src.lastRefreshAttemptTs,
        lastRefreshSuccessTs: src.lastRefreshSuccessTs,
        lastRefreshDurationMs: src.lastRefreshDurationMs,
        isRefreshing: src.isRefreshing,
        refreshError: src.refreshError,
        failedRefreshCount: src.failedRefreshCount,
        consecutiveSuccessCount: src.consecutiveSuccessCount,
        autoRefreshIntervalMins: src.autoRefreshIntervalMins,
        credentialsRedacted: {
          baseUrl: src.credentials.baseUrl,
          usernameMasked: src.credentials.username ? redact(src.credentials.username) : undefined,
          macMasked: src.credentials.macAddress ? redact(src.credentials.macAddress) : undefined,
          epgUrl: src.credentials.epgUrl,
        },
        decoupledStatus: decoupled,
      };
    });

    return {
      schemaVersion: '1.0.0-iptv-m37-m38',
      exportedAt: new Date().toISOString(),
      exportedAtUnix: Date.now(),
      summary: {
        totalProviders: all.length,
        connected,
        offline,
        authFailed,
        refreshFailed,
        limitReached,
        unknown,
        totalCachedChannels,
        totalCachedEpgPrograms,
        totalCacheSizeBytes,
        totalActiveConnections,
        totalMaxConnections,
        currentlyActiveRefreshes: all.filter((s) => s.isRefreshing).length,
      },
      providers,
    };
  }
}

export const globalSourceMonitorEngine = new SourceMonitorEngine();

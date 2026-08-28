/**
 * Milestone 29: Favorites and Watch History Engine
 * 
 * Features:
 * 1. Multi-source channel favoriting preserving sourceId.
 * 2. Cross-provider name collision isolation using composite keys (sourceId:::channelId).
 * 3. State persistence:
 *    - last watched channel
 *    - last watched source
 *    - recent channels (ordered, deduplicated)
 *    - playback position memory (for VOD, Catchup, Live offset)
 * 4. Source availability guard: Prevents automatic playback restoration if the source is unavailable.
 */

export interface SourceInfo {
  id: string;
  name: string;
  type: 'XTREAM' | 'M3U' | 'STALKER' | 'RF_TUNER' | 'CUSTOM';
  status: 'ACTIVE' | 'OFFLINE' | 'DISABLED' | 'AUTH_EXPIRED' | 'BANNED';
  baseUrl?: string;
  username?: string;
}

export interface FavoriteChannelItem {
  compositeKey: string; // `${sourceId}:::${channelId}`
  channelId: string | number;
  sourceId: string;
  sourceName: string;
  sourceType: string;
  channelName: string;
  category?: string;
  streamUrl: string;
  logo?: string;
  tvgId?: string;
  favoritedAt: number;
}

export interface RecentWatchItem {
  compositeKey: string;
  channelId: string | number;
  sourceId: string;
  sourceName: string;
  channelName: string;
  category?: string;
  streamUrl: string;
  logo?: string;
  lastWatchedAt: number;
  totalWatchDurationSeconds: number;
  tuneCount: number;
}

export type RecentChannelItem = RecentWatchItem;

export interface PlaybackPositionItem {
  mediaId: string; // channelId or vodId or catchupProgId
  compositeKey: string;
  sourceId: string;
  title: string;
  positionSeconds: number;
  durationSeconds: number;
  percentage: number;
  updatedAt: number;
}

export interface LastWatchedState {
  channelId: string | number;
  sourceId: string;
  sourceName: string;
  channelName: string;
  streamUrl: string;
  logo?: string;
  tunedAt: number;
}

export interface PlaybackRestoreResult {
  canRestore: boolean;
  reason?: string;
  lastWatched?: LastWatchedState | null;
  lastChannel?: LastWatchedState | null;
  source?: SourceInfo | null;
}

const FAVORITES_KEY = 'iptv_v2_favorites';
const RECENTS_KEY = 'iptv_v2_recents';
const POSITIONS_KEY = 'iptv_v2_playback_positions';
const LAST_WATCHED_KEY = 'iptv_v2_last_watched';
const LAST_SOURCE_KEY = 'iptv_v2_last_source';

export class FavoritesHistoryEngine {
  private static instance: FavoritesHistoryEngine | null = null;

  // In-memory data store
  private favorites: Map<string, FavoriteChannelItem> = new Map();
  private recentChannels: RecentWatchItem[] = [];
  private playbackPositions: Map<string, PlaybackPositionItem> = new Map();
  private lastWatchedChannel: LastWatchedState | null = null;
  private lastWatchedSourceId: string | null = null;

  // Registered sources registry for availability validation
  private sourcesRegistry: Map<string, SourceInfo> = new Map();

  private maxRecentsLimit = 50;
  private listeners: Set<() => void> = new Set();

  private constructor() {
    this.seedDefaultSources();
    this.loadFromStorage();
    if (this.favorites.size === 0) {
      this.seedInitialDemoData();
    }
  }

  public static getInstance(): FavoritesHistoryEngine {
    if (!FavoritesHistoryEngine.instance) {
      FavoritesHistoryEngine.instance = new FavoritesHistoryEngine();
    }
    return FavoritesHistoryEngine.instance;
  }

  /**
   * Helper to generate unique composite key preserving sourceId and channelId
   */
  public static makeCompositeKey(sourceId: string, channelId: string | number): string {
    return `${sourceId}:::${String(channelId)}`;
  }

  private seedDefaultSources(): void {
    const defaultSources: SourceInfo[] = [
      { id: 'src-xtream-01', name: 'UltraHD Xtream Gateway', type: 'XTREAM', status: 'ACTIVE', baseUrl: 'http://xtream.cdn-fast.io:8080' },
      { id: 'src-m3u-sports', name: 'Global Sports M3U Plus', type: 'M3U', status: 'ACTIVE', baseUrl: 'https://cdn.sports-live.tv/playlist.m3u' },
      { id: 'src-stalker-01', name: 'Nordic Stalker Portal', type: 'STALKER', status: 'ACTIVE', baseUrl: 'http://portal.nordic-iptv.net/c/' },
      { id: 'src-offline-backup', name: 'Legacy Satellite Feed (Offline)', type: 'RF_TUNER', status: 'OFFLINE' },
      { id: 'src-expired-tier', name: 'Premium Pass (Expired)', type: 'XTREAM', status: 'AUTH_EXPIRED' },
    ];

    for (const src of defaultSources) {
      this.sourcesRegistry.set(src.id, src);
    }
  }

  private seedInitialDemoData(): void {
    // Demo favorites from different sources
    this.addFavorite({
      channelId: '101',
      sourceId: 'src-xtream-01',
      sourceName: 'UltraHD Xtream Gateway',
      sourceType: 'XTREAM',
      channelName: 'Sky Sports Premier League',
      category: 'Sports',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
      tvgId: 'sky.sports.pl.uk',
    });

    // Provider Beta has a channel with the EXACT same name "Sky Sports Premier League" but different sourceId
    this.addFavorite({
      channelId: '904',
      sourceId: 'src-m3u-sports',
      sourceName: 'Global Sports M3U Plus',
      sourceType: 'M3U',
      channelName: 'Sky Sports Premier League',
      category: 'Sports',
      streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
      logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=120&auto=format&fit=crop&q=80',
      tvgId: 'sky.sports.pl.m3u',
    });

    this.addFavorite({
      channelId: '202',
      sourceId: 'src-stalker-01',
      sourceName: 'Nordic Stalker Portal',
      sourceType: 'STALKER',
      channelName: 'HBO Max Cinema 4K',
      category: 'Movies',
      streamUrl: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
      logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&auto=format&fit=crop&q=80',
      tvgId: 'hbo.cinema.hd',
    });

    // Initial Last Watched
    this.lastWatchedChannel = {
      channelId: '101',
      sourceId: 'src-xtream-01',
      sourceName: 'UltraHD Xtream Gateway',
      channelName: 'Sky Sports Premier League',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
      tunedAt: Date.now() - 360000,
    };
    this.lastWatchedSourceId = 'src-xtream-01';

    // Initial Recents
    this.recordChannelWatch({
      channelId: '101',
      sourceId: 'src-xtream-01',
      sourceName: 'UltraHD Xtream Gateway',
      channelName: 'Sky Sports Premier League',
      category: 'Sports',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=80',
      durationSeconds: 120,
    });

    this.recordChannelWatch({
      channelId: '904',
      sourceId: 'src-m3u-sports',
      sourceName: 'Global Sports M3U Plus',
      channelName: 'Sky Sports Premier League',
      category: 'Sports',
      streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
      logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=120&auto=format&fit=crop&q=80',
      durationSeconds: 95,
    });

    // Playback Position for VOD/Catchup
    this.savePlaybackPosition({
      mediaId: 'vod-oppenheimer-2023',
      sourceId: 'src-xtream-01',
      title: 'Oppenheimer (2023) [4K HDR]',
      positionSeconds: 4320,
      durationSeconds: 10800,
    });
  }

  // =========================================================================
  // SOURCE MANAGEMENT & AVAILABILITY
  // =========================================================================

  public registerSource(source: SourceInfo): void {
    this.sourcesRegistry.set(source.id, source);
    this.notify();
  }

  public setSourceStatus(sourceId: string, status: SourceInfo['status']): void {
    const src = this.sourcesRegistry.get(sourceId);
    if (src) {
      src.status = status;
      this.notify();
    }
  }

  public getSource(sourceId: string): SourceInfo | undefined {
    return this.sourcesRegistry.get(sourceId);
  }

  public getAllSources(): SourceInfo[] {
    return Array.from(this.sourcesRegistry.values());
  }

  public isSourceAvailable(sourceId: string): boolean {
    const src = this.sourcesRegistry.get(sourceId);
    return !!src && src.status === 'ACTIVE';
  }

  // =========================================================================
  // FAVORITES (Preserves Source ID & Disambiguates Same Names)
  // =========================================================================

  public isFavorite(sourceId: string, channelId: string | number): boolean {
    const key = FavoritesHistoryEngine.makeCompositeKey(sourceId, channelId);
    return this.favorites.has(key);
  }

  public addFavorite(item: {
    channelId: string | number;
    sourceId: string;
    sourceName: string;
    sourceType: string;
    channelName: string;
    category?: string;
    streamUrl: string;
    logo?: string;
    tvgId?: string;
  }): FavoriteChannelItem {
    const key = FavoritesHistoryEngine.makeCompositeKey(item.sourceId, item.channelId);
    const favoriteItem: FavoriteChannelItem = {
      compositeKey: key,
      channelId: item.channelId,
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      sourceType: item.sourceType,
      channelName: item.channelName,
      category: item.category || 'General',
      streamUrl: item.streamUrl,
      logo: item.logo,
      tvgId: item.tvgId,
      favoritedAt: Date.now(),
    };

    this.favorites.set(key, favoriteItem);
    this.persistToStorage();
    this.notify();
    return favoriteItem;
  }

  public removeFavorite(sourceId: string, channelId: string | number): boolean {
    const key = FavoritesHistoryEngine.makeCompositeKey(sourceId, channelId);
    const existed = this.favorites.delete(key);
    if (existed) {
      this.persistToStorage();
      this.notify();
    }
    return existed;
  }

  public toggleFavorite(item: {
    channelId: string | number;
    sourceId: string;
    sourceName: string;
    sourceType: string;
    channelName: string;
    category?: string;
    streamUrl: string;
    logo?: string;
    tvgId?: string;
  }): boolean {
    const key = FavoritesHistoryEngine.makeCompositeKey(item.sourceId, item.channelId);
    if (this.favorites.has(key)) {
      this.removeFavorite(item.sourceId, item.channelId);
      return false; // Removed
    } else {
      this.addFavorite(item);
      return true; // Added
    }
  }

  public getFavorites(sourceIdFilter?: string): FavoriteChannelItem[] {
    const all = Array.from(this.favorites.values()).sort((a, b) => b.favoritedAt - a.favoritedAt);
    if (sourceIdFilter && sourceIdFilter !== 'ALL') {
      return all.filter((f) => f.sourceId === sourceIdFilter);
    }
    return all;
  }

  // =========================================================================
  // WATCH HISTORY & RECENT CHANNELS
  // =========================================================================

  public recordChannelWatch(item: {
    channelId: string | number;
    sourceId: string;
    sourceName: string;
    channelName: string;
    category?: string;
    streamUrl?: string;
    logo?: string;
    durationSeconds?: number;
  }): RecentWatchItem {
    const key = FavoritesHistoryEngine.makeCompositeKey(item.sourceId, item.channelId);
    const now = Date.now();
    const duration = item.durationSeconds || 0;
    const stream = item.streamUrl || '';

    // Update Last Watched State
    this.lastWatchedChannel = {
      channelId: item.channelId,
      sourceId: item.sourceId,
      sourceName: item.sourceName,
      channelName: item.channelName,
      streamUrl: stream,
      logo: item.logo,
      tunedAt: now,
    };
    this.lastWatchedSourceId = item.sourceId;

    // Update Recents list (move to front, update duration & tune count)
    const existingIndex = this.recentChannels.findIndex((r) => r.compositeKey === key);
    let recentItem: RecentWatchItem;

    if (existingIndex !== -1) {
      const existing = this.recentChannels[existingIndex];
      recentItem = {
        ...existing,
        channelName: item.channelName,
        category: item.category || existing.category,
        streamUrl: stream || existing.streamUrl,
        logo: item.logo || existing.logo,
        lastWatchedAt: now,
        totalWatchDurationSeconds: existing.totalWatchDurationSeconds + duration,
        tuneCount: existing.tuneCount + 1,
      };
      this.recentChannels.splice(existingIndex, 1);
    } else {
      recentItem = {
        compositeKey: key,
        channelId: item.channelId,
        sourceId: item.sourceId,
        sourceName: item.sourceName,
        channelName: item.channelName,
        category: item.category || 'General',
        streamUrl: stream,
        logo: item.logo,
        lastWatchedAt: now,
        totalWatchDurationSeconds: duration,
        tuneCount: 1,
      };
    }

    // Insert at front
    this.recentChannels.unshift(recentItem);

    // Enforce max recents cap
    if (this.recentChannels.length > this.maxRecentsLimit) {
      this.recentChannels = this.recentChannels.slice(0, this.maxRecentsLimit);
    }

    this.persistToStorage();
    this.notify();
    return recentItem;
  }

  public getRecentChannels(sourceIdFilter?: string): RecentWatchItem[] {
    if (sourceIdFilter && sourceIdFilter !== 'ALL') {
      return this.recentChannels.filter((r) => r.sourceId === sourceIdFilter);
    }
    return [...this.recentChannels];
  }

  public clearRecentChannels(): void {
    this.recentChannels = [];
    this.persistToStorage();
    this.notify();
  }

  public clearHistory(): void {
    this.clearRecentChannels();
  }

  public getLastWatchedChannel(): LastWatchedState | null {
    return this.lastWatchedChannel ? { ...this.lastWatchedChannel } : null;
  }

  public getLastWatchedSourceId(): string | null {
    return this.lastWatchedSourceId;
  }

  // =========================================================================
  // PLAYBACK POSITION MEMORY (VOD, Catchup, Offset Resumption)
  // =========================================================================

  public savePlaybackPosition(item: {
    mediaId: string;
    sourceId: string;
    title: string;
    positionSeconds: number;
    durationSeconds: number;
  }): PlaybackPositionItem {
    const compositeKey = FavoritesHistoryEngine.makeCompositeKey(item.sourceId, item.mediaId);
    const duration = Math.max(1, item.durationSeconds);
    const pos = Math.max(0, Math.min(item.positionSeconds, duration));
    const pct = Math.round((pos / duration) * 100);

    const posItem: PlaybackPositionItem = {
      mediaId: item.mediaId,
      compositeKey,
      sourceId: item.sourceId,
      title: item.title,
      positionSeconds: pos,
      durationSeconds: duration,
      percentage: pct,
      updatedAt: Date.now(),
    };

    this.playbackPositions.set(compositeKey, posItem);
    this.persistToStorage();
    this.notify();
    return posItem;
  }

  public getPlaybackPosition(sourceId: string, mediaId: string): PlaybackPositionItem | null {
    const compositeKey = FavoritesHistoryEngine.makeCompositeKey(sourceId, mediaId);
    return this.playbackPositions.get(compositeKey) || null;
  }

  public getAllPlaybackPositions(): PlaybackPositionItem[] {
    return Array.from(this.playbackPositions.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public clearPlaybackPosition(sourceId: string, mediaId: string): void {
    const compositeKey = FavoritesHistoryEngine.makeCompositeKey(sourceId, mediaId);
    this.playbackPositions.delete(compositeKey);
    this.persistToStorage();
    this.notify();
  }

  // =========================================================================
  // PLAYBACK RESTORATION SAFETY GUARD
  // Requirement: Do not restore playback automatically if the provider/source is unavailable.
  // =========================================================================

  public evaluatePlaybackRestoration(): PlaybackRestoreResult {
    if (!this.lastWatchedChannel) {
      return {
        canRestore: false,
        reason: 'No previous playback session found.',
        lastWatched: null,
        lastChannel: null,
      };
    }

    const source = this.sourcesRegistry.get(this.lastWatchedChannel.sourceId);

    if (!source) {
      return {
        canRestore: false,
        reason: `Source "${this.lastWatchedChannel.sourceId}" is no longer configured in the provider matrix.`,
        lastWatched: this.lastWatchedChannel,
        lastChannel: this.lastWatchedChannel,
        source: null,
      };
    }

    if (source.status !== 'ACTIVE') {
      return {
        canRestore: false,
        reason: `Source "${source.name}" is currently unavailable (Status: ${source.status}). Auto-restoration blocked to prevent error loop.`,
        lastWatched: this.lastWatchedChannel,
        lastChannel: this.lastWatchedChannel,
        source,
      };
    }

    return {
      canRestore: true,
      reason: `Source "${source.name}" is verified online and active. Safe to restore playback.`,
      lastWatched: this.lastWatchedChannel,
      lastChannel: this.lastWatchedChannel,
      source,
    };
  }

  // =========================================================================
  // PERSISTENCE & SUBSCRIPTION
  // =========================================================================

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[FavoritesHistoryEngine] Listener error:', err);
      }
    }
  }

  private persistToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const favArr = Array.from(this.favorites.values());
        window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favArr));
        window.localStorage.setItem(RECENTS_KEY, JSON.stringify(this.recentChannels));
        
        const posArr = Array.from(this.playbackPositions.values());
        window.localStorage.setItem(POSITIONS_KEY, JSON.stringify(posArr));

        if (this.lastWatchedChannel) {
          window.localStorage.setItem(LAST_WATCHED_KEY, JSON.stringify(this.lastWatchedChannel));
        }
        if (this.lastWatchedSourceId) {
          window.localStorage.setItem(LAST_SOURCE_KEY, this.lastWatchedSourceId);
        }
      }
    } catch {
      // Storage unavailable or quota exceeded
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const favRaw = window.localStorage.getItem(FAVORITES_KEY);
        if (favRaw) {
          const arr: FavoriteChannelItem[] = JSON.parse(favRaw);
          for (const item of arr) {
            this.favorites.set(item.compositeKey, item);
          }
        }

        const recRaw = window.localStorage.getItem(RECENTS_KEY);
        if (recRaw) {
          this.recentChannels = JSON.parse(recRaw);
        }

        const posRaw = window.localStorage.getItem(POSITIONS_KEY);
        if (posRaw) {
          const arr: PlaybackPositionItem[] = JSON.parse(posRaw);
          for (const item of arr) {
            this.playbackPositions.set(item.compositeKey, item);
          }
        }

        const lastRaw = window.localStorage.getItem(LAST_WATCHED_KEY);
        if (lastRaw) {
          this.lastWatchedChannel = JSON.parse(lastRaw);
        }

        const lastSrc = window.localStorage.getItem(LAST_SOURCE_KEY);
        if (lastSrc) {
          this.lastWatchedSourceId = lastSrc;
        }
      }
    } catch {
      // Ignore corrupted localStorage
    }
  }
}

export const globalFavoritesHistoryEngine = FavoritesHistoryEngine.getInstance();

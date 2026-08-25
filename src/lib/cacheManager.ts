/**
 * Milestone 1 Cache Manager: Cache-First Storage Engine
 * Provides instant startup from local indexed storage, background refresh tracking (>=6h TTL),
 * and CRITICAL Empty-Overwrite Protection to prevent panel glitches from wiping valid catalogs.
 */

import { UnifiedCategory, UnifiedChannel, UnifiedAccountInfo, CacheMetadata, SourceType } from './models';

export interface CachedCatalogData {
  account: UnifiedAccountInfo | null;
  categories: UnifiedCategory[];
  channels: UnifiedChannel[];
  metadata: CacheMetadata;
}

const STORAGE_PREFIX = 'iptv_cache_v1_';
const DEFAULT_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export class CacheManager {
  private memoryStore: Map<string, CachedCatalogData> = new Map();

  /**
   * Generates a unique cache key for a source.
   */
  public getCacheKey(sourceType: SourceType, identifier: string): string {
    return `${STORAGE_PREFIX}${sourceType}_${identifier.replace(/[^a-zA-Z0-9_]/g, '_')}`;
  }

  /**
   * Retrieves data instantly from cache (memory or local storage).
   */
  public getCachedCatalog(key: string): CachedCatalogData | null {
    // 1. Check memory store
    if (this.memoryStore.has(key)) {
      const data = this.memoryStore.get(key)!;
      data.metadata.isStale = this.isDataStale(data.metadata.lastFetchedAt, data.metadata.ttlSeconds);
      return data;
    }

    // 2. Check localStorage (if in browser)
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const serialized = window.localStorage.getItem(key);
        if (serialized) {
          const parsed = JSON.parse(serialized) as CachedCatalogData;
          parsed.metadata.isStale = this.isDataStale(parsed.metadata.lastFetchedAt, parsed.metadata.ttlSeconds);
          this.memoryStore.set(key, parsed);
          return parsed;
        }
      } catch (err) {
        console.warn(`[CacheManager] Failed to read ${key} from localStorage:`, err);
      }
    }

    return null;
  }

  /**
   * Evaluates staleness based on last fetched timestamp and TTL.
   */
  public isDataStale(lastFetchedAt: string, ttlSeconds: number = 21600): boolean {
    if (!lastFetchedAt) return true;
    const fetchTime = new Date(lastFetchedAt).getTime();
    const now = Date.now();
    return now - fetchTime >= ttlSeconds * 1000;
  }

  /**
   * Saves catalog data with EMPTY-OVERWRITE PROTECTION.
   * If existing cache has valid items and the new incoming payload has 0 channels,
   * the overwrite is rejected, existing cache is preserved, and a warning is logged.
   */
  public saveCatalog(
    key: string,
    sourceType: SourceType,
    incoming: {
      account: UnifiedAccountInfo | null;
      categories: UnifiedCategory[];
      channels: UnifiedChannel[];
    },
    ttlSeconds: number = 21600
  ): { saved: boolean; emptyOverwriteBlocked: boolean; message: string } {
    const existing = this.getCachedCatalog(key);

    // CRITICAL: Empty-Overwrite Guard
    if (
      existing &&
      existing.channels.length > 0 &&
      (!incoming.channels || incoming.channels.length === 0)
    ) {
      const warningMsg = `[CacheManager] Blocked empty overwrite attempt! Preserved ${existing.channels.length} cached channels.`;
      console.warn(warningMsg);
      existing.metadata.emptyOverwritePrevented = true;
      this.memoryStore.set(key, existing);
      return {
        saved: false,
        emptyOverwriteBlocked: true,
        message: warningMsg,
      };
    }

    const metadata: CacheMetadata = {
      key,
      sourceType,
      lastFetchedAt: new Date().toISOString(),
      ttlSeconds,
      itemCount: incoming.channels.length,
      isStale: false,
      emptyOverwritePrevented: false,
    };

    const record: CachedCatalogData = {
      account: incoming.account,
      categories: incoming.categories,
      channels: incoming.channels,
      metadata,
    };

    // Save to memory
    this.memoryStore.set(key, record);

    // Save to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, JSON.stringify(record));
      } catch (err) {
        console.warn(`[CacheManager] Failed to persist ${key} to localStorage:`, err);
      }
    }

    return {
      saved: true,
      emptyOverwriteBlocked: false,
      message: `Cached ${incoming.channels.length} channels and ${incoming.categories.length} categories.`,
    };
  }

  /**
   * Purges a specific key or entire cache.
   */
  public clear(key?: string): void {
    if (key) {
      this.memoryStore.delete(key);
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } else {
      this.memoryStore.clear();
      if (typeof window !== 'undefined' && window.localStorage) {
        Object.keys(window.localStorage)
          .filter((k) => k.startsWith(STORAGE_PREFIX))
          .forEach((k) => window.localStorage.removeItem(k));
      }
    }
  }
}

export const globalCacheManager = new CacheManager();

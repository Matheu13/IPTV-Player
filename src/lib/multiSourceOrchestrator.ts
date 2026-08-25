/**
 * Unified Multi-Source Matrix & Cross-Platform Orchestrator (Milestone 9)
 * - Manages concurrent Xtream Codes, M3U Playlists, and Stalker MAG sources
 * - Isolated per-source refresh cycles, connection concurrency pools, and error states
 * - Unified Global Search and Cross-Source Favorites Aggregator
 * - Strict zero-cross-contamination data models
 */

import { StalkerPortalAdapter, StalkerConfig } from './stalkerClient';
import { redact } from './redact';

export interface ChannelItem {
  id: string | number;
  number?: number;
  name: string;
  streamUrl?: string;
  category?: string;
  logoUrl?: string;
}

export interface UnifiedSourceState {
  sourceId: string;
  sourceType: 'XTREAM' | 'M3U' | 'STALKER';
  name: string;
  enabled: boolean;
  status: 'ONLINE' | 'REFRESHING' | 'ERROR' | 'OFFLINE';
  channelCount: number;
  lastSyncedAt: number;
  maxConcurrentConnections: number;
  activeConnections: number;
  stalkerAdapter?: StalkerPortalAdapter;
  errorMessage?: string;
}

export class MultiSourceOrchestrator {
  private sources: Map<string, UnifiedSourceState> = new Map();
  private unifiedChannels: Map<string, ChannelItem & { sourceId: string; sourceType: string }> = new Map();
  private favorites: Set<string> = new Set(); // composite channel keys: `sourceId:channelId`

  constructor() {
    this.setupDefaultSources();
  }

  private setupDefaultSources(): void {
    // 1. Primary Xtream Source
    this.sources.set('src_xtream_prime', {
      sourceId: 'src_xtream_prime',
      sourceType: 'XTREAM',
      name: 'Ultra Xtream Premium',
      enabled: true,
      status: 'ONLINE',
      channelCount: 154,
      lastSyncedAt: Date.now() - 1000 * 60 * 15,
      maxConcurrentConnections: 2,
      activeConnections: 1,
    });

    // 2. Secondary M3U Backup Playlist
    this.sources.set('src_m3u_backup', {
      sourceId: 'src_m3u_backup',
      sourceType: 'M3U',
      name: 'Global Sports M3U8',
      enabled: true,
      status: 'ONLINE',
      channelCount: 88,
      lastSyncedAt: Date.now() - 1000 * 60 * 45,
      maxConcurrentConnections: 5,
      activeConnections: 0,
    });

    // 3. Stalker / MAG Authorized Portal Source
    const stalkerAdapter = new StalkerPortalAdapter({
      sourceId: 'src_stalker_mag',
      portalUrl: 'http://mag.portal.example.com/server/load.php',
      macAddress: '00:1A:79:B8:21:44',
      deviceModel: 'MAG322',
    });

    this.sources.set('src_stalker_mag', {
      sourceId: 'src_stalker_mag',
      sourceType: 'STALKER',
      name: 'Authorized Stalker IPTV Portal',
      enabled: true,
      status: 'ONLINE',
      channelCount: 96,
      lastSyncedAt: Date.now() - 1000 * 60 * 5,
      maxConcurrentConnections: 1,
      activeConnections: 0,
      stalkerAdapter,
    });
  }

  public getAllSources(): UnifiedSourceState[] {
    return Array.from(this.sources.values());
  }

  public getSource(sourceId: string): UnifiedSourceState | undefined {
    return this.sources.get(sourceId);
  }

  public toggleSourceEnabled(sourceId: string): boolean {
    const src = this.sources.get(sourceId);
    if (!src) return false;
    src.enabled = !src.enabled;
    return src.enabled;
  }

  public registerChannel(sourceId: string, channel: ChannelItem): void {
    const src = this.sources.get(sourceId);
    if (!src) return;

    const compositeKey = `${sourceId}:${channel.id}`;
    this.unifiedChannels.set(compositeKey, {
      ...channel,
      sourceId,
      sourceType: src.sourceType,
    });
  }

  public getUnifiedChannels(): (ChannelItem & { sourceId: string; sourceType: string })[] {
    return Array.from(this.unifiedChannels.values()).filter((ch) => {
      const src = this.sources.get(ch.sourceId);
      return src && src.enabled;
    });
  }

  public searchChannels(query: string): (ChannelItem & { sourceId: string; sourceType: string })[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getUnifiedChannels();

    return this.getUnifiedChannels().filter(
      (ch) =>
        ch.name.toLowerCase().includes(q) ||
        (ch.category && ch.category.toLowerCase().includes(q)) ||
        (ch.number && String(ch.number).includes(q))
    );
  }

  public toggleFavorite(compositeKey: string): boolean {
    if (this.favorites.has(compositeKey)) {
      this.favorites.delete(compositeKey);
      return false;
    } else {
      this.favorites.add(compositeKey);
      return true;
    }
  }

  public isFavorite(compositeKey: string): boolean {
    return this.favorites.has(compositeKey);
  }

  public getFavoriteChannels(): (ChannelItem & { sourceId: string; sourceType: string })[] {
    return Array.from(this.unifiedChannels.entries())
      .filter(([key]) => this.favorites.has(key))
      .map(([_, ch]) => ch);
  }

  public checkCanTune(sourceId: string): { allowed: boolean; reason?: string } {
    const src = this.sources.get(sourceId);
    if (!src) return { allowed: false, reason: 'Source does not exist' };
    if (!src.enabled) return { allowed: false, reason: 'Source is currently disabled' };
    if (src.activeConnections >= src.maxConcurrentConnections) {
      return {
        allowed: false,
        reason: `Max concurrency limit reached (${src.activeConnections}/${src.maxConcurrentConnections}) for ${src.name}`,
      };
    }
    return { allowed: true };
  }
}

export const multiSourceOrchestrator = new MultiSourceOrchestrator();

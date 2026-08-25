/**
 * Milestone 3c: Channel Management, Favorites, Custom Bouquets, Hiding & 10-Foot Remote Navigation
 */

import { CustomBouquet, ChannelOverrideMapping, UnifiedChannel } from './models';

const FAVORITES_STORAGE_KEY = 'iptv_player_favorites_v1';
const BOUQUETS_STORAGE_KEY = 'iptv_player_bouquets_v1';
const OVERRIDES_STORAGE_KEY = 'iptv_player_overrides_v1';

// In-memory fallbacks
let inMemoryFavorites: (string | number)[] = ['10452', 8801, 9101];
let inMemoryBouquets: CustomBouquet[] = [
  {
    id: 'fav-sports',
    name: '🔥 Favorite Sports & News',
    description: 'Quick access live games and global news',
    channelIds: ['10452', '10453'],
    createdAt: Date.now() - 86400000,
    isDefault: true,
  },
];
let inMemoryOverrides: Record<string, ChannelOverrideMapping> = {};

export class ChannelManager {
  // -------------------------------------------------------------
  // FAVORITES
  // -------------------------------------------------------------
  public static getFavorites(): (string | number)[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return inMemoryFavorites;
  }

  public static isFavorite(id: string | number): boolean {
    const list = this.getFavorites();
    const strId = String(id);
    return list.some((item) => String(item) === strId);
  }

  public static toggleFavorite(id: string | number): boolean {
    const list = this.getFavorites();
    const strId = String(id);
    let updated: (string | number)[];
    const exists = list.some((item) => String(item) === strId);

    if (exists) {
      updated = list.filter((item) => String(item) !== strId);
    } else {
      updated = [...list, id];
    }

    inMemoryFavorites = updated;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}
    return !exists;
  }

  // -------------------------------------------------------------
  // CUSTOM BOUQUETS
  // -------------------------------------------------------------
  public static getBouquets(): CustomBouquet[] {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(BOUQUETS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return inMemoryBouquets;
  }

  public static createBouquet(name: string, description?: string, initialChannelIds: (string | number)[] = []): CustomBouquet {
    const list = this.getBouquets();
    const newBouquet: CustomBouquet = {
      id: `bouquet_${Date.now()}`,
      name: name.trim(),
      description: description?.trim(),
      channelIds: initialChannelIds,
      createdAt: Date.now(),
    };

    const updated = [...list, newBouquet];
    inMemoryBouquets = updated;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(BOUQUETS_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}
    return newBouquet;
  }

  public static deleteBouquet(id: string): void {
    const list = this.getBouquets();
    const updated = list.filter((b) => b.id !== id);
    inMemoryBouquets = updated;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(BOUQUETS_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}
  }

  public static addChannelToBouquet(bouquetId: string, channelId: string | number): void {
    const list = this.getBouquets();
    const b = list.find((item) => item.id === bouquetId);
    if (!b) return;

    if (!b.channelIds.some((id) => String(id) === String(channelId))) {
      b.channelIds.push(channelId);
      inMemoryBouquets = list;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(BOUQUETS_STORAGE_KEY, JSON.stringify(list));
        }
      } catch {}
    }
  }

  public static removeChannelFromBouquet(bouquetId: string, channelId: string | number): void {
    const list = this.getBouquets();
    const b = list.find((item) => item.id === bouquetId);
    if (!b) return;

    b.channelIds = b.channelIds.filter((id) => String(id) !== String(channelId));
    inMemoryBouquets = list;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(BOUQUETS_STORAGE_KEY, JSON.stringify(list));
      }
    } catch {}
  }

  // -------------------------------------------------------------
  // CHANNEL OVERRIDES & HIDING
  // -------------------------------------------------------------
  public static getOverrides(): Record<string, ChannelOverrideMapping> {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(OVERRIDES_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return inMemoryOverrides;
  }

  public static setChannelHidden(channelId: string | number, hidden: boolean): void {
    const all = this.getOverrides();
    const key = String(channelId);
    if (!all[key]) {
      all[key] = { channelId, hidden, favorite: false };
    } else {
      all[key].hidden = hidden;
    }
    inMemoryOverrides = all;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(all));
      }
    } catch {}
  }

  public static setChannelCustomNumber(channelId: string | number, num: number): void {
    const all = this.getOverrides();
    const key = String(channelId);
    if (!all[key]) {
      all[key] = { channelId, hidden: false, favorite: false, customNumber: num };
    } else {
      all[key].customNumber = num;
    }
    inMemoryOverrides = all;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(OVERRIDES_STORAGE_KEY, JSON.stringify(all));
      }
    } catch {}
  }

  /**
   * Applies user overrides and favorites to a raw channel list
   */
  public static applyOverrides(channels: UnifiedChannel[]): UnifiedChannel[] {
    const favs = new Set(this.getFavorites().map(String));
    const overrides = this.getOverrides();

    return channels.map((ch) => {
      const idStr = String(ch.streamId || ch.id);
      const ovr = overrides[idStr];
      return {
        ...ch,
        isFavorite: favs.has(idStr),
        isHidden: ovr?.hidden || false,
        num: ovr?.customNumber !== undefined ? ovr.customNumber : ch.num,
        name: ovr?.customName || ch.name,
      };
    });
  }
}

/**
 * 10-Foot UI & Fast Zapping Engine
 * Manages numeric keypad buffer and debounced channel switching
 */
export class RemoteZapperController {
  private digitBuffer: string = '';
  private digitTimeout: NodeJS.Timeout | null = null;
  private zapDebounceTimeout: NodeJS.Timeout | null = null;

  private onDigitCommitted: (channelNumber: number) => void;
  private onZappedChannel: (step: number) => void;

  constructor(callbacks: {
    onDigitCommitted: (channelNumber: number) => void;
    onZappedChannel: (step: number) => void;
  }) {
    this.onDigitCommitted = callbacks.onDigitCommitted;
    this.onZappedChannel = callbacks.onZappedChannel;
  }

  public inputDigit(digit: string | number): string {
    const char = String(digit);
    if (!/^\d$/.test(char)) return this.digitBuffer;

    if (this.digitTimeout) {
      clearTimeout(this.digitTimeout);
    }

    // Limit digit buffer to 4 digits max
    if (this.digitBuffer.length < 4) {
      this.digitBuffer += char;
    }

    // Commit after 1.2s of inactivity
    this.digitTimeout = setTimeout(() => {
      this.commitDigits();
    }, 1200);

    return this.digitBuffer;
  }

  public commitDigits(): number | null {
    if (this.digitTimeout) {
      clearTimeout(this.digitTimeout);
      this.digitTimeout = null;
    }

    if (!this.digitBuffer) return null;
    const num = parseInt(this.digitBuffer, 10);
    this.digitBuffer = '';
    if (!isNaN(num)) {
      this.onDigitCommitted(num);
      return num;
    }
    return null;
  }

  public getPendingDigits(): string {
    return this.digitBuffer;
  }

  public stepChannel(delta: number): void {
    if (this.zapDebounceTimeout) {
      clearTimeout(this.zapDebounceTimeout);
    }

    this.zapDebounceTimeout = setTimeout(() => {
      this.onZappedChannel(delta);
    }, 250); // 250ms debounce for high-speed channel surfing without network floods
  }

  public destroy(): void {
    if (this.digitTimeout) clearTimeout(this.digitTimeout);
    if (this.zapDebounceTimeout) clearTimeout(this.zapDebounceTimeout);
  }
}

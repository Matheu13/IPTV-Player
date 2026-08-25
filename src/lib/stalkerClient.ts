/**
 * Authorized Stalker / MAG Portal Provider Adapter
 * Implements Stalker Middleware API protocol (v4.x / v5.x):
 * - Handshake & Session Token Negotiation
 * - Device Profile & Authorization Validation
 * - Genres / Categories Ingest
 * - Live ITV Stream Ordering & Pagination
 * - Cmd Link Resolution (ffmpeg / direct TS)
 * - Safe Credential & MAC Redaction
 */

import { redact } from './redact';

export interface StalkerConfig {
  sourceId: string;
  portalUrl: string; // e.g. "http://portal.example.com/server/load.php" or "http://portal.example.com/c/"
  macAddress: string; // Authorized device MAC e.g. "00:1A:79:XX:XX:XX"
  serialNumber?: string;
  deviceModel?: string;
  timezone?: string;
}

export interface StalkerSession {
  token: string | null;
  random: string | null;
  expiresAt: number;
  userId?: string;
  maxConnections?: number;
  status: 'UNAUTHENTICATED' | 'AUTHENTICATED' | 'EXPIRED' | 'ERROR';
}

export interface StalkerGenre {
  id: string;
  title: string;
  alias?: string;
  censored?: number;
}

export interface StalkerChannel {
  id: string;
  number: number;
  name: string;
  genreId: string;
  logoUrl?: string;
  cmd: string; // e.g. "ffmpeg http://..." or "ffrt http://..."
  tvgId?: string;
  hasArchive?: boolean; // Timeshift / Catchup support
  archiveDurationHours?: number;
}

export class StalkerPortalAdapter {
  private config: StalkerConfig;
  private session: StalkerSession = {
    token: null,
    random: null,
    expiresAt: 0,
    status: 'UNAUTHENTICATED',
  };

  constructor(config: StalkerConfig) {
    this.config = {
      ...config,
      deviceModel: config.deviceModel || 'MAG254',
      timezone: config.timezone || 'UTC',
    };
  }

  public getSession(): StalkerSession {
    return { ...this.session };
  }

  /**
   * Normalizes the portal endpoint URL to point to load.php
   */
  public getNormalizedEndpoint(): string {
    let url = this.config.portalUrl.trim();
    if (!url.endsWith('load.php')) {
      if (url.endsWith('/c/') || url.endsWith('/c')) {
        url = url.replace(/\/c\/?$/, '/server/load.php');
      } else if (url.endsWith('/')) {
        url += 'server/load.php';
      } else {
        url += '/server/load.php';
      }
    }
    return url;
  }

  /**
   * Builds request headers with MAC address cookie and authorized user agent
   */
  public getRequestHeaders(): Record<string, string> {
    const cookies = [`mac=${encodeURIComponent(this.config.macAddress)}`];
    if (this.session.token) {
      cookies.push(`stb_lang=en`, `timezone=${encodeURIComponent(this.config.timezone || 'UTC')}`);
    }

    return {
      'User-Agent': `Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 250 Safari/533.3`,
      'Cookie': cookies.join('; '),
      'Authorization': this.session.token ? `Bearer ${this.session.token}` : '',
      'X-User-Agent': `Model: ${this.config.deviceModel}; Link: Ethernet`,
      'Accept': '*/*',
    };
  }

  /**
   * Step 1: Handshake (Obtain initial random salt and token)
   */
  public async performHandshake(): Promise<{ success: boolean; token?: string; random?: string; error?: string }> {
    try {
      const endpoint = `${this.getNormalizedEndpoint()}?type=stb&action=handshake&JsHttpRequest=1-xml`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getRequestHeaders(),
      });

      if (!response.ok) {
        this.session.status = 'ERROR';
        return { success: false, error: `Handshake HTTP error: ${response.status}` };
      }

      const data = await response.json();
      const jsResponse = data?.js;

      if (!jsResponse || !jsResponse.token) {
        this.session.status = 'ERROR';
        return { success: false, error: 'Handshake response missing session token' };
      }

      this.session.token = jsResponse.token;
      this.session.random = jsResponse.random || null;
      this.session.expiresAt = Date.now() + 1000 * 60 * 60 * 4; // 4 hours
      this.session.status = 'AUTHENTICATED';

      return {
        success: true,
        token: this.session.token,
        random: this.session.random || undefined,
      };
    } catch (err: any) {
      this.session.status = 'ERROR';
      return { success: false, error: redact(err.message) };
    }
  }

  /**
   * Step 2: Validate Account Profile
   */
  public async getProfile(): Promise<{ success: boolean; profile?: any; error?: string }> {
    if (!this.session.token) {
      const handshake = await this.performHandshake();
      if (!handshake.success) return { success: false, error: handshake.error };
    }

    try {
      const endpoint = `${this.getNormalizedEndpoint()}?type=stb&action=get_profile&JsHttpRequest=1-xml`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getRequestHeaders(),
      });

      if (!response.ok) {
        return { success: false, error: `Profile HTTP error: ${response.status}` };
      }

      const data = await response.json();
      const profile = data?.js;

      return {
        success: true,
        profile: {
          id: profile?.id,
          name: profile?.name || 'Authorized Stalker User',
          phone: profile?.phone ? redact(profile.phone) : undefined,
          status: profile?.status === 1 ? 'ACTIVE' : 'INACTIVE',
          maxConnections: profile?.max_connections || 1,
        },
      };
    } catch (err: any) {
      return { success: false, error: redact(err.message) };
    }
  }

  /**
   * Step 3: Fetch ITV Genres
   */
  public async getGenres(): Promise<{ success: boolean; genres: StalkerGenre[]; error?: string }> {
    if (!this.session.token) {
      const handshake = await this.performHandshake();
      if (!handshake.success) return { success: false, genres: [], error: handshake.error };
    }

    try {
      const endpoint = `${this.getNormalizedEndpoint()}?type=itv&action=get_genres&JsHttpRequest=1-xml`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getRequestHeaders(),
      });

      if (!response.ok) {
        return { success: false, genres: [], error: `Genres HTTP error: ${response.status}` };
      }

      const data = await response.json();
      const rawGenres = Array.isArray(data?.js) ? data.js : [];

      const genres: StalkerGenre[] = rawGenres.map((g: any) => ({
        id: String(g.id),
        title: g.title || 'Uncategorized',
        alias: g.alias,
        censored: g.censored || 0,
      }));

      return { success: true, genres };
    } catch (err: any) {
      return { success: false, genres: [], error: redact(err.message) };
    }
  }

  /**
   * Step 4: Fetch Live ITV Channels (get_ordered_list)
   */
  public async getChannels(genreId = '*', page = 1): Promise<{
    success: boolean;
    channels: StalkerChannel[];
    totalItems: number;
    maxPageItems: number;
    error?: string;
  }> {
    if (!this.session.token) {
      const handshake = await this.performHandshake();
      if (!handshake.success) {
        return { success: false, channels: [], totalItems: 0, maxPageItems: 0, error: handshake.error };
      }
    }

    try {
      const endpoint = `${this.getNormalizedEndpoint()}?type=itv&action=get_ordered_list&genre=${encodeURIComponent(
        genreId
      )}&p=${page}&sortby=number&JsHttpRequest=1-xml`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getRequestHeaders(),
      });

      if (!response.ok) {
        return {
          success: false,
          channels: [],
          totalItems: 0,
          maxPageItems: 0,
          error: `Channels HTTP error: ${response.status}`,
        };
      }

      const data = await response.json();
      const js = data?.js;
      const rawList = Array.isArray(js?.data) ? js.data : [];
      const totalItems = js?.total_items || rawList.length;
      const maxPageItems = js?.max_page_items || rawList.length;

      const channels: StalkerChannel[] = rawList.map((ch: any, idx: number) => ({
        id: String(ch.id || idx + 1),
        number: parseInt(ch.number, 10) || idx + 1,
        name: ch.name || `Channel ${ch.number}`,
        genreId: String(ch.tv_genre_id || genreId),
        logoUrl: ch.logo ? `${this.config.portalUrl}/misc/logos/${ch.logo}` : undefined,
        cmd: ch.cmd || '',
        tvgId: ch.xmltv_id || ch.id,
        hasArchive: Boolean(ch.enable_tv_archive === 1 || ch.have_archive === 1),
        archiveDurationHours: ch.tv_archive_duration ? parseInt(ch.tv_archive_duration, 10) : undefined,
      }));

      return {
        success: true,
        channels,
        totalItems,
        maxPageItems,
      };
    } catch (err: any) {
      return {
        success: false,
        channels: [],
        totalItems: 0,
        maxPageItems: 0,
        error: redact(err.message),
      };
    }
  }

  /**
   * Step 5: Resolve Stream Link (create_link)
   */
  public async createLink(cmd: string): Promise<{ success: boolean; streamUrl?: string; error?: string }> {
    if (!this.session.token) {
      const handshake = await this.performHandshake();
      if (!handshake.success) return { success: false, error: handshake.error };
    }

    try {
      const endpoint = `${this.getNormalizedEndpoint()}?type=itv&action=create_link&cmd=${encodeURIComponent(
        cmd
      )}&JsHttpRequest=1-xml`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: this.getRequestHeaders(),
      });

      if (!response.ok) {
        return { success: false, error: `CreateLink HTTP error: ${response.status}` };
      }

      const data = await response.json();
      const rawCmd = data?.js?.cmd;

      if (!rawCmd) {
        return { success: false, error: 'Stalker portal returned empty stream command' };
      }

      // Parse stream command (often formatted as "ffmpeg http://..." or direct URL)
      const cleanUrl = this.extractStreamUrlFromCmd(rawCmd);

      return {
        success: true,
        streamUrl: cleanUrl,
      };
    } catch (err: any) {
      return { success: false, error: redact(err.message) };
    }
  }

  /**
   * Helper: Extracts pure playback URL from Stalker cmd strings
   */
  public extractStreamUrlFromCmd(cmd: string): string {
    let clean = cmd.trim();
    if (clean.startsWith('ffmpeg ') || clean.startsWith('ffrt ') || clean.startsWith('auto ')) {
      clean = clean.replace(/^(ffmpeg|ffrt|auto)\s+/, '');
    }
    return clean;
  }
}

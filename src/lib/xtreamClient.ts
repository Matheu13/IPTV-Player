/**
 * Milestone 1 Xtream Codes API Client & Normalizer
 * Enforces error classification, URL policy, exponential backoff for 429,
 * and robust handling of the investigated empty categories anomaly.
 */

import {
  UnifiedAccountInfo,
  UnifiedCategory,
  UnifiedChannel,
  SourceCapabilities,
} from './models';
import { classifyError, ErrorCode, IPTVTaxonomyError } from './errorTaxonomy';
import { buildStreamUrlPlan } from './streamUrlPolicy';
import { redact, redactUrl } from './redact';

export interface XtreamCredentials {
  baseUrl: string;
  username: string;
  password: string;
}

export interface XtreamNormalizedCatalog {
  account: UnifiedAccountInfo;
  categories: UnifiedCategory[];
  channels: UnifiedChannel[];
  capabilities: SourceCapabilities;
  hasEmptyBouquetAnomaly: boolean;
  warnings: string[];
}

export class XtreamClient {
  private config: XtreamCredentials;
  private allowedOutputFormats: string[] = ['m3u8', 'ts'];
  private activeBackoffSeconds: number = 0;
  private backoffUntil: number = 0;

  constructor(config: XtreamCredentials) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/+$/, ''),
    };
  }

  public getBaseUrl(): string {
    return this.config.baseUrl;
  }

  public isRateLimited(): { rateLimited: boolean; remainingSeconds: number } {
    const now = Date.now();
    if (now < this.backoffUntil) {
      return {
        rateLimited: true,
        remainingSeconds: Math.ceil((this.backoffUntil - now) / 1000),
      };
    }
    return { rateLimited: false, remainingSeconds: 0 };
  }

  /**
   * Safe fetch with timeout, Content-Type verification, 429 detection, and truncated JSON recovery.
   */
  private async safeFetchJson<T>(url: string, timeoutMs: number = 10000, attempt: number = 1): Promise<T> {
    const rateCheck = this.isRateLimited();
    if (rateCheck.rateLimited) {
      throw new IPTVTaxonomyError(
        classifyError({
          status: 429,
          retry_after_seconds: rateCheck.remainingSeconds,
          message: 'Rate limit active. Exponential backoff enforced.',
        })
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'IPTV-Player-Native/3.0 (Windows NT 10.0; Win64; x64)',
          Accept: 'application/json, text/plain, */*',
        },
      });
      clearTimeout(timeoutId);

      const status = response.status;
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      // Check HTTP 429
      if (status === 429) {
        this.activeBackoffSeconds = Math.min(300, (this.activeBackoffSeconds || 15) * 2);
        this.backoffUntil = Date.now() + this.activeBackoffSeconds * 1000;
        throw new IPTVTaxonomyError(
          classifyError({
            status: 429,
            retry_after_seconds: this.activeBackoffSeconds,
            message: 'Too Many Requests from IPTV server.',
          })
        );
      }

      // Check HTML interstitial page
      if (
        contentType.includes('text/html') ||
        text.includes('<!DOCTYPE html') ||
        text.includes('Cloudflare') ||
        text.includes('Attention Required')
      ) {
        throw new IPTVTaxonomyError(
          classifyError(text, {
            statusCode: status,
            contentType,
            rawBody: text,
            endpoint: url,
          })
        );
      }

      // Try parsing JSON
      try {
        const parsed = JSON.parse(text);
        return parsed as T;
      } catch (parseErr: any) {
        // Classify truncated vs malformed
        const classified = classifyError(parseErr, {
          statusCode: status,
          contentType,
          rawBody: text,
          endpoint: url,
        });

        // If it was truncated and this is attempt 1, try one retry
        if (classified.code === ErrorCode.TRUNCATED_PARTIAL_JSON && attempt === 1) {
          return await this.safeFetchJson<T>(url, timeoutMs + 5000, 2);
        }

        throw new IPTVTaxonomyError(classified);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err instanceof IPTVTaxonomyError) {
        throw err;
      }
      throw new IPTVTaxonomyError(classifyError(err, { endpoint: url }));
    }
  }

  /**
   * Authenticates and normalizes account information.
   */
  public async authenticate(): Promise<UnifiedAccountInfo> {
    const authUrl = `${this.config.baseUrl}/player_api.php?username=${encodeURIComponent(
      this.config.username
    )}&password=${encodeURIComponent(this.config.password)}`;

    const data = await this.safeFetchJson<any>(authUrl);

    // Classify non-active or bad credential responses
    if (!data || data.user_info?.auth === 0 || data.user_info?.status !== 'Active') {
      const errorDetail = classifyError(data);
      throw new IPTVTaxonomyError(errorDetail);
    }

    const uInfo = data.user_info || {};
    const sInfo = data.server_info || {};

    const formats = Array.isArray(uInfo.allowed_output_formats) && uInfo.allowed_output_formats.length > 0
      ? uInfo.allowed_output_formats
      : ['m3u8', 'ts'];
    this.allowedOutputFormats = formats;

    const expDate = uInfo.exp_date && uInfo.exp_date !== 'null'
      ? new Date(parseInt(uInfo.exp_date, 10) * 1000)
      : null;

    const account: UnifiedAccountInfo = {
      sourceType: 'XTREAM',
      username: uInfo.username || this.config.username,
      authStatus: (uInfo.status as any) || 'Active',
      expirationDate: expDate,
      maxConnections: parseInt(uInfo.max_connections || '1', 10),
      activeConnections: parseInt(uInfo.active_cons || '0', 10),
      isConnectionLimitStrict: true,
      allowedOutputFormats: formats,
      serverInfo: {
        url: sInfo.url || this.config.baseUrl,
        port: sInfo.port || '80',
        protocol: sInfo.server_protocol || 'http',
        timezone: sInfo.timezone || 'UTC',
        serverTime: sInfo.time_now,
      },
      rawMessage: uInfo.message,
    };

    return account;
  }

  /**
   * Fetches categories and handles the investigated empty array bug.
   */
  public async getCategories(): Promise<{ categories: UnifiedCategory[]; hasBouquetAnomaly: boolean }> {
    const url = `${this.config.baseUrl}/player_api.php?username=${encodeURIComponent(
      this.config.username
    )}&password=${encodeURIComponent(this.config.password)}&action=get_live_categories`;

    const rawCategories = await this.safeFetchJson<any[]>(url);

    if (!Array.isArray(rawCategories) || rawCategories.length === 0) {
      // BOUQUET ANOMALY: Return synthetic "All Channels" fallback category
      return {
        categories: [
          {
            id: 'all_channels_fallback',
            name: 'All Channels (Provider Bouquet Unassigned)',
            sourceType: 'XTREAM',
            channelCount: 0,
            isSyntheticFallback: true,
          },
        ],
        hasBouquetAnomaly: true,
      };
    }

    const categories: UnifiedCategory[] = rawCategories.map((c) => ({
      id: String(c.category_id),
      name: c.category_name || `Category ${c.category_id}`,
      parentId: c.parent_id,
      sourceType: 'XTREAM',
      channelCount: 0,
    }));

    return {
      categories,
      hasBouquetAnomaly: false,
    };
  }

  /**
   * Fetches live streams, applies the URL policy, and maps them to categories.
   */
  public async getLiveStreams(categories: UnifiedCategory[] = []): Promise<UnifiedChannel[]> {
    const url = `${this.config.baseUrl}/player_api.php?username=${encodeURIComponent(
      this.config.username
    )}&password=${encodeURIComponent(this.config.password)}&action=get_live_streams`;

    const rawStreams = await this.safeFetchJson<any[]>(url);
    if (!Array.isArray(rawStreams)) {
      return [];
    }

    const catMap = new Map<string, UnifiedCategory>();
    (categories || []).forEach((cat) => catMap.set(cat.id, cat));
    const fallbackCategory = (categories || []).find((c) => c.isSyntheticFallback);

    const channels: UnifiedChannel[] = rawStreams.map((s, idx) => {
      const streamId = s.stream_id || s.id || idx + 1;
      const catId = String(s.category_id || (fallbackCategory ? fallbackCategory.id : 'uncategorized'));
      const catName = catMap.get(catId)?.name || 'General';

      // Build prioritized URL plan using the policy engine
      const urlPlan = buildStreamUrlPlan({
        baseUrl: this.config.baseUrl,
        username: this.config.username,
        password: this.config.password,
        streamId,
        allowedOutputFormats: this.allowedOutputFormats,
        streamType: 'live',
      });

      return {
        id: `xtream_${streamId}`,
        streamId,
        name: s.name || `Stream ${streamId}`,
        streamType: 'live',
        categoryId: catId,
        categoryName: catName,
        streamIcon: s.stream_icon,
        epgChannelId: s.epg_channel_id,
        tvArchive: s.tv_archive === 1 || s.tv_archive === '1',
        tvArchiveDurationDays: parseInt(s.tv_archive_duration || '0', 10),
        num: s.num || idx + 1,
        sourceType: 'XTREAM',
        formatsAvailable: [urlPlan.preferredFormat, ...urlPlan.fallbackChain],
        resolvedStreamUrl: urlPlan.primaryUrl,
        activeFormat: urlPlan.preferredFormat,
      };
    });

    // Update category channel counts
    categories.forEach((cat) => {
      if (cat.isSyntheticFallback) {
        cat.channelCount = channels.length;
      } else {
        cat.channelCount = channels.filter((c) => c.categoryId === cat.id).length;
      }
    });

    return channels;
  }

  /**
   * Orchestrates full catalog ingestion with capability tags.
   */
  public async fetchFullCatalog(): Promise<XtreamNormalizedCatalog> {
    const account = await this.authenticate();
    const { categories, hasBouquetAnomaly } = await this.getCategories();
    const channels = await this.getLiveStreams(categories);

    const capabilities: SourceCapabilities = {
      sourceType: 'XTREAM',
      supportsServerConnectionAccounting: true,
      supportsCatchupArchive: channels.some((c) => c.tvArchive),
      supportsPerEndpointCaching: true,
      supportsPagedStreams: true,
      epgMechanism: 'XTREAM_API',
      degradationWarnings: hasBouquetAnomaly
        ? [
            'Provider Bouquet Assignment Bug: get_live_categories returned []. Synthetic "All Channels" fallback category was generated.',
          ]
        : [],
    };

    return {
      account,
      categories,
      channels,
      capabilities,
      hasEmptyBouquetAnomaly: hasBouquetAnomaly,
      warnings: capabilities.degradationWarnings,
    };
  }
}

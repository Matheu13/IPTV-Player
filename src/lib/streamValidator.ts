/**
 * Stream Validation Utility
 * Pre-checks M3U stream URLs for connectivity before passing them to the globalPlayerEngine.
 * Effectively filters out dead links and broken sources, and prioritizes valid streams.
 */

export interface StreamValidationResult {
  url: string;
  isValid: boolean;
  statusCode: number;
  latencyMs: number;
  contentType?: string;
  format: 'm3u8' | 'ts' | 'mpd' | 'mp4' | 'unknown';
  errorReason?: string;
  isLive?: boolean;
  checkedAt: number;
}

export interface ChannelValidationResult {
  channelId: string;
  primaryUrl: string;
  bestPlayableUrl: string;
  isValid: boolean;
  isUsingAlternative: boolean;
  alternativeIndex?: number;
  latencyMs: number;
  status: 'online' | 'degraded' | 'dead' | 'unchecked';
  statusCode?: number;
  errorReason?: string;
  checkedAt: number;
}

export interface ValidationBatchProgress {
  checked: number;
  total: number;
  validCount: number;
  currentChannelName?: string;
}

export class StreamValidator {
  private cache: Map<string, StreamValidationResult> = new Map();
  private channelCache: Map<string, ChannelValidationResult> = new Map();
  private cacheTtlMs = 5 * 60 * 1000; // 5 minutes cache
  private listeners: Set<(results: Record<string, StreamValidationResult>) => void> = new Set();

  public subscribe(fn: (results: Record<string, StreamValidationResult>) => void): () => void {
    this.listeners.add(fn);
    fn(this.getCacheRecord());
    return () => this.listeners.delete(fn);
  }

  public getCacheRecord(): Record<string, StreamValidationResult> {
    const record: Record<string, StreamValidationResult> = {};
    this.cache.forEach((val, key) => {
      record[key] = val;
    });
    return record;
  }

  private notifyListeners(): void {
    if (this.listeners.size === 0) return;
    const record = this.getCacheRecord();
    this.listeners.forEach((l) => l(record));
  }

  public async validateStream(url: string, timeoutMs?: number): Promise<StreamValidationResult> {
    return this.validateStreamUrl(url, { timeoutMs });
  }

  /**
   * Pre-checks an individual stream URL for connectivity.
   */
  public async validateStreamUrl(
    url: string,
    options?: { timeoutMs?: number; forceRefresh?: boolean }
  ): Promise<StreamValidationResult> {
    if (!url || typeof url !== 'string') {
      return {
        url: '',
        isValid: false,
        statusCode: 400,
        latencyMs: 0,
        format: 'unknown',
        errorReason: 'Empty or invalid URL provided',
        checkedAt: Date.now(),
      };
    }

    const cleanUrl = url.trim();

    // Check cache
    if (!options?.forceRefresh) {
      const cached = this.cache.get(cleanUrl);
      if (cached && Date.now() - cached.checkedAt < this.cacheTtlMs) {
        return cached;
      }
    }

    const timeoutMs = options?.timeoutMs || 4000;
    const startTime = Date.now();

    // In browser environment, use backend validator endpoint to avoid CORS issues
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/m3u/validate-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl, timeoutMs }),
        });

        if (res.ok) {
          const data: StreamValidationResult = await res.json();
          this.cache.set(cleanUrl, data);
          return data;
        }
      } catch (e) {
        // Fallback to client-side fast fetch probe below
      }
    }

    // Direct / client-side check
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      // Attempt fast HEAD request first
      const res = await fetch(cleanUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          Accept: '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });
      clearTimeout(timer);

      const latencyMs = Date.now() - startTime;
      const contentType = res.headers.get('content-type') || '';
      const isOk = res.ok || (res.status >= 200 && res.status < 400);

      let format: 'm3u8' | 'ts' | 'mpd' | 'mp4' | 'unknown' = 'unknown';
      const lowUrl = cleanUrl.toLowerCase();
      if (lowUrl.includes('.m3u8') || contentType.includes('mpegurl')) format = 'm3u8';
      else if (lowUrl.includes('.ts') || contentType.includes('mp2t')) format = 'ts';
      else if (lowUrl.includes('.mpd') || contentType.includes('dash')) format = 'mpd';
      else if (lowUrl.includes('.mp4') || contentType.includes('mp4')) format = 'mp4';

      const result: StreamValidationResult = {
        url: cleanUrl,
        isValid: isOk,
        statusCode: res.status,
        latencyMs,
        contentType,
        format,
        isLive: format === 'm3u8' || format === 'ts',
        errorReason: isOk ? undefined : `HTTP Status ${res.status}`,
        checkedAt: Date.now(),
      };

      this.cache.set(cleanUrl, result);
      return result;
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err?.name === 'AbortError';

      const result: StreamValidationResult = {
        url: cleanUrl,
        isValid: false,
        statusCode: isTimeout ? 408 : 502,
        latencyMs,
        format: 'unknown',
        errorReason: isTimeout ? `Connection timed out after ${timeoutMs}ms` : err?.message || 'Connection failed',
        checkedAt: Date.now(),
      };

      this.cache.set(cleanUrl, result);
      return result;
    }
  }

  /**
   * Pre-checks an M3U channel for connectivity before passing to playerEngine.
   * If primary source fails, pre-checks alternative stream URLs to find a healthy working stream.
   */
  public async preCheckChannel(channel: {
    id?: string | number;
    name?: string;
    streamUrl: string;
    alternativeStreamUrls?: string[];
  }): Promise<ChannelValidationResult> {
    const channelId = String(channel.id || channel.streamUrl);
    const primaryUrl = channel.streamUrl;
    const alternatives = channel.alternativeStreamUrls || [];

    // 1. Check primary URL
    const primaryRes = await this.validateStreamUrl(primaryUrl);

    if (primaryRes.isValid) {
      const channelResult: ChannelValidationResult = {
        channelId,
        primaryUrl,
        bestPlayableUrl: primaryUrl,
        isValid: true,
        isUsingAlternative: false,
        latencyMs: primaryRes.latencyMs,
        status: primaryRes.latencyMs > 800 ? 'degraded' : 'online',
        statusCode: primaryRes.statusCode,
        checkedAt: Date.now(),
      };
      this.channelCache.set(channelId, channelResult);
      return channelResult;
    }

    // 2. If primary failed, test alternative streams in sequence
    if (alternatives.length > 0) {
      for (let i = 0; i < alternatives.length; i++) {
        const altUrl = alternatives[i];
        if (!altUrl || altUrl === primaryUrl) continue;

        const altRes = await this.validateStreamUrl(altUrl);
        if (altRes.isValid) {
          const channelResult: ChannelValidationResult = {
            channelId,
            primaryUrl,
            bestPlayableUrl: altUrl,
            isValid: true,
            isUsingAlternative: true,
            alternativeIndex: i,
            latencyMs: altRes.latencyMs,
            status: altRes.latencyMs > 800 ? 'degraded' : 'online',
            statusCode: altRes.statusCode,
            checkedAt: Date.now(),
          };
          this.channelCache.set(channelId, channelResult);
          return channelResult;
        }
      }
    }

    // 3. All sources failed
    const failedResult: ChannelValidationResult = {
      channelId,
      primaryUrl,
      bestPlayableUrl: primaryUrl,
      isValid: false,
      isUsingAlternative: false,
      latencyMs: primaryRes.latencyMs,
      status: 'dead',
      statusCode: primaryRes.statusCode,
      errorReason: primaryRes.errorReason || 'Channel stream and alternatives unreachable',
      checkedAt: Date.now(),
    };
    this.channelCache.set(channelId, failedResult);
    return failedResult;
  }

  /**
   * Pre-checks a batch of channels concurrently with a worker limit.
   */
  public async validateBatch(
    channels: Array<{
      id: string | number;
      name?: string;
      streamUrl: string;
      alternativeStreamUrls?: string[];
    }>,
    optionsOrProgress?:
      | ((progress: ValidationBatchProgress) => void)
      | {
          concurrency?: number;
          timeoutMs?: number;
          onProgress?: (done: number, total: number) => void;
        }
  ): Promise<StreamValidationResult[]> {
    const streamResults: StreamValidationResult[] = [];
    const total = channels.length;
    let checked = 0;
    let validCount = 0;

    const onProgress = typeof optionsOrProgress === 'function' ? optionsOrProgress : undefined;
    const customProgress = typeof optionsOrProgress === 'object' ? optionsOrProgress?.onProgress : undefined;
    const concurrency = typeof optionsOrProgress === 'object' && optionsOrProgress?.concurrency ? optionsOrProgress.concurrency : 6;

    // Use backend batch endpoint if available in browser
    if (typeof window !== 'undefined' && channels.length > 5) {
      try {
        const chunkSize = 25;
        for (let i = 0; i < channels.length; i += chunkSize) {
          const chunk = channels.slice(i, i + chunkSize);
          const res = await fetch('/api/m3u/validate-batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              channels: chunk.map((c) => ({
                id: String(c.id),
                name: c.name,
                streamUrl: c.streamUrl,
                alternativeStreamUrls: c.alternativeStreamUrls,
              })),
            }),
          });

          if (res.ok) {
            const data: { results: ChannelValidationResult[] } = await res.json();
            for (const item of data.results) {
              this.channelCache.set(item.channelId, item);
              const streamRes: StreamValidationResult = {
                url: item.bestPlayableUrl || item.primaryUrl,
                isValid: item.isValid,
                statusCode: item.statusCode || (item.isValid ? 200 : 502),
                latencyMs: item.latencyMs,
                format: (item.bestPlayableUrl || item.primaryUrl).includes('.m3u8') ? 'm3u8' : 'ts',
                errorReason: item.errorReason,
                checkedAt: item.checkedAt,
              };
              this.cache.set(streamRes.url, streamRes);
              if (item.primaryUrl !== streamRes.url) {
                this.cache.set(item.primaryUrl, {
                  ...streamRes,
                  url: item.primaryUrl,
                  isValid: false,
                  errorReason: 'Failed over to alternative stream',
                });
              }
              streamResults.push(streamRes);
              checked++;
              if (item.isValid) validCount++;

              onProgress?.({
                checked,
                total,
                validCount,
                currentChannelName: chunk.find((c) => String(c.id) === item.channelId)?.name,
              });
              customProgress?.(checked, total);
            }
          }
        }
        this.notifyListeners();
        return streamResults;
      } catch {
        // Fall back to local worker pool
      }
    }

    // Local concurrency worker pool
    let index = 0;

    const worker = async () => {
      while (index < channels.length) {
        const currentIndex = index++;
        const channel = channels[currentIndex];
        const res = await this.preCheckChannel(channel);
        this.channelCache.set(String(channel.id || channel.streamUrl), res);

        const streamRes: StreamValidationResult = {
          url: res.bestPlayableUrl || res.primaryUrl,
          isValid: res.isValid,
          statusCode: res.statusCode || (res.isValid ? 200 : 502),
          latencyMs: res.latencyMs,
          format: (res.bestPlayableUrl || res.primaryUrl).includes('.m3u8') ? 'm3u8' : 'ts',
          errorReason: res.errorReason,
          checkedAt: res.checkedAt,
        };
        this.cache.set(streamRes.url, streamRes);
        if (res.primaryUrl !== streamRes.url) {
          this.cache.set(res.primaryUrl, {
            ...streamRes,
            url: res.primaryUrl,
            isValid: false,
            errorReason: 'Failed over to alternative stream',
          });
        }
        streamResults.push(streamRes);
        checked++;
        if (res.isValid) validCount++;

        onProgress?.({
          checked,
          total,
          validCount,
          currentChannelName: channel.name,
        });
        customProgress?.(checked, total);
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, channels.length) }, () => worker());
    await Promise.all(workers);

    this.notifyListeners();
    return streamResults;
  }

  /**
   * Sorts or filters channels to prioritize verified online streams.
   * If onlyValid is true, completely filters out dead links.
   */
  public prioritizeChannels<
    T extends {
      id: string | number;
      streamUrl: string;
      alternativeStreamUrls?: string[];
      validationStatus?: 'online' | 'degraded' | 'dead' | 'unchecked';
    }
  >(channels: T[], onlyValid: boolean = false): T[] {
    const list = [...channels];

    return list
      .map((ch) => {
        const cached = this.channelCache.get(String(ch.id || ch.streamUrl));
        const status = cached ? cached.status : ch.validationStatus || 'unchecked';
        return { channel: ch, status };
      })
      .filter(({ status }) => {
        if (onlyValid) return status === 'online' || status === 'degraded';
        return true;
      })
      .sort((a, b) => {
        const score = (status: string) => {
          if (status === 'online') return 100;
          if (status === 'degraded') return 80;
          if (status === 'unchecked') return 50;
          return 0; // dead
        };
        return score(b.status) - score(a.status);
      })
      .map(({ channel }) => channel);
  }

  /**
   * Retrieves cached validation result for a channel ID or stream URL.
   */
  public getCachedStatus(idOrUrl: string): ChannelValidationResult | undefined {
    return this.channelCache.get(idOrUrl);
  }

  /**
   * Clears the validation cache.
   */
  public clearCache(): void {
    this.cache.clear();
    this.channelCache.clear();
  }
}

export const globalStreamValidator = new StreamValidator();

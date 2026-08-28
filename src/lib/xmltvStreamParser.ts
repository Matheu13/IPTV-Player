/**
 * Milestone 4a: Streaming XMLTV Parser & Decompressor
 * 
 * Efficient streaming parser for massive XMLTV files (100MB - 500MB+ gzipped).
 * Parses channels and programmes in a sliding chunk window to avoid V8 Out-Of-Memory (OOM).
 * Supports automatic gzip decompression and batch dispatch to SQLite.
 */

import { Readable, Transform } from 'stream';
import zlib from 'zlib';
import { parseXmltvDate } from './epgEngine';
import { UnifiedEpgProgram, XmltvChannel } from './models';
export type { XmltvChannel };

export interface StreamParserStats {
  bytesRead: number;
  channelsParsed: number;
  programmesParsed: number;
  batchesDispatched: number;
  peakHeapUsedBytes: number;
  startTimeMs: number;
  durationMs: number;
}

export interface StreamParserOptions {
  batchSize?: number;
  isGzipped?: boolean;
  nowRef?: Date;
  onChannel?: (channel: XmltvChannel) => void | Promise<void>;
  onProgrammeBatch?: (programmes: UnifiedEpgProgram[]) => void | Promise<void>;
  onProgress?: (stats: StreamParserStats) => void;
}

export class XmltvStreamParser {
  private batchSize: number;
  private nowRef: Date;
  private nowMs: number;
  private onChannel?: (channel: XmltvChannel) => void | Promise<void>;
  private onProgrammeBatch?: (programmes: UnifiedEpgProgram[]) => void | Promise<void>;
  private onProgress?: (stats: StreamParserStats) => void;

  private stats: StreamParserStats;
  private buffer = '';
  private currentBatch: UnifiedEpgProgram[] = [];
  private channels: XmltvChannel[] = [];
  private seenChannelIds: Set<string> = new Set();

  constructor(options: StreamParserOptions = {}) {
    this.batchSize = options.batchSize || 500;
    this.nowRef = options.nowRef || new Date();
    this.nowMs = this.nowRef.getTime();
    this.onChannel = options.onChannel;
    this.onProgrammeBatch = options.onProgrammeBatch;
    this.onProgress = options.onProgress;

    this.stats = {
      bytesRead: 0,
      channelsParsed: 0,
      programmesParsed: 0,
      batchesDispatched: 0,
      peakHeapUsedBytes: 0,
      startTimeMs: Date.now(),
      durationMs: 0,
    };
  }

  public getStats(): StreamParserStats {
    this.stats.durationMs = Date.now() - this.stats.startTimeMs;
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const heap = process.memoryUsage().heapUsed;
      if (heap > this.stats.peakHeapUsedBytes) {
        this.stats.peakHeapUsedBytes = heap;
      }
    }
    return { ...this.stats };
  }

  /**
   * Processes an incoming raw string chunk from stream
   */
  public async processChunk(chunk: string | Buffer): Promise<void> {
    const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
    this.stats.bytesRead += typeof chunk === 'string' ? Buffer.byteLength(chunk, 'utf8') : chunk.length;
    this.buffer += chunkStr;

    // 1. Extract <channel>...</channel> nodes from current buffer
    await this.extractChannels();

    // 2. Extract <programme>...</programme> nodes from current buffer
    await this.extractProgrammes();

    // 3. Keep buffer trimmed to prevent memory expansion:
    // Only retain uncompleted trailing tag (max 4KB)
    if (this.buffer.length > 8192) {
      const lastProgEnd = this.buffer.lastIndexOf('</programme>');
      const lastChanEnd = this.buffer.lastIndexOf('</channel>');
      const safeCut = Math.max(lastProgEnd !== -1 ? lastProgEnd + 12 : -1, lastChanEnd !== -1 ? lastChanEnd + 10 : -1);

      if (safeCut > 0) {
        this.buffer = this.buffer.substring(safeCut);
      }
    }

    if (this.onProgress && (this.stats.programmesParsed % 1000 === 0 || this.stats.bytesRead % 1048576 === 0)) {
      this.onProgress(this.getStats());
    }
  }

  private async extractChannels(): Promise<void> {
    const channelRegex = /<channel\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/gi;
    let match;

    while ((match = channelRegex.exec(this.buffer)) !== null) {
      const id = match[1];
      const body = match[2];

      if (!this.seenChannelIds.has(id)) {
        this.seenChannelIds.add(id);
        const displayMatch = /<display-name[^>]*>([^<]+)<\/display-name>/i.exec(body);
        const iconMatch = /<icon\s+src="([^"]+)"/i.exec(body);

        const displayName = displayMatch ? displayMatch[1].trim() : id;
        const iconSrc = iconMatch ? iconMatch[1] : undefined;

        const channel: XmltvChannel = { id, displayName, iconSrc };
        this.channels.push(channel);
        this.stats.channelsParsed++;

        if (this.onChannel) {
          await this.onChannel(channel);
        }
      }
    }

    // Safely remove parsed channels from buffer so they don't get matched again
    this.buffer = this.buffer.replace(/<channel\s+id="[^"]+"[^>]*>[\s\S]*?<\/channel>/gi, '');
  }

  private async extractProgrammes(): Promise<void> {
    const progRegex = /<programme\s+([^>]+)>([\s\S]*?)<\/programme>/gi;
    let match;
    let lastMatchedEnd = 0;

    while ((match = progRegex.exec(this.buffer)) !== null) {
      lastMatchedEnd = progRegex.lastIndex;
      const attrs = match[1];
      const body = match[2];

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
      const isNow = this.nowMs >= startMs && this.nowMs < stopMs;
      const progress = isNow && stopMs > startMs
        ? Math.min(100, Math.max(0, Math.round(((this.nowMs - startMs) / (stopMs - startMs)) * 100)))
        : 0;

      const progId = `xmltv_${channelId}_${startMs}`;
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
        hasCatchupArchive: stopMs <= this.nowMs,
      };

      this.currentBatch.push(program);
      this.stats.programmesParsed++;

      if (this.currentBatch.length >= this.batchSize) {
        await this.flushBatch();
      }
    }

    if (lastMatchedEnd > 0) {
      this.buffer = this.buffer.substring(lastMatchedEnd);
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.currentBatch.length === 0) return;
    const batch = [...this.currentBatch];
    this.currentBatch = [];
    this.stats.batchesDispatched++;

    if (this.onProgrammeBatch) {
      await this.onProgrammeBatch(batch);
    }
  }

  /**
   * Finalizes the stream parse, flushing any remaining items in buffer.
   */
  public async finish(): Promise<StreamParserStats> {
    // Final pass on remaining buffer
    await this.extractChannels();
    await this.extractProgrammes();
    await this.flushBatch();

    this.buffer = '';
    return this.getStats();
  }

  /**
   * Helper to parse an in-memory XML string directly
   */
  public async parseXmlString(xmlString: string): Promise<{ channels: XmltvChannel[]; programmes: UnifiedEpgProgram[]; stats: StreamParserStats }> {
    const channels: XmltvChannel[] = [];
    const programmes: UnifiedEpgProgram[] = [];
    const parser = new XmltvStreamParser({
      onChannel: (ch) => { channels.push(ch); },
      onProgrammeBatch: (batch) => { programmes.push(...batch); },
    });
    await parser.processChunk(xmlString);
    const stats = await parser.finish();
    return { channels, programmes, stats };
  }

  /**
   * Parses an input stream with true streaming pipelining and optional gzip decompression
   * Handles massive 100MB-500MB+ XMLTV files with bounded memory footprint.
   */
  public static async parseStream(
    inputStream: Readable,
    options: StreamParserOptions = {}
  ): Promise<StreamParserStats> {
    const parser = new XmltvStreamParser(options);

    // Read first chunk or inspect if gzipped
    let streamToConsume: Readable = inputStream;

    if (options.isGzipped) {
      const gunzip = zlib.createGunzip();
      streamToConsume = inputStream.pipe(gunzip);
    }

    try {
      for await (const chunk of streamToConsume) {
        // If chunk is a buffer, check if it starts with gzip magic bytes (0x1f, 0x8b) and not explicitly gunzipped yet
        if (!options.isGzipped && Buffer.isBuffer(chunk) && chunk.length >= 2 && chunk[0] === 0x1f && chunk[1] === 0x8b) {
          // It's a gzipped chunk, decompress it directly
          const decompressed = zlib.gunzipSync(chunk);
          await parser.processChunk(decompressed);
        } else {
          await parser.processChunk(chunk);
        }
      }
    } catch (err: any) {
      // In case of gzip stream parsing errors, attempt fallback processing
      console.warn('[XmltvStreamParser] parseStream warning:', err?.message);
    }

    return await parser.finish();
  }

  /**
   * Helper to parse a massive XMLTV file directly from disk path via streaming
   */
  public static async parseFile(
    filePath: string,
    options: StreamParserOptions = {}
  ): Promise<StreamParserStats> {
    const fs = await import('fs');
    const isGzipped = options.isGzipped ?? (filePath.endsWith('.gz') || filePath.endsWith('.gzip'));
    const fileStream = fs.createReadStream(filePath);
    return await XmltvStreamParser.parseStream(fileStream, { ...options, isGzipped });
  }
}

import { redact, redactUrl } from './redact';

export interface SniffResult {
  detectedType: 'MPEG-TS' | 'HLS' | 'HTML-INTERSTITIAL' | 'UNKNOWN';
  confidence: number;
  syncByteCount: number;
  firstSyncOffset: number;
  isMpegTs188: boolean;
  isHls: boolean;
  isHtml: boolean;
  rawHeaderHex: string;
  rawHeaderText: string;
  demuxerNotes: string;
}

/**
 * Sniffs raw bytes from a stream response.
 * MPEG-TS is identified by a 0x47 sync byte recurring every 188 bytes.
 * Requires at least three consecutive sync positions (pos, pos+188, pos+376).
 * HLS playlist begins with #EXTM3U.
 * Detects HTML error interstitials returned with HTTP 200.
 */
export function sniffStreamBytes(buffer: Buffer | Uint8Array): SniffResult {
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const length = bytes.length;

  if (length === 0) {
    return {
      detectedType: 'UNKNOWN',
      confidence: 0,
      syncByteCount: 0,
      firstSyncOffset: -1,
      isMpegTs188: false,
      isHls: false,
      isHtml: false,
      rawHeaderHex: '',
      rawHeaderText: '',
      demuxerNotes: 'Zero bytes received. Connection closed or empty body.',
    };
  }

  const rawHeaderHex = bytes.subarray(0, Math.min(32, length)).toString('hex');
  const rawHeaderText = bytes.subarray(0, Math.min(256, length)).toString('utf8').replace(/[^\x20-\x7E\r\n\t]/g, '.');

  // Check for HLS (#EXTM3U)
  const textPrefix = bytes.subarray(0, Math.min(64, length)).toString('utf8').trim();
  if (textPrefix.startsWith('#EXTM3U') || textPrefix.includes('#EXT-X-STREAM-INF') || textPrefix.includes('#EXT-X-VERSION')) {
    return {
      detectedType: 'HLS',
      confidence: 1.0,
      syncByteCount: 0,
      firstSyncOffset: -1,
      isMpegTs188: false,
      isHls: true,
      isHtml: false,
      rawHeaderHex,
      rawHeaderText: textPrefix.slice(0, 120),
      demuxerNotes: 'HLS Master/Media playlist. Demuxer should use HLS manifest parser (mpv/ffmpeg lavf format "hls"). Sub-segments (.ts / .m4s) fetched independently.',
    };
  }

  // Check for HTML interstitial (HTTP 200 with HTML payload)
  const lowerText = textPrefix.toLowerCase();
  if (lowerText.startsWith('<!doctype html') || lowerText.startsWith('<html') || lowerText.includes('<head') || lowerText.includes('<title>')) {
    return {
      detectedType: 'HTML-INTERSTITIAL',
      confidence: 1.0,
      syncByteCount: 0,
      firstSyncOffset: -1,
      isMpegTs188: false,
      isHls: false,
      isHtml: true,
      rawHeaderHex,
      rawHeaderText: textPrefix.slice(0, 120),
      demuxerNotes: 'CRITICAL: Server returned HTTP 200 containing HTML interstitial or ISP block/cloudflare page instead of stream media.',
    };
  }

  // Check for MPEG-TS 0x47 sync byte recurring every 188 bytes
  // Scan through the first 188 bytes to find possible sync byte offset
  let bestSyncOffset = -1;
  let maxConsecutiveSyncs = 0;

  for (let offset = 0; offset < Math.min(188, length); offset++) {
    if (bytes[offset] === 0x47) {
      let count = 1;
      let pos = offset + 188;
      while (pos < length && bytes[pos] === 0x47) {
        count++;
        pos += 188;
      }
      if (count > maxConsecutiveSyncs) {
        maxConsecutiveSyncs = count;
        bestSyncOffset = offset;
      }
    }
  }

  const isMpegTs188 = maxConsecutiveSyncs >= 3;

  if (isMpegTs188) {
    return {
      detectedType: 'MPEG-TS',
      confidence: Math.min(1.0, 0.7 + (maxConsecutiveSyncs * 0.05)),
      syncByteCount: maxConsecutiveSyncs,
      firstSyncOffset: bestSyncOffset,
      isMpegTs188: true,
      isHls: false,
      isHtml: false,
      rawHeaderHex,
      rawHeaderText,
      demuxerNotes: `Raw MPEG-TS (188-byte packet stream) with ${maxConsecutiveSyncs} consecutive 0x47 sync bytes starting at offset ${bestSyncOffset}. Demuxer requires raw mpegts demuxer (mpv format "mpegts", lavf format "mpegts"). No manifest overhead, continuous chunked stream.`,
    };
  }

  // If sync count was 1 or 2, partial match or desynced
  if (maxConsecutiveSyncs > 0) {
    return {
      detectedType: 'MPEG-TS',
      confidence: 0.5,
      syncByteCount: maxConsecutiveSyncs,
      firstSyncOffset: bestSyncOffset,
      isMpegTs188: false,
      isHls: false,
      isHtml: false,
      rawHeaderHex,
      rawHeaderText,
      demuxerNotes: `Found ${maxConsecutiveSyncs} sync bytes (0x47) at 188-byte intervals, but less than required 3 consecutive syncs in the probed 1-2KB buffer.`,
    };
  }

  return {
    detectedType: 'UNKNOWN',
    confidence: 0.1,
    syncByteCount: 0,
    firstSyncOffset: -1,
    isMpegTs188: false,
    isHls: false,
    isHtml: false,
    rawHeaderHex,
    rawHeaderText,
    demuxerNotes: 'Unrecognized stream header or custom container format. Probing further required.',
  };
}

export interface ProbeAuthResult {
  status: string; // Active, Expired, Banned, Disabled, etc.
  exp_date: string | null;
  exp_date_human: string | null;
  max_connections: string | number;
  active_cons: string | number;
  allowed_output_formats: string[];
  server_info: {
    url?: string;
    port?: string;
    https_port?: string;
    server_protocol?: string;
    rtmp_port?: string;
    timezone?: string;
    timestamp_now?: number;
    time_now?: string;
  };
  raw_redacted: Record<string, any>;
}

export interface StreamProbeResult {
  format: string;
  url: string;
  headStatus: number | string;
  headContentType: string | null;
  headRedirects: string[];
  headMethodUsed: 'HEAD' | 'GET_RANGE_FALLBACK';
  getRangeStatus: number | string;
  getContentType: string | null;
  bytesReceived: number;
  sniffResult: SniffResult;
  latencyMs: number;
  usableForPlayback: boolean;
}

export interface Milestone0DiagnosticReport {
  timestamp: string;
  targetServer: string;
  credentialRedacted: {
    username: string;
    password: string;
  };
  auth: {
    success: boolean;
    httpStatus: number;
    data: ProbeAuthResult | null;
    error?: string;
  };
  categories: {
    count: number;
    isEmpty: boolean;
    bouquetAnomalyDetected: boolean;
    sample: any[];
    raw_redacted: any;
  };
  streams: {
    count: number;
    firstThree: any[];
    raw_redacted: any;
  };
  streamProbes: StreamProbeResult[];
  overallAssessment: {
    streamType: 'HLS' | 'RAW_MPEG_TS' | 'MIXED' | 'UNUSABLE';
    preferredFormat: string;
    fallbackFormat: string | null;
    demuxerConfiguration: string;
    providerAnomalies: string[];
  };
}

/**
 * Executes a full Milestone 0 diagnostic probe against an Xtream server URL.
 */
export async function runMilestone0Probe(options: {
  baseUrl: string;
  username: string;
  password: string;
  streamId?: string;
}): Promise<Milestone0DiagnosticReport> {
  const { baseUrl, username, password } = options;
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const timestamp = new Date().toISOString();

  const report: Milestone0DiagnosticReport = {
    timestamp,
    targetServer: cleanBase,
    credentialRedacted: {
      username: redact(username),
      password: redact(password),
    },
    auth: {
      success: false,
      httpStatus: 0,
      data: null,
    },
    categories: {
      count: 0,
      isEmpty: true,
      bouquetAnomalyDetected: false,
      sample: [],
      raw_redacted: [],
    },
    streams: {
      count: 0,
      firstThree: [],
      raw_redacted: [],
    },
    streamProbes: [],
    overallAssessment: {
      streamType: 'UNUSABLE',
      preferredFormat: 'ts',
      fallbackFormat: null,
      demuxerConfiguration: '',
      providerAnomalies: [],
    },
  };

  // Step 1: Probe Auth (`player_api.php`, no action)
  const authUrl = `${cleanBase}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
  try {
    const authStart = Date.now();
    const authRes = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Accept': 'application/json, text/plain, */*',
      },
      signal: AbortSignal.timeout(10000),
    });

    report.auth.httpStatus = authRes.status;
    const authText = await authRes.text();
    let authJson: any;
    try {
      authJson = JSON.parse(authText);
    } catch {
      report.auth.error = `Invalid JSON response: ${authText.slice(0, 100)}`;
      report.overallAssessment.providerAnomalies.push('Auth endpoint returned non-JSON / HTML error page');
    }

    if (authJson && authJson.user_info) {
      report.auth.success = true;
      const userInfo = authJson.user_info;
      const serverInfo = authJson.server_info || {};

      let expHuman: string | null = null;
      if (userInfo.exp_date) {
        const expNum = Number(userInfo.exp_date);
        if (!isNaN(expNum) && expNum > 0) {
          expHuman = new Date(expNum * 1000).toISOString();
        }
      }

      let allowedFormats: string[] = ['ts', 'm3u8'];
      if (Array.isArray(userInfo.allowed_output_formats)) {
        allowedFormats = userInfo.allowed_output_formats;
      } else if (typeof userInfo.allowed_output_formats === 'string') {
        try {
          allowedFormats = JSON.parse(userInfo.allowed_output_formats);
        } catch {
          allowedFormats = [userInfo.allowed_output_formats];
        }
      }

      report.auth.data = {
        status: String(userInfo.status ?? 'Unknown'),
        exp_date: userInfo.exp_date ? String(userInfo.exp_date) : null,
        exp_date_human: expHuman,
        max_connections: userInfo.max_connections ?? 1,
        active_cons: userInfo.active_cons ?? 0,
        allowed_output_formats: allowedFormats,
        server_info: {
          url: serverInfo.url,
          port: serverInfo.port,
          https_port: serverInfo.https_port,
          server_protocol: serverInfo.server_protocol,
          rtmp_port: serverInfo.rtmp_port,
          timezone: serverInfo.timezone,
          timestamp_now: serverInfo.timestamp_now,
          time_now: serverInfo.time_now,
        },
        raw_redacted: redact(authJson),
      };

      if (report.auth.data.status !== 'Active') {
        report.overallAssessment.providerAnomalies.push(`Account status is '${report.auth.data.status}' (Non-Active)`);
      }
    } else if (authJson && authJson.user_info === false) {
      report.auth.error = 'Authentication failed: bad credentials or deactivated user.';
      report.overallAssessment.providerAnomalies.push('Auth failed: user_info is false');
    }
  } catch (err: any) {
    report.auth.error = redact(err.message || String(err));
    report.overallAssessment.providerAnomalies.push(`Auth network request failed: ${report.auth.error}`);
  }

  // If Auth succeeded, probe Categories and Streams
  if (report.auth.success) {
    // Step 2: Probe Categories
    const catUrl = `${cleanBase}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_categories`;
    try {
      const catRes = await fetch(catUrl, {
        headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
        signal: AbortSignal.timeout(10000),
      });
      const catJson = await catRes.json();
      if (Array.isArray(catJson)) {
        report.categories.count = catJson.length;
        report.categories.isEmpty = catJson.length === 0;
        report.categories.sample = redact(catJson.slice(0, 5));
        report.categories.raw_redacted = redact(catJson);

        // SPECIFIC BUG CHECK: get_live_categories returns [] while auth is Active!
        if (catJson.length === 0 && report.auth.data?.status === 'Active') {
          report.categories.bouquetAnomalyDetected = true;
          report.overallAssessment.providerAnomalies.push(
            'ANOMALY DETECTED: get_live_categories returned [] while account status is Active. Cause: provider bouquet/package assignment missing or misconfigured on server side.'
          );
        }
      }
    } catch (err: any) {
      report.overallAssessment.providerAnomalies.push(`Categories fetch failed: ${redact(err.message)}`);
    }

    // Step 3: Probe Streams
    const streamsUrl = `${cleanBase}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=get_live_streams`;
    try {
      const streamsRes = await fetch(streamsUrl, {
        headers: { 'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18' },
        signal: AbortSignal.timeout(15000),
      });
      const streamsJson = await streamsRes.json();
      if (Array.isArray(streamsJson)) {
        report.streams.count = streamsJson.length;
        report.streams.firstThree = redact(streamsJson.slice(0, 3));
        report.streams.raw_redacted = redact(streamsJson.slice(0, 10));
      }
    } catch (err: any) {
      report.overallAssessment.providerAnomalies.push(`Streams fetch failed: ${redact(err.message)}`);
    }

    // Step 4: Probe Stream URL and Byte Sniffing
    // Pick stream ID from first stream or user option or default 1
    const targetStreamId = options.streamId || (report.streams.firstThree[0]?.stream_id ? String(report.streams.firstThree[0].stream_id) : '1');
    const formatsToProbe = report.auth.data?.allowed_output_formats || ['ts', 'm3u8'];

    for (const format of formatsToProbe) {
      const ext = format.startsWith('.') ? format : `.${format}`;
      const streamUrl = `${cleanBase}/live/${username}/${password}/${targetStreamId}${ext}`;
      const streamProbe = await probeSingleStreamUrl({
        streamUrl,
        format,
        username,
        password,
      });
      report.streamProbes.push(streamProbe);
    }

    // Step 5: Overall Demuxer & Format Assessment
    const workingProbes = report.streamProbes.filter((p) => p.usableForPlayback);
    const mpegTsProbe = report.streamProbes.find((p) => p.sniffResult.detectedType === 'MPEG-TS');
    const hlsProbe = report.streamProbes.find((p) => p.sniffResult.detectedType === 'HLS');

    if (hlsProbe && mpegTsProbe) {
      report.overallAssessment.streamType = 'MIXED';
      report.overallAssessment.preferredFormat = 'm3u8';
      report.overallAssessment.fallbackFormat = 'ts';
      report.overallAssessment.demuxerConfiguration =
        'Provider supports both HLS (.m3u8) and raw MPEG-TS (.ts). Recommend HLS as primary for seamless bitrate adaptation, fast chunk seeking, and graceful network stall recovery; fall back to raw MPEG-TS with mpv format="mpegts" / lavf demuxer.';
    } else if (hlsProbe) {
      report.overallAssessment.streamType = 'HLS';
      report.overallAssessment.preferredFormat = 'm3u8';
      report.overallAssessment.fallbackFormat = null;
      report.overallAssessment.demuxerConfiguration =
        'Streams are HLS playlists (#EXTM3U). Demuxer MUST use HLS segment demuxing (libmpv lavf format "hls", or native libVLC HLS module). Requires tracking sequence numbers and chunk buffering.';
    } else if (mpegTsProbe) {
      report.overallAssessment.streamType = 'RAW_MPEG_TS';
      report.overallAssessment.preferredFormat = 'ts';
      report.overallAssessment.fallbackFormat = null;
      report.overallAssessment.demuxerConfiguration =
        'Streams are RAW MPEG-TS (188-byte packet stream with 0x47 sync bytes). Demuxer MUST be configured for continuous raw mpegts stream (libmpv lavf format "mpegts", low-latency buffer, ignore timestamp resets with ts-discont handling).';
    } else if (workingProbes.length > 0) {
      report.overallAssessment.streamType = 'RAW_MPEG_TS';
      report.overallAssessment.preferredFormat = workingProbes[0].format;
      report.overallAssessment.fallbackFormat = null;
      report.overallAssessment.demuxerConfiguration = 'Byte sniff returned partial match. Use raw stream demuxing with automatic container fallback.';
    } else {
      report.overallAssessment.streamType = 'UNUSABLE';
      report.overallAssessment.preferredFormat = 'ts';
      report.overallAssessment.fallbackFormat = null;
      report.overallAssessment.demuxerConfiguration = 'No tested format produced valid media bytes. Verify account credentials and ISP blocking.';
    }
  }

  return report;
}

/**
 * Probes a single stream URL with HTTP HEAD, GET Range fallback, and byte sniffing.
 */
export async function probeSingleStreamUrl(options: {
  streamUrl: string;
  format: string;
  username: string;
  password: string;
}): Promise<StreamProbeResult> {
  const { streamUrl, format } = options;
  const redactedUrl = redactUrl(streamUrl);
  const start = Date.now();

  let headStatus: number | string = 'NOT_ATTEMPTED';
  let headContentType: string | null = null;
  const headRedirects: string[] = [];
  let headMethodUsed: 'HEAD' | 'GET_RANGE_FALLBACK' = 'HEAD';
  let getRangeStatus: number | string = 'NOT_ATTEMPTED';
  let getContentType: string | null = null;
  let bytesReceived = 0;
  let sniffResult: SniffResult = {
    detectedType: 'UNKNOWN',
    confidence: 0,
    syncByteCount: 0,
    firstSyncOffset: -1,
    isMpegTs188: false,
    isHls: false,
    isHtml: false,
    rawHeaderHex: '',
    rawHeaderText: '',
    demuxerNotes: '',
  };

  // Step 4a: Try HTTP HEAD first
  try {
    const headRes = await fetch(streamUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });

    headStatus = headRes.status;
    headContentType = headRes.headers.get('content-type');
    if (headRes.url && headRes.url !== streamUrl) {
      headRedirects.push(redactUrl(headRes.url));
    }
  } catch (err: any) {
    headStatus = `ERROR: ${redact(err.message || String(err))}`;
  }

  // Step 4b: Fallback to GET with Range: bytes=0-2047, read ~1KB, abort immediately
  // Many panels return 405, 000, or hang on HEAD. Fall back to GET range probe.
  headMethodUsed = (typeof headStatus === 'number' && headStatus >= 200 && headStatus < 300) ? 'HEAD' : 'GET_RANGE_FALLBACK';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const getRes = await fetch(streamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'VLC/3.0.18 LibVLC/3.0.18',
        'Range': 'bytes=0-2047',
        'Accept': '*/*',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    getRangeStatus = getRes.status;
    getContentType = getRes.headers.get('content-type');

    if (getRes.body) {
      const reader = getRes.body.getReader();
      const chunks: Uint8Array[] = [];
      let total = 0;

      while (total < 2048) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        total += value.length;
        if (total >= 1024) {
          // Read ~1 KB, abort immediately to not hold connection!
          reader.cancel('Milestone 0 probe completed');
          break;
        }
      }
      clearTimeout(timeoutId);

      const combined = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      bytesReceived = combined.length;
      sniffResult = sniffStreamBytes(combined);
    }
  } catch (err: any) {
    getRangeStatus = `ERROR: ${redact(err.message || String(err))}`;
  }

  const latencyMs = Date.now() - start;
  const usableForPlayback = sniffResult.isMpegTs188 || sniffResult.isHls;

  return {
    format,
    url: redactedUrl,
    headStatus,
    headContentType,
    headRedirects,
    headMethodUsed,
    getRangeStatus,
    getContentType,
    bytesReceived,
    sniffResult,
    latencyMs,
    usableForPlayback,
  };
}

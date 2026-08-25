/**
 * Milestone 1 Stream URL Policy Engine
 * Formulates stream URLs dynamically based on provider capabilities,
 * format priority chains (prefer HLS .m3u8, fallback .ts), and automatic playback downgrade logging.
 */

import { redactUrl } from './redact';

export interface StreamUrlConfig {
  baseUrl: string;
  username: string;
  password: string;
  streamId: number | string;
  allowedOutputFormats?: string[];
  streamType?: 'live' | 'movie' | 'series';
}

export interface ResolvedStreamPlan {
  preferredFormat: string;
  fallbackChain: string[];
  primaryUrl: string;
  fallbackUrls: { format: string; url: string }[];
  policyReason: string;
}

export interface DowngradeEvent {
  timestamp: string;
  streamId: number | string;
  failedFormat: string;
  downgradedToFormat: string;
  failedUrlRedacted: string;
  newUrlRedacted: string;
  reason: string;
}

const downgradeHistory: DowngradeEvent[] = [];

/**
 * Builds the prioritized URL plan for a given stream ID.
 * Follows the explicit rule:
 * 1. Read allowed_output_formats from auth.
 * 2. If absent/empty, fallback to ['m3u8', 'ts'] (proven working in Milestone 0).
 * 3. Prefer HLS (.m3u8) when allowed for adaptive seeking/recovery.
 * 4. Chain fallback formats (e.g. .ts, .rtmp).
 */
export function buildStreamUrlPlan(config: StreamUrlConfig): ResolvedStreamPlan {
  const cleanBase = config.baseUrl.replace(/\/+$/, '');
  const rawFormats = config.allowedOutputFormats && config.allowedOutputFormats.length > 0
    ? config.allowedOutputFormats.map((f) => f.toLowerCase().trim())
    : ['m3u8', 'ts']; // Milestone 0 proven fallback

  // Normalize format names
  const normalizedFormats = rawFormats.map((fmt) => {
    if (fmt === 'hls' || fmt === 'm3u8') return 'm3u8';
    if (fmt === 'ts' || fmt === 'mpegts') return 'ts';
    if (fmt === 'rtmp') return 'rtmp';
    return fmt;
  });

  // Prioritize: HLS (.m3u8) first, then TS (.ts), then others
  const priorityOrder = ['m3u8', 'ts', 'rtmp'];
  const sortedFormats = [...new Set(normalizedFormats)].sort((a, b) => {
    const idxA = priorityOrder.indexOf(a);
    const idxB = priorityOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  const preferredFormat = sortedFormats[0] || 'm3u8';
  const fallbackChain = sortedFormats.slice(1);

  const buildUrlForFormat = (fmt: string): string => {
    const prefix = config.streamType === 'movie' ? 'movie' : config.streamType === 'series' ? 'series' : 'live';
    return `${cleanBase}/${prefix}/${encodeURIComponent(config.username)}/${encodeURIComponent(config.password)}/${config.streamId}.${fmt}`;
  };

  const primaryUrl = buildUrlForFormat(preferredFormat);
  const fallbackUrls = fallbackChain.map((fmt) => ({
    format: fmt,
    url: buildUrlForFormat(fmt),
  }));

  const policyReason = preferredFormat === 'm3u8'
    ? 'HLS (.m3u8) selected as primary for adaptive segment seeking, buffer stabilization, and resilient stall recovery; .ts configured as fallback.'
    : `Format .${preferredFormat} selected based on provider allowed_output_formats constraints.`;

  return {
    preferredFormat,
    fallbackChain,
    primaryUrl,
    fallbackUrls,
    policyReason,
  };
}

/**
 * Executes a graceful playback downgrade when the active format fails.
 */
export function handlePlaybackDowngrade(
  currentFormat: string,
  plan: ResolvedStreamPlan,
  streamId: number | string,
  errorReason: string
): { nextFormat: string | null; nextUrl: string | null; event: DowngradeEvent | null } {
  const currentIdx = [plan.preferredFormat, ...plan.fallbackChain].indexOf(currentFormat);
  const allFormats = [plan.preferredFormat, ...plan.fallbackChain];

  if (currentIdx === -1 || currentIdx >= allFormats.length - 1) {
    // No more fallbacks available in the chain
    return { nextFormat: null, nextUrl: null, event: null };
  }

  const nextFormat = allFormats[currentIdx + 1];
  const nextFallback = plan.fallbackUrls.find((f) => f.format === nextFormat);
  const nextUrl = nextFallback ? nextFallback.url : null;

  const currentUrl = currentIdx === 0 ? plan.primaryUrl : plan.fallbackUrls[currentIdx - 1]?.url || '';

  const event: DowngradeEvent = {
    timestamp: new Date().toISOString(),
    streamId,
    failedFormat: currentFormat,
    downgradedToFormat: nextFormat,
    failedUrlRedacted: redactUrl(currentUrl),
    newUrlRedacted: redactUrl(nextUrl || ''),
    reason: errorReason,
  };

  downgradeHistory.unshift(event);
  if (downgradeHistory.length > 100) downgradeHistory.pop();

  return {
    nextFormat,
    nextUrl,
    event,
  };
}

export function getDowngradeHistory(): DowngradeEvent[] {
  return [...downgradeHistory];
}

export function clearDowngradeHistory(): void {
  downgradeHistory.length = 0;
}

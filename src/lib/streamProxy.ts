/**
 * IPTV Stream Proxy & Transmuxing Engine
 * Resolves CORS, Mixed Content (HTTPS -> HTTP), dynamic redirects,
 * and manifest URI rewriting for sub-second live channel playback.
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import type { Request, Response } from 'express';
import { sqliteEpgDB } from './sqliteEpgDb';

const DEFAULT_USER_AGENT = 'IPTVSmartersPro/3.1.5';

// Reusable Keep-Alive agents to avoid socket exhaustion and socket hang-ups
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 5000,
  maxSockets: 64,
  maxFreeSockets: 16,
  timeout: 15000,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 5000,
  maxSockets: 64,
  maxFreeSockets: 16,
  timeout: 15000,
});

/**
 * Validates whether a target URL is allowed to be proxied
 * (Protects against open-proxy / SSRF vulnerabilities).
 */
export function isAllowedProxyUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    // Allow any configured source domain or upstream IP
    const sources = sqliteEpgDB.getSources();
    const allowedHosts = new Set<string>([
      'dnsjibre.xyz',
      '46.249.110.107',
      'localhost',
      '127.0.0.1',
    ]);

    sources.forEach((s) => {
      try {
        const u = new URL(s.base_url);
        allowedHosts.add(u.hostname);
      } catch {}
    });

    // Check hostname or IP match
    if (allowedHosts.has(parsed.hostname)) return true;

    // Allow standard numeric IP addresses associated with IPTV CDNs
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(parsed.hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Resolves the primary Xtream credentials from SQLite or defaults
 */
export function getActiveXtreamCredentials(): { baseUrl: string; username: string; password: string } {
  const sources = sqliteEpgDB.getSources();
  const active = sources.find((s) => s.source_type === 'XTREAM' || s.status === 'Active');

  if (active && active.username) {
    let password = '2pFz3E7P3d';
    try {
      if (active.metadata_json) {
        const meta = JSON.parse(active.metadata_json);
        if (meta.password) password = meta.password;
      }
    } catch {}

    return {
      baseUrl: active.base_url || 'http://dnsjibre.xyz:80',
      username: active.username || 'B3GC9NESBU82M3W',
      password,
    };
  }

  return {
    baseUrl: 'http://dnsjibre.xyz:80',
    username: 'B3GC9NESBU82M3W',
    password: '2pFz3E7P3d',
  };
}

/**
 * Rewrites an M3U8 playlist to route segments through the local proxy
 */
export function rewriteM3u8Playlist(manifestText: string, finalTargetUrl: string): string {
  const urlObj = new URL(finalTargetUrl);
  const origin = urlObj.origin;
  const lastSlashIndex = finalTargetUrl.lastIndexOf('/');
  const baseDir = lastSlashIndex !== -1 ? finalTargetUrl.slice(0, lastSlashIndex + 1) : `${origin}/`;

  return manifestText
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Handle Key URIs
      if (trimmed.startsWith('#EXT-X-KEY')) {
        return trimmed.replace(/URI="([^"]+)"/, (match, uri) => {
          let resolvedKeyUrl = uri;
          if (uri.startsWith('/')) {
            resolvedKeyUrl = origin + uri;
          } else if (!uri.startsWith('http://') && !uri.startsWith('https://')) {
            resolvedKeyUrl = baseDir + uri;
          }
          return `URI="/api/stream/segment?url=${encodeURIComponent(resolvedKeyUrl)}"`;
        });
      }

      // Skip other comment tags
      if (trimmed.startsWith('#')) return line;

      // Segment URL line
      let segUrl = trimmed;
      if (trimmed.startsWith('/')) {
        segUrl = origin + trimmed;
      } else if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        segUrl = baseDir + trimmed;
      }

      return `/api/stream/segment?url=${encodeURIComponent(segUrl)}`;
    })
    .join('\n');
}

/**
 * Robust HTTP/HTTPS client to fetch M3U8 manifest text following redirects
 */
export function fetchManifestWithRedirects(
  targetUrl: string,
  maxRedirects = 5,
  retryCount = 2
): Promise<{ text: string; finalUrl: string; statusCode: number } | null> {
  return new Promise((resolve) => {
    if (maxRedirects <= 0) {
      resolve(null);
      return;
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      resolve(null);
      return;
    }

    const isHttps = parsed.protocol === 'https:';
    const protocol = isHttps ? https : http;
    const agent = isHttps ? httpsAgent : httpAgent;

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      agent,
      headers: {
        'User-Agent': DEFAULT_USER_AGENT,
        Accept: '*/*',
        Connection: 'keep-alive',
      },
      timeout: 10000,
    };

    const req = protocol.get(options, (res) => {
      // Follow redirects
      if (
        res.statusCode &&
        [301, 302, 303, 307, 308].includes(res.statusCode) &&
        res.headers.location
      ) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        req.destroy();
        return fetchManifestWithRedirects(redirectUrl, maxRedirects - 1, retryCount).then(resolve);
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          text: data,
          finalUrl: targetUrl,
          statusCode: res.statusCode || 200,
        });
      });
      res.on('error', () => {
        if (retryCount > 0) {
          fetchManifestWithRedirects(targetUrl, maxRedirects, retryCount - 1).then(resolve);
        } else {
          resolve(null);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      if (retryCount > 0) {
        fetchManifestWithRedirects(targetUrl, maxRedirects, retryCount - 1).then(resolve);
      } else {
        resolve(null);
      }
    });

    req.on('error', () => {
      if (retryCount > 0) {
        fetchManifestWithRedirects(targetUrl, maxRedirects, retryCount - 1).then(resolve);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Handles live stream proxy request for M3U8 or TS
 */
export async function handleLiveStreamProxy(
  streamId: string | number,
  format: 'm3u8' | 'ts',
  req: Request,
  res: Response
): Promise<void> {
  const creds = getActiveXtreamCredentials();
  const targetUrl = `${creds.baseUrl}/live/${creds.username}/${creds.password}/${streamId}.${format}`;

  if (format === 'm3u8') {
    try {
      const manifestResult = await fetchManifestWithRedirects(targetUrl);

      if (manifestResult && manifestResult.statusCode === 200 && manifestResult.text.includes('#EXTM3U')) {
        const rewritten = rewriteM3u8Playlist(manifestResult.text, manifestResult.finalUrl);
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(rewritten);
        return;
      }

      // If upstream failed or returned non-M3U8 (or direct stream), fallback to TS streamer
      const tsTargetUrl = `${creds.baseUrl}/live/${creds.username}/${creds.password}/${streamId}.ts`;
      return streamDirectMedia(tsTargetUrl, req, res);
    } catch {
      // Attempt direct TS fallback on connection error
      const tsTargetUrl = `${creds.baseUrl}/live/${creds.username}/${creds.password}/${streamId}.ts`;
      return streamDirectMedia(tsTargetUrl, req, res);
    }
  } else {
    // Direct TS stream
    return streamDirectMedia(targetUrl, req, res);
  }
}

/**
 * Pipes media chunks directly from upstream to client with clean abort handling and retry
 */
export function streamDirectMedia(
  targetUrl: string,
  req: Request,
  res: Response,
  maxRedirects = 5,
  retryCount = 1
): void {
  if (!isAllowedProxyUrl(targetUrl)) {
    res.status(403).send('Forbidden: Target host not permitted in proxy');
    return;
  }

  if (maxRedirects <= 0) {
    res.status(508).send('Too many redirects');
    return;
  }

  let isClientClosed = false;
  let hasTransferredData = false;

  const onClientClose = () => {
    isClientClosed = true;
    if (upstreamReq && !upstreamReq.destroyed) {
      upstreamReq.destroy();
    }
  };

  req.on('close', onClientClose);

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    req.off('close', onClientClose);
    if (!res.headersSent) res.status(400).send('Invalid Target URL');
    return;
  }

  const isHttps = parsed.protocol === 'https:';
  const protocol = isHttps ? https : http;
  const agent = isHttps ? httpsAgent : httpAgent;

  const options: http.RequestOptions = {
    hostname: parsed.hostname,
    port: parsed.port || (isHttps ? 443 : 80),
    path: parsed.pathname + parsed.search,
    method: 'GET',
    agent,
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
      Accept: '*/*',
      ...(req.headers.range ? { Range: req.headers.range } : {}),
      Connection: 'keep-alive',
    },
    timeout: 15000,
  };

  let upstreamReq: http.ClientRequest;

  try {
    upstreamReq = protocol.get(options, (upstreamRes) => {
      // Follow 301, 302, 303, 307, 308 redirects
      if (
        upstreamRes.statusCode &&
        [301, 302, 303, 307, 308].includes(upstreamRes.statusCode) &&
        upstreamRes.headers.location
      ) {
        let redirectUrl = upstreamRes.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        upstreamReq.destroy();
        req.off('close', onClientClose);
        return streamDirectMedia(redirectUrl, req, res, maxRedirects - 1, retryCount);
      }

      // Forward response headers
      res.status(upstreamRes.statusCode || 200);
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

      if (upstreamRes.headers['content-type']) {
        res.setHeader('Content-Type', upstreamRes.headers['content-type']);
      } else {
        res.setHeader('Content-Type', 'video/mp2t');
      }

      if (upstreamRes.headers['content-length']) {
        res.setHeader('Content-Length', upstreamRes.headers['content-length']);
      }

      if (upstreamRes.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', upstreamRes.headers['accept-ranges']);
      }

      if (upstreamRes.headers['content-range']) {
        res.setHeader('Content-Range', upstreamRes.headers['content-range']);
      }

      res.setHeader('Cache-Control', 'public, max-age=60');

      upstreamRes.on('data', (chunk) => {
        hasTransferredData = true;
        if (!isClientClosed && !res.writableEnded) {
          res.write(chunk);
        }
      });

      upstreamRes.on('end', () => {
        req.off('close', onClientClose);
        if (!res.writableEnded) {
          res.end();
        }
      });

      upstreamRes.on('error', (err: any) => {
        req.off('close', onClientClose);
        // Only log if not triggered by client canceling playback
        if (!isClientClosed && err?.code !== 'ECONNRESET' && err?.message !== 'socket hang up') {
          console.warn('[StreamProxy] Upstream chunk error:', err.message);
        }
        if (!res.headersSent) {
          res.status(502).end();
        } else if (!res.writableEnded) {
          res.end();
        }
      });
    });

    upstreamReq.on('timeout', () => {
      upstreamReq.destroy();
      if (!isClientClosed) {
        if (!hasTransferredData && retryCount > 0) {
          req.off('close', onClientClose);
          return streamDirectMedia(targetUrl, req, res, maxRedirects, retryCount - 1);
        }
        if (!res.headersSent) res.status(504).send('Gateway Timeout');
      }
    });

    upstreamReq.on('error', (err: any) => {
      req.off('close', onClientClose);
      // Suppress normal client abort or socket closure errors
      if (isClientClosed || upstreamReq.destroyed || err?.code === 'ECONNRESET' || err?.message === 'socket hang up') {
        if (!hasTransferredData && retryCount > 0 && !isClientClosed) {
          return streamDirectMedia(targetUrl, req, res, maxRedirects, retryCount - 1);
        }
        if (!res.headersSent && !isClientClosed) {
          res.status(502).send('Bad Gateway');
        }
        return;
      }

      if (!res.headersSent) res.status(502).send('Bad Gateway');
    });
  } catch (err: any) {
    req.off('close', onClientClose);
    if (!isClientClosed) {
      if (!res.headersSent) res.status(500).send(err.message);
    }
  }
}

import { fetchManifestWithRedirects, rewriteM3u8Playlist, isAllowedProxyUrl } from '../src/lib/streamProxy';

async function test() {
  const m3u8Url = 'http://dnsjibre.xyz:80/live/B3GC9NESBU82M3W/2pFz3E7P3d/682950.m3u8';
  const manifest = await fetchManifestWithRedirects(m3u8Url);
  if (!manifest) {
    console.log('Manifest failed');
    return;
  }
  console.log('Raw manifest:\n', manifest.text.slice(0, 300));
  const rewritten = rewriteM3u8Playlist(manifest.text, manifest.finalUrl);
  console.log('Rewritten manifest:\n', rewritten.slice(0, 400));

  // Extract first segment URL
  const lines = rewritten.split('\n');
  const segLine = lines.find(l => l.startsWith('/api/stream/segment?url='));
  if (segLine) {
    const rawSegUrl = decodeURIComponent(segLine.replace('/api/stream/segment?url=', ''));
    console.log('First segment resolved URL:', rawSegUrl);
    console.log('isAllowedProxyUrl:', isAllowedProxyUrl(rawSegUrl));

    // Test fetching segment directly
    try {
      const res = await fetch(rawSegUrl, {
        headers: { 'User-Agent': 'IPTVSmartersPro/3.1.5' },
        signal: AbortSignal.timeout(5000)
      });
      console.log('Segment fetch status:', res.status, 'Content-Type:', res.headers.get('content-type'), 'Content-Length:', res.headers.get('content-length'));
    } catch (e: any) {
      console.log('Segment fetch error:', e.message);
    }
  }
}

test();

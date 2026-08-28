import { fetchManifestWithRedirects, getActiveXtreamCredentials } from '../src/lib/streamProxy';
import { XtreamClient } from '../src/lib/xtreamClient';

async function test() {
  const creds = getActiveXtreamCredentials();
  console.log('Active creds:', creds);
  
  const client = new XtreamClient({
    baseUrl: creds.baseUrl,
    username: creds.username,
    password: creds.password,
  });

  try {
    const catalog = await client.fetchFullCatalog();
    console.log('Catalog stats:', {
      auth: catalog.account.authStatus,
      categoriesCount: catalog.categories.length,
      channelsCount: catalog.channels.length,
      first3Channels: catalog.channels.slice(0, 3).map(c => ({ id: c.streamId, name: c.name, url: c.resolvedStreamUrl })),
    });

    if (catalog.channels.length > 0) {
      const ch = catalog.channels[0];
      const streamId = ch.streamId;
      const m3u8Url = `${creds.baseUrl}/live/${creds.username}/${creds.password}/${streamId}.m3u8`;
      const tsUrl = `${creds.baseUrl}/live/${creds.username}/${creds.password}/${streamId}.ts`;

      console.log('Testing m3u8 fetch for streamId', streamId, ':', m3u8Url);
      const m3u8Res = await fetchManifestWithRedirects(m3u8Url, 3, 1);
      console.log('m3u8 Result:', m3u8Res ? { status: m3u8Res.statusCode, len: m3u8Res.text.length, sample: m3u8Res.text.slice(0, 150) } : 'null');

      console.log('Testing TS fetch for streamId', streamId, ':', tsUrl);
      try {
        const res = await fetch(tsUrl, {
          headers: { 'User-Agent': 'IPTVSmartersPro/3.1.5' },
          signal: AbortSignal.timeout(8000),
        });
        console.log('TS response:', res.status, res.headers.get('content-type'));
      } catch (e: any) {
        console.log('TS fetch error:', e.message);
      }
    }
  } catch (err: any) {
    console.log('Xtream Error:', err.message);
  }
}

test();

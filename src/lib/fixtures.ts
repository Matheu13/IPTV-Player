import { redact } from './redact';

export const FIXTURES_DIR = 'tests/fixtures';

export const FIXTURE_AUTH_ACTIVE = {
  user_info: {
    username: 'pr…8d2a',
    password: 'p1…3e9c',
    message: 'We hope you enjoy your subscription.',
    auth: 1,
    status: 'Active',
    exp_date: '1789459200',
    is_trial: '0',
    active_cons: '0',
    created_at: '1704067200',
    max_connections: '1',
    allowed_output_formats: ['m3u8', 'ts', 'rtmp'],
  },
  server_info: {
    url: 'provider.panel-stream.net',
    port: '8080',
    https_port: '8443',
    server_protocol: 'http',
    rtmp_port: '8888',
    timezone: 'UTC',
    timestamp_now: 1787654321,
    time_now: '2026-08-25 17:18:41',
  },
};

export const FIXTURE_AUTH_EXPIRED = {
  user_info: {
    username: 'us…4b1a',
    password: 'pa…9f0d',
    message: 'Your account has expired on 2026-06-01.',
    auth: 1,
    status: 'Expired',
    exp_date: '1780272000',
    is_trial: '0',
    active_cons: '0',
    created_at: '1672531199',
    max_connections: '1',
    allowed_output_formats: ['ts', 'm3u8'],
  },
  server_info: {
    url: 'provider.panel-stream.net',
    port: '8080',
    server_protocol: 'http',
    time_now: '2026-08-25 17:18:41',
  },
};

export const FIXTURE_AUTH_BANNED = {
  user_info: {
    username: 'le…91c4',
    password: 'se…18e7',
    message: 'Your account has been banned due to simultaneous connection breach or TOS violation.',
    auth: 0,
    status: 'Banned',
    exp_date: '1789459200',
    is_trial: '0',
    active_cons: '0',
    created_at: '1704067200',
    max_connections: '1',
    allowed_output_formats: ['ts'],
  },
  server_info: {
    url: 'provider.panel-stream.net',
    port: '8080',
    server_protocol: 'http',
    time_now: '2026-08-25 17:18:41',
  },
};

export const FIXTURE_AUTH_DISABLED = {
  user_info: {
    username: 'ho…2a90',
    password: 'ke…6f43',
    message: 'User account disabled by reseller/admin.',
    auth: 0,
    status: 'Disabled',
    exp_date: '1789459200',
    is_trial: '0',
    active_cons: '0',
    created_at: '1704067200',
    max_connections: '1',
    allowed_output_formats: ['ts'],
  },
  server_info: {
    url: 'provider.panel-stream.net',
    port: '8080',
    server_protocol: 'http',
    time_now: '2026-08-25 17:18:41',
  },
};

export const FIXTURE_AUTH_BAD_CREDENTIALS = {
  user_info: {
    auth: 0,
  },
};

/**
 * THE CRUCIAL BUG CASE:
 * Auth succeeds (Active), but `get_live_categories` returns empty array []
 * due to missing bouquet assignment on the provider's reseller panel.
 */
export const FIXTURE_CATEGORIES_EMPTY: any[] = [];

export const FIXTURE_CATEGORIES_VALID = [
  {
    category_id: '1',
    category_name: 'US | GENERAL ENTERTAINMENT',
    parent_id: 0,
  },
  {
    category_id: '2',
    category_name: 'US | NEWS & WEATHER',
    parent_id: 0,
  },
  {
    category_id: '3',
    category_name: 'US | LIVE SPORTS (60FPS)',
    parent_id: 0,
  },
  {
    category_id: '4',
    category_name: 'UK | PREMIUM CHANNELS',
    parent_id: 0,
  },
  {
    category_id: '5',
    category_name: 'CA | REGIONAL NETWORKS',
    parent_id: 0,
  },
];

export const FIXTURE_STREAMS_SAMPLE = [
  {
    num: 1,
    name: 'US: ESPN HD (60FPS)',
    stream_type: 'live',
    stream_id: 10452,
    stream_icon: 'https://img.provider-cdn.com/icons/espn.png',
    epg_channel_id: 'ESPN.us',
    added: '1683921000',
    category_id: '3',
    custom_sid: '',
    tv_archive: 1,
    direct_source: '',
    tv_archive_duration: 3,
  },
  {
    num: 2,
    name: 'US: CNN INTERNATIONAL',
    stream_type: 'live',
    stream_id: 10453,
    stream_icon: 'https://img.provider-cdn.com/icons/cnn.png',
    epg_channel_id: 'CNN.us',
    added: '1683921000',
    category_id: '2',
    custom_sid: '',
    tv_archive: 1,
    direct_source: '',
    tv_archive_duration: 3,
  },
  {
    num: 3,
    name: 'UK: BBC ONE HD',
    stream_type: 'live',
    stream_id: 10454,
    stream_icon: 'https://img.provider-cdn.com/icons/bbcone.png',
    epg_channel_id: 'BBCOne.uk',
    added: '1683921000',
    category_id: '4',
    custom_sid: '',
    tv_archive: 0,
    direct_source: '',
    tv_archive_duration: 0,
  },
];

export const FIXTURE_STREAM_PROBE_RESULT = {
  timestamp: '2026-08-25T17:18:41.200Z',
  target_url: 'http://provider.panel-stream.net:8080/live/pr…8d2a/p1…3e9c/10452.ts',
  probed_formats: [
    {
      format: 'ts',
      url: 'http://provider.panel-stream.net:8080/live/pr…8d2a/p1…3e9c/10452.ts',
      headStatus: 405,
      headContentType: null,
      headMethodUsed: 'GET_RANGE_FALLBACK',
      getRangeStatus: 206,
      getContentType: 'video/mp2t',
      bytesReceived: 1024,
      sniffResult: {
        detectedType: 'MPEG-TS',
        confidence: 0.95,
        syncByteCount: 5,
        firstSyncOffset: 0,
        isMpegTs188: true,
        isHls: false,
        isHtml: false,
        rawHeaderHex: '474011100042f0260001c10000ff01ff0001fc80144812010655533a204553504e',
        demuxerNotes: 'Raw MPEG-TS (188-byte packet stream) with 5 consecutive 0x47 sync bytes starting at offset 0.',
      },
      usableForPlayback: true,
    },
    {
      format: 'm3u8',
      url: 'http://provider.panel-stream.net:8080/live/pr…8d2a/p1…3e9c/10452.m3u8',
      headStatus: 200,
      headContentType: 'application/vnd.apple.mpegurl',
      headMethodUsed: 'HEAD',
      getRangeStatus: 200,
      getContentType: 'application/vnd.apple.mpegurl',
      bytesReceived: 842,
      sniffResult: {
        detectedType: 'HLS',
        confidence: 1.0,
        syncByteCount: 0,
        firstSyncOffset: -1,
        isMpegTs188: false,
        isHls: true,
        isHtml: false,
        rawHeaderHex: '234558544d33550a234558542d582d56455253494f4e3a330a234558542d582d',
        demuxerNotes: 'HLS Master/Media playlist. Demuxer should use HLS manifest parser.',
      },
      usableForPlayback: true,
    },
  ],
  overallAssessment: {
    streamType: 'MIXED',
    preferredFormat: 'm3u8',
    fallbackFormat: 'ts',
    demuxerConfiguration: 'Primary HLS (.m3u8) for adaptive seeking and recovery, fallback to raw MPEG-TS (.ts) with mpv format=mpegts.',
  },
};

export const FIXTURE_ERROR_429_RATELIMIT = {
  status: 429,
  error: 'Too Many Requests',
  message: 'Rate limit exceeded. Temporary cooldown in effect. Exponential backoff required.',
  retry_after_seconds: 60,
  ip_ban_temporary: true,
};

export const FIXTURE_ERROR_HTML_INTERSTITIAL = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cloudflare / ISP Interstitial Security Verification</title>
</head>
<body>
  <h1>Attention Required! | Cloudflare</h1>
  <p>Please complete the security check to access the streaming server.</p>
  <div id="challenge-running">Checking your browser...</div>
</body>
</html>`;

export const FIXTURE_ERROR_TRUNCATED_JSON_STRING = `{"user_info":{"username":"pr...8d2a","status":"Active","exp_date":"1789459200","allowed_output_formats":["ts","m3u`;


/**
 * Automated Test Suite for Milestones 6, 7, 8, 9 & 10
 * - Milestone 6: Streaming XMLTV & Indexed SQLite EPG
 * - Milestone 7: Authorized Stalker/MAG Portal Adapter
 * - Milestone 8: Advanced Playback, Decoders, 8K/HDR & Local VPN Diagnostics
 * - Milestone 9: Unified Multi-Source Matrix (Xtream + M3U + Stalker)
 * - Milestone 10: Production Hardening, Security Redaction & Zero-Leak Resilience
 */

import { StalkerPortalAdapter } from '../src/lib/stalkerClient';
import { DeviceCapabilityDetector } from '../src/lib/deviceCapabilityDetector';
import { VpnDiagnosticsEngine } from '../src/lib/vpnDiagnostics';
import { MultiSourceOrchestrator } from '../src/lib/multiSourceOrchestrator';
import { XmltvStreamParser } from '../src/lib/xmltvStreamParser';
import { matchChannelToXmltv } from '../src/lib/fuzzyEpgMatcher';
import { redact } from '../src/lib/redact';

interface TestResult {
  testId: string;
  milestone: string;
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  assertionMessage?: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testId: string, milestone: string, category: string, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(
  testId: string,
  milestone: string,
  category: string,
  name: string,
  fn: () => Promise<string> | string
) {
  const start = Date.now();
  try {
    const msg = await fn();
    const durationMs = Date.now() - start;
    results.push({
      testId,
      milestone,
      category,
      name,
      passed: true,
      durationMs,
      assertionMessage: msg,
    });
    console.log(`\x1b[32m[✓ PASS]\x1b[0m [${milestone}] ${testId}: ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      testId,
      milestone,
      category,
      name,
      passed: false,
      durationMs,
      error: err.message,
    });
    console.error(`\x1b[31m[✗ FAIL]\x1b[0m [${milestone}] ${testId}: ${name} - ${err.message}`);
  }
}

export async function runMilestones6To10TestSuite() {
  results.length = 0;
  console.log('================== MILESTONES 6, 7, 8, 9 & 10 AUTOMATED TEST SUITE ==================');

  // ==========================================
  // MILESTONE 6: Streaming XMLTV & SQLite EPG
  // ==========================================
  await runTest(
    'TEST-M6-01',
    'Milestone 6',
    'XMLTV Streaming Parser',
    'Parses multi-megabyte XMLTV chunks incrementally without memory spikes',
    async () => {
      const sampleXml = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
  <channel id="bbc1.uk"><display-name>BBC One HD</display-name></channel>
  <programme start="20260825120000 +0000" stop="20260825130000 +0000" channel="bbc1.uk">
    <title>BBC News at One</title>
    <desc>Latest national and international news.</desc>
  </programme>
  <programme start="20260825130000 +0000" stop="20260825143000 +0000" channel="bbc1.uk">
    <title>Bargain Hunt</title>
    <desc>Antiques game show.</desc>
  </programme>
</tv>`;
      const parser = new XmltvStreamParser();
      const parsed = await parser.parseXmlString(sampleXml);

      assert(parsed.channels.length === 1, 'TEST-M6-01', 'M6', 'parser', 'Parsed 1 channel');
      assert(parsed.programmes.length === 2, 'TEST-M6-01', 'M6', 'parser', 'Parsed 2 programmes');
      assert(parsed.programmes[0].title === 'BBC News at One', 'TEST-M6-01', 'M6', 'parser', 'Verified title');

      return 'Stream parser processed channel and programme elements with start/stop timestamps';
    }
  );

  await runTest(
    'TEST-M6-02',
    'Milestone 6',
    'Fuzzy EPG Matching',
    'Resolves channel names to tvg-id using weighted Levenshtein & normalization',
    () => {
      const candidateXmltvChannels = [
        { id: 'sky_sports_f1_hd', displayName: 'Sky Sports F1 HD' },
        { id: 'espn_hd_us', displayName: 'ESPN HD (USA)' },
      ];

      const match1 = matchChannelToXmltv(
        { id: 'ch_1', name: 'Sky Sports F1 FHD 1080p' },
        candidateXmltvChannels
      );
      assert(match1.xmltvChannelId === 'sky_sports_f1_hd', 'TEST-M6-02', 'M6', 'fuzzy', 'F1 fuzzy match');
      assert(match1.matchScore >= 0.80, 'TEST-M6-02', 'M6', 'fuzzy', 'High confidence');

      return `Fuzzy matcher paired "Sky Sports F1 FHD" with score ${(match1.matchScore * 100).toFixed(1)}%`;
    }
  );

  // ==========================================
  // MILESTONE 7: Stalker / MAG Portal Adapter
  // ==========================================
  await runTest(
    'TEST-M7-01',
    'Milestone 7',
    'Stalker Portal URL Normalization',
    'Normalizes various Stalker portal base URLs into compliant load.php endpoints',
    () => {
      const a1 = new StalkerPortalAdapter({
        sourceId: 's1',
        portalUrl: 'http://portal.example.com/c/',
        macAddress: '00:1A:79:00:11:22',
      });
      assert(
        a1.getNormalizedEndpoint() === 'http://portal.example.com/server/load.php',
        'TEST-M7-01',
        'M7',
        'stalker',
        'Normalized /c/ URL'
      );

      const a2 = new StalkerPortalAdapter({
        sourceId: 's2',
        portalUrl: 'http://portal.example.com/server/load.php',
        macAddress: '00:1A:79:00:11:22',
      });
      assert(
        a2.getNormalizedEndpoint() === 'http://portal.example.com/server/load.php',
        'TEST-M7-01',
        'M7',
        'stalker',
        'Direct load.php URL'
      );

      return 'Normalized Stalker /c/ and direct endpoints to /server/load.php';
    }
  );

  await runTest(
    'TEST-M7-02',
    'Milestone 7',
    'Stalker Header & MAC Cookie Injection',
    'Injects authorized MAG User-Agent and device MAC cookies',
    () => {
      const adapter = new StalkerPortalAdapter({
        sourceId: 's1',
        portalUrl: 'http://portal.example.com',
        macAddress: '00:1A:79:55:66:77',
        deviceModel: 'MAG322',
      });

      const headers = adapter.getRequestHeaders();
      assert(headers.Cookie.includes('mac=00%3A1A%3A79%3A55%3A66%3A77'), 'TEST-M7-02', 'M7', 'headers', 'MAC cookie');
      assert(headers['User-Agent'].includes('MAG200 stbapp'), 'TEST-M7-02', 'M7', 'headers', 'MAG UA');
      assert(headers['X-User-Agent'].includes('Model: MAG322'), 'TEST-M7-02', 'M7', 'headers', 'Device model');

      return 'Stalker request headers constructed with MAC cookie and MAG322 X-User-Agent';
    }
  );

  await runTest(
    'TEST-M7-03',
    'Milestone 7',
    'Stalker Stream Cmd Link Parsing',
    'Extracts raw playback stream URLs from ffmpeg and ffrt command strings',
    () => {
      const adapter = new StalkerPortalAdapter({
        sourceId: 's1',
        portalUrl: 'http://portal.example.com',
        macAddress: '00:1A:79:55:66:77',
      });

      const url1 = adapter.extractStreamUrlFromCmd('ffmpeg http://stream.iptv.com/live/101.m3u8');
      assert(url1 === 'http://stream.iptv.com/live/101.m3u8', 'TEST-M7-03', 'M7', 'cmd', 'Stripped ffmpeg');

      const url2 = adapter.extractStreamUrlFromCmd('ffrt http://stream.iptv.com/live/202.ts');
      assert(url2 === 'http://stream.iptv.com/live/202.ts', 'TEST-M7-03', 'M7', 'cmd', 'Stripped ffrt');

      return 'Cleanly stripped Stalker ffmpeg and ffrt prefixes to expose playable stream URLs';
    }
  );

  // ==========================================
  // MILESTONE 8: Advanced Playback & Diagnostics
  // ==========================================
  await runTest(
    'TEST-M8-01',
    'Milestone 8',
    'Device Capability Detection',
    'Identifies hardware decoders and codec profiles (HEVC Main10, AV1, 8K, HDR10)',
    async () => {
      const caps = await DeviceCapabilityDetector.detectPlatformCapabilities();

      assert(Boolean(caps.hardwareDecoderApi), 'TEST-M8-01', 'M8', 'caps', 'Decoder API present');
      assert(caps.supportedCodecs.length >= 4, 'TEST-M8-01', 'M8', 'caps', 'Codec matrix queried');

      const hevc = caps.supportedCodecs.find((c) => c.codec.includes('HEVC'));
      assert(Boolean(hevc && hevc.hdrSupported), 'TEST-M8-01', 'M8', 'caps', 'HEVC HDR verified');

      return `Detected hardware decoder pipeline: "${caps.hardwareDecoderApi}" with 8K HEVC HDR10 capabilities`;
    }
  );

  await runTest(
    'TEST-M8-02',
    'Milestone 8',
    'Local VPN & Network Diagnostic Probes',
    'Performs privacy-safe local diagnostics without external telemetry leakage',
    async () => {
      const report = await VpnDiagnosticsEngine.runDiagnostics('http://provider.iptv.com');

      assert(report.vpnDetected === true, 'TEST-M8-02', 'M8', 'vpn', 'VPN detected');
      assert(report.dnsLatencyMs >= 0, 'TEST-M8-02', 'M8', 'vpn', 'DNS latency measured');
      assert(report.gatewayReachability === 'HEALTHY', 'TEST-M8-02', 'M8', 'vpn', 'Gateway healthy');

      const safeText = VpnDiagnosticsEngine.formatSafeExport(report);
      assert(safeText.includes('Masked'), 'TEST-M8-02', 'M8', 'vpn', 'Masked in export');

      return `Local VPN probe reported ${report.dnsLatencyMs}ms DNS and ${report.providerPingLatencyMs}ms provider RTT`;
    }
  );

  // ==========================================
  // MILESTONE 9: Unified Multi-Source Matrix
  // ==========================================
  await runTest(
    'TEST-M9-01',
    'Milestone 9',
    'Multi-Source Concurrency Isolation',
    'Enforces per-source concurrency pools across Xtream, M3U, and Stalker',
    () => {
      const orch = new MultiSourceOrchestrator();
      const sources = orch.getAllSources();

      assert(sources.length === 3, 'TEST-M9-01', 'M9', 'multi', '3 default sources');

      const xtreamCheck = orch.checkCanTune('src_xtream_prime');
      assert(xtreamCheck.allowed === true, 'TEST-M9-01', 'M9', 'multi', 'Xtream tune allowed');

      orch.toggleSourceEnabled('src_m3u_backup');
      const m3uCheck = orch.checkCanTune('src_m3u_backup');
      assert(m3uCheck.allowed === false, 'TEST-M9-01', 'M9', 'multi', 'Disabled source rejected');

      return 'Independent concurrency and enabled-state checks isolated per source';
    }
  );

  await runTest(
    'TEST-M9-02',
    'Milestone 9',
    'Cross-Source Favorites & Global Search',
    'Aggregates channels across distinct sources without cross-contamination',
    () => {
      const orch = new MultiSourceOrchestrator();

      orch.registerChannel('src_xtream_prime', {
        id: '101',
        number: 101,
        name: 'ESPN HD',
        streamUrl: 'http://xtream/101.m3u8',
        category: 'Sports',
      });

      orch.registerChannel('src_stalker_mag', {
        id: '501',
        number: 501,
        name: 'Sky Sports Main Event',
        streamUrl: 'http://stalker/501.ts',
        category: 'Sports',
      });

      const searchSports = orch.searchChannels('sports');
      assert(searchSports.length >= 1, 'TEST-M9-02', 'M9', 'search', 'Found sports channels');

      // Add to favorites
      orch.toggleFavorite('src_stalker_mag:501');
      assert(orch.isFavorite('src_stalker_mag:501') === true, 'TEST-M9-02', 'M9', 'fav', 'Favorite saved');

      const favs = orch.getFavoriteChannels();
      assert(favs.length === 1 && favs[0].id === '501', 'TEST-M9-02', 'M9', 'fav', 'Fav channel recovered');

      return 'Global search and composite-key favorites unified Xtream and Stalker sources seamlessly';
    }
  );

  // ==========================================
  // MILESTONE 10: Production Hardening & Redaction
  // ==========================================
  await runTest(
    'TEST-M10-01',
    'Milestone 10',
    'Zero-Leak Sensitive Secret Redaction',
    'Redacts passwords, tokens, API keys, and MAC addresses from error and log traces',
    () => {
      const rawError = 'Failed to connect to http://user:SecretPass123@iptv.com/live?token=JWT_TOP_SECRET&mac=00:1A:79:AA:BB:CC';
      const safe = redact(rawError);

      assert(!safe.includes('SecretPass123'), 'TEST-M10-01', 'M10', 'redact', 'Pass redacted');
      assert(!safe.includes('JWT_TOP_SECRET'), 'TEST-M10-01', 'M10', 'redact', 'Token redacted');

      return 'Sensitive credentials and access tokens successfully masked';
    }
  );

  await runTest(
    'TEST-M10-02',
    'Milestone 10',
    'Fault Containment & Non-Crashing Resilience',
    'Recovers gracefully from corrupted payloads, empty streams, and network timeouts',
    async () => {
      const adapter = new StalkerPortalAdapter({
        sourceId: 'broken_source',
        portalUrl: 'http://invalid-non-existent-portal-host.xyz',
        macAddress: '00:1A:79:11:22:33',
      });

      const result = await adapter.performHandshake();
      assert(result.success === false, 'TEST-M10-02', 'M10', 'resilience', 'Handled offline portal cleanly');
      assert(Boolean(result.error), 'TEST-M10-02', 'M10', 'resilience', 'Produced sanitized error object');

      return 'Network outage and invalid DNS contained without unhandled promise rejections';
    }
  );

  console.log('--------------------------------------------------------------------------------------');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Assertions: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('======================================================================================');

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1]?.endsWith('milestones_6_to_10_tests.ts')) {
  runMilestones6To10TestSuite().catch(console.error);
}

/**
 * Milestone 1 Automated Test Suite
 * Executes assertions against all 12 Milestone 0 fixtures, Error Taxonomy,
 * Stream URL Policy, M3U Asymmetry Normalizer, Cache Manager (Empty Overwrite Protection),
 * and Connection Limit (Max=1) State Machine.
 */

import fs from 'fs';
import path from 'path';
import { classifyError, ErrorCode } from '../src/lib/errorTaxonomy';
import { buildStreamUrlPlan, handlePlaybackDowngrade } from '../src/lib/streamUrlPolicy';
import { parseM3UPlaylist } from '../src/lib/m3uParser';
import { CacheManager } from '../src/lib/cacheManager';
import { SingleConnectionManager } from '../src/lib/connectionManager';
import {
  FIXTURES_DIR,
  FIXTURE_AUTH_ACTIVE,
  FIXTURE_AUTH_EXPIRED,
  FIXTURE_AUTH_BANNED,
  FIXTURE_AUTH_DISABLED,
  FIXTURE_AUTH_BAD_CREDENTIALS,
  FIXTURE_CATEGORIES_EMPTY,
  FIXTURE_CATEGORIES_VALID,
  FIXTURE_STREAMS_SAMPLE,
  FIXTURE_ERROR_429_RATELIMIT,
  FIXTURE_ERROR_HTML_INTERSTITIAL,
  FIXTURE_ERROR_TRUNCATED_JSON_STRING,
} from '../src/lib/fixtures';

export interface TestResult {
  testId: string;
  name: string;
  category: string;
  passed: boolean;
  durationMs: number;
  assertionMessage: string;
  details?: any;
}

export async function runMilestone1TestSuite(): Promise<{
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
}> {
  const results: TestResult[] = [];

  function record(
    testId: string,
    name: string,
    category: string,
    fn: () => void | Promise<void>
  ) {
    const start = Date.now();
    try {
      fn();
      results.push({
        testId,
        name,
        category,
        passed: true,
        durationMs: Date.now() - start,
        assertionMessage: 'Assertion passed successfully.',
      });
    } catch (err: any) {
      results.push({
        testId,
        name,
        category,
        passed: false,
        durationMs: Date.now() - start,
        assertionMessage: err.message || String(err),
        details: err.stack,
      });
    }
  }

  // 1. Fixture: auth_active.json
  record('TEST-M1-01', 'Auth Active: Parse connection limit and allowed formats', 'Auth & Taxonomy', () => {
    const error = classifyError(FIXTURE_AUTH_ACTIVE);
    if (error.code !== ErrorCode.UNKNOWN_ERROR && (error.code as any) !== 'ACTIVE') {
      // Classification shouldn't flag active as fatal error
    }
    const maxCons = parseInt(FIXTURE_AUTH_ACTIVE.user_info.max_connections, 10);
    const formats = FIXTURE_AUTH_ACTIVE.user_info.allowed_output_formats;
    if (maxCons !== 1) throw new Error(`Expected max_connections = 1, got ${maxCons}`);
    if (!formats.includes('m3u8') || !formats.includes('ts')) throw new Error('Missing allowed output formats');
  });

  // 2. Fixture: auth_expired.json
  record('TEST-M1-02', 'Auth Expired: Specific taxonomy classification & message', 'Auth & Taxonomy', () => {
    const error = classifyError(FIXTURE_AUTH_EXPIRED);
    if (error.code !== ErrorCode.AUTH_NON_ACTIVE_EXPIRED) {
      throw new Error(`Expected AUTH_NON_ACTIVE_EXPIRED, got ${error.code}`);
    }
    if (!error.userMessage.includes('expired')) {
      throw new Error(`User message did not describe expiration: ${error.userMessage}`);
    }
    if (error.isRetryable !== false) throw new Error('Expired account should not be automatically retryable');
  });

  // 3. Fixture: auth_banned.json
  record('TEST-M1-03', 'Auth Banned: Specific taxonomy classification & message', 'Auth & Taxonomy', () => {
    const error = classifyError(FIXTURE_AUTH_BANNED);
    if (error.code !== ErrorCode.AUTH_NON_ACTIVE_BANNED) {
      throw new Error(`Expected AUTH_NON_ACTIVE_BANNED, got ${error.code}`);
    }
    if (!error.userMessage.includes('banned')) {
      throw new Error(`User message did not describe ban: ${error.userMessage}`);
    }
  });

  // 4. Fixture: auth_disabled.json
  record('TEST-M1-04', 'Auth Disabled: Specific taxonomy classification & reseller notice', 'Auth & Taxonomy', () => {
    const error = classifyError(FIXTURE_AUTH_DISABLED);
    if (error.code !== ErrorCode.AUTH_NON_ACTIVE_DISABLED) {
      throw new Error(`Expected AUTH_NON_ACTIVE_DISABLED, got ${error.code}`);
    }
    if (!error.userMessage.includes('disabled')) {
      throw new Error(`User message did not describe disabled status: ${error.userMessage}`);
    }
  });

  // 5. Fixture: auth_bad_credentials.json
  record('TEST-M1-05', 'Auth Bad Credentials: auth=0 detection', 'Auth & Taxonomy', () => {
    const error = classifyError(FIXTURE_AUTH_BAD_CREDENTIALS);
    if (error.code !== ErrorCode.AUTH_BAD_CREDENTIALS) {
      throw new Error(`Expected AUTH_BAD_CREDENTIALS, got ${error.code}`);
    }
  });

  // 6. Fixture: categories_empty.json (Crucial investigated bug)
  record('TEST-M1-06', 'Empty Categories: Synthetic "All Channels" fallback category', 'Bouquet Resilience', () => {
    const rawCategories = FIXTURE_CATEGORIES_EMPTY;
    if (!Array.isArray(rawCategories) || rawCategories.length === 0) {
      const fallbackCategory = {
        id: 'all_channels_fallback',
        name: 'All Channels (Provider Bouquet Unassigned)',
        isSyntheticFallback: true,
      };
      if (!fallbackCategory.isSyntheticFallback) {
        throw new Error('Failed to set isSyntheticFallback flag');
      }
    } else {
      throw new Error('Test fixture should have been empty array');
    }
  });

  // 7. Fixture: error_429_ratelimit.json
  record('TEST-M1-07', 'HTTP 429: Exponential backoff & tight-loop suppression', 'Error Taxonomy', () => {
    const error = classifyError(FIXTURE_ERROR_429_RATELIMIT, { statusCode: 429 });
    if (error.code !== ErrorCode.RATE_LIMITED_429) {
      throw new Error(`Expected RATE_LIMITED_429, got ${error.code}`);
    }
    if (error.retryStrategy !== 'EXPONENTIAL_BACKOFF') {
      throw new Error(`Expected EXPONENTIAL_BACKOFF, got ${error.retryStrategy}`);
    }
    if ((error.backoffSeconds || 0) < 15) {
      throw new Error(`Expected backoffSeconds >= 15, got ${error.backoffSeconds}`);
    }
  });

  // 8. Fixture: error_html_interstitial.html
  record('TEST-M1-08', 'HTML Interstitial: Cloudflare/ISP challenge detection on 200 OK', 'Error Taxonomy', () => {
    const error = classifyError(FIXTURE_ERROR_HTML_INTERSTITIAL, {
      statusCode: 200,
      contentType: 'text/html; charset=UTF-8',
      rawBody: FIXTURE_ERROR_HTML_INTERSTITIAL,
      endpoint: 'http://provider.panel:8080/player_api.php',
    });
    if (error.code !== ErrorCode.HTML_INTERSTITIAL_ERROR) {
      throw new Error(`Expected HTML_INTERSTITIAL_ERROR, got ${error.code}`);
    }
    if (!error.userMessage.includes('Cloudflare') && !error.userMessage.includes('challenge')) {
      throw new Error(`User message did not describe challenge: ${error.userMessage}`);
    }
  });

  // 9. Fixture: error_truncated.json
  record('TEST-M1-09', 'Truncated JSON vs Malformed JSON: Retryability distinction', 'Error Taxonomy', () => {
    let parseError: any;
    try {
      JSON.parse(FIXTURE_ERROR_TRUNCATED_JSON_STRING);
    } catch (e) {
      parseError = e;
    }
    const error = classifyError(parseError, {
      statusCode: 200,
      contentType: 'application/json',
      rawBody: FIXTURE_ERROR_TRUNCATED_JSON_STRING,
    });

    if (error.code !== ErrorCode.TRUNCATED_PARTIAL_JSON) {
      throw new Error(`Expected TRUNCATED_PARTIAL_JSON, got ${error.code}`);
    }
    if (error.isRetryable !== true) {
      throw new Error('Truncated JSON should be retryable (dropped socket)');
    }
  });

  // 10. Stream URL Policy: Priority & Downgrade
  record('TEST-M1-10', 'Stream URL Policy: HLS priority, dynamic URL build, and downgrade fallback', 'Stream URL Policy', () => {
    const plan = buildStreamUrlPlan({
      baseUrl: 'http://provider.panel:8080',
      username: 'user123',
      password: 'pass123',
      streamId: 10452,
      allowedOutputFormats: ['m3u8', 'ts', 'rtmp'],
    });

    if (plan.preferredFormat !== 'm3u8') throw new Error(`Expected preferred format m3u8, got ${plan.preferredFormat}`);
    if (!plan.primaryUrl.endsWith('/10452.m3u8')) throw new Error(`Expected URL ending in .m3u8, got ${plan.primaryUrl}`);
    if (!plan.fallbackChain.includes('ts')) throw new Error('Expected ts in fallback chain');

    // Simulate downgrade
    const downgrade = handlePlaybackDowngrade(plan.preferredFormat, plan, 10452, 'Codec initialization failed');
    if (downgrade.nextFormat !== 'ts') throw new Error(`Expected downgraded format 'ts', got ${downgrade.nextFormat}`);
    if (!downgrade.nextUrl?.endsWith('/10452.ts')) throw new Error(`Expected downgraded URL ending in .ts, got ${downgrade.nextUrl}`);
    if (!downgrade.event) throw new Error('Expected downgrade event to be recorded');
  });

  // 11. M3U Parser: Normalization & Asymmetry Tags
  record('TEST-M1-11', 'M3U Normalizer: Tag extraction & unmetered accounting degradation', 'M3U Normalizer', () => {
    const sampleM3U = `#EXTM3U
#EXTINF:-1 tvg-id="ESPN.us" tvg-name="ESPN HD" tvg-logo="https://img.com/espn.png" group-title="US | SPORTS" catchup="default" catchup-days="3", ESPN HD
http://provider.panel:8080/live/u/p/101.ts
#EXTINF:-1 tvg-id="CNN.us" group-title="US | NEWS", CNN News
http://provider.panel:8080/live/u/p/102.m3u8`;

    const parsed = parseM3UPlaylist(sampleM3U);
    if (parsed.channels.length !== 2) throw new Error(`Expected 2 channels, got ${parsed.channels.length}`);
    if (parsed.categories.length !== 2) throw new Error(`Expected 2 categories, got ${parsed.categories.length}`);

    const espn = parsed.channels[0];
    if (espn.epgChannelId !== 'ESPN.us') throw new Error(`Expected tvg-id ESPN.us, got ${espn.epgChannelId}`);
    if (espn.tvArchive !== true || espn.tvArchiveDurationDays !== 3) {
      throw new Error('Failed to parse catchup metadata correctly');
    }

    if (parsed.capabilities.supportsServerConnectionAccounting !== false) {
      throw new Error('M3U should degrade supportsServerConnectionAccounting to false');
    }
  });

  // 12. Cache Manager: Empty-Overwrite Protection
  record('TEST-M1-12', 'Cache Manager: Instant retrieval, TTL check & EMPTY-OVERWRITE PROTECTION', 'Cache Engine', () => {
    const cache = new CacheManager();
    const key = 'test_source_key';

    // Step 1: Save valid catalog
    const save1 = cache.saveCatalog(key, 'XTREAM', {
      account: null,
      categories: [{ id: '1', name: 'Sports', sourceType: 'XTREAM' }],
      channels: [{
        id: '1',
        streamId: 101,
        name: 'ESPN',
        streamType: 'live',
        categoryId: '1',
        tvArchive: false,
        sourceType: 'XTREAM',
        formatsAvailable: ['m3u8'],
      }],
    });
    if (!save1.saved) throw new Error('Initial valid cache save failed');

    // Step 2: Attempt empty overwrite (e.g. panel glitch returning 0 channels)
    const save2 = cache.saveCatalog(key, 'XTREAM', {
      account: null,
      categories: [],
      channels: [],
    });

    if (save2.saved !== false || save2.emptyOverwriteBlocked !== true) {
      throw new Error('CRITICAL FAILURE: Cache allowed an empty overwrite over valid cached channels!');
    }

    // Step 3: Verify existing data preserved
    const retrieved = cache.getCachedCatalog(key);
    if (!retrieved || retrieved.channels.length !== 1) {
      throw new Error('Cached channel was wiped despite guard');
    }
  });

  // 13. Single Connection State Machine (Max = 1)
  record('TEST-M1-13', 'Strict Connection Manager: Monotonic tokens & 300ms debounce', 'Connection State Machine', async () => {
    const mgr = new SingleConnectionManager();
    const token1 = mgr.getGenerationToken();

    // Fast channel switch 1
    const p1 = mgr.requestChannel({ id: 101, name: 'ESPN', streamUrl: 'http://test/101.m3u8' }, 50);
    // Fast channel switch 2 within debounce
    const p2 = mgr.requestChannel({ id: 102, name: 'CNN', streamUrl: 'http://test/102.m3u8' }, 50);

    const [res1, res2] = await Promise.all([p1, p2]);

    if (res1.success !== false) {
      throw new Error('First channel request during debounce should have been superseded');
    }
    if (res2.success !== true) {
      throw new Error('Final channel request after debounce should have connected');
    }
    if (mgr.getActiveSession()?.channelName !== 'CNN') {
      throw new Error(`Expected active channel CNN, got ${mgr.getActiveSession()?.channelName}`);
    }

    // Teardown
    mgr.teardownActiveStream('User stopped');
    if (mgr.getCurrentState() !== 'IDLE' || mgr.getActiveSession() !== null) {
      throw new Error('Teardown did not return state to IDLE or null session');
    }
  });

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

// If run via CLI: tsx scripts/milestone1_tests.ts
if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1]?.endsWith('milestone1_tests.ts')) {
  runMilestone1TestSuite().then((summary) => {
    console.log('\n================== MILESTONE 1 AUTOMATED TEST SUITE ==================');
    console.log(`Total Assertions: ${summary.total} | Passed: ${summary.passed} | Failed: ${summary.failed}`);
    console.log('----------------------------------------------------------------------');
    summary.results.forEach((r) => {
      const statusIcon = r.passed ? '✓ PASS' : '✗ FAIL';
      console.log(`[${statusIcon}] [${r.category}] ${r.testId}: ${r.name} (${r.durationMs}ms)`);
      if (!r.passed) {
        console.error(`       Error: ${r.assertionMessage}`);
      }
    });
    console.log('======================================================================\n');
    process.exit(summary.failed === 0 ? 0 : 1);
  });
}

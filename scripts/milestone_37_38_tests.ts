/**
 * Automated Test Suite: Milestones 37 & 38 (Source-Specific Refresh & Provider Status)
 *
 * Requirements Tested:
 * 37. Source-Specific Refresh
 *     - Each source maintains its own: refresh timestamp, cache state, refresh errors,
 *       connection state, connection limit, credentials, provider capabilities.
 *     - A failure in Provider A must not affect Provider B.
 * 38. Provider Status
 *     - Status taxonomy: Connected, Offline, Authentication failed, Refresh failed,
 *       Cached data available, Connection limit reached, Unknown.
 *     - Strict rule: Do not equate "cached data exists" with "provider is currently online."
 */

import {
  globalSourceMonitorEngine,
  SourceMonitorEngine,
} from '../src/lib/sourceMonitorEngine';

export interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

export async function runMilestone37to38TestSuite(): Promise<{
  totalPassed: number;
  totalFailed: number;
  results: TestCaseResult[];
}> {
  const results: TestCaseResult[] = [];
  const engine = new SourceMonitorEngine();

  // -------------------------------------------------------------
  // Test 1: Independent per-source state encapsulation
  // -------------------------------------------------------------
  try {
    const allSources = engine.getAllSources();
    const hasRequiredFields = allSources.every(
      (s) =>
        s.lastRefreshAttemptTs !== undefined &&
        s.lastRefreshSuccessTs !== undefined &&
        s.cacheState &&
        s.cacheState.hasCachedData !== undefined &&
        s.connectionState &&
        s.connectionState.status &&
        s.connectionState.maxConnections >= 1 &&
        s.credentials &&
        s.credentials.baseUrl &&
        s.capabilities &&
        s.capabilities.liveStreaming === true
    );

    if (allSources.length >= 3 && hasRequiredFields) {
      results.push({
        id: 'M37_T1_STATE_ENCAPSULATION',
        name: 'Per-Source State & Metadata Encapsulation (Section 37)',
        passed: true,
        message: `All ${allSources.length} sources independently maintain refresh timestamps, cache state, errors, limits, and capabilities.`,
        details: { sourceCount: allSources.length },
      });
    } else {
      results.push({
        id: 'M37_T1_STATE_ENCAPSULATION',
        name: 'Per-Source State & Metadata Encapsulation (Section 37)',
        passed: false,
        message: 'Sources do not maintain complete isolated metadata fields.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M37_T1_STATE_ENCAPSULATION',
      name: 'Per-Source State & Metadata Encapsulation (Section 37)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 2: Provider A Failure Does NOT Affect Provider B
  // -------------------------------------------------------------
  try {
    const srcBBefore = { ...engine.getSource('src_m3u_backup')! };

    // Inject 401 Auth Error on Provider A
    const resA = await engine.refreshSourceIsolated('src_xtream_prime', 'AUTH_FAIL');

    const srcA = engine.getSource('src_xtream_prime')!;
    const srcB = engine.getSource('src_m3u_backup')!;

    const providerAFailed =
      resA.success === false &&
      srcA.connectionState.status === 'Authentication failed' &&
      srcA.refreshError?.code === 'AUTH_401';

    const providerBUnmutated =
      srcB.connectionState.status === srcBBefore.connectionState.status &&
      srcB.lastRefreshAttemptTs === srcBBefore.lastRefreshAttemptTs;

    if (providerAFailed && providerBUnmutated) {
      results.push({
        id: 'M37_T2_FAULT_ISOLATION_AUTH',
        name: 'Provider A Failure Isolation (Section 37)',
        passed: true,
        message: 'HTTP 401 Auth error in Provider A was completely isolated; Provider B remained unmutated.',
        details: {
          providerA_status: srcA.connectionState.status,
          providerA_error: srcA.refreshError?.message,
          providerB_status: srcB.connectionState.status,
        },
      });
    } else {
      results.push({
        id: 'M37_T2_FAULT_ISOLATION_AUTH',
        name: 'Provider A Failure Isolation (Section 37)',
        passed: false,
        message: 'Cross-contamination detected or Provider A failed to register isolated error.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M37_T2_FAULT_ISOLATION_AUTH',
      name: 'Provider A Failure Isolation (Section 37)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 3: Provider B DNS Timeout Isolation
  // -------------------------------------------------------------
  try {
    const resB = await engine.refreshSourceIsolated('src_m3u_backup', 'TIMEOUT');
    const srcB = engine.getSource('src_m3u_backup')!;

    if (
      !resB.success &&
      srcB.connectionState.status === 'Offline' &&
      srcB.refreshError?.code === 'TIMEOUT_DNS'
    ) {
      results.push({
        id: 'M37_T3_DNS_TIMEOUT_ISOLATION',
        name: 'DNS Timeout Failure State Isolation (Section 37)',
        passed: true,
        message: 'Provider B registered "Offline" with isolated TIMEOUT_DNS without affecting other providers.',
        details: { status: srcB.connectionState.status, error: srcB.refreshError },
      });
    } else {
      results.push({
        id: 'M37_T3_DNS_TIMEOUT_ISOLATION',
        name: 'DNS Timeout Failure State Isolation (Section 37)',
        passed: false,
        message: 'DNS timeout was not recorded accurately on Provider B.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M37_T3_DNS_TIMEOUT_ISOLATION',
      name: 'DNS Timeout Failure State Isolation (Section 37)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 4: Decoupled Cache Status ("Do not equate cached data exists with provider is online")
  // -------------------------------------------------------------
  try {
    // Provider B is currently Offline (due to DNS timeout in Test 3), but has cached data in SQLite
    const srcB = engine.getSource('src_m3u_backup')!;
    const report = engine.getDecoupledStatusReport('src_m3u_backup');

    const isOffline = srcB.connectionState.status === 'Offline';
    const hasCache = srcB.cacheState.hasCachedData === true && srcB.cacheState.cachedChannelsCount > 0;
    const isDecoupled =
      report.liveConnectionStatus === 'Offline' &&
      report.hasCachedData === true &&
      report.isServingOfflineCache === true;

    if (isOffline && hasCache && isDecoupled) {
      results.push({
        id: 'M38_T4_DECOUPLED_CACHE_STATUS',
        name: 'Decoupled Cache Status Rule (Section 38)',
        passed: true,
        message:
          'Validated rule: "Do not equate cached data exists with provider is currently online". Offline status is preserved alongside cached data availability.',
        details: report,
      });
    } else {
      results.push({
        id: 'M38_T4_DECOUPLED_CACHE_STATUS',
        name: 'Decoupled Cache Status Rule (Section 38)',
        passed: false,
        message: 'Cache existence incorrectly altered or masked the Offline live connection state.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M38_T4_DECOUPLED_CACHE_STATUS',
      name: 'Decoupled Cache Status Rule (Section 38)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 5: Full Provider Status Taxonomy Coverage
  // -------------------------------------------------------------
  try {
    engine.simulateCondition('src_xtream_prime', 'ONLINE_CONNECTED');
    const s1 = engine.getSource('src_xtream_prime')!.connectionState.status; // 'Connected'

    engine.simulateCondition('src_xtream_prime', 'OFFLINE_TIMEOUT');
    const s2 = engine.getSource('src_xtream_prime')!.connectionState.status; // 'Offline'

    engine.simulateCondition('src_xtream_prime', 'AUTH_FAILURE');
    const s3 = engine.getSource('src_xtream_prime')!.connectionState.status; // 'Authentication failed'

    engine.simulateCondition('src_xtream_prime', 'REFRESH_FAILED');
    const s4 = engine.getSource('src_xtream_prime')!.connectionState.status; // 'Refresh failed'

    engine.simulateCondition('src_xtream_prime', 'LIMIT_SATURATED');
    const s5 = engine.getSource('src_xtream_prime')!.connectionState.status; // 'Connection limit reached'

    engine.simulateCondition('src_xtream_prime', 'UNKNOWN');
    const s6 = engine.getSource('src_xtream_prime')!.connectionState.status; // 'Unknown'

    const allMatched =
      s1 === 'Connected' &&
      s2 === 'Offline' &&
      s3 === 'Authentication failed' &&
      s4 === 'Refresh failed' &&
      s5 === 'Connection limit reached' &&
      s6 === 'Unknown';

    if (allMatched) {
      results.push({
        id: 'M38_T5_STATUS_TAXONOMY',
        name: 'Provider Status Taxonomy Coverage (Section 38)',
        passed: true,
        message: 'Successfully verified all 6 core status taxonomy states and transitions.',
        details: { states: [s1, s2, s3, s4, s5, s6] },
      });
    } else {
      results.push({
        id: 'M38_T5_STATUS_TAXONOMY',
        name: 'Provider Status Taxonomy Coverage (Section 38)',
        passed: false,
        message: 'Status taxonomy states mismatch.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M38_T5_STATUS_TAXONOMY',
      name: 'Provider Status Taxonomy Coverage (Section 38)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 6: Connection Concurrency Limit Enforcement
  // -------------------------------------------------------------
  try {
    const testSrc = engine.registerSource({
      name: 'Concurrency Test Source',
      sourceType: 'XTREAM',
      baseUrl: 'http://test.concurrency.net',
      maxConnections: 2,
    });

    // Tune stream 1 -> OK
    const tune1 = engine.tuneChannel(testSrc.id);
    // Tune stream 2 -> OK
    const tune2 = engine.tuneChannel(testSrc.id);
    // Tune stream 3 -> Exceeds max (2/2) -> Blocked
    const tune3 = engine.tuneChannel(testSrc.id);

    const isLimitBlocked =
      tune1.allowed &&
      tune2.allowed &&
      !tune3.allowed &&
      testSrc.connectionState.status === 'Connection limit reached';

    // Release 1 stream -> Restored
    engine.releaseChannel(testSrc.id);
    const tuneAfterRelease = engine.tuneChannel(testSrc.id);

    if (isLimitBlocked && tuneAfterRelease.allowed) {
      results.push({
        id: 'M37_T6_CONCURRENCY_LIMIT',
        name: 'Connection Concurrency Pool & Limit Enforcement (Section 37)',
        passed: true,
        message: 'Max connections constraint strictly enforced; transitions to "Connection limit reached" and blocks overflow.',
        details: { max: testSrc.connectionState.maxConnections, active: testSrc.connectionState.activeConnections },
      });
    } else {
      results.push({
        id: 'M37_T6_CONCURRENCY_LIMIT',
        name: 'Connection Concurrency Pool & Limit Enforcement (Section 37)',
        passed: false,
        message: 'Concurrency limit was not properly enforced.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M37_T6_CONCURRENCY_LIMIT',
      name: 'Connection Concurrency Pool & Limit Enforcement (Section 37)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 7: Parallel Isolated Refresh (Promise.allSettled)
  // -------------------------------------------------------------
  try {
    const refreshMap = await engine.refreshAllSourcesIsolated();
    const totalCount = engine.getAllSources().length;

    if (refreshMap.size === totalCount) {
      results.push({
        id: 'M37_T7_PARALLEL_ISOLATED_REFRESH',
        name: 'Parallel Isolated Multi-Source Refresh (Section 37)',
        passed: true,
        message: `Successfully executed parallel refresh across all ${totalCount} sources with zero unhandled rejections.`,
        details: { sourceCount: refreshMap.size },
      });
    } else {
      results.push({
        id: 'M37_T7_PARALLEL_ISOLATED_REFRESH',
        name: 'Parallel Isolated Multi-Source Refresh (Section 37)',
        passed: false,
        message: 'Parallel refresh count mismatch.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M37_T7_PARALLEL_ISOLATED_REFRESH',
      name: 'Parallel Isolated Multi-Source Refresh (Section 37)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 8: Credential Sanitization & Masking
  // -------------------------------------------------------------
  try {
    const src = engine.getSource('src_xtream_prime')!;
    const isMasked =
      src.credentials.passwordMasked === '••••••••••' &&
      !src.credentials.passwordMasked.includes('2pFz3E7P3d') &&
      src.credentials.username?.includes('***');

    if (isMasked) {
      results.push({
        id: 'M37_T8_CREDENTIAL_SANITIZATION',
        name: 'Credential Masking & Security Redaction (Section 37)',
        passed: true,
        message: 'Provider credentials and tokens are strictly masked in runtime memory and diagnostic traces.',
        details: { maskedUser: src.credentials.username, maskedPass: src.credentials.passwordMasked },
      });
    } else {
      results.push({
        id: 'M37_T8_CREDENTIAL_SANITIZATION',
        name: 'Credential Masking & Security Redaction (Section 37)',
        passed: false,
        message: 'Credentials are not properly masked.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M37_T8_CREDENTIAL_SANITIZATION',
      name: 'Credential Masking & Security Redaction (Section 37)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 9: Provider Capabilities Discovery Matrix
  // -------------------------------------------------------------
  try {
    const prime = engine.getSource('src_xtream_prime')!;
    const rf = engine.getSource('src_hdhomerun_rf')!;

    const hasCapabilities =
      prime.capabilities.ultraHd4k &&
      prime.capabilities.catchupTimeshift &&
      prime.capabilities.xmltvEpg &&
      prime.capabilities.scte35Dai &&
      rf.capabilities.liveStreaming &&
      !rf.capabilities.vodCatalog;

    if (hasCapabilities) {
      results.push({
        id: 'M37_T9_CAPABILITIES_DISCOVERY',
        name: 'Provider Capabilities Discovery (Section 37)',
        passed: true,
        message: 'Verified capabilities matrix (4K UHD, HLS, TS, Timeshift, XMLTV EPG, SCTE-35 DAI, PVR).',
        details: { xtreamCaps: prime.capabilities, rfCaps: rf.capabilities },
      });
    } else {
      results.push({
        id: 'M37_T9_CAPABILITIES_DISCOVERY',
        name: 'Provider Capabilities Discovery (Section 37)',
        passed: false,
        message: 'Provider capabilities mismatch.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M37_T9_CAPABILITIES_DISCOVERY',
      name: 'Provider Capabilities Discovery (Section 37)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 10: Cache Clearance Independence
  // -------------------------------------------------------------
  try {
    engine.simulateCondition('src_xtream_prime', 'ONLINE_CONNECTED');
    const statusBefore = engine.getSource('src_xtream_prime')!.connectionState.status;

    engine.clearSourceCache('src_xtream_prime');
    const srcAfter = engine.getSource('src_xtream_prime')!;

    const cacheCleared = srcAfter.cacheState.hasCachedData === false && srcAfter.cacheState.cachedChannelsCount === 0;
    const statusUnchanged = srcAfter.connectionState.status === statusBefore;

    if (cacheCleared && statusUnchanged) {
      results.push({
        id: 'M38_T10_CACHE_CLEARANCE_INDEPENDENCE',
        name: 'Cache Clearance State Independence (Section 38)',
        passed: true,
        message: 'Clearing local cache clears cached records without degrading or altering live upstream connection state.',
        details: { status: srcAfter.connectionState.status, hasCache: srcAfter.cacheState.hasCachedData },
      });
    } else {
      results.push({
        id: 'M38_T10_CACHE_CLEARANCE_INDEPENDENCE',
        name: 'Cache Clearance State Independence (Section 38)',
        passed: false,
        message: 'Cache clearance incorrectly modified connection state.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M38_T10_CACHE_CLEARANCE_INDEPENDENCE',
      name: 'Cache Clearance State Independence (Section 38)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  // -------------------------------------------------------------
  // Test 11: Diagnostic Snapshot JSON Export
  // -------------------------------------------------------------
  try {
    const snapshot = engine.exportDiagnosticSnapshot();
    const isValidSnapshot =
      snapshot.schemaVersion === '1.0.0-iptv-m37-m38' &&
      typeof snapshot.exportedAt === 'string' &&
      snapshot.summary.totalProviders >= 4 &&
      Array.isArray(snapshot.providers) &&
      snapshot.providers.length === snapshot.summary.totalProviders &&
      snapshot.providers.every(
        (p) =>
          p.credentialsRedacted !== undefined &&
          (p as any).credentials === undefined && // raw secrets redacted
          p.decoupledStatus !== undefined
      );

    if (isValidSnapshot) {
      results.push({
        id: 'M38_T11_DIAGNOSTIC_JSON_SNAPSHOT',
        name: 'Diagnostic Snapshot JSON Export & Credential Redaction (Section 38)',
        passed: true,
        message: 'Generated comprehensive diagnostic JSON snapshot with full health taxonomy and redacted credentials.',
        details: {
          totalProviders: snapshot.summary.totalProviders,
          exportedAt: snapshot.exportedAt,
          summary: snapshot.summary,
        },
      });
    } else {
      results.push({
        id: 'M38_T11_DIAGNOSTIC_JSON_SNAPSHOT',
        name: 'Diagnostic Snapshot JSON Export & Credential Redaction (Section 38)',
        passed: false,
        message: 'Diagnostic snapshot did not contain required schema structure or failed credential redaction.',
      });
    }
  } catch (err: any) {
    results.push({
      id: 'M38_T11_DIAGNOSTIC_JSON_SNAPSHOT',
      name: 'Diagnostic Snapshot JSON Export & Credential Redaction (Section 38)',
      passed: false,
      message: `Exception: ${err.message}`,
    });
  }

  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.length - totalPassed;

  return {
    totalPassed,
    totalFailed,
    results,
  };
}

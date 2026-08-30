/**
 * Test Suite for Requirements 43, 44, and 45
 *
 * Req 43: Important Distinction About 8K (No artificial resolution ceiling, no silent transcoding, graceful failure)
 * Req 44: Minimal Dependencies Policy (Auditing purpose, necessity, platform alternatives, licensing)
 * Req 45: Security Boundary (Authorized access only, no credential theft, no subscription bypass)
 */

import { EightKStreamEngine } from '../src/lib/eightKStreamEngine';
import { DependencyPolicyAuditor } from '../src/lib/dependencyAudit';
import { SecurityBoundaryEnforcer } from '../src/lib/securityBoundary';
import { globalAdaptiveResolutionManager } from '../src/lib/adaptiveResolutionManager';

export interface Req43to45TestResult {
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  assertionMessage?: string;
  error?: string;
}

const results: Req43to45TestResult[] = [];

function assert(condition: boolean, testId: string, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed in ${testId}: ${message}`);
  }
}

async function runTest(testId: string, name: string, fn: () => Promise<string> | string) {
  const start = Date.now();
  try {
    const msg = await fn();
    const durationMs = Date.now() - start;
    results.push({
      testId,
      name,
      passed: true,
      durationMs,
      assertionMessage: msg,
    });
    console.log(`[PASS] ${testId}: ${name} (${durationMs}ms)`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    results.push({
      testId,
      name,
      passed: false,
      durationMs,
      error: err.message,
    });
    console.error(`[FAIL] ${testId}: ${name} - ${err.message}`);
  }
}

export async function runReq43to45TestSuite() {
  results.length = 0;
  console.log('================== REQUIREMENTS 43, 44 & 45 TEST SUITE ==================');

  // Req 43 Test 1: 8K Stream Detection & No Artificial Resolution Ceiling
  await runTest(
    'REQ43-01',
    '8K UHD Stream Detection & No Artificial Resolution Ceiling',
    async () => {
      const is8k = EightKStreamEngine.isEightKStream({
        width: 7680,
        height: 4320,
        streamUrl: 'http://provider.test/live/stream_8k.m3u8',
      });
      assert(is8k, 'REQ43-01', 'Correctly identified 7680x4320 as 8K stream');

      const is1080 = EightKStreamEngine.isEightKStream({
        width: 1920,
        height: 1080,
        streamUrl: 'http://provider.test/live/stream_1080p.m3u8',
      });
      assert(!is1080, 'REQ43-01', 'Correctly identified 1080p stream as non-8K');

      return 'Identified 8K stream resolution boundaries without imposing artificial resolution cap';
    }
  );

  // Req 43 Test 2: 8K Direct Playback on Capable Hardware (Zero Transcode)
  await runTest(
    'REQ43-02',
    'Capable Hardware 8K Direct Playback & Strict Transcoding Ban',
    async () => {
      const decision = EightKStreamEngine.evaluate8KPlayback(
        {
          width: 7680,
          height: 4320,
          framerate: 60,
          codec: 'hevc',
          streamUrl: 'http://provider.test/8k_direct.m3u8',
        },
        {
          device: 'Windows PC',
          osRaw: 'Windows NT 10.0',
          hardwareDecoderApi: 'Direct3D 11 Video Acceleration (D3D11VA)',
          hardwareAccelerationActive: true,
          maximumTestedResolution: '8K',
          maximumHardwareDecode: '8K',
          display: {
            physicalWidth: 7680,
            physicalHeight: 4320,
            effectiveWidth: 3840,
            effectiveHeight: 2160,
            devicePixelRatio: 2,
            colorDepthBits: 30,
            refreshRateHz: 60,
            isExtendedDisplay: false,
            colorGamuts: { rec2020: true, displayP3: true, srgb: true },
            hdr: {
              hdr10: true,
              hlg: true,
              dolbyVision: false,
              highDynamicRange: true,
              hdrLabel: 'HDR10',
            },
            maxDisplayResolutionLabel: '8K UHD (7680×4320)',
          },
          codecs: [],
          reliability: {
            isFullyReliable: true,
            availableApis: ['W3C MediaCapabilities API'],
            missingOrRestrictedApis: [],
            disclosureMessage: 'Fully reliable',
          },
          estimatedBandwidthMbps: 85,
          diagnosticsText: '',
          timestamp: new Date().toISOString(),
        }
      );

      assert(decision.is8K, 'REQ43-02', 'Decision is for 8K stream');
      assert(decision.canDirectPlay, 'REQ43-02', 'Direct 8K playback approved on capable hardware');
      assert(decision.transcodingForbidden === true, 'REQ43-02', 'Transcoding is strictly forbidden');
      assert(decision.silentlyDowngraded === false, 'REQ43-02', 'Never silently downgraded');
      assert(decision.warning?.level === 'COMPATIBLE_OPTIMAL', 'REQ43-02', 'Optimal compatibility status');

      return 'Direct 8K playback supported on capable hardware with zero transcoding';
    }
  );

  // Req 43 Test 3: Incapable Hardware Graceful Failure & Warning (Never Silently Downgraded)
  await runTest(
    'REQ43-03',
    'Incapable Hardware Graceful Warning & No Silent Downgrade',
    async () => {
      const decision = EightKStreamEngine.evaluate8KPlayback(
        {
          width: 7680,
          height: 4320,
          codec: 'hevc',
          streamUrl: 'http://provider.test/8k_stream.m3u8',
        },
        {
          device: 'Windows PC',
          osRaw: 'Windows NT 10.0',
          hardwareDecoderApi: 'CPU Software Fallback',
          hardwareAccelerationActive: false, // NO GPU acceleration
          maximumTestedResolution: '1080p',
          maximumHardwareDecode: 'None',
          display: {
            physicalWidth: 1920,
            physicalHeight: 1080,
            effectiveWidth: 1920,
            effectiveHeight: 1080,
            devicePixelRatio: 1,
            colorDepthBits: 24,
            refreshRateHz: 60,
            isExtendedDisplay: false,
            colorGamuts: { rec2020: false, displayP3: false, srgb: true },
            hdr: {
              hdr10: false,
              hlg: false,
              dolbyVision: false,
              highDynamicRange: false,
              hdrLabel: 'Unsupported',
            },
            maxDisplayResolutionLabel: '1080p FHD',
          },
          codecs: [],
          reliability: {
            isFullyReliable: true,
            availableApis: ['W3C MediaCapabilities API'],
            missingOrRestrictedApis: [],
            disclosureMessage: 'Fully reliable',
          },
          estimatedBandwidthMbps: 15,
          diagnosticsText: '',
          timestamp: new Date().toISOString(),
        }
      );

      assert(decision.canDirectPlay === false, 'REQ43-03', 'Direct play flagged unsafe without HW acceleration');
      assert(decision.warning !== undefined, 'REQ43-03', 'Compatibility warning generated');
      assert(decision.warning?.level === 'CRITICAL_UNSUPPORTED', 'REQ43-03', 'Critical warning generated');
      assert(decision.transcodingForbidden === true, 'REQ43-03', 'Never silently transcoded');
      assert(decision.silentlyDowngraded === false, 'REQ43-03', 'Never silently downgraded');

      return `Gracefully surfaced compatibility warning: "${decision.warning?.title}"`;
    }
  );

  // Req 44 Test 1: Production Dependency Audit & Justification
  await runTest(
    'REQ44-01',
    'Production Dependency Audit & Purpose Justification',
    async () => {
      const audits = DependencyPolicyAuditor.getProductionDependencyAudit();
      assert(Array.isArray(audits), 'REQ44-01', 'Audits returned as array');
      assert(audits.length >= 5, 'REQ44-01', 'All key production packages audited');

      const hlsAudit = audits.find((a) => a.packageName === 'hls.js');
      assert(Boolean(hlsAudit), 'REQ44-01', 'hls.js audited');
      assert(Boolean(hlsAudit?.justification), 'REQ44-01', 'hls.js justification documented');
      assert(Boolean(hlsAudit?.nativePlatformAlternativeEvaluated), 'REQ44-01', 'Platform alternative evaluated');

      return `Audited ${audits.length} dependencies with licensing, justification, and platform alternative evaluation`;
    }
  );

  // Req 44 Test 2: Rejection of Unnecessary / Popular Bloatware Libraries
  await runTest(
    'REQ44-02',
    'Rejection of Popular Bloatware (Native API Preference)',
    async () => {
      const lodashCheck = DependencyPolicyAuditor.evaluateProposedPackage({
        name: 'lodash',
        whatItDoes: 'Utility helper functions',
        whyNeeded: 'Popular convenience methods',
        platformAlternative: 'Native ES2024 JavaScript methods',
        license: 'MIT',
      });
      assert(lodashCheck.approved === false, 'REQ44-02', 'lodash rejected in favor of native ES APIs');

      const axiosCheck = DependencyPolicyAuditor.evaluateProposedPackage({
        name: 'axios',
        whatItDoes: 'HTTP Client',
        whyNeeded: 'REST requests',
        platformAlternative: 'Native Fetch API & AbortController',
        license: 'MIT',
      });
      assert(axiosCheck.approved === false, 'REQ44-02', 'axios rejected in favor of native Fetch API');

      return 'Successfully enforced minimal dependency policy rejecting unnecessary libraries';
    }
  );

  // Req 45 Test 1: Security Boundary & Circumvention Prohibition
  await runTest(
    'REQ45-01',
    'Security Boundary & Prohibition of Bypass / Credential Theft',
    async () => {
      const bypassAttempt = SecurityBoundaryEnforcer.validateSecurityBoundary({
        type: 'stream_request',
        url: 'http://provider.test/live/stream.m3u8?bypass_auth=true',
      });
      assert(!bypassAttempt.isAllowed, 'REQ45-01', 'Auth bypass parameter strictly blocked');
      assert(bypassAttempt.policyCode === 'REQ45_CIRCUMVENTION_BLOCKED', 'REQ45-01', 'Circumvention violation code');

      const theftAttempt = SecurityBoundaryEnforcer.validateSecurityBoundary({
        type: 'account_auth',
        url: 'http://malicious.test/steal_creds',
      });
      assert(!theftAttempt.isAllowed, 'REQ45-01', 'Credential theft strictly blocked');

      const validStream = SecurityBoundaryEnforcer.validateSecurityBoundary({
        type: 'stream_request',
        url: 'http://authorized-provider.test:8080/live/user/pass/1234.ts',
      });
      assert(validStream.isAllowed, 'REQ45-01', 'Authorized user stream request permitted');

      return 'Strict security boundary verified: circumvention and credential theft blocked';
    }
  );

  // Req 45 Test 2: Authorized Device MAC Hygiene (Zero Automated Impersonation)
  await runTest(
    'REQ45-02',
    'Authorized MAC Device Format & Impersonation Prevention',
    async () => {
      const validMac = SecurityBoundaryEnforcer.validateSecurityBoundary({
        type: 'account_auth',
        customMacAddress: '00:1A:79:AB:CD:EF',
      });
      assert(validMac.isAllowed, 'REQ45-02', 'Legitimate user-registered device MAC allowed');

      const invalidMac = SecurityBoundaryEnforcer.validateSecurityBoundary({
        type: 'account_auth',
        customMacAddress: 'INVALID-MAC-STRING',
      });
      assert(!invalidMac.isAllowed, 'REQ45-02', 'Malformed/spoofed MAC rejected');

      return 'Enforced MAC device profile hygiene for authorized user accounts';
    }
  );

  console.log('--------------------------------------------------------------------------------------------');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total Assertions: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('============================================================================================');

  return {
    total: results.length,
    passed,
    failed,
    results,
  };
}

if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1]?.endsWith('req_43_to_45_tests.ts')) {
  runReq43to45TestSuite().catch(console.error);
}

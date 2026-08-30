/**
 * Requirement 42 Automated Test Suite
 * Device Capability Detection:
 * - Supported codecs
 * - Hardware decoders
 * - Maximum supported resolution
 * - HDR capabilities
 * - Hardware acceleration
 * - Display capabilities
 * - Exposure through diagnostics with explicit reliability (no fabricated information)
 */

import { DeviceCapabilityDetector, DevicePlatformProfile } from '../src/lib/deviceCapabilityDetector';

export interface Req42TestResult {
  testId: string;
  name: string;
  passed: boolean;
  durationMs: number;
  assertionMessage?: string;
  error?: string;
}

const results: Req42TestResult[] = [];

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

export async function runDeviceCapabilityDetectorTestSuite() {
  results.length = 0;
  console.log('================== REQUIREMENT 42: DEVICE CAPABILITY DETECTION TEST SUITE ==================');

  // Test 1: Codec Support Matrix
  await runTest(
    'REQ42-01',
    'Supported Codecs Matrix & Format Probing',
    async () => {
      const caps = await DeviceCapabilityDetector.detectPlatformCapabilities();
      assert(Array.isArray(caps.codecs), 'REQ42-01', 'Codecs list is an array');
      assert(caps.codecs.length >= 6, 'REQ42-01', 'Probed at least 6 standard video/audio codecs');

      const names = caps.codecs.map((c) => c.shortName);
      assert(names.includes('HEVC'), 'REQ42-01', 'HEVC codec evaluated');
      assert(names.includes('AV1'), 'REQ42-01', 'AV1 codec evaluated');
      assert(names.includes('H.264'), 'REQ42-01', 'H.264 codec evaluated');
      assert(names.includes('VP9'), 'REQ42-01', 'VP9 codec evaluated');
      assert(names.includes('AAC'), 'REQ42-01', 'AAC audio codec evaluated');

      return `Successfully probed ${caps.codecs.length} codecs: [${names.join(', ')}]`;
    }
  );

  // Test 2: Hardware Decoders by Platform (Windows PC D3D11VA, Android TV MediaCodec, Apple VideoToolbox)
  await runTest(
    'REQ42-02',
    'Hardware Decoders & Platform GPU Architecture Resolution',
    async () => {
      const winUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36';
      const winCaps = await DeviceCapabilityDetector.detectPlatformCapabilities(winUa);
      assert(winCaps.device === 'Windows PC', 'REQ42-02', 'Identified Windows PC');
      assert(winCaps.hardwareDecoderApi.includes('Direct3D 11'), 'REQ42-02', 'Identified D3D11VA decoder on Windows');

      const atvUa = 'Mozilla/5.0 (Linux; Android 12; BRAVIA 4K UR3) AppleWebKit/537.36 LargeScreen AndroidTV';
      const atvCaps = await DeviceCapabilityDetector.detectPlatformCapabilities(atvUa);
      assert(atvCaps.device === 'Android TV', 'REQ42-02', 'Identified Android TV');
      assert(atvCaps.hardwareDecoderApi.includes('MediaCodec'), 'REQ42-02', 'Identified MediaCodec decoder on Android TV');

      return `Mapped Windows PC to "${winCaps.hardwareDecoderApi.split('/')[0].trim()}" and Android TV to "${atvCaps.hardwareDecoderApi.split('(')[0].trim()}"`;
    }
  );

  // Test 3: Maximum Supported & Maximum Hardware Resolution (8K / 4K)
  await runTest(
    'REQ42-03',
    'Maximum Supported and Tested Resolution Ladder',
    async () => {
      const caps = await DeviceCapabilityDetector.detectPlatformCapabilities();
      assert(Boolean(caps.maximumTestedResolution), 'REQ42-03', 'Maximum tested resolution is populated');
      assert(['8K', '4K', '2K', '1080p', '720p', '480p'].includes(caps.maximumTestedResolution), 'REQ42-03', 'Valid resolution tier');
      assert(Boolean(caps.maximumHardwareDecode), 'REQ42-03', 'Maximum hardware decode resolution is populated');

      return `Evaluated maximum tested resolution: ${caps.maximumTestedResolution} (Hardware decode limit: ${caps.maximumHardwareDecode})`;
    }
  );

  // Test 4: HDR Capabilities (HDR10, HLG, Dolby Vision, Rec.2020)
  await runTest(
    'REQ42-04',
    'HDR Capabilities & Wide Color Gamut Telemetry',
    async () => {
      const caps = await DeviceCapabilityDetector.detectPlatformCapabilities();
      assert(Boolean(caps.display.hdr), 'REQ42-04', 'HDR report object exists');
      assert(typeof caps.display.hdr.hdr10 === 'boolean', 'REQ42-04', 'HDR10 flag is boolean');
      assert(typeof caps.display.hdr.hlg === 'boolean', 'REQ42-04', 'HLG flag is boolean');
      assert(typeof caps.display.hdr.dolbyVision === 'boolean', 'REQ42-04', 'Dolby Vision flag is boolean');
      assert(Boolean(caps.display.hdr.hdrLabel), 'REQ42-04', 'HDR label generated');

      return `Probed HDR capabilities: label="${caps.display.hdr.hdrLabel}", color depth=${caps.display.colorDepthBits}-bit`;
    }
  );

  // Test 5: Hardware Acceleration Status
  await runTest(
    'REQ42-05',
    'Hardware Acceleration Pipeline & Zero-Copy Status',
    async () => {
      const caps = await DeviceCapabilityDetector.detectPlatformCapabilities();
      assert(typeof caps.hardwareAccelerationActive === 'boolean', 'REQ42-05', 'HW acceleration status is boolean');

      return `Hardware acceleration active: ${caps.hardwareAccelerationActive ? 'YES (Direct GPU zero-copy)' : 'NO (CPU software fallback)'}`;
    }
  );

  // Test 6: Display Capabilities (Dimensions, DPR, Refresh Rate)
  await runTest(
    'REQ42-06',
    'Display Geometry, Scale Factor & Color Depth',
    async () => {
      const caps = await DeviceCapabilityDetector.detectPlatformCapabilities();
      assert(caps.display.physicalWidth > 0, 'REQ42-06', 'Physical width is positive');
      assert(caps.display.physicalHeight > 0, 'REQ42-06', 'Physical height is positive');
      assert(caps.display.devicePixelRatio >= 1, 'REQ42-06', 'DPR is at least 1.0');
      assert(caps.display.colorDepthBits >= 16, 'REQ42-06', 'Color depth is at least 16-bit');

      return `Display geometry: ${caps.display.physicalWidth}×${caps.display.physicalHeight} (DPR: ${caps.display.devicePixelRatio}x, Depth: ${caps.display.colorDepthBits}-bit)`;
    }
  );

  // Test 7: Formatted Diagnostic Output Structure (Matching Prompt Examples)
  await runTest(
    'REQ42-07',
    'Diagnostic Text Expose Format Specification',
    async () => {
      const winUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0.0.0 Safari/537.36';
      const winCaps = await DeviceCapabilityDetector.detectPlatformCapabilities(winUa);

      assert(winCaps.diagnosticsText.includes('Device:\nWindows PC'), 'REQ42-07', 'Formatted Device: Windows PC');
      assert(winCaps.diagnosticsText.includes('Decoder:'), 'REQ42-07', 'Formatted Decoder header');
      assert(winCaps.diagnosticsText.includes('Maximum tested resolution:'), 'REQ42-07', 'Formatted Max Tested Res');
      assert(winCaps.diagnosticsText.includes('HDR:'), 'REQ42-07', 'Formatted HDR header');

      const atvUa = 'Mozilla/5.0 (Linux; Android 12; BRAVIA 4K UR3) AppleWebKit/537.36 LargeScreen AndroidTV';
      const atvCaps = await DeviceCapabilityDetector.detectPlatformCapabilities(atvUa);

      assert(atvCaps.diagnosticsText.includes('Device:\nAndroid TV'), 'REQ42-07', 'Formatted Device: Android TV');
      assert(atvCaps.diagnosticsText.includes('HEVC:'), 'REQ42-07', 'Formatted HEVC status');
      assert(atvCaps.diagnosticsText.includes('Maximum hardware decode:'), 'REQ42-07', 'Formatted Maximum hardware decode');

      return 'Diagnostic summary conforms precisely to the required platform capability specification';
    }
  );

  // Test 8: Platform API Reliability & Anti-Fabrication Notice
  await runTest(
    'REQ42-08',
    'Reliability Disclosure & Anti-Fabrication Telemetry Policy',
    async () => {
      const caps = await DeviceCapabilityDetector.detectPlatformCapabilities();
      assert(Boolean(caps.reliability), 'REQ42-08', 'Reliability info is present');
      assert(Boolean(caps.reliability.disclosureMessage), 'REQ42-08', 'Disclosure message is populated');
      assert(caps.diagnosticsText.includes('Platform API Reliability:'), 'REQ42-08', 'Reliability exposed in text');

      return `Reliability policy active: "${caps.reliability.disclosureMessage.substring(0, 70)}..."`;
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

if (typeof process !== 'undefined' && Array.isArray(process.argv) && process.argv[1]?.endsWith('device_capability_detector_tests.ts')) {
  runDeviceCapabilityDetectorTestSuite().catch(console.error);
}

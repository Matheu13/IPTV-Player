/**
 * Master Comprehensive System Test Runner
 * Runs all milestone test suites from M0 to M30 + UI requirements
 */

import { runMilestone0Diagnosis } from './milestone0_diagnose';
import { runMilestone1TestSuite } from './milestone1_tests';
import { runMilestone2TestSuite } from './milestone2_tests';
import { runMilestone3TestSuite } from './milestone3_tests';
import { runMilestone4TestSuite } from './milestone4_tests';
import { runMilestone5TestSuite } from './milestone5_tests';
import { runMilestones6To10TestSuite } from './milestones_6_to_10_tests';
import { runMilestones11To14TestSuite } from './milestones_11_to_14_tests';
import { runMilestones16To18TestSuite } from './milestones_16_to_18_tests';
import { runMilestones19To20TestSuite } from './milestones_19_to_20_tests';
import { runMilestones21To23TestSuite } from './milestones_21_to_23_tests';
import { runMilestones24To26TestSuite } from './milestones_24_to_26_tests';
import { runMilestone27TestSuite } from './milestone_27_tests';
import { runMilestone28TestSuite } from './milestone_28_tests';
import { runMilestone29TestSuite } from './milestone_29_tests';
import { runMilestone30TestSuite } from './milestone_30_tests';
import { runMilestone31Tests } from './milestone_31_tests';
import { runMilestone32Tests } from './milestone_32_tests';
import { runMilestone33Tests } from './milestone_33_tests';
import { runMilestone34Tests } from './milestone_34_tests';
import { runMilestone37to38TestSuite } from './milestone_37_38_tests';
import { runMilestone42TestSuite } from './milestone_42_tests';
import { runAdaptiveResolutionManagerTestSuite } from './adaptive_resolution_manager_tests';
import { runDeviceCapabilityDetectorTestSuite } from './device_capability_detector_tests';
import { runReq43to45TestSuite } from './req_43_to_45_tests';
import { runMilestoneUiRequirementsTestSuite } from './milestone_ui_requirements_tests';

export async function runAllSystemTests() {
  console.log('========================================================================');
  console.log('🚀 EXECUTING COMPREHENSIVE END-TO-END SYSTEM TEST SUITE (M0 -> M34 + ARM + REQ 42-45)');
  console.log('========================================================================\n');

  const suites = [
    { name: 'M0: Diagnostic Baseline', fn: runMilestone0Diagnosis },
    { name: 'M1: Architecture Baseline', fn: runMilestone1TestSuite },
    { name: 'M2: Resilience & Fallbacks', fn: runMilestone2TestSuite },
    { name: 'M3: Stream Parsing & Buffers', fn: runMilestone3TestSuite },
    { name: 'M4: EPG & SQLite DB', fn: runMilestone4TestSuite },
    { name: 'M5: DVR & Timeshift Engine', fn: runMilestone5TestSuite },
    { name: 'M6-M10: Stalker, Catchup, Multi-CDN, Subtitles, Teletext', fn: runMilestones6To10TestSuite },
    { name: 'M11-M14: VOD, Audio Normalization, Multi-Audio, DRM', fn: runMilestones11To14TestSuite },
    { name: 'M16-M18: PIP, Channel Zapping, Analytics', fn: runMilestones16To18TestSuite },
    { name: 'M19-M20: Stalker MAG Portal & 10-Foot Spatial Nav', fn: runMilestones19To20TestSuite },
    { name: 'M21-M23: Low-Latency CMAF, AI Highlights, P2P Swarm', fn: runMilestones21To23TestSuite },
    { name: 'M24-M26: SCTE-35 DAI, Multi-Room PTP Sync, Hybrid RF Frontend', fn: runMilestones24To26TestSuite },
    { name: 'M27: Forensic Watermarking & Dynamic Splicing', fn: runMilestone27TestSuite },
    { name: 'M28: Spatial Audio & MPEG-H 3D Object Rendering', fn: runMilestone28TestSuite },
    { name: 'M29: Favorites & Watch History Resilience', fn: runMilestone29TestSuite },
    { name: 'M30: Large-Scale XMLTV Streaming & Indexed Guide', fn: runMilestone30TestSuite },
    { name: 'M31: Leanback D-Pad & Spatial Grid Navigation', fn: runMilestone31Tests },
    { name: 'M32: Channel Health Watchdog & Real-Time Probing', fn: runMilestone32Tests },
    { name: 'M33: Android Mobile Touch Gestures & 4K Surface', fn: runMilestone33Tests },
    { name: 'M34: Windows Desktop D3D11 Hardware & Hotkeys', fn: runMilestone34Tests },
    { name: 'M37-M38: Source-Specific Refresh & Provider Status', fn: runMilestone37to38TestSuite },
    { name: 'M42: Adaptive P2P Stream Mesh & Peer Cache Segment Scheduler', fn: runMilestone42TestSuite },
    { name: 'Req 42: Device Capability Detection (Codecs, HW, HDR, Display)', fn: runDeviceCapabilityDetectorTestSuite },
    { name: 'Req 43-45: 8K Distinction, Minimal Dependencies, & Security Boundary', fn: runReq43to45TestSuite },
    { name: 'ARM: Adaptive Resolution Manager (4K HW Default)', fn: runAdaptiveResolutionManagerTestSuite },
    { name: 'UI Requirements: Virtualization & 10,000+ Channel Matrix', fn: runMilestoneUiRequirementsTestSuite },
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  const suiteResults: Array<{ name: string; total: number; passed: number; failed: number }> = [];

  for (const suite of suites) {
    try {
      console.log(`\n▶ Running [${suite.name}]...`);
      const res: any = await suite.fn();
      let passed = 0;
      let failed = 0;
      let total = 0;

      if (Array.isArray(res)) {
        passed = res.filter((r: any) => r.passed).length;
        failed = res.filter((r: any) => !r.passed).length;
        total = res.length;
      } else if (res && typeof res === 'object') {
        passed = typeof res.passed === 'number' ? res.passed : (res.results ? res.results.filter((r: any) => r.passed).length : 0);
        failed = typeof res.failed === 'number' ? res.failed : (res.results ? res.results.filter((r: any) => !r.passed).length : 0);
        total = typeof res.total === 'number' ? res.total : (passed + failed);
      }
      totalPassed += passed;
      totalFailed += failed;
      suiteResults.push({ name: suite.name, total, passed, failed });
    } catch (err: any) {
      console.error(`❌ Suite Failed with exception: [${suite.name}]:`, err.message);
      totalFailed += 1;
      suiteResults.push({ name: suite.name, total: 1, passed: 0, failed: 1 });
    }
  }

  console.log('\n========================================================================');
  console.log('🏁 SYSTEM-WIDE AUDIT SUMMARY REPORT');
  console.log('========================================================================');
  for (const res of suiteResults) {
    const status = res.failed === 0 ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
    console.log(`${status} ${res.name.padEnd(65)} (${res.passed}/${res.total})`);
  }
  console.log('------------------------------------------------------------------------');
  console.log(`OVERALL ASSERTIONS: ${totalPassed + totalFailed} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
  console.log('========================================================================\n');

  return {
    totalPassed,
    totalFailed,
    suiteResults,
  };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('master_system_test.ts')) {
  runAllSystemTests()
    .then((res) => {
      process.exit(res.totalFailed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal test error:', err);
      process.exit(1);
    });
}

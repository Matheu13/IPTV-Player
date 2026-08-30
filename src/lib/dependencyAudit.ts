/**
 * Requirement 44: Dependency Audit & Architectural Minimal Policy
 *
 * Core Mandates:
 * 1. Keep dependencies minimal.
 * 2. Before adding any dependency, justify:
 *    - What it does
 *    - Why it is needed
 *    - Whether the platform already provides equivalent functionality
 *    - Whether it introduces licensing or maintenance concerns
 * 3. Do not add libraries simply because they are popular.
 */

export interface DependencyAuditRecord {
  packageName: string;
  version: string;
  category: 'core_runtime' | 'video_pipeline' | 'ui_icons' | 'dev_tooling';
  purpose: string;
  justification: string;
  nativePlatformAlternativeEvaluated: string;
  licensingCompliance: 'MIT' | 'Apache-2.0' | 'BSD-3-Clause' | 'ISC';
  maintenanceFootprint: 'Ultra-low' | 'Low' | 'Medium';
}

export class DependencyPolicyAuditor {
  /**
   * Returns the explicit architectural justification for every production package in the codebase.
   */
  public static getProductionDependencyAudit(): DependencyAuditRecord[] {
    return [
      {
        packageName: 'hls.js',
        version: '^1.7.1',
        category: 'video_pipeline',
        purpose: 'MSE-based HTTP Live Streaming demuxing, parsing, and ABR buffer management in standard browsers.',
        justification:
          'Native browser HTMLMediaElement does not support HLS (.m3u8) on non-Apple browsers (Chrome, Firefox, Edge). Hls.js utilizes standard W3C MediaSource Extensions for hardware-accelerated zero-copy video decoding.',
        nativePlatformAlternativeEvaluated:
          'HTML5 video can only play HLS natively on Safari/iOS. Chrome/Edge/Firefox require MSE demuxer.',
        licensingCompliance: 'Apache-2.0',
        maintenanceFootprint: 'Low',
      },
      {
        packageName: 'mpegts.js',
        version: '^1.8.2',
        category: 'video_pipeline',
        purpose: 'Direct MPEG-2 Transport Stream (.ts) demuxer into ISO BMFF FMP4 chunks.',
        justification:
          'IPTV providers transmit raw TS streams. Browsers lack native MPEG-TS demuxing over HTTP/Fetch; mpegts.js repackages TS packets into FMP4 for browser hardware decoders without server transcoding.',
        nativePlatformAlternativeEvaluated:
          'No browser provides native .ts container decoding in MediaSource.',
        licensingCompliance: 'Apache-2.0',
        maintenanceFootprint: 'Low',
      },
      {
        packageName: 'react / react-dom',
        version: '^19.0.1',
        category: 'core_runtime',
        purpose: 'Reactive component UI framework with concurrent rendering.',
        justification: 'Foundational framework mandated by application platform architecture.',
        nativePlatformAlternativeEvaluated: 'Mandated by workspace runtime environment.',
        licensingCompliance: 'MIT',
        maintenanceFootprint: 'Low',
      },
      {
        packageName: 'lucide-react',
        version: '^0.546.0',
        category: 'ui_icons',
        purpose: 'Vector iconography for Leanback TV, diagnostics, and EPG controls.',
        justification:
          'Tree-shakeable SVG icons adhering to accessibility standards across desktop and 10-foot TV interfaces.',
        nativePlatformAlternativeEvaluated: 'Inline raw SVGs would increase bundle maintenance and reduce UI consistency.',
        licensingCompliance: 'ISC',
        maintenanceFootprint: 'Low',
      },
      {
        packageName: 'motion',
        version: '^12.23.24',
        category: 'ui_icons',
        purpose: 'Hardware-accelerated 60fps GPU transitions for 10-foot TV focus and modals.',
        justification: 'Mandated framework animation standard per system design specification.',
        nativePlatformAlternativeEvaluated: 'CSS transitions lack complex spatial focus and layout animations.',
        licensingCompliance: 'MIT',
        maintenanceFootprint: 'Low',
      },
      {
        packageName: 'express',
        version: '^4.21.2',
        category: 'core_runtime',
        purpose: 'Lightweight local HTTP proxy server for CORS bypass and stream header normalization.',
        justification:
          'Allows browser-based IPTV playback to proxy IPTV streams that omit Access-Control-Allow-Origin headers.',
        nativePlatformAlternativeEvaluated: 'Browser sandbox cannot bypass CORS directly without a local proxy.',
        licensingCompliance: 'MIT',
        maintenanceFootprint: 'Low',
      },
    ];
  }

  /**
   * Validates whether a proposed package adheres to Requirement 44 minimal dependency criteria.
   */
  public static evaluateProposedPackage(pkg: {
    name: string;
    whatItDoes: string;
    whyNeeded: string;
    platformAlternative: string;
    license: string;
  }): { approved: boolean; rejectionReason?: string } {
    if (!pkg.whatItDoes || !pkg.whyNeeded) {
      return {
        approved: false,
        rejectionReason: 'Requirement 44 violation: Description of package purpose and necessity is missing.',
      };
    }

    if (!pkg.platformAlternative) {
      return {
        approved: false,
        rejectionReason: 'Requirement 44 violation: Evaluation of existing platform APIs / built-ins was not provided.',
      };
    }

    const popularBanned = ['lodash', 'moment', 'jquery', 'axios', 'request'];
    if (popularBanned.includes(pkg.name.toLowerCase())) {
      return {
        approved: false,
        rejectionReason: `Rejected: "${pkg.name}" is unnecessary because native JavaScript/TypeScript (ES2024, native fetch, Intl) already provides identical or superior capability with zero maintenance overhead.`,
      };
    }

    return { approved: true };
  }
}

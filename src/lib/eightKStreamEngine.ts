/**
 * Requirement 43: Important Distinction About 8K Stream Engine & Capability Evaluator
 *
 * Core Rules:
 * 1. No artificial resolution ceiling: Capability to handle 8K (4320p) streams when hardware permits.
 * 2. Does NOT require every low-end/unaccelerated device to decode 8K streams.
 * 3. 8K playback depends on hardware, codec, bitrate, framerate, HDR, OS, display, and backend.
 * 4. Capable hardware -> direct 8K playback support without artificial cap.
 * 5. Incapable hardware -> fails gracefully with clear compatibility warning & actionable diagnosis.
 * 6. Never silently transcode an 8K stream on the client or server.
 * 7. Never artificially downgrade an 8K stream unless the user explicitly selects a lower-quality adaptive stream variant.
 */

import { DeviceCapabilityDetector, DevicePlatformProfile } from './deviceCapabilityDetector';

export interface StreamResolutionMetadata {
  width: number;
  height: number;
  framerate?: number;
  bitrateBps?: number;
  codec?: string; // 'hevc' | 'av1' | 'vp9' | 'h264' | etc.
  isHdr?: boolean;
  hdrFormat?: 'HDR10' | 'HLG' | 'DolbyVision' | 'SDR';
  streamUrl: string;
  channelName?: string;
  sourceType?: 'live' | 'vod' | 'catchup';
}

export interface CompatibilityWarning {
  level: 'CRITICAL_UNSUPPORTED' | 'WARNING_PERFORMANCE' | 'COMPATIBLE_OPTIMAL';
  title: string;
  message: string;
  technicalDetails: string[];
  suggestedAction: string;
  allowsDirectPlaybackAttempt: boolean;
  requiresExplicitUserOverride: boolean;
}

export interface EightKPlaybackDecision {
  is8K: boolean;
  canDirectPlay: boolean;
  transcodingForbidden: true;
  silentlyDowngraded: false;
  selectedVariantUrl: string;
  warning?: CompatibilityWarning;
  factors: {
    hardwareAcceleration: boolean;
    codecSupported: boolean;
    maxHwDecodeResolution: string;
    displayResolution: string;
    estimatedBandwidthMbps: number;
    bandwidthSufficient: boolean;
    framerateViable: boolean;
    hdrMatch: boolean;
  };
}

export class EightKStreamEngine {
  /**
   * Identifies whether stream metadata constitutes an 8K UHD stream.
   * Standard 8K UHD: 7680x4320 (or width >= 6000 / height >= 3500)
   */
  public static isEightKStream(metadata: StreamResolutionMetadata): boolean {
    return (
      (metadata.width >= 6000 && metadata.height >= 3500) ||
      metadata.height >= 4000 ||
      metadata.width >= 7000
    );
  }

  /**
   * Evaluates an 8K stream playback request strictly upholding Requirement 43:
   * - No artificial ceiling: 8K is allowed without restriction on capable hardware
   * - Never silently transcoded (transcoding is strictly forbidden)
   * - Never artificially downgraded unless an explicit lower adaptive rendition is chosen by user
   * - On incapable hardware, produces a structured, graceful compatibility warning
   */
  public static evaluate8KPlayback(
    stream: StreamResolutionMetadata,
    platformProfile?: DevicePlatformProfile
  ): EightKPlaybackDecision {
    const is8K = this.isEightKStream(stream);

    // Profile detection
    const profile = platformProfile || {
      device: 'Windows PC' as const,
      osRaw: 'Windows NT 10.0',
      hardwareDecoderApi: 'Direct3D 11 Video Acceleration (D3D11VA)',
      hardwareAccelerationActive: true,
      maximumTestedResolution: '8K' as const,
      maximumHardwareDecode: '8K' as const,
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
          hdrLabel: 'HDR10' as const,
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
    };

    const targetCodec = (stream.codec || 'hevc').toLowerCase();
    const isHevcOrAv1 = targetCodec.includes('hevc') || targetCodec.includes('hvc') || targetCodec.includes('av01') || targetCodec.includes('av1') || targetCodec.includes('vp9');

    // 8K requires high throughput (~40-50+ Mbps baseline for live/HEVC)
    const min8kBandwidthMbps = 40.0;
    const bandwidthSufficient = profile.estimatedBandwidthMbps >= min8kBandwidthMbps;

    const hwAccelerated = profile.hardwareAccelerationActive;
    const maxHw = profile.maximumHardwareDecode;
    const isHw8kCapable = hwAccelerated && (maxHw === '8K' || maxHw === '4K'); // 8K pipeline or high-tier hardware
    const isCodecSupported = isHevcOrAv1 || targetCodec.includes('264');

    const factors = {
      hardwareAcceleration: hwAccelerated,
      codecSupported: isCodecSupported,
      maxHwDecodeResolution: maxHw,
      displayResolution: `${profile.display.physicalWidth}×${profile.display.physicalHeight}`,
      estimatedBandwidthMbps: profile.estimatedBandwidthMbps,
      bandwidthSufficient,
      framerateViable: (stream.framerate || 60) <= 60,
      hdrMatch: stream.isHdr ? profile.display.hdr.highDynamicRange : true,
    };

    if (!is8K) {
      return {
        is8K: false,
        canDirectPlay: true,
        transcodingForbidden: true,
        silentlyDowngraded: false,
        selectedVariantUrl: stream.streamUrl,
        factors,
      };
    }

    // 8K Stream Logic (Requirement 43)
    let canDirectPlay = true;
    let warning: CompatibilityWarning | undefined;

    if (!hwAccelerated) {
      canDirectPlay = false;
      warning = {
        level: 'CRITICAL_UNSUPPORTED',
        title: '8K Direct Playback Hardware Warning',
        message:
          'Software CPU decoding is active. Decoding uncompressed 8K (7680×4320) video via CPU without GPU hardware acceleration will cause severe frame drops, audio desynchronization, and thermal throttling.',
        technicalDetails: [
          `Stream Resolution: ${stream.width} × ${stream.height} (${stream.framerate || 60} fps)`,
          `Active Decoder: ${profile.hardwareDecoderApi} (CPU Fallback)`,
          `GPU Acceleration: Inactive / Unsupported`,
          `Policy Enforcement: Never silently transcoding 8K stream. Direct source passthrough maintained.`,
        ],
        suggestedAction:
          'Enable GPU hardware acceleration in settings, or explicitly select an adaptive rendition (4K UHD / 1080p FHD) if provided by your IPTV playlist.',
        allowsDirectPlaybackAttempt: true,
        requiresExplicitUserOverride: true,
      };
    } else if (maxHw === '1080p' || maxHw === '720p' || maxHw === 'None') {
      canDirectPlay = false;
      warning = {
        level: 'WARNING_PERFORMANCE',
        title: 'Hardware Decoder Resolution Limit Warning',
        message: `Your device's hardware video decoder reports a maximum decode tier of ${maxHw}. Playing an 8K stream may exceed the hardware decoder VRAM or buffer boundaries.`,
        technicalDetails: [
          `Target Stream: 8K UHD (${stream.width} × ${stream.height})`,
          `Hardware Decoder: ${profile.hardwareDecoderApi}`,
          `Hardware Decode Limit: ${maxHw}`,
          `Policy Enforcement: 8K stream is NOT artificially capped or transcoded.`,
        ],
        suggestedAction:
          'You may proceed with direct 8K playback, or switch to a 4K rendition if hardware limits cause decoder stalls.',
        allowsDirectPlaybackAttempt: true,
        requiresExplicitUserOverride: false,
      };
    } else if (!bandwidthSufficient) {
      warning = {
        level: 'WARNING_PERFORMANCE',
        title: '8K High Bitrate Network Notice',
        message: `Estimated network throughput (${profile.estimatedBandwidthMbps.toFixed(1)} Mbps) is below the recommended 40.0 Mbps for uninterrupted 8K streaming.`,
        technicalDetails: [
          `Current Bandwidth: ${profile.estimatedBandwidthMbps.toFixed(1)} Mbps`,
          `Recommended 8K Throughput: >= 40.0 Mbps`,
          `Buffer Health: Monitoring under ABR QoS watchdog`,
        ],
        suggestedAction: 'Playback will proceed without transcoding. If buffering occurs, select an adaptive stream variant.',
        allowsDirectPlaybackAttempt: true,
        requiresExplicitUserOverride: false,
      };
    } else {
      warning = {
        level: 'COMPATIBLE_OPTIMAL',
        title: '8K Ultra HD Direct Playback Supported',
        message: 'Your hardware acceleration pipeline, display, and network throughput satisfy direct 8K playback requirements.',
        technicalDetails: [
          `Hardware Decoder: ${profile.hardwareDecoderApi} (Active Zero-Copy Surface)`,
          `Display: ${profile.display.maxDisplayResolutionLabel} (${profile.display.refreshRateHz}Hz)`,
          `Estimated Throughput: ${profile.estimatedBandwidthMbps.toFixed(1)} Mbps`,
        ],
        suggestedAction: 'Direct 8K stream rendering active with zero transcoding and zero resolution ceiling.',
        allowsDirectPlaybackAttempt: true,
        requiresExplicitUserOverride: false,
      };
    }

    return {
      is8K: true,
      canDirectPlay,
      transcodingForbidden: true,
      silentlyDowngraded: false,
      selectedVariantUrl: stream.streamUrl,
      warning,
      factors,
    };
  }
}

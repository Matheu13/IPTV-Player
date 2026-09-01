/**
 * Firestick & Android TV Platform Optimization Config Helper
 *
 * Detects Android TV / Fire OS build properties (AFTMM, AFTSS, AFTS, AFTT, FireTV, Silk)
 * and automatically tunes the player's buffer sizes, worker threads, and hardware-decoder settings
 * for optimal 60fps jitter-free playback on memory-constrained (1GB-2GB RAM) streaming devices.
 */

export interface FirestickDeviceProfile {
  isFirestick: boolean;
  isAndroidTv: boolean;
  modelCode: string;
  modelName: string;
  socFamily: 'MediaTek' | 'Amlogic' | 'Qualcomm' | 'Generic_ARM' | 'Standard_x86';
  ramTierMb: number; // e.g. 1024, 1536, 2048
  maxSupportedDecodeResolution: '4K' | '1080p' | '720p';
  hardwareDecoderName: string;
}

export interface TunedPlayerBufferConfig {
  // HLS.js buffer tuning
  hls: {
    enableWorker: boolean;
    lowLatencyMode: boolean;
    backBufferLength: number; // Lower back buffer on Firestick to avoid OOM
    maxBufferLength: number; // Target forward buffer length in seconds
    maxMaxBufferLength: number; // Absolute hard ceiling
    maxBufferSize: number; // Hard memory cap in bytes (e.g. 32MB on low RAM)
    abrEwmaDefaultEstimate: number;
    abrBandWidthFactor: number;
    manifestLoadingTimeOut: number;
    fragLoadingTimeOut: number;
    manifestLoadingMaxRetry: number;
    fragLoadingMaxRetry: number;
  };
  // MPEG-TS buffer tuning
  mpegts: {
    enableWorker: boolean;
    lazyLoad: boolean;
    liveBufferLatencyChasing: boolean;
    liveBufferLatencyMaxLatency: number;
    liveBufferLatencyMinRemain: number;
    autoCleanupSourceBuffer: boolean;
    autoCleanupMaxBackwardDuration: number;
    autoCleanupMinBackwardDuration: number;
  };
  // HTMLMediaElement & Video Decoder properties
  decoder: {
    hardwareDecoderApi: string;
    preferDirectSurface: boolean;
    disableClientTranscode: true;
    bufferMode: 'low_memory_aggressive_cleanup' | 'standard_desktop_buffered' | 'ultra_low_latency';
  };
}

export class FirestickOptimizationConfig {
  /**
   * Inspects user agent and platform flags to classify Firestick / Fire TV hardware.
   */
  public static detectFirestickProfile(customUa?: string): FirestickDeviceProfile {
    const ua = customUa || (typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
    const uaUpper = ua.toUpperCase();

    const isFirestick =
      uaUpper.includes('AFT') ||
      uaUpper.includes('FIRETV') ||
      uaUpper.includes('FIRE TV') ||
      (uaUpper.includes('SILK') && uaUpper.includes('ANDROID'));

    const isAndroidTv = isFirestick || uaUpper.includes('ANDROID TV') || uaUpper.includes('BRAVIA') || uaUpper.includes('SHIELD');

    let modelCode = 'GENERIC_DEVICE';
    let modelName = 'Standard Desktop / Mobile Client';
    let ramTierMb = 4096;
    let maxSupportedDecodeResolution: '4K' | '1080p' | '720p' = '4K';
    let socFamily: 'MediaTek' | 'Amlogic' | 'Qualcomm' | 'Generic_ARM' | 'Standard_x86' = 'Standard_x86';

    if (isFirestick) {
      if (uaUpper.includes('AFTMM')) {
        modelCode = 'AFTMM';
        modelName = 'Amazon Fire TV Stick 4K (1st/2nd Gen)';
        ramTierMb = 1536;
        maxSupportedDecodeResolution = '4K';
        socFamily = 'MediaTek';
      } else if (uaUpper.includes('AFTSS')) {
        modelCode = 'AFTSS';
        modelName = 'Amazon Fire TV Stick Lite / 3rd Gen (1080p)';
        ramTierMb = 1024;
        maxSupportedDecodeResolution = '1080p';
        socFamily = 'MediaTek';
      } else if (uaUpper.includes('AFTKA')) {
        modelCode = 'AFTKA';
        modelName = 'Amazon Fire TV Stick 4K Max';
        ramTierMb = 2048;
        maxSupportedDecodeResolution = '4K';
        socFamily = 'MediaTek';
      } else if (uaUpper.includes('AFTR')) {
        modelCode = 'AFTR';
        modelName = 'Amazon Fire TV Cube';
        ramTierMb = 2048;
        maxSupportedDecodeResolution = '4K';
        socFamily = 'Amlogic';
      } else {
        modelCode = 'AFT_GENERIC';
        modelName = 'Amazon Fire TV Stick (Generic Build)';
        ramTierMb = 1536;
        maxSupportedDecodeResolution = '4K';
        socFamily = 'MediaTek';
      }
    } else if (isAndroidTv) {
      modelCode = 'ANDROID_TV_GENERIC';
      modelName = 'Android TV Device';
      ramTierMb = 2048;
      maxSupportedDecodeResolution = '4K';
      socFamily = 'Generic_ARM';
    }

    return {
      isFirestick,
      isAndroidTv,
      modelCode,
      modelName,
      socFamily,
      ramTierMb,
      maxSupportedDecodeResolution,
      hardwareDecoderName: isAndroidTv ? 'Android MediaCodec (OMX/C2 Hardware Surface)' : 'W3C Standard Decoders',
    };
  }

  /**
   * Generates tuned player buffer and decoder parameters tailored specifically for
   * Fire TV memory constraints and MediaCodec surface characteristics.
   */
  public static getTunedPlayerConfig(customUa?: string): TunedPlayerBufferConfig {
    const profile = this.detectFirestickProfile(customUa);

    if (profile.isFirestick || profile.isAndroidTv) {
      const isLowRam = profile.ramTierMb <= 1024;

      return {
        hls: {
          enableWorker: true,
          lowLatencyMode: true,
          // Aggressive memory cleanup for 1GB-1.5GB RAM streaming sticks:
          backBufferLength: isLowRam ? 10 : 15, // seconds (avoids heap ballooning)
          maxBufferLength: isLowRam ? 12 : 20, // seconds
          maxMaxBufferLength: isLowRam ? 25 : 40, // seconds ceiling
          maxBufferSize: isLowRam ? 24 * 1024 * 1024 : 48 * 1024 * 1024, // 24MB/48MB hard cap
          abrEwmaDefaultEstimate: 6000000, // 6.0 Mbps safe initial estimate
          abrBandWidthFactor: 0.8, // 20% headroom to prevent decoder stalls
          manifestLoadingTimeOut: 6000,
          fragLoadingTimeOut: 8000,
          manifestLoadingMaxRetry: 1, // Phase 47: Retry once only, avoid infinite hammer
          fragLoadingMaxRetry: 1,
        },
        mpegts: {
          enableWorker: true,
          lazyLoad: false,
          liveBufferLatencyChasing: true,
          liveBufferLatencyMaxLatency: 3.0,
          liveBufferLatencyMinRemain: 1.0,
          autoCleanupSourceBuffer: true,
          autoCleanupMaxBackwardDuration: isLowRam ? 12 : 20,
          autoCleanupMinBackwardDuration: isLowRam ? 6 : 10,
        },
        decoder: {
          hardwareDecoderApi: 'Android MediaCodec Direct Surface',
          preferDirectSurface: true,
          disableClientTranscode: true,
          bufferMode: 'low_memory_aggressive_cleanup',
        },
      };
    }

    // Standard Desktop / Fast Client Default Configuration
    return {
      hls: {
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 120 * 1024 * 1024, // 120MB
        abrEwmaDefaultEstimate: 8500000,
        abrBandWidthFactor: 0.85,
        manifestLoadingTimeOut: 8000,
        fragLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 1, // Phase 47: Retry once only
        fragLoadingMaxRetry: 1,
      },
      mpegts: {
        enableWorker: true,
        lazyLoad: false,
        liveBufferLatencyChasing: true,
        liveBufferLatencyMaxLatency: 4.0,
        liveBufferLatencyMinRemain: 1.5,
        autoCleanupSourceBuffer: true,
        autoCleanupMaxBackwardDuration: 30,
        autoCleanupMinBackwardDuration: 15,
      },
      decoder: {
        hardwareDecoderApi: 'Standard Platform Decoders',
        preferDirectSurface: false,
        disableClientTranscode: true,
        bufferMode: 'standard_desktop_buffered',
      },
    };
  }
}

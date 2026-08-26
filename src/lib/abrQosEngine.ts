/**
 * Milestone 13: Adaptive Bitrate (ABR) Stream Shaper, QoS Jitter/Throughput Predictor & Low-Latency Optimizer
 * Features:
 * - Exponentially Weighted Moving Average (EWMA) throughput estimation + harmonic mean calculation
 * - Multi-rendition ABR ladder switching rules with hysteresis to prevent quality oscillation/flapping
 * - QoS metrics collector: RTT, Jitter, Packet Loss, Buffer Occupancy, Dropped Frames
 * - Low-Latency HLS (LL-HLS) sub-second chunk drift monitor
 */

export interface StreamRendition {
  id: string;
  name: string; // e.g. "1080p60 FHD", "720p60 HD", "480p SD", "360p Low"
  bandwidthBps: number; // e.g. 6000000 (6 Mbps)
  resolution: {
    width: number;
    height: number;
  };
  frameRate: number; // e.g. 60, 50, 30, 25
  codecs: string; // e.g. 'avc1.64002a,mp4a.40.2' or 'hvc1.2.4.L150.B0'
  url: string;
  isCurrent: boolean;
}

export type AbrPolicyMode = 'auto' | 'manual' | 'eco_saver' | 'max_quality' | 'lowest_latency';

export interface RenditionSwitchEvent {
  timestamp: string;
  fromRenditionId: string;
  toRenditionId: string;
  estimatedThroughputKbps: number;
  bufferOccupancySec: number;
  reason: string;
}

export interface QosMetricsSnapshot {
  currentBitrateKbps: number;
  estimatedThroughputKbps: number;
  bufferOccupancySec: number;
  targetBufferSec: number;
  bufferState: 'critical' | 'low' | 'healthy' | 'optimal';
  droppedFramesCount: number;
  jitterMs: number;
  rttLatencyMs: number;
  packetLossPercent: number;
  liveEdgeDriftSec: number;
  lowLatencyMode: boolean;
  policy: AbrPolicyMode;
  currentRendition: StreamRendition;
  availableRenditions: StreamRendition[];
  switchHistory: RenditionSwitchEvent[];
}

export const SAMPLE_LADDER_RENDITIONS: StreamRendition[] = [
  {
    id: 'rend_4k',
    name: '4K UltraHD (2160p60 HEVC HDR)',
    bandwidthBps: 18_000_000,
    resolution: { width: 3840, height: 2160 },
    frameRate: 60,
    codecs: 'hvc1.2.4.L153.B0,mp4a.40.2',
    url: 'http://provider.panel-stream.net:8080/live/user/pass/101_4k.m3u8',
    isCurrent: false,
  },
  {
    id: 'rend_1080p60',
    name: '1080p60 Full HD (AVC High)',
    bandwidthBps: 6_500_000,
    resolution: { width: 1920, height: 1080 },
    frameRate: 60,
    codecs: 'avc1.64002a,mp4a.40.2',
    url: 'http://provider.panel-stream.net:8080/live/user/pass/101_1080p.m3u8',
    isCurrent: true,
  },
  {
    id: 'rend_720p60',
    name: '720p60 HD Sports',
    bandwidthBps: 3_500_000,
    resolution: { width: 1280, height: 720 },
    frameRate: 60,
    codecs: 'avc1.4d401f,mp4a.40.2',
    url: 'http://provider.panel-stream.net:8080/live/user/pass/101_720p.m3u8',
    isCurrent: false,
  },
  {
    id: 'rend_480p',
    name: '480p SD Standard',
    bandwidthBps: 1_400_000,
    resolution: { width: 854, height: 480 },
    frameRate: 30,
    codecs: 'avc1.4d401e,mp4a.40.2',
    url: 'http://provider.panel-stream.net:8080/live/user/pass/101_480p.m3u8',
    isCurrent: false,
  },
  {
    id: 'rend_360p',
    name: '360p Low (Cellular/Slow Net)',
    bandwidthBps: 650_000,
    resolution: { width: 640, height: 360 },
    frameRate: 25,
    codecs: 'avc1.42e01e,mp4a.40.2',
    url: 'http://provider.panel-stream.net:8080/live/user/pass/101_360p.m3u8',
    isCurrent: false,
  },
];

export class AbrQosEngine {
  private renditions: StreamRendition[] = [...SAMPLE_LADDER_RENDITIONS];
  private currentRenditionId: string = 'rend_1080p60';
  private policy: AbrPolicyMode = 'auto';

  // Metrics
  private recentSampleThroughputsKbps: number[] = [8500, 9200, 7800, 8400, 8900];
  private estimatedThroughputKbps: number = 8500;
  private bufferOccupancySec: number = 14.5;
  private targetBufferSec: number = 18.0;
  private droppedFrames: number = 2;
  private jitterMs: number = 18.4;
  private rttLatencyMs: number = 42.0;
  private packetLossPercent: number = 0.08;
  private liveEdgeDriftSec: number = 1.2;
  private lowLatencyMode: boolean = true;

  // Hysteresis counters
  private stepUpConfirmCount: number = 0;
  private readonly STEP_UP_REQUIRED_SAMPLES = 2; // require 2 solid windows to step up
  private switchHistory: RenditionSwitchEvent[] = [];

  constructor(initialRenditions?: StreamRendition[]) {
    if (initialRenditions && initialRenditions.length > 0) {
      this.renditions = initialRenditions.map((r, i) => ({
        ...r,
        isCurrent: i === 0,
      }));
      this.currentRenditionId = this.renditions[0].id;
    }
  }

  public setPolicy(policy: AbrPolicyMode) {
    this.policy = policy;
    if (policy === 'max_quality') {
      this.selectRendition(this.renditions[0].id, 'Manual policy: Maximum Quality lock');
    } else if (policy === 'eco_saver') {
      const eco = this.renditions.find((r) => r.resolution.height <= 480) || this.renditions[this.renditions.length - 1];
      this.selectRendition(eco.id, 'Manual policy: Eco Bandwidth Saver');
    } else if (policy === 'lowest_latency') {
      this.targetBufferSec = 3.5;
      this.lowLatencyMode = true;
    }
  }

  public setLowLatencyMode(enabled: boolean) {
    this.lowLatencyMode = enabled;
    this.targetBufferSec = enabled ? 4.0 : 18.0;
  }

  /**
   * Records a chunk/segment download completion to update EWMA throughput estimator
   */
  public recordChunkDownload(chunkSizeBytes: number, durationMs: number, bufferFillSec?: number): number {
    if (durationMs <= 0) return this.estimatedThroughputKbps;

    const instantKbps = (chunkSizeBytes * 8) / durationMs;
    // Add to sliding window
    this.recentSampleThroughputsKbps.push(instantKbps);
    if (this.recentSampleThroughputsKbps.length > 10) {
      this.recentSampleThroughputsKbps.shift();
    }

    // EWMA smoothing (alpha = 0.35) + Harmonic Mean calculation to resist outliers
    const alpha = 0.35;
    const harmonicMean = this.calculateHarmonicMean(this.recentSampleThroughputsKbps);
    this.estimatedThroughputKbps = Math.round(
      alpha * instantKbps + (1 - alpha) * (0.6 * this.estimatedThroughputKbps + 0.4 * harmonicMean)
    );

    if (typeof bufferFillSec === 'number') {
      this.bufferOccupancySec = Math.max(0, parseFloat(bufferFillSec.toFixed(2)));
    }

    // Auto-evaluate ABR switch if in auto mode
    if (this.policy === 'auto') {
      this.evaluateAbrSwitch();
    }

    return this.estimatedThroughputKbps;
  }

  private calculateHarmonicMean(samples: number[]): number {
    if (samples.length === 0) return 0;
    const sumInv = samples.reduce((acc, val) => acc + (val > 0 ? 1 / val : 0), 0);
    return sumInv > 0 ? Math.round(samples.length / sumInv) : 0;
  }

  /**
   * Evaluates ABR quality step-up or emergency step-down
   */
  public evaluateAbrSwitch(): { switched: boolean; targetRendition?: StreamRendition; reason?: string } {
    const current = this.getCurrentRendition();
    const sorted = [...this.renditions].sort((a, b) => b.bandwidthBps - a.bandwidthBps);

    // 1. EMERGENCY STEP-DOWN: If buffer is critically starved (< 2.5s)
    if (this.bufferOccupancySec < 2.5) {
      const lowerRenditions = sorted.filter((r) => r.bandwidthBps < current.bandwidthBps);
      if (lowerRenditions.length > 0) {
        // Step down to safest low-bitrate rendition
        const target = lowerRenditions[lowerRenditions.length - 1]; // lowest or next down
        this.stepUpConfirmCount = 0;
        this.selectRendition(
          target.id,
          `Critical buffer starvation (${this.bufferOccupancySec}s < 2.5s) - Emergency drop to prevent stall`
        );
        return { switched: true, targetRendition: target, reason: 'Emergency buffer starvation' };
      }
    }

    // 2. CONSERVATIVE STEP-DOWN: Buffer below low threshold (< 6.0s) & throughput < 1.1x current bitrate
    const currentBitrateKbps = current.bandwidthBps / 1000;
    if (this.bufferOccupancySec < 6.0 && this.estimatedThroughputKbps < currentBitrateKbps * 1.15) {
      const nextLower = sorted.find((r) => r.bandwidthBps < current.bandwidthBps);
      if (nextLower) {
        this.stepUpConfirmCount = 0;
        this.selectRendition(
          nextLower.id,
          `Buffer depleting (${this.bufferOccupancySec}s) and throughput (${this.estimatedThroughputKbps} kbps) is marginal`
        );
        return { switched: true, targetRendition: nextLower, reason: 'Buffer depletion step-down' };
      }
    }

    // 3. STEP-UP HYSTERESIS: Buffer healthy (> 10.0s) & throughput exceeds next candidate by 1.35x margin
    const higherCandidates = sorted.filter((r) => r.bandwidthBps > current.bandwidthBps);
    if (higherCandidates.length > 0 && this.bufferOccupancySec >= 10.0) {
      // Pick best candidate that fits comfortably with 30% safety headroom
      const nextHigher = higherCandidates[higherCandidates.length - 1]; // closest higher rendition
      const requiredKbps = (nextHigher.bandwidthBps / 1000) * 1.3;

      if (this.estimatedThroughputKbps >= requiredKbps) {
        this.stepUpConfirmCount++;
        if (this.stepUpConfirmCount >= this.STEP_UP_REQUIRED_SAMPLES) {
          this.stepUpConfirmCount = 0;
          this.selectRendition(
            nextHigher.id,
            `Throughput sustained (${this.estimatedThroughputKbps} kbps >= ${Math.round(requiredKbps)} kbps) with healthy buffer (${this.bufferOccupancySec}s)`
          );
          return { switched: true, targetRendition: nextHigher, reason: 'High throughput step-up' };
        }
      } else {
        this.stepUpConfirmCount = 0;
      }
    } else {
      this.stepUpConfirmCount = 0;
    }

    return { switched: false };
  }

  public selectRendition(id: string, reason: string = 'User selection'): boolean {
    const found = this.renditions.find((r) => r.id === id);
    if (!found) return false;

    const previousId = this.currentRenditionId;
    if (previousId !== id) {
      this.switchHistory.unshift({
        timestamp: new Date().toISOString(),
        fromRenditionId: previousId,
        toRenditionId: id,
        estimatedThroughputKbps: this.estimatedThroughputKbps,
        bufferOccupancySec: this.bufferOccupancySec,
        reason,
      });
      if (this.switchHistory.length > 50) this.switchHistory.pop();
    }

    this.currentRenditionId = id;
    this.renditions.forEach((r) => {
      r.isCurrent = r.id === id;
    });

    return true;
  }

  public getCurrentRendition(): StreamRendition {
    return this.renditions.find((r) => r.id === this.currentRenditionId) || this.renditions[0];
  }

  public updateNetworkQos(rttMs: number, jitterMs: number, packetLoss: number, droppedDelta: number = 0) {
    this.rttLatencyMs = Math.max(1, parseFloat(rttMs.toFixed(1)));
    this.jitterMs = Math.max(0.1, parseFloat(jitterMs.toFixed(1)));
    this.packetLossPercent = Math.max(0, Math.min(100, parseFloat(packetLoss.toFixed(2))));
    this.droppedFrames += droppedDelta;
  }

  public getSnapshot(): QosMetricsSnapshot {
    const current = this.getCurrentRendition();
    let bufferState: QosMetricsSnapshot['bufferState'] = 'optimal';
    if (this.bufferOccupancySec < 3.0) bufferState = 'critical';
    else if (this.bufferOccupancySec < 7.0) bufferState = 'low';
    else if (this.bufferOccupancySec < 14.0) bufferState = 'healthy';

    return {
      currentBitrateKbps: Math.round(current.bandwidthBps / 1000),
      estimatedThroughputKbps: this.estimatedThroughputKbps,
      bufferOccupancySec: this.bufferOccupancySec,
      targetBufferSec: this.targetBufferSec,
      bufferState,
      droppedFramesCount: this.droppedFrames,
      jitterMs: this.jitterMs,
      rttLatencyMs: this.rttLatencyMs,
      packetLossPercent: this.packetLossPercent,
      liveEdgeDriftSec: this.liveEdgeDriftSec,
      lowLatencyMode: this.lowLatencyMode,
      policy: this.policy,
      currentRendition: current,
      availableRenditions: [...this.renditions],
      switchHistory: [...this.switchHistory],
    };
  }
}

export const globalAbrQosEngine = new AbrQosEngine();

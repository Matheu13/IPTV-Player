/**
 * Milestone 16: Multi-View Picture-in-Picture (PiP), Split-Screen (Quad 2x2 / 1x3 Mosaic)
 * & Audio Focus Arbitrator Engine
 *
 * Provides concurrent multi-stream playback synchronization, dynamic video grid geometry,
 * bandwidth budgeting, hardware decoding resource allocation, and exclusive audio focus arbitration.
 */

export type MultiViewLayout = 'SINGLE' | 'PIP_FLOATING' | 'DUAL_SPLIT' | 'QUAD_2X2' | 'MOSAIC_1_PLUS_3';

export type PipCorner = 'TOP_RIGHT' | 'BOTTOM_RIGHT' | 'TOP_LEFT' | 'BOTTOM_LEFT';

export interface MultiViewCell {
  id: string; // e.g. 'slot_0', 'slot_1', 'slot_2', 'slot_3'
  index: number;
  channelId?: string;
  channelName: string;
  streamUrl: string;
  sourceType: 'XTREAM' | 'M3U' | 'STALKER' | 'SIMULATED';
  resolution: '1080p' | '720p' | '480p' | 'auto';
  targetBitrateKbps: number;
  currentFps: number;
  droppedFrames: number;
  ptsOffsetMs: number;
  audioFocus: boolean;
  volume: number; // 0 to 100
  isMuted: boolean;
  playbackState: 'PLAYING' | 'BUFFERING' | 'STALLED' | 'STOPPED' | 'ERROR';
  hwdecDecoder: 'nvdec' | 'd3d11va' | 'vaapi' | 'software';
  peakDb: number; // Audio visualizer dB level (-60dB to 0dB)
}

export interface MultiViewConfig {
  layout: MultiViewLayout;
  pipCorner: PipCorner;
  pipScalePercent: number; // 20% to 40%
  maxTotalBandwidthMbps: number; // Total network budget for all streams
  hwdecAccelerated: boolean;
  audioArbitrationMode: 'EXCLUSIVE_FOCUS' | 'AUDIO_DUCKING' | 'MANUAL_MIX';
  enableLiveEdgeSync: boolean;
}

export const DEFAULT_MULTIVIEW_CONFIG: MultiViewConfig = {
  layout: 'QUAD_2X2',
  pipCorner: 'BOTTOM_RIGHT',
  pipScalePercent: 28,
  maxTotalBandwidthMbps: 18.0,
  hwdecAccelerated: true,
  audioArbitrationMode: 'EXCLUSIVE_FOCUS',
  enableLiveEdgeSync: true,
};

export class MultiViewEngine {
  private config: MultiViewConfig;
  private cells: Map<string, MultiViewCell> = new Map();
  private focusedCellId: string = 'slot_0';
  private listeners: Array<() => void> = [];
  private meterInterval: any = null;

  constructor(initialConfig: Partial<MultiViewConfig> = {}) {
    this.config = { ...DEFAULT_MULTIVIEW_CONFIG, ...initialConfig };
    this.initializeDefaultSlots();
    this.startAudioMeterSimulation();
  }

  private initializeDefaultSlots() {
    const defaultChannels = [
      {
        id: 'slot_0',
        name: 'Sky Sports Premier League FHD',
        url: 'http://provider.panel-stream.net:8080/live/user/pass/101.m3u8',
        source: 'XTREAM' as const,
        res: '1080p' as const,
        bitrate: 6500,
      },
      {
        id: 'slot_1',
        name: 'TNT Sports 1 HD (50fps)',
        url: 'http://provider.panel-stream.net:8080/live/user/pass/102.m3u8',
        source: 'XTREAM' as const,
        res: '720p' as const,
        bitrate: 3800,
      },
      {
        id: 'slot_2',
        name: 'US: ESPN HD (60FPS)',
        url: 'http://provider.panel-stream.net:8080/live/user/pass/103.m3u8',
        source: 'M3U' as const,
        res: '720p' as const,
        bitrate: 4200,
      },
      {
        id: 'slot_3',
        name: 'beIN Sports 1 France HD',
        url: 'http://provider.panel-stream.net:8080/live/user/pass/104.ts',
        source: 'STALKER' as const,
        res: '480p' as const,
        bitrate: 2200,
      },
    ];

    defaultChannels.forEach((def, idx) => {
      this.cells.set(def.id, {
        id: def.id,
        index: idx,
        channelId: `ch_${idx + 101}`,
        channelName: def.name,
        streamUrl: def.url,
        sourceType: def.source,
        resolution: def.res,
        targetBitrateKbps: def.bitrate,
        currentFps: idx === 0 ? 59.94 : 50.0,
        droppedFrames: 0,
        ptsOffsetMs: idx * 12,
        audioFocus: idx === 0,
        volume: 85,
        isMuted: idx !== 0,
        playbackState: 'PLAYING',
        hwdecDecoder: 'nvdec',
        peakDb: idx === 0 ? -12.4 : -60.0,
      });
    });
    this.focusedCellId = 'slot_0';
  }

  private startAudioMeterSimulation() {
    if (this.meterInterval) clearInterval(this.meterInterval);
    this.meterInterval = setInterval(() => {
      this.cells.forEach((cell) => {
        if (cell.audioFocus && !cell.isMuted && cell.playbackState === 'PLAYING') {
          // Dynamic active audio peak simulation (-18 to -4 dB)
          cell.peakDb = -18 + Math.random() * 14;
        } else {
          cell.peakDb = -60;
        }
      });
      this.notify();
    }, 400);
  }

  public destroy() {
    if (this.meterInterval) {
      clearInterval(this.meterInterval);
      this.meterInterval = null;
    }
    this.listeners = [];
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  }

  public getConfig(): MultiViewConfig {
    return { ...this.config };
  }

  public setConfig(newConfig: Partial<MultiViewConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.rebalanceBandwidthBudget();
    this.notify();
  }

  public setLayout(layout: MultiViewLayout) {
    this.config.layout = layout;
    this.rebalanceBandwidthBudget();
    this.notify();
  }

  public getActiveCells(): MultiViewCell[] {
    const all = Array.from(this.cells.values()).sort((a, b) => a.index - b.index);
    switch (this.config.layout) {
      case 'SINGLE':
        return all.slice(0, 1);
      case 'PIP_FLOATING':
      case 'DUAL_SPLIT':
        return all.slice(0, 2);
      case 'MOSAIC_1_PLUS_3':
      case 'QUAD_2X2':
      default:
        return all.slice(0, 4);
    }
  }

  public getAllCells(): MultiViewCell[] {
    return Array.from(this.cells.values()).sort((a, b) => a.index - b.index);
  }

  public getCell(slotId: string): MultiViewCell | undefined {
    return this.cells.get(slotId);
  }

  public getFocusedCell(): MultiViewCell | undefined {
    return this.cells.get(this.focusedCellId);
  }

  /**
   * Set exclusive audio focus to a specific slot
   * Instantly mutes all other active slots with zero stream re-buffering
   */
  public setAudioFocus(slotId: string): boolean {
    const target = this.cells.get(slotId);
    if (!target) return false;

    this.focusedCellId = slotId;
    this.cells.forEach((cell, id) => {
      if (id === slotId) {
        cell.audioFocus = true;
        cell.isMuted = false;
      } else {
        cell.audioFocus = false;
        cell.isMuted = true;
      }
    });

    this.notify();
    return true;
  }

  /**
   * Set individual volume level for a specific quadrant/slot (0 - 100)
   */
  public setSlotVolume(slotId: string, volume: number): boolean {
    const target = this.cells.get(slotId);
    if (!target) return false;

    target.volume = Math.max(0, Math.min(100, volume));
    this.notify();
    return true;
  }

  /**
   * Toggle mute for a specific quadrant/slot
   */
  public toggleSlotMute(slotId: string): boolean {
    const target = this.cells.get(slotId);
    if (!target) return false;

    target.isMuted = !target.isMuted;
    // If unmuting this slot, also mark audioFocus if it's the only unmuted one
    const active = this.getActiveCells();
    const unmuted = active.filter((c) => !c.isMuted);
    if (unmuted.length === 1 && unmuted[0].id === slotId) {
      this.focusedCellId = slotId;
      target.audioFocus = true;
    }
    this.notify();
    return target.isMuted;
  }

  /**
   * Set mute state explicitly for a specific slot
   */
  public setSlotMute(slotId: string, isMuted: boolean): boolean {
    const target = this.cells.get(slotId);
    if (!target) return false;

    target.isMuted = isMuted;
    this.notify();
    return true;
  }

  /**
   * Quick-swap channel audio between next slot
   */
  public cycleAudioFocus(): string {
    const active = this.getActiveCells();
    if (active.length === 0) return this.focusedCellId;

    const currentIdx = active.findIndex((c) => c.id === this.focusedCellId);
    const nextIdx = (currentIdx + 1) % active.length;
    const nextSlotId = active[nextIdx].id;
    this.setAudioFocus(nextSlotId);
    return nextSlotId;
  }

  /**
   * Swap positions/channels of two slots
   */
  public swapSlots(slotIdA: string, slotIdB: string): boolean {
    const cellA = this.cells.get(slotIdA);
    const cellB = this.cells.get(slotIdB);
    if (!cellA || !cellB) return false;

    // Swap contents
    const temp = {
      channelId: cellA.channelId,
      channelName: cellA.channelName,
      streamUrl: cellA.streamUrl,
      sourceType: cellA.sourceType,
      resolution: cellA.resolution,
      targetBitrateKbps: cellA.targetBitrateKbps,
    };

    cellA.channelId = cellB.channelId;
    cellA.channelName = cellB.channelName;
    cellA.streamUrl = cellB.streamUrl;
    cellA.sourceType = cellB.sourceType;
    cellA.resolution = cellB.resolution;
    cellA.targetBitrateKbps = cellB.targetBitrateKbps;

    cellB.channelId = temp.channelId;
    cellB.channelName = temp.channelName;
    cellB.streamUrl = temp.streamUrl;
    cellB.sourceType = temp.sourceType;
    cellB.resolution = temp.resolution;
    cellB.targetBitrateKbps = temp.targetBitrateKbps;

    this.rebalanceBandwidthBudget();
    this.notify();
    return true;
  }

  /**
   * Assign a new channel to a specific viewport slot
   */
  public assignChannelToSlot(
    slotId: string,
    channel: {
      id?: string;
      name: string;
      streamUrl: string;
      sourceType?: 'XTREAM' | 'M3U' | 'STALKER' | 'SIMULATED';
    }
  ): boolean {
    const cell = this.cells.get(slotId);
    if (!cell) return false;

    cell.channelId = channel.id || `ch_${Date.now()}`;
    cell.channelName = channel.name;
    cell.streamUrl = channel.streamUrl;
    cell.sourceType = channel.sourceType || 'XTREAM';
    cell.playbackState = 'PLAYING';
    cell.droppedFrames = 0;
    cell.ptsOffsetMs = Math.floor(Math.random() * 20);

    this.rebalanceBandwidthBudget();
    this.notify();
    return true;
  }

  /**
   * Rebalances resolution & bitrate across active slots to stay within total bandwidth budget
   */
  public rebalanceBandwidthBudget() {
    const active = this.getActiveCells();
    const count = active.length;
    if (count === 0) return;

    const totalBudgetKbps = this.config.maxTotalBandwidthMbps * 1000;

    if (count === 1) {
      active[0].resolution = '1080p';
      active[0].targetBitrateKbps = Math.min(8000, totalBudgetKbps);
    } else if (count === 2) {
      // 2 streams: 1080p + 720p
      active[0].resolution = '1080p';
      active[0].targetBitrateKbps = Math.floor(totalBudgetKbps * 0.6);
      active[1].resolution = '720p';
      active[1].targetBitrateKbps = Math.floor(totalBudgetKbps * 0.4);
    } else if (this.config.layout === 'MOSAIC_1_PLUS_3') {
      // 1 Master (55% budget) + 3 Sub (15% budget each)
      active[0].resolution = '1080p';
      active[0].targetBitrateKbps = Math.floor(totalBudgetKbps * 0.55);
      for (let i = 1; i < active.length; i++) {
        active[i].resolution = '480p';
        active[i].targetBitrateKbps = Math.floor(totalBudgetKbps * 0.15);
      }
    } else {
      // Quad 2x2: 1 Primary (40%) + 3 secondary (20% each)
      active[0].resolution = '1080p';
      active[0].targetBitrateKbps = Math.floor(totalBudgetKbps * 0.4);
      for (let i = 1; i < active.length; i++) {
        active[i].resolution = '720p';
        active[i].targetBitrateKbps = Math.floor(totalBudgetKbps * 0.2);
      }
    }
  }

  /**
   * Returns aggregated multi-view telemetry statistics
   */
  public getTelemetry(): {
    activeStreamCount: number;
    totalBandwidthMbps: number;
    totalDroppedFrames: number;
    focusedChannelName: string;
    hwdecStatus: string;
    maxJitterOffsetMs: number;
  } {
    const active = this.getActiveCells();
    const totalBitrate = active.reduce((acc, c) => acc + c.targetBitrateKbps, 0);
    const totalDrops = active.reduce((acc, c) => acc + c.droppedFrames, 0);
    const focused = this.getFocusedCell();
    const maxOffset = Math.max(...active.map((c) => c.ptsOffsetMs), 0);

    return {
      activeStreamCount: active.length,
      totalBandwidthMbps: parseFloat((totalBitrate / 1000).toFixed(2)),
      totalDroppedFrames: totalDrops,
      focusedChannelName: focused ? focused.channelName : 'None',
      hwdecStatus: this.config.hwdecAccelerated ? 'NVDEC / D3D11VA (Active)' : 'Software Decode',
      maxJitterOffsetMs: maxOffset,
    };
  }
}

export const globalMultiViewEngine = new MultiViewEngine();

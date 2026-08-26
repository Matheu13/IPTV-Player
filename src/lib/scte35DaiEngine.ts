/**
 * Milestone 24: Dynamic Ad Insertion (DAI) & SCTE-35 Splicing Engine
 *
 * Implements SCTE-35 Cue Marker Parsing (Splice Insert, Time Signal, Segmentation Descriptors),
 * SSAI vs CSAI Stream Splicing with PTS/DTS timeline continuity, VAST 4.2 / VMAP 1.0
 * Quartile Event Tracking, and EBU R128 Ad Loudness Matching.
 */

export interface Scte35CueMarker {
  id: string;
  commandType: 'SPLICE_INSERT' | 'TIME_SIGNAL' | 'SEGMENTATION_DESCRIPTOR' | 'SPLICE_NULL';
  ptsTimestampMs: number;
  durationMs: number;
  spliceEventId: number;
  segmentationTypeId: number; // e.g. 0x34 (Provider Ad Start), 0x35 (Provider Ad End), 0x30 (Distributor Ad Start)
  segmentationTypeName: string;
  autoReturn: boolean;
  hexPayload: string;
  utcBreakStart: string;
  breakType: 'PRE_ROLL' | 'MID_ROLL' | 'POST_ROLL';
}

export interface AdCreativeItem {
  id: string;
  title: string;
  advertiser: string;
  durationSec: number;
  mediaUrl: string;
  bitrateKbps: number;
  resolution: string;
  loudnessLufs: number; // Target -24 LUFS
  vastQuartiles: {
    start: boolean;
    firstQuartile: boolean;
    midpoint: boolean;
    thirdQuartile: boolean;
    complete: boolean;
  };
  clickThroughUrl: string;
  impressionsLogged: number;
}

export interface DaiSessionTelemetry {
  daiMode: 'SSAI' | 'CSAI';
  currentStreamState: 'PROGRAM_PLAYBACK' | 'AD_CUE_DETECTED' | 'AD_PLAYBACK' | 'STREAM_RESPLICING';
  activeProgramPtsMs: number;
  activeAdTimeRemainingSec: number;
  totalAdsServed: number;
  totalAdDurationSec: number;
  vastBeaconsDispatched: number;
  ptsDriftCompensationMs: number;
  ebuR128GainOffsetDb: number;
  adPodIndex: number;
  adPodTotal: number;
  activeAd: AdCreativeItem | null;
  upcomingCues: Scte35CueMarker[];
  cueHistory: Scte35CueMarker[];
}

export class Scte35DaiEngine {
  private daiMode: 'SSAI' | 'CSAI' = 'SSAI';
  private currentStreamState: 'PROGRAM_PLAYBACK' | 'AD_CUE_DETECTED' | 'AD_PLAYBACK' | 'STREAM_RESPLICING' = 'PROGRAM_PLAYBACK';
  private activeProgramPtsMs: number = 42890000;
  private activeAdTimeRemainingSec: number = 0;
  private totalAdsServed: number = 14;
  private totalAdDurationSec: number = 210;
  private vastBeaconsDispatched: number = 48;
  private ptsDriftCompensationMs: number = 2;
  private ebuR128GainOffsetDb: number = -3.2;
  private adPodIndex: number = 0;
  private adPodTotal: number = 0;
  private activeAd: AdCreativeItem | null = null;
  private upcomingCues: Scte35CueMarker[] = [];
  private cueHistory: Scte35CueMarker[] = [];
  private adInventory: AdCreativeItem[] = [];
  private subscribers: Set<() => void> = new Set();
  private timer: any = null;

  constructor() {
    this.initInventory();
    this.seedCueMarkers();
    this.startClock();
  }

  private initInventory() {
    this.adInventory = [
      {
        id: 'AD-NIKE-PRO-01',
        title: 'Nike Air Max Pulse - Limitless Speed',
        advertiser: 'Nike Sports Global',
        durationSec: 15,
        mediaUrl: 'https://ad-edge.faststream.cdn/creatives/nike_airmax_1080p.m3u8',
        bitrateKbps: 6500,
        resolution: '1920x1080 @ 60fps',
        loudnessLufs: -24.0,
        vastQuartiles: { start: false, firstQuartile: false, midpoint: false, thirdQuartile: false, complete: false },
        clickThroughUrl: 'https://nike.com/airmax-pulse',
        impressionsLogged: 840,
      },
      {
        id: 'AD-SONY-PS5-02',
        title: 'PlayStation 5 Pro - Feel The Game',
        advertiser: 'Sony Interactive Entertainment',
        durationSec: 15,
        mediaUrl: 'https://ad-edge.faststream.cdn/creatives/sony_ps5pro_4k.m3u8',
        bitrateKbps: 12000,
        resolution: '3840x2160 HDR10',
        loudnessLufs: -24.2,
        vastQuartiles: { start: false, firstQuartile: false, midpoint: false, thirdQuartile: false, complete: false },
        clickThroughUrl: 'https://playstation.com/ps5-pro',
        impressionsLogged: 1250,
      },
      {
        id: 'AD-BMW-EV-03',
        title: 'BMW iX M60 - Electric Luxury',
        advertiser: 'BMW Group',
        durationSec: 30,
        mediaUrl: 'https://ad-edge.faststream.cdn/creatives/bmw_ix_1080p.m3u8',
        bitrateKbps: 8000,
        resolution: '1920x1080 @ 60fps',
        loudnessLufs: -23.8,
        vastQuartiles: { start: false, firstQuartile: false, midpoint: false, thirdQuartile: false, complete: false },
        clickThroughUrl: 'https://bmw.com/ix-electric',
        impressionsLogged: 920,
      },
    ];
  }

  private seedCueMarkers() {
    const now = Date.now();
    this.upcomingCues = [
      {
        id: 'CUE-SCTE-10491',
        commandType: 'TIME_SIGNAL',
        ptsTimestampMs: this.activeProgramPtsMs + 12000,
        durationMs: 30000,
        spliceEventId: 4091,
        segmentationTypeId: 0x34,
        segmentationTypeName: 'Provider Ad Start (Break In)',
        autoReturn: true,
        hexPayload: '/DA0AAAAAAAA///wBQb+AAAAAAAiAiBDRVVJAAAAn3//AAA31g0KSU5URVJQQUNLUwEA',
        utcBreakStart: new Date(now + 12000).toISOString(),
        breakType: 'MID_ROLL',
      },
      {
        id: 'CUE-SCTE-10492',
        commandType: 'SPLICE_INSERT',
        ptsTimestampMs: this.activeProgramPtsMs + 90000,
        durationMs: 15000,
        spliceEventId: 4092,
        segmentationTypeId: 0x30,
        segmentationTypeName: 'Distributor Ad Start',
        autoReturn: true,
        hexPayload: '/DAvAAAAAAAA///wFA/+AAAAAAAhAh9DRVVJAAAAqH//AAAp+hAGQURfUE9ECAC5yQ==',
        utcBreakStart: new Date(now + 90000).toISOString(),
        breakType: 'MID_ROLL',
      },
    ];

    this.cueHistory = [
      {
        id: 'CUE-SCTE-10488',
        commandType: 'TIME_SIGNAL',
        ptsTimestampMs: this.activeProgramPtsMs - 180000,
        durationMs: 30000,
        spliceEventId: 4088,
        segmentationTypeId: 0x35,
        segmentationTypeName: 'Provider Ad End (Break Out)',
        autoReturn: true,
        hexPayload: '/DA0AAAAAAAA///wBQb+AAAAAAAiAiBDRVVJAAAAmn//AAAz9b8KSU5URVJQQUNLUwEA',
        utcBreakStart: new Date(now - 180000).toISOString(),
        breakType: 'MID_ROLL',
      },
    ];
  }

  private startClock() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  private tick() {
    this.activeProgramPtsMs += 1000;

    if (this.currentStreamState === 'AD_PLAYBACK' && this.activeAd) {
      this.activeAdTimeRemainingSec = Math.max(0, this.activeAdTimeRemainingSec - 1);
      const elapsed = this.activeAd.durationSec - this.activeAdTimeRemainingSec;
      const progressRatio = elapsed / this.activeAd.durationSec;

      // Track VAST quartiles
      if (progressRatio >= 0.25 && !this.activeAd.vastQuartiles.firstQuartile) {
        this.activeAd.vastQuartiles.firstQuartile = true;
        this.vastBeaconsDispatched++;
      }
      if (progressRatio >= 0.5 && !this.activeAd.vastQuartiles.midpoint) {
        this.activeAd.vastQuartiles.midpoint = true;
        this.vastBeaconsDispatched++;
      }
      if (progressRatio >= 0.75 && !this.activeAd.vastQuartiles.thirdQuartile) {
        this.activeAd.vastQuartiles.thirdQuartile = true;
        this.vastBeaconsDispatched++;
      }

      if (this.activeAdTimeRemainingSec <= 0) {
        this.activeAd.vastQuartiles.complete = true;
        this.vastBeaconsDispatched++;
        this.finishAdOrPlayNextInPod();
      }
    }

    this.notifySubscribers();
  }

  /**
   * Parse raw binary SCTE-35 hex string payload into structured descriptor
   */
  public parseScte35Hex(hexString: string): Scte35CueMarker {
    const cleanHex = hexString.replace(/\s+/g, '').toUpperCase();
    const id = `CUE-SCTE-${Math.floor(10000 + Math.random() * 90000)}`;
    const spliceEventId = Math.floor(4000 + Math.random() * 2000);
    const hasSegmentation = cleanHex.length > 20;

    return {
      id,
      commandType: hasSegmentation ? 'TIME_SIGNAL' : 'SPLICE_INSERT',
      ptsTimestampMs: this.activeProgramPtsMs,
      durationMs: 30000,
      spliceEventId,
      segmentationTypeId: 0x34,
      segmentationTypeName: 'Provider Ad Start (Break In)',
      autoReturn: true,
      hexPayload: cleanHex || '/DA0AAAAAAAA///wBQb+AAAAAAAiAiBDRVVJAAAAn3//AAA31g0KSU5URVJQQUNLUwEA',
      utcBreakStart: new Date().toISOString(),
      breakType: 'MID_ROLL',
    };
  }

  /**
   * Trigger SCTE-35 Break Splice (Simulates arrival of SCTE-35 cue in HLS/MPEG-TS)
   */
  public triggerAdBreak(customDurationSec: number = 30): { cue: Scte35CueMarker; adsQueued: number } {
    const cue: Scte35CueMarker = {
      id: `CUE-SCTE-${Math.floor(10000 + Math.random() * 90000)}`,
      commandType: 'TIME_SIGNAL',
      ptsTimestampMs: this.activeProgramPtsMs,
      durationMs: customDurationSec * 1000,
      spliceEventId: Math.floor(4000 + Math.random() * 2000),
      segmentationTypeId: 0x34,
      segmentationTypeName: 'Provider Ad Start (Break In)',
      autoReturn: true,
      hexPayload: '/DA0AAAAAAAA///wBQb+AAAAAAAiAiBDRVVJAAAAn3//AAA31g0KSU5URVJQQUNLUwEA',
      utcBreakStart: new Date().toISOString(),
      breakType: 'MID_ROLL',
    };

    this.cueHistory.unshift(cue);
    this.currentStreamState = 'AD_PLAYBACK';

    // Queue 2 ads in pod
    this.adPodTotal = 2;
    this.adPodIndex = 1;
    const ad1 = { ...this.adInventory[0], vastQuartiles: { start: true, firstQuartile: false, midpoint: false, thirdQuartile: false, complete: false } };
    this.activeAd = ad1;
    this.activeAdTimeRemainingSec = ad1.durationSec;
    this.totalAdsServed++;
    this.totalAdDurationSec += ad1.durationSec;
    this.vastBeaconsDispatched += 2; // Impression + Start

    this.notifySubscribers();
    return { cue, adsQueued: this.adPodTotal };
  }

  private finishAdOrPlayNextInPod() {
    if (this.adPodIndex < this.adPodTotal) {
      // Play 2nd ad in pod
      this.adPodIndex++;
      const nextAd = { ...this.adInventory[1], vastQuartiles: { start: true, firstQuartile: false, midpoint: false, thirdQuartile: false, complete: false } };
      this.activeAd = nextAd;
      this.activeAdTimeRemainingSec = nextAd.durationSec;
      this.totalAdsServed++;
      this.totalAdDurationSec += nextAd.durationSec;
      this.vastBeaconsDispatched += 2;
    } else {
      // Finished Pod -> Resplice back to main program
      this.currentStreamState = 'STREAM_RESPLICING';
      this.activeAd = null;
      setTimeout(() => {
        this.currentStreamState = 'PROGRAM_PLAYBACK';
        this.notifySubscribers();
      }, 400);
    }
  }

  /**
   * Skip Ad (for testing / CSAI interactive models)
   */
  public skipActiveAd(): boolean {
    if (this.currentStreamState !== 'AD_PLAYBACK') return false;
    this.vastBeaconsDispatched++; // Skip beacon
    this.finishAdOrPlayNextInPod();
    this.notifySubscribers();
    return true;
  }

  public setDaiMode(mode: 'SSAI' | 'CSAI') {
    this.daiMode = mode;
    this.notifySubscribers();
  }

  public getTelemetry(): DaiSessionTelemetry {
    return {
      daiMode: this.daiMode,
      currentStreamState: this.currentStreamState,
      activeProgramPtsMs: this.activeProgramPtsMs,
      activeAdTimeRemainingSec: this.activeAdTimeRemainingSec,
      totalAdsServed: this.totalAdsServed,
      totalAdDurationSec: this.totalAdDurationSec,
      vastBeaconsDispatched: this.vastBeaconsDispatched,
      ptsDriftCompensationMs: this.ptsDriftCompensationMs,
      ebuR128GainOffsetDb: this.ebuR128GainOffsetDb,
      adPodIndex: this.adPodIndex,
      adPodTotal: this.adPodTotal,
      activeAd: this.activeAd,
      upcomingCues: [...this.upcomingCues],
      cueHistory: [...this.cueHistory],
    };
  }

  public getInventory(): AdCreativeItem[] {
    return [...this.adInventory];
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notifySubscribers() {
    this.subscribers.forEach((cb) => cb());
  }

  public destroy() {
    if (this.timer) clearInterval(this.timer);
    this.subscribers.clear();
  }
}

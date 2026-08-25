/**
 * Native MPV IPC Bridge & Protocol Definition
 * Implements JSON-RPC over IPC socket / named pipes for libmpv / mpv.exe
 */

export type HwdecMode = 'auto-safe' | 'd3d11va' | 'nvdec' | 'vaapi' | 'videotoolbox' | 'disabled';
export type DeinterlaceMode = 'off' | 'yadif' | 'bwdif' | 'auto';
export type AspectRatioOverride = 'auto' | '16:9' | '4:3' | '21:9' | 'fill' | 'zoom';

export interface MpvTrack {
  id: number;
  type: 'video' | 'audio' | 'sub';
  title?: string;
  lang?: string;
  codec?: string;
  selected: boolean;
  external?: boolean;
  channels?: number;
  samplerate?: number;
}

export interface MpvVideoParams {
  pixelFormat: string;
  hwPixelFormat?: string;
  width: number;
  height: number;
  fps: number;
  aspectRatio: number;
  codec: string;
  hwdecActive: boolean;
  deinterlaceActive: boolean;
}

export interface MpvPlaybackStats {
  timePos: number;
  duration: number;
  cacheTime: number; // seconds buffered ahead
  cacheSizeKb: number;
  droppedFrames: number;
  estimatedVfFps: number;
  bitrateKbps: number;
  hwdec: string;
  deinterlace: DeinterlaceMode;
  audioDelayMs: number;
  subDelayMs: number;
  volume: number;
  mute: boolean;
  paused: boolean;
  stalled: boolean;
}

export interface MpvIpcMessage {
  requestId?: number;
  command?: string[];
  event?: string;
  name?: string;
  data?: any;
  error?: string;
  timestamp: number;
}

export class MpvIpcProtocol {
  private static requestIdCounter = 1;

  public static buildCommand(command: string, args: (string | number | boolean)[] = []): { json: string; reqId: number } {
    const reqId = this.requestIdCounter++;
    const payload = {
      command: [command, ...args],
      request_id: reqId,
    };
    return {
      json: JSON.stringify(payload) + '\n',
      reqId,
    };
  }

  public static buildSetProperty(property: string, value: string | number | boolean): { json: string; reqId: number } {
    return this.buildCommand('set_property', [property, value]);
  }

  public static buildGetProperty(property: string): { json: string; reqId: number } {
    return this.buildCommand('get_property', [property]);
  }

  public static buildObserveProperty(property: string, observeId: number): { json: string; reqId: number } {
    const reqId = this.requestIdCounter++;
    const payload = {
      command: ['observe_property', observeId, property],
      request_id: reqId,
    };
    return {
      json: JSON.stringify(payload) + '\n',
      reqId,
    };
  }

  public static parseIncoming(raw: string): MpvIpcMessage[] {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    const messages: MpvIpcMessage[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        messages.push({
          requestId: parsed.request_id,
          event: parsed.event,
          name: parsed.name,
          data: parsed.data,
          error: parsed.error,
          timestamp: Date.now(),
        });
      } catch {
        // partial or malformed chunk
      }
    }
    return messages;
  }
}

export class SimulatedMpvBridge {
  private stats: MpvPlaybackStats = {
    timePos: 0,
    duration: 0,
    cacheTime: 3.8,
    cacheSizeKb: 14200,
    droppedFrames: 0,
    estimatedVfFps: 60,
    bitrateKbps: 6400,
    hwdec: 'd3d11va',
    deinterlace: 'bwdif',
    audioDelayMs: 0,
    subDelayMs: 0,
    volume: 100,
    mute: false,
    paused: false,
    stalled: false,
  };

  private videoParams: MpvVideoParams = {
    pixelFormat: 'yuv420p',
    hwPixelFormat: 'd3d11',
    width: 1920,
    height: 1080,
    fps: 59.94,
    aspectRatio: 1.777,
    codec: 'h264 (High) / avc1',
    hwdecActive: true,
    deinterlaceActive: true,
  };

  private tracks: MpvTrack[] = [
    { id: 1, type: 'video', codec: 'h264', selected: true },
    { id: 2, type: 'audio', title: 'English (Stereo)', lang: 'eng', codec: 'aac', channels: 2, samplerate: 48000, selected: true },
    { id: 3, type: 'audio', title: 'Spanish (Descriptive)', lang: 'spa', codec: 'ac3', channels: 6, samplerate: 48000, selected: false },
    { id: 4, type: 'sub', title: 'English (CC / CEA-708)', lang: 'eng', selected: false },
    { id: 5, type: 'sub', title: 'Spanish Subtitles', lang: 'spa', selected: false },
  ];

  private ipcLog: MpvIpcMessage[] = [];

  public getStats(): MpvPlaybackStats {
    return { ...this.stats };
  }

  public getVideoParams(): MpvVideoParams {
    return { ...this.videoParams };
  }

  public getTracks(): MpvTrack[] {
    return [...this.tracks];
  }

  public getIpcLog(): MpvIpcMessage[] {
    return [...this.ipcLog];
  }

  public sendCommand(cmd: string, args: (string | number | boolean)[] = []): { success: boolean; message: string } {
    const { json, reqId } = MpvIpcProtocol.buildCommand(cmd, args);
    this.ipcLog.unshift({
      requestId: reqId,
      command: [cmd, ...args.map(String)],
      timestamp: Date.now(),
    });

    if (this.ipcLog.length > 100) this.ipcLog.pop();

    // Process simulated properties
    if (cmd === 'set_property') {
      const prop = args[0] as string;
      const val = args[1];

      if (prop === 'hwdec') {
        this.stats.hwdec = String(val);
        this.videoParams.hwdecActive = val !== 'disabled';
      } else if (prop === 'deinterlace') {
        this.stats.deinterlace = (val === 'yes' || val === true ? 'bwdif' : (val as DeinterlaceMode)) || 'off';
        this.videoParams.deinterlaceActive = this.stats.deinterlace !== 'off';
      } else if (prop === 'audio-delay') {
        this.stats.audioDelayMs = Number(val) * 1000;
      } else if (prop === 'sub-delay') {
        this.stats.subDelayMs = Number(val) * 1000;
      } else if (prop === 'volume') {
        this.stats.volume = Math.max(0, Math.min(150, Number(val)));
      } else if (prop === 'mute') {
        this.stats.mute = Boolean(val);
      } else if (prop === 'pause') {
        this.stats.paused = Boolean(val);
      } else if (prop === 'aid') {
        const id = Number(val);
        this.tracks = this.tracks.map((t) =>
          t.type === 'audio' ? { ...t, selected: t.id === id } : t
        );
      } else if (prop === 'sid') {
        const id = Number(val);
        this.tracks = this.tracks.map((t) =>
          t.type === 'sub' ? { ...t, selected: t.id === id } : t
        );
      }
    } else if (cmd === 'loadfile') {
      this.stats.paused = false;
      this.stats.stalled = false;
      this.stats.timePos = 0;
      this.stats.cacheTime = 4.2;
    } else if (cmd === 'stop') {
      this.stats.paused = true;
      this.stats.timePos = 0;
      this.stats.cacheTime = 0;
    }

    return { success: true, message: `Dispatched MPV IPC command: ${cmd}` };
  }

  public simulateStall(stalled: boolean) {
    this.stats.stalled = stalled;
    if (stalled) {
      this.stats.cacheTime = 0.1;
      this.stats.droppedFrames += 42;
    } else {
      this.stats.cacheTime = 4.0;
    }
  }
}

export const globalMpvBridge = new SimulatedMpvBridge();

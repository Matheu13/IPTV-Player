/**
 * Player Engine & Video Pipeline Controller
 * Coordinates HLS.js, native MPV bridge, deinterlacing shaders, and stall recovery.
 */

import { HwdecMode, DeinterlaceMode, AspectRatioOverride, globalMpvBridge } from './mpvBridge';
import { globalConnectionManager } from './connectionManager';
import { handlePlaybackDowngrade, ResolvedStreamPlan } from './streamUrlPolicy';

export interface VideoFilterSettings {
  deinterlace: DeinterlaceMode;
  aspectRatio: AspectRatioOverride;
  brightness: number; // 0 to 200 (100 is default)
  contrast: number; // 0 to 200 (100 is default)
  saturation: number; // 0 to 200 (100 is default)
  sharpen: boolean;
}

export interface PlayerEngineState {
  isPlaying: boolean;
  isBuffering: boolean;
  isStalled: boolean;
  currentChannel: any | null;
  currentFormat: 'm3u8' | 'ts' | 'rtmp';
  streamUrl: string;
  volume: number;
  muted: boolean;
  isAutoplayMuted: boolean;
  hwdec: HwdecMode;
  filters: VideoFilterSettings;
  audioTrackId: number;
  subTrackId: number;
  audioDelayMs: number;
  subDelayMs: number;
  bufferHealthSec: number;
  stallCount: number;
  activeRenderer: 'HLS_JS' | 'NATIVE_MPV';
}

export class PlayerEngine {
  private state: PlayerEngineState = {
    isPlaying: false,
    isBuffering: false,
    isStalled: false,
    currentChannel: null,
    currentFormat: 'm3u8',
    streamUrl: '',
    volume: 100,
    muted: false,
    isAutoplayMuted: false,
    hwdec: 'd3d11va',
    filters: {
      deinterlace: 'bwdif',
      aspectRatio: 'auto',
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sharpen: false,
    },
    audioTrackId: 2,
    subTrackId: 0,
    audioDelayMs: 0,
    subDelayMs: 0,
    bufferHealthSec: 4.5,
    stallCount: 0,
    activeRenderer: 'HLS_JS',
  };

  private attachedMediaElement: HTMLMediaElement | null = null;
  private stallTimer: any = null;
  private listeners: ((state: PlayerEngineState) => void)[] = [];

  constructor() {
    // Initial sync
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        if (this.state.isAutoplayMuted || (this.attachedMediaElement && this.attachedMediaElement.muted && !this.state.muted)) {
          this.ensureAudioUnmuted();
        }
      };
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });
    }
  }

  /**
   * Links an HTML5 media element (e.g. video / audio) to the playback engine.
   * Synchronizes volume, unmuted status, and media source buffers.
   */
  public attachMediaElement(element: HTMLMediaElement | null) {
    this.attachedMediaElement = element;
    if (element) {
      // Sync current volume and muted state to element
      element.volume = Math.max(0, Math.min(1, this.state.volume / 100));
      element.muted = this.state.muted;

      // Handle pause/play events to stay in sync
      element.onplay = () => {
        if (!this.state.isPlaying) {
          this.state.isPlaying = true;
          this.notify();
        }
      };

      element.onvolumechange = () => {
        if (!this.state.isAutoplayMuted) {
          const newVol = Math.round(element.volume * 100);
          if (this.state.volume !== newVol || this.state.muted !== element.muted) {
            this.state.volume = newVol;
            this.state.muted = element.muted;
            this.notify();
          }
        }
      };
    }
  }

  public getMediaElement(): HTMLMediaElement | null {
    return this.attachedMediaElement;
  }

  /**
   * Ensures the audio element or media buffer is initialized and unmuted.
   * Handles browser Autoplay Policies gracefully by falling back to muted playback
   * and notifying listeners if unmuted autoplay is temporarily blocked.
   */
  public async ensureAudioUnmuted(targetElement?: HTMLMediaElement): Promise<boolean> {
    const el = targetElement || this.attachedMediaElement;
    if (!el) return false;

    try {
      el.muted = false;
      el.volume = Math.max(0.1, this.state.volume / 100);
      this.state.muted = false;
      this.state.isAutoplayMuted = false;
      globalMpvBridge.sendCommand('set_property', ['mute', false]);
      globalMpvBridge.sendCommand('set_property', ['volume', this.state.volume]);
      this.notify();
      return true;
    } catch (err) {
      console.warn('[PlayerEngine] Audio unmute restricted by browser policy:', err);
      el.muted = true;
      this.state.isAutoplayMuted = true;
      this.notify();
      return false;
    }
  }

  /**
   * Maintains continuous audio/video playback synchronization during
   * transitions between embedded layout and full-screen modes.
   */
  public syncFullscreenTransition(isFullscreen: boolean) {
    const el = this.attachedMediaElement;
    if (el) {
      // Ensure volume and unmuted state remain consistent during DOM resizing
      el.volume = Math.max(0, Math.min(1, this.state.volume / 100));
      el.muted = this.state.muted || this.state.isAutoplayMuted;
      if (this.state.isPlaying && el.paused) {
        el.play().catch((e) => console.warn('[PlayerEngine] Fullscreen resume warning:', e));
      }
    }
  }

  public subscribe(fn: (state: PlayerEngineState) => void): () => void {
    this.listeners.push(fn);
    fn(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify() {
    const s = this.getState();
    this.listeners.forEach((l) => l(s));
  }

  public getState(): PlayerEngineState {
    return {
      ...this.state,
      filters: { ...this.state.filters },
    };
  }

  public async loadChannel(channel: {
    id: number | string;
    name: string;
    streamUrl: string;
    format: 'm3u8' | 'ts' | 'rtmp';
    streamPlan?: ResolvedStreamPlan;
  }): Promise<{ success: boolean; streamUrl: string; generationToken: number }> {
    this.state.isBuffering = true;
    this.state.isStalled = false;
    this.state.currentChannel = channel;
    this.state.currentFormat = channel.format;
    this.state.streamUrl = channel.streamUrl;
    this.notify();

    // Route through Milestone 1 Single Connection Manager
    const connectionResult = await globalConnectionManager.requestChannel({
      id: channel.id,
      name: channel.name,
      streamUrl: channel.streamUrl,
      format: channel.format,
    });

    if (connectionResult.success) {
      this.state.isPlaying = true;
      this.state.isBuffering = false;
      globalMpvBridge.sendCommand('loadfile', [channel.streamUrl]);
      this.notify();
    }

    return {
      success: connectionResult.success,
      streamUrl: channel.streamUrl,
      generationToken: connectionResult.generationToken,
    };
  }

  public stop(reason: string = 'User stopped playback') {
    this.state.isPlaying = false;
    this.state.isBuffering = false;
    this.state.isStalled = false;
    this.state.currentChannel = null;
    this.state.streamUrl = '';
    globalConnectionManager.teardownActiveStream(reason);
    globalMpvBridge.sendCommand('stop');
    this.notify();
  }

  public setVolume(vol: number) {
    this.state.volume = Math.max(0, Math.min(100, vol));
    if (this.state.volume > 0) this.state.muted = false;
    globalMpvBridge.sendCommand('set_property', ['volume', this.state.volume]);
    this.notify();
  }

  public setMuted(muted: boolean) {
    this.state.muted = muted;
    globalMpvBridge.sendCommand('set_property', ['mute', this.state.muted]);
    this.notify();
  }

  public toggleMute() {
    this.state.muted = !this.state.muted;
    globalMpvBridge.sendCommand('set_property', ['mute', this.state.muted]);
    this.notify();
  }

  public setHwdec(mode: HwdecMode) {
    this.state.hwdec = mode;
    globalMpvBridge.sendCommand('set_property', ['hwdec', mode]);
    this.notify();
  }

  public setDeinterlace(mode: DeinterlaceMode) {
    this.state.filters.deinterlace = mode;
    globalMpvBridge.sendCommand('set_property', ['deinterlace', mode === 'off' ? 'no' : 'yes']);
    this.notify();
  }

  public setAspectRatio(ratio: AspectRatioOverride) {
    this.state.filters.aspectRatio = ratio;
    this.notify();
  }

  public setFilterAdjustment(param: 'brightness' | 'contrast' | 'saturation', val: number) {
    this.state.filters[param] = Math.max(0, Math.min(200, val));
    this.notify();
  }

  public toggleSharpen() {
    this.state.filters.sharpen = !this.state.filters.sharpen;
    this.notify();
  }

  public setAudioTrack(trackId: number) {
    this.state.audioTrackId = trackId;
    globalMpvBridge.sendCommand('set_property', ['aid', trackId]);
    this.notify();
  }

  public setSubtitleTrack(subId: number) {
    this.state.subTrackId = subId;
    globalMpvBridge.sendCommand('set_property', ['sid', subId]);
    this.notify();
  }

  public setAudioDelay(ms: number) {
    this.state.audioDelayMs = ms;
    globalMpvBridge.sendCommand('set_property', ['audio-delay', ms / 1000]);
    this.notify();
  }

  public setRenderer(renderer: 'HLS_JS' | 'NATIVE_MPV') {
    this.state.activeRenderer = renderer;
    this.notify();
  }

  public triggerSimulatedStall(durationMs: number = 4000) {
    this.state.isStalled = true;
    this.state.isBuffering = true;
    this.state.stallCount++;
    this.state.bufferHealthSec = 0.2;
    globalMpvBridge.simulateStall(true);
    this.notify();

    // 3-Stage Auto Recovery Pipeline:
    // If stall persists past 3.5s, trigger downgrade
    setTimeout(() => {
      if (this.state.isStalled) {
        this.performStallAutoRecovery();
      }
    }, Math.min(3500, durationMs));
  }

  private performStallAutoRecovery() {
    if (this.state.currentFormat === 'm3u8') {
      // Step down to TS
      this.state.currentFormat = 'ts';
      this.state.isStalled = false;
      this.state.isBuffering = false;
      this.state.bufferHealthSec = 4.0;
      globalMpvBridge.simulateStall(false);
      this.notify();
    } else {
      // Re-sync live edge
      this.state.isStalled = false;
      this.state.isBuffering = false;
      this.state.bufferHealthSec = 3.5;
      globalMpvBridge.simulateStall(false);
      this.notify();
    }
  }
}

export const globalPlayerEngine = new PlayerEngine();

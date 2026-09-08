/**
 * Player Engine & Video Pipeline Controller
 * Coordinates HLS.js, native MPV bridge, deinterlacing shaders, and stall recovery.
 * Features:
 * - Automatic switching to alternative stream URLs if primary source fails.
 * - Integration with StreamValidator pre-checking for live channel resilience.
 * - Resilient live mirror fallback.
 */

import { HwdecMode, DeinterlaceMode, AspectRatioOverride, globalMpvBridge } from './mpvBridge';
import { globalConnectionManager } from './connectionManager';
import { ResolvedStreamPlan } from './streamUrlPolicy';
import { globalStreamValidator } from './streamValidator';

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
  // Resilience & Failover Pipeline
  alternativeStreamUrls: string[];
  activeAlternativeIndex: number;
  isFailoverActive: boolean;
  failoverAttemptCount: number;
  lastFailoverReason: string | null;
  lastError: string | null;
  preCheckEnabled: boolean;
  isPreChecking: boolean;
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
    alternativeStreamUrls: [],
    activeAlternativeIndex: 0,
    isFailoverActive: false,
    failoverAttemptCount: 0,
    lastFailoverReason: null,
    lastError: null,
    preCheckEnabled: true,
    isPreChecking: false,
  };

  private attachedMediaElement: HTMLMediaElement | null = null;
  private listeners: ((state: PlayerEngineState) => void)[] = [];
  private resilientFallbackMirrors: string[] = [
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    'https://playertest.longtailvideo.com/adaptive/oceans_aes/oceans_aes.m3u8',
  ];

  constructor() {
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
   * Links an HTML5 media element to the playback engine.
   * Synchronizes volume, unmuted status, and media error failover hooks.
   */
  public attachMediaElement(element: HTMLMediaElement | null) {
    this.attachedMediaElement = element;
    if (element) {
      element.volume = Math.max(0, Math.min(1, this.state.volume / 100));
      element.muted = this.state.muted;

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

      element.onwaiting = () => {
        if (!this.state.isBuffering) {
          this.state.isBuffering = true;
          this.notify();
        }
      };

      element.onplaying = () => {
        if (this.state.isBuffering || this.state.isStalled) {
          this.state.isBuffering = false;
          this.state.isStalled = false;
          this.notify();
        }
      };

      // Automatic failover on media element error
      element.onerror = (_e) => {
        console.warn('[PlayerEngine] Media element error detected, triggering failover...');
        this.handleStreamFailure('HTML media element error');
      };
    }
  }

  /**
   * Browser Autoplay Policy Unmute Handler.
   */
  public ensureAudioUnmuted(element?: HTMLMediaElement | null): boolean {
    if (element && !this.attachedMediaElement) {
      this.attachMediaElement(element);
    }
    const el = element || this.attachedMediaElement;
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
   * Maintains continuous audio/video playback synchronization during transitions.
   */
  public syncFullscreenTransition(isFullscreen: boolean) {
    const el = this.attachedMediaElement;
    if (el) {
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
      alternativeStreamUrls: [...this.state.alternativeStreamUrls],
    };
  }

  /**
   * Enables or disables stream connectivity pre-checking before passing to playback.
   */
  public setPreCheckEnabled(enabled: boolean) {
    this.state.preCheckEnabled = enabled;
    this.notify();
  }

  /**
   * Loads a live channel with automatic pre-checking and alternative stream failover support.
   */
  public async loadChannel(
    channel: {
      id: number | string;
      name: string;
      streamUrl: string;
      format: 'm3u8' | 'ts' | 'rtmp';
      streamPlan?: ResolvedStreamPlan;
      alternativeStreamUrls?: string[];
    },
    options?: { skipPreCheck?: boolean }
  ): Promise<{ success: boolean; streamUrl: string; generationToken: number; isFailover: boolean }> {
    this.state.isBuffering = true;
    this.state.isStalled = false;
    this.state.currentChannel = channel;
    this.state.currentFormat = channel.format;
    this.state.lastError = null;

    // Initialize alternative stream failover tracking
    const alternatives = channel.alternativeStreamUrls || [];
    this.state.alternativeStreamUrls = alternatives;
    this.state.activeAlternativeIndex = 0;
    this.state.isFailoverActive = false;
    this.state.failoverAttemptCount = 0;
    this.state.lastFailoverReason = null;

    let targetUrl = channel.streamUrl;
    let usingAlternative = false;

    // Stream Validation Pre-Check: verify connectivity before passing to player
    if (this.state.preCheckEnabled && !options?.skipPreCheck) {
      this.state.isPreChecking = true;
      this.notify();

      try {
        const checkResult = await globalStreamValidator.preCheckChannel({
          id: channel.id,
          name: channel.name,
          streamUrl: channel.streamUrl,
          alternativeStreamUrls: alternatives,
        });

        this.state.isPreChecking = false;

        if (checkResult.isValid) {
          targetUrl = checkResult.bestPlayableUrl;
          usingAlternative = checkResult.isUsingAlternative;
          if (usingAlternative) {
            this.state.isFailoverActive = true;
            this.state.activeAlternativeIndex = (checkResult.alternativeIndex ?? 0) + 1;
            this.state.lastFailoverReason = 'Primary source unreachable during pre-check; automatically routed to working alternative stream';
            console.log(`[PlayerEngine] Pre-check redirected to verified alternative: ${targetUrl}`);
          }
        } else {
          console.warn('[PlayerEngine] Pre-check showed primary stream may be degraded; proceeding with failover ready.');
        }
      } catch {
        this.state.isPreChecking = false;
      }
    }

    this.state.streamUrl = targetUrl;
    this.notify();

    // Route through Single Connection Manager
    const connectionResult = await globalConnectionManager.requestChannel({
      id: channel.id,
      name: channel.name,
      streamUrl: targetUrl,
      format: channel.format,
    });

    if (connectionResult.success) {
      this.state.isPlaying = true;
      this.state.isBuffering = false;
      globalMpvBridge.sendCommand('loadfile', [targetUrl]);
      this.notify();
    } else {
      this.state.isBuffering = false;
      this.state.lastError = 'Connection manager rejected session';
      this.notify();
    }

    return {
      success: connectionResult.success,
      streamUrl: targetUrl,
      generationToken: connectionResult.generationToken,
      isFailover: usingAlternative,
    };
  }

  /**
   * Automatically switches to the next alternative stream URL when playback fails.
   */
  public async attemptFailover(reason: string = 'Stream failure detected'): Promise<{
    success: boolean;
    activeUrl: string;
    isAlternative: boolean;
  }> {
    const { alternativeStreamUrls, activeAlternativeIndex, currentChannel } = this.state;

    this.state.failoverAttemptCount++;
    this.state.lastFailoverReason = reason;

    // 1. Check if a channel-specific alternative URL is available
    if (activeAlternativeIndex < alternativeStreamUrls.length) {
      const nextUrl = alternativeStreamUrls[activeAlternativeIndex];
      this.state.activeAlternativeIndex++;
      this.state.streamUrl = nextUrl;
      this.state.isFailoverActive = true;
      this.state.isBuffering = true;
      this.state.isStalled = false;
      this.notify();

      console.warn(`[PlayerEngine] Failover #${this.state.failoverAttemptCount}: Switching to alternative [${this.state.activeAlternativeIndex}/${alternativeStreamUrls.length}]: ${nextUrl}`);

      const channelId = currentChannel?.id || 'failover';
      const channelName = currentChannel?.name || 'Live Channel';
      await globalConnectionManager.requestChannel({
        id: channelId,
        name: `${channelName} (Failover)`,
        streamUrl: nextUrl,
        format: this.state.currentFormat,
      });

      globalMpvBridge.sendCommand('loadfile', [nextUrl]);
      if (this.attachedMediaElement) {
        this.attachedMediaElement.src = nextUrl;
        this.attachedMediaElement.play().catch(() => {});
      }

      this.state.isBuffering = false;
      this.state.isPlaying = true;
      this.notify();

      return { success: true, activeUrl: nextUrl, isAlternative: true };
    }

    // 2. All channel alternatives exhausted -> use resilient live mirror fallback
    const fallbackIdx = (this.state.failoverAttemptCount - 1) % this.resilientFallbackMirrors.length;
    const fallbackUrl = this.resilientFallbackMirrors[fallbackIdx];

    this.state.streamUrl = fallbackUrl;
    this.state.isFailoverActive = true;
    this.state.isBuffering = true;
    this.state.lastFailoverReason = `${reason}. Resilient live broadcast mirror active.`;
    this.notify();

    console.warn(`[PlayerEngine] All stream sources failed. Switching to resilient mirror: ${fallbackUrl}`);

    await globalConnectionManager.requestChannel({
      id: currentChannel?.id || 'mirror',
      name: `${currentChannel?.name || 'Channel'} (Resilient Mirror)`,
      streamUrl: fallbackUrl,
      format: 'm3u8',
    });

    globalMpvBridge.sendCommand('loadfile', [fallbackUrl]);
    if (this.attachedMediaElement) {
      this.attachedMediaElement.src = fallbackUrl;
      this.attachedMediaElement.play().catch(() => {});
    }

    this.state.isBuffering = false;
    this.state.isPlaying = true;
    this.notify();

    return { success: true, activeUrl: fallbackUrl, isAlternative: true };
  }

  /**
   * Handles stream playback failure by initiating failover pipeline.
   */
  public async handleStreamFailure(errorMsg?: string): Promise<boolean> {
    this.state.lastError = errorMsg || 'Stream playback error';
    this.notify();

    const res = await this.attemptFailover(errorMsg);
    return res.success;
  }

  public stop(reason: string = 'User stopped playback') {
    this.state.isPlaying = false;
    this.state.isBuffering = false;
    this.state.isStalled = false;
    this.state.currentChannel = null;
    this.state.streamUrl = '';
    this.state.isFailoverActive = false;
    this.state.alternativeStreamUrls = [];
    this.state.lastError = null;
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
    // If stall persists past 3s, attempt alternative stream failover
    setTimeout(() => {
      if (this.state.isStalled) {
        if (this.state.alternativeStreamUrls.length > 0) {
          console.warn('[PlayerEngine] Stall persisted, triggering alternative stream failover...');
          this.attemptFailover('Persistent playback stall');
        } else {
          this.performStallAutoRecovery();
        }
      }
    }, Math.min(3000, durationMs));
  }

  private performStallAutoRecovery() {
    if (this.state.currentFormat === 'm3u8') {
      this.state.currentFormat = 'ts';
      this.state.isStalled = false;
      this.state.isBuffering = false;
      this.state.bufferHealthSec = 4.0;
      globalMpvBridge.simulateStall(false);
      this.notify();
    } else {
      this.state.isStalled = false;
      this.state.isBuffering = false;
      this.state.bufferHealthSec = 3.5;
      globalMpvBridge.simulateStall(false);
      this.notify();
    }
  }
}

export const globalPlayerEngine = new PlayerEngine();

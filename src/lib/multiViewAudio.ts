/**
 * Web Audio API Multi-Channel Synthesis & Mixing Engine for Multi-View
 *
 * Supports independent per-slot gain controls, individual mute toggles for each quadrant,
 * exclusive audio focus cross-fading, and stadium commentary/crowd ambience simulation.
 */

export interface ChannelAudioProfile {
  name: string;
  baseFreq: number;
  modulationFreq: number;
  crowdIntensity: number; // 0.0 to 1.0
  type: 'football' | 'tennis' | 'racing' | 'basketball';
}

const CHANNEL_PROFILES: Record<string, ChannelAudioProfile> = {
  slot_0: {
    name: 'Sky Sports Premier League',
    baseFreq: 220,
    modulationFreq: 4.5,
    crowdIntensity: 0.85,
    type: 'football',
  },
  slot_1: {
    name: 'TNT Sports 1 HD',
    baseFreq: 293.66,
    modulationFreq: 5.2,
    crowdIntensity: 0.7,
    type: 'football',
  },
  slot_2: {
    name: 'US: ESPN HD',
    baseFreq: 329.63,
    modulationFreq: 6.0,
    crowdIntensity: 0.8,
    type: 'basketball',
  },
  slot_3: {
    name: 'beIN Sports 1 France',
    baseFreq: 261.63,
    modulationFreq: 3.8,
    crowdIntensity: 0.6,
    type: 'tennis',
  },
};

interface SlotAudioChannel {
  slotId: string;
  slotGain: GainNode;
  osc1: OscillatorNode | null;
  osc2: OscillatorNode | null;
  oscGain: GainNode | null;
  noiseSource: AudioBufferSourceNode | null;
  noiseGain: GainNode | null;
  volume: number; // 0 to 100
  isMuted: boolean;
}

export class MultiViewAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private isMasterMuted: boolean = false;
  private masterVolume: number = 0.65;
  private currentFocusedSlot: string = 'slot_0';
  private isPlaying: boolean = false;
  private channels: Map<string, SlotAudioChannel> = new Map();

  constructor() {}

  private initContext() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMasterMuted ? 0 : this.masterVolume, this.ctx.currentTime);

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  public async startAudio(initialFocusedSlotId: string = 'slot_0'): Promise<boolean> {
    try {
      this.initContext();
      if (!this.ctx || !this.masterGain) return false;

      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }

      this.currentFocusedSlot = initialFocusedSlotId;

      // Setup all 4 quadrant channels with independent gain nodes
      const slotIds = ['slot_0', 'slot_1', 'slot_2', 'slot_3'];
      for (const slotId of slotIds) {
        if (!this.channels.has(slotId)) {
          this.initSlotChannel(slotId, slotId === initialFocusedSlotId ? false : true);
        }
      }

      this.isPlaying = true;
      return true;
    } catch (err) {
      console.warn('Web Audio start failed:', err);
      return false;
    }
  }

  private initSlotChannel(slotId: string, startMuted: boolean) {
    if (!this.ctx || !this.masterGain) return;

    const profile = CHANNEL_PROFILES[slotId] || {
      name: 'Generic Sports',
      baseFreq: 220,
      modulationFreq: 4.0,
      crowdIntensity: 0.5,
      type: 'football',
    };

    const now = this.ctx.currentTime;
    const slotGain = this.ctx.createGain();
    const volume = 80;
    const isMuted = startMuted;

    const targetGainValue = isMuted ? 0 : volume / 100;
    slotGain.gain.setValueAtTime(targetGainValue, now);
    slotGain.connect(this.masterGain);

    // 1. Oscillators for sports broadcast commentary
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.08, now);

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(profile.baseFreq, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(profile.baseFreq * 1.5, now);

    osc1.connect(oscGain);
    osc2.connect(oscGain);
    oscGain.connect(slotGain);

    osc1.start();
    osc2.start();

    // 2. Crowd roar generator with bandpass filter
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(profile.type === 'racing' ? 450 : 320, now);
    filter.Q.setValueAtTime(1.8, now);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(profile.crowdIntensity * 0.14, now);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(slotGain);

    noiseSource.start();

    this.channels.set(slotId, {
      slotId,
      slotGain,
      osc1,
      osc2,
      oscGain,
      noiseSource,
      noiseGain,
      volume,
      isMuted,
    });
  }

  /**
   * Set individual quadrant volume (0 - 100)
   */
  public setSlotVolume(slotId: string, volume0to100: number) {
    const channel = this.channels.get(slotId);
    if (!channel) {
      if (this.ctx) {
        this.initSlotChannel(slotId, slotId !== this.currentFocusedSlot);
      }
      return;
    }

    channel.volume = Math.max(0, Math.min(100, volume0to100));
    if (this.ctx && !channel.isMuted) {
      const now = this.ctx.currentTime;
      channel.slotGain.gain.cancelScheduledValues(now);
      channel.slotGain.gain.linearRampToValueAtTime(channel.volume / 100, now + 0.03);
    }
  }

  /**
   * Toggle individual quadrant mute
   */
  public toggleSlotMute(slotId: string): boolean {
    const channel = this.channels.get(slotId);
    if (!channel) {
      if (this.ctx) {
        this.initSlotChannel(slotId, false);
      }
      return false;
    }

    channel.isMuted = !channel.isMuted;
    this.applySlotGain(channel);
    return channel.isMuted;
  }

  /**
   * Explicitly set slot mute state
   */
  public setSlotMute(slotId: string, isMuted: boolean) {
    const channel = this.channels.get(slotId);
    if (!channel) return;

    channel.isMuted = isMuted;
    this.applySlotGain(channel);
  }

  private applySlotGain(channel: SlotAudioChannel) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const target = channel.isMuted ? 0 : channel.volume / 100;
    channel.slotGain.gain.cancelScheduledValues(now);
    channel.slotGain.gain.linearRampToValueAtTime(target, now + 0.05);
  }

  /**
   * Focus on one audio source exclusively: un-mutes target quadrant and mutes all others
   */
  public switchAudioFocus(newSlotId: string) {
    this.currentFocusedSlot = newSlotId;
    if (!this.isPlaying || !this.ctx) return;

    this.playFocusBeep();

    this.channels.forEach((channel, id) => {
      if (id === newSlotId) {
        channel.isMuted = false;
      } else {
        channel.isMuted = true;
      }
      this.applySlotGain(channel);
    });
  }

  /**
   * Solo a quadrant: unmute it and mute all others
   */
  public soloSlot(slotId: string) {
    this.switchAudioFocus(slotId);
  }

  /**
   * Unmute all active quadrants for multi-game sound mixing
   */
  public unmuteAll() {
    this.channels.forEach((channel) => {
      channel.isMuted = false;
      this.applySlotGain(channel);
    });
  }

  /**
   * Mute all quadrants
   */
  public muteAll() {
    this.channels.forEach((channel) => {
      channel.isMuted = true;
      this.applySlotGain(channel);
    });
  }

  private playFocusBeep() {
    if (!this.ctx || !this.masterGain || this.isMasterMuted) return;
    try {
      const beepOsc = this.ctx.createOscillator();
      const beepGain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      beepOsc.type = 'sine';
      beepOsc.frequency.setValueAtTime(880, now);
      beepOsc.frequency.exponentialRampToValueAtTime(440, now + 0.08);

      beepGain.gain.setValueAtTime(0.04, now);
      beepGain.gain.linearRampToValueAtTime(0, now + 0.08);

      beepOsc.connect(beepGain);
      beepGain.connect(this.masterGain);

      beepOsc.start(now);
      beepOsc.stop(now + 0.09);
    } catch (e) {}
  }

  public toggleMute(): boolean {
    this.isMasterMuted = !this.isMasterMuted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.isMasterMuted ? 0 : this.masterVolume, now + 0.05);
    }
    return this.isMasterMuted;
  }

  public setVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMasterMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  public getSlotChannel(slotId: string): { volume: number; isMuted: boolean } | null {
    const ch = this.channels.get(slotId);
    if (!ch) return null;
    return { volume: ch.volume, isMuted: ch.isMuted };
  }

  public getAnalyserData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying && !this.isMasterMuted;
  }

  public getIsMuted(): boolean {
    return this.isMasterMuted;
  }

  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public stop() {
    this.channels.forEach((ch) => {
      try {
        ch.osc1?.stop();
        ch.osc1?.disconnect();
        ch.osc2?.stop();
        ch.osc2?.disconnect();
        ch.noiseSource?.stop();
        ch.noiseSource?.disconnect();
      } catch (e) {}
    });
    this.channels.clear();
    this.isPlaying = false;
  }
}

export const globalMultiViewAudio = new MultiViewAudioEngine();

/**
 * Milestone 20: 10-Foot Spatial Leanback Navigation & Remote OSD Engine
 *
 * Implements TV / Set-Top Box Spatial Navigation & Quick OSD Engine:
 * - 2D Grid & Linear Focus Traversal with D-Pad Keycode Routing
 * - Channel Zapping OSD Banner with EPG Now/Next Progress & Codec Badges
 * - Numeric Keypad Direct Buffer (e.g., "1-0-2" auto-tunes after 1.2s debounce)
 * - Quick Audio / Subtitle Track Switching HUD
 * - TV Overscan 10% Safe Area Compensation
 * - Voice Search Intent Parser & Fuzzy EPG Program Matcher
 * - HDMI-CEC Power & Input Sync Emulator
 */

export type DPadKey =
  | 'DPAD_UP'
  | 'DPAD_DOWN'
  | 'DPAD_LEFT'
  | 'DPAD_RIGHT'
  | 'SELECT'
  | 'BACK'
  | 'MENU'
  | 'CH_UP'
  | 'CH_DOWN'
  | 'VOL_UP'
  | 'VOL_DOWN'
  | 'MUTE'
  | 'NUMERIC_DIGIT';

export interface SpatialNode {
  id: string;
  row: number;
  col: number;
  label: string;
  category: string;
  actionPayload?: any;
}

export interface LeanbackChannelEntry {
  id: string;
  number: number;
  name: string;
  category: string;
  nowPlaying: string;
  nextPlaying: string;
  nowProgressPercent: number;
  resolution: '4K HDR' | '1080p 60fps' | '720p 60fps';
  audioCodec: 'Dolby Digital 5.1' | 'E-AC3 Atmos' | 'AAC-LC Stereo';
  logoUrl?: string;
}

export interface LeanbackOsdState {
  isBannerVisible: boolean;
  bannerTimeoutMs: number;
  isAudioSubHudVisible: boolean;
  isVoiceSearchOpen: boolean;
  isSafeMarginEnabled: boolean;
  isHdmiCecActive: boolean;
  numericBuffer: string;
  numericCommitCountdownMs: number;
  currentChannel: LeanbackChannelEntry;
  activeAudioTrack: string;
  activeSubtitleTrack: string;
  voiceSearchQuery: string;
  voiceSearchResults: Array<{ id: string; title: string; subtitle: string; type: 'channel' | 'program' }>;
}

export class LeanbackSpatialEngine {
  private channels: LeanbackChannelEntry[] = [
    {
      id: 'ch_101',
      number: 101,
      name: 'Sky Sports Premier League UHD',
      category: 'Sports',
      nowPlaying: 'Manchester City vs. Arsenal (Live 4K)',
      nextPlaying: 'Super Sunday Post-Match Analysis',
      nowProgressPercent: 68,
      resolution: '4K HDR',
      audioCodec: 'Dolby Digital 5.1',
      logoUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&q=80',
    },
    {
      id: 'ch_102',
      number: 102,
      name: 'TNT Sports 1 Ultimate 60FPS',
      category: 'Sports',
      nowPlaying: 'UEFA Champions League: Real Madrid vs Bayern',
      nextPlaying: 'Champions League Highlights Reel',
      nowProgressPercent: 44,
      resolution: '4K HDR',
      audioCodec: 'E-AC3 Atmos',
      logoUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=120&q=80',
    },
    {
      id: 'ch_201',
      number: 201,
      name: 'BBC News 24 Global FHD',
      category: 'News',
      nowPlaying: 'World News Today with Maryam Moshiri',
      nextPlaying: 'BBC Business Live Global Markets',
      nowProgressPercent: 82,
      resolution: '1080p 60fps',
      audioCodec: 'AAC-LC Stereo',
      logoUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=120&q=80',
    },
    {
      id: 'ch_301',
      number: 301,
      name: 'HBO Premiere Cinema 4K',
      category: 'Cinema',
      nowPlaying: 'Oppenheimer (IMAX 4K HDR Remaster)',
      nextPlaying: 'House of the Dragon Season Finale',
      nowProgressPercent: 55,
      resolution: '4K HDR',
      audioCodec: 'Dolby Digital 5.1',
      logoUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=120&q=80',
    },
    {
      id: 'ch_401',
      number: 401,
      name: 'National Geographic Wild 4K',
      category: 'Documentary',
      nowPlaying: 'Serengeti: The Great Migration 4K',
      nextPlaying: 'Deep Ocean Predators UHD',
      nowProgressPercent: 30,
      resolution: '4K HDR',
      audioCodec: 'Dolby Digital 5.1',
      logoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=120&q=80',
    },
  ];

  private currentChannelIndex: number = 0;
  private currentFocusNodeId: string = 'grid_0_0';
  private osdState: LeanbackOsdState;
  private osdTimer: any = null;
  private numericTimer: any = null;
  private subscribers: Set<() => void> = new Set();

  constructor() {
    this.osdState = {
      isBannerVisible: true,
      bannerTimeoutMs: 5000,
      isAudioSubHudVisible: false,
      isVoiceSearchOpen: false,
      isSafeMarginEnabled: true,
      isHdmiCecActive: true,
      numericBuffer: '',
      numericCommitCountdownMs: 0,
      currentChannel: this.channels[0],
      activeAudioTrack: 'eng (Dolby 5.1)',
      activeSubtitleTrack: 'eng (Closed Captions)',
      voiceSearchQuery: '',
      voiceSearchResults: [],
    };
    this.scheduleOsdBannerDismiss();
  }

  public getOsdState(): LeanbackOsdState {
    return { ...this.osdState };
  }

  public getChannels(): LeanbackChannelEntry[] {
    return [...this.channels];
  }

  public getCurrentFocusNodeId(): string {
    return this.currentFocusNodeId;
  }

  public setFocusNodeId(id: string) {
    this.currentFocusNodeId = id;
    this.notify();
  }

  /**
   * Dispatches D-Pad TV Remote Key Events
   */
  public dispatchKeyEvent(key: DPadKey, payload?: any): { handled: boolean; actionDesc: string } {
    let handled = true;
    let actionDesc = '';

    switch (key) {
      case 'CH_UP': {
        this.currentChannelIndex = (this.currentChannelIndex + 1) % this.channels.length;
        this.osdState.currentChannel = this.channels[this.currentChannelIndex];
        this.triggerOsdBanner();
        actionDesc = `Tuned up to ${this.osdState.currentChannel.number} - ${this.osdState.currentChannel.name}`;
        break;
      }
      case 'CH_DOWN': {
        this.currentChannelIndex = (this.currentChannelIndex - 1 + this.channels.length) % this.channels.length;
        this.osdState.currentChannel = this.channels[this.currentChannelIndex];
        this.triggerOsdBanner();
        actionDesc = `Tuned down to ${this.osdState.currentChannel.number} - ${this.osdState.currentChannel.name}`;
        break;
      }
      case 'MENU': {
        this.osdState.isAudioSubHudVisible = !this.osdState.isAudioSubHudVisible;
        actionDesc = this.osdState.isAudioSubHudVisible ? 'Opened Audio/Subtitle HUD' : 'Closed Audio/Subtitle HUD';
        break;
      }
      case 'BACK': {
        if (this.osdState.isVoiceSearchOpen) {
          this.osdState.isVoiceSearchOpen = false;
          actionDesc = 'Dismissed Voice Search Modal';
        } else if (this.osdState.isAudioSubHudVisible) {
          this.osdState.isAudioSubHudVisible = false;
          actionDesc = 'Closed Audio Track HUD';
        } else if (this.osdState.isBannerVisible) {
          this.osdState.isBannerVisible = false;
          actionDesc = 'Dismissed OSD Info Banner';
        } else {
          actionDesc = 'Back button handled at root';
        }
        break;
      }
      case 'SELECT': {
        if (this.osdState.numericBuffer.length > 0) {
          this.commitNumericBuffer();
          actionDesc = 'Committed numeric channel entry';
        } else {
          this.triggerOsdBanner();
          actionDesc = 'Toggled Channel OSD Banner';
        }
        break;
      }
      case 'NUMERIC_DIGIT': {
        const digit = payload !== undefined && payload !== null ? String(payload) : '';
        if (this.osdState.numericBuffer.length < 3) {
          this.osdState.numericBuffer += digit;
          this.osdState.numericCommitCountdownMs = 1200;
          this.scheduleNumericCommit();
          actionDesc = `Keyed digit ${digit} -> Buffer [${this.osdState.numericBuffer}]`;
        }
        break;
      }
      case 'DPAD_LEFT':
      case 'DPAD_RIGHT':
      case 'DPAD_UP':
      case 'DPAD_DOWN': {
        this.handleSpatialMovement(key);
        actionDesc = `Navigated spatial grid: ${key}`;
        break;
      }
      default:
        handled = false;
        actionDesc = 'Unknown keycode';
    }

    this.notify();
    return { handled, actionDesc };
  }

  private handleSpatialMovement(dir: 'DPAD_UP' | 'DPAD_DOWN' | 'DPAD_LEFT' | 'DPAD_RIGHT') {
    const parts = this.currentFocusNodeId.split('_');
    let row = parseInt(parts[1] || '0', 10);
    let col = parseInt(parts[2] || '0', 10);

    if (dir === 'DPAD_UP') row = Math.max(0, row - 1);
    if (dir === 'DPAD_DOWN') row = Math.min(3, row + 1);
    if (dir === 'DPAD_LEFT') col = Math.max(0, col - 1);
    if (dir === 'DPAD_RIGHT') col = Math.min(3, col + 1);

    this.currentFocusNodeId = `grid_${row}_${col}`;
  }

  private scheduleNumericCommit() {
    if (this.numericTimer) clearTimeout(this.numericTimer);
    this.numericTimer = setTimeout(() => {
      this.commitNumericBuffer();
    }, 1200);
  }

  public commitNumericBuffer(): boolean {
    if (!this.osdState.numericBuffer) return false;
    const targetNum = parseInt(this.osdState.numericBuffer, 10);
    const foundIdx = this.channels.findIndex((c) => c.number === targetNum);

    if (foundIdx !== -1) {
      this.currentChannelIndex = foundIdx;
      this.osdState.currentChannel = this.channels[foundIdx];
      this.triggerOsdBanner();
    }

    this.osdState.numericBuffer = '';
    this.osdState.numericCommitCountdownMs = 0;
    this.notify();
    return foundIdx !== -1;
  }

  public triggerOsdBanner() {
    this.osdState.isBannerVisible = true;
    this.scheduleOsdBannerDismiss();
    this.notify();
  }

  private scheduleOsdBannerDismiss() {
    if (this.osdTimer) clearTimeout(this.osdTimer);
    this.osdTimer = setTimeout(() => {
      this.osdState.isBannerVisible = false;
      this.notify();
    }, this.osdState.bannerTimeoutMs);
  }

  /**
   * Simulates Voice Search query matching across Channels and EPG Programs
   */
  public executeVoiceSearch(query: string): Array<{ id: string; title: string; subtitle: string; type: 'channel' | 'program' }> {
    const q = query.toLowerCase().trim();
    this.osdState.voiceSearchQuery = query;
    this.osdState.isVoiceSearchOpen = true;

    const results: Array<{ id: string; title: string; subtitle: string; type: 'channel' | 'program' }> = [];

    this.channels.forEach((ch) => {
      if (ch.name.toLowerCase().includes(q) || ch.category.toLowerCase().includes(q)) {
        results.push({
          id: ch.id,
          title: ch.name,
          subtitle: `Live Channel #${ch.number} • ${ch.category}`,
          type: 'channel',
        });
      }
      if (ch.nowPlaying.toLowerCase().includes(q) || ch.nextPlaying.toLowerCase().includes(q)) {
        results.push({
          id: `${ch.id}_prog`,
          title: ch.nowPlaying,
          subtitle: `Playing on ${ch.name} (${ch.nowProgressPercent}% complete)`,
          type: 'program',
        });
      }
    });

    this.osdState.voiceSearchResults = results;
    this.notify();
    return results;
  }

  public toggleOverscanSafeMargin() {
    this.osdState.isSafeMarginEnabled = !this.osdState.isSafeMarginEnabled;
    this.notify();
  }

  public toggleHdmiCec() {
    this.osdState.isHdmiCecActive = !this.osdState.isHdmiCecActive;
    this.notify();
  }

  public setAudioTrack(track: string) {
    this.osdState.activeAudioTrack = track;
    this.notify();
  }

  public setSubtitleTrack(sub: string) {
    this.osdState.activeSubtitleTrack = sub;
    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }
}

export const globalLeanbackSpatialEngine = new LeanbackSpatialEngine();

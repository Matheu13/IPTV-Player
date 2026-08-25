/**
 * Android TV / Fire TV Remote Keycode Handler and Keypad Zapper Bridge
 */

import { tvFocusEngine, DPadDirection } from './tvFocusEngine';

export const ANDROID_KEYCODES = {
  KEYCODE_DPAD_UP: 19,
  KEYCODE_DPAD_DOWN: 20,
  KEYCODE_DPAD_LEFT: 21,
  KEYCODE_DPAD_RIGHT: 22,
  KEYCODE_DPAD_CENTER: 23,
  KEYCODE_BACK: 4,
  KEYCODE_MENU: 82,
  KEYCODE_MEDIA_PLAY_PAUSE: 85,
  KEYCODE_MEDIA_PLAY: 126,
  KEYCODE_MEDIA_PAUSE: 127,
  KEYCODE_CHANNEL_UP: 166,
  KEYCODE_CHANNEL_DOWN: 167,
  KEYCODE_0: 7,
  KEYCODE_1: 8,
  KEYCODE_2: 9,
  KEYCODE_3: 10,
  KEYCODE_4: 11,
  KEYCODE_5: 12,
  KEYCODE_6: 13,
  KEYCODE_7: 14,
  KEYCODE_8: 15,
  KEYCODE_9: 16,
} as const;

export type RemoteAction =
  | 'UP'
  | 'DOWN'
  | 'LEFT'
  | 'RIGHT'
  | 'SELECT'
  | 'BACK'
  | 'MENU'
  | 'PLAY_PAUSE'
  | 'CHANNEL_UP'
  | 'CHANNEL_DOWN'
  | 'DIGIT';

export interface RemoteEventCallback {
  onAction?: (action: RemoteAction, detail?: any) => void;
  onDigitBufferChange?: (buffer: string) => void;
  onDigitChannelCommit?: (channelNumber: number) => void;
}

export class TvRemoteInputBridge {
  private digitBuffer = '';
  private digitCommitTimer: any = null;
  private callbacks: Set<RemoteEventCallback> = new Set();
  private enabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  public registerCallback(cb: RemoteEventCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  public handleAction(action: RemoteAction, detail?: any): void {
    if (!this.enabled) return;

    switch (action) {
      case 'UP':
      case 'DOWN':
      case 'LEFT':
      case 'RIGHT':
        tvFocusEngine.handleDPad(action as DPadDirection);
        break;
      case 'SELECT':
        tvFocusEngine.handleSelect();
        break;
      case 'BACK':
        tvFocusEngine.handleBack();
        break;
      case 'DIGIT':
        if (typeof detail === 'number' || typeof detail === 'string') {
          this.handleDigitInput(String(detail));
        }
        break;
      case 'CHANNEL_UP':
      case 'CHANNEL_DOWN':
      case 'PLAY_PAUSE':
      case 'MENU':
        break;
    }

    this.callbacks.forEach((cb) => cb.onAction && cb.onAction(action, detail));
  }

  public handleDigitInput(digit: string): void {
    if (!/^\d$/.test(digit)) return;

    this.digitBuffer += digit;
    this.callbacks.forEach(
      (cb) => cb.onDigitBufferChange && cb.onDigitBufferChange(this.digitBuffer)
    );

    if (this.digitCommitTimer) {
      clearTimeout(this.digitCommitTimer);
    }

    this.digitCommitTimer = setTimeout(() => {
      const channelNum = parseInt(this.digitBuffer, 10);
      if (!isNaN(channelNum)) {
        this.callbacks.forEach(
          (cb) => cb.onDigitChannelCommit && cb.onDigitChannelCommit(channelNum)
        );
      }
      this.digitBuffer = '';
      this.callbacks.forEach(
        (cb) => cb.onDigitBufferChange && cb.onDigitBufferChange('')
      );
    }, 1200);
  }

  public clearDigitBuffer(): void {
    if (this.digitCommitTimer) {
      clearTimeout(this.digitCommitTimer);
    }
    this.digitBuffer = '';
    this.callbacks.forEach(
      (cb) => cb.onDigitBufferChange && cb.onDigitBufferChange('')
    );
  }

  public getDigitBuffer(): string {
    return this.digitBuffer;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.enabled) return;

    // Do not interfere if user is typing in an HTML text input/textarea
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      if (e.key === 'Escape') {
        target.blur();
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        this.handleAction('UP');
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.handleAction('DOWN');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.handleAction('LEFT');
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.handleAction('RIGHT');
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.handleAction('SELECT');
        break;
      case 'Escape':
      case 'Backspace':
        e.preventDefault();
        this.handleAction('BACK');
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        this.handleAction('MENU');
        break;
      case 'k':
      case 'K':
        e.preventDefault();
        this.handleAction('PLAY_PAUSE');
        break;
      case 'PageUp':
        e.preventDefault();
        this.handleAction('CHANNEL_UP');
        break;
      case 'PageDown':
        e.preventDefault();
        this.handleAction('CHANNEL_DOWN');
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        this.handleAction('DIGIT', e.key);
        break;
    }
  }
}

export const tvRemoteBridge = new TvRemoteInputBridge();

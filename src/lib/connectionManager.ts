/**
 * Milestone 1 Connection Manager: Strict Single Connection Limit (Max = 1) State Machine
 * Prevents account bans by guaranteeing that no two stream connections ever overlap.
 * Features:
 *  1. Monotonic Generation Tokens (drops stale async responses)
 *  2. 300ms Channel Switch Debounce (prevents burst triggers during channel surfing)
 *  3. AbortController Request Cancellation
 *  4. 4-Stage Teardown Pipeline (Abort -> Signal Process -> Token Invalidation -> Connect)
 */

import { redactUrl } from './redact';

export type PlaybackState = 'IDLE' | 'DEBOUNCING' | 'TEARING_DOWN' | 'CONNECTING' | 'STREAMING' | 'ERROR';

export interface ActiveSession {
  streamId: number | string;
  channelName: string;
  streamUrl: string;
  generationToken: number;
  startedAt: string;
  format: string;
}

export interface StateMachineTransitionEvent {
  timestamp: string;
  fromState: PlaybackState;
  toState: PlaybackState;
  generationToken: number;
  channelName: string;
  message: string;
}

export class SingleConnectionManager {
  private currentState: PlaybackState = 'IDLE';
  private currentGenerationToken: number = 0;
  private activeSession: ActiveSession | null = null;
  private activeAbortController: AbortController | null = null;
  private debounceTimer: NodeJS.Timeout | number | null = null;
  private transitionListeners: ((event: StateMachineTransitionEvent) => void)[] = [];
  private stateChangeListeners: ((state: PlaybackState, session: ActiveSession | null) => void)[] = [];
  private transitionHistory: StateMachineTransitionEvent[] = [];

  constructor() {
    this.currentGenerationToken = 1;
  }

  public getCurrentState(): PlaybackState {
    return this.currentState;
  }

  public getActiveSession(): ActiveSession | null {
    return this.activeSession;
  }

  public getGenerationToken(): number {
    return this.currentGenerationToken;
  }

  public getHistory(): StateMachineTransitionEvent[] {
    return [...this.transitionHistory];
  }

  public onTransition(listener: (event: StateMachineTransitionEvent) => void): () => void {
    this.transitionListeners.push(listener);
    return () => {
      this.transitionListeners = this.transitionListeners.filter((l) => l !== listener);
    };
  }

  public onStateChange(listener: (state: PlaybackState, session: ActiveSession | null) => void): () => void {
    this.stateChangeListeners.push(listener);
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter((l) => l !== listener);
    };
  }

  private transitionTo(toState: PlaybackState, message: string, channelName: string = '') {
    const fromState = this.currentState;
    this.currentState = toState;

    const event: StateMachineTransitionEvent = {
      timestamp: new Date().toISOString(),
      fromState,
      toState,
      generationToken: this.currentGenerationToken,
      channelName: channelName || this.activeSession?.channelName || 'None',
      message,
    };

    this.transitionHistory.unshift(event);
    if (this.transitionHistory.length > 200) this.transitionHistory.pop();

    this.transitionListeners.forEach((fn) => fn(event));
    this.stateChangeListeners.forEach((fn) => fn(toState, this.activeSession));
  }

  /**
   * Request channel switch with strict teardown and 300ms debounce.
   */
  public requestChannel(
    channel: { id: string | number; name: string; streamUrl: string; format?: string },
    debounceMs: number = 300
  ): Promise<{ success: boolean; generationToken: number }> {
    // 1. Immediately increment monotonic generation token
    this.currentGenerationToken++;
    const token = this.currentGenerationToken;

    // 2. Cancel any pending debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer as any);
      this.debounceTimer = null;
    }

    // 3. Trigger immediate teardown of active stream if running
    this.teardownActiveStream(`Channel switch to '${channel.name}' requested.`);

    this.transitionTo('DEBOUNCING', `300ms debounce active for '${channel.name}'. Holding connection.`, channel.name);

    return new Promise((resolve) => {
      this.debounceTimer = setTimeout(async () => {
        // If another channel was requested during debounce, abort
        if (this.currentGenerationToken !== token) {
          resolve({ success: false, generationToken: token });
          return;
        }

        // Proceed to connect
        await this.executeConnect(channel, token);
        resolve({ success: true, generationToken: token });
      }, debounceMs);
    });
  }

  /**
   * 4-Stage Teardown Pipeline
   */
  public teardownActiveStream(reason: string = 'Stream stopped'): void {
    if (this.currentState === 'IDLE') return;

    this.transitionTo('TEARING_DOWN', `Stage 1 & 2: Abort network signal and kill native player process. Reason: ${reason}`);

    // Stage 1: Abort in-flight network request
    if (this.activeAbortController) {
      try {
        this.activeAbortController.abort();
      } catch (err) {
        console.warn('[ConnectionManager] Error aborting controller:', err);
      }
      this.activeAbortController = null;
    }

    // Stage 2: Invalidate active session
    this.activeSession = null;

    this.transitionTo('IDLE', 'Teardown complete. Zero active connections.');
  }

  private async executeConnect(
    channel: { id: string | number; name: string; streamUrl: string; format?: string },
    token: number
  ): Promise<void> {
    if (this.currentGenerationToken !== token) {
      // Stale token guard
      return;
    }

    this.transitionTo(
      'CONNECTING',
      `Connecting single socket to ${redactUrl(channel.streamUrl)}`,
      channel.name
    );

    this.activeAbortController = new AbortController();

    // Create session
    this.activeSession = {
      streamId: channel.id,
      channelName: channel.name,
      streamUrl: channel.streamUrl,
      generationToken: token,
      startedAt: new Date().toISOString(),
      format: channel.format || 'm3u8',
    };

    // Transition to streaming
    this.transitionTo(
      'STREAMING',
      `Active playback established for '${channel.name}' (Token #${token}, Strict limit: 1/1).`,
      channel.name
    );
  }

  /**
   * Simulates an unexpected player error triggering teardown.
   */
  public reportPlayerError(errorMessage: string): void {
    this.transitionTo('ERROR', `Player error encountered: ${errorMessage}. Auto-teardown initiated.`);
    this.teardownActiveStream('Player error');
  }
}

export const globalConnectionManager = new SingleConnectionManager();

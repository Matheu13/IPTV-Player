/**
 * Phase 47: Teardown Auditor & Lifecycle Observability Engine
 *
 * Captures monotonic high-resolution timestamps for every phase of stream switching and teardown:
 * Switch Requested -> Previous Identified -> Abort Initiated -> Abort Confirmed ->
 * Resources Released -> Listeners Cleaned -> Player Destroyed -> Next Init -> Attached -> Playback Ready.
 *
 * Distinguishes ABORT REQUESTED from TEARDOWN CONFIRMED.
 * Redacts all URLs and sensitive tokens. Purely observational with zero overhead.
 */

export type TeardownStageId =
  | 'SWITCH_REQUESTED'
  | 'PREVIOUS_STREAM_IDENTIFIED'
  | 'ABORT_INITIATED'
  | 'ABORT_CONFIRMED'
  | 'RESOURCES_RELEASED'
  | 'LISTENERS_CLEANED_UP'
  | 'PLAYER_DESTROYED'
  | 'NEXT_INIT_STARTED'
  | 'NEXT_STREAM_ATTACHED'
  | 'PLAYBACK_READY';

export type StageVerificationStatus = 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'UNSUPPORTED_IN_RUNTIME' | 'FAILED';

export interface LifecycleStageLog {
  stage: TeardownStageId;
  label: string;
  timestamp: number; // Monotonic performance.now()
  stepDurationMs: number;
  cumulativeDurationMs: number;
  status: StageVerificationStatus;
  notes?: string;
}

export interface TeardownAuditRecord {
  id: string;
  sourceChannelId: string;
  sourceChannelName: string;
  targetChannelId: string;
  targetChannelName: string;
  sanitizedTargetUrl: string;
  startedAt: number; // Monotonic
  completedAt?: number;
  totalSwitchLatencyMs?: number;
  teardownDurationMs?: number;
  initDurationMs?: number;
  success: boolean;
  failedStage?: TeardownStageId;
  stages: LifecycleStageLog[];
  isTeardownConfirmed: boolean;
  runtimeConfirmationSupported: boolean;
}

export class TeardownAuditor {
  private static instance: TeardownAuditor | null = null;
  private auditHistory: TeardownAuditRecord[] = [];
  private activeAudit: TeardownAuditRecord | null = null;
  private isEnabled = true;

  public static getInstance(): TeardownAuditor {
    if (!TeardownAuditor.instance) {
      TeardownAuditor.instance = new TeardownAuditor();
    }
    return TeardownAuditor.instance;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Sanitizes URLs by removing tokens, passwords, Xtream credentials, and session keys.
   */
  public static sanitizeUrl(url: string): string {
    if (!url) return '';
    try {
      // Redact Xtream user/pass paths e.g. /live/username/password/123.ts
      let sanitized = url.replace(/\/live\/([^/]+)\/([^/]+)\//gi, '/live/[USER]/[AUTH]/');
      sanitized = sanitized.replace(/\/movie\/([^/]+)\/([^/]+)\//gi, '/movie/[USER]/[AUTH]/');
      sanitized = sanitized.replace(/\/series\/([^/]+)\/([^/]+)\//gi, '/series/[USER]/[AUTH]/');

      // Redact query params containing tokens/keys/auth
      sanitized = sanitized.replace(/([?&](?:token|auth|key|secret|pass|user|sig)=)[^&#]*/gi, '$1[REDACTED]');
      return sanitized;
    } catch (_) {
      return '[REDACTED_URL]';
    }
  }

  /**
   * Begins a new channel switch audit record.
   */
  public beginSwitchAudit(
    sourceChannelId: string,
    sourceChannelName: string,
    targetChannelId: string,
    targetChannelName: string,
    targetUrl: string
  ): TeardownAuditRecord {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const record: TeardownAuditRecord = {
      id,
      sourceChannelId,
      sourceChannelName,
      targetChannelId,
      targetChannelName,
      sanitizedTargetUrl: TeardownAuditor.sanitizeUrl(targetUrl),
      startedAt: now,
      success: false,
      stages: [],
      isTeardownConfirmed: false,
      runtimeConfirmationSupported: true,
    };

    if (this.isEnabled) {
      this.activeAudit = record;
      this.recordStage('SWITCH_REQUESTED', 'Switch requested by user / controller', 'VERIFIED');
    }

    return record;
  }

  /**
   * Records a specific stage in the stream lifecycle with high-resolution delta timing.
   */
  public recordStage(
    stage: TeardownStageId,
    label: string,
    status: StageVerificationStatus = 'VERIFIED',
    notes?: string
  ): void {
    if (!this.isEnabled || !this.activeAudit) return;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const previousTimestamp =
      this.activeAudit.stages.length > 0
        ? this.activeAudit.stages[this.activeAudit.stages.length - 1].timestamp
        : this.activeAudit.startedAt;

    const stepDurationMs = Math.max(0, parseFloat((now - previousTimestamp).toFixed(2)));
    const cumulativeDurationMs = Math.max(0, parseFloat((now - this.activeAudit.startedAt).toFixed(2)));

    if (stage === 'ABORT_CONFIRMED') {
      this.activeAudit.isTeardownConfirmed = status === 'VERIFIED';
      this.activeAudit.teardownDurationMs = cumulativeDurationMs;
    }

    if (status === 'FAILED') {
      this.activeAudit.failedStage = stage;
      this.activeAudit.success = false;
    }

    this.activeAudit.stages.push({
      stage,
      label,
      timestamp: now,
      stepDurationMs,
      cumulativeDurationMs,
      status,
      notes,
    });
  }

  /**
   * Concludes the active switch audit and saves it to history.
   */
  public completeSwitchAudit(success: boolean): TeardownAuditRecord | null {
    if (!this.activeAudit) return null;

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.activeAudit.completedAt = now;
    this.activeAudit.totalSwitchLatencyMs = Math.max(0, parseFloat((now - this.activeAudit.startedAt).toFixed(2)));
    this.activeAudit.initDurationMs = Math.max(
      0,
      parseFloat(((this.activeAudit.totalSwitchLatencyMs || 0) - (this.activeAudit.teardownDurationMs || 0)).toFixed(2))
    );
    this.activeAudit.success = success && this.activeAudit.isTeardownConfirmed;

    this.auditHistory.unshift(this.activeAudit);
    if (this.auditHistory.length > 50) {
      this.auditHistory.pop();
    }

    const completed = this.activeAudit;
    this.activeAudit = null;
    return completed;
  }

  public getHistory(): TeardownAuditRecord[] {
    return [...this.auditHistory];
  }

  public getLatestAudit(): TeardownAuditRecord | null {
    return this.auditHistory.length > 0 ? this.auditHistory[0] : null;
  }

  public clearHistory(): void {
    this.auditHistory = [];
    this.activeAudit = null;
  }
}

export const globalTeardownAuditor = TeardownAuditor.getInstance();

/**
 * Milestone 12: DVR, PVR Cloud & Local Recording Scheduler & Timeshift Buffer Engine
 * Features:
 * - EPG-linked scheduled recording timer engine with pre/post-roll margins
 * - Single-connection safe timeshift stream recorder / circular disk buffer manager
 * - Conflict detector for overlapping recordings based on account connection quotas
 * - Storage quota management with auto-expiration (LRU pruning)
 */

export type RecordingStatus = 'scheduled' | 'recording' | 'completed' | 'failed' | 'conflict' | 'cancelled';
export type PvrStorageType = 'local_nvme' | 'nas_smb' | 'cloud_s3';

export interface ScheduledRecording {
  id: string;
  channelId: string | number;
  channelName: string;
  programId?: string;
  programTitle: string;
  programDescription?: string;
  startTime: Date;
  endTime: Date;
  preRollMinutes: number; // e.g. 2-5 min buffer
  postRollMinutes: number; // e.g. 5-15 min buffer
  effectiveStart: Date;
  effectiveEnd: Date;
  durationMinutes: number;
  status: RecordingStatus;
  storageType: PvrStorageType;
  fileSizeBytes?: number;
  outputFilePath?: string;
  streamUrl?: string;
  sourceId?: string;
  conflictWithId?: string;
  errorReason?: string;
  createdAt: Date;
}

export interface PvrStorageQuota {
  totalCapacityBytes: number;
  usedBytes: number;
  freeBytes: number;
  usagePercent: number;
  maxQuotaWarningThresholdPercent: number;
  autoDeleteOldestWhenFull: boolean;
  totalRecordingsCount: number;
}

export interface TimeshiftSession {
  channelId: string | number;
  channelName: string;
  streamUrl: string;
  sessionStartTime: Date;
  maxBufferDurationSec: number; // e.g. 7200s = 2h
  currentBufferDurationSec: number;
  currentLiveOffsetSec: number; // 0 = live edge, -300 = 5min behind live
  playbackRate: number; // 0.5x, 1x, 2x, 4x, 8x, 16x
  isPaused: boolean;
  state: 'live' | 'timeshifting' | 'paused';
  bufferSizeMB: number;
}

export interface RecordingConflictReport {
  hasConflict: boolean;
  conflictingRecordings: {
    existing: ScheduledRecording;
    requested: Partial<ScheduledRecording>;
    overlapMinutes: number;
    reason: string;
  }[];
  allowedConcurrentRecordings: number;
}

export class PvrRecordingEngine {
  private recordings: Map<string, ScheduledRecording> = new Map();
  private maxConcurrentStreams: number = 1; // Strict single connection default
  private storageQuota: PvrStorageQuota = {
    totalCapacityBytes: 256 * 1024 * 1024 * 1024, // 256 GB
    usedBytes: 38 * 1024 * 1024 * 1024, // 38 GB used
    freeBytes: 218 * 1024 * 1024 * 1024,
    usagePercent: 14.8,
    maxQuotaWarningThresholdPercent: 90,
    autoDeleteOldestWhenFull: true,
    totalRecordingsCount: 0,
  };

  private activeTimeshift: TimeshiftSession | null = null;

  constructor(maxConcurrentStreams: number = 1) {
    this.maxConcurrentStreams = maxConcurrentStreams;
    this.seedSampleRecordings();
    this.updateQuotaStats();
  }

  private seedSampleRecordings() {
    const now = new Date();
    const past1 = new Date(now.getTime() - 2 * 3600 * 1000);
    const pastEnd1 = new Date(now.getTime() - 1 * 3600 * 1000);
    const future1 = new Date(now.getTime() + 1 * 3600 * 1000);
    const futureEnd1 = new Date(now.getTime() + 2.5 * 3600 * 1000);

    this.scheduleRecording({
      id: 'rec_pvr_001',
      channelId: 'sky_f1_hd',
      channelName: 'Sky Sports F1 HD',
      programTitle: 'Formula 1 Grand Prix: Qualifying',
      startTime: past1,
      endTime: pastEnd1,
      preRollMinutes: 3,
      postRollMinutes: 10,
      storageType: 'local_nvme',
      status: 'completed',
      fileSizeBytes: 4.2 * 1024 * 1024 * 1024, // 4.2 GB
      outputFilePath: '/var/recordings/f1_qualifying_2026.ts',
    });

    this.scheduleRecording({
      id: 'rec_pvr_002',
      channelId: 'bbc_one_hd',
      channelName: 'BBC One HD',
      programTitle: 'Planet Earth III: Extremes',
      startTime: future1,
      endTime: futureEnd1,
      preRollMinutes: 2,
      postRollMinutes: 5,
      storageType: 'local_nvme',
      status: 'scheduled',
    });
  }

  public setMaxConnections(conns: number) {
    this.maxConcurrentStreams = Math.max(1, conns);
  }

  /**
   * Evaluates if a new recording request overlaps with existing ones beyond max concurrent streams
   */
  public detectConflicts(
    newSpec: {
      startTime: Date;
      endTime: Date;
      preRollMinutes?: number;
      postRollMinutes?: number;
      channelId?: string | number;
    },
    ignoreRecordingId?: string
  ): RecordingConflictReport {
    const pre = newSpec.preRollMinutes ?? 3;
    const post = newSpec.postRollMinutes ?? 5;
    const newEffStart = new Date(newSpec.startTime.getTime() - pre * 60 * 1000);
    const newEffEnd = new Date(newSpec.endTime.getTime() + post * 60 * 1000);

    const conflicts: RecordingConflictReport['conflictingRecordings'] = [];

    // Filter active scheduled and recording items
    const activeList = Array.from(this.recordings.values()).filter(
      (r) =>
        r.id !== ignoreRecordingId &&
        (r.status === 'scheduled' || r.status === 'recording')
    );

    for (const rec of activeList) {
      // If times overlap
      if (newEffStart < rec.effectiveEnd && newEffEnd > rec.effectiveStart) {
        const overlapStart = Math.max(newEffStart.getTime(), rec.effectiveStart.getTime());
        const overlapEnd = Math.min(newEffEnd.getTime(), rec.effectiveEnd.getTime());
        const overlapMinutes = Math.round((overlapEnd - overlapStart) / (60 * 1000));

        if (this.maxConcurrentStreams === 1) {
          conflicts.push({
            existing: rec,
            requested: newSpec,
            overlapMinutes,
            reason: `Single connection provider limit prevents concurrent stream for "${rec.programTitle}" on ${rec.channelName}`,
          });
        }
      }
    }

    return {
      hasConflict: conflicts.length >= this.maxConcurrentStreams,
      conflictingRecordings: conflicts,
      allowedConcurrentRecordings: this.maxConcurrentStreams,
    };
  }

  /**
   * Schedule a new recording with automatic conflict validation
   */
  public scheduleRecording(spec: {
    id?: string;
    channelId: string | number;
    channelName: string;
    programId?: string;
    programTitle: string;
    programDescription?: string;
    startTime: Date;
    endTime: Date;
    preRollMinutes?: number;
    postRollMinutes?: number;
    storageType?: PvrStorageType;
    status?: RecordingStatus;
    fileSizeBytes?: number;
    outputFilePath?: string;
  }): { recording: ScheduledRecording; conflict?: RecordingConflictReport } {
    const id = spec.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const preRollMinutes = spec.preRollMinutes ?? 2;
    const postRollMinutes = spec.postRollMinutes ?? 5;

    const effectiveStart = new Date(spec.startTime.getTime() - preRollMinutes * 60 * 1000);
    const effectiveEnd = new Date(spec.endTime.getTime() + postRollMinutes * 60 * 1000);
    const durationMinutes = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / (60 * 1000));

    // Conflict check
    const conflict = this.detectConflicts({
      startTime: spec.startTime,
      endTime: spec.endTime,
      preRollMinutes,
      postRollMinutes,
      channelId: spec.channelId,
    });

    const status: RecordingStatus = spec.status || (conflict.hasConflict ? 'conflict' : 'scheduled');

    const recording: ScheduledRecording = {
      id,
      channelId: spec.channelId,
      channelName: spec.channelName,
      programId: spec.programId,
      programTitle: spec.programTitle,
      programDescription: spec.programDescription,
      startTime: spec.startTime,
      endTime: spec.endTime,
      preRollMinutes,
      postRollMinutes,
      effectiveStart,
      effectiveEnd,
      durationMinutes,
      status,
      storageType: spec.storageType || 'local_nvme',
      fileSizeBytes: spec.fileSizeBytes || (status === 'completed' ? durationMinutes * 35 * 1024 * 1024 : 0),
      outputFilePath: spec.outputFilePath || `/var/recordings/${id}.ts`,
      conflictWithId: conflict.conflictingRecordings[0]?.existing.id,
      errorReason: conflict.hasConflict ? conflict.conflictingRecordings[0]?.reason : undefined,
      createdAt: new Date(),
    };

    this.recordings.set(id, recording);
    this.updateQuotaStats();

    return { recording, conflict: conflict.hasConflict ? conflict : undefined };
  }

  public cancelRecording(id: string): boolean {
    const rec = this.recordings.get(id);
    if (!rec) return false;
    rec.status = 'cancelled';
    this.updateQuotaStats();
    return true;
  }

  public deleteRecording(id: string): boolean {
    const deleted = this.recordings.delete(id);
    this.updateQuotaStats();
    return deleted;
  }

  public getAllRecordings(): ScheduledRecording[] {
    return Array.from(this.recordings.values()).sort(
      (a, b) => b.effectiveStart.getTime() - a.effectiveStart.getTime()
    );
  }

  public getRecordingById(id: string): ScheduledRecording | undefined {
    return this.recordings.get(id);
  }

  // ==========================================
  // TIMESHIFT LIVE BUFFER ENGINE
  // ==========================================

  public startTimeshift(channelId: string | number, channelName: string, streamUrl: string): TimeshiftSession {
    this.activeTimeshift = {
      channelId,
      channelName,
      streamUrl,
      sessionStartTime: new Date(),
      maxBufferDurationSec: 7200, // 2 Hours ring buffer
      currentBufferDurationSec: 60, // starts accumulating
      currentLiveOffsetSec: 0, // at live edge
      playbackRate: 1.0,
      isPaused: false,
      state: 'live',
      bufferSizeMB: 150,
    };
    return this.activeTimeshift;
  }

  public pauseTimeshift(): TimeshiftSession | null {
    if (!this.activeTimeshift) return null;
    this.activeTimeshift.isPaused = true;
    this.activeTimeshift.state = 'paused';
    return this.activeTimeshift;
  }

  public resumeTimeshift(): TimeshiftSession | null {
    if (!this.activeTimeshift) return null;
    this.activeTimeshift.isPaused = false;
    this.activeTimeshift.state = this.activeTimeshift.currentLiveOffsetSec < 0 ? 'timeshifting' : 'live';
    this.activeTimeshift.playbackRate = 1.0;
    return this.activeTimeshift;
  }

  public seekTimeshift(offsetSecondsFromLive: number): TimeshiftSession | null {
    if (!this.activeTimeshift) return null;
    // offsetSecondsFromLive must be <= 0 (e.g. -300s = 5m behind live)
    const maxBehind = -Math.min(this.activeTimeshift.maxBufferDurationSec, this.activeTimeshift.currentBufferDurationSec);
    const clampedOffset = Math.max(maxBehind, Math.min(0, offsetSecondsFromLive));

    this.activeTimeshift.currentLiveOffsetSec = clampedOffset;
    this.activeTimeshift.state = clampedOffset < 0 ? 'timeshifting' : 'live';
    this.activeTimeshift.isPaused = false;
    return this.activeTimeshift;
  }

  public setTimeshiftSpeed(speed: number): TimeshiftSession | null {
    if (!this.activeTimeshift) return null;
    this.activeTimeshift.playbackRate = speed;
    this.activeTimeshift.isPaused = false;
    return this.activeTimeshift;
  }

  public jumpToLive(): TimeshiftSession | null {
    return this.seekTimeshift(0);
  }

  public getTimeshiftStatus(): TimeshiftSession | null {
    if (!this.activeTimeshift) return null;
    // Simulating buffer accumulation
    const elapsed = Math.min(
      this.activeTimeshift.maxBufferDurationSec,
      Math.round((Date.now() - this.activeTimeshift.sessionStartTime.getTime()) / 1000) + 60
    );
    this.activeTimeshift.currentBufferDurationSec = elapsed;
    this.activeTimeshift.bufferSizeMB = Math.round((elapsed / 60) * 35); // ~35MB/min for 1080p
    return { ...this.activeTimeshift };
  }

  // ==========================================
  // STORAGE QUOTA & PRUNING
  // ==========================================

  public getStorageQuota(): PvrStorageQuota {
    this.updateQuotaStats();
    return { ...this.storageQuota };
  }

  private updateQuotaStats() {
    let totalUsed = 38 * 1024 * 1024 * 1024; // baseline base system recordings
    let count = 0;

    for (const rec of this.recordings.values()) {
      if (rec.status === 'completed' && rec.fileSizeBytes) {
        totalUsed += rec.fileSizeBytes;
        count++;
      }
    }

    this.storageQuota.usedBytes = totalUsed;
    this.storageQuota.freeBytes = Math.max(0, this.storageQuota.totalCapacityBytes - totalUsed);
    this.storageQuota.usagePercent = parseFloat(
      ((totalUsed / this.storageQuota.totalCapacityBytes) * 100).toFixed(1)
    );
    this.storageQuota.totalRecordingsCount = count;
  }

  public pruneOldRecordings(targetFreeBytes: number = 20 * 1024 * 1024 * 1024): number {
    const completed = Array.from(this.recordings.values())
      .filter((r) => r.status === 'completed')
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime()); // oldest first

    let bytesFreed = 0;
    for (const rec of completed) {
      if (this.storageQuota.freeBytes + bytesFreed >= targetFreeBytes) break;
      bytesFreed += rec.fileSizeBytes || 0;
      this.recordings.delete(rec.id);
    }
    this.updateQuotaStats();
    return bytesFreed;
  }
}

export const globalPvrEngine = new PvrRecordingEngine();

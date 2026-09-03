/**
 * Persistent User Overlay & Transactional Catalog Manager
 * 
 * Implements TiviGlass Architectural Specifications (Sections G & J):
 * - Preserves user overlays (renames, reordering, custom numbers, logo overrides,
 *   custom groups, EPG offsets, stream corrections, hidden state) across catalog updates.
 * - Manages "Last Known Good Catalog" snapshots for transactional rollback if refresh fails.
 * - Handles Reminders and PVR recording schedules.
 */

export interface ChannelOverlay {
  channelId: string;
  customName?: string;
  customNumber?: number;
  customGroup?: string;
  customLogoUrl?: string;
  epgIdOverride?: string;
  guideOffsetHours?: number; // e.g. -2 or +3 hours
  streamCorrectionUrl?: string;
  isHidden?: boolean;
  isFavorite?: boolean;
  notes?: string;
  updatedAt: number;
}

export interface ProgramReminder {
  id: string;
  channelId: string;
  channelName: string;
  programTitle: string;
  startTs: number;
  endTs: number;
  createdAt: number;
}

export interface ScheduledRecording {
  id: string;
  channelId: string;
  channelName: string;
  programTitle: string;
  startTs: number;
  endTs: number;
  status: 'SCHEDULED' | 'RECORDING' | 'COMPLETED' | 'FAILED';
  outputPath?: string;
}

export interface LastKnownGoodSnapshot {
  sourceId: string;
  timestamp: number;
  channelCount: number;
  sourceName: string;
  channelsSummary: Array<{ id: string; name: string; streamUrl: string }>;
}

const STORAGE_KEY_OVERLAYS = 'tiviglass_channel_overlays_v1';
const STORAGE_KEY_REMINDERS = 'tiviglass_program_reminders_v1';
const STORAGE_KEY_RECORDINGS = 'tiviglass_pvr_recordings_v1';
const STORAGE_KEY_SNAPSHOTS = 'tiviglass_last_known_good_v1';

export class UserOverlayManager {
  private overlays: Map<string, ChannelOverlay> = new Map();
  private reminders: ProgramReminder[] = [];
  private recordings: ScheduledRecording[] = [];
  private snapshots: Map<string, LastKnownGoodSnapshot> = new Map();
  private subscribers: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      // Overlays
      const savedOverlays = localStorage.getItem(STORAGE_KEY_OVERLAYS);
      if (savedOverlays) {
        const parsed = JSON.parse(savedOverlays);
        if (typeof parsed === 'object' && parsed !== null) {
          this.overlays = new Map(Object.entries(parsed));
        }
      }

      // Reminders
      const savedReminders = localStorage.getItem(STORAGE_KEY_REMINDERS);
      if (savedReminders) {
        this.reminders = JSON.parse(savedReminders);
      }

      // Recordings
      const savedRecordings = localStorage.getItem(STORAGE_KEY_RECORDINGS);
      if (savedRecordings) {
        this.recordings = JSON.parse(savedRecordings);
      }

      // Last Known Good Snapshots
      const savedSnapshots = localStorage.getItem(STORAGE_KEY_SNAPSHOTS);
      if (savedSnapshots) {
        const parsed = JSON.parse(savedSnapshots);
        this.snapshots = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.warn('[UserOverlayManager] Failed to load from storage:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const objOverlays: Record<string, ChannelOverlay> = {};
      this.overlays.forEach((val, key) => {
        objOverlays[key] = val;
      });
      localStorage.setItem(STORAGE_KEY_OVERLAYS, JSON.stringify(objOverlays));
      localStorage.setItem(STORAGE_KEY_REMINDERS, JSON.stringify(this.reminders));
      localStorage.setItem(STORAGE_KEY_RECORDINGS, JSON.stringify(this.recordings));

      const objSnapshots: Record<string, LastKnownGoodSnapshot> = {};
      this.snapshots.forEach((val, key) => {
        objSnapshots[key] = val;
      });
      localStorage.setItem(STORAGE_KEY_SNAPSHOTS, JSON.stringify(objSnapshots));
    } catch (e) {
      console.warn('[UserOverlayManager] Failed to save to storage:', e);
    }
  }

  public getOverlay(channelId: string): ChannelOverlay | undefined {
    return this.overlays.get(channelId);
  }

  public getAllOverlays(): Map<string, ChannelOverlay> {
    return new Map(this.overlays);
  }

  public setOverlay(channelId: string, partial: Partial<ChannelOverlay>) {
    const existing = this.overlays.get(channelId) || { channelId, updatedAt: Date.now() };
    const updated: ChannelOverlay = {
      ...existing,
      ...partial,
      channelId,
      updatedAt: Date.now(),
    };
    this.overlays.set(channelId, updated);
    this.saveToStorage();
    this.notify();
  }

  public removeOverlay(channelId: string) {
    if (this.overlays.has(channelId)) {
      this.overlays.delete(channelId);
      this.saveToStorage();
      this.notify();
    }
  }

  // Reminders
  public addReminder(reminder: Omit<ProgramReminder, 'id' | 'createdAt'>): string {
    const id = `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRem: ProgramReminder = {
      ...reminder,
      id,
      createdAt: Date.now(),
    };
    this.reminders.push(newRem);
    this.saveToStorage();
    this.notify();
    return id;
  }

  public removeReminder(reminderId: string) {
    this.reminders = this.reminders.filter((r) => r.id !== reminderId);
    this.saveToStorage();
    this.notify();
  }

  public getReminders(): ProgramReminder[] {
    return [...this.reminders];
  }

  // PVR Recordings
  public scheduleRecording(rec: Omit<ScheduledRecording, 'id' | 'status'>): string {
    const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRec: ScheduledRecording = {
      ...rec,
      id,
      status: 'SCHEDULED',
    };
    this.recordings.push(newRec);
    this.saveToStorage();
    this.notify();
    return id;
  }

  public getRecordings(): ScheduledRecording[] {
    return [...this.recordings];
  }

  public cancelRecording(recordingId: string) {
    this.recordings = this.recordings.filter((r) => r.id !== recordingId);
    this.saveToStorage();
    this.notify();
  }

  // Last Known Good Catalog Snapshots
  public saveLastKnownGoodCatalog(sourceId: string, sourceName: string, channels: Array<{ id: string; name: string; streamUrl: string }>) {
    const snapshot: LastKnownGoodSnapshot = {
      sourceId,
      sourceName,
      timestamp: Date.now(),
      channelCount: channels.length,
      channelsSummary: channels.slice(0, 500),
    };
    this.snapshots.set(sourceId, snapshot);
    this.saveToStorage();
  }

  public getLastKnownGoodCatalog(sourceId: string): LastKnownGoodSnapshot | undefined {
    return this.snapshots.get(sourceId);
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }
}

export const globalUserOverlayManager = new UserOverlayManager();

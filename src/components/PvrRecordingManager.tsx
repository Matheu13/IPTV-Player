import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Clock,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Tv,
  Plus,
  Layers,
  Radio,
  Sliders,
} from 'lucide-react';
import {
  globalPvrEngine,
  ScheduledRecording,
  PvrStorageQuota,
  TimeshiftSession,
} from '../lib/pvrRecordingEngine';

export const PvrRecordingManager: React.FC = () => {
  const [recordings, setRecordings] = useState<ScheduledRecording[]>([]);
  const [quota, setQuota] = useState<PvrStorageQuota>(globalPvrEngine.getStorageQuota());
  const [timeshift, setTimeshift] = useState<TimeshiftSession | null>(null);

  // Form for scheduling a new recording
  const [newChannelName, setNewChannelName] = useState('Sky Sports F1 HD');
  const [newProgramTitle, setNewProgramTitle] = useState('Formula 1: Sunday Race Live');
  const [newMinutesFromNow, setNewMinutesFromNow] = useState(15);
  const [newDurationMinutes, setNewDurationMinutes] = useState(120);
  const [lastConflictMsg, setLastConflictMsg] = useState<string | null>(null);

  const refreshData = () => {
    setRecordings([...globalPvrEngine.getAllRecordings()]);
    setQuota(globalPvrEngine.getStorageQuota());
    setTimeshift(globalPvrEngine.getTimeshiftStatus());
  };

  useEffect(() => {
    // Start sample timeshift
    globalPvrEngine.startTimeshift('ch_f1_live', 'Sky Sports F1 HD', 'http://stream.net/live/f1.m3u8');
    refreshData();

    const interval = setInterval(() => {
      refreshData();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleScheduleRecording = (e: React.FormEvent) => {
    e.preventDefault();
    setLastConflictMsg(null);

    const now = new Date();
    const start = new Date(now.getTime() + newMinutesFromNow * 60 * 1000);
    const end = new Date(start.getTime() + newDurationMinutes * 60 * 1000);

    const res = globalPvrEngine.scheduleRecording({
      channelId: newChannelName.toLowerCase().replace(/\s+/g, '_'),
      channelName: newChannelName,
      programTitle: newProgramTitle,
      startTime: start,
      endTime: end,
      preRollMinutes: 3,
      postRollMinutes: 10,
    });

    if (res.conflict) {
      setLastConflictMsg(res.conflict.conflictingRecordings[0]?.reason || 'Recording conflict detected');
    }

    refreshData();
  };

  const handleCancel = (id: string) => {
    globalPvrEngine.cancelRecording(id);
    refreshData();
  };

  const handleDelete = (id: string) => {
    globalPvrEngine.deleteRecording(id);
    refreshData();
  };

  const handleTimeshiftPause = () => {
    globalPvrEngine.pauseTimeshift();
    refreshData();
  };

  const handleTimeshiftResume = () => {
    globalPvrEngine.resumeTimeshift();
    refreshData();
  };

  const handleTimeshiftSeek = (offsetSec: number) => {
    globalPvrEngine.seekTimeshift(offsetSec);
    refreshData();
  };

  const handleTimeshiftJumpLive = () => {
    globalPvrEngine.jumpToLive();
    refreshData();
  };

  const handlePruneStorage = () => {
    globalPvrEngine.pruneOldRecordings(50 * 1024 * 1024 * 1024);
    refreshData();
  };

  return (
    <div id="pvr-recording-manager-surface" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-400" />
              Milestone 12: DVR, Cloud &amp; Local PVR Scheduler &amp; Live Timeshift Buffer
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Automated conflict resolution for single-connection quotas, 2-hour live circular timeshift scrubbing, and LRU storage quota management.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-950 text-indigo-300 border border-indigo-700 rounded-full text-xs font-semibold">
              Max Stream Concurrency: 1 (Strict)
            </span>
          </div>
        </div>
      </div>

      {/* Storage Quota Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
          <div className="text-xs text-slate-400 flex items-center justify-between">
            <span>Storage Capacity</span>
            <HardDrive className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {(quota.totalCapacityBytes / (1024 * 1024 * 1024)).toFixed(0)} GB NVMe
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all ${quota.usagePercent > 80 ? 'bg-rose-500' : quota.usagePercent > 50 ? 'bg-amber-500' : 'bg-indigo-500'}`}
              style={{ width: `${quota.usagePercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>{(quota.usedBytes / (1024 * 1024 * 1024)).toFixed(1)} GB Used</span>
            <span>{quota.usagePercent}%</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Total Recordings</div>
          <div className="text-xl font-bold text-slate-100 font-mono">{recordings.length}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Auto-Prune Oldest Active
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Free Space Remaining</div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {(quota.freeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB
          </div>
          <button
            onClick={handlePruneStorage}
            className="text-[10px] text-slate-400 hover:text-indigo-300 underline"
          >
            Prune Old Completed Files
          </button>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
          <div className="text-xs text-slate-400">Timeshift Ring Buffer</div>
          <div className="text-xl font-bold text-cyan-400 font-mono">
            {timeshift ? `${Math.round(timeshift.currentBufferDurationSec / 60)}m / 120m` : 'Inactive'}
          </div>
          <div className="text-[10px] text-slate-400">
            Memory footprint: ~{timeshift?.bufferSizeMB || 0} MB RAM/SSD
          </div>
        </div>
      </div>

      {/* Main Grid: Timeshift Controller + Scheduler Form + Recordings Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeshift Live Buffer Controller */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Live TV Timeshift Buffer Controller
              </h3>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${timeshift?.isPaused ? 'bg-amber-950 text-amber-300 border border-amber-800' : timeshift?.currentLiveOffsetSec === 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'}`}>
                {timeshift?.isPaused ? 'PAUSED' : timeshift?.currentLiveOffsetSec === 0 ? 'LIVE EDGE' : 'TIMESHIFTING'}
              </span>
            </div>

            {timeshift && (
              <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-semibold">{timeshift.channelName}</span>
                  <span className="font-mono text-cyan-400">
                    {timeshift.currentLiveOffsetSec === 0 ? '0s (Live)' : `${timeshift.currentLiveOffsetSec}s from Live`}
                  </span>
                </div>

                {/* Timeshift visual scrubber */}
                <div className="space-y-1">
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden relative border border-slate-800">
                    {/* Ring Buffer Fill */}
                    <div
                      className="h-full bg-cyan-950"
                      style={{ width: `${Math.min(100, (timeshift.currentBufferDurationSec / timeshift.maxBufferDurationSec) * 100)}%` }}
                    />
                    {/* Playhead position */}
                    <div
                      className="absolute top-0 bottom-0 w-2 bg-cyan-400 shadow-md"
                      style={{
                        right: `${Math.max(0, Math.min(100, (-timeshift.currentLiveOffsetSec / timeshift.currentBufferDurationSec) * 100))}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>- {Math.round(timeshift.currentBufferDurationSec / 60)} min (Oldest Buffer)</span>
                    <span className="text-emerald-400 font-bold">● LIVE EDGE</span>
                  </div>
                </div>

                {/* Quick Scrub Controls */}
                <div className="grid grid-cols-4 gap-2 text-xs pt-1">
                  <button
                    onClick={() => handleTimeshiftSeek(timeshift.currentLiveOffsetSec - 300)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-mono text-center"
                  >
                    -5 min
                  </button>
                  <button
                    onClick={() => handleTimeshiftSeek(timeshift.currentLiveOffsetSec - 60)}
                    className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-mono text-center"
                  >
                    -1 min
                  </button>
                  {timeshift.isPaused ? (
                    <button
                      onClick={handleTimeshiftResume}
                      className="p-2 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-medium flex items-center justify-center gap-1"
                    >
                      <Play className="w-3.5 h-3.5" /> Play
                    </button>
                  ) : (
                    <button
                      onClick={handleTimeshiftPause}
                      className="p-2 bg-amber-600 hover:bg-amber-500 rounded text-white font-medium flex items-center justify-center gap-1"
                    >
                      <Pause className="w-3.5 h-3.5" /> Pause
                    </button>
                  )}
                  <button
                    onClick={handleTimeshiftJumpLive}
                    className="p-2 bg-indigo-600 hover:bg-indigo-500 rounded text-white font-medium text-center"
                  >
                    Jump Live
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Schedule New Recording Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              Schedule New EPG Recording
            </h3>

            {lastConflictMsg && (
              <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-lg text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{lastConflictMsg}</span>
              </div>
            )}

            <form onSubmit={handleScheduleRecording} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Target Channel:</label>
                <select
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                >
                  <option value="Sky Sports F1 HD">Sky Sports F1 HD</option>
                  <option value="BBC One HD">BBC One HD</option>
                  <option value="TNT Sports 1 HD">TNT Sports 1 HD</option>
                  <option value="HBO Max Cinema">HBO Max Cinema</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Program Title:</label>
                <input
                  type="text"
                  value={newProgramTitle}
                  onChange={(e) => setNewProgramTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Starts In (min):</label>
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={newMinutesFromNow}
                    onChange={(e) => setNewMinutesFromNow(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Duration (min):</label>
                  <input
                    type="number"
                    min="5"
                    max="360"
                    value={newDurationMinutes}
                    onChange={(e) => setNewDurationMinutes(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium transition-colors"
              >
                Schedule Timer with Pre/Post Margin
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Scheduled, Active & Completed Recordings List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                DVR Recording Queue &amp; Completed Library ({recordings.length})
              </span>
              <span className="text-xs text-slate-400 font-normal">Pre-roll: 3m • Post-roll: 10m</span>
            </h3>

            <div className="space-y-3">
              {recordings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  No scheduled or completed recordings. Use the scheduler form to queue a stream capture.
                </div>
              ) : (
                recordings.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                        <span>{rec.programTitle}</span>
                        <span className="text-xs font-normal text-slate-400 font-sans">on {rec.channelName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase ${
                            rec.status === 'completed'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : rec.status === 'recording'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
                              : rec.status === 'conflict'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {rec.status}
                        </span>
                        {rec.status === 'scheduled' && (
                          <button
                            onClick={() => handleCancel(rec.id)}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 text-[11px]"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(rec.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Window: {rec.effectiveStart.toLocaleTimeString()} - {rec.effectiveEnd.toLocaleTimeString()} ({rec.durationMinutes} min)</span>
                      <span>Storage: <code className="text-slate-300">{rec.storageType}</code></span>
                    </div>

                    {rec.errorReason && (
                      <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{rec.errorReason}</span>
                      </div>
                    )}

                    {rec.fileSizeBytes && rec.status === 'completed' && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>File Size: {(rec.fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB</span>
                        <span>Path: {rec.outputFilePath}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

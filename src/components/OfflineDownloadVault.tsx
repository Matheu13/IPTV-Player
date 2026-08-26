import React, { useState, useEffect } from 'react';
import {
  DownloadCloud,
  HardDrive,
  Lock,
  Clock,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Film,
  Tv,
  Radio,
  FileCode,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  globalOfflineDownloadEngine,
  OfflineMediaItem,
  OfflineStorageStats,
  VideoQuality,
} from '../lib/offlineDownloadEngine';

export const OfflineDownloadVault: React.FC = () => {
  const [items, setItems] = useState<OfflineMediaItem[]>([]);
  const [stats, setStats] = useState<OfflineStorageStats>(globalOfflineDownloadEngine.getStorageStats());
  const [selectedItemForVerification, setSelectedItemForVerification] = useState<OfflineMediaItem | null>(null);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);

  // New download modal state
  const [showEnqueueModal, setShowEnqueueModal] = useState(false);
  const [title, setTitle] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [sourceType, setSourceType] = useState<'VOD' | 'SERIES_EPISODE' | 'CATCHUP_REPLAY'>('VOD');
  const [quality, setQuality] = useState<VideoQuality>('1080p_FHD');

  useEffect(() => {
    const update = () => {
      setItems(globalOfflineDownloadEngine.getAllItems());
      setStats(globalOfflineDownloadEngine.getStorageStats());
    };

    update();
    const unsub = globalOfflineDownloadEngine.subscribe(update);
    return () => unsub();
  }, []);

  const handleEnqueue = () => {
    if (!title.trim()) return;
    globalOfflineDownloadEngine.enqueueDownload({
      title: title.trim(),
      streamUrl: streamUrl.trim() || 'http://provider.panel.net:8080/movie/user/pass/sample.mp4',
      sourceType,
      quality,
    });
    setShowEnqueueModal(false);
    setTitle('');
    setStreamUrl('');
  };

  const handleVerifyIntegrity = (item: OfflineMediaItem) => {
    const res = globalOfflineDownloadEngine.verifyEncryptedChunkIntegrity(item.id);
    setSelectedItemForVerification(item);
    setVerificationResult(res);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes >= 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-indigo-950 text-indigo-400 border border-indigo-800">
              Milestone 17
            </span>
            <h2 className="text-xl font-bold text-slate-100">
              Offline Encrypted Download Vault &amp; DRM Lease Manager
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Segment downloading with PTS continuity stitcher, device-bound AES-128-CBC encryption, 48-hour rental lease tracking, and storage quota budgeting.
          </p>
        </div>

        <button
          onClick={() => setShowEnqueueModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-950/50 transition-all shrink-0"
        >
          <DownloadCloud className="w-4 h-4" />
          Queue New Download
        </button>
      </div>

      {/* Storage & Lease Quota Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-indigo-400" /> Storage Utilization
            </span>
            <span className="font-mono font-bold text-slate-200">{stats.utilizationPercent}%</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-300 ${
                stats.utilizationPercent > 85 ? 'bg-rose-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(100, stats.utilizationPercent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-500">
            <span>Used: {formatBytes(stats.usedStorageBytes)}</span>
            <span>Quota: {formatBytes(stats.allocatedQuotaBytes)}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Completed Vault Items
          </div>
          <div className="text-xl font-bold text-slate-100 mt-2 font-mono">
            {stats.completedItemsCount} <span className="text-xs text-slate-500 font-normal">Stored Media Files</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <DownloadCloud className="w-4 h-4 text-cyan-400" /> Active Downloads
          </div>
          <div className="text-xl font-bold text-cyan-300 mt-2 font-mono">
            {stats.activeDownloadsCount} <span className="text-xs text-slate-500 font-normal">Concurrent Fetch</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-amber-400" /> DRM Encryption Engine
          </div>
          <div className="text-xs font-bold text-emerald-400 mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Device-Bound AES-128 / ChaCha20
          </div>
        </div>
      </div>

      {/* Enqueue Modal */}
      {showEnqueueModal && (
        <div className="bg-slate-900 border border-indigo-800/80 rounded-xl p-5 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <DownloadCloud className="w-4 h-4 text-indigo-400" />
              Queue Stream for Offline Encrypted Storage
            </h3>
            <button
              onClick={() => setShowEnqueueModal(false)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-800 rounded"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Title / Episode Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Oppenheimer (2023) [1080p IMAX]"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Media Source Type</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="VOD">VOD Movie (Single Container)</option>
                <option value="SERIES_EPISODE">TV Series Episode</option>
                <option value="CATCHUP_REPLAY">Catchup DVR Archive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Stream URL / Manifest</label>
              <input
                type="text"
                value={streamUrl}
                onChange={(e) => setStreamUrl(e.target.value)}
                placeholder="http://provider.panel.net:8080/movie/user/pass/101.mp4"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">Download Quality</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="1080p_FHD">1080p FHD (High Bitrate ~2.5 GB)</option>
                <option value="720p_HD">720p HD (Balanced ~1.2 GB)</option>
                <option value="480p_SD">480p SD (Compact ~600 MB)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setShowEnqueueModal(false)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleEnqueue}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold shadow"
            >
              Start Encrypted Download
            </button>
          </div>
        </div>
      )}

      {/* Item List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Lock className="w-4 h-4 text-indigo-400" />
          Offline Media Vault ({items.length} Items)
        </h3>

        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                  {item.sourceType === 'VOD' ? (
                    <Film className="w-6 h-6 text-indigo-400" />
                  ) : item.sourceType === 'SERIES_EPISODE' ? (
                    <Tv className="w-6 h-6 text-cyan-400" />
                  ) : (
                    <Radio className="w-6 h-6 text-amber-400" />
                  )}
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-200 truncate">{item.title}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-indigo-400">
                      {item.quality.replace('_', ' ')}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400">
                      {item.encryptionAlgorithm}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap">
                    <span>Size: {formatBytes(item.downloadedBytes)}</span>
                    {item.status === 'COMPLETED' && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Clock className="w-3 h-3" /> Lease: {item.remainingLeaseHours}h remaining
                      </span>
                    )}
                    {item.status === 'EXPIRED' && (
                      <span className="flex items-center gap-1 text-rose-400 font-bold">
                        <AlertTriangle className="w-3 h-3" /> DRM Rental Expired
                      </span>
                    )}
                    {item.downloadSpeedBytesPerSec > 0 && (
                      <span className="text-cyan-400">
                        Speed: {(item.downloadSpeedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s
                      </span>
                    )}
                  </div>

                  {/* Progress bar if downloading */}
                  {item.status !== 'COMPLETED' && item.status !== 'EXPIRED' && (
                    <div className="w-full max-w-xs bg-slate-900 h-1.5 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-300"
                        style={{ width: `${item.progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  onClick={() => handleVerifyIntegrity(item)}
                  title="Verify DRM Cryptographic Signature"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded text-xs font-medium transition flex items-center gap-1"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Verify
                </button>

                {item.status === 'DOWNLOADING_SEGMENTS' && (
                  <button
                    onClick={() => globalOfflineDownloadEngine.pauseDownload(item.id)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                )}

                {item.status === 'PAUSED' && (
                  <button
                    onClick={() => globalOfflineDownloadEngine.resumeDownload(item.id)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>
                )}

                {item.status === 'EXPIRED' && (
                  <button
                    onClick={() => globalOfflineDownloadEngine.renewRentalLease(item.id, 48)}
                    className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded text-xs font-semibold"
                  >
                    <RotateCcw className="w-3 h-3 inline mr-1" /> Renew 48h
                  </button>
                )}

                <button
                  onClick={() => globalOfflineDownloadEngine.deleteItem(item.id)}
                  title="Delete from Offline Vault"
                  className="p-1.5 rounded bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Drawer */}
      {selectedItemForVerification && verificationResult && (
        <div className="bg-slate-900 border border-indigo-800 rounded-xl p-5 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Cryptographic DRM &amp; Chunk Integrity Report
            </h4>
            <button
              onClick={() => setSelectedItemForVerification(null)}
              className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-800 rounded"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">Device Node Match</div>
              <div className="text-emerald-400 font-bold mt-1">
                {verificationResult.deviceMatch ? 'VALID_DEVICE_BOUND' : 'MISMATCH'}
              </div>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">Chunk Hash Validation</div>
              <div className="text-indigo-300 font-bold mt-1">{verificationResult.hashValidation}</div>
            </div>
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <div className="text-[10px] text-slate-500">Cipher Protocol</div>
              <div className="text-slate-200 font-bold mt-1">
                {selectedItemForVerification.encryptionAlgorithm}
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 bg-slate-950 p-2.5 rounded border border-slate-800">
            {verificationResult.details}
          </p>
        </div>
      )}
    </div>
  );
};

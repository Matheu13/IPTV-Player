import React from 'react';
import { Milestone0DiagnosticReport } from '../types';
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, HardDrive, Radio, FileCode2, Layers, Zap } from 'lucide-react';

interface Props {
  report: Milestone0DiagnosticReport | null;
  onRunNewProbe: () => void;
}

export const DiagnosticReportView: React.FC<Props> = ({ report, onRunNewProbe }) => {
  if (!report) {
    return (
      <div id="empty-report-state" className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400">
        <p className="text-lg font-medium text-slate-200">No Diagnostic Report Loaded</p>
        <p className="mt-1 text-sm text-slate-400">Run a diagnostic probe or load the simulated test report to inspect provider protocol behavior.</p>
        <button
          id="btn-trigger-probe-from-empty"
          onClick={onRunNewProbe}
          className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition"
        >
          Run Diagnostic Probe
        </button>
      </div>
    );
  }

  const authData = report.auth.data;
  const isExpired = authData?.status === 'Expired';
  const isBanned = authData?.status === 'Banned';
  const isDisabled = authData?.status === 'Disabled';
  const isActive = authData?.status === 'Active';

  return (
    <div id="diagnostic-report-container" className="space-y-6">
      {/* Bouquet Anomaly Alert Banner (The specific bug requested) */}
      {report.categories.bouquetAnomalyDetected && (
        <div id="bouquet-anomaly-alert" className="p-4 bg-amber-950/40 border border-amber-600/40 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-amber-200 font-semibold text-sm">
              Critical Provider Anomaly Detected: <span className="font-mono bg-amber-900/60 px-1.5 py-0.5 rounded text-xs">get_live_categories = []</span>
            </h4>
            <p className="text-xs text-amber-300/90 leading-relaxed">
              Authentication succeeded with status <span className="font-semibold text-emerald-400">"{authData?.status}"</span>, but the provider returned 0 categories.
              <strong className="block mt-1">Root Cause:</strong> The reseller panel account lacks bouquet / category package assignment on the backend server. Client-side code cannot fabricate missing bouquets; channel list must be indexed directly via <span className="font-mono text-amber-200">get_live_streams</span> or assigned a default category.
            </p>
          </div>
        </div>
      )}

      {/* Top Stat Cards */}
      <div id="report-stat-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Auth Status Card */}
        <div id="stat-card-auth" className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Account Status</span>
            {isActive ? (
              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Active
              </span>
            ) : isExpired ? (
              <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-950/60 border border-amber-800/60 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3.5 h-3.5" /> Expired
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold bg-rose-950/60 border border-rose-800/60 px-2 py-0.5 rounded-full">
                <XCircle className="w-3.5 h-3.5" /> {authData?.status || 'Failed'}
              </span>
            )}
          </div>
          <div className="mt-2 text-xl font-bold text-slate-100">{authData?.status || 'N/A'}</div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            Exp: {authData?.exp_date_human ? new Date(authData.exp_date_human).toLocaleDateString() : 'Unlimited / None'}
          </div>
        </div>

        {/* Connection Accounting Card */}
        <div id="stat-card-connections" className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Connection Limit</span>
            <span className="text-xs text-indigo-400 font-semibold bg-indigo-950/60 border border-indigo-800/60 px-2 py-0.5 rounded-full">
              Strict Max: 1
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-100">
            {authData?.active_cons ?? 0} <span className="text-sm font-normal text-slate-400">/ {authData?.max_connections ?? 1} active</span>
          </div>
          <div className="mt-1 text-xs text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Single connection teardown enforced</span>
          </div>
        </div>

        {/* Categories & Streams Card */}
        <div id="stat-card-streams" className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Live Inventory</span>
            <span className="text-xs text-cyan-400 font-mono bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full">
              {report.categories.count} Cats
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-100">
            {report.streams.count.toLocaleString()} <span className="text-sm font-normal text-slate-400">Streams</span>
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            Formats: [{authData?.allowed_output_formats?.join(', ') || 'ts, m3u8'}]
          </div>
        </div>

        {/* Detected Stream Type Card */}
        <div id="stat-card-type" className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Byte Sniff Verdict</span>
            <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
              .{report.overallAssessment.preferredFormat}
            </span>
          </div>
          <div className="mt-2 text-xl font-bold text-slate-100">
            {report.overallAssessment.streamType}
          </div>
          <div className="mt-1 text-xs text-slate-400 truncate">
            {report.overallAssessment.fallbackFormat ? `Fallback: .${report.overallAssessment.fallbackFormat}` : 'No fallback needed'}
          </div>
        </div>
      </div>

      {/* Stream Probes & Byte Sniff Matrix */}
      <div id="stream-probe-matrix-section" className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-slate-200">Stream Probing & Byte Sniffer Matrix</h3>
          </div>
          <span className="text-xs text-slate-400">HTTP HEAD probe + GET Range 0-2047 byte sniff</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-950/50">
                <th className="p-3">Format</th>
                <th className="p-3">Redacted Stream URL</th>
                <th className="p-3">HEAD / Fallback</th>
                <th className="p-3">GET Range (Bytes)</th>
                <th className="p-3">Detected Type</th>
                <th className="p-3">0x47 Syncs (MPEG-TS)</th>
                <th className="p-3">HLS #EXTM3U</th>
                <th className="p-3">Playback Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {report.streamProbes.map((probe, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30 transition">
                  <td className="p-3 font-semibold text-indigo-400">.{probe.format}</td>
                  <td className="p-3 text-slate-300 max-w-xs truncate" title={probe.url}>
                    {probe.url}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] ${
                      typeof probe.headStatus === 'number' && probe.headStatus >= 200 && probe.headStatus < 300
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : 'bg-amber-950 text-amber-400 border border-amber-800'
                    }`}>
                      {probe.headStatus} ({probe.headMethodUsed === 'HEAD' ? 'HEAD' : 'GET Range fallback'})
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">
                    {probe.getRangeStatus} ({probe.bytesReceived} B, {probe.latencyMs}ms)
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      probe.sniffResult.detectedType === 'MPEG-TS'
                        ? 'bg-blue-950 text-blue-400 border border-blue-800'
                        : probe.sniffResult.detectedType === 'HLS'
                        ? 'bg-purple-950 text-purple-400 border border-purple-800'
                        : probe.sniffResult.detectedType === 'HTML-INTERSTITIAL'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {probe.sniffResult.detectedType}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">
                    {probe.sniffResult.isMpegTs188 ? (
                      <span className="text-emerald-400 font-semibold">
                        ✓ {probe.sniffResult.syncByteCount} syncs @ 188B
                      </span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-300">
                    {probe.sniffResult.isHls ? (
                      <span className="text-purple-400 font-semibold">✓ #EXTM3U</span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="p-3">
                    {probe.usableForPlayback ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Usable
                      </span>
                    ) : (
                      <span className="text-rose-400 font-semibold flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Invalid
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plain Statement on Stream Types & Demuxer Implications */}
      <div id="demuxer-implications-card" className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-semibold text-slate-200">Demuxer Architecture & Native Playback Implications</h3>
        </div>
        <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-lg text-sm text-slate-300 leading-relaxed space-y-2">
          <p>
            <strong className="text-slate-100">Plain Statement of Stream Type: </strong>
            {report.overallAssessment.streamType === 'MIXED' ? (
              <span>Your provider streams are available in both <strong className="text-purple-300">HLS (.m3u8)</strong> and <strong className="text-blue-300">Raw MPEG-TS (.ts)</strong> containers.</span>
            ) : report.overallAssessment.streamType === 'HLS' ? (
              <span>Your provider streams are strictly <strong className="text-purple-300">HLS (.m3u8)</strong> manifest-based playlists.</span>
            ) : report.overallAssessment.streamType === 'RAW_MPEG_TS' ? (
              <span>Your provider streams are strictly <strong className="text-blue-300">Raw MPEG-TS (.ts)</strong> continuous 188-byte packet streams.</span>
            ) : (
              <span className="text-rose-400">Stream type could not be verified due to provider error or network block.</span>
            )}
          </p>
          <p className="text-slate-400 text-xs font-mono bg-slate-900 p-3 rounded border border-slate-800">
            {report.overallAssessment.demuxerConfiguration}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-900/60 rounded border border-slate-800/60">
              <strong className="text-indigo-300 block mb-1">For HLS (.m3u8):</strong>
              Demuxer parses media playlist segments on the fly. Seeking is chunk-accurate, bandwidth fluctuation triggers adaptive bitrate shifts, and network stall recovery is handled per chunk.
            </div>
            <div className="p-3 bg-slate-900/60 rounded border border-slate-800/60">
              <strong className="text-indigo-300 block mb-1">For Raw MPEG-TS (.ts):</strong>
              Demuxer listens to 188-byte packet stream starting with 0x47 sync bytes. Requires low jitter buffer, continuous PID demuxing, and timestamp reset tolerance (<span className="font-mono text-slate-300">ts-discont</span> flag in mpv/ffmpeg).
            </div>
          </div>
        </div>
      </div>

      {/* First 3 Streams Sample */}
      {report.streams.firstThree.length > 0 && (
        <div id="streams-sample-card" className="p-5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-semibold text-slate-200">First 3 Live Stream Entries (Redacted)</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Total Streams: {report.streams.count}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {report.streams.firstThree.map((stream, idx) => (
              <div key={idx} className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-cyan-400">ID: {stream.stream_id}</span>
                  <span className="text-slate-500 font-mono">#{stream.num || idx + 1}</span>
                </div>
                <div className="font-semibold text-slate-200 truncate">{stream.name}</div>
                <div className="text-slate-400 text-[11px] truncate">EPG: {stream.epg_channel_id || 'None'}</div>
                <div className="text-slate-500 text-[11px]">Category: {stream.category_id || 'Unassigned'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Redacted Diagnostic File Info */}
      <div id="diagnostic-file-info" className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <FileCode2 className="w-4 h-4 text-emerald-400" />
          <span>Full diagnostic output saved to disk with permission <span className="font-mono text-emerald-400">mode 0600</span>: <code className="text-slate-300">diagnostics_output_0600.json</code></span>
        </div>
        <span className="text-slate-500 font-mono">Timestamp: {new Date(report.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};

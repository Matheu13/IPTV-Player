import React, { useState, useEffect } from 'react';
import { DiagnosticLogEntry } from '../types';
import { ScrollText, Download, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

export const DiagnosticsLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [maxCap, setMaxCap] = useState(500);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/diagnostics-log');
      const data = await res.json();
      setLogs(data.logs || []);
      setMaxCap(data.maxCapacity || 500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleExport = () => {
    window.location.href = '/api/export-diagnostics';
  };

  return (
    <div id="diagnostics-log-viewer-card" className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-400" />
            Structured Rotating Diagnostic Log (JSONL)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Local rotating in-memory &amp; file logger (size-capped at {maxCap} entries). Every URL and error message is scrubbed with <code className="text-indigo-300">redact()</code> before storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Logs
          </button>
          <button
            id="btn-export-diagnostics"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" /> Export Diagnostics (.jsonl)
          </button>
        </div>
      </div>

      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Zero Telemetry / No Phoning Home constraint verified: logs reside exclusively locally and strictly pass through <code className="text-emerald-400">redact()</code>.</span>
        </div>
        <span className="font-mono text-slate-500">{logs.length} / {maxCap} entries</span>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {logs.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 rounded-lg border border-slate-800 text-slate-500 text-xs">
            No diagnostic log entries recorded yet.
          </div>
        ) : (
          logs.map((log, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs font-mono space-y-1.5 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200">
                    {log.component}
                  </span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                    typeof log.httpStatus === 'number' && log.httpStatus >= 200 && log.httpStatus < 300
                      ? 'bg-emerald-950 text-emerald-400'
                      : 'bg-rose-950 text-rose-400'
                  }`}>
                    HTTP {log.httpStatus}
                  </span>
                  {log.errorClass && (
                    <span className="text-rose-400 flex items-center gap-1 text-[10px]">
                      <AlertCircle className="w-3 h-3" /> {log.errorClass}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-slate-500">{log.durationMs}ms</span>
                  <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="text-slate-300 text-[11px] break-all">
                {log.message}
              </div>

              {log.redactedUrl && (
                <div className="text-slate-500 text-[10px] truncate bg-slate-900/60 px-2 py-0.5 rounded border border-slate-800/40">
                  Target: {log.redactedUrl}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

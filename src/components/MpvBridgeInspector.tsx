import React, { useState, useEffect } from 'react';
import { Terminal, Send, CheckCircle2, Cpu, RefreshCw, Layers, Volume2, Subtitles, Activity } from 'lucide-react';
import { globalMpvBridge, MpvPlaybackStats, MpvVideoParams, MpvTrack, MpvIpcMessage } from '../lib/mpvBridge';

export const MpvBridgeInspector: React.FC = () => {
  const [stats, setStats] = useState<MpvPlaybackStats>(globalMpvBridge.getStats());
  const [params, setParams] = useState<MpvVideoParams>(globalMpvBridge.getVideoParams());
  const [tracks, setTracks] = useState<MpvTrack[]>(globalMpvBridge.getTracks());
  const [ipcLogs, setIpcLogs] = useState<MpvIpcMessage[]>(globalMpvBridge.getIpcLog());
  const [customCmd, setCustomCmd] = useState<string>('set_property');
  const [customArgs, setCustomArgs] = useState<string>('deinterlace, bwdif');

  const refresh = () => {
    setStats(globalMpvBridge.getStats());
    setParams(globalMpvBridge.getVideoParams());
    setTracks(globalMpvBridge.getTracks());
    setIpcLogs(globalMpvBridge.getIpcLog());
  };

  const handleSendCommand = (cmd: string, args: (string | number | boolean)[]) => {
    globalMpvBridge.sendCommand(cmd, args);
    refresh();
  };

  const handleSendCustom = () => {
    const parsedArgs = customArgs
      .split(',')
      .map((a) => a.trim())
      .map((a) => {
        if (a === 'true') return true;
        if (a === 'false') return false;
        if (!isNaN(Number(a))) return Number(a);
        return a;
      });
    globalMpvBridge.sendCommand(customCmd, parsedArgs);
    refresh();
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div id="mpv-bridge-inspector-container" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-slate-100">
            Native MPV IPC Bridge Protocol &amp; HW Acceleration Inspector
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Direct JSON-RPC IPC interface for libmpv / mpv.js. Dispatches low-latency playback commands, monitors hardware video decoders, and controls multi-track audio &amp; subtitle streams.
        </p>
      </div>

      {/* HWDEC & Video Engine HUD */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[10px] uppercase font-mono text-slate-400">HW Acceleration Profile</div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> {stats.hwdec}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Pixel: {params.hwPixelFormat || 'd3d11'}</div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[10px] uppercase font-mono text-slate-400">Deinterlacer Filter</div>
          <div className="text-lg font-bold font-mono text-cyan-300 mt-1">
            {stats.deinterlace.toUpperCase()} (2x FPS)
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Vf: 59.94 / 60.00 fps</div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[10px] uppercase font-mono text-slate-400">Demuxer Buffer Cache</div>
          <div className="text-lg font-bold font-mono text-indigo-300 mt-1">
            {stats.cacheTime.toFixed(1)}s ({(stats.cacheSizeKb / 1024).toFixed(1)} MB)
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Bitrate: {(stats.bitrateKbps / 1000).toFixed(2)} Mbps</div>
        </div>

        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
          <div className="text-[10px] uppercase font-mono text-slate-400">Decoder Dropped Frames</div>
          <div className="text-lg font-bold font-mono text-slate-200 mt-1">
            {stats.droppedFrames} frames
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Surface Jitter: &lt;1.2ms</div>
        </div>
      </div>

      {/* Main Grid: Track Selectors & IPC Console */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audio & Subtitle Track Controller */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-indigo-400" />
            Active Demuxer Stream Tracks
          </h3>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-300">Audio Streams (Switch via MPV <code className="text-indigo-300 font-mono">aid</code>):</div>
            <div className="space-y-1.5">
              {tracks.filter((t) => t.type === 'audio').map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSendCommand('set_property', ['aid', t.id])}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between cursor-pointer ${
                    t.selected
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                      Track #{t.id}
                    </span>
                    <span className="font-medium">{t.title}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">
                    {t.codec?.toUpperCase()} • {t.channels}ch
                  </span>
                </button>
              ))}
            </div>

            <div className="text-xs font-semibold text-slate-300 pt-2">Subtitles / Closed Captions (<code className="text-indigo-300 font-mono">sid</code>):</div>
            <div className="space-y-1.5">
              {tracks.filter((t) => t.type === 'sub').map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSendCommand('set_property', ['sid', t.id])}
                  className={`w-full p-2.5 rounded-lg border text-left text-xs transition flex items-center justify-between cursor-pointer ${
                    t.selected
                      ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300">
                      Track #{t.id}
                    </span>
                    <span className="font-medium">{t.title}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500">{t.lang?.toUpperCase()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time MPV JSON-RPC Console & Dispatcher */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Live MPV IPC Command Log
            </h3>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
              IPC Socket Active
            </span>
          </div>

          {/* Quick Command Injector */}
          <div className="flex gap-2 text-xs">
            <input
              type="text"
              value={customCmd}
              onChange={(e) => setCustomCmd(e.target.value)}
              placeholder="Command (e.g. set_property)"
              className="w-1/3 bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              value={customArgs}
              onChange={(e) => setCustomArgs(e.target.value)}
              placeholder="Args (e.g. hwdec, nvdec)"
              className="flex-1 bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSendCustom}
              className="px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold transition cursor-pointer flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" /> Dispatch
            </button>
          </div>

          {/* Log Messages Display */}
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-[260px] overflow-y-auto space-y-1.5 font-mono text-[11px]">
            {ipcLogs.map((log, idx) => (
              <div key={idx} className="p-1.5 bg-slate-900/90 rounded border border-slate-800/80 flex items-start justify-between gap-2">
                <div className="space-x-1.5">
                  <span className="text-slate-500">#{log.requestId || 'EVT'}</span>
                  <span className="text-indigo-300 font-semibold">{log.command?.join(' ') || log.event}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

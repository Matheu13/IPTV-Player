import React, { useState } from 'react';
import { SniffResult } from '../types';
import { Binary, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

export const ByteSnifferTool: React.FC = () => {
  const [mode, setMode] = useState<'hex' | 'text'>('hex');
  const [input, setInput] = useState<string>(
    '474011100042f0260001c10000ff01ff0001fc80144812010655533a204553504e' +
    '00'.repeat(154) +
    '47401110' + '00'.repeat(184) +
    '47401110' + '00'.repeat(184) +
    '47401110' + '00'.repeat(184)
  );
  const [result, setResult] = useState<SniffResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runSniff = async (customInput?: string, customMode?: 'hex' | 'text') => {
    setIsLoading(true);
    const targetInput = customInput ?? input;
    const targetMode = customMode ?? mode;

    try {
      const res = await fetch('/api/byte-sniff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hexOrText: targetInput, mode: targetMode }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPreset = (type: 'mpegts' | 'hls' | 'html' | 'corrupt') => {
    if (type === 'mpegts') {
      setMode('hex');
      const val = '474011100042f0260001c10000ff01ff0001fc80144812010655533a204553504e' +
        '00'.repeat(154) +
        '47401110' + '00'.repeat(184) +
        '47401110' + '00'.repeat(184) +
        '47401110' + '00'.repeat(184);
      setInput(val);
      runSniff(val, 'hex');
    } else if (type === 'hls') {
      setMode('text');
      const val = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:6\n#EXTINF:6.000,\nstream_001.ts\n#EXTINF:6.000,\nstream_002.ts';
      setInput(val);
      runSniff(val, 'text');
    } else if (type === 'html') {
      setMode('text');
      const val = '<!DOCTYPE html>\n<html>\n<head><title>Cloudflare DDoS Protection</title></head>\n<body>Security verification required before streaming</body>\n</html>';
      setInput(val);
      runSniff(val, 'text');
    } else if (type === 'corrupt') {
      setMode('hex');
      const val = 'a1b2c3d4e5f600112233445566778899aabbccddeeff001122334455';
      setInput(val);
      runSniff(val, 'hex');
    }
  };

  React.useEffect(() => {
    runSniff();
  }, []);

  return (
    <div id="byte-sniffer-tool-card" className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Binary className="w-5 h-5 text-indigo-400" />
          Byte Sniffer & MPEG-TS 0x47 Packet Analyzer
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Hard constraint: Never trust the server's <code className="text-slate-300">Content-Type</code> header. Sniff the raw bytes directly. MPEG-TS requires recurring <code className="text-emerald-400">0x47</code> sync bytes every 188 bytes across ≥3 consecutive positions. HLS starts with <code className="text-purple-400">#EXTM3U</code>.
        </p>
      </div>

      {/* Preset Selector */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium mr-1">Load Byte Pattern:</span>
        <button
          id="btn-preset-mpegts"
          onClick={() => loadPreset('mpegts')}
          className="px-3 py-1.5 bg-blue-950/80 hover:bg-blue-900 border border-blue-800 text-blue-300 rounded-lg font-mono transition"
        >
          MPEG-TS (0x47 @ 188B)
        </button>
        <button
          id="btn-preset-hls"
          onClick={() => loadPreset('hls')}
          className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-800 text-purple-300 rounded-lg font-mono transition"
        >
          HLS (#EXTM3U)
        </button>
        <button
          id="btn-preset-html"
          onClick={() => loadPreset('html')}
          className="px-3 py-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg font-mono transition"
        >
          HTML Interstitial (HTTP 200)
        </button>
        <button
          id="btn-preset-corrupt"
          onClick={() => loadPreset('corrupt')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-mono transition"
        >
          Unrecognized / Corrupt
        </button>
      </div>

      {/* Input area */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-300 font-medium">Input Format:</span>
            <button
              onClick={() => setMode('hex')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono ${mode === 'hex' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              HEX Bytes
            </button>
            <button
              onClick={() => setMode('text')}
              className={`px-2.5 py-1 rounded text-[11px] font-mono ${mode === 'text' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
              ASCII / UTF-8
            </button>
          </div>
          <button
            onClick={() => runSniff()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Sniff Bytes
          </button>
        </div>

        <textarea
          id="input-bytes-buffer"
          rows={5}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
          placeholder={mode === 'hex' ? 'Paste raw hex bytes (e.g. 47401110...)' : 'Paste ASCII text prefix...'}
        />
      </div>

      {/* Sniff Result Card */}
      {result && (
        <div id="sniff-result-card" className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-slate-400 uppercase tracking-wider text-[11px]">Sniff Detection Verdict:</span>
            <span className={`px-2.5 py-1 rounded text-xs font-bold ${
              result.detectedType === 'MPEG-TS'
                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                : result.detectedType === 'HLS'
                ? 'bg-purple-950 text-purple-400 border border-purple-800'
                : result.detectedType === 'HTML-INTERSTITIAL'
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : 'bg-slate-800 text-slate-400'
            }`}>
              {result.detectedType} ({(result.confidence * 100).toFixed(0)}% Confidence)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-900/80 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[11px] mb-1">MPEG-TS 0x47 Syncs</span>
              <div className="text-slate-200 font-bold text-sm">
                {result.isMpegTs188 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> {result.syncByteCount} Consecutive @ 188B
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> None (&lt;3 syncs)
                  </span>
                )}
              </div>
              <div className="text-slate-500 text-[10px] mt-1">Offset: {result.firstSyncOffset >= 0 ? `Byte ${result.firstSyncOffset}` : 'N/A'}</div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[11px] mb-1">HLS Playlist (#EXTM3U)</span>
              <div className="text-slate-200 font-bold text-sm">
                {result.isHls ? (
                  <span className="text-purple-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Detected
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <XCircle className="w-4 h-4" /> Not HLS
                  </span>
                )}
              </div>
              <div className="text-slate-500 text-[10px] mt-1">Manifest parser required</div>
            </div>

            <div className="p-3 bg-slate-900/80 rounded border border-slate-800/80">
              <span className="text-slate-400 block text-[11px] mb-1">HTML Interstitial Alert</span>
              <div className="text-slate-200 font-bold text-sm">
                {result.isHtml ? (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Interstitial Trap
                  </span>
                ) : (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Clean (No HTML)
                  </span>
                )}
              </div>
              <div className="text-slate-500 text-[10px] mt-1">HTTP 200 payload sniff</div>
            </div>
          </div>

          <div className="p-3 bg-slate-900/90 rounded border border-slate-800/80 space-y-1">
            <span className="text-indigo-300 font-semibold text-[11px] block">Demuxer Configuration Directive:</span>
            <p className="text-slate-300 text-xs leading-relaxed font-sans">{result.demuxerNotes}</p>
          </div>
        </div>
      )}
    </div>
  );
};

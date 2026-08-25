import React, { useState } from 'react';
import { Milestone0DiagnosticReport } from '../types';
import { Play, Sparkles, Loader2, Server, KeyRound, User, Radio } from 'lucide-react';

interface Props {
  onProbeCompleted: (report: Milestone0DiagnosticReport) => void;
}

export const LiveProbeRunner: React.FC<Props> = ({ onProbeCompleted }) => {
  const [baseUrl, setBaseUrl] = useState('http://provider.panel-stream.net:8080');
  const [username, setUsername] = useState('test_user_77');
  const [password, setPassword] = useState('pass_secure_99');
  const [streamId, setStreamId] = useState('10452');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunLiveProbe = async (simulate = false) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: simulate ? undefined : baseUrl,
          username: simulate ? undefined : username,
          password: simulate ? undefined : password,
          streamId: simulate ? undefined : streamId,
          simulate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete probe');
      }

      onProbeCompleted(data);
    } catch (err: any) {
      setError(err.message || 'Diagnostic probe failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="live-probe-runner-card" className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <Radio className="w-5 h-5 text-indigo-400" />
          Milestone 0 Protocol Probe & Diagnostic Runner
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Probes raw Xtream Codes endpoints (<code className="text-slate-300">player_api.php</code>), tests stream formats (.ts / .m3u8), sniffs sync bytes, and checks for bouquet assignment bugs. All outputs pass through <code className="text-indigo-300">redact()</code>.
        </p>
      </div>

      {error && (
        <div id="probe-error-banner" className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Base URL */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-400" /> Xtream Provider Base URL
          </label>
          <input
            id="input-probe-baseurl"
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="http://host:port"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Stream ID for Probing */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-slate-400" /> Target Stream ID (Probe Target)
          </label>
          <input
            id="input-probe-streamid"
            type="text"
            value={streamId}
            onChange={(e) => setStreamId(e.target.value)}
            placeholder="e.g. 10452"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Username */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" /> Username
          </label>
          <input
            id="input-probe-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-slate-400" /> Password
          </label>
          <input
            id="input-probe-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          id="btn-run-live-probe"
          disabled={isLoading}
          onClick={() => handleRunLiveProbe(false)}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          Run Live Provider Probe
        </button>

        <button
          id="btn-run-simulated-probe"
          disabled={isLoading}
          onClick={() => handleRunLiveProbe(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-slate-200 rounded-lg text-xs font-semibold transition"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          Load Simulated Diagnostic (MPEG-TS + HLS + Bouquet Anomaly)
        </button>
      </div>

      <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
        <div className="text-slate-300 font-semibold">Diagnostic Execution Pipeline:</div>
        <div>1. Request `player_api.php` without action &rarr; Sniff non-boolean status, exp_date, active_cons, allowed_output_formats.</div>
        <div>2. Request `action=get_live_categories` &rarr; Detect if empty [] despite active status (bouquet assignment bug).</div>
        <div>3. Request `action=get_live_streams` &rarr; Read total stream count and first 3 entries.</div>
        <div>4. Probes stream formats with HTTP HEAD &rarr; Fallback to GET Range 0-2047 &rarr; Byte sniff 0x47 sync bytes / #EXTM3U.</div>
        <div>5. Writes output to `diagnostics_output_0600.json` with mode 0600 &amp; passes every token through `redact()`.</div>
      </div>
    </div>
  );
};

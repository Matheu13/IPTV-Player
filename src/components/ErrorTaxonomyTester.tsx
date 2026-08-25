import React, { useState } from 'react';
import { ShieldAlert, AlertCircle, RefreshCw, CheckCircle2, XCircle, Info, Code, Play } from 'lucide-react';
import { ErrorCode, TaxonomyErrorDetail } from '../lib/errorTaxonomy';

const PRESET_FAILURE_MODES = [
  {
    id: 'expired',
    name: '1. Auth: Expired Status',
    fixture: { user_info: { auth: 1, status: 'Expired', exp_date: '1780272000' } },
    statusCode: 200,
    contentType: 'application/json',
  },
  {
    id: 'banned',
    name: '2. Auth: Banned Status',
    fixture: { user_info: { auth: 0, status: 'Banned', message: 'TOS Concurrency breach' } },
    statusCode: 200,
    contentType: 'application/json',
  },
  {
    id: 'disabled',
    name: '3. Auth: Disabled Status',
    fixture: { user_info: { auth: 0, status: 'Disabled', message: 'Account disabled by admin' } },
    statusCode: 200,
    contentType: 'application/json',
  },
  {
    id: 'bad_credentials',
    name: '4. Auth: Bad Credentials',
    fixture: { user_info: { auth: 0 } },
    statusCode: 200,
    contentType: 'application/json',
  },
  {
    id: 'conn_limit',
    name: '5. Connection Limit Exceeded',
    fixture: { user_info: { auth: 1, status: 'Active', active_cons: '1', max_connections: '1' } },
    statusCode: 200,
    contentType: 'application/json',
  },
  {
    id: 'rate_limit',
    name: '6. HTTP 429 Rate Limit (Backoff)',
    fixture: { status: 429, error: 'Too Many Requests', retry_after_seconds: 60 },
    statusCode: 429,
    contentType: 'application/json',
  },
  {
    id: 'html_interstitial',
    name: '7. HTML Interstitial (Cloudflare / ISP)',
    fixture: '<!DOCTYPE html><html><body><h1>Attention Required! | Cloudflare</h1></body></html>',
    statusCode: 200,
    contentType: 'text/html; charset=UTF-8',
  },
  {
    id: 'truncated_json',
    name: '8. Truncated JSON (Dropped Socket)',
    fixture: '{"user_info":{"status":"Active","exp_date":"1789459200","allowed_output_formats":["ts","m3u',
    statusCode: 200,
    contentType: 'application/json',
  },
  {
    id: 'malformed_json',
    name: '9. Malformed JSON (Server Script Error)',
    fixture: '{"user_info": {status: Active, exp_date: ??? invalid syntax }}}',
    statusCode: 200,
    contentType: 'application/json',
  },
  {
    id: 'network_timeout',
    name: '10. Network Timeout / Server Down',
    fixture: { name: 'AbortError', message: 'The user aborted a request / socket timed out' },
    statusCode: 504,
    contentType: 'application/json',
  },
  {
    id: 'invalid_mime',
    name: '11. Stream Invalid MIME Type',
    fixture: 'Fake audio header on video endpoint',
    statusCode: 200,
    contentType: 'audio/mpeg',
  },
  {
    id: 'empty_bouquet',
    name: '12. Empty Bouquet Category Bug',
    fixture: [],
    statusCode: 200,
    contentType: 'application/json',
  },
];

export const ErrorTaxonomyTester: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<any>(PRESET_FAILURE_MODES[0]);
  const [customPayload, setCustomPayload] = useState<string>(
    JSON.stringify(PRESET_FAILURE_MODES[0].fixture, null, 2)
  );
  const [statusCode, setStatusCode] = useState<number>(200);
  const [contentType, setContentType] = useState<string>('application/json');
  const [result, setResult] = useState<TaxonomyErrorDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSelectPreset = (preset: any) => {
    setSelectedPreset(preset);
    setStatusCode(preset.statusCode);
    setContentType(preset.contentType);
    setCustomPayload(
      typeof preset.fixture === 'string' ? preset.fixture : JSON.stringify(preset.fixture, null, 2)
    );
    classify(preset.fixture, preset.statusCode, preset.contentType);
  };

  const classify = async (payload: any, status: number, cType: string) => {
    setLoading(true);
    try {
      let parsedPayload = payload;
      if (typeof payload === 'string') {
        try {
          parsedPayload = JSON.parse(payload);
        } catch {
          parsedPayload = payload;
        }
      }

      const res = await fetch('/api/m1/classify-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: parsedPayload, statusCode: status, contentType: cType }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Classification failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run on first load
  React.useEffect(() => {
    classify(selectedPreset.fixture, selectedPreset.statusCode, selectedPreset.contentType);
  }, []);

  return (
    <div id="error-taxonomy-tester-container" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-400" />
          <h2 className="text-base font-semibold text-slate-100">
            Milestone 1 Error Taxonomy Laboratory
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Every failure mode receives a distinct, human-actionable message, precision classification, and tailored retry strategy — never a generic "something went wrong".
        </p>
      </div>

      {/* Preset Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {PRESET_FAILURE_MODES.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelectPreset(preset)}
            className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
              selectedPreset.id === preset.id
                ? 'bg-indigo-950/80 border-indigo-500 text-indigo-200 shadow-md shadow-indigo-900/30'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span className="text-xs font-semibold">{preset.name}</span>
            <span className="text-[10px] font-mono text-slate-500 mt-1">HTTP {preset.statusCode} • {preset.contentType.split(';')[0]}</span>
          </button>
        ))}
      </div>

      {/* Interactive Payload Editor & Classification Result */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Raw Input / Server Response</h3>
            <button
              onClick={() => classify(customPayload, statusCode, contentType)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Classify Custom
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Status Code:</label>
              <input
                type="number"
                value={statusCode}
                onChange={(e) => setStatusCode(parseInt(e.target.value, 10))}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Content-Type:</label>
              <input
                type="text"
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 text-xs">Payload (JSON or HTML):</label>
            <textarea
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Classification Output Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-400" />
            Taxonomy Classification &amp; Action Plan
          </h3>

          {result ? (
            <div className="space-y-4 text-xs">
              {/* Classification Badge */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Standardized Error Code</div>
                  <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">{result.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Retry Strategy</div>
                  <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                    result.retryStrategy === 'EXPONENTIAL_BACKOFF'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : result.retryStrategy === 'IMMEDIATE'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {result.retryStrategy}
                  </span>
                </div>
              </div>

              {/* User-Visible Message */}
              <div className="p-3.5 bg-rose-950/30 border border-rose-900/60 rounded-lg space-y-1">
                <div className="font-semibold text-rose-300 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  User-Visible Notification: "{result.userTitle}"
                </div>
                <p className="text-slate-200 text-xs leading-relaxed">{result.userMessage}</p>
              </div>

              {/* Technical Details & Provider Remediation */}
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-[11px]">
                <div>
                  <strong className="text-slate-300 block mb-0.5">Root Cause Details:</strong>
                  <span className="text-slate-400 font-mono">{result.technicalDetails}</span>
                </div>
                <div>
                  <strong className="text-cyan-300 block mb-0.5">Provider Remediation Action:</strong>
                  <span className="text-slate-300">{result.providerRemediation}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 text-xs">Analyzing response...</div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, ArrowRight } from 'lucide-react';

export const RedactPlayground: React.FC = () => {
  const [input, setInput] = useState<string>(
    'http://provider.panel-stream.net:8080/live/john_doe_vip/SuperSecretPass999!/10452.ts'
  );
  const [redactedOutput, setRedactedOutput] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const runRedact = async (val: string) => {
    try {
      let payloadInput: any = val;
      if (val.trim().startsWith('{') || val.trim().startsWith('[')) {
        try {
          payloadInput = JSON.parse(val);
        } catch {
          // treat as string
        }
      }

      const res = await fetch('/api/redact-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: payloadInput }),
      });
      const data = await res.json();
      setRedactedOutput(typeof data.redacted === 'object' ? JSON.stringify(data.redacted, null, 2) : String(data.redacted));
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    runRedact(input);
  }, []);

  const loadExample = (type: 'url' | 'query' | 'json' | 'error') => {
    let example = '';
    if (type === 'url') {
      example = 'http://provider.panel-stream.net:8080/live/john_doe_vip/SuperSecretPass999!/10452.ts';
    } else if (type === 'query') {
      example = 'http://provider.panel-stream.net:8080/player_api.php?username=premium_user&password=mySecretPassword456&action=get_live_categories';
    } else if (type === 'json') {
      example = JSON.stringify(
        {
          user_info: {
            username: 'alpha_streamer_2026',
            password: 'CorrectHorseBatteryStaple',
            token: 'bearer_token_99a8b7',
            auth: 1,
            status: 'Active',
            active_cons: 0,
            max_connections: 1,
          },
          server_info: {
            url: 'stream-edge.provider.net',
            port: '8080',
          },
        },
        null,
        2
      );
    } else if (type === 'error') {
      example = 'Error: Connection refused to http://stream.net:8080/live/my_user/my_pass/55.ts with auth token auth_secret_99';
    }
    setInput(example);
    runRedact(example);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(redactedOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="redact-playground-card" className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Milestone 0 Partial Redaction Engine (<code className="text-indigo-300">redact()</code>)
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Every string, log entry, stream URL, JSON payload, and error message passes through this single filter. Preserves first 2 characters plus short sha256 hash (<code className="text-emerald-300">jo…a83f</code>) so you can debug credential mismatches without leaking secrets to disk or terminal scrollback.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 font-medium mr-1">Try Preset:</span>
        <button
          onClick={() => loadExample('url')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-mono transition"
        >
          Xtream Positional URL (/live/user/pass/id.ts)
        </button>
        <button
          onClick={() => loadExample('query')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-mono transition"
        >
          Query String API (?username=...&amp;password=...)
        </button>
        <button
          onClick={() => loadExample('json')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-mono transition"
        >
          Nested JSON Auth Object
        </button>
        <button
          onClick={() => loadExample('error')}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg font-mono transition"
        >
          Error Stack with Embedded URLs
        </button>
      </div>

      {/* Side-by-side or stacked diff view */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Raw Input */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-rose-300">Raw Input (Contains Secrets)</span>
            <span className="text-[11px]">Never written to disk/logs</span>
          </div>
          <textarea
            id="input-redact-raw"
            rows={8}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              runRedact(e.target.value);
            }}
            className="w-full bg-slate-950 border border-rose-900/40 rounded-lg p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
            placeholder="Type or paste any URL, JSON, or text containing credentials..."
          />
        </div>

        {/* Redacted Output */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Redacted Output (<code className="text-emerald-300">ab…7f3c</code>)
            </span>
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <pre
            id="output-redact-result"
            className="w-full bg-slate-950 border border-emerald-900/40 rounded-lg p-3 text-xs text-emerald-300 font-mono overflow-auto h-[178px] whitespace-pre-wrap"
          >
            {redactedOutput}
          </pre>
        </div>
      </div>

      <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1 font-mono">
        <div className="text-slate-300 font-semibold">Redaction Rules Enforced:</div>
        <div>• Positional URL segments: 2nd (<span className="text-indigo-300">username</span>) and 3rd (<span className="text-indigo-300">password</span>) path segments are partially masked.</div>
        <div>• Query parameters: <span className="text-indigo-300">username</span>, <span className="text-indigo-300">password</span>, <span className="text-indigo-300">token</span>, <span className="text-indigo-300">auth*</span>, <span className="text-indigo-300">secret</span> are redacted.</div>
        <div>• Partial hashing: first 2 chars + deterministic 4-character hex hash enables matching vs mismatch verification without leaking secrets.</div>
      </div>
    </div>
  );
};

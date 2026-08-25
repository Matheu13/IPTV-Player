import React, { useState, useEffect } from 'react';
import { FileCode, CheckCircle, AlertTriangle, Bug, HardDrive, RefreshCw } from 'lucide-react';

export const FixturesViewer: React.FC = () => {
  const [fixturesData, setFixturesData] = useState<Record<string, any>>({});
  const [selectedFile, setSelectedFile] = useState<string>('categories_empty.json');
  const [directory, setDirectory] = useState<string>('tests/fixtures');
  const [isLoading, setIsLoading] = useState(false);

  const fetchFixtures = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/fixtures');
      const data = await res.json();
      setFixturesData(data.fixtures || {});
      setDirectory(data.directory || 'tests/fixtures');
      if (data.fixtures && !data.fixtures[selectedFile]) {
        setSelectedFile(Object.keys(data.fixtures)[0] || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFixtures();
  }, []);

  const files = Object.keys(fixturesData).sort();

  return (
    <div id="fixtures-viewer-card" className="p-6 bg-slate-900/80 border border-slate-800 rounded-xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-400" />
            Milestone 0 Scrubbed Test Fixtures Vault
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real scrubbed provider responses + hand-written pathological failure modes saved in <code className="text-indigo-300">tests/fixtures/</code> for Milestone 1 test runner.
          </p>
        </div>
        <button
          onClick={fetchFixtures}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh Fixtures
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* File List */}
        <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block px-2 pb-2">
            Fixtures ({files.length} Files)
          </span>
          <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
            {files.map((file) => {
              const isSelected = file === selectedFile;
              const isBugCase = file === 'categories_empty.json';
              const isError = file.startsWith('error_');
              const isAuth = file.startsWith('auth_');

              return (
                <button
                  key={file}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono flex items-center justify-between transition ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 font-semibold'
                      : 'hover:bg-slate-900 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {isBugCase ? (
                      <Bug className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : isError ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    ) : isAuth ? (
                      <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <span className="truncate">{file}</span>
                  </span>
                  {isBugCase && (
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 py-0.2 rounded border border-amber-800">
                      Bug Case
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* File Content Preview */}
        <div className="lg:col-span-2 space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Viewing:</span>
              <span className="font-mono text-indigo-300 font-semibold">{selectedFile}</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Mode: 0600 (Scrubbed)</span>
          </div>

          {selectedFile === 'categories_empty.json' && (
            <div className="p-3 bg-amber-950/40 border border-amber-700/40 rounded text-xs text-amber-300 space-y-1">
              <strong>The Exact Bouquet Anomaly Fixture:</strong>
              <p className="text-[11px] text-amber-200/90">
                This fixture mimics when auth returns <code className="bg-amber-900/60 px-1 rounded">Active</code>, but <code className="bg-amber-900/60 px-1 rounded">get_live_categories</code> yields an empty array <code className="bg-amber-900/60 px-1 rounded">[]</code>. Milestone 1 tests will assert that the player handles this without crashing, falling back to direct stream enumeration.
              </p>
            </div>
          )}

          <pre className="text-xs font-mono text-slate-300 bg-slate-900/90 p-3 rounded-lg overflow-auto max-h-[340px] whitespace-pre-wrap">
            {typeof fixturesData[selectedFile] === 'object'
              ? JSON.stringify(fixturesData[selectedFile], null, 2)
              : String(fixturesData[selectedFile] || 'No content')}
          </pre>
        </div>
      </div>
    </div>
  );
};

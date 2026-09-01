import React, { useState, useEffect } from 'react';
import {
  Tv,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Cpu,
  Sliders,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  FirestickDiagnosticsEngine,
  FirestickDiagnosticsReport,
  DiagnosticPropertyComparison,
} from '../lib/firestickDiagnostics';

interface FirestickDiagnosticsDashboardProps {
  customUa?: string;
  onRefresh?: () => void;
}

export const FirestickDiagnosticsDashboard: React.FC<FirestickDiagnosticsDashboardProps> = ({
  customUa,
  onRefresh,
}) => {
  const [report, setReport] = useState<FirestickDiagnosticsReport | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<DiagnosticPropertyComparison | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'mismatch' | 'verified' | 'unavailable'>('all');
  const [simulatedDecoderOverride, setSimulatedDecoderOverride] = useState<string | undefined>(undefined);
  const [simulatedBufferOverride, setSimulatedBufferOverride] = useState<string | undefined>(undefined);
  const [forceSdrFallback, setForceSdrFallback] = useState<boolean>(false);

  const runDiagnostics = () => {
    const data = FirestickDiagnosticsEngine.evaluateDiagnostics(
      customUa,
      simulatedDecoderOverride,
      simulatedBufferOverride,
      forceSdrFallback
    );
    setReport(data);
    if (data.properties.length > 0 && !selectedProperty) {
      setSelectedProperty(data.properties[0]);
    }
  };

  useEffect(() => {
    runDiagnostics();
  }, [customUa, simulatedDecoderOverride, simulatedBufferOverride, forceSdrFallback]);

  if (!report) return null;

  const filteredProperties = report.properties.filter((prop) => {
    if (activeTab === 'mismatch') return prop.hasDiscrepancy;
    if (activeTab === 'verified') return prop.verificationStatus === 'VERIFIED';
    if (activeTab === 'unavailable') return prop.verificationStatus === 'UNAVAILABLE';
    return true;
  });

  return (
    <div id="firestick-diagnostics-dashboard" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-6">
      {/* Header & Quick Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">Fire TV Hardware &amp; Runtime Diagnostics</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              Observational Only
            </span>
            {forceSdrFallback && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Forced SDR Fallback
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Evaluates the 5-stage configuration lifecycle (Configured &rarr; Requested &rarr; Applied &rarr; Detected &rarr; Verified).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <span
              className={`px-2.5 py-1 rounded-md font-semibold border flex items-center gap-1.5 ${
                report.discrepancyCount === 0
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950/80 text-amber-300 border-amber-800'
              }`}
            >
              {report.discrepancyCount === 0 ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  All Expected Matches
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  {report.discrepancyCount} Discrepanc{report.discrepancyCount > 1 ? 'ies' : 'y'}
                </>
              )}
            </span>
          </div>

          <button
            id="refresh-firestick-diag-btn"
            onClick={() => {
              runDiagnostics();
              if (onRefresh) onRefresh();
            }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1"
            title="Re-run Diagnostics"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Discrepancy Simulator / Diagnostic Controls */}
      <div className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-800 text-xs font-mono space-y-3">
        <div className="text-slate-400 font-semibold flex items-center justify-between border-b border-slate-800/80 pb-2">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Discrepancy &amp; Fallback Verification Sandbox:
          </span>
          <span className="text-[10px] text-slate-500">One-time test vector simulation triggers</span>
        </div>

        {/* Decoder & Buffer overrides */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px] shrink-0">Decoder Vector:</span>
            <select
              value={simulatedDecoderOverride || ''}
              onChange={(e) => setSimulatedDecoderOverride(e.target.value || undefined)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 w-full"
            >
              <option value="">Normal (Hardware MediaCodec)</option>
              <option value="Software Decoder (FFmpeg fallback)">Simulate Software Decoder Mismatch</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px] shrink-0">Buffer Vector:</span>
            <select
              value={simulatedBufferOverride || ''}
              onChange={(e) => setSimulatedBufferOverride(e.target.value || undefined)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded px-2 py-1 w-full"
            >
              <option value="">Normal (Matched Buffer Mode)</option>
              <option value="unbounded_desktop_mode">Simulate Buffer Mode Mismatch (Unbounded)</option>
            </select>
          </div>
        </div>

        {/* Force SDR Fallback Toggle Row */}
        <div
          id="force-sdr-fallback-control-row"
          className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded border border-slate-800/80"
        >
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Sparkles className={`w-3.5 h-3.5 ${forceSdrFallback ? 'text-amber-400' : 'text-slate-500'}`} />
                Force SDR Fallback
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  forceSdrFallback
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {forceSdrFallback ? 'SDR Fallback Active' : 'Auto HDR Negotiation'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Simulates disabling HDR metadata processing to test player stability on older display hardware where HDR negotiation might fail.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              id="toggle-force-sdr-fallback"
              type="button"
              role="switch"
              aria-checked={forceSdrFallback}
              onClick={() => setForceSdrFallback(!forceSdrFallback)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                forceSdrFallback ? 'bg-amber-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  forceSdrFallback ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-[11px] text-slate-300 font-semibold min-w-[52px]">
              {forceSdrFallback ? 'ON' : 'OFF'}
            </span>
          </div>
        </div>
      </div>

      {/* Diagnostics Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Properties List & Filter */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-2">
            {(['all', 'mismatch', 'verified', 'unavailable'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 rounded text-xs font-mono transition capitalize ${
                  activeTab === tab
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab} ({tab === 'all'
                  ? report.properties.length
                  : tab === 'mismatch'
                  ? report.summary.mismatchCount
                  : tab === 'verified'
                  ? report.summary.verifiedCount
                  : report.summary.unavailableCount})
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {filteredProperties.map((prop) => (
              <div
                key={prop.propertyKey}
                onClick={() => setSelectedProperty(prop)}
                className={`p-3 rounded-lg border transition cursor-pointer text-xs font-mono flex items-center justify-between gap-3 ${
                  selectedProperty?.propertyKey === prop.propertyKey
                    ? 'bg-slate-800/90 border-indigo-500 shadow-md ring-1 ring-indigo-500/50'
                    : prop.hasDiscrepancy
                    ? 'bg-amber-950/30 border-amber-800/80 hover:bg-amber-950/50'
                    : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{prop.label}</span>
                    <span className="text-[10px] text-slate-500">[{prop.category}]</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span>Exp: <span className="text-slate-300">{prop.expectedRuntimeValue}</span></span>
                    <span>&rarr;</span>
                    <span>
                      Act:{' '}
                      <span
                        className={
                          prop.hasDiscrepancy
                            ? 'text-rose-400 font-semibold'
                            : prop.detectedRuntimeValue === 'UNAVAILABLE_IN_RUNTIME'
                            ? 'text-slate-500 italic'
                            : 'text-emerald-400'
                        }
                      >
                        {prop.detectedRuntimeValue === 'UNAVAILABLE_IN_RUNTIME'
                          ? 'Unavailable in current runtime'
                          : prop.detectedRuntimeValue}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {prop.verificationStatus === 'VERIFIED' && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Match
                    </span>
                  )}
                  {prop.verificationStatus === 'DISCREPANCY' && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 font-semibold animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> Mismatch
                    </span>
                  )}
                  {prop.verificationStatus === 'UNAVAILABLE' && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" /> Unavailable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Detailed Property Inspector */}
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs font-mono space-y-4">
          {selectedProperty ? (
            <div className="space-y-3">
              <div className="border-b border-slate-800 pb-2">
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">
                  Diagnostic Property Inspector
                </span>
                <h4 className="text-sm font-bold text-slate-100 mt-0.5">{selectedProperty.label}</h4>
              </div>

              {/* 5-Stage Configuration Lifecycle Tracker */}
              <div className="space-y-1.5 bg-slate-900/90 p-2.5 rounded border border-slate-800 text-[11px]">
                <div className="text-slate-400 font-semibold mb-1">Configuration Lifecycle:</div>
                <div className="grid grid-cols-5 gap-1 text-[10px] text-center font-bold">
                  {['CONFIGURED', 'REQUESTED', 'APPLIED', 'DETECTED', 'VERIFIED'].map((stage, idx) => {
                    const isReached =
                      stage === selectedProperty.appliedStatus ||
                      (selectedProperty.verificationStatus === 'VERIFIED' && stage === 'VERIFIED');
                    return (
                      <div
                        key={stage}
                        className={`p-1 rounded ${
                          isReached
                            ? selectedProperty.hasDiscrepancy
                              ? 'bg-amber-950 text-amber-300 border border-amber-700'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            : 'bg-slate-950 text-slate-600 border border-slate-900'
                        }`}
                      >
                        {stage}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-500">Configured Value:</span>
                  <span className="text-slate-300 text-right">{selectedProperty.configuredValue}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-500">Expected Runtime:</span>
                  <span className="text-indigo-300 text-right">{selectedProperty.expectedRuntimeValue}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/60 pb-1">
                  <span className="text-slate-500">Detected Runtime:</span>
                  <span
                    className={`text-right ${
                      selectedProperty.hasDiscrepancy
                        ? 'text-rose-400 font-bold'
                        : selectedProperty.detectedRuntimeValue === 'UNAVAILABLE_IN_RUNTIME'
                        ? 'text-slate-500 italic'
                        : 'text-emerald-400 font-semibold'
                    }`}
                  >
                    {selectedProperty.detectedRuntimeValue === 'UNAVAILABLE_IN_RUNTIME'
                      ? 'Unavailable in current runtime'
                      : selectedProperty.detectedRuntimeValue}
                  </span>
                </div>
              </div>

              {selectedProperty.hasDiscrepancy && (
                <div className="bg-rose-950/60 border border-rose-800/80 p-3 rounded text-[11px] text-rose-200 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-rose-300">
                    <AlertTriangle className="w-3.5 h-3.5" /> Discrepancy Detected
                  </div>
                  <p>{selectedProperty.discrepancyMessage}</p>
                  {selectedProperty.remediationAdvice && (
                    <div className="text-[10px] text-slate-300 bg-black/40 p-2 rounded border border-rose-900/60 mt-1">
                      <span className="text-amber-400 font-semibold">Remediation:</span> {selectedProperty.remediationAdvice}
                    </div>
                  )}
                </div>
              )}

              {selectedProperty.remediationAdvice && !selectedProperty.hasDiscrepancy && (
                <div className="bg-slate-900 p-2.5 rounded border border-slate-800 text-[10px] text-slate-400 space-y-1">
                  <span className="text-indigo-400 font-bold flex items-center gap-1">
                    <Info className="w-3 h-3" /> Runtime Scope Note:
                  </span>
                  <p>{selectedProperty.remediationAdvice}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500 text-center py-10">Select a diagnostic property to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
};

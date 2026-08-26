import React, { useState, useEffect, useMemo } from 'react';
import {
  ForensicWatermarkEngine,
  ForensicWatermarkTelemetry,
  LeakAnalysisResult,
} from '../lib/forensicWatermarkEngine';
import {
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Fingerprint,
  Radio,
  Tv,
  Zap,
  Activity,
  Layers,
  Search,
  Lock,
  Unlock,
  AlertTriangle,
  FileCheck,
  Sliders,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

interface ForensicWatermarkSurfaceProps {
  onPlayStream?: (url: string, name: string) => void;
}

export const ForensicWatermarkSurface: React.FC<ForensicWatermarkSurfaceProps> = () => {
  const engine = useMemo(() => new ForensicWatermarkEngine(), []);
  const [telemetry, setTelemetry] = useState<ForensicWatermarkTelemetry>(engine.getTelemetry());
  const [leakResult, setLeakResult] = useState<LeakAnalysisResult | null>(null);
  const [isAnalyzingLeak, setIsAnalyzingLeak] = useState<boolean>(false);
  const [takedownStatus, setTakedownStatus] = useState<string | null>(null);

  useEffect(() => {
    const unsub = engine.subscribe(() => {
      setTelemetry(engine.getTelemetry());
    });
    return () => {
      unsub();
      engine.destroy();
    };
  }, [engine]);

  const handleRunLeakAnalysis = () => {
    setIsAnalyzingLeak(true);
    setTimeout(() => {
      const res = engine.extractForensicAttribution();
      setLeakResult(res);
      setIsAnalyzingLeak(false);
    }, 400);
  };

  const handleKillswitch = () => {
    const res = engine.dispatchRevocationWebhook();
    setTakedownStatus(`Session killed: ${res.status} (${res.latencyMs}ms)`);
  };

  const handleSimulateCaptureBlocked = () => {
    engine.simulateScreenCaptureBlocked();
  };

  const sess = telemetry.activeSession;

  return (
    <div id="forensic-watermark-surface" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-rose-950 text-rose-300 border border-rose-800 rounded-full text-xs font-mono font-semibold">
                Milestone 27
              </span>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Fingerprint className="w-5 h-5 text-rose-400" />
                Forensic Watermarking &amp; Dynamic Session Fingerprinting
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl">
              A/B Variant Bitstream Steganography (NexGuard/Civolution Compliant), Dynamic Visual OSD PII Jitter Watermarking (Randomized Micro-Coordinates &amp; Opacity), Zero-Trust Anti-Piracy Leak Extraction Lab, and Automated DRM License Revocation Killswitch.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-simulate-screen-capture"
              onClick={handleSimulateCaptureBlocked}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 border border-slate-700"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Test Anti-Screen Capture
            </button>
          </div>
        </div>
      </div>

      {/* Real-Time Telemetry Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Active Fingerprint</span>
            <Fingerprint className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 truncate font-mono">
            {sess.subscriberId}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            IP: {sess.ipAddress}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>A/B Bitstream Variant</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-cyan-400 font-mono">
            {telemetry.activeVariantSegment}
          </div>
          <div className="text-[11px] text-slate-400 font-mono truncate">
            BitSeq: {sess.variantPayloadBitSequence}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Tagged Frames</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-sm font-bold text-slate-100 font-mono">
            {telemetry.totalFramesTagged.toLocaleString()} Frames
          </div>
          <div className="text-[11px] text-emerald-400 font-mono">
            60 FPS Constant Tagging
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-400 flex items-center justify-between">
            <span>Security Status</span>
            {sess.isSessionRevoked ? (
              <XCircle className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </div>
          <div
            className={`text-sm font-bold font-mono ${
              sess.isSessionRevoked ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {sess.isSessionRevoked ? 'SESSION REVOKED' : 'DRM LICENSED (SECURE)'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Blocked Captures: {telemetry.screenCaptureBlockedEvents}
          </div>
        </div>
      </div>

      {/* Main Grid: Live Protected Video Stage vs Forensic Leak Extraction Lab */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Protected Stream Canvas & Visual OSD Watermark (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Tv className="w-4 h-4 text-rose-400" />
                Live Protected Video Canvas &amp; Dynamic Watermark OSD
              </h3>
              <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] font-mono">
                Canvas 1080p60 • HDCP 2.3
              </span>
            </div>

            {/* Video Canvas Container with Dynamic Watermark Overlay */}
            <div className="relative aspect-video bg-slate-950 rounded-xl border border-slate-800 overflow-hidden shadow-inner flex flex-col justify-between p-4 select-none">
              {/* Simulated Video Content Background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-indigo-950/40 flex items-center justify-center pointer-events-none">
                {sess.isSessionRevoked ? (
                  <div className="text-center space-y-2 p-6 bg-rose-950/90 border border-rose-700 rounded-xl max-w-sm">
                    <ShieldAlert className="w-8 h-8 text-rose-400 mx-auto animate-bounce" />
                    <h4 className="font-bold text-rose-200 text-sm">SESSION TERMINATED</h4>
                    <p className="text-xs text-rose-300">
                      DRM License invalidated due to unauthorized redistribution and restream detection.
                    </p>
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <div className="text-slate-600 text-xs font-mono uppercase tracking-wider">
                      Ultra HD 4K Master Broadcast Feed
                    </div>
                    <div className="text-slate-400 text-sm font-bold">
                      Premier League: Arsenal vs Real Madrid
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      PTS: 42:890.120 • 3840x2160 • HEVC Main 10
                    </div>
                  </div>
                )}
              </div>

              {/* Top Status Indicators inside Canvas */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-800/80 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                  WATERMARK ACTIVE
                </span>
                <span className="px-2 py-0.5 bg-slate-900/80 text-cyan-300 border border-slate-800 rounded text-[10px] font-mono">
                  {telemetry.activeVariantSegment}
                </span>
              </div>

              {/* Dynamic Jittered Visual Watermark PII Overlay */}
              {!sess.isSessionRevoked && sess.visualWatermarkEnabled && (
                <div
                  id="dynamic-watermark-overlay"
                  className="absolute pointer-events-none transition-all duration-1000 ease-out font-mono font-bold text-[11px] text-white tracking-wider whitespace-nowrap bg-black/20 px-2 py-0.5 rounded border border-white/10"
                  style={{
                    left: `${telemetry.currentVisualXPosPct}%`,
                    top: `${telemetry.currentVisualYPosPct}%`,
                    opacity: sess.visualOpacityPct / 100,
                  }}
                >
                  {telemetry.currentVisualText}
                </div>
              )}

              {/* Bottom Canvas Stats */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-950/60 p-1.5 rounded border border-slate-800/60">
                <span>Coord: ({telemetry.currentVisualXPosPct}%, {telemetry.currentVisualYPosPct}%)</span>
                <span>Opacity: {sess.visualOpacityPct}%</span>
                <span>Jitter: Every {sess.visualJitterIntervalMs / 1000}s</span>
              </div>
            </div>

            {/* Watermark Configuration Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Visual OSD Opacity</span>
                  <span className="font-mono text-rose-400">{sess.visualOpacityPct}%</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={25}
                  value={sess.visualOpacityPct}
                  onChange={(e) =>
                    engine.updateConfig({ visualOpacityPct: parseInt(e.target.value) })
                  }
                  className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>3% (Imperceptible)</span>
                  <span>25% (High Visibility)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>A/B Bitstream Steganography</span>
                  <span className="font-mono text-cyan-400">
                    {sess.steganographicVariantEnabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
                <button
                  id="btn-toggle-variant-steganography"
                  onClick={() =>
                    engine.updateConfig({
                      steganographicVariantEnabled: !sess.steganographicVariantEnabled,
                    })
                  }
                  className="w-full py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition text-left flex items-center justify-between"
                >
                  <span>NexGuard A/B Variant Switching</span>
                  <span className="font-mono text-emerald-400 text-[10px]">
                    {sess.steganographicVariantEnabled ? 'Active' : 'Bypassed'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Audit & Security Log */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Anti-Piracy Forensic Audit Stream
              </span>
              <span className="text-xs font-mono text-slate-400">Real-time Stream</span>
            </h3>

            <div className="space-y-2">
              {telemetry.recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono space-y-0.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span
                      className={`font-bold ${
                        log.type === 'SESSION_REVOKED'
                          ? 'text-rose-400'
                          : log.type === 'LEAK_EXTRACTED'
                          ? 'text-amber-400'
                          : log.type === 'SCREEN_CAPTURE_BLOCKED'
                          ? 'text-purple-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {log.type}
                    </span>
                    <span className="text-slate-500">{log.timestamp}</span>
                  </div>
                  <div className="text-slate-300 text-[11px]">{log.details}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Forensic Leak Extraction Lab & Killswitch (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-rose-400" />
                Forensic Leak Extraction Lab
              </span>
              <span className="text-xs font-mono text-rose-400">REVERSE ATTRIBUTION</span>
            </h3>

            <p className="text-xs text-slate-400">
              Sample an unauthorized restream recording or screenshot. The forensic decoder extracts the A/B variant switching pattern and OSD micro-steganography to attribute the source subscriber.
            </p>

            <button
              id="btn-run-forensic-extraction"
              onClick={handleRunLeakAnalysis}
              disabled={isAnalyzingLeak}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-2"
            >
              <Search className="w-3.5 h-3.5" />
              {isAnalyzingLeak ? 'Analyzing Bitstream Segments...' : 'Extract Forensic Watermark from Stream'}
            </button>

            {/* Extraction Results Card */}
            {leakResult && (
              <div className="p-4 bg-slate-950 border border-rose-900/60 rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-rose-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-rose-400" /> LEAK ATTRIBUTED
                  </span>
                  <span className="px-2 py-0.5 bg-rose-950 text-rose-300 rounded text-[10px]">
                    {leakResult.matchConfidencePct}% Confidence
                  </span>
                </div>

                <div className="space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subscriber ID:</span>
                    <span className="font-bold text-slate-100">{leakResult.extractedSubscriberId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Client IP Address:</span>
                    <span className="text-cyan-400">{leakResult.extractedIpAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Hardware MAC:</span>
                    <span className="text-slate-300">{leakResult.extractedMacAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">A/B Bit Matches:</span>
                    <span className="text-emerald-400">{leakResult.variantBitMatches} / 16 Bits</span>
                  </div>
                </div>

                {/* Killswitch Action Button */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    id="btn-takedown-killswitch"
                    onClick={handleKillswitch}
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition text-xs flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Execute Immediate DRM License Revocation
                  </button>
                </div>
              </div>
            )}

            {takedownStatus && (
              <div className="p-2.5 bg-rose-950/40 border border-rose-800 rounded-lg text-xs font-mono text-rose-300 text-center">
                {takedownStatus}
              </div>
            )}
          </div>

          {/* Forensic Architecture Guide */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 text-xs text-slate-400">
            <h4 className="font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Zero-Trust Anti-Piracy Architecture
            </h4>
            <p className="text-[11px] leading-relaxed">
              Combines server-side A/B dual-rendition variant stream switching (NexGuard compliant) with client-side OSD jitter steganography. Even if screen grabbers capture clean frames, the embedded bitstream payload survives transcoding and identifies the leaking credential within 30 seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

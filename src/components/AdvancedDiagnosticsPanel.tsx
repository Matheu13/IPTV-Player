import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Shield,
  Globe,
  HardDrive,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Copy,
  RefreshCw,
  Layers,
  Monitor,
  Sparkles,
  Info,
  Tv,
  Smartphone,
  Sliders,
} from 'lucide-react';
import {
  DeviceCapabilityDetector,
  DevicePlatformProfile,
  PlatformDeviceType,
} from '../lib/deviceCapabilityDetector';
import { VpnDiagnosticsEngine, VpnDiagnosticReport } from '../lib/vpnDiagnostics';

export const AdvancedDiagnosticsPanel: React.FC = () => {
  const [loadingCaps, setLoadingCaps] = useState(true);
  const [profile, setProfile] = useState<DevicePlatformProfile | null>(null);
  const [selectedDeviceSimulation, setSelectedDeviceSimulation] = useState<'auto' | 'windows' | 'android-tv'>('auto');
  const [loadingVpn, setLoadingVpn] = useState(false);
  const [vpnReport, setVpnReport] = useState<VpnDiagnosticReport | null>(null);
  const [copiedDiag, setCopiedDiag] = useState(false);
  const [copiedVpn, setCopiedVpn] = useState(false);
  const [customProviderHost, setCustomProviderHost] = useState('http://live.stream-iptv.net:8080');

  const loadCapabilities = async (simMode: 'auto' | 'windows' | 'android-tv' = selectedDeviceSimulation) => {
    setLoadingCaps(true);
    try {
      let overrideUa: string | undefined;
      if (simMode === 'windows') {
        overrideUa = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
      } else if (simMode === 'android-tv') {
        overrideUa = 'Mozilla/5.0 (Linux; Android 12; BRAVIA 4K UR3 Build/STT.211025.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.5735.196 LargeScreen AndroidTV';
      }
      const caps = await DeviceCapabilityDetector.detectPlatformCapabilities(overrideUa);
      setProfile(caps);
    } catch (err) {
      console.error('Failed to detect device capabilities', err);
    } finally {
      setLoadingCaps(false);
    }
  };

  const runVpnProbe = async () => {
    setLoadingVpn(true);
    try {
      const rep = await VpnDiagnosticsEngine.runDiagnostics(customProviderHost);
      setVpnReport(rep);
    } catch (err) {
      console.error('Failed to run VPN probe', err);
    } finally {
      setLoadingVpn(false);
    }
  };

  useEffect(() => {
    loadCapabilities('auto');
    runVpnProbe();
  }, []);

  const handleDeviceSimChange = (mode: 'auto' | 'windows' | 'android-tv') => {
    setSelectedDeviceSimulation(mode);
    loadCapabilities(mode);
  };

  const handleCopyDiagnostics = () => {
    if (!profile) return;
    navigator.clipboard.writeText(profile.diagnosticsText);
    setCopiedDiag(true);
    setTimeout(() => setCopiedDiag(false), 2000);
  };

  const handleCopyVpnReport = () => {
    if (!vpnReport) return;
    const safeText = VpnDiagnosticsEngine.formatSafeExport(vpnReport);
    navigator.clipboard.writeText(safeText);
    setCopiedVpn(true);
    setTimeout(() => setCopiedVpn(false), 2000);
  };

  return (
    <div id="advanced-diagnostics-panel" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
                Requirement 42 &amp; Milestone 8
              </span>
              <h2 className="text-xl font-bold text-slate-100">Device Capability Detection &amp; Hardware Diagnostics</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Determines supported codecs, hardware decoders, maximum tested/hardware resolution, HDR capabilities,
              hardware acceleration, and display capabilities where platform APIs permit. Explicitly surfaces reliability
              and avoids fabricating capability telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Simulation preset switcher */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
              <button
                onClick={() => handleDeviceSimChange('auto')}
                className={`px-3 py-1 rounded transition ${
                  selectedDeviceSimulation === 'auto'
                    ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Auto Detect
              </button>
              <button
                onClick={() => handleDeviceSimChange('windows')}
                className={`px-3 py-1 rounded transition ${
                  selectedDeviceSimulation === 'windows'
                    ? 'bg-sky-950 text-sky-300 font-bold border border-sky-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Windows PC
              </button>
              <button
                onClick={() => handleDeviceSimChange('android-tv')}
                className={`px-3 py-1 rounded transition ${
                  selectedDeviceSimulation === 'android-tv'
                    ? 'bg-indigo-950 text-indigo-300 font-bold border border-indigo-800/60'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Android TV
              </button>
            </div>

            <button
              onClick={() => {
                loadCapabilities(selectedDeviceSimulation);
                runVpnProbe();
              }}
              disabled={loadingCaps || loadingVpn}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-700"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingCaps || loadingVpn ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Capability Highlights (Req 42 Core Metrics) */}
      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Device Profile Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>Device Platform</span>
              </span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                {profile.device}
              </span>
            </div>
            <div className="text-lg font-bold text-white truncate">{profile.device}</div>
            <div className="text-xs text-slate-400 truncate font-mono">{profile.osRaw}</div>
          </div>

          {/* Decoder & HW Acceleration Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>Hardware Acceleration</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                  profile.hardwareAccelerationActive
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800/40'
                    : 'bg-amber-950 text-amber-300 border-amber-800/40'
                }`}
              >
                {profile.hardwareAccelerationActive ? 'HW ACTIVE' : 'CPU FALLBACK'}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-200 truncate">
              {profile.hardwareDecoderApi.split('/')[0].trim()}
            </div>
            <div className="text-[11px] text-emerald-400 font-mono">
              Max HW Decode: <strong className="text-white">{profile.maximumHardwareDecode}</strong>
            </div>
          </div>

          {/* Max Tested Resolution Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Max Tested Resolution</span>
              </span>
              <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                {profile.maximumTestedResolution}
              </span>
            </div>
            <div className="text-xl font-bold text-white font-mono">{profile.maximumTestedResolution}</div>
            <div className="text-xs text-slate-400 font-mono">
              Display: {profile.display.physicalWidth}×{profile.display.physicalHeight} ({profile.display.devicePixelRatio}x scale)
            </div>
          </div>

          {/* HDR & Color Gamut Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                <span>HDR Capabilities</span>
              </span>
              <span
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                  profile.display.hdr.hdrLabel !== 'Unsupported' && profile.display.hdr.hdrLabel !== 'SDR (Standard Dynamic Range)'
                    ? 'bg-purple-950 text-purple-300 border-purple-800/40'
                    : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                {profile.display.hdr.hdrLabel}
              </span>
            </div>
            <div className="text-lg font-bold text-purple-300 truncate">{profile.display.hdr.hdrLabel}</div>
            <div className="text-xs text-slate-400 font-mono">
              {profile.display.colorGamuts.rec2020 ? 'Rec.2020 Wide Gamut' : profile.display.colorGamuts.displayP3 ? 'Display P3 Gamut' : 'Standard sRGB'} ({profile.display.colorDepthBits}-bit)
            </div>
          </div>
        </div>
      )}

      {/* Structured Codec Matrix & Platform Diagnostic Text Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Supported Codecs Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <Zap className="w-4 h-4" />
              <h3>Supported Codecs &amp; Decoder Telemetry</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Probed via {profile?.codecs[0]?.probeMethod || 'W3C MediaCapabilities'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 bg-slate-950/70 font-mono">
                <tr>
                  <th className="p-2.5 rounded-l">Codec</th>
                  <th className="p-2.5">Hardware Decode</th>
                  <th className="p-2.5">Max Tested Res</th>
                  <th className="p-2.5">HDR Profile</th>
                  <th className="p-2.5 rounded-r">Supported Profiles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {profile?.codecs.map((c) => (
                  <tr key={c.codec} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-2.5">
                      <div className="font-bold text-slate-200 font-sans">{c.codec}</div>
                      <div className="text-[10px] text-slate-500 font-mono truncate max-w-xs">{c.mimeType}</div>
                    </td>
                    <td className="p-2.5">
                      {c.isSupported ? (
                        c.hardwareAccelerated ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/50 inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> HW Decode
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 inline-flex items-center gap-1">
                            SW Fallback
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-800/50">
                          Unsupported
                        </span>
                      )}
                    </td>
                    <td className="p-2.5">
                      <span className="font-bold text-cyan-300">{c.maxTestedResolution}</span>
                    </td>
                    <td className="p-2.5">
                      {c.hdrSupported ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-950 text-purple-300 border border-purple-800/40">
                          10-bit HDR
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">8-bit SDR</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-400 text-[11px] font-sans">
                      {c.supportedProfiles.join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Standard Diagnostic Output Format (Requirement 42 Example Specification) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Activity className="w-4 h-4" />
              <h3>Exposed Diagnostic Format</h3>
            </div>
            <button
              onClick={handleCopyDiagnostics}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs transition border border-slate-700"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedDiag ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>

          <div className="bg-slate-950 rounded-lg p-4 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto scrollbar-thin">
            {profile?.diagnosticsText || 'Loading diagnostics format...'}
          </div>

          {/* Platform Reliability & Anti-Fabrication Notice */}
          <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Platform API Telemetry Policy</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Hardware capabilities are probed directly from standards-compliant browser &amp; platform APIs (W3C MediaCapabilities, WebCodecs, and CSS Media Queries). When running in restricted sandboxes where hardware registers are not exposed, the system explicitly reports status rather than fabricating unverified data.
            </p>
          </div>
        </div>
      </div>

      {/* Local-Only VPN & Outbound Latency Probes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Globe className="w-4 h-4" /> Local Network, Public IP &amp; VPN Diagnostic Probe
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800 px-2 py-0.5 rounded">
              Strict Local-Only • Zero Telemetry Leak
            </span>
            <button
              onClick={handleCopyVpnReport}
              disabled={!vpnReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedVpn ? 'Copied Masked Report!' : 'Copy Safe Report'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs text-slate-400">Outbound Public IP (Redacted)</div>
            <div className="text-sm font-bold font-mono text-cyan-300 mt-1">
              {vpnReport ? vpnReport.publicIp.replace(/\d+$/, '***') : '...'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">{vpnReport?.city}, {vpnReport?.country}</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs text-slate-400">ISP Autonomous System</div>
            <div className="text-sm font-bold text-slate-200 mt-1 truncate">{vpnReport?.isp || '...'}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{vpnReport?.asn}</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs text-slate-400">Tunnel &amp; Encrypted State</div>
            <div className="text-sm font-bold text-emerald-400 mt-1 font-mono flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> {vpnReport?.networkInterfaceType}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">MTU: {vpnReport?.mtuSize} Bytes</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
            <div className="text-xs text-slate-400">DNS &amp; Gateway RTT Latency</div>
            <div className="text-sm font-bold font-mono text-slate-200 mt-1">
              DNS: <span className="text-cyan-300">{vpnReport?.dnsLatencyMs}ms</span> | Host:{' '}
              <span className="text-emerald-300">{vpnReport?.providerPingLatencyMs}ms</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-mono">Status: {vpnReport?.gatewayReachability}</div>
          </div>
        </div>
      </div>

      {/* Requirements 43, 44, 45: 8K Distinction, Minimal Dependencies, & Security Boundaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Requirement 43: 8K Distinction */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Sparkles className="w-4 h-4" />
            <h3>Req 43: 8K Resolution Policy</h3>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              <strong className="text-white">No Artificial Ceiling:</strong> The player does not impose an artificial resolution ceiling on capable hardware (supports direct 8K UHD passthrough).
            </p>
            <p className="text-slate-400">
              <strong className="text-slate-200">Hardware Dependent:</strong> Incapable hardware fails gracefully with clear compatibility warnings instead of silent stalls.
            </p>
            <p className="text-emerald-400 font-mono text-[11px] bg-slate-950 p-2 rounded border border-slate-800">
              ✓ Never silently transcode 8K streams<br />
              ✓ Never artificially downgrade 8K without user selection
            </p>
          </div>
        </div>

        {/* Requirement 44: Minimal Dependencies Policy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <HardDrive className="w-4 h-4" />
            <h3>Req 44: Minimal Dependency Policy</h3>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              <strong className="text-white">Strict Justification:</strong> Dependencies are kept minimal. Every library undergoes audit for purpose, necessity, native platform alternatives, and licensing.
            </p>
            <p className="text-slate-400">
              <strong className="text-slate-200">Zero Vanity Libraries:</strong> No libraries added simply because they are popular; prefer native Web APIs (MSE, fetch, WebCrypto).
            </p>
            <div className="text-[11px] font-mono text-cyan-300 bg-slate-950 p-2 rounded border border-slate-800">
              Audited Core: hls.js, mpegts.js, motion, lucide-react, express
            </div>
          </div>
        </div>

        {/* Requirement 45: Security Boundary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <Shield className="w-4 h-4" />
            <h3>Req 45: Strict Security Boundary</h3>
          </div>
          <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              <strong className="text-white">Authorized Access Only:</strong> Manages IPTV sources that the user is authorized to access.
            </p>
            <p className="text-rose-300/90 font-mono text-[11px] bg-slate-950 p-2 rounded border border-slate-800">
              ✗ Credential theft / harvest strictly blocked<br />
              ✗ Account takeover &amp; impersonation blocked<br />
              ✗ Subscription / Auth bypass strictly forbidden
            </p>
            <p className="text-slate-400 text-[11px]">
              Provider quirks may be diagnosed, but authentication &amp; authorization are never circumvented.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

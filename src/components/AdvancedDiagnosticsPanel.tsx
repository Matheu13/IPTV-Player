import React, { useState, useEffect } from 'react';
import { Activity, Cpu, Shield, Globe, HardDrive, Zap, CheckCircle2, AlertTriangle, Copy, RefreshCw, Layers } from 'lucide-react';
import { DeviceCapabilityDetector, DevicePlatformProfile } from '../lib/deviceCapabilityDetector';
import { VpnDiagnosticsEngine, VpnDiagnosticReport } from '../lib/vpnDiagnostics';

export const AdvancedDiagnosticsPanel: React.FC = () => {
  const [loadingCaps, setLoadingCaps] = useState(true);
  const [profile, setProfile] = useState<DevicePlatformProfile | null>(null);
  const [loadingVpn, setLoadingVpn] = useState(false);
  const [vpnReport, setVpnReport] = useState<VpnDiagnosticReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [customProviderHost, setCustomProviderHost] = useState('http://live.stream-iptv.net:8080');

  const loadCapabilities = async () => {
    setLoadingCaps(true);
    try {
      const caps = await DeviceCapabilityDetector.detectPlatformCapabilities();
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
    loadCapabilities();
    runVpnProbe();
  }, []);

  const handleCopySafeExport = () => {
    if (!vpnReport) return;
    const safeText = VpnDiagnosticsEngine.formatSafeExport(vpnReport);
    navigator.clipboard.writeText(safeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800">
                Milestone 8
              </span>
              <h2 className="text-xl font-bold text-slate-100">Advanced Playback &amp; Hardware Diagnostics</h2>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Hardware video decoder pipeline inspection, 8K/HDR codec capability matrix, and local-only VPN/ISP network diagnostics.
            </p>
          </div>

          <button
            onClick={() => {
              loadCapabilities();
              runVpnProbe();
            }}
            disabled={loadingCaps || loadingVpn}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-all border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCaps || loadingVpn ? 'animate-spin' : ''}`} />
            Refresh Diagnostics
          </button>
        </div>
      </div>

      {/* Hardware & Decoders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Platform & Decoder API */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-slate-800 pb-3">
            <Cpu className="w-4 h-4" /> Platform &amp; Hardware Acceleration
          </div>

          {loadingCaps ? (
            <div className="text-xs text-slate-400 py-8 text-center">Detecting decoder pipeline...</div>
          ) : profile ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-slate-400">Target Operating System</div>
                <div className="text-base font-bold text-slate-200 mt-0.5">{profile.os}</div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Hardware Video Decoder API</div>
                <div className="text-xs font-mono text-emerald-400 bg-emerald-950/30 px-2.5 py-1.5 rounded border border-emerald-900/40 mt-1">
                  {profile.hardwareDecoderApi}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Display Surface Geometry</div>
                <div className="text-sm font-semibold text-slate-200 mt-0.5 font-mono">
                  {profile.screenResolution.width} × {profile.screenResolution.height} ({profile.colorDepthBits}-bit color)
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <div className="text-xs text-slate-400 mb-2">High Dynamic Range (HDR)</div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono ${
                      profile.hdrCapabilities.hdr10
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    HDR10: {profile.hdrCapabilities.hdr10 ? 'Ready' : 'SDR'}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono ${
                      profile.hdrCapabilities.hlg
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    HLG: {profile.hdrCapabilities.hlg ? 'Ready' : 'N/A'}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-mono ${
                      profile.hdrCapabilities.dolbyVision
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Dolby Vision: {profile.hdrCapabilities.dolbyVision ? 'Supported' : 'Rec709'}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Codec Capability Matrix */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-slate-800 pb-3">
            <Zap className="w-4 h-4" /> Codec Matrix &amp; Resolution Support
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 bg-slate-950/60 font-mono">
                <tr>
                  <th className="p-2.5 rounded-l">Codec</th>
                  <th className="p-2.5">Hardware Dec</th>
                  <th className="p-2.5">Max Resolution</th>
                  <th className="p-2.5">HDR Profile</th>
                  <th className="p-2.5 rounded-r">Supported Profiles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {profile?.supportedCodecs.map((c) => (
                  <tr key={c.codec} className="hover:bg-slate-800/30">
                    <td className="p-2.5 font-bold text-slate-200">{c.codec}</td>
                    <td className="p-2.5">
                      {c.hardwareAccelerated ? (
                        <span className="text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> HW Accelerated
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">SW Fallback</span>
                      )}
                    </td>
                    <td className="p-2.5 font-mono text-cyan-300 font-semibold">{c.maxResolution}</td>
                    <td className="p-2.5">
                      {c.hdrSupported ? (
                        <span className="text-amber-400 font-mono">10-bit HDR</span>
                      ) : (
                        <span className="text-slate-500 font-mono">8-bit SDR</span>
                      )}
                    </td>
                    <td className="p-2.5 text-slate-400 font-mono text-[11px]">{c.supportedProfiles.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
              Strict Local-Only • Zero Telemetry
            </span>
            <button
              onClick={handleCopySafeExport}
              disabled={!vpnReport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied Masked Report!' : 'Copy Safe Report'}
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
    </div>
  );
};

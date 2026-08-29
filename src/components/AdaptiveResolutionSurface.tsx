import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Cpu,
  Wifi,
  Monitor,
  ShieldCheck,
  ShieldAlert,
  Gauge,
  Sliders,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  Layers,
  Activity,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  globalAdaptiveResolutionManager,
  AdaptiveDecisionState,
  AdaptiveResolutionPolicy,
  ResolutionTierId,
} from '../lib/adaptiveResolutionManager';
import { AdaptiveResolutionTestResult } from '../../scripts/adaptive_resolution_manager_tests';

export const AdaptiveResolutionSurface: React.FC = () => {
  const [state, setState] = useState<AdaptiveDecisionState>(globalAdaptiveResolutionManager.getState());
  const [runningTests, setRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<{
    total: number;
    passed: number;
    failed: number;
    results: AdaptiveResolutionTestResult[];
  } | null>(null);

  useEffect(() => {
    const unsub = globalAdaptiveResolutionManager.subscribe((s) => {
      setState(s);
    });
    return () => unsub();
  }, []);

  const handlePolicyChange = (policy: AdaptiveResolutionPolicy) => {
    globalAdaptiveResolutionManager.setPolicy(policy);
  };

  const handleHwToggle = (override: boolean | null) => {
    globalAdaptiveResolutionManager.setHardwareAccelerationOverride(override);
  };

  const handleBandwidthChange = (mbps: number) => {
    globalAdaptiveResolutionManager.setBandwidthDirect(mbps, state.bandwidth.bufferOccupancySec);
  };

  const handleBufferChange = (sec: number) => {
    globalAdaptiveResolutionManager.setBandwidthDirect(state.bandwidth.estimatedMbps, sec);
  };

  const handleManualTierSelect = (tierId: ResolutionTierId) => {
    globalAdaptiveResolutionManager.selectTierManual(tierId);
  };

  const executeTestSuite = async () => {
    setRunningTests(true);
    try {
      const res = await fetch('/api/adaptive-resolution/test-suite');
      if (res.ok) {
        const data = await res.json();
        setTestResults(data);
      }
    } catch (err) {
      console.error('Failed to run adaptive resolution test suite:', err);
    } finally {
      setRunningTests(false);
    }
  };

  const isHwActive = state.hardware.hardwareOverride !== null ? state.hardware.hardwareOverride : state.hardware.isAvailable;

  return (
    <div id="adaptive-resolution-surface" className="space-y-6">
      {/* Header Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Adaptive Resolution Manager (4K UHD Auto-Default &amp; Hardware Pipeline)
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Monitors display capabilities, network bandwidth, and hardware acceleration status. Ensures the player
              defaults to the highest supported resolution (up to 4K UHD 3840×2160@60fps) when hardware decoding (Direct3D 11 / MediaCodec) is available.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={executeTestSuite}
              disabled={runningTests}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shadow-sm"
            >
              {runningTests ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span>{runningTests ? 'Validating Assertions...' : 'Run Automated Test Suite'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top Telemetry Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Active Resolution Tier */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Current Quality</span>
            </span>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/40">
              {state.currentTier.fps} FPS
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono flex items-center space-x-2">
            <span>{state.currentTier.width} × {state.currentTier.height}</span>
          </div>
          <div className="text-xs text-emerald-400 font-semibold truncate">
            {state.currentTier.label}
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-800/60">
            <span>Bitrate: {(state.currentTier.bitrateBps / 1_000_000).toFixed(1)} Mbps</span>
            <span>{state.currentTier.isHdr ? 'HDR10 / BT.2020' : 'SDR Rec.709'}</span>
          </div>
        </div>

        {/* Hardware Acceleration Pipeline */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>Hardware Acceleration</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                isHwActive
                  ? 'bg-sky-950 text-sky-300 border-sky-800/40'
                  : 'bg-rose-950 text-rose-300 border-rose-800/40'
              }`}
            >
              {isHwActive ? 'HW DECODER ACTIVE' : 'CPU SOFTWARE'}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-200 truncate">
            {state.hardware.api.split('(')[0].trim()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
            <span className={isHwActive ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
              {isHwActive ? '✓ Direct Surface Zero-Copy' : '⚠ High CPU Load Capped'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-800/60">
            <span>HEVC / AV1 / VP9</span>
            <span>Max: {state.hardware.maxHardwareResolution}</span>
          </div>
        </div>

        {/* Bandwidth & Network */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <Wifi className="w-3.5 h-3.5 text-indigo-400" />
              <span>Network Bandwidth</span>
            </span>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/40">
              {state.bandwidth.networkCategory}
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono flex items-baseline space-x-1">
            <span>{state.bandwidth.estimatedMbps.toFixed(1)}</span>
            <span className="text-xs text-slate-400 font-normal">Mbps</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            EWMA: {state.bandwidth.ewmaMbps.toFixed(1)} Mbps • Buffer: {state.bandwidth.bufferOccupancySec.toFixed(1)}s
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-800/60">
            <span>RTT: {state.bandwidth.rttLatencyMs}ms</span>
            <span>Jitter: {state.bandwidth.jitterMs}ms</span>
          </div>
        </div>

        {/* Display Capabilities */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider flex items-center space-x-1.5">
              <Monitor className="w-3.5 h-3.5 text-purple-400" />
              <span>Display &amp; HiDPI</span>
            </span>
            <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/40">
              {state.display.is4kCapable ? '4K UHD READY' : 'FHD DISPLAY'}
            </span>
          </div>
          <div className="text-sm font-bold text-slate-200 font-mono truncate">
            {state.display.displayWidth} × {state.display.displayHeight} ({state.display.devicePixelRatio}x Scale)
          </div>
          <div className="text-[11px] text-purple-300 font-mono flex items-center space-x-1">
            <span>{state.display.colorGamut} ({state.display.hdrFormat})</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 flex justify-between pt-1 border-t border-slate-800/60">
            <span>Effective: {state.display.effectiveWidth}x{state.display.effectiveHeight}</span>
            <span>{state.display.refreshRateHz}Hz</span>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Ladder Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Interactive Simulation & Policy Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center space-x-2 text-white font-bold text-sm border-b border-slate-800 pb-3">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3>Interactive Engine Controls &amp; Simulation</h3>
          </div>

          {/* Policy Mode */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Resolution Policy</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePolicyChange('auto_highest_supported')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-colors ${
                  state.policy === 'auto_highest_supported'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="font-bold flex items-center space-x-1">
                  <span>Auto (4K Default)</span>
                </div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">Highest supported via HW</div>
              </button>

              <button
                onClick={() => handlePolicyChange('force_4k')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-colors ${
                  state.policy === 'force_4k'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Force 4K UHD</div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">Strict 2160p lock</div>
              </button>

              <button
                onClick={() => handlePolicyChange('balanced')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-colors ${
                  state.policy === 'balanced'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Balanced</div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">Caps at 1080p FHD</div>
              </button>

              <button
                onClick={() => handlePolicyChange('bandwidth_saver')}
                className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-colors ${
                  state.policy === 'bandwidth_saver'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="font-bold">Data Saver</div>
                <div className="text-[10px] text-slate-400 font-normal mt-0.5">Caps at 480p SD</div>
              </button>
            </div>
          </div>

          {/* Hardware Acceleration State Simulation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>Hardware Acceleration Mode</span>
              </label>
              <span className="text-[10px] font-mono text-slate-400">
                {state.hardware.hardwareOverride === null
                  ? 'Auto-Detected'
                  : state.hardware.hardwareOverride
                  ? 'Forced HW Enable'
                  : 'Forced HW Disabled'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleHwToggle(null)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  state.hardware.hardwareOverride === null
                    ? 'bg-sky-950 text-sky-300 border-sky-600 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Auto Detect
              </button>
              <button
                onClick={() => handleHwToggle(true)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  state.hardware.hardwareOverride === true
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-600 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Force HW On
              </button>
              <button
                onClick={() => handleHwToggle(false)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  state.hardware.hardwareOverride === false
                    ? 'bg-rose-950 text-rose-300 border-rose-600 font-bold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                Force HW Off
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              When hardware acceleration is disabled, the manager immediately caps the resolution to 1080p FHD to protect CPU cores from thermal throttle and frame drops.
            </p>
          </div>

          {/* Bandwidth Simulator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Simulate Bandwidth Throughput</span>
              <span className="font-mono text-emerald-400 font-bold">{state.bandwidth.estimatedMbps.toFixed(1)} Mbps</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="60"
              step="0.5"
              value={state.bandwidth.estimatedMbps}
              onChange={(e) => handleBandwidthChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <button onClick={() => handleBandwidthChange(2.0)} className="hover:text-emerald-400">2 Mbps (SD)</button>
              <button onClick={() => handleBandwidthChange(6.0)} className="hover:text-emerald-400">6 Mbps (720p)</button>
              <button onClick={() => handleBandwidthChange(12.0)} className="hover:text-emerald-400">12 Mbps (1080p)</button>
              <button onClick={() => handleBandwidthChange(20.0)} className="hover:text-emerald-400">20 Mbps (2K)</button>
              <button onClick={() => handleBandwidthChange(45.0)} className="hover:text-emerald-400 font-bold text-emerald-400">45 Mbps (4K)</button>
            </div>
          </div>

          {/* Buffer Health Simulator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Buffer Occupancy</span>
              <span className={`font-mono font-bold ${state.bandwidth.bufferOccupancySec < 2.5 ? 'text-rose-400' : 'text-indigo-400'}`}>
                {state.bandwidth.bufferOccupancySec.toFixed(1)}s
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="20"
              step="0.5"
              value={state.bandwidth.bufferOccupancySec}
              onChange={(e) => handleBufferChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <button onClick={() => handleBufferChange(1.2)} className="text-rose-400 font-bold hover:underline">1.2s (Starvation)</button>
              <button onClick={() => handleBufferChange(6.0)} className="hover:text-indigo-400">6.0s (Moderate)</button>
              <button onClick={() => handleBufferChange(15.0)} className="hover:text-indigo-400 font-bold text-indigo-400">15.0s (Optimal)</button>
            </div>
          </div>
        </div>

        {/* Middle Column: Adaptive Ladder Matrix & Decision Reasoning */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Resolution Decision Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3>Latest Engine Decision &amp; Rationale</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {new Date(state.lastDecision.timestamp).toLocaleTimeString()}
              </span>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-200">Selected Profile:</span>
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                    {state.lastDecision.targetTier.label}
                  </span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono">
                  <span className="text-slate-400">Hardware HW:</span>
                  <span className={state.lastDecision.hardwareAccelerated ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {state.lastDecision.hardwareAccelerated ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {state.lastDecision.reason}
              </p>
            </div>
          </div>

          {/* Full Resolution Tier Ladder */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <Layers className="w-4 h-4 text-sky-400" />
                <h3>Supported Resolution Ladder Profiles</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Active: <strong className="text-emerald-400">{state.currentTier.label}</strong>
              </span>
            </div>

            <div className="space-y-2">
              {state.availableTiers.map((tier) => {
                const isActive = state.currentTier.id === tier.id;
                const isBandwidthSufficient = state.bandwidth.estimatedMbps >= tier.minBandwidthMbps;
                const isHwSufficient = !tier.requiresHardwareAcceleration || isHwActive;
                const isEligible = isBandwidthSufficient && isHwSufficient;

                return (
                  <div
                    key={tier.id}
                    onClick={() => handleManualTierSelect(tier.id)}
                    className={`p-3 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                      isActive
                        ? 'bg-emerald-950/40 border-emerald-500/60 shadow-sm'
                        : 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          isActive
                            ? 'bg-emerald-400 animate-pulse ring-4 ring-emerald-950'
                            : isEligible
                            ? 'bg-slate-600'
                            : 'bg-rose-500/50'
                        }`}
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold ${isActive ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {tier.label}
                          </span>
                          {tier.id === '2160p_4k' && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/40">
                              DEFAULT WITH HW
                            </span>
                          )}
                          {tier.isHdr && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800/40">
                              HDR10
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5 space-x-2">
                          <span>{tier.width}×{tier.height} @ {tier.fps}fps</span>
                          <span>•</span>
                          <span>Min: {tier.minBandwidthMbps} Mbps</span>
                          <span>•</span>
                          <span>HW Required: {tier.requiresHardwareAcceleration ? 'Yes (MediaCodec/D3D11)' : 'No'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      {isActive ? (
                        <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded text-xs font-mono font-bold">
                          ACTIVE STREAM
                        </span>
                      ) : isEligible ? (
                        <span className="text-[11px] text-slate-400 font-mono">Eligible</span>
                      ) : !isHwSufficient ? (
                        <span className="text-[10px] text-rose-400 font-mono font-semibold">Requires HW</span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-mono">Needs {tier.minBandwidthMbps} Mbps</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Automated Test Suite Execution Results */}
      {testResults && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Automated Test Suite Assertions ({testResults.passed}/{testResults.total} PASSED)
              </h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${
                testResults.failed === 0
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800/40'
                  : 'bg-rose-950 text-rose-300 border-rose-800/40'
              }`}
            >
              {testResults.failed === 0 ? 'ALL VERIFICATIONS PASSED' : `${testResults.failed} FAILURES DETECTED`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {testResults.results.map((r) => (
              <div
                key={r.testId}
                className="p-3 bg-slate-950 rounded-lg border border-slate-800/80 flex items-start space-x-3 text-xs"
              >
                {r.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-400 font-bold text-[11px]">{r.testId}:</span>
                    <strong className="text-slate-200">{r.name}</strong>
                  </div>
                  {r.details && <p className="text-[11px] text-slate-400 font-mono">{r.details}</p>}
                  {r.error && <p className="text-[11px] text-rose-400 font-mono">{r.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

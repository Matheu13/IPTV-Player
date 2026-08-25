import React, { useState, useEffect } from 'react';
import { Milestone0DiagnosticReport } from './types';
import { DiagnosticReportView } from './components/DiagnosticReportView';
import { LiveProbeRunner } from './components/LiveProbeRunner';
import { ByteSnifferTool } from './components/ByteSnifferTool';
import { RedactPlayground } from './components/RedactPlayground';
import { FixturesViewer } from './components/FixturesViewer';
import { DiagnosticsLogViewer } from './components/DiagnosticsLogViewer';
import { ArchitectureRoadmap } from './components/ArchitectureRoadmap';
import { Milestone1TestSuite } from './components/Milestone1TestSuite';
import { DataLayerExplorer } from './components/DataLayerExplorer';
import { ErrorTaxonomyTester } from './components/ErrorTaxonomyTester';
import { StreamPolicyTester } from './components/StreamPolicyTester';
import { ConnectionLimitSimulator } from './components/ConnectionLimitSimulator';
import { LivePlayerSurface } from './components/LivePlayerSurface';
import { MpvBridgeInspector } from './components/MpvBridgeInspector';
import { StallRecoveryVisualizer } from './components/StallRecoveryVisualizer';
import { Milestone2TestSuite } from './components/Milestone2TestSuite';
import { EpgGridSurface } from './components/EpgGridSurface';
import { VodSeriesCatalog } from './components/VodSeriesCatalog';
import { ChannelManagementZapper } from './components/ChannelManagementZapper';
import { Milestone3TestSuite } from './components/Milestone3TestSuite';
import { EpgStreamSurface } from './components/EpgStreamSurface';
import { Milestone4TestSuite } from './components/Milestone4TestSuite';
import { AndroidTvLeanbackSurface } from './components/AndroidTvLeanbackSurface';
import { Milestone5TestSuite } from './components/Milestone5TestSuite';
import { Milestones6to10TestSuite } from './components/Milestones6to10TestSuite';
import { StalkerPortalManager } from './components/StalkerPortalManager';
import { AdvancedDiagnosticsPanel } from './components/AdvancedDiagnosticsPanel';
import { MultiSourceMatrixView } from './components/MultiSourceMatrixView';
import { globalPlayerEngine } from './lib/playerEngine';
import {
  Activity,
  Radio,
  Binary,
  ShieldCheck,
  HardDrive,
  ScrollText,
  Cpu,
  Tv,
  CheckCircle2,
  Lock,
  Database,
  ShieldAlert,
  Layers,
  Zap,
  Sliders,
  Play,
  Calendar,
  Film,
  Gamepad2,
  Heart,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    | 'm6-10-test-suite'
    | 'stalker-portal'
    | 'advanced-diagnostics'
    | 'multi-source'
    | 'android-tv'
    | 'm5-test-suite'
    | 'live-player'
    | 'epg-stream'
    | 'm4-test-suite'
    | 'm3-test-suite'
    | 'epg-grid'
    | 'vod-catalog'
    | 'channel-management'
    | 'm2-test-suite'
    | 'mpv-bridge'
    | 'stall-recovery'
    | 'm1-test-suite'
    | 'data-layer'
    | 'error-taxonomy'
    | 'stream-policy'
    | 'connection-limit'
    | 'report'
    | 'probe'
    | 'sniffer'
    | 'redact'
    | 'fixtures'
    | 'logs'
    | 'architecture'
  >('m6-10-test-suite');

  const [report, setReport] = useState<Milestone0DiagnosticReport | null>(null);

  // Load initial simulated report on startup
  useEffect(() => {
    fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ simulate: true }),
    })
      .then((res) => res.json())
      .then((data) => setReport(data))
      .catch((err) => console.error('Failed to load initial report:', err));
  }, []);

  const handleProbeCompleted = (newReport: Milestone0DiagnosticReport) => {
    setReport(newReport);
    setActiveTab('report');
  };

  const handleTuneChannelFromEpgOrRemote = (channelIdOrObj: any, maybeName?: string) => {
    const channelId = typeof channelIdOrObj === 'object' && channelIdOrObj !== null
      ? (channelIdOrObj.id ?? channelIdOrObj.streamId ?? '101')
      : channelIdOrObj;
    const name = typeof channelIdOrObj === 'object' && channelIdOrObj !== null
      ? (channelIdOrObj.name ?? maybeName ?? 'Channel')
      : (maybeName ?? 'Channel');
    const streamUrl = typeof channelIdOrObj === 'object' && channelIdOrObj?.streamUrl
      ? channelIdOrObj.streamUrl
      : `http://provider.panel-stream.net:8080/live/user1/pass1/${channelId}.m3u8`;

    globalPlayerEngine.loadChannel({
      id: channelId,
      name,
      streamUrl,
      format: streamUrl.includes('.m3u8') ? 'm3u8' : 'ts',
    });
    setActiveTab('live-player');
  };

  const handlePlayMediaFromVodOrCatchup = (url: string, title: string) => {
    globalPlayerEngine.loadChannel({
      id: `media_${Date.now()}`,
      name: title,
      streamUrl: url,
      format: url.includes('.m3u8') ? 'm3u8' : 'ts',
    });
    setActiveTab('live-player');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-cyan-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-100 text-base tracking-tight">IPTV Player &amp; Video Suite</h1>
                <span className="text-[10px] font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full">
                  Milestones 0 — 10 Complete
                </span>
              </div>
              <p className="text-xs text-slate-400">Multi-Source Matrix • Stalker/MAG • 8K/HDR Decoders • VPN Diagnostics • TV 10-Foot UX</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Strict Connection Limit Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-400">Connection Limit:</span>
              <span className="font-mono text-emerald-400 font-semibold">Strict Max = 1</span>
            </div>

            {/* Redact Shield Indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded-lg text-xs text-emerald-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>redact() Active</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 overflow-x-auto pb-1 text-xs font-medium scrollbar-thin">
          {/* Milestones 6 - 10 Primary Tabs */}
          <button
            id="tab-m6-10-test-suite"
            onClick={() => setActiveTab('m6-10-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm6-10-test-suite'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" /> M6-10 Test Suite (11)
          </button>

          <button
            id="tab-multi-source"
            onClick={() => setActiveTab('multi-source')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'multi-source'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4 text-cyan-400" /> M9: Multi-Source Matrix
          </button>

          <button
            id="tab-stalker-portal"
            onClick={() => setActiveTab('stalker-portal')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'stalker-portal'
                ? 'border-purple-500 bg-slate-800 text-purple-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Tv className="w-4 h-4 text-purple-400" /> M7: Stalker / MAG Adapter
          </button>

          <button
            id="tab-advanced-diagnostics"
            onClick={() => setActiveTab('advanced-diagnostics')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'advanced-diagnostics'
                ? 'border-amber-500 bg-slate-800 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-400" /> M8: Decoders &amp; VPN Probe
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />
          {/* Milestone 5 Android TV & Fire TV UX Primary Tabs */}
          <button
            id="tab-android-tv"
            onClick={() => setActiveTab('android-tv')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'android-tv'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Tv className="w-4 h-4 text-indigo-400" /> M5: Android TV / Fire TV UX
          </button>

          <button
            id="tab-m5-test-suite"
            onClick={() => setActiveTab('m5-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm5-test-suite'
                ? 'border-emerald-500 bg-slate-800 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> M5 Test Suite (12)
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestone 4 Streaming XMLTV & SQLite EPG Primary Tabs */}
          <button
            id="tab-epg-stream"
            onClick={() => setActiveTab('epg-stream')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'epg-stream'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-indigo-400" /> M4a: Streaming XMLTV &amp; SQLite EPG
          </button>

          <button
            id="tab-m4-test-suite"
            onClick={() => setActiveTab('m4-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm4-test-suite'
                ? 'border-emerald-500 bg-slate-800 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> M4 Test Suite (11)
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestone 3 Primary Interactive Tabs */}
          <button
            id="tab-live-player"
            onClick={() => setActiveTab('live-player')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'live-player'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Play className="w-4 h-4 text-indigo-400 fill-indigo-400/20" /> Live Player Surface &amp; OSD
          </button>

          <button
            id="tab-epg-grid"
            onClick={() => setActiveTab('epg-grid')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'epg-grid'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-indigo-400" /> M3a: EPG &amp; Catchup Grid
          </button>

          <button
            id="tab-vod-catalog"
            onClick={() => setActiveTab('vod-catalog')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'vod-catalog'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Film className="w-4 h-4 text-cyan-400" /> M3b: VOD &amp; TV Series
          </button>

          <button
            id="tab-channel-management"
            onClick={() => setActiveTab('channel-management')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'channel-management'
                ? 'border-amber-500 bg-slate-800 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Gamepad2 className="w-4 h-4 text-amber-400" /> M3c: Remote Zapper &amp; Bouquets
          </button>

          <button
            id="tab-m3-test-suite"
            onClick={() => setActiveTab('m3-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm3-test-suite'
                ? 'border-emerald-500 bg-slate-800 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4 text-emerald-400" /> M3 Test Suite (16)
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestone 2 Tabs */}
          <button
            id="tab-m2-test-suite"
            onClick={() => setActiveTab('m2-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm2-test-suite'
                ? 'border-emerald-500 bg-slate-800 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4 text-emerald-400" /> M2 Test Suite (12)
          </button>

          <button
            id="tab-mpv-bridge"
            onClick={() => setActiveTab('mpv-bridge')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'mpv-bridge'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-cyan-400" /> MPV HWDEC
          </button>

          <button
            id="tab-stall-recovery"
            onClick={() => setActiveTab('stall-recovery')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'stall-recovery'
                ? 'border-amber-500 bg-slate-800 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" /> Stall Watchdog
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestone 1 Primary Tabs */}
          <button
            id="tab-m1-test-suite"
            onClick={() => setActiveTab('m1-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm1-test-suite'
                ? 'border-emerald-500 bg-slate-800 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" /> M1 Tests (13)
          </button>

          <button
            id="tab-data-layer"
            onClick={() => setActiveTab('data-layer')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'data-layer'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-cyan-400" /> Data Layer
          </button>

          <button
            id="tab-error-taxonomy"
            onClick={() => setActiveTab('error-taxonomy')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'error-taxonomy'
                ? 'border-rose-500 bg-slate-800 text-rose-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-rose-400" /> Error Taxonomy
          </button>

          <button
            id="tab-stream-policy"
            onClick={() => setActiveTab('stream-policy')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'stream-policy'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-indigo-400" /> Stream Policy
          </button>

          <button
            id="tab-connection-limit"
            onClick={() => setActiveTab('connection-limit')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'connection-limit'
                ? 'border-amber-500 bg-slate-800 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 text-amber-400" /> Connection Mutex
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestone 0 Tabs */}
          <button
            id="tab-report"
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'report'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" /> M0 Report
          </button>

          <button
            id="tab-probe"
            onClick={() => setActiveTab('probe')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'probe'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4" /> Probe Runner
          </button>

          <button
            id="tab-sniffer"
            onClick={() => setActiveTab('sniffer')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'sniffer'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Binary className="w-4 h-4" /> Byte Sniffer
          </button>

          <button
            id="tab-redact"
            onClick={() => setActiveTab('redact')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'redact'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Redact Engine
          </button>

          <button
            id="tab-fixtures"
            onClick={() => setActiveTab('fixtures')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'fixtures'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4" /> Fixtures
          </button>

          <button
            id="tab-logs"
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ScrollText className="w-4 h-4" /> Logs
          </button>

          <button
            id="tab-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cpu className="w-4 h-4" /> Architecture
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Milestones 6 - 10 Views */}
        {activeTab === 'm6-10-test-suite' && <Milestones6to10TestSuite />}
        {activeTab === 'multi-source' && (
          <MultiSourceMatrixView onPlayChannel={handleTuneChannelFromEpgOrRemote} />
        )}
        {activeTab === 'stalker-portal' && (
          <StalkerPortalManager onPlayStream={handlePlayMediaFromVodOrCatchup} />
        )}
        {activeTab === 'advanced-diagnostics' && <AdvancedDiagnosticsPanel />}

        {/* Milestone 5 Views */}
        {activeTab === 'android-tv' && <AndroidTvLeanbackSurface />}
        {activeTab === 'm5-test-suite' && <Milestone5TestSuite />}

        {/* Milestone 4 Views */}
        {activeTab === 'epg-stream' && (
          <EpgStreamSurface onTuneChannel={handleTuneChannelFromEpgOrRemote} />
        )}
        {activeTab === 'm4-test-suite' && <Milestone4TestSuite />}

        {/* Milestone 3 Views */}
        {activeTab === 'epg-grid' && (
          <EpgGridSurface
            onTuneChannel={handleTuneChannelFromEpgOrRemote}
            onPlayCatchup={handlePlayMediaFromVodOrCatchup}
          />
        )}
        {activeTab === 'vod-catalog' && (
          <VodSeriesCatalog onPlayMedia={handlePlayMediaFromVodOrCatchup} />
        )}
        {activeTab === 'channel-management' && (
          <ChannelManagementZapper onTuneChannel={handleTuneChannelFromEpgOrRemote} />
        )}
        {activeTab === 'm3-test-suite' && <Milestone3TestSuite />}

        {/* Milestone 2 Views */}
        {activeTab === 'live-player' && <LivePlayerSurface />}
        {activeTab === 'm2-test-suite' && <Milestone2TestSuite />}
        {activeTab === 'mpv-bridge' && <MpvBridgeInspector />}
        {activeTab === 'stall-recovery' && <StallRecoveryVisualizer />}

        {/* Milestone 1 Views */}
        {activeTab === 'm1-test-suite' && <Milestone1TestSuite />}
        {activeTab === 'data-layer' && <DataLayerExplorer />}
        {activeTab === 'error-taxonomy' && <ErrorTaxonomyTester />}
        {activeTab === 'stream-policy' && <StreamPolicyTester />}
        {activeTab === 'connection-limit' && <ConnectionLimitSimulator />}

        {/* Milestone 0 Views */}
        {activeTab === 'report' && (
          <DiagnosticReportView report={report} onRunNewProbe={() => setActiveTab('probe')} />
        )}
        {activeTab === 'probe' && <LiveProbeRunner onProbeCompleted={handleProbeCompleted} />}
        {activeTab === 'sniffer' && <ByteSnifferTool />}
        {activeTab === 'redact' && <RedactPlayground />}
        {activeTab === 'fixtures' && <FixturesViewer />}
        {activeTab === 'logs' && <DiagnosticsLogViewer />}
        {activeTab === 'architecture' && <ArchitectureRoadmap />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        IPTV Player Suite • Milestones 0, 1, 2 &amp; 3 Complete • Mode 0600 Sanitized • Zero Telemetry Verified
      </footer>
    </div>
  );
}

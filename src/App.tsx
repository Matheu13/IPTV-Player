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
import { Milestones11to14TestSuite } from './components/Milestones11to14TestSuite';
import { Milestones16to18TestSuite } from './components/Milestones16to18TestSuite';
import { Milestones19to20TestSuite } from './components/Milestones19to20TestSuite';
import { StalkerPortalSurface } from './components/StalkerPortalSurface';
import { LeanbackSpatialSurface } from './components/LeanbackSpatialSurface';
import { Milestones21to23TestSuite } from './components/Milestones21to23TestSuite';
import { UltraLowLatencySurface } from './components/UltraLowLatencySurface';
import { AiSportsHighlightsSurface } from './components/AiSportsHighlightsSurface';
import { P2pCdnMeshSurface } from './components/P2pCdnMeshSurface';
import { Milestones24to26TestSuite } from './components/Milestones24to26TestSuite';
import { Scte35DaiSurface } from './components/Scte35DaiSurface';
import { MultiRoomCastSurface } from './components/MultiRoomCastSurface';
import { HybridRfTunerSurface } from './components/HybridRfTunerSurface';
import { Milestone27TestSuite } from './components/Milestone27TestSuite';
import { ForensicWatermarkSurface } from './components/ForensicWatermarkSurface';
import { Milestone28TestSuite } from './components/Milestone28TestSuite';
import { Milestone29TestSuite } from './components/Milestone29TestSuite';
import { Milestone30TestSuite } from './components/Milestone30TestSuite';
import { Milestone31TestSuite } from './components/Milestone31TestSuite';
import { SpatialAudioSurface } from './components/SpatialAudioSurface';
import { MilestoneUiRequirementsTestSuite } from './components/MilestoneUiRequirementsTestSuite';
import { UnifiedIptvSurface } from './components/UnifiedIptvSurface';
import { MultiViewSurface } from './components/MultiViewSurface';
import { OfflineDownloadVault } from './components/OfflineDownloadVault';
import { ChannelHealthWatchdogSurface } from './components/ChannelHealthWatchdogSurface';
import { AudioSubtitleEngineSurface } from './components/AudioSubtitleEngineSurface';
import { PvrRecordingManager } from './components/PvrRecordingManager';
import { AbrQosMonitor } from './components/AbrQosMonitor';
import { ParentalControlVault } from './components/ParentalControlVault';
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
  Volume2,
  Tag,
  Cast,
  Fingerprint,
  Headphones,
  Link2,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<
    | 'unified-iptv'
    | 'm31-test-suite'
    | 'm30-test-suite'
    | 'm29-test-suite'
    | 'ui-req-test-suite'
    | 'm28-test-suite'
    | 'spatial-audio'
    | 'm27-test-suite'
    | 'forensic-watermark'
    | 'm24-26-test-suite'
    | 'scte35-dai'
    | 'multi-room-cast'
    | 'hybrid-rf-tuner'
    | 'm19-20-test-suite'
    | 'stalker-portal'
    | 'leanback-spatial'
    | 'm21-23-test-suite'
    | 'ull-player'
    | 'ai-highlights'
    | 'p2p-cdn-mesh'
    | 'm16-18-test-suite'
    | 'multi-view'
    | 'offline-vault'
    | 'channel-health'
    | 'm11-14-test-suite'
    | 'audio-subtitles'
    | 'pvr-recordings'
    | 'abr-qos'
    | 'parental-vault'
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
  >('m16-18-test-suite');

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
      : `/api/stream/live/${channelId}.m3u8`;

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
                <span className="text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-full">
                  Milestones 0 — 14 Complete
                </span>
              </div>
              <p className="text-xs text-slate-400">Atmos/Sub Sync (M11) • DVR/Timeshift (M12) • ABR/QoS (M13) • Parental Vault (M14)</p>
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
          {/* Milestone 28 UI Requirements - Unified IPTV Player */}
          <button
            id="tab-unified-iptv"
            onClick={() => setActiveTab('unified-iptv')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'unified-iptv'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Tv className="w-4 h-4 text-indigo-400" /> Unified IPTV Player (10k+)
          </button>

          {/* Milestone 29: Favorites & Watch History */}
          <button
            id="tab-m29-test-suite"
            onClick={() => setActiveTab('m29-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm29-test-suite'
                ? 'border-rose-500 bg-slate-800 text-rose-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Heart className="w-4 h-4 text-rose-400" /> M29: Favorites &amp; History
          </button>

          {/* Milestone 31: EPG Channel Matching & Uncertainty Guard */}
          <button
            id="tab-m31-test-suite"
            onClick={() => setActiveTab('m31-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm31-test-suite'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Link2 className="w-4 h-4 text-indigo-400" /> M31: EPG Matching (7)
          </button>

          {/* Milestone 30: EPG & XMLTV Streaming */}
          <button
            id="tab-m30-test-suite"
            onClick={() => setActiveTab('m30-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm30-test-suite'
                ? 'border-sky-500 bg-slate-800 text-sky-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-sky-400" /> M30: EPG XMLTV Streaming
          </button>

          <button
            id="tab-ui-req-test-suite"
            onClick={() => setActiveTab('ui-req-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'ui-req-test-suite'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> UI Tests (5)
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestone 28 Spatial Audio */}
          <button
            id="tab-m28-test-suite"
            onClick={() => setActiveTab('m28-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm28-test-suite'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> M28 Tests (4)
          </button>

          <button
            id="tab-spatial-audio"
            onClick={() => setActiveTab('spatial-audio')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'spatial-audio'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Headphones className="w-4 h-4 text-indigo-400" /> M28: Spatial Audio
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestone 27 Primary Tabs */}
          <button
            id="tab-m27-test-suite"
            onClick={() => setActiveTab('m27-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm27-test-suite'
                ? 'border-rose-500 bg-slate-800 text-rose-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-400" /> M27 Tests (4)
          </button>

          <button
            id="tab-forensic-watermark"
            onClick={() => setActiveTab('forensic-watermark')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'forensic-watermark'
                ? 'border-rose-500 bg-slate-800 text-rose-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Fingerprint className="w-4 h-4 text-rose-400" /> M27: Forensic Watermarking
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestones 24 - 26 Primary Tabs */}
          <button
            id="tab-m24-26-test-suite"
            onClick={() => setActiveTab('m24-26-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm24-26-test-suite'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> M24-26 Tests (12)
          </button>

          <button
            id="tab-scte35-dai"
            onClick={() => setActiveTab('scte35-dai')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'scte35-dai'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Tag className="w-4 h-4 text-indigo-400" /> M24: DAI &amp; SCTE-35
          </button>

          <button
            id="tab-multi-room-cast"
            onClick={() => setActiveTab('multi-room-cast')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'multi-room-cast'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Cast className="w-4 h-4 text-cyan-400" /> M25: Multi-Room Cast
          </button>

          <button
            id="tab-hybrid-rf-tuner"
            onClick={() => setActiveTab('hybrid-rf-tuner')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'hybrid-rf-tuner'
                ? 'border-emerald-500 bg-slate-800 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400" /> M26: Hybrid RF &amp; BISS
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestones 19 - 20 Primary Tabs */}
          <button
            id="tab-m19-20-test-suite"
            onClick={() => setActiveTab('m19-20-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm19-20-test-suite'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> M19-20 Tests (8)
          </button>

          <button
            id="tab-stalker-portal"
            onClick={() => setActiveTab('stalker-portal')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'stalker-portal'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Tv className="w-4 h-4 text-indigo-400" /> M19: Stalker / MAG
          </button>

          <button
            id="tab-leanback-spatial"
            onClick={() => setActiveTab('leanback-spatial')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'leanback-spatial'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-cyan-400" /> M20: 10-Foot Leanback
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestones 21 - 23 Primary Tabs */}
          <button
            id="tab-m21-23-test-suite"
            onClick={() => setActiveTab('m21-23-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm21-23-test-suite'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" /> M21-23 Tests (9)
          </button>

          <button
            id="tab-ull-player"
            onClick={() => setActiveTab('ull-player')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'ull-player'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-400" /> M21: ULL &amp; CMAF
          </button>

          <button
            id="tab-ai-highlights"
            onClick={() => setActiveTab('ai-highlights')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'ai-highlights'
                ? 'border-amber-500 bg-slate-800 text-amber-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" /> M22: AI Highlights &amp; Audio
          </button>

          <button
            id="tab-p2p-cdn-mesh"
            onClick={() => setActiveTab('p2p-cdn-mesh')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'p2p-cdn-mesh'
                ? 'border-emerald-500 bg-slate-800 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" /> M23: P2P Swarm &amp; CDN
          </button>

          {/* Divider */}
          <div className="h-5 w-px bg-slate-800 self-center mx-1" />

          {/* Milestones 16 - 18 Primary Tabs */}
          <button
            id="tab-m16-18-test-suite"
            onClick={() => setActiveTab('m16-18-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm16-18-test-suite'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> M16-18 Test Suite (9)
          </button>

          <button
            id="tab-multi-view"
            onClick={() => setActiveTab('multi-view')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'multi-view'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-400" /> M16: Multi-View (Quad / PiP)
          </button>

          <button
            id="tab-offline-vault"
            onClick={() => setActiveTab('offline-vault')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'offline-vault'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4 text-cyan-400" /> M17: Offline DRM Vault
          </button>

          <button
            id="tab-channel-health"
            onClick={() => setActiveTab('channel-health')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'channel-health'
                ? 'border-emerald-500 bg-slate-800 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" /> M18: Watchdog &amp; Failover
          </button>

          {/* Milestones 11 - 14 Primary Tabs */}
          <button
            id="tab-m11-14-test-suite"
            onClick={() => setActiveTab('m11-14-test-suite')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'm11-14-test-suite'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold shadow-inner'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" /> M11-14 Tests (12)
          </button>

          <button
            id="tab-audio-subtitles"
            onClick={() => setActiveTab('audio-subtitles')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'audio-subtitles'
                ? 'border-indigo-500 bg-slate-800 text-indigo-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Volume2 className="w-4 h-4 text-indigo-400" /> M11: Audio &amp; Subtitles
          </button>

          <button
            id="tab-pvr-recordings"
            onClick={() => setActiveTab('pvr-recordings')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'pvr-recordings'
                ? 'border-cyan-500 bg-slate-800 text-cyan-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <HardDrive className="w-4 h-4 text-cyan-400" /> M12: DVR &amp; Timeshift
          </button>

          <button
            id="tab-abr-qos"
            onClick={() => setActiveTab('abr-qos')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'abr-qos'
                ? 'border-emerald-500 bg-slate-800 text-emerald-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" /> M13: ABR &amp; QoS Telemetry
          </button>

          <button
            id="tab-parental-vault"
            onClick={() => setActiveTab('parental-vault')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'parental-vault'
                ? 'border-purple-500 bg-slate-800 text-purple-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 text-purple-400" /> M14: Parental Vault
          </button>

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
            <ShieldCheck className="w-4 h-4 text-cyan-400" /> M6-10 Tests (11)
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
        {/* Milestone 29, 30 & 31 Views */}
        {activeTab === 'm31-test-suite' && <Milestone31TestSuite />}
        {activeTab === 'm30-test-suite' && <Milestone30TestSuite />}
        {activeTab === 'm29-test-suite' && <Milestone29TestSuite />}

        {/* Milestone 28 UI Requirements Views */}
        {activeTab === 'unified-iptv' && <UnifiedIptvSurface />}
        {activeTab === 'ui-req-test-suite' && <MilestoneUiRequirementsTestSuite />}

        {/* Milestone 28 Views */}
        {activeTab === 'm28-test-suite' && <Milestone28TestSuite />}
        {activeTab === 'spatial-audio' && (
          <SpatialAudioSurface onPlayStream={handlePlayMediaFromVodOrCatchup} />
        )}

        {/* Milestone 27 Views */}
        {activeTab === 'm27-test-suite' && <Milestone27TestSuite />}
        {activeTab === 'forensic-watermark' && (
          <ForensicWatermarkSurface onPlayStream={handlePlayMediaFromVodOrCatchup} />
        )}

        {/* Milestones 24 - 26 Views */}
        {activeTab === 'm24-26-test-suite' && <Milestones24to26TestSuite />}
        {activeTab === 'scte35-dai' && (
          <Scte35DaiSurface onPlayStream={handlePlayMediaFromVodOrCatchup} />
        )}
        {activeTab === 'multi-room-cast' && (
          <MultiRoomCastSurface onPlayStream={handlePlayMediaFromVodOrCatchup} />
        )}
        {activeTab === 'hybrid-rf-tuner' && (
          <HybridRfTunerSurface onPlayStream={handlePlayMediaFromVodOrCatchup} />
        )}

        {/* Milestones 19 - 20 Views */}
        {activeTab === 'm19-20-test-suite' && <Milestones19to20TestSuite />}
        {activeTab === 'stalker-portal' && (
          <StalkerPortalSurface onPlayStream={handlePlayMediaFromVodOrCatchup} />
        )}
        {activeTab === 'leanback-spatial' && <LeanbackSpatialSurface />}

        {/* Milestones 21 - 23 Views */}
        {activeTab === 'm21-23-test-suite' && <Milestones21to23TestSuite />}
        {activeTab === 'ull-player' && <UltraLowLatencySurface />}
        {activeTab === 'ai-highlights' && <AiSportsHighlightsSurface />}
        {activeTab === 'p2p-cdn-mesh' && <P2pCdnMeshSurface />}

        {/* Milestones 16 - 18 Views */}
        {activeTab === 'm16-18-test-suite' && <Milestones16to18TestSuite />}
        {activeTab === 'multi-view' && <MultiViewSurface />}
        {activeTab === 'offline-vault' && <OfflineDownloadVault />}
        {activeTab === 'channel-health' && <ChannelHealthWatchdogSurface />}

        {/* Milestones 11 - 14 Views */}
        {activeTab === 'm11-14-test-suite' && <Milestones11to14TestSuite />}
        {activeTab === 'audio-subtitles' && <AudioSubtitleEngineSurface />}
        {activeTab === 'pvr-recordings' && <PvrRecordingManager />}
        {activeTab === 'abr-qos' && <AbrQosMonitor />}
        {activeTab === 'parental-vault' && <ParentalControlVault />}

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

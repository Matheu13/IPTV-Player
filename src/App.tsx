import React, { useState, useEffect } from 'react';
import { AppShell, CinematicShell } from './ui/components/AppShell';
import { DesignSystemProvider } from './ui/context/DesignSystemContext';
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
import { Milestone32TestSuite } from './components/Milestone32TestSuite';
import { MilestoneFirestickVerification } from './components/MilestoneFirestickVerification';
import { FirestickDiagnosticsDashboard } from './components/FirestickDiagnosticsDashboard';
import { Phase47PlaybackReliabilitySurface } from './components/Phase47PlaybackReliabilitySurface';
import { Milestone33TestSuite } from './components/Milestone33TestSuite';
import { Milestone34TestSuite } from './components/Milestone34TestSuite';
import { SourceMonitorDashboard } from './components/SourceMonitorDashboard';
import { Milestone37to38TestSuite } from './components/Milestone37to38TestSuite';
import { Milestone42TestSuite } from './components/Milestone42TestSuite';
import { Phase48SourceValidation } from './components/Phase48SourceValidation';
import { SpatialAudioSurface } from './components/SpatialAudioSurface';
import { MilestoneUiRequirementsTestSuite } from './components/MilestoneUiRequirementsTestSuite';
import { UnifiedIptvSurface } from './components/UnifiedIptvSurface';
import { AdaptiveResolutionSurface } from './components/AdaptiveResolutionSurface';
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
  Sparkles,
  Layers,
  Tv,
  Calendar,
  Film,
  Lock,
  Search,
  Monitor,
  Volume2,
  Tag,
  Cast,
  Fingerprint,
  Headphones,
  Link2,
  Smartphone,
  Sliders,
  CheckCircle2,
  Terminal,
  Database,
  Play,
  Share2,
} from 'lucide-react';

type Tab =
  | 'phase48-source-validation'
  | 'source-monitor'
  | 'm37-38-test-suite'
  | 'm42-test-suite'
  | 'adaptive-resolution'
  | 'unified-iptv'
  | 'm34-test-suite'
  | 'm33-test-suite'
  | 'm32-test-suite'
  | 'phase47-playback'
  | 'firestick-test-suite'
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
  | 'architecture';

interface TabConfig {
  id: Tab;
  name: string;
  category: string;
  icon: React.ElementType;
  badge: string;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'phase48-source-validation', name: 'Phase 48: 14.9k Ingestion', category: 'Milestones', icon: Activity, badge: 'P48', description: 'Validate 14,900+ channels ingestion & metadata' },
  { id: 'source-monitor', name: 'Source Monitor Dashboard', category: 'Ingestion & Data', icon: Activity, badge: 'Live', description: 'Monitor upstream provider health, latency & QoS' },
  { id: 'm37-38-test-suite', name: 'M37-38: Source Monitor', category: 'Milestones', icon: Activity, badge: 'M37-38', description: 'Source health watchdog & automatic failover' },
  { id: 'm42-test-suite', name: 'M42: Adaptive P2P Mesh', category: 'Milestones', icon: Share2, badge: 'M42', description: 'P2P WebRTC CDN mesh bandwidth sharing' },
  { id: 'adaptive-resolution', name: 'Adaptive Res Matrix (M41)', category: 'Playback & Stream', icon: Sliders, badge: 'M41', description: 'ABR seamless stream ladder transitions' },
  { id: 'unified-iptv', name: 'Unified Multi-Source (M39-40)', category: 'Ingestion & Data', icon: Layers, badge: 'M39-40', description: 'Aggregate M3U, Xtream & Stalker into single catalog' },
  { id: 'm34-test-suite', name: 'M34: Spatial Audio Suite', category: 'Milestones', icon: Sparkles, badge: 'M34', description: 'Binaural 5.1/7.1 audio virtualization verification' },
  { id: 'm33-test-suite', name: 'M33: DRM Matrix Suite', category: 'Milestones', icon: Lock, badge: 'M33', description: 'Widevine L1/L3 & FairPlay DRM key rotation' },
  { id: 'm32-test-suite', name: 'M32: Low Power Suite', category: 'Milestones', icon: CheckCircle2, badge: 'M32', description: 'Firestick / low-spec CPU & memory optimization' },
  { id: 'phase47-playback', name: 'Phase 47: Playback Reliability', category: 'Milestones', icon: Activity, badge: 'P47', description: 'Zero-buffer fallback & failover reliability' },
  { id: 'firestick-test-suite', name: 'Firestick Diagnostics', category: 'Playback & Stream', icon: Tv, badge: 'M32-FS', description: 'Hardware acceleration & low-RAM profile test' },
  { id: 'm31-test-suite', name: 'M31: Catchup Suite', category: 'Milestones', icon: Calendar, badge: 'M31', description: 'Catchup archive navigation & reverse timeshift' },
  { id: 'm30-test-suite', name: 'M30: Timeshift Suite', category: 'Milestones', icon: Film, badge: 'M30', description: 'Live pause, rewind and instant seek buffer' },
  { id: 'm29-test-suite', name: 'M29: Cloud DVR Suite', category: 'Milestones', icon: Database, badge: 'M29', description: 'Scheduled recording & cloud DVR storage manager' },
  { id: 'ui-req-test-suite', name: 'UI Requirements Suite', category: 'Milestones', icon: CheckCircle2, badge: 'UI-REQ', description: 'Dark theme, keyboard navigation & contrast' },
  { id: 'm28-test-suite', name: 'M28: Watermark Suite', category: 'Milestones', icon: Fingerprint, badge: 'M28', description: 'Forensic session & user watermarking verification' },
  { id: 'spatial-audio', name: 'Spatial Audio Surface', category: 'Playback & Stream', icon: Headphones, badge: 'M34', description: 'Simulated 3D surround sound processing' },
  { id: 'm27-test-suite', name: 'M27: Tuner Suite', category: 'Milestones', icon: Radio, badge: 'M27', description: 'Hybrid RF / ATSC / DVB tuner hardware emulation' },
  { id: 'forensic-watermark', name: 'Forensic Watermark Surface', category: 'Playback & Stream', icon: Fingerprint, badge: 'M28', description: 'Dynamic cryptographic screen overlay' },
  { id: 'm24-26-test-suite', name: 'M24-26: Core Tuner Suite', category: 'Milestones', icon: Tv, badge: 'M24-26', description: 'DAI, multi-room cast & hybrid hardware tuners' },
  { id: 'scte35-dai', name: 'SCTE-35 DAI Surface', category: 'Playback & Stream', icon: Tag, badge: 'M24', description: 'Targeted ad insertion cue marker inspector' },
  { id: 'multi-room-cast', name: 'Multi-Room Cast Surface', category: 'Playback & Stream', icon: Cast, badge: 'M25', description: 'Synchronized multi-screen broadcast sync' },
  { id: 'hybrid-rf-tuner', name: 'Hybrid RF Tuner Surface', category: 'Playback & Stream', icon: Radio, badge: 'M26', description: 'Hardware tuner scanning & modulation diagnostics' },
  { id: 'm19-20-test-suite', name: 'M19-20: Leanback Suite', category: 'Milestones', icon: Tv, badge: 'M19-20', description: 'Stalker portal protocol & spatial navigation' },
  { id: 'stalker-portal', name: 'Stalker Portal Surface', category: 'Ingestion & Data', icon: Link2, badge: 'M19', description: 'Ministra / Stalker MAC handshake & stream loader' },
  { id: 'leanback-spatial', name: 'Leanback Spatial Surface', category: 'UI & Layout', icon: Smartphone, badge: 'M20', description: 'D-pad focus engine and remote control tester' },
  { id: 'm21-23-test-suite', name: 'M21-23: Ultra-Low Suite', category: 'Milestones', icon: Activity, badge: 'M21-23', description: 'LL-HLS, AI highlights & WebRTC P2P mesh' },
  { id: 'ull-player', name: 'Ultra-Low Latency Surface', category: 'Playback & Stream', icon: Play, badge: 'M21', description: 'Sub-second chunked playback engine' },
  { id: 'ai-highlights', name: 'AI Sports Highlights', category: 'UI & Layout', icon: Sparkles, badge: 'M22', description: 'Automated goal & key moment detection' },
  { id: 'p2p-cdn-mesh', name: 'P2P CDN Mesh Surface', category: 'Playback & Stream', icon: Share2, badge: 'M23', description: 'Decentralized peer-to-peer stream distribution' },
  { id: 'm16-18-test-suite', name: 'M16-18: Multi-View Suite', category: 'Milestones', icon: Monitor, badge: 'M16-18', description: 'Multi-screen grids, offline vault & channel health' },
  { id: 'multi-view', name: 'Multi-View 4x4 Grid', category: 'Playback & Stream', icon: Monitor, badge: 'M16', description: 'Simultaneous quad & 9-channel live stream mosaic' },
  { id: 'offline-vault', name: 'Offline Download Vault', category: 'Playback & Stream', icon: HardDrive, badge: 'M17', description: 'Encrypted offline media storage & playback' },
  { id: 'channel-health', name: 'Channel Health Watchdog', category: 'Ingestion & Data', icon: Activity, badge: 'M18', description: 'Automated 24/7 stream uptime & bitrate monitor' },
  { id: 'm11-14-test-suite', name: 'M11-14: Media Engine Suite', category: 'Milestones', icon: Volume2, badge: 'M11-14', description: 'Audio tracks, subtitles, DVR & parental controls' },
  { id: 'audio-subtitles', name: 'Atmos & Sub Engine', category: 'Playback & Stream', icon: Volume2, badge: 'M11', description: 'Multi-track audio & CEA-608/708 subtitle sync' },
  { id: 'pvr-recordings', name: 'DVR & Timeshift Manager', category: 'Playback & Stream', icon: Film, badge: 'M12', description: 'PVR recording rules & live buffer scrubber' },
  { id: 'abr-qos', name: 'ABR & QoS Stream Monitor', category: 'Playback & Stream', icon: Activity, badge: 'M13', description: 'Real-time bandwidth, dropped frames & buffer health' },
  { id: 'parental-vault', name: 'Parental Pin Vault', category: 'UI & Layout', icon: Lock, badge: 'M14', description: 'PIN protection & rating-based channel locks' },
  { id: 'm6-10-test-suite', name: 'M6-10: Pipeline Suite', category: 'Milestones', icon: Activity, badge: 'M6-10', description: 'Ingestion, transcoding, failover & multi-source' },
  { id: 'advanced-diagnostics', name: 'Diagnostics & Metrics', category: 'Ingestion & Data', icon: Activity, badge: 'Live', description: 'Full-system telemetry, active sockets & memory' },
  { id: 'multi-source', name: 'Multi-Source Matrix', category: 'Ingestion & Data', icon: Layers, badge: 'Live', description: 'Cross-provider stream comparison & switcher' },
  { id: 'android-tv', name: 'Android TV Leanback', category: 'UI & Layout', icon: Tv, badge: '10-Foot', description: 'Full-screen 10-foot UI designed for TV remotes' },
  { id: 'm5-test-suite', name: 'M5: Leanback Suite', category: 'Milestones', icon: Activity, badge: 'M5', description: 'Leanback navigation and spatial focus verification' },
  { id: 'live-player', name: 'Live Player Surface', category: 'Playback & Stream', icon: Play, badge: 'Live', description: 'Low-latency HLS/TS player with channel switcher' },
  { id: 'epg-stream', name: 'EPG Stream Grid', category: 'UI & Layout', icon: Calendar, badge: 'M4', description: 'Timeline EPG linked directly to live streams' },
  { id: 'm4-test-suite', name: 'M4: Streaming EPG', category: 'Milestones', icon: Activity, badge: 'M4', description: 'XMLTV ingestion, caching and fast timeline rendering' },
  { id: 'm3-test-suite', name: 'M3: Metadata Suite', category: 'Milestones', icon: Activity, badge: 'M3', description: 'EPG, VOD catalog & channel categorization tests' },
  { id: 'epg-grid', name: 'EPG Timeline Matrix', category: 'UI & Layout', icon: Calendar, badge: 'M3', description: 'Interactive multi-channel program timeline' },
  { id: 'vod-catalog', name: 'VOD & Series Catalog', category: 'Playback & Stream', icon: Film, badge: 'M3', description: 'Movies, seasons and episode browser' },
  { id: 'channel-management', name: 'Channel & Category Zapper', category: 'UI & Layout', icon: Sliders, badge: 'M3', description: 'Reorder, group and favorite channels' },
  { id: 'm2-test-suite', name: 'M2: Playback Suite', category: 'Milestones', icon: Activity, badge: 'M2', description: 'ExoPlayer / MPV bridge & stall recovery tests' },
  { id: 'mpv-bridge', name: 'MPV Native IPC Bridge', category: 'Playback & Stream', icon: Terminal, badge: 'M2', description: 'Native MPV player integration and IPC socket' },
  { id: 'stall-recovery', name: 'Stall Recovery Engine', category: 'Playback & Stream', icon: Activity, badge: 'M2', description: 'Automatic stream unfreezing and retry pipeline' },
  { id: 'm1-test-suite', name: 'M1: Architecture Suite', category: 'Milestones', icon: Activity, badge: 'M1', description: 'SQLite persistence, error taxonomy & stream policy' },
  { id: 'data-layer', name: 'SQLite / M3U Data Layer', category: 'Ingestion & Data', icon: Database, badge: 'M1', description: 'Live SQLite tables, channel rows and query tester' },
  { id: 'error-taxonomy', name: 'Error Taxonomy Matrix', category: 'Ingestion & Data', icon: Activity, badge: 'M1', description: 'Simulate and verify standard IPTV error codes' },
  { id: 'stream-policy', name: 'Stream Quality Policy Engine', category: 'Playback & Stream', icon: Sliders, badge: 'M1', description: 'Adaptive bandwidth and resolution switching policy' },
  { id: 'connection-limit', name: 'Strict Connection Limiter', category: 'Ingestion & Data', icon: Lock, badge: 'M1', description: 'Enforce strict 1-stream provider connection limit' },
  { id: 'report', name: 'M0 Diagnostic Report', category: 'Milestones', icon: Activity, badge: 'M0', description: 'System health, dependency check & engine status' },
  { id: 'probe', name: 'Live Probe Runner', category: 'Tools', icon: Radio, badge: 'Tools', description: 'Run network probes against live stream endpoints' },
  { id: 'sniffer', name: 'Byte Sniffer Tool', category: 'Tools', icon: Binary, badge: 'Tools', description: 'Inspect raw TS/HLS packet headers and streams' },
  { id: 'redact', name: 'Redact Engine Playground', category: 'Tools', icon: ShieldCheck, badge: 'Tools', description: 'Test credential and URL redacting routines' },
  { id: 'fixtures', name: 'M3U / XMLTV Fixtures', category: 'Ingestion & Data', icon: HardDrive, badge: 'Data', description: 'View raw sample M3U playlists and EPG XML files' },
  { id: 'logs', name: 'Diagnostic Logs Viewer', category: 'Tools', icon: ScrollText, badge: 'Logs', description: 'Real-time diagnostic event stream and log dump' },
  { id: 'architecture', name: 'Architecture Roadmap', category: 'Specs', icon: Activity, badge: 'Specs', description: 'IPTV Player architecture milestones & system blueprint' },
];

export default function App() {
  const [appMode, setAppMode] = useState<'cinematic_os' | 'diagnostic_matrix'>('cinematic_os');
  const [activeTab, setActiveTab] = useState<Tab>('phase48-source-validation');
  const [report, setReport] = useState<Milestone0DiagnosticReport | null>(null);

  const handleTuneChannel = (channelIdOrObj: any, maybeName?: string) => {
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

  if (appMode === 'cinematic_os') {
    return (
      <DesignSystemProvider>
        <div className="relative h-screen w-screen overflow-hidden">
          <CinematicShell />
          {/* Floating Quick Switcher to Developer Diagnostics Matrix */}
          <button
            onClick={() => setAppMode('diagnostic_matrix')}
            className="fixed bottom-3 right-3 z-50 px-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 border border-slate-700/80 rounded-lg text-[11px] font-mono shadow-xl transition-all flex items-center gap-1.5 backdrop-blur-md opacity-75 hover:opacity-100"
            title="Switch to Developer Diagnostics & Milestone Matrix"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dev Diagnostics</span>
          </button>
        </div>
      </DesignSystemProvider>
    );
  }

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
                  Diagnostic Matrix
                </span>
              </div>
              <p className="text-xs text-slate-400">Atmos/Sub Sync (M11) • DVR/Timeshift (M12) • ABR/QoS (M13) • Parental Vault (M14)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setAppMode('cinematic_os')}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center gap-1.5"
            >
              <Tv className="w-4 h-4" />
              <span>Open Cinematic Player UI</span>
            </button>
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
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-t-lg transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-sky-500 bg-slate-800 text-sky-300 font-semibold shadow-inner'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{tab.name}</span>
                {tab.badge && (
                  <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-medium ${
                    isActive ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'phase48-source-validation' && <Phase48SourceValidation />}
        {activeTab === 'source-monitor' && <SourceMonitorDashboard onTuneChannel={handleTuneChannel} />}
        {activeTab === 'm37-38-test-suite' && <Milestone37to38TestSuite />}
        {activeTab === 'm42-test-suite' && <Milestone42TestSuite />}
        {activeTab === 'adaptive-resolution' && <AdaptiveResolutionSurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'unified-iptv' && <UnifiedIptvSurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'm34-test-suite' && <Milestone34TestSuite />}
        {activeTab === 'm33-test-suite' && <Milestone33TestSuite />}
        {activeTab === 'm32-test-suite' && <Milestone32TestSuite />}
        {activeTab === 'phase47-playback' && <Phase47PlaybackReliabilitySurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'firestick-test-suite' && <FirestickDiagnosticsDashboard />}
        {activeTab === 'm31-test-suite' && <Milestone31TestSuite />}
        {activeTab === 'm30-test-suite' && <Milestone30TestSuite />}
        {activeTab === 'm29-test-suite' && <Milestone29TestSuite />}
        {activeTab === 'ui-req-test-suite' && <MilestoneUiRequirementsTestSuite />}
        {activeTab === 'm28-test-suite' && <Milestone28TestSuite />}
        {activeTab === 'spatial-audio' && <SpatialAudioSurface />}
        {activeTab === 'm27-test-suite' && <Milestone27TestSuite />}
        {activeTab === 'forensic-watermark' && <ForensicWatermarkSurface />}
        {activeTab === 'm24-26-test-suite' && <Milestones24to26TestSuite />}
        {activeTab === 'scte35-dai' && <Scte35DaiSurface />}
        {activeTab === 'multi-room-cast' && <MultiRoomCastSurface />}
        {activeTab === 'hybrid-rf-tuner' && <HybridRfTunerSurface />}
        {activeTab === 'm19-20-test-suite' && <Milestones19to20TestSuite />}
        {activeTab === 'stalker-portal' && <StalkerPortalSurface />}
        {activeTab === 'leanback-spatial' && <LeanbackSpatialSurface />}
        {activeTab === 'm21-23-test-suite' && <Milestones21to23TestSuite />}
        {activeTab === 'ull-player' && <UltraLowLatencySurface />}
        {activeTab === 'ai-highlights' && <AiSportsHighlightsSurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'p2p-cdn-mesh' && <P2pCdnMeshSurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'm16-18-test-suite' && <Milestones16to18TestSuite />}
        {activeTab === 'multi-view' && <MultiViewSurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'offline-vault' && <OfflineDownloadVault onPlayMedia={handlePlayMediaFromVodOrCatchup} />}
        {activeTab === 'channel-health' && <ChannelHealthWatchdogSurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'm11-14-test-suite' && <Milestones11to14TestSuite />}
        {activeTab === 'audio-subtitles' && <AudioSubtitleEngineSurface />}
        {activeTab === 'pvr-recordings' && <PvrRecordingManager onPlayMedia={handlePlayMediaFromVodOrCatchup} />}
        {activeTab === 'abr-qos' && <AbrQosMonitor onTuneChannel={handleTuneChannel} />}
        {activeTab === 'parental-vault' && <ParentalControlVault />}
        {activeTab === 'm6-10-test-suite' && <Milestones6to10TestSuite />}
        {activeTab === 'advanced-diagnostics' && <AdvancedDiagnosticsPanel />}
        {activeTab === 'multi-source' && <MultiSourceMatrixView onTuneChannel={handleTuneChannel} />}
        {activeTab === 'android-tv' && <AndroidTvLeanbackSurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'm5-test-suite' && <Milestone5TestSuite />}
        {activeTab === 'live-player' && <LivePlayerSurface />}
        {activeTab === 'epg-stream' && <EpgStreamSurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'm4-test-suite' && <Milestone4TestSuite />}
        {activeTab === 'm3-test-suite' && <Milestone3TestSuite />}
        {activeTab === 'epg-grid' && <EpgGridSurface onTuneChannel={handleTuneChannel} />}
        {activeTab === 'vod-catalog' && <VodSeriesCatalog onPlayMedia={handlePlayMediaFromVodOrCatchup} />}
        {activeTab === 'channel-management' && <ChannelManagementZapper onTuneChannel={handleTuneChannel} />}
        {activeTab === 'm2-test-suite' && <Milestone2TestSuite />}
        {activeTab === 'mpv-bridge' && <MpvBridgeInspector />}
        {activeTab === 'stall-recovery' && <StallRecoveryVisualizer />}
        {activeTab === 'm1-test-suite' && <Milestone1TestSuite />}
        {activeTab === 'data-layer' && <DataLayerExplorer />}
        {activeTab === 'error-taxonomy' && <ErrorTaxonomyTester />}
        {activeTab === 'stream-policy' && <StreamPolicyTester />}
        {activeTab === 'connection-limit' && <ConnectionLimitSimulator />}
        {activeTab === 'report' && <DiagnosticReportView report={report} onRefresh={() => setReport(null)} />}
        {activeTab === 'probe' && <LiveProbeRunner />}
        {activeTab === 'sniffer' && <ByteSnifferTool />}
        {activeTab === 'redact' && <RedactPlayground />}
        {activeTab === 'fixtures' && <FixturesViewer />}
        {activeTab === 'logs' && <DiagnosticsLogViewer />}
        {activeTab === 'architecture' && <ArchitectureRoadmap />}
      </main>
    </div>
  );
}

import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Palette,
  Tv,
  Play,
  Star,
  Activity,
  Sliders,
  Monitor,
  Smartphone,
  Flame,
  Volume2,
  Radio,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Eye,
  Hash,
  LayoutGrid,
  Search,
  Subtitles,
} from 'lucide-react';
import { useDesignSystem, PlatformTarget, DensityMode, ThemeVariant } from '../context/DesignSystemContext';
import { GlassPanel } from './GlassPanel';
import { Button } from './Button';
import { Badge } from './Badge';
import { ChannelRow, ChannelRowData } from './ChannelRow';
import { ChannelCard } from './ChannelCard';
import { SourceBadge } from './SourceBadge';
import { VisualStates } from './VisualStates';
import { Focusable } from './Focusable';
import { CategoryFilterBar, DEFAULT_CATEGORIES } from './CategoryFilterBar';
import { HeroChannelBanner } from './HeroChannelBanner';
import { OmniSearchBar } from './OmniSearchBar';
import { EpgTimelineRow, EpgProgramItem } from './EpgTimelineRow';
import { StreamAudioSubtitleModal } from './StreamAudioSubtitleModal';
import { MultiViewMatrix } from './MultiViewMatrix';
import { QuickZapOverlay } from './QuickZapOverlay';

export const DesignSystemShowcase: React.FC = () => {
  const {
    platform,
    setPlatform,
    density,
    setDensity,
    themeVariant,
    setThemeVariant,
    capabilities,
  } = useDesignSystem();

  const [activeTab, setActiveTab] = useState<
    'components' | 'hero' | 'channel_rows' | 'multiview' | 'epg' | 'cards' | 'tokens' | 'states' | 'player'
  >('components');

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('all');
  const [focusedId, setFocusedId] = useState<string>('');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isZapModalOpen, setIsZapModalOpen] = useState(false);
  const [lastZappedChannel, setLastZappedChannel] = useState<number | null>(null);

  // Mock channels for showcase
  const sampleChannels: ChannelRowData[] = [
    {
      id: 'ch-1',
      channelNumber: 101,
      name: 'BBC One HD (Live)',
      logo: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=100&auto=format&fit=crop&q=60',
      category: 'General Entertainment',
      sourceName: 'Prime Xtream',
      sourceType: 'xtream',
      streamUrl: 'http://demo.stream/bbc1.m3u8',
      nowProgramme: {
        title: 'Planet Earth III: Extreme Environments',
        start: '18:00',
        stop: '19:00',
        progressPercent: 62,
      },
      nextProgramme: {
        title: 'BBC News at Six & Regional Update',
        start: '19:00',
        stop: '19:30',
      },
      is4k: true,
      isHdr: true,
      isFavorite: true,
    },
    {
      id: 'ch-2',
      channelNumber: 102,
      name: 'Sky Sports Main Event 8K',
      logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=100&auto=format&fit=crop&q=60',
      category: 'Sports',
      sourceName: 'Ultra M3U Pro',
      sourceType: 'm3u',
      streamUrl: 'http://demo.stream/skysports.m3u8',
      nowProgramme: {
        title: 'Premier League: Super Sunday Matchday Live',
        start: '17:30',
        stop: '20:00',
        progressPercent: 35,
      },
      nextProgramme: {
        title: 'Match Analysis & Post-Game Reaction',
        start: '20:00',
        stop: '21:00',
      },
      is8k: true,
      isHdr: true,
      isFavorite: false,
    },
    {
      id: 'ch-3',
      channelNumber: 103,
      name: 'Discovery Cinema 4K',
      category: 'Documentary',
      sourceName: 'Backup Gateway',
      sourceType: 'xtream',
      streamUrl: 'http://demo.stream/discovery.m3u8',
      nowProgramme: {
        title: 'Deep Ocean Frontiers: Submersible Exploration',
        start: '18:15',
        stop: '19:15',
        progressPercent: 20,
      },
      is4k: true,
      isFavorite: false,
    },
    {
      id: 'ch-4',
      channelNumber: 104,
      name: 'HBO Max Cinema Premiere',
      logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=100&auto=format&fit=crop&q=60',
      category: 'Movies',
      sourceName: 'Prime Xtream',
      sourceType: 'xtream',
      streamUrl: 'http://demo.stream/hbomax.m3u8',
      nowProgramme: {
        title: 'Dune: Part Two (IMAX Edition)',
        start: '18:00',
        stop: '20:45',
        progressPercent: 55,
      },
      is4k: true,
      isHdr: true,
      isFavorite: true,
    },
  ];

  const sampleEpgPrograms: EpgProgramItem[] = [
    {
      id: 'p1',
      title: 'Planet Earth III: Extreme Environments',
      category: 'Documentary • Nature',
      start: '18:00',
      stop: '19:00',
      isLive: true,
      progressPercent: 62,
      is4k: true,
    },
    {
      id: 'p2',
      title: 'BBC News at Six & Regional Weather',
      category: 'News • Live',
      start: '19:00',
      stop: '19:30',
    },
    {
      id: 'p3',
      title: 'MasterChef: The Semi-Finals Live Cookoff',
      category: 'Entertainment • Reality',
      start: '19:30',
      stop: '20:30',
    },
    {
      id: 'p4',
      title: 'Panorama: Investigation Special',
      category: 'Current Affairs',
      start: '20:30',
      stop: '21:30',
    },
  ];

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto">
      {/* Header & Interactive Platform/Density Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded">
              PHASE 3
            </span>
            <span className="text-xs text-slate-400 font-mono">Cinematic Command OS</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Palette className="w-7 h-7 text-sky-400" />
            <span>Core Components & Design Matrix</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Interactive evaluation surface for all reusable core components: Hero banner, Omni search, Multi-view matrix, EPG timeline rows, and modals.
          </p>
        </div>

        {/* Live Simulator Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-[#111722] p-2.5 rounded-xl border border-white/10 shadow-lg">
          {/* Platform Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono uppercase text-slate-400">Platform:</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformTarget)}
              className="bg-slate-900 border border-slate-700 text-xs text-sky-300 rounded px-2 py-1 font-mono focus:ring-1 focus:ring-sky-400 outline-none"
            >
              <option value="windows">Windows PC</option>
              <option value="android_tv">Android TV</option>
              <option value="fire_tv">Fire TV</option>
              <option value="android_mobile">Android Mobile</option>
              <option value="macos">macOS</option>
              <option value="linux">Linux</option>
            </select>
          </div>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Density Mode Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono uppercase text-slate-400">Density:</span>
            <div className="flex bg-slate-900 rounded p-0.5 border border-slate-800">
              {(['compact', 'comfortable', 'spacious'] as DensityMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDensity(mode)}
                  className={`px-2 py-0.5 text-xs font-mono capitalize rounded transition-colors ${
                    density === mode
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar">
        {[
          { id: 'components', label: '1. Inputs, Chips & Controls' },
          { id: 'hero', label: '2. Cinematic Hero Banner' },
          { id: 'multiview', label: '3. Multi-View Matrix' },
          { id: 'epg', label: '4. EPG Timeline Rows' },
          { id: 'channel_rows', label: '5. Channel Rows & Densities' },
          { id: 'cards', label: '6. Media & Channel Cards' },
          { id: 'tokens', label: '7. Surfaces & Typography' },
          { id: 'states', label: '8. Visual States & Banners' },
          { id: 'player', label: '9. Modals & Audio/Subtitle Dialog' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                : 'bg-[#111722] text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Inputs, Chips & Controls */}
      {activeTab === 'components' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Omni Search Bar */}
          <GlassPanel className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Omni Command Search Bar</h3>
              <p className="text-xs text-slate-400">
                Universal input with keyboard `/` shortcut, channel number jump, clear action, and category chips.
              </p>
            </div>

            <OmniSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              totalResults={searchQuery ? 14 : undefined}
              selectedFilter={searchFilter}
              onSelectFilter={setSearchFilter}
              placeholder="Search 10,000+ live streams, channels (#101), movies, sports..."
            />
          </GlassPanel>

          {/* Category Filter Bar */}
          <GlassPanel className="p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Category & Genre Filter Bar</h3>
              <p className="text-xs text-slate-400">
                Smooth horizontal scrollable pill filter with counts, high-contrast active states, and D-Pad focus.
              </p>
            </div>

            <CategoryFilterBar
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            <div className="text-xs font-mono text-slate-400 pt-2">
              Active Category Selected: <span className="text-sky-400 font-bold uppercase">{selectedCategory}</span>
            </div>
          </GlassPanel>

          {/* Quick Channel Zap Overlay Trigger */}
          <GlassPanel className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white mb-1">Quick Numeric Channel Zap HUD</h3>
                <p className="text-xs text-slate-400">
                  Remote numeric keypad overlay with matched channel preview and auto-tune countdown.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Hash className="w-4 h-4" />}
                onClick={() => setIsZapModalOpen(true)}
              >
                Open Numeric Zap HUD
              </Button>
            </div>

            {lastZappedChannel && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
                Successfully zapped to Channel #{lastZappedChannel}
              </div>
            )}
          </GlassPanel>

          {/* Button & Badge Matrix */}
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white mb-1">Button & Badge Primitives</h3>
              <p className="text-xs text-slate-400">
                High contrast, 2:1 ratio buttons and non-wrapping signal badges.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <span className="text-xs font-mono uppercase text-slate-400 block">Buttons</span>
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" size="sm">Primary Sm</Button>
                  <Button variant="primary" size="md" leftIcon={<Play className="w-4 h-4 fill-current" />}>
                    Watch Live
                  </Button>
                  <Button variant="secondary" size="md">Secondary</Button>
                  <Button variant="outline" size="md">Outline</Button>
                  <Button variant="ghost" size="md">Ghost</Button>
                  <Button
                    variant="primary"
                    size="md"
                    isLoading={buttonLoading}
                    onClick={() => {
                      setButtonLoading(true);
                      setTimeout(() => setButtonLoading(false), 1500);
                    }}
                  >
                    {buttonLoading ? 'Buffering...' : 'Click to Load'}
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-mono uppercase text-slate-400 block">Badges & Sources</span>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="live" pulse>LIVE</Badge>
                  <Badge variant="8k" />
                  <Badge variant="4k" />
                  <Badge variant="hdr" />
                  <Badge variant="fhd" />
                  <Badge variant="hevc" />
                  <SourceBadge sourceName="Prime Xtream" sourceType="xtream" />
                  <SourceBadge sourceName="Ultra M3U" sourceType="m3u" />
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* TAB 2: Cinematic Hero Channel Banner */}
      {activeTab === 'hero' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Cinematic Hero Channel Showcase</h3>
            <p className="text-xs text-slate-400">
              Showcases the active live broadcast with high-contrast typography, live progress meter, upcoming show ticker, and immediate action triggers.
            </p>
          </div>

          <HeroChannelBanner
            channel={sampleChannels[0]}
            onPlay={(ch) => alert(`Initiating Zero-Copy Pipeline for: ${ch.name}`)}
            onToggleFavorite={(id) => alert(`Toggled Favorite for channel ID: ${id}`)}
            onOpenSpecs={(ch) => setIsAudioModalOpen(true)}
          />
        </div>
      )}

      {/* TAB 3: Multi-View Command Matrix */}
      {activeTab === 'multiview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div>
            <h3 className="text-base font-bold text-white mb-1">Multi-View Broadcast Matrix</h3>
            <p className="text-xs text-slate-400">
              Synchronous multi-feed matrix supporting 2x2, 1+3, 1+2, and 1x2 split layouts with dynamic audio focus routing.
            </p>
          </div>

          <MultiViewMatrix
            channels={sampleChannels}
            layout="2x2"
            onSelectMainChannel={(ch) => alert(`Expanded feed to primary fullscreen: ${ch.name}`)}
          />
        </div>
      )}

      {/* TAB 4: EPG Timeline Rows */}
      {activeTab === 'epg' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div>
            <h3 className="text-base font-bold text-white mb-1">EPG Timeline Schedule Rows</h3>
            <p className="text-xs text-slate-400">
              Dense horizontal programme guide row with current show progress meter, live badges, and interactive program selection.
            </p>
          </div>

          <div className="space-y-3">
            <EpgTimelineRow
              channelName={sampleChannels[0].name}
              channelNumber={101}
              channelLogo={sampleChannels[0].logo}
              programs={sampleEpgPrograms}
              onSelectProgram={(prog) => alert(`Selected EPG Programme: ${prog.title} (${prog.start} - ${prog.stop})`)}
            />

            <EpgTimelineRow
              channelName={sampleChannels[1].name}
              channelNumber={102}
              channelLogo={sampleChannels[1].logo}
              programs={[
                {
                  id: 'sp1',
                  title: 'Premier League: Super Sunday Live',
                  category: 'Sports • Football',
                  start: '17:30',
                  stop: '20:00',
                  isLive: true,
                  progressPercent: 35,
                  is4k: true,
                },
                {
                  id: 'sp2',
                  title: 'Match Analysis & Reaction',
                  category: 'Sports • Studio',
                  start: '20:00',
                  stop: '21:00',
                },
                {
                  id: 'sp3',
                  title: 'Game of the Day Extended Highlights',
                  category: 'Sports • Replay',
                  start: '21:00',
                  stop: '22:30',
                },
              ]}
              onSelectProgram={(prog) => alert(`Selected EPG Programme: ${prog.title}`)}
            />
          </div>
        </div>
      )}

      {/* TAB 5: Channel Rows (All Densities) */}
      {activeTab === 'channel_rows' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Channel Rows in Active Density: <span className="text-sky-400 uppercase">{density}</span></h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  High-performance solid rendering without expensive backdrop blurs for 60fps scrolling.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Simulate Row State:</span>
                <button
                  onClick={() => setFocusedId(focusedId ? '' : 'sample-row-1')}
                  className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 border border-slate-700 text-sky-300"
                >
                  {focusedId ? 'Clear TV Focus' : 'Simulate D-Pad Focus'}
                </button>
              </div>
            </div>

            {/* List of sample rows demonstrating states */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-slate-500 block">1. Active / Currently Playing Row</span>
              <ChannelRow
                channel={sampleChannels[0]}
                isActive={true}
                onSelect={(ch) => alert(`Tuned to ${ch.name}`)}
              />

              <span className="text-xs font-mono uppercase text-slate-500 block pt-2">2. Standard Hover / Normal Row (8K UHD)</span>
              <ChannelRow
                channel={sampleChannels[1]}
                isFocused={focusedId === 'sample-row-1'}
                isActive={false}
                onSelect={(ch) => alert(`Tuned to ${ch.name}`)}
              />

              <span className="text-xs font-mono uppercase text-slate-500 block pt-2">3. Standard Row (No Logo fallback)</span>
              <ChannelRow
                channel={sampleChannels[2]}
                isActive={false}
                onSelect={(ch) => alert(`Tuned to ${ch.name}`)}
              />
            </div>
          </GlassPanel>
        </div>
      )}

      {/* TAB 6: Media Cards */}
      {activeTab === 'cards' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Channel & Media Cards (16:9 Grid)</h3>
              <p className="text-xs text-slate-400">
                For Home Screen hero carousels, Live TV category grids, and VOD discovery.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ChannelCard
                channel={sampleChannels[0]}
                isActive={true}
                onSelect={() => {}}
              />
              <ChannelCard
                channel={sampleChannels[1]}
                isActive={false}
                onSelect={() => {}}
              />
              <ChannelCard
                channel={sampleChannels[3]}
                isActive={false}
                onSelect={() => {}}
              />
            </div>
          </GlassPanel>
        </div>
      )}

      {/* TAB 7: Surfaces & Typography */}
      {activeTab === 'tokens' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Surface Hierarchy */}
          <GlassPanel className="p-6 space-y-6">
            <h3 className="text-base font-bold text-white">Surface Hierarchy & Contrast Scale</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-[#080b11] p-4 rounded-lg border border-white/10">
                <span className="text-xs font-mono text-slate-400 block mb-1">Canvas Base</span>
                <span className="text-sm font-bold text-white">#080b11</span>
              </div>
              <div className="bg-[#111722] p-4 rounded-lg border border-white/10">
                <span className="text-xs font-mono text-slate-400 block mb-1">Surface Primary</span>
                <span className="text-sm font-bold text-white">#111722</span>
              </div>
              <div className="bg-[#161e2c] p-4 rounded-lg border border-white/10">
                <span className="text-xs font-mono text-slate-400 block mb-1">Surface Secondary</span>
                <span className="text-sm font-bold text-white">#161e2c</span>
              </div>
              <div className="bg-[#1e293b] p-4 rounded-lg border border-white/10">
                <span className="text-xs font-mono text-slate-400 block mb-1">Elevated Overlay</span>
                <span className="text-sm font-bold text-white">#1e293b</span>
              </div>
            </div>
          </GlassPanel>

          {/* Typography Ladder */}
          <GlassPanel className="p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Typography Hierarchy</h3>
            <div className="space-y-3 border-t border-white/10 pt-4">
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Display Header (28px - 36px)</span>
                <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">Cinematic Live Broadcast Command</div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Screen Title (20px - 24px)</span>
                <div className="text-xl font-bold text-white tracking-tight">Channel Grid & Electronic Program Guide</div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Section Header (13px Uppercase)</span>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">FAVORITE CHANNELS & MULTI-VIEW MATRIX</div>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">Monospace Telemetry (11px)</span>
                <div className="text-[11px] font-mono text-sky-400">HEVC Main10 | 3840x2160@60fps | GPU Zero-Copy D3D11VA | 18.4 Mbps</div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* TAB 8: Visual States */}
      {activeTab === 'states' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassPanel className="p-6">
              <span className="text-xs font-mono uppercase text-slate-400 block mb-4">1. Resilient Loading State</span>
              <VisualStates.Loading
                title="Synchronizing Provider Channels"
                message="Parsing M3U8 manifest and establishing hardware decoding pipeline..."
              />
            </GlassPanel>

            <GlassPanel className="p-6">
              <span className="text-xs font-mono uppercase text-slate-400 block mb-4">2. Empty Results State</span>
              <VisualStates.Empty
                title="No Channels Found"
                message="No matching broadcast channels match your current search or genre filter."
                actionLabel="Reset Search Filters"
                onAction={() => {}}
              />
            </GlassPanel>

            <GlassPanel className="p-6">
              <span className="text-xs font-mono uppercase text-slate-400 block mb-4">3. Stream Error & Recovery State</span>
              <VisualStates.Error
                title="Stream Connection Failed (HTTP 403)"
                message="The upstream provider rejected authentication token. Failover engine ready to test alternate backup routes."
                onRetry={() => {}}
              />
            </GlassPanel>

            <GlassPanel className="p-6">
              <span className="text-xs font-mono uppercase text-slate-400 block mb-4">4. Cached EPG Banner</span>
              <VisualStates.CachedData
                timestamp="Today at 18:00 (Cached Offline)"
                onRefresh={() => {}}
              />
            </GlassPanel>
          </div>
        </div>
      )}

      {/* TAB 9: Modals & Audio/Subtitle Dialog */}
      {activeTab === 'player' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Audio / Subtitles & Decoder Dialog</h3>
                <p className="text-xs text-slate-400">
                  Full control over multi-lingual audio tracks, WebVTT closed captions, sync offset sliders, and hardware decoder selector.
                </p>
              </div>
              <Button
                variant="primary"
                size="md"
                leftIcon={<Subtitles className="w-4 h-4" />}
                onClick={() => setIsAudioModalOpen(true)}
              >
                Open Audio & Subtitles Dialog
              </Button>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Audio / Subtitle Modal */}
      <StreamAudioSubtitleModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
      />

      {/* Numeric Zap Overlay */}
      <QuickZapOverlay
        isOpen={isZapModalOpen}
        onClose={() => setIsZapModalOpen(false)}
        onTuneToNumber={(num) => {
          setLastZappedChannel(num);
        }}
        channels={sampleChannels}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Palette,
  Play,
  Star,
  Tv,
  Radio,
  Sparkles,
  Layers,
  Sliders,
  Monitor,
  Smartphone,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Eye,
  Hash,
  LayoutGrid,
  Search,
  Subtitles,
  Volume2,
  Inbox,
  WifiOff,
  Database,
  ArrowRight,
  Maximize2,
  Compass,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useDesignSystem, PlatformTarget, DensityMode, ThemeVariant } from '../context/DesignSystemContext';
import { UI_THEME } from '../theme';
import { GlassPanel } from './GlassPanel';
import { Button, ButtonVariant, ButtonSize } from './Button';
import { Badge, BadgeVariant } from './Badge';
import { ChannelRow, ChannelRowData } from './ChannelRow';
import { ChannelCard } from './ChannelCard';
import { SourceBadge } from './SourceBadge';
import { VisualStates } from './VisualStates';
import { Focusable } from './Focusable';
import { CategoryFilterBar } from './CategoryFilterBar';
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

  // Active section tab
  const [activeTab, setActiveTab] = useState<
    | 'typography'
    | 'surfaces'
    | 'buttons'
    | 'channels'
    | 'sources'
    | 'states'
    | 'indicators'
    | 'focus'
    | 'density'
    | 'responsive'
    | 'accessibility'
    | 'advanced'
  >('typography');

  // Interactive controls state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('all');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isZapModalOpen, setIsZapModalOpen] = useState(false);
  const [lastZappedChannel, setLastZappedChannel] = useState<number | null>(null);

  // TV / D-pad focus demo state
  const [focusedItemId, setFocusedItemId] = useState<string>('dpad-item-1');
  const [selectedItemId, setSelectedItemId] = useState<string>('dpad-item-1');

  // Realistic sample channels for showcase
  const sampleChannels: ChannelRowData[] = [
    {
      id: 'ch-101',
      channelNumber: 101,
      name: 'BBC One HD',
      logo: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=120&auto=format&fit=crop&q=60',
      category: 'General Entertainment',
      sourceName: 'Provider A',
      sourceType: 'xtream',
      streamUrl: 'http://provider-a.tv/live/bbc1.m3u8',
      nowProgramme: {
        title: 'BBC News at Six & Regional Update',
        start: '18:00',
        stop: '19:00',
        progressPercent: 62,
      },
      nextProgramme: {
        title: 'Planet Earth III: Extreme Environments',
        start: '19:00',
        stop: '20:00',
      },
      is4k: true,
      isHdr: true,
      isFavorite: true,
    },
    {
      id: 'ch-102',
      channelNumber: 102,
      name: 'Sky Sports Main Event 8K',
      logo: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=60',
      category: 'Sports',
      sourceName: 'Provider B',
      sourceType: 'm3u',
      streamUrl: 'http://provider-b.tv/live/skysports.m3u8',
      nowProgramme: {
        title: 'Premier League: Super Sunday Matchday Live',
        start: '17:30',
        stop: '20:00',
        progressPercent: 45,
      },
      nextProgramme: {
        title: 'Post-Game Tactical Studio Analysis',
        start: '20:00',
        stop: '21:00',
      },
      is8k: true,
      isHdr: true,
      isFavorite: false,
    },
    {
      id: 'ch-103',
      channelNumber: 103,
      name: 'Discovery Cinema 4K',
      // No logo to test fallback
      category: 'Documentary',
      sourceName: 'Provider A',
      sourceType: 'xtream',
      streamUrl: 'http://provider-a.tv/live/discovery.m3u8',
      nowProgramme: {
        title: 'Deep Ocean Frontiers: Submersible Exploration',
        start: '18:15',
        stop: '19:15',
        progressPercent: 20,
      },
      nextProgramme: {
        title: 'Cosmic Horizons: James Webb Telescope Discoveries',
        start: '19:15',
        stop: '20:15',
      },
      is4k: true,
      isFavorite: false,
    },
    {
      id: 'ch-104',
      channelNumber: 104,
      name: 'HBO Max Cinema Premiere',
      logo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&auto=format&fit=crop&q=60',
      category: 'Movies',
      sourceName: 'Provider B',
      sourceType: 'm3u',
      streamUrl: 'http://provider-b.tv/live/hbomax.m3u8',
      nowProgramme: {
        title: 'Dune: Part Two (IMAX Edition)',
        start: '18:00',
        stop: '20:45',
        progressPercent: 55,
      },
      nextProgramme: {
        title: 'House of the Dragon: Behind the Scenes',
        start: '20:45',
        stop: '21:30',
      },
      is4k: true,
      isHdr: true,
      isFavorite: true,
    },
  ];

  const sampleEpgPrograms: EpgProgramItem[] = [
    {
      id: 'p1',
      title: 'BBC News at Six',
      category: 'News • Live',
      start: '18:00',
      stop: '19:00',
      isLive: true,
      progressPercent: 62,
      is4k: true,
    },
    {
      id: 'p2',
      title: 'Planet Earth III: Extreme Environments',
      category: 'Documentary • Nature',
      start: '19:00',
      stop: '20:00',
    },
    {
      id: 'p3',
      title: 'MasterChef: The Semi-Finals Live',
      category: 'Entertainment • Cooking',
      start: '20:00',
      stop: '21:00',
    },
  ];

  // Desktop keyboard arrow navigation for D-pad simulation
  useEffect(() => {
    if (activeTab !== 'focus') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = ['dpad-item-1', 'dpad-item-2', 'dpad-item-3', 'dpad-item-4'];
      const currentIndex = items.indexOf(focusedItemId);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        setFocusedItemId(items[nextIndex]);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + items.length) % items.length;
        setFocusedItemId(items[prevIndex]);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusedItemId !== 'dpad-item-4') {
          // not disabled
          setSelectedItemId(focusedItemId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, focusedItemId]);

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto">
      {/* ── HEADER & DEVELOPMENT CONTROLS ─────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded">
              DEV TEST BENCH
            </span>
            <span className="text-xs text-slate-400 font-mono">Production Design Tokens & Primitives</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Palette className="w-7 h-7 text-sky-400" />
            <span>Design System Showcase</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Visual verification surface for production tokens, layered surfaces, buttons, channel rows, source badges, visual states, and TV D-pad focus behavior.
          </p>
        </div>

        {/* Global Interactive Dev Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-[#111722] p-2.5 rounded-xl border border-white/10 shadow-lg">
          {/* Density Control */}
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

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Platform Preview Control */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono uppercase text-slate-400">Platform:</span>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as PlatformTarget)}
              className="bg-slate-900 border border-slate-700 text-xs text-sky-300 rounded px-2 py-1 font-mono focus:ring-1 focus:ring-sky-400 outline-none"
            >
              <option value="windows">Desktop (Windows/PC)</option>
              <option value="android_tv">TV (Android TV / D-Pad)</option>
              <option value="fire_tv">TV (Fire TV)</option>
              <option value="android_mobile">Mobile (Touch)</option>
              <option value="macos">macOS</option>
              <option value="linux">Linux</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── SHOWCASE SECTION NAVIGATION ─────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/5 no-scrollbar">
        {[
          { id: 'typography', label: '1. Typography' },
          { id: 'surfaces', label: '2. Layered Surfaces' },
          { id: 'buttons', label: '3. Buttons' },
          { id: 'channels', label: '4. Channel Components' },
          { id: 'sources', label: '5. Source Badges' },
          { id: 'states', label: '6. Visual States' },
          { id: 'indicators', label: '7. Indicators' },
          { id: 'focus', label: '8. TV / D-Pad Focus' },
          { id: 'density', label: '9. Density Matrix' },
          { id: 'responsive', label: '10. Platform / Form Factor' },
          { id: 'accessibility', label: '11. Accessibility & Contrast' },
          { id: 'advanced', label: '12. Hero, Omni & Multi-View' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm font-bold'
                : 'bg-[#111722] text-slate-400 hover:text-slate-200 border border-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 1. TYPOGRAPHY ──────────────────────────────────────────────── */}
      {activeTab === 'typography' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">1. Typography Scale Hierarchy</h2>
              <p className="text-xs text-slate-400">
                Rendered with production typography classes from <code className="text-sky-400">UI_THEME.typography</code> using representative IPTV content.
              </p>
            </div>

            <div className="space-y-6 divide-y divide-white/10">
              {/* Display */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase mb-1">
                  <span>Display Header (28px - 36px • Extrabold)</span>
                  <code>UI_THEME.typography.sizes.display</code>
                </div>
                <div className={UI_THEME.typography.sizes.display + ' text-white'}>
                  Live TV
                </div>
              </div>

              {/* Large Heading */}
              <div className="pt-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase mb-1">
                  <span>Large Heading (24px • Bold)</span>
                  <code>text-2xl font-bold tracking-tight</code>
                </div>
                <div className="text-2xl font-bold tracking-tight text-white">
                  BBC One HD
                </div>
              </div>

              {/* Screen Heading */}
              <div className="pt-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase mb-1">
                  <span>Screen Heading (20px - 24px • Bold)</span>
                  <code>UI_THEME.typography.sizes.screenTitle</code>
                </div>
                <div className={UI_THEME.typography.sizes.screenTitle + ' text-white'}>
                  BBC News at Six
                </div>
              </div>

              {/* Section Heading */}
              <div className="pt-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase mb-1">
                  <span>Section Heading (12px - 14px • Uppercase Semibold)</span>
                  <code>UI_THEME.typography.sizes.sectionTitle</code>
                </div>
                <div className={UI_THEME.typography.sizes.sectionTitle}>
                  Provider A • Entertainment Channels & Schedules
                </div>
              </div>

              {/* Body Text */}
              <div className="pt-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase mb-1">
                  <span>Body (14px • Regular)</span>
                  <code>UI_THEME.typography.sizes.body</code>
                </div>
                <div className={UI_THEME.typography.sizes.body + ' text-slate-200 max-w-3xl leading-relaxed'}>
                  Comprehensive national and international news coverage from the BBC Newsroom, followed by regional headlines, weather forecast, and live sports updates.
                </div>
              </div>

              {/* Secondary Body */}
              <div className="pt-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase mb-1">
                  <span>Secondary Body (13px • Normal • Muted)</span>
                  <code>text-xs text-slate-400</code>
                </div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Next up: Planet Earth III (19:00 - 20:00) • Subtitles and 5.1 surround sound audio available.
                </div>
              </div>

              {/* Metadata */}
              <div className="pt-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase mb-1">
                  <span>Metadata (12px • Monospace)</span>
                  <code>UI_THEME.typography.sizes.meta</code>
                </div>
                <div className={UI_THEME.typography.sizes.meta + ' text-sky-400'}>
                  1920 × 1080 • H.264 • 8.2 Mbps • 50.00 FPS • Low-Latency Direct TS
                </div>
              </div>

              {/* Small Metadata */}
              <div className="pt-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase mb-1">
                  <span>Small Metadata (11px • Monospace)</span>
                  <code>UI_THEME.typography.sizes.smallMeta</code>
                </div>
                <div className={UI_THEME.typography.sizes.smallMeta + ' text-slate-400'}>
                  BUFFER: 2400ms | DROP: 0 frames | DECODER: D3D11VA (Hardware Direct)
                </div>
              </div>

              {/* Monospace / Telemetry Text */}
              <div className="pt-4">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 uppercase mb-1">
                  <span>Telemetry Stream Metrics</span>
                  <code>font-mono text-[11px]</code>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 border border-white/10 font-mono text-[11px] text-emerald-400 space-y-1">
                  <div>STREAM ID: xtream_10543 | PROTOCOL: HLS/TS | CODEC: HEVC Main10@L5.1</div>
                  <div>BITRATE: 18,420 kbps | AUDIO: E-AC3 6ch 48kHz (Dolby Digital Plus)</div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── 2. LAYERED SURFACES ────────────────────────────────────────── */}
      {activeTab === 'surfaces' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">2. Layered Surface System</h2>
            <p className="text-xs text-slate-400">
              Demonstrating surface tokens layering from background base to elevated panels and restrained glass overlays.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#080b11] border border-white/10 space-y-6">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-b border-white/10 pb-2">
              <span>Canvas Base: #080b11 (Deep Obsidian Neutral)</span>
              <span>Layer 0 (Root)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Standard Card (Primary Surface) */}
              <GlassPanel elevation="card" className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-sky-400 uppercase">Primary Surface (#111722)</span>
                  <span className="text-[10px] font-mono text-slate-400">Standard Card</span>
                </div>
                <h3 className="text-base font-bold text-white">Standard Surface Card</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Used for main channel grids, schedule items, and content containers. Features solid opaque backing for optimal 60fps scrolling performance.
                </p>
              </GlassPanel>

              {/* Elevated Card (Secondary Surface) */}
              <GlassPanel elevation="elevated" className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-400 uppercase">Elevated Surface (#161e2c)</span>
                  <span className="text-[10px] font-mono text-slate-400">Elevated Card</span>
                </div>
                <h3 className="text-base font-bold text-white">Elevated Surface Card</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Used for hover states, selected items, and floating toolbars with higher contrast and deepened shadow elevation.
                </p>
              </GlassPanel>

              {/* Glass Surface Panel */}
              <GlassPanel elevation="glass" className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-fuchsia-400 uppercase">Glass Surface (Restrained)</span>
                  <span className="text-[10px] font-mono text-slate-400">Glass Panel</span>
                </div>
                <h3 className="text-base font-bold text-white">Restrained Glass Panel</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Applied strictly to floating OSD overlays, quick zap dialogs, and audio/subtitle selectors to prevent GPU texture thrashing.
                </p>
              </GlassPanel>

              {/* Floating Action Panel */}
              <div className="p-5 rounded-xl bg-[#1e293b] border border-white/15 shadow-2xl shadow-black/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase">Overlay Surface (#1e293b)</span>
                  <span className="text-[10px] font-mono text-slate-400">Floating Panel</span>
                </div>
                <h3 className="text-base font-bold text-white">Floating Modal Panel</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  High-elevation surface for interactive HUD controls, context menus, and quick zapping dialogs.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. BUTTONS ─────────────────────────────────────────────────── */}
      {activeTab === 'buttons' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">3. Button Variants & States</h2>
              <p className="text-xs text-slate-400">
                Production <code className="text-sky-400">&lt;Button /&gt;</code> component demonstrating all variants across Normal, Hover, Focus, Loading, and Disabled states with 2:1 padding ratios.
              </p>
            </div>

            {/* Matrix of button variants */}
            <div className="space-y-6 divide-y divide-white/10">
              {/* Primary */}
              <div className="pt-2 space-y-3">
                <span className="text-xs font-mono text-slate-400 uppercase block">Primary Variant</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="md" leftIcon={<Play className="w-4 h-4 fill-current" />}>
                    Primary Normal
                  </Button>
                  <Button variant="primary" size="md" isFocused leftIcon={<Play className="w-4 h-4 fill-current" />}>
                    Primary Focused
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    isLoading={buttonLoading}
                    onClick={() => {
                      setButtonLoading(true);
                      setTimeout(() => setButtonLoading(false), 1500);
                    }}
                  >
                    {buttonLoading ? 'Connecting...' : 'Click for Loading'}
                  </Button>
                  <Button variant="primary" size="md" disabled leftIcon={<Play className="w-4 h-4 fill-current" />}>
                    Primary Disabled
                  </Button>
                </div>
              </div>

              {/* Secondary */}
              <div className="pt-4 space-y-3">
                <span className="text-xs font-mono text-slate-400 uppercase block">Secondary Variant</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="secondary" size="md" leftIcon={<Star className="w-4 h-4" />}>
                    Secondary Normal
                  </Button>
                  <Button variant="secondary" size="md" isFocused leftIcon={<Star className="w-4 h-4" />}>
                    Secondary Focused
                  </Button>
                  <Button variant="secondary" size="md" disabled leftIcon={<Star className="w-4 h-4" />}>
                    Secondary Disabled
                  </Button>
                </div>
              </div>

              {/* Ghost */}
              <div className="pt-4 space-y-3">
                <span className="text-xs font-mono text-slate-400 uppercase block">Ghost Variant</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="ghost" size="md" leftIcon={<Subtitles className="w-4 h-4" />}>
                    Ghost Normal
                  </Button>
                  <Button variant="ghost" size="md" isFocused leftIcon={<Subtitles className="w-4 h-4" />}>
                    Ghost Focused
                  </Button>
                  <Button variant="ghost" size="md" disabled leftIcon={<Subtitles className="w-4 h-4" />}>
                    Ghost Disabled
                  </Button>
                </div>
              </div>

              {/* Outline */}
              <div className="pt-4 space-y-3">
                <span className="text-xs font-mono text-slate-400 uppercase block">Outline Variant</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="md" leftIcon={<Sliders className="w-4 h-4" />}>
                    Outline Normal
                  </Button>
                  <Button variant="outline" size="md" isFocused leftIcon={<Sliders className="w-4 h-4" />}>
                    Outline Focused
                  </Button>
                  <Button variant="outline" size="md" disabled leftIcon={<Sliders className="w-4 h-4" />}>
                    Outline Disabled
                  </Button>
                </div>
              </div>

              {/* Destructive / Danger */}
              <div className="pt-4 space-y-3">
                <span className="text-xs font-mono text-slate-400 uppercase block">Destructive / Danger Variant</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="danger" size="md" leftIcon={<AlertCircle className="w-4 h-4" />}>
                    Delete Playlist
                  </Button>
                  <Button variant="danger" size="md" isFocused leftIcon={<AlertCircle className="w-4 h-4" />}>
                    Delete Focused
                  </Button>
                  <Button variant="danger" size="md" disabled leftIcon={<AlertCircle className="w-4 h-4" />}>
                    Delete Disabled
                  </Button>
                </div>
              </div>

              {/* Sizing Scale */}
              <div className="pt-4 space-y-3">
                <span className="text-xs font-mono text-slate-400 uppercase block">Button Sizing Scale</span>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="sm">Small (sm)</Button>
                  <Button variant="primary" size="md">Medium (md)</Button>
                  <Button variant="primary" size="lg">Large (lg)</Button>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── 4. CHANNEL COMPONENTS ──────────────────────────────────────── */}
      {activeTab === 'channels' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">4. Core Channel Components</h2>
              <p className="text-xs text-slate-400">
                Full demonstration of <code className="text-sky-400">&lt;ChannelRow /&gt;</code> and <code className="text-sky-400">&lt;ChannelCard /&gt;</code> across all IPTV states.
              </p>
            </div>

            <div className="space-y-6">
              {/* Channel Rows Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Channel Rows (List Layout)
                </h3>

                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-slate-500 block">1. Live / Selected Channel (Active Stream)</span>
                  <ChannelRow
                    channel={sampleChannels[0]}
                    isActive={true}
                    onSelect={(ch) => alert(`Tuned to ${ch.name}`)}
                  />

                  <span className="text-[11px] font-mono text-slate-500 block pt-2">2. Focused Channel (TV Focus Ring Simulation)</span>
                  <ChannelRow
                    channel={sampleChannels[1]}
                    isFocused={true}
                    onSelect={(ch) => alert(`Tuned to ${ch.name}`)}
                  />

                  <span className="text-[11px] font-mono text-slate-500 block pt-2">3. Channel without Logo (Fallback Icon)</span>
                  <ChannelRow
                    channel={sampleChannels[2]}
                    onSelect={(ch) => alert(`Tuned to ${ch.name}`)}
                  />

                  <span className="text-[11px] font-mono text-slate-500 block pt-2">4. Favorite Channel with Now/Next EPG</span>
                  <ChannelRow
                    channel={sampleChannels[3]}
                    onSelect={(ch) => alert(`Tuned to ${ch.name}`)}
                  />

                  <span className="text-[11px] font-mono text-slate-500 block pt-2">5. Disabled / Unavailable Channel</span>
                  <ChannelRow
                    channel={{
                      ...sampleChannels[0],
                      id: 'ch-disabled',
                      channelNumber: 199,
                      name: 'Sky Sports UHD (Unavailable / Geo-Blocked)',
                    }}
                    disabled={true}
                    onSelect={() => {}}
                  />
                </div>
              </div>

              {/* Channel Cards Section */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                  Channel Cards (16:9 Grid Layout)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <ChannelCard
                    channel={sampleChannels[0]}
                    isActive={true}
                    onSelect={() => {}}
                  />
                  <ChannelCard
                    channel={sampleChannels[1]}
                    isFocused={true}
                    onSelect={() => {}}
                  />
                  <ChannelCard
                    channel={sampleChannels[2]}
                    isActive={false}
                    onSelect={() => {}}
                  />
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── 5. SOURCE BADGES ───────────────────────────────────────────── */}
      {activeTab === 'sources' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">5. Source & Provider Badges</h2>
              <p className="text-xs text-slate-400">
                Demonstrates provider and source indicators. Badges remain visually secondary and never expose sensitive server URLs, credentials, or passwords.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <SourceBadge sourceName="Provider A" sourceType="xtream" />
                <SourceBadge sourceName="Provider B" sourceType="m3u" />
                <SourceBadge sourceName="Backup Gateway" sourceType="stalker" />
                <SourceBadge sourceName="Local XMLTV" sourceType="file" />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/70 border border-white/10 space-y-3">
                <span className="text-xs font-mono text-slate-400 uppercase block">Sample Paired Rows</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#111722] border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-white">BBC One HD</span>
                      <SourceBadge sourceName="Provider A" sourceType="xtream" />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">1080p50 • H.264</span>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-[#111722] border border-white/5">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-white">ESPN 8K Event</span>
                      <SourceBadge sourceName="Provider B" sourceType="m3u" />
                    </div>
                    <span className="text-xs text-slate-400 font-mono">4320p60 • HEVC</span>
                  </div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── 6. APPLICATION STATES ──────────────────────────────────────── */}
      {activeTab === 'states' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">6. Reusable Application States</h2>
            <p className="text-xs text-slate-400">
              Clear hierarchy and resilient recovery messaging for loading, empty, error, cached, and offline conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Loading */}
            <GlassPanel className="p-6">
              <span className="text-xs font-mono uppercase text-slate-400 block mb-4">1. Loading State</span>
              <VisualStates.Loading
                title="Loading Channels & EPG..."
                message="Initializing stream engine and synchronizing provider metadata..."
              />
            </GlassPanel>

            {/* Empty */}
            <GlassPanel className="p-6">
              <span className="text-xs font-mono uppercase text-slate-400 block mb-4">2. Empty Results State</span>
              <VisualStates.Empty
                title="No Channels Available"
                message="No channels available in this category or search filter."
                actionLabel="Reset Category Filter"
                onAction={() => setSelectedCategory('all')}
              />
            </GlassPanel>

            {/* Error */}
            <GlassPanel className="p-6">
              <span className="text-xs font-mono uppercase text-slate-400 block mb-4">3. Error State with Recovery</span>
              <VisualStates.Error
                title="Unable to Refresh Provider A"
                message="Unable to refresh Provider A. Your cached channels are still available."
                onRetry={() => alert('Retrying provider synchronization...')}
              />
            </GlassPanel>

            {/* Offline */}
            <GlassPanel className="p-6">
              <span className="text-xs font-mono uppercase text-slate-400 block mb-4">4. Offline Mode State</span>
              <VisualStates.Offline
                title="Network Offline"
                message="Operating in offline cache mode. Previously loaded schedules and channels remain accessible."
                onReconnect={() => alert('Checking network status...')}
              />
            </GlassPanel>
          </div>

          {/* Cached Banner */}
          <GlassPanel className="p-6 space-y-3">
            <span className="text-xs font-mono uppercase text-slate-400 block">5. Cached Data Banner</span>
            <VisualStates.CachedData
              sourceName="Provider A"
              timestamp="Last updated 6 hours ago"
              onRefresh={() => alert('Initiating background refresh...')}
            />
          </GlassPanel>
        </div>
      )}

      {/* ── 7. INDICATORS ──────────────────────────────────────────────── */}
      {activeTab === 'indicators' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">7. Signal & Status Indicators</h2>
              <p className="text-xs text-slate-400">
                Non-color dependent status indicators combining distinct shapes, iconography, and text labels for WCAG compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-slate-400 block">Live Indicator</span>
                <Badge variant="live" pulse>LIVE BROADCAST</Badge>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-slate-400 block">8K UHD Badge</span>
                <Badge variant="8k" />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-slate-400 block">4K UHD Badge</span>
                <Badge variant="4k" />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-slate-400 block">HDR Badge</span>
                <Badge variant="hdr" />
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-slate-400 block">Success Indicator</span>
                <Badge variant="success">SYNCED</Badge>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-slate-400 block">Warning Indicator</span>
                <Badge variant="warning">DEGRADED</Badge>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-slate-400 block">Error Indicator</span>
                <Badge variant="error">FAILED</Badge>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 space-y-2">
                <span className="text-xs font-mono text-slate-400 block">Buffering Indicator</span>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                  <span>BUFFERING</span>
                </span>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── 8. TV / D-PAD FOCUS DEMONSTRATION ──────────────────────────── */}
      {activeTab === 'focus' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">8. TV / D-Pad Focus Navigation Demonstration</h2>
              <p className="text-xs text-slate-400">
                Use your keyboard <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-mono text-xs">↑</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-mono text-xs">↓</kbd> arrow keys (or click) to test focus visibility from 10-foot distance. Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-sky-300 font-mono text-xs">Enter</kbd> to select.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-2 border-b border-white/10">
                <span>Active D-Pad Focus ID: <strong className="text-sky-400">{focusedItemId}</strong></span>
                <span>Selected Item: <strong className="text-emerald-400">{selectedItemId}</strong></span>
              </div>

              <div className="space-y-3">
                {/* 1. Normal Item */}
                <Focusable
                  id="dpad-item-1"
                  isFocused={focusedItemId === 'dpad-item-1'}
                  onSelect={() => setSelectedItemId('dpad-item-1')}
                  className="p-4 rounded-xl border border-white/10 bg-[#111722] flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                      101
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>BBC One HD</span>
                        {selectedItemId === 'dpad-item-1' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">BBC News at Six</div>
                    </div>
                  </div>
                  <Badge variant="live" pulse>LIVE</Badge>
                </Focusable>

                {/* 2. Focused Item */}
                <Focusable
                  id="dpad-item-2"
                  isFocused={focusedItemId === 'dpad-item-2'}
                  onSelect={() => setSelectedItemId('dpad-item-2')}
                  className="p-4 rounded-xl border border-white/10 bg-[#111722] flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                      102
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Sky Sports Main Event</span>
                        {selectedItemId === 'dpad-item-2' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">Premier League: Super Sunday</div>
                    </div>
                  </div>
                  <Badge variant="8k" />
                </Focusable>

                {/* 3. Selected Item */}
                <Focusable
                  id="dpad-item-3"
                  isFocused={focusedItemId === 'dpad-item-3'}
                  onSelect={() => setSelectedItemId('dpad-item-3')}
                  className="p-4 rounded-xl border border-white/10 bg-[#111722] flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-300">
                      103
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>HBO Max Cinema Premiere</span>
                        {selectedItemId === 'dpad-item-3' && (
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                            SELECTED
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">Dune: Part Two (IMAX)</div>
                    </div>
                  </div>
                  <Badge variant="4k" />
                </Focusable>

                {/* 4. Disabled Item */}
                <Focusable
                  id="dpad-item-4"
                  disabled={true}
                  isFocused={focusedItemId === 'dpad-item-4'}
                  onSelect={() => {}}
                  className="p-4 rounded-xl border border-white/10 bg-[#111722] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-500">
                      104
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-500">Discovery HD (Unavailable / Expired Subscription)</div>
                      <div className="text-xs text-slate-600">Feed Offline</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-slate-600 uppercase">Disabled</span>
                </Focusable>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── 9. DENSITY DEMONSTRATION ───────────────────────────────────── */}
      {activeTab === 'density' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">9. Information Density Matrix</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Demonstrating how identical channel components adjust row height, logo size, and typography scale without separate component implementations.
                </p>
              </div>

              {/* Density Mode Selector */}
              <div className="flex bg-slate-900 rounded p-1 border border-slate-800">
                {(['compact', 'comfortable', 'spacious'] as DensityMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDensity(mode)}
                    className={`px-3 py-1 text-xs font-mono capitalize rounded transition-colors ${
                      density === mode
                        ? 'bg-sky-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-mono uppercase text-sky-400 block">
                Current Active Density: <strong className="uppercase">{density}</strong>
              </span>

              <div className="space-y-2">
                {sampleChannels.map((ch) => (
                  <ChannelRow
                    key={ch.id}
                    channel={ch}
                    density={density}
                    onSelect={(selected) => alert(`Selected: ${selected.name}`)}
                  />
                ))}
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── 10. RESPONSIVE / PLATFORM DEMONSTRATION ─────────────────────── */}
      {activeTab === 'responsive' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">10. Responsive & Platform Form Factors</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Adapts design system parameters for Desktop, Mobile (Touch 44px+ targets), and TV (D-Pad navigation).
                </p>
              </div>

              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as PlatformTarget)}
                className="bg-slate-900 border border-slate-700 text-xs text-sky-300 rounded px-2.5 py-1.5 font-mono focus:ring-1 focus:ring-sky-400 outline-none"
              >
                <option value="windows">Desktop PC (Windows / Mouse / Hotkeys)</option>
                <option value="android_tv">Android TV (10ft UI / D-Pad Focus)</option>
                <option value="android_mobile">Mobile (Touch Gestures / 44px)</option>
                <option value="fire_tv">Fire TV</option>
                <option value="macos">macOS</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <Monitor className="w-4 h-4" />
                  <span>Desktop Mode</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Hover states active, dense metadata rows, full keyboard shortcut map enabled.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <Tv className="w-4 h-4" />
                  <span>TV / 10-Foot Mode</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Deep glow focus outlines, hardware decode acceleration hints, remote numeric zapper integration.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Smartphone className="w-4 h-4" />
                  <span>Mobile Mode</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Touch targets constrained to ≥44px height, horizontal swipe pill navigation, condensed telemetry.
                </p>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── 11. ACCESSIBILITY & CONTRAST ───────────────────────────────── */}
      {activeTab === 'accessibility' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <GlassPanel className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">11. Accessibility & Readability Verification</h2>
              <p className="text-xs text-slate-400">
                Visual audit checklist verifying WCAG AA contrast, non-color state differentiation, disabled legibility, and TV reading distances.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contrast Metrics */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  <span>WCAG AA Contrast Audit</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2 divide-y divide-white/5">
                  <li className="pt-2 flex justify-between">
                    <span>Primary text on canvas (#f8fafc on #080b11)</span>
                    <strong className="text-emerald-400 font-mono">17.2:1 (Pass AAA)</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>Secondary text on surface (#94a3b8 on #111722)</span>
                    <strong className="text-emerald-400 font-mono">6.8:1 (Pass AA)</strong>
                  </li>
                  <li className="pt-2 flex justify-between">
                    <span>Sky Accent text on dark surface (#38bdf8 on #080b11)</span>
                    <strong className="text-emerald-400 font-mono">9.4:1 (Pass AAA)</strong>
                  </li>
                </ul>
              </div>

              {/* Usability & Touch Rules */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Interactive Usability Rules</span>
                </div>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li>• Minimum touch target height: <strong>44px</strong></li>
                  <li>• Focus visibility ring: <strong>2px #38bdf8 with 18px glow shadow</strong></li>
                  <li>• Non-color status: All alerts and states include unique vector icons</li>
                  <li>• Disabled state readability: 40% opacity with readable high-contrast typography</li>
                </ul>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ── 12. ADVANCED COMPONENTS (HERO, OMNI, MULTI-VIEW) ───────────── */}
      {activeTab === 'advanced' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Omni Search Bar */}
          <GlassPanel className="p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Omni Command Search Bar</h3>
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
            <h3 className="text-base font-bold text-white">Category & Genre Filter Bar</h3>
            <CategoryFilterBar
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </GlassPanel>

          {/* Hero Banner */}
          <div className="space-y-2">
            <h3 className="text-base font-bold text-white">Cinematic Hero Channel Banner</h3>
            <HeroChannelBanner
              channel={sampleChannels[0]}
              onPlay={(ch) => alert(`Playing: ${ch.name}`)}
              onToggleFavorite={() => {}}
              onOpenSpecs={() => setIsAudioModalOpen(true)}
            />
          </div>

          {/* Multi-View Matrix */}
          <div className="space-y-2 pt-4">
            <h3 className="text-base font-bold text-white">Multi-View Broadcast Matrix (2x2)</h3>
            <MultiViewMatrix
              channels={sampleChannels}
              layout="2x2"
              onSelectMainChannel={(ch) => alert(`Expanded feed: ${ch.name}`)}
            />
          </div>
        </div>
      )}

      {/* ── MODALS & OVERLAYS ─────────────────────────────────────────── */}
      <StreamAudioSubtitleModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
      />

      <QuickZapOverlay
        isOpen={isZapModalOpen}
        onClose={() => setIsZapModalOpen(false)}
        onTuneToNumber={(num) => setLastZappedChannel(num)}
        channels={sampleChannels}
      />
    </div>
  );
};

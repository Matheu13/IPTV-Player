import React, { useState, useEffect, useCallback, useRef } from 'react';
import { NavigationRail, NavTabId } from './NavigationRail';
import { HomeScreen } from '../screens/HomeScreen';
import { LiveTVScreen } from '../screens/LiveTVScreen';
import { MoviesScreen } from '../screens/MoviesScreen';
import { SeriesScreen } from '../screens/SeriesScreen';
import { EpgScreen } from '../screens/EpgScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { AdvancedDiagnosticsPanel } from '../../components/AdvancedDiagnosticsPanel';
import { DesignSystemShowcase } from './DesignSystemShowcase';
import { VideoPlayerShell } from './VideoPlayerShell';
import { PlaybackProvider, usePlayback } from '../context/PlaybackContext';
import { ProfileProvider, useProfile } from '../context/ProfileContext';
import { WhoIsWatchingScreen } from '../screens/WhoIsWatchingScreen';
import { ChannelRowData } from './ChannelRow';
import { ProviderSwitcher } from './ProviderSwitcher';
import { SourceManagementModal } from '../../components/SourceManagementModal';
import { globalUnifiedIptvEngine } from '../../lib/unifiedIptvEngine';
import {
  Tv,
  Play,
  Sparkles,
  Search,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Gamepad2,
  HelpCircle,
  X,
  Volume2,
  Radio,
  Clock,
  Wifi,
} from 'lucide-react';

export interface CinematicShellProps {
  initialTab?: NavTabId;
  enableRemoteOverlay?: boolean;
}

const NAV_TABS_LIST: NavTabId[] = [
  'home',
  'live',
  'movies',
  'series',
  'epg',
  'favorites',
  'search',
  'showcase',
  'settings',
  'diagnostics',
];

const CinematicShellContent: React.FC<CinematicShellProps> = ({
  initialTab = 'live',
  enableRemoteOverlay = true,
}) => {
  const [activeTab, setActiveTab] = useState<NavTabId>(initialTab);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [showRemoteHelper, setShowRemoteHelper] = useState(false);
  const [isRemoteActive, setIsRemoteActive] = useState(false);

  // Focus Navigation Zone: 'rail' | 'header' | 'content'
  const [focusZone, setFocusZone] = useState<'rail' | 'header' | 'content'>('content');
  const [focusedNavIndex, setFocusedNavIndex] = useState<number>(() => {
    const idx = (NAV_TABS_LIST as string[]).indexOf(initialTab);
    return idx >= 0 ? idx : 1;
  });

  const { playChannel, state: playbackState } = usePlayback();
  const { isWhoIsWatchingOpen, currentProfile, isKidsMode, openWhoIsWatching } = useProfile();

  // Screen resize detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      // Automatically detect 10-foot TV viewports
      if (width >= 1280 && window.innerHeight >= 720 && 'ontouchstart' in window === false) {
        // Desktop / TV standard
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Remote Control / D-Pad Navigation Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Mark remote as active upon directional arrow or key
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Escape', 'Backspace'].includes(e.key)) {
        setIsRemoteActive(true);
      }

      // Direct Shortcut Keys
      switch (e.key) {
        case 'h':
        case 'H':
          setActiveTab('home');
          setFocusZone('content');
          break;
        case 'l':
        case 'L':
          setActiveTab('live');
          setFocusZone('content');
          break;
        case 'm':
        case 'M':
          setActiveTab('movies');
          setFocusZone('content');
          break;
        case 's':
        case 'S':
          setActiveTab('series');
          setFocusZone('content');
          break;
        case 'g':
        case 'G':
          setActiveTab('epg');
          setFocusZone('content');
          break;
        case 'f':
        case 'F':
          setActiveTab('favorites');
          setFocusZone('content');
          break;
        case 'd':
        case 'D':
          setActiveTab('showcase');
          setFocusZone('content');
          break;
        case 't':
        case 'T':
          setIsTvMode((prev) => !prev);
          break;
        case '?':
          setShowRemoteHelper((prev) => !prev);
          break;
        case '/':
          e.preventDefault();
          setActiveTab('search');
          setFocusZone('content');
          break;
        case 'p':
        case 'P':
          // Cycle through providers
          const sources = globalUnifiedIptvEngine.getSources();
          const currentId = globalUnifiedIptvEngine.getState().activeSourceId;
          const allOptions = ['ALL', ...sources.map((s) => s.id)];
          const curIdx = allOptions.indexOf(currentId);
          const nextId = allOptions[(curIdx + 1) % allOptions.length];
          globalUnifiedIptvEngine.setActiveSource(nextId);
          break;

        // D-Pad Remote Navigation Logic
        case 'ArrowLeft':
          if (activeTab === 'live') {
            // Live TV handles internal 3-panel D-pad navigation
            break;
          }
          if (focusZone === 'content') {
            // Move from content to navigation rail
            setFocusZone('rail');
            e.preventDefault();
          }
          break;

        case 'ArrowRight':
          if (focusZone === 'rail') {
            // Move from navigation rail into main screen content
            setFocusZone('content');
            e.preventDefault();
          }
          break;

        case 'ArrowUp':
          if (focusZone === 'rail') {
            e.preventDefault();
            setFocusedNavIndex((prev) => {
              const next = Math.max(0, prev - 1);
              setActiveTab(NAV_TABS_LIST[next]);
              return next;
            });
          }
          break;

        case 'ArrowDown':
          if (focusZone === 'rail') {
            e.preventDefault();
            setFocusedNavIndex((prev) => {
              const next = Math.min(NAV_TABS_LIST.length - 1, prev + 1);
              setActiveTab(NAV_TABS_LIST[next]);
              return next;
            });
          }
          break;

        case 'Enter':
          if (focusZone === 'rail') {
            e.preventDefault();
            setActiveTab(NAV_TABS_LIST[focusedNavIndex]);
            setFocusZone('content');
          }
          break;

        case 'Escape':
        case 'Backspace':
          if (activeTab === 'live') {
            // Live TV handles Back button state reversal and exit confirmation dialog
            break;
          }
          // Return focus to navigation or exit fullscreen
          if (playbackState.presentationMode === 'fullscreen') {
            e.preventDefault();
            // VideoPlayerShell handles fullscreen exit
          } else if (focusZone === 'content') {
            setFocusZone('rail');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusZone, focusedNavIndex, playbackState.presentationMode]);

  const handleSelectChannel = (channel: ChannelRowData) => {
    playChannel(channel, 'embedded');
    setActiveTab('live');
  };

  const currentTabTitle = {
    home: 'Entertainment Hub',
    live: 'Live TV & Electronic Guide',
    movies: 'VOD Cinema Catalog',
    series: 'TV Series & Box Sets',
    epg: 'Interactive Program Guide',
    favorites: 'Pinned Favorites',
    search: 'Universal Index Search',
    showcase: 'TVLok Design System',
    settings: 'System & Remote Settings',
    diagnostics: 'Advanced Diagnostics & Telemetry',
  }[activeTab];

  // If the profile selection screen is open (e.g., initial app launch or profile switch),
  // render it exclusively to eliminate background DOM load and guarantee instant responsiveness.
  if (isWhoIsWatchingOpen) {
    return <WhoIsWatchingScreen />;
  }

  return (
    <div
      id="cinematic-shell"
      className="cinematic-shell relative flex h-screen w-screen bg-[#080b11] text-slate-100 font-sans overflow-hidden select-none"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 90% 50% at 50% -10%, rgba(34, 197, 94, 0.08), transparent 70%), radial-gradient(circle at 100% 100%, rgba(16, 185, 129, 0.04), transparent 50%)',
      }}
    >
      {/* 1. TVLok Navigation Rail / Top Bar */}
      {!isMobile && (
        <NavigationRail
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setFocusedNavIndex(NAV_TABS_LIST.indexOf(tab));
            setFocusZone('content');
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          variant={isTvMode ? 'tv_top' : 'desktop'}
          focusedNavId={focusZone === 'rail' ? `nav-item-${NAV_TABS_LIST[focusedNavIndex]}` : undefined}
          className={
            focusZone === 'rail'
              ? 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#080b11] shadow-[0_0_24px_rgba(34,197,94,0.35)]'
              : ''
          }
        />
      )}

      {/* 2. Main Viewport & Screen Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-16 md:pb-0">
        {/* Top Header Bar for Non-Live views (Live TV has its own integrated TvLokTopBar) */}
        {activeTab !== 'live' && (
          <header className="h-14 bg-[#0e1420]/95 backdrop-blur-md border-b border-white/[0.08] px-4 md:px-6 flex items-center justify-between shrink-0 z-20 shadow-md">
            {/* Title with TVLok High-Contrast Green Signal */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/20">
                  <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400 translate-x-0.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-black tracking-tight text-white">
                    Tv<span className="text-emerald-400">Lok</span>
                  </span>
                  <span className="text-slate-500 text-sm">/</span>
                  <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400">
                    {currentTabTitle}
                  </span>
                </div>
              </div>
            </div>

            {/* Header Right Actions & Remote Status */}
            <div className="flex items-center gap-3">
              {/* Remote Control Mode Indicator */}
              <button
                onClick={() => setShowRemoteHelper(!showRemoteHelper)}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isRemoteActive
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:text-white hover:border-white/20'
                }`}
                title="TV Remote Navigation Controls (? to toggle)"
              >
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Remote {isRemoteActive ? 'Active' : 'Help'}</span>
              </button>

              {/* TV Mode Toggle (10-foot UI vs Desktop) */}
              <button
                onClick={() => setIsTvMode(!isTvMode)}
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  isTvMode
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md shadow-emerald-500/30'
                    : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                }`}
                title="Toggle 10-foot TV Leanback UI"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>10-Foot UI</span>
              </button>

              {/* Active Profile Switcher */}
              <button
                onClick={openWhoIsWatching}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#151e2e] hover:bg-[#1c273b] border border-white/10 hover:border-emerald-500/40 text-xs font-medium text-slate-200 transition-all cursor-pointer shadow-sm"
                title="Switch Profile / Who Is Watching"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm"
                  style={{ backgroundColor: currentProfile.avatarBg || '#059669' }}
                >
                  {currentProfile.name.charAt(0)}
                </div>
                <span className="hidden sm:inline font-semibold">{currentProfile.name}</span>
                {isKidsMode && (
                  <span className="text-[9px] px-1 py-0.2 rounded-full bg-emerald-500/25 text-emerald-300 font-black border border-emerald-500/40">
                    KIDS
                  </span>
                )}
              </button>

              {/* Provider / Source Switcher */}
              <ProviderSwitcher
                variant="pill"
                onOpenSourceManager={() => setIsSourceModalOpen(true)}
                onProviderSwitched={() => {}}
              />
            </div>
          </header>
        )}

        {/* 3. Screen Router */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          {activeTab === 'home' && (
            <HomeScreen
              onNavigateToLive={() => setActiveTab('live')}
              onNavigateToMovies={() => setActiveTab('movies')}
              onNavigateToSeries={() => setActiveTab('series')}
              onSelectChannel={handleSelectChannel}
            />
          )}

          {activeTab === 'live' && (
            <LiveTVScreen
              onSelectChannel={handleSelectChannel}
              isTvMode={isTvMode}
              onOpenSourceManager={() => setIsSourceModalOpen(true)}
              onExit={() => setActiveTab('home')}
            />
          )}

          {activeTab === 'movies' && <MoviesScreen />}

          {activeTab === 'series' && <SeriesScreen />}

          {activeTab === 'epg' && <EpgScreen />}

          {activeTab === 'favorites' && <FavoritesScreen />}

          {activeTab === 'search' && <SearchScreen />}

          {activeTab === 'showcase' && (
            <div className="flex-1 overflow-y-auto bg-[#080b11]">
              <DesignSystemShowcase />
            </div>
          )}

          {activeTab === 'settings' && <SettingsScreen />}

          {activeTab === 'diagnostics' && (
            <div className="flex-1 overflow-y-auto bg-[#080b11] p-4">
              <AdvancedDiagnosticsPanel />
            </div>
          )}
        </div>

        {/* Source Management Modal */}
        <SourceManagementModal
          isOpen={isSourceModalOpen}
          onClose={() => setIsSourceModalOpen(false)}
        />

        {/* Persistent Video Player Shell */}
        {playbackState.presentationMode === 'fullscreen' ? (
          <VideoPlayerShell forceMode="fullscreen" />
        ) : activeTab !== 'live' && playbackState.presentationMode !== 'hidden' && playbackState.currentChannel ? (
          <VideoPlayerShell forceMode="mini_player" />
        ) : null}
      </main>

      {/* 4. Mobile Bottom Navigation */}
      {isMobile && (
        <NavigationRail
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          variant="mobile_bottom"
        />
      )}

      {/* 5. Remote Navigation D-Pad Helper HUD Modal */}
      {showRemoteHelper && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl bg-[#0f1624] border border-emerald-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-white">TVLok Remote Control Reference</h3>
                  <p className="text-[11px] text-emerald-400">High-contrast focus navigation</p>
                </div>
              </div>
              <button
                onClick={() => setShowRemoteHelper(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-300 font-medium">D-Pad [▲ / ▼]</span>
                <span className="font-mono text-emerald-400 font-bold">Navigate Channels / Items</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-300 font-medium">D-Pad [◄ / ►]</span>
                <span className="font-mono text-emerald-400 font-bold">Switch Categories &amp; Panes</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-300 font-medium">[OK / Enter]</span>
                <span className="font-mono text-emerald-400 font-bold">Play Stream / Select</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-300 font-medium">[BACK / Esc]</span>
                <span className="font-mono text-emerald-400 font-bold">Return to Navigation</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-300 font-medium">Hotkeys: [H] [L] [M] [S] [G]</span>
                <span className="font-mono text-emerald-400 font-bold">Home, Live, Movies, Series, EPG</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                <span className="text-slate-300 font-medium">[P] / [T]</span>
                <span className="font-mono text-emerald-400 font-bold">Cycle Provider / Toggle 10-Ft UI</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowRemoteHelper(false)}
                className="w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CinematicShell: React.FC<CinematicShellProps> = (props) => {
  return (
    <ProfileProvider>
      <PlaybackProvider>
        <CinematicShellContent {...props} />
      </PlaybackProvider>
    </ProfileProvider>
  );
};

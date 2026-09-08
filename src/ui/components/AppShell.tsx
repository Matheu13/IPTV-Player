import React, { useState, useEffect } from 'react';
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

const AppShellContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>('live');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);

  const { playChannel, state: playbackState } = usePlayback();
  const { isWhoIsWatchingOpen, currentProfile, isKidsMode, openWhoIsWatching } = useProfile();

  // Detect Mobile / TV Viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global Keyboard Shortcuts (Desktop & Android TV Remote)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key) {
        case 'h':
        case 'H':
          setActiveTab('home');
          break;
        case 'l':
        case 'L':
          setActiveTab('live');
          break;
        case 'm':
        case 'M':
          setActiveTab('movies');
          break;
        case 's':
        case 'S':
          setActiveTab('series');
          break;
        case 'g':
        case 'G':
          setActiveTab('epg');
          break;
        case 'f':
        case 'F':
          setActiveTab('favorites');
          break;
        case 'd':
        case 'D':
          setActiveTab('showcase');
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
        case '/':
          e.preventDefault();
          setActiveTab('search');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectChannel = (channel: ChannelRowData) => {
    playChannel(channel, 'embedded');
    setActiveTab('live');
  };

  const handlePlayMedia = (url: string, title: string, metadata?: any) => {
    playChannel({
      id: metadata?.streamId?.toString() || `media-${Date.now()}`,
      channelNumber: 1,
      name: title,
      streamUrl: url,
      category: metadata?.genre || 'Video on Demand',
      is4k: true,
      isHdr: true,
      isFavorite: false,
      nowProgramme: {
        title,
        start: '00:00',
        stop: metadata?.duration || '02:00',
      },
    }, 'fullscreen');
  };

  return (
    <div className="flex h-screen w-screen bg-[#080b11] text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. Navigation Shell: Top Bar for TV, Sidebar Rail for Desktop */}
      {!isMobile && (
        <NavigationRail
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          variant={isTvMode ? 'tv_top' : 'desktop'}
        />
      )}

      {/* 2. Main Content Viewport */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative pb-16 md:pb-0">
        {/* Top App Header with Global Provider Switcher (Hidden on Live TV which has dedicated TV guide header) */}
        {activeTab !== 'live' && (
          <header className="h-12 bg-[#090d16]/90 backdrop-blur-md border-b border-white/5 px-4 flex items-center justify-between shrink-0 z-20">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">
                {activeTab === 'home'
                  ? 'Overview'
                  : activeTab === 'epg'
                  ? 'Electronic Program Guide'
                  : activeTab === 'movies'
                  ? 'VOD Cinema'
                  : activeTab === 'series'
                  ? 'TV Shows'
                  : activeTab === 'favorites'
                  ? 'Pinned Favorites'
                  : activeTab === 'search'
                  ? 'Universal Index'
                  : activeTab === 'settings'
                  ? 'System Settings'
                  : 'Diagnostics'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Active Profile Pill / Switcher */}
              <button
                onClick={openWhoIsWatching}
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#101726] hover:bg-white/[0.08] border border-white/10 text-xs font-medium text-slate-200 transition-all cursor-pointer"
                title="Switch Profile / Who Is Watching"
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase shadow-sm"
                  style={{ backgroundColor: currentProfile.avatarBg || '#2563eb' }}
                >
                  {currentProfile.name.charAt(0)}
                </div>
                <span className="hidden sm:inline font-semibold">{currentProfile.name}</span>
                {isKidsMode && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/25 text-emerald-300 font-bold">
                    KIDS
                  </span>
                )}
              </button>

              <ProviderSwitcher
                variant="pill"
                onOpenSourceManager={() => setIsSourceModalOpen(true)}
                onProviderSwitched={(sourceId, sourceName) => {
                  // If on Live TV, it will automatically update filtered channels
                }}
              />
            </div>
          </header>
        )}

        {/* Navigation / Screen Switcher */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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

        {/* Global Source Management Modal */}
        <SourceManagementModal
          isOpen={isSourceModalOpen}
          onClose={() => setIsSourceModalOpen(false)}
        />

        {/* Global Who Is Watching / Profile Switcher Modal */}
        {isWhoIsWatchingOpen && <WhoIsWatchingScreen />}

        {/* Global Persistent Video Player Shell (Handles mini-player / fullscreen across all views) */}
        {playbackState.presentationMode === 'fullscreen' ? (
          <VideoPlayerShell forceMode="fullscreen" />
        ) : activeTab !== 'live' && playbackState.presentationMode !== 'hidden' && playbackState.currentChannel ? (
          <VideoPlayerShell forceMode="mini_player" />
        ) : null}
      </main>

      {/* 3. Mobile Bottom Navigation (Visible on screen < 768px) */}
      {isMobile && (
        <NavigationRail
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          variant="mobile_bottom"
        />
      )}
    </div>
  );
};

export { CinematicShell } from './CinematicShell';

export const AppShell: React.FC = () => {
  return (
    <ProfileProvider>
      <PlaybackProvider>
        <AppShellContent />
      </PlaybackProvider>
    </ProfileProvider>
  );
};

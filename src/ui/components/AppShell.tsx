import React, { useState, useEffect } from 'react';
import { NavigationRail, NavTabId } from './NavigationRail';
import { HomeScreen } from '../screens/HomeScreen';
import { LiveTVScreen } from '../screens/LiveTVScreen';
import { VodSeriesCatalog } from '../../components/VodSeriesCatalog';
import { EpgGridSurface } from '../../components/EpgGridSurface';
import { SourceMonitorDashboard } from '../../components/SourceMonitorDashboard';
import { AdvancedDiagnosticsPanel } from '../../components/AdvancedDiagnosticsPanel';
import { DesignSystemShowcase } from './DesignSystemShowcase';
import { VideoPlayerShell } from './VideoPlayerShell';
import { PlaybackProvider, usePlayback } from '../context/PlaybackContext';
import { ChannelRowData } from './ChannelRow';

const AppShellContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>('home');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isTvMode, setIsTvMode] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { playChannel, state: playbackState } = usePlayback();

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
        {/* Navigation / Screen Switcher */}
        {activeTab === 'home' && (
          <HomeScreen
            onNavigateToLive={() => setActiveTab('live')}
            onNavigateToMovies={() => setActiveTab('movies')}
            onNavigateToSeries={() => setActiveTab('series')}
            onSelectChannel={handleSelectChannel}
          />
        )}

        {(activeTab === 'live' || activeTab === 'favorites' || activeTab === 'search') && (
          <LiveTVScreen
            onSelectChannel={handleSelectChannel}
            isTvMode={isTvMode}
          />
        )}

        {activeTab === 'movies' && (
          <div className="flex-1 overflow-y-auto bg-[#080b11]">
            <VodSeriesCatalog initialTab="movies" onPlayMedia={handlePlayMedia} />
          </div>
        )}

        {activeTab === 'series' && (
          <div className="flex-1 overflow-y-auto bg-[#080b11]">
            <VodSeriesCatalog initialTab="series" onPlayMedia={handlePlayMedia} />
          </div>
        )}

        {activeTab === 'epg' && (
          <div className="flex-1 overflow-y-auto bg-[#080b11]">
            <EpgGridSurface />
          </div>
        )}

        {activeTab === 'showcase' && (
          <div className="flex-1 overflow-y-auto bg-[#080b11]">
            <DesignSystemShowcase />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto bg-[#080b11]">
            <SourceMonitorDashboard />
          </div>
        )}

        {activeTab === 'diagnostics' && (
          <div className="flex-1 overflow-y-auto bg-[#080b11] p-4">
            <AdvancedDiagnosticsPanel />
          </div>
        )}

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

export const AppShell: React.FC = () => {
  return (
    <PlaybackProvider>
      <AppShellContent />
    </PlaybackProvider>
  );
};

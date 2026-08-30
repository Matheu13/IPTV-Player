import React from 'react';
import {
  Home,
  Tv,
  Film,
  Clapperboard,
  Calendar,
  Star,
  Search,
  Settings,
  Activity,
  ChevronLeft,
  ChevronRight,
  Palette,
} from 'lucide-react';
import { Focusable } from './Focusable';

export type NavTabId =
  | 'home'
  | 'live'
  | 'movies'
  | 'series'
  | 'epg'
  | 'favorites'
  | 'search'
  | 'showcase'
  | 'settings'
  | 'diagnostics';

interface NavigationItem {
  id: NavTabId;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  shortcut?: string;
}

const NAV_ITEMS: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: Home, shortcut: 'H' },
  { id: 'live', label: 'Live TV', icon: Tv, shortcut: 'L' },
  { id: 'movies', label: 'Movies', icon: Film, shortcut: 'M' },
  { id: 'series', label: 'Series', icon: Clapperboard, shortcut: 'S' },
  { id: 'epg', label: 'TV Guide', icon: Calendar, shortcut: 'G' },
  { id: 'favorites', label: 'Favorites', icon: Star, shortcut: 'F' },
  { id: 'search', label: 'Search', icon: Search, shortcut: '/' },
  { id: 'showcase', label: 'Design System', icon: Palette, shortcut: 'D' },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'diagnostics', label: 'Diagnostics', icon: Activity },
];

interface NavigationRailProps {
  activeTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  focusedNavId?: string;
  variant?: 'desktop' | 'mobile_bottom' | 'tv_top';
  className?: string;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed = false,
  onToggleCollapse,
  focusedNavId,
  variant = 'desktop',
  className = '',
}) => {
  // 1. Mobile Bottom Navigation Bar
  if (variant === 'mobile_bottom') {
    const mobileTabs: NavTabId[] = ['home', 'live', 'movies', 'series', 'favorites', 'search'];
    const filteredItems = NAV_ITEMS.filter((item) => mobileTabs.includes(item.id));

    return (
      <nav
        aria-label="Mobile Navigation"
        className={`fixed bottom-0 left-0 right-0 h-16 bg-[#0c1018]/95 backdrop-blur-lg border-t border-white/10 flex items-center justify-around px-2 z-40 ${className}`}
      >
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg transition-colors ${
                isActive ? 'text-sky-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-1 leading-none tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  // 2. Android TV / 10-Foot Leanback Top Bar
  if (variant === 'tv_top') {
    return (
      <nav
        aria-label="TV Main Navigation"
        className={`flex items-center gap-2 p-3 bg-[#0d121c]/90 backdrop-blur-md border-b border-white/10 z-30 ${className}`}
      >
        <div className="flex items-center gap-2 px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded-lg text-sky-400 font-extrabold text-sm tracking-wider mr-4">
          <Tv className="w-4 h-4" />
          <span>IPTV OS</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isFocused = focusedNavId === `nav-tv-${item.id}`;

            return (
              <Focusable
                key={item.id}
                id={`nav-tv-${item.id}`}
                isFocused={isFocused}
                onSelect={() => onSelectTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Focusable>
            );
          })}
        </div>
      </nav>
    );
  }

  // 3. Desktop Navigation Rail (Collapsible)
  return (
    <aside
      aria-label="Sidebar Navigation"
      className={`h-full bg-[#0c1018] border-r border-white/5 flex flex-col justify-between transition-all duration-300 z-30 ${
        isCollapsed ? 'w-16' : 'w-56'
      } ${className}`}
    >
      {/* App Branding & Collapse Toggle */}
      <div className="p-3.5 border-b border-white/5 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-950">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-white">IPTV PLAYER</div>
              <div className="text-[10px] font-mono text-sky-400/90 font-medium">8K • D3D11 • STALKER</div>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-950 mx-auto">
            <Tv className="w-4 h-4" />
          </div>
        )}

        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Nav Items */}
      <div className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const isFocused = focusedNavId === `nav-item-${item.id}`;

          return (
            <Focusable
              key={item.id}
              id={`nav-item-${item.id}`}
              isFocused={isFocused}
              onSelect={() => onSelectTab(item.id)}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon
                className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-sky-400 stroke-[2.5px]' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />

              {!isCollapsed && (
                <span className="flex-1 truncate tracking-tight">{item.label}</span>
              )}

              {!isCollapsed && item.shortcut && (
                <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                  {item.shortcut}
                </span>
              )}
            </Focusable>
          );
        })}
      </div>

      {/* Footer Toggle when collapsed */}
      {isCollapsed && onToggleCollapse && (
        <div className="p-2 border-t border-white/5 flex justify-center">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};

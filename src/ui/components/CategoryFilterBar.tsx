import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Tv, Flame, Trophy, Film, Clapperboard, Globe, Star, Zap } from 'lucide-react';
import { Focusable } from './Focusable';

export interface CategoryOption {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
  badge?: string;
}

export const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'All Channels', icon: Tv, count: 184 },
  { id: 'favorites', label: 'Favorites', icon: Star, count: 12, badge: 'FAV' },
  { id: 'sports', label: 'Sports & Live Events', icon: Trophy, count: 46 },
  { id: 'movies', label: 'Cinema & Premieres', icon: Film, count: 38 },
  { id: 'news', label: 'News & Breaking', icon: Globe, count: 24 },
  { id: 'series', label: 'TV Series & Binges', icon: Clapperboard, count: 52 },
  { id: '4k', label: '4K UHD & HDR Streams', icon: Zap, count: 18, badge: '4K' },
  { id: 'trending', label: 'Trending Broadcasts', icon: Flame, count: 9 },
];

interface CategoryFilterBarProps {
  id?: string;
  categories?: CategoryOption[];
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  className?: string;
  showCounts?: boolean;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  id = 'category-filter-bar',
  categories = DEFAULT_CATEGORIES,
  selectedCategory,
  onSelectCategory,
  className = '',
  showCounts = true,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -220, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 220, behavior: 'smooth' });
    }
  };

  return (
    <div id={id} className={`relative flex items-center group/filter ${className}`}>
      {/* Left Scroll Button */}
      <button
        onClick={scrollLeft}
        aria-label="Scroll categories left"
        className="hidden md:flex absolute left-0 z-10 w-7 h-7 -ml-2 items-center justify-center rounded-full bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white shadow-lg backdrop-blur-xs opacity-0 group-hover/filter:opacity-100 transition-opacity"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Scrollable Chip Strip */}
      <div
        ref={scrollContainerRef}
        className="flex items-center gap-2 overflow-x-auto py-1 px-1 no-scrollbar scroll-smooth"
        role="tablist"
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          const Icon = cat.icon;

          return (
            <Focusable
              key={cat.id}
              id={`cat-filter-${cat.id}`}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${
                isSelected
                  ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20 font-bold'
                  : 'bg-[#111722] hover:bg-[#161e2c] text-slate-300 hover:text-white border border-white/5'
              }`}
            >
              {Icon && (
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isSelected ? 'text-slate-950' : 'text-sky-400'
                  }`}
                />
              )}
              <span>{cat.label}</span>

              {cat.badge && (
                <span
                  className={`px-1.5 py-0.2 text-[9px] font-mono font-black uppercase rounded ${
                    isSelected
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}
                >
                  {cat.badge}
                </span>
              )}

              {showCounts && cat.count !== undefined && !cat.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-slate-950/20 text-slate-900 font-bold'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  {cat.count}
                </span>
              )}
            </Focusable>
          );
        })}
      </div>

      {/* Right Scroll Button */}
      <button
        onClick={scrollRight}
        aria-label="Scroll categories right"
        className="hidden md:flex absolute right-0 z-10 w-7 h-7 -mr-2 items-center justify-center rounded-full bg-slate-900/90 border border-white/10 text-slate-300 hover:text-white shadow-lg backdrop-blur-xs opacity-0 group-hover/filter:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

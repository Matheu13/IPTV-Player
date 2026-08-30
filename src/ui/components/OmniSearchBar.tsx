import React, { useState, useRef, useEffect } from 'react';
import { Search, X, SlidersHorizontal, Tv, Sparkles, CornerDownLeft } from 'lucide-react';
import { Focusable } from './Focusable';

interface OmniSearchBarProps {
  id?: string;
  value: string;
  onChange: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  totalResults?: number;
  selectedFilter?: string;
  onSelectFilter?: (filter: string) => void;
  className?: string;
  autoFocus?: boolean;
}

export const OmniSearchBar: React.FC<OmniSearchBarProps> = ({
  id = 'omni-search-bar',
  value,
  onChange,
  onClear,
  placeholder = 'Search channels, programmes, sports, numbers (#101)...',
  totalResults,
  selectedFilter = 'all',
  onSelectFilter,
  className = '',
  autoFocus = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Global shortcut `/` to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
          e.preventDefault();
          inputRef.current?.focus();
        }
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    onChange('');
    if (onClear) onClear();
    inputRef.current?.focus();
  };

  const searchFilters = [
    { id: 'all', label: 'All' },
    { id: 'channels', label: 'Channels' },
    { id: 'epg', label: 'Programmes' },
    { id: '4k', label: '4K Streams' },
  ];

  return (
    <div
      id={id}
      className={`relative flex flex-col gap-2 w-full transition-all duration-150 ${className}`}
    >
      {/* Search Input Container */}
      <div
        className={`relative flex items-center w-full rounded-xl bg-[#111722] border transition-all duration-150 ${
          isFocused
            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-[#141b29] shadow-lg'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        {/* Search Icon */}
        <div className="pl-3.5 pr-2 text-slate-400 flex items-center pointer-events-none">
          <Search className={`w-4 h-4 ${isFocused ? 'text-sky-400' : 'text-slate-400'}`} />
        </div>

        {/* Text Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-transparent py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none font-medium"
        />

        {/* Trailing Controls & Shortcuts */}
        <div className="flex items-center gap-1.5 pr-2.5">
          {/* Result Count */}
          {totalResults !== undefined && value.trim().length > 0 && (
            <span className="text-[11px] font-mono font-medium text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded">
              {totalResults} results
            </span>
          )}

          {/* Clear Button */}
          {value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Clear query (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Keyboard Hint Badge */}
          <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-700/80 rounded select-none">
            <kbd className="font-mono">/</kbd>
          </span>
        </div>
      </div>

      {/* Sub-filter chips if enabled */}
      {onSelectFilter && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          <span className="text-[10px] font-mono uppercase text-slate-500 mr-1 shrink-0">Filter By:</span>
          {searchFilters.map((filter) => {
            const active = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onSelectFilter(filter.id)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors shrink-0 ${
                  active
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

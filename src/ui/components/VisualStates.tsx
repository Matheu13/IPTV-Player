import React from 'react';
import { Loader2, AlertCircle, Inbox, WifiOff, Database, RefreshCw } from 'lucide-react';
import { GlassPanel } from './GlassPanel';

export const LoadingState: React.FC<{
  title?: string;
  message?: string;
  className?: string;
}> = ({
  title = 'Loading Channels & EPG...',
  message = 'Initializing stream engine and synchronizing provider metadata',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center space-y-4 ${className}`}>
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin" />
        <Loader2 className="w-6 h-6 text-sky-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <div className="space-y-1">
        <h4 className="text-base font-semibold text-slate-100">{title}</h4>
        <p className="text-xs text-slate-400 max-w-sm">{message}</p>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}> = ({
  title = 'No Content Found',
  message = 'No channels match the active category, search query, or provider filter.',
  icon,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <GlassPanel className={`p-8 text-center flex flex-col items-center justify-center space-y-4 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400">
        {icon || <Inbox className="w-6 h-6" />}
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-base font-semibold text-slate-200">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </GlassPanel>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}> = ({
  title = 'Playback or Data Sync Error',
  message = 'Failed to fetch playlist data or establish playback pipeline connection.',
  onRetry,
  className = '',
}) => {
  return (
    <GlassPanel className={`p-8 text-center flex flex-col items-center justify-center space-y-4 border-rose-500/30 bg-rose-950/10 ${className}`}>
      <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
        <AlertCircle className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-sm">
        <h4 className="text-base font-semibold text-rose-200">{title}</h4>
        <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Operation</span>
        </button>
      )}
    </GlassPanel>
  );
};

export const CachedDataBanner: React.FC<{
  sourceName?: string;
  cachedAt?: string;
  onRefresh?: () => void;
  timestamp?: string;
}> = ({ sourceName = 'Provider', cachedAt, timestamp, onRefresh }) => {
  const displayTime = timestamp || cachedAt || 'Recently';
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-300 text-xs">
      <div className="flex items-center gap-2">
        <Database className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>
          <strong>{sourceName}:</strong> Displaying resilient cached data ({displayTime}).
        </span>
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="underline hover:text-amber-200 text-[11px] font-medium"
        >
          Try Refresh
        </button>
      )}
    </div>
  );
};

export const VisualStates = {
  Loading: LoadingState,
  Empty: EmptyState,
  Error: ErrorState,
  CachedData: CachedDataBanner,
};

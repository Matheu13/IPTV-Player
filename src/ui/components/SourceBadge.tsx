import React from 'react';
import { Server, Radio, Film, ShieldCheck } from 'lucide-react';

interface SourceBadgeProps {
  sourceName?: string;
  sourceType?: 'xtream' | 'm3u' | 'stalker' | 'hdhomerun' | 'custom' | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const SourceBadge: React.FC<SourceBadgeProps> = ({
  sourceName = 'Default Source',
  sourceType = 'xtream',
  className = '',
  size = 'sm',
}) => {
  const getIcon = () => {
    switch (sourceType.toLowerCase()) {
      case 'stalker':
      case 'mag':
        return <ShieldCheck className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />;
      case 'hdhomerun':
        return <Radio className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />;
      case 'm3u':
        return <Film className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />;
      case 'xtream':
      default:
        return <Server className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />;
    }
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-1.5 py-0.5 text-[10px] gap-1'
      : 'px-2 py-1 text-xs gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium font-mono text-slate-400 bg-slate-900/80 border border-slate-700/50 rounded ${sizeClasses} ${className}`}
      title={`Source: ${sourceName} (${sourceType})`}
    >
      {getIcon()}
      <span className="truncate max-w-[100px]">{sourceName}</span>
    </span>
  );
};

import React from 'react';
import { ChannelRowData } from '../components/ChannelRow';
import { TvLokLiveInterface } from '../components/TvLokLiveInterface';

export type LiveTvNavStep = 'countries' | 'types' | 'channels';
export type LiveTvViewMode = 'step_by_step' | 'columns';

export interface LiveTVScreenProps {
  onSelectChannel?: (channel: ChannelRowData) => void;
  isTvMode?: boolean;
  onOpenSourceManager?: () => void;
  initialStep?: LiveTvNavStep;
}

/**
 * TV Glass Live TV Screen
 * Implements the 3-panel architecture consuming existing ingestion data:
 * - Panel 1: Main Application Navigation
 * - Panel 2: Live TV Categories & Playlist Groups (dynamically populated from provider)
 * - Panel 3: Live Video Preview + Program Metadata + Synchronized EPG Guide
 */
export const LiveTVScreen: React.FC<LiveTVScreenProps> = ({ onSelectChannel, isTvMode, onOpenSourceManager }) => {
  return (
    <TvLokLiveInterface
      onSelectChannel={onSelectChannel}
      isTvMode={isTvMode}
      withNavRail={false}
      onOpenSourceManager={onOpenSourceManager}
    />
  );
};

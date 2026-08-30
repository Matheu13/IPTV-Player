import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { ChannelRowData } from '../components/ChannelRow';
import { globalUnifiedIptvEngine } from '../../lib/unifiedIptvEngine';

export type PlayerPresentationMode = 'embedded' | 'fullscreen' | 'mini_player' | 'preview' | 'hidden';

export interface PlaybackState {
  currentChannel: ChannelRowData | null;
  presentationMode: PlayerPresentationMode;
  isPlaying: boolean;
  isBuffering: boolean;
  isMuted: boolean;
  volume: number;
  quality: 'auto' | '1080p' | '720p' | '480p' | '4k';
  activeAudioTrack: string;
  activeSubtitleTrack: string;
  audioTracks: { id: string; label: string; language: string }[];
  subtitleTracks: { id: string; label: string; language: string }[];
  error: string | null;
  stats: {
    resolution: string;
    fps: number;
    bitrateMbps: number;
    bufferHealthSec: number;
    droppedFrames: number;
    activeDecoder: string;
  };
}

interface PlaybackContextValue {
  state: PlaybackState;
  playChannel: (channel: ChannelRowData, initialMode?: PlayerPresentationMode) => void;
  stopPlayback: () => void;
  setPresentationMode: (mode: PlayerPresentationMode) => void;
  togglePlayPause: () => void;
  setVolume: (vol: number) => void;
  toggleMute: () => void;
  setQuality: (quality: 'auto' | '1080p' | '720p' | '480p' | '4k') => void;
  setAudioTrack: (trackId: string) => void;
  setSubtitleTrack: (trackId: string) => void;
}

const PlaybackContext = createContext<PlaybackContextValue | undefined>(undefined);

export const PlaybackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PlaybackState>({
    currentChannel: null,
    presentationMode: 'hidden',
    isPlaying: false,
    isBuffering: false,
    isMuted: false,
    volume: 85,
    quality: 'auto',
    activeAudioTrack: 'und',
    activeSubtitleTrack: 'off',
    audioTracks: [
      { id: 'eng', label: 'English (Stereo)', language: 'en' },
      { id: 'fra', label: 'French (5.1 Surround)', language: 'fr' },
      { id: 'und', label: 'Main Broadcast Audio', language: 'und' },
    ],
    subtitleTracks: [
      { id: 'off', label: 'Off', language: 'off' },
      { id: 'eng', label: 'English CC', language: 'en' },
      { id: 'spa', label: 'Spanish Subtitles', language: 'es' },
    ],
    error: null,
    stats: {
      resolution: '1920x1080',
      fps: 60,
      bitrateMbps: 6.4,
      bufferHealthSec: 4.8,
      droppedFrames: 0,
      activeDecoder: 'D3D11VA / GPU Zero-Copy',
    },
  });

  const playChannel = (channel: ChannelRowData, initialMode: PlayerPresentationMode = 'embedded') => {
    setState((prev) => ({
      ...prev,
      currentChannel: channel,
      presentationMode: initialMode,
      isPlaying: true,
      isBuffering: true,
      error: null,
      stats: {
        ...prev.stats,
        resolution: channel.is8k ? '7680x4320' : channel.is4k ? '3840x2160' : '1920x1080',
        bitrateMbps: channel.is8k ? 35.0 : channel.is4k ? 18.5 : 6.4,
      },
    }));

    // Record into recent history
    try {
      globalUnifiedIptvEngine.recordChannelWatch(channel.id);
    } catch {
      // safe fallback
    }

    // Simulate stream sync latency (fast & realistic)
    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isBuffering: false,
      }));
    }, 280);
  };

  const stopPlayback = () => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isBuffering: false,
      currentChannel: null,
      presentationMode: 'hidden',
    }));
  };

  const setPresentationMode = (mode: PlayerPresentationMode) => {
    setState((prev) => ({ ...prev, presentationMode: mode }));
  };

  const togglePlayPause = () => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const setVolume = (vol: number) => {
    setState((prev) => ({ ...prev, volume: vol, isMuted: vol === 0 }));
  };

  const toggleMute = () => {
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const setQuality = (quality: 'auto' | '1080p' | '720p' | '480p' | '4k') => {
    setState((prev) => ({ ...prev, quality }));
  };

  const setAudioTrack = (trackId: string) => {
    setState((prev) => ({ ...prev, activeAudioTrack: trackId }));
  };

  const setSubtitleTrack = (trackId: string) => {
    setState((prev) => ({ ...prev, activeSubtitleTrack: trackId }));
  };

  return (
    <PlaybackContext.Provider
      value={{
        state,
        playChannel,
        stopPlayback,
        setPresentationMode,
        togglePlayPause,
        setVolume,
        toggleMute,
        setQuality,
        setAudioTrack,
        setSubtitleTrack,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
};

export const usePlayback = (): PlaybackContextValue => {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayback must be used within a PlaybackProvider');
  }
  return context;
};

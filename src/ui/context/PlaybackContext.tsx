import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
    volume: 90,
    quality: 'auto',
    activeAudioTrack: 'und',
    activeSubtitleTrack: 'off',
    audioTracks: [
      { id: '0', label: 'Main Broadcast Audio (Stereo)', language: 'und' },
      { id: '1', label: 'English Surround 5.1', language: 'en' },
      { id: '2', label: 'Commentary & Ambient Track', language: 'en' },
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

  const playChannel = useCallback((channel: ChannelRowData, initialMode: PlayerPresentationMode = 'embedded') => {
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
  }, []);

  const stopPlayback = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isBuffering: false,
      currentChannel: null,
      presentationMode: 'hidden',
    }));
  }, []);

  const setPresentationMode = useCallback((mode: PlayerPresentationMode) => {
    setState((prev) => ({ ...prev, presentationMode: mode }));
  }, []);

  const togglePlayPause = useCallback(() => {
    setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, vol));
    setState((prev) => ({ ...prev, volume: clamped, isMuted: clamped === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((prev) => {
      const willMute = !prev.isMuted;
      return {
        ...prev,
        isMuted: willMute,
        volume: willMute ? prev.volume : (prev.volume === 0 ? 80 : prev.volume),
      };
    });
  }, []);

  const setQuality = useCallback((quality: 'auto' | '1080p' | '720p' | '480p' | '4k') => {
    setState((prev) => ({ ...prev, quality }));
  }, []);

  const setAudioTrack = useCallback((trackId: string) => {
    setState((prev) => ({ ...prev, activeAudioTrack: trackId }));
  }, []);

  const setSubtitleTrack = useCallback((trackId: string) => {
    setState((prev) => ({ ...prev, activeSubtitleTrack: trackId }));
  }, []);

  const contextValue = useMemo(() => ({
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
  }), [
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
  ]);

  return (
    <PlaybackContext.Provider value={contextValue}>
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

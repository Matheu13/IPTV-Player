import React, { useState } from 'react';
import {
  Volume2,
  Subtitles,
  X,
  Check,
  Radio,
  Sliders,
  Settings2,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { Button } from './Button';
import { Focusable } from './Focusable';

export interface AudioTrackOption {
  id: string;
  name: string;
  language: string;
  codec: string;
  channels: string; // e.g. "5.1 Surround", "2.0 Stereo", "7.1 Atmos"
  bitrate?: string;
  isDefault?: boolean;
}

export interface SubtitleTrackOption {
  id: string;
  name: string;
  language: string;
  format: string; // e.g. "WebVTT", "DVB", "Teletext"
  isHearingImpaired?: boolean;
}

interface StreamAudioSubtitleModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioTracks?: AudioTrackOption[];
  selectedAudioId?: string;
  onSelectAudio?: (trackId: string) => void;
  subtitleTracks?: SubtitleTrackOption[];
  selectedSubtitleId?: string; // 'off' or track id
  onSelectSubtitle?: (trackId: string) => void;
  hwDecoder?: string;
  onChangeHwDecoder?: (decoder: string) => void;
}

export const StreamAudioSubtitleModal: React.FC<StreamAudioSubtitleModalProps> = ({
  isOpen,
  onClose,
  audioTracks = [
    { id: 'a1', name: 'English (Original)', language: 'en', codec: 'AAC-LC', channels: '2.0 Stereo', isDefault: true },
    { id: 'a2', name: 'English (Dolby Surround)', language: 'en', codec: 'E-AC3', channels: '5.1 Dolby Digital' },
    { id: 'a3', name: 'Spanish Commentary', language: 'es', codec: 'AAC', channels: '2.0 Stereo' },
    { id: 'a4', name: 'French Audio Description', language: 'fr', codec: 'AAC', channels: '2.0 Stereo' },
  ],
  selectedAudioId = 'a1',
  onSelectAudio,
  subtitleTracks = [
    { id: 'off', name: 'Subtitles Disabled (Off)', language: 'none', format: 'None' },
    { id: 's1', name: 'English [CC]', language: 'en', format: 'WebVTT', isHearingImpaired: true },
    { id: 's2', name: 'Spanish (Latin America)', language: 'es', format: 'WebVTT' },
    { id: 's3', name: 'French Subtitles', language: 'fr', format: 'WebVTT' },
  ],
  selectedSubtitleId = 'off',
  onSelectSubtitle,
  hwDecoder = 'd3d11va',
  onChangeHwDecoder,
}) => {
  const [activeTab, setActiveTab] = useState<'audio' | 'subtitles' | 'hardware'>('audio');
  const [activeAudio, setActiveAudio] = useState(selectedAudioId);
  const [activeSub, setActiveSub] = useState(selectedSubtitleId);
  const [activeDec, setActiveDec] = useState(hwDecoder);
  const [audioDelayMs, setAudioDelayMs] = useState(0);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-xl bg-[#0c1018] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#111722]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Playback Tracks & Pipeline</h3>
              <p className="text-xs text-slate-400">Audio language, closed captions, and hardware acceleration</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-white/10 bg-[#0e141f] px-5 pt-2 gap-2">
          {[
            { id: 'audio', label: 'Audio Tracks', icon: Volume2 },
            { id: 'subtitles', label: 'Subtitles & CC', icon: Subtitles },
            { id: 'hardware', label: 'Decoder & Sync', icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isTabActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
                  isTabActive
                    ? 'border-sky-400 text-sky-300 font-bold bg-white/5 rounded-t'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Audio Tracks Selection */}
          {activeTab === 'audio' && (
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase text-slate-400 mb-2">Available Audio Streams</div>
              {audioTracks.map((track) => {
                const isSelected = activeAudio === track.id;
                return (
                  <Focusable
                    key={track.id}
                    id={`track-audio-${track.id}`}
                    onClick={() => {
                      setActiveAudio(track.id);
                      if (onSelectAudio) onSelectAudio(track.id);
                    }}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/50 text-white'
                        : 'bg-[#111722] border-white/5 text-slate-300 hover:bg-[#161e2c]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {track.name}
                          {track.isDefault && (
                            <span className="text-[10px] font-mono font-bold bg-white/10 px-1.5 py-0.2 rounded text-slate-300">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {track.channels} • {track.codec} • lang: {track.language.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                  </Focusable>
                );
              })}
            </div>
          )}

          {/* Subtitles Selection */}
          {activeTab === 'subtitles' && (
            <div className="space-y-2">
              <div className="text-xs font-mono uppercase text-slate-400 mb-2">Subtitle & Closed Caption Tracks</div>
              {subtitleTracks.map((sub) => {
                const isSelected = activeSub === sub.id;
                return (
                  <Focusable
                    key={sub.id}
                    id={`track-sub-${sub.id}`}
                    onClick={() => {
                      setActiveSub(sub.id);
                      if (onSelectSubtitle) onSelectSubtitle(sub.id);
                    }}
                    className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-500/10 border-sky-500/50 text-white'
                        : 'bg-[#111722] border-white/5 text-slate-300 hover:bg-[#161e2c]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'}`}>
                        <Subtitles className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {sub.name}
                          {sub.isHearingImpaired && (
                            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded">
                              CC / SDH
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          Format: {sub.format}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-sky-400 shrink-0" />}
                  </Focusable>
                );
              })}
            </div>
          )}

          {/* Hardware & Sync */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-slate-400 block">Hardware Acceleration Decoder</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: 'd3d11va', label: 'D3D11VA / DirectX (Zero Copy)', desc: 'Windows NVDEC / Intel QSV' },
                    { id: 'videotoolbox', label: 'Apple VideoToolbox', desc: 'macOS / iOS Metal Direct' },
                    { id: 'mediacodec', label: 'Android MediaCodec (NDK)', desc: 'Fire TV / Android TV Direct' },
                    { id: 'software', label: 'Software FFmpeg (CPU Fallback)', desc: 'Universal software decoding' },
                  ].map((dec) => (
                    <button
                      key={dec.id}
                      onClick={() => {
                        setActiveDec(dec.id);
                        if (onChangeHwDecoder) onChangeHwDecoder(dec.id);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        activeDec === dec.id
                          ? 'bg-sky-500/10 border-sky-500/50 text-white'
                          : 'bg-[#111722] border-white/5 text-slate-300 hover:bg-[#161e2c]'
                      }`}
                    >
                      <div className="text-xs font-bold">{dec.label}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">{dec.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Sync Offset Slider */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono text-slate-400 uppercase">Audio / Video Sync Delay</span>
                  <span className="font-mono font-bold text-sky-400">{audioDelayMs > 0 ? `+${audioDelayMs} ms` : `${audioDelayMs} ms`}</span>
                </div>
                <input
                  type="range"
                  min="-500"
                  max="500"
                  step="25"
                  value={audioDelayMs}
                  onChange={(e) => setAudioDelayMs(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>-500ms (Audio Ahead)</span>
                  <span>0ms (Synced)</span>
                  <span>+500ms (Audio Delayed)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#111722] border-t border-white/10 flex justify-end gap-2">
          <Button variant="secondary" size="md" onClick={onClose}>
            Close Dialog
          </Button>
          <Button variant="primary" size="md" onClick={onClose}>
            Apply Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

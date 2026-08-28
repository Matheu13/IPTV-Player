import React, { useState } from 'react';
import {
  Settings,
  Sliders,
  Shield,
  Clock,
  Volume2,
  Cpu,
  Monitor,
  Check,
  X,
} from 'lucide-react';

interface IptvSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IptvSettingsModal: React.FC<IptvSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [bufferProfile, setBufferProfile] = useState<'low' | 'standard' | 'aggressive'>('low');
  const [epgSyncInterval, setEpgSyncInterval] = useState<'1h' | '6h' | '24h'>('6h');
  const [hwAcceleration, setHwAcceleration] = useState(true);
  const [spatialAudioEnabled, setSpatialAudioEnabled] = useState(true);
  const [autoZapperTime, setAutoZapperTime] = useState('2.5s');
  const [overscanFactor, setOverscanFactor] = useState(8);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 400);
  };

  return (
    <div
      id="iptv-settings-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div
        id="iptv-settings-modal-card"
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">IPTV Player &amp; Stream Settings</h2>
              <p className="text-xs text-slate-400">
                Buffer tuning, virtualization options, audio decoders, and playback hardware
              </p>
            </div>
          </div>
          <button
            id="close-settings-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
          {/* Playback & Buffer Profile */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>Buffer &amp; Latency Profile</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'low', title: 'Low Latency (500ms)', desc: 'Fast zapping & live sports' },
                { id: 'standard', title: 'Standard (2.0s)', desc: 'Balanced stability' },
                { id: 'aggressive', title: 'Deep Buffer (8.0s)', desc: 'Immune to jitter' },
              ].map((p) => (
                <button
                  key={p.id}
                  id={`buffer-opt-${p.id}`}
                  onClick={() => setBufferProfile(p.id as any)}
                  className={`p-3 rounded-lg border text-left transition ${
                    bufferProfile === p.id
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200 shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs text-slate-200">{p.title}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Virtualization & Rendering */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Virtualization &amp; 10k+ Channels Rendering</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Hardware WebCodecs Acceleration</div>
                  <div className="text-[11px] text-slate-400">Zero-copy GPU direct pipeline</div>
                </div>
                <input
                  id="hw-accel-toggle"
                  type="checkbox"
                  checked={hwAcceleration}
                  onChange={(e) => setHwAcceleration(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
                />
              </div>

              <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-200">Spatial Audio &amp; MPEG-H Virtualizer</div>
                  <div className="text-[11px] text-slate-400">7.1.4 3D HRTF rendering</div>
                </div>
                <input
                  id="spatial-audio-toggle"
                  type="checkbox"
                  checked={spatialAudioEnabled}
                  onChange={(e) => setSpatialAudioEnabled(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700"
                />
              </div>
            </div>
          </div>

          {/* EPG Sync Interval */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Clock className="w-4 h-4 text-indigo-400" />
              <span>EPG XMLTV Background Sync Interval</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '1h', label: 'Every 1 Hour' },
                { id: '6h', label: 'Every 6 Hours (Recommended)' },
                { id: '24h', label: 'Daily (24 Hours)' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  id={`epg-sync-${opt.id}`}
                  onClick={() => setEpgSyncInterval(opt.id as any)}
                  className={`py-2 px-3 rounded-lg border text-center text-xs font-semibold transition ${
                    epgSyncInterval === opt.id
                      ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">Engine Version: M28-UI.10K</span>
          <div className="flex items-center gap-2">
            <button
              id="cancel-settings-btn"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              id="save-settings-btn"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition"
            >
              {savedSuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedSuccess ? 'Saved!' : 'Apply Settings'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Heart,
  FolderPlus,
  Trash2,
  Eye,
  EyeOff,
  Hash,
  Tv,
  Radio,
  Gamepad2,
  Volume2,
  VolumeX,
  Maximize2,
  Activity,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { CustomBouquet, ChannelOverrideMapping, UnifiedChannel } from '../types';
import { ChannelManager, RemoteZapperController } from '../lib/channelManager';
import { FIXTURE_STREAMS_SAMPLE } from '../lib/fixtures';

interface ChannelManagementZapperProps {
  onTuneChannel?: (channelId: string | number, name: string) => void;
}

export const ChannelManagementZapper: React.FC<ChannelManagementZapperProps> = ({ onTuneChannel }) => {
  const [activeSubTab, setActiveSubTab] = useState<'REMOTE_ZAPPER' | 'FAVORITES' | 'BOUQUETS' | 'OVERRIDES'>('REMOTE_ZAPPER');
  const [favorites, setFavorites] = useState<(string | number)[]>([]);
  const [bouquets, setBouquets] = useState<CustomBouquet[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ChannelOverrideMapping>>({});
  const [newBouquetName, setNewBouquetName] = useState<string>('');
  const [newBouquetDesc, setNewBouquetDesc] = useState<string>('');
  const [selectedBouquetId, setSelectedBouquetId] = useState<string | null>(null);
  const [zapperNotice, setZapperNotice] = useState<string | null>(null);

  // Remote & Keypad State
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');
  const [currentChannelIndex, setCurrentChannelIndex] = useState<number>(0);

  // Mock list of active channels
  const rawChannels: UnifiedChannel[] = FIXTURE_STREAMS_SAMPLE.map((s, i) => ({
    id: String(s.stream_id),
    streamId: s.stream_id,
    name: s.name,
    streamType: 'live',
    categoryId: s.category_id,
    tvArchive: Boolean(s.tv_archive),
    sourceType: 'XTREAM',
    formatsAvailable: ['m3u8', 'ts'],
    num: s.num || i + 1,
  }));

  const transformedChannels = ChannelManager.applyOverrides(rawChannels);

  const reloadData = () => {
    setFavorites(ChannelManager.getFavorites());
    setBouquets(ChannelManager.getBouquets());
    setOverrides(ChannelManager.getOverrides());
  };

  useEffect(() => {
    reloadData();
  }, []);

  // Remote Zapper Controller instance
  const [controller] = useState(() => {
    return new RemoteZapperController({
      onDigitCommitted: (num) => {
        setKeypadBuffer('');
        const found = transformedChannels.find((c) => c.num === num || String(c.streamId) === String(num));
        if (found) {
          if (onTuneChannel) onTuneChannel(found.streamId, found.name);
          setZapperNotice(`Tuned directly to CH ${num}: ${found.name}`);
        } else {
          setZapperNotice(`Channel #${num} not found in channel map`);
        }
        setTimeout(() => setZapperNotice(null), 3000);
      },
      onZappedChannel: (delta) => {
        setCurrentChannelIndex((prev) => {
          const total = transformedChannels.length;
          const next = (prev + delta + total) % total;
          const target = transformedChannels[next];
          if (onTuneChannel && target) {
            onTuneChannel(target.streamId, target.name);
          }
          setZapperNotice(`Zapped to CH ${target.num}: ${target.name}`);
          setTimeout(() => setZapperNotice(null), 2500);
          return next;
        });
      },
    });
  });

  const handleDigit = (digit: string | number) => {
    const buf = controller.inputDigit(digit);
    setKeypadBuffer(buf);
  };

  const handleStepChannel = (delta: number) => {
    controller.stepChannel(delta);
  };

  const handleToggleFavorite = (id: string | number) => {
    ChannelManager.toggleFavorite(id);
    reloadData();
  };

  const handleToggleHide = (id: string | number, currentHidden: boolean) => {
    ChannelManager.setChannelHidden(id, !currentHidden);
    reloadData();
  };

  const handleSetCustomNumber = (id: string | number, numStr: string) => {
    const num = parseInt(numStr, 10);
    if (!isNaN(num)) {
      ChannelManager.setChannelCustomNumber(id, num);
      reloadData();
    }
  };

  const handleCreateBouquet = () => {
    if (!newBouquetName.trim()) return;
    ChannelManager.createBouquet(newBouquetName, newBouquetDesc, ['10452']);
    setNewBouquetName('');
    setNewBouquetDesc('');
    reloadData();
  };

  const handleDeleteBouquet = (id: string) => {
    ChannelManager.deleteBouquet(id);
    if (selectedBouquetId === id) setSelectedBouquetId(null);
    reloadData();
  };

  return (
    <div className="space-y-6" id="channel-management-zapper">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm mb-1">
            <Gamepad2 className="w-4 h-4" />
            <span>Milestone 3c • Channel Management, Bouquets & 10-Foot Remote Zapper</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Custom Bouquets, Channel Overrides & Remote Navigation</h2>
          <p className="text-slate-400 text-xs mt-1">
            Fast zapping debouncing (250ms), numeric channel dialing, bouquet curation, and channel hiding.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
          <button
            id="btn-subtab-remote"
            onClick={() => setActiveSubTab('REMOTE_ZAPPER')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'REMOTE_ZAPPER'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" /> 10-Foot Remote
          </button>
          <button
            id="btn-subtab-favs"
            onClick={() => setActiveSubTab('FAVORITES')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'FAVORITES'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Heart className="w-3.5 h-3.5" /> Favorites ({favorites.length})
          </button>
          <button
            id="btn-subtab-bouquets"
            onClick={() => setActiveSubTab('BOUQUETS')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'BOUQUETS'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Bouquets ({bouquets.length})
          </button>
          <button
            id="btn-subtab-overrides"
            onClick={() => setActiveSubTab('OVERRIDES')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'OVERRIDES'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> Overrides & Hiding
          </button>
        </div>
      </div>

      {zapperNotice && (
        <div className="bg-indigo-950/90 border border-indigo-700 text-indigo-300 px-4 py-3 rounded-lg text-xs flex items-center gap-2 animate-fadeIn">
          <Zap className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold">{zapperNotice}</span>
        </div>
      )}

      {/* Tab Content */}
      {activeSubTab === 'REMOTE_ZAPPER' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Virtual Remote Control UI */}
          <div className="md:col-span-5 bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col items-center space-y-5 shadow-2xl">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" /> Remote Controller
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>

            {/* Keypad Display Buffer */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
              <div className="text-[10px] text-slate-500 font-mono">DIAL BUFFER</div>
              <div className="text-2xl font-bold font-mono text-amber-400 tracking-widest min-h-[32px]">
                {keypadBuffer ? `CH ${keypadBuffer}_` : `CH ${transformedChannels[currentChannelIndex]?.num || '---'}`}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {transformedChannels[currentChannelIndex]?.name || 'No Channel'}
              </div>
            </div>

            {/* Ch +/- and Vol +/- D-Pad Area */}
            <div className="grid grid-cols-2 gap-4 w-full">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center space-y-2">
                <span className="text-[10px] font-bold text-slate-400">CHANNEL</span>
                <button
                  id="btn-remote-ch-up"
                  onClick={() => handleStepChannel(1)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95"
                >
                  CH ▲
                </button>
                <button
                  id="btn-remote-ch-down"
                  onClick={() => handleStepChannel(-1)}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all active:scale-95"
                >
                  CH ▼
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center space-y-2">
                <span className="text-[10px] font-bold text-slate-400">VOLUME</span>
                <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all active:scale-95">
                  VOL +
                </button>
                <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-all active:scale-95">
                  VOL -
                </button>
              </div>
            </div>

            {/* 10-Key Numeric Keypad (0-9) */}
            <div className="grid grid-cols-3 gap-2 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Fav', '0', 'OK'].map((btn) => (
                <button
                  key={btn}
                  id={`btn-keypad-${btn}`}
                  onClick={() => {
                    if (/^\d$/.test(btn)) {
                      handleDigit(btn);
                    } else if (btn === 'OK') {
                      controller.commitDigits();
                    } else if (btn === 'Fav') {
                      const activeCh = transformedChannels[currentChannelIndex];
                      if (activeCh) handleToggleFavorite(activeCh.streamId);
                    }
                  }}
                  className={`py-3 rounded-xl font-bold font-mono text-sm transition-all active:scale-90 ${
                    btn === 'OK'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : btn === 'Fav'
                      ? 'bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>

          {/* Channel Surfing Guide & Debounce Telemetry */}
          <div className="md:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Live Channel Surfing Map</h3>
                <p className="text-xs text-slate-400">Click any channel or use the remote to zap instantly.</p>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                250ms Anti-Flood Guard
              </span>
            </div>

            <div className="space-y-2">
              {transformedChannels.map((ch, idx) => {
                const isCurrent = idx === currentChannelIndex;
                const isFav = ChannelManager.isFavorite(ch.streamId);

                return (
                  <div
                    key={ch.id}
                    id={`surf-ch-${ch.streamId}`}
                    onClick={() => {
                      setCurrentChannelIndex(idx);
                      if (onTuneChannel) onTuneChannel(ch.streamId, ch.name);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isCurrent
                        ? 'bg-slate-800 border-indigo-500 shadow-md ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-center text-xs font-mono font-bold text-amber-400 bg-slate-900 px-1.5 py-1 rounded border border-slate-800">
                        {ch.num}
                      </span>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {ch.name}
                          {isFav && <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">Stream ID: {ch.streamId}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(ch.streamId);
                        }}
                        className={`p-1.5 rounded-lg border transition-colors ${
                          isFav
                            ? 'bg-rose-950 border-rose-800 text-rose-400'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-rose-400'
                        }`}
                      >
                        <Heart className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Favorites Tab */}
      {activeSubTab === 'FAVORITES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white">Your Starred Channels & Content</h3>
              <p className="text-xs text-slate-400">Quick-access favorite items saved with instant local persistence.</p>
            </div>
            <span className="text-xs text-rose-400 font-bold bg-rose-950 px-2.5 py-1 rounded-full border border-rose-800">
              {favorites.length} Starred
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {transformedChannels
              .filter((c) => ChannelManager.isFavorite(c.streamId))
              .map((ch) => (
                <div
                  key={ch.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-amber-400">CH {ch.num}</span>
                    <span className="text-sm font-semibold text-white">{ch.name}</span>
                  </div>
                  <button
                    onClick={() => handleToggleFavorite(ch.streamId)}
                    className="p-1.5 rounded-lg bg-rose-950 border border-rose-800 text-rose-400 hover:bg-rose-900 transition-all"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Bouquets Tab */}
      {activeSubTab === 'BOUQUETS' && (
        <div className="space-y-6">
          {/* Create Bouquet Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">Create Custom Bouquet</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={newBouquetName}
                onChange={(e) => setNewBouquetName(e.target.value)}
                placeholder="Bouquet Name (e.g. Weekend Sports)"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={newBouquetDesc}
                onChange={(e) => setNewBouquetDesc(e.target.value)}
                placeholder="Description (optional)"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                id="btn-create-bouquet"
                onClick={handleCreateBouquet}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow"
              >
                <Plus className="w-3.5 h-3.5" /> Save Bouquet
              </button>
            </div>
          </div>

          {/* Bouquets List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bouquets.map((b) => (
              <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{b.name}</h4>
                    {b.description && <p className="text-xs text-slate-400">{b.description}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteBouquet(b.id)}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-xs text-slate-500">Channels in bouquet: {b.channelIds.length}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overrides & Hiding Tab */}
      {activeSubTab === 'OVERRIDES' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Channel Numbering Overrides & Visibility</h3>
            <p className="text-xs text-slate-400">Reassign custom LCN channel numbers and hide unwanted channels from surfing loops.</p>
          </div>

          <div className="space-y-3">
            {rawChannels.map((ch) => {
              const ovr = overrides[String(ch.streamId)];
              const isHidden = ovr?.hidden || false;
              const currentNum = ovr?.customNumber !== undefined ? ovr.customNumber : ch.num;

              return (
                <div
                  key={ch.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    isHidden ? 'bg-slate-950/40 border-slate-800/40 opacity-60' : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">ID: {ch.streamId}</span>
                    <span className="text-sm font-bold text-white">{ch.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">LCN:</span>
                      <input
                        type="number"
                        defaultValue={currentNum}
                        onBlur={(e) => handleSetCustomNumber(ch.streamId, e.target.value)}
                        className="w-16 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-amber-400 font-mono text-center focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <button
                      onClick={() => handleToggleHide(ch.streamId, isHidden)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                        isHidden
                          ? 'bg-rose-950/70 text-rose-300 border-rose-800'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                      }`}
                    >
                      {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      {isHidden ? 'Hidden' : 'Visible'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

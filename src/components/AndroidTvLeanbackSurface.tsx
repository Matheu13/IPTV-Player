import React, { useState, useEffect, useRef } from 'react';
import {
  Tv,
  Focus,
  Sliders,
  Keyboard,
  Play,
  Pause,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  Undo2,
  Menu,
  Volume2,
  VolumeX,
  Search,
  Layers,
  Sparkles,
  Info,
  ShieldAlert,
  Hash,
  Clock,
  Radio,
  Film,
  Compass,
  Settings,
  X,
  Check,
} from 'lucide-react';
import { tvFocusEngine, FocusNode } from '../lib/tvFocusEngine';
import { tvRemoteBridge, RemoteAction } from '../lib/tvRemoteInput';

interface LeanbackChannel {
  id: number;
  number: number;
  name: string;
  category: string;
  nowPlaying: string;
  nextPlaying: string;
  progress: number;
  icon: string;
}

const SAMPLE_TV_CHANNELS: LeanbackChannel[] = [
  {
    id: 101,
    number: 101,
    name: 'ESPN HD (60FPS)',
    category: 'Sports',
    nowPlaying: 'NBA Live: Celtics vs. Lakers',
    nextPlaying: 'SportsCenter Tonight',
    progress: 65,
    icon: '🏀',
  },
  {
    id: 102,
    number: 102,
    name: 'Sky Sports F1 UHD',
    category: 'Sports',
    nowPlaying: 'Formula 1: Qualifying Session Monaco',
    nextPlaying: 'Ted\'s Qualifying Notebook',
    progress: 42,
    icon: '🏎️',
  },
  {
    id: 103,
    number: 103,
    name: 'BBC One HD',
    category: 'General',
    nowPlaying: 'Planet Earth III: Extremes',
    nextPlaying: 'BBC News at Ten',
    progress: 80,
    icon: '🌍',
  },
  {
    id: 104,
    number: 104,
    name: 'CNN International',
    category: 'News',
    nowPlaying: 'The Situation Room with Wolf Blitzer',
    nextPlaying: 'Anderson Cooper 360',
    progress: 30,
    icon: '📰',
  },
  {
    id: 105,
    number: 105,
    name: 'HBO East HD',
    category: 'Cinema',
    nowPlaying: 'Dune: Part Two (4K HDR)',
    nextPlaying: 'House of the Dragon S2:E4',
    progress: 55,
    icon: '🎬',
  },
  {
    id: 106,
    number: 106,
    name: 'Discovery Science FHD',
    category: 'Documentary',
    nowPlaying: 'How It\'s Made: Supercars',
    nextPlaying: 'MythBusters: Deep Sea Myths',
    progress: 15,
    icon: '🔬',
  },
];

const TV_KEYBOARD_LAYOUT = [
  ['A', 'B', 'C', 'D', 'E', 'F'],
  ['G', 'H', 'I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P', 'Q', 'R'],
  ['S', 'T', 'U', 'V', 'W', 'X'],
  ['Y', 'Z', '0', '1', '2', '3'],
  ['4', '5', '6', '7', '8', '9'],
  ['SPACE', 'DEL', 'CLEAR', 'DONE'],
];

export const AndroidTvLeanbackSurface: React.FC = () => {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activeChannel, setActiveChannel] = useState<LeanbackChannel>(SAMPLE_TV_CHANNELS[0]);
  const [digitBuffer, setDigitBuffer] = useState<string>('');
  const [showOsd, setShowOsd] = useState<boolean>(true);
  const [osdCountdown, setOsdCountdown] = useState<number>(5);
  const [showOverscanGuides, setShowOverscanGuides] = useState<boolean>(false);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalType, setModalType] = useState<'AUDIO' | 'ASPECT' | 'INFO'>('AUDIO');
  const [audioTrack, setAudioTrack] = useState<string>('English AC3 5.1');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9 Cinema');
  const [lastRemoteAction, setLastRemoteAction] = useState<string>('READY');
  const osdTimerRef = useRef<any>(null);

  const categories = ['All', 'Sports', 'News', 'Cinema', 'Documentary', 'General'];

  // Reset OSD countdown
  const triggerOsdActivity = () => {
    setShowOsd(true);
    setOsdCountdown(5);
    if (osdTimerRef.current) clearInterval(osdTimerRef.current);

    osdTimerRef.current = setInterval(() => {
      setOsdCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(osdTimerRef.current);
          setShowOsd(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Register nodes in TvFocusEngine
  useEffect(() => {
    // 1. Sidebar Category Nodes
    categories.forEach((cat, idx) => {
      tvFocusEngine.registerNode({
        id: `cat_${cat}`,
        zone: 'sidebar',
        row: idx,
        col: 0,
        label: cat,
        onSelect: () => {
          setActiveCategory(cat);
          triggerOsdActivity();
        },
      });
    });

    // 2. Channel Grid Nodes
    SAMPLE_TV_CHANNELS.forEach((ch, idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      tvFocusEngine.registerNode({
        id: `ch_${ch.id}`,
        zone: 'channel_grid',
        row,
        col,
        label: ch.name,
        onSelect: () => {
          setActiveChannel(ch);
          triggerOsdActivity();
        },
      });
    });

    // 3. Player OSD Controls
    tvFocusEngine.registerNode({
      id: 'osd_btn_play',
      zone: 'player_hud',
      row: 0,
      col: 0,
      label: 'Play/Pause',
      onSelect: () => triggerOsdActivity(),
    });
    tvFocusEngine.registerNode({
      id: 'osd_btn_audio',
      zone: 'player_hud',
      row: 0,
      col: 1,
      label: 'Audio Options',
      onSelect: () => {
        setModalType('AUDIO');
        setShowModal(true);
      },
    });
    tvFocusEngine.registerNode({
      id: 'osd_btn_aspect',
      zone: 'player_hud',
      row: 0,
      col: 2,
      label: 'Aspect Ratio',
      onSelect: () => {
        setModalType('ASPECT');
        setShowModal(true);
      },
    });
    tvFocusEngine.registerNode({
      id: 'osd_btn_keyboard',
      zone: 'player_hud',
      row: 0,
      col: 3,
      label: 'Search Keyboard',
      onSelect: () => {
        setShowVirtualKeyboard(true);
        tvFocusEngine.setFocus('key_A');
      },
    });

    // Initial focus on first channel
    tvFocusEngine.setFocus('ch_101');
    triggerOsdActivity();

    const unsubFocus = tvFocusEngine.subscribe((nodeId) => {
      setActiveNodeId(nodeId);
    });

    const unsubRemote = tvRemoteBridge.registerCallback({
      onAction: (action) => {
        setLastRemoteAction(action);
        triggerOsdActivity();
      },
      onDigitBufferChange: (buf) => setDigitBuffer(buf),
      onDigitChannelCommit: (chNum) => {
        const found = SAMPLE_TV_CHANNELS.find((c) => c.number === chNum);
        if (found) {
          setActiveChannel(found);
          tvFocusEngine.setFocus(`ch_${found.id}`);
          setLastRemoteAction(`ZAPPED CH ${chNum}`);
        } else {
          setLastRemoteAction(`CH ${chNum} NOT FOUND`);
        }
        triggerOsdActivity();
      },
    });

    return () => {
      unsubFocus();
      unsubRemote();
      if (osdTimerRef.current) clearInterval(osdTimerRef.current);
    };
  }, []);

  // Update virtual keyboard nodes when opened
  useEffect(() => {
    if (showVirtualKeyboard) {
      tvFocusEngine.registerZone({ id: 'tv_keyboard', trapFocus: true });
      TV_KEYBOARD_LAYOUT.forEach((row, r) => {
        row.forEach((key, c) => {
          tvFocusEngine.registerNode({
            id: `key_${key}`,
            zone: 'tv_keyboard',
            row: r,
            col: c,
            onSelect: () => {
              if (key === 'SPACE') setSearchQuery((q) => q + ' ');
              else if (key === 'DEL') setSearchQuery((q) => q.slice(0, -1));
              else if (key === 'CLEAR') setSearchQuery('');
              else if (key === 'DONE') {
                setShowVirtualKeyboard(false);
                tvFocusEngine.setFocus('osd_btn_keyboard');
              } else {
                setSearchQuery((q) => q + key);
              }
              triggerOsdActivity();
            },
          });
        });
      });
      tvFocusEngine.setFocus('key_A');
    } else {
      tvFocusEngine.clearZoneNodes('tv_keyboard');
    }
  }, [showVirtualKeyboard]);

  // Modal Dialog Focus Management
  useEffect(() => {
    if (showModal) {
      tvFocusEngine.registerZone({ id: 'modal_dialog', trapFocus: true });
      tvFocusEngine.registerNode({
        id: 'modal_opt_1',
        zone: 'modal_dialog',
        row: 0,
        col: 0,
        onSelect: () => {
          if (modalType === 'AUDIO') setAudioTrack('English AC3 5.1');
          if (modalType === 'ASPECT') setAspectRatio('16:9 Cinema');
          setShowModal(false);
          tvFocusEngine.handleBack();
        },
      });
      tvFocusEngine.registerNode({
        id: 'modal_opt_2',
        zone: 'modal_dialog',
        row: 1,
        col: 0,
        onSelect: () => {
          if (modalType === 'AUDIO') setAudioTrack('Spanish Stereo 2.0');
          if (modalType === 'ASPECT') setAspectRatio('21:9 Ultrawide');
          setShowModal(false);
          tvFocusEngine.handleBack();
        },
      });
      tvFocusEngine.registerNode({
        id: 'modal_opt_close',
        zone: 'modal_dialog',
        row: 2,
        col: 0,
        onSelect: () => {
          setShowModal(false);
          tvFocusEngine.handleBack();
        },
      });
      tvFocusEngine.setFocus('modal_opt_1');
    } else {
      tvFocusEngine.clearZoneNodes('modal_dialog');
    }
  }, [showModal, modalType]);

  const filteredChannels = SAMPLE_TV_CHANNELS.filter((c) => {
    const matchesCat = activeCategory === 'All' || c.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nowPlaying.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div id="android-tv-leanback-surface" className="space-y-6">
      {/* Top Controls & Status Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-slate-100">
                10-Foot Android TV & Fire TV UX Surface
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/40">
                D-PAD ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic 2D Focus Vectoring • Overscan Title-Safe Protection • Zero-Mouse Remote Input
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <button
            onClick={() => setShowOverscanGuides(!showOverscanGuides)}
            className={`px-3 py-1.5 rounded-lg border font-medium flex items-center space-x-1.5 transition-colors ${
              showOverscanGuides
                ? 'bg-amber-950/40 border-amber-600/60 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{showOverscanGuides ? 'Hide 5% Safe Area' : 'Show 5% Safe Area'}</span>
          </button>

          <button
            onClick={() => triggerOsdActivity()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg font-medium flex items-center space-x-1.5 transition-colors"
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            <span>Wake OSD (5s)</span>
          </button>
        </div>
      </div>

      {/* Main TV Screen Canvas & Virtual Remote Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Simulated 10-Foot TV Display (16:9 Stage) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative aspect-video bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-between">
            {/* Overscan 5% Title-Safe Outline */}
            {showOverscanGuides && (
              <div className="absolute inset-[5%] border-2 border-dashed border-amber-500/50 pointer-events-none z-50 flex items-start justify-end p-2">
                <span className="bg-amber-950/80 text-amber-300 border border-amber-600/50 text-[10px] font-mono px-2 py-0.5 rounded">
                  5% Title-Safe Boundary
                </span>
              </div>
            )}

            {/* Top Bar / Channel Zapper Badge */}
            <div className="p-6 flex items-center justify-between z-10 bg-gradient-to-b from-slate-950/90 via-slate-950/50 to-transparent">
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1 bg-indigo-600 text-white font-mono font-bold text-sm rounded-md shadow-lg">
                  CH {activeChannel.number}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-wide">
                    {activeChannel.name}
                  </h3>
                  <span className="text-xs text-indigo-300 font-medium">
                    {activeChannel.category} • 1080p60 HEVC • 5.1 Dolby Audio
                  </span>
                </div>
              </div>

              {/* Digit Buffer Indicator during rapid hopping */}
              {digitBuffer && (
                <div className="px-4 py-2 bg-indigo-600/90 text-white font-mono text-xl font-black rounded-xl animate-pulse border border-indigo-400 shadow-xl">
                  GO TO CH [ {digitBuffer} ]
                </div>
              )}
            </div>

            {/* Video Simulation Center Stage */}
            <div className="flex-1 flex items-center justify-center relative p-8">
              <div className="text-center space-y-3 max-w-md">
                <div className="text-6xl animate-pulse select-none">{activeChannel.icon}</div>
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                    ● ON AIR LIVE STREAM
                  </span>
                  <h4 className="text-xl font-bold text-white">{activeChannel.nowPlaying}</h4>
                  <p className="text-xs text-slate-400">
                    Next: <span className="text-slate-300">{activeChannel.nextPlaying}</span>
                  </p>
                </div>

                {/* Live Progress Bar */}
                <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden border border-slate-700/50">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${activeChannel.progress}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Over-The-Video Leanback OSD Bar */}
            {showOsd && (
              <div className="p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent border-t border-slate-800/60 z-20 transition-opacity duration-300">
                <div className="flex items-center justify-between gap-4">
                  {/* Category Filter Carousel */}
                  <div className="flex items-center space-x-2 overflow-x-auto py-1">
                    {categories.map((cat) => {
                      const isFocused = activeNodeId === `cat_${cat}`;
                      const isSelected = activeCategory === cat;
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            setActiveCategory(cat);
                            tvFocusEngine.setFocus(`cat_${cat}`);
                          }}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                            isFocused
                              ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/60 scale-105 shadow-lg'
                              : isSelected
                              ? 'bg-slate-800 text-indigo-300 border border-indigo-500/40'
                              : 'bg-slate-900/80 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* OSD Action Controls */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setModalType('AUDIO');
                        setShowModal(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-all ${
                        activeNodeId === 'osd_btn_audio'
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/60 scale-105'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>{audioTrack}</span>
                    </button>

                    <button
                      onClick={() => {
                        setModalType('ASPECT');
                        setShowModal(true);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-all ${
                        activeNodeId === 'osd_btn_aspect'
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/60 scale-105'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>{aspectRatio}</span>
                    </button>

                    <button
                      onClick={() => setShowVirtualKeyboard(true)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-all ${
                        activeNodeId === 'osd_btn_keyboard'
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/60 scale-105'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      <Keyboard className="w-3.5 h-3.5" />
                      <span>{searchQuery ? `"${searchQuery}"` : 'TV Search'}</span>
                    </button>
                  </div>
                </div>

                {/* Auto-dismiss countdown badge */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-3 pt-3 border-t border-slate-800/40">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    <span>OSD auto-dismisses in {osdCountdown}s</span>
                  </div>
                  <span className="font-mono text-slate-400">Press Remote Keys to Refresh</span>
                </div>
              </div>
            )}

            {/* Virtual On-Screen Alphanumeric TV Keyboard Modal */}
            {showVirtualKeyboard && (
              <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-md z-40 p-6 flex flex-col justify-between">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Keyboard className="w-5 h-5 text-indigo-400" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Android TV On-Screen Keyboard
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowVirtualKeyboard(false);
                      tvFocusEngine.setFocus('osd_btn_keyboard');
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search query input box */}
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Search className="w-4 h-4 text-indigo-400" />
                    <span className="text-base font-bold text-white">
                      {searchQuery || <span className="text-slate-500 italic">Type channel name...</span>}
                    </span>
                  </div>
                  {searchQuery && (
                    <span className="text-xs font-mono text-indigo-400 font-bold">
                      {filteredChannels.length} matches
                    </span>
                  )}
                </div>

                {/* 6x6 Keyboard Grid */}
                <div className="space-y-2 py-2">
                  {TV_KEYBOARD_LAYOUT.map((row, rIdx) => (
                    <div key={rIdx} className="flex items-center justify-center space-x-2">
                      {row.map((key) => {
                        const isFocused = activeNodeId === `key_${key}`;
                        return (
                          <button
                            key={key}
                            onClick={() => {
                              if (key === 'SPACE') setSearchQuery((q) => q + ' ');
                              else if (key === 'DEL') setSearchQuery((q) => q.slice(0, -1));
                              else if (key === 'CLEAR') setSearchQuery('');
                              else if (key === 'DONE') {
                                setShowVirtualKeyboard(false);
                                tvFocusEngine.setFocus('osd_btn_keyboard');
                              } else {
                                setSearchQuery((q) => q + key);
                              }
                            }}
                            className={`h-9 px-3 rounded-lg text-xs font-bold font-mono transition-all duration-150 ${
                              isFocused
                                ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/80 scale-110 shadow-xl'
                                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                            } ${['SPACE', 'DEL', 'CLEAR', 'DONE'].includes(key) ? 'min-w-[64px]' : 'min-w-[40px]'}`}
                          >
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="text-center text-[11px] text-slate-400 font-mono">
                  Navigate with D-Pad • Press [Enter / OK] to Type • Press [DONE] to close
                </div>
              </div>
            )}

            {/* Modal Dialog Focus Trap */}
            {showModal && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 flex items-center justify-center p-6">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-bold text-white">
                      {modalType === 'AUDIO' ? 'Select Audio Stream' : 'Video Aspect Ratio'}
                    </h4>
                    <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/40">
                      FOCUS TRAPPED
                    </span>
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        if (modalType === 'AUDIO') setAudioTrack('English AC3 5.1');
                        if (modalType === 'ASPECT') setAspectRatio('16:9 Cinema');
                        setShowModal(false);
                        tvFocusEngine.handleBack();
                      }}
                      className={`w-full p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        activeNodeId === 'modal_opt_1'
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/60 scale-105'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      <span>
                        {modalType === 'AUDIO' ? '1. English (AC3 5.1 Surround)' : '1. 16:9 Standard Cinema'}
                      </span>
                      <Check className="w-4 h-4 text-emerald-400" />
                    </button>

                    <button
                      onClick={() => {
                        if (modalType === 'AUDIO') setAudioTrack('Spanish Stereo 2.0');
                        if (modalType === 'ASPECT') setAspectRatio('21:9 Ultrawide');
                        setShowModal(false);
                        tvFocusEngine.handleBack();
                      }}
                      className={`w-full p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        activeNodeId === 'modal_opt_2'
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-400/60 scale-105'
                          : 'bg-slate-800 text-slate-200'
                      }`}
                    >
                      <span>
                        {modalType === 'AUDIO' ? '2. Spanish (Stereo 2.0)' : '2. 21:9 Ultrawide Anamorphic'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setShowModal(false);
                        tvFocusEngine.handleBack();
                      }}
                      className={`w-full p-2.5 rounded-xl text-center text-xs font-semibold text-slate-400 hover:text-white transition-all ${
                        activeNodeId === 'modal_opt_close'
                          ? 'bg-rose-950/80 text-rose-300 ring-4 ring-rose-500/60'
                          : 'bg-slate-800/60'
                      }`}
                    >
                      Close Modal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 10-Foot Channel Selection Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                <span>Leanback Channel Grid ({filteredChannels.length} Channels)</span>
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">
                Active Focus: <strong className="text-indigo-400">{activeNodeId || 'None'}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredChannels.map((ch) => {
                const isFocused = activeNodeId === `ch_${ch.id}`;
                const isPlaying = activeChannel.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannel(ch);
                      tvFocusEngine.setFocus(`ch_${ch.id}`);
                      triggerOsdActivity();
                    }}
                    className={`p-3.5 rounded-xl border text-left transition-all duration-150 relative ${
                      isFocused
                        ? 'bg-indigo-950/80 border-indigo-500 ring-4 ring-indigo-400/80 scale-105 shadow-xl z-10'
                        : isPlaying
                        ? 'bg-slate-800/80 border-indigo-500/40 text-slate-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-2xl">{ch.icon}</span>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-mono font-bold text-[10px] rounded">
                        CH {ch.number}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-white mt-2 truncate">{ch.name}</h5>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{ch.nowPlaying}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Android TV Remote Controller Simulator */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Tv className="w-4 h-4 text-indigo-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Fire TV / Android Remote
                </h4>
              </div>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/30">
                {lastRemoteAction}
              </span>
            </div>

            {/* D-Pad Circular Controller */}
            <div className="relative w-48 h-48 bg-slate-950 rounded-full border-4 border-slate-800 p-2 shadow-inner flex items-center justify-center my-2">
              {/* UP */}
              <button
                id="remote-btn-up"
                onClick={() => tvRemoteBridge.handleAction('UP')}
                className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-10 bg-slate-800 hover:bg-indigo-600 active:scale-95 rounded-t-2xl flex items-center justify-center text-slate-300 hover:text-white transition-all"
              >
                <ChevronUp className="w-6 h-6" />
              </button>

              {/* DOWN */}
              <button
                id="remote-btn-down"
                onClick={() => tvRemoteBridge.handleAction('DOWN')}
                className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-10 bg-slate-800 hover:bg-indigo-600 active:scale-95 rounded-b-2xl flex items-center justify-center text-slate-300 hover:text-white transition-all"
              >
                <ChevronDown className="w-6 h-6" />
              </button>

              {/* LEFT */}
              <button
                id="remote-btn-left"
                onClick={() => tvRemoteBridge.handleAction('LEFT')}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-12 bg-slate-800 hover:bg-indigo-600 active:scale-95 rounded-l-2xl flex items-center justify-center text-slate-300 hover:text-white transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* RIGHT */}
              <button
                id="remote-btn-right"
                onClick={() => tvRemoteBridge.handleAction('RIGHT')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-12 bg-slate-800 hover:bg-indigo-600 active:scale-95 rounded-r-2xl flex items-center justify-center text-slate-300 hover:text-white transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* CENTER OK / SELECT */}
              <button
                id="remote-btn-select"
                onClick={() => tvRemoteBridge.handleAction('SELECT')}
                className="w-16 h-16 bg-indigo-600 hover:bg-indigo-500 active:scale-90 rounded-full flex items-center justify-center text-white font-bold text-xs tracking-wider shadow-lg transition-all"
              >
                OK
              </button>
            </div>

            {/* Standard TV Navigation Controls */}
            <div className="grid grid-cols-3 gap-2.5 w-full mt-4">
              <button
                onClick={() => tvRemoteBridge.handleAction('BACK')}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Undo2 className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={() => triggerOsdActivity()}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Menu className="w-4 h-4" />
                <span>Menu</span>
              </button>

              <button
                onClick={() => triggerOsdActivity()}
                className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Play/Pause</span>
              </button>
            </div>

            {/* Numeric Keypad Zapper */}
            <div className="w-full mt-4 pt-4 border-t border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 text-center">
                Channel Number Keypad
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => (
                  <button
                    key={`tv-keypad-digit-${num}`}
                    onClick={() => tvRemoteBridge.handleDigitInput(String(num))}
                    className={`py-2 rounded-lg bg-slate-800/80 hover:bg-indigo-600 text-slate-200 hover:text-white font-mono font-bold text-sm transition-colors ${
                      num === 0 ? 'col-span-3' : ''
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Hardware Keyboard Guide */}
            <div className="w-full mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center space-x-1.5 text-indigo-300 font-semibold mb-1">
                <Keyboard className="w-3.5 h-3.5" />
                <span>Hardware Hotkeys Enabled</span>
              </div>
              <p>• <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-slate-200">Arrow Keys</kbd>: D-Pad Vector</p>
              <p>• <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-slate-200">Enter</kbd>: OK / Select</p>
              <p>• <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-slate-200">Esc / Backspace</kbd>: Back</p>
              <p>• <kbd className="px-1 py-0.5 bg-slate-800 rounded font-mono text-slate-200">0 - 9</kbd>: Direct Channel Zap</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
